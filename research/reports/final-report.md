# 最终报告：从零研究通用 C++ 状态来源/历史追踪

## 0. 摘要

本研究在独立 worktree `fold-state-jump-research` 中完成：

1. 用 Clang 23 AST/CFG 对 nano-infer 6 个 TU 做机械枚举与人工语义审计；
2. 建立 48 条独立 Oracle（JSONL）和 84 个 fold 源的完整分母；
3. 实际运行 Clang/LLVM/Clang Static Analyzer，并尝试 PhASAR/SVF；记录版本/许可/构建结论；
4. 从零实现独立 CLI 原型 `state-trace`（Clang 提取器 + Python 查询引擎），不依赖旧插件；
5. 用通用 fixtures 和 nano-infer 双向验证，得到诚实的正确性/性能/限制结果；第二轮又新增了真实 Clang FlowSensitive 实验、首轮 fold guard 纠错和接入 VS Code 命令的新 TypeScript 引擎（详见第 11 节）。

核心结论：**旧插件需要持续补丁，不是某个 `bank_state` 分支写错，而是数据模型把“值、存储、资源、fold 状态”压缩成了过窄的表达式路径，并在控制流/跨函数/异步边界上逐点补丁。** 正确路径是源码语义图 + 显式状态版本/边界 + 通用 fold 契约；Clang AST 是当前最合适的主入口，LLVM MemorySSA 只适合作为别名补充。

## 1. nano-infer 中到底有哪些应该追踪的状态？

完整统计见 `research/inventory/source-inventory.json`、`research/reports/nano-infer-state-map.md`。

```text
6 TU / 31 project files
680 functions（含 295 lambdas）
79 template instances
181 records
84 fold source sites / 86 semantic instances
87,372 events
7,976 write events
9,114 transfer events
47 state-type closure records
```

状态链（详细字段/行号见状态地图）：

- MiniCPM：`SessionState`（position/rope/caches/bank_state/graph_cache）→ `BatchState` → `LayerExecution` fold → `BankState`（shared/layer banks/slots/frequencies/counters/pending）→ 下一批/下一会话。
- 专家：`make_bank` → `apply_prewarm` → `plan_shared_decode`/`plan_cache_decode`/`plan_prefill` → `begin_decode_prefetch` → `PendingPrefetch` 消费/reset → `record_*` → 返回。
- 异步：`RecordReadState`/`CacheReadTicket`/`SharedReadTicket`/`CopyTask`/`HostCopyBatch`；描述值、凭据、共享缓冲区、资源内容、完成信号分开。
- CLI：`Generation`（batch_state/text/done/decode_tokens/decode_ns）与 `prefill` 的 `BatchState` fold。
- DeepSeek：`AttentionState`（position/cache/owner）、`AttentionCaches`/`LayerCaches`、`BatchResult`、`Generation` variant、`PrefillState` variant、`FfnRuntime`/`FfnServer::State`、`execute_ffn` 的 groups/output fold。
- 纯值/图：mask、字符串、序列化、`ggml_tensor*` 累加；没有 C++ 可变对象历史，明确标 pure/graph。

## 2. 哪些跳转理论上应该成功？

Oracle（`research/oracle/nano-infer-oracle.jsonl`）把查询分成 Origin / Reaching Mutation / History / Provenance，并标记 Exact/Multiple/Conditional/Boundary/Unsupported/NoPriorMutation。

重点链路：

### `SessionState.bank_state → LayerExecution.bank_state → BatchState.session_state → Generation`

- 点击 seed 的 `session_state.bank_state`（pipeline.h:869:34）：
  来源是 `execute` 参数（814），向上有两个直接入口 `run_embeddings`（1322）/`run_batch`（1332），再向上是 `start_session`（1280）、`clear_session`（1299）、上一批 `BatchState` 返回（1209）以及 CLI prefill/generation fold。**Multiple + Boundary**，不存在唯一来源。
