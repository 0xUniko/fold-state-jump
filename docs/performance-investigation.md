# Performance investigation, 2026-10-23

Historical first-round results. The [second investigation](performance-investigation-v2.md)
supersedes the default cache location/capacity and adds restoration/lifecycle and
validated-hit improvements. The [PCH follow-up](pch-investigation-v2.md) explains
all earlier AST differences as specialization enumeration order; the first
mismatch alone did not establish a C++ semantic change. PCH remains experimental
because its combined dependency proof/lifecycle is not yet implemented.

Baseline: `01db4437f`, measured on the existing local main; no remote update or
push. Branch: `perf/validated-cache-prewarm`. The pre-existing README diff and
untracked optimization plan are excluded from implementation commits.

Environment: Intel Core Ultra 5 125H, 18 exposed logical CPUs, WSL2
6.18.54.1-microsoft-standard-WSL2, 23 GiB RAM, 8 GiB swap, repository and nano-infer
on ext4 (not /mnt/c), Bun 1.4.3, Release LLVM/Clang 23 LibTooling.
System page cache, CPU frequency, temperature and other applications were not
controlled. Runs within each comparison are sequential. p95 uses nearest rank;
with five cold samples it is the maximum, not a robust production tail estimate.

## A: baseline

`bun test`: 105/105. `bun run build`: passed. Real project integration: 25 targets
across ffn.h (14), experts.h (3), pipeline.h (8), all passed. TypeScript checker
was initially absent; a temporary checker was subsequently downloaded under /tmp
and the final type checks passed without changing project dependencies.

`bun test/investigation.ts /home/huawei/nano-infer/minicpm-v-4_7/pipeline.h /tmp/fold-state-jump-baseline/fold-state-jump-ast 5`
produced [raw samples](measurements/baseline-pipeline.json). The helper breaks down
command resolution, native process including transfer, JSON.parse, preparation,
and both queries at all 1,801 supported cursor positions. GNU time supplies native
CPU, peak RSS and filesystem block I/O. Host heap/RSS are process snapshots,
not VS Code extension-host measurements or JS peaks.

| Baseline pipeline.h, N=5 | Value |
| --- | ---: |
| Native p50 / p95 | 12,080.36 / 12,211.67 ms |
| Native user CPU range | 11.64–12.39 s |
| Native system CPU range | 0.54–0.79 s |
| Native maximum RSS | 923,220 KiB (901.6 MiB) |
| JSON bytes | 5,685,272 |
| JSON.parse range | 7.06–8.12 ms |
| Prepare range | 17.33–28.05 ms |
| 3,602 queries range | 28.27–56.77 ms |
| Native block reads / writes | 0 / 0 (warm OS page cache) |
| Bun RSS snapshots | 152.2–170.4 MiB |

Existing synthetic native benchmark, N=3: median 235.02 ms, maximum RSS 90,108
KiB, 14,010,549 output bytes. Its initial run overlapped the preliminary real-file
check, so this synthetic number is indicative only. Independent database/index
microbenchmarks still show cold lookup around 17–30 ms, reused lookup around
0.21–0.27 ms; prepared queries around 1.4–11.7 microseconds in stress cases.

The bottleneck remains nonincremental Clang parsing. The earlier PERFORMANCE.md
12.55 s result is consistent with this machine's roughly 12 s. Repeated expensive
parses are caused by time expiry/global invalidation/restarts, not cursor queries.
No native cold speedup is claimed for the cache work.

## Reproduction

Keep the baseline executable before rebuilding native, and save the baseline
analysis module in a directory where Effect resolves (or symlink node_modules in
the temporary baseline directory). Run heavy benchmarks separately from tests,
builds and other benchmarks. Machine-specific ASTs stay in /tmp, not in git.

Further stages, validity guarantees, experimental decisions and final validation
are recorded below as implementation and measurements finish.

## B: validated memory reuse

