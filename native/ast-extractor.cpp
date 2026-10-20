#include <clang/AST/ASTConsumer.h>
#include <clang/AST/DeclCXX.h>
#include <clang/AST/ExprCXX.h>
#include <clang/AST/RecursiveASTVisitor.h>
#include <clang/Frontend/CompilerInstance.h>
#include <clang/Frontend/FrontendAction.h>
#include <clang/Lex/Lexer.h>
#include <clang/Tooling/Tooling.h>
#include <llvm/Support/FileSystem.h>
#include <llvm/Support/FormatVariadic.h>
#include <llvm/Support/JSON.h>
#include <llvm/Support/Path.h>
#include <llvm/Support/raw_ostream.h>
#include <llvm/ADT/StringExtras.h>
#include <cstdint>
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
  Serializer(ASTContext &context, llvm::StringRef source)
      : context(context), sm(context.getSourceManager()), source(absolutePath(source)) {}

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

  json::Object statement(const Stmt *stmt, unsigned depth = 0) const {
    if (depth > 256) return json::Object{{"kind", "UnsupportedDepth"}};
    json::Object node{{"kind", stmt->getStmtClassName()},
                      {"range", range(stmt->getSourceRange())}};
    if (const auto *reference = llvm::dyn_cast<DeclRefExpr>(stmt)) {
      const auto *declaration = reference->getDecl();
      node["referencedDecl"] = json::Object{
          {"id", identity(declaration)},
          {"name", declaration->getNameAsString()},
          {"type", json::Object{{"qualType", declaration->getType().getAsString()}}}};
    } else if (const auto *member = llvm::dyn_cast<MemberExpr>(stmt)) {
      node["name"] = member->getMemberNameInfo().getAsString();
    } else if (const auto *unary = llvm::dyn_cast<UnaryOperator>(stmt)) {
      node["opcode"] = UnaryOperator::getOpcodeStr(unary->getOpcode()).str();
    } else if (const auto *binary = llvm::dyn_cast<BinaryOperator>(stmt)) {
      node["opcode"] = BinaryOperator::getOpcodeStr(binary->getOpcode()).str();
    }
    json::Array inner;
    if (const auto *lambda = llvm::dyn_cast<LambdaExpr>(stmt)) {
      if (const auto *method = lambda->getCallOperator()) {
        json::Array methodInner;
        for (const auto *param : method->parameters()) methodInner.push_back(parameter(param));
        if (method->hasBody()) methodInner.push_back(statement(method->getBody(), depth + 1));
        json::Array members;
        members.push_back(json::Object{
            {"kind", "CXXMethodDecl"}, {"id", identity(method)},
            {"name", "operator()"},
            {"type", json::Object{{"qualType", method->getType().getAsString()}}},
            {"loc", location(method->getLocation())},
            {"range", range(method->getSourceRange())},
            {"inner", std::move(methodInner)}});
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

  json::Object function(const FunctionDecl *function) const {
    json::Array inner;
    for (const auto *param : function->parameters()) inner.push_back(parameter(param));
    if (const auto *body = function->getBody()) inner.push_back(statement(body));
    return json::Object{
        {"kind", llvm::isa<CXXConstructorDecl>(function) ? "CXXConstructorDecl" :
                 llvm::isa<CXXDestructorDecl>(function) ? "CXXDestructorDecl" :
                 llvm::isa<CXXConversionDecl>(function) ? "CXXConversionDecl" :
                 llvm::isa<CXXMethodDecl>(function) ? "CXXMethodDecl" : "FunctionDecl"},
        {"id", identity(function)}, {"name", function->getNameAsString()},
        {"type", json::Object{{"qualType", function->getType().getAsString()}}},
        {"loc", location(function->getLocation())},
        {"range", range(function->getSourceRange())}, {"inner", std::move(inner)}};
  }

  bool inSource(const FunctionDecl *function) const {
    return fileFor(function->getLocation()) == source;
  }

  bool inUserCode(const FunctionDecl *function) const {
    const auto location = sm.getExpansionLoc(function->getLocation());
    return location.isValid() && !sm.isInSystemHeader(location);
  }

private:
  ASTContext &context;
  SourceManager &sm;
  const std::string source;
};

class CalledFunctions : public RecursiveASTVisitor<CalledFunctions> {
public:
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
    const Serializer serializer(context, source);
    SourceFunctions functions(serializer);
    functions.TraverseDecl(context.getTranslationUnitDecl());
    // Avoid dumping the complete translation unit: serialize active-file
    // functions and only their transitively called non-system definitions.
    const auto include = [&](const auto &self, const FunctionDecl *function,
                             std::vector<const FunctionDecl *> &selected) -> void {
      const auto *definition = function->getDefinition();
      if (!definition || !serializer.inUserCode(definition)) return;
      const auto *canonical = definition->getCanonicalDecl();
      for (const auto *existing : selected)
        if (existing->getCanonicalDecl() == canonical) return;
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
