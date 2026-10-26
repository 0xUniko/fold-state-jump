# `bank_state.pending` 跨 fold 迭代追踪

验证日期：2026-10-26。完整机器可读证据见
[measurements/pending-fold-2026-10-26.json](measurements/pending-fold-2026-10-26.json)。

## 版本、工作区与验证输入

- fold-state-jump：`feat/multi-funcs`，HEAD 与已 fetch 的
  `origin/feat/multi-funcs` 均为 `44210684268978912f21d9a95afc712f13275693`。
  修改前工作区干净。本次未提交、push、合并或创建 PR。
- nano-infer：`main`，HEAD 与已 fetch 的 `origin/main` 均为
  `562758447a716d05dabb3173cebac489bf7daf80`。开始时已有 `experts.h` 的四行空行修改及
  `model.h` 的用户修改；结束时仍为相同两个文件、104 行增加/20 行删除。本次未写入业务源码。
- 使用 `/home/huawei/nano-infer/build-cpu-tests/compile_commands.json` 的真实编译参数，
  Native LibTooling extractor 直接解析当前头文件；没有替换成简化编译命令。
- Bun 1.4.3；Native LLVM/Clang 23.1.4。类型检查使用 `bun check`，未运行或宣称通过 tsc。
- 初始 fetch 因 `.git/FETCH_HEAD` 只读受限，获准提升权限后两个 fetch 均成功。

## 分开复现三个光标

光标都落在 `pending` 的成员 token，完整路径是 `bank_state.pending`。
第二个光标仍选择 optional 本身，另行验证 contained read 的路径为
`bank_state.pending.reservation.layer`。不能将光标在 `bank_state`、`pending`、`layer` 上的结果混用。

| 光标 | 修复前，仅 ffn.h | 修复前，包含 pipeline 调用链 | 修复后，已验证 pipeline 调用者 |
| --- | --- | --- | --- |
| `if (bank_state.pending && …)` 的第一个 pending | Mutation `AnalysisFailure`：没有 start_decode_layer 调用者 | `AnalysisFailure`：错误计入互斥 prefill case 的 finish_prefill_read | `MutationFound`，ffn.h:528，`wrapped=true` |
| `pending->reservation.layer` 的 pending | `AnalysisFailure`：operator bool 的未知共享效果 | 同样先被 operator bool 阻断 | 同上 |
| `bank_state.pending.reset()` 的 pending | `AnalysisFailure`：operator-> 的未知效果 | 同样先被 operator-> 阻断 | 同上 |

修复后**仅有 ffn.h 的 AST**仍在三个 Mutation 查询上返回明确的“没有已验证调用者”边界。
这是缺少上游代码的正常结果；没有根据函数名补造调用者。`test/project-pending.ts` 从独立的
pipeline 和 ffn 两次提取结果中，经 `callerLinksAt` 的 Clang USR、调用范围及具体 callee 验证
接入同一调用点，再验证以上成功路径。三个查询各只有一个 Mutation 候选，没有未报告的诊断。

三个 Origin 查询在仅有 ffn.h 时，修复前后均为 ffn.h:262 的 BankState 引用参数，附无调用者边界。
包含调用链时，旧结果直接给出 pipeline.h:924 的 LayerExecution seed；新结果仍为
`OriginFound(initialization)`，但明确附上：

> Fold seed identifies the initial storage; the current member value may be carried from a previous iteration.

这区分了**初始存储来源**和 **pending 当前值来源**。没有声称 seed 初始化了当前迭代所读到的 pending，
也没有把 BankState 参数声明误称为 pending 安装点。扩展会显示初始化结果上的该边界。

## 根因与修复

optional 投影和跨迭代处理都构成实际障碍，另有两个独立因素：

1. `std::optional<PendingPrefetch>` 含借用/共享资源。旧参数效果规则将 const 存在性判断也视为
   可能的共享效果；非 const operator-> 又被视为可能写接收者。Native 现在只对系统声明、
   canonical std::optional specialization 及准确签名标记 `optional-observe`、`optional-arrow`。
   箭头的结果是 contained inline storage 的地址，解引用保留 optional 路径前缀。
   默认空 optional 构造另有 `optional-empty`，不会臆造 contained object。
2. 旧回绕仅搜索 callback 源码最后的写入，也允许新建局部对象回绕，未检验返回累加器的路径。
   现在对每个可达 return 投影目标成员；借用路径还必须返回同一指针，且绑定未被改写。
   `&*p` / `*&x` 规范化消除了引用别名造成的假本地存储身份。
   返回值的指针复制证明与 pointee 内容复制证明分开处理。