Native PPCallbacks record include/has_include candidates (including directories
which did not exist at invocation), and SourceManager records actual buffer
hashes. SHA-256 plus realpath validates external and system files as well as
workspace files. Missing ancestors coalesce negative candidates. The pipeline
manifest shrank from 12,789 paths / 1,219,059 bytes to 3,921 / 455,084 bytes.

Fifteen complete memory hits (command resolution, extractor identity and dependency
hash validation included) measured p50 **77.76 ms**, p95 **91.66 ms**, without
starting Clang. Raw [memory samples](measurements/memory-pipeline.json). The first
prototype cost p50 150.91 ms before absent-ancestor coalescing. Source contents
and executable are hashed rather than trusting a TTL. This is intentionally
more expensive than the old unchecked warm hit, but avoids its roughly 12-second
rebuild after time expiry or unrelated edits. The process RSS snapshot was
245.5 MiB; serialized AST budgets are not JS heap limits.

The first five-run dependency prototype measured native p50/p95
12,055.41/12,571.30 ms, maximum 924,228 KiB; see
[raw samples](measurements/dependency-prototype-pipeline.json). These precede the
negative-path coalescing change and are not the final cold overhead measurement.
Full normalized pipeline JSON matched the baseline, as did all 3,602 mutation/
origin signatures, including candidate order and call frames. Analyzer source
was not changed. 113 tests, temporary TypeScript --noEmit and bundle build passed.

## C: atomic disk snapshots

Plain snapshots initially measured 6,140,586 bytes per pipeline entry. Fifteen
fresh-cache service reloads read/validate/parse/prepare without calling Clang:
p50/p95 161.49/179.72 ms. These prototype timings include full AST equality
assertions and two command/extractor identity checks. Memory hits with both
before/after identity checks measured 106.92/114.71 ms. Disk writes took 12.16 ms.
See [prototype samples](measurements/disk-prototype-pipeline.json); final timings
will move correctness assertions outside timed intervals.

119 tests, TypeScript checking and bundle build passed. Disk-specific coverage
includes reloads, source/external/generated dependency changes, corruption,
truncation, schema/key mismatch, size limits, LRU, capacity rejection, atomic
concurrent writes, cancellation, clear and I/O failure fallback. A write failure
never prevents a correct jump. Disk caching uses globalStorageUri and is
independently configurable; clear/statistics commands expose lifecycle and usage.

A preliminary gzip round trip reduced the AST from 5,685,272 to 282,968 bytes;
compression/decompression took 21.72/7.70 ms. This is useful storage evidence;
format adoption and repeated resource measurements are evaluated separately.

## D: event-driven background preparation

A native-backed service integration (not a VS Code UI test) completed a pipeline
prewarm in 13,067.53 ms. Fifteen later foreground hits took roughly 102–126 ms.
Three foreground requests issued immediately after the native spawn waited
12,673.03 / 12,395.95 / 12,737.01 ms and each joined exactly one extraction;
prewarming does not accelerate work which has only just begun. A warm foreground
request while another background extraction was running completed in 107.92 ms,
cancelling that background child. Five children were started in total: one warmup,
one cancelled and three joined builds. All PIDs were reaped, no tasks remained.
[Raw lifecycle and latency samples](measurements/prewarm-pipeline.json).

The scheduler exposes scheduled/background/foreground states, job IDs, reasons,
start/completion/failure/cancellation and native PIDs. It debounces only editor,
save/configuration/file events, never polls for reparsing. Same-version foreground
waiters have independent cancellation; promoting background work preserves its
process. At most one native extractor runs, and a warm hit bypasses its permit.
Cancellation finalization waits for child exit, escalating SIGTERM to SIGKILL
after one second. Disposal drains tracked promises and native handles.

Default prewarm delay is 1.5 s; background deadline 120 s; active saved local
C/C++ documents only. Dirty main documents retain the explicit save prompt.
Dirty included documents block navigation until saved rather than mixing disk
AST offsets with unsaved buffers. Clear cancels/drains tasks before deleting
snapshots. Output channel and statistics commands expose usage/cancellations.

