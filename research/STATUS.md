# STATUS

更新时间：2026-10-30 UTC+8
工作 tree：`/home/huawei/fold-state-jump-research`；分支 `research/state-trace`；基线 `89323138d`

## 已完成

- [x] 独立 worktree；原 `fold-state-jump` 工作区未修改；研究分支单独提交/push。
- [x] nano-infer 只读审计；Git 版本/脏文件/hash 固定。
- [x] Clang 23 AST/CFG 提取器（`prototype/native/ast-inventory.cpp`）编译运行。
- [x] 6 个 TU 的机械 inventory：680 functions、79 template instances、84 fold sites、86 instances、86k events、7,976 writes、9,114 transfers、47 state records。
- [x] 状态地图：SessionState/BatchState/LayerExecution/BankState/SlotState/PendingPrefetch/Generation/DeepSeek Attention/FfnRuntime。
- [x] 独立 Oracle schema + 48 条 JSONL；覆盖 4 种 query mode、6 种结果类别。
- [x] Oracle 覆盖率分母：84 个 fold 源全部列出，`oracle-coverage.md` 标记 covered/grouped/pure/test-only。
- [x] 通用 fixtures：fold recurrence、aggregate negative、optional/variant、template、async、pointer/callback、dynamic index、overload/same-name、negative control。
- [x] 13 个 fixture 单元测试全部通过。
- [x] CLI 原型 `prototype/src/state_trace.py`，支持 origin/mutation/history/provenance、JSON、boundary、证据链。
- [x] Oracle 自动对照：`tools/run_oracle.py`；结果 `correctness-results.md` / `oracle-run.json`。
- [x] Clang/LLVM/Static Analyzer 实际实验；PhASAR/SVF clone/configure/build 失败记录。
- [x] 旧插件基线运行（32.7s/1.05GB）。
- [x] 架构选择、限制、性能、最终报告。

## 当前阶段（第二轮继续）

- [x] Oracle 独立复核并修正 `layer == 0` 首轮错误（graph_builds/graph_reuses）。
- [x] 状态查询矩阵：8,788 sites（含 fold-context/mechanical/oracle 分层）。
- [x] 真实 Clang FlowSensitive 实验：`prototype/native/flow-sensitive-probe.cpp`。
- [x] 新 TS 引擎：`src/state-trace/engine.ts`；worklist/CFG/alias/fold guard/查询。
- [x] native `state-inventory` 目标与 `native/build/state-inventory`。
- [x] 现有 VS Code 命令接入新引擎；`test/state-trace-command.ts` 通过。
- [x] 新 fixtures：首轮 guard、重命名/改序、未来写、动态下标/指针。
- [x] `bun check`、`bun run build`、`bun test`（540 pass / 28 files）通过。
- [x] TypeScript 引擎 Oracle：`correctness-results-ts.md`（20 mismatch，未完成）。

## 当前结果（不得美化）

```text
Python 研究原型 Oracle（历史基线）
Oracle entries 48
correct-conditional        12
correct-boundary            5
correct-multiple            2
targets-found-kind-mismatch 3
mismatch                   26
required-target recall    46/119
strict target overlap     45/518（目标集非穷尽，不能当 precision）
```

Python 基线主要未通过类别：BatchState 聚合返回、start_session/clear_session 最终来源、部分跨函数/variant/optional、ranges pipeline 构造、资源内容 boundary。
TypeScript 新引擎：`correctness-results-ts.md` 当前 20 mismatch、14 correct-conditional、8 correct-boundary、2 correct-multiple、2 kind mismatch、1 unsupported。

## 未完成/下一步

- [ ] 跨 TU caller/summary 索引（当前 boundary）。
- [ ] 聚合 return-field 完整传播（TS 引擎仍缺失部分）。
- [ ] 资源 ticket/内容完成与 variant 类型级状态机。
- [ ] 聚合 return-field 在查询引擎中的完整字段传播。
- [ ] variant/optional 类型级状态机（存在性、alternative、空状态）。
- [ ] 资源内容版本/所有权统一模型（buffer/ticket/device）。
- [ ] 模板实例查询选择 UI/实例枚举输出。
- [ ] Program Graph 持久化/增量失效/冷启动优化。
- [ ] 旧插件全部命令路径的 state-trace 回归（当前两条主命令已接线，legacy 测试显式保留）。
- [ ] 用更多 nano-infer 查询扩充 Oracle；完整覆盖 84 个 fold 源。

## 复现检查点

```bash
cd /home/huawei/fold-state-jump-research
cmake --build prototype/native/build -j 8
python3 -m unittest prototype/tests/test_fixtures.py -v
python3 tools/aggregate_inventory.py
python3 tools/author_oracle.py
python3 tools/run_oracle.py
python3 tools/coverage.py
```

## 环境阻塞

见 `research/reports/limitations.md`、`research/frameworks/licenses-and-versions.md`。
