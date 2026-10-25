#include <clang/AST/ASTConsumer.h>
#include <clang/AST/DeclCXX.h>
#include <clang/AST/ExprCXX.h>
#include <clang/AST/RecursiveASTVisitor.h>
#include <clang/Frontend/CompilerInstance.h>
#include <clang/Frontend/FrontendAction.h>
#include <clang/Frontend/PrecompiledPreamble.h>
#include <clang/Serialization/ASTReader.h>
#include <clang/Lex/PreprocessorOptions.h>
#include <clang/Lex/Lexer.h>
#include <clang/Lex/HeaderSearch.h>
#include <clang/Lex/HeaderSearchOptions.h>
#include <clang/Lex/PPCallbacks.h>
#include <clang/Lex/Preprocessor.h>
#include <clang/Tooling/CompilationDatabase.h>
#include <clang/Tooling/Tooling.h>
#include <llvm/Support/FileSystem.h>
#include <llvm/Support/JSON.h>
#include <llvm/Support/Path.h>
#include <llvm/Support/raw_ostream.h>
#include <llvm/Support/SHA256.h>
#include <llvm/Support/MemoryBuffer.h>
#include <llvm/ADT/StringExtras.h>
#include <llvm/ADT/DenseSet.h>
#include <llvm/ADT/StringMap.h>
#include <algorithm>
#include <cstdint>
#include <functional>
#include <numeric>
#include <memory>
#include <string>
#include <vector>
#include <map>
#include <set>
#include <chrono>
#include <iostream>
#include <iterator>
#include <optional>
#include <variant>
#include <limits>
#ifdef __linux__
#include <csignal>
#include <fcntl.h>
#include <sys/file.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <unistd.h>
#endif

namespace {
namespace json = llvm::json;
using namespace clang;

// Keep each growing container or stream as fold state without copying it on
// every step (std::accumulate only moves its accumulator starting in C++20).
template <typename Range, typename State, typename Step>
State &fold(const Range &range, State &state, Step step) {
  return std::accumulate(range.begin(), range.end(), std::ref(state),
      [&](std::reference_wrapper<State> state, const auto &element) {
        step(state.get(), element);
        return state;
      }).get();
}

std::string absolutePath(llvm::StringRef name) {
  llvm::SmallString<256> pathname(name);
  if (llvm::sys::path::is_relative(pathname)) {
    if (llvm::sys::fs::make_absolute(pathname)) return name.str();
  }
  llvm::sys::path::remove_dots(pathname, true);
  return std::string(pathname);
}

llvm::StringMap<std::string> sourcePaths(const SourceManager &sm) {
  llvm::StringMap<std::string> paths;
  fold(llvm::make_range(sm.fileinfo_begin(), sm.fileinfo_end()), paths,
      [](auto &paths, const auto &fileInfo) {
        const auto name = fileInfo.second->Filename;
        if (!name.empty()) paths.try_emplace(name, absolutePath(name));
      });
  return paths;
}

std::string identity(const Decl *declaration) {
  if (!declaration) return "";
  if (const auto *function = llvm::dyn_cast<FunctionDecl>(declaration))
    declaration = function->getCanonicalDecl();
  return llvm::utohexstr(reinterpret_cast<uintptr_t>(declaration));
}

class Serializer {
public:
  explicit Serializer(ASTContext &context)
      : context(context), sm(context.getSourceManager()), paths(sourcePaths(sm)) {}

  void location(json::OStream &output, SourceLocation position) const {
    if (position.isInvalid()) return;
    const auto expansion = sm.getExpansionLoc(position);
    const auto name = sm.getFilename(expansion);
    if (name.empty()) return;
    const auto file = paths.find(name);
    if (file == paths.end()) output.attribute("file", absolutePath(name));
    else output.attribute("file", llvm::StringRef(file->second));
    output.attribute("offset", static_cast<int64_t>(sm.getFileOffset(expansion)));
    output.attribute("tokLen", static_cast<int64_t>(
        Lexer::MeasureTokenLength(expansion, sm, context.getLangOpts())));
  }

  void range(json::OStream &output, SourceRange span) const {
    output.attributeObject("begin", [&] { location(output, span.getBegin()); });
    output.attributeObject("end", [&] { location(output, span.getEnd()); });
  }

  void type(json::OStream &output, QualType type) const {
    output.attributeObject("type", [&] {
      output.attribute("qualType", type.getAsString());
    });
  }

  void parameter(json::OStream &output, const ParmVarDecl *parameter) const {
    output.object([&] {
      output.attribute("kind", "ParmVarDecl");
      output.attribute("id", identity(parameter));
      output.attribute("name", parameter->getNameAsString());
      type(output, parameter->getType());
      output.attributeObject("loc", [&] { location(output, parameter->getLocation()); });
      output.attributeObject("range", [&] { range(output, parameter->getSourceRange()); });
    });
  }

  void variable(json::OStream &output, const VarDecl *variable, unsigned depth) const {
    output.object([&] {
      output.attribute("kind", "VarDecl");
      output.attribute("id", identity(variable));
      output.attribute("name", variable->getNameAsString());
      type(output, variable->getType());
      output.attributeObject("loc", [&] { location(output, variable->getLocation()); });
      output.attributeObject("range", [&] { range(output, variable->getSourceRange()); });
      output.attributeArray("inner", [&] {
        if (const auto *initializer = variable->getInit())
          statement(output, initializer, depth + 1);
      });
    });
  }

