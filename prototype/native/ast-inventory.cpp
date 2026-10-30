// ast-inventory: source-level semantic inventory for C++ state tracing research.
//
// Emits newline-delimited JSON records.  It uses Clang's AST and CFG rather than
// regular expressions.  Records cover source files, functions (including
// template instances and lambdas), records/fields, fold calls, and per-function
// CFG blocks containing read/write/call/alias/return events.  Storage identity
// is a root (declaration USR, `this`, call result, lambda) plus a member/index
// suffix.  References and captures are explicit events; the query engine
// resolves them instead of guessing from names.
#include "clang/AST/ASTConsumer.h"
#include "clang/AST/ASTContext.h"
#include "clang/AST/DeclCXX.h"
#include "clang/AST/RecordLayout.h"
#include "clang/AST/ExprCXX.h"
#include "clang/AST/RecursiveASTVisitor.h"
#include "clang/Analysis/CFG.h"
#include "clang/Basic/SourceManager.h"
#include "clang/Frontend/CompilerInstance.h"
#include "clang/Frontend/FrontendAction.h"
#include "clang/Lex/Lexer.h"
#include "clang/Tooling/CommonOptionsParser.h"
#include "clang/Tooling/Tooling.h"
#include "clang/UnifiedSymbolResolution/USRGeneration.h"
#include "llvm/ADT/DenseMap.h"
#include "llvm/ADT/DenseSet.h"
#include "llvm/ADT/SmallString.h"
#include "llvm/ADT/StringSet.h"
#include "llvm/Support/CommandLine.h"
#include "llvm/Support/JSON.h"
#include "llvm/Support/raw_ostream.h"

#include <algorithm>
#include <map>
#include <optional>
#include <set>
#include <string>
#include <vector>

using namespace clang;
using namespace clang::tooling;

static llvm::cl::OptionCategory ToolCategory("ast-inventory");

static llvm::cl::opt<std::string> ProjectRoot(
    "root", llvm::cl::desc("Only emit declarations/events below this directory"),
    llvm::cl::init("."), llvm::cl::cat(ToolCategory));
static llvm::cl::opt<bool> IncludeTests(
    "include-tests", llvm::cl::desc("Include */tests/* translation units"),
    llvm::cl::init(false), llvm::cl::cat(ToolCategory));

static std::string usrFor(const Decl *D) {
  if (!D)
    return {};
  llvm::SmallString<160> Buf;
  if (clang::index::generateUSRForDecl(D, Buf))
    return {};
  return std::string(Buf.str());
}

struct Loc {
  std::string file;
  unsigned line = 0, col = 0, offset = 0;
  unsigned endLine = 0, endCol = 0, endOffset = 0;
  bool valid = false;
};

struct Emitter {
  ASTContext &Ctx;
  SourceManager &SM;
  const LangOptions &LO;
  std::string Root;
  llvm::raw_ostream &OS;
  unsigned NextFunction = 1;
  unsigned NextFold = 1;
  unsigned NextEvent = 1;
  llvm::StringSet<> SeenFunctions;
  llvm::StringSet<> SeenRecords;
  llvm::StringSet<> SeenCFG;

  Emitter(ASTContext &Ctx, llvm::raw_ostream &OS, std::string Root)
      : Ctx(Ctx), SM(Ctx.getSourceManager()), LO(Ctx.getLangOpts()),
        Root(std::move(Root)), OS(OS) {}

  bool inProject(llvm::StringRef Path) const {
    if (Path.empty() || !Path.starts_with(Root))
      return false;
    if (Path.contains("/llama.cpp/") || Path.contains("/vcpkg/") ||
        Path.contains("/vcpkg_installed/") || Path.contains("/build") ||
        Path.contains("/_deps/") || Path.contains("/.cache/"))
      return false;
    if (!IncludeTests && Path.contains("/tests/"))
      return false;
    return true;
  }

  bool inProject(SourceLocation L) const {
    if (L.isInvalid())
      return false;
    auto PL = SM.getPresumedLoc(SM.getSpellingLoc(L));
    return PL.isValid() && inProject(PL.getFilename());
  }

  Loc loc(SourceLocation L, SourceRange R = {}) const {
    Loc Out;
    if (L.isInvalid())
      return Out;
    SourceLocation SL = SM.getSpellingLoc(L);
    auto PL = SM.getPresumedLoc(SL);
    if (!PL.isValid())
      return Out;
    Out.file = PL.getFilename();
    Out.line = PL.getLine();
    Out.col = PL.getColumn();
    Out.offset = SM.getFileOffset(SL);
    if (R.isValid()) {
      SourceLocation EL = SM.getSpellingLoc(R.getEnd());
      auto EP = SM.getPresumedLoc(EL);
      if (EP.isValid()) {
        Out.endLine = EP.getLine();
        Out.endCol = EP.getColumn();
        Out.endOffset = SM.getFileOffset(EL);
      }
    }
    Out.valid = true;
    return Out;
  }

  std::string text(SourceRange R) const {
    if (R.isInvalid())
      return {};
    return Lexer::getSourceText(CharSourceRange::getTokenRange(R), SM, LO).str();
  }
  std::string text(SourceLocation B, SourceLocation E) const {
    if (B.isInvalid() || E.isInvalid())
      return {};
    return Lexer::getSourceText(CharSourceRange::getTokenRange(B, E), SM, LO)
        .str();
  }

  static void locJson(llvm::json::OStream &J, const Loc &L) {
    J.attribute("file", L.file);
    J.attribute("line", L.line);
    J.attribute("col", L.col);
    J.attribute("offset", L.offset);
    if (L.endLine) {
      J.attribute("endLine", L.endLine);
      J.attribute("endCol", L.endCol);
      J.attribute("endOffset", L.endOffset);
    }
  }

  std::string typeStr(QualType T) const {
    if (T.isNull())
      return {};
    return T.getAsString(Ctx.getPrintingPolicy());
  }
};

struct SPath {
  std::string root;
  std::string suffix;
  std::string rootType;
  std::string full() const { return root + suffix; }
  bool known() const { return !root.empty(); }
};

static SPath append(SPath P, llvm::StringRef S) {
  P.suffix += S.str();
  return P;
}

class EventBuilder {
public:
  Emitter &E;
  std::string Fn;
  std::string CurrentThis;
  unsigned Block = 0;
  unsigned Order = 0;
  unsigned OpaqueSeq = 0;
  std::vector<unsigned> Ids;
  llvm::DenseMap<const CallExpr *, SPath> CallResults;
  int ExprDepth = 0;

  EventBuilder(Emitter &E, std::string Fn, std::string CurrentThis)
      : E(E), Fn(std::move(Fn)), CurrentThis(std::move(CurrentThis)) {}

  unsigned nextEvent() { return E.NextEvent++; }

  void startBlock(unsigned B) {
    Block = B;
    Order = 0;
    Ids.clear();
  }

  const Expr *strip(const Expr *X) {
    while (X) {
      if (auto *E = dyn_cast<ExprWithCleanups>(X))
        X = E->getSubExpr();
      else if (auto *B = dyn_cast<CXXBindTemporaryExpr>(X))
        X = B->getSubExpr();
      else if (auto *M = dyn_cast<MaterializeTemporaryExpr>(X))
        X = M->getSubExpr();
      else if (auto *F = dyn_cast<CXXFunctionalCastExpr>(X))
        X = F->getSubExpr();
      else if (auto *I = dyn_cast<ImplicitCastExpr>(X))
        X = I->getSubExpr();
      else if (auto *C = dyn_cast<ConstantExpr>(X))
        X = C->getSubExpr();
      else if (auto *S = dyn_cast<SubstNonTypeTemplateParmExpr>(X))
        X = S->getReplacement();
      else if (auto *D = dyn_cast<CXXDefaultArgExpr>(X))
        X = D->getExpr();
      else
        break;
      while (X && (isa<ParenExpr>(X) || isa<FullExpr>(X)))
        X = isa<ParenExpr>(X) ? cast<ParenExpr>(X)->getSubExpr()
                              : cast<FullExpr>(X)->getSubExpr();
    }
    return X;
  }