3. lambda 在 Native 输出中既内嵌又可能作为单独函数输出。旧 call/write 索引混合两份语法树，
   即使 declaration ID 相同，分支 ancestor 也不是同一节点。索引现统一使用 canonical function wrapper，
   保留不同 template specialization 各自的声明身份。
4. 互斥 case 和 prepared variant 的事实此前没有传到回绕检查。只有 case 的主体明确退出函数时，
   才能排除另一个 case 的前序效果。跨迭代还必须证明 captured phase 是未被该 callback 修改的普通值。
   Native 提供 std::variant 构造 alternative 与按类型 get_if 的 canonical 类型身份，分析器检查 variant
   未被后续写入/借用失效，才排除 Decode 路径上不可能进入的 PreparedPrefill 分支。
   因而本例无需跳过 finish_host_copies 的效果边界；该分支是由已验证 alternative 排除的。

没有将所有 operator->、operator call、const 方法或标准库调用设为纯函数。
保存投影后的写入、未知调用、variant 来源失效、变化的 phase 及不同返回指针继续阻断导航。

## 存储生命周期与最终写入

成功 Mutation 的五个 frame：

1. pipeline.h:1007 调用 `start_decode_layer`，参数 1 的 BankState 引用映射为
   `layer_execution.session_state.*.bank_state.pending`。
2. pipeline.h:981 的立即调用 lambda 将引用捕获带回实际层 callback 的调用时刻。
3. pipeline.h:922 的 fold 回绕：seed 在 :924；callback 在 :1056 返回
   `LayerExecution{&session_state, …}`。两端投影到同一个 SessionState 指针及 pending 子字段。
4. 上一次迭代的 :981 立即调用 lambda，在不变 phase 的 Decode case 内执行。
5. pipeline.h:1018 调用 `finish_decode_layer`，参数 1 仍映射到上述 pending 子字段；
   最终定位到 **ffn.h:528 的 `bank_state = begin_decode_prefetch(…)`**。

该赋值在 `current.layer + 1 < …` 条件下替换调用者持有的整个 BankState，因而影响 pending 子字段。
没有把它当成当前迭代已发生的前序写入；返回指针、callback 及回绕关系都保留在 `TraceFrame.fold` 中。
其中同时记录 seed、return statement、source/target 路径和不变分支 observation。

RHS 的进一步证据如下（测试均按源码锚点/AST 身份断言，以下行号仅用于报告当前工作区）：

- experts.h:515 的 `begin_decode_prefetch` 参数 1 是**按值 BankState**，与 finish 的引用参数
  具有不同 declaration ID。调用实参确实来自该 finish 参数的 `std::move(bank_state)`；canonical 类型一致。
- :522–523 的无窗口、无 lookahead、空预测分支返回这个局部 BankState。
- 有 placements 的分支在 :589 对局部 `bank_state.pending` 安装 PendingPrefetch；:594 返回该 BankState。
- 两个 return summary 都映射到该局部按值参数。只有调用者 :528 的完整状态替换将返回状态安装到
  调用者存储。因此导航保留在 :528，没有将 :589 的局部写入直接冒充调用者的 Mutation。

首次迭代、没有预测/placements、最后一层以及 reservation 不匹配分支没有被抹掉。
每个回绕候选都附“需要较早迭代和分支 guards；首次迭代使用 seed”的诊断，扩展也显示这一限制。
Native 提取 std::array 的静态 extent；零/一次迭代不会生成上一轮 Mutation。
reservation 不匹配在消费/reset 之前抛异常；专项 C++ 运行验证断言其 pending 保持原值。

## 文件与回归覆盖

| 文件 | 目的 |
| --- | --- |
| native/ast-extractor.cpp | 精确 optional 操作、variant alternative/projection、IfStmt else 结构、std::array extent 元数据 |
| src/analysis.ts | contained 路径、别名规范化、canonical 索引、分支证明、返回累加器回绕、参数映射 frame、Origin 边界 |
| src/extension.ts | 显示 fold 返回证明的条件限制及初始化 Origin 边界 |
| test/fixtures/pending-fold.cpp、test/pending-fold.test.ts | 19 项 Native 专项测试，含真实 std::ranges::fold_left、预测/无预测/首次层/不匹配的 C++ 运行验证 |
| test/project-pending.ts | 三光标 × 两模式 × 有/无独立 AST 调用者共 12 项真实项目验证；断言写入、参数/返回映射及诊断 |
| test/project-state-audit.ts | 加入条件两个光标；保留仅头文件的真实调用者边界；消除用户空行修改导致的易碎行号断言 |
| test/analysis.test.ts、test/native.test.ts、test/callers-command.ts、test/state-sources.test.ts | 增补实际 return witness，移除新局部对象的假回绕，保留新增 fold frame，更新准确失败原因 |
| test/pending-performance.ts | 同源码/编译命令/光标的 Native、prepare 与 query 对比 |

