#include <clang/AST/ASTConsumer.h>
#include <clang/AST/DeclCXX.h>
#include <clang/AST/ExprCXX.h>
#include <clang/AST/RecursiveASTVisitor.h>
#include <clang/Frontend/CompilerInstance.h>
#include <clang/Frontend/FrontendAction.h>
#include <clang/Frontend/PrecompiledPreamble.h>
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
#ifdef __linux__
#include <csignal>
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

struct PreambleWorkerState {
  std::unique_ptr<PrecompiledPreamble> preamble;
  DependencyState dependencies;
  std::vector<std::string> invocationArgs;
};

void processPreambleRequest(PreambleWorkerState &state, const std::string &source,
                            const std::string &request,
                            std::shared_ptr<CompilerInvocation> invocation) {
  const auto started = std::chrono::steady_clock::now();
  const auto buffer = llvm::MemoryBuffer::getFileAsStream(source);
  invocation->getFrontendOpts().DisableFree = false;
  invocation->getCodeGenOpts().DisableFree = false;
  // This is the complete ordered sequence generated by generateCC1CommandLine,
  // before PCH-specific options or main-file remapping are introduced.
  const auto invocationArgs = invocation->getCC1CommandLine();
  auto vfs = llvm::vfs::getRealFileSystem();
  json::OStream output(llvm::outs());
  output.object([&] {
    if (!buffer || !invocation) { output.attribute("ok", false); return; }
    const auto bounds = ComputePreambleBounds(invocation->getLangOpts(), (*buffer)->getMemBufferRef(), 0);
    if (request == "build") {
      state.preamble.reset();
      state.dependencies = DependencyState{};
      state.invocationArgs = invocationArgs;
      PreambleProof proof(state.dependencies);
      const auto diagnostics = CompilerInstance::createDiagnostics(*vfs, invocation->getDiagnosticOpts());
      auto preamble = PrecompiledPreamble::Build(*invocation, buffer->get(), bounds,
          diagnostics, vfs, std::make_shared<PCHContainerOperations>(), true, "", proof);
      if (preamble) state.preamble = std::make_unique<PrecompiledPreamble>(std::move(*preamble));
      // Publication requires the host to verify this independent proof and
      // the exact source prefix before it is permitted to issue `parse`.
      output.attribute("ok", bool(state.preamble) && bounds.Size > 0);
      output.attribute("bounds", bounds.Size);
      output.attribute("prefixHash", digest((*buffer)->getBuffer().take_front(bounds.Size)));
      output.attribute("sourceHash", digest((*buffer)->getBuffer()));
      output.attributeBegin("dependencies");
      writeDependencies(output, state.dependencies);
      output.attributeEnd();
    } else if (request == "parse" && state.preamble && state.invocationArgs == invocationArgs &&
               state.preamble->CanReuse(*invocation, (*buffer)->getMemBufferRef(), bounds, *vfs)) {
      state.preamble->AddImplicitPreamble(*invocation, vfs, buffer->get());
      invocation->getPreprocessorOpts().RetainRemappedFileBuffers = true;
      // The main buffer and preamble both outlive the compiler and its AST.
      CompilerInstance compiler(std::move(invocation));
      compiler.setVirtualFileSystem(vfs);
      compiler.createDiagnostics();
      ExtractionAction action(source, "", state.dependencies);
      output.attributeBegin("ast");
      output.rawValue([&](llvm::raw_ostream &stream) {
        // ExtractionAction streams to the same stdout; rawValue records the
        // envelope's JSON state without retaining a second AST in memory.
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
    output.attribute("pchBytes", static_cast<int64_t>(state.preamble ? state.preamble->getSize() : 0));
  });
  // A JSON string escapes all control characters. The record separator is
  // unambiguous even for multiline JSON emitted by the existing serializer.
  llvm::outs() << '\x1e';
  llvm::outs().flush();
}

// Let the identical ClangTool driver choose cc1 flags, resource directory and
// header search context for both cold and preamble extraction.
class PreambleWorkerAction : public tooling::ToolAction {
public:
  PreambleWorkerAction(PreambleWorkerState &state, const std::string &source,
                       const std::string &request)
      : state(state), source(source), request(request) {}
  bool runInvocation(std::shared_ptr<CompilerInvocation> invocation, FileManager *,
                     std::shared_ptr<PCHContainerOperations>, DiagnosticConsumer *) override {
    processPreambleRequest(state, source, request, std::move(invocation));
    return true;
  }
private:
  PreambleWorkerState &state;
  const std::string &source;
  const std::string &request;
};

int preambleWorker(const std::string &source, const std::vector<std::string> &args) {
#ifdef __linux__
  // EOF cannot interrupt an active Clang parse. Ask the kernel to terminate
  // this worker when its host dies, including SIGKILL and extension-host crashes.
  // A changed parent after prctl means the death raced signal registration.
  const auto parent = ::getppid();
  if (parent == 1 || ::prctl(PR_SET_PDEATHSIG, SIGTERM) || ::getppid() != parent) return 1;
#endif
  PreambleWorkerState state;
  // No files, locks or recovery metadata survive this process. Each token
  // gets a fresh driver and FileManager, so implicit toolchain discovery is
  // re-evaluated even when the command, source prefix and environment match.
  const auto requests = llvm::make_range(std::istream_iterator<std::string>(std::cin),
                                        std::istream_iterator<std::string>());
  fold(requests, state, [&](auto &state, const std::string &request) {
    tooling::FixedCompilationDatabase database(".", args);
    tooling::ClangTool tool(database, {source});
    PreambleWorkerAction action(state, source, request);
    if (tool.run(&action) != 0) {
      llvm::outs() << "{\"ok\":false}\x1e";
      llvm::outs().flush();
    }
  });
  return 0;
}
} // namespace

int main(int argc, const char **argv) {
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
