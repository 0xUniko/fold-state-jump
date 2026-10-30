# 跨函数状态追踪排查与修复

## 2026-10-30：当前 execute(SessionState, Input) 模板选择修复

本轮基线 `9415d6845`，nano-infer 为
`2e523d9e1d6c198988cab4193971093907f767f5`；开始时两个工作区均干净。
远端已删除旧 feature 分支，本轮从干净的当前提交建立 `feat/multi-funcs`。
nano-infer 只读。下文 2026-10-25 的 Session/聚合参数排查是历史记录，
**不适用于当前 execute 的签名**。

### 首次失败位置与实际证据

`test/project-state-sources.ts` 的旧入口首先因为找不到
`BatchState{std::move(session.session_state), {}}` 失败。更新入口后，
使用当前真实 AST 回放旧分析模块才暴露本轮产品缺陷：
`resolveSelection → findNodeAt → preferIdentifier` 将一个源码 token 对应的
多个语义实例压成一个节点。排序先排除 dependent pattern，再以 AST 顺序
选择了 `EmbeddingInput` 实例，整个 `TokenInput` 实例从未进入调用者分析。

当前 pipeline.h 的原生 AST 同时含有：

| 节点 | 函数身份 | 形参索引 | 本地调用 |
| --- | --- | --- | --- |
| execute pattern 的 ParmVarDecl | `Pipeline@FT@>1#Texecute…` | 0 | 没有直接指向 pattern 的调用 |
| execute<EmbeddingInput> 的 ParmVarDecl | `Pipeline@F@execute<…EmbeddingInput>…` | 0 | run_embeddings，pipeline.h:1310 |
| execute<TokenInput> 的 ParmVarDecl | `Pipeline@F@execute<…TokenInput>…` | 0 | run_batch，pipeline.h:1328 |

三者形参 token 的 UTF-8 偏移均为 **34446**，函数 token 偏移为 **34425**，
但函数 ID、形参 ID、USR 和第二形参类型各自独立。ExpressionPath 都是
`{rootId: 该实例 params[0].id, rootName: 'session_state', members: []}`。
函数体 guard 和 layer fold seed 的同一根对象 token 也有各实例的 DeclRefExpr。
这排除了“Clang 没有提取 execute 形参/实例/调用”的解释。

选中 EmbeddingInput 后，旧 `callerLinks` 正确找到 run_embeddings，
`mappedArgument/valueSource` 正确穿过隐式移动构造与 std::move，
将参数映射为 run_embeddings 的 `session_state`。旧模块在完整提供真实 CLI
调用点后，Origin **只有 cli.cpp:293 一个 seed**，Mutation 为
**AnalysisFailure**，保留 `Fold returned storage identity is not verified for
batch_state.session_state`。这些边界对该路径成立，但不能代表被丢弃的 run_batch 路径。

实际 clangd 23 返回 execute 两个模板调用的引用位置。对 EmbeddingInput
查询，pipeline.h:1310 验证通过，:1328 因具体 USR 不同被拒绝；TokenInput
查询则反过来。声明引用也被调用范围验证拒绝。
因此 `callerLinksAt` 对具体实例的严格拒绝在这里是正确行为，不能改为按函数名合并。
CLI 返回位置也通过了 UTF-16 → UTF-8、调用范围及 callee 范围验证：
run_batch 在 cli.cpp:236、:536，run_embeddings 在 :317。

完整 USR、真实节点 ID/ExpressionPath、provider 范围、每个验证结果、各层
参数映射、终点和诊断保存在
[测量与证据](measurements/execute-session-state.json)。同一组新 AST 上，
保存的旧分析模块回放得到一个 Origin 与 Mutation failure；新模块得到下述结果。
新模板测试在旧模块上为 **2 pass / 5 fail**，新模块为 **7 pass / 0 fail**。

### 修复与身份约束

