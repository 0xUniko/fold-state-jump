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
#include <llvm/Support/FormatVariadic.h>
#include <llvm/Support/JSON.h>
#include <llvm/Support/Path.h>
#include <llvm/Support/raw_ostream.h>
#include <llvm/ADT/StringExtras.h>
#include <llvm/ADT/DenseSet.h>
#include <cstdint>
#include <numeric>
#include <memory>
#include <string>
#include <vector>

namespace {
namespace json = llvm::json;
using namespace clang;

std::string absolutePath(llvm::StringRef name) {
  llvm::SmallString<256> pathname(name);
  if (llvm::sys::path::is_relative(pathname)) {
    if (llvm::sys::fs::make_absolute(pathname)) return name.str();
  }
  llvm::sys::path::remove_dots(pathname, true);
  return std::string(pathname);
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
      : context(context), sm(context.getSourceManager()) {}

  std::string fileFor(SourceLocation position) const {
    if (position.isInvalid()) return "";
    position = sm.getExpansionLoc(position);
    const auto name = sm.getFilename(position);
    return name.empty() ? "" : absolutePath(name);
  }

  json::Object location(SourceLocation position) const {
    json::Object result;
    const std::string file = fileFor(position);
    if (file.empty()) return result;
    const auto expansion = sm.getExpansionLoc(position);
    result["file"] = file;
    result["offset"] = static_cast<int64_t>(sm.getFileOffset(expansion));
    result["tokLen"] = static_cast<int64_t>(
        Lexer::MeasureTokenLength(expansion, sm, context.getLangOpts()));
    return result;
  }

  json::Object range(SourceRange span) const {
    return json::Object{{"begin", location(span.getBegin())},
                        {"end", location(span.getEnd())}};
  }

  json::Object parameter(const ParmVarDecl *parameter) const {
    return json::Object{
        {"kind", "ParmVarDecl"}, {"id", identity(parameter)},
        {"name", parameter->getNameAsString()},
        {"type", json::Object{{"qualType", parameter->getType().getAsString()}}},
        {"loc", location(parameter->getLocation())},
        {"range", range(parameter->getSourceRange())}};
  }

  json::Object variable(const VarDecl *variable, unsigned depth) const {
    json::Array inner;
    if (const auto *initializer = variable->getInit())
      inner.push_back(statement(initializer, depth + 1));
    return json::Object{
        {"kind", "VarDecl"}, {"id", identity(variable)},
        {"name", variable->getNameAsString()},
        {"type", json::Object{{"qualType", variable->getType().getAsString()}}},
        {"loc", location(variable->getLocation())},
        {"range", range(variable->getSourceRange())}, {"inner", std::move(inner)}};
  }

  json::Object statement(const Stmt *stmt, unsigned depth = 0) const {
    if (depth > 256) return json::Object{{"kind", "UnsupportedDepth"}};
    json::Object node{{"kind", stmt->getStmtClassName()},
                      {"range", range(stmt->getSourceRange())}};
    if (const auto *expression = llvm::dyn_cast<Expr>(stmt)) {
      node["type"] = json::Object{{"qualType", expression->getType().getAsString()}};
      node["dependent"] = expression->isTypeDependent();
    }
    if (const auto *call = llvm::dyn_cast<CallExpr>(stmt)) {
      if (const auto *callee = call->getDirectCallee())
        node["callee"] = json::Object{
            {"id", identity(callee)}, {"name", callee->getNameAsString()},
            {"qualifiedName", callee->getQualifiedNameAsString()}};
    }
    if (const auto *call = llvm::dyn_cast<CXXOperatorCallExpr>(stmt)) {
      node["opcode"] = getOperatorSpelling(call->getOperator());
      node["memberOperator"] = call->getDirectCallee() &&
          llvm::isa<CXXMethodDecl>(call->getDirectCallee());
    }
    if (const auto *reference = llvm::dyn_cast<DeclRefExpr>(stmt)) {
      const auto *declaration = reference->getDecl();
      node["referencedDecl"] = json::Object{
          {"id", identity(declaration)},
          {"name", declaration->getNameAsString()},
          {"type", json::Object{{"qualType", declaration->getType().getAsString()}}}};
    } else if (const auto *member = llvm::dyn_cast<MemberExpr>(stmt)) {
      node["name"] = member->getMemberNameInfo().getAsString();
      node["referencedMemberDecl"] = identity(member->getMemberDecl());
    } else if (const auto *member = llvm::dyn_cast<CXXDependentScopeMemberExpr>(stmt)) {
      node["name"] = member->getMember().getAsString();
    } else if (const auto *lookup = llvm::dyn_cast<UnresolvedLookupExpr>(stmt)) {
      node["name"] = lookup->getName().getAsString();
    } else if (const auto *unary = llvm::dyn_cast<UnaryOperator>(stmt)) {
      node["opcode"] = UnaryOperator::getOpcodeStr(unary->getOpcode()).str();
    } else if (const auto *binary = llvm::dyn_cast<BinaryOperator>(stmt)) {
      node["opcode"] = BinaryOperator::getOpcodeStr(binary->getOpcode()).str();
    }
    json::Array inner;
    if (const auto *declarations = llvm::dyn_cast<DeclStmt>(stmt)) {
      const auto declarationRange = declarations->decls();
      inner = std::accumulate(declarationRange.begin(), declarationRange.end(), json::Array{},
          [&](json::Array inner, const Decl *declaration) {
            if (const auto *local = llvm::dyn_cast<VarDecl>(declaration))
              inner.push_back(variable(local, depth));
            return inner;
          });
    } else if (const auto *lambda = llvm::dyn_cast<LambdaExpr>(stmt)) {
      node["captureDefault"] = lambda->getCaptureDefault() == LCD_ByRef ? "reference" :
          lambda->getCaptureDefault() == LCD_ByCopy ? "copy" : "none";
      const auto captureRange = lambda->captures();
      node["captures"] = std::accumulate(captureRange.begin(), captureRange.end(), json::Array{},
          [&](json::Array captures, const LambdaCapture &capture) {
            if (capture.capturesVariable())
              captures.push_back(json::Object{
                  {"id", identity(capture.getCapturedVar())},
                  {"kind", capture.getCaptureKind() == LCK_ByRef ? "reference" : "copy"}});
            return captures;
          });
      if (const auto *method = lambda->getCallOperator()) {
        json::Array members;
        members.push_back(function(method, depth + 1));
        if (const auto *methodTemplate = method->getDescribedFunctionTemplate()) {
          const auto specializations = methodTemplate->specializations();
          members = std::accumulate(specializations.begin(), specializations.end(), std::move(members),
              [&](json::Array members, const FunctionDecl *specialization) {
                if (specialization->hasBody()) members.push_back(function(specialization, depth + 1));
                return members;
              });
        }
        inner.push_back(json::Object{{"kind", "CXXRecordDecl"},
                                     {"inner", std::move(members)}});
      }
    } else {
      for (const auto *child : stmt->children())
        if (child) inner.push_back(statement(child, depth + 1));
    }
    if (!inner.empty()) node["inner"] = std::move(inner);
    return node;
  }

  json::Object function(const FunctionDecl *function, unsigned depth = 0) const {
    json::Array inner;
    for (const auto *param : function->parameters()) inner.push_back(parameter(param));
    if (const auto *body = function->getBody()) inner.push_back(statement(body, depth));
    return json::Object{
        {"kind", llvm::isa<CXXConstructorDecl>(function) ? "CXXConstructorDecl" :
                 llvm::isa<CXXDestructorDecl>(function) ? "CXXDestructorDecl" :
                 llvm::isa<CXXConversionDecl>(function) ? "CXXConversionDecl" :
                 llvm::isa<CXXMethodDecl>(function) ? "CXXMethodDecl" : "FunctionDecl"},
        {"id", identity(function)}, {"name", function->getNameAsString()},
        {"dependent", function->isDependentContext()},
        {"type", json::Object{{"qualType", function->getType().getAsString()}}},
        {"loc", location(function->getLocation())},
        {"range", range(function->getSourceRange())}, {"inner", std::move(inner)}};
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

class Extractor : public ASTConsumer {
public:
  explicit Extractor(std::string source) : source(std::move(source)) {}
  void HandleTranslationUnit(ASTContext &context) override {
    const Serializer serializer(context);
    SourceFunctions functions(serializer);
    functions.TraverseDecl(context.getTranslationUnitDecl());
    // Avoid dumping the complete translation unit: serialize active-file
    // functions and only their transitively called non-system definitions.
    llvm::DenseSet<const FunctionDecl *> seen;
    const auto include = [&](const auto &self, const FunctionDecl *function,
                             std::vector<const FunctionDecl *> &selected) -> void {
      const auto *definition = function->getDefinition();
      if (!definition || !serializer.inUserCode(definition)) return;
      // Canonical declarations give stable deduplication across redeclarations
      // and specializations without an O(F) scan for every reached function.
      if (!seen.insert(definition->getCanonicalDecl()).second) return;
      selected.push_back(definition);
      CalledFunctions calls;
      calls.TraverseStmt(definition->getBody());
      for (const auto *callee : calls.called) self(self, callee, selected);
    };
    std::vector<const FunctionDecl *> selected;
    for (const auto *root : functions.roots) include(include, root, selected);
    json::Array inner;
    for (const auto *function : selected) inner.push_back(serializer.function(function));
    json::Object result{{"kind", "TranslationUnitDecl"}, {"inner", std::move(inner)}};
    llvm::outs() << llvm::formatv("{0}", json::Value(std::move(result))) << "\n";
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
  for (int i = 4; i < argc; ++i) args.emplace_back(argv[i]);
  tooling::FixedCompilationDatabase database(".", args);
  tooling::ClangTool tool(database, {source});
  ExtractionFactory factory(source);
  return tool.run(&factory);
}