  SPath path(const Expr *Raw, int Depth = 0) {
    if (!Raw || Depth > 40)
      return {};
    const Expr *X = strip(Raw);
    while (true) {
      if (auto *B = dyn_cast<CXXBindTemporaryExpr>(X))
        X = B->getSubExpr()->IgnoreParenImpCasts();
      else if (auto *M = dyn_cast<MaterializeTemporaryExpr>(X))
        X = M->getSubExpr()->IgnoreParenImpCasts();
      else if (auto *C = dyn_cast<ConstantExpr>(X))
        X = C->getSubExpr()->IgnoreParenImpCasts();
      else if (auto *S = dyn_cast<SubstNonTypeTemplateParmExpr>(X))
        X = S->getReplacement()->IgnoreParenImpCasts();
      else if (auto *C = dyn_cast<CXXDefaultArgExpr>(X))
        X = C->getExpr()->IgnoreParenImpCasts();
      else
        break;
    }
    if (auto *D = dyn_cast<DeclRefExpr>(X)) {
      const ValueDecl *VD = D->getDecl();
      return {"decl:" + usrFor(VD), {}, E.typeStr(VD->getType())};
    }
    if (auto *T = dyn_cast<CXXThisExpr>(X)) {
      QualType Ty = T->getType();
      if (Ty->isPointerType())
        Ty = Ty->getPointeeType();
      return {CurrentThis, {}, E.typeStr(Ty)};
    }
    if (auto *M = dyn_cast<CXXDependentScopeMemberExpr>(X)) {
      SPath Base = M->getBase() ? path(M->getBase(), Depth + 1) : SPath{CurrentThis, {}};
      if (!Base.known())
        Base = {CurrentThis, {}};
      std::string Name = M->getMemberNameInfo().getAsString();
      if (Name.empty())
        Name = "dependent-member";
      return append(std::move(Base), (M->isArrow() ? "->" : ".") + Name);
    }
    if (auto *M = dyn_cast<UnresolvedMemberExpr>(X)) {
      SPath Base = M->getBase() ? path(M->getBase(), Depth + 1) : SPath{CurrentThis, {}};
      if (!Base.known())
        Base = {CurrentThis, {}};
      std::string Name = M->getMemberNameInfo().getAsString();
      if (Name.empty())
        Name = "unresolved-member";
      return append(std::move(Base), (M->isArrow() ? "->" : ".") + Name);
    }
    if (auto *M = dyn_cast<MemberExpr>(X)) {
      SPath Base = path(M->getBase(), Depth + 1);
      if (!Base.known())
        Base = {CurrentThis, {}};
      if (!Base.known())
        return {};
      std::string Name = M->getMemberNameInfo().getAsString();
      if (Name.empty() && M->getMemberDecl())
        Name = M->getMemberDecl()->getNameAsString();
      if (Name.empty())
        Name = "anonymous";
      return append(std::move(Base), (M->isArrow() ? "->" : ".") + Name);
    }
    if (auto *A = dyn_cast<ArraySubscriptExpr>(X)) {
      SPath Base = path(A->getBase(), Depth + 1);
      if (!Base.known())
        return {};
      const Expr *Idx = A->getIdx()->IgnoreParenImpCasts();
      if (auto *IL = dyn_cast<IntegerLiteral>(Idx))
        return append(std::move(Base), "[" +
                                           std::to_string(
                                               IL->getValue().getZExtValue()) +
                                           "]");
      return append(std::move(Base), "[*:" + E.text(Idx->getSourceRange()) + "]");
    }
    if (auto *U = dyn_cast<UnaryOperator>(X)) {
      if (U->getOpcode() == UO_Deref) {
        SPath Base = path(U->getSubExpr(), Depth + 1);
        if (!Base.known())
          return {};
        return append(std::move(Base), "->*");
      }
      if (U->getOpcode() == UO_AddrOf)
        return path(U->getSubExpr(), Depth + 1);
    }
    if (auto *C = dyn_cast<CXXMemberCallExpr>(X)) {
      const FunctionDecl *FD = C->getDirectCallee();
      std::string Name = FD ? FD->getNameAsString() : "";
      SPath Base = path(C->getImplicitObjectArgument(), Depth + 1);
      if (!Base.known())
        return {};
      if (Name == "at" || Name == "operator[]") {
        std::string Idx =
            C->getNumArgs() ? E.text(C->getArg(0)->getSourceRange()) : "*";
        return append(std::move(Base), "[" + Name + ":" + Idx + "]");
      }
      if (Name == "front")
        return append(std::move(Base), "[front]");
      if (Name == "back")
        return append(std::move(Base), "[back]");
      if (Name == "get" || Name == "value" || Name == "operator*" ||
          Name == "operator->")
        return append(std::move(Base), "[" + Name + "]");
      return {};
    }
    if (auto *C = dyn_cast<CXXOperatorCallExpr>(X)) {
      const FunctionDecl *FD = C->getDirectCallee();
      if (FD && FD->getNameAsString() == "operator[]" && C->getNumArgs() >= 2) {
        SPath Base = path(C->getArg(0), Depth + 1);
        if (!Base.known())
          return {};
        const Expr *Idx = C->getArg(1)->IgnoreParenImpCasts();
        if (auto *IL = dyn_cast<IntegerLiteral>(Idx))
          return append(std::move(Base), "[" +
                                             std::to_string(IL->getValue()
                                                                .getZExtValue()) +
                                             "]");
        return append(std::move(Base),
                      "[*:" + E.text(Idx->getSourceRange()) + "]");
      }
      if (FD && FD->getNameAsString() == "operator*" && C->getNumArgs() == 1)
        return append(path(C->getArg(0), Depth + 1), "[operator*]");
      if (FD && FD->getNameAsString() == "operator->" && C->getNumArgs() == 1)
        return path(C->getArg(0), Depth + 1);
    }
    if (auto *Call = dyn_cast<CallExpr>(X)) {
      auto It = CallResults.find(Call);
      if (It != CallResults.end())
        return It->second;
      if (const FunctionDecl *FD = Call->getDirectCallee()) {
        if (FD->getNameAsString() == "move" || FD->getNameAsString() == "__move" ||
            FD->getNameAsString() == "forward" ||
            FD->getNameAsString() == "__forward") {
          if (Call->getNumArgs())
            return path(Call->getArg(0), Depth + 1);
        }
        if (FD->getNameAsString() == "get" && Call->getNumArgs()) {
          SPath B = path(Call->getArg(0), Depth + 1);
          if (!B.known()) return {};
          std::string Args;
          for (unsigned I = 0; I < Call->getNumArgs(); ++I) {
            if (I) Args += ",";
            Args += E.text(Call->getArg(I)->getSourceRange());
          }
          return append(std::move(B), "[get:" + Args + "]");
        }
      }
      return {};
    }
    if (auto *CC = dyn_cast<CXXConstructExpr>(X)) {
      const CXXConstructorDecl *CD = CC->getConstructor();
      if (CD && (CD->isCopyConstructor() || CD->isMoveConstructor()) &&
          CC->getNumArgs())
        return path(CC->getArg(0), Depth + 1);
      return {};
    }
    if (auto *BO = dyn_cast<BinaryOperator>(X)) {
      if (BO->getOpcode() == BO_Assign)
        return path(BO->getLHS(), Depth + 1);
    }
    return {};
  }

  std::string typeOf(const Expr *X) const {
    return X ? E.typeStr(X->getType()) : std::string();
  }

  std::string literalText(const Expr *Raw) {
    if (!Raw)
      return {};
    const Expr *X = strip(Raw);
    if (auto *I = dyn_cast<IntegerLiteral>(X)) {
      llvm::SmallString<32> B;
      I->getValue().toString(B, 10, false);
      return std::string(B.str());
    }
    if (auto *C = dyn_cast<CXXFunctionalCastExpr>(X))
      return literalText(C->getSubExpr());
    if (auto *I = dyn_cast<InitListExpr>(X)) {
      if (I->getNumInits())
        return literalText(I->getInit(0));
    }
    return {};
  }

  std::string firstInteger(const Expr *Raw) {
    if (!Raw)
      return {};
    const Expr *X = strip(Raw);
    if (auto *I = dyn_cast<IntegerLiteral>(X))
      return literalText(I);
    if (auto *C = dyn_cast<CXXFunctionalCastExpr>(X))
      return firstInteger(C->getSubExpr());
    if (auto *I = dyn_cast<InitListExpr>(X)) {
      for (const Expr *Elt : I->inits()) {
        std::string V = firstInteger(Elt);
        if (!V.empty()) return V;
      }
      return {};
    }
    for (const Stmt *Child : X->children())
      if (const auto *CE = dyn_cast<Expr>(Child)) {
        std::string V = firstInteger(CE);
        if (!V.empty()) return V;
      }
    return {};
  }

  std::string rangeStart(const CallExpr *CE, unsigned Base) {
    // ranges::views::iota(start, end) or std::iota-like call.  Use the source
    // spelling to recognize the CPO call, then take the first integer literal.
    const Expr *R = CE->getNumArgs() > Base ? CE->getArg(Base) : nullptr;
    if (!R)
      return {};
    std::string Text = E.text(R->getSourceRange());
    if (Text.find("iota") == std::string::npos)
      return {};
    return firstInteger(R);
  }

  void beginEvent(llvm::json::OStream &J, const char *Kind) {
    J.objectBegin();
    J.attribute("kind", "event");
    J.attribute("id", nextEvent());
    J.attribute("fn", Fn);
    J.attribute("block", Block);
    J.attribute("order", Order++);
    J.attribute("event", Kind);
  }

  unsigned currentId() const { return E.NextEvent - 1; }

  void emit(const char *Kind, const Expr *X, SPath P,
            llvm::StringRef Sub = {}) {
    unsigned Id = nextEvent();
    Ids.push_back(Id);
    llvm::json::OStream J(E.OS);
    J.objectBegin();
    J.attribute("kind", "event");
    J.attribute("id", Id);
    J.attribute("fn", Fn);
    J.attribute("block", Block);
    J.attribute("order", Order++);
    J.attribute("event", Kind);
    if (!Sub.empty())
      J.attribute("subkind", Sub);
    if (P.known()) {
      J.attribute("storage", P.full());
      J.attribute("root", P.root);
      J.attribute("suffix", P.suffix);
      if (!P.rootType.empty())
        J.attribute("rootType", P.rootType);
    }
    if (X) {
      J.attribute("expr", E.text(X->getSourceRange()));
      J.attribute("type", typeOf(X));
      Emitter::locJson(J, E.loc(X->getBeginLoc(), X->getSourceRange()));
    }
    J.objectEnd();
    E.OS << "\n";
  }

