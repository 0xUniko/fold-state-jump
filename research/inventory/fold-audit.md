# Fold audit

Source sites: **84**; semantic instances: **86**.

Each row records seed fields, lambda reads/writes, every return, source guards and review status.

| site | fn | seed fields | reads | writes | returns | guards | status |
|---|---|---:|---:|---:|---:|---:|---|
| deepseek-v4-flash/attention_node.cpp:42 | `c:@F@main#I#**C#` | 2 | 26 | 2 | 2 | 1 | reviewed |
| deepseek-v4-flash/attention_node.cpp:57 | `c:@F@main#I#**C#` | 2 | 53 | 4 | 4 | 3 | reviewed |
| deepseek-v4-flash/attention_options.h:21 | `rse_attention_options#I#**C#` | 10 | 50 | 6 | 1 | 5 | mechanical |
| deepseek-v4-flash/attention_pipeline.h:98 | `or>#I#$@E@CompressionKind#L#` | 2 | 6 | 0 | 1 | 0 | reviewed |
| deepseek-v4-flash/attention_pipeline.h:214 | `#I#$@N@std@S@allocator>#I#I#` | 2 | 22 | 1 | 1 | 0 | reviewed |
| deepseek-v4-flash/attention_pipeline.h:895 | `ator>#I#@Sa@F@operator()#L#1` | 2 | 6 | 0 | 1 | 0 | reviewed |
| deepseek-v4-flash/attention_pipeline.h:1422 | `odel#&1$@N@nano@S@Compute#I#` | 2 | 69 | 11 | 1 | 1 | reviewed |
| deepseek-v4-flash/attention_pipeline.h:1713 | `r>#I#$@N@std@S@allocator>#I#` | 2 | 23 | 2 | 1 | 0 | reviewed |
| deepseek-v4-flash/dsv4_ffn.h:117 | `Weights#&1$@S@llama_model#i#` | 4 | 30 | 12 | 2 | 0 | reviewed |
| deepseek-v4-flash/ffn_service.h:78 | `nd#$@N@std@S@allocator>#S6_#` | 2 | 14 | 5 | 1 | 0 | reviewed |
| deepseek-v4-flash/ffn_service.h:159 | `@nano@S@ValidatedFfnRequest#` | 2 | 65 | 6 | 1 | 2 | reviewed |
| deepseek-v4-flash/ffn_service.h:483 | `S@Compute#&1$@S@llama_model#` | 12 | 96 | 11 | 1 | 0 | reviewed |
| deepseek-v4-flash/ffn_service.h:560 | `@nano@S@ValidatedFfnRequest#` | 2 | 17 | 1 | 1 | 0 | reviewed |
| deepseek-v4-flash/ffn_service.h:568 | `@nano@S@ValidatedFfnRequest#` | 3 | 87 | 8 | 1 | 0 | reviewed |
| deepseek-v4-flash/ffn_service.h:583 | `td@S@allocator>#f#&1t0.0# #1` | 2 | 20 | 0 | 1 | 0 | reviewed |
| deepseek-v4-flash/ffn_service.h:670 | `c:@N@nano@S@FfnServer@F@run#` | 4 | 53 | 5 | 2 | 1 | reviewed |
| minicpm-v-4_7/cli.cpp:113 | `nicpm@F@parse_options#I#**C#` | 4 | 280 | 32 | 7 | 32 | reviewed |
| minicpm-v-4_7/cli.cpp:239 | `r>#I#$@N@std@S@allocator>#I#` | 6 | 85 | 0 | 1 | 0 | reviewed |
| minicpm-v-4_7/cli.cpp:259 | `t#*1$@S@mtmd_input_chunks#l#` | 6 | 115 | 15 | 3 | 3 | reviewed |
| minicpm-v-4_7/cli.cpp:298 | `$@N@minicpm@S@BatchState#l#1` | 3 | 84 | 2 | 1 | 0 | reviewed |
| minicpm-v-4_7/cli.cpp:457 | `_#$@N@std@S@allocator>#S14_#` | 2 | 16 | 0 | 1 | 0 | reviewed |
| minicpm-v-4_7/cli.cpp:518 | `_#$@N@std@S@allocator>#S14_#` | 10 | 61 | 11 | 3 | 2 | reviewed |
| minicpm-v-4_7/cli.cpp:572 | `_#$@N@std@S@allocator>#S14_#` | 3 | 4 | 0 | 1 | 0 | reviewed |
| minicpm-v-4_7/cli.cpp:689 | `c:@F@main#I#**C#` | 1 | 122 | 9 | 1 | 4 | reviewed |
| minicpm-v-4_7/expert_index.h:116 | `filesystem@N@__cxx11@S@path#` | 6 | 542 | 20 | 2 | 8 | mechanical |
| minicpm-v-4_7/expert_io.h:105 | `ex#$@N@minicpm@E@ExpertIo#b#` | 4 | 28 | 0 | 2 | 2 | reviewed |
| minicpm-v-4_7/expert_io.h:198 | `@F@positional_read#I#l#*C#l#` | 2 | 64 | 12 | 4 | 4 | reviewed |
| minicpm-v-4_7/expert_io.h:282 | `#$@N@minicpm@S@ExpertKey#*C#` | 16 | 134 | 0 | 2 | 0 | reviewed |
| minicpm-v-4_7/expert_io.h:505 | `pm@S@SharedStagedCompletion#` | 2 | 34 | 2 | 2 | 0 | reviewed |
| minicpm-v-4_7/expert_io.h:535 | `cpm@S@CacheStagedCompletion#` | 2 | 34 | 2 | 2 | 0 | reviewed |
| minicpm-v-4_7/expert_io.h:614 | `es#&1$@N@minicpm@S@CopyTask#` | 2 | 20 | 0 | 2 | 0 | reviewed |
| minicpm-v-4_7/expert_io.h:763 | `@N@minicpm@S@SharedHostRead#` | 8 | 87 | 5 | 2 | 0 | reviewed |
| minicpm-v-4_7/expert_io.h:788 | `@minicpm@S@SharedStagedRead#` | 8 | 89 | 7 | 2 | 0 | reviewed |
| minicpm-v-4_7/expert_io.h:811 | `$@N@minicpm@S@CacheHostRead#` | 8 | 87 | 5 | 2 | 0 | reviewed |
| minicpm-v-4_7/expert_io.h:832 | `N@minicpm@S@CacheStagedRead#` | 8 | 89 | 7 | 2 | 0 | reviewed |
| minicpm-v-4_7/expert_io.h:883 | `S@IoQueue#@Sa@F@operator()#1` | 2 | 36 | 10 | 2 | 2 | reviewed |
| minicpm-v-4_7/expert_io.h:919 | `minicpm@S@IoPool@F@IoPool#l#` | 4 | 8 | 0 | 2 | 0 | reviewed |
| minicpm-v-4_7/expert_io.h:946 | `sk#$@N@std@S@allocator>#S4_#` | 2 | 14 | 1 | 2 | 0 | reviewed |
| minicpm-v-4_7/experts.h:353 | `or>#l#$@N@std@S@optional>#i#` | 4 | 178 | 0 | 6 | 4 | reviewed |
| minicpm-v-4_7/experts.h:407 | `r>#I#$@N@std@S@allocator>#I#` | 12 | 110 | 16 | 4 | 2 | reviewed |
| minicpm-v-4_7/experts.h:469 | `r>#l#$@N@std@S@allocator>#l#` | 16 | 222 | 26 | 2 | 4 | reviewed |
| minicpm-v-4_7/experts.h:565 | `r>#I#$@N@std@S@allocator>#I#` | 8 | 100 | 12 | 4 | 2 | reviewed |
| minicpm-v-4_7/experts.h:645 | `#l#$@N@std@S@allocator>#l#l#` | 4 | 22 | 2 | 2 | 0 | reviewed |
| minicpm-v-4_7/experts.h:690 | `@path#l#i#@Sa@F@operator()#1` | 6 | 90 | 6 | 4 | 4 | reviewed |
| minicpm-v-4_7/experts.h:728 | `#I#$@N@std@S@allocator>#S4_#` | 2 | 19 | 0 | 2 | 0 | reviewed |
| minicpm-v-4_7/experts.h:729 | `Toperator()#*t0.0#&1t0.1# #1` | 4 | 62 | 0 | 2 | 0 | reviewed |
| minicpm-v-4_7/experts.h:756 | `#I#$@N@std@S@allocator>#S5_#` | 16 | 330 | 18 | 2 | 2 | reviewed |
| minicpm-v-4_7/experts.h:780 | `0_#S2_#S3_#@S@Prewarming#l#1` | 8 | 56 | 8 | 2 | 0 | reviewed |
| minicpm-v-4_7/ffn.h:77 | `r>#I#$@N@std@S@allocator>#I#` | 16 | 166 | 22 | 2 | 2 | reviewed |
| minicpm-v-4_7/ffn.h:137 | `py#$@N@std@S@allocator>#S5_#` | 2 | 22 | 4 | 2 | 0 | reviewed |
| minicpm-v-4_7/ffn.h:174 | `r>#I#$@N@std@S@allocator>#I#` | 12 | 272 | 18 | 2 | 4 | reviewed |
| minicpm-v-4_7/ffn.h:211 | `r>#I#$@N@std@S@allocator>#I#` | 2 | 22 | 4 | 2 | 0 | reviewed |
| minicpm-v-4_7/ffn.h:225 | `r>#I#$@N@std@S@allocator>#I#` | 2 | 6 | 0 | 2 | 0 | reviewed |
| minicpm-v-4_7/ffn.h:426 | `S4_#S4_#S4_#S4_#S4_#S4_#S4_#` | 4 | 30 | 12 | 2 | 0 | reviewed |
| minicpm-v-4_7/model.h:147 | `#$@N@minicpm@E@LanguageLoad#` | 4 | 142 | 0 | 2 | 0 | mechanical |
| minicpm-v-4_7/model.h:245 | `#$@N@minicpm@E@LanguageLoad#` | 8 | 420 | 104 | 12 | 22 | mechanical |
| minicpm-v-4_7/model.h:313 | `@S@allocator>#S7_#&1t0.0# #1` | 4 | 46 | 0 | 2 | 0 | mechanical |
| minicpm-v-4_7/model.h:361 | `#$@N@minicpm@E@LanguageLoad#` | 8 | 420 | 104 | 12 | 22 | mechanical |
| minicpm-v-4_7/pipeline.h:719 | `GraphKey#1@Sa@F@operator()#1` | 12 | 200 | 28 | 2 | 0 | reviewed |
| minicpm-v-4_7/pipeline.h:866 | `N@minicpm@E@ExecutionPhase#1` | 16 | 1298 | 148 | 2 | 34 | reviewed |
| minicpm-v-4_7/pipeline.h:866 | `N@minicpm@E@ExecutionPhase#1` | 16 | 1298 | 148 | 2 | 34 | reviewed |
| minicpm-v-4_7/pipeline.h:866 | `e#$@N@minicpm@S@BatchState#1` | 16 | 1173 | 154 | 2 | 34 | reviewed |
| minicpm-v-4_7/tests/local_test.cpp:35 | `@N@__cxx11@S@path#S0_#S0_#I#` | 2 | 41 | 2 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:43 | `$@N@std@S@allocator>#c#v#I#1` | 2 | 47 | 1 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:71 | `$@N@std@S@allocator>#c#v#I#1` | 2 | 94 | 7 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:131 | `filesystem@N@__cxx11@S@path#` | 2 | 3 | 1 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:207 | `#&1$@N@minicpm@S@LesConfig#1` | 2 | 76 | 8 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:314 | `filesystem@N@__cxx11@S@path#` | 2 | 17 | 1 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:399 | `&1$@N@minicpm@S@ExpertIndex#` | 2 | 368 | 19 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:716 | `r()#$@N@minicpm@E@ExpertIo#1` | 2 | 161 | 16 | 1 | 1 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:807 | `rtIndex#@Sa@F@operator()#b#1` | 2 | 119 | 7 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:864 | `r()#$@N@minicpm@E@ExpertIo#1` | 2 | 216 | 11 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:999 | `FT@>1#Toperator()#&1t0.0# #1` | 4 | 99 | 10 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:1208 | `xx11@S@path#$@E@ggml_type#I#` | 2 | 113 | 10 | 1 | 0 | mechanical |
| minicpm-v-4_7/tests/local_test.cpp:1395 | `c:@F@main#I#**C#` | 1 | 5 | 1 | 1 | 1 | mechanical |
| shared/ffn_rpc.h:57 | `odel_info#&1$@S@llama_model#` | 8 | 40 | 0 | 2 | 0 | mechanical |
| shared/ffn_rpc.h:64 | `odel_info#&1$@S@llama_model#` | 8 | 40 | 0 | 2 | 0 | mechanical |
| shared/ffn_rpc.h:74 | `odel_info#&1$@S@llama_model#` | 4 | 12 | 0 | 2 | 0 | mechanical |
| shared/model_loader.cpp:48 | `l_loading@F@open_shards#*1C#` | 3 | 6 | 1 | 1 | 0 | mechanical |
| shared/model_loader.cpp:59 | `l_loading@F@open_shards#*1C#` | 3 | 49 | 3 | 1 | 2 | mechanical |
| shared/model_loader.cpp:81 | `rd#$@N@std@S@allocator>#S2_#` | 3 | 29 | 1 | 1 | 0 | mechanical |
| shared/model_loader.cpp:85 | `FT@>1#Toperator()#t0.0#l# #1` | 2 | 12 | 0 | 1 | 1 | mechanical |
| shared/model_loader.cpp:110 | `ht_blocks#&1$@S@llama_model#` | 5 | 10 | 1 | 1 | 1 | mechanical |
| shared/model_loader.cpp:120 | `ht_blocks#&1$@S@llama_model#` | 5 | 10 | 1 | 1 | 1 | mechanical |
| shared/model_loader.cpp:216 | `#*1C#I#$@N@nano@E@ModelRole#` | 2 | 28 | 5 | 1 | 1 | mechanical |
| shared/tests/tiny_qwen35moe.h:46 | `tiny_model#S0_#S1_#@E@Init#1` | 2 | 4 | 0 | 1 | 0 | mechanical |
