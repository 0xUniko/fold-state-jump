# Clang FlowSensitive / Static Analyzer 评估

## 实际执行

```bash
clang++-23 --analyze -Xanalyzer -analyzer-checker=debug.DumpCFG \
  prototype/fixtures/fold_recurrence.cpp
clang++-23 --analyze -Xanalyzer -analyzer-output=text \
  prototype/fixtures/negative_control.cpp
```

结果：

- `DumpCFG` 成功，输出 `box.bucket.hits += 1` 的逐表达式 CFG（`research/experiments/frameworks/clang-analyzer-cfg.txt`）；
- `DeadStores` 成功报告 `value=2` 为死写（`clang-analyzer-negative.txt`）；
- 没有编写自定义 `DataflowAnalysis` 插件；本研究的 CFG 事件图由独立 LibTooling 工具产出。

## 可直接复用的概念

- `CFG`/`CFGBlock`：语句级控制流、分支/循环；
- `ProgramState`/`Environment`：路径敏感值环境；
- `SVal`/`MemRegion`/`RegionStore`：存储位置、字段区域、符号值；
- `DataflowAnalysis` 的 lattice/transfer/fixpoint API。

## 为什么没有直接用它做主求解器

1. **没有 fold 契约**：`ranges::fold_left`/`std::accumulate` 是普通调用/循环；`DataflowAnalysis` 不会自动知道 seed、lambda 参数、上一轮返回、零迭代。
2. **跨函数**：Static Analyzer 主要靠内联/有限 CTU；完整调用者集合与摘要不是它的导航输出。
3. **模板/容器/资源**：模板实例、variant/optional、ggml buffer、ticket 需要自定义 checker；工作量不小于自建图。
4. **输出**：它输出诊断/路径，不直接给出“点击字段 → 候选源码位置”的稳定 JSON。
5. **可达性**：路径敏感分析成本高，nano-infer 的模板/标准库体量大；需要大量过滤。

## 结论

Clang FlowSensitive 是“控制流/存储区域事实”的可靠来源，但不是现成的状态历史求解器。本研究复用 Clang CFG，自建 fold/摘要/边界；未来可以把 `MemRegion`/`RegionStore` 的 alias 能力作为可选后端，而不是整体替换查询引擎。