- 点击 `LayerExecution{...}` 第二项（869:24）：
  Clang 语义字段顺序是 `caches`(857)、`bank_state`(859)、`graph_cache`(861)、`hidden`(863)；第二项 → `bank_state`。**Exact aggregate-field**，不得按名字匹配。
- 点击 lambda `layer_execution.bank_state`（872:30）：
  第一轮来自 seed（869:24），后续轮来自 `return layer_execution`（1188）回边；**Conditional**。
- 点击 `auto &bank_state = layer_execution.bank_state`（872:17）：
  这是引用别名绑定；origin 是 872:30，绑定本身不是写入。**Exact alias**。
- 点击 `++bank_state.counters.graph_builds/graph_reuses`（902/884）：
  同轮内是真实字段写；history 必须给出第一轮 seed、上一轮同字段写、以及 `bank_state = begin_decode_prefetch(...)` 整体替换；受 `layer==0`、cache hit/miss 条件影响。**Conditional/Multiple**。
- 点击 fold 结果 `layer_execution.bank_state`（1193）：
  seed + 最后一个 lambda return + 各轮写；**Conditional**，不能把“尚未执行的当前轮写”当作历史。
- 点击 `std::move(layer_execution.bank_state)`（1211）：
  经 `BatchState` 第 0 字段 `session_state`、`SessionState` 第 3 字段 `bank_state` 进入返回；**Exact field mapping**。
- 跨批：
  `BatchState.session_state` 是下一批 `execute` 的实参，下一次 query 的 origin 是上一批 return；**Multiple/Conditional**，静态上不能确定是哪一批，除非引入调用上下文/运行次数条件。

### 专家/异步

- `plan_cache_decode` 的 `resident_slot(bank_state.slots, ...)`（experts.h:475）读的是**原快照**，不是正在演进的 `plan.slots`；这是负例，必须区分同名字段。
- `PendingPrefetch`：`pending` 创建（601）→ 下一层 `std::move` 出来（1090）→ `reset`（1092）；查询 pending 时必须区分 optional 值、锁槽、ticket、实际读取完成。
- `Retaining`（ffn.h:168-202）fold 保存指针；`retaining.slots->keys[target]` 写的是调用者 `bank_state.slots`，不是 accumulator 的副本。
- `clear_session` 保留 shared/layer banks 与 graph_cache，重置 slots/frequencies/counters/pending；`ggml_backend_buffer_clear` 是资源内容清除，不是对象重建。**Multiple + Boundary**。

### DeepSeek

- `state.cache`：`run_batch` lambda 捕获外部 `state`，不是 fold acc；origin 到 `AttentionState` 参数/`start_session` 的 `make_attention_caches`。**Multiple**。
- `state.position`：fresh 0 / 每批 `advance(tokens.size())` / 上一次返回；**Conditional**。
- `hidden` fold：seed `embedded`（execute_embedding host 返回），lambda 返回 `ffn_output`（RPC 边界）；**Exact/Boundary**。
- `Generation` variant：`std::get<BatchResult>(state)` 是 alternative 视图；`GenerationFinished{}` 没有数据字段，不能伪造 prior mutation；`index+1==predict`/EOG 会丢弃旧 BatchResult。**Conditional/NoPriorMutation**。
- `FfnServer::run` 的 `State{rpc, ffn}` fold：`handle_request(state.ffn, ...)` 通过非 const 引用改 FFN runtime；RPC 事件推进；**Conditional + call-effect**。

## 3. 原有 fold-state-jump 为什么持续需要补丁？

不是单个 Bug，而是四个结构性问题：

