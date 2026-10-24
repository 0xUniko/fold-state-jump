# Dependency validation performance, 2026-10-23

The retained optimization batches dependency checks without reusing validation
results. All positive cache hits still inspect every dependency, including system
headers and mapped native runtime images. Filesystem/kernel admission policy,
BuildIdentity, proof schemas and declaration IDs are unchanged.

## What was measured

`pipeline.h`'s actual saved native proof contains 3,921 lookup paths. Verification
produces 753 StatFile guards (including 19 runtime images) and 51 StatDirectory
guards. The JSON proof is 633,922 bytes. Native Clang was not invoked by this
benchmark. The AST and native proof came from the independently required ordinary
pipeline extraction, with current metadata/content reverified before timing.

Environment: Intel Core Ultra 5 125H, 18 exposed logical CPUs, WSL2
6.18.54.1-microsoft-standard-WSL2, ext4, 25,199,718,400 bytes physical RAM, VS Code
server Node 24.22.1. Each phase has one discarded warmup and 51 recorded samples.
P50/P95 use nearest rank. Formal runs were coordinated after the PCH work
finished, with no other repository build/benchmark running. Two fresh Node
processes execute the phases in forward and reverse order. Every wall sample and
process CPU delta is retained in the [forward raw data](measurements/validation-v2-forward.json)
and [reverse raw data](measurements/validation-v2-reverse.json).

| Phase, P50 / P95 wall ms | Previous validator, forward | Batched validator, forward | Previous validator, reverse | Batched validator, reverse |
| --- | ---: | ---: | ---: | ---: |
| StatFile checks | 15.823 / 19.323 | 11.825 / 13.002 | 15.261 / 16.941 | 11.554 / 13.972 |
| StatDirectory checks | 1.067 / 1.502 | 0.923 / 1.101 | 1.077 / 1.299 | 0.992 / 1.139 |
| Complete dependency validation | 16.354 / 17.502 | 12.575 / 14.652 | 16.536 / 18.443 | 11.956 / 14.042 |
| Memory-hit sequence | 18.940 / 21.362 | 14.820 / 16.246 | 18.802 / 20.963 | 14.288 / 17.468 |

Cached command resolution alone measured P50/P95 0.934/1.379 ms forward and
0.685/0.900 ms reverse. BuildIdentity alone measured 0.231/0.357 and 0.232/0.371
ms respectively. The dominant phase is filesystem dependency checking.
Validation P50 fell 23–28% in both orders; the memory sequence P50 fell 22–24%.
Validation process CPU P50 fell from 22.547 to 19.075 ms forward and 22.655 to
17.743 ms reverse. Memory-sequence CPU fell from 25.296 to 21.166 ms forward and
25.916 to 21.196 ms reverse.

The memory sequence includes two command resolutions, two BuildIdentity checks,
a resident PreparedAst lookup and complete dependency validation. It does not
include editor/scheduler dispatch. Both sides use the current AstCache, including
the separate revision-delta improvement; this A/B isolates the validator change.
It is therefore not a before/after measurement of every V2 change combined.
Phases are timed separately, so their medians must not be summed as an exact
decomposition. File/directory subphases include filtering the already resident
manifest. CPU can exceed wall time because libuv/runtime threads overlap.

RSS snapshots were 182,927,360 bytes forward and 170,434,560 bytes reverse. Both
processes retain the AST, old validator module and benchmark machinery; these
are not peaks, isolated validator memory increments or steady extension-host
bounds. The optimization does not change proof or AST storage bytes.

The formal forward/reverse runs supersede the preliminary investigation. Warm OS caches, CPU
frequency, temperature, GC and unrelated host applications were not controlled.
This is not a VS Code UI measurement.

## Why this implementation

The previous implementation builds a concurrent Effect per guard. The actual
proof therefore schedules 804 effects for one validation. The new implementation
slices guards into at most 32-element batches and uses Promise.all within each
batch, with an explicit Effect.reduce over batch results. It schedules 26 Effect
boundaries for this proof. Successful lookups perform the same guard operations;
failed batches stop subsequent filesystem work. Interruption can stop at a batch
boundary, leaving at most the current batch's already submitted filesystem work.
No timer, poller, watcher-derived validity or global memoization is added.

The measurements support reducing scheduling/allocation overhead; they do not
prove that all of the wall reduction is Effect fiber cost. Syscall tracing was
not available. Each successful StatFile guard still calls stat. HashFile still
checks realpath and content, and directory fallback still reads missing names.
The hardware/kernel-specific stat policy was not expanded. The BuildIdentity
phase is already small relative to the dependency checks, so no new executable
identity cache or redundant environment-state owner was introduced.

More aggressive proposals were deferred:

- A time-to-live or watcher-only fast path would fail external-header/toolchain
  changes and is outside the correctness contract.
- Reusing a directory's refreshed stamp after unrelated changes would require a
  new explicit proof replacement transition. The observed unchanged-directory
  phase is below 1 ms median, which does not justify another mutable owner here.
- Synchronous stat could remove Promise overhead but would block the Node main
  thread. No synchronous validation was adopted.
- A Worker would add lifecycle/transfer ownership while preserving filesystem
  work. This experiment does not establish that the complexity is warranted.

## Validation

`bun test test/dependencies.test.ts`: 16/16 passed. Existing cases cover external
and transitive headers, absent include candidates, nonexistent include directories,
symlink retargeting, restored mtime, macro/command/driver/cwd identity changes,
extractor/runtime replacement and unrelated source edits. New regressions check
changes in the last of 70 file guards, hash-based fallback across batches, missing
inputs, an empty proof and directory-read fallback after 65 file guards. Creating
an unrelated file keeps that directory proof valid; creating the include candidate
invalidates it. Additional scheduling regressions reject observed creations below an
absent include ancestor during extraction, preserve unrelated sibling changes,
and retain observed dependency relationships across consecutive invalidations.
TypeScript `--noEmit` also passed.

The benchmark asserts both implementations validate the real proof and that each
memory request is an actual resident hit. It fails if extraction is attempted.
Portable-filesystem hash fallback has correctness coverage, but its performance
was not measured on a non-ext4 filesystem. The existing filesystem race limitation
remains: validation and subsequent analysis are not an atomic OS snapshot.

## Reproduction

Retain the old implementation before editing dependencies.ts, or reconstruct it
from the baseline branch commit. Bundling the baseline prevents later edits from
changing the comparison:

```sh
mkdir -p /tmp/fsj-validation-baseline
git show ececa3a96:src/dependencies.ts > /tmp/fsj-validation-baseline/dependencies.ts
ln -s "$PWD/node_modules" /tmp/fsj-validation-baseline/node_modules
bun build /tmp/fsj-validation-baseline/dependencies.ts --target=node --format=esm --outfile /tmp/fsj-dependencies-v1.mjs
bun build test/validation-performance.ts --target=node --format=esm --outfile /tmp/fsj-validation-performance.mjs
/home/huawei/.vscode-server/bin/e646868227c3e3a9e3f24277c8c7220be42c0be7/node /tmp/fsj-validation-performance.mjs /tmp/fsj-validation-pipeline-native.json /home/huawei/nano-infer/minicpm-v-4_7/pipeline.h /tmp/fsj-validation-pipeline.json 51 /tmp/fsj-dependencies-v1.mjs
```

The saved manifest must still match its source, headers and native runtime images;
stale inputs fail before measurements. A matching native extraction with
`--cache-manifest` can regenerate those machine-local inputs. ASTs/native proofs
stay in /tmp. Append `reverse` to the Node command for the second phase order. The command and
environment are also embedded in every raw result.
