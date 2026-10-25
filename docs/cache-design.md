# Cache V2: project-local validated ASTs and explicit task lifetime

Updated 2026-10-24. [Second-round results](performance-investigation-v2.md),
[project-root selection details](cache-location-v2.md),
[validation profiling](validation-performance-v2.md), and
[PCH research](pch-investigation-v2.md) accompany this AST-cache design.
[SSD PCH production caching](preamble-ssd.md) adds a sibling `pch/` directory,
independent prefix identities and cross-process recovery.

## Ownership and lookup

`extension.ts` snapshots the command's source text, version and cursor separately
from shared extraction. Mutation/origin commands share only `PreparedAst`. They
never share a cursor or final jump result. The pure analyzer is unchanged.

Every request resolves compilation databases before and after loading the AST.
`BuildIdentity` hashes schema, requested/real source paths, selected command and
original database entry (including its driver), cwd, roots/configured database,
output limit, extractor version and parse-affecting environment. Editor IPC IDs
are excluded so reloads can hit disk. Environment includes include/toolchain/SDK
paths, driver overrides, locale and reproducible-time variables. Compiler flags
and current first-entry/header-inference rules are preserved; the linked
LibTooling version still determines Clang behavior, not `clangPath`.

On tested Linux 6.13+ ext4 with multigrain change timestamps and nanosecond ctime, extractor version uses real path and
device/inode/size/mode/mtimeNs/ctimeNs. Else it hashes executable contents. Native
rebuilds and schema changes therefore separate entries. Full compile database
metadata is checked on every resolution; coarse database timestamps also require
a content hash before reusing the decoded index.

Lookup is memory → verified disk snapshot → native extraction. Per-request-key
permits serialize restoration/publication; a separate native permit bounds cold
work to one. Both resident hits and disk restores bypass unrelated native work.
The request key includes source, version, BuildIdentity, generation and source
revision. The ownership map counts current users, including queued waiters, and
removes a permit only after the last user exits; cancellation/failure releases it.
Entries no longer expire by elapsed time. Immutable
LRU transitions retain at most three entries / 16 MiB serialized AST, with one
oversized entry allowed alone. Decoded nodes, indexes, dependency proofs and
transient buffers add memory: this is a soft input-size budget, not a heap limit.

## Dependency proof

Native `--cache-manifest FILE` leaves stdout JSON unchanged. PPCallbacks capture
transitive include and `__has_include` lookups; HeaderSearch supplies resolved
search paths and configured paths removed because their directories do not yet
exist. Quoted includes cover includer ancestry and cwd. Failed paths coalesce to
the first absent ancestor. SourceManager buffer hashes cross-check what Clang
actually read, including system/external headers. Requested paths preserve `..`
across symlinks during filesystem lookup. Realpath + SHA-256 captures symlinks and
content. Clang declaration addresses remain snapshot-local and are never merged
across extraction runs.

Native manifests and verified manifests have different schemas/types. Verification
hashes opened files and checks stat metadata before/after hashing. It groups
negative candidates by parent and checks absent names with directory reads.
Only a stable proof becomes one of four explicit guards:

| Guard | Validation |
| --- | --- |
| StatFile | Exact dev/inode/size/mode/mtimeNs/ctimeNs match |
| HashFile | SHA-256 and realpath match |
| StatDirectory | Exact metadata match, or reread missing names if directory changed |
| ReadDirectory | Reread missing names |