- Native 同时为函数节点和 callee 提取 Clang
  `getTemplateInstantiationPattern()` 的 USR，作为 `templatePatternSymbol`。
  具体实例仍保留原有 USR；显式 specialization 没有被当作 primary pattern 的实例。
- `findNodesAt/resolveSelection` 保留同一 token、同一 compiler pattern 的每个
  concrete selection，分别使用各自函数、类型、参数 ID 与 prepared AST 调用原分析器。
  同一实例在 compact AST 中重复序列化时，按函数 ID 选择更深的语义节点，
  避免将根级副本当成另一实例；原 generic-this 回归保持原有两个来源。
- 仅有 dependent header pattern 时，发现位置可以凭 compiler pattern 关系
  找到另一个 TU 中**实际存在的 concrete body**。在那个 AST 中重新解析光标后，
  才按具体 USR 继续分析。缺 concrete body、缺符号、错 overload、显式 specialization、
  实参内部的函数引用均不能据此产生调用边。
- `callerLinks` 不把 pattern 发现关系当作依赖模板正文的直接调用；没有成功解析
  concrete selection 时仍停在明确形参边界。类型、存储与参数值映射规则未放宽。
- `src/extension.ts` 和 `src/caller-discovery.ts` 的生产实现无需改动。
  已检查其 provider union、位置转换、按文件加载、递归展开、边界日志、候选选择及
  导航版本验证。多个语义 selection 复用现有分析、发现和导航流程。

### 当前真实调用链

| 路径 | 第一次参数映射 | CLI 实参映射 | Origin | Previous Mutation |
| --- | --- | --- | --- | --- |
| execute<EmbeddingInput> → run_embeddings → 图像 fold | session_state，后缀 `[]` | batch_state.session_state | cli.cpp:293 的 `std::move(batch_state)` seed | returned storage identity 未验证，保留边界 |
| execute<TokenInput> → run_batch → prefill_text fold | session_state，后缀 `[]` | batch_state.session_state | cli.cpp:234 的 `BatchState{std::move(session_state), {}}` | 同上 |
| execute<TokenInput> → run_batch → generation fold | session_state，后缀 `[]` | generation.batch_state.session_state | cli.cpp:512 的 `Generation{std::move(batch_state), {}, false, 0, 0}` | cli.cpp:535 的 `generation.batch_state = pipeline.run_batch(...)` |

最后一个修改是**上一轮源码顺序候选**，wrapped=true，并包含 fold return witness；
第一轮使用 seed，其他轮仍取决于分支 guards。另两条路径的诊断没有被成功候选抹掉，
也没有将 execute 内部后续计算误当作进入 execute 之前的历史修改。

### 执行的验证与未通过项目

