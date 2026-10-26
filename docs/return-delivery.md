# 返回完整性、循环状态与自主交付（2026-10-26）

本轮从真实远端 `origin/feat/multi-funcs` 的
`cf5814b06f0671bd115680292e4e80879369b964` 开始。初始分支正确、工作区和暂存区干净；fetch 后本地与远端一致，因此直接使用用户已提交的返回来源实现，没有重复应用旧补丁。nano-infer 为 `562758447a716d05dabb3173cebac489bf7daf80`，源码全程只读。

## 最终 UI 的证据流

问题是 editor adapter 的封装丢失证据：`analyzeQuery()` 同时返回候选、返回映射与诊断，但 `expand()` 和 `AnalysisRun` 原先只保留 `result`。现在 `AnalysisRun.query` 保留最终一次查询；每轮扩展重新分析，最终呈现不再使用第一次查询的元数据。

区分两种完整性：

- 每个 Mutation / Origin candidate 的 `returnMapping` 只描述该候选自己的路径。单候选转成 `MutationFound` / `OriginFound` 时继续携带它。
- `AnalysisQuery.returnMapping` 还覆盖没有生成候选的相关返回分支。组合时保留这些分支的原因，并加入真实 ReturnStmt 的文件与字节位置；不会把未知 sibling 反向标记为当前候选自身不完整。

`presentAnalysis()` 的所有导航入口使用同一个验证和提示路径：先重新验证文档及依赖、完成导航，再调用现有 `showWarningMessage()`。完整结果不增加警告；当前候选完整但其他分支未知时说明“showing a verified candidate / Other related return sources remain unverified”；候选自身停在边界时明确说明“this candidate is incomplete”，其自身原因与其他相关原因分别说明。返回分支虽能解析存储但 Mutation 的分支执行、别名或调用效果无法证明时，也保留该返回路径的不完整原因，不能因其他分支成功而静默丢弃。提示不等待用户关闭，不会阻塞命令。多候选选择任何一项均保留最终查询的其他未知分支。无 Mutation 候选时仍展示原失败原因，不生成导航结果。

Origin 在接收者、参数或捕获边界停止时，也把该候选自身标为 incomplete；不会把停在声明处等同于找到了初始化。调用者发现诊断现在按实际函数 AST 节点保存，只在最终查询确实使用该函数的 caller set 时加入；已绑定到具体 return callsite 的函数不附加其他调用者诊断。返回原因只沿实际查询投影传播，不把普通 Output Channel 诊断全部变成警告。

`test/return-presentation.ts` 通过真实 `activate()` 注册的两个命令、真实 Native AST、生产 caller discovery 与 mock VS Code API 验证 20 条命令路径：完整/部分/失败、Mutation/Origin、单候选、每个多候选选择及自身完整性不同的 Origin 候选。首次查询没有返回证据、最终调用者展开后产生证据的场景亦被断言。warning Promise 故意不完成，验证命令不会等待用户关提示。未启动 Extension Host 或实际 C++ 语言服务器。

## fold 的实际调查与安全进展

### 编译、定义和裁剪

真实编译数据库是 `nano-infer/build-cpu-tests/compile_commands.json`。CLI 精确条目以 `/usr/bin/c++`、`-std=gnu++17 -O3 -DNDEBUG` 编译，通过 `-isystem .../vcpkg_installed/x64-linux/include` 引入 range-v3。`resolveCompileCommand()` 去掉输出和编译动作参数，`makeExtractionCommand()` 交给链接 Clang 23 的 LibTooling extractor；没有把项目切换到另一套标准库或编译配置。

Native 的 `CalledFunctions` 能通过 `getDirectCallee()->getDefinition()` 找到实例化定义，USR 与声明关联存在。丢失发生在 `Extractor::HandleTranslationUnit()` 的 `!serializer.inUserCode(definition)` 过滤。新增 `callee.definition` 明确区分 `unavailable`、`user` 与 `system-excluded`，系统定义记录真实 ID 和位置；真实项目专项测试断言 fold callee 有稳定 symbol、系统定义确实存在、`functionsById` 确实没有该函数体。这不是根据名字猜测来源。

真实 `range/v3/algorithm/fold_left.hpp` 的 range 重载委托 iterator 重载；后者为空区间构造 `U(move(init))`，非空区间先调用 operation 初始化局部 accumulator，之后循环用 operation 的返回值赋给 accumulator，最后返回它。两个重载、模板实例化和系统头条件均在临时全定义 AST 中实际存在，因此没有证据支持“预处理掉了 fold 定义”或“没有模板实例化”的解释。

