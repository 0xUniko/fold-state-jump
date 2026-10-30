# PhASAR / SVF / CodeQL / 其他框架实验记录

## 环境事实

```text
phasar-cli, phasar-llvm, svf-svf, codeql, joern, infer, cppcheck,
clang-tidy, scan-build: 均未安装
```

网络可用（GitHub `git ls-remote` 成功）。实验使用 `/tmp/opencode/frameworks` 下的浅克隆，不修改项目依赖，不使用 sudo。

## SVF

```bash
git clone --depth 1 https://github.com/SVF-tools/SVF.git
```

- README：支持到 LLVM 22（当前 HEAD），未承诺 LLVM 23。
- 配置 LLVM 23：`cmake ... -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm` 失败于 LLVM 导出目标 `zstd::libzstd_shared` 缺失；系统只有 `libzstd.so.1`，没有 CMake target。
- 用 `CMAKE_PROJECT_INCLUDE` 注入 imported target 后配置成功。
- 构建：先因 `-Werror` 的 `remainingSeconds` 未使用失败；临时移除该警告后继续，最终在
  `svf-llvm/include/SVF-LLVM/BasicTypes.h` 失败：
  `llvm/Transforms/Utils/UnifyFunctionExitNodes.h: No such file or directory`（LLVM 23 已移除/迁移该头）。
- 结论：当前 SVF HEAD 与 LLVM 23 不兼容；其 IR/跨过程值流思想可参考，但不能直接作为本机实现基础。
- 许可：`LICENSE.TXT` 为 GNU Affero GPL v3 文本；若未来链接/复制，必须单独评估 AGPL 义务。

日志：`research/experiments/frameworks/svf-configure.log`、`svf-build.log`（本机路径为 `/tmp/opencode/frameworks/SVF`，可复现）。

## PhASAR

```bash
git clone --depth 1 https://github.com/secure-software-engineering/phasar.git
git submodule update --init --recursive --depth 1
```

- 默认 `PHASAR_LLVM_VERSION=16`，`find_package(LLVM 23 ...)` 因 CMake 版本匹配策略失败；临时改为无版本 `find_package(LLVM REQUIRED CONFIG)` 后继续。
- 缺 submodule 时配置失败；补齐 `external/CRoaring`、`external/json`、`external/json-schema-validator` 后配置成功（仍需 zstd workaround）。
- 构建失败：`include/phasar/Utils/Compressor.h` 使用 `DSI::getEmptyKey()` / `getTombstoneKey()`，LLVM 23 的 `DenseMapInfo` API 已变化。
- 结论：PhASAR 的 IFDS/IDE/ICFG/摘要模型与需求高度相关，但当前版本未适配 LLVM 23。它的 IR 级模型也不能直接给出 C++ 字段源码 token。
- 许可：MIT（`LICENSE.txt` 开头 “Phasar Release License (MIT license)”）。

日志：`research/experiments/frameworks/phasar-configure.log`、`phasar-build.log`。

## CodeQL

- 未安装 CLI；未对 nano-infer 执行分析。
- 原因：需要单独接受 GitHub CodeQL 许可，闭源/商业使用范围需核对；不能假设可免费分析闭源项目。
- 可参考的设计：C/C++ dataflow 库中的字段/聚合/调用/返回建模，以及路径查询；但不应把其存在当作已解决问题。
- 若未来使用，只在许可允许的公开样例上实验查询库，不把 nano-infer 源码上传到不允许的服务。

## DG / LLVM Slicer

- 未安装、未构建；当前时间预算优先给 Clang 原型与 Oracle。
- 设计参考：PDG/CDG、后向切片、LLVM IR 数据/控制依赖；与 MemorySSA 同样存在源码字段映射问题。

## Joern

- 未安装；需要 JVM/前端。CPG 的路径查询适合“关系查询”，但对 C++ 模板/构造/移动语义的精度需要单独验证。

## Infer / Cppcheck / GCC analyzer

- 未安装；Cppcheck ValueFlow 与 GCC analyzer 可作为轻量对照，但不具备完整 C++ 构造/模板/异步资源模型。
- 仅作为“补充参考”，不作为本研究的实现基础。

## 总体结论

实际执行成功的只有 Clang LibTooling/CFG、Clang Static Analyzer 和 LLVM MemorySSA。SVF/PhASAR 的失败是**版本/API 兼容性**，不是“功能不存在”；但它们的失败也说明“直接拿一个成熟框架就能完成 C++ 字段级状态追踪”不成立。最终选型不依赖未构建成功的框架。
