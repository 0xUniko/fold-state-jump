# SEMANTIC-SPEC

本文定义新引擎必须表达的语义实体、关系、查询契约和边界。它是后续 TypeScript/C++ 实现的规范，不是对现有 Python 原型的描述。

## 1. 实体

### 1.1 Declaration

`Declaration` 是源码声明（`VarDecl`、`ParmVarDecl`、`FieldDecl`、函数等），具有 Clang USR、类型、声明位置、所属 `DeclContext`。声明本身不是存储位置；参数声明和局部变量声明在每次函数调用/每次执行中可能对应不同对象。

### 1.2 Value

`Value` 是表达式求值得到的抽象值。值可以来自：
- 常量；
- 读取存储位置；
- 调用返回值；
- 聚合构造；
- 复制/移动；
- fold 结果。

Value 的来源不等于对象存储身份。`std::move(x)` 产生一个值，不证明目标与 `x` 是同一存储。

### 1.3 Object / Storage Location / Subobject

- `Object` 是具有生命周期的 C++ 对象。
- `StorageLocation` 是对象或子对象的可寻址存储；同一对象的不同字段/数组元素是不同子对象。
- `SubobjectPath` 是 `StorageLocation` 的成员/索引路径；常量下标保留身份，动态下标形成 `DynamicElement`（may-alias），不得确定唯一元素。
- 引用本身不是独立对象存储；引用绑定把引用变量映射到目标存储。指针保存地址值；pointee 关系由 `PointerTarget` 集合表示，未知时是 boundary。

### 1.4 State Version

`StateVersion(fn, programPoint, storage)` 表示程序点上的状态版本。程序点由 CFG block + 语句内顺序确定。版本不是全局 SSA 名；它由到达定义集合定义。写入产生新的版本，读取查询当时的版本。

### 1.5 Mutation

Mutation 是写入存储位置的事件：赋值、复合赋值、自增、构造初始化、容器方法修改、通过引用/指针的调用效果。`std::move`/copy 本身是 ValueTransfer；只有赋值/构造安装产生目标写入。

### 1.6 Value Transfer

- `Copy`：目标存储获得源值的副本；之后修改源不影响目标。
- `Move`：目标获得源值/资源；源进入 moved-from 状态，不能继续视为原值。
- `ParameterBinding`：实参值/存储按参数类型绑定；值参数是值转移，引用参数是别名绑定，指针参数是指针值 + pointee 关系。
- `Return`/`ReturnField`：返回表达式到调用者结果对象。
- `AggregateField`：聚合初始化第 i 项到第 i 个成员（Clang 语义字段顺序）。
- `FoldSeed`/`FoldBackedge`：fold 专用状态转移。

### 1.7 Control Flow / Call Context / Loop Recurrence

程序点是 CFG 上的点；分支合流产生 may 集合；循环用 worklist 固定点。fold 是标准算法的状态契约，不是普通 CFG 循环：seed、lambda、return、零迭代、元素序列由 fold 摘要给出。

CallContext 是 `(callee, call-site, receiver, argument mapping)`；递归/多调用点保留多个上下文，不合并为唯一。

### 1.8 Unknown Effect / Resource State

- `UnknownEffect` 是类型化边界：外部函数、间接/虚调用、未解析 callee、动态下标、未建模容器/标准库内部、预算耗尽。
- `ResourceState` 是底层资源（buffer、文件、设备、future）的内容/所有权/完成状态；资源元数据与内容分开。`start_read`/`submit` 只产生 request/ticket，不证明 bytes 已写入；`finish`/`wait` 才建立完成顺序。

## 2. 事件与关系

每个事件包含：

```text
Event {
  id, function, cfp (block, order), sourceRange,
  kind, subkind,
  storage?: StorageLocation,
  value?: Value,
  type, call?: CallInfo,
  fold?: FoldId,
  boundary?: Boundary
}
```

关系：

