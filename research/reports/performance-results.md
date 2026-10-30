# 性能与规模结果

## 提取

| 指标 | 值 | 命令/文件 |
|---|---:|---|
| MiniCPM `cli.cpp` 解析 + 事件发射 | 15.3s wall / 14.6s user / 1.06GB peak | `research/measurements/extract-minicpm.time` |
| DeepSeek attention_node | 约 2.6s / 270MB（早期 `/usr/bin/time` 记录） | `research/inventory/raw/logs/*.err` |
| DeepSeek ffn_node | 约 2.3s / 259MB | 同上 |
| shared/model_loader | 约 2.4s / 282MB | 同上 |
| local_test（含测试） | 约 3-4s / 300MB 量级 | 同上 |

原始 NDJSON：

```text
minicpm cli                 28MB
minicpm local_test          31MB
deepseek attention_node    9.9MB
deepseek ffn_node          7.7MB
shared model_loader        1.2MB
总计                       约 78MB（6 TU）
```

## 查询

| 指标 | 值 |
|---|---:|
| 48 条 Oracle 查询（含加载 6 个 TU 图） | 1.47s wall / 1.27s user / 203MB |
| 单条 `pipeline.h:872` origin（加载+查询） | 0.60s / 123MB |
| 单条查询在图已加载后 | 毫秒级（受路径长度/边界数量影响） |

查询引擎没有做跨查询的持久化索引；每次 CLI 进程重新解析 NDJSON。对 VS Code 场景应缓存 Program Graph（按文件/编译参数/依赖摘要失效），否则 0.6s 级冷查询不适合每次按键。

## 旧插件基线

在**同一 nano-infer 工作区**、同一 `bun`/原生提取器、mocked VS Code provider 下运行：

```bash
cd /home/huawei/fold-state-jump
bun test/project-state-sources.ts /home/huawei/nano-infer
```

- 32.7s wall / 31.7s user / 1.05GB peak（`research/measurements/old-plugin.time`）；
- 输出 630 行 JSON 诊断（`old-plugin-state-sources.log`）；
- 脚本声明：execute 两个具体实例、三个 CLI seeds、generation source-order wrap verified；
- 同时保留边界：`Fold returned storage identity is not verified for batch_state.session_state.`、`No mutation is verified on this fold return path.`、`Fold seed identifies the initial storage; the current member value may be carried from a previous iteration.`

这不是同一组查询的公平 A/B（旧插件 harness 覆盖更多调用者/缓存/Provider 路径），因此不能把 32.7s 与 1.47s 直接当成加速比。可比较的事实是：两者都保留显式边界；旧插件已有成熟的跨文件 caller/缓存/Provider 集成，本原型还没有。

## 规模评价

- 84 个 fold 源、86 个实例、86k 事件在 23GB 内存机器上可处理；
- 主要成本是 Clang 解析（15s/1GB）和 JSON 体积（78MB），不是查询；
- 查询反向路径在 `MAX_DEPTH=24`/`MAX_NODES=400` 下被截断，Oracle 中大量 `boundaries` 是预算/未解析调用，不是无限循环；
- 对更大项目需要：按文件筛选函数、持久化图、增量失效、跨 TU 摘要索引；当前实现未做这些工程优化。

## 新 TypeScript 引擎（第二轮）

| 指标 | 值 |
|---|---:|
| TS Oracle 48 条（加载 6 TU Program） | 1.54s wall / 1.50s user / 496MB |
| 单条 `pipeline.h:872` origin（加载 cli inventory） | 0.21s / 206MB |
| native fixture inventory + 查询测试 | 约 0.2s |
| `bun check` | 87 files no type errors |
| `bun test` | 540 pass / 0 fail / 36s |

新引擎使用内存 `Program` 和 native inventory 缓存；未做磁盘图缓存/增量失效。编辑器冷查询仍受 Clang 提取（MiniCPM 约 15s）限制，后续需要把 inventory 缓存接到旧插件的 cache/prewarm 层。
