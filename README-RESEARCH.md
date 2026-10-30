# fold-state-jump-research

从零研究：C++ 状态来源、历史修改、跨函数传递与 fold 递推的通用源码级追踪。

本仓库是独立 detached worktree（`/home/huawei/fold-state-jump-research`），不基于旧插件实现。nano-infer 只读。

## 先读什么

1. `research/reports/final-report.md` — 8 个问题的完整结论。
2. `research/reports/nano-infer-state-map.md` — 状态/字段/fold 生命周期。
3. `research/oracle/nano-infer-oracle.jsonl` — 48 条独立 Oracle。
4. `research/oracle/oracle-coverage.md` — 84 个 fold 源的完整分母。
5. `research/reports/correctness-results.md` — 诚实的通过/失败分类。
6. `research/reports/selected-architecture.md` — 形式化模型。
7. `research/SEMANTIC-SPEC.md` / `ARCHITECTURE.md` / `FAILURE-QUEUE.md` — 语义规范、架构和失败分类。
8. `research/inventory/state-query-matrix.json` / `fold-audit.json` — 10,031 个状态 site 与 84/86 fold 审计记录。
9. `research/reports/implementation-status.md` / `correctness-results-ts.md` — 新 TS 引擎与 Oracle 结果。
10. `research/STATUS.md` / `DECISIONS.md` / `EXPERIMENTS.md` — 中断恢复点。

## 目录

```text
research/inventory/     Clang AST/CFG 机械 inventory + fold 表
research/oracle/        Oracle schema/JSONL/coverage/fixtures 说明
research/frameworks/    Clang/LLVM/PhASAR/SVF/CodeQL 实验与许可
research/experiments/   LLVM IR/MemorySSA 产物、框架构建日志
research/measurements/  Oracle 运行、提取时间/内存、旧插件基线
research/reports/       状态地图/架构/正确性/性能/限制/最终报告
prototype/native/       Clang 23 LibTooling 提取器
prototype/src/          state-trace 查询引擎
prototype/tests/        独立 fixture 测试
prototype/fixtures/     通用 C++ 语义 fixtures + inventory
tools/                  聚合/Oracle 对照/覆盖率脚本
```

## 构建与运行

新引擎默认已接入现有两条 VS Code 命令（`analysisEngine=state-trace`）。旧分析器保留为显式 `legacy` 对照。

插件配置：

- `foldStateJump.analysisEngine`: `state-trace`（默认）或 `legacy`；
- `foldStateJump.stateTraceExtractorPath`: 可选 native `state-inventory` 路径，默认 `<extension>/native/build/state-inventory`。

```bash
bun install --frozen-lockfile

# 构建新 native inventory（同时保留旧 fold-state-jump-ast）
cmake -S native -B native/build -G Ninja -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm \
  -DClang_DIR=/usr/lib/llvm-23/lib/cmake/clang
cmake --build native/build -j 8

bun check
bun test
bun run build

# 独立 TypeScript 引擎 CLI（fixture inventory）
bun src/state-trace/cli.ts \
  --inventory prototype/fixtures/inventory/fold_recurrence.ndjson \
  --file prototype/fixtures/fold_recurrence.cpp \
  --line 37 --column 13 --mode history
```

`--mode`：`origin | mutation | history | provenance`。

## 重新生成研究数据

```bash
# 1) 提取（路径按实际；DeepSeek 需隔离 compile DB）
prototype/native/build/ast-inventory -p /home/huawei/nano-infer \
  -root /home/huawei/nano-infer minicpm-v-4_7/cli.cpp \
  > research/inventory/raw/minicpm-v-4_7_cli.ndjson

# 2) 聚合/矩阵/fold审计/Oracle
python3 tools/aggregate_inventory.py
python3 tools/build_state_matrix.py
python3 tools/build_fold_audit.py
python3 tools/author_oracle.py
python3 tools/coverage.py
bun tools/run_oracle_ts.ts

# 3) fixtures / 插件
bun test
```

## 结果摘要

- 6 TU / 680 functions / 79 template instances / 84 fold 源 / 86 实例 / 91,165 events。
- fixture 13/13 通过。
- TypeScript 新引擎 Oracle 48 条：20 correct-conditional、8 correct-boundary、14 correct-multiple、1 correct-no-prior、2 targets-found-kind-mismatch、1 unsupported、2 mismatch（未完成，不美化）；required-target recall 90/119。
- 提取 15.3s/1.06GB（MiniCPM cli）；TypeScript 48 查询 1.54s/496MB（单查询 0.21s/206MB）；旧插件基线 32.7s/1.05GB。

## 明确未做

- 未做完整 Extension Host/VSIX；现有命令已接入新引擎，并有 mock VS Code 集成测试；
- 未做跨 TU caller 索引/全程序固定点；
- 未完成 variant/optional/资源内容/聚合返回/跨 TU 的完整求解；
- 未成功构建 PhASAR/SVF，未执行 CodeQL；
- 原 `fold-state-jump` 工作区未修改；研究分支 `research/state-trace` 保留单独提交/push，不自动改动 `main`。