1. **数据模型过窄**：`ExpressionPath`/`rootId+members` 能表达“同名字段路径”，但不能同时表达值来源、存储对象、资源所有权、资源内容、引用/指针指向、动态元素、variant alternative、fold 回边。于是每遇到一种新关系（move、optional、pending、tensor buffer、template instance）就加一个特例。
2. **控制流/到达定义不足**：旧 README 明确说 mutation 是“source-order candidates, not control-flow or runtime reachability proofs”，seed 不 wrap、fold 参数才 wrap；这解释了为什么 `bank_state` 的 seed 与 lambda 内部修改经常需要手工区分。它没有真正的 CFG 到达定义/固定点。
3. **跨函数/调用者完整性依赖外部 Provider**：旧插件用 VS Code call hierarchy/reference provider 补 caller，并用 USR 验证；这很成熟，但“caller 集合完整”仍依赖语言服务索引；跨文件/宏/模板实例会留下 boundary。它不是全程序求解器。
4. **fold 被当作特殊语法而非状态递推**：seed/回边/零迭代/条件返回/多模板实例分别需要补丁；没有统一 `S0=seed; S(i+1)=F(Si,ei)` 的图模型。异步/资源语义只能继续加边界。

旧插件仍有优势：真实 Extension Host/QuickPick、原生 AST 缓存/PCH、跨文件 caller 验证、Provider 集成、性能工程。新原型暂不具备这些，不能直接整体重写替代。

## 4. 哪些成熟技术可以直接复用？

实际运行：

- **Clang LibTooling AST/CFG**：直接复用字段顺序、模板实例、USR、CFG、源码范围；这是主路线。
- **Clang Static Analyzer**：`--analyze`/`DumpCFG` 成功；可复用 CFG/ProgramState/MemRegion 概念，但没有 fold 契约/导航输出。
- **LLVM MemorySSA**：O0/O2 输出成功；可复用 def-use/phi/别名，但函数内、字段名/源码 token 弱、IR 构建成本高。
- **PhASAR**：clone/submodules/configure 成功，LLVM 23 build 失败（`Compressor.h` DenseMapInfo API 变化）；MIT。
- **SVF**：clone/configure（zstd workaround）成功，LLVM 23 build 失败（`UnifyFunctionExitNodes.h` 缺失）；AGPLv3。
- **CodeQL**：未安装/未执行；许可与闭源分析范围需核对，不能假设支持。

详见 `research/frameworks/*` 和 `research/experiments/frameworks/*`。

## 5. 最合理的新架构

选择 **路线 A：Clang AST + CFG + 需求驱动 provenance**，LLVM 仅作未来别名补充：

```text
Clang AST/CFG → inventory events → Program Graph
  → backward reaching definitions
  → parameter/return/aggregate/fold summaries
  → Origin/Mutation/History/Provenance
  → explicit Boundary
```

没有选择：

- 纯 LLVM IR：源码字段导航/模板/部署成本不满足；
- 纯 PhASAR/SVF：LLVM 23 不兼容，且仍需自建 fold/资源/源码映射；
- CodeQL：许可/DB 成本；
- 旧插件增量补丁：数据模型过窄，继续加特例会重复失败。

形式化模型见 `research/reports/selected-architecture.md`。

## 6. 独立原型实际完成了什么？

可运行命令：

```bash
# 1. 构建提取器
cmake -S prototype/native -B prototype/native/build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm \
  -DClang_DIR=/usr/lib/llvm-23/lib/cmake/clang
cmake --build prototype/native/build -j 8

# 2. 提取一个 TU
prototype/native/build/ast-inventory \
  -p /home/huawei/nano-infer \
  -root /home/huawei/nano-infer \
  minicpm-v-4_7/cli.cpp > inventory.ndjson

# 3. 查询
python3 prototype/src/state_trace.py \
  --file /home/huawei/nano-infer/minicpm-v-4_7/pipeline.h \
  --line 872 --column 30 --mode origin \
  --tu minicpm-v-4_7_cli --format json
```

支持 `origin/mutation/history/provenance`，输出 query identity、targets、provenance edges、boundaries、limitations。

实际结果：

