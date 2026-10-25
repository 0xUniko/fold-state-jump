# 跨函数状态追踪排查与修复

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