  void emitValue(const char *Kind, const Expr *X, SPath P, std::string Value,
                 llvm::StringRef Sub = {}) {
    unsigned Id = nextEvent();
    Ids.push_back(Id);
    llvm::json::OStream J(E.OS);
    J.objectBegin();
    J.attribute("kind", "event");
    J.attribute("id", Id);
    J.attribute("fn", Fn);
    J.attribute("block", Block);
    J.attribute("order", Order++);
    J.attribute("event", Kind);
    if (!Sub.empty())
      J.attribute("subkind", Sub);
    if (P.known()) {
      J.attribute("storage", P.full());
      J.attribute("root", P.root);
      J.attribute("suffix", P.suffix);
      if (!P.rootType.empty())
        J.attribute("rootType", P.rootType);
    }
    if (!Value.empty())
      J.attribute("value", Value);
    if (X) {
      J.attribute("expr", E.text(X->getSourceRange()));
      J.attribute("type", typeOf(X));
      Emitter::locJson(J, E.loc(X->getBeginLoc(), X->getSourceRange()));
    }
    J.objectEnd();
    E.OS << "\n";
  }

  void emitAt(const char *Kind, SourceLocation L, SourceRange R, SPath P,
              std::string Value, llvm::StringRef Sub = {}) {
    unsigned Id = nextEvent();
    Ids.push_back(Id);
    llvm::json::OStream J(E.OS);
    J.objectBegin();
    J.attribute("kind", "event");
    J.attribute("id", Id);
    J.attribute("fn", Fn);
    J.attribute("block", Block);
    J.attribute("order", Order++);
    J.attribute("event", Kind);
    if (!Sub.empty())
      J.attribute("subkind", Sub);
    if (P.known()) {
      J.attribute("storage", P.full());
      J.attribute("root", P.root);
      J.attribute("suffix", P.suffix);
      if (!P.rootType.empty())
        J.attribute("rootType", P.rootType);
    }
    if (!Value.empty())
      J.attribute("value", Value);
    J.attribute("expr", E.text(R));
    Emitter::locJson(J, E.loc(L, R));
    J.objectEnd();
    E.OS << "\n";
  }

  void emitCapture(SourceLocation L, SourceRange R, SPath Src,
                   llvm::StringRef Lambda, llvm::StringRef Kind,
                   llvm::StringRef Name) {
    unsigned Id = nextEvent();
    Ids.push_back(Id);
    llvm::json::OStream J(E.OS);
    J.objectBegin();
    J.attribute("kind", "event");
    J.attribute("id", Id);
    J.attribute("fn", Fn);
    J.attribute("block", Block);
    J.attribute("order", Order++);
    J.attribute("event", "capture");
    J.attribute("captureKind", Kind);
    J.attribute("storage", Src.full());
    J.attribute("value", Src.full());
    J.attribute("lambda", Lambda);
    J.attribute("expr", Name);
    Emitter::locJson(J, E.loc(L, R));
    J.objectEnd();
    E.OS << "\n";
  }

  void emitWriteAt(SourceLocation L, SourceRange LR, SourceRange ER, SPath Dest,
                   std::string Value, llvm::StringRef Sub) {
    unsigned Id = nextEvent();
    Ids.push_back(Id);
    llvm::json::OStream J(E.OS);
    J.objectBegin();
    J.attribute("kind", "event");
    J.attribute("id", Id);
    J.attribute("fn", Fn);
    J.attribute("block", Block);
    J.attribute("order", Order++);
    J.attribute("event", "write");
    if (!Sub.empty()) J.attribute("subkind", Sub);
    if (Dest.known()) {
      J.attribute("storage", Dest.full());
      J.attribute("root", Dest.root);
      J.attribute("suffix", Dest.suffix);
      if (!Dest.rootType.empty()) J.attribute("rootType", Dest.rootType);
    }
    if (!Value.empty()) J.attribute("value", Value);
    J.attribute("expr", E.text(ER));
    Emitter::locJson(J, E.loc(L, LR));
    J.objectEnd();
    E.OS << "\n";
  }

  std::string fieldName(const RecordDecl *RD, unsigned Index) {
    unsigned I = 0;
    for (const FieldDecl *F : RD->fields()) {
      if (I++ == Index)
        return F->getNameAsString().empty()
                   ? ("anonymous@" + std::to_string(F->getFieldIndex()))
                   : F->getNameAsString();
    }
    return "field" + std::to_string(Index);
  }

  // Direct-call identities are stable handles for value provenance even when
  // the call has no named storage path (e.g. a factory returning a value).
  std::map<const CallExpr *, unsigned> CallIds;

  std::string valueOfSingle(const Expr *Raw) {
    if (!Raw)
      return {};
    const Expr *X = strip(Raw);
    if (auto *C = dyn_cast<CXXConstructExpr>(X)) {
      if (C->getNumArgs() == 1)
        return valueOf(C->getArg(0));
      return {};
    }
    if (auto *CE = dyn_cast<CallExpr>(X)) {
      auto It = CallIds.find(CE);
      if (It != CallIds.end())
        return "call:" + std::to_string(It->second);
    }
    return {};
  }

  std::string valueOf(const Expr *Raw) {
    if (!Raw)
      return {};
    SPath P = path(Raw);
    if (P.known())
      return P.full();
    if (auto *CE = dyn_cast<CallExpr>(strip(Raw))) {
      auto It = CallIds.find(CE);
      if (It != CallIds.end())
        return "call:" + std::to_string(It->second);
    }
    // Constructors and `new` expressions propagate the identity of a factory
    // call used as their single initializer.
    if (auto *N = dyn_cast<CXXNewExpr>(strip(Raw))) {
      if (const CXXConstructExpr *C = N->getConstructExpr())
        return valueOfSingle(C);
      if (const Expr *Init = N->getInitializer()) {
        const Expr *S = strip(Init);
        if (auto *IL = dyn_cast<InitListExpr>(S)) {
          if (IL->getNumInits() == 1)
            return valueOf(IL->getInit(0));
        } else {
          std::string V = valueOf(S);
          if (!V.empty())
            return V;
        }
      }
    }
    if (auto *C = dyn_cast<CXXConstructExpr>(strip(Raw)))
      return valueOfSingle(C);
    if (auto *F = dyn_cast<CXXFunctionalCastExpr>(strip(Raw)))
      return valueOf(F->getSubExpr());
    return "expr:" + E.text(Raw->getSourceRange());
  }

  bool aggregateWrite(SPath Dest, const Expr *Raw, const char *Kind) {
    const Expr *X = strip(Raw);
    if (auto *IL = dyn_cast<InitListExpr>(X)) {
      const InitListExpr *Sem =
          IL->getSemanticForm() ? IL->getSemanticForm() : IL;
      const RecordDecl *RD = Sem->getType()->getAsRecordDecl();
      if (!RD)
        return false;
      unsigned I = 0;
      for (const Expr *Init : Sem->inits()) {
        if (!Init) {
          ++I;
          continue;
        }
        SPath D = append(Dest, "." + fieldName(RD, I));
        if (!aggregateWrite(D, Init, Kind)) {
          processExpr(Init);
          emitValue("write", Init, D, valueOf(Init), Kind);
        }
        ++I;
      }
      return true;
    }
    if (auto *D = dyn_cast<DesignatedInitExpr>(X)) {
      const FieldDecl *F = !D->designators().empty() ? D->getDesignator(0)->getFieldDecl() : nullptr;
      SPath Sub = F ? append(Dest, "." + F->getNameAsString()) : Dest;
      if (!aggregateWrite(Sub, D->getInit(), Kind)) {
        processExpr(D->getInit());
        emitValue("write", D->getInit(), Sub, valueOf(D->getInit()), Kind);
      }
      return true;
    }
    if (auto *CC = dyn_cast<CXXConstructExpr>(X)) {
      const CXXConstructorDecl *CD = CC->getConstructor();
      if (!CD || CC->getNumArgs() == 0)
        return false;
      if (CD->isCopyConstructor() || CD->isMoveConstructor()) {
        processExpr(CC->getArg(0));
        emitValue(CD->isMoveConstructor() ? "move" : "copy", CC->getArg(0), Dest,
                  path(CC->getArg(0)).full(), Kind);
        return true;
      }
      const RecordDecl *RD = CC->getType()->getAsRecordDecl();
      if (RD && cast<CXXRecordDecl>(RD)->isAggregate() && CC->getNumArgs() <= RD->getNumFields()) {
        unsigned I = 0;
        for (const Expr *Init : CC->arguments()) {
          SPath D = append(Dest, "." + fieldName(RD, I));
          if (!aggregateWrite(D, Init, Kind)) {
            processExpr(Init);
            emitValue("write", Init, D, valueOf(Init), Kind);
          }
          ++I;
        }
        return true;
      }
    }
    if (auto *UC = dyn_cast<CXXUnresolvedConstructExpr>(X)) {
      if (UC->getNumArgs() == 1 && isa<InitListExpr>(UC->getArg(0)))
        return aggregateWrite(Dest, UC->getArg(0), Kind);
      const RecordDecl *RD = UC->getType()->getAsRecordDecl();
      if (RD && UC->getNumArgs() <= RD->getNumFields()) {
        unsigned I = 0;
        for (const Expr *Init : UC->arguments()) {
          SPath D = append(Dest, "." + fieldName(RD, I));
          if (!aggregateWrite(D, Init, Kind)) {
            processExpr(Init);
            emitValue("write", Init, D, valueOf(Init), Kind);
          }
          ++I;
        }
        return true;
      }
    }
    return false;
  }

