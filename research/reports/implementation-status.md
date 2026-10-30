# 新引擎实现状态（M1～M6）

工作分支：`research/state-trace`。新分析核心位于 `src/state-trace/`，不导入旧 `src/analysis.ts`。

## 已实现

| 里程碑 | 状态 | 实现 |
|---|---|---|
| M1 单函数对象/版本 | 部分完成 | `LocalFlow` worklist，CFG join，覆盖写、复合赋值、自增、字段路径 |
| M2 复制/移动/别名/存储 | 部分完成 | 引用别名 canonicalization、copy/move 事件、聚合字段顺序、动态下标 boundary |
| M3 跨函数 | 部分完成 | 参数按位置、成员 receiver、返回值/return-field、模板 pattern/instance、call boundary |
| M4 循环/fold | 部分完成 | seed/backedge/零迭代、首轮 guard、嵌套 fold 的模型接口 |
| M5 复杂对象 | 部分完成 | variant `std::get` 路径、optional/reset、外部资源/异步 boundary |
| M6 查询/解释 | 完成基础 | Origin/Mutation/History/Provenance、多目标、条件、证据边、boundary |

## 新文件

```text
src/state-trace/engine.ts        ProgramGraph + worklist + query
src/state-trace/native.ts        state-inventory 子进程与缓存
src/state-trace/vscode.ts        查询结果到 VS Code 导航/QuickPick
src/state-trace/cli.ts           独立 CLI
src/state-trace/engine.test.ts   11 个通用语义测试
src/state-trace/native.test.ts   native 提取 + 查询集成测试
test/state-trace-command.ts      真实 activate/命令/native/mock VS Code 集成测试
```

## 已通过的验证

```text
bun check                                  No type errors in 87 files
bun run build                              extension.js built
bun test                                   540 pass / 0 fail
bun test ./src/state-trace/engine.test.ts  11 pass
bun test ./src/state-trace/native.test.ts   1 pass
bun test ./test/state-trace-command.ts      1 pass
```

集成测试证明：现有 `foldStateJump.jumpToOrigin` 命令在 `analysisEngine=state-trace` 下调用新 native inventory + TS engine，并成功导航到目标行；未启动 Extension Host，符合本轮验收口径。旧命令回归测试显式设置 `analysisEngine=legacy`，用于保留旧实现对照，不是运行时 fallback。

## 语义回归

新增独立 fixture：

- `fold_first_guard.cpp`：`layer == 0` 首轮 guard；history 不返回同 fold backedge；
- `renamed_state.cpp`：相同语义、不同名称/成员顺序；
- `negative_control.cpp` 增加“复制后未来覆盖写不得成为 origin”反例；
- `pointer_callback.cpp`、`dynamic_index.cpp`：未知指针/虚调用/间接调用/动态元素 boundary。

## Oracle 结果（TypeScript 引擎）

`research/measurements/oracle-run-ts.json` / `research/reports/correctness-results-ts.md`：

```text
mismatch                   11
correct-conditional        18
correct-boundary            8
correct-multiple            9
correct-no-prior            1
unsupported-observed        1
required-target recall     56/119
```

这不是完成声明。失败集中在：

- 聚合返回/多层返回字段；
- `start_session/clear_session` 的 constructor/resource 生命周期；
- ranges pipeline 构造；
- 资源 ticket/内容完成；
- 部分 DeepSeek FFN/RPC 路径。

## 逐类失败处理规则

见 `research/FAILURE-QUEUE.md`。失败必须先归入 Frontend/Object identity/Field mapping/Value transfer/Alias/CFG/Interprocedural/Fold/Stdlib/Unknown/Source mapping/Query；禁止按 nano-infer 字段名修。

## 尚未完成

- 全 TU caller/summary 索引与增量缓存（当前 native 提取后内存缓存；跨 TU 仍 boundary）；
- 完整聚合 return-field 传播；
- variant/optional 类型级状态机；
- 资源内容版本；
- 更完整的 nano-infer 查询矩阵 Oracle；
- 旧插件所有 UI 路径的默认切换回归（当前命令已接线，旧测试显式 `legacy` 保留对照）。

## 复现命令

```bash
bun install --frozen-lockfile
cmake -S native -B native/build -G Ninja -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm \
  -DClang_DIR=/usr/lib/llvm-23/lib/cmake/clang
cmake --build native/build -j 8

bun check
bun test
bun run build

# 独立 CLI（fixture inventory）
bun src/state-trace/cli.ts \
  --inventory prototype/fixtures/inventory/fold_recurrence.ndjson \
  --file prototype/fixtures/fold_recurrence.cpp \
  --line 37 --column 13 --mode history

# 新引擎 Oracle 对照
bun tools/run_oracle_ts.ts
```

`state-inventory` 不是旧 `fold-state-jump-ast`；两者独立构建，旧提取器仍可用于对照。
