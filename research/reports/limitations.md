# 限制与未解决问题

## 1. C++ 语义本身无法静态唯一确定

1. **动态容器下标**：`keys[metadata]`、`values[index]`、`groups[routing.experts[token]]` 的元素身份依赖运行时；只能给出 may-alias 集合或 boundary。
2. **指针 points-to**：`object = &global; external_mutate(object); object->field` 可能指向不同对象，且外部函数有未知效果。
3. **虚调用/函数指针/回调**：目标集合是动态的；没有完整类层次/指向分析时不能声称唯一。
4. **异步 I/O**：调用 `pread`/提交 ticket 不等于数据已完成；完成顺序由运行时/同步决定。
5. **移动后的源对象**：`std::move(x)` 后 `x` 处于有效但未指定状态；不能继续把 x 当原值。
6. **未定义行为/异常路径**：异常、容器失效、越界、未初始化读取等不在正常路径模型中；静态“may”不等于运行时必然。
7. **标准库内部**：`std::vector`、`std::map`、`std::variant`、`std::future` 的存储/元素身份由实现定义；本项目只建模到公开语义/边界。

## 2. 现有框架能力限制

1. **Clang Static Analyzer/FlowSensitive**：没有内建 fold seed/回边/零迭代契约；`ProgramState/MemRegion` 是函数内路径敏感状态，跨函数/模板/容器需要自定义 checker，且不直接产出 VS Code 导航。
2. **LLVM MemorySSA**：函数内分析；字段名/模板/源码 token 映射弱；全项目 IR 构建成本高；优化会改变对象/指令。
3. **PhASAR/SVF**：本机 LLVM 23 构建失败（见框架实验）；即使成功，IFDS/值流仍需自建 fold/资源/源码映射。
4. **CodeQL**：未安装/未执行；许可和闭源分析范围需核对。
5. **clangd**：提供引用/调用层级/索引，但不是状态来源/历史求解器；旧插件已用它补 caller 集合。

## 3. 当前原型尚未实现

1. **跨 TU 全局调用者索引**：当前每个查询只在一个 TU cluster 内；跨 TU 调用是 boundary。Oracle 中 `run_embeddings`/`execute` 的 caller 路径在 cli TU 内可跟，但外部 caller 不完整。
2. **聚合返回/嵌套 return 的完整字段传播**：工具已递归发射 `return-field`，查询引擎只部分使用；Oracle 中 BatchState 字段映射仍失败/多目标。
3. **variant/optional 的完整状态机**：目前 `std::get` 被建模为路径后缀，alternative 存在性/空状态没有独立类型；`GenerationFinished` 的“无数据字段”语义仍可能被过度归因。
4. **资源内容与所有权的统一模型**：`ggml_backend_buffer_clear`、`pread`、`copy_record`、`ffn.forward` 目前主要是 boundary；没有把“资源内容版本”建成一等状态。
5. **模板实例去重/查询实例选择**：工具保留 USR/实例，查询默认选第一个 TU/事件；没有 UI 让用户选择具体实例。
6. **跨函数摘要的字段/路径敏感性**：参数/返回按位置和字段后缀映射，但复杂分支/多返回值/异常路径会丢候选或产生额外候选。
7. **别名/指针**：`operator->` 已按路径处理，但 `Object*` 的 points-to 集合、数组/容器元素地址、引用重绑定仍保守。
8. **动态容器索引**：明确 Boundary，但没有输出具体 may-alias 候选集合。
9. **性能工程**：无图缓存/增量失效/并行解析；CLI 冷启动 0.6s 级，不满足编辑器即时交互。
10. **UI**：未实现 VS Code 集成/QuickPick/跳转；只做 CLI JSON。

## 4. 环境/依赖阻塞

- DeepSeek TU 的 `compile_commands.json` 指向不存在的 `build-cpu-debug/generated`；用 `/tmp` 修正数据库，未改 nano-infer。
- protobuf generated header 版本不一致；选择 `build-cpu-tests/generated`。
- PhASAR/SVF 与 LLVM 23 不兼容；未使用 sudo 安装旧 LLVM。
- CodeQL CLI 未安装；许可不允许假设。
- 未做 Extension Host/VS Code UI 测试。

## 5. 当前 Oracle 对照结果暴露的真实问题

`research/reports/correctness-results.md` 当前（48 条）：

```text
correct-conditional       12
correct-boundary           5
correct-multiple           2
targets-found-kind-mismatch 3
mismatch                  26
```

代表性失败：

- `execute.seed.bank_state.origin` 缺少 `start_session`/`clear_session` 的最终来源；
- `return.batchstate-field-mapping` 缺少 BatchState 聚合字段的精确目标；
- `plan_shared_decode.seed.slots` / `plan_cache_decode.found` 被 Boundary 提前截断；
- `clear_session.buffer-content` 把外部 buffer 清除当成 NoPriorMutation，而不是 boundary；
- `cli.generation.text` / `deepseek.ffn.server.state-fold` 跨函数/变体路径不足；
- `start_session.caches` 对 ranges pipeline 的 constructor 传播不足。

这些失败不能通过改 Oracle 或加业务特例解决；它们分别归入：跨函数摘要、聚合返回、资源边界、variant/optional、标准库构造。后续应按语义类别补齐，而不是按 `bank_state`/`Generation` 名字打补丁。