126 tests, TypeScript and bundle build passed. Native integration verifies real
child lifetime and single-flight behavior. Actual VS Code UI responsiveness,
Windows native behavior and /mnt/c semantics are not covered by these results.

## E: isolated experiments and decisions

Experiments are opt-in scripts, excluded from default tests. No PCH, Worker,
clangd integration or concurrency increase is shipped in the extension.

| Experiment | Evidence | Decision |
| --- | --- | --- |
| Two independent native TUs | Three pipeline+experts pairs: sequential median 20,011.61 ms; parallel median 11,455.13 ms (1.75× pair throughput). Sampled concurrent native tree RSS peaked at 1,448,400 KiB (1.38 GiB). Pipeline user CPU remained roughly 11.6–12.0 s and experts 8.3–8.6 s, plus system CPU. | Keep concurrency 1: throughput is useful for bulk work, but the product warms one active TU; no measured editor-interaction benefit justifies concurrent memory/CPU pressure. |
| Worker holding PreparedAst | Node 24: 15 main parse/prepare samples produced timer-delay median 47.10 ms, maximum 90.18 ms. Persistent Worker startup 92.93 ms; main timer delay 5.80 ms. 1,801 RPCs, each checking both commands, matched target and call-frame signatures for all 3,602 results. RPC p50/p95 0.100/0.289 ms. | Feasible and improves isolated load responsiveness. Retain PoC; defer default adoption until VS Code UI measurements justify a second AST lifecycle and result-transport protocol. Warm hits do not parse/prepare. |
| PCH from real prefix headers | Build 8,896.44 ms, 107,576,764-byte PCH. Three reuse parses median 6,162.07 ms, maximum native RSS 700,408 KiB. Full normalized JSON differed: a template expression type printed as std::pair in cold AST and ranges::common_pair with PCH. | Correctness contract veto: do not adopt. This does not prove an incorrect jump, but equivalence is unproven. Retain reproducible diff evidence and prototype. |
| PCH invalidation | Independent temporary-header experiment rejects changed macro OPTION=1→2 and changed transitive header. A separate builtin-macro override only warned, emphasizing that PCH flags must be managed explicitly. | Not sufficient to override the real-file serialization mismatch. No persistent daemon or PrecompiledPreamble integration is claimed. |
| gzip snapshot | Raw compact AST ~5.69 MB → ~0.285 MB; final proof/header add storage. Initial plain entry 6.14 MB vs final gzip entry ~0.92 MB. Compression ~20–30 ms, decompression ~6–9 ms in isolated round trips. | Adopt asynchronous gzip with compressed/raw limits, proof and AST checksums, atomic rename and schema validation. Final Node disk latency is measured below. |
| clangd AST reuse | A real isolated clangd 23.1.4 LSP session advertises astProvider and answers textDocument/ast. The sampled expression returns role/kind/detail/arcana/range/children, with declaration pointers embedded in debug arcana rather than our structured references. | Do not substitute this tree or symbol index directly. Retain protocol probe and research path below. |

[Native/PCH raw data](measurements/native-experiments.json),
[corrected independent PCH invalidation probe](measurements/pch-validation.json),
[Node Worker data](measurements/node-worker.json),
[actual clangd response](measurements/clangd-experiment.json).

The first PCH flag probe re-included an unguarded header and therefore failed for
a redefinition rather than proving flag rejection. It was corrected with a
separate main file and explicit OPTION macro in the follow-up validation probe;
only that corrected probe supports the flag-invalidation conclusion.