  void writeDest(SPath Dest, const Expr *Rhs, const char *Kind,
                 const Expr *Lhs = nullptr, const Decl *Owner = nullptr) {
    if (!Dest.known() || !Rhs)
      return;
    const Expr *R = strip(Rhs);
    if (auto *CE = dyn_cast<CallExpr>(R)) {
      std::string Which;
      if (isFoldCall(CE, Which)) {
        foldCall(const_cast<CallExpr *>(CE), Which, Dest);
        return;
      }
    }
    // Keep a whole-object assignment event anchored at the statement so a
    // source query on it resolves; emit it before the field writes so the
    // field values remain the reaching definitions at later program points.
    const bool Anchored = Owner != nullptr || Lhs != nullptr;
    // The declaration name range is the stable, searchable anchor for an
    // initialization (`BatchState batch_state`), while the location still
    // covers the whole declaration.
    const SourceRange OwnerAnchor =
        Owner ? SourceRange(Owner->getBeginLoc(), Owner->getLocation())
              : SourceRange{};
    const auto emitWhole = [&](const std::string &Value) {
      const llvm::StringRef Sub = Value.empty() ? llvm::StringRef("aggregate")
                                                : llvm::StringRef(Kind);
      if (Owner)
        emitWriteAt(Owner->getBeginLoc(), Owner->getSourceRange(),
                    OwnerAnchor, Dest, Value, Sub);
      else if (Lhs)
        emitWriteAt(Lhs->getBeginLoc(), Lhs->getSourceRange(),
                    Lhs->getSourceRange(), Dest, Value, Sub);
    };
    if (Anchored) emitWhole("");
    if (aggregateWrite(Dest, Rhs, Kind)) return;
    {
      SPath V = processExpr(Rhs);
      const std::string Value = V.known() ? V.full() : valueOf(Rhs);
      if (Anchored) emitWhole(Value);
      else emitValue("write", Rhs, Dest, Value, Kind);
    }
  }

  bool isFoldCall(const CallExpr *CE, std::string &Which) {
    if (const FunctionDecl *FD = CE->getDirectCallee()) {
      std::string N = FD->getNameAsString();
      std::string Q = FD->getQualifiedNameAsString();
      if (N == "fold_left" || N == "accumulate" || N == "fold_right" ||
          N == "reduce") {
        Which = N;
        return true;
      }
      if (Q.find("fold_left") != std::string::npos) { Which = "fold_left"; return true; }
      if (Q.find("accumulate") != std::string::npos) { Which = "accumulate"; return true; }
      if (Q.find("fold_right") != std::string::npos) { Which = "fold_right"; return true; }
    }
    std::string Full = E.text(CE->getSourceRange());
    std::string Head = Full.substr(0, Full.find('('));
    if (Head.find("fold_left") != std::string::npos) { Which = "fold_left"; return true; }
    if (Head.find("accumulate") != std::string::npos) { Which = "accumulate"; return true; }
    if (Head.find("fold_right") != std::string::npos) { Which = "fold_right"; return true; }
    return false;
  }

  void foldCall(CallExpr *CE, std::string Which, std::optional<SPath> Dest) {
    unsigned Base = 0;
    if (isa<CXXOperatorCallExpr>(CE) && CE->getNumArgs() >= 4) {
      const Expr *A0 = CE->getArg(0)->IgnoreParenImpCasts();
      if (auto *D = dyn_cast<DeclRefExpr>(A0)) {
        if (D->getDecl() && D->getDecl()->getNameAsString() == "fold_left")
          Base = 1;
      }
      if (!Base && E.text(A0->getSourceRange()).find("fold_left") != std::string::npos)
        Base = 1;
    }
    unsigned SeedIndex = Base + 1;
    if (Which == "accumulate" || Which == "reduce")
      SeedIndex = 2;
    const Expr *Seed = CE->getNumArgs() > SeedIndex ? CE->getArg(SeedIndex) : nullptr;
    const LambdaExpr *Lambda = nullptr;
    for (unsigned I = Base; I < CE->getNumArgs(); ++I) {
      if (auto *L = dyn_cast<LambdaExpr>(CE->getArg(I)->IgnoreParenImpCasts())) {
        Lambda = L;
        break;
      }
    }
    unsigned FoldId = E.NextFold++;
    std::string LambdaFn;
    if (Lambda) {
      LambdaFn = usrFor(Lambda->getCallOperator());
      for (const LambdaCapture &Cap : Lambda->captures()) {
        if (!Cap.capturesVariable())
          continue;
        const ValueDecl *VD = Cap.getCapturedVar();
        SPath Src{"decl:" + usrFor(VD), {}};
        unsigned Cid = nextEvent();
        Ids.push_back(Cid);
        llvm::json::OStream CJ(E.OS);
        CJ.objectBegin();
        CJ.attribute("kind", "event");
        CJ.attribute("id", Cid);
        CJ.attribute("fn", Fn);
        CJ.attribute("block", Block);
        CJ.attribute("order", Order++);
        CJ.attribute("event", "capture");
        CJ.attribute("captureKind",
                     Cap.getCaptureKind() == LCK_ByRef ? "reference" : "value");
        CJ.attribute("storage", Src.full());
        CJ.attribute("value", Src.full());
        CJ.attribute("lambda", LambdaFn);
        CJ.attribute("expr", VD->getNameAsString());
        Emitter::locJson(CJ, E.loc(Cap.getLocation(), Lambda->getSourceRange()));
        CJ.objectEnd();
        E.OS << "\n";
      }
    }
    for (unsigned I = Base; I < SeedIndex && I < CE->getNumArgs(); ++I)
      processExpr(CE->getArg(I));

    Loc CL = E.loc(CE->getBeginLoc(), CE->getSourceRange());
    llvm::json::OStream J(E.OS);
    J.objectBegin();
    J.attribute("kind", "fold");
    J.attribute("id", FoldId);
    J.attribute("fn", Fn);
    J.attribute("api", Which);
    Emitter::locJson(J, CL);
    J.attribute("callText", E.text(CE->getSourceRange()));
    J.attribute("calleeText", E.text(CE->getCallee()->getSourceRange()));
    if (CE->getNumArgs() > Base) {
      const Expr *Range = CE->getArg(Base);
      J.attribute("rangeText", E.text(Range->getSourceRange()));
      std::string Start = rangeStart(CE, Base);
      if (!Start.empty())
        J.attribute("rangeStart", Start);
    }
    if (Seed) {
      J.attribute("seedText", E.text(Seed->getSourceRange()));
      J.attribute("seedType", typeOf(Seed));
      Loc SL = E.loc(Seed->getBeginLoc(), Seed->getSourceRange());
      J.attribute("seedFile", SL.file);
      J.attribute("seedLine", SL.line);
      J.attribute("seedCol", SL.col);
      J.attribute("seedOffset", SL.offset);
    }
    J.attribute("lambdaUsr", LambdaFn);
    if (Dest)
      J.attribute("destStorage", Dest->full());
    J.objectEnd();
    E.OS << "\n";

    SPath Acc{"fold:" + std::to_string(FoldId), ":acc"};
    if (Lambda) {
      if (const CXXMethodDecl *Op = Lambda->getCallOperator()) {
        if (Op->getNumParams() >= 1) {
          const ParmVarDecl *P = Op->getParamDecl(0);
          Acc = {"decl:" + usrFor(P), {}, E.typeStr(P->getType())};
        }
      }
    }
    if (Seed) {
      const RecordDecl *RD = Seed->getType()->getAsRecordDecl();
      const Expr *S = strip(Seed);
      if (auto *UC = dyn_cast<CXXUnresolvedConstructExpr>(S)) {
        if (UC->getNumArgs() == 1 && isa<InitListExpr>(UC->getArg(0)))
          S = strip(UC->getArg(0));
      }
      bool Flattened = false;
      auto flatten = [&](auto List) {
        unsigned I = 0;
        for (const Expr *Init : List) {
          if (!Init) { ++I; continue; }
          processExpr(Init);
          SPath D = append(Acc, "." + fieldName(RD, I));
          emitValue("fold-seed", Init, D, valueOf(Init), "seed");
          ++I;
          Flattened = true;
        }
      };
      if (RD && isa<CXXRecordDecl>(RD) &&
          cast<CXXRecordDecl>(RD)->isAggregate()) {
        if (auto *IL = dyn_cast<InitListExpr>(S)) {
          if (const InitListExpr *Sem = IL->getSemanticForm())
            IL = Sem;
          flatten(IL->inits());
        } else if (auto *UC = dyn_cast<CXXUnresolvedConstructExpr>(S)) {
          flatten(UC->arguments());
        } else if (auto *CC = dyn_cast<CXXConstructExpr>(S)) {
          const CXXConstructorDecl *CD = CC->getConstructor();
          if (!CD || !(CD->isCopyConstructor() || CD->isMoveConstructor()))
            flatten(CC->arguments());
        }
      }
      if (!Flattened) {
        processExpr(Seed);
        std::string SeedValue = valueOf(Seed);
        if (auto *UC = dyn_cast<CXXUnresolvedConstructExpr>(S))
          if (UC->getNumArgs() == 1)
            SeedValue = valueOf(UC->getArg(0));
        if (auto *CC = dyn_cast<CXXConstructExpr>(S))
          if (CC->getNumArgs() == 1)
            SeedValue = valueOf(CC->getArg(0));
        emitValue("fold-seed", Seed, Acc, SeedValue, "seed");
      }
    }

    SPath Result{"fold:" + std::to_string(FoldId), ":result"};
    CallResults[CE] = Result;
    if (Dest) {
      emitAt("fold-result", CE->getBeginLoc(), CE->getSourceRange(), *Dest,
             Result.full(), "fold");
      // The value side of the result edge.
      emitAt("fold-result-value", CE->getBeginLoc(), CE->getSourceRange(),
             Result, {}, "fold");
    }
  }

