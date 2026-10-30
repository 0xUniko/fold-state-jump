# nano-infer 状态地图与真实状态链审计

> 审计对象：`/home/huawei/nano-infer`，HEAD `2e523d9e1d6c198988cab4193971093907f767f5`，工作区有 13 个已修改文件（2026-10-30 当前状态）。本报告基于当前工作区，不是远端干净提交。nano-infer 全程只读；AST/IR/JSON 产物写入独立 research worktree。

## 1. 扫描口径与分母

Clang 23 LibTooling 工具 `prototype/native/ast-inventory.cpp` 解析了 6 个 TU（另有一次 `local_test` 含测试）：

| TU | 作用 |
|---|---|
| `minicpm-v-4_7/cli.cpp` | MiniCPM 全部语言/视觉/专家/图路径 |
| `deepseek-v4-flash/attention_node.cpp` | DeepSeek attention + generation 状态机 |
| `deepseek-v4-flash/ffn_node.cpp` | DeepSeek FFN service/runtime |
| `deepseek-v4-flash/main.cpp` | 入口 |
| `shared/model_loader.cpp` | 共享模型装载 |
| `minicpm-v-4_7/tests/local_test.cpp` | 测试实例（单独标记 test-only） |

机械统计（`research/inventory/source-inventory.json`）：

```text
files                         31
functions                    680
template instances            79
lambda functions             295
records                      181
fold source sites             84
semantic fold instances       86
events                    87,372
write events               7,976
transfer events            9,114
state-type closure            47
query sites (mechanical)   5,783
```

`fold-inventory.json` 对每个 fold 保存：源码位置、seed 文本/类型/偏移、lambda USR、目标存储、每个模板/泛型实例的独立记录。`fold-table.md` 是 84 个源的完整表。**没有用旧插件结果生成这些数据。**

## 2. 哪些对象真正需要追踪

### 2.1 MiniCPM 会话状态

`SessionState`（`pipeline.h:394-409`）：

| 字段 | 行 | 初始化 | 写入/推进 | 读取/传递 |
|---|---:|---|---|---|
| `position` | 397 | `start_session()` 返回 0；`clear_session()` 重置 0 | `execute()` 返回 `session_state.position + nt` (1209) | 824/832/840/850；`prefill_text` 的批大小；CLI 的 `prompt_begin_position` |
| `rope_position` | 400 | 0 | 返回 `next_rope`（1209） | `run_batch` 生成 positions (1338)；CLI 图像跨度 (294-295) |
| `caches` | 403 | `start_session` 的逐层 `make_cache` (1247-1252) | 执行图时由 attention 写缓存内容；`clear_session` 调 `ggml_backend_buffer_clear` (1292/1294) | `execute` seed move (868)；逐层 `build_routing_graph` 读 cache |
| `bank_state` | 405 | `make_bank` + `apply_prewarm` (1275-1280) | 逐层 plan/prefetch/retain/record；`clear_session` 重建元数据 (1299-1314) | seed move (869)；`build_language_graphs` 读 bank；返回 (1211) |
| `graph_cache` | 408 | `start_session` 返回 `{}` | `execute` 首层 LRU tick/命中/构建/淘汰 (879-900)；`clear_session` 原样 move (1315) | 1191/1196 取 head graph；跨批保留 |

`SessionState` 的**存储身份**主要来自 `SessionState` 参数/局部对象；`std::move(session_state.caches)` 等是值/资源转移，不是“源对象与目标字段同一个存储对象”。

### 2.2 `LayerExecution` fold（`pipeline.h:855-1190`）

```cpp
struct LayerExecution {
  std::vector<LayerCache> caches;   // 857
  BankState bank_state;             // 859
  GraphCache graph_cache;           // 861
  ggml_tensor *hidden;              // 863
};
auto layer_execution = ranges::fold_left(
  iota(0, n_layer),
  LayerExecution{move(session_state.caches), move(session_state.bank_state),
                 move(session_state.graph_cache), nullptr},   // seed 868-870
  [&](LayerExecution layer_execution, uint32_t layer) { ... return layer_execution; });
```

