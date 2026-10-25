# Persistent multi-file Preamble cache

This supersedes the process-owned Preamble architecture in
[preamble-production.md](preamble-production.md). The original measurements remain
historical evidence; current measurements are in
[measurements/preamble-ssd.json](measurements/preamble-ssd.json).

## Architecture and Clang recovery

The host retains at most one Native Worker. Switching files releases that
process, including its Clang allocator high-water memory, while independently
validated PCH artifacts remain on SSD. A subsequent request opens the appropriate
artifact in a new Native process. The same path works after idle expiry or an
extension restart. There is no per-file resident Native process or unlimited
in-memory Preamble collection.

The default location is `.cache/fold-state-jump/pch`, beside the existing `ast`
directory, under the cache's own `.gitignore`. Cumulative PCH disk capacity is
unlimited. Custom cache roots retain the existing canonical project/worktree
namespace. The configured single-AST limit remains independent of the PCH
artifact safety limit.

`PrecompiledPreamble::Build(StoreInMemory=false, StoragePath=...)` creates a
process-owned temporary file; its destructor deletes that file. It does not
restore a `PrecompiledPreamble` object in a later process. Publication therefore
copies its bytes into a separately owned, checked artifact. Recovery uses
Clang's native PCH reader through `ImplicitPCHInclude`, with the exact
`PrecompiledPreambleBytes` boundary, main-buffer remapping, `UsePredefines=false`
and PCH validation mode used by `AddImplicitPreamble`. The original source stays
the main input. No includes are copied into a synthetic header or reordered.

