# Fold State Jump

A VS Code extension prototype for tracing a value used inside C++ `ranges::fold_left` back to a previous mutation along supported direct call paths.

## Toolchain

- **Bun** manages dependencies, runs tests, and bundles the extension.
- **TypeScript** makes AST nodes, analysis results, and effect boundaries explicit.
- **Effect-TS** models compiler invocation, file reads, cancellation, and recoverable failures.
- **Clang LibTooling (native executable)** parses the translation unit and emits only AST nodes needed to analyze functions in the current source file and their directly reachable non-system helper definitions. The TypeScript analyzer remains unchanged.
- VS Code's extension host runs the bundled CommonJS output on its Node-compatible runtime. Bun itself is not required at extension runtime.

## Development

Install Bun, then run:

```sh
bun install
bun test
bun run build
sudo apt install llvm-23-dev libclang-23-dev
bun run build:native
```

Build the native extractor before F5. For an LLVM installation outside the default CMake prefix, configure the build using `cmake -S native -B native/build -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm && cmake --build native/build -j 2`. F5 starts the Bun TypeScript watcher through the tracked VS Code task; the C++ executable is built separately.

To package a VSIX:

```sh
bun run package
```

The command palette entry is **Fold State Jump: Go to Previous State Mutation**. The default shortcut is `Ctrl+Alt+Shift+M` (macOS: `Cmd+Alt+Shift+M`).

The extension searches for `compile_commands.json` in source ancestors, workspace roots, and common CMake build folders. For headers, it inherits flags from a nearby C++ source entry (preferably with the same basename) and explicitly uses `-x c++-header`. Set `foldStateJump.compileCommandsPath` if the build database lives elsewhere, or `foldStateJump.clangPath` if Clang is not on `PATH`. When no compile command is found it warns and uses a minimal `-std=c++17` fallback; project includes such as `gguf.h` may then be missing.

By default the plugin invokes the bundled build location `native/build/fold-state-jump-ast` (override with `foldStateJump.extractorPath`). The native extractor uses Clang LibTooling to parse the translation unit but emits a compact JSON tree only for functions declared in the active file and directly reachable user-code callees. It does not dump the entire standard-library AST. The JSON output is capped at 64 MiB via `foldStateJump.maxAstBytes`. Parsing C++ templates still has its intrinsic cost, and complex unresolved/indirect calls remain a limitation. Native LLVM/Clang development libraries must match the chosen extractor build version; the standalone compiler selected through `foldStateJump.clangPath` still controls the project compile flags.

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

- The analyzer supports a subset of direct calls and reference/pointer parameter paths. Overloaded operators, virtual dispatch, callbacks, function pointers, complex aliases, and arbitrary pointer provenance are incomplete.
- “Previous” mutation selection is based on source order, not full control-flow reachability. Branch feasibility, loops, exceptions, concurrency, and early returns are not proven.
- Cross-translation-unit callers and effects inside external library implementations are not analyzed.
- Clang still parses the entire translation unit, but the native extractor serializes only selected functions and their direct helper-call closure. Functions in unrelated translation units and indirect calls cannot be recovered from this AST alone.
- Fold detection is heuristic and currently targets `fold_left`.

Unsupported or ambiguous cases should be treated as analysis limitations, not proof that no mutation exists.
