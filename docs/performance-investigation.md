# Performance investigation, 2026-10-23

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
was absent; downloading a temporary checker is being attempted separately.

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
