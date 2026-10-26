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

### TypeScript 类型检查规范

- 默认使用 `bun check` 执行完整 TypeScript 类型检查，不要习惯性使用 `bunx --no-install tsc --noEmit`。
- 项目当前没有自定义 `check` 脚本，使用支持内置类型检查器的 Bun 版本时，`bun check` 会直接检查 `tsconfig.json` 指定的项目。
- 如果 `bun check` 与编辑器或指定 TypeScript 版本存在语义差异，或者任务明确要求验证特定版本的 TypeScript 兼容性，再使用对应版本的 `tsc`，并说明原因。
- 不得仅因为 `bun check` 产生错误就切换到 `tsc`，也不得仅因为其中一种检查通过就忽略另一种检查发现的真实问题。
- 在修改项目构建或检查流程之前，先确认当前 Bun 版本、TypeScript 版本和项目配置。
- 记录实际执行的检查命令与结果，不得把未运行的检查报告为通过。

## Autonomous delivery workflow

For repository tasks, complete delivery autonomously: inspect local changes and
fetch the remote branch before implementation; investigate, implement, run the
relevant tests and full regression, native build/integration, `bun check`,
extension build, read-only nano-infer audits and comparable performance samples.
Record the commands actually run and their results. Review the complete diff,
untracked files, sensitive files and unintended changes; update the necessary
design and measurement documents before committing all task-owned changes.

Commit and push only on `feat/multi-funcs`, to `origin/feat/multi-funcs`; never
modify, merge into or push `main`, force-push, or discard changes of uncertain
ownership. If remote commits arrive, safely integrate them and revalidate. After
pushing, fetch again and compare the local HEAD and remote branch HEAD, check for
concurrent commits and report both SHAs, verification results, remaining proof
boundaries and any uncommitted files. Do not stop at implementation or leave
commit/push/final verification to the user. Pause only for a conflict requiring
human judgment, authentication, permissions, or another genuine external blocker.