  void statement(json::OStream &output, const Stmt *stmt, unsigned depth = 0) const {
    output.object([&] {
      if (depth > 256) {
        output.attribute("kind", "UnsupportedDepth");
        return;
      }
      output.attribute("kind", stmt->getStmtClassName());
      output.attributeObject("range", [&] { range(output, stmt->getSourceRange()); });
      if (const auto *expression = llvm::dyn_cast<Expr>(stmt)) {
        type(output, expression->getType());
        output.attribute("dependent", expression->isTypeDependent());
      }
      if (const auto *call = llvm::dyn_cast<CallExpr>(stmt)) {
        if (const auto *callee = call->getDirectCallee())
          output.attributeObject("callee", [&] {
            output.attribute("id", identity(callee));
            output.attribute("name", callee->getNameAsString());
            output.attribute("qualifiedName", callee->getQualifiedNameAsString());
          });
      }
      if (const auto *call = llvm::dyn_cast<CXXOperatorCallExpr>(stmt)) {
        output.attribute("opcode", getOperatorSpelling(call->getOperator()));
        output.attribute("memberOperator", call->getDirectCallee() &&
            llvm::isa<CXXMethodDecl>(call->getDirectCallee()));
      }
      if (const auto *reference = llvm::dyn_cast<DeclRefExpr>(stmt)) {
        const auto *declaration = reference->getDecl();
        output.attributeObject("referencedDecl", [&] {
          output.attribute("id", identity(declaration));
          output.attribute("name", declaration->getNameAsString());
          type(output, declaration->getType());
        });
      } else if (const auto *member = llvm::dyn_cast<MemberExpr>(stmt)) {
        output.attribute("name", member->getMemberNameInfo().getAsString());
        output.attribute("referencedMemberDecl", identity(member->getMemberDecl()));
      } else if (const auto *member = llvm::dyn_cast<CXXDependentScopeMemberExpr>(stmt)) {
        output.attribute("name", member->getMember().getAsString());
      } else if (const auto *lookup = llvm::dyn_cast<UnresolvedLookupExpr>(stmt)) {
        output.attribute("name", lookup->getName().getAsString());
      } else if (const auto *unary = llvm::dyn_cast<UnaryOperator>(stmt)) {
        output.attribute("opcode", UnaryOperator::getOpcodeStr(unary->getOpcode()));
      } else if (const auto *binary = llvm::dyn_cast<BinaryOperator>(stmt)) {
        output.attribute("opcode", BinaryOperator::getOpcodeStr(binary->getOpcode()));
      }
      if (const auto *declarations = llvm::dyn_cast<DeclStmt>(stmt)) {
        const auto declarationRange = declarations->decls();
        if (std::any_of(declarationRange.begin(), declarationRange.end(),
            [](const Decl *declaration) { return llvm::isa<VarDecl>(declaration); }))
          output.attributeArray("inner", [&] {
            fold(declarationRange, output, [&](json::OStream &output, const Decl *declaration) {
              if (const auto *variable = llvm::dyn_cast<VarDecl>(declaration))
                this->variable(output, variable, depth);
            });
          });
      } else if (const auto *lambda = llvm::dyn_cast<LambdaExpr>(stmt)) {
        output.attribute("captureDefault", lambda->getCaptureDefault() == LCD_ByRef ? "reference" :
            lambda->getCaptureDefault() == LCD_ByCopy ? "copy" : "none");
        const auto captureRange = lambda->captures();
        output.attributeArray("captures", [&] {
          fold(captureRange, output, [](json::OStream &output, const LambdaCapture &capture) {
            if (capture.capturesVariable()) output.object([&] {
              output.attribute("id", identity(capture.getCapturedVar()));
              output.attribute("kind", capture.getCaptureKind() == LCK_ByRef ? "reference" : "copy");
            });
          });
        });
        if (const auto *method = lambda->getCallOperator()) {
          output.attributeArray("inner", [&] {
            output.object([&] {
              output.attribute("kind", "CXXRecordDecl");
              output.attributeArray("inner", [&] {
                function(output, method, depth + 1);
                if (const auto *methodTemplate = method->getDescribedFunctionTemplate()) {
                  const auto specializations = methodTemplate->specializations();
                  fold(specializations, output, [&](json::OStream &output, const FunctionDecl *specialization) {
                    if (specialization->hasBody()) function(output, specialization, depth + 1);
                  });
                }
              });
            });
          });
        }
      } else {
        const auto children = stmt->children();
        if (std::any_of(children.begin(), children.end(), [](const Stmt *child) { return child; }))
          output.attributeArray("inner", [&] {
            fold(children, output, [&](json::OStream &output, const Stmt *child) {
              if (child) statement(output, child, depth + 1);
            });
          });
      }
    });
  }

  void function(json::OStream &output, const FunctionDecl *function, unsigned depth = 0) const {
    output.object([&] {
      output.attribute("kind", llvm::isa<CXXConstructorDecl>(function) ? "CXXConstructorDecl" :
          llvm::isa<CXXDestructorDecl>(function) ? "CXXDestructorDecl" :
          llvm::isa<CXXConversionDecl>(function) ? "CXXConversionDecl" :
          llvm::isa<CXXMethodDecl>(function) ? "CXXMethodDecl" : "FunctionDecl");
      output.attribute("id", identity(function));
      output.attribute("name", function->getNameAsString());
      output.attribute("dependent", function->isDependentContext());
      type(output, function->getType());
      output.attributeObject("loc", [&] { location(output, function->getLocation()); });
      output.attributeObject("range", [&] { range(output, function->getSourceRange()); });
      output.attributeArray("inner", [&] {
        fold(function->parameters(), output, [&](json::OStream &output, const ParmVarDecl *parameter) {
          this->parameter(output, parameter);
        });
        if (const auto *body = function->getBody()) statement(output, body, depth);
      });
    });
  }

  bool inSource(const FunctionDecl *function) const {
    return sm.isWrittenInMainFile(sm.getExpansionLoc(function->getLocation()));
  }

  bool inUserCode(const FunctionDecl *function) const {
    const auto location = sm.getExpansionLoc(function->getLocation());
    return location.isValid() && !sm.isInSystemHeader(location);
  }

private:
  ASTContext &context;
  SourceManager &sm;
  const llvm::StringMap<std::string> paths;
};

class CalledFunctions : public RecursiveASTVisitor<CalledFunctions> {
public:
  bool VisitLambdaExpr(LambdaExpr *lambda) {
    const auto *methodTemplate = lambda->getCallOperator()->getDescribedFunctionTemplate();
    if (!methodTemplate) return true;
    const auto specializations = methodTemplate->specializations();
    return std::accumulate(specializations.begin(), specializations.end(), true,
        [&](bool traversed, FunctionDecl *specialization) {
          return traversed && (!specialization->hasBody() || TraverseStmt(specialization->getBody()));
        });
  }
  bool VisitCallExpr(CallExpr *call) {
    if (const auto *callee = call->getDirectCallee())
      if (const auto *definition = callee->getDefinition()) called.push_back(definition);
    return true;
  }
  std::vector<const FunctionDecl *> called;
};

class SourceFunctions : public RecursiveASTVisitor<SourceFunctions> {
public:
  explicit SourceFunctions(const Serializer &serializer) : serializer(serializer) {}
  bool TraverseDecl(Decl *declaration) {
    // Header function bodies cannot contain active-file roots. Keep walking
    // declaration contexts so namespaces, templates and local classes in the
    // active file are still discovered. Reachable helpers are collected later.
    const auto *function = llvm::dyn_cast_or_null<FunctionDecl>(declaration);
    return function && !serializer.inSource(function)
        ? true : RecursiveASTVisitor<SourceFunctions>::TraverseDecl(declaration);
  }
  bool VisitFunctionDecl(FunctionDecl *function) {
    const auto *method = llvm::dyn_cast<CXXMethodDecl>(function);
    if (function->hasBody() && serializer.inSource(function) &&
        !(method && method->getParent()->isLambda())) roots.push_back(function);
    return true;
  }
  const Serializer &serializer;
  std::vector<const FunctionDecl *> roots;
};

struct FunctionSelection {
  llvm::DenseSet<const FunctionDecl *> seen;
  std::vector<const FunctionDecl *> selected;
};

std::string digest(llvm::StringRef text) {
  return llvm::toHex(llvm::SHA256::hash(llvm::arrayRefFromStringRef(text)), true);
}

// Candidate paths include unsuccessful lookups. Checking only opened files
// misses newly generated headers and higher-priority include directories.
struct DependencyState {
  bool reusable = true;
  std::set<std::string> attempted;
  std::map<std::string, std::pair<std::string, std::string>> paths;
  std::map<std::string, std::string> runtime;
  std::map<std::string, std::string> stamps;
};

std::string fileStamp(llvm::StringRef pathname) {
#ifdef __linux__
  struct stat metadata;
  if (::stat(pathname.str().c_str(), &metadata)) return "";
  const auto ns = [](const timespec &time) { return int64_t(time.tv_sec) * 1000000000 + time.tv_nsec; };
  return std::to_string(metadata.st_dev) + ":" + std::to_string(metadata.st_ino) + ":" +
      std::to_string(metadata.st_size) + ":" + std::to_string(metadata.st_mode) + ":" +
      std::to_string(ns(metadata.st_mtim)) + ":" + std::to_string(ns(metadata.st_ctim));
#else
  return "";
#endif
}

void captureRuntime(DependencyState &state) {
#ifdef __linux__
  const auto maps = llvm::MemoryBuffer::getFileAsStream("/proc/self/maps");
  if (!maps) { state.reusable = false; return; }
  llvm::SmallVector<llvm::StringRef> lines;
  (*maps)->getBuffer().split(lines, '\n');
  fold(lines, state, [](auto &state, llvm::StringRef line) {
    const auto slash = line.find('/');
    if (slash == llvm::StringRef::npos) return;
    const auto pathname = line.substr(slash).str();
    if (state.runtime.count(pathname)) return;
    llvm::SmallVector<llvm::StringRef> fields;
    line.split(fields, ' ', -1, false);
    uint64_t inode = 0;
    struct stat metadata;
    if (fields.size() < 5 || fields[4].getAsInteger(10, inode) ||
        ::stat(pathname.c_str(), &metadata) || inode != metadata.st_ino) {
      state.reusable = false;
      return;
    }
    // Match Node's bigint stat stamp, and verify the pathname still identifies
    // the inode mapped into this process (package updates can replace DSOs).
    const auto ns = [](const timespec &time) { return int64_t(time.tv_sec) * 1000000000 + time.tv_nsec; };
    state.runtime.emplace(pathname, std::to_string(metadata.st_dev) + ":" +
        std::to_string(metadata.st_ino) + ":" + std::to_string(metadata.st_size) + ":" +
        std::to_string(metadata.st_mode) + ":" + std::to_string(ns(metadata.st_mtim)) + ":" +
        std::to_string(ns(metadata.st_ctim)));
  });
  if (state.runtime.empty()) state.reusable = false;
#else
  // No unverified persistent reuse on platforms without runtime-image capture.
  state.reusable = false;
#endif
}

void capturePath(DependencyState &state, llvm::StringRef name) {
  llvm::SmallString<256> requested(name);
  if (llvm::sys::fs::make_absolute(requested)) { state.reusable = false; return; }
  // Do not lexically collapse '..' across a symlink before filesystem lookup.
  const auto pathname = requested.str().str();
  if (!state.attempted.insert(pathname).second) return;
  llvm::SmallString<256> real;
  const auto error = llvm::sys::fs::real_path(pathname, real);
  if (error) {
    if (error != std::errc::no_such_file_or_directory && error != std::errc::not_a_directory)
      state.reusable = false;
    // One absent ancestor proves that every candidate below it is absent.
    // This keeps thousands of speculative include paths out of the manifest.
    const auto missing = [&](const auto &self, llvm::StringRef pathname) -> std::string {
      const auto parent = llvm::sys::path::parent_path(pathname);
      if (parent.empty() || parent == pathname) return pathname.str();
      llvm::SmallString<256> real;
      const auto error = llvm::sys::fs::real_path(parent, real);
      return error == std::errc::no_such_file_or_directory || error == std::errc::not_a_directory
          ? self(self, parent) : pathname.str();
    };
    state.paths.emplace(missing(missing, pathname), std::make_pair("", ""));
    return;
  }
  const auto stamp = fileStamp(pathname);
  const auto buffer = llvm::MemoryBuffer::getFileAsStream(pathname);
  if (!buffer) {
    state.reusable = false;
    return;
  }
  state.paths.emplace(pathname, std::make_pair(real.str().str(), digest((*buffer)->getBuffer())));
  if (!stamp.empty()) {
    state.stamps.emplace(pathname, stamp);
    if (fileStamp(pathname) != stamp) state.reusable = false;
  }
}

class Dependencies : public PPCallbacks {
public:
  Dependencies(CompilerInstance &compiler, DependencyState &state)
      : compiler(compiler), state(state) {}

  void lookup(SourceLocation location, llvm::StringRef name, bool angled,
              OptionalFileEntryRef file) {
    const auto &headers = compiler.getPreprocessor().getHeaderSearchInfo();
    fold(headers.search_dir_range(), state, [&](auto &state, const DirectoryLookup &directory) {
      if (!directory.isNormalDir()) { state.reusable = false; return; }
      capturePath(state, directory.getName().str() + "/" + name.str());
    });
    // Clang removes nonexistent -I entries from search_dir_range(). They still
    // affect a future invocation if a generated include directory appears.
    fold(compiler.getHeaderSearchOpts().UserEntries, state, [&](auto &state, const auto &directory) {
      if (directory.IsFramework || !directory.IgnoreSysRoot) state.reusable = false;
      capturePath(state, directory.Path + "/" + name.str());
    });
    if (llvm::sys::path::is_absolute(name)) capturePath(state, name);
    const auto &sm = compiler.getSourceManager();
    const auto quote = [&](const auto &self, SourceLocation location) -> void {
      if (location.isInvalid()) return;
      const auto fileID = sm.getFileID(sm.getExpansionLoc(location));
      if (const auto entry = sm.getFileEntryRefForID(fileID)) {
        const auto directory = llvm::sys::path::parent_path(entry->getName());
        capturePath(state, directory.str() + "/" + name.str());
      }
      self(self, sm.getIncludeLoc(fileID));
    };
    if (!angled) quote(quote, location);
    if (!angled) capturePath(state, "./" + name.str());
    if (file) capturePath(state, file->getName());
  }

  void InclusionDirective(SourceLocation location, const Token &, StringRef name,
      bool angled, CharSourceRange, OptionalFileEntryRef file, StringRef,
      StringRef, const Module *module, bool imported, SrcMgr::CharacteristicKind) override {
    if (module || imported) state.reusable = false;
    lookup(location, name, angled, file);
  }
  void HasInclude(SourceLocation location, StringRef name, bool angled,
      OptionalFileEntryRef file, SrcMgr::CharacteristicKind) override {
    lookup(location, name, angled, file);
  }
  void HasEmbed(SourceLocation, StringRef, bool, OptionalFileEntryRef) override {
    state.reusable = false;
  }
  void moduleImport(SourceLocation, ModuleIdPath, const Module *) override {
    state.reusable = false;
  }
  void EnteredSubmodule(Module *, SourceLocation, bool) override {
    state.reusable = false;
  }
  void EmbedDirective(SourceLocation, StringRef, bool, OptionalFileEntryRef,
      const LexEmbedParametersResult &) override { state.reusable = false; }
  void MacroExpands(const Token &token, const MacroDefinition &, SourceRange,
      const MacroArgs *) override {
    const auto name = token.getIdentifierInfo()->getName();
    if (name == "__TIME__" || name == "__DATE__" || name == "__TIMESTAMP__")
      state.reusable = false;
  }
private:
  CompilerInstance &compiler;
  DependencyState &state;
};

// Preamble construction and remainder parsing have separate SourceManagers.
// Compare the buffers each actually consumed with the first observed hashes.
// Only our explicitly owned main-file remapping is permitted.
void captureBuffers(CompilerInstance &compiler, DependencyState &dependencies,
                    bool ownedMain, bool preamble) {
  const auto &sm = compiler.getSourceManager();
  const auto main = sm.getFileEntryRefForID(sm.getMainFileID());
  const auto files = llvm::make_range(sm.fileinfo_begin(), sm.fileinfo_end());
  fold(files, dependencies, [&](auto &dependencies, const auto &file) {
    const bool isMain = main && file.first == *main;
    if (isMain && preamble) return;
    if (file.second->BufferOverridden && !(isMain && ownedMain)) dependencies.reusable = false;
    capturePath(dependencies, file.first.getName());
    if (const auto buffer = file.second->getBufferDataIfLoaded()) {
      llvm::SmallString<256> requested(file.first.getName());
      llvm::sys::fs::make_absolute(requested);
      if (dependencies.paths[requested.str().str()].second != digest(*buffer)) dependencies.reusable = false;
    }
  });
  fold(dependencies.stamps, dependencies, [](auto &dependencies, const auto &file) {
    if (fileStamp(file.first) != file.second) dependencies.reusable = false;
  });
}

void writeDependencies(json::OStream &output, const DependencyState &dependencies) {
  output.object([&] {
    output.attribute("schema", 1);
    output.attribute("reusable", dependencies.reusable);
    output.attributeArray("runtime", [&] {
      fold(dependencies.runtime, output, [](auto &output, const auto &file) {
        output.object([&] {
          output.attribute("path", file.first);
          output.attribute("stamp", file.second);
        });
      });
    });
    output.attributeArray("paths", [&] {
      fold(dependencies.paths, output, [&](auto &output, const auto &file) {
        output.object([&] {
          output.attribute("path", file.first);
          output.attribute("real", file.second.first);
          output.attribute("sha256", file.second.second);
          const auto stamp = dependencies.stamps.find(file.first);
          if (stamp != dependencies.stamps.end()) output.attribute("stamp", stamp->second);
        });
      });
    });
  });
}

struct Timings {
  double selectionMs = 0;
  double serializationMs = 0;
  std::chrono::steady_clock::time_point started;
};

double elapsedMs(std::chrono::steady_clock::time_point started) {
  return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started).count();
}

class Extractor : public ASTConsumer {
public:
  Extractor(std::string source, Timings &timings) : source(std::move(source)), timings(timings) {}
  void HandleTranslationUnit(ASTContext &context) override {
    const auto selectionStarted = std::chrono::steady_clock::now();
    const Serializer serializer(context);
    SourceFunctions functions(serializer);
    functions.TraverseDecl(context.getTranslationUnitDecl());
    // Avoid dumping the complete translation unit: serialize active-file
    // functions and only their transitively called non-system definitions.
    const auto include = [&](const auto &self, const FunctionDecl *function,
                             FunctionSelection &selection) -> void {
      const auto *definition = function->getDefinition();
      if (!definition || !serializer.inUserCode(definition)) return;
      // Canonical declarations give stable deduplication across redeclarations
      // and specializations without an O(F) scan for every reached function.
      if (!selection.seen.insert(definition->getCanonicalDecl()).second) return;
      selection.selected.push_back(definition);
      CalledFunctions calls;
      calls.TraverseStmt(definition->getBody());
      fold(calls.called, selection, [&](auto &selection, const FunctionDecl *callee) {
        self(self, callee, selection);
      });
    };
    FunctionSelection selection;
    fold(functions.roots, selection, [&](auto &selection, const FunctionDecl *root) {
      include(include, root, selection);
    });
    timings.selectionMs = elapsedMs(selectionStarted);
    const auto serializationStarted = std::chrono::steady_clock::now();
    // Stream the compact tree directly. A JSON DOM retains a hash table for
    // every node and source position, amplifying large source files in memory.
    json::OStream output(llvm::outs());
    output.object([&] {
      output.attribute("kind", "TranslationUnitDecl");
      output.attributeArray("inner", [&] {
        fold(selection.selected, output, [&](json::OStream &output, const FunctionDecl *function) {
          serializer.function(output, function);
        });
      });
    });
    llvm::outs() << "\n";
    timings.serializationMs = elapsedMs(serializationStarted);
  }
private:
  std::string source;
  Timings &timings;
};

