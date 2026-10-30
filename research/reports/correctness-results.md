# Correctness results: independent Oracle run

Oracle entries: 48

## Outcome counts

| outcome | count |
|---|---|
| mismatch | 26 |
| correct-conditional | 12 |
| correct-boundary | 5 |
| targets-found-kind-mismatch | 3 |
| correct-multiple | 2 |

Required-target recall: **46/119**
Strict target overlap (non-selected actual vs any Oracle target): **45/518**. Oracle target sets are not exhaustive, so this is a lower-bound overlap, not a precision estimate.

## Per-entry results

| id | expected | actual | status | required hit | boundaries |
|---|---|---|---|---|---|
| `minicpm.execute.seed.bank_state.origin` | Multiple | Multiple | mismatch | 3/5 | 44 |
| `minicpm.execute.seed.aggregate-field-mapping` | Exact | Multiple | mismatch | 1/2 | 46 |
| `minicpm.execute.lambda.bank_state.origin` | Conditional | Multiple | correct-conditional | 2/3 | 46 |
| `minicpm.execute.lambda.alias-binding` | Exact | Multiple | targets-found-kind-mismatch | 0/0 | 46 |
| `minicpm.execute.lambda.graph_reuses.history` | Conditional | Multiple | correct-conditional | 2/3 | 0 |
| `minicpm.execute.lambda.graph_builds.history` | Conditional | Multiple | correct-conditional | 2/3 | 0 |
| `minicpm.execute.plan-slots.origin` | Multiple | Boundary | mismatch | 0/3 | 1 |
| `minicpm.execute.begin_decode_prefetch.value-transfer` | Boundary | Boundary | correct-boundary | 0/2 | 1 |
| `minicpm.execute.pending.reset` | Conditional | Multiple | mismatch | 0/2 | 0 |
| `minicpm.execute.fold-result.bank_state` | Conditional | Multiple | correct-conditional | 1/3 | 50 |
| `minicpm.execute.return.batchstate-field-mapping` | Exact | Multiple | mismatch | 0/1 | 13 |
| `minicpm.execute.position.read` | Conditional | NoPriorMutation | mismatch | 1/2 | 0 |
| `minicpm.run_batch.rope_position.origin` | Multiple | Boundary | mismatch | 0/4 | 1 |
| `minicpm.clear_session.pending.guard` | Conditional | Multiple | correct-conditional | 1/2 | 38 |
| `minicpm.clear_session.bankstate.reconstruction` | Multiple | Multiple | correct-multiple | 1/1 | 38 |
| `minicpm.clear_session.buffer-content` | Boundary | NoPriorMutation | mismatch | 1/2 | 0 |
| `minicpm.plan_shared_decode.seed.slots` | Exact | Boundary | mismatch | 0/1 | 1 |
| `minicpm.plan_shared_decode.dynamic-index-write` | Boundary | Multiple | mismatch | 1/2 | 0 |
| `minicpm.plan_cache_decode.found.original-snapshot` | Exact | Boundary | mismatch | 1/3 | 1 |
| `minicpm.plan_cache_decode.misses.history` | Conditional | Multiple | correct-conditional | 3/4 | 0 |
| `minicpm.begin_prefetch.pending.aggregate` | Multiple | Multiple | correct-multiple | 0/0 | 60 |
| `minicpm.apply_prewarm.bankstate.return` | Exact | Boundary | targets-found-kind-mismatch | 1/1 | 3 |
| `minicpm.victim_slot.fold` | Conditional | Multiple | correct-conditional | 1/4 | 6 |
| `minicpm.record_frequency.element-write` | Boundary | NoPriorMutation | mismatch | 1/3 | 0 |
| `minicpm.expert_io.read_state.seed` | Exact | Boundary | targets-found-kind-mismatch | 1/1 | 1 |
| `minicpm.expert_io.async_completion` | Boundary | Boundary | correct-boundary | 1/2 | 1 |
| `minicpm.expert_io.finish_cache_ticket` | Boundary | Boundary | correct-boundary | 0/3 | 1 |
| `minicpm.cli.generation.seed` | Multiple | Boundary | mismatch | 0/2 | 1 |
| `minicpm.cli.generation.batch_state.update` | Conditional | Multiple | correct-conditional | 1/3 | 37 |
| `minicpm.cli.generation.text` | Conditional | NoPriorMutation | mismatch | 1/2 | 0 |
| `minicpm.cli.generation.decode_tokens` | Conditional | Multiple | correct-conditional | 2/2 | 0 |
| `minicpm.cli.prefill.batch_state.seed` | Multiple | Multiple | mismatch | 3/4 | 37 |
| `deepseek.attention.cache.origin` | Multiple | Multiple | mismatch | 1/3 | 17 |
| `deepseek.attention.position.origin` | Conditional | Multiple | correct-conditional | 2/3 | 15 |
| `deepseek.attention.hidden.seed` | Exact | Boundary | mismatch | 0/2 | 1 |
| `deepseek.attention.ffn-return` | Boundary | Boundary | correct-boundary | 2/2 | 1 |
| `deepseek.generation.current.origin` | Conditional | Multiple | correct-conditional | 2/3 | 9 |
| `deepseek.generation.next-state.origin` | Conditional | Boundary | correct-conditional | 1/3 | 1 |
| `deepseek.generation.finished.origin` | NoPriorMutation | Boundary | mismatch | 1/2 | 1 |
| `deepseek.ffn.server.state-fold` | Conditional | Boundary | mismatch | 0/2 | 1 |
| `deepseek.ffn.runtime.bank-growth` | Conditional | NoPriorMutation | mismatch | 1/3 | 0 |
| `deepseek.ffn.prefill-cache-eviction` | Conditional | Exact | mismatch | 2/3 | 0 |
| `deepseek.ffn.execute.groups` | Boundary | Boundary | correct-boundary | 0/3 | 1 |
| `deepseek.dsv4.routed.pure-graph` | Unsupported | NoPriorMutation | mismatch | 1/3 | 0 |
| `minicpm.start_session.caches` | Exact | Boundary | mismatch | 0/3 | 1 |
| `minicpm.start_session.bank_state` | Exact | Boundary | mismatch | 0/3 | 1 |
| `minicpm.graph_cache.tick.recurrence` | Conditional | Exact | mismatch | 0/2 | 0 |
| `minicpm.ffn.retaining.pointer-fold` | Exact | NoPriorMutation | mismatch | 1/4 | 0 |

## Interpretation

`correct-exact` requires the prototype's result kind to be Exact and every required Oracle target to be present. `correct-multiple` allows an additional Conditional classification, reflecting loop/dynamic selection. `correct-conditional` requires at least one required target. Boundary cases are counted only when the prototype stops with an explicit boundary.

A nonzero mismatch count is a real prototype limitation, not a skipped test. The Oracle was authored independently and was not edited to match this output.
