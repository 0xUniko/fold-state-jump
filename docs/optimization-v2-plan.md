# Second performance investigation

Base: `a6abeb80c`, branch `perf/validated-cache-prewarm`. Existing README edits
are outside this work. No changes to main or vendored repositories are planned.

The first investigation already established that Clang frontend work dominates,
gzip is worthwhile, one native permit bounds memory, and Worker RPC is feasible.
This round does not repeat parallel-TU throughput or Worker feasibility work.

1. Independently investigate all PCH AST differences, compare every supported
   pipeline query, and implement a Clang 23 PrecompiledPreamble experiment using
   the original source prefix. Keep production parsing unchanged until the
   correctness and dependency-proof contracts are established.
2. Resolve project-local cache ownership from source/Git/workspace, create a
   self-ignoring directory, isolate configured/fallback paths by project, and
   remove the default cumulative disk quota while keeping entry safety bounds.
3. Move disk restore ahead of the native permit, with per-request load ownership;
   fix dependency-event propagation, dirty-buffer blocking, task generations,
   maintenance exclusion, and explicit native process priority.
4. Profile validated RAM hits with the real dependency proof. Adopt improvements
   only if the original filesystem/toolchain validity checks remain intact.
5. Run Bun tests, TypeScript and bundle checks, standalone Node lifecycle/restart
   integrations, all 25 real targets and 3,602 pipeline queries. Retain raw data,
   commands/environment/sample counts and measurement limitations in reports.

Independent agents own PCH experiments, dependency-validation profiling and the
cache-location module. Integration, scheduling, disk policy and final validation
are owned by the root agent. Heavy native benchmarks run sequentially.

Stage commits separate cache policy/lifecycle, measured validation improvements,
and experimental evidence. The final report will distinguish shipped changes,
experimental PoCs, deferred work and unverified platforms. VS Code Extension Host
and UI tests are explicitly outside this round's requested validation.
