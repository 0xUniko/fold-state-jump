# 沙箱内 Bun 基线失败逐项核对

以下 41 项在修改前后均失败，典型表现是 preamble worker 提前退出及 fallback 引发的后续断言失败。相同套件在 Node 共 54/54 通过；最终在沙箱外执行相同 `bun test`，包括以下每一项，357/357 通过。**没有更改或跳过这些测试。** 因而已确认本会话沙箱与 Bun 子进程通信的组合是原因，不能推断一般环境下 Bun 存在相同问题。

| 文件 | 测试 | 沙箱外 Bun |
|---|---|---|
| test/preamble-context.test.ts | a newly discovered GCC installation rejects the retained context and recovers through cold parsing | PASS |
| test/preamble.test.ts | reuses the same prefix and a changed function body with identical cold query results | PASS |
| test/preamble.test.ts | AST hits bypass native work and concurrent requests use the existing single-flight | PASS |
| test/preamble.test.ts | direct concurrent extraction serializes worker exchanges and constructs one preamble | PASS |
| test/preamble.test.ts | a PCH extraction restores through the existing disk AST cache after worker shutdown | PASS |
| test/preamble.test.ts | prefix macro and conditional order is preserved before included constexpr definitions | PASS |
| test/preamble.test.ts | idle expiration releases the artifact and the next request builds a fresh worker | PASS |
| test/preamble.test.ts | abrupt parent exit releases the native worker | PASS |
| test/preamble.test.ts | duplicate prewarm and foreground callers share one build and independent cancellation | PASS |
| test/preamble.test.ts | in-flight cancellation reaps the worker and the next request rebuilds | PASS |
| test/preamble.test.ts | abort, worker crash, disposal and a fresh pool recover with correct cold results | PASS |
| test/preamble-ssd.test.ts | host-accepted Native rejection invalidates and rebuilds once in the same healthy worker | PASS |
| test/preamble-ssd.test.ts | failed recovery builds only once, parses cold and never reloads the rejected pair | PASS |
| test/preamble-ssd.test.ts | source, prefix, dependency and command changes during rejection prevent recovery publication | PASS |
| test/preamble-ssd.test.ts | cancellation and crash after rejection reap the lock owner without recovery on a dead worker | PASS |
| test/preamble-ssd.test.ts | two independent pools recover one rejected artifact without racing publication | PASS |
| test/preamble-ssd.test.ts | repeated confirmed dependency invalidation suppresses foreground builds and prewarm restores them | PASS |
| test/preamble-ssd.test.ts | host-verified invalid Clang bytes are rejected by load and replaced after one recovery | PASS |
| test/preamble-ssd.test.ts | clear waits for recovery publication and preserves user files and persistent lock inodes | PASS |
| test/preamble-ssd.test.ts | timeout during the one recovery build reaps worker, temporary directory and advisory lock | PASS |
| test/preamble-ssd.test.ts | dependency changes after recovery admission still prevent publication | PASS |
| test/preamble-ssd.test.ts | valid SSD artifacts take priority over suppression in the same namespace | PASS |
| test/preamble-ssd.test.ts | Native identity rejection recovers only when fresh request observations remain stable | PASS |
| test/preamble-ssd.test.ts | switches files and reloads the first artifact without rebuilding after a body edit | PASS |
| test/preamble-ssd.test.ts | a new native process loads a persistent artifact with complete merged body dependencies | PASS |
| test/preamble-ssd.test.ts | restores a PCH built with large recursive headers that Clang can memory-map | PASS |
| test/preamble-ssd.test.ts | truncated PCH and incomplete metadata recover automatically | PASS |
| test/preamble-ssd.test.ts | damaging the native temporary PCH after build cannot affect parsing or publish damaged bytes | PASS |
| test/preamble-ssd.test.ts | independent pools coordinate construction of the same artifact | PASS |
| test/preamble-ssd.test.ts | a PCH symlink is never followed or overwritten | PASS |
| test/preamble-ssd.test.ts | clearing removes owned PCH artifacts while preserving lock inodes and user files | PASS |
| test/preamble-ssd.test.ts | worker crash and idle expiry preserve valid artifacts for a fresh native process | PASS |
| test/preamble-ssd.test.ts | cancellation after the native disk build removes its unpublished staging directory | PASS |
| test/preamble-ssd.test.ts | cancellation reaps its worker and leaves no published incomplete artifact | PASS |
| test/preamble-native.test.ts | restores across processes with exact include level, macro ordering and conditional stack after a body edit | PASS |
| test/preamble-native.test.ts | parses fixed build bytes after its mutable temporary artifact is corrupted | PASS |
| test/preamble-native.test.ts | restores the complete runtime proof when a large header was mapped only during preamble construction | PASS |
| test/preamble-native.test.ts | rejects mismatched bounds, line boundary, prefix, invocation, artifact checksum and dependency bytes | PASS |
| test/preamble-native.test.ts | rejects changed compiler invocation and corrupt PCH without an AST | PASS |
| test/preamble-native.test.ts | rejects symlinked cache parents and artifact leaves | PASS |
| test/preamble-native.test.ts | serializes the same artifact lock and releases it on unlock and SIGKILL | PASS |
