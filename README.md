# Fold State Jump

A prototype VS Code extension for tracing a value used inside a `ranges::fold_left` lambda back to the most recent earlier mutation of that fold state.

## What it does in v0.1

- Provides **Fold State Jump: Go to Previous State Mutation** in the command palette.
- Default shortcut: `Ctrl+Alt+Shift+M` (`Cmd+Alt+Shift+M` on macOS).
- Uses Clang's JSON AST rather than identifier-text search.
- Recognizes direct variable/member paths such as `state.a.b`.
- Traces direct calls and a bounded chain of ordinary function calls within the same translation unit.
- Follows mutations through reference/pointer parameters when the callee's AST shows a write, e.g. `void mutate(A& a) { a.b++; }`.
- If a function has multiple call paths back to a `fold_left` lambda, shows a picker.
- Uses source order as an approximation for “last mutation”.

## Important semantic detail

A helper taking `A` **by value** cannot mutate `state.a` in the caller:

```cpp
void fun1(A a) { a.b++; }   // changes only the local copy
void fun1(A& a) { a.b++; }  // can change the fold lambda's state
```

The analyzer intentionally does not report the first version as a mutation of the fold state.

## Requirements

- VS Code 1.85+
- `clang++` available on `PATH`, or set `foldStateJump.clangPath`
- For projects requiring non-default include paths/defines, a `compile_commands.json` in the project tree is strongly recommended.

The extension saves a dirty active file only after asking before running analysis, because the Clang AST must match the visible source.

## Current limitations

This is an intentionally conservative prototype, not a complete C++ static analyzer:

- Analysis is limited to the active translation unit; cross-translation-unit call sites are not indexed.
- It follows direct free-function calls; overloaded operators, virtual dispatch, function pointers, callbacks, and indirect calls are not fully modeled.
- It recognizes direct member paths and simple address/dereference wrappers. Local aliases, arbitrary pointer provenance, containers/indices, `std::move`, and aliasing through complex expressions are not fully modeled.
- The “previous” choice is source-order based. It does not prove path feasibility across `if`/`switch`, loops, exceptions, concurrency, or early returns.
- Effects from code outside the workspace are not recursively analyzed.
- The AST dump may be expensive on large translation units; output is capped by `foldStateJump.maxAstBytes` (128 MiB by default).
- The initial implementation targets the `fold_left` name in source text. Other fold APIs are not recognized yet.

When the result is uncertain or unsupported, the extension reports that instead of inventing a jump target.

## Development

Open this folder in VS Code and press **F5** to launch an Extension Development Host.

```sh
npm test
npm run check
```

No npm runtime dependencies are required; the extension uses VS Code's built-in API and Node.js modules.

## Design direction

The prototype separates three concerns:

1. **Clang AST acquisition** using the active translation unit's compile command.
2. **Call-path and mutation-effect analysis** in `src/analysis.js`.
3. **VS Code interaction** (command, call-path picker, and navigation) in `src/extension.js`.

A production version should replace the whole-translation-unit JSON dump with a smaller incremental Clang tooling service and add CFG/path-sensitive analysis before claiming exact `last write` semantics.
