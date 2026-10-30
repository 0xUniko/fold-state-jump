# ARCHITECTURE

## 1. 实验结论

### Clang FlowSensitive 实际实验

新增 `prototype/native/flow-sensitive-probe.cpp`，真正继承 `clang::dataflow::DataflowAnalysis<ReachingDefs, Facts>`：

- `Facts` 是以 `StorageLocation*` 为键的 reaching-definition 集合；
- `transfer` 处理声明、赋值、复合赋值、自增；
- `runDataflowAnalysis` 在 CFG 上运行并执行 join/fixpoint；
- `WatchedLiteralsSolver`/`DataflowAnalysisContext`/`Environment` 实际使用；
- 对 `negative_control.cpp`：`overwritten` 的读取只得到最近写 15（正确杀死 13/14）；`exclusive` 得到 22 和 24（分支合流）；`loop.cpp` 的 `acc.total` 得到循环写 13（字段分开）；
- 失败：`auto &bucket = acc.bucket; ++bucket.hits` 的 `bucket.hits` 在本实验中无 reaching def；引用/子对象位置没有自动规范化到目标字段；
- 失败：聚合字段初始化需自行把每个 `InitListExpr` 成员映射到 `RecordStorageLocation` 子位置。

结论：Clang FlowSensitive 的 CFG 求解/Environment/StorageLocation 是可直接复用的成熟能力，但它**不是**现成的“字段级 provenance + fold + 跨函数”引擎。生产架构必须：

1. 复用 Clang AST/CFG/StorageLocation/固定点思想；
2. 自建字段/引用/指针 canonicalization、fold 摘要、函数摘要和 provenance 查询；
3. 不让每个查询模式重新实现 C++ 语义。

### LLVM / PhASAR / SVF

见 `research/frameworks/`。LLVM MemorySSA 提供函数内内存 def-use/phi，但字段名/源码 token 弱；PhASAR/SVF 当前 LLVM 23 构建失败，且仍需自建 fold/资源/源码映射。它们不进入首版主路径。

## 2. 选定分层

```text
Clang 23 AST/CFG (frontend)
  → Semantic Event Inventory (JSONL)
      functions, records, folds, events, CFG blocks
  → ProgramGraph (TypeScript runtime, new modules)
      StorageLocation identities / alias / values / versions
  → LocalDataflow (worklist fixed point per function CFG)
  → Interprocedural summaries (params, returns, calls, templates)
  → Fold contracts (seed/backedge/zero/first iteration)
  → Query (Origin/Mutation/History/Provenance)
  → VS Code adapter
```

首版不把 Clang FlowSensitive 作为唯一求解器，因为：

- 它的 `Environment` 对引用/字段位置需要额外绑定；
- 它没有 fold/跨函数/资源摘要；
- 生产查询需要可解释的 provenance 边和 source-level event identity。

但**固定点算法本身不重新发明**：local solver 使用标准 worklist + join，和 FlowSensitive 的 lattice/fixpoint 语义一致；Clang FlowSensitive 保留为交叉验证后端/未来局部求解器。

## 3. 核心 IR

### 3.1 `StorageKey`

```ts
type StorageKey =
  | { kind: 'decl'; usr: string; type: string }
  | { kind: 'this'; methodUsr: string; type: string }
  | { kind: 'return'; fnUsr: string; field: string }
  | { kind: 'fold'; foldId: number; part: 'acc' | 'result' }
  | { kind: 'call'; eventId: number; field: string }
  | { kind: 'opaque'; reason: string; site: SourceRange };
```

### 3.2 `Precision`

```ts
type Precision = 'exact' | 'may' | 'conditional' | 'unknown';
```

### 3.3 `Fact`

```ts
type Fact =
  | { kind: 'value-source'; value: ValueRef; precision: Precision }
  | { kind: 'write'; eventId: number; storage: StoragePath; precision: Precision }
  | { kind: 'alias'; target: StoragePath; precision: Precision }
  | { kind: 'boundary'; reason: string; site: SourceRange };
```

### 3.4 事件

事件来自 Clang inventory：`read/write/init/alias/move/copy/capture/call/call-effect/return/return-field/fold-seed/fold-result/param/branch-condition`。事件不是查询专用的；查询只解释事件和关系。

## 4. Local dataflow

对函数 CFG：

- lattice：`Map<CanonicalStorage, Set<WriteId>>` + `Map<CallResult, ValueProvenance>`；
- transfer：
  - Declaration init：写入目标子树；
  - Assign/compound/inc：写入目标；compound/inc 保留旧版本作为 history edge；
  - Alias：记录引用绑定，不写目标；
  - Move/copy：产生 value-transfer，不自动改目标；
  - Call：应用函数摘要/未知效果；
