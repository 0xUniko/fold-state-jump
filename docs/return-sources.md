# Return Source Mapping（2026-10-26）

本轮基线为 `feat/multi-funcs` 的 `0fdd544da70238e63bdf50ba685d1917d14eab79`，开始时工作区干净。nano-infer 为 `562758447a716d05dabb3173cebac489bf7daf80`，全程未修改。没有提交、推送、合并，没有运行 VS Code / Extension Host / clangd / cpptools。

## 1. 当前 HEAD 的复现和根因

重新阅读了 `AGENTS.md`、analysis/storage/native 实现、现有 fixtures、真实项目脚本和历史报告。实际运行原 `project-state-audit.ts`，9 文件、23 个原选择位置、46 次原断言全部通过；两处问题仍在，不能把通过旧边界断言理解成已经支持返回来源。

| 原选择位置 | 修改前 Mutation | 修改前 Origin |
|---|---|---|
| generation-seed，cli.cpp:471，`batch_state` | `Unsupported argument expression: CallExpr.` | cli.cpp:448，局部 batch_state 初始化 |
| chat-return，cli.cpp:513，`session_state` | `Unsupported argument expression: CXXOperatorCallExpr.` | cli.cpp:469，局部 generation 初始化 |

调用链为 `traceMutations` → 局部 `VarDecl` 初始化 → `valueSource`。旧实现只有存储路径、初始化和边界三种来源，没有从调用返回进入函数体的来源。两个 AST 节点使用同一个缺失入口，不是两个独立问题。

真实 AST 进一步证明：`prefill` 自身的唯一本函数 `return` 位于 cli.cpp:245、字节 11129；内部其他 return 属于嵌套 lambda。它返回 `ranges::fold_left_fn::operator()` 的结果。此目标有直接 Clang callee/USR，但 compact AST 没有其函数定义；Native 现有选择策略排除了系统头函数体。这一边界也直接出现在 chat-return 的 generation 初始化中。没有通过名称猜测 fold 返回对象或把 seed 直接等同于最终结果。

## 2. 实现和语义

实现层选在 `src/analysis.ts`：现有 Clang AST 已包含 ReturnStmt、语义聚合字段顺序、canonical callee、参数 effects、拷贝保真元数据。`src/storage.ts` 继续只负责类型可达性和存储关系；返回值来源不能替代这些关系，也不能生成 Mutation。

`ReturnSource` 是显式 ADT：

- `storage`：真实声明根与已有字段、常量元素、解引用路径。
- `aggregate`：构造位置及每个字段自己的来源，不创建虚构对象身份。
- `transparent`：已验证标准移动/转发或 NoOp 表达式。
- `preserved-copy`：单独保留拷贝/移动的字段保真证明，在实际投影时检查边界。
- `call`：已解析目标及其返回投影，CallExpr / CXXMemberCallExpr / CXXOperatorCallExpr 共享语义。
- `initialization`、`unsupported`：已知初始化与缺失证明明确区分。

每个 `ReturnBranch` 保存真实 ReturnStmt 与来源。准备 AST 时按实际函数 owner 收集所有 return，排除嵌套函数以及重复序列化的非选中定义；摘要只构建一次。`buildReturnSources` 也用于独立计时。缓存只存在于 PreparedAst 中，随已有 AST 生命周期失效，没有全局可变来源缓存。

查询投影摘要后进入现有 Origin / Mutation。不可变 `ReturnBinding` 将 callee 绑定到当前这个调用点；参数或 receiver 回到调用者时退出该 binding，再继续实际实参的字段投影。这避免同一函数其他调用者污染结果，也允许 `identity(identity(state))`。lambda reference capture 同样限定到本次实际调用。返回帧保存 callee、ReturnStmt 和所查字段路径；去重键包含返回分支。

多个 return 的候选与诊断分别保留。`AnalysisQuery.returnMapping` 是 `complete | incomplete(reasons)`；它只描述返回来源证明，不代表 Mutation 时序已经证明。例如条件写入时映射可以完整，但 Mutation 查询仍失败。递归返回保留直接分支并报告递归边界。

Mutation 仍由现有写入/调用关系/时序搜索产生。进入返回函数时使用该 return 的位置；发现选中的写入属于另一条件、循环或 case 路径时保留边界。返回借用先存入局部对象再观察 pointee/reference 的情况，不能把调用前的状态冒充观察时状态，明确停止。没有改异步、任务队列或 happens-before 模型。

