# Fold State Jump

A VS Code extension prototype for tracing a value used inside C++ `ranges::fold_left` back to a previous mutation along supported direct call paths.

## Toolchain

- **Bun** manages dependencies, runs tests, and bundles the extension.
- **TypeScript** makes AST nodes, analysis results, and effect boundaries explicit.
- **Effect-TS** models compiler invocation, file reads, cancellation, and recoverable failures.
- **Clang LibTooling (native executable)** parses the translation unit and emits only AST nodes needed to analyze functions in the current source file and their directly reachable non-system helper definitions. The TypeScript analyzer builds reusable indexes from this compact tree.
- VS Code's extension host runs the bundled CommonJS output on its Node-compatible runtime. Bun itself is not required at extension runtime.

## Development

Install Bun and configure the [official LLVM 23 package repository](https://apt.llvm.org/)
for your distribution, then run:

```sh
bun install
bun test
bun run build
sudo apt install clang-23 llvm-23-dev libclang-23-dev
bun run build:native
```

Build the native extractor before F5. For an LLVM installation outside the default CMake prefix, configure the build using `cmake -S native -B native/build -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm && cmake --build native/build -j 10`. F5 starts the Bun TypeScript watcher through the tracked VS Code task; the C++ executable is built separately.

Native CMake builds default to `Release` to optimize AST traversal. An explicitly
selected build type is preserved; use `-DCMAKE_BUILD_TYPE=Debug` for debugging.
The supported LibTooling build requires matching LLVM/Clang 23 development
libraries; CMake rejects other LLVM major versions. CI uses Ubuntu 24.04 with
the official LLVM 23 packages.

To package a VSIX:

```sh
bun run package
```

The command palette provides two independent commands:

- **Fold State Jump: Go to Previous State Mutation** — `Ctrl+Alt+Shift+M` (macOS: `Cmd+Alt+Shift+M`). Traces the most recent supported mutation before the cursor. If no earlier mutation is found and the traced call path reaches a recognized fold lambda, it wraps to the last mutation of the same state within that fold. If the fold contains no supported mutation, it reports that no mutation was found instead of jumping to a declaration.
- **Fold State Jump: Go to State Origin** — `Ctrl+Alt+Shift+O` (macOS: `Cmd+Alt+Shift+O`). Traces parameter-to-argument mappings through callers to a supported initialization or fold seed. An unresolved parameter remains an explicit analysis boundary, regardless of whether earlier mutations exist.

Place the cursor on the identifier whose value you want to trace. For example, clicking `bank`, `records`, or `session_state` selects that member or whole object. The analyzer follows simple reference aliases, direct function/member calls, assignment operators, and reference captures in called lambdas, including generic lambdas. Both commands offer distinct caller paths in a QuickPick showing caller functions, files, line numbers, and the final destination. Canceling the picker leaves the editor in place.

When a parameter has no caller in the current AST, the extension asks
`vscode.prepareCallHierarchy` and `vscode.provideIncomingCalls` for incoming call
locations. If those return no usable calls, it tries
`vscode.executeReferenceProvider`. Each location is checked against a direct call
in that caller file's own Clang AST, using a stable Clang USR rather than a
function name or process-local declaration address. Only provider-returned files
are opened; the workspace is never scanned for C++ callers. Caller files use the
existing compilation-command resolver, extraction scheduler, and AST caches.
Multi-hop mappings preserve member suffixes and every call frame. Each independent
fold path retains its own seed and wrap-around context. Source and dependency
guards are checked again after candidate selection. Save modified caller files
and included files before analysis. Rebuild the native tool for the new symbol
metadata; older extractors can still analyze local calls but cannot validate
external caller edges.

Provider failures and rejected call locations are recorded as `caller-boundary`
events in the Fold State Jump output channel. A missing language-service index
can leave an incomplete caller set. An unresolved origin stops at its parameter;
mutation analysis reports failure if no supported mutation is found.

Origin navigation is intentionally separate from mutation navigation. A reference capture reads its source at a known invocation; a value capture uses the snapshot at lambda construction. Mutations in an uncalled lambda or a by-value copy do not count as changes to the original object.

`bun test` includes deterministic cross-AST analysis tests and a command harness with real native extraction and mocked VS Code APIs. The harness covers candidate selection, reference fallback, provider failure, cancellation, dirty documents, and stale results; it does not test an actual Extension Host or C++ language server. It also includes native AST regression tests when the extractor has been built. To check the actual `nano-infer` member paths and cross-header targets, run `bun test/project-integration.ts /path/to/nano-infer` after building the native tool.

The extension searches for `compile_commands.json` in source ancestors, workspace roots, and common CMake build folders. For headers, it inherits flags from a nearby C++ source entry (preferably with the same basename) and explicitly uses `-x c++-header`. Set `foldStateJump.compileCommandsPath` if the build database lives elsewhere, or build the native LibTooling extractor against the desired Clang version. When no compile command is found it records the fallback in the Fold State Jump output channel and uses a minimal `-std=c++17` fallback; project includes such as `gguf.h` may then be missing.

By default the plugin invokes the bundled build location `native/build/fold-state-jump-ast` (override with `foldStateJump.extractorPath`). The native extractor uses Clang LibTooling to parse the translation unit but emits a compact JSON tree only for functions declared in the active file and directly reachable user-code callees. It does not dump the entire standard-library AST. The JSON output is capped at 64 MiB via `foldStateJump.maxAstBytes`. Parsing C++ templates still has its intrinsic cost, and complex unresolved/indirect calls remain a limitation. Native LLVM/Clang development libraries must match the chosen extractor build version; the native executable uses its linked Clang version, while the compilation database supplies the project's `-std`, `-I`, and `-D` arguments. `foldStateJump.clangPath` is retained for compatibility but does not choose the LibTooling version.

## Performance and cache

The active saved C/C++ file is prepared after a 1.5-second debounce on editor and
save events. Foreground commands join the same in-flight extraction; another
file's background job yields to foreground work. Prewarm never saves documents.
The first cold load still runs Clang and prepares indexes; later commands reuse
validated memory data, or a gzip snapshot in `<project>/.cache/fold-state-jump/ast`
after reload. Git roots (including nested repositories and worktrees) take
precedence over containing workspace roots. Custom cache bases isolate projects;
unwritable locations or custom cache `.gitignore` rules use a project-scoped
global-storage fallback. Existing ignore files are never overwritten or followed
through symlinks. Mutation and origin commands retain independent cursor snapshots.

Cache reuse checks compilation settings, source/transitive include dependencies,
negative include candidates and native runtime images. Entries do not expire
just because 60 seconds elapsed, and unrelated file edits do not clear them.
Nanosecond metadata guards accelerate validation on verified Linux ext4; other
file inputs use hashes/directory reads, including runtime image hashes when
the timestamp fast path is unavailable. Unverified native runtime platforms and
unsupported inputs such as modules, forced includes/PCH or VFS parse cold without
retention. Dirty included documents must be saved before navigation.

On Linux with the LLVM/Clang 23 extractor, an AST cache miss can build and reuse
the original source's precompiled preamble. Saved body edits retain the preamble
when its prefix, compilation context and independently verified dependencies
remain valid. Validated PCH artifacts persist in the sibling `pch/` directory,
with no cumulative capacity limit. One serial native worker holds the active
preamble (at most 256 MiB per artifact); switching files releases that process
and loads the selected artifact from SSD. Idle expiry, cancellation and restart
preserve published artifacts. `Clear AST Caches` clears both AST and PCH artifacts.
Clearing uses the active document's `foldStateJump.extractorPath`, just like
parsing: absolute paths are used directly, relative paths resolve against the
extension installation, and an empty setting uses the bundled build location.
PCH clearing requires that executable's `--pch-lock` helper. The Fold State Jump
output channel reports AST and PCH directory results separately; a failed helper
or disk cleanup reports incomplete clearing, even if the other caches cleared.
Valid AST hits need no native request. Unsupported contexts and failed proofs
automatically use ordinary cold extraction. See [SSD PCH acceptance](docs/preamble-ssd.md).

Memory retention remains three translation units / 16 MiB serialized AST, with
one oversized entry retained alone. This is a soft input-size budget; decoded
nodes and indexes consume extra memory. Cumulative disk capacity defaults to
unlimited (`0`); a positive byte budget enables soft LRU eviction for AST snapshots.
PCH storage remains unlimited. The single-AST
limit still applies. Invalid, truncated, oversized or outdated snapshots rebuild.

```json
{
  "foldStateJump.prewarm.enabled": true,
  "foldStateJump.prewarm.delayMs": 1500,
  "foldStateJump.prewarm.onSave": true,
  "foldStateJump.cache.disk.enabled": true,
  "foldStateJump.cache.disk.maxBytes": 0,
  "foldStateJump.cache.disk.path": ""
}
```

Use **Fold State Jump: Show Cache Statistics** for hit/task/native PID/memory
information and **Fold State Jump: Clear AST Caches** to cancel/drain work and
reclaim storage. Disable prewarm to avoid background parsing. Native concurrency
stays fixed at one. Cancellation/deactivation waits for child exit.
Background children run at nice 10. Joining a running background parse attempts
normal priority, but unprivileged Linux may deny the increase; that parse then
continues at nice 10. A newly started foreground parse uses normal priority.

Compilation databases retain their separate eight-entry / 16 MiB input index
cache, with metadata checks on every jump and content hashes for coarse
filesystem timestamps. See [cache design and limitations](docs/cache-design.md)
and the [measured investigation](docs/performance-investigation-v2.md). Rebuild the
native executable when updating this extension.

Prepared ASTs include an interval tree per file for identifier selection, with
token ranges and template/depth precedence computed once. The balanced tree
prunes non-overlapping subtrees instead of scanning every AST node. Overlapping
template and macro ranges still require candidate comparison. Legacy nodes
without token lengths or spellings use the query's source text. Index memory
grows linearly with the number of identifiers.
Write targets and reference aliases are normalized once, and writes are grouped
by function and root variable. Binary search skips operations after the cursor;
tracing stops at the first relevant direct write or helper mutation. Function
ownership is indexed once rather than recovered from ancestors on each query.
Call-path analysis still depends on the reachable functions and mutations being
traced. These indexes add preparation work that is amortized by repeated queries.

The native extractor streams JSON directly to stdout and reuses normalized
source paths. It no longer retains a complete JSON object tree alongside Clang's
AST. The extension bundle is minified, with external source maps for debugging.

The cache does not make C++ parsing incremental: the next cold jump still parses
the translation unit. Dependency validation includes external headers; the cache does not depend on
workspace watchers alone. Unsupported dependency modes remain conservative cold
loads rather than trusting an incomplete snapshot.

For an end-to-end timing comparison (after `bun run build:native`):

```sh
bun run bench /path/to/source.cpp 'state.member' 10
# For the native fixture, select a known successful trace:
bun run bench test/fixtures/native-paths.cpp bank_state.bank.records 10 helper-records
```

This prints native extraction, JSON decoding, index construction, and average cold
vs warmed state-query times. Queries verify actual targets and call paths, and
the benchmark does not retain each cold result and its complete index.
The optional fourth argument selects a `// @case`
marker for an unambiguous fixture position. Use the same file and selection
for comparisons.

To isolate cursor-query scaling from C++ parsing:

```sh
bun run bench:queries 1000
```

This checks mutation and origin targets in synthetic ASTs with 100, 1,000 and
10,000 functions (601–60,001 nodes), reporting index construction in milliseconds
and warmed query averages in microseconds. Each function has one write and one
read; this measures identifier selection, not large call graphs.

Additional focused benchmarks and full analysis-result comparisons:

```sh
bun run bench:analysis
bun run bench:services
bun run bench:native
# Compare against saved pre-change files or binaries:
bun run bench:analysis /path/to/baseline-analysis.ts 200
bun run bench:services /path/to/baseline-services.ts 17
bun run bench:native --baseline /path/to/baseline-extractor
bun test/compare-analysis.ts /path/to/ast.json /path/to/source.cpp /path/to/baseline-analysis.ts
```

The native benchmark requires Python 3 and GNU `time`; it checks the complete
JSON contract after normalizing process-local declaration addresses. The analysis
comparison checks both commands at every indexed identifier in the active file,
including targets and candidate call paths. See [PERFORMANCE.md](PERFORMANCE.md)
for the earlier optimization measurements. The current cache/parse investigation,
raw samples, experiment decisions and platform limits are in
[docs/performance-investigation-v2.md](docs/performance-investigation-v2.md).
The [final acceptance record](docs/final-acceptance.md) lists release checks and
known limits. The [SSD PCH acceptance](docs/preamble-ssd.md) records
the current implementation and measurements; [earlier research](docs/pch-investigation-v2.md)
preserves the API and semantic counterexamples that informed it.

An earlier optimization pass, before the changes measured in PERFORMANCE.md,
used a local `nano-infer/minicpm-v-4_7/pipeline.h` snapshot (5.42 MiB extracted JSON).
A paired native extraction comparison improved from 18.64 s to 13.35 s. Across
206 cursor positions, all 412 mutation/origin results matched the prior analyzer;
total query time on the same decoded AST decreased from 2,264 ms to 35.8 ms under
Bun, and from 5,300 ms to 40.1 ms under Node 24. Native ASTs also matched after
normalizing process-local declaration addresses. These are local measurements,
not latency guarantees; template parsing remains the dominant cold cost.

## Design constraints

The implementation follows the repository's `AGENTS.md`:

- Pure AST/data-flow analysis is separated from effects and editor interaction.
- Result alternatives use tagged unions and are handled with explicit case analysis.
- AST traversal and collection construction use recursion and functional combinators rather than explicit loops.
- State used to construct trees, collect candidates, and choose the latest candidate is threaded through `reduce` calls instead of mutated through shared variables.
- External effects are concentrated in the service and VS Code integration modules.
- Values retain stable names across boundaries.

## Important semantic detail

A helper taking `A` by value cannot mutate the caller's fold state:

```cpp
void mutate(A a)  { a.b++; } // local copy only
void mutate(A& a) { a.b++; } // may mutate the caller's object
```

## Current limitations

This is still a prototype, not a complete C++ static analyzer:

- The analyzer supports a subset of direct calls, simple reference aliases, reference/pointer parameter paths, assignments, and lambda captures. Other overloaded operators, virtual dispatch, general callbacks, function pointers, complex aliases, and arbitrary pointer provenance are incomplete.
- “Previous” mutation selection is based on source order, not full control-flow reachability. Branch feasibility, loops, exceptions, concurrency, and early returns are not proven.
- External caller discovery depends on the active C++ language service. Its incoming calls or references may be unsupported or incomplete. Indirect calls and unresolved template/overload targets remain boundaries; external library effects without source ASTs are not inferred.
- Clang still parses the entire translation unit, but the native extractor serializes only selected functions and their direct helper-call closure. Functions in unrelated translation units and indirect calls cannot be recovered from this AST alone.
- Fold detection is heuristic and currently targets inline lambdas passed to `fold_left`. A helper shared by several identifiable folds produces separate paths. Stored callbacks, arbitrary fold wrappers, recursive edges, and general pointer provenance remain boundaries.

Unsupported or ambiguous cases should be treated as analysis limitations, not proof that no mutation exists.