- merge：union（may），保留条件；
- loop：worklist 到固定点，widen 仅用于上限预算。

`CanonicalStorage` 由 AST 解析：

- 字段按 `FieldDecl` 语义顺序/名称；
- `std::move` 不改变存储；
- 引用绑定解析到目标；循环引用/重绑定 => boundary；
- 指针 `p->field`：有唯一 points-to 才规范化，否则 `PointerTargetSet`；
- 动态下标 `[*:expr]`：may-alias；常量下标精确。

## 5. 跨函数

函数摘要（按 USR + 模板实例）：

```ts
interface FunctionSummary {
  params: ParamEffect[];       // read/write/alias/value
  returns: ReturnField[];      // expression -> field
  effects: Effect[];           // writes/unknown
  calls: CallSummaryRef[];
}
```

- 参数值传递：实参值 -> 参数值；引用/指针：alias/points-to；
- 返回聚合：字段级 `return-field`；
- 调用结果：`call` 值；无摘要/外部 => boundary；
- 模板实例：pattern + args；实例独立；
- 递归：visited `(summary, field)` + 深度预算，保留 may。

## 6. Fold

Fold 摘要由 range/seed/lambda/return 构成：

```ts
interface FoldSummary {
  id; range: ValueSummary; seed: FieldValue[];
  accParam: StorageKey; elemParam: StorageKey;
  returns: ReturnPath[];
  firstElement?: ValueSummary;    // iota/容器 begin 可证明时
  iterationGuard?: GuardSummary;
}
```

- seed 字段级传递；
- return 回边是 conditional；
- 首轮 guard：如果当前查询被 `element == firstElement` 等条件支配，同 fold backedge 不可达；
- 零迭代：仅 seed；
- 多返回/提前返回分别保留；
- 嵌套 fold 递归展开；
- 标准 `ranges::fold_left`/`std::accumulate` 使用通用算法摘要，不按业务类型。

## 7. 查询

查询共享同一 ProgramGraph/数据流结果：

- Origin：从 read 的版本追 value source；
- Mutation：从 read 之前找 reaching writes；覆盖写杀死旧版本，History 仍可遍历；
- History：沿 write/backedge/call/return 递归；
- Provenance：返回边和中间节点，不强行压缩为唯一目标。

每个结果有 `kind/targets/provenance/boundaries/conditions/limitations`，与 `SEMANTIC-SPEC.md` 一致。

## 8. VS Code 集成

保留旧插件：

- 命令/QuickPick/导航；
- compile_commands 解析；
- clangd caller discovery；
- AST 缓存/PCH/生命周期。

新增适配层：

```text
src/state-trace/engine.ts       ProgramGraph + solver + query
src/state-trace/inventory.ts    NDJSON→typed IR
src/state-trace/native.ts       spawn Clang inventory
src/state-trace/vscode.ts       query result → VS Code locations/QuickPick
src/state-trace/cli.ts          independent CLI
```

旧 `src/analysis.ts` 不参与新默认路径；可在测试/对照中保留。若新引擎失败，显示明确 Boundary/错误，不自动用旧分析器掩盖。

## 9. 新 C++ 结构的扩展位置

- 新表达式/字段/模板：Clang frontend event extractor；
- 新别名/指针语义：StorageCanonicalizer/PointsTo；
- 新标准库 API：stdlib summary 表（契约，不是业务名）；
- 新 fold 算法：FoldSummary 适配器；
- 新资源类型：ResourceEffect 摘要；
- 查询展示：adapter，不改变语义层。

## 10. 防特例爆炸

- 任何语义规则必须能写成独立正/负 fixture；
- 新增规则先改 `SEMANTIC-SPEC.md`/`FAILURE-QUEUE.md`，再实现；
- 不允许判断业务字段/函数/文件/行号；
- 允许标准库 API 摘要，必须记录契约；
- Oracle 失败按 `Frontend/Object identity/Field mapping/Value transfer/Alias/CFG/Interprocedural/Fold/Stdlib/Unknown/Source mapping/Query` 分类修复。

## 11. 第二轮后的求解细节

- `Program.resolve` 先应用引用别名，再应用 address-of pointee；LocalFlow 的 key 和查询 storage 都走同一 canonicalization。
- 聚合赋值拆成整体写 + 字段写；整体写 subkind=`aggregate` 不杀死字段写。
- `call:<id>` 是跨函数值的稳定句柄；构造器/`new` 单初始化器传播工厂 call id。
- 标准算法/范围管道通过嵌套 lambda 的 return 建立元素来源；这是 stdlib contract，不是业务名规则。
- 查询 kind 只由 SOURCE_KINDS 计数，call/return/transfer/condition 作为证据展示。