  bool isAccessorCall(const CXXMemberCallExpr *C, std::string &Name) {
    const FunctionDecl *FD = C->getDirectCallee();
    if (!FD)
      return false;
    Name = FD->getNameAsString();
    return Name == "at" || Name == "operator[]" || Name == "front" ||
           Name == "back" || Name == "get" || Name == "value" ||
           Name == "operator*" || Name == "operator->";
  }

  SPath processCall(CallExpr *CE, std::optional<SPath> Dest = std::nullopt) {
    std::string Which;
    if (isFoldCall(CE, Which)) {
      foldCall(CE, Which, Dest);
      return path(CE);
    }
    const FunctionDecl *FD = CE->getDirectCallee();
    if (!FD) {
      const Expr *Cal = strip(CE->getCallee());
      if (auto *D = dyn_cast<DeclRefExpr>(Cal))
        FD = dyn_cast<FunctionDecl>(D->getDecl());
      else if (auto *U = dyn_cast<UnresolvedLookupExpr>(Cal)) {
        const FunctionDecl *Found = nullptr;
        for (const NamedDecl *ND : U->decls()) {
          if (const auto *F = dyn_cast<FunctionDecl>(ND)) {
            if (Found && Found != F) { Found = nullptr; break; }
            Found = F;
          }
        }
        if (Found && U->getName() == Found->getDeclName() &&
            Found->getNumParams() == CE->getNumArgs())
          FD = Found;
      }
    }
    std::string Name = FD ? FD->getNameAsString() : "";
    if (auto *OC = dyn_cast<CXXOperatorCallExpr>(CE)) {
      if (Name == "operator->" && OC->getNumArgs() == 1) {
        processExpr(OC->getArg(0));
        SPath P = path(OC);
        if (P.known())
          emit("read", CE, P, "operator-arrow");
        return P;
      }
      if (Name == "operator*" && OC->getNumArgs() == 1) {
        processExpr(OC->getArg(0));
        SPath P = path(OC);
        if (P.known())
          emit("read", CE, P, "operator-deref");
        return P;
      }
    }
    if (Name == "get" || Name == "get_if") {
      if (CE->getNumArgs())
        processExpr(CE->getArg(0));
      SPath P = path(CE);
      if (P.known())
        emit("read", CE, P, "variant-access");
      return P;
    }
    if (Name == "move" || Name == "__move" || Name == "forward" ||
        Name == "__forward") {
      if (CE->getNumArgs())
        processExpr(CE->getArg(0));
      if (CE->getNumArgs()) {
        SPath P = path(CE->getArg(0));
        emitValue(Name == "move" || Name == "__move" ? "move" : "forward",
                  CE->getArg(0), P, P.full(),
                  Name == "move" || Name == "__move" ? "move" : "forward");
        // A moved-from expression still denotes the value that is transferred;
        // the move event above records the distinct transfer semantics.
        return P;
      }
      return {};
    }

    if (auto *C = dyn_cast<CXXMemberCallExpr>(CE)) {
      std::string Accessor;
      if (isAccessorCall(C, Accessor)) {
        if (C->getNumArgs())
          processExpr(C->getArg(0));
        SPath P = path(C);
        if (P.known())
          emit("read", CE, P, "accessor");
        else
          emit("read", CE, {}, "accessor-unknown");
        return P;
      }
      if (const Expr *Obj = C->getImplicitObjectArgument())
        processExpr(Obj);
    }

    std::vector<SPath> Args;
    for (const Expr *A : CE->arguments()) {
      const Expr *S = strip(A);
      if (auto *L = dyn_cast<LambdaExpr>(S)) {
        Args.push_back({"lambda:" + usrFor(L->getCallOperator()), {}});
        for (const LambdaCapture &Cap : L->captures()) {
          if (!Cap.capturesVariable())
            continue;
          const ValueDecl *VD = Cap.getCapturedVar();
          SPath Src{"decl:" + usrFor(VD), {}};
          emitCapture(Cap.getLocation(), L->getSourceRange(), Src,
                      usrFor(L->getCallOperator()),
                      Cap.getCaptureKind() == LCK_ByRef ? "reference" : "value",
                      VD->getNameAsString());
        }
        continue;
      }
      SPath V = processExpr(S);
      Args.push_back(V.known() ? V : path(S));
    }

    std::vector<const ParmVarDecl *> Params;
    if (FD)
      for (const ParmVarDecl *P : FD->parameters())
        Params.push_back(P);

    unsigned CallId = nextEvent();
    Ids.push_back(CallId);
    Loc L = E.loc(CE->getBeginLoc(), CE->getSourceRange());
    llvm::json::OStream J(E.OS);
    J.objectBegin();
    J.attribute("kind", "event");
    J.attribute("id", CallId);
    J.attribute("fn", Fn);
    J.attribute("block", Block);
    J.attribute("order", Order++);
    J.attribute("event", "call");
    J.attribute("callee",
                FD ? FD->getQualifiedNameAsString()
                   : E.text(CE->getCallee()->getSourceRange()));
    J.attribute("calleeUsr", usrFor(FD));
    J.attribute("direct", FD != nullptr);
    if (!FD)
      J.attribute("calleeClass", CE->getCallee()->getStmtClassName());
    J.attribute("expr", E.text(CE->getSourceRange()));
    J.attribute("type", typeOf(CE));
    if (auto *C = dyn_cast<CXXMemberCallExpr>(CE)) {
      SPath Recv = path(C->getImplicitObjectArgument());
      if (Recv.known())
        J.attribute("receiver", Recv.full());
      if (const CXXMethodDecl *MD = C->getMethodDecl()) {
        J.attribute("methodConst", MD->isConst());
        J.attribute("methodVirtual", MD->isVirtual());
      }
    }
    J.attributeArray("args", [&] {
      for (size_t I = 0; I < CE->getNumArgs(); ++I) {
        J.objectBegin();
        J.attribute("index", I);
        if (I < Args.size() && Args[I].known())
          J.attribute("storage", Args[I].full());
        if (I < Params.size()) {
          J.attribute("param", Params[I]->getNameAsString());
          J.attribute("paramUsr", usrFor(Params[I]));
          J.attribute("paramType", E.typeStr(Params[I]->getType()));
        }
        J.attribute("text", E.text(CE->getArg(I)->getSourceRange()));
        std::string ArgValue = valueOf(CE->getArg(I));
        J.attribute("value", ArgValue);
        J.objectEnd();
      }
    });
    if (Dest)
      J.attribute("dest", Dest->full());
    Emitter::locJson(J, L);
    J.objectEnd();
    E.OS << "\n";
    CallIds[CE] = CallId;

    for (size_t I = 0; I < Params.size() && I < CE->getNumArgs(); ++I) {
      QualType PT = Params[I]->getType();
      bool NonConstRef = PT->isLValueReferenceType() &&
                         !PT.getNonReferenceType().isConstQualified();
      bool NonConstPtr = PT->isPointerType() &&
                         !PT.getNonReferenceType()->getPointeeType().isConstQualified();
      if (!NonConstRef && !NonConstPtr)
        continue;
      SPath A = path(CE->getArg(I));
      if (!A.known())
        continue;
      if (NonConstPtr)
        A = append(A, "->*");
      emitValue("write", CE->getArg(I), A, "call:" + std::to_string(CallId),
                "call-effect");
    }

    // Container/optional mutators act on the receiver.  The exact element
    // identity is abstract; the query engine records the boundary.
    if (auto *C = dyn_cast<CXXMemberCallExpr>(CE)) {
      if (const CXXMethodDecl *MD = C->getMethodDecl()) {
        std::string N = MD->getNameAsString();
        bool Mutating = N == "push_back" || N == "emplace_back" ||
                        N == "emplace" || N == "insert" || N == "erase" ||
                        N == "clear" || N == "reset" || N == "swap" ||
                        N == "assign" || N == "pop_back";
        if (Mutating && !MD->isConst()) {
          SPath R = path(C->getImplicitObjectArgument());
          if (R.known())
            emitValue("write", CE, R, "call:" + std::to_string(CallId),
                      "method-mutation");
        }
      }
    }

    SPath Result{"call:" + std::to_string(CallId), {}};
    CallResults[CE] = Result;
    return Result;
  }

