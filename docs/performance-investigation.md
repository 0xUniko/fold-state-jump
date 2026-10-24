# First-round cache measurements, 2026-10-23

These are the final historical measurements for the first validated-cache pass,
against baseline `01db4437f`. The [current results](performance-investigation-v2.md)
supersede cache location, capacity, restoration scheduling and validated-hit
latency. The [cache design](cache-design.md) describes the current behavior.
This record retains the real Clang prewarm, idle/edit and cold-parse measurements
which have independent value beyond the second-round service benchmarks.

Environment: Intel Core Ultra 5 125H, 18 exposed logical CPUs, WSL2
6.18.54.1-microsoft-standard-WSL2, 23 GiB RAM, 8 GiB swap, ext4, Bun 1.4.3 and
Release LLVM/Clang 23 LibTooling. Cache timings use Node 24.22.1 from the actual
VS Code server installation. Runs within each comparison were sequential.
OS page cache was warm; CPU frequency, temperature, GC and other host
applications were uncontrolled. P50/P95 use nearest rank; N=3/5 P95 is the
maximum sample, not a reliable production tail. These are service measurements,
excluding VS Code windows, UI rendering and extension startup imports.

## Final comparison

Native results use the Release extractor from `71a7dcbae`; final Node
cache/restart measurements include the kernel-policy fix `ececa3a96`.
Prewarm/edit measurements use the same ext4 fast path before the additional
old-kernel admission gate. The source is the real
`nano-infer/minicpm-v-4_7/pipeline.h` translation unit.

| Scenario | Baseline P50 / P95 ms | First-round final P50 / P95 ms | Samples and scope |
| --- | ---: | ---: | --- |
| Cold native process, output transfer included | 12,080.36 / 12,211.67 | 12,362.35 / 12,447.63 | 5 per binary |
| Resident AST, Node | 0.028 / 0.193, unchecked | 23.63 / 33.95, validated | 15 per implementation |
| Verified disk restore into fresh RAM service | Cold parse required | 98.13 / 126.86 | 15; validation, decode and indexes |
| Fresh Node process reading persisted AST | Cold parse required | 155.95 / 165.46 | 3 separate processes; imports excluded |
| Foreground after completed real Clang prewarm | No prewarm | 24.75 / 29.65 | 15; no native spawn |
| Foreground joins just-started real Clang prewarm | No prewarm | 12,783.93 / 12,981.42 | 3; exactly one extraction each |
| Warm foreground displaces another background TU | No prewarm | 26.42 | 1 cancellation; no orphan PID |
| 61-second idle then jump | TTL forces extraction | 23.64 | 1 real 61,000 ms wait |
| Create unrelated.cpp then jump | Global invalidation forces extraction | 23.73 | 1 real creation and targeted invalidation |
| Saved edit and rebuild | Not separately sampled | 12,526.64 / 13,130.77 | 3 isolated-copy edits; targets equal |

The idle/unrelated rows describe the regression-tested former policy, rather
than separate measured GUI distributions. The edit scenario starts Clang four
times: one initial load and three edits, with zero extra starts for idle age or
unrelated creation. Joining a just-started prewarm still incurs the cold wait.
The cold median is about 2.3% higher in this sample; no cold parsing speedup is
claimed. Small differences cannot be attributed confidently under these conditions.
Validated hits cost more than unchecked hits because they verify dependencies.
The second-round matched comparison should be used to evaluate subsequent
validated-hit improvements; its harness scope differs from this table.

Retained raw data: [cold baseline](measurements/baseline-pipeline.json),
[cold final](measurements/final-native-pipeline.json),
[unchecked memory baseline](measurements/node-baseline-cache.json),
[Node cache](measurements/final-node-cache.json),
[Node restart](measurements/final-node-restart.json),
[real Clang prewarm and cancellation](measurements/final-node-prewarm.json),
[idle, unrelated creation and rebuild](measurements/final-node-edit.json).

## Resources and correctness

Final native user/system CPU ranged 12.04–12.35 / 0.64–0.77 s. Peak RSS was
924,716 KiB (903.0 MiB), versus 923,220 KiB baseline. Selection took 17.8–26.5 ms
and compact serialization 34.9–44.8 ms; frontend parsing dominates. Recorded
block reads/writes were zero under warm OS cache, which does not imply zero
filesystem calls. Compact JSON remained 5,685,272 bytes and matched every
normalized baseline field and declaration-reference relationship.