class ExtractionAction : public ASTFrontendAction {
public:
  ExtractionAction(std::string source, std::string manifest,
                   std::optional<DependencyState> preambleDependencies = std::nullopt)
      : source(std::move(source)), manifest(std::move(manifest)),
        collect(!this->manifest.empty() || preambleDependencies.has_value()),
        ownedMain(preambleDependencies.has_value()),
        dependencies(preambleDependencies.value_or(DependencyState{})) {}
  bool BeginSourceFileAction(CompilerInstance &compiler) override {
    timings.started = std::chrono::steady_clock::now();
    if (collect) {
      captureRuntime(dependencies);
      capturePath(dependencies, source);
      compiler.getPreprocessor().addPPCallbacks(std::make_unique<Dependencies>(compiler, dependencies));
    }
    return true;
  }
  void EndSourceFileAction() override {
    if (!collect) return;
    const auto frontendMs = elapsedMs(timings.started);
    captureBuffers(getCompilerInstance(), dependencies, ownedMain, false);
    if (manifest.empty()) return;
    std::error_code error;
    llvm::raw_fd_ostream stream(manifest, error);
    if (error) return;
    json::OStream output(stream);
    output.object([&] {
      output.attribute("schema", 1);
      output.attribute("reusable", dependencies.reusable);
      output.attributeArray("runtime", [&] {
        fold(dependencies.runtime, output, [](auto &output, const auto &file) {
          output.object([&] {
            output.attribute("path", file.first);
            output.attribute("stamp", file.second);
          });
        });
      });
      output.attributeObject("timings", [&] {
        output.attribute("frontendMs", frontendMs);
        output.attribute("selectionMs", timings.selectionMs);
        output.attribute("serializationMs", timings.serializationMs);
      });
      output.attributeArray("paths", [&] {
        fold(dependencies.paths, output, [&](auto &output, const auto &file) {
          output.object([&] {
            output.attribute("path", file.first);
            output.attribute("real", file.second.first);
            output.attribute("sha256", file.second.second);
            const auto stamp = dependencies.stamps.find(file.first);
            if (stamp != dependencies.stamps.end()) output.attribute("stamp", stamp->second);
          });
        });
      });
    });
  }
  std::unique_ptr<ASTConsumer> CreateASTConsumer(CompilerInstance &, llvm::StringRef) override {
    return std::make_unique<Extractor>(source, timings);
  }
  const DependencyState &getDependencies() const { return dependencies; }
private:
  std::string source;
  std::string manifest;
  bool collect;
  bool ownedMain;
  DependencyState dependencies;
  Timings timings;
};

class ExtractionFactory : public tooling::FrontendActionFactory {
public:
  ExtractionFactory(std::string source, std::string manifest)
      : source(std::move(source)), manifest(std::move(manifest)) {}
  std::unique_ptr<FrontendAction> create() override {
    return std::make_unique<ExtractionAction>(source, manifest);
  }
private:
  std::string source;
  std::string manifest;
};

// Required Clang interface. The dependency state is owned by the worker's
// build fold and never shared with another request or CompilerInstance.
class PreambleProof : public PreambleCallbacks {
public:
  explicit PreambleProof(DependencyState &dependencies) : dependencies(dependencies) {}
  void BeforeExecute(CompilerInstance &compiler) override {
    captureRuntime(dependencies);
    compiler.getPreprocessor().addPPCallbacks(std::make_unique<Dependencies>(compiler, dependencies));
  }
  void AfterExecute(CompilerInstance &compiler) override {
    captureBuffers(compiler, dependencies, true, true);
    captureRuntime(dependencies);
  }
private:
  DependencyState &dependencies;
};