ClangTool accepted -ftime-trace=<file> but did not produce a trace. A matching
Clang driver did produce one: frontend total 9.275 s, nested source parsing
7.686 s, class instantiation 5.149 s and function instantiation 1.387 s. These
categories overlap and must not be added. Its header-mode output also spent
1.953 s writing an AST, unlike the compact extractor. Preprocess-only took
247.81 ms. Native's own selection/serialization counters are measured separately
below. perf stat worked for software counters; hardware cycles were unsupported.

GNU time's per-process elapsed values disagreed with Python monotonic pair wall
time in some WSL samples (even exceeding the pair total). Use monotonic pair
wall time for throughput. Per-TU foreground p95 under competing work and actual
editor interference cannot be reliably inferred from that sample. Raw CPU/RSS
counters are included, not converted into precise power or CPU utilization
claims. Worker RSS snapshots retain both the oracle AST and Worker and therefore
are not an isolated incremental memory cost.

### clangd integration research

The official [code walkthrough](https://clangd.llvm.org/design/code.html) describes
TUScheduler caching ParsedAST and preambles. [TUScheduler source](https://clang.llvm.org/extra/doxygen/TUScheduler_8cpp_source.html)
shows per-file ASTWorker requests and compatible versus stale preambles (online
source is 24.0.0git, not the installed 23.1.4 binary). The
[index documentation](https://clangd.llvm.org/design/indexing) describes symbols,
references and relations, which lack our function-body/data-flow contract.
There is an actual nonstandard [AST protocol extension](https://clangd.llvm.org/extensions#ast);
assuming clangd has no AST endpoint would be incorrect. Its debug-oriented tree
still does not expose this extractor's complete structured IDs, types, captures,
macro byte offsets and reachable helper closure as a compatible schema.

A maintainable integration would need a supported request transport from the
editor's existing clangd client, version/compile-command negotiation and strict
compatible-preamble semantics. A server method inside runWithAST could invoke
our serializer and return the existing compact schema plus document version and
dependency proof. That entails a maintained clangd patch/build distribution and
cross-version regression suite. A separate server would duplicate parsing/RSS,
so it does not automatically reuse the editor's AST. System default clangd here
is 18.1.3, while the isolated probe uses 23.1.4; cross-process AST pointers are
never a valid interchange format. No system/editor clangd configuration was
modified, and no standard symbol request was presented as a body AST substitute.

## Final validity and test matrix

The final implementation is measured on the same WSL2 ext4 machine and linked
LLVM/Clang 23 as the baseline. Cache timings use the **actual Node 24.22.1 binary
bundled with this VS Code server**, not Bun. Early B/C/D prototype numbers above
are historical measurements and are superseded by the final table below.

A critical final policy restriction is Linux **6.13+ ext4 multigrain change
timestamps**. Nanosecond fields alone do not prove that rapid writes have distinct
timestamps on old kernels. The [kernel documentation](https://docs.kernel.org/filesystems/multigrain-ts.html)
explains query-sensitive change timestamps; ext4 opted in via FS_MGTIME in
[Linux 6.13](https://raw.githubusercontent.com/torvalds/linux/v6.13/fs/ext4/super.c).
Older/unknown kernels hash database/file content and do not admit unproven runtime
image guards. Kernel/platform are included in BuildIdentity. This prevents
reusing proofs after the validation policy changes. Runtime capture also uses a
stream read for procfs (whose reported file size is zero), rejects empty captures,
and is tested to contain the actual executable. The native fixture captured 19
mapped images including the executable, LLVM and system libraries.

| Scenario | Evidence / correctness outcome |
| --- | --- |
| Same version, concurrent mutation/origin/prewarm | Single native extraction, same PreparedAst; independent cursor snapshots and waiter cancellation. Scheduler tests + native-backed integration. |
| More than 60 seconds | Real 61-second idle wait on an isolated pipeline copy, then a hit; no native start. Fake-clock old-entry regression also remains in unit tests. |
| Unrelated source change/create | Ready and in-flight entries survive; directory fallback checks absent include names. Real isolated pipeline scenario creates unrelated.cpp and checks the same target. |
| Main source / transitive or external header change | Hash/metadata proof misses; actual native fixture tests include macros, transitive headers, deletion, optional includes and nonexistent -I directory creation. |
| Macro/flags/driver/cwd/database selection change | BuildIdentity changes; source/configuration epochs and before/after resolution reject old in-flight output. Existing database tests cover changed/deleted/new/relocated/configured databases and inferred headers. |
| Symlink or restored timestamp | Realpath/inode/content checks reject retargeting; same-size writes with restored mtime are tested. Old-kernel policy boundaries are separately tested. |
| Native binary / mapped DSO replacement | Identity or runtime guards miss; fake runtime image replacement test and actual executable guard ensure coverage. |
| Fresh service and fresh Node process | Same snapshot and declaration relationships restored with zero native starts; separate processes change VS Code IPC environment to verify reload-stable identity. |
| Corrupt/partial/old/oversized snapshot | Miss and native fallback; raw/decompressed limits, root/checksum/schema/key/proof corruption and gzip bomb coverage. |
| Eviction / capacity / clear / concurrent writes | Correct re-extraction/miss; unique temporary files, atomic rename, LRU and ownership-limited cleanup tested. |
| Edit during extraction / stale versions | Per-path revisions and document/config checks reject publication; unrelated edits do not discard a valid in-flight result. |
| Cancellation / foreground priority / shutdown | Queued cancellation, permit release, promoted jobs, independent waiters, task draining and stubborn-child SIGKILL tested. Real child PIDs are checked for ESRCH after disposal. |
| Dirty editor buffers | Entry/exit guards prohibit automatic saving and reject dirty main/included buffers. Actual VS Code prompts/editor-event ordering are code-reviewed, not automated UI-tested here. |
| Real project semantics | 25 specified targets across ffn/experts/pipeline; full normalized pipeline AST equals baseline; all 3,602 mutation/origin signatures at 1,801 positions match. |

Final automated suite: **132 pass, 0 fail**, seven test files. Temporary TypeScript
`tsc --noEmit`, Release native CMake build, extension bundle build and diff checks
pass. Heavy benchmarks and native lifecycle experiments stay opt-in. Bundle size
is about 128.98 KB versus 111.25 KB baseline; external source maps remain enabled.
TypeScript was downloaded only into /tmp, without changing package dependencies.

Actual VS Code UI latency/events, native Windows/macOS and /mnt/c were not tested.
No result here is a production p95 SLA. See the design document for conservative
fallbacks, metadata/clock assumptions, unsupported parsing inputs, quota overshoot
and filesystem race limits. User nano-infer files were never modified; real edits
use temporary pipeline copies with the original compile options/include paths.

## Reproduce the final checks

```sh
bun test
bun run build:native
bun run build
# Run with a locally installed TypeScript checker:
tsc --noEmit
bun run bench:investigation /path/to/pipeline.h native/build/fold-state-jump-ast 5 true
bun run bench:cache /path/to/pipeline.h 15
bun test/prewarm-integration.ts /path/to/pipeline.h 3
bun test/edit-rebuild.ts /path/to/pipeline.h 3 --wait
bun test/restart-integration.ts write /path/to/pipeline.h /tmp/fsj-restart-cache
bun test/restart-integration.ts read /path/to/pipeline.h /tmp/fsj-restart-cache
bun test/project-integration.ts /path/to/nano-infer
bun test/compare-analysis.ts /tmp/ast.json /path/to/pipeline.h /path/to/baseline-analysis.ts
python3 test/native-experiments.py /path/to/pipeline.h 3
python3 test/clangd-experiment.py
bun test/worker-performance.ts /tmp/ast.json /path/to/pipeline.h 15
```

To measure the extension's JS runtime, bundle an opt-in script and run it with
VS Code's Node binary. This machine used
`/home/huawei/.vscode-server/bin/e646868227c3e3a9e3f24277c8c7220be42c0be7/node`.
Do not assume Bun and Node have equal validation or event-loop costs.

```sh
bun build test/cache-performance.ts --target=node --format=esm --outfile /tmp/fsj-cache-bench.mjs
/path/to/vscode/node /tmp/fsj-cache-bench.mjs /path/to/pipeline.h 15
bun build test/worker-performance.ts --target=node --format=esm --outfile /tmp/fsj-worker-performance.mjs
bun build test/analysis-worker.ts --target=node --format=esm --outfile /tmp/fsj-analysis-worker.mjs
/path/to/vscode/node /tmp/fsj-worker-performance.mjs /tmp/ast.json /path/to/pipeline.h 15 /tmp/fsj-analysis-worker.mjs
```

Baseline/cache comparison: save baseline src modules and executable before edits,
make their normal Effect imports resolvable, then use `test/cache-baseline.ts` and
`native/benchmark.py --baseline`. No application imports vendored repositories.
All benchmark commands for timing comparisons must run sequentially. The --wait
scenario intentionally idles 61 seconds and never polls/reparses during that wait.


## Final comparison and resource cost

Native measurements use the final Release extractor from implementation commit
`71a7dcbae`; the final Node cache/restart measurements include the kernel policy
fix `ececa3a96`. The final policy takes the same ext4 fast path on this 6.18 WSL
kernel. Prewarm/edit timings use the same implementation on that path before the
additional old-kernel admission gate. All samples are genuine service timings;
none include VS Code window creation, UI rendering or extension startup imports.

| pipeline.h scenario | Baseline p50 / p95 | Current p50 / p95 | N and scope |
| --- | ---: | ---: | --- |
| Native cold process, output transfer included | 12,080.36 / 12,211.67 ms | 12,362.35 / 12,447.63 ms | 5 per binary |
| Already resident memory, Node | 0.028 / 0.193 ms, unchecked | 23.63 / 33.95 ms, validated | 15 per implementation |
| Disk restore into fresh memory service, Node | No persistent cache; cold parse required | 98.13 / 126.86 ms | 15; checksums, dependency validation, decode and indexes |
| Fresh Node process reading persisted AST | No persistent cache; cold parse required | 155.95 / 165.46 ms | 3 separate processes, startup imports excluded |
| Foreground after completed prewarm | No prewarm | 24.75 / 29.65 ms | 15, no native spawn |
| Foreground joins just-started prewarm | No prewarm | 12,783.93 / 12,981.42 ms | 3, exactly one native extraction each |
| Warm foreground displaces another background TU | No prewarm | 26.42 ms | 1 actual cancellation, no orphan PID |
| 61-second idle then jump | TTL policy forces extraction | 23.64 ms | 1 real 61,000 ms wait, isolated pipeline copy |
| Create unrelated.cpp then jump | Global invalidation policy forces extraction | 23.73 ms | 1 real source creation + targeted invalidation |
| Saved edit and rebuild | Not separately sampled in old editor service | 12,526.64 / 13,130.77 ms | 3 edits of isolated pipeline copy, targets equal |

The old 60-second/unrelated-change rows describe regression-tested cache policy;
they are not separate measured GUI latency distributions. The new age/edit
scenario started Clang four times: one initial load and three real edits, with
zero extra starts for unrelated creation or idle age. An immediately joined
prewarm remains a cold wait, not an artificial speedup. Native cold median was
about 2.3% higher in this final sample; parsing has not become incremental and no
cold speedup is claimed. Frequency/page-cache/thermal conditions were uncontrolled,
so small cold differences cannot be attributed confidently.

Validated memory reuse deliberately costs more than the old unchecked 0.03 ms
warm path. The result is reliable reuse after time, unrelated edits and restarts.
The first Node prototype, which rehashed every candidate and a 44 MB executable
on each request, measured p50 280 ms. Ext4 multigrain file guards, grouped negative
lookups and stable extractor-version checks reduce that to about 24 ms without
applying that shortcut to unproven filesystems/kernels.

Final raw data: [native](measurements/final-native-pipeline.json),
[Node cache](measurements/final-node-cache.json),
[Node restart](measurements/final-node-restart.json),
[Node prewarm/lifecycle](measurements/final-node-prewarm.json),
[age, unrelated change and rebuild](measurements/final-node-edit.json),
[differential results](measurements/final-differential.txt),
[real project targets](measurements/final-project.txt).

Native user/system CPU ranged 12.04–12.35 / 0.64–0.77 s; peak RSS was 924,716 KiB
(903.0 MiB), versus 923,220 KiB baseline. Selection was 17.8–26.5 ms and compact
serialization 34.9–44.8 ms; the remaining frontend work dominates. Native block
reads/writes remained zero under the warm OS page cache, not a claim of zero
filesystem calls. The compact JSON remained exactly 5,685,272 bytes. Complete
normalized JSON matched every baseline field/reference relationship.

Final Node memory-hit process CPU deltas had medians 17.72 ms user / 16.36 ms
system; disk-hit medians were 115.80 / 36.46 ms. These include runtime/GC work and
can exceed wall time due to concurrent runtime threads. No power measurement was
performed. The loop benchmark's end RSS snapshot was 382.9 MiB with many temporary
ASTs and uncontrolled GC; it is not a steady extension-host bound. Independent
single-load Node processes used about 124.6–125.1 MiB RSS snapshots. Native and
host peaks must not be added as if observed simultaneously. Background parsing
still uses substantial CPU and roughly 900 MiB native RSS; it can be disabled.

The final pipeline proof was 633,922 bytes for 3,921 candidate/actual paths plus
file/directory and 19 native-image guards. One complete gzip disk entry occupied
919,551 bytes (0.877 MiB), versus the initial 6.14 MB plain prototype; proof growth
means this is not an encoding-only A/B. The AST gzip payload alone was 285,276
bytes. Persisting took 46.35 ms in the final Node sample; independent synchronous
compression/decompression probes took 27.63/8.08 ms. Production gzip is asynchronous.
The disk cap counts complete encoded entries, whereas memory budget counts raw
AST bytes. Disk/dependency proof overhead and decoded JS heap are explicit costs.

The separate final synthetic native comparison (N=3, without manifests) measured
baseline/current medians 261.07/256.01 ms and peak RSS 87,300/87,172 KiB with equal
JSON contracts. This roughly 2% difference is noise-scale, not the claimed benefit.

## Commits and remaining validation limits

| Stage | Commit |
| --- | --- |
| A: baseline and measurement helper | d5f0b8456 |
| B: dependency-aware memory cache | 14a560c70 |
| C: atomic disk snapshots | 7e1fbcad3 |
| D: event-driven prewarm/lifetime | 402604693 |
| E: measured gzip/guards and isolated experiments | 71a7dcbae |
| Final kernel/timestamp correctness restriction | ececa3a96 |

No remote main was modified or pushed. The original README build-parallelism
hunk remains uncommitted; only the new cache documentation is included in the
documentation commit. The original untracked optimization plan remains untracked
and unchanged. No files under repos/ were modified. Saved baseline ASTs/binaries
and temporary TypeScript tooling stay outside the repository.

All available automated, native contract and real-project correctness checks
passed. Manual VS Code UI testing remains required before treating this as an
editor-release validation: prompts, rapid real editor event ordering, actual
window reload/deactivate rendering and responsiveness were not exercised through
a UI harness. Windows/macOS and /mnt/c performance are unmeasured; unsupported
native-image validation falls back to cold extraction. The retained Worker and
PCH probes are experiments, not shipping features. PCH fails the current complete
AST contract; Worker shows potential for load responsiveness but needs an editor
integration decision; clangd requires a supported richer integration. No claim
of complete incremental C++ parsing or zero-background-interference is made.