Origin 保持已有“局部对象开始于自己的初始化声明”语义。当参数实际来自调用结果时，Origin 使用同一返回摘要进入函数并继续映射；它不会把新建局部复制对象直接等同于原对象。

Native 提供由 Clang 类型证明的 `returnBorrow` 类别，避免 TS 猜测函数返回引用/指针。返回 callee 拥有的局部对象引用、地址或聚合中指向它的地址时，保留生命周期证明缺失的边界。此保护没有引入通用生命周期或异步模型。

Native 同时收紧透明包装证明：只接受系统头中、单实参、返回引用且 canonical 对象类型相同的 `std::move/std::forward`。三实参 `std::move` 算法不再被误标为 identity。TS 不再凭函数名字穿透包装。

## 3. 文件变更

| 文件 | 目的 |
|---|---|
| `src/analysis.ts` | 返回 ADT、按 owner 的不可变摘要、字段投影、调用点 binding、返回帧、完整性诊断、Mutation 时序保护 |
| `native/ast-extractor.cpp` | 提供返回借用类别，验证标准透明包装的 arity、系统声明、返回引用和类型 |
| `test/fixtures/return-sources.cpp` | 独立最小 C++ AST 场景，包括正向与误报反例 |
| `test/return-sources.test.ts` | 精确位置、来源字段、参数编号、调用帧、分支和诊断断言 |
| `test/semantic-boundaries.test.ts` | 经用户明确允许，将唯一与新能力冲突的旧聚合返回失败断言换为精确正向断言；其他旧断言不变 |
| `test/project-return-sources.ts` | 两个原真实选择位置的独立返回遍历及剩余边界断言 |
| `test/return-sources-performance.ts` | 前后交错提取、独立摘要计时、查询批次和逻辑元数据体积 |
| `test/return-query-performance.ts` | 相同归档 CLI AST、7 轮长批次查询复测，区分预热/采样波动与新增查询工作 |
| 本文及 measurements JSON | 可复核报告、命令、原始样本和输入/实现指纹 |

## 4. 真实结果和验证

修改后 generation-seed 已进入 `prefill` 的实际 return，诊断包含 `cli.cpp:11129 return:`，然后明确停止在 `ranges::fold_left_fn::operator() (definition unavailable)`。chat-return 直接报告同一已解析目标的定义不可用。两者仍是 AnalysisFailure，没有制造具体 Mutation；Origin 仍分别是 448、469 行。独立项目测试断言原行号、原 token、prefill 的唯一本函数 return、完整性与诊断偏移。

原审计脚本及其 46 次断言未修改。唯一更新的旧测试是用户明确批准的 semantic-boundaries 聚合返回测试，现在断言真实写入 `state.value = 17`、调用位置、ReturnStmt 位置、`['state', 'value']` 路径、一个返回帧及 complete 状态。

返回来源最小 AST 测试为 **36 项**；最终完整套件为 **501 pass / 0 fail，24 文件，16.98 s**。实际验证命令与结果见随附 measurements JSON。Bun 为 1.4.3，使用内置 checker；项目没有单独安装 TypeScript，也没有自定义 check 脚本。未替换成 tsc。

完整测试在沙箱内曾因 Native worker 提前退出而出现 41 个 preamble 失败；同样源码在允许既有 prctl/父进程生命周期行为的非沙箱环境中通过。这些是环境差异，未更改或跳过测试。开发时还真实出现过上述旧能力边界测试失败，随后获得用户授权改为精确断言。

## 5. 性能方法

基线 TS 文件从 HEAD 保存，Native 二进制在修改前保存；源码和二进制 SHA256 与该 HEAD 已有审计记录一致。原始样本、编译参数、输入 SHA256、版本和摘要体积均记录于 JSON。采用相同文件、原选择位置、`build-cpu-tests/compile_commands.json` 和编译参数。

复现基线源码：

```sh
mkdir -p /tmp/fsj-return-before
git show 0fdd544da70238e63bdf50ba685d1917d14eab79:src/analysis.ts > /tmp/fsj-return-before/analysis.ts
git show 0fdd544da70238e63bdf50ba685d1917d14eab79:src/storage.ts > /tmp/fsj-return-before/storage.ts
mkdir -p /tmp/fsj-return-baseline-source
git archive 0fdd544da70238e63bdf50ba685d1917d14eab79 native | tar -x -C /tmp/fsj-return-baseline-source
cmake -S /tmp/fsj-return-baseline-source/native -B /tmp/fsj-return-baseline-build \
  -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm -DClang_DIR=/usr/lib/llvm-23/lib/cmake/clang
cmake --build /tmp/fsj-return-baseline-build -j 10
cp /tmp/fsj-return-baseline-build/fold-state-jump-ast /tmp/fsj-return-before/extractor
```