Clang 事实：

- seed 是 4 项 `InitListExpr`/`CXXUnresolvedConstructExpr`，按 `FieldDecl` 语义顺序映射到 4 个成员；第二项明确映射到 `LayerExecution.bank_state`（859），不是按名字匹配。
- lambda 参数 `layer_execution` 是 by-value 累积器；`auto &bank_state = layer_execution.bank_state`（872）是引用别名，绑定不写入目标。
- `return layer_execution`（1188）是 fold 回边；第一轮来自 seed，后续轮来自上一轮返回值。
- 整个 `bank_state = begin_decode_prefetch(...)`（1081/1133/1173）替换的是 lambda 局部累积器的 `bank_state` 成员，随后才通过 return 成为下一轮输入；它不是对 `session_state.bank_state` 的原地写。
- 最终 `layer_execution.bank_state` 经 `return {{...}}`（1209-1213）进入 `BatchState.session_state`；BatchState 第 0 成员是 session_state，SessionState 第 3 成员是 bank_state。

上述关系分别对应 Oracle 的 `minicpm.execute.seed.*`、`lambda.*`、`fold-result.*`、`return.batchstate-field-mapping`。

### 2.3 `Generation`（`cli.cpp:483-551`）

| 字段 | 初始 | 迭代更新 | 终止/传递 |
|---|---|---|---|
| `batch_state` | 本轮 prefill 结果 (510-520) | 每步 `pipeline.run_batch(move(batch_state.session_state), {token}, Decode)` (543-545) | 返回外层会话；`chat_state.session_state = ...` |
| `text` | 空 | `text += piece` (539) | 助手历史 |
| `done` | false | EOG 时 true (532) | 后续迭代原样返回 |
| `decode_tokens` | 0 | `++decode_tokens` (548) | 输出统计 |
| `decode_ns` | 0 | `decode_ns += elapsed_ns(...)` (547) | 输出统计 |

`done`/上下文耗尽是**提前保留旧状态**的路径；这类 branch 必须在 mutation history 中显式保留，不能只取源码最近赋值。

### 2.4 `GraphCache` / `LanguageGraphs`

- `graph_cache.tick` 在首层命中/构建时各 `++` 一次（882/898），是跨层/跨批递推计数。
- `graph_cache.graphs` 是 `std::map<GraphKey, unique_ptr<LanguageGraphs>>`；`emplace`/`erase` 修改容器元素，元素指针身份可能失效；`at(key)` 返回引用。
- `LanguageGraphs.age` 是 map 内部对象的字段，`++` 修改的是被 map 持有的对象，不是 map 的键/值拷贝。
- `clear_session` 保留 `graph_cache`，因此图缓存与注意力/专家元数据的生命周期不同。

### 2.5 专家 `BankState` 生命周期

`BankState`（`experts.h:269-287`）：

| 字段 | 语义 | 关键写入 |
|---|---|---|
| `shared_bank` | 共享专家工作区，地址固定 | `allocate_bank`；plan/prefill 拷贝或需求读取覆盖 records |
| `layer_banks` | 各层 cache bank | `make_bank` 分配；plan/prefetch/prewarm 覆盖 |
| `slots` | `SlotState` 标签/LRU/命中统计 | 各 plan fold 写 keys/ages/tick/hits/misses；`clear_session` 重置 |
| `frequencies` | 逐层逐专家路由频次 | `record_frequency` 通过借用指针 `++` |
| `counters` | `LesCounters` | 每层 record/prefetch/graph 计数 |
| `pending` | 下一层在飞预取 | `begin_decode_prefetch` 构造；下一层 `move` 出来并 `reset` |

状态链：

