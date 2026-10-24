# PCH / PrecompiledPreamble investigation, 2026-10-23

Historical research record. [Production Preamble acceptance](preamble-production.md)
supersedes the integration status below. Raw evidence and semantic conclusions
are retained. The standalone harness and duplicate runners were replaced by
`test/preamble.test.ts` and `test/preamble-acceptance.ts`; historical reproduction
commands below apply to commit `8e41184b1` in a separate checkout.

This investigation resolves the earlier PCH mismatch. **All 20 differences on pipeline.h are explained
by two generic-lambda specializations exchanging enumeration order. No C++ type
change was demonstrated.** The unchanged, unsorted cold and reused snapshots
produce identical mutation/origin signatures for all **3,602** queries. A correct
original-TU `PrecompiledPreamble` also passes these queries on three consecutive
parses. PCH is retained as an opt-in experiment: the existing production manifest
does not yet prove the dependencies of a separately built preamble, and Clang's
`CanReuse` alone is demonstrably weaker than the cache's validation contract.

## Artifacts and reproduction

- [Raw measurements, all differences, commands, environment and query results](measurements/pch-v2.json).
- [Standalone Clang 23 harness](https://github.com/0xUniko/fold-state-jump/blob/8e41184b1/native/preamble-experiment.cpp).
- [Sequential experiment runner](https://github.com/0xUniko/fold-state-jump/blob/8e41184b1/test/pch-v2-experiments.py).
- [Exhaustive query comparator](../test/pch-query-comparison.ts).
- [Semantic body-edit check](https://github.com/0xUniko/fold-state-jump/blob/8e41184b1/test/preamble-semantic-body.py) and
  [supplemental raw data](measurements/pch-v2-semantic-body.json).

Build and run from the repository root:

```sh
/usr/lib/llvm-23/bin/clang++ -std=c++17 -O2 -I/usr/lib/llvm-23/include \
  native/preamble-experiment.cpp /usr/lib/llvm-23/lib/libclang-cpp.so.23.1 \
  -L/usr/lib/llvm-23/lib -lLLVM -Wl,-rpath,/usr/lib/llvm-23/lib \
  -o /tmp/fsj-preamble-experiment
python3 test/pch-v2-experiments.py \
  /path/to/nano-infer/minicpm-v-4_7/pipeline.h \
  --samples 3 --directory /tmp/fsj-pch-v2 \
  --report docs/measurements/pch-v2.json
```

The source project is never edited. Large AST/PCH artifacts stay in
`/tmp/fsj-pch-v2`; raw per-run numbers and the complete difference inventory are
checked in. A separate cold AST and native manifest were also provided for the
cache work at `/tmp/fsj-validation-pipeline.json` and
`/tmp/fsj-validation-pipeline-native.json`.

Environment: Intel Core Ultra 5 125H, 18 exposed logical CPUs, WSL2
6.18.54.1-microsoft-standard-WSL2, ext4, approximately 23 GiB RAM and 8 GiB swap,
Bun 1.4.3; Ubuntu LLVM/Clang **23.1.4**, build
`++20261018124056+71c76755a8ff-1~exp1~20261018124211.83`. Full `lscpu`, `meminfo`,
source SHA-256, Git HEAD and resolved compiler flags are in the raw report.

Final samples ran sequentially without our other native benchmarks or a PoC
compiler build. Earlier exploratory runs overlapped a PoC rebuild and are
excluded. OS page cache, CPU frequency and unrelated applications were not
controlled. This is a small single-machine sample; N=3 p95 is the maximum,
not a production tail estimate. No Extension Host/UI experiment is claimed.

## Review of the previous include-line extraction

The early manual-prefix experiment (reproduced by the retained V2 runner)
searches for lines starting exactly with `#include` before
the first textual `namespace minicpm`, rewrites the first quote into an absolute
source-directory path and creates a different header. It retains the order of
the matched includes, but discards all intervening preprocessing directives and
all other source bytes. This cannot generally preserve:

- Macros, `#undef`, conditional nesting, include guards and `#pragma once` state.
- Multiline/indented directives, macro-expanded include names, diagnostic/packing
  pragmas, or declarations before/between includes.
- Main-file identity, relative include context, `__BASE_FILE__`, `__INCLUDE_LEVEL__`
  and compilation-context-sensitive behavior when a different file is forced in.

The experiment runner contains a concrete semantic counterexample. The original
source defines `MODE=1`, includes a header defining `constexpr selected()` from
MODE, and asserts `selected()==1`. Cold parsing succeeds. The extracted include
is compiled before MODE is defined, producing `selected()==2`; reused parsing
fails the static assertion. This failure is recorded with its diagnostic and
identical language flags. It is a real change caused by the prefix construction,
not evidence against correctly constructed PCH.

For the real pipeline.h prefix, the only non-comment directives are
`#pragma once`, `#include "cpu_arena.h"`, `#include "ffn.h"`. Include order was
preserved. Omitting the main-file pragma is still a general correctness concern,
but it does **not** explain this observed mismatch: the original-TU preamble,
which preserves that pragma and exact source identity, exhibits the same 20
differences.

## Every pipeline AST difference and its cause

The complete inventory is `manualComparison.allDifferences` in the raw data;
each of the three original-preamble comparisons also records its entire list.
There are **20 leaf differences**, all `.type.qualType`, all inside one lambda in
`minicpm-v-4_7/expert_io.h`, source byte range **22454–22911**. It belongs to
`ranges::for_each(completion_staged.missing | ranges::views::enumerate, ...)`
and destructures `const auto &entry` into `i` and `placement`.

The cold serializer enumerates its primary template, the `std::pair`
specialization, then the `ranges::common_pair` specialization. PCH enumeration
returns the primary template, `ranges::common_pair`, then `std::pair`. The two
specializations are present, with their original bodies and actual types, in
both snapshots. Comparing equal array indices therefore reports ten type
differences in each direction:

| Fields within each exchanged specialization | Differences per direction |
| --- | ---: |
| Parameter `entry` type | 1 |
| `entry` DeclRefExpr and its referenced declaration | 2 |
| Structured-binding VarDecl initializer type | 1 |
| First binding referenced declaration, expression and implicit cast types | 3 |
| Second binding referenced declaration and expression types | 2 |
| Call operator function type | 1 |

Sorting **only** lambda call-operator specialization lists by the complete
serialized function type, and then normalizing address-based declaration IDs,
makes the **entire** JSON snapshots equal. Statement arrays, top-level function
order, call edges, candidate arrays, ranges and offsets are never sorted or
dropped. This confirms both preservation of the specializations and preservation
of their ID-reference relationships; ignoring `qualType` fields was unnecessary.

The installed `clang/AST/DeclTemplate.h` stores function specializations in a
`FoldingSetVector` and `specializations()` exposes its enumeration; it does not
provide a C++ source-order guarantee. PCH lazy materialization can establish a
different order. The serializer currently preserves this internal order.
[LLVM's declaration header](https://raw.githubusercontent.com/llvm/llvm-project/main/clang/include/clang/AST/DeclTemplate.h)
is additional upstream context; installed headers and measured binaries are the
version-specific evidence here.

A minimal reproduction removes range-v3, std::pair and all project dependencies:

```cpp
// lambda.h
#pragma once
struct A { int value; }; struct B { int value; };
inline int helper() {
  auto f = [](const auto &x) { return x.value; };
  return f(A{1}) + f(B{2});
}
// lambda-main.cpp
#include "lambda.h"
int entry() { return helper(); }
```

Cold and PCH extraction exchange A/B specialization enumeration. Whole-tree
equality holds after the same narrow specialization ordering and ID
normalization. This small example also produces normalized ID-number differences
before ordering because declaration numbering follows traversal; its reference
graph is preserved. Thus the real pipeline mismatch is a **serialization-order
difference exposing an internal AST enumeration difference**. It is not a
substitution of `std::pair` with a semantically equivalent alias: these are
distinct C++ types and both must remain represented.

## Query correctness

The comparator prepares the two original unsorted snapshots independently and
uses all 1,801 supported cursor byte positions from the cold pipeline AST. At
each position it compares mutation and origin signatures, including target
file/kind/ID/range, result alternatives, candidate order and order offsets,
callsite frames, and caller ID/name/type.

| Input | Queries | Mismatches |
| --- | ---: | ---: |
| Cold vs manual PCH | 3,602 | 0 |
| Cold vs original preamble, reuse 0 | 3,602 | 0 |
| Cold vs original preamble, reuse 1 | 3,602 | 0 |
| Cold vs original preamble, reuse 2 | 3,602 | 0 |

This proves the sampled pipeline contract. It does not prove that arbitrary
lambda enumeration can never affect an analyzer tie-break, or that all C++
constructs/Clang versions serialize identically. No production analyzer or
serializer behavior was changed for this experiment.

## Actual Clang 23 PrecompiledPreamble

The harness calls `createInvocation` with the resolved original flags,
`ComputePreambleBounds` on the original buffer, then
`PrecompiledPreamble::Build`. Clang selects **54 bytes**: the original pragma and
two includes. It calls `CanReuse` before `AddImplicitPreamble`, retains the actual
original source filename and source offsets, and invokes the existing production
`ExtractionAction`. No includes are copied. Main-buffer ownership is explicit
(`RetainRemappedFileBuffers=true` while the harness owns that buffer).

The harness explicitly sets `FrontendOpts.DisableFree=false`: driver-generated
cc1 invocations may assume the process exits after one parse. Without this, an
exploratory persistent harness retained roughly another 0.5 GiB per parse. The
final run releases compiler state between actions; its peak does not grow across
the four parses. That exploratory retention is not a PCH format requirement.

Observed reuse decisions (same pipeline preamble and a separate small fixture):

| Scenario | CanReuse | Actually admitted to preamble parse |
| --- | --- | --- |
| Repeated unchanged source | 3/3 true | 3/3 |
| Edit a function body outside prefix | 1/1 true | 1/1 |
| Prefix gains a macro directive | false | 0/1 |
| Add a command-line `-D` macro | true | 0/1: explicit context gate |
| Change `-std` to C++20 | true | 0/1: explicit context gate |
| Included header changes size, VFS fixture | false | 0/1 |
| Included header value 1→2, same size and restored mtime, VFS fixture | **true** | Not parsed: validation counterexample |

The pipeline body edit inserts a comment inside an existing function before its
first return; it is a textual body edit with unchanged C++ semantics, and its
source ranges change after that point. It tests prefix reuse and successful
reparsing, not equivalence of changed-version navigation offsets. A separate
small constexpr fixture changes `return VALUE + INITIAL;` to
`return VALUE + INITIAL + 1;`: reused modified-body AST equals a cold parse of
the changed source, including offsets and ID relationships after address
normalization. An independent cold compiler `static_assert(f()==3)` passes.
Run `python3 test/preamble-semantic-body.py` after rebuilding the PoC. This final
check also revalidates prefix/header/macro/standard reuse decisions; its N=1
timings are diagnostic only. The final PoC differs from the timed pipeline binary
only by argument-vector fold construction and this extra fixture body-edit case.
Semantic edits in the actual pipeline and live unsaved remapped headers remain
unmeasured.

For the header cases, an in-memory VFS overlay supplies changed dependency bytes
without modifying the project. The restored-mtime overlay uses the original
second-resolution modification time. This directly demonstrates `CanReuse`
accepting changed bytes. The installed API documents disk checks as size/mtime;
the [upstream implementation](https://raw.githubusercontent.com/llvm/llvm-project/main/clang/lib/Frontend/PrecompiledPreamble.cpp)
also illustrates this algorithm and its limited missing-file collection. It is
not an independent complete compilation-context or dependency proof.

## Performance, CPU, memory, storage and amortization

| Sequential scenario | N | Wall p50 / p95 ms | User CPU s | System CPU s | Peak RSS KiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cold native pipeline parse | 3 | 11,921.51 / 12,486.03 | 12.13–12.37 | 0.55–0.68 | 921,288 max |
| Manual PCH build | 1 | 8,281.97 / — | 8.46 | 0.54 | 845,188 |
| Manual PCH reused native parse | 3 | 6,362.56 / 6,581.88 | 6.38–6.45 | 0.22–0.30 | 700,620 max |
| Original preamble build | 1 | 8,726.23 / — | ~8.96 cumulative | ~0.56 cumulative | 841,656 |
| Original preamble reused parse | 3 | 6,025.44 / 6,086.63 | ~6.18–6.32 phase deltas | ~0.01–0.16 phase deltas | 841,656 session peak |
| Original preamble body edit parse | 1 | 5,890.19 / — | See cumulative samples | See cumulative samples | 841,656 session peak |

Manual PCH is **107,576,740 bytes** (102.59 MiB); original preamble is
**107,576,824 bytes**. Manual reused child RSS is ~684.2 MiB versus ~899.7 MiB
cold. The preamble harness peak is ~821.9 MiB for its whole persistent session,
including the build; it is not a reuse-only child peak. Per-phase preamble wall
time ends before CompilerInstance destruction; CPU deltas can include the prior
phase's destruction. Whole-process GNU time is also recorded. As in the earlier
report, WSL GNU elapsed and CPU accounting can disagree with monotonic wall;
the latter is used for latency, without claiming precise utilization or energy.

The first preamble build plus first reused parse takes **14.73 s**, slower than
the 11.92 s cold median. The observed build and three repeated parse intervals
sum to **26.84 s**, versus **36.31 s** across the three cold samples; intervals
exclude the harness's between-phase overhead. Using medians, the break-even
equation is `8726 / (11922 - 6025) = 1.48` parses, so approximately the **second
parse** amortizes construction if the same prefix survives. This is an arithmetic
model based on the measured intervals, not a production cache hit rate.

The controlled unchanged-source preamble hit rate is 3/3; body-edit hit rate is
1/1; prefix/context changes are deliberately not admitted. There is no trace of
real editor change frequencies, so an overall user-session hit rate, disk-read
hit latency across a Node restart and long-term storage growth are unmeasured.
The compressed AST cache already avoids all native work on fully valid hits;
PCH primarily helps misses after body edits or differing TUs sharing a compatible
prefix. A ~103 MiB PCH is substantially larger than the existing ~1 MiB compressed
pipeline AST snapshot, so it is not an automatic storage improvement.

## Cooperation with BuildIdentity and dependency proof

A production design must preserve two distinct validity domains:

1. **AST snapshot:** current source/document version plus the complete existing
   BuildIdentity and dependencies. Its exact declaration IDs are snapshot-local.
2. **Preamble artifact:** compiler/runtime identity, full parse flags and working
   directory, requested/real source identity, original prefix bytes/bounds and a
   strong proof of every dependency/search candidate used to construct it.

A body change must miss the old AST while remaining eligible for preamble reuse.
A header/toolchain/flag change must reject the affected preamble. BuildIdentity
should gate compatibility before `CanReuse`; the existing SHA-256/ctime guards,
realpath checks and negative include-candidate guards must remain authoritative.
Do not replace them with Clang's weaker size/mtime check or watcher notifications.
The current AST retention policy explicitly excludes implicit PCH, so merely
adding `-include-pch` would also disable the cache's current proof guarantees.

The preamble-build phase needs its own PPCallbacks/loaded-buffer proof and must
merge it with the remainder parse's proof. Remainder callbacks cannot observe
includes skipped by the preamble. Missing earlier search candidates, formerly
nonexistent include directories, unsaved remaps and system/runtime files need
the same treatment as cold extraction. The current experiment does not implement
this combined proof, durable preamble metadata, atomic publication, cancellation
or multi-process ownership. A failed/deserialization-rejected PCH must be removed
or quarantined and retried cold; it must not prevent publication of a correct
cold result. Dirty included editor buffers remain subject to the production
save/validation policy unless an explicit remapping/version model is added.

## Retained, rejected and deferred

- **Retain:** original-source Clang 23 preamble PoC, exhaustive comparison,
  minimal lambda reproduction, macro-order counterexample and raw measurements.
- **Reject:** generic include-line extraction as a production construction;
  treating the first qualType mismatch as a semantic change; treating `CanReuse`
  as sufficient validation; blanket deletion of type information to force equality.
- **Defer default integration:** measured speedup is real and the pipeline
  mismatch is explained, but a complete preamble proof/lifecycle and broader
  query suite are required. Cache V2 does not depend on PCH completion.

Unverified: PCH versions of all 25 real targets, arbitrary specialization
tie-breaking, semantic pipeline body changes, unsaved remapped header lifetimes,
persistent preamble recovery across native/Node processes, memory-pressure
cancellation, Windows/macOS and cold physical storage. Production cache tests
cover their own normal-AST contracts; they do not certify these experimental PCH
paths. No Worker, daemon, PCH directory or preamble is enabled in the extension.