```text
Value --assigned-to--> StorageLocation          (Write)
StorageLocation --reaching-def--> Event         (version)
Value --copy/move--> Value                       (Transfer)
Expr --aggregate-field(i)--> FieldDecl            (Aggregate)
Argument --parameter(i)--> Parameter              (Binding)
Return --result-field--> CallResult               (Return)
Seed --fold-seed-field--> AccField                (FoldSeed)
Return --fold-backedge--> Acc                     (FoldRecurrence)
Storage --alias-of--> Storage                     (Reference)
Pointer --may-point-to--> Object                  (PointsTo)
```

## 3. 查询契约

### Origin

**定义**：当前值（或子对象值）最初来自哪里。

- 读取字段：返回该字段当前的 reaching value source，而不是整个父对象的所有 writes。
- 初始化：返回初始化表达式/调用参数。
- 参数：跨调用点映射到实参；无 caller 或被调者效果未知 => Boundary。
- fold lambda：第一轮来自 seed；后续轮来自 return 回边；若控制流证明当前是首轮，则不得返回 backedge。
- 结果必须区分 `Exact`、`Multiple`、`Conditional`、`Boundary`；不得把“没有找到”当作“没有来源”。

### Reaching Mutation

**定义**：当前程序点之前，可能提供当前值的最近相关写入。

- 只返回在 CFG 上可达、且在读取之前的写入；覆盖写入杀死更早版本，但 History 仍可显示被覆盖的历史。
- 查询点自身若是写入，不作为 prior mutation。
- 分支合流返回多个 may 写入；互斥分支保留条件。
- 若参数来自 caller，跨函数继续；若 callee 产生未知效果，返回 Boundary。
- 无 prior mutation 只有在函数入口前也证明没有时才是 `NoPriorMutation`；否则 Boundary。

### History

**定义**：从当前版本向前的修改/递推序列。

- 包含覆盖写入之前的历史，但必须标记“被覆盖”。
- fold 回边是条件性子序列，不是无条件线性历史。
- 首轮/零轮/后续轮分别处理；`layer==0` 这类首轮 guard 必须阻止虚构同 fold 上一轮。
- 跨批状态用 caller/return 关系继续，不把不同批合并为同一迭代。

### Provenance

**定义**：值如何经过聚合字段、复制/移动、参数、返回、调用和 fold 连接。

- 输出边和中间节点；边有类型（aggregate-field、argument-to-parameter、return-field、fold-seed、fold-recurrence、alias、move）。
- provenance 不自动等于 origin：可以显示传递路径而不声称唯一来源。
- 多条路径分别保留，不合并为一条。

## 4. Fold 语义

标准左折叠：

```text
S0 = seed
S(i+1) = F(Si, element(i))
result = S(N)
```

### 4.1 必要条件

- fold 摘要必须知道 range、seed、lambda、元素/累积器参数、返回类型、目标结果。
- lambda 是独立函数体；其 CFG 与外部调用者分开分析。
- 捕获的外部对象不是累加器；修改捕获对象不自动修改 acc。
- 累加器按值传递：每轮是值/对象的新版本；引用/指针成员仍指向外部资源。
- 多返回路径：每个 return 都是回边；提前返回旧状态必须保留。
- 抛出异常：异常退出不产生正常 fold 结果；异常路径单独 boundary。
- 零迭代：结果 = seed；后续轮不可达。
- 嵌套 fold：内层结果作为外层元素/累加器值时，递归展开。

### 4.2 首轮/后续轮判定

仅添加 backedge 不够。必须使用：

1. range 摘要（如 `iota(start,end)`、容器 `begin/end`）；
2. lambda 元素参数与首元素值的条件；
3. CFG 路径条件。

如果查询位于只有首元素才能进入的分支（例如通用 `element == *range.begin()` 或 `iota` 首值比较），则同 fold backedge 不可达，不能作为 prior mutation。若无法证明，则 backedge 是 Conditional 候选，不得声称 exact。

### 4.3 跨批

fold 结果进入函数返回、被调用者安装到会话、下一批再次作为 seed：这是 **不同 fold 实例/不同批次** 的关系，不是同一次 fold 的上一轮。History 必须分开标注 `fold-recurrence` 与 `previous-call/batch`。