### 去掉过滤后的实际结果

在 `/tmp` 从基线 Native 源码构建临时 extractor，仅去掉系统头过滤。以同一 CLI 文件和编译命令提取全部可达系统定义，AST 为 **126,294,306 bytes**，含 **8,523** 个函数，超过生产默认 64 MiB 输出上限。range/iterator fold 实例化均进入 `functionsById`，返回摘要能沿两个重载推进。

实验还发现两个独立边界：

1. `U(move(init))` 的 `CXXFunctionalCastExpr / ConstructorConversion` 外壳原先挡住已有 copy/move 证明。现在只在 Clang 明确标记 ConstructorConversion 且穿过已有透明临时量外壳后为 CXXConstructExpr 时进入子表达式，仍由构造器的字段保真和生命周期规则决定是否可映射。自定义构造或复制不因此变成透明来源。
2. 全定义实验穿透构造后，曾把 CLI 的 `/clear` 分支写入当作另一个互斥分支中 `turn()` 的来源。根因是最后一个 return binding 退出后，调用者观察点也被丢弃。现在 `returnObservation` 沿实际调用点传递，返回和调用者两个层级都检查写入所属分支；互斥分支失败，同一分支的真实写入仍可导航。独立最小 AST 回归与最终全定义实验均验证了这一点。
3. 循环后返回的局部 accumulator 不能仅按存储声明或最后一个赋值位置解释。operation 返回值到下一轮参数、零/一次/多次执行以及条件返回的组合仍需要递推与时序证明；保留全部系统定义也不会自动获得这些证明。

`test/system-return-probe.ts` 对这份实际全定义 AST 再次运行最终分析器，断言两个原光标仍是 AnalysisFailure、诊断进入循环返回边界。原始摘要与输入/实现哈希见 [实验记录](measurements/return-system-definition-probe-2026-10-26.json)。这是单次诊断实验，不是性能样本。

### 通用循环返回模型

新增 `ReturnSource` 的 `LoopReturnState` 分支，保存真实声明、初始表达式和实际循环更新见证。整对象 replacement 保存 RHS 表达式；字段 mutation 保存真实目标路径。它们不是虚构的 accumulator 对象，也不把存储身份、返回值来源、Mutation 合并。

构建摘要只读取所属函数的写索引，排除嵌套 lambda、返回之后的更新，并在投影时过滤与所查字段无关的更新。未修改的字段继续沿普通存储路径分析。显式零次迭代 return 分支可独立保留已验证来源；重复迭代分支保持 incomplete，不能把循环赋值本身当成最终返回对象的 Mutation。新增真实 AST 回归覆盖这些情况及构造转换、receiver 边界和诊断作用域。

生产结果：generation-seed 仍进入 prefill 的实际 return，再停在系统 fold body 被裁剪的边界；chat-return 亦明确指出真实系统定义位置及裁剪原因。两处 Mutation 都是 AnalysisFailure；Origin 分别维持 CLI 的局部 batch_state / generation 初始化。没有硬编码目标案例、名称/参数编号推断或放宽原有失败断言。

本轮没有默认保留全部系统函数：126 MB AST 已超过当前边界，并且完整递推仍不成立。后续可在 Native 对真实函数体生成有见证的归纳摘要，或选择性保留必要定义；标准库模型必须验证空分支构造、operation 调用、下一轮状态以及退出条件，不能只列一个 fold 名字或返回第几个实参。此次新增模型为该证明保留了不同语义的输入，尚未声称完成最终 accumulator 导航。

## 验证与性能

实际命令、最终结果、版本指纹与原始样本记录在 [交付测量](measurements/return-delivery-2026-10-26.json)。性能在测试和真实审计结束后单独采样：相同 C++ 字节、编译数据库、参数和光标，基线为开始时保存的源码及 Native 二进制；before/after 顺序逐轮交换。独立测量 Native 提取、JSON 解析、索引准备、20 次摘要构建平均，以及预热后查询批次。

开发期间启动过随源码变化而失效的测量：一次被脚本的源码哈希检查拒绝，其他在进一步修正和确定批次长度时主动中止；这些样本不进入最终比较。最终比较不通过不同任务耗时相减归因。完整 Bun 使用正常进程环境运行 Native preamble 生命周期测试，未跳过这些测试。

最终结果和统计见下面的自动生成表格。完整验证包括 Native 构建/integration、返回来源与存储别名专项、完整 Bun、`bun check`、Extension 构建、nano-infer 原 23 光标/46 次审计、跨文件状态来源、原 project-integration、全系统定义实验和 `git diff --check`。

