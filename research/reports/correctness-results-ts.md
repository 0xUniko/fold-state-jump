# Correctness results: TypeScript state-trace engine

Oracle entries: **48**

## Outcome counts

| outcome | count |
|---|---|
| mismatch | 20 |
| targets-found-kind-mismatch | 3 |
| correct-conditional | 14 |
| correct-boundary | 8 |
| correct-multiple | 2 |
| unsupported-observed | 1 |

Required-target recall: **42/121**

## Per-entry results

| id | expected | actual | status | required | missing lines |
|---|---|---|---|---|---|
| `minicpm.execute.seed.bank_state.origin` | Multiple | Multiple | mismatch | 1/5 | 814,1332,1280,1299 |
| `minicpm.execute.seed.aggregate-field-mapping` | Exact | Multiple | targets-found-kind-mismatch | 2/2 |  |
| `minicpm.execute.lambda.bank_state.origin` | Conditional | Multiple | correct-conditional | 3/3 |  |
| `minicpm.execute.lambda.alias-binding` | Exact | Multiple | targets-found-kind-mismatch | 0/0 |  |
| `minicpm.execute.lambda.graph_reuses.history` | Conditional | Multiple | correct-conditional | 1/4 | 1209,1280,1299 |
| `minicpm.execute.lambda.graph_builds.history` | Conditional | Multiple | correct-conditional | 1/4 | 1209,1280,1299 |
| `minicpm.execute.plan-slots.origin` | Multiple | Multiple | mismatch | 0/3 | 424,54,501 |
| `minicpm.execute.begin_decode_prefetch.value-transfer` | Boundary | Multiple | correct-boundary | 0/2 | 616,1148 |
| `minicpm.execute.pending.reset` | Conditional | Multiple | mismatch | 0/2 | 601,1090 |
| `minicpm.execute.fold-result.bank_state` | Conditional | Multiple | correct-conditional | 1/3 | 869,1081 |
| `minicpm.execute.return.batchstate-field-mapping` | Exact | Boundary | mismatch | 0/1 | 1188 |
| `minicpm.execute.position.read` | Conditional | Multiple | mismatch | 0/2 | 814,1209 |
| `minicpm.run_batch.rope_position.origin` | Multiple | Boundary | mismatch | 0/4 | 1332,1280,1209,294 |
| `minicpm.clear_session.pending.guard` | Conditional | Multiple | mismatch | 0/2 | 1285,601 |
| `minicpm.clear_session.bankstate.reconstruction` | Multiple | Multiple | correct-multiple | 1/1 |  |
| `minicpm.clear_session.buffer-content` | Boundary | Boundary | correct-boundary | 1/2 | 1289 |
| `minicpm.plan_shared_decode.seed.slots` | Exact | Multiple | mismatch | 0/1 | 390 |
| `minicpm.plan_shared_decode.dynamic-index-write` | Boundary | Multiple | correct-boundary | 1/2 | 411 |
| `minicpm.plan_cache_decode.found.original-snapshot` | Exact | Boundary | mismatch | 1/3 | 442,470 |
| `minicpm.plan_cache_decode.misses.history` | Conditional | Multiple | correct-conditional | 3/4 | 492 |
| `minicpm.begin_prefetch.pending.aggregate` | Multiple | Multiple | correct-multiple | 0/0 |  |
| `minicpm.apply_prewarm.bankstate.return` | Exact | Boundary | mismatch | 0/1 | 743 |
| `minicpm.victim_slot.fold` | Conditional | Boundary | correct-conditional | 1/4 | 355,356,363 |
| `minicpm.record_frequency.element-write` | Boundary | Boundary | correct-boundary | 1/3 | 223,227 |
| `minicpm.expert_io.read_state.seed` | Exact | Multiple | targets-found-kind-mismatch | 1/1 |  |
| `minicpm.expert_io.async_completion` | Boundary | Boundary | correct-boundary | 1/2 | 770 |
| `minicpm.expert_io.finish_cache_ticket` | Boundary | Boundary | correct-boundary | 0/3 | 246,588,523 |
| `minicpm.cli.generation.seed` | Multiple | Multiple | mismatch | 0/2 | 510,543 |
| `minicpm.cli.generation.batch_state.update` | Conditional | Multiple | correct-conditional | 1/3 | 543,544 |
| `minicpm.cli.generation.text` | Conditional | Multiple | correct-conditional | 2/2 |  |
| `minicpm.cli.generation.decode_tokens` | Conditional | Multiple | correct-conditional | 2/2 |  |
| `minicpm.cli.prefill.batch_state.seed` | Multiple | Multiple | mismatch | 2/4 | 255,325 |
| `deepseek.attention.cache.origin` | Multiple | Multiple | mismatch | 0/3 | 1683,1677,1470 |
| `deepseek.attention.position.origin` | Conditional | Multiple | correct-conditional | 1/3 | 1683,1692 |
| `deepseek.attention.hidden.seed` | Exact | Boundary | mismatch | 1/2 | 1594 |
| `deepseek.attention.ffn-return` | Boundary | Boundary | correct-boundary | 2/2 |  |
| `deepseek.generation.current.origin` | Conditional | Multiple | correct-conditional | 2/3 | 62 |
| `deepseek.generation.next-state.origin` | Conditional | Boundary | correct-conditional | 1/3 | 65,1731 |
| `deepseek.generation.finished.origin` | NoPriorMutation | Boundary | mismatch | 1/2 | 61 |
| `deepseek.ffn.server.state-fold` | Conditional | Boundary | mismatch | 0/2 | 674,680 |
| `deepseek.ffn.runtime.bank-growth` | Conditional | Multiple | correct-conditional | 2/3 | 471 |
| `deepseek.ffn.prefill-cache-eviction` | Conditional | Multiple | correct-conditional | 2/3 | 466 |
| `deepseek.ffn.execute.groups` | Boundary | Boundary | correct-boundary | 0/3 | 561,562,563 |
| `deepseek.dsv4.routed.pure-graph` | Unsupported | Boundary | unsupported-observed | 1/3 | 119,121 |
| `minicpm.start_session.caches` | Exact | Boundary | mismatch | 0/3 | 1249,1252,1280 |
| `minicpm.start_session.bank_state` | Exact | Multiple | mismatch | 1/3 | 1277,742 |
| `minicpm.graph_cache.tick.recurrence` | Conditional | Multiple | mismatch | 0/2 | 869,1209 |
| `minicpm.ffn.retaining.pointer-fold` | Exact | Multiple | mismatch | 1/4 | 169,199,200 |

## Honest interpretation

The TypeScript engine is the production-path engine; its native frontend is `state-inventory`. Fold-first-iteration guards and parameter propagation are improved, but aggregate returns, resource/async effects, ranges pipelines and some cross-function summaries remain incomplete. A nonzero mismatch is a real limitation; Boundary results are not counted as successful navigation.
