# DECISIONS

## D1：独立 worktree，detached HEAD

- 原 `fold-state-jump` 工作区有 `M AGENTS.md`；原仓库无研究分支授权。
- 使用 `git worktree add --detach ... 89323138d`，不提交、不 push、不改原工作区。
- nano-infer 只读；编译数据库修正只放 `/tmp/opencode/nano-db`。

## D2：先审计/Oracle，后实现

- 先完成 Clang inventory 与 fold/state 清单，再写查询引擎。
- Oracle 独立于旧插件和新原型；不根据原型输出回写 Oracle。
- 旧插件结果只作基线，不作真值。

## D3：Clang AST+CFG 作为主路线

理由：

- 字段顺序、模板实例、USR、源码 token 是导航硬需求；
- LLVM IR 丢失字段名/源码关系；
- PhASAR/SVF 当前 LLVM 23 构建失败；
- CodeQL 许可/部署不适用。

不选纯 LLVM/框架优先，也不选旧插件增量补丁。

## D4：用事件图 + 需求驱动反向分析，不物化全程序 SSA

- 对每个查询按 CFG 反向找 may reaching defs；
- 跨函数/ fold 按需展开；
- 未解析/动态索引/预算耗尽显式 boundary；
- visited + depth/node 限制终止。

## D5：fold 是通用状态递推，不是业务特例

- seed 字段按 Clang 聚合字段顺序；
- lambda 参数是 acc；
- `return` 是回边；
- 零迭代 = seed；
- 多 return/提前返回分别保留；
- 纯值/图 fold 标 Unsupported，不伪造 mutation。

## D6：move/copy/alias/pointer 分开建模

- `std::move` 是值/资源转移事件，不证明存储身份相同；
- 引用绑定是 alias，不是写入；
- `Retaining` 的指针 fold 解析 pointee 到调用者对象；
- 动态下标/指针 points-to 只给 boundary/may-alias。

## D7：异步资源内容与对象元数据分开

- `pending`/ticket/描述值/共享缓冲区/资源内容/完成信号分开；
- 提交读取 ≠ 完成；
- `ggml_backend_buffer_clear`/`pread`/`copy_record` 是 boundary 或显式资源效果，不混入字段到达定义。

## D8：Oracle 结果诚实报告

- 48 条中 26 mismatch；不通过删测试/改 Oracle/加业务名特例提高数字；
- 失败按语义类别归档（跨函数、聚合返回、variant、资源、ranges），不按 `bank_state` 名字打补丁。

## D9：flow-sensitive 只作为实验/可选局部后端

真实 `DataflowAnalysis` 实验证明它能做 CFG join/fixpoint 和 storage location，但引用/字段 canonicalization、聚合字段、fold/跨函数/资源摘要仍需自建。正式引擎没有把 FlowSensitive 当成完整状态追踪器；保留其思想（CFG、Environment、StorageLocation、worklist）作为架构依据。

## D10：fold 首轮 guard 是统一语义，不是 graph 计数器特例

`layer == 0` 只可能由 fold 首元素进入，因此同 fold backedge 不可达，不能作为 history 的 prior mutation。实现使用 range 首元素 + 条件文本/AST 的通用 guard；否则 backedge 只能作为 Conditional。Oracle 已按此纠正，独立 fixture `fold_first_guard.cpp` 覆盖。

## D11：新引擎是 TypeScript + native semantic frontend

- native `state-inventory` 负责 Clang AST/CFG/字段/模板/源码事实；
- `src/state-trace/engine.ts` 负责 worklist、别名、fold、跨函数、查询；
- 旧 `src/analysis.ts` 只在 `analysisEngine=legacy` 下保留对照，默认 `state-trace`；
- 不把 Python 研究原型作为插件运行时。

## D12：矩阵/审计的 reviewed/mechanical 分层

`state-query-matrix.json` 的 8,786 sites 中只有 103 个 oracle 锚点，其余 fold-context/mechanical 不得计入“已审查覆盖”。`fold-audit.json` 的 reviewed 只表示人工读过该生命周期，不等于自动化通过。
