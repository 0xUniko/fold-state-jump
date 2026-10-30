# Clang 源码级实验

## 环境

```text
Ubuntu / clang 23.1.4 (libclang-cpp.so.23.1)
LLVM 23.1.4, CMake 4.4.4, Ninja 1.11.1
ClangTooling + AST + CFG, 独立 CMake 工程
```

构建：

```bash
cmake -S prototype/native -B prototype/native/build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm \
  -DClang_DIR=/usr/lib/llvm-23/lib/cmake/clang
cmake --build prototype/native/build -j 8
```

结果：成功。`prototype/native/build/ast-inventory` 在 `nano-infer/minicpm-v-4_7/cli.cpp` 上运行约 15.3s、峰值约 1.06GB（`research/measurements/extract-minicpm.time`）。

## 实际使用的 API

| API | 用途 | 结论 |
|---|---|---|
| `RecursiveASTVisitor` + `shouldVisitTemplateInstantiations()` | 函数/记录/模板实例遍历 | 实例独立 USR；必须显式打开，否则只看到 pattern |
| `FunctionDecl::getTemplateInstantiationPattern()` / `getTemplateSpecializationArgs()` | 实例→pattern 与实例参数 | 可靠 |
| `RecordDecl::fields()` / `FieldDecl::getFieldIndex()` | 聚合成员顺序 | 可靠；不能按名字映射 |
| `InitListExpr::getSemanticForm()` / `inits()` | 聚合初始化顺序 | 可靠；外层可能被 `CXXFunctionalCastExpr/CXXBindTemporary` 包裹 |
| `CXXUnresolvedConstructExpr` | 依赖上下文聚合初始化 | pattern 中常见；单个 `InitListExpr` 参数时要展开 |
| `CXXDependentScopeMemberExpr` / `UnresolvedMemberExpr` | 模板 pattern 的字段路径 | 必须支持；否则字段读会被误当 declref |
| `CFG::buildCFG` / `CFGBlock` / `CFGStmt` | 语句级 CFG、分支/循环 | 可用；需要处理不可达 successor 为 null |
| `CXXMemberCallExpr::getImplicitObjectArgument()` | 成员方法接收者 | 可用 |
| `LambdaExpr::captures()` / `getCallOperator()` | 捕获语义与 lambda USR | 可用；fold 的 lambda 是普通调用参数，需单独发射 capture |
| USR (`clang::index::generateUSRForDecl`) | 稳定符号/字段身份 | 可用；LLVM 23 头文件在 `clang/UnifiedSymbolResolution/` |
| `SourceManager`/`Lexer::getSourceText` | 源码文本/范围 | 可用；宏展开要区分 spelling/expansion |

## 实际踩到的问题

1. `FD->getName()` 对 `operator()` 会断言，必须 `getNameAsString()`。
2. `RecordDecl` 模板 pattern 的 `getASTRecordLayout` 会递归/崩溃；依赖记录必须跳过 layout。
3. `CFGBlock::succ` 的 `AdjacentBlock` 可达块可能为 null，必须用 `getPossiblyUnreachableBlock()`。
4. `ranges::fold_left` 的 AST 在 pattern/实例中参数布局不同（CPO 隐式对象）；必须按 `CXXOperatorCallExpr` 参数布局识别 seed，不能固定 `getArg(1)`。
5. `std::accumulate` 的 seed 是第 3 个参数（`first,last,init,op`），与 `fold_left` 不同。
6. `CXXConstructExpr` 的 copy/move 构造不能按字段展开；`std::variant`/`std::optional` 不是 aggregate。
7. `CXXOperatorCallExpr` 的 `operator->`/`operator*` 应作为存储路径，而不是不透明 call；否则 `state.cache->layers` 会错误变成 call 结果。

## 能否直接解决需求？

- 能直接复用：源码/字段/模板/USR/CFG，以及“聚合第 N 项 → 第 N 个字段”的事实。
- 不能直接复用：到达定义查询、跨函数摘要、fold 回边、optional/variant 状态、异步资源边界。这些是本项目自建的 Program Graph/查询引擎，而不是 Clang 现成的“状态追踪”功能。

## 官方参考

- https://clang.llvm.org/docs/DataFlowAnalysisIntro.html
- https://clang.llvm.org/docs/ClangStaticAnalyzer.html
- https://clang.llvm.org/docs/analyzer/user-docs/CrossTranslationUnit.html
- 实际 Static Analyzer CFG 日志：`research/experiments/frameworks/clang-analyzer-cfg.txt`
