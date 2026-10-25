# nano-infer fold 清单

固定 HEAD：`562758447a716d05dabb3173cebac489bf7daf80`。应用 26 个 C++ 文件、75 个 fold；测试 7 个文件、31 个 fold。下表对源码确认过的累加器逐项命名；**位置计数不表示支持率**，支持与证据见 [审计矩阵](nano-infer-audit.md)。

| 文件 | fold 行号 | 函数 / 状态 |
|---|---:|---|
| deepseek-v4-flash/attention_node.cpp | 42 | main prefill / PrefillState variant |
| deepseek-v4-flash/attention_node.cpp | 57 | main generation / Generation variant |
| deepseek-v4-flash/attention_options.h | 21 | parse_attention_options / AttentionOptions |
| deepseek-v4-flash/attention_pipeline.h | 98 | build_compression_state_plan / persist_sources vector |
| deepseek-v4-flash/attention_pipeline.h | 214 | set_compressed_kq_mask / mask vector |
| deepseek-v4-flash/attention_pipeline.h | 895 | set_csa_inputs / parity int |
| deepseek-v4-flash/attention_pipeline.h | 1422 | make_attention_caches / vector<LayerCaches> |
| deepseek-v4-flash/attention_pipeline.h | 1713 | run_batch / input vector<float> |
| deepseek-v4-flash/dsv4_ffn.h | 117 | build_selected_ffn / routed ggml_tensor* |
| deepseek-v4-flash/ffn_service.h | 78 | allocate_ffn_graph / tensors set |
| deepseek-v4-flash/ffn_service.h | 159 | route_ffn / selections vector |
| deepseek-v4-flash/ffn_service.h | 483 | prepare_ffn_runtime / FfnRuntime |
| deepseek-v4-flash/ffn_service.h | 560 | execute_ffn / Groups map |
| deepseek-v4-flash/ffn_service.h | 568 | execute_ffn / output vector<float> |
| deepseek-v4-flash/ffn_service.h | 583 | execute_ffn / result vector<float> |
| deepseek-v4-flash/ffn_service.h | 670 | FfnServer.run / State{rpc,ffn} |
| minicpm-v-4_7/cli.cpp | 84 | environment_options / EnvironmentOptions |
| minicpm-v-4_7/cli.cpp | 116 | parse_options / Parsing{options,consumed} |
| minicpm-v-4_7/cli.cpp | 225 | prefill_text / BatchState |
| minicpm-v-4_7/cli.cpp | 245 | prefill / BatchState |
| minicpm-v-4_7/cli.cpp | 284 | prefill IMAGE / BatchState |
| minicpm-v-4_7/cli.cpp | 421 | turn / prefix string |
| minicpm-v-4_7/cli.cpp | 469 | turn / Generation |
| minicpm-v-4_7/cli.cpp | 508 | turn / history vector |
| minicpm-v-4_7/cli.cpp | 622 | main / Interactive* |
| minicpm-v-4_7/expert_index.h | 112 | load_expert_index / tensors map |
| minicpm-v-4_7/expert_io.h | 103 | open_expert_store / files map |
| minicpm-v-4_7/expert_io.h | 114 | open_expert_store / offsets array |
| minicpm-v-4_7/expert_io.h | 200 | positional_read / Progress* |
| minicpm-v-4_7/expert_io.h | 280 | read_record / IoCounters |
| minicpm-v-4_7/expert_io.h | 669 | execute_host_copies / records_destination char* |
| minicpm-v-4_7/expert_io.h | 682 | execute_host_copies / copy_state* |
| minicpm-v-4_7/expert_io.h | 736 | take_io_task / Taking |
| minicpm-v-4_7/expert_io.h | 755 | execute_shared_read Host / IoCounters |
| minicpm-v-4_7/expert_io.h | 770 | execute_shared_read Staged / IoCounters |
| minicpm-v-4_7/expert_io.h | 789 | execute_shared_read completion / SharedReadState* |
| minicpm-v-4_7/expert_io.h | 834 | execute_cache_read Host / IoCounters |
| minicpm-v-4_7/expert_io.h | 850 | execute_cache_read Staged / IoCounters |
| minicpm-v-4_7/expert_io.h | 869 | execute_cache_read completion / CacheReadState* |
| minicpm-v-4_7/expert_io.h | 925 | stop_io_queue / queue_state* |
| minicpm-v-4_7/expert_io.h | 941 | IoWorker thread / stopped bool* |
| minicpm-v-4_7/expert_io.h | 974 | IoPool / workers vector |
| minicpm-v-4_7/expert_io.h | 1001 | enqueue_io_tasks / queue_state* |
| minicpm-v-4_7/experts.h | 332 | victim_slot / optional<size_t> |
| minicpm-v-4_7/experts.h | 432 | plan_decode / Planning |
| minicpm-v-4_7/experts.h | 548 | begin_decode_prefetch / PrefetchPlan |
| minicpm-v-4_7/experts.h | 619 | hot_experts / set<ExpertFrequency> |
| minicpm-v-4_7/experts.h | 664 | load_prewarm_table / rows |
| minicpm-v-4_7/experts.h | 701 | save_prewarm_table / ofstream* |
| minicpm-v-4_7/experts.h | 703 | save_prewarm_table / row string |
| minicpm-v-4_7/experts.h | 728 | apply_prewarm / Prewarming |
| minicpm-v-4_7/experts.h | 752 | apply_prewarm / Warming |
| minicpm-v-4_7/ffn.h | 163 | plan_prefill / Planning |
| minicpm-v-4_7/ffn.h | 355 | begin_retain_prefill / Retaining |
| minicpm-v-4_7/ffn.h | 445 | finish_prefill_read / frequencies vector* |
| minicpm-v-4_7/ffn.h | 522 | finish_decode_layer / frequencies vector* |
| minicpm-v-4_7/ffn.h | 638 | build_routed_experts / ggml_tensor* sum |
| minicpm-v-4_7/model.h | 73 | load_model / extent size_t |
| minicpm-v-4_7/model.h | 140 | load_model / max_resident size_t |
| minicpm-v-4_7/model.h | 150 | load_model / resident vector<Buffer> |
| minicpm-v-4_7/pipeline.h | 699 | build_language_graphs / ArenaSizes |
| minicpm-v-4_7/pipeline.h | 800 | execute / BatchState |
| minicpm-v-4_7/pipeline.h | 922 | execute / LayerExecution |
| shared/ffn_rpc.h | 57 | model_info / description string |
| shared/ffn_rpc.h | 64 | model_info / layout string |
| shared/ffn_rpc.h | 68 | model_info / dims string |
| shared/ffn_rpc.h | 74 | model_info / fingerprint uint64_t |
| shared/model_loader.cpp | 48 | open_shards single / vector<Shard> |
| shared/model_loader.cpp | 59 | open_shards split / vector<Shard> |
| shared/model_loader.cpp | 81 | tensor_sources / sources map |
| shared/model_loader.cpp | 85 | tensor_sources inner / index map |
| shared/model_loader.cpp | 110 | weight_blocks / groups map |
| shared/model_loader.cpp | 120 | weight_blocks / blocks vector |
| shared/model_loader.cpp | 127 | weight_blocks inner / state vector<WeightBlock> |
| shared/model_loader.cpp | 216 | load_distributed_model / weights vector<Buffer> |