| 命令/回放 | 实际结果 |
| --- | --- |
| `bun --version`；package/tsconfig 检查 | Bun 1.4.3，ES2022/strict，未改构建或检查配置 |
| 最初沙箱内 `bun test` | 490 pass / 41 fail，native worker IPC 受限；同一完整测试在沙箱外重跑，未修改或跳过断言 |
| 修改前 `bun test`（允许 native IPC 的沙箱外） | 531 pass / 0 fail |
| `bun run build:native` | LLVM/Clang 23.1.4，构建成功 |
| `bun test test/template-state.test.ts` | 7 pass，涵盖 free/member templates、header-only pattern → TU instances、双 caller/两层调用、move、overload、显式 specialization、缺 concrete body 与错误范围 |
| `bun test/template-command.ts` | 16 个真实 activate/native/递归/QuickPick/最终导航案例通过；VS Code APIs 为 mock |
| 最终 `bun test`（允许 native IPC 的沙箱外） | 539 pass / 0 fail，27 files；含原嵌套聚合、fold seed、上一轮状态、自定义构造与错误跳转回归 |
| `bun check` | 80 files，无类型错误；未改用 tsc |
| `bun run build` | 扩展构建成功 |
| `native/build/fold-state-jump-ast --source "$PWD/test/fixtures/native-fold.cpp" -- -std=c++23 > /tmp/fold-state-jump-ast.json`；`bun test/native-integration.ts` | 直接与跨函数 mutation 通过 |
| `bun test/project-state-sources.ts /home/huawei/nano-infer` | 当前形参声明、guard、fold seed：各有 3 Origin 和 generation Mutation，通过 |
| `FSJ_CLANGD=/usr/bin/clangd-23 bun test/project-state-sources.ts /home/huawei/nano-infer` | 实际 clangd 23.1.4、实际 Incoming Calls/References、UTF-16，全部上述断言通过；后台磁盘索引关闭，两个明确文档在内存中打开 |
| `bun test/project-integration.ts /home/huawei/nano-infer` | **未通过**：旧 `++session_state.bank_state.counters.graph_builds;` 已删除；ffn/experts 的旧 bank regex 得到 0 项，不能算覆盖 |
| `FSJ_AUDIT_AST_DIRECTORY=/tmp/fsj-audit bun test/project-state-audit.ts /home/huawei/nano-infer` | **未通过**：首个旧 `return {std::move(session_state), std::move(logits)};` 已改为嵌套聚合返回。旧脚本后续审计没有执行，不能称为全项目审计通过 |
| `git diff --check` | 通过 |

旧两份广泛审计脚本的业务重构迁移不在此次修复范围；保留失败而没有跳过旧断言。
本轮针对当前 execute 的真实回归是更新后的 project-state-sources；其严格断言不依赖
旧 Session、take_batch_state 或已删除 counters。nano-infer 源码及 Git 状态未改变。

保存模块的实际采样命令为 `bun build src/analysis.ts --target=node --format=esm --outfile=/tmp/fsj-analysis-before.mjs`
（修改前）和 `--outfile=/tmp/fsj-analysis-after-final.mjs`（最终），再分别执行
`bun test/analysis-performance.ts /tmp/fsj-analysis-before.mjs 10000` 与
`bun test/analysis-performance.ts /tmp/fsj-analysis-after-final.mjs 10000`。
对当前 AST 的旧模块 Origin 回放为 `bun /tmp/fsj-project-baseline.ts /home/huawei/nano-infer`
（1 !== 3），Mutation 对比为 `bun /tmp/fsj-baseline-mutation.ts`
（AnalysisFailure → MutationFound）；这两个临时脚本复用生产分析并明确提供两份真实 AST 中的调用位置，
不声称它们本身验证了语言服务。

性能为相同输入、相同 Bun、两个保存的 bundle 各 10,000 次查询的单次本机采样：
20,000 无关写入为 4.22 → 5.72 µs，历史写入为 3.04 → 2.82 µs，
20,000 helper 为 6.02 → 7.78 µs，2,000 引用别名为 16.89 → 17.08 µs。
这些单次结果包含多 selection 收集/合并的微秒级成本与采样噪声；没有声称性能不变或统计尾延迟保证。
Native JSON 在当前相同源码上由 10,639,118 / 29,779,096 字节变为
10,797,476 / 30,530,919 字节（pipeline/CLI），增加约 1.5% / 2.5%。
Native 可执行文件 identity 改变会使旧磁盘 AST 失效，不要求用户手动清缓存。

没有启动实际 Extension Host/UI：环境中有 remote VS Code server 与 clangd，
没有本地桌面 Electron/显示环境。实际语言服务验证止于 LSP + 生产 discovery/analyzer；
命令到导航由 mock VS Code harness 独立验证。未证明 workspace caller 全集，
未执行模型/GPU/gRPC 推理。无法证明的 fold 返回身份、间接/虚调用、自定义构造、
不可获得的具体模板正文等仍是显式边界。

---

## 2026-10-25 历史记录


验证日期：2026-10-25。起点为 `feat/multi-funcs` / `57988639d`，工作区原本干净。
未切换分支，未提交、推送或修改 vendored 仓库、nano-infer 源码。