Final Node memory-hit process CPU deltas had medians 17.72 ms user / 16.36 ms
system; disk-hit medians were 115.80 / 36.46 ms. These include runtime/GC work and
may exceed wall time because runtime threads overlap. End-of-loop RSS was
382.9 MiB with temporary ASTs and uncontrolled GC; it is not a steady extension
host bound. Independent single-load processes had RSS snapshots of
124.6–125.1 MiB. Native and host peaks were not observed simultaneously and must
not be added. Background parsing still requires substantial CPU and roughly
900 MiB native RSS; prewarm can be disabled.

The final proof was 633,922 bytes, covering 3,921 paths and 19 native runtime
images. One complete gzip snapshot occupied 919,551 bytes; the AST gzip payload
alone was 285,276 bytes. One write took 46.35 ms; isolated synchronous gzip/gunzip
probes took 27.63/8.08 ms. Production compression is asynchronous. Disk capacity
counts complete encoded entries; RAM budgets count raw AST bytes. Decoded nodes,
indexes and proof objects add memory beyond those budgets.

A separate [synthetic native comparison](measurements/final-native-synthetic.json),
N=3 without manifests, measured baseline/final medians of 261.07/256.01 ms and
peak RSS of 87,300/87,172 KiB with equal JSON contracts. The roughly 2% difference
is noise-scale and is not the cache optimization's benefit.

All [3,602 mutation/origin signatures](measurements/final-differential.txt) at
1,801 cursor positions matched, including candidate order and call frames.
All [25 real project targets](measurements/final-project.txt) passed: ffn 14,
experts 3, pipeline 8. The historical final unit suite passed 132 tests; native
build, bundle and TypeScript checks also passed. Current acceptance results are
recorded separately in the current report.

## Reproduction

Keep the baseline executable and modules in a temporary directory where their
normal Effect imports resolve. Machine-specific ASTs, manifests and binaries
stay outside Git. Run heavy comparisons sequentially with no overlapping build
or benchmark. Use the same source, options and runtime for each comparison.

```sh
bun run bench:investigation /path/to/pipeline.h /path/to/baseline-extractor 5
bun run bench:investigation /path/to/pipeline.h native/build/fold-state-jump-ast 5 true
bun run bench:cache /path/to/pipeline.h 15
bun test/prewarm-integration.ts /path/to/pipeline.h 3
bun test/edit-rebuild.ts /path/to/pipeline.h 3 --wait
bun test/restart-integration.ts write /path/to/pipeline.h /tmp/fsj-restart-cache
bun test/restart-integration.ts read /path/to/pipeline.h /tmp/fsj-restart-cache
bun test/project-integration.ts /path/to/nano-infer
bun test/compare-analysis.ts /tmp/ast.json /path/to/pipeline.h /path/to/baseline-analysis.ts
bun test/cache-baseline.ts /path/to/baseline-ast-cache.ts /tmp/ast.json /path/to/pipeline.h 15
bun run bench:native --baseline /path/to/baseline-extractor
```

For Node service timings, bundle the script and invoke the actual VS Code Node
binary; Bun and Node have different validation/event-loop costs. For example:

```sh
bun build test/cache-performance.ts --target=node --format=esm --outfile /tmp/fsj-cache-bench.mjs
/path/to/vscode/node /tmp/fsj-cache-bench.mjs /path/to/pipeline.h 15
```

The same bundling pattern applies to prewarm, edit and restart integrations.
The `--wait` case intentionally waits 61 seconds without polling or reparsing.
Real edit scenarios modify temporary copies with original options/include paths;
they do not modify nano-infer inputs.

## Research disposition and limits

PCH remains disabled. The [retained PCH V2 report and minimal PoC](pch-investigation-v2.md)
explain the earlier generic-lambda specialization enumeration differences and
preserve the complete reference graph and sampled query results. The missing
production dependency proof and artifact lifecycle remain separate follow-up
work. No semantic failure is inferred from that serialization-order difference.
Workers, concurrent native parsing and clangd integration remain unshipped.
Superseded prototypes, completed exploratory scripts and their transient data
were removed from the current tree; the original experiments remain recoverable
from historical commit `a6abeb80c`.

UI/Extension Host testing is outside these results. Windows/macOS, /mnt/c and
cold physical storage performance remain unmeasured. Filesystem validation is
not an atomic OS snapshot; current conservative platform/input rules and
process/disk ownership limits are documented in the cache design. No complete
incremental C++ parser, production latency SLA or zero-background-interference
claim is made.
