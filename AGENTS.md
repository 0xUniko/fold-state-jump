# AGENTS.md

- Optimize for local static reasoning: keep control flow, state transitions, effects, and call targets inferable from nearby code.
- Use explicit, concrete data structures and types that encode exactly the valid states and alternatives; handle alternatives with explicit case analysis.
- Use polymorphism only for genuine parametric genericity; do not use inheritance or runtime dispatch.
- Avoid explicit loops unless explicitly allowed; use idiomatic functional combinators such as `map`, `filter`, `fold`, and language-specific equivalents.
- Except where required by third-party APIs, mutable state may exist only as state threaded through `fold`.
- Keep a stable name stem for a value while it should be mentally tracked as the same thing; carry it across local bindings and function boundaries rather than renaming it for how it is produced, stored, moved, or accessed. Change the name only when a new distinction must itself be tracked thereafter.