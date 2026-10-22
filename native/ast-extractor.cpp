#include <clang/AST/ASTConsumer.h>
#include <clang/AST/DeclCXX.h>
#include <clang/AST/ExprCXX.h>
#include <clang/AST/RecursiveASTVisitor.h>
#include <clang/Frontend/CompilerInstance.h>
#include <clang/Frontend/FrontendAction.h>
#include <clang/Lex/Lexer.h>
#include <clang/Tooling/CompilationDatabase.h>
#include <clang/Tooling/Tooling.h>
#include <llvm/Support/FileSystem.h>
#include <llvm/Support/JSON.h>
#include <llvm/Support/Path.h>
#include <llvm/Support/raw_ostream.h>
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

class Extractor : public ASTConsumer {
public:
  explicit Extractor(std::string source) : source(std::move(source)) {}
  void HandleTranslationUnit(ASTContext &context) override {
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
  }
private:
  std::string source;
};

class ExtractionAction : public ASTFrontendAction {
public:
  explicit ExtractionAction(std::string source) : source(std::move(source)) {}
  std::unique_ptr<ASTConsumer> CreateASTConsumer(CompilerInstance &, llvm::StringRef) override {
    return std::make_unique<Extractor>(source);
  }
private:
  std::string source;
};

class ExtractionFactory : public tooling::FrontendActionFactory {
public:
  explicit ExtractionFactory(std::string source) : source(std::move(source)) {}
  std::unique_ptr<FrontendAction> create() override {
    return std::make_unique<ExtractionAction>(source);
  }
private:
  std::string source;
};
} // namespace

int main(int argc, const char **argv) {
  // fold-state-jump-ast --source FILE -- [Clang compile options]
  if (argc < 4 || llvm::StringRef(argv[1]) != "--source" ||
      llvm::StringRef(argv[3]) != "--") {
    llvm::errs() << "Usage: fold-state-jump-ast --source FILE -- [clang flags]\n";
    return 2;
  }
  const std::string source = absolutePath(argv[2]);
  std::vector<std::string> args;
  fold(llvm::ArrayRef<const char *>(argv + 4, argc - 4), args,
      [](auto &args, const char *arg) { args.emplace_back(arg); });
  tooling::FixedCompilationDatabase database(".", args);
  tooling::ClangTool tool(database, {source});
  ExtractionFactory factory(source);
  return tool.run(&factory);
}
