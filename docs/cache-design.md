# Validated AST cache and prewarm lifecycle

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

Lookup is memory → verified disk snapshot → native extraction. The existing
semaphore bounds cold work to one and rechecks after acquiring the permit. A
valid warm entry bypasses it. Entries no longer expire by elapsed time. Immutable
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
Filesystem verification concurrency is bounded at 32.

Workspace edits invalidate only source/dependency entries, including in-flight
results once their manifest is known. Per-path revision snapshots reject edits
during extraction even if disk contents have not yet been saved. The revision map
is bounded at 4,096 paths; overflow conservatively invalidates globally. Settings
which affect parsing and workspace-root changes have a global epoch. Other
extension settings do not flush prepared ASTs. Source and identity checks run
before/after extraction; post-load identity checks also apply to disk/memory hits.
Dirty main files require the existing save confirmation. Dirty included editor
buffers block navigation until saved; no background operation saves documents.

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

`globalStorageUri/ast-v2/<sha256(identity)>.ast` contains one JSON header line and
a gzip payload. Header schema 2 records identity, encoding, raw/compressed byte
counts, payload checksum, dependency-proof checksum, verified guards and write
time. `maxAstBytes` limits native JSON and decompressed size independently from
`cache.disk.maxBytes`. Reads are bounded before allocation; gunzip also has an
output limit. Unknown schemas, bad checksums/roots, partial/oversized files and
failed dependencies become misses. Only raw compact AST JSON is persisted; Maps,
wrapped nodes and prepared indexes are rebuilt after reload.

A unique mode-0600 temporary file is written in the same directory (mode 0700),
then atomically renamed. Cancellation checks precede publication. Failed writes
are logged and do not fail navigation. Completed files use mtime LRU under a
separate write semaphore. Default soft capacity is 128 MiB. An entry larger than
the capacity is not persisted. Eviction scans only owned artifacts. Abandoned
temporary files older than an hour are removed on writes; clear removes owned
snapshots/temporaries immediately. A crash can leave a temporary file until that
cleanup. Atomic rename provides complete snapshots, not fsync-based durability
across power loss; bad snapshots rebuild. Independent extension hosts can race
in eviction/writes, so quota is best effort with temporary/transient overshoot.
They cannot cause unchecked stale hits. Lowering capacity trims on the next
write; clear is available for immediate reclamation.

## Scheduler and process lifetime

Scheduled debounce → Background (deadline) → Foreground (waiter count) → removed.
Ready data belongs to the memory/disk caches; no scheduler task retains it after
completion. All transitions replace Ref state; abort controllers, timers, output
and child handles are explicit external API resources.

Activation, active-editor changes, saves, relevant configuration and active-file
filesystem events schedule only the active saved local C/C++ document. Default
delay is 1.5 seconds. Rapid events coalesce. Dirty/closed/ineligible documents,
configuration changes and editor switches cancel background interest. Prewarm is
skipped when reported free memory is below 2 GiB; this is a best-effort admission
check, not continuous resource enforcement. There is no reparse polling.

Same-version foreground requests promote/join the background job. Their cursor
snapshots and cancellation remain independent. Cancelling the last foreground
waiter aborts the job; cancelling one of several waiters leaves it alive. Other
background work is cancelled when foreground work arrives; foreground tasks are
never queued behind scheduled background tasks. A background deadline is 120 s;
promotion removes that deadline and uses foreground cancellation. New versions
never share old work. At most one native child owns the extraction permit.

`runClangAst` waits for child exit during interruption before releasing ownership,
escalating termination after one second. `deactivate` awaits scheduler draining;
subscription disposal also initiates cancellation. Clear drains current tasks
before clearing caches, leaving the scheduler usable. Production has no Workers
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
  "foldStateJump.cache.disk.maxBytes": 134217728,
  "foldStateJump.maxAstBytes": 67108864
}
```

Use **Fold State Jump: Show Cache Statistics** to open the output channel and
**Fold State Jump: Clear AST Caches** to drain work and reclaim storage. Turn off
prewarm to avoid background Clang CPU/RSS; manual commands still work. Concurrency
is deliberately fixed at one rather than exposing an unvalidated setting matrix.
The linked native extractor must be rebuilt when updating this extension.
