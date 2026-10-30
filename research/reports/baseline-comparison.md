# 与现有 fold-state-jump 的基线比较

> 旧插件只作基线，不作为 Oracle；未修改旧工作区。

## 运行事实

| 项目 | 旧 fold-state-jump | 新 state-trace 原型 |
|---|---|---|
| 运行命令 | `bun test/project-state-sources.ts /home/huawei/nano-infer` | `python3 tools/run_oracle.py` / 单查询 CLI |
| 输入 | nano-infer 当前工作区；原生 Clang 提取器 + mocked VS Code Provider | 同一 nano-infer；Clang 23 inventory |
| 时间 | 32.7s wall / 31.7s user | 48 查询 1.47s（加载 6 个 TU 图）；单查询 0.60s |
| 峰值内存 | 1.05GB | 203MB（48 查询）/ 123MB（单查询） |
| 输出 | 630 行 JSON 诊断/QuickPick 候选 | JSON targets/provenance/boundaries |
| 结果缓存 | 有原生 AST 缓存/PCH/VS Code 缓存层（README） | 无持久化；每次加载 NDJSON |
| 跨文件 | 真实 Provider caller 发现 + USR 校验；本地 AST 验证 | 当前按 TU；跨 TU 为 boundary |
| UI | Extension Host/QuickPick/命令/快捷键 | 无 |

## 语义对比

旧插件实际验证/声明：

- `Pipeline::execute` 两个具体模板实例；
- 三个 CLI seed 与 generation source-order wrap；
- 聚合字段顺序、move/no-op cast、简单引用别名、直接调用/返回；
- 显式边界：`Fold returned storage identity is not verified for batch_state.session_state.`、`No mutation is verified on this fold return path.`、`Fold seed identifies the initial storage; the current member value may be carried from a previous iteration.`
- mutation 明确是 source-order candidates，不是 CFG 可达性证明。

新原型：

- 能对 `++bank_state.counters.graph_builds/graph_reuses` 给出 seed + fold 回边 + 整体替换候选；
- 能区分 alias 绑定与写入、value copy 与 move、动态下标 boundary；
- 对 BatchState 聚合返回/clear_session 最终来源/DeepSeek 跨函数仍大量 mismatch；
- 明确输出 boundary 原因和 provenance edge。

## 结论

旧插件在**工程成熟度/UI/缓存/跨文件 caller**上优于新原型；新原型在**状态模型分层、fold 回边、boundary 类型**上有更清晰的基础，但覆盖率和精度尚未达到可替换程度。

迁移建议：先保留旧插件前端/缓存/Provider，把新引擎作为可选 native 后端；按语义类别补齐（聚合返回、variant/optional、资源内容、跨 TU），不要按业务字段打补丁。未测缓存大小/预热查询时间，不能给出加速比。
