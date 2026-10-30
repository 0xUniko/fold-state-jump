# LLVM IR / MemorySSA 实验

## 命令与产物

```bash
clang++-23 -std=c++20 -O0 -g -S -emit-llvm \
  prototype/fixtures/fold_recurrence.cpp \
  -o research/experiments/llvm/fold_recurrence.O0.ll
opt-23 -passes='print<memoryssa>' -disable-output \
  research/experiments/llvm/fold_recurrence.O0.ll \
  >/dev/null 2>research/experiments/llvm/memoryssa.O0.txt
```

注意：`opt` 把 `print<memoryssa>` 输出写到 **stderr**；本实验把 `stderr` 保存为 `memoryssa.O*.txt`（实际文件是 `opt-O0.err` / `opt-O2.err`）。

## 结果

- O0 MemorySSA 输出约 2,746 行，76 个函数条目；
- O2 输出约 823 行（内联/优化后函数变少）；
- 典型条目：

```text
; 1 = MemoryDef(liveOnEntry)
  store ptr %0, ptr %7, align 8
; 2 = MemoryDef(1)
  ...
; MemoryPhi
```

- 字段访问在 IR 中是 `getelementptr inbounds %struct.Box, ptr %..., i32 0, i32 1` 之类的索引；
- IR 不保留 `bucket.hits` / `bank_state.counters.graph_builds` 这样的 C++ 字段名；
- `llvm-dwarfdump --debug-line` 能恢复源文件/行，`llvm-objdump -dS` 能交错反汇编与源码，但字段身份仍需从 DWARF type + GEP 索引重建。

## 对需求的判断

能直接复用：

- 同一内存对象的 SSA def-use；
- 分支/循环的 `MemoryPhi`；
- 别名分析、优化后的内存依赖。

不能直接复用：

- 跨函数求解：MemorySSA 是**函数内**分析；需要 ICFG/摘要/指针分析；
- C++ 字段身份与模板实例：需要额外 DWARF/AST 映射；
- 源码导航：IR 指令到 C++ token 不是一一对应，尤其优化/内联/移动构造；
- fold 语义：IR 中没有 `fold_left` 的 seed/回边约定，需要识别标准库实现或自己定义。

## 结论

LLVM MemorySSA 是高质量的“内存依赖事实”，但不是现成的“C++ 状态来源/历史”工具。它适合作为混合架构中复杂指针/别名的补充后端；本研究的首版主路径仍使用 Clang AST/CFG，因为字段级源码导航是核心需求。

产物：

```text
research/experiments/llvm/fold_recurrence.O0.ll
research/experiments/llvm/fold_recurrence.O2.ll
research/experiments/llvm/opt-O0.err   # 实际 MemorySSA 输出
research/experiments/llvm/opt-O2.err
research/experiments/llvm/debug-line.txt
research/experiments/llvm/objdump-S.txt
```