- 独立 fixtures 13 个测试全部通过（`python3 -m unittest prototype/tests/test_fixtures.py`）；
- nano-infer Oracle 48 条：12 correct-conditional、5 correct-boundary、2 correct-multiple、3 targets-found-kind-mismatch、26 mismatch（详见 `correctness-results.md`，Python 研究原型）；
- 关键 seed/lambda/history/alias 查询能给出正确的 seed/回边/别名/边界；
- BatchState 聚合返回、start_session/clear_session 最终来源、部分跨函数/variant 仍未达到 Oracle。

正确性数字是诚实的，不是“539 tests passed”式宣称。

## 7. 还有哪些无法分析的地方？

分四类（详见 `limitations.md`）：

1. **C++ 本质不可唯一**：动态下标、指针 points-to、虚调用/回调、异步完成、移动后源对象、异常/UB、标准库内部。
2. **框架限制**：Clang FlowSensitive 无 fold 契约/跨函数摘要；LLVM MemorySSA 函数内/源码字段映射弱；PhASAR/SVF LLVM 23 不兼容；CodeQL 未执行。
3. **原型未实现**：跨 TU caller 索引、完整聚合返回、variant/optional 状态机、资源内容版本、模板实例选择、动态元素候选集、图缓存/增量、UI。
4. **环境阻塞**：DeepSeek generated header 版本、PhASAR/SVF 构建、CodeQL 许可/安装；均已记录命令/日志/替代策略。

## 8. 下一步应该如何处理原项目？

基于实验，不建议“未验证就整体重写”或“直接合并”。

| 方案 | 成本 | 可行性 | 建议 |
|---|---|---|---|
| 新引擎接入原 VS Code 前端 | 中 | 高 | **首选**：保留旧插件成熟的前端/缓存/caller Provider，把 `state-trace` 作为独立 native 后端，先替换 Origin/Mutation 查询结果，保留旧 UI/QuickPick。 |
| 保留旧插件部分成熟模块 | 低-中 | 高 | 保留 AST 缓存/PCH/编译参数解析/Provider caller 验证/扩展生命周期；不要保留 `ExpressionPath` 作为唯一状态模型。 |
| 整体重写 | 高 | 中 | 不建议在当前证据下直接做；会丢失已成熟的扩展/缓存/性能工作，且新原型 Oracle 通过率仍不足。 |
| 混合分析架构 | 高 | 中-高 | 中期：Clang 主图 + 可选 LLVM alias/MemorySSA 补充；先只对指针/动态容器失败类别启用。 |

具体落地顺序：

1. 把 Program Graph 持久化/增量失效接入旧插件的缓存层；
2. 保留旧插件的 caller 发现，但把结果转成新图的 `call` 边，而不是旧 `ExpressionPath`；
3. 按 Oracle 失败类别补：聚合返回 → variant/optional → 资源边界 → 跨 TU 摘要；
4. 先在只读/显式查询模式上线，保留旧命令回退；
5. 再做 UI 集成/性能优化；不要先做 UI 而牺牲审计/Oracle。

## 9. 交付物索引

```text
research/inventory/{source-inventory,fold-inventory,state-types,state-transfers,query-sites}.json
research/inventory/fold-table.md
research/oracle/{nano-infer-oracle.jsonl,oracle-schema.json,oracle-coverage.md,independent-fixtures.md}
research/frameworks/{framework-comparison,clang-experiment,llvm-experiment,alternative-frameworks,licenses-and-versions}.md
research/reports/{nano-infer-state-map,architectural-options,selected-architecture,correctness-results,performance-results,limitations,final-report}.md
research/STATUS.md research/DECISIONS.md research/EXPERIMENTS.md
prototype/native/ast-inventory.cpp
prototype/src/state_trace.py
prototype/tests/test_fixtures.py
prototype/fixtures/*.cpp
tools/{aggregate_inventory,author_oracle,run_oracle,coverage}.py
```

## 10. 最终判断

