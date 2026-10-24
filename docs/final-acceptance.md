# Final cache acceptance, 2026-10-24

The production cache and prewarm changes are ready for integration. PCH is
**disabled** and remains a separate research task. The four remote ignore-file
fix/documentation commits (`248f869`, `276d597`, `ae797b6`, `4624b56`) were fetched
and preserved, together with the existing build-command documentation commit.
The starting worktree contained no uncommitted changes.

## Final fixes and review

- Preserve the remote exclusive `.gitignore` creation and exact-content reuse.
  Generated files are not rewritten, custom files fall back unchanged, and
  ignore-file symlinks are rejected. Reject FIFO paths without blocking on open;
  a real FIFO regression verifies fallback without local AST creation.
- Protect extraction temporary-directory acquisition with `acquireUseRelease`.
  A cancellation between directory creation and delivery previously leaked the
  directory. An isolated regression holds that exact window open, cancels, then
  verifies removal and writes a completion marker after the assertion.
- Build Native before running native-dependent tests in CI, and run CI for
  `perf/**` pushes. Runtime-image coverage accepts either a stat or hash guard,
  preserving the conservative fallback on kernels without multigrain timestamps.
- Align README defaults and paths with actual configuration: project-local cache,
  per-project fallback/custom namespaces, unlimited cumulative disk capacity and
  a separate 64 MiB single-AST default limit.

Review covered dependency changes, restoration single-flight, native admission,
maintenance exclusion, cancellation, bounded RAM retention, file descriptors,
temporary files and native process ownership. No further reproducible blocker
was found. The existing atomic-publication and validation contracts remain.

## Local acceptance

Intel Core Ultra 5 125H, WSL2 Linux 6.18 ext4, Bun 1.4.3, VS Code server Node
24.22.1, LLVM/Clang 23.1.4 Release; the same machine as the retained comparisons.
Heavy real-project parses ran sequentially. A separate LLVM 18 build, matching
CI's compiler generation, also passed. This does not certify every Clang version.

| Check | Result |
| --- | --- |
| `bun test` | 160 passed, zero failures, Native already built |
| `bun run build:native` | Passed |
| `bun run build` | Passed |
| TypeScript 7.0.2 `tsc --noEmit` | Passed, actual checker installed under `/tmp` |
| Real nano-infer jump targets | 25/25: ffn 14, experts 3, pipeline 8 |
| Pipeline differential against `main` analyzer | 3,602/3,602 equal at 1,801 cursor positions |
| Real pipeline RAM/disk hits | Passed; no native starts permitted in hit benchmark |
| Separate top-level Node disk restores | 3/3; matching writer checksum, zero native starts |
| Header/flags/runtime/negative lookup invalidation | Native fixture and dependency/disk tests passed |
| Prewarm, cancellation and reaping | Real pipeline Clang plus five service lifecycle repetitions passed |
| Clear, Git ignore and project isolation | Real Git/worktree tests and activation-callback harness passed |

The callback harness uses an editor API stub and real small Clang children. Its
purpose is event ordering and storage ownership; it is not an Extension Host/UI
or real-project performance test. Lifecycle fixtures using Python children are
similarly limited to process/service behavior. No UI test is claimed or required.

The [acceptance measurements](measurements/final-acceptance.json) retain current
cache samples, independent Node restarts, real Clang events and lifecycle checks.
The original matched comparisons and raw data remain in the
[V2 performance report](performance-investigation-v2.md).

| Real pipeline service check | Current rerun |
| --- | ---: |
| Validated RAM hit, N=51, P50/P95 | 22.54 / 29.23 ms |
| Verified disk restore, N=15, P50/P95 | 100.81 / 117.07 ms |
| Independent Node restores, N=3 | 183.65 / 233.81 / 223.69 ms |
| Raw AST / verified proof | 5,685,272 / 633,922 bytes, 804 guards |

These warm-filesystem service timings exclude Node startup/imports and UI
dispatch. No new speedup is inferred from the rerun. The retained matched V1/V2
comparison measured RAM P50 30.14→22.19 ms and disk P50 113.99→104.17 ms.
Cold parsing still costs roughly 12–13 seconds on this real pipeline. Completed
prewarm avoids that work on the subsequent request; joining an early prewarm
still waits for parsing. RSS and input-byte budgets are not hard heap limits.

## Cleanup and retained research

Removed 16 files: superseded prototype/preliminary measurements, a completed
stage plan, and ended Worker/clangd/early manual-PCH experiment scripts and data.
The first-round report now retains only final results with independent value.
Document links and build/script references were checked after deletion. Removed
research remains recoverable from Git history, including `a6abeb80c`.

Retained: paired final benchmarks and required raw data; real Clang idle/edit,
prewarm and cancellation evidence; all correctness regressions; cache design;
and the [PCH V2 report, minimal PoCs and evidence](pch-investigation-v2.md).
No generated AST, native proof, PCH, binary or temporary compiler installation
is added to Git. Vendored repositories are unchanged.

PCH differences are explained by generic-lambda specialization enumeration,
with zero sampled query mismatches. Original-source preamble reuse has a real
approximately 11.92→6.03 s parse benefit after an 8.73 s build, but needs complete
combined dependency proof, durable ownership/publication, cancellation, verified
recovery and automatic cold fallback. `CanReuse` alone fails the restored-mtime
header counterexample. Production integration is independent follow-up work.

## Known limits and optional work

- Unprivileged nice 10→0 promotion can fail. The joined parse keeps nice 10;
  direct foreground starts use normal priority. Keep completed work rather than
  restarting; actual latency under contention remains unmeasured.
- Validation is not an atomic filesystem snapshot. Clearing coordinates one
  extension runtime; another runtime may publish concurrently. Atomic rename
  and verification still gate reuse. No cross-host lock or fsync guarantee.
- External changes are caught at lookup, but only editor/workspace events for
  known dependencies proactively schedule prewarm. Admission heuristics do not
  continuously enforce memory pressure or cgroup limits.
- Windows/macOS, NFS/FUSE, cold physical-storage performance and real-session hit
  frequency remain unverified. Unsupported dependency modes parse cold without
  retaining an incomplete proof. Unknown old custom/global locations require
  explicit cleanup; they are not searched or deleted automatically.
- PCH production integration, Worker/daemon parsing and broader contention
  measurements are optional future work; none is enabled by this release.