// Open every directory component without following symlinks. Keep the selected
// directory inode alive while Clang owns its temporary PCH beneath that inode.
using OwnedDirectory = std::shared_ptr<const int>;
OwnedDirectory openPreambleDirectory(llvm::StringRef path) {
#ifdef __linux__
  if (!llvm::sys::path::is_absolute(path)) return {};
  llvm::SmallVector<llvm::StringRef> components;
  path.split(components, '/', -1, false);
  int directory = ::open("/", O_RDONLY | O_DIRECTORY | O_CLOEXEC);
  fold(components, directory, [](int &directory, llvm::StringRef component) {
    if (directory < 0) return;
    const int next = component == ".." ? -1 : ::openat(directory,
        component.str().c_str(), O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
    ::close(directory);
    directory = next;
  });
  if (directory < 0) return {};
  return OwnedDirectory(new int(directory), [](const int *directory) {
    ::close(*directory);
    delete directory;
  });
#else
  return {};
#endif
}

struct BuiltPreamble {
  OwnedDirectory storageDirectory;
  std::unique_ptr<PrecompiledPreamble> preamble;
  std::unique_ptr<llvm::MemoryBuffer> diskPch;
  std::string pchHash;
  DependencyState dependencies;
  std::vector<std::string> invocationArgs;
};

struct LoadedPreamble {
  std::unique_ptr<llvm::MemoryBuffer> pch;
  std::string pchPath;
  std::string pchHash;
  PreambleBounds bounds;
  std::string prefixHash;
  DependencyState dependencies;
  std::vector<std::string> invocationArgs;
};

// Both paths give Clang exactly the independently verified, immutable bytes.
// The caller owns pch until its CompilerInstance and AST have been destroyed.
llvm::IntrusiveRefCntPtr<llvm::vfs::FileSystem> preambleFileSystem(
    llvm::IntrusiveRefCntPtr<llvm::vfs::FileSystem> vfs,
    llvm::StringRef pchPath, const llvm::MemoryBuffer &pch) {
  auto pchFS = llvm::makeIntrusiveRefCnt<llvm::vfs::InMemoryFileSystem>();
  pchFS->addFile(pchPath, 0, llvm::MemoryBuffer::getMemBuffer(pch.getBuffer(), pchPath, false));
  auto overlay = llvm::makeIntrusiveRefCnt<llvm::vfs::OverlayFileSystem>(vfs);
  overlay->pushOverlay(pchFS);
  return overlay;
}

struct PreambleWorkerState {
  std::variant<std::monostate, BuiltPreamble, LoadedPreamble> artifact;
  // The kernel owns lock release on every exit, including SIGKILL. Never unlink
  // the persistent lock pathname: another waiter may already hold its inode.
  int lock = -1;
};

std::string invocationHash(const std::vector<std::string> &invocationArgs) {
  std::string encoded;
  llvm::raw_string_ostream stream(encoded);
  json::OStream output(stream);
  output.array([&] {
    fold(invocationArgs, output, [](auto &output, const auto &arg) { output.value(arg); });
  });
  stream.flush();
  return digest(encoded);
}

struct RestoredPreambleDependencies {
  DependencyState dependencies;
  std::string reason;
  std::set<std::string> expectedRuntime;
};
RestoredPreambleDependencies restorePreambleDependencies(const json::Object &request) {
  const auto *proof = request.getObject("dependencies");
  if (!proof || proof->getInteger("schema") != 1 || proof->getBoolean("reusable") != true)
    return {{}, "dependency-schema"};
  const auto *paths = proof->getArray("paths");
  const auto *runtime = proof->getArray("runtime");
  if (!paths || paths->empty() || !runtime || runtime->empty()) return {{}, "dependency-empty"};
  RestoredPreambleDependencies restored;
  fold(*paths, restored, [](auto &restored, const auto &value) {
    if (!restored.reason.empty()) return;
    const auto *file = value.getAsObject();
    if (!file) { restored.reason = "dependency-path-schema"; return; }
    const auto path = file->getString("path");
    const auto real = file->getString("real");
    const auto sha256 = file->getString("sha256");
    if (!path || !real || !sha256) { restored.reason = "dependency-path-schema"; return; }
    capturePath(restored.dependencies, *path);
    const auto captured = restored.dependencies.paths.find(path->str());
    if (!restored.dependencies.reusable) restored.reason = "dependency-path-observation:" + path->str();
    else if (captured == restored.dependencies.paths.end()) restored.reason = "dependency-path-missing:" + path->str();
    else if (captured->second.first != *real) restored.reason = "dependency-path-real:" + path->str();
    else if (captured->second.second != *sha256) restored.reason = "dependency-path-content:" + path->str();
  });
  if (!restored.reason.empty()) return restored;
  captureRuntime(restored.dependencies);
  if (!restored.dependencies.reusable) return {std::move(restored.dependencies), "runtime-observation"};
  fold(*runtime, restored, [](auto &restored, const auto &value) {
    if (!restored.reason.empty()) return;
    const auto *file = value.getAsObject();
    if (!file) { restored.reason = "runtime-schema"; return; }
    const auto path = file->getString("path");
    const auto stamp = file->getString("stamp");
    if (!path || !stamp) { restored.reason = "runtime-schema"; return; }
    restored.expectedRuntime.insert(path->str());
    const auto captured = restored.dependencies.runtime.find(path->str());
    if (captured != restored.dependencies.runtime.end()) {
      if (captured->second != *stamp) restored.reason = "runtime-stamp:" + path->str();
      return;
    }
    // captureRuntime also observes file-backed header/data mappings. A fresh
    // process need not have mapped those yet, but their old proof must remain
    // intact. Require exactly the original observation stamp before restoring.
    if (fileStamp(*path) != *stamp) { restored.reason = "runtime-unmapped-stamp:" + path->str(); return; }
    restored.dependencies.runtime.emplace(path->str(), stamp->str());
  });
  // Every image currently mapped by the fresh process must also be covered by
  // the build proof. A new DSO/runtime mapping cannot silently change context.
  fold(restored.dependencies.runtime, restored, [](auto &restored, const auto &file) {
    if (restored.reason.empty() && !restored.expectedRuntime.count(file.first))
      restored.reason = "runtime-new:" + file.first;
  });
  return restored;
}

void processPreambleRequest(PreambleWorkerState &state, const std::string &source,
                            const json::Object &request,
                            std::shared_ptr<CompilerInvocation> invocation) {
  const auto started = std::chrono::steady_clock::now();
  const auto buffer = llvm::MemoryBuffer::getFileAsStream(source);
  invocation->getFrontendOpts().DisableFree = false;
  invocation->getCodeGenOpts().DisableFree = false;
  const auto invocationArgs = invocation->getCC1CommandLine();
  auto vfs = llvm::vfs::getRealFileSystem();
  const auto operation = request.getString("operation");
  json::OStream output(llvm::outs());
  output.object([&] {
    if (!buffer || !operation) { output.attribute("ok", false); return; }
    const auto bounds = ComputePreambleBounds(invocation->getLangOpts(), (*buffer)->getMemBufferRef(), 0);
    const auto reject = [&](llvm::StringRef reason, llvm::StringRef loadFailure = "ArtifactRejected") {
      output.attribute("ok", false);
      output.attribute("reason", reason);
      if (*operation == "load") output.attribute("loadFailure", loadFailure);
    };
    if (*operation == "unlock") {
#ifdef __linux__
      if (state.lock >= 0) ::close(state.lock);
      state.lock = -1;
#endif
      output.attribute("ok", true);
    } else if (*operation == "lock") {
#ifdef __linux__
      const auto lockPath = request.getString("lockPath");
      if (state.lock >= 0 || !lockPath) { output.attribute("ok", false); return; }
      const auto directory = openPreambleDirectory(llvm::sys::path::parent_path(*lockPath));
      if (!directory) { output.attribute("ok", false); return; }
      const int lock = ::openat(*directory, llvm::sys::path::filename(*lockPath).str().c_str(),
          O_RDWR | O_CREAT | O_NOFOLLOW | O_NONBLOCK | O_CLOEXEC, 0600);
      struct stat metadata;
      if (lock < 0) { output.attribute("ok", false); return; }
      if (::fstat(lock, &metadata) || !S_ISREG(metadata.st_mode) || metadata.st_nlink != 1 ||
          metadata.st_uid != ::geteuid() || ::flock(lock, LOCK_EX)) {
        ::close(lock);
        output.attribute("ok", false);
        return;
      }
      state.lock = lock;
      output.attribute("ok", true);
#else
      output.attribute("ok", false);
#endif
    } else if (*operation == "describe") {
      output.attribute("ok", bounds.Size > 0);
    } else if (*operation == "build") {
      state.artifact = std::monostate{};
      BuiltPreamble built;
      built.invocationArgs = invocationArgs;
      PreambleProof proof(built.dependencies);
      const auto diagnostics = CompilerInstance::createDiagnostics(*vfs, invocation->getDiagnosticOpts());
      const auto storagePath = request.getString("storagePath");
      built.storageDirectory = storagePath ? openPreambleDirectory(*storagePath) : OwnedDirectory{};
      if (storagePath && !built.storageDirectory) { output.attribute("ok", false); return; }
      const auto anchoredStorage = built.storageDirectory ?
          "/proc/self/fd/" + std::to_string(*built.storageDirectory) : "";
      auto preamble = PrecompiledPreamble::Build(*invocation, buffer->get(), bounds,
          diagnostics, vfs, std::make_shared<PCHContainerOperations>(), !storagePath,
          anchoredStorage, proof);
      if (preamble) built.preamble = std::make_unique<PrecompiledPreamble>(std::move(*preamble));
      if (built.preamble && storagePath) {
        // Ask the public API for its selected temporary path. The original
        // invocation remains unchanged, and the preamble retains ownership.
        CompilerInvocation configured(*invocation);
        built.preamble->AddImplicitPreamble(configured, vfs, buffer->get());
        const auto pchPath = configured.getPreprocessorOpts().ImplicitPCHInclude;
#ifdef __linux__
        const int pchFile = ::openat(*built.storageDirectory,
            llvm::sys::path::filename(pchPath).str().c_str(), O_RDONLY | O_NOFOLLOW | O_NONBLOCK | O_CLOEXEC);
        struct stat metadata;
        if (pchFile < 0) { reject("build-pch-path"); return; }
        if (::fstat(pchFile, &metadata) || !S_ISREG(metadata.st_mode) || metadata.st_nlink != 1 ||
            metadata.st_size <= 0 || metadata.st_size > 256 * 1024 * 1024) {
          ::close(pchFile);
          reject("build-pch-metadata"); return;
        }
        auto diskPch = llvm::MemoryBuffer::getOpenFile(pchFile, pchPath, metadata.st_size, true, true);
        ::close(pchFile);
#else
        auto diskPch = llvm::MemoryBuffer::getFileAsStream(pchPath);
#endif
        if (!diskPch || (*diskPch)->getBufferSize() > 256 * 1024 * 1024) {
          reject("build-pch-read"); return;
        }
        built.diskPch = std::move(*diskPch);
        built.pchHash = digest(built.diskPch->getBuffer());
        output.attribute("pchPath", storagePath->str() + "/" + llvm::sys::path::filename(pchPath).str());
      }
      output.attribute("ok", bool(built.preamble) && bounds.Size > 0);
      output.attributeBegin("dependencies");
      writeDependencies(output, built.dependencies);
      output.attributeEnd();
      state.artifact = std::move(built);
    } else if (*operation == "load") {
      state.artifact = std::monostate{};
      const auto pchPath = request.getString("pchPath");
      const auto pchHash = request.getString("pchHash");
      const auto prefixHash = request.getString("prefixHash");
      const auto expectedInvocation = request.getString("invocationHash");
      const auto expectedBounds = request.getInteger("bounds");
      const auto expectedEnds = request.getBoolean("endsAtStartOfLine");
      if (!pchPath || !pchHash || !prefixHash || !expectedInvocation || !expectedBounds ||
          !expectedEnds || bounds.Size == 0 || *expectedBounds != bounds.Size ||
          *expectedEnds != bounds.PreambleEndsAtStartOfLine ||
          *prefixHash != digest((*buffer)->getBuffer().take_front(bounds.Size)) ||
          *expectedInvocation != invocationHash(invocationArgs)) {
        reject("load-identity", "InputsChanged"); return;
      }
      // Volatile, null-terminated getOpenFile deliberately copies instead of
      // mmap: later mutation cannot alter the checksum-verified VFS bytes.
#ifdef __linux__
      const auto directory = openPreambleDirectory(llvm::sys::path::parent_path(*pchPath));
      const int pchFile = directory ? ::openat(*directory,
          llvm::sys::path::filename(*pchPath).str().c_str(), O_RDONLY | O_NOFOLLOW | O_NONBLOCK | O_CLOEXEC) : -1;
      struct stat metadata;
      if (pchFile < 0) { reject("load-path"); return; }
      if (::fstat(pchFile, &metadata) || !S_ISREG(metadata.st_mode) || metadata.st_nlink != 1 ||
          metadata.st_size <= 0 || metadata.st_size > 256 * 1024 * 1024) {
        ::close(pchFile);
        reject("load-file-metadata"); return;
      }
      auto pch = llvm::MemoryBuffer::getOpenFile(pchFile, *pchPath, metadata.st_size, true, true);
      ::close(pchFile);
#else
      auto pch = llvm::MemoryBuffer::getFileAsStream(*pchPath);
#endif
      if (!pch || (*pch)->getBufferSize() > 256 * 1024 * 1024) { reject("load-read"); return; }
      if (digest((*pch)->getBuffer()) != *pchHash) { reject("load-checksum"); return; }
      auto restored = restorePreambleDependencies(request);
      if (!restored.reason.empty()) { reject(restored.reason); return; }
      // Validate Clang's control block against the same pinned bytes that parse
      // will consume. A matching host checksum does not prove an AST format.
      CompilerInstance validation(std::make_shared<CompilerInvocation>(*invocation));
      validation.setVirtualFileSystem(preambleFileSystem(vfs, *pchPath, **pch));
      validation.createDiagnostics();
      validation.createFileManager();
      if (!ASTReader::isAcceptableASTFile(*pchPath, validation.getFileManager(),
          validation.getModuleCache(), validation.getPCHContainerReader(),
          invocation->getLangOpts(), invocation->getCodeGenOpts(), invocation->getTargetOpts(),
          invocation->getPreprocessorOpts(), invocation->getHeaderSearchOpts(), "")) {
        reject("load-format"); return;
      }
      state.artifact = LoadedPreamble{std::move(*pch), pchPath->str(), pchHash->str(), bounds,
          prefixHash->str(), std::move(restored.dependencies), invocationArgs};
      output.attribute("ok", true);
      output.attributeBegin("dependencies");
      writeDependencies(output, std::get<LoadedPreamble>(state.artifact).dependencies);
      output.attributeEnd();
    } else if (*operation == "parse") {
      const auto *built = std::get_if<BuiltPreamble>(&state.artifact);
      const auto *loaded = std::get_if<LoadedPreamble>(&state.artifact);
      const auto dependencies = [&]() -> std::optional<DependencyState> {
        if (built && built->preamble && built->invocationArgs == invocationArgs &&
            built->preamble->CanReuse(*invocation, (*buffer)->getMemBufferRef(), bounds, *vfs)) {
          built->preamble->AddImplicitPreamble(*invocation, vfs, buffer->get());
          if (built->diskPch) vfs = preambleFileSystem(vfs,
              invocation->getPreprocessorOpts().ImplicitPCHInclude, *built->diskPch);
          return built->dependencies;
        }
        if (loaded && loaded->invocationArgs == invocationArgs &&
            loaded->bounds.Size == bounds.Size &&
            loaded->bounds.PreambleEndsAtStartOfLine == bounds.PreambleEndsAtStartOfLine &&
            loaded->prefixHash == digest((*buffer)->getBuffer().take_front(bounds.Size))) {
          auto &options = invocation->getPreprocessorOpts();
          options.addRemappedFile(invocation->getFrontendOpts().Inputs[0].getFile(), buffer->get());
          options.PrecompiledPreambleBytes = {bounds.Size, bounds.PreambleEndsAtStartOfLine};
          options.DisablePCHOrModuleValidation = DisableValidationForModuleKind::PCH;
          options.UsePredefines = false;
          options.ImplicitPCHInclude = loaded->pchPath;
          vfs = preambleFileSystem(vfs, loaded->pchPath, *loaded->pch);
          return loaded->dependencies;
        }
        return std::nullopt;
      }();
      if (!dependencies) { output.attribute("ok", false); return; }
      invocation->getPreprocessorOpts().RetainRemappedFileBuffers = true;
      CompilerInstance compiler(std::move(invocation));
      compiler.setVirtualFileSystem(vfs);
      compiler.createDiagnostics();
      ExtractionAction action(source, "", *dependencies);
      output.attributeBegin("ast");
      output.rawValue([&](llvm::raw_ostream &stream) {
        (void)stream;
        const bool parsed = compiler.ExecuteAction(action);
        if (!parsed) llvm::errs() << "Preamble extraction failed\n";
      });
      output.attributeEnd();
      output.attribute("ok", !compiler.getDiagnostics().hasErrorOccurred());
      output.attributeBegin("dependencies");
      writeDependencies(output, action.getDependencies());
      output.attributeEnd();
    } else {
      output.attribute("ok", false);
    }
    output.attribute("ms", elapsedMs(started));
    output.attribute("bounds", bounds.Size);
    output.attribute("endsAtStartOfLine", bounds.PreambleEndsAtStartOfLine);
    output.attribute("prefixHash", digest((*buffer)->getBuffer().take_front(bounds.Size)));
    output.attribute("sourceHash", digest((*buffer)->getBuffer()));
    output.attribute("invocationHash", invocationHash(invocationArgs));
    const auto *built = std::get_if<BuiltPreamble>(&state.artifact);
    const auto *loaded = std::get_if<LoadedPreamble>(&state.artifact);
    output.attribute("pchBytes", static_cast<int64_t>(built && built->diskPch ?
        built->diskPch->getBufferSize() : built && built->preamble ?
        built->preamble->getSize() : loaded ? loaded->pch->getBufferSize() : 0));
    if (built && built->diskPch) output.attribute("pchHash", built->pchHash);
    if (loaded) output.attribute("pchHash", loaded->pchHash);
  });
  llvm::outs() << '\x1e';
  llvm::outs().flush();
}

// Let the identical ClangTool driver choose cc1 flags, resource directory and
// header search context for both cold and preamble extraction.
class PreambleWorkerAction : public tooling::ToolAction {
public:
  PreambleWorkerAction(PreambleWorkerState &state, const std::string &source,
                       const json::Object &request)
      : state(state), source(source), request(request) {}
  bool runInvocation(std::shared_ptr<CompilerInvocation> invocation, FileManager *,
                     std::shared_ptr<PCHContainerOperations>, DiagnosticConsumer *) override {
    processPreambleRequest(state, source, request, std::move(invocation));
    return true;
  }
private:
  PreambleWorkerState &state;
  const std::string &source;
  const json::Object &request;
};

int preambleWorker(const std::string &source, const std::vector<std::string> &args) {
#ifdef __linux__
  // EOF cannot interrupt an active Clang parse. Ask the kernel to terminate
  // this worker when its host dies, including SIGKILL and extension-host crashes.
  // A changed parent after prctl means the death raced signal registration.
  const auto parent = ::getppid();
  if (parent == 1 || ::prctl(PR_SET_PDEATHSIG, SIGTERM) || ::getppid() != parent) return 1;
#endif
  struct RequestState { PreambleWorkerState worker; std::string line; bool oversized = false; };
  RequestState state;
  // Newline framing also admits spaces inside JSON paths. Bound accumulation
  // before parsing so a corrupt host cannot retain an unbounded request.
  std::cin >> std::noskipws;
  const auto requests = llvm::make_range(std::istream_iterator<char>(std::cin),
                                        std::istream_iterator<char>());
  fold(requests, state, [&](auto &state, char character) {
    if (character != '\n') {
      if (state.line.size() < 16 * 1024 * 1024) state.line.push_back(character);
      else state.oversized = true;
      return;
    }
    auto parsed = [&]() -> llvm::Expected<json::Value> {
      if (state.line == "build" || state.line == "parse")
        return json::Object{{"operation", state.line}};
      return json::parse(state.line);
    }();
    if (!parsed || !parsed->getAsObject() || state.oversized) {
      if (!parsed) llvm::consumeError(parsed.takeError());
      llvm::outs() << "{\"ok\":false}\x1e";
      llvm::outs().flush();
    } else {
      tooling::FixedCompilationDatabase database(".", args);
      tooling::ClangTool tool(database, {source});
      PreambleWorkerAction action(state.worker, source, *parsed->getAsObject());
      if (tool.run(&action) != 0) {
        llvm::outs() << "{\"ok\":false}\x1e";
        llvm::outs().flush();
      }
    }
    state.line.clear();
    state.oversized = false;
  });
  return 0;
}
} // namespace