```text
make_bank
  → apply_prewarm(BankState, fold over layers: layer_banks, slots, counters)
  → start_session return
  → LayerExecution.bank_state (fold)
      → plan_shared_decode / plan_cache_decode / plan_prefill
           局部 Planning{bank_state.slots,...} fold
           → 返回 plan.slots / plan.read / plan.slot_ids
      → start_*_read / finish_*_read（异步凭据）
      → bank_state.slots = move(plan.slots)
      → record_*（通过 BankState & 修改 counters/frequencies）
      → begin_decode_prefetch(BankState by value, returns BankState)
           → pending = PendingPrefetch{...}
      → 下一层 pending 消费 / reset
  → return BatchState.session_state.bank_state
  → 下一批 execute 的 seed
```

关键区分：

1. **值传播**：`plan.slots` 从 `bank_state.slots` 复制（`Planning{bank_state.slots,...}`），在 lambda 内演进；归约结束后通过 `std::move(plan.slots)` 安装回 `bank_state.slots`。这是“复制 → 迭代 → 移动安装”，不是同一存储对象在 fold 中原地更新。
2. **对象存储身份**：`bank_state` 整体赋值（1081 等）替换值；调用参数 `BankState` by value 后又返回，调用者的存储对象没有被被调者直接持有。
3. **资源所有权**：`ExpertBank` 持有 ggml context/buffer；`slots.keys` 标签可以先于 I/O 完成发布；`PendingPrefetch.read_ticket` 保活读取。
4. **资源内容**：`copy_record` 通过 memcpy/`ggml_backend_tensor_set` 修改 bank 的 records 字节；`read_record` 通过 pread/mmap 修改 staging/records 内容。这些不是 C++ 字段赋值，不能仅凭函数调用断言完成。
5. **借用/别名**：`Retaining` fold（`ffn.h:168-202`）保存 `SlotState *` 和 `uint64_t *`，lambda 内写 `retaining.slots->keys[target]`、`++*prewarm_from_prefill`，实际写的是调用者的 `bank_state`。这类“fold 状态里放指针”的路径必须解析 pointee，不能只看 accumulator 字段。

`PendingPrefetch`（`experts.h:234-247`）字段：`layer/keys/slots/issued/read_ticket`。创建在 601；消费在 `pipeline.h:1087-1092`；`pending.reset()` 表示 optional 的状态转换，不是对底层 bank 内容的写入。

### 2.6 异步 I/O 状态

`expert_io.h` 有 13 个 fold 源（763/788/811/832 等）。典型：

```cpp
const auto read_state = ranges::fold_left(
    read.missing | drop(worker) | stride(workers),
    RecordReadState{read.records, {}},
    [&](RecordReadState s, const auto &placement) {
      s.io = sum_io(s.io, read_record(store, key, s.records + slot*bytes));
      return s;
    });
record_read_success(*task.batch, read_state.io);
```

必须区分：

- `read.missing`：读取请求的普通值/映射；
- `RecordReadState.records`：借用/目标缓冲区指针；
- `read_state.io`：已完成读取的计数（实际完成量在 `read_record` 返回值中）；
- `start_*_read` 返回 `CacheReadTicket`：读取凭据/在飞任务；
- `finish_*_read`：消费凭据、等待、安装结果；
- `record_read_success/failure`：完成信号和错误状态；
- `copy_record` / `ggml_backend_tensor_set`：资源内容写入，外部效果。

Oracle 将这些标为 `Boundary`，而不是把“提交读取”当作“数据已写入”。

### 2.7 DeepSeek 状态

`AttentionState`（`attention_pipeline.h:1537-1556`）：

- `position`：`InferenceProgress`，`start_session` 为 0，`run_batch` 返回 `advance(tokens.size())`；
- `cache`：`unique_ptr<AttentionCaches>`，`make_attention_caches` 逐层 fold 构造 `LayerCaches`；`run_batch` 首行校验 `state.owner == this && state.cache`；
- `owner`：ownership 关系，不是可跟随的值状态；
- `BatchResult{state, logits}`；
- `Generation = variant<BatchResult, GenerationFinished>`；
- `PrefillState = variant<AttentionState, BatchResult>`。