## 实际断点

修复前，以真实 pipeline.h / cli.cpp 的原生 AST 重放：

1. 光标在 pipeline.h:801 的 `session.session_state` 成员 token。
   `resolveSelection` → `expressionPath` → `pathAt` 得到
   `{ rootId: execute.params[0].id, rootName: 'session', members: ['session_state'] }`。
   `session` 是按值形参，引用别名归一化不会改变此路径。
2. `findPreviousMutation` 没有找到 execute 内、光标之前的相关写入。
   lambda 中的写入属于各自函数索引；execute 本身不是 fold lambda，`foldFor(execute)` 不返回该 seed 所在的 fold。
3. 当前 pipeline AST 已有 execute 的两个调用者：run_batch:1209、run_embeddings:1190。
   `std::move(session)` 及隐式移动构造将目标后缀完整映射到这两个函数的 session 形参。
   三个函数仍报告外部发现边界；本地调用者不会被当作完整集合。
4. `runAnalysis` 向语言服务查询 incoming calls 和 references，去重后逐文件加载 AST。
   `callerLinksAt` 同时要求 Clang USR 一致、调用范围包含返回位置、callee 范围与位置重叠。
   每条 CallerLink 持有自己的 prepared AST，进程内声明地址不会跨 AST 比较。
5. 在明确提供真实 CLI 候选的重放中，三个 CLI 调用点都通过上述验证：
   cli.cpp:230 的 run_batch、:311 的 run_embeddings、:492 的 run_batch。
   实参均为 `InitListExpr`，例如 `{&pipeline, std::move(batch_state.session_state)}`。
6. **旧 `mappedArgument` 只对整个实参调用 `pathAt`，再拼接成员后缀。**
   `expressionPath(InitListExpr)` 返回 null；原生 JSON 也没有字段与 initializer 的对应关系。
   Mutation 在 `if (!argument || !range)` 直接返回空集合，既丢失路径，也丢失原因。
   Origin 则把整个聚合实参当作最终初始化，提前停止。

因此，已复现的根因是**已验证调用点上的子对象来源映射失败**。
没有证据表明本例由 USR 或调用范围验证失败造成。真实编辑器语言服务是否返回了全部候选，
本次无法直接观测，不能由编译器重放推断其完整性。

对应实现：`src/analysis.ts` 的 `valueSource`、`mappedArgument`、`traceMutations`、`originFor`；
原生字段元数据在 `native/ast-extractor.cpp` 的 statement 序列化中。

## 修复后的真实调用链

| execute seed 上溯路径 | 两层 argument 的成员后缀 | Mutation | Origin |
| --- | --- | --- | --- |
| execute → run_batch → prefill_text 的 fold lambda | session.session_state → batch_state.session_state | 明确停止：lambda 只返回转换后的状态，没有可索引写入 | cli.cpp:228，`BatchState{std::move(session_state), {}}` |
| execute → run_embeddings → prefill 的图像分批 fold lambda | session.session_state → batch_state.session_state | 同上，保留该边界 | cli.cpp:287，`std::move(batch_state)` |
| execute → run_batch → turn 的 generation fold lambda | session.session_state → generation.batch_state.session_state | cli.cpp:492，`generation.batch_state = take_batch_state(...)`，wrapped=true | cli.cpp:471，`Generation{std::move(batch_state), {}, false}` |

所有跨参数 frame 的 parameterIndex 都为 0。CLI 聚合映射消费 Session.session_state 字段，
而保留来源对象原有的 batch_state / session_state 后缀。
最终 Mutation 是 generation fold 的**上一轮源码顺序回绕候选**；没有把 execute seed
之后的 execute lambda 修改当作调用前修改。另两条无可索引写入的路径仍保留诊断，成功路径不会抹掉它们。

## 实现范围