int main(int argc, const char **argv) {
#ifdef __linux__
  if (argc == 2 && llvm::StringRef(argv[1]) == "--pch-lock") {
    const auto parent = ::getppid();
    if (parent == 1 || ::prctl(PR_SET_PDEATHSIG, SIGTERM) || ::getppid() != parent) return 1;
    struct stat metadata;
    if (::fstat(3, &metadata) || !S_ISREG(metadata.st_mode) || metadata.st_nlink != 1 ||
        metadata.st_uid != ::geteuid() || ::flock(3, LOCK_EX)) return 1;
    llvm::outs() << "locked\n";
    llvm::outs().flush();
    // stdin EOF or host disposal releases the inherited lock descriptor.
    (void)std::cin.get();
    return 0;
  }
#endif
  if (argc >= 5 && llvm::StringRef(argv[1]) == "--preamble-worker" &&
      llvm::StringRef(argv[2]) == "--source" && llvm::StringRef(argv[4]) == "--") {
    const std::string source = absolutePath(argv[3]);
    std::vector<std::string> args;
    fold(llvm::ArrayRef<const char *>(argv + 5, argc - 5), args,
        [](auto &args, const char *arg) { args.emplace_back(arg); });
    return preambleWorker(source, args);
  }
  // fold-state-jump-ast --source FILE -- [Clang compile options]
  const bool manifest = argc >= 6 && llvm::StringRef(argv[3]) == "--cache-manifest";
  const int flags = manifest ? 6 : 4;
  if (argc < flags || llvm::StringRef(argv[1]) != "--source" ||
      llvm::StringRef(argv[flags - 1]) != "--") {
    llvm::errs() << "Usage: fold-state-jump-ast --source FILE -- [clang flags]\n";
    return 2;
  }
  const std::string source = absolutePath(argv[2]);
  std::vector<std::string> args;
  fold(llvm::ArrayRef<const char *>(argv + flags, argc - flags), args,
      [](auto &args, const char *arg) { args.emplace_back(arg); });
  tooling::FixedCompilationDatabase database(".", args);
  tooling::ClangTool tool(database, {source});
  ExtractionFactory factory(source, manifest ? argv[4] : "");
  return tool.run(&factory);
}
