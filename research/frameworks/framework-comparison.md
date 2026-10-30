# 框架能力对比（基于实际实验）

| 维度 | Clang AST+CFG（本项目） | Clang Static Analyzer / FlowSensitive | LLVM + MemorySSA | PhASAR | SVF | CodeQL |
|---|---|---|---|---|---|---|
| 实际编译/运行 | 成功 | `--analyze`/DumpCFG 成功 | O0/O2 成功 | 配置成功，构建失败 | 配置成功，构建失败 | 未执行 |
| C++ 字段顺序/聚合初始化 | 原生可靠 | MemRegion 有字段，但需要自建建模 | IR GEP 索引，无字段名 | IR 需映射 | IR 需映射 | DB 有字段但在 IR/DB 层 |
| 模板实例 | USR/pattern/实例可靠 | 模板实例支持有限/需 checker | 实例化后 IR，源码身份弱 | IR 实例 | IR 实例 | 数据库实例 |
| 引用/指针/别名 | 显式 alias/pointer 事件 + boundary | MemRegion/RegionStore 有别名 | MemorySSA/AliasAnalysis 强 | 指针分析强 | 指针/值流强 | dataflow 强 |
| 跨函数 | 自建参数/返回/调用摘要 | 有限内联/CTU | 函数内，需 ICFG | IFDS/IDE/ICFG | 跨过程值流 | 全局 dataflow/CPG |
| fold seed/回边 | 显式 fold 契约 | 普通循环/调用，无 fold 语义 | 普通循环/phi | IFDS 可编码但需自建 | 可编码但需自建 | 可查询但需自建 |
| 源码 token 定位 | 精确 | 诊断路径/源码范围 | 行号为主 | IR 行号 | IR 行号 | DB 位置 |
| 资源内容 vs 元数据 | 显式 boundary | 外部函数建模有限 | 外部调用边界 | 需自建 | 需自建 | 需自建 |
| 部署成本 | 中（Clang 开发库） | 中 | 高（全项目 IR） | 高 | 高 | 高（DB/许可） |
| 许可 | Apache-2.0 with LLVM exceptions | Apache-2.0 with LLVM exceptions | Apache-2.0 with LLVM exceptions | MIT | AGPLv3（需核对） | 专有/受限 |

## 关键结论

1. 只有 Clang 同时提供“字段顺序 + 模板实例 + 源码 token”三者；这是本任务导航需求的硬约束。
2. MemorySSA 的 `MemoryPhi` 能表达循环/分支内存依赖，但字段名与源码 token 需要额外映射，且它是函数内分析。
3. PhASAR/SVF 的 IFDS/值流能力不能直接替代“fold 契约”；即使构建成功，仍要自建 seed/回边/零迭代/资源语义。
4. CodeQL 的查询能力很强，但许可和数据库构建成本不适合作为本机首版实现基础；未执行，不能宣称支持。
5. 因此选择 Clang AST+CFG 主路线，LLVM 仅作为未来别名补充；不选择“先选框架再定义需求”。

## 实际证据文件

```text
research/experiments/frameworks/tool-availability.txt
research/experiments/frameworks/clang-analyzer-cfg.txt
research/experiments/frameworks/clang-analyzer-negative.txt
research/experiments/frameworks/svf-configure.log
research/experiments/frameworks/svf-build.log
research/experiments/frameworks/phasar-configure.log
research/experiments/frameworks/phasar-build.log
research/experiments/llvm/opt-O0.err
research/experiments/llvm/opt-O2.err
```