本轮实际在修改前直接保存了现有 Native 二进制，SHA256 为 `8c0e82f38a7dcc333cd9aa54154d4c41b7ccc5143f1b2ab8d7d36673a78481b5`。它与该 HEAD 的已有源码/二进制审计指纹一致。上面的独立源码构建使用 LLVM/Clang 23.1.4；构建路径可能使二进制哈希不同，应以源码版本和实际参数为准。不能拿修改后 extractor 当基线。

```sh
FSJ_PROJECT_COMPILE_COMMANDS=/home/huawei/nano-infer/build-cpu-tests/compile_commands.json \
  bun test/return-sources-performance.ts /tmp/fsj-return-before/analysis.ts \
  /tmp/fsj-return-before/extractor /home/huawei/nano-infer 5 100
FSJ_PROJECT_COMPILE_COMMANDS=/home/huawei/nano-infer/build-cpu-tests/compile_commands.json \
  bun test/return-sources-performance.ts /tmp/fsj-return-before/analysis.ts \
  /tmp/fsj-return-before/extractor /home/huawei/nano-infer 5 1000 micro
```

每个文件/版本各 5 次独立 Native 提取，版本顺序逐轮交换；每轮记录提取、JSON 解析、prepareAst，另外重建 20 次返回摘要取平均。查询批次先预热，真实项目每轮每选择位置每 mode 100 次，微基准 1000 次。统计使用 5 轮中位数并保留原样本，不能把一次审计耗时当稳定性能数据。提取是无 AST/PCH 缓存的完整 Native 进程，不代表 OS 冷缓存。

`returnMetadataBytes` 是把新增内存索引投影成位置/声明引用及 ADT 后的 JSON 字节数，避免重复序列化已有 wrapper 树；它不是 JS heap 测量或新增磁盘格式。Native AST 和 storageTypes 使用实际 JSON 字节数。单独摘要计时不包括 ReturnStmt 在公共索引遍历中的收集成本；这部分包含于完整 prepareAst。

| 输入 | Native 提取 ms，前 → 后 | 索引准备 ms，前 → 后 | 单独返回摘要 ms | AST bytes，前 → 后 | 来源摘要投影 bytes（新增） |
|---|---:|---:|---:|---:|---:|
| pipeline.h | 13889.88 → 13998.28 | 47.86 → 48.08 | 2.490 | 9,551,763 → 9,552,760 | 99,651 |
| cli.cpp | 16746.37 → 16658.57 | 90.37 → 100.89 | 6.400 | 26,478,541 → 26,480,884 | 277,419 |

以下为每次查询的 5 轮中位数（µs），各 mode 分别预热。

| 输入 / 原选择位置 | Origin，前 → 后 | Mutation，前 → 后 |
|---|---:|---:|
| pipeline.h / batch-return | 7.88 → 7.06 | 6.37 → 7.11 |
| pipeline.h / layer-seed | 4.39 → 4.06 | 289340.70 → 288796.74 |
| cli.cpp / generation-wrap | 5.34 → 5.29 | 10.47 → 9.46 |
| cli.cpp / generation-done | 2.75 → 3.27 | 50.22 → 48.15 |
| cli.cpp / generation-seed | 2.13 → 2.52 | 57.83 → 92.30 |
| cli.cpp / chat-return | 2.77 → 3.11 | 130.97 → 177.03 |

微基准每轮 1000 次，5 轮中位数（µs）；旧版 Mutation 在这些调用结果上失败，新版执行了更多来源追踪，不能将两者视为同等工作的速度对比。

| 场景 | Origin，前 → 后 | Mutation，前 → 后 |
|---|---:|---:|
| parameter | 4.82 → 17.21 | 6.45 → 18.69 |
| relay | 8.84 → 17.26 | 4.61 → 23.59 |
| aggregate | 5.26 → 12.42 | 4.59 → 17.57 |
| branches | 4.59 → 19.42 | 4.31 → 25.12 |
| partial | 4.06 → 14.35 | 3.94 → 21.04 |
| capture | 2.06 → 2.34 | 14.84 → 27.10 |

[完整原始样本、范围、输入指纹和验证记录](measurements/return-sources-2026-10-26.json)。