专项负例断言不同返回指针、变化的 phase、未知后续调用、投影指针写入/逃逸、用户自定义箭头、
全新局部对象及单次迭代均不能生成伪造 Mutation。另有通过 retained variant 别名改变 alternative、
随后又写 BankState 的负例：初始化 tag 不能越过 retained alias 被复用来排除后续未知效果。正例断言准确文件/源码锚点、完整五 frame、
参数 index、pending 成员后缀、返回 identity、条件性诊断及首次迭代 seed。

原审计另外两处过时假回绕也被纠正：`read-progress` 位于单元素 fold 的当前 decrement，
没有上一轮；`attention-cache` 的新局部引用不能回绕至后续调用，而是在 vector::at 返回来源边界停止。
`slot-index` 在尝试回绕前会遇到返回复制字段保持性边界，未放宽 operator[] 的真正未知效果。

## 已执行验证

环境变量 `FSJ_PROJECT_COMPILE_COMMANDS` 均指向上述真实 compile_commands.json。

| 命令 | 最终结果 |
| --- | --- |
| `bun run build:native` | 成功，LLVM/Clang 23.1.4 |
| `bun check` | 77 个文件，无类型错误 |
| `bun run build` | 成功，extension.js 220.50 KB |
| `native/build/fold-state-jump-ast --source test/fixtures/native-fold.cpp -- -std=c++17 > /tmp/fold-state-jump-ast.json`；`bun test/native-integration.ts` | 直接及跨函数 Mutation 验证通过 |
| `bun test test/pending-fold.test.ts test/state-sources.test.ts` | 44/44 通过 |
| `bun test` | 531/531，通过 26 个测试文件 |
| `bun test/project-pending.ts /home/huawei/nano-infer` | 12 项通过，独立 Native AST 的真实调用者连接 |
| `bun test/project-integration.ts /home/huawei/nano-infer` | ffn 14、experts 3、pipeline 8，共 25 个位置通过 |
| `bun test/project-state-audit.ts /home/huawei/nano-infer` | 9 个文件、25 个位置、50 个查询通过 |
| `git diff --check` | 通过 |

完整测试最初在沙箱内遇到 Native worker 异步管道写入 EPERM，同步提取不受影响。
最小异步 probe 重现后，提升权限运行 Native 协议测试及完整套件，均通过；没有跳过这些测试。
旧审计初跑还因用户已有四行空行修改失败，现用实际代码锚点验证受影响位置。

## 性能与证明边界

基线使用修改前保存的分析器及当时现有的 Native 可执行文件；新旧分别执行 3 次提取，
每光标每模式 100 次查询，20 次预热。新旧源码和查询文件 SHA-256 完全相同，编译命令一致。
下面为中位数。旧 Mutation 提前失败，新 Mutation 执行完整回绕证明，两者工作量不同。

| 真实 pipeline.h | 修改前 | 修改后 |
| --- | ---: | ---: |
| AST bytes | 9,716,377 | 9,725,748（+0.096%） |
| Native 提取 | 14,294 ms | 14,211 ms |
| prepare | 45.67 ms | 40.97 ms |
| presence Mutation | 417.34 µs，失败 | 1,774.52 µs，找到条件性回绕候选 |
| contained Mutation | 6.47 µs，失败 | 1,657.57 µs，找到条件性回绕候选 |
| reset Mutation | 4.38 µs，失败 | 1,579.49 µs，找到条件性回绕候选 |
| 三个 Origin | 13.95–20.23 µs | 10.03–21.37 µs |

小型专项 fixture：AST 522,106 → 524,461 bytes；Native 提取 426.48 → 439.49 ms；
Mutation 完整追踪为 136.41–171.96 µs。另运行已有 analysis-performance 的相同输入基线/新版本对照。
样本少且包含进程/机器波动，不把 Native 提取时间差解释为确定的加速。

本次证明的是条件性状态来源和存储映射，不是完整 CFG 或运行时层号求值。
不能保证任意层都有 pending、任意分支会安装 prefetch、任意 fold 都至少执行两轮。
未知迭代次数只提供条件性候选；std::array 已知一次/空范围则明确没有前轮。
Origin 不宣称当前 pending 精确值的起源。任意返回变换、未知指针重绑定、未证明的标准库索引返回、
variant 来源失效、异步效果及无法建立的调用者仍是明确边界。
编辑器命令层由 mocked VS Code providers 覆盖，未启动真实 Extension Host/语言服务器，
因此没有声称观测到用户编辑器的实际 provider 返回集合。
