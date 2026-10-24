# Production Preamble acceptance, 2026-10-24

The extension enables original-source Clang 23 `PrecompiledPreamble` reuse on
Linux for saved C++ sources and headers with a complete dependency proof.
`src/extension.ts` calls `extractWithPreamble` only after both AST cache tiers
miss. It passes the extracted result through the unchanged AST preparation,
query, memory retention and atomic gzip snapshot publication paths.

## Architecture and ownership

The installed Clang 23 API exposes Build, move, CanReuse and AddImplicitPreamble.
The constructor that could restore PCHStorage, dependency state and prefix bytes
is private. `getContents()` returns the source prefix, not an exportable PCH.
We therefore retain the real `PrecompiledPreamble` object inside one serial
native worker, using `StoreInMemory=true`. This is process-local reuse, never
cross-process PCH persistence. No PCH or PCH manifest is written to disk.

One extension runtime owns one pool, one permit and at most one worker/artifact.
Switching source or compilation identity replaces that worker. Every token runs
the same ClangTool driver as cold extraction; the complete generated cc1 argument
sequence must match the build's sequence before reuse. This catches changes in
implicit toolchain discovery as well as explicit command changes. Frontend and
codegen DisableFree are false; each CompilerInstance is destroyed after its
request. The owned main buffer and Preamble outlive that compiler and AST.

A new artifact is staged until independent prefix proof, remainder proof and AST
preparation succeed. Publication is one pool-state replacement under the permit.
No consumer sees a partially built artifact. The retained artifact is limited to
256 MiB, with five minutes of idle lifetime; the worker's total RSS also includes
Clang allocator arenas and is larger than the PCH size. There is no dedicated
PCH prewarming: existing saved-file AST prewarming may build a preamble only on
an actual AST miss, using its existing debounce, resource admission, cancellation
and foreground single-flight behavior. Valid AST hits perform no worker request.

Cancellation kills and reaps the process before releasing its permit, escalating
to SIGKILL after one second if necessary. Clear-cache maintenance drains tasks
and clears the pool. Extension deactivation closes admission and disposes the
pool. Native stdin EOF releases idle state, and Linux PR_SET_PDEATHSIG terminates
active parsing when the extension host dies, including SIGKILL. A fresh pool,
worker crash or extension restart rebuilds Preamble state; verified disk AST
snapshots remain usable across those restarts.

## Independent dependency proof

The native PreambleCallbacks install the same Dependencies callbacks as cold
extraction. The proof includes recursive headers, loaded buffer SHA-256 values,
resolved identities, negative include candidates (including absent -I roots),
__has_include probes and mapped executable/runtime images. Modules, remapped
headers, unsupported include search modes, time macros and incomplete proofs
are not admitted. The explicitly owned main buffer is handled separately;
self-including sources conservatively fall back rather than erasing a genuine
full-source dependency.

Preamble identity comprises BuildIdentity, requested/real source identity, exact
prefix SHA-256 and Clang-computed bounds. It does not include full source content.
BuildIdentity includes command flags/macros, cwd, extractor identity, environment
and configuration. `CanReuse` runs only after independent host validation; it is
an additional Clang check, never the dependency authority.

Native observations retain first-seen inode/size/mtime/ctime stamps through
parsing and host verification. This rejects changed-and-restored inputs, even
with identical final bytes, size and mtime. The main input uses a stable copy.
The host verifies hashes and realpaths against observed buffers, with metadata
checks on both sides. Verified manifests then own fresh guards; initial native
observation stamps do not become permanent content identities. Existing ext4
multigrain timestamp guards remain the fast path; other Linux filesystems use
content/directory verification, including runtime-image hashes.

Remainder extraction starts with the prefix proof and adds the current full
source and remainder includes. It never assumes skipped PCH includes will replay
callbacks. The merged proof is verified before returning the AST and before the
existing cache can retain it. As with the prior cache, validation is a guarded
filesystem observation, not an atomic snapshot of an arbitrarily changing tree.
Detected changes reject the request or recover with a fresh cold parse.

## Fallback and artifact failures

C and Objective-C inputs, CUDA/offload contexts, modules, explicit forced
includes/PCH, VFS overlays and other unsupported compilation commands use the
original cold extractor. Failed build, stale identity, changed dependency,
CanReuse rejection, invalid response, deserialization/parse failure, oversize
artifact, worker crash or timeout drops the worker and retries cold. Cancellation
and pool closure do not trigger replacement work. Users need not clear caches.

Disk PCH truncation, corruption, stale-file recovery and interrupted rename are
inapplicable to the chosen in-memory artifact. The regression suite instead
injects truncated/bad worker frames, prefix/source mismatches, missing dependency
proof and stale runtime images, and verifies cold query results with no artifact
publication. Existing disk-cache tests continue covering atomic gzip publication,
truncation, corruption, interrupted writes and restart restoration.

## Reproduction and retained evidence

```sh
bun run build:native
bun test
bun run build
bun build test/preamble.test.ts --target=node --format=esm --outfile=/tmp/fsj-preamble-tests.mjs
node /tmp/fsj-preamble-tests.mjs
bun build test/preamble-context.test.ts --target=node --format=esm --outfile=/tmp/fsj-preamble-context-tests.mjs
node /tmp/fsj-preamble-context-tests.mjs
bun build test/preamble-acceptance.ts --target=node --format=esm --outfile=/tmp/fsj-preamble-acceptance.mjs
node /tmp/fsj-preamble-acceptance.mjs /path/to/nano-infer 3 docs/measurements/preamble-production.json
git diff --check
```

