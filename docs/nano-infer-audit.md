# nano-infer 跨函数状态追踪审计

## 基线、范围与结论

日期：2026-10-25。通过 GitHub connector 的 commit API 实时核对，而非引用旧对话：

| 仓库 | 分支 | GitHub HEAD 与本地 HEAD |
|---|---|---|
| [fold-state-jump](https://github.com/0xUniko/fold-state-jump/commit/d16085eacdb4b54449b0359336df27a150f53170) | feat/multi-funcs | `d16085eacdb4b54449b0359336df27a150f53170` |
| [nano-infer](https://github.com/0xUniko/nano-infer/commit/562758447a716d05dabb3173cebac489bf7daf80) | main | `562758447a716d05dabb3173cebac489bf7daf80` |

两个工作区开始时均干净；本地分支分别跟踪 origin/feat/multi-funcs、origin-github/main。Git HTTPS 因本地代理 `127.0.0.1:7897` 不可达失败，改用 GitHub 连接器读取远端 HEAD。没有 fetch、reset、checkout、commit、push、merge 或删除分支；nano-infer 业务、配置、测试均未修改。

清单范围是三个应用目录全部 **26 个 C++ 文件、9129 行**，以及 **7 个测试 C++ 文件**和三个 CMakeLists。应用层有 **75 处 `ranges::fold_left` 调用**，测试另有 31 处。这是调用点数量，不是语义支持率。历史性能数据、模型结构大文档、llama.cpp/vcpkg 内部实现不计入范围。

按本次审计口径，归纳为 **14 类传递/修改模式**：直接成员写、聚合映射、默认字段复制/移动、自定义构造、引用和裸指针借用、按值包装共享存储、返回值重组、fold seed/轮次、lambda 捕获与调用时点、容器索引、optional/variant、第三方资源写、异步任务与汇合、跨文件调用者/receiver。累加器有 **7 类语义族**：标量/可空候选、纯数据容器、复合记录、外部状态借用指针、图节点返回指针、variant 状态机、资源所有权集合。分类可以交叉；例如 Retaining 是含借用指针的复合记录，不能据表示相似而把这些类型合并。

本次保留了索引、ValueSource、双命令、外部 CallerLink 的架构。新增 23 个真实 C++/Clang fixture 测试；原分析器在其中 16 个反例失败，修复后全部通过。真实项目新增 23 个位置、46 次精确断言，既有真实项目 25 个导航检查和 execute/CLI seed 测试也通过。**这证明下述具体查询，不等于整个 nano-infer 的每次运行都能追踪，更不等于全 C++ 正确性证明。**

## 证据标记

- `A:name`：`test/project-state-audit.ts` 的真实源码断言；完整目标、帧、边界见 [结果 JSON](nano-infer-audit-results.json)。
- `P`：`test/project-state-sources.ts`；真实 pipeline/CLI AST、生产 caller-discovery、模拟 providers、USR 校验。
- `I`：`test/project-integration.ts`；真实头文件的 25 个导航断言。
- `F:name`：`test/semantic-boundaries.test.ts` + `test/fixtures/semantic-boundaries.cpp`；真实 native AST。
- `N`：已有 state-sources/native/analysis/callers 测试；包括构造、指针、数组、fold 时序、多调用路径。
- `C`：已有 callers-command 测试；执行真实 extension 命令、native、缓存和过期保护，模拟 VS Code API。
- `S`：源码调用链审查；未给此具体位置增加自动断言。不能将 S 算成已验证的成功或正确边界。

下面 nano-infer 行号均对应固定 HEAD。`M` 是源码顺序上的 MutationFound，`O` 是 OriginFound；`O(parameter,boundary)` 是诚实的停止点。`O(seed)` 只确认 seed 表达式，不证明其中每个资源的完整来源。分支可达性、迭代次数、异常路径和同步关系没有被求解。

## 场景覆盖矩阵

| 文件/函数/行号与状态字段 | 从外层进入当前状态的完整主要链 | 修改位置/机制 | 当前支持与停止原因 | 应有/实际结果与错误风险 | 回归证据 |
|---|---|---|---|---|---|
| cli.cpp:225 prefill_text；BatchState.session_state | main → turn → prefill(TEXT) → prefill_text fold → run_batch(Session) → execute(Session) → BatchState seed | pipeline.h:1076 position、1077 rope_position；CLI 通过返回值继续传递 | 聚合实参 `{&pipeline, move(batch_state.session_state)}` 的成员映射支持；fold 返回值展开不支持 | execute seed 可到多个 O；prefill_text 返回转换处应边界，不能取 seed 后的写 | P；N direct/aggregate/helpers |
| cli.cpp:284 图像分批；同一状态 | main → turn → prefill(IMAGE) → image batch fold → run_embeddings → execute → batch seed | pipeline.h:1190 execute 实参，1076/1077 推进；图像 next_rope 独立 | 映射与文字分支分开保留；嵌套 fold 的返回转换不证明 | P 有独立 run_embeddings Origin 路径；不能把 run_batch 路径替代此分支 | P |
| pipeline.h:792/801 execute seed；Session/BatchState | CLI 两种 prefill + Generation → run_batch/run_embeddings → execute → `move(session.session_state)` | seed 是输入，后续才在 batch/layer fold 修改 | mappedArgument/valueSource 保留 session_state 后缀；三条 caller 路径 | Mutation 为 CLI:492 的前一轮整体替换；O 为 CLI:228、286、471 三个 seed，均核对帧 | P（精确 offset、文件、成员、调用帧） |
| pipeline.h:803 `auto &session_state = batch_state.session_state` | execute batch fold → 局部引用 | 同一 BatchState 子对象，1077 最后写 | 引用归一化支持，不把它当新副本 | M pipeline.h:1077；O pipeline.h:801 | A:batch-return；I |
| pipeline.h:924 LayerExecution.session_state* | execute → batch fold → `&session_state` → layer fold → `*layer_execution.session_state` → bank_state 引用 → helper | ffn.h:250 slots；finish_decode_layer:525 的整体 bank_state 赋值；I/O 凭据可能写资源 | 局部引用 helper 可追踪；借用跨轮返回与异步物理资源身份未完整证明 | helper 前可 M ffn.h:250；层返回处在 finish_host_copies 边界停止，不能越过它返回较早 bank 写 | A:prefill-helper/layer-borrow；I |
| pipeline.h:849–885 graph_cache.graphs/tick、counters | batch fold → 立即调用 lambda → build_language_graphs | 862 reuses；879 tick；883 builds；map erase/emplace | 立即调用时点可信；容器内部元素/unique_ptr 内容不展开 | whole session 的层 seed 可 M :883，O :801；不证明 graphs 中某个元素 | A:layer-seed；I |
| pipeline.h:1079、1082 返回 BatchState/BatchResult；:419 take_batch_state | layer/head 完成 → `{move(session_state), move(logits)}` → `{Session{this,...},...}` → take_batch_state → CLI | 返回对象重新组装，无直接赋值不是“没有来源” | 表达式中的聚合实参支持；跨函数 ReturnStmt 到调用结果的字段来源尚未建模 | 在函数内能定位最后写；函数结果外侧 Mutation 必须边界，不能跳入任意旧副本 | A:batch-return/generation-seed/chat-return；F:returned |
| cli.cpp:448/469 Generation.batch_state | turn(ChatState) → prefill → batch_state → Generation seed → 每轮 run_batch → take_batch_state | :492 整体替换，:473 读取 position | fold 当前轮前无写则返回同 fold 末写，标 wrapped；seed 不进入后续写 | M :492 wrapped=true；O :471；seed :471 本身 Mutation 是 CallExpr 边界 | A:generation-wrap/generation-seed；P；N fold-stages |
| cli.cpp:469 Generation.done/text；:508 history | prefill seed → generation fold；chat_state.history → history fold → ChatState 返回 | :483 done=true、:490 text+=；:510 push_back | 直接写和标准容器已知 mutator 支持；采样器 API 内部不推断 | done M :483 wrapped=true；History 为独立状态，不与 batch_state 混同 | A:generation-done；S history/sample；N standard mutations |
| cli.cpp:622 Interactive.chat_state/images/done；/clear | main initial ChatState(start_session) → &interactive fold → turn 或 clear_session → ChatState | :632 整体 clear；:644 turn 替换；images clear/push；done=true | 直接父成员写和指针路径支持；分支选择只按源码顺序 | /clear 输入可回绕到 :644，O :625；这只是前轮源码候选，不能声称该轮运行了 turn | A:clear-input |
| pipeline.h:1144 clear_session | main /clear → Session aggregate → clear_session → reset metadata/apply_prewarm → Session 返回 | 1150 backend buffer_clear；1166 起新 slots/frequencies/counters，复用 caches/graphs | 标量重建是初始化；设备 buffer 与返回对象来源为边界 | 不应将 clear 后状态解释成旧会话最后修改；本次未证明完整返回链 | S；N custom/factory；A:chat-return 同类返回边界 |
| experts.h:432/548 Planning、PrefetchPlan.slots | execute → start_decode_layer → plan_decode(bank_state const&)；finish_decode_layer → begin_decode_prefetch(BankState) → plan | :446/447 动态 keys/ages；:557/558 预取；:562 提交 slots | 纯字段/计数支持；vector operator[] 和动态槽号没有元素身份 | ages 查询在 operator[] 明确边界；O :433；不能把其他槽当本槽 | A:slot-index；N array-zero/array-unknown |
| ffn.h:163 Prefill Planning | start_prefill_layer → plan_prefill → slots 副本、missing/copies/expert_slots → PrefillPlan → slots 提交 | :175 起按去重专家填表；:250 slots=move(plan.slots) | slots 整体提交可 M；多容器动态索引、返回 plan 字段不追入 | M 是提交位置，不是其中某个 key 的精确最后写 | A:prefill-helper；S planning 内部 |
| ffn.h:262 BankState.pending | layer → start_decode_layer → move pending → optional reset → ActiveDecodeLayer | :270 pending.reset；分支提前 join/转 InFlight | reset 是已知 mutator；此前 optional operator->/get_if 的潜在共享效果不能跳过 | reset 前查询在 operator-> 停止；O 参数边界 | A:pending-reset |
| ffn.h:445/522 frequencies 指针 fold | finish_prefill_read/finish_decode_layer → &frequencies.at(layer) → pointer accumulator | ++(*frequencies)[id]；阶段 counters 聚合赋值 | 直接 counters 写可索引；at/动态下标/具体元素及 variant 不证明 | 频次精确元素应边界；不能以没有索引写推断频次未变化 | S；A:prefill-counter 检查 enclosing callback 边界；N dynamic array |
| ffn.h:355 Retaining | finish_prefill_layer → retain_prefill → begin_retain_prefill(BankState&) → Retaining{&slots,&cache,&counter,{}} | :376 ++*counter；:378/379 动态 labels/LRU；提交 host copy | 可表示显式裸指针路径；多个借用经 fold 返回、cache[layer] 与复制完成关系不完整 | 局部 counter 写可候选；物理 records 必须边界 | S；A:layer-borrow 阻止跨复制凭据 |
| experts.h:585 BankState.pending/counters | finish_decode_layer → `bank_state = begin_decode_prefetch(move(bank_state),...)` → PendingPrefetch | :562 slots、:564 prefetch_experts、:585 pending | 整体/直接成员赋值可定位；不把 pending 非空解释成数据就绪 | M :585；O :511 参数边界；未证明 worker 已结束 | A:prefetch-return |
| experts.h:728/752 Prewarming/Warming | start_session/clear_session → make_bank/apply_prewarm → 外层 caches/slots/counters → 内层 slots/missing → read/start/finish → BankState 返回 | :763/765 标签/LRU；:768 slots；:775/776 统计；:781 返回 | 多层 fold seed 可识别；嵌套容器、返回字段、设备安装不展开 | 内层 O(seed) 可用；不能声称整条返回/设备内容链已可靠支持 | S；N nested aggregate/fold/copy boundaries |
| experts.h:332/619/664/701/703 | victim_slot(optional candidate)；hot_experts(set)；load/save table(rows/file*/row) | 候选返回新 optional；order.insert；rows.push_back；流写 | 已知容器 mutator 可用；纯返回替换、流和 optional 解包不建模 | 无写索引不能推导为未变化；返回变换处边界 | S；N no-fold-write/standard mutators |
| expert_io.h:200 Progress*、:280 IoCounters | worker → read_record → read_range → positional_read → &progress fold / sum_io 返回 | preadv 写 destination；:215/225/226 done/io；sum_io 聚合返回 | 标量写支持；buffer 地址算术、系统调用、返回聚合来源不展开 | 计数位置与物理字节写必须分开；destination 不应跳回旧 host 写 | S；F:unknown-ptr/constructor-effect |
| expert_io.h:669/755/770/834/850 records/staging | Bank records → Shared/Cache Read → Batch → task → queue → worker → execute_io_task → execute_* → read_record/memcpy | Host 直接写 bank；Staged 写 vector staging，finish 时上传 | 跨线程、共享_ptr 任务、地址算术和第三方内存写超出模型 | 必须视为资源边界；本次没有证明整个异步地址链自动识别完备 | S；F:thread-effect/shared-*；A:future-result/layer-borrow |
| expert_io.h:789/869 read_state.progress/promise | worker 完成事件 → &task.batch->read_state → progress 引用 → promise | :800 --remaining，io/error 分支更新；最后 set_value/set_exception | 局部源码计数写可定位；不推导 promise 对 future 的跨线程可见性 | remaining M :800 wrapped=true，O :790；不能据此证明数据已就绪 | A:read-progress |
| expert_io.h:497/529 ReadTicket.read_result | start_* → future → ticket → Active*/Pending → finish_* → get → Host/Staged → LoadedExperts | future.get 消费；Staged backend_tensor_set；析构 wait | user-defined ticket 构造/赋值、variant、future 与设备写均不透明 | get 前在 get_if 边界停止；O ticket 参数边界 | A:future-result；F:constructor-effect；N optional-copy |
| expert_io.h:736/925/941/974/1001 queue_state/tasks/stopped/workers | enqueue → shared queue → IoWorker thread lambda → take_io_task → IoTask → execute_io_task；析构 stop/join | dequeue reset/begin/count；enqueue optional.emplace；stopping=true | 局部直接字段可能定位；任务身份、唤醒、回调和线程 join 不求解 | queue 当前查询 M 无 verified caller、O 参数边界；不能跳到任意 enqueue 当唯一来源 | A:queue-count；S worker/queue |
| model.h:73/140/150；expert_index.h:112 | CLI load_model → manifest tensors；extent/max_resident/resident folds → LocalModel | emplace/push buffer；tensor->data/buffer；GGML 上传 | 纯标量/容器已知修改可用；iterator/structured binding、资源导入和自定义构造有限 | 列表所有权与共享物理映射分别处理；不能将资源副本当字节副本 | S；N constructor/copy boundaries |
| input.h:11、vision.h:69；runtime.h/cpu_arena.h | main → input_lines lazy view → interactive fold；load_vision → 临时 backing；ComputeGraph → allocator callbacks | getline 写 line；read/fwrite/mtmd 写外部资源；CpuArena 回调只分配 | 输入 lambda 执行时点由 range adaptor 驱动；third-party outputs 不推断 | 引用捕获无可信调用点必须边界；不把创建 view 当消费输入 | S；F:lambda-helper/unknown；I reference callback |
| attention_node.cpp:42/57 PrefillState/Generation variant | main → start_session → PrefillState(AttentionState/BatchResult) → run_batch → BatchResult → Generation(BatchResult/Finished) | `get_if/get` 分支移动状态；结束转 Finished | variant alternative 和返回对象映射不支持；两个 fold 不合并 | 两处 M 为 run_batch/holds_alternative 边界；O 分别 :44/:59 | A:deepseek-prefill/deepseek-generation |
| attention_pipeline.h:1537/1683 AttentionState.position/cache | attention_node → run_batch(move state) → state.cache unique_ptr → caches.layers[il] → execute_attention → 返回 AttentionState(position.advance,move cache,this) | :1731 返回新 position；:1646 compute 写 KV/压缩缓存 | default move 包装可识别；unique_ptr pointee、advance 自定义构造、返回映射/variant 未证明 | cache 局部别名 O :1716 仅是初始化；position M 没有 caller；不声称已回溯唯一设备缓存 | A:attention-cache/attention-return；S actual smart-pointee |
| attention_pipeline.h:1713 input fold | embedded → layer input → execute_attention(cache,...) → ffn.forward → ffn_output 返回 → 下一层 input | KV side effect + RPC 返回 activation | 纯返回累加器没有直接写不等于无变化；不把远端服务当同步本地源码调用 | 应在 returned transformation/RPC/设备边界停止 | S；A:attention-cache；N no-fold-write |
| attention_pipeline.h:98/214/895/1422 | compression plan sources、mask、parity、cache storage → Raw/CSA/HCA 分支 | 动态 vector 写/返回 parity；storage.push_back；GGML clear | 标量/容器 mutator 可定位，动态索引/variant/设备内容不证明 | 每种压缩分支独立边界，不能推断压缩 state 未改 | S；N dynamic arrays/optional boundaries |
| ffn_node.cpp:43 → ffn_service.h:483/476 FfnRuntime | main → FfnServer 构造 → prepare_ffn_runtime fold → find_or_prepare_expert_bank(state&) → banks.push_back → decode.push_back | :476 banks.push_back，:498 decode.push_back | 普通引用 helper 与容器 mutation 支持，unique_ptr 内部不展开 | banks M :476，帧 operator()；O :484 FfnRuntime seed | A:ffn-runtime |
| ffn_service.h:670 FfnServer::State{rpc,ffn} | server.run → event fold → transport.advance(move rpc) → RequestReady → handle_request(state.ffn) → service.handle → execute_ffn → finish_request → State 返回 | runtime prefill cache insert/erase；多次返回重新组装 state | 直接 helper 可跟踪；整个 event 返回态/资源共享关系不证明 | state.ffn M 在 finish_request 效果边界停止，O :671；不能跳至旧 runtime 初始化作最后写 | A:ffn-service |
| ffn_service.h:78/159/560/568/583 | prepare/router/execution → tensors/selections/groups/output → nested output fold | insert/push；groups[key].push；copy_n 写 output | 已知容器 mutator可用；动态 map key、iterator 及 copy_n 输出地址无法精确表示 | 不把不同 token/group 合并；应边界 | S；N arrays/copy；F unknown pointer |
| shared/ffn_rpc.h:320 RpcTransport::State | run event fold → advance(State,Event) → accept/read/finish/begin_shutdown → Awaiting/Reading/Finishing/Draining | gRPC Read/WriteAndFinish/Finish、CQ Next、unique_ptr move，返回 variant | 跨状态 variant、设备/网络事件、第三方异步回调不透明 | advance 的 state M 无 caller，O 参数边界；不能猜当前 alternative | A:rpc-variant；S branches |
| shared/ffn_rpc.h:385 RpcClient::unary/forward | AttentionPipeline → forward → encode(request) → unary → gRPC completion → decode reply → unpack_f32 → ffn_output | 请求/响应 buffers、status、tag、cq Next；远端 runtime 独立 | 不串接到服务端同名 handle；网络不构成可验证的 C++ CallerLink | 显式网络/函数返回边界，不声称已追踪远端修改 | S；A:attention-cache/ffn-service 仅覆盖局部边界 |
| shared/model_loader.cpp:48/59/81/85/110/120/127/216；shared/node_runtime.h | ff/attention node → load_model → load_distributed_model → shard/source/weight_blocks/weights → GGML APIs | push/emplace、块 byte累计；tensor buffer重绑；read_weight上传 | 容器/标量写可候选；跨文件 caller 需要 providers；资源内容仍边界 | 模型目录、buffer所有权与物理权重分别审查 | S；C 跨TU/缓存规则；N references |
| shared/ffn_rpc.h:57/64/68/74；dsv4_ffn.h:117；ffn.h:638 | model_info metadata → string/layout/hash；构图 helper → tensor sum 返回新节点 | 字符串/哈希/ggml_add返回替换，无对象字段赋值 | 初始化可导航；返回变换不追；图创建不等于执行缓存写 | 无 mutation 索引要报 boundary，不应伪造历史位置 | S；N no-fold-write；F:returned |

75 个应用 fold 的完整位置和测试 fold 计数见 [fold 清单](nano-infer-fold-inventory.md)。没有把每个语法命中都算作测试通过。

## 已复现缺陷与修复

最小反例先于分析器修改加入并实际运行。对固定原 `analysis.ts` 的最终同组测试为 **7 pass / 16 fail**；本次实现为 **23 pass / 0 fail**。这是 Clang AST 查询层复现；并发反例没有执行 C++ 线程调度来假装证明某一种运行顺序。

### 已复现的不可信确定跳转

| 根因与原代码 | 证据 | 修复与精度代价 |
|---|---|---|
| findPreviousMutation 对 `!callee` 直接 continue | F:unknown-ref/unknown-ptr/alias-unknown；旧结果均为未知调用之前的直接写 | native 给出参数效果；exposesTarget 仅作为屏障证据。无法验证 borrow/shared/callback 关系时 MutationBoundary；只读参数、标量值和可证明独立局部对象不阻断 |
| 不同声明 ID 被默认当独立存储 | F:possible-alias，两 State& 可能是同一对象 | 同类型借用参数按可能别名处理；已知 callee 可证明不写相应参数时保留追踪；不声称解决一般 alias analysis |
| 只检查引用/指针形参，忽略按值包装里的引用/指针 | F:shared-reference/shared-pointer/shared-reference-alias/shared-pointer-alias；实际后写 :20/:21 被漏，旧结果选早写 | 按值参数另有 shared 效果。暂不猜共享字段的映射，返回明确边界；Origin 原有 copyBoundaries 的边界语义保留 |
| 未知 callback 可以写捕获状态 | F:callback-unknown | 检查捕获和可见 callback body 的潜在效果。纯只读 closure 无须知道时点即可证明不写；反向值追踪仍要求可信调用点 |
| 引用捕获没有调用位置时退回 lambda 创建位置 | F:lambda-unknown/lambda-helper，旧返回 :7/:8 的写；Origin 也无可信时点 | Mutation/Origin 共用 captureSource 的 Snapshot / Invocations / Boundary。经 helper 或其他对象执行而无法证明时点的引用捕获停止；直接/存储后直接调用仍保留确切帧；值捕获用创建时快照 |
| 构造不是 CallExpr，完全未参与效果搜索 | F:constructor-effect/thread-effect | 独立 construction 元数据和索引保留语义区别；自定义构造或 thread/callback 参数暴露目标时为边界，不把构造体当普通同步 helper；默认字段复制不因此变黑箱 |
| 指针形参按值重绑被当成调用者指针写 | F:pointer-binding；旧定位 helper 局部 `p=q` | BorrowedTarget 与 PointerValueTarget 分案；按值 pointer 只向 pointee 传播。若本地重绑后又有可疑 pointee 效果，停止推断 caller 身份 |
| fold 用 includes('fold_left') 识别 | F:similar-name；not_fold_left 中读前无写却回绕到未来写 | 标识符精确匹配 fold_left，阻止 substring 假阳性；fold 识别仍是受限语法模型，未验证任意同名实现的数学契约 |

### 已复现的追踪遗漏

- `F:pointer-copy`：callee 只重绑自己的按值指针，却使 caller 现有 pointee 被当成未知。修复后定位原对象的写，文件、行、wrapped 与帧均有断言。
- 修改过程中真实 CLI :492 揭示完成赋值与 RHS call 的时序冲突：新增边界不能覆盖包含该调用、且已完成的外层赋值。现在显式排除被已完成写包含的 RHS 调用/构造；`F:assignment-order` 与 `A:generation-wrap` 防止回归。
- 过度保守地屏蔽所有引用捕获会阻断 run_batch 中只读 positions transform。对可见只读 callback 的效果做局部证明，保留 P 的原有三条来源路径；`F:readonly-callback` 防止回退成“一切 lambda 都阻断”。

### 真实项目中的边界变化

I 的旧断言将 ffn.h:240/:393、pipeline.h:705/:742 的 callback 捕获直接退到外层参数/seed，这并不证明执行时点。现在这四处严格断言 `LambdaExpr + parameter + Reference capture invocation is not verified`。层返回处的旧断言越过 finish_host_copies 跳到早期 bank_state 赋值；现在严格断言目标路径 `layer_execution.session_state.*` 和 `finish_host_copies` 边界。没有跳过检查、接受任意结果或删除断言；修正了与语义不符的预期。

### 静态审查风险，尚未作为运行时错误复现

1. **一般共享/别名与逃逸生命周期仍不完整。** 子对象交叉别名、函数先保存地址再由后续无参函数/析构器/外部线程写入、跨多次调用的异步保留关系，没有全局 escape/happens-before 模型。当前屏障能阻止本次直接暴露目标的未知调用，不能声称覆盖所有间接或延迟别名。此类资源不属于可靠导航范围，尤其不能把整对象 M 当作其所有共享字节的最后写。后续应引入存储身份和 escaped/async 状态，不能仅新增函数名白名单。
2. **返回转换仍不透明。** take_batch_state 的聚合 ReturnStmt 没有被映射回调用结果；不能从 ChatState/Generation 输出外部可靠倒推到每个旧字段。后续需要 typed ReturnSource，按所有 return 分支保留候选/边界，而不是选第一个 ReturnStmt。
3. **source order 不是控制流。** 分支、零次 fold、早退、异常、当前/前轮是否存在、被 move 后继续访问等不证明。`A:clear-input` 和 graph counters 只能作为源码候选；没有降为实际发生过的确定事件。
4. **标准库和第三方资源有保守假阳性。** optional/variant/get_if、某些 const handle 与共享子对象操作会提前停止；GGML 的图节点 side effect 不会被倒推为 C++ 字段写。不是“没有修改”的证据。
5. **调用者发现不保证全集。** 本次 mock 提供完整候选；真实 C++ 服务可能缺引用/模板实例。递归、间接调用、虚调用不可凭名称猜；当前虚调用不进入本地或外部已验证边集合。尚无真实 Extension Host 的全集证明。
6. **头文件编译上下文可选错。** root compile_commands 指向旧 build-cpu-debug；attention_pipeline.h 最近的 main.cpp 又缺 generated include。错误会由 runClangAst 拒绝，不会接受 partial AST；审计脚本显式借用实际 node TU 的目标参数。没有改自动 header inference 来掩盖问题。

### 已测试并正确处理的明确限制

- 自定义 copy/move、含共享引用/指针字段的复制、optional<Custom>、复杂 factory：N 明确验证 field-preservation / Unsupported expression 边界。
- 不能证明 invocation 的引用捕获、指针 copy capture、自定义 copy capture、[*this]：F/N 验证边界；普通值捕获和直接引用调用保留正确位置。
- builtin 固定数组下标不合并元素；动态下标、指针下标、重绑后的未知 pointee：N 验证具体错误原因。
- 返回对象变换和无索引 mutation 的 fold：A/N/F 验证明确停止；不会把 seed 后的写当作 seed 前发生。
- 原有跨 TU、header caller、重载/非调用 reference、候选去重/多路径、缓存/取消/脏文件：N/C 继续通过。

## 修改范围与可复核性

- `src/analysis.ts`：共享调用效果屏障、单独构造索引、指针值/借用分案、captureSource、虚调用边界、精确 fold 名称、赋值完成时序。exposesTarget 不能生成 Path 或 Mutation，只能否定确定性。
- `native/ast-extractor.cpp`：参数 value/read/write/pointee/shared、receiver 效果、virtual 标记、构造参数效果、捕获初始化器。sharedStorage 与 copyBoundaries 分开，前者判断可能共享效果，后者判断字段值保真，未混为同一不变量。数组/record/std 常见持有类型分别处理；深度上限保守返回 shared。
- `test/fixtures/semantic-boundaries.cpp` / `test/semantic-boundaries.test.ts`：23 个真实 C++ 回归。
- `test/project-state-audit.ts`：9 个真实文件、23 个选择位置、46 次结果断言；成功检查最终文件/行、wrapped、caller 序列及选中成员路径，边界检查具体原因；不接受任意 tag。
- `test/project-state-sources.ts`：保留原有精确 seed/caller/成员断言，加入生产 discoverCallerLocations 的 incoming+references 合并和 USR 校验；provider 含重复候选和 declaration 非调用候选。
- `test/project-integration.ts`：25 个真实源码断言，严格区分四个未知 callback 和复制凭据边界；支持显式编译数据库。
- 文档与 JSON：记录固定版本、逐场景证据、命令和性能；没有修改架构、nano-infer、vendored Effect 或第三方库。

Native 二进制指纹参与 buildIdentity，schema 元数据变化随 rebuild 自动隔离旧磁盘 AST；没有复用旧 extractor 的缓存作为新语义证明。原有缓存失效、取消和依赖校验流程保留。

## 实际验证命令与结果

从 fold-state-jump 根目录执行。所有项目解析只读 nano-infer；输出和可选 AST 存在 `/tmp`，未写 nano-infer 的构建目录。`FSJ_PROJECT_COMPILE_COMMANDS` 只是测试输入参数，不修改它的配置。

```sh
git status --short --branch
git rev-parse HEAD
git -C /home/huawei/nano-infer status --short --branch
git -C /home/huawei/nano-infer rev-parse HEAD
git ls-remote origin refs/heads/feat/multi-funcs
# 上项代理失败；随后 GitHub connector fetch_commit 分别读取两个指定分支。

bun run build:native
bunx --no-install tsc --noEmit
bun run build
bun run test/native-integration.ts
bun test

FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-state-audit.ts /home/huawei/nano-infer
FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-integration.ts /home/huawei/nano-infer
FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-state-sources.ts /home/huawei/nano-infer
# 同 flags 对比另外执行了未设置 FSJ_PROJECT_COMPILE_COMMANDS 的 project-state-sources。

bun test/analysis-performance.ts /tmp/fsj-analysis-baseline.ts 10000
bun test/analysis-performance.ts /home/huawei/fold-state-jump/src/analysis.ts 10000
bun test/query-performance.ts 10000
bun test/cache-performance.ts
bun test/services-performance.ts
```

| 检查 | 实际结果 |
|---|---|
| native CMake/LLVM 23.1.4 Release | 成功；CMake 提示未找到可选 LibEdit/zstd/CURL，不阻断构建 |
| TypeScript `tsc --noEmit` | 成功 |
| extension bundle | 成功 |
| native-integration | 成功 |
| 新增 C++ fixture | 23/23；原分析器同组 7/23，16 个反例失败 |
| 六个状态/调用者/extension adapter 定向套件 | 189/189 |
| 新真实项目审计 | 9 文件、23 选择位置、46 次精确结果断言通过 |
| 既有真实项目导航 | ffn.h 14、experts.h 3、pipeline.h 8，共 25 检查通过 |
| execute seed + CLI 路径 | 原精确断言保留并通过；生产 provider 合并 + native USR 验证通过；mock providers |
| 完整 Bun（沙箱内） | 基线 293 pass / 41 fail；最终 316 pass / 41 fail；同一批 preamble 问题 |
| 同 4 个 preamble 套件打包后使用 VS Code 自带 Node | 19 + 27 + 7 + 1 = 54 pass，0 fail |
| 完整 Bun（自动审核允许沙箱外重跑） | **357 pass / 0 fail，21 文件，14.53 s**；包括原先全部 41 个失败 |
| cache/services benchmark | 缓存命中、无重提取、跨键复用、数据库复用断言通过 |

Node 复核使用的实际运行时为 `/home/huawei/.vscode-server/bin/e646868227c3e3a9e3f24277c8c7220be42c0be7/node`（本 shell 没有 `node` PATH），形式如下，四个 suite 均分别打包并运行：

```sh
bun build test/preamble-native.test.ts --target=node --format=esm \
  --outfile=/tmp/fsj-preamble-native.mjs
/home/huawei/.vscode-server/bin/e646868227c3e3a9e3f24277c8c7220be42c0be7/node \
  /tmp/fsj-preamble-native.mjs
# 同样运行 preamble.test.ts / preamble-ssd.test.ts / preamble-context.test.ts。
```

41 项的逐项结果见 [Bun 沙箱失败核对](nano-infer-bun-failures.md)。早先 `Native worker closed before response`、未产生 preamble-build/published 等，是 worker 通信失败后的连锁断言；不是通过吞错掩盖的状态追踪失败。沙箱外同一完整命令全部通过，已验证归因。

### 性能

下面是相同输入、每项 10000 次 query 的实测。单次微基准受调度/JIT 影响，不作为硬性能承诺。没有新增 workspace 扫描；caller provider 的两个来源仍并行合并，缓存仍按原二进制/编译参数/依赖身份校验。

| 分析场景 | 原 query µs | 当前 query µs | 原 prepare ms | 当前 prepare ms |
|---|---:|---:|---:|---:|
| 20000 无关写 | 2.76 | 2.86 | 43.47 | 41.58 |
| 历史写查询 | 2.18 | 2.06 | 35.51 | 26.61 |
| 20000 helper 调用，选择最新调用 | 4.62 | 4.59 | 49.90 | 48.10 |
| 2000 引用别名 Origin | 17.64 | 18.84 | 7.73 | 3.53 |

10000 函数的 cursor 基准：Mutation 6.05 → 6.32 µs，Origin 3.04 → 3.38 µs；没有观察到数量级或随总函数数量线性恶化。参考别名 Origin 小幅变慢，需继续观察多次运行分布，不能声称零开销。

相同默认编译参数的真实源码提取+prepare：pipeline 13.589 → 12.691 s，CLI 16.686 → 15.958 s；只有单次样本，不能归因于优化。AST 大小分别 6,088,024 → 6,298,281 bytes（约 +3.45%），20,376,853 → 20,884,484 bytes（约 +2.49%），是新增效果和捕获初始化元数据的可见开销。Release 配置的另一组 CLI AST 更小，**未与 debug 基线混比**。

cache fixture 冷提取 173.68 ms，15 次 warm hit 中位数约 1.53 ms，无意外重提取；20000 条编译数据库的 warm exact/header 中位数 0.265/0.187 ms，对应重建 21.894/30.735 ms。这两项是当前绝对值，未修改缓存/数据库实现，不伪称前后提升。真实语言服务 provider 搜索时延、真实大型 workspace 的常驻内存未测。

## 手动 Extension Host 验证

自动验证使用真实 Clang、真实生产 discovery/extension 适配代码和可控 mock providers；**没有启动真实 VS Code Extension Host、clangd 或 cpptools，也没有执行 nano-infer 模型推理、GPU 或 gRPC 服务端运行时验证。** CMake/业务测试源码用于核对状态契约，不把其历史 validation.md 结果算作本次运行。

1. 重建 native 和 extension；F5 启动宿主，打开固定 HEAD 的 nano-infer，启用 C++ 语言服务并完成索引，所有相关 buffer 保存。
2. 为当前目标设置有效的 compile_commands；MiniCPM 可用 build-cpu-tests。DeepSeek header 若继承 main.cpp 缺 generated 目录，应从实际 node TU 分析或提供包含正确 TU 上下文的独立分析数据库，不能接受失败解析的 partial AST。
3. 在 pipeline.h:801 的 session_state 分别执行 Mutation/Origin。核对 QuickPick 的 run_batch/run_embeddings、CLI:492 和 :228/:286/:471、frame 中成员后缀及 wrapped 标志。
4. 在 pipeline.h:996 bank_state、CLI:473 position、ffn_service.h:492 banks 核对 A 中具体目标；在 layer 返回、pending、未来 ticket、variant 位置核对明确边界提示，不能跳到过早赋值。
5. 在 references 与 incoming calls 各自不完整/不可用时核对并集；声明引用不能变调用；实际索引无外部 caller 时应停参数并给诊断。多路径 QuickPick 取消不得跳转。
6. 重复查询检查 warm hit 无 native 重提取；编辑 included header、改变 target flags、使 caller dirty、查询中取消或 reload 后，核对旧 AST/旧结果不会发布。

后续扩展顺序应为：可验证的 ReturnSource 分支模型 → fold 借用身份/返回映射 → 容器元素身份 → escaped/async 存储状态 → 真实语言服务录制与 Extension Host 集成。每一步都应继续保留无法证明的分支，不以某一光标跳成功作为覆盖率。
