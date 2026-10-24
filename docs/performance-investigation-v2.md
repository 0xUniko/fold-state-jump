# Second performance investigation, completed 2026-10-24

Base `a6abeb80c`, branch `perf/validated-cache-prewarm`. The
[Cache V2 design](cache-design.md),
[project selection](cache-location-v2.md), [validator profiling](validation-performance-v2.md)
and [PCH investigation](pch-investigation-v2.md) describe the separate decisions.

## Delivered behavior

Production now stores ASTs in `<project>/.cache/fold-state-jump/ast`, with the
specified generated `.gitignore` in its parent. Nearest Git/nested Git/worktree
root wins, then the longest containing workspace, then source directory. Cwd and
build directories are never cache owners. Custom bases and global fallbacks
isolate canonical project roots by SHA-256. If persistence is unavailable,
analysis and bounded RAM reuse continue. Root `.gitignore` and `.git/info/exclude`
are untouched. Real nano-infer cache contents produced no `git status` entries.

The cumulative SSD quota defaults to zero/unlimited. Positive opt-in quotas
retain LRU; their configuration has no arbitrary cumulative maximum. The 64 MiB
default single-AST limit, native stdout bounds, gzip decompression bounds,
checksums, dependency validation and atomic rename remain. Old global `ast-v2`
snapshots are never read/migrated and cannot create a wrong hit; they remain for
manual removal. An identity retains its latest valid snapshot; source-version
history is not a versioned archive. Other valid context snapshots have no
capacity-driven deletion by default. RAM remains three entries / 16 MiB of raw
serialized input with one oversized entry allowed alone.

Dependency edit/save events propagate to known active TUs. Eight recent path
relationships survive AST invalidation, so successive edits and eventual save
still schedule the correct TU. Dirty dependencies prevent background parsing;
in-flight related jobs are cancelled. Negative include ancestors are handled,
unrelated source events retain memory and schedule nothing, and debounce keys
include source revision. A returning active TU clears another editor's pending
timer. Unknown in-flight dependencies still reject an observed conflicting edit
once their proof becomes known; watcher notifications never establish validity.

Disk restores own per-request-key permits and bypass the native semaphore.
Native work remains single-concurrency. Single-flight, independent foreground
waiter cancellation, promotion, revision checks and child reaping remain explicit.
Maintenance closes admission before awaiting anything, drains jobs/native
children and actual writes, and clears the selected project's entries. Removing
cache data is distinct from invalidating changed inputs, preserving other
projects' valid RAM data even if they include the cleared project's source.
Concurrent clears serialize; failure reopens admission. The canonical per-project
global fallback is also cleared, even if created in a previous session. Unknown
historical custom paths and the old unscoped global cache are not searched.

Validated RAM hits inspect every guard, including external/system files and
mapped Clang/LLVM runtime images. Batching 32 filesystem operations per Effect
step reduces scheduling overhead; revision-delta checks also avoid traversing
all dependency paths when no relevant revision changed. No validation TTL or
watcher-only shortcut was introduced.

Background native processes receive nice 10. Foreground promotion attempts nice
0, recording permission failure without discarding parsing. On this unprivileged
host, all five promotions retained nice 10; no foreground scheduling improvement
is claimed. Scheduling and native admission defer background work below 2 GiB
reported free RAM or above 80% of available CPUs' one-minute load. These are
admission heuristics, not live resource enforcement. No polling thread/Worker/
daemon was added.

## Environment and measurement method

Intel Core Ultra 5 125H, 18 exposed logical CPUs, WSL2
6.18.54.1-microsoft-standard-WSL2, ext4, 25,199,718,400 bytes RAM, 8 GiB swap,
Bun 1.4.3, Node 24.22.1 from VS Code server, LLVM/Clang 23.1.4 Release. Full
environment/argv/process CPU deltas are embedded in the JSON samples. Date/time
inside raw samples is UTC; this report's completion date uses Asia/Shanghai.

