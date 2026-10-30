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
7. `research/STATUS.md` / `DECISIONS.md` / `EXPERIMENTS.md` — 中断恢复点。

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

```bash
# Clang 23 提取器
cmake -S prototype/native -B prototype/native/build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm \
  -DClang_DIR=/usr/lib/llvm-23/lib/cmake/clang
cmake --build prototype/native/build -j 8

# 查询（示例）
python3 prototype/src/state_trace.py \
  --file /home/huawei/nano-infer/minicpm-v-4_7/pipeline.h \
  --line 872 --column 30 --mode origin \
  --tu minicpm-v-4_7_cli
```

`--mode`：`origin | mutation | history | provenance`。

## 重新生成研究数据

```bash
# 1) 提取（路径按实际；DeepSeek 需 /tmp 修正 compile DB）
prototype/native/build/ast-inventory -p /home/huawei/nano-infer \
  -root /home/huawei/nano-infer minicpm-v-4_7/cli.cpp \
  > research/inventory/raw/minicpm-v-4_7_cli.ndjson

# 2) 聚合/覆盖率/Oracle
python3 tools/aggregate_inventory.py
python3 tools/author_oracle.py
python3 tools/run_oracle.py
python3 tools/coverage.py

# 3) fixtures
python3 -m unittest prototype/tests/test_fixtures.py -v
```

## 结果摘要

- 6 TU / 680 functions / 79 template instances / 84 fold 源 / 86 实例 / 87,294 events。
- fixture 13/13 通过。
- Oracle 48 条：12 correct-conditional、5 correct-boundary、2 correct-multiple、3 targets-found-kind-mismatch、26 mismatch。
- 提取 15.3s/1.06GB（MiniCPM cli）；48 查询 1.47s/203MB；旧插件基线 32.7s/1.05GB。

## 明确未做

- 未接入 VS Code UI/QuickPick；
- 未做跨 TU caller 索引/全程序固定点；
- 未完成 variant/optional/资源内容/聚合返回的完整求解；
- 未成功构建 PhASAR/SVF，未执行 CodeQL；
- 未修改/提交原 `fold-state-jump`，未 push。