无 fold 的应用文件也纳入资源和调用边界审查：

- `deepseek-v4-flash/attention_log.h`
- `deepseek-v4-flash/ffn_node.cpp`
- `deepseek-v4-flash/main.cpp`
- `deepseek-v4-flash/node_runtime.h`
- `minicpm-v-4_7/cpu_arena.h`
- `minicpm-v-4_7/input.h`
- `minicpm-v-4_7/mapped_file.h`
- `minicpm-v-4_7/runtime.h`
- `minicpm-v-4_7/vision.h`
- `shared/model_loader.h`
- `shared/node_runtime.h`
- `shared/prompt.h`

## 测试源码

| 文件 | fold 行号 |
|---|---|
| deepseek-v4-flash/tests/distributed_test.cpp | 62, 248, 257, 282, 325, 327, 371, 413, 573, 597, 610 |
| deepseek-v4-flash/tests/inference_compare.cpp | 69, 107, 117 |
| deepseek-v4-flash/tests/layer_compare.h | 30, 97, 125 |
| deepseek-v4-flash/tests/tiny_model.h | 113 |
| minicpm-v-4_7/tests/local_test.cpp | 33, 41, 69, 128, 199, 282, 367, 676, 723, 845, 1042, 1223 |
| shared/tests/model_loader_test.cpp |  |
| shared/tests/tiny_qwen35moe.h | 46 |