Heavy parses ran sequentially. Formal cache/validator measurements did not
overlap our native builds or other benchmarks. OS page cache was warm; frequency,
thermal state, GC and unrelated applications were uncontrolled. P50/P95 use
nearest rank unless the PCH report explicitly uses its three-sample median.
N=3/5 P95 is the maximum, not a production tail. No Extension Host or UI scenario
is part of this round's validation.

## Cache latency, CPU, memory and storage

The matched comparison reconstructs V1 from `a6abeb80c` and uses the same real
pipeline AST/proof, compile-command lookup, workspace root, before/after
BuildIdentity checks, foreground scheduler, cancellation-signal setup and local
disk-location preparation on both sides. The V1 shim adds the identical project
location work because V1 originally had global storage. Its disk load remains
inside V1's native semaphore. No native child is allowed during these cache
samples; an unexpected extraction fails the benchmark.

| Matched Node service, wall ms P50 / P95 | V1 | V2 | Samples per side |
| --- | ---: | ---: | ---: |
| Resident validated AST | 30.135 / 41.814 | **22.189 / 35.853** | 51 |
| Fresh RAM service, verified gzip restore | 113.986 / 146.427 | **104.168 / 128.451** | 15 |

Memory P50 fell **26.4%** and disk P50 **8.6%** in this comparison. Raw data:
[V1](measurements/cache-v2-baseline-node.json), [V2](measurements/cache-v2-node.json).
Memory process CPU mean was 39.24→31.22 ms; disk mean 186.74→171.53 ms. These
process deltas include libuv/runtime threads and may exceed wall time. The paired
run is sequential V1 then V2, so thermal/order effects remain possible; the
independent validator study also reverses phase order.

The earlier first-round 23.63 ms memory number uses a different service harness
and workspace/lookup scope. It must not be compared to the 30.14 ms matched
baseline as a regression estimate. The isolated validator study uses the source
directory as its root and excludes scheduler dispatch: its two orders give
dependency P50 **16.35→12.58** and **16.54→11.96** ms, and resident sequences
**18.94→14.82** and **18.80→14.29** ms. Both sides there use the current revision
logic, isolating only batching. These scopes explain the different absolute
values. The old unchecked ~0.03 ms hit remains an invalid correctness comparator.

Three separate top-level Node invocations restored the locally persisted pipeline
snapshot in **183.11 / 192.23 / 192.71 ms** (P50 192.23; N=3 maximum/P95 192.71).
Every checksum matched the writer; no native child started. These intervals
include location preparation, initial command/index loading, validation, AST
decoding/preparation and post-identity checks; Node startup/imports are excluded.
[Restart raw records](measurements/cache-v2-restart.jsonl).

| Resource | V1 matched sample | V2 matched sample |
| --- | ---: | ---: |
| Raw pipeline AST | 5,685,272 bytes | Identical |
| Dependency proof | 633,922 bytes / 804 guards | Identical |
| Complete gzip snapshot | 919,562 bytes | Identical |
| Write, one sample | 52.17 ms | 52.65 ms |
| End-of-benchmark parent RSS snapshot | 419.69 MiB | 407.90 MiB |
| Default cumulative disk budget | 128 MiB | Unlimited |
| RAM entry/raw-input budget | 3 / 16 MiB | Unchanged, plus at most 8 path observations |

RSS here includes repeated fresh prepared ASTs and uncontrolled GC; it is neither
a steady extension-host bound nor a peak or proof of a RAM reduction. No gzip
format improvement is claimed this round. The one-entry workload cannot measure
long-term unlimited-cache growth. Neither filesystem block I/O nor physical SSD
latency can be inferred from the warm OS cache. New unlimited-retention tests
preserve all 12 distinct context snapshots and independently reject oversized
entries.

## PCH result and production decision