- 用 `ValueSource` 明确区分 Path、Initialization、Boundary；Mutation 与 Origin 共用参数映射。
- 只使用 Clang semantic InitListExpr 的字段顺序。支持嵌套字段、std::move/forward、
  `NoOp` 聚合函数式转换；不剥除任意调用、构造、cast 或一元操作。
- 原生补充 aggregateFields、castKind、箭头访问、整数下标和复制/移动来源限制元数据。
  `copyOrMove` 本身不再构成透明性证明；自定义构造、嵌套自定义复制、共享引用成员、
  复制对象后的指向对象追踪及有疑义的捕获均明确停止。标准库子对象内部保持不透明。
  optional/variant 递归检查内部值的构造；只有明确列出的标准存储转移操作使用对应规则，
  不能仅凭 `std::` 名称假设值保持不变。
- 本地按值复制在声明初始化时追踪源状态，不读取源对象复制后的修改。
- 路径区分指针绑定与解引用，固定数组保留具体下标。动态下标与无法证明的指针身份形成边界；
  此类边界也会穿过 helper 返回，阻止回退到更早但可能已失效的候选。
- 调用者失败、验证拒绝、映射失败及 fold 返回值边界通过 AnalysisQuery.diagnostics 保留；
  扩展输出 `analysis-boundary`。Mutation 失败信息包含具体边界。
- 导航和候选说明明确使用源码顺序语义，不声称运行时可达。未降低 USR 验证标准，未增加工作区扫描。

## 回归证据

`test/state-sources.test.ts` 使用真实原生 JSON，断言目标文件与写入/初始化行、全部 frame、
parameterIndex、根对象、成员后缀及 wrapped 标志，覆盖：

- 直接 Session、std::move、命名及匿名聚合、嵌套聚合、一层和多层 helper、引用别名。
- 独立 TU 与头文件调用者；两个调用者的最近调用前修改互不串线。
- seed 前修改、轮内回绕、fold 后修改、无索引写入、仅初始化及工厂函数边界。
- 自定义复制/移动、包含自定义成员的隐式复制、整体对象复制、复制捕获、指针捕获。
- optional 内自定义值的移动，避免把可变换内部值的包装当作存储转移。
- 指针/指向对象、嵌套指针、helper 重绑定、Origin 的光标时间、固定下标与动态下标 helper。
- 条件语句中的源码顺序候选，不把测试描述为控制流证明。

命令 harness 还以聚合实参完整执行发现、加载、验证、递归、QuickPick、缓存命中、
provider 失败、调用者编译失败、取消、脏依赖和选择后的版本校验。
`member-callers` 的 Origin 断言已定位实际对象声明，而不是保存其地址的指针声明。
`native.test.ts` 的箭头访问用例现在明确点击成员 token，避免把点击指针与点击指向对象混为一谈。

对同一组新原生 AST，加载 `git show 57988639d:src/analysis.ts` 作基线：
直接传参、move 的修改位置不变；聚合、嵌套聚合、多层 helper 从 AnalysisFailure 变为正确写入；
自定义移动从错误 MutationFound 变为 Boundary；array[0] 不再跳到 array[1] 的写入。

原 `project-integration.ts` 的 pipeline bank 来源预期在修改前就已过时：
旧分析器也返回 execute 的 BatchState seed，而脚本要求参数边界。
现改为精确断言该 seed 的字节位置及完整成员后缀，没有放宽为接受任意成功结果。

## 执行的验证

| 命令 | 实际结果 |
| --- | --- |
| `bun run build:native` | LLVM/Clang 23.1.4，构建成功 |
| `bunx --no-install tsc --noEmit` | 通过 |
| `bun run build` | 通过 |
| `git diff --check` | 通过 |
| `bun test test/analysis.test.ts test/callers.test.ts test/native.test.ts test/state-sources.test.ts test/callers-command.test.ts` | 166 通过，0 失败 |
| `bun test` | 293 通过，41 失败；与修改前的 41 项失败集合完全相同 |
| `bun test/project-integration.ts /home/huawei/nano-infer` | ffn.h 14、experts.h 3、pipeline.h 8 个目标通过 |
| `bun test/project-state-sources.ts /home/huawei/nano-infer` | 使用新提取的 pipeline/CLI AST 验证上述调用链与三个 seed |

