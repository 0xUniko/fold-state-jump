# 独立 fixtures 与语义对照

fixtures 不使用 nano-infer 的业务名/字段名，避免验证被项目特化污染。`prototype/fixtures/inventory/*.ndjson` 是提取器对这些 fixture 的 AST/CFG 输出；测试直接用 `Program` 加载它们。

| fixture | 语义 | 覆盖 |
|---|---|---|
| `fold_recurrence.cpp` | `std::accumulate` + `Box{payload,bucket,handle}` seed；lambda 内 `bucket.hits++` / `misses+=`；`carry(Box)` 返回 | fold seed、回边、结果、alias、跨函数返回 |
| `aggregate_negative.cpp` | 两个字段顺序不同的 `Left/Right` 聚合；`Left l=p.left` 复制；`Pair q=move(p)`；`auto &alias=q.right` | 聚合字段顺序、copy/move、引用别名 |
| `optional_variant.cpp` | `optional<Request> pending`；install/consume/reset；`variant<Machine,Done>` | optional 创建/消费/reset、variant alternative |
| `template_state.cpp` | `template<class T> accumulate_like`，int/double 两实例 | 同源码 token 多实例、USR |
| `async_handle.cpp` | `Resource&`、`Ticket{future}`、submit/finish | 借用、ticket、异步完成 boundary |
| `pointer_callback.cpp` | 指针重绑定、外部函数、虚调用、函数指针 | points-to、间接调用、虚调用 boundary |
| `dynamic_index.cpp` | `values[index]` 与 `values[0]` | 动态元素 identity boundary、常量下标非 boundary |
| `negative_control.cpp` | 同名不同对象、最近覆盖、互斥分支 | 不同对象同名字段、到达定义、may 分支 |
| `basic.cpp` / `loop.cpp` | 基础聚合/循环 | 基础 CFG/字段 |

## 测试

```bash
python3 -m unittest prototype/tests/test_fixtures.py -v
```

结果：13/13 通过。每个断言检查**行号/关系**，不是只检查“有结果”：

- fold history 必须包含 seed 行与回边写行；
- fold result origin 必须包含 seed 与 return；
- alias origin 必须包含 alias 目标与回边；
- 同名不同对象不得跨到另一对象写；
- 最近覆盖只返回最近写；
- 互斥分支必须同时给出两条 may 目标；
- 复制不得到源对象写；
- optional 必须经调用链回到 install；
- 模板实例必须至少两个且 templateArgs 不同；
- 外部异步必须有 boundary；
- 动态下标必须有 boundary，常量下标不能误报动态 boundary。

## 不是“通过率”替代

fixtures 只证明通用语义类别；它们不证明 nano-infer 全覆盖。nano-infer 的 Oracle 结果另见 `research/reports/correctness-results.md`。