  SPath processExpr(const Stmt *Raw) {
    if (!Raw)
      return {};
    struct DepthGuard {
      int &D;
      explicit DepthGuard(int &D) : D(D) { ++D; }
      ~DepthGuard() { --D; }
    } Guard(ExprDepth);
    if (ExprDepth > 100)
      return {};
    const Expr *E0 = dyn_cast<Expr>(Raw);
    if (!E0)
      return {};
    const Expr *X = E0->IgnoreParenImpCasts();
    if (auto *BO = dyn_cast<BinaryOperator>(X)) {
      if (BO->isCompoundAssignmentOp()) {
        SPath L = path(BO->getLHS());
        processExpr(BO->getLHS());
        processExpr(BO->getRHS());
        if (L.known()) {
          emit("read", BO->getLHS(), L, "compound-read");
          emitValue("write", X, L, path(BO->getRHS()).full(), "compound");
        }
        return L;
      }
      switch (BO->getOpcode()) {
      case BO_Assign:
        writeDest(path(BO->getLHS()), BO->getRHS(), "assign", BO->getLHS());
        return path(BO->getLHS());
      case BO_Comma:
        processExpr(BO->getLHS());
        return processExpr(BO->getRHS());
      default:
        processExpr(BO->getLHS());
        processExpr(BO->getRHS());
        return path(X);
      }
    }
    if (auto *OC = dyn_cast<CXXOperatorCallExpr>(X)) {
      // Overloaded assignment (`a = b`, `a += b`) is semantically a write even
      // though Clang represents it as an operator call.
      const OverloadedOperatorKind K = OC->getOperator();
      const bool Assign = K == OO_Equal && OC->getNumArgs() == 2;
      const bool Compound = (K == OO_PlusEqual || K == OO_MinusEqual ||
                             K == OO_StarEqual || K == OO_SlashEqual ||
                             K == OO_PercentEqual || K == OO_LessLessEqual ||
                             K == OO_GreaterGreaterEqual || K == OO_AmpEqual ||
                             K == OO_PipeEqual || K == OO_CaretEqual) &&
                            OC->getNumArgs() >= 2;
      if (Assign || Compound) {
        const Expr *Lhs = OC->getArg(0);
        const Expr *Rhs = OC->getArg(1);
        SPath L = path(Lhs);
        if (Compound) {
          processExpr(Lhs);
          processExpr(Rhs);
          if (L.known()) {
            emit("read", Lhs, L, "compound-read");
            emitValue("write", OC, L, path(Rhs).full(), "compound");
          }
          return L;
        }
        writeDest(L, Rhs, "assign", Lhs);
        return L;
      }
    }
    if (auto *U = dyn_cast<UnaryOperator>(X)) {
      if (U->isIncrementDecrementOp()) {
        SPath P = path(U->getSubExpr());
        processExpr(U->getSubExpr());
        if (P.known()) {
          emit("read", X, P, "increment");
          emitValue("write", X, P, "increment", "increment");
        } else {
          emit("unknown-effect", X, {}, "increment");
        }
        return P;
      }
      if (U->getOpcode() == UO_Deref) {
        SPath P = path(X);
        if (P.known())
          emit("read", X, P, "deref");
        else
          emit("unknown-effect", X, {}, "deref");
        return P;
      }
      if (U->getOpcode() == UO_AddrOf) {
        processExpr(U->getSubExpr());
        SPath P = path(U->getSubExpr());
        emit("address-of", X, P, "address-of");
        return P;
      }
      return processExpr(U->getSubExpr());
    }
    if (auto *CE = dyn_cast<CallExpr>(X)) {
      SPath P = processCall(const_cast<CallExpr *>(CE));
      if (P.known())
        emit("read", X, P, "call-result");
      return P;
    }
    if (auto *C = dyn_cast<CXXConstructExpr>(X)) {
      const CXXConstructorDecl *CD = C->getConstructor();
      for (const Expr *A : C->arguments())
        processExpr(A);
      if (CD && (CD->isCopyConstructor() || CD->isMoveConstructor()) &&
          C->getNumArgs()) {
        SPath S = path(C->getArg(0));
        emitValue(CD->isMoveConstructor() ? "move" : "copy", X, S, S.full(),
                  "construct");
        return S;
      }
      emit("construct", X, {}, "construct");
      return {};
    }
    if (auto *IL = dyn_cast<InitListExpr>(X)) {
      for (const Expr *I : IL->inits())
        processExpr(I);
      emit("aggregate-value", X, {}, "aggregate");
      return {};
    }
    if (auto *L = dyn_cast<LambdaExpr>(X)) {
      if (const CXXMethodDecl *Op = L->getCallOperator())
        emit("lambda", X, SPath{"lambda:" + usrFor(Op), {}}, "lambda");
      for (const LambdaCapture &Cap : L->captures()) {
        if (!Cap.capturesVariable())
          continue;
        const ValueDecl *VD = Cap.getCapturedVar();
        SPath Src{"decl:" + usrFor(VD), {}};
        emitCapture(Cap.getLocation(), L->getSourceRange(), Src,
                    usrFor(L->getCallOperator()),
                    Cap.getCaptureKind() == LCK_ByRef ? "reference" : "value",
                    VD->getNameAsString());
      }
      return {};
    }
    if (auto *C = dyn_cast<ConditionalOperator>(X)) {
      processExpr(C->getCond());
      processExpr(C->getTrueExpr());
      processExpr(C->getFalseExpr());
      emit("select", X, {}, "conditional");
      return {};
    }
    if (auto *C = dyn_cast<CastExpr>(X)) {
      SPath P = processExpr(C->getSubExpr());
      if (P.known())
        emit("read", X, P, "cast");
      return P;
    }
    if (auto *SE = dyn_cast<StmtExpr>(X))
      return processExpr(SE->getSubStmt());
    if (auto *D = dyn_cast<DeclRefExpr>(X)) {
      SPath P = path(D);
      emit("read", X, P, "declref");
      return P;
    }
    if (auto *M = dyn_cast<CXXDependentScopeMemberExpr>(X)) {
      SPath P = path(M);
      emit("read", X, P, "dependent-member");
      return P;
    }
    if (auto *M = dyn_cast<UnresolvedMemberExpr>(X)) {
      SPath P = path(M);
      emit("read", X, P, "unresolved-member");
      return P;
    }
    if (auto *M = dyn_cast<MemberExpr>(X)) {
      SPath P = path(M);
      emit("read", X, P, "member");
      return P;
    }
    if (auto *A = dyn_cast<ArraySubscriptExpr>(X)) {
      SPath P = path(A);
      emit("read", X, P, "subscript");
      return P;
    }
    if (auto *P = dyn_cast<ParenExpr>(X))
      return processExpr(P->getSubExpr());
    if (auto *C = dyn_cast<CXXNewExpr>(X)) {
      if (const Expr *Init = C->getInitializer())
        processExpr(Init);
      emit("unknown-effect", X, {}, "new");
      return {};
    }
    if (auto *C = dyn_cast<CXXDeleteExpr>(X)) {
      processExpr(C->getArgument());
      emit("unknown-effect", X, {}, "delete");
      return {};
    }
    for (const Stmt *Child : X->children())
      if (isa<Expr>(Child))
        processExpr(Child);
    return {};
  }

  const ParmVarDecl *firstParamRef(const Stmt *S) const {
    if (!S)
      return nullptr;
    if (auto *D = dyn_cast<DeclRefExpr>(S))
      if (auto *P = dyn_cast<ParmVarDecl>(D->getDecl()))
        return P;
    for (const Stmt *Child : S->children())
      if (const ParmVarDecl *P = firstParamRef(Child))
        return P;
    return nullptr;
  }

  void emitReturnFields(SPath Dest, const Expr *Raw) {
    const Expr *X = strip(Raw);
    if (auto *IL = dyn_cast<InitListExpr>(X)) {
      const InitListExpr *Sem = IL->getSemanticForm() ? IL->getSemanticForm() : IL;
      const RecordDecl *RD = Sem->getType()->getAsRecordDecl();
      if (!RD)
        return;
      unsigned I = 0;
      for (const Expr *Init : Sem->inits()) {
        if (!Init) { ++I; continue; }
        SPath D = append(Dest, "." + fieldName(RD, I));
        emitReturnFields(D, Init);
        ++I;
      }
      return;
    }
    if (auto *UC = dyn_cast<CXXUnresolvedConstructExpr>(X)) {
      if (UC->getNumArgs() == 1 && isa<InitListExpr>(UC->getArg(0))) {
        emitReturnFields(Dest, UC->getArg(0));
        return;
      }
      const RecordDecl *RD = UC->getType()->getAsRecordDecl();
      if (RD && isa<CXXRecordDecl>(RD) && cast<CXXRecordDecl>(RD)->isAggregate()) {
        unsigned I = 0;
        for (const Expr *Init : UC->arguments()) {
          SPath D = append(Dest, "." + fieldName(RD, I++));
          emitReturnFields(D, Init);
        }
        return;
      }
    }
    if (auto *CC = dyn_cast<CXXConstructExpr>(X)) {
      const CXXConstructorDecl *CD = CC->getConstructor();
      if (CD && !(CD->isCopyConstructor() || CD->isMoveConstructor())) {
        const RecordDecl *RD = CC->getType()->getAsRecordDecl();
        if (RD && isa<CXXRecordDecl>(RD) && cast<CXXRecordDecl>(RD)->isAggregate()) {
          unsigned I = 0;
          for (const Expr *Init : CC->arguments()) {
            SPath D = append(Dest, "." + fieldName(RD, I++));
            emitReturnFields(D, Init);
          }
          return;
        }
        // Non-aggregate construction: member initializers map constructor
        // parameters to the constructed fields.
        bool mapped = false;
        for (const CXXCtorInitializer *CI : CD->inits()) {
          if (!CI->isMemberInitializer())
            continue;
          const FieldDecl *F = CI->getMember();
          const ParmVarDecl *P = firstParamRef(CI->getInit());
          if (!F || !P)
            continue;
          const unsigned Index = P->getFunctionScopeIndex();
          if (Index >= CC->getNumArgs())
            continue;
          SPath D = append(Dest, "." + F->getNameAsString());
          const Expr *Arg = CC->getArg(Index);
          processExpr(Arg);
          emitValue("return-field", Arg, D, valueOf(Arg), "return-field");
          mapped = true;
        }
        if (mapped)
          return;
      }
    }
    emitValue("return-field", Raw, Dest, valueOf(Raw), "return-field");
  }