全量 Bun 的既有失败集中在 preamble-context、preamble、preamble-ssd、preamble-native。
已单独复现：本机 Bun 1.4.3 异步启动的 worker 在返回响应之前退出；同一请求通过同步进程可成功。
未将这些失败忽略、标记跳过或修改断言。

作为独立验证，将以下两套测试 bundle 为 Node CJS 后，使用本机 VS Code Server 的 Node 执行：

```sh
bun build ./test/preamble-native.test.ts --target=node --format=cjs --outfile=/tmp/fold-preamble-native.cjs
/home/huawei/.vscode-server/bin/e646868227c3e3a9e3f24277c8c7220be42c0be7/node /tmp/fold-preamble-native.cjs
bun build ./test/preamble.test.ts --target=node --format=cjs --outfile=/tmp/fold-preamble.cjs
/home/huawei/.vscode-server/bin/e646868227c3e3a9e3f24277c8c7220be42c0be7/node /tmp/fold-preamble.cjs
```

结果：原生持久 preamble 协议 7/7、生产 preamble 集成 19/19 通过。
这不能替代 `bun test` 全绿，也没有验证另外两套失败文件的 Node 结果。

## 性能、缓存与剩余边界

写入及未知写入边界按函数/根变量建索引，按偏移排序，查询复用 prepared AST；
已找到候选后，不再扫描比该候选更早的指针写入来寻找屏障。
调用者集合、发现策略、并发限制、缓存容量和失效规则未改；命令测试验证缓存命中无原生提取，
新文件/依赖变化及 QuickPick 后的陈旧导航仍受保护。
原生字段协议更新由 buildIdentity 的可执行文件版本元数据/哈希改变使旧缓存失效。

性能使用 `test/analysis-performance.ts` 在保存的旧模块及当前模块上运行相同输入，
命令为 `bun test/analysis-performance.ts /tmp/fold-analysis-before.ts 1000` 和
`bun test/analysis-performance.ts ../src/analysis 1000`，每种 1,000 次查询。

| 场景 | 旧查询 µs | 当前查询 µs | 旧建索引 ms | 当前建索引 ms |
| --- | ---: | ---: | ---: | ---: |
| 20,000 次无关写入 | 3.37 | 3.62 | 41.77 | 39.50 |
| 20,000 次写入中的历史查询 | 2.22 | 2.28 | 29.52 | 27.58 |
| 20,000 个 helper 调用 | 6.11 | 5.77 | 55.02 | 43.57 |
| 2,000 层引用别名 | 14.41 | 15.06 | 4.51 | 3.89 |

冷 Clang 项目检查同时记录 AST 大小和提取/索引耗时。
最终一次 pipeline 提取并建索引为 12.95 秒，CLI 为 16.33 秒。
原生 JSON 分别由 5,914,465 / 19,866,382 字节增加到 6,088,024 / 20,376,853 字节，
约增加 2.9% / 2.6%。
这些是本机采样，不是严格统计保证；新增元数据与边界索引有空间成本。

仍不执行完整 CFG、分支可达性、复杂别名/指针算术、虚调用或任意构造函数解释。
不跟随 take_batch_state、start_session 等任意函数返回值的字段流；遇到这类参数实参会明确报告 Boundary，
Origin 在已确认的 fold seed 停止。条件表达式的多来源映射也保留为 Unsupported，未任选某个来源。
没有实际启动 Extension Host/C++ language server；真实项目验证只使用两个明确指定文件，
不证明语言服务返回的真实调用者集合完整，也不证明所有运行时路径可达。
