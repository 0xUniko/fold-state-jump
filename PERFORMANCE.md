> Follow-up investigation (2026-10-23): validated memory/disk caching and event-driven
> prewarm are measured in [the investigation report](docs/performance-investigation.md).
> The older 60-second/global-invalidation cache described below is the baseline
> for that follow-up, not the current cache policy. See also [cache design](docs/cache-design.md).

# Performance measurements

Measured locally on 2026-10-22 with Bun 1.4.3 and the Release extractor linked
against LLVM/Clang 23. The baseline is the project before this optimization pass.
Inputs and result assertions are shared between baseline and current runs.
These measurements describe specific workloads, rather than guaranteed latency.

## Native extraction

`bun run bench:native --baseline /path/to/baseline-extractor` generates 3,000
functions using a small state struct and includes `<vector>`. Five runs per
binary, with no other benchmark running:

| Metric | Baseline | Current |
| --- | ---: | ---: |
| Median extraction | 1,233.77 ms | 259.97 ms |
| Maximum process RSS | 1,399.5 MiB | 85.4 MiB |
| Output JSON | 14,010,549 bytes | 14,010,549 bytes |

This workload is **4.75 times faster**, with **93.9% lower peak RSS**. JSON
comparison checks every field and array position, normalizing declaration
addresses while preserving their reference relationships. Streaming JSON avoids
retaining thousands of JSON hash tables alongside Clang's own AST; normalized
file paths are also reused.

On the real `nano-infer/minicpm-v-4_7/pipeline.h` translation unit, the extracted
JSON is 5,685,272 bytes. Two runs of each binary, ordered baseline/current/current/
baseline, gave mean native extraction times of **13.38 s → 12.55 s** (about 6.2%
less time). Its complete normalized JSON contract also matched. Template parsing
dominates this workload, so streaming serialization has a smaller effect on total
latency than it does in the synthetic workload. Parsing remains nonincremental.

## Prepared analysis

`bun run bench:analysis` isolates four expensive analysis patterns. Each query
checks its target, with 100 warmups followed by 200 timed repetitions. The first
three cases contain 20,000 operations; the fourth has 2,000 reference aliases.

| Query | Baseline average | Current average |
| --- | ---: | ---: |
| State read after unrelated writes | 210.96 µs | 4.84 µs |
| Historical cursor before most writes | 983.36 µs | 2.46 µs |
| Most recent helper invocation | 813.43 µs | 6.38 µs |
| Origin through reference aliases | 12,638.18 µs | 15.24 µs |

Writes are indexed by function and root variable. Binary search excludes future
operations, and balanced short-circuit searches stop after the first applicable
write or helper invocation. Function ownership and valid alias normalization are
prepared once. Cyclic legacy aliases retain query-specific cycle handling.

Additional indexes can cost time and memory during preparation. In these runs,
the first three cases took roughly 34–46 ms to prepare, versus 34–39 ms before;
the alias case took about 7 ms versus 4 ms. The benefits are largest for repeated
queries in large functions and long alias chains.

For the real `pipeline.h` AST, **all 3,602 mutation/origin results at 1,801 distinct
cursor positions matched**, including targets, candidate order and call frames.
The initial whole-file query pass took 72.20 ms before and 65.48 ms after. Five
warm passes had median totals of 37.40 ms before and 34.14 ms after. Small-file
and typical-query differences are much smaller than the stress-case gains and
vary with JIT and garbage collection.

## Compilation databases and editor cache

`bun run bench:services` creates a 20,000-entry database (3,366,671 UTF-8 bytes).
Seventeen repetitions discard the first two and report the median of the rest:

| Database resolution | Baseline | Current |
| --- | ---: | ---: |
| Unchanged database, exact source | 15.909 ms | 0.182 ms |
| Unchanged database, inferred header | 32.858 ms | 0.300 ms |
| Cold database, exact source | 15.356 ms | 19.486 ms |
| Cold database, inferred header | 32.528 ms | 33.236 ms |

The explicit cache checks filesystem metadata before reusing decoded data and
path indexes. Header proximity indexes are built on demand. Index construction
adds a small cold cost that subsequent lookups amortize. Cache limits are eight
databases and 16 MiB of UTF-16 input size, with additional decoded object overhead.

The editor retains up to three prepared translation units in LRU order, within
a combined 16 MiB serialized-AST budget. One larger translation unit is retained
alone. Decoded ASTs and indexes require additional memory. Entries expire after
60 seconds and workspace source/configuration changes invalidate them.
Concurrent cold requests are serialized and recheck the cache, so requests for
the same document share one extraction. Warm requests bypass that queue.

Ten cache tests cover document versions, expiry, eviction, byte budgets,
invalidation during extraction, concurrent reuse, queued cancellation and permit
release after failure/cancellation. The two commands keep independent cursor
snapshots while sharing prepared indexes.

Minification reduces the current extension bundle from approximately 234 kB to
111 kB; external source maps remain available.

## Reproduction and verification

```sh
bun test
bun run build:native
bun run build
bun run bench:native --baseline /path/to/baseline-extractor
bun run bench:analysis /path/to/baseline-analysis.ts 200
bun run bench:analysis ../src/analysis 200
bun run bench:services /path/to/baseline-services.ts 17
bun run bench:services ../src/services 17
bun test/compare-analysis.ts /path/to/ast.json /path/to/source.cpp /path/to/baseline-analysis.ts
bun test/project-integration.ts /path/to/nano-infer
```

Keep baseline modules where their package imports can resolve. The native
benchmark requires Python 3 and GNU `time`. Run performance comparisons
sequentially to avoid CPU and memory contention.

Validation passed: 105 automated tests, TypeScript `--noEmit`, the Release native
build, native JSON comparisons for both native fixtures and the synthetic input,
the real-project JSON/result comparisons above, and 25 specified jump targets
across `ffn.h`, `experts.h` and `pipeline.h`.
