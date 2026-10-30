# 架构路线比较（A/B/C）

## 评测基线

同一组输入：`prototype/fixtures/*.cpp` 的通用语义用例，以及 nano-infer 的 6 个 TU、84 个 fold 源。比较目标不是“框架能否打印数据流”，而是：

1. 能否保留 C++ **字段级存储身份**与聚合初始化成员顺序；
2. 能否区分值复制、移动、引用、指针借用、资源所有权/内容；
3. 能否表达 fold 的 seed/回边/零迭代/条件写入；
4. 能否把结果精确映射回源码 token，并保留模板实例；
5. 跨 TU、部署、许可和版本成本。

## 路线 A：Clang AST + CFG + 需求驱动 provenance

实际已完成：

- Clang 23.1.4 LibTooling 工具，`prototype/native/ast-inventory.cpp`；
- `InitListExpr` 按 `FieldDecl` 顺序解析聚合成员；
- `CXXDependentScopeMemberExpr`/`UnresolvedMemberExpr` 解析模板 pattern 的字段；
- `CFG::buildCFG` 输出块/后继/事件；USR 区分函数/记录/字段；
- `shouldVisitTemplateInstantiations()` 打开后，`execute<TokenInput>`、`execute<EmbeddingInput>` 等实例独立出现（79 个模板实例）；
- Python 查询引擎在事件图上做 CFG 反向到达定义、别名解析、参数/返回映射、fold seed/回边展开。

直接复用：Clang 的解析、类型、字段顺序、模板实例、USR、CFG。
必须自建：状态版本/存储身份抽象、跨函数摘要、fold 契约、异步/资源边界、查询去重。
源码定位：精确到 token；字段声明和表达式均可定位。
跨 TU：当前按 TU 建图；调用者不在当前 TU 时是显式 boundary；CTU 需要额外索引/摘要。
许可：Apache-2.0 with LLVM exceptions；构建依赖 LLVM/Clang 23 开发包。
风险：模板实例/隐式代码可能重复；Clang AST 对标准库内部是巨大的；需要过滤项目文件。

结论：**当前研究选择 A 作为主路线**，因为需求的核心是源码导航和字段级语义，Clang AST 是唯一同时保留字段顺序、模板实例和源码 token 的成熟入口。

## 路线 B：LLVM IR + MemorySSA + 跨过程

实际实验（`research/experiments/llvm/`）：

- `clang++-23 -O0/-O2 -g -S -emit-llvm` 成功；
- `opt-23 -passes='print<memoryssa>'` 成功输出 MemorySSA；O0 有 76 个函数条目，O2 输出 823 行；
- MemorySSA 条目是 `MemoryDef/MemoryPhi` + SSA 值，字段通过 `getelementptr` 索引，不保留 C++ 字段名；
- 优化会内联/合并/消除对象；`llvm-dwarfdump --debug-line` 能保留行号，但不能直接恢复“这个 store 对应 `bank_state.counters.graph_builds`”；
- 需要先完成整个项目到 LLVM IR 的构建，并使用与 Clang 版本匹配的 IR；nano-infer 的构建包含 SYCL/vcpkg/llama.cpp，IR 级全量构建成本高。

直接复用：SSA、MemorySSA 的 def-use/phi、别名分析、优化后的内存依赖。
必须自建：C++ 字段/对象身份回映射、模板实例身份、源码 token 选择、异步资源语义。
优点：alias/内存依赖成熟；缺点：源码导航精度、模板/容器/标准库语义、部署成本。

结论：**不作为主路线**；可作为路线 C 的可选别名/复杂内存依赖后端。

## 路线 C：Clang 源码语义 + LLVM 别名/数据流混合

实际证据支持“有限混合”，不支持“默认混合”：

- Clang AST 提供字段顺序、成员路径、模板实例、源码位置；
- LLVM MemorySSA 对字段级 provenance 的源码回映射不足，且需要 IR 构建；
- 对指针/动态容器等 Clang 层只能保守处理的情况，可把具体函数编译为 IR，使用 MemorySSA/AliasAnalysis 产生“may-alias 集合”，再映射回 Clang 事件；
- 这需要一个稳定的 AST↔IR 映射（`DebugLoc` 的 file/line/col + 函数 USR + 变量名），目前只验证了 DWARF 行号，未验证字段级一一映射。

结论：**混合只用于已证明需要的别名补充**，不作为第一版架构；第一版以 AST+CFG 可解释、可测试为主。

## 成熟框架实验结论

| 框架 | 实际状态 | 能复用 | 不能直接满足 |
|---|---|---|---|
| Clang LibTooling/CFG | 编译运行成功 | AST/字段顺序/模板/USR/CFG | 无内建 fold 状态递推、无跨函数摘要、需自建 provenance |
| Clang Static Analyzer | `--analyze`、`DumpCFG` 成功 | CFG/ProgramState/SVal/MemRegion API、路径敏感 | 默认不建模 fold 的 seed/回边；跨函数/模板/容器需大量 checker；结果不是导航 API |
| LLVM MemorySSA | O0/O2 成功 | def-use/phi/别名 | 字段名/源码 token 丢失；函数内分析；IR 构建成本 |
| SVF | clone + configure 成功（需 zstd target workaround），build 失败：LLVM 23 移除 `UnifyFunctionExitNodes.h` | 指针/值流/跨过程思想 | 当前 LLVM 23 不兼容；AGPL 许可；IR 级 |
| PhASAR | clone + submodules + configure 成功（需 workaround），build 失败：LLVM 23 `DenseMapInfo` API 变化 | IFDS/IDE/ICFG/摘要设计 | 当前 LLVM 23 未适配；默认 LLVM 16；IR 级 |
| CodeQL | 未执行（CLI 未安装，许可需核对） | C/C++ dataflow/CPG 查询设计 | 许可/闭源项目分析限制；未纳入实现 |
| DG/Joern/Infer | 未执行（环境无二进制；DG 未构建） | 切片/CPG/值流参考 | 版本/部署成本；未验证 |

详细实验日志见 `research/frameworks/*`、`research/experiments/frameworks/*`。

## 选择

选择 **A + 可插拔摘要/边界**：

- 主图：Clang 事件图（存储身份、值转移、CFG、fold 契约）；
- 求解：需求驱动的反向 may-provenance + 有限递归/visited 终止；
- 跨函数：按 USR/参数位置/返回字段的显式摘要，不通过函数名猜测；
- 不可证明：有类型、有源码位置、有原因的 boundary；
- LLVM：保留为后续 alias 补充实验，不进入主路径。
