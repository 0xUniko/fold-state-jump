# FAILURE QUEUE

失败先归入通用语义类别，再处理同类全部案例；不以 nano-infer 字段名逐案修。

## 已完成复核：fold 首轮 guard

### Problem

`Pipeline::execute` 的 `++bank_state.counters.graph_builds` / `graph_reuses` 位于 `if (layer == 0)` 内。旧 Oracle 把同一个 fold 的上一轮写当作 history，这是错误的：当前 fold 的第 0 次迭代之前没有同 fold 上一轮；`layer == 0` 分支只可能由首元素进入。

### Semantic rule

fold 的 backedge 只在 `iteration > 0` 可达。若 range 是 `iota(start, end)` 且查询被 `element == start` 的 guard 支配，则当前是首轮，同 fold backedge 不可达。否则 backedge 只能是 Conditional may-candidate。

### Representation / solver effect

需要 fold 摘要的 `range.firstElement` 和 `iterationGuard`；查询把 guard 作为路径条件，排除首轮不可达的 backedge。不能仅凭“源码上方有 `++`”添加回边。

### Oracle correction

已将两条 Oracle 改为：

- seed：`pipeline.h:869`；
- 上一批返回：`pipeline.h:1209`；
- fresh/reset session：1280/1299；
- 明确写入：同 fold 上一轮不可能；`1081` 是同一迭代的后续整体替换，不是 prior reaching definition。

### Independent tests

- fold history 在 `element == first` 分支内不得返回 backedge；
- 在无 guard 的后续元素分支内，backedge 必须是 Conditional；
- 零迭代只返回 seed。

### Regression

修复该规则后，所有 fold history 查询共用同一首轮 guard 判断，而不是只修 graph 计数器。

## 当前失败分类（Oracle 48 条）

| 类别 | 代表案例 | 通用修复 |
|---|---|---|
| Frontend/aggregate return | `return.batchstate-field-mapping`、`start_session.caches` | 递归 `return-field` + 聚合字段映射 |
| Object/storage identity | `clear_session.bankstate.reconstruction` | 对象 vs 资源 vs 字段身份；重建后旧历史隔离 |
| Alias/pointer | `ffn.retaining.pointer-fold`、`pointer_callback` | 引用/指针 canonicalization；未知 pointee => boundary |
| CFG/reaching defs | `position.read`、`generation.text` | 真正的 worklist + 覆盖写杀死 + 首轮 guard |
| Interprocedural | `plan-slots.origin`、`ffn.server.state-fold` | 参数/返回摘要、多调用上下文 |
| Fold | `graph_*`、`pending`、`deepseek.generation` | 统一 FoldSummary；零/首/后续轮 |
| Stdlib/variant | `std::get`、optional reset、variant | API 契约摘要，不按类型名/业务名 |
| Resource/async | `expert_io.finish_*`、`buffer_clear` | ResourceEffect：内容写 vs 元数据；ticket 完成 |
| Source mapping | 所有 header/template | USR + 实例 + 源码范围；no line-only identity |
| Query presentation | 多目标/同名候选 | 统一结果去重，不丢 instance |

## 尚未审查

`research/inventory/state-query-matrix.json` 中 8,788 个状态相关 site：

- `oracle` 75（仅这些有独立复核查询）；
- `fold-context` 6,923（fold lambda 内事件，机械分类）；
- `mechanical` 1,740（类型相关但无 Oracle）。

这些不是“全部 reviewed”。后续每个类别增加独立 fixture/Oracle，不能把 mechanical 数量当通过率。

## 规则不存在时的处理

若某失败无法归入以上类别，先写语义规则和独立反例；写不出来则不改查询函数。禁止：

- 判断 `bank_state`/`SessionState`/`Generation` 等业务名；
- 固定源码行号；
- 用文本“最近赋值”代替 CFG；
- 把 unknown 写成 NoPriorMutation；
- 把 fold 上一轮无条件当成本轮历史。
