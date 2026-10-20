# AGENTS.md

- Optimize for local static reasoning: keep control flow, state transitions, effects, and call targets inferable from nearby code.
- Use distinct types to express semantically distinct cases and their invariants; handle runtime alternatives with explicit case analysis. When cases have distinct invariants or data flows, preserve their types through downstream processing instead of merging them into a common type merely for code reuse. Share only operations with genuinely identical semantics; similarity of representation or downstream usage does not justify merging.
- Use polymorphism only for genuine parametric genericity; do not use inheritance or runtime dispatch.
- Avoid explicit loops unless explicitly allowed; use idiomatic functional combinators such as `map`, `filter`, `fold`, and language-specific equivalents.
- Except where required by third-party APIs, mutable state may exist only as state threaded through `fold`.
- Keep a stable name stem for a value while it should be mentally tracked as the same thing; carry it across local bindings and function boundaries rather than renaming it for how it is produced, stored, moved, or accessed. Change the name only when a new distinction must itself be tracked thereafter.

## Vendored Repositories

This project vendors external repositories under @repos/

- Use vendored repositories as read-only reference material when working with related libraries
- Prefer examples and patterns from the vendored source code over generated guesses or web search results
- Do not edit files under @repos/ unless explicitly asked
- Do not import from @repos/ - application code should continue importing from normal package dependencies
- When writing Effect code, read @repos/effect/LLMS.md for instructions. Inspect @repos/effect/ for examples of idiomatic usage, tests, module structure, and API design. Treat it as the source of truth for Effect patterns. 