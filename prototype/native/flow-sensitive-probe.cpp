// flow-sensitive-probe: a real Clang 23 DataflowAnalysis experiment.
//
// It defines a small reaching-definitions lattice over storage paths and runs
// Clang's flow-sensitive solver over each non-templated function CFG.  This is
// deliberately an experiment, not the production engine: it demonstrates the
// API's CFG/Environment/join/fixpoint behavior on branches, loops and fields.
#include "clang/AST/ASTConsumer.h"
#include "clang/AST/ASTContext.h"
#include "clang/AST/RecursiveASTVisitor.h"
#include "clang/Analysis/CFG.h"
#include "clang/Analysis/FlowSensitive/AdornedCFG.h"
#include "clang/Analysis/FlowSensitive/DataflowAnalysis.h"
#include "clang/Analysis/FlowSensitive/DataflowAnalysisContext.h"
#include "clang/Analysis/FlowSensitive/DataflowEnvironment.h"
#include "clang/Analysis/FlowSensitive/WatchedLiteralsSolver.h"
#include "clang/Basic/SourceManager.h"
#include "clang/Frontend/CompilerInstance.h"
#include "clang/Frontend/FrontendAction.h"
#include "clang/Lex/Lexer.h"
#include "clang/Tooling/CommonOptionsParser.h"
#include "clang/Tooling/Tooling.h"
#include "clang/UnifiedSymbolResolution/USRGeneration.h"
#include "llvm/Support/CommandLine.h"
#include "llvm/Support/JSON.h"
#include "llvm/Support/raw_ostream.h"

#include <map>
#include <set>
#include <string>

using namespace clang;
using namespace clang::tooling;
using namespace clang::dataflow;

static llvm::cl::opt<int> TargetLine("line", llvm::cl::desc("source line to report"),
                                     llvm::cl::init(-1));
static llvm::cl::opt<std::string> FunctionFilter(
    "function", llvm::cl::desc("only analyze functions containing this text"),
    llvm::cl::init(""));
static llvm::cl::OptionCategory Cat("flow-sensitive-probe");

static std::string usr(const Decl *D) {
  llvm::SmallString<160> B;
  if (clang::index::generateUSRForDecl(D, B))
    return "";
  return std::string(B.str());
}

struct Facts {
  // StorageLocation identity -> set of source definitions ("line:col").
  // StorageLocation objects are owned by the DataflowAnalysisContext arena, so
  // their addresses are stable for the duration of one function analysis.
  std::map<std::uintptr_t, std::set<std::string>> defs;

  bool operator==(const Facts &O) const { return defs == O.defs; }
  LatticeJoinEffect join(const Facts &O) {
    bool changed = false;
    for (const auto &[k, v] : O.defs) {
      auto &dst = defs[k];
      for (const auto &x : v)
        changed |= dst.insert(x).second;
    }
    return changed ? LatticeJoinEffect::Changed : LatticeJoinEffect::Unchanged;
  }
};

class ReachingDefs : public DataflowAnalysis<ReachingDefs, Facts> {
  ASTContext &Ctx;

public:
  explicit ReachingDefs(ASTContext &C) : DataflowAnalysis(C), Ctx(C) {}

  Facts initialElement() { return {}; }

  std::string exprText(const Expr *E) {
    return Lexer::getSourceText(
               CharSourceRange::getTokenRange(E->getSourceRange()),
               Ctx.getSourceManager(), Ctx.getLangOpts())
        .str();
  }

  std::string path(const Expr *E, int Depth = 0) {
    if (!E || Depth > 24)
      return "";
    E = E->IgnoreParenImpCasts();
    if (auto *D = dyn_cast<DeclRefExpr>(E))
      return "d:" + usr(D->getDecl());
    if (isa<CXXThisExpr>(E))
      return "this:" + std::to_string((uintptr_t)E);
    if (auto *M = dyn_cast<MemberExpr>(E)) {
      std::string B = path(M->getBase(), Depth + 1);
      if (B.empty())
        return "";
      return B + "." + M->getMemberNameInfo().getAsString();
    }
    if (auto *M = dyn_cast<CXXDependentScopeMemberExpr>(E)) {
      std::string B = M->getBase() ? path(M->getBase(), Depth + 1) : "";
      return B.empty() ? "" : B + "." + M->getMemberNameInfo().getAsString();
    }
    if (auto *A = dyn_cast<ArraySubscriptExpr>(E)) {
      std::string B = path(A->getBase(), Depth + 1);
      if (B.empty()) return "";
      if (auto *I = dyn_cast<IntegerLiteral>(A->getIdx()))
        return B + "[" + std::to_string(I->getValue().getZExtValue()) + "]";
      return B + "[*]";
    }
    if (auto *U = dyn_cast<UnaryOperator>(E)) {
      if (U->getOpcode() == UO_Deref) {
        std::string B = path(U->getSubExpr(), Depth + 1);
        return B.empty() ? "" : B + "->*";
      }
    }
    return "";
  }

  std::string loc(SourceLocation L) {
    auto &SM = Ctx.getSourceManager();
    auto P = SM.getPresumedLoc(SM.getSpellingLoc(L));
    if (!P.isValid()) return "";
    return std::to_string(P.getLine()) + ":" + std::to_string(P.getColumn());
  }

  void write(Facts &F, const Expr *LHS, SourceLocation L, Environment &Env) {
    if (const StorageLocation *SL = Env.getStorageLocation(*LHS))
      F.defs[reinterpret_cast<std::uintptr_t>(SL)] = {loc(L)};
  }