All **20** pipeline JSON differences are explained: two generic-lambda
specializations exchange Clang's internal enumeration order. Both `std::pair`
and `ranges::common_pair` remain present with their correct types/bodies.
Ordering only specialization lists before address normalization makes the entire
AST/reference graph equal. The original unsorted snapshots pass **3,602/3,602**
mutation/origin signatures, including candidate order and call frames, against
manual PCH and each of three original preamble parses. A small dependency-free
lambda reproduces the order change. Generic include-line extraction separately
has a proven macro-order semantic counterexample and is rejected for production.

| Sequential pipeline experiment | Observed result |
| --- | --- |
| Cold native, N=3 | P50/P95 11,921.51 / 12,486.03 ms; max RSS 921,288 KiB |
| Manual PCH reuse, N=3 | 6,362.56 / 6,581.88 ms; max child RSS 700,620 KiB |
| Original-source PrecompiledPreamble build | 8,726.23 ms; 107,576,824 bytes |
| Original preamble reuse, N=3 | 6,025.44 / 6,086.63 ms |
| Original preamble complete session peak | 841,656 KiB, including build |

CPU, per-phase and whole-process RSS, PCH bytes, all difference paths, hit
decisions and raw commands are in [the PCH data](measurements/pch-v2.json) and
[report](pch-investigation-v2.md). Median-based construction break-even is about
the second compatible parse; first build+parse is slower than cold. Controlled
unchanged-prefix reuse is 3/3, not a measured real-session hit rate.

Clang 23's `CanReuse` accepts changed `-D`, `-std`, and a same-size header with
restored mtime in real probes. The PoC explicitly gates compilation-context
changes and does not parse a known stale header. Production would need the
strong BuildIdentity/negative-candidate/content/runtime proof for preamble build
and remainder parsing together. That proof, durable artifact ownership and
cold-retry lifecycle are not implemented. **PCH is not enabled by default.**
This decision follows a missing production validity/lifecycle contract; the
observed pipeline AST mismatch itself is explained and is not a semantic veto.

## Verification and retained artifacts

- `bun test`: **156/156**. Coverage includes flags/macros, external/transitive
  headers, new include candidates, restored mtime, symlinks, extractor/runtime
  replacement, unrelated edits, corruption/truncation/schema/checksum failures,
  gzip bombs and native/individual AST limits, optional quota and unlimited
  retention, cancellation, per-key loads, concurrent clears and project isolation.
  [Complete verification record and final source checksums](measurements/cache-v2-verification.json).
- Temporary TypeScript `--noEmit` and production Bun bundle pass. No dependency
  change or vendored-source edit was needed.
- `bun test/project-integration.ts /home/huawei/nano-infer`: all **25 targets**
  pass: ffn 14, experts 3, pipeline 8. [Output](measurements/cache-v2-project.txt).
- The strict PCH query comparator rechecks all four 3,602-query comparisons;
  [output](measurements/pch-v2-query-recheck.txt). A semantic body-edit fixture
  also produces the same modified AST as cold parsing and passes
  `static_assert(f()==3)`; [raw data](measurements/pch-v2-semantic-body.json).
- Standalone Node lifecycle integration, N=5: B restores a real gzip snapshot
  while A's live native-interface child still owns the parse permit; all children
  are reaped. Twelve same-version callers restore exactly once. Independent
  cancellation, promotion, actual nice values, write-drain ordering, admission
  during clear and post-clear reuse pass. [Raw data](measurements/cache-v2-lifecycle.json).
  These children are Python fixtures, so their RSS/CPU does not represent Clang.
- Actual extension activation/event callbacks under a Bun `vscode` API mock and
  tiny real Clang fixture verify successive dirty-header edits, save/watcher
  debounce, cancellation/reaping, unrelated edits, disabled-cache manual clear,
  fallback/project isolation, clear-event exclusion and post-clear use/deactivate.
  [Raw event trace](measurements/extension-events-v2.json). This runs no VS Code
  window, Extension Host or UI automation.
- Real Git tests cover worktrees, nested/sibling/multiple workspaces, custom
  paths, unreadable markers, fallback, self-ignore and unchanged root ignore files.