## 自主交付

`AGENTS.md` 已固定同步、实现、完整验证、审查、文档、提交、推送和重新读取远端 HEAD 的流程。仅在 `feat/multi-funcs` 提交并普通推送到同名 origin 分支；不操作 main、不强推、不丢弃归属不明的改动。若远端推进则先安全整合并重新验证。最终 Git SHA 与工作区状态在本轮交付报告中列出，避免在提交自身内容里制造自引用 SHA。

### 全系统定义实验的等价复现

只在 `/tmp` 构建诊断版本，生产选择器保持原策略：

```sh
mkdir -p /tmp/fsj-system-repro
git archive cf5814b06f0671bd115680292e4e80879369b964 native | tar -x -C /tmp/fsj-system-repro
python3 - <<'PY'
p = '/tmp/fsj-system-repro/native/ast-extractor.cpp'
s = open(p).read()
assert 'if (!definition || !serializer.inUserCode(definition)) return;' in s
open(p, 'w').write(s.replace(
    'if (!definition || !serializer.inUserCode(definition)) return;',
    'if (!definition) return;'))
PY
cmake -S /tmp/fsj-system-repro/native -B /tmp/fsj-system-repro/build \
  -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm \
  -DClang_DIR=/usr/lib/llvm-23/lib/cmake/clang
cmake --build /tmp/fsj-system-repro/build -j 4
bun -e '
import { Effect } from "effect";
import { writeFile } from "node:fs/promises";
import { resolveCompileCommand, makeExtractionCommand, runClangAst } from "./src/services";
const root = "/home/huawei/nano-infer";
const command = await Effect.runPromise(resolveCompileCommand(root + "/minicpm-v-4_7/cli.cpp", [root], "clang++", root + "/build-cpu-tests/compile_commands.json"));
const ast = await Effect.runPromise(runClangAst(makeExtractionCommand(command, "/tmp/fsj-system-repro/build/fold-state-jump-ast"), 268435456, AbortSignal.timeout(180000)));
await writeFile("/tmp/fsj-system-repro/cli.json", ast);
'
bun test/system-return-probe.ts /tmp/fsj-system-repro/cli.json /home/huawei/nano-infer
```

实际本轮先保存基线源码再用 `cp` 构建临时版本，路径为 `/tmp/fsj-fold-definition-probe`，命令与输入指纹保存在测量记录；上述 `git archive` 是从相同基线重建的方式。允许 256 MiB 仅用于诊断，未修改生产的输出上限。

<!-- final-measurements -->

## 最终实测表

完整 Bun：**512 pass / 0 fail，25 文件**；返回来源专项 **46 pass**，存储别名专项 **95 pass**；命令呈现覆盖 **20** 条路径。Native 构建/integration、`bun check`（74 文件）、Extension 构建、所有上述 nano-infer 审计均通过。

下表为交错 3 轮的中位数。独立摘要每样本重建 20 次平均；未把它与完整 prepare 相减。

| 输入 | Native ms，前 → 后 | prepare ms，前 → 后 | 摘要 ms，前 → 后 | AST bytes，前 → 后 |
|---|---:|---:|---:|---:|
| micro | 248.155 → 207.155 | 5.513 → 7.797 | 0.129 → 0.101 | 858,747 → 872,256 |
| pipeline.h | 13731.299 → 13357.590 | 43.608 → 48.443 | 2.017 → 2.016 | 9,552,760 → 9,716,377 |
| cli.cpp | 17213.723 → 17463.259 | 110.757 → 108.514 | 7.128 → 7.012 | 26,480,884 → 27,019,772 |

CLI 相同归档 AST、7 轮 × 1000 次查询的中位数：

| 光标 | Origin µs，前 → 后 | Mutation µs，前 → 后 |
|---|---:|---:|
| generation-wrap | 3.024 → 3.111 | 5.156 → 6.829 |
| generation-done | 2.341 → 2.087 | 33.498 → 28.323 |
| generation-seed | 1.574 → 1.757 | 50.113 → 51.072 |
| chat-return | 1.870 → 1.743 | 96.138 → 97.802 |

pipeline layer-seed Mutation（每轮每版本 20 次）：264332.939 → 255284.885 µs。所有原始样本、范围和指纹均在测量 JSON；小幅变化包含 JIT、GC 和调度波动，不按单次差值归因。新增 Native 定义位置元数据的 AST 体积成本是直接可见的，未为降低它而削弱证明。