  void transfer(const CFGElement &Element, Facts &F, Environment &Env) {
    auto S = Element.getAs<CFGStmt>();
    if (!S) return;
    const Stmt *St = S->getStmt();
    if (!St) return;
    if (auto *DS = dyn_cast<DeclStmt>(St)) {
      for (const Decl *D : DS->decls())
        if (auto *VD = dyn_cast<VarDecl>(D))
          if (const StorageLocation *SL = Env.getStorageLocation(*VD))
            F.defs[reinterpret_cast<std::uintptr_t>(SL)] = {loc(VD->getLocation())};
      return;
    }
    if (auto *BO = dyn_cast<BinaryOperator>(St)) {
      if (BO->getOpcode() == BO_Assign || BO->isCompoundAssignmentOp()) {
        write(F, BO->getLHS(), BO->getOperatorLoc(), Env);
        return;
      }
    }
    if (auto *U = dyn_cast<UnaryOperator>(St)) {
      if (U->isIncrementDecrementOp())
        write(F, U->getSubExpr(), U->getOperatorLoc(), Env);
    }
  }
};

struct Consumer : ASTConsumer {
  ASTContext &Ctx;
  explicit Consumer(ASTContext &C) : Ctx(C) {}
  void HandleTranslationUnit(ASTContext &C) override {
    struct V : RecursiveASTVisitor<V> {
      ASTContext &C;
      explicit V(ASTContext &C) : C(C) {}
      void analyze(FunctionDecl *FD) {
        if (!FD || !FD->doesThisDeclarationHaveABody() || FD->isTemplated())
          return;
        auto &SM = C.getSourceManager();
        if (!SM.isWrittenInMainFile(SM.getSpellingLoc(FD->getLocation())))
          return;
        std::string Name = FD->getQualifiedNameAsString();
        if (!FunctionFilter.empty() && Name.find(FunctionFilter) == std::string::npos)
          return;
        auto ACFG = AdornedCFG::build(*FD);
        if (!ACFG) {
          llvm::consumeError(ACFG.takeError());
          return;
        }
        ReachingDefs Analysis(C);
        WatchedLiteralsSolver Solver;
        DataflowAnalysisContext DACtx(Solver);
        Environment InitEnv(DACtx, *FD);
        auto Callback = [&](const CFGElement &El,
                            const DataflowAnalysisState<Facts> &State) {
          auto S = El.getAs<CFGStmt>();
          if (!S) return;
          const Stmt *St = S->getStmt();
          if (!St || TargetLine < 0) return;
          auto P = SM.getPresumedLoc(SM.getSpellingLoc(St->getBeginLoc()));
          if (!P.isValid() || int(P.getLine()) != TargetLine) return;
          struct W : RecursiveASTVisitor<W> {
            ReachingDefs &A;
            const Facts &F;
            const Environment &Env;
            std::string Name;
            W(ReachingDefs &A, const Facts &F, const Environment &Env,
              std::string Name)
                : A(A), F(F), Env(Env), Name(std::move(Name)) {}
            bool VisitMemberExpr(MemberExpr *M) {
              report(A.path(M), M);
              return true;
            }
            bool VisitDeclRefExpr(DeclRefExpr *D) {
              report(A.path(D), D);
              return true;
            }
            void report(const std::string &P, const Expr *E) {
              if (P.empty()) return;
              llvm::json::OStream J(llvm::outs());
              J.objectBegin();
              J.attribute("fn", Name);
              J.attribute("path", P);
              J.attribute("expr", A.exprText(E));
              J.attributeArray("defs", [&] {
                const StorageLocation *SL = Env.getStorageLocation(*E);
                if (!SL) return;
                auto It = F.defs.find(reinterpret_cast<std::uintptr_t>(SL));
                if (It == F.defs.end()) return;
                for (const auto &D : It->second) J.value(D);
              });
              J.objectEnd();
              llvm::outs() << "\n";
            }
          } Walker(Analysis, State.Lattice, State.Env, Name);
          Walker.TraverseStmt(const_cast<Stmt *>(St));
        };
        CFGEltCallbacks<ReachingDefs> CB;
        CB.Before = Callback;
        auto States = runDataflowAnalysis(*ACFG, Analysis, InitEnv, CB);
        if (!States) {
          llvm::consumeError(States.takeError());
          llvm::errs() << "analysis error in " << Name << "\n";
          return;
        }
        llvm::errs() << "analyzed " << Name << " blocks="
                     << ACFG->getCFG().getNumBlockIDs() << "\n";
      }
      bool VisitFunctionDecl(FunctionDecl *FD) {
        analyze(FD);
        return true;
      }
      bool VisitLambdaExpr(LambdaExpr *L) {
        analyze(L->getCallOperator());
        return true;
      }
    } V(C);
    V.TraverseDecl(C.getTranslationUnitDecl());
  }
};

struct Action : ASTFrontendAction {
  std::unique_ptr<ASTConsumer> CreateASTConsumer(CompilerInstance &CI,
                                                 StringRef) override {
    return std::make_unique<Consumer>(CI.getASTContext());
  }
};

int main(int argc, const char **argv) {
  auto O = CommonOptionsParser::create(argc, argv, Cat);
  if (!O) {
    llvm::errs() << llvm::toString(O.takeError()) << "\n";
    return 1;
  }
  ClangTool Tool(O->getCompilations(), O->getSourcePathList());
  return Tool.run(newFrontendActionFactory<Action>().get());
}