`run_batch` 的 hidden fold（1713-1726）：

```text
seed = embedded (execute_embedding 的 host 返回值)
acc_i = vector<float> input
每个 il:
  cache = state.cache->layers.at(il)   // 捕获的外部只读状态，不在 acc 中
  attention_output = execute_attention(cache, il, positions, input)  // 写该层 KV/递归资源
  ffn_output = ffn.forward(...)         // 远程 RPC
  return ffn_output
```

`state.cache` 是 lambda 捕获的**外部只读依赖**，不是 fold 累加器；这是正确的 fold 边界设计。`ffn.forward` 的返回值是 host 值/网络结果，属于 RPC 边界。

`attention_node.cpp` 有两个状态机 fold：

- prefill fold（42）：`PrefillState{AttentionState}` → chunk 的 `run_batch` → `BatchResult`；文本/图像输入由 `chunk` 决定。
- generation fold（57）：`Generation{BatchResult}` → 采样/终止/`run_batch`；`holds_alternative<GenerationFinished>` 原样返回；EOG 或 `index+1==predict` 返回空 `GenerationFinished`，丢弃原 BatchResult。这是 variant 分支语义，不能把 `GenerationFinished` 的数据字段当作存在。

`ffn_service.h`：

- `FfnServer::run` 的 `State{rpc, ffn}` fold（670）：每个 event 先 `transport.advance`，RequestReady 时 `handle_request(state.ffn, *ready)`（非 const 引用）再返回新 State；
- `FfnRuntime` 的 `banks/decode/prefill_routers/prefill_executions` 由 `find_or_prepare_expert_bank`、`prefill_router`、`prefill_execution` 原地修改/插入/淘汰；
- `execute_ffn` 的 `groups` fold 用动态 map key，`output` fold 写 host 输出；RPC 请求/响应是边界。

## 3. fold 的可疑/特殊模式清单

1. **seed 是普通变量而非聚合**：`std::accumulate(layers, box, ...)`；必须把变量初值作为 origin，不能只看 fold 调用。
2. **seed 是 variant/optional**：不能按 record 字段展开；应保留 alternative 身份和空状态。
3. **fold 累加器通过指针借用外部状态**：`Retaining{SlotState*, uint64_t*}`；写入 pointee。
4. **fold 内整体替换累加器**：`bank_state = begin_decode_prefetch(...)`；返回值/移动语义，不能把调用者存储当被调者存储。
5. **fold 内提前返回旧值**：`BatchState`/`Generation.done`；要保留“未修改”分支。
6. **动态下标/映射键**：`keys[metadata]`、`groups[routing.experts[token]]`；元素身份不能静态唯一确定。
7. **容器元素地址/引用**：`std::map::at`、`vector::push_back` 后元素地址；需要元素身份/失效边界。
8. **同一源码 token 多个模板实例**：`Pipeline::execute<TokenInput>` / `<EmbeddingInput>`、generic lambda 实例；必须按 USR/实例保存独立结果。
9. **测试专用 fold**：`tests/local_test.cpp` 12 个；保留在分母但标 test-only，不能当作真实运行时覆盖。
10. **纯值/图 fold**：mask 生成、字符串拼接、`dsv4_ffn` 的 `ggml_tensor*` 累加；没有 C++ 可变对象历史，标 pure/graph，不伪装成状态 mutation。

## 4. 审计结论

- 84 个 fold 源、86 个语义实例、7,976 个写事件进入清单；Oracle 只直接覆盖其中一部分，覆盖率见 `research/oracle/oracle-coverage.md`。
- 最重要的状态链不是单个 `bank_state` 跳转，而是：
  `SessionState → LayerExecution → Plan/Pending → BankState → BatchState → 下一批`。
- 其中至少同时存在：值复制、移动、引用别名、指针借用、资源内容写、异步完成、variant/optional 分支、模板实例、动态容器索引。**单一 `rootId + members` 模型不足以表达这些关系。**