## 5. 跨函数

- 参数按位置/类型绑定；值参数是 value transfer，引用参数是 alias binding，指针参数是指针值/pointee 关系。
- 成员函数接收者绑定到 `this` 对象。
- 返回值按聚合字段映射；`return` 值来自参数时映射回 caller 实参并保留字段后缀。
- 模板实例按 USR + template args 区分；pattern 与实例不能合流。
- 递归/多调用上下文保留 may 集合；没有完整调用图时 boundary。
- 标准库函数只使用公开 API 契约摘要（`std::move`、容器 accessor、`optional`/`variant`、智能指针），不按业务名。

## 6. 未知与结果类别

```text
Exact            唯一已证明目标
Multiple         多个 may 目标，不能任意选一个
Conditional      依赖分支/循环/模板/调用上下文
Boundary         分析不完整或外部效果未知
Unsupported      当前语义模型之外（纯图值等）
NoPriorMutation  已证明没有 prior mutation
```

`Exact` 必须同时满足：一个目标、无 boundary、路径条件已证明。`Multiple`/`Conditional` 不得降级为 `Exact` 以提升 UI 体验。

## 7. 强制独立测试

每个语义规则至少一个正例和一个反例：

- 同名不同对象；
- 不同常量下标；
- 未执行/未来写入；
- 不可达分支；
- copy 不修改源；
- move 不合并存储身份；
- 引用绑定不写目标；
- 模板不同实例；
- fold 第一轮/后续轮；
- 零迭代；
- 嵌套 fold；
- optional/variant；
- 指针 unknown；
- 外部调用 unknown；
- 跨函数聚合返回；
- 容器动态元素；
- 资源 ticket 与内容。

## 8. 查询输出契约

```json
{
  "query": {"file": "...", "line": 0, "column": 0, "mode": "origin",
            "semantic": {"functionUsr": "...", "storage": "...", "event": "..."}},
  "kind": "Exact|Multiple|Conditional|Boundary|Unsupported|NoPriorMutation",
  "targets": [{"file": "...", "line": 0, "column": 0, "anchor": "...",
               "role": "...", "conditions": [], "evidence": []}],
  "provenance": [{"from": {...}, "to": {...}, "edge": "..."}],
  "boundaries": [{"reason": "...", "file": "...", "line": 0}],
  "limitations": []
}
```

结果去重按 `(file,line,column,role,storage,conditions)`；不同 invocation/instance 不得因源码 token 相同而丢失 identity。

## 9. 写入锚点与聚合赋值

- 声明初始化事件锚定变量声明（类型/名字起始），表达式仍记录初始化器。
- 赋值锚定 LHS 语句；聚合赋值产生一个整体写和逐字段写。
- 整体写 subkind=`aggregate` 不杀死字段写；字段写是后续读取的 reaching definition。
- 对整体写的 provenance 查询包含字段写（aggregate-field 边），不把字段写当成 sibling 对象的写。

## 10. Call value 与构造器

- 每个直接调用有稳定 id；值 `call:<id>` 可在无命名存储时继续追踪 callee 的 return/return-field。
- `T(factory())`、`new T(factory())` 传播 factory 的 call id。
- 非聚合构造器的成员初始化列表把构造参数映射到字段 return-field；默认/委托构造保持 boundary。

## 11. Pointer / pointee

- `&obj` 与存入指针字段/seed 的事件共同建立 `pointer -> pointee`。
- `p->x` 规范化为 `pointee.x`；动态下标仍为 may-alias。
- 对 `&obj` 的 mutation 查询返回 pointee 写和指针字段声明；不把指针字段本身当成被写对象。

## 12. 路径证据与 variant

- 高阶标准算法（ranges/std algorithm）的结果元素来源包含嵌套 lambda 的 return。
- 构造某个 variant alternative 时，前面的 `holds_alternative<T>`/`get_if<T>` 条件作为 path evidence 加入（kind=condition，不参与 Exact/Multiple 来源计数）。
- call/return/transfer/condition/function 是证据节点，不是竞争来源。
