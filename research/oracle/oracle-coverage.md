# Oracle coverage

Fold source sites: **84**; semantic fold instances: **86**; Oracle queries: **48**.

The denominator is every fold site emitted by the Clang inventory, not only the sites the prototype happened to answer. Sites can be grouped when their state semantics are identical; grouping never deletes them from this table.

## Coverage by status

| status | sites | instances |
|---|---:|---:|
| reviewed-grouped | 33 | 33 |
| pure/scalar-grouped | 15 | 15 |
| oracle-covered | 14 | 16 |
| test-only-grouped | 12 | 12 |
| shared-loader-grouped | 6 | 6 |
| graph-value-grouped | 4 | 4 |

## Per-site status

| file:line | seed type | instances | status | oracle query |
|---|---|---:|---|---|
| deepseek-v4-flash/attention_node.cpp:42 | `PrefillState` | 1 | reviewed-grouped |  |
| deepseek-v4-flash/attention_node.cpp:57 | `Generation` | 1 | oracle-covered | `deepseek.generation.current.origin`, `deepseek.generation.next-state.origin`, `deepseek.generation.finished.origin` |
| deepseek-v4-flash/attention_options.h:21 | `AttentionOptions` | 1 | pure/scalar-grouped |  |
| deepseek-v4-flash/attention_pipeline.h:98 | `std::vector<int32_t>` | 1 | pure/scalar-grouped |  |
| deepseek-v4-flash/attention_pipeline.h:214 | `std::vector<MaskValue>` | 1 | pure/scalar-grouped |  |
| deepseek-v4-flash/attention_pipeline.h:895 | `int` | 1 | pure/scalar-grouped |  |
| deepseek-v4-flash/attention_pipeline.h:1422 | `std::vector<LayerCaches>` | 1 | reviewed-grouped |  |
| deepseek-v4-flash/attention_pipeline.h:1713 | `std::vector<float>` | 1 | oracle-covered | `deepseek.attention.cache.origin`, `deepseek.attention.position.origin`, `deepseek.attention.hidden.seed`, `deepseek.attention.ffn-return` |
| deepseek-v4-flash/dsv4_ffn.h:117 | `struct ggml_tensor *` | 1 | oracle-covered | `deepseek.dsv4.routed.pure-graph` |
| deepseek-v4-flash/ffn_service.h:78 | `std::set<ggml_tensor *>` | 1 | reviewed-grouped |  |
| deepseek-v4-flash/ffn_service.h:159 | `std::vector<std::vector<int32_t>>` | 1 | reviewed-grouped |  |
| deepseek-v4-flash/ffn_service.h:483 | `FfnRuntime` | 1 | reviewed-grouped |  |
| deepseek-v4-flash/ffn_service.h:560 | `Groups` | 1 | oracle-covered | `deepseek.ffn.execute.groups` |
| deepseek-v4-flash/ffn_service.h:568 | `std::vector<float>` | 1 | reviewed-grouped |  |
| deepseek-v4-flash/ffn_service.h:583 | `typename std::remove_reference<std::vector<float, std::allocator<float>> &>::type` | 1 | reviewed-grouped |  |
| deepseek-v4-flash/ffn_service.h:670 | `State` | 1 | oracle-covered | `deepseek.ffn.server.state-fold` |
| minicpm-v-4_7/cli.cpp:113 | `Parsing` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/cli.cpp:239 | `BatchState` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/cli.cpp:259 | `BatchState` | 1 | oracle-covered | `minicpm.cli.prefill.batch_state.seed` |
| minicpm-v-4_7/cli.cpp:298 | `minicpm::BatchState` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/cli.cpp:457 | `std::string` | 1 | pure/scalar-grouped |  |
| minicpm-v-4_7/cli.cpp:518 | `Generation` | 1 | oracle-covered | `minicpm.cli.generation.seed`, `minicpm.cli.generation.batch_state.update`, `minicpm.cli.generation.text`, `minicpm.cli.generation.decode_tokens` |
| minicpm-v-4_7/cli.cpp:572 | `std::vector<common_chat_msg>` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/cli.cpp:689 | `Interactive *` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_index.h:116 | `std::map<std::string, ExpertSource>` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_io.h:105 | `std::map<std::filesystem::path, std::shared_ptr<const ExpertFile>>` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_io.h:198 | `struct Progress *` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_io.h:282 | `IoCounters` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_io.h:505 | `ggml_tensor *` | 1 | graph-value-grouped |  |
| minicpm-v-4_7/expert_io.h:535 | `ggml_tensor *` | 1 | graph-value-grouped |  |
| minicpm-v-4_7/expert_io.h:614 | `char *` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_io.h:763 | `RecordReadState` | 1 | oracle-covered | `minicpm.expert_io.read_state.seed` |
| minicpm-v-4_7/expert_io.h:788 | `RecordReadState` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_io.h:811 | `RecordReadState` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_io.h:832 | `RecordReadState` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_io.h:883 | `bool *` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_io.h:919 | `std::vector<IoWorker>` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/expert_io.h:946 | `struct State *` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/experts.h:353 | `std::optional<size_t>` | 1 | oracle-covered | `minicpm.victim_slot.fold` |
| minicpm-v-4_7/experts.h:407 | `Planning` | 1 | oracle-covered | `minicpm.plan_shared_decode.seed.slots`, `minicpm.plan_shared_decode.dynamic-index-write` |
| minicpm-v-4_7/experts.h:469 | `Planning` | 1 | oracle-covered | `minicpm.plan_cache_decode.found.original-snapshot`, `minicpm.plan_cache_decode.misses.history` |
| minicpm-v-4_7/experts.h:565 | `PrefetchPlan` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/experts.h:645 | `std::set<ExpertFrequency>` | 1 | pure/scalar-grouped |  |
| minicpm-v-4_7/experts.h:690 | `std::vector<std::vector<int32_t>>` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/experts.h:728 | `std::ofstream *` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/experts.h:729 | `std::string` | 1 | pure/scalar-grouped |  |
| minicpm-v-4_7/experts.h:756 | `Prewarming` | 1 | oracle-covered | `minicpm.apply_prewarm.bankstate.return`, `minicpm.start_session.bank_state` |
| minicpm-v-4_7/experts.h:780 | `Warming` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/ffn.h:77 | `Planning` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/ffn.h:137 | `ggml_tensor *` | 1 | graph-value-grouped |  |
| minicpm-v-4_7/ffn.h:174 | `Retaining` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/ffn.h:211 | `ggml_tensor *` | 1 | graph-value-grouped |  |
| minicpm-v-4_7/ffn.h:225 | `value_type *` | 1 | oracle-covered | `minicpm.record_frequency.element-write` |
| minicpm-v-4_7/ffn.h:426 | `struct ggml_tensor *` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/model.h:147 | `size_t` | 1 | pure/scalar-grouped |  |
| minicpm-v-4_7/model.h:245 | `std::vector<nano::Buffer>` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/model.h:313 | `size_t` | 1 | pure/scalar-grouped |  |
| minicpm-v-4_7/model.h:361 | `std::vector<nano::Buffer>` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/pipeline.h:719 | `ArenaSizes` | 1 | reviewed-grouped |  |
| minicpm-v-4_7/pipeline.h:866 | `LayerExecution` | 3 | oracle-covered | `minicpm.execute.seed.bank_state.origin`, `minicpm.execute.seed.aggregate-field-mapping`, `minicpm.execute.lambda.bank_state.origin`, `minicpm.execute.lambda.alias-binding`, `minicpm.execute.lambda.graph_reuses.history`, `minicpm.execute.lambda.graph_builds.history`, `minicpm.execute.plan-slots.origin`, `minicpm.execute.begin_decode_prefetch.value-transfer`, `minicpm.execute.pending.reset`, `minicpm.execute.fold-result.bank_state`, `minicpm.clear_session.bankstate.reconstruction`, `minicpm.graph_cache.tick.recurrence` |
| minicpm-v-4_7/tests/local_test.cpp:35 | `basic_json<>` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:43 | `size_t` | 1 | pure/scalar-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:71 | `Progress` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:131 | `std::array<bool, 40>` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:207 | `SessionState` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:314 | `std::map<std::string, minicpm::ExpertSource>` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:399 | `BankState` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:716 | `BankState` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:807 | `BankState` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:864 | `BankState` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:999 | `Compared` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:1208 | `SessionState` | 1 | test-only-grouped |  |
| minicpm-v-4_7/tests/local_test.cpp:1395 | `struct InputState *` | 1 | test-only-grouped |  |
| shared/ffn_rpc.h:57 | `std::string` | 1 | pure/scalar-grouped |  |
| shared/ffn_rpc.h:64 | `std::basic_string<char>` | 1 | shared-loader-grouped |  |
| shared/ffn_rpc.h:74 | `uint64_t` | 1 | pure/scalar-grouped |  |
| shared/model_loader.cpp:48 | `std::vector<Shard>` | 1 | pure/scalar-grouped |  |
| shared/model_loader.cpp:59 | `std::vector<Shard>` | 1 | pure/scalar-grouped |  |
| shared/model_loader.cpp:81 | `std::map<std::string, TensorSource>` | 1 | shared-loader-grouped |  |
| shared/model_loader.cpp:85 | `<dependent type>` | 1 | shared-loader-grouped |  |
| shared/model_loader.cpp:110 | `std::map<ggml_backend_buffer_type_t, std::vector<ggml_tensor *>>` | 1 | shared-loader-grouped |  |
| shared/model_loader.cpp:120 | `std::vector<WeightBlock>` | 1 | shared-loader-grouped |  |
| shared/model_loader.cpp:216 | `std::vector<Buffer>` | 1 | shared-loader-grouped |  |
| shared/tests/tiny_qwen35moe.h:46 | `int` | 1 | pure/scalar-grouped |  |

## Coverage caveats

- `oracle-covered` means the fold participates in a reviewed query; it does not mean the prototype answered it correctly.
- `reviewed-grouped` means the state lifecycle was read and grouped with a reviewed semantic pattern, but no separate query was authored.
- `pure/scalar-grouped`, `graph-value-grouped`, `shared-loader-grouped`, and `test-only-grouped` are still present in the denominator. They are not silently counted as state-history coverage.
- A fold site with two lambda instantiations contributes two semantic instances but one source site.