Stat guards require Linux 6.13+ ext4 (`statfs.type == 0xef53`) with non-coarse
ctime. Older kernels use coarse tick timestamps even when values have
nanosecond fields, so they cannot take this path. BuildIdentity includes the
validation kernel/platform to prevent reusing a fast-path proof across changes
to that policy. See the [kernel timestamp documentation](https://docs.kernel.org/filesystems/multigrain-ts.html)
and [ext4 FS_MGTIME in Linux 6.13](https://raw.githubusercontent.com/torvalds/linux/v6.13/fs/ext4/super.c). Ext4 ctime changes on writes and cannot be restored by `utimes`; mtime
alone is never trusted. A content write followed by restored mtime still misses.
Other filesystems/platforms and coarse change timestamps use hashes/reads on
every request. This assumes normal OS filesystem metadata semantics, not an
administrator deliberately forging inode metadata. No Windows, /mnt/c, NFS or
FUSE fast-path guarantee is claimed. New files in a search directory are detected;
unrelated directory changes reread negative names without forcing a rebuild.
Filesystem verification concurrency is bounded at 32. Successful RAM hits still
validate every guard on every request. Validation uses 32-element Promise batches
inside an explicit Effect fold, avoiding one Effect fiber per guard. Cancellation
can stop between batches; already submitted filesystem operations finish without
publishing a result. No TTL, watcher-only validity or global validation memo exists.

Workspace edits invalidate only source/dependency entries, including in-flight
results once their manifest is known. Per-path revision snapshots reject edits
during extraction even if disk contents have not yet been saved. The revision map
is bounded at 4,096 paths; overflow conservatively invalidates globally. Settings
which affect parsing and workspace-root changes have a global epoch. Other
extension settings do not flush prepared ASTs. Source and identity checks run
before/after extraction; post-load identity checks also apply to disk/memory hits.
Dirty main files require the existing save confirmation. Dirty included editor
buffers block navigation until saved; no background operation saves documents.
Eight recent source-to-dependency path sets survive AST eviction/invalidation,
so a second unsaved edit and eventual header save still find the active TU.
Actual files, realpath aliases and creations below absent include ancestors are
covered. Related events bump the source revision and cancel that TU's jobs;
unrelated source events retain its entries and do not schedule it. Revision checks
inspect only paths whose revisions changed, avoiding a full proof traversal on
an unchanged RAM hit. Unknown in-flight dependencies are checked once extracted.

Module imports, framework/header-map searches, embed, time-dependent builtins,
response files, forced includes/imacros (including implicit PCH), modules/PCH,
VFS/config/plugin inputs outside the tracked model are parsed cold and not
retained. A manifest which cannot be verified fails rather than publishing an
unproven result. Ordinary -D/-I and conditional includes are covered. Parsing and
filesystem verification are not an atomic OS snapshot: changes after validation
have the same small race as a normal compiler invocation; editor events and
before/after checks reject observed races. On Linux, mapped native runtime images are captured from /proc/self/maps at
extraction start and matched to their filesystem inodes. Their nanosecond
metadata guards cover replacement of Clang/LLVM DSOs and the executable. A
changed runtime image rejects reuse even when the main binary did not change.
If mapped-image capture or precise runtime-image verification is unavailable,
retention is disabled and extraction remains cold; this includes unverified
non-Linux platforms in the initial implementation.

## Disk format and recovery

The default location is `<project>/.cache/fold-state-jump/ast/` with an exact
self-ignoring `<project>/.cache/fold-state-jump/.gitignore`:

```gitignore
# This file is autogenerated by fold-state-jump.
*
```

Root Git ignore files and `.git/info/exclude` are never edited. Project selection
uses the canonical source directory's nearest Git/worktree root, then the longest
containing workspace, then the source directory. Build cwd and process cwd do not
participate. Custom bases append a canonical-project hash. An unwritable local
destination falls back to `globalStorageUri/project-cache-v2/<project hash>/ast`;
if both fail, RAM/native analysis continues. Preparation occurs only on disk paths,
so RAM hits do not scan Git metadata or probe writable directories. Disk instances
share their write permit by AST directory. Selection is independent of BuildIdentity.
Old global `ast-v2` entries are unused; no automatic migration or deletion occurs.

`<ast directory>/<sha256(identity)>.ast` contains one JSON header line and
a gzip payload. Header schema 2 records identity, encoding, raw/compressed byte
counts, payload checksum, dependency-proof checksum, verified guards and write
time. `maxAstBytes` limits native JSON and decompressed size independently from
`cache.disk.maxBytes`. Reads are bounded before allocation; gunzip also has an
output limit. Unknown schemas, bad checksums/roots, partial/oversized files and
failed dependencies become misses. Only raw compact AST JSON is persisted; Maps,
wrapped nodes and prepared indexes are rebuilt after reload.

A unique mode-0600 temporary file is written in the same directory (mode 0700),
then atomically renamed. Cancellation checks precede publication. Failed writes
are logged and do not fail navigation. Default cumulative capacity is **unlimited**
(`cache.disk.maxBytes=0`). Valid entries are not deleted for capacity. An explicitly
positive optional limit enables mtime LRU under a separate write semaphore and
rejects entries larger than that limit. The configuration has no arbitrary 1 GiB
cumulative maximum. `maxAstBytes` still independently bounds each raw AST and
decompression. An identity names the latest snapshot for that context; a rebuild
atomically replaces its now-invalid older contents rather than archiving every
source version. Eviction scans only owned artifacts. Abandoned
temporary files older than an hour are removed on writes; clear removes owned
snapshots/temporaries immediately. A crash can leave a temporary file until that
cleanup. Atomic rename provides complete snapshots, not fsync-based durability
across power loss; bad snapshots rebuild. Independent extension hosts can race
in eviction/writes, so quota is best effort with temporary/transient overshoot.
They cannot cause unchecked stale hits. Lowering a positive capacity trims on the
next write. With zero capacity, writes skip snapshot enumeration/eviction and
only scan for stale temporary files. ENOSPC and other I/O failures log a failed
write and retain the already computed analysis result. Gzip/write/rename/temporary
cleanup is an uninterruptible bounded finalization region; the caller's abort
signal still prevents publication. Clear waits for that actual work, not only a
cancelled Promise wrapper. Atomic-write and clear permits are shared per directory.

## Scheduler and process lifetime

Scheduled debounce → Background (deadline) → Foreground (waiter count) → removed.
Ready data belongs to the memory/disk caches; no scheduler task retains it after
completion. All transitions replace Ref state; abort controllers, timers, output
and child handles are explicit external API resources.

Activation, active-editor changes, saves, relevant configuration and relevant dependency
filesystem events schedule only the active saved local C/C++ document. Default
delay is 1.5 seconds. Rapid events coalesce. Dirty/closed/ineligible documents,
configuration changes and editor switches cancel background interest. Prewarm is
skipped when reported free memory is below 2 GiB or one-minute load exceeds 80%
of available logical CPUs. Admission is checked when scheduling and before native
work obtains the CPU. These are best-effort checks, not continuous resource
enforcement or cgroup accounting. Dirty known dependency buffers block prewarm.
There is no reparse/resource polling. Returning to a running foreground TU removes
another editor's pending debounce; expired timer callbacks check their ownership.

Same-version foreground requests promote/join the background job. Their cursor
snapshots and cancellation remain independent. Cancelling the last foreground
waiter aborts the job; cancelling one of several waiters leaves it alive. Other
background work is cancelled when foreground work arrives; foreground tasks are
never queued behind scheduled background tasks. A background deadline is 120 s;
promotion removes that deadline and uses foreground cancellation. New versions
never share old work. At most one native child owns the extraction permit.
Background children receive OS nice 10; promotion attempts nice 0 and reports
success or failure. This host denies the increase without CAP_SYS_NICE, so a
promoted child retains nice 10 while preserving completed parsing. Foreground
children started directly use normal priority. PID ownership is cleared on exit;
no priority operation targets a known-exited child. No UI latency or contention
speedup is inferred from this scheduling mechanism.

`runClangAst` waits for child exit during interruption before releasing ownership,
escalating termination after one second. `deactivate` awaits scheduler draining;
subscription disposal also initiates cancellation. Clear synchronously closes
admission, cancels/drains existing jobs/native children and disk writes, then
removes only the active file's project's RAM entries and known disk directories,
plus its canonical namespaced global fallback even if created in an earlier
session. Previously configured custom paths unknown to the current session are
not searched or deleted. An unusable local path which was never admitted is not
treated as an owned cache directory.
Data removal is distinct from source invalidation: cross-project dependents keep
their valid RAM entries. The scheduler's admission gate is conservative across
projects; disk/RAM deletion is project scoped. Concurrent clears serialize and
keep admission closed until all finish; failure releases the gate. Events during
clear cannot start new prewarm. The scheduler remains usable afterward; related
path observations remain available. A manual clear also works while disk caching
is disabled. Production has no Workers
or persistent native daemon. Output events include task ID, source, reason,
priority, join/complete/cancel/failure, native PID/exit, cache source, duration and
host memory. Statistics include retained serialized bytes, disk usage, active
tasks and cancellation count. Actual VS Code UI lifecycle remains a manual test;
service integration verifies the real native children are reaped on this WSL host.

## Configuration and operation

```json
{
  "foldStateJump.prewarm.enabled": true,
  "foldStateJump.prewarm.delayMs": 1500,
  "foldStateJump.prewarm.onSave": true,
  "foldStateJump.cache.disk.enabled": true,
  "foldStateJump.cache.disk.maxBytes": 0,
  "foldStateJump.cache.disk.path": "",
  "foldStateJump.maxAstBytes": 67108864
}
```

Use **Fold State Jump: Show Cache Statistics** to open the output channel and
**Fold State Jump: Clear AST Caches** to drain work and reclaim storage. Turn off
prewarm to avoid background Clang CPU/RSS; manual commands still work. Concurrency
is deliberately fixed at one rather than exposing an unvalidated setting matrix.
The linked native extractor must be rebuilt when updating this extension.
