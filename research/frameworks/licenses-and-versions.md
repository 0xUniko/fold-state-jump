# 版本、构建与许可记录

## 工具版本

```text
clang/clang++/clangd 23.1.4  (/usr/lib/llvm-23)
clangd 18.1.3                (/usr/bin/clangd, Ubuntu)
CMake 4.4.4
Ninja 1.11.1
Bun 1.4.3
Python 3.14.7
GNU c++ 13.3.0（仅作为宿主编译器）
```

- `clang-23` 不在默认 PATH，实验使用 `/usr/lib/llvm-23/bin/clang++`。
- `llvm-config` 不在 PATH，但 CMake config 完整；本项目不依赖 `llvm-config`。
- nano-infer `compile_commands.json` 中 DeepSeek TU 指向不存在的 `build-cpu-debug/generated`；为避免修改 nano-infer，使用 `/tmp/opencode/nano-db/compile_commands.json`，将 generated 目录改为匹配的 `build-cpu-tests/generated`（protobuf 7036002）。
- Clang 23 解析 `minicpm-v-4_7/cli.cpp` 成功；DeepSeek 需要上述头文件修正。

## 版本风险

| 依赖 | 风险 | 处理 |
|---|---|---|
| Clang/LLVM 23 | 与旧插件/第三方框架版本不一致 | 本原型固定 23；CMake 拒绝非 23 |
| PhASAR | 默认 LLVM 16；LLVM 23 构建失败 | 未进入实现；记录失败日志 |
| SVF | README 支持到 LLVM 22；LLVM 23 头缺失 | 未进入实现；记录失败日志 |
| protobuf/generated header | nano-infer 多个 build 目录版本不一致 | 只读选择 `build-cpu-tests/generated`；不改 nano-infer |
| CodeQL | 许可/闭源分析限制 | 未执行 |
| vcpkg/range-v3 | `ranges::fold_left` 的 CPO AST 布局易误判 | 通过实际 AST 检查与实例测试修正 |

## 许可

- LLVM/Clang：Apache-2.0 WITH LLVM-exception。
- PhASAR：MIT（`LICENSE.txt` 开头 “Phasar Release License (MIT license)”）。
- SVF：`LICENSE.TXT` 为 GNU Affero GPL v3 文本；不得在未评估义务前复制/链接到不同许可的最终实现。
- CodeQL：专有许可；CLI/查询库使用范围必须单独核对，不能假定可分析闭源 nano-infer。
- 本研究没有把 SVF/PhASAR 源码复制进原型；仅在 `/tmp` 独立克隆中做兼容性实验。
- 旧 `fold-state-jump` 仓库有 `LICENSE`；本研究不复制其实现，只读取作为基线。

## 复现边界

- `/tmp/opencode/frameworks` 的克隆不会被提交/打包；日志已复制到 research。
- 本研究报告不声称 PhASAR/SVF 已在本机成功构建。
- 本研究报告不声称 CodeQL/Joern/Infer 已执行。
