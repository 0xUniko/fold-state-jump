# Correctness results: TypeScript state-trace engine

Oracle entries: **48**; research trace budget: **6000 steps** per query (editor default: 1200).

## Outcome counts

| outcome | count |
|---|---|
| mismatch | 2 |
| correct-conditional | 20 |
| correct-multiple | 14 |
| correct-boundary | 8 |
| targets-found-kind-mismatch | 2 |
| correct-no-prior | 1 |
| unsupported-observed | 1 |

Required-target recall: **90/119**

## Per-entry results

| id | expected | actual | status | required | missing lines |
|---|---|---|---|---|---|
| `minicpm.execute.seed.bank_state.origin` | Multiple | Multiple | mismatch | 4/5 | 1299 |
| `minicpm.execute.seed.aggregate-field-mapping` | Conditional | Multiple | correct-conditional | 2/2 |  |
| `minicpm.execute.lambda.bank_state.origin` | Conditional | Multiple | correct-conditional | 3/3 |  |
| `minicpm.execute.lambda.alias-binding` | Multiple | Multiple | correct-multiple | 1/1 |  |
| `minicpm.execute.lambda.graph_reuses.history` | Conditional | Multiple | correct-conditional | 3/4 | 1299 |
| `minicpm.execute.lambda.graph_builds.history` | Conditional | Multiple | correct-conditional | 3/4 | 1299 |
| `minicpm.execute.plan-slots.origin` | Multiple | Multiple | correct-multiple | 1/1 |  |
| `minicpm.execute.begin_decode_prefetch.value-transfer` | Boundary | Multiple | correct-boundary | 1/2 | 1148 |
| `minicpm.execute.pending.reset` | Conditional | Multiple | correct-conditional | 2/2 |  |
| `minicpm.execute.fold-result.bank_state` | Conditional | Multiple | correct-conditional | 3/3 |  |
| `minicpm.execute.return.batchstate-field-mapping` | Multiple | Multiple | correct-multiple | 1/1 |  |
| `minicpm.execute.position.read` | Conditional | Multiple | correct-conditional | 2/2 |  |
| `minicpm.run_batch.rope_position.origin` | Multiple | Multiple | mismatch | 3/4 | 294 |
| `minicpm.clear_session.pending.guard` | Conditional | Multiple | correct-conditional | 2/2 |  |
| `minicpm.clear_session.bankstate.reconstruction` | Multiple | Multiple | correct-multiple | 1/1 |  |
| `minicpm.clear_session.buffer-content` | Boundary | Boundary | correct-boundary | 1/2 | 1289 |
| `minicpm.plan_shared_decode.seed.slots` | Multiple | Multiple | correct-multiple | 1/1 |  |
| `minicpm.plan_shared_decode.dynamic-index-write` | Boundary | Multiple | correct-boundary | 1/2 | 411 |
| `minicpm.plan_cache_decode.found.original-snapshot` | Multiple | Multiple | correct-multiple | 2/2 |  |
| `minicpm.plan_cache_decode.misses.history` | Conditional | Multiple | correct-conditional | 3/4 | 492 |
| `minicpm.begin_prefetch.pending.aggregate` | Multiple | Multiple | correct-multiple | 0/0 |  |
| `minicpm.apply_prewarm.bankstate.return` | Multiple | Multiple | correct-multiple | 1/1 |  |
| `minicpm.victim_slot.fold` | Conditional | Multiple | correct-conditional | 1/4 | 355,356,363 |
| `minicpm.record_frequency.element-write` | Boundary | Multiple | correct-boundary | 1/3 | 223,227 |
| `minicpm.expert_io.read_state.seed` | Multiple | Multiple | correct-multiple | 1/1 |  |
| `minicpm.expert_io.async_completion` | Boundary | Boundary | correct-boundary | 1/2 | 770 |
| `minicpm.expert_io.finish_cache_ticket` | Boundary | Multiple | correct-boundary | 1/3 | 246,588 |
| `minicpm.cli.generation.seed` | Multiple | Multiple | correct-multiple | 2/2 |  |
| `minicpm.cli.generation.batch_state.update` | Conditional | Multiple | correct-conditional | 2/3 | 543 |
| `minicpm.cli.generation.text` | Conditional | Multiple | correct-conditional | 2/2 |  |
| `minicpm.cli.generation.decode_tokens` | Conditional | Multiple | correct-conditional | 2/2 |  |
| `minicpm.cli.prefill.batch_state.seed` | Multiple | Multiple | correct-multiple | 4/4 |  |
| `deepseek.attention.cache.origin` | Multiple | Multiple | correct-multiple | 3/3 |  |
| `deepseek.attention.position.origin` | Conditional | Multiple | correct-conditional | 2/3 | 1692 |
| `deepseek.attention.hidden.seed` | Exact | Multiple | targets-found-kind-mismatch | 2/2 |  |
| `deepseek.attention.ffn-return` | Boundary | Conditional | correct-boundary | 1/2 | 1722 |
| `deepseek.generation.current.origin` | Conditional | Multiple | correct-conditional | 2/3 | 62 |
| `deepseek.generation.next-state.origin` | Conditional | Multiple | correct-conditional | 1/3 | 65,1731 |
| `deepseek.generation.finished.origin` | NoPriorMutation | NoPriorMutation | correct-no-prior | 2/2 |  |
| `deepseek.ffn.server.state-fold` | Conditional | Multiple | correct-conditional | 1/2 | 680 |
| `deepseek.ffn.runtime.bank-growth` | Conditional | Multiple | correct-conditional | 2/3 | 471 |
| `deepseek.ffn.prefill-cache-eviction` | Conditional | Multiple | correct-conditional | 2/3 | 466 |
| `deepseek.ffn.execute.groups` | Boundary | Multiple | correct-boundary | 1/3 | 561,562 |
| `deepseek.dsv4.routed.pure-graph` | Unsupported | Boundary | unsupported-observed | 1/3 | 119,121 |
| `minicpm.start_session.caches` | Exact | Multiple | targets-found-kind-mismatch | 3/3 |  |
| `minicpm.start_session.bank_state` | Multiple | Multiple | correct-multiple | 3/3 |  |
| `minicpm.graph_cache.tick.recurrence` | Conditional | Multiple | correct-conditional | 2/2 |  |
| `minicpm.ffn.retaining.pointer-fold` | Multiple | Multiple | correct-multiple | 4/4 |  |

## Honest interpretation

The TypeScript engine is the production-path engine; its native frontend is `state-inventory`. Fold-first-iteration guards, call/return field edges, parameter declaration locations, lambda captures, address-of pointee identity and standard-algorithm lambda results are modeled generically. Two required targets remain missing: `clear_session` state installed through the interactive line loop, and the image-path read of `SessionState.rope_position`. Two entries return Multiple/Conditional where the Oracle expected Exact, because the engine keeps several concrete activation/provenance contexts instead of collapsing them. A nonzero mismatch is a real limitation; Boundary results are not counted as successful navigation.
