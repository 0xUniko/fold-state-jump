# Changelog

## 0.2.0

- Reuse validated compact ASTs in memory and across processes, checking build
  identity, transitive headers, missing include candidates and native runtimes.
- Store snapshots per project under `.cache/fold-state-jump`, with conservative
  global fallback and non-destructive ignore-file handling. Disk capacity is
  unlimited by default; per-AST limits and optional LRU capacity remain available.
- Prewarm the active saved file, share foreground loads and drain cancelled
  native work before releasing ownership or clearing caches.
- Add cache statistics/clear commands, regression coverage and reproducible
  performance results. PCH remains an independent research PoC and is disabled.

## 0.1.0

- Initial prototype of a VS Code command for tracing fold-state mutations.
- Clang JSON AST acquisition and basic direct-call/reference analysis.
- Command palette entry and keyboard shortcut.