The environment's Node-spawned-Node probe returned exit zero with empty stdout;
that probe is explicitly marked unusable, not a successful test. Cross-process
recovery instead uses independent top-level shell invocations and the real
pipeline checksum. Other native child/process tests ran normally.

## Reproduction

```sh
python3 test/cache-v2-baseline.py
bun build test/cache-v2-performance.ts --target=node --format=esm --outfile=/tmp/fsj-cache-v2-performance.mjs
# Set this executable to the Node installation on the test machine:
FSJ_NODE=/home/huawei/.vscode-server/bin/e646868227c3e3a9e3f24277c8c7220be42c0be7/node
"$FSJ_NODE" /tmp/fsj-cache-v2-baseline.mjs bench /home/huawei/nano-infer/minicpm-v-4_7/pipeline.h /tmp/fsj-validation-pipeline-native.json /tmp/fsj-validation-pipeline.json /home/huawei/nano-infer 51
"$FSJ_NODE" /tmp/fsj-cache-v2-performance.mjs bench /home/huawei/nano-infer/minicpm-v-4_7/pipeline.h /tmp/fsj-validation-pipeline-native.json /tmp/fsj-validation-pipeline.json /home/huawei/nano-infer 51
# Execute the next command in three separate processes for restart samples:
"$FSJ_NODE" /tmp/fsj-cache-v2-performance.mjs read /home/huawei/nano-infer/minicpm-v-4_7/pipeline.h unused unused /home/huawei/nano-infer
bun build test/cache-v2-integration.ts --target=node --format=esm --outfile=/tmp/fsj-cache-v2-integration.mjs
"$FSJ_NODE" /tmp/fsj-cache-v2-integration.mjs 5 docs/measurements/cache-v2-lifecycle.json
bun test/extension-events.ts
bun test/project-integration.ts /home/huawei/nano-infer
bun test
bun run build
```

The saved ordinary AST/native manifest must still match source, dependency and
runtime files; validation refuses stale inputs. Regenerate them with the resolved
extraction command and `--cache-manifest`, as done before the PCH experiment.
The PCH/validator reports contain their own full reproduction commands. Large
machine-specific ASTs, proofs, PCHs, compiled PoCs and temporary TypeScript tooling
remain in /tmp. Raw small measurement files and scripts are versioned.

## Retained, rejected, deferred and limits

Retained in production: project-local isolated storage, unlimited default SSD
retention, per-key restoration/native permit separation, dependency-event
propagation, maintenance exclusion/draining, batched full validation and explicit
background priority/admission. Retained experimentally: original-TU preamble,
exhaustive diff/query checks and counterexamples. Rejected: include-line prefix
construction as a general solution, treating CanReuse as a proof, unchecked/TTL
RAM hits and watcher-only validity. Worker/concurrent native parsing remains
deferred: prior results established feasibility but this round supplies no new
benefit justifying the extra lifecycle/transport/memory costs. Native concurrency
stays one.

Unverified: Windows/macOS/NFS/FUSE and cold physical storage performance; actual
resource-pressure contention and cgroup limits; real-session prewarm/PCH hit
frequency; persistent PCH recovery and complete preamble proof; PCH versions of
all 25 real target checks and arbitrary Clang specialization tie-breaking.
External dependency changes without an editor/workspace event are caught by
every lookup's validation, but do not proactively wake a background task.
Proactive propagation uses eight known path sets; a previously unseen cold
dependency race may finish as a rejected analysis and require a subsequent
event/foreground request. Filesystem validation is not an atomic OS snapshot.
Independent hosts may write while another host clears; maintenance exclusion is
per extension runtime. Atomic publication and verification still prevent an
unchecked hit, but clear is not a cross-host storage lock or fsync durability
guarantee. Unknown old custom paths require explicit user cleanup.
No UI/Extension Host validation is claimed or required for this round.

See the [final acceptance record](final-acceptance.md) for the merge-time checks,
cleanup decisions and remaining limits. Historical stage plans and superseded
prototype measurements remain recoverable from Git history.
