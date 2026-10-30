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