- 已知道 nano-infer 中同类状态追踪问题的**分母**：84 个 fold 源、86 个实例、7,976 个写事件、47 个状态记录；不是“一个 bank_state”。
- 已对主要查询位置给出独立、语义正确的 Oracle；不是旧插件结果的自证。
- 已明确哪些问题有成熟技术可用（Clang 字段/模板/CFG；LLVM 别名事实），哪些没有现成答案（fold 契约、资源内容、异步完成、源码字段映射）。
- 已有不依赖 nano-infer 特例的通用实现基础；新表达式可归入“存储身份/值转移/控制流/摘要/边界”类别，而不是按业务对象继续打补丁。
- 仍未完成完整覆盖；原型通过率有限，UI/跨 TU/性能工程未完成。这是研究结论的一部分，不是被隐藏的失败。

---

# 11. 第二轮续作：从研究原型到新引擎

上一版报告不是终点。第二轮在 `research/state-trace` 上完成了以下增量，详细记录见 `research/reports/implementation-status.md`。

## 11.1 Oracle 纠错

独立复核发现 `Pipeline::execute` 的 `graph_builds`/`graph_reuses` 位于 `layer == 0` 分支。该分支只可能由 fold 首元素进入，因此**同一次 fold 的上一轮写不可能成为 history**。Oracle 已改为 seed + 上一批返回/会话初始化，并把 `registry` 的后续整体替换标为“同一迭代后续、不是 prior”；`graph_cache.tick` 同样纠正。

## 11.2 真实框架实验补充

新增 `prototype/native/flow-sensitive-probe.cpp`：实际继承 `clang::dataflow::DataflowAnalysis`，使用 `WatchedLiteralsSolver`/`DataflowAnalysisContext`/`Environment`/`runDataflowAnalysis`。实验证明：

- 覆盖写杀死旧赋值（只返回最近写）；
- if/else 合流得到两个 may 定义；
- 循环字段得到固定点；
- 引用/字段 location 需要额外 canonicalization；聚合字段初始化需要自行建模。

因此新架构采用“Clang AST/CFG + 显式 ProgramGraph/worklist + 自建摘要”，而不是把 FlowSensitive 当成完整状态追踪器。LLVM MemorySSA/PhASAR/SVF 结论见框架报告。

## 11.3 新 TypeScript 引擎

新增 `src/state-trace/`：

- `engine.ts`：存储路径/别名、CFG worklist、fold seed/backedge、首轮 guard、参数/返回摘要、Origin/Mutation/History/Provenance；
- `native.ts`：调用独立 native `state-inventory`；
- `vscode.ts`：查询结果到现有编辑器导航/QuickPick；
- `cli.ts`：独立 CLI。

旧 `src/analysis.ts` 不再作为默认路径；`analysisEngine=legacy` 只用于显式回归对照。现有两条命令已接入新引擎，`test/state-trace-command.ts` 实际通过 activate/native/命令/mock VS Code 验证。

## 11.4 验证结果

```text
bun check                              no type errors (87 files)
bun run build                          extension.js built
bun test                               540 pass / 0 fail
```

独立语义测试 11 个通过（fold seed/backedge、首轮 guard、覆盖写、分支合流、同名对象、别名、动态下标 boundary、未来写、重命名/成员重排）。

TypeScript 引擎 Oracle：

```text
48 entries
correct-conditional        18
correct-boundary            8
correct-multiple            9
correct-no-prior            1
unsupported-observed        1
mismatch                   11
required-target recall     56/119
```

这不是完成。剩余失败按 `FAILURE-QUEUE.md` 归入聚合返回、资源/异步、ranges pipeline、跨函数摘要等通用类别；没有新增业务字段/行号特例。

## 11.5 当前结论

已完成“审计 → Oracle 复核 → 框架实验 → 新语义模型 → 新引擎 → 插件命令接线 → 独立测试”的纵向闭环，但**尚未达到最终完成标准**：新引擎仍有 11 条 Oracle mismatch，且未实现完整跨 TU/资源/variant 摘要。应继续按通用语义类别修复，不应以本报告作为停机理由。