  void processStmt(const Stmt *S) {
    if (!S)
      return;
    if (auto *DS = dyn_cast<DeclStmt>(S)) {
      for (const Decl *D : DS->decls()) {
        const auto *VD = dyn_cast<VarDecl>(D);
        if (!VD || VD->isImplicit())
          continue;
        SPath Dest{"decl:" + usrFor(VD), {}};
        if (VD->getType()->isReferenceType()) {
          const Expr *Init = VD->getInit();
          if (Init) {
            SPath Src = processExpr(Init);
            if (!Src.known())
              Src = path(Init);
            emitAt("alias", VD->getLocation(), VD->getSourceRange(), Dest,
                   Src.full(), "reference");
          }
          continue;
        }
        if (const Expr *Init = VD->getInit())
          writeDest(Dest, Init, "init", nullptr, VD);
        else
          emitAt("write", VD->getLocation(), VD->getSourceRange(), Dest, {},
                 "default-init");
      }
      return;
    }
    if (auto *RS = dyn_cast<ReturnStmt>(S)) {
      const Expr *RV = RS->getRetValue();
      if (RV) {
        SPath P = processExpr(RV);
        if (!P.known())
          P = path(RV);
        emitValue("return", RV, P, P.full(), "return");
        // Aggregate returns: emit recursively flattened field edges.
        emitReturnFields(SPath{"return:" + Fn, ".<ret>"}, RV);
      } else {
        emitAt("return", RS->getEndLoc(), RS->getSourceRange(), {}, {}, "void");
      }
      return;
    }
    if (auto *IS = dyn_cast<IfStmt>(S)) {
      processExpr(IS->getCond());
      emit("branch-condition", IS->getCond(), {}, "if");
      const Expr *C = strip(IS->getCond());
      std::string Op, LPath, RPath, LText, RText;
      if (auto *BO = dyn_cast<BinaryOperator>(C)) {
        Op = BO->getOpcodeStr().str();
        LPath = path(BO->getLHS()).full();
        RPath = path(BO->getRHS()).full();
        LText = E.text(BO->getLHS()->getSourceRange());
        RText = E.text(BO->getRHS()->getSourceRange());
      }
      Loc CL = E.loc(IS->getIfLoc(), IS->getSourceRange());
      Loc TL = E.loc(IS->getThen()->getBeginLoc(), IS->getThen()->getSourceRange());
      Loc EL = IS->getElse() ? E.loc(IS->getElse()->getBeginLoc(),
                                     IS->getElse()->getSourceRange())
                             : Loc{};
      llvm::json::OStream J(E.OS);
      J.objectBegin();
      J.attribute("kind", "branch");
      J.attribute("fn", Fn);
      J.attribute("block", Block);
      Emitter::locJson(J, CL);
      J.attribute("condition", E.text(IS->getCond()->getSourceRange()));
      J.attribute("op", Op);
      J.attribute("lhsPath", LPath);
      J.attribute("rhsPath", RPath);
      J.attribute("lhsText", LText);
      J.attribute("rhsText", RText);
      J.attribute("thenStart", TL.offset);
      J.attribute("thenEnd", TL.endOffset);
      if (EL.valid) {
        J.attribute("elseStart", EL.offset);
        J.attribute("elseEnd", EL.endOffset);
      }
      J.objectEnd();
      E.OS << "\n";
      return;
    }
    if (auto *FS = dyn_cast<ForStmt>(S)) {
      if (FS->getCond()) {
        processExpr(FS->getCond());
        emit("branch-condition", FS->getCond(), {}, "for");
      }
      return;
    }
    if (auto *WS = dyn_cast<WhileStmt>(S)) {
      processExpr(WS->getCond());
      emit("branch-condition", WS->getCond(), {}, "while");
      return;
    }
    if (auto *DS = dyn_cast<DoStmt>(S)) {
      processExpr(DS->getCond());
      emit("branch-condition", DS->getCond(), {}, "do");
      return;
    }
    if (auto *SS = dyn_cast<SwitchStmt>(S)) {
      processExpr(SS->getCond());
      emit("branch-condition", SS->getCond(), {}, "switch");
      return;
    }
    if (isa<CompoundStmt>(S))
      return;
    processExpr(S);
  }
};

class InventoryVisitor : public RecursiveASTVisitor<InventoryVisitor> {
public:
  Emitter &E;
  FunctionDecl *CurrentFD = nullptr;

  explicit InventoryVisitor(Emitter &E) : E(E) {}

  bool TraverseFunctionDecl(FunctionDecl *FD) {
    FunctionDecl *Old = CurrentFD;
    CurrentFD = FD;
    bool Result = RecursiveASTVisitor<InventoryVisitor>::TraverseFunctionDecl(FD);
    CurrentFD = Old;
    return Result;
  }

  bool TraverseLambdaExpr(LambdaExpr *L) {
    FunctionDecl *Old = CurrentFD;
    if (const CXXMethodDecl *Op = L->getCallOperator())
      CurrentFD = const_cast<CXXMethodDecl *>(Op);
    bool Result = RecursiveASTVisitor<InventoryVisitor>::TraverseLambdaExpr(L);
    CurrentFD = Old;
    return Result;
  }

  bool shouldVisitTemplateInstantiations() const { return true; }

  std::string templateArgs(const FunctionDecl *FD) {
    const TemplateArgumentList *TA = FD->getTemplateSpecializationArgs();
    if (!TA)
      return {};
    std::string Out;
    for (size_t I = 0; I < TA->size(); ++I) {
      if (I) Out += ", ";
      const TemplateArgument &A = (*TA)[I];
      if (A.getKind() == TemplateArgument::Type)
        Out += A.getAsType().getAsString();
      else if (A.getKind() == TemplateArgument::Integral) {
        llvm::SmallString<32> S;
        A.getAsIntegral().toString(S, 10);
        Out += S.str();
      } else
        Out += "<arg>";
    }
    return Out;
  }

  bool VisitFunctionDecl(FunctionDecl *FD) {
    if (!FD->doesThisDeclarationHaveABody())
      return true;
    if (FD->isImplicit() && !(dyn_cast_or_null<CXXRecordDecl>(FD->getParent()) && dyn_cast<CXXRecordDecl>(FD->getParent())->isLambda()))
      return true;
    if (!E.inProject(FD->getLocation()))
      return true;
    std::string U = usrFor(FD);
    if (U.empty() || !E.SeenFunctions.insert(U).second)
      return true;
    unsigned Id = E.NextFunction++;
    const FunctionDecl *Pattern = FD->getTemplateInstantiationPattern();
    Loc L = E.loc(FD->getLocation(), FD->getSourceRange());
    llvm::json::OStream J(E.OS);
    J.objectBegin();
    J.attribute("kind", "function");
    J.attribute("id", Id);
    J.attribute("usr", U);
    J.attribute("name", FD->getNameAsString());
    J.attribute("qualified", FD->getQualifiedNameAsString());
    J.attribute("file", L.file);
    J.attribute("line", L.line);
    J.attribute("col", L.col);
    J.attribute("endLine", L.endLine);
    J.attribute("endCol", L.endCol);
    Loc Decl = E.loc(FD->getSourceRange().getBegin(), FD->getSourceRange());
    J.attribute("declText", E.text(FD->getNameInfo().getSourceRange()));
    J.attribute("declLine", Decl.line);
    J.attribute("declCol", Decl.col);
    J.attribute("declFile", Decl.file);
    J.attribute("bodyStart", E.loc(FD->getBody()->getBeginLoc()).offset);
    J.attribute("bodyEnd", E.loc(FD->getBody()->getSourceRange().getEnd()).offset);
    J.attribute("isLambda", dyn_cast_or_null<CXXRecordDecl>(FD->getParent()) && dyn_cast<CXXRecordDecl>(FD->getParent())->isLambda());
    J.attribute("isTemplateInstantiation", FD->isTemplateInstantiation());
    J.attribute("isFunctionTemplate", FD->isTemplateInstantiation() && Pattern);
    if (Pattern)
      J.attribute("patternUsr", usrFor(Pattern));
    std::string TA = templateArgs(FD);
    if (!TA.empty())
      J.attribute("templateArgs", TA);
    J.attribute("returnType", E.typeStr(FD->getReturnType()));
    J.attribute("variadic", FD->isVariadic());
    if (const auto *MD = dyn_cast<CXXMethodDecl>(FD)) {
      J.attribute("methodConst", MD->isConst());
      J.attribute("methodStatic", MD->isStatic());
      J.attribute("methodVirtual", MD->isVirtual());
      if (MD->getParent())
        J.attribute("recordUsr", usrFor(MD->getParent()));
    }
    J.attributeArray("params", [&] {
      for (const ParmVarDecl *P : FD->parameters()) {
        J.objectBegin();
        J.attribute("name", P->getNameAsString());
        J.attribute("usr", usrFor(P));
        J.attribute("type", E.typeStr(P->getType()));
        J.attribute("index", P->getFunctionScopeIndex());
        Loc PL = E.loc(P->getLocation(), P->getSourceRange());
        J.attribute("line", PL.line);
        J.attribute("col", PL.col);
        J.objectEnd();
      }
    });
    J.objectEnd();
    E.OS << "\n";

    emitCFG(FD);
    return true;
  }