CLI 索引准备增加 **10.52 ms（11.6%）**，不能忽略。独立来源摘要的 **6.40 ms** 覆盖了返回表达式建模、按语义字段投影准备、顺序可达性检查和非结构化控制流检查；其余差值还包含公共遍历中的 return 收集、索引分配及样本中的 GC/JIT 波动，不能把中位数相减当成精确分解。相对完整 CLI 提取约 16.7 秒，这增加约 **0.063%** 的冷准备总延迟；摘要按 AST 缓存而不按查询重复构造，因此接受这一成本。pipeline 的完整准备仅多 0.23 ms，样本范围有明显重叠。

Native 提取中位数分别变化 **+0.78% / −0.52%**，均在本次样本波动范围内；这不足以宣称提取性能改善或稳定退化。AST 分别只增加 **997 / 2343 bytes**，来源是返回借用类别元数据；storageTypes 仍分别为 **1,622,207 / 2,379,278 bytes**，没有变化。新增来源摘要有 **203 / 830** 个返回分支，逻辑投影约 **99.7 / 277.4 KB**；没有将其谎报成实际 heap 或磁盘占用。

原 layer-seed Mutation 本身约 **289 ms**，前后基本相同；这是既有存储/调用效果分析的开销，本轮没有扩展该任务范围去重构它。

100 次短批次里两个目标 Mutation 分别观察到 **+34.47 / +46.06 µs**。为调查这项退化，又使用完全相同的归档 CLI AST、每 mode 预热 200 次、7 轮 × 1000 次查询、交错版本顺序复测，避免重新提取及短批次预热差异；只保留最后一个结果，以减少批次保留对象导致的 GC 波动。该测量是**真实 AST 的查询微基准**，不能替代上方完整提取测量。

```sh
# 归档 AST 可用原审计的 FSJ_AUDIT_AST_DIRECTORY 保存；本轮使用修改前保存的同一份 CLI AST。
bun test/return-query-performance.ts /tmp/fsj-return-before/analysis.ts \
  /tmp/fsj-return-asts/minicpm-v-4_7-cli.cpp.json \
  /home/huawei/nano-infer/minicpm-v-4_7/cli.cpp 7 1000
```

| CLI 查询 | Origin µs，前 → 后 | Mutation µs，前 → 后 |
|---|---:|---:|
| generation-wrap | 3.15 → 3.25 | 4.47 → 5.01 |
| generation-done | 2.46 → 2.27 | 31.80 → 31.01 |
| generation-seed | 1.40 → 1.40 | 42.37 → 45.68 |
| chat-return | 1.60 → 1.77 | 88.59 → 91.62 |

较充分预热后，两个目标的额外开销约 **3.31 / 3.03 µs**，与新增返回投影、binding、完整性证据和诊断处理相符；前后样本范围仍重叠，不能把短批次中约 60% / 35% 的变化直接归因于返回映射算法。这里接受数微秒的查询成本及准备阶段的数毫秒成本，没有为消除此量级的差值引入跨查询、依赖观察时点的全局可变缓存。

## 6. 剩余边界

- 两个真实目标最终仍受系统 range fold 定义缺失限制。即使只增加系统函数体，fold 多次调用、零次迭代及最终 accumulator 的关系还需要可验证的算法模型；不能凭 fold 名字跳过。
- 自定义构造/复制、optional/variant 适配器没有可证明字段保真时停止；不把第一个构造参数当返回对象。
- 聚合字段使用现有 Native 能提供的语义顺序；union、带基类的初始化和数组聚合初始化未新增字段/元素映射。已有对象的常量元素返回路径已覆盖。
- 算术、未支持的 cast、条件表达式、动态元素、未定义/间接/虚调用等仍保留 unsupported 诊断。普通控制流中的多个 ReturnStmt 已支持；不声称进行了完整 CFG 路径求解。
- 分支局部写入不能证明在所选 return 路径执行时停止；保留其他能证明的来源与诊断。
- 无条件退出后的顺序不可达 return 不贡献来源；含 goto 的函数保留非结构化控制流边界。
- 返回借用的局部后续观察、callee 拥有的局部存储借用、重绑定 pointer 的 pointee，以及递归扩展保留明确边界。安全但需要更强生命周期证明的局部指针别名也可能保守停止。

## 7. 工作区

仍在 `feat/multi-funcs`，HEAD 为 `0fdd544da70238e63bdf50ba685d1917d14eab79`；以上实现、测试和报告为未提交修改。nano-infer 与 vendored 源码未修改。