The installed Clang 23.1.4 public header and LLVM implementation establish this
contract: [Preamble construction/storage/configuration](https://github.com/llvm/llvm-project/blob/main/clang/lib/Frontend/PrecompiledPreamble.cpp),
[preprocessor PCH options](https://github.com/llvm/llvm-project/blob/main/clang/include/clang/Lex/PreprocessorOptions.h)
and [volatile MemoryBuffer loading](https://github.com/llvm/llvm-project/blob/main/llvm/lib/Support/MemoryBuffer.cpp).
Native reads use `IsVolatile=true` to copy bytes rather than retain a mutable file
mapping. The copied buffer outlives the CompilerInstance and its AST.

The Native Worker owns a distinct built or loaded artifact. Built and loaded PCH bytes are
fixed in an owned buffer and exposed through an in-memory VFS overlay; replacing
the disk pathname after verification cannot substitute Clang's input. A fresh
ClangTool driver recomputes the effective cc1 invocation. Host content proofs,
prefix identity and Native runtime observations gate loading; Clang's own
mtime-based reuse check alone is insufficient.

One subtle real-project failure was found and fixed during acceptance. Large
headers can appear in `/proc/self/maps` during Preamble construction. The initial
recovery code incorrectly required every persisted runtime path to already be
mapped by the fresh process, rejecting real pipeline PCHs while passing small
fixtures. Recovery now independently observes the persisted runtime inputs and
merges those observations with the current process mappings. The proof is kept
complete without requiring PCH-skipped headers to have been reopened. Native
regressions cover the large mapped-header case and reject altered runtime stamps.
The small and real-project tests both exercise fresh construction and recovery;
no persisted proof is rewritten to obtain an acceptance result.

## Identity, proof and lifecycle

The artifact key includes requested and real source identity, exact Clang prefix
content and boundary (including start-of-line state), host build identity and
effective cc1 invocation hash. Host build identity covers arguments, macros,
language, cwd, relevant environment, configurations and extractor identity.
Changing only a function body changes the complete AST identity without changing
the PCH key.

The prefix manifest retains the existing recursive header, include-search
candidate and runtime dependency proof. The body parse starts with that proof
and adds the current main source and body includes. Both observations are
independently verified before returning an AST or publishing a new disk PCH.
Same-length writes with restored mtime, changed include candidates and changed
compilation contexts invalidate the artifact. Filesystem observations remain
guarded observations rather than an atomic snapshot of an arbitrarily changing
tree.

A pool permit serializes local exchanges. A Native advisory file lock coordinates
the same artifact across independent pools and processes from lookup through
parse and publication. The kernel releases that lock on exit or crash; its
persistent inode is retained so another waiter cannot acquire an unrelated lock
at the same name. Different artifacts have different locks.

Publication writes a complete temporary PCH and manifest, checks content hashes against the bytes fixed immediately after Native construction,
fsyncs files, renames the PCH and atomically commits the manifest last. The host
receives the original Native `pchHash` and checks the copied artifact against it;
it cannot bless a build temporary damaged after construction with a fresh hash.
A regression truncates that temporary immediately after build, verifies parsing
still uses the fixed valid bytes and confirms damaged bytes are not published. Readers
accept only a matching artifact/manifest pair. Prefix and complete-AST validation
finish before publication. Truncated bytes, missing metadata, incompatible
schemas or Native deserialization failure trigger rebuilding or ordinary cold
Clang extraction.

Native build temporaries live in a request-owned staging directory. Cancellation,
timeout, worker disposal and ordinary process exit reap the child and remove its
owned staging files. A host SIGKILL can leave an uncommitted staging directory;
these directories are never accepted as cache entries. Directory traversal and
file opens reject symlinks, and cleanup does not recursively delete unknown user
content. Clear AST Caches stops local work, clears both owned AST and PCH entries
for the selected project and preserves persistent lock inodes and custom files.
Unsupported contexts retain ordinary cold parsing.

## Real-project measurement method

The executable acceptance runner uses real nano-infer pipeline.h, ffn.h and
experts.h, with real semantic function-body mutations. Every request calls
extraction directly, so an AST-cache hit cannot mask PCH behavior. The sequence
is pipeline → ffn → experts → pipeline → ffn, repeated twice for the stable
cache scenario. Each PCH result is compared with ordinary cold Clang parsing of
the exact changed source, at every supported mutation/origin cursor position.
The 25 established jump targets also run. Only process-local IDs are normalized;
query and candidate order are preserved.

The dependency relationship matters: pipeline includes ffn, which includes
experts. Editing all three in one include tree changes valid recursive PCH
inputs. The independent scenario gives each main file its own directory while
using the original read-only include roots. It measures file switching with
unchanged PCH dependencies. A separate coupled scenario copies the three files
together and verifies that their actual recursive dependency changes cause the
required rebuilds. Avoiding those rebuilds would violate correctness.

After the independent scenario, every Native process is reaped. A separate Node
process loads all three SSD artifacts, compares complete query results against
fresh cold parses and reruns the established jump targets. Build/load/reuse
events are asserted; timing changes alone are not treated as evidence of reuse.

Samples run serially on one machine with warm, uncontrolled OS filesystem caches
and CPU scheduling. Native phase timings, end-to-end host timings, Worker RSS and
high-water RSS, committed SSD bytes and process reaping are reported separately.
Node CPU excludes child CPU. No Extension Host/UI, physical cold-storage or
production-session hit-rate result is claimed.

## Results and limits

The [raw final measurements](measurements/preamble-ssd.json) were recorded on
2026-10-24 with Node 24.22.1, LLVM/Clang 23.1.4, an Intel Core Ultra 5 125H
(18 logical CPUs), WSL2 Linux 6.18.54.1 and ext4. Each workflow was measured
once, serially. These are observations on one machine, not tail estimates.

| Workflow | PCH end-to-end | Cold end-to-end | Builds / SSD loads | Difference |
| --- | ---: | ---: | ---: | ---: |
| Independent sources, initial five edits | 60.842 s | 60.004 s | 3 / 2 | 1.4% slower |
| Independent sources, next five edits | 35.300 s | 57.006 s | 0 / 5 | 38.1% faster |
| Independent sources, all ten edits | 96.142 s | 117.010 s | 3 / 7 | 17.8% faster |
| Coupled include tree, five edits | 77.008 s | 57.888 s | 5 / 0 | 33.0% slower |

Every independent-source PCH was built exactly once. The seven subsequent
switches loaded published SSD artifacts in fresh Native processes; no AST cache
was consulted. The warm sequence therefore had a 5/5 PCH hit rate. Initial
construction has a real cost: the first five requests did not beat cold parsing.

| Source | Native PCH construction | Native SSD load samples | After Node restart: load / whole request | Matching cold request |
| --- | ---: | ---: | ---: | ---: |
| pipeline.h | 10.254 s | 0.398–0.407 s | 0.399 s / 7.744 s | 12.997 s |
| ffn.h | 9.281 s | 0.368–0.386 s | 0.372 s / 6.370 s | 10.835 s |
| experts.h | 6.906 s | 0.309 s | 0.318 s / 6.744 s | 9.399 s |

Native load includes artifact hashing and dependency restoration; host validation,
transport, indexing and body parsing are additional work. The separate Node
process restored all three artifacts with three explicit load events, zero
construction events and zero cold fallbacks. The request timings include the
remaining body parse; loading a PCH does not restore a complete AST.

In the coupled tree, editing ffn.h invalidated pipeline.h, and editing experts.h
invalidated ffn.h. Two explicit dependency-invalidation events explain the later
rebuilds. These are necessary semantic invalidations, not file-switch evictions.
The implementation cannot accelerate a sequence that changes a PCH's recursive
inputs before each reuse; eager construction makes that measured sequence slower
than cold parsing. No claim of a speedup for that workflow is made.

Committed PCHs plus metadata occupied 284,045,952 bytes (270.89 MiB) for the three
independent inputs after shutdown; capacity is not capped. The loaded pipeline
Worker's idle RSS was about 516.4 MiB and its high-water RSS about 690.5 MiB,
versus 556.4 MiB idle / 815.1 MiB high-water in the initial build Worker. Across
the three loaded inputs, idle RSS was 503.1–559.4 MiB. The design bounds the
number of resident Workers to one; it does not make a Clang Worker small.
All parent workflow Native PIDs were checked absent after disposal; the separate
Node process also disposes its pool before exit. File switching reaps the prior
Worker before starting its replacement. The five-minute idle timeout releases
RAM while leaving committed SSD artifacts available.

All 18 cold/PCH comparisons passed **49,158 mutation/origin queries**, preserving
candidate order and reference relationships. The established **25 jump targets**
(pipeline 8, ffn 14, experts 3) passed in initial construction, switching and the
separate Node restart. Coupled-tree comparisons also passed after each necessary
rebuild. Original nano-infer source fingerprints were unchanged.

Final checks on 2026-10-25 passed: Native build, **215 Bun tests** (including the
original 180), **51 direct Node tests** across the existing Preamble/context and
new SSD/Native/storage suites, TypeScript checking, extension build and
`git diff --check`. CI now runs the additional Node suites. Regression coverage
includes large mapped headers, recursive restored-mtime changes, flags/macros,
include candidates, malformed/incomplete publication, same-artifact locking,
crash/idle restart, timeout, cancellation after disk construction, damaged Native
temporaries and safe clearing. No Extension Host/UI test is claimed.

The architecture deliberately keeps only the active Worker: retaining several
Clang processes would multiply the measured hundreds of MiB of idle memory.
Restarting on a switch also releases the previous compiler's allocator high-water
memory. SSD loading takes a small fraction of reconstruction time while keeping
the complete content proof. The old RAM-only acceptance runner remains useful
for comparison; query validation was extracted into one shared helper. Historical
PoC results remain research evidence, with their superseded status linked to
this report. Generated artifacts and temporary debug runners are excluded.

## Reproduction

```sh
bun run build:native
bun test
bun build test/preamble-ssd.test.ts --target=node --format=esm --outfile=/tmp/fsj-preamble-ssd-tests.mjs
node /tmp/fsj-preamble-ssd-tests.mjs
bun build test/preamble-ssd-acceptance.ts --target=node --format=esm --outfile=/tmp/fsj-preamble-ssd-acceptance.mjs
node /tmp/fsj-preamble-ssd-acceptance.mjs /path/to/nano-infer docs/measurements/preamble-ssd.json
bun run build
git diff --check
```

The runner leaves the original checkout unchanged, removes successful isolated
fixtures and retains a failed fixture path for diagnosis. Published measurements
replace local project, fixture and extractor paths with role names and omit
resolved build commands. Generated PCHs, ASTs and Native binaries are not committed.