  bool VisitLambdaExpr(LambdaExpr *L) {
    const CXXMethodDecl *Op = L->getCallOperator();
    if (Op && Op->doesThisDeclarationHaveABody() &&
        E.inProject(Op->getLocation()) && !E.SeenFunctions.count(usrFor(Op)))
      VisitFunctionDecl(const_cast<CXXMethodDecl *>(Op));
    return true;
  }

  bool VisitIfStmt(IfStmt *IS) {
    const FunctionDecl *FD = CurrentFD;
    if (!FD || !E.inProject(IS->getIfLoc()))
      return true;
    const Expr *C = IS->getCond()->IgnoreParenImpCasts();
    std::string Op, LT, RT;
    if (auto *BO = dyn_cast<BinaryOperator>(C)) {
      Op = BO->getOpcodeStr().str();
      LT = E.text(BO->getLHS()->getSourceRange());
      RT = E.text(BO->getRHS()->getSourceRange());
    }
    Loc CL = E.loc(IS->getIfLoc(), IS->getSourceRange());
    Loc TL = E.loc(IS->getThen()->getBeginLoc(), IS->getThen()->getSourceRange());
    Loc EL = IS->getElse()
                 ? E.loc(IS->getElse()->getBeginLoc(),
                         IS->getElse()->getSourceRange())
                 : Loc{};
    llvm::json::OStream J(E.OS);
    J.objectBegin();
    J.attribute("kind", "branch");
    J.attribute("fn", usrFor(FD));
    Emitter::locJson(J, CL);
    J.attribute("condition", E.text(IS->getCond()->getSourceRange()));
    J.attribute("op", Op);
    J.attribute("lhsText", LT);
    J.attribute("rhsText", RT);
    J.attribute("thenStart", TL.offset);
    J.attribute("thenEnd", TL.endOffset);
    if (EL.valid) {
      J.attribute("elseStart", EL.offset);
      J.attribute("elseEnd", EL.endOffset);
    }
    J.objectEnd();
    E.OS << "\n";
    return true;
  }

  bool VisitRecordDecl(RecordDecl *RD) {
    if (!RD->isCompleteDefinition() || RD->isImplicit())
      return true;
    if (!E.inProject(RD->getLocation()))
      return true;
    std::string U = usrFor(RD);
    if (U.empty() || !E.SeenRecords.insert(U).second)
      return true;
    llvm::json::OStream J(E.OS);
    J.objectBegin();
    J.attribute("kind", "record");
    J.attribute("usr", U);
    J.attribute("name", RD->getNameAsString());
    J.attribute("qualified", RD->getQualifiedNameAsString());
    Loc L = E.loc(RD->getLocation(), RD->getSourceRange());
    Emitter::locJson(J, L);
    J.attribute("isUnion", RD->isUnion());
    J.attribute("isLambda", RD->isLambda());
    J.attribute("fieldCount", RD->getNumFields());
    J.attribute("dependent", RD->isDependentType());
    const bool HasLayout = !RD->isDependentType() && !RD->isInvalidDecl();
    J.attributeArray("fields", [&] {
      for (const FieldDecl *F : RD->fields()) {
        J.objectBegin();
        J.attribute("name", F->getNameAsString());
        J.attribute("usr", usrFor(F));
        J.attribute("type", E.typeStr(F->getType()));
        J.attribute("index", F->getFieldIndex());
        Loc FL = E.loc(F->getLocation(), F->getSourceRange());
        J.attribute("line", FL.line);
        J.attribute("col", FL.col);
        J.attribute("offsetBits",
                    HasLayout ? E.Ctx.getASTRecordLayout(RD).getFieldOffset(
                                    F->getFieldIndex())
                              : 0);
        J.attribute("bitWidth", F->isBitField() ? F->getBitWidthValue() : 0);
        J.objectEnd();
      }
    });
    J.attributeArray("bases", [&] {
      for (const CXXBaseSpecifier &B : cast<CXXRecordDecl>(RD)->bases()) {
        J.objectBegin();
        J.attribute("type", E.typeStr(B.getType()));
        J.attribute("virtual", B.isVirtual());
        J.objectEnd();
      }
    });
    J.objectEnd();
    E.OS << "\n";
    return true;
  }

  void emitCFG(FunctionDecl *FD) {
    Stmt *Body = FD->getBody();
    if (!Body || !E.SeenCFG.insert(usrFor(FD)).second)
      return;
    CFG::BuildOptions Opts;
    Opts.PruneTriviallyFalseEdges = true;
    Opts.AddEHEdges = false;
    Opts.AddInitializers = true;
    Opts.AddImplicitDtors = false;
    Opts.AddTemporaryDtors = false;
    Opts.AddScopes = false;
    std::unique_ptr<CFG> Cfg =
        CFG::buildCFG(FD, Body, &E.Ctx, Opts);
    if (!Cfg)
      return;
    std::string This =
        isa<CXXMethodDecl>(FD) ? "this:" + usrFor(FD) : "this:free";
    EventBuilder B(E, usrFor(FD), This);
    for (CFGBlock *Block : *Cfg) {
      B.startBlock(Block->getBlockID());
      llvm::DenseSet<const Stmt *> SeenStmt;
      for (CFGElement El : *Block) {
        if (auto S = El.getAs<CFGStmt>()) {
          const Stmt *St = S->getStmt();
          if (!St || !SeenStmt.insert(St).second)
            continue;
          B.processStmt(St);
        } else if (auto I = El.getAs<CFGInitializer>()) {
          const CXXCtorInitializer *Init = I->getInitializer();
          if (Init && Init->isAnyMemberInitializer()) {
            SPath Dest{This + "." + Init->getAnyMember()->getNameAsString(), {}};
            B.writeDest(Dest, Init->getInit(), "ctor-init");
          }
        }
      }
      llvm::json::OStream J(E.OS);
      J.objectBegin();
      J.attribute("kind", "cfg-block");
      J.attribute("fn", usrFor(FD));
      J.attribute("id", Block->getBlockID());
      J.attribute("entry", Block == &Cfg->getEntry());
      J.attribute("exit", Block == &Cfg->getExit());
      J.attributeArray("succ", [&] {
        for (auto It = Block->succ_begin(); It != Block->succ_end(); ++It) {
          CFGBlock *S = It->getReachableBlock();
          bool Reachable = S != nullptr;
          if (!S)
            S = It->getPossiblyUnreachableBlock();
          if (!S)
            continue;
          J.objectBegin();
          J.attribute("id", S->getBlockID());
          if (!Reachable)
            J.attribute("unreachable", true);
          J.objectEnd();
        }
      });
      const Stmt *Term = Block->getTerminatorStmt();
      if (Term)
        J.attribute("terminator", E.text(Term->getSourceRange()));
      else if (Block->getTerminator().isValid())
        J.attribute("terminator", "<implicit>");
      J.attributeArray("events", [&] {
        for (unsigned Id : B.Ids)
          J.value(static_cast<int64_t>(Id));
      });
      J.objectEnd();
      E.OS << "\n";
    }
  }
};

class Consumer : public ASTConsumer {
  Emitter &E;

public:
  explicit Consumer(Emitter &E) : E(E) {}
  void HandleTranslationUnit(ASTContext &Ctx) override {
    InventoryVisitor V(E);
    V.TraverseDecl(Ctx.getTranslationUnitDecl());
  }
};

class Action : public ASTFrontendAction {
public:
  std::unique_ptr<ASTConsumer> CreateASTConsumer(CompilerInstance &CI,
                                                 StringRef) override {
    auto *E = new Emitter(CI.getASTContext(), llvm::outs(), ProjectRoot);
    return std::make_unique<Consumer>(*E);
  }
};

int main(int argc, const char **argv) {
  auto Options = CommonOptionsParser::create(argc, argv, ToolCategory);
  if (!Options) {
    llvm::errs() << llvm::toString(Options.takeError()) << "\n";
    return 1;
  }
  ClangTool Tool(Options->getCompilations(), Options->getSourcePathList());
  return Tool.run(newFrontendActionFactory<Action>().get());
}