CI installs LLVM/Clang 23, builds the extractor, runs all Bun regressions and runs
the Preamble suite separately under Node, matching the extension host's runtime.
The optional real nano-infer checkout is measured locally, not downloaded by CI.
The real source checkout is read-only; semantic edits use an isolated pipeline
copy and local header, with the original include roots.

The superseded standalone Preamble harness and two duplicate experiment runners
were removed. The historical report, raw observations, macro-order
counterexample and lambda-order conclusions remain in
[pch-investigation-v2.md](pch-investigation-v2.md), with links to the historical
source commit. The exhaustive standalone query comparator remains useful for
comparing saved snapshots. No PCH, AST, native binary or tool installation is
committed.

## Final measurements and verification

The [raw sequential N=3 measurements](measurements/preamble-production.json)
record Node 24.22.1, LLVM/Clang 23.1.4, Intel Core Ultra 5 125H (18 logical CPUs),
WSL2 Linux 6.18.54.1 and ext4. OS page cache, CPU frequency and unrelated system
activity were not controlled. Samples ran serially without our other native
benchmarks or compiler builds. These are warm-filesystem observations on one
machine; N=3 p95 is just the maximum, not a production tail estimate.

| Real source | Cold end-to-end p50 / p95 s | Preamble build s (N=1) | Build + first parse end-to-end s | Subsequent reuse p50 / p95 s |
| --- | ---: | ---: | ---: | ---: |
| ffn.h | 10.464 / 10.543 | 8.481 | 14.275 | 5.400 / 5.534 |
| experts.h | 9.761 / 10.064 | 6.051 | 11.777 | 5.711 / 5.801 |
| pipeline.h | 13.212 / 13.627 | 9.462 | 16.198 | 6.616 / 6.653 |

For pipeline, the first PCH-backed native parse after construction took 6.367 s;
its overall request also includes the 9.462 s build, worker launch, driver work,
transport, independent proof checks and AST preparation. Subsequent requests
avoid construction. Native phase events exclude host verification and report
separately from Node wall/CPU measurements. Cold native-exit events likewise
separate process time from the surrounding service. The empty Node subprocess
startup probe took 32.88 ms and is diagnostic, not subtracted from parse timings.
Parent CPU measurements exclude native child CPU.

Three isolated semantic body edits (real `rope_position += N` mutations) reused
Preamble in 6.755, 6.571 and 6.380 s, versus changed-version cold parses in 13.436,
12.956 and 13.021 s. Including the initial parse on each side, the four-request
workflow total was **36.508 s with Preamble versus 52.605 s cold** (30.6% lower).
This is a measured repeated-edit workflow, not a prediction of editor hit rates.

A changed header correctly discarded the prior artifact and cost 16.210 s to
rebuild and parse, versus 13.161 s cold. Construction is therefore a real initial
and invalidation penalty. AST hits avoid it altogether; background PCH-only work
is never scheduled. Reuse must survive enough edits to amortize construction.
Memory AST hits on pipeline took 13.26–15.71 ms and invoked no native work.
Immediate cancellation, including reaping, took 6.56–12.67 ms across three trials;
this does not characterize cancellation under heavy memory pressure.

The pipeline in-memory PCH was 107,576,728 bytes (102.59 MiB). After repeated
requests the idle worker RSS was 571,252 KiB (557.9 MiB), with VmHWM 834,792 KiB
(815.2 MiB) across build and parsing. RSS is not just PCH storage. Preamble disk
storage is zero; existing gzip AST snapshots retain their original storage policy.
The raw report also records ffn/experts PCH size and selected worker memory counters.

All **25 established real jump targets** passed (14 ffn, 3 experts, 8 pipeline).
For each file, first construction and all three reuse samples matched its cold
snapshot at every supported cursor position: 2,134 ffn, 2,228 experts and 3,602
pipeline mutation/origin queries per comparison. Each changed-body/header
comparison passed all 3,606 queries against the cold parse of that same changed
version. Candidate order, call frames, types, offsets and declaration-reference
relationships were retained; only process-local address IDs were normalized.
No AST array or specialization ordering was sorted to obtain equality.

Final local checks passed: `bun run build:native`, **180 Bun tests**, **20 Preamble
regressions under direct Node execution**, TypeScript checking, `bun run build`
and `git diff --check`. The 20 Preamble tests cover prefix/body/header edits,
restored size/mtime and changed-and-restored inputs, include candidates, flags,
macros/environment, newly discovered GCC installations, merged disk AST restart
restoration, concurrent requests/prewarm promotion, cancellation/reaping,
worker crash/restart, EOF/host SIGKILL, idle expiry and malformed/incomplete
publication. Windows/macOS, actual Extension Host/UI timing, cold physical
storage and real-session hit frequency remain unmeasured and are not claimed.

A [targeted final-code fallback recheck](measurements/preamble-fallback-recheck.json)
separately measures the final lifecycle refinement that releases a retained idle
worker before unsupported cold extraction. It asserts the old PID is already
reaped when the replacement cold process starts, then compares all 3,606 queries
against direct cold extraction. The earlier sequential build/reuse/body samples
remain unchanged; this recheck covers the subsequently tightened unsupported
context path rather than combining independent samples into one statistic.
That N=1 final recheck took 13.547 s for automatic fallback and 13.862 s for direct
cold extraction. This includes idle-worker reaping; sample variation prevents
interpreting the difference as a measured speedup or a precise fallback overhead.

Published reports replace local project/fixture/runtime paths with role names and
retain only memory counters from process status. Hardware/runtime versions,
timing samples and query outcomes are unchanged; no user names, host names or
environment variable values are included. Project content fingerprints and resolved
private project build/include commands are omitted from the published reports;
the complete local evidence remains available in the working session.
