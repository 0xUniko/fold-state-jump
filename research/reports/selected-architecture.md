# 选定的形式化模型与架构

## 1. 分层

```text
Clang 23 AST/CFG
  → Source Inventory (NDJSON)
       functions / records / folds / events / CFG
  → Program Graph (per TU)
       storage identity, state versions, transfer edges, boundaries
  → Demand-driven Query Engine
       Origin / Reaching Mutation / History / Provenance
  → CLI JSON
```

Clang 只负责它可靠的事实：声明、类型、字段顺序、模板实例、USR、CFG、源码范围。它不负责“哪次修改是历史”“fold 上一轮是什么”；这些进入显式图模型。

## 2. 存储身份（Storage Identity）

不使用单一 `rootId + members` 覆盖所有 C++ 关系，而是有类型的根：

| 根 | 含义 | 例子 |
|---|---|---|
| `decl:<USR>` | 声明对应的存储（局部/参数/全局） | `session_state` 参数 |
| `this:<method USR>` | 成员函数接收者对象 | `this->bank_context` |
| `field:<record USR>.<name>` | 字段声明（仅用于声明映射/证据） | `LayerExecution.bank_state` |
| `call:<call-event-id>` | 调用返回值（值，不是调用者存储） | `execute(...)` 返回值 |
| `lambda:<lambda USR>` | 闭包对象 | `[&]` |
| `fold:<fold-id>:acc` | fold 累积器的合成身份 | seed 字段映射 |
| `fold:<fold-id>:result` | fold 结果（零/多迭代） | `layer_execution` |
| `return:<fn USR>:<ret>` | 聚合返回值的合成字段根 | `BatchState.session_state` |

路径后缀保留：`.field`、`->field`、`[N]`、`[*:expr]`（动态下标）、`[at:expr]`（容器访问器）、`[get:...]`（variant/tuple 选择）、`[operator*]`。

**身份规则**：

1. 字段按 Clang `FieldDecl` 顺序和成员声明映射；同名不同对象不合并。
2. `std::move(x)` 是值/资源转移，不自动让目标拥有源存储身份；`move` 事件单独记录。
3. 引用绑定 `T& r = x.field` 是 alias 事件，不写入 `x.field`；使用时解析到目标路径。
4. `lambda` 的 by-reference capture 解析到外层存储；by-value capture 是构造时快照，origin 到此为 boundary（除非显式复制语义可继续）。
5. `std::optional`/`std::variant` 的构造/reset/get 是状态转换；不能把 alternative 的字段身份与整个 variant 混为一谈。
6. 指针/动态下标只能给出 may-alias 或 boundary；不能凭空确定元素下标。

## 3. 状态版本与事件

事件类型（`Event.kind`）：

```text
read / write / init / alias / move / copy / capture
call / call-effect / method-mutation / return / return-field
fold-seed / fold-result / fold-result-value / param / unknown-effect
branch-condition / construct / aggregate-value / address-of
```

每个事件有：函数 USR、CFG block、block 内顺序、源码范围、存储路径、值路径、类型。写入事件的 `subkind` 区分 assign/init/increment/compound/call-effect/method-mutation。

状态版本不单独物化一个巨大的 SSA 对象；版本由 **(function, CFG point, storage path)** 隐含，查询时用反向到达定义重建。这样：

- 不需要为每个字段预先生成全局 SSA；
- 可按需展开跨函数/fold；
- 未解析调用直接成为 boundary，而不是污染整个图。

## 4. CFG 与到达定义

对查询点 `(fn, block, order)`：

1. 在 block 内逆序扫描，遇到 supply 该路径的 write 即停止该路径；
2. 块入口递归所有 CFG predecessors；
3. 函数入口产生 `param`/`fold-seed`/`fold-backedge` 合成定义；
4. 循环通过 CFG predecessor 图形成固定点；查询引擎用 visited key（含深度）避免无限递归，并以 `fold-backedge` 显式标记“上一轮”。

`def_supplies(def, query)` 只允许：同一路径、def 是 query 的父对象、动态下标 may-alias；**不允许** query 是 def 的子字段（子字段写不定义整个对象的当前值）。这条规则修复了“读 bank_state 时错误吸收 generation.decode_tokens 写”的过近似。

## 5. fold 语义

左 fold：

```text
S0 = seed
S(i+1) = F(S(i), element(i))
result = S(N)
```

每个 fold 记录：

- seed 表达式/类型/位置；
- lambda USR 与累积器参数 USR；
- seed 字段（按聚合字段顺序）→ 累积器字段；
- 每个 `return` 事件 → 累积器回边；
- 目标存储（`destStorage`）→ `fold:<id>:result`。

查询规则：

- lambda 累积器读：第一轮来自 seed 字段；后续轮来自 `return` 回边；若 return 是 `acc` 本身，则继续在 return 前的 CFG 中找当前轮写入；
- 零迭代：只有 seed；多迭代：seed + 所有可达回边；
- 提前返回：每个 `return` 分支独立保留，不能只取最后一个；
- fold 结果：展开 seed 与最后一个 return；最终目标字段通过聚合/返回映射继续；
- 纯值/图 fold：若 accumulator 没有 C++ 可变对象身份，标 `pure`/`Unsupported`，不伪造 mutation。

## 6. 跨函数摘要

- 参数：`param(fn, index)` → 所有直接 call site 的第 index 实参；按参数位置映射，不按名字。
- 成员函数：`this` → call receiver。
- 返回：`return` / `return-field` 事件；聚合按字段展开；返回路径为参数时映射回 call argument + 后缀。
- 调用结果：`call:<event-id>`；若 callee 无定义/间接/虚调用/外部函数 → boundary。
- 模板实例：函数 USR + `patternUsr`；调用实例映射回 pattern 查询；实例结果分开保留。
- 传值/移动：调用参数是值传递时，来源是值来源；引用/指针参数才产生 call-effect；不把值传递误当存储别名。

## 7. 不确定性表示

每个结果包含：

```json
{"targets": [...], "provenance": [...], "boundaries": [...],
 "expectationKind": "Exact|Multiple|Conditional|Boundary|Unsupported|NoPriorMutation",
 "limitations": [...]}
```

Boundary 有类型/位置/原因，例如：

- `external or indirect callee`
- `dynamic container index may alias other elements`
- `no reaching definition in this translation unit`
- `by-value lambda capture snapshot`
- `analysis budget exhausted`
- `call argument has no storage path`

查询不会把“未找到”写成“不存在”；`NoPriorMutation` 只在已经证明函数入口之前没有相关写入时使用。

## 8. 终止性/复杂度

- 单次反向查询：受 CFG 块数、visited 集合、`MAX_DEPTH`/`MAX_NODES` 限制；
- 跨函数：visited 包含 `(fn, point, storage)`，同一摘要不重复展开；
- fold：回边合成节点避免无限循环；
- 不做全程序固定点物化；代价随实际查询路径增长；
- 未解析/动态索引/预算耗尽显式停止，不返回猜测目标。

## 9. 源码映射与证据

每个事件保留：

- spelling location（file/line/col/offset）与范围；
- 函数 USR / 模板 pattern / 模板参数；
- 原始表达式文本；
- 结构边（aggregate-field、parameter、return、fold-seed、fold-recurrence、call-effect）。

这使输出可以同时给出“跳转目标”和“为什么是它”的证据链；Oracle 的稳定锚点是 file + semantic anchor + line，而不是只用行号。

## 10. 明确不采用

- 不把旧插件 `ExpressionPath/originFor/traceMutations` 作为实现基础；
- 不用函数名/字段名猜测调用关系或对象身份；
- 不把 CodeQL/SVF/PhASAR 的能力宣传为已满足；
- 不将“调用 begin_decode_prefetch”直接当作异步磁盘读取完成；
- 不把 `std::move` 前后的对象视为同一存储身份；
- 不把 fold seed 解释为上一轮修改。
