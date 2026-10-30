# STATUS

更新时间：2026-10-30 UTC+8
工作 tree：`/home/huawei/fold-state-jump-research`（detached HEAD `89323138d`）

## 已完成

- [x] 独立 worktree；未修改原 `fold-state-jump`，未提交/push。
- [x] nano-infer 只读审计；Git 版本/脏文件/hash 固定。
- [x] Clang 23 AST/CFG 提取器（`prototype/native/ast-inventory.cpp`）编译运行。
- [x] 6 个 TU 的机械 inventory：680 functions、79 template instances、84 fold sites、86 instances、86k events、7,801 writes、9,134 transfers、47 state records。
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

## 当前结果（不得美化）

```text
Oracle entries 48
correct-conditional        12
correct-boundary            5
correct-multiple            2
targets-found-kind-mismatch 3
mismatch                   26
required-target recall    46/119
strict target overlap     45/518（目标集非穷尽，不能当 precision）
```

主要未通过类别：BatchState 聚合返回、start_session/clear_session 最终来源、部分跨函数/variant/optional、ranges pipeline 构造、资源内容 boundary。

## 未完成/下一步

- [ ] 跨 TU caller/summary 索引（当前 boundary）。
- [ ] 聚合 return-field 在查询引擎中的完整字段传播。
- [ ] variant/optional 类型级状态机（存在性、alternative、空状态）。
- [ ] 资源内容版本/所有权统一模型（buffer/ticket/device）。
- [ ] 模板实例查询选择 UI/实例枚举输出。
- [ ] Program Graph 持久化/增量失效/冷启动优化。
- [ ] VS Code 前端接入（当前只 CLI）。
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
