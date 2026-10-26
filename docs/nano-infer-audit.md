# 当前审计：显式存储关系与类型图（2026-10-26）

被测分析器提交为 `b1dadf40182c54dcd78e3ff491b1c4930eefa4d3`（`feat/multi-funcs`），运行最终验证和本节基准时工作区 **干净**。本节及 JSON 是随后单独提交的报告；报告提交不改变被测分析器源码。shell 的 HTTPS/SSH 身份无法写入，最终通过 GitHub 应用发布；远端实现和原本地已测实现的 Git 树逐字节一致，随后在实际远端 SHA 的干净工作区重跑验证。修改前基线为 `c2b728f086d74337fcc7954bffa614d636107979`；开始时实际 `git fetch origin` 确认基线；发布前再次核对远端 HEAD，并以预期 HEAD 校验进行非强制快进。nano-infer 为 `562758447a716d05dabb3173cebac489bf7daf80`，工作区干净，未修改该项目。

[结果 JSON](nano-infer-audit-results.json) 和 [原始测量](measurements/storage-relations-2026-10-26.json) 包含分析器/Native/测试源码、extractor、九个被测文件及编译数据库 SHA256，以及实际命令和逐查询结果。[存储关系契约](storage-relations.md) 定义支持范围和剩余假设。下方旧审计是历史记录，不能作为本轮测量。

## 设计和共同根因

- 用 `complete / incomplete` 类型图和 `reachable / unrelated / possible / incomplete` 对象关系替代 `reachable: string[]` 中的 `"?"` 约定。未知身份缺失不再等于无关；类型兼容仍不能生成精确导航路径。
- Native 通过 canonical 类型已访问集合闭合环，取消 64 层可达遍历截断；字段改为类型表引用，取消 16 层字段序列化截断。继承基类参与可达性；值拷贝保真和潜在共享效果仍保留不同契约。
- `storageAt` 从声明类型投影字段/指针/数组；观测 lvalue 只作为补充，转换临时类型不能覆盖其存储身份。receiver 携带类型身份，修复不同类 `$this` 同名路径互相污染。类型证据在 AST 准备阶段固定，不缓存随查询时点变化的对象来源。
- 未知指针的直接写入、通过潜在别名调用已知 mutator 均保留边界。已知函数按内部顺序检查；更晚可靠写入可以覆盖更早未知回调，后续未知效果不能被跳过。实参构造先于函数体效果；无法证明时保留原有调用位置边界。
- Native 将 `std::get_if` 标为借用投影：投影不调用存储的回调，返回借用的来源仍供后续消费者使用。这里建模标准操作语义，TS 不加入库类型名称正则。空/已知无关回调与未知回调有真实 AST 对照；保留 `finish_host_copies` 等原有边界。
- Origin 保留对象的已知起点；重绑定 pointee 的边界记录真实文件和偏移。内部格式改变由 extractor 指纹隔离旧 AST 缓存。

关键实现：`src/storage.ts` 的关系 ADT/合并规则，`src/analysis.ts` 的 `storageAt`、`storedPathRelation`、`callEffectBoundary`、`findPreviousMutation` 和 receiver 路径，`native/ast-extractor.cpp` 的 `reachableStorage`、`storage`、`StorageTypes`。`AGENTS.md` 的 Bun 类型检查规则按用户确认一起提交。

## 真实证据与回归

最初新增 10 个查询后，真实 Clang 基线为 **69 pass / 6 fail**，实际复现未知回调、嵌套回调、直接 void*、继承字段、混合未知字段和回调调用漏报。最终 storage 套件从原有 65 项增至 **95/95**，净增 30 项；原有断言全部保留。使用 c2b728f 模块和 extractor 跑同一最终套件为 **80 pass / 15 fail**，其中两项明确是新元数据契约检查，不能算作 15 个导航缺陷。

新增覆盖还包括：70 层聚合及循环类型图、不同类 receiver 缓存隔离、未知指针直接写入与无关局部对象对照、已知方法的潜在别名/无关/只读对照、helper 内未知回调前后的可靠写入、variant 投影与后续回调调用、空回调、Origin 起点及重绑定位置。已有 span/string_view、ref/cref/get、shared_ptr/unique_ptr、聚合复制/移动、指针重绑定/快照的精确结果继续通过。`test/project-state-audit.ts` 只提前保存可选 AST 以便失败复核，未改变任何原有预期。

| 检查 | 本轮结果 |
|---|---|
| Native 构建、native integration | 通过；LLVM/Clang 23.1.4 |
| 存储 + 容器 + semantic-boundaries | 131/131 |
| 干净实现上的完整 Bun | **465 pass / 0 fail，23 文件，15.38 s** |
| `bun check` | 67 文件通过，Bun 1.4.3 |
| Extension build | 通过 |
| nano-infer 状态审计 | **9 文件、23 选择位置、46 次原精确断言通过** |
| 既有项目导航 | **25/25**：ffn.h 14、experts.h 3、pipeline.h 8 |
| seed/caller sources | CLI mappings、generation wrap、3 个 Origin、生产 discovery/USR 校验通过；provider 为 mock |
| `git diff --check`、最终源码/diff 审查 | 通过 |

开发中一次沙箱内完整运行有 41 项 Native preamble worker 通信失败（404 pass / 41 fail）；保留断言并在允许通信的环境运行同一完整命令，最终 465 项通过。未跳过测试。没有启动真实 Extension Host/C++ 语言服务，也没有执行模型推理、GPU 或 gRPC 运行时，不能把这些标为通过。

## 性能与体积

旧 `storage-alias-2026-10-26.json` 的 32.02→104.59 μs、29.09→80.10 μs 和合成 AST +29% 来自 db9d7c2 与其当时 dirty 工作区，来源/哈希已核对。c2b728f 已包含那次膨胀；本节重新比较 c2b728f 与 b1dadf401，不能套用旧数值。

相同 C++ SHA256 `5d42bc36f7129f4ecd63d81bfc9c992a338980e67fc75afd000a979c5ebb04f7`、路径、光标和 `-std=c++20`。干净工作区串行执行 before-a / after-a / after-b / before-b，每版本 10 次提取、每类每次 100 次预热与 1000 次查询。以下为中位数（min–max）；正确性断言在计时批次外执行。

| 查询 μs | c2b728f | b1dadf401 |
|---|---:|---:|
| aggregate | 106.56 (100.76–123.55) | 106.66 (97.02–121.26) |
| pointer | 64.83 (58.35–80.70) | 63.80 (61.00–72.51) |
| view | 79.25 (74.63–91.14) | 81.53 (77.52–96.23) |
| value | 16.98 (15.69–19.96) | 17.92 (16.05–21.32) |

| 同一合成 AST | c2b728f | b1dadf401 |
|---|---:|---:|
| Native 提取 ms | 262.033 (257.637–291.695) | 258.237 (244.770–285.310) |
| JSON parse ms | 1.729 (1.517–2.236) | 1.905 (1.565–4.795) |
| 索引 prepare ms | 6.703 (4.764–19.136) | 7.152 (4.231–22.017) |
| AST bytes | 1780891 | 1780904 |
| 类型表 bytes | 6369 | 6382 |

小型合成输入原本已使用类型表，字段引用没有显著压缩收益；完整 AST 只增加 13 bytes。查询差异处在这些样本的波动范围内，不宣称普遍加速或零开销。一次优化前的中间测量显示重复的类型预筛选与多次 find 合并有开销，最终移除已知来源路径上的预筛选，以单次 fold 合并关系，未删减未知边界。

| 真实 AST | 原 bytes | 新 bytes | 原类型表 bytes | 新类型表 bytes |
|---|---:|---:|---:|---:|
| pipeline | 10615640 | 9551763 | 2720282 | 1622207 |
| cli | 28361136 | 26478541 | 4323166 | 2379278 |

| 真实 AST prepare ms，5 次 | c2b728f | b1dadf401 |
|---|---:|---:|
| pipeline | 22.51 (19.42–40.15) | 27.74 (21.88–45.53) |
| cli | 65.89 (49.51–98.84) | 73.48 (65.50–109.17) |

pipeline 总 AST 约减少 10.02%，CLI 约减少 6.64%；类型表分别减少约 40.37% 和 44.96%。索引准备的中位数增加：pipeline 约 5.23 ms，CLI 约 7.59 ms，需继续观察准备成本；各次样本范围重叠，不宣称稳定速度改善。逐样本 parse/prepare、合成查询和逐文件单次 extraction+prepare 均在原始 JSON。真实提取计时只有每文件一个 audit 样本，非受控多次提取对比；未测常驻内存和真实语言服务 provider 时延。

## 可复核命令与剩余边界

```sh
# 在修改前保存 c2b728f 的源码模块和已核对的 extractor；两者哈希见 JSON。
cp src/analysis.ts /tmp/fsj-storage-current-baseline.ts
cp native/build/fold-state-jump-ast /tmp/fsj-storage-current-baseline-ast
bun run build:native
bun check
bun run build
bun run test/native-integration.ts
bun test
FSJ_ANALYSIS_MODULE=/tmp/fsj-storage-current-baseline.ts \
FSJ_AST_EXTRACTOR=/tmp/fsj-storage-current-baseline-ast \
  bun test test/storage-alias.test.ts
FSJ_AUDIT_AST_DIRECTORY=/tmp/fsj-storage-contract-final-asts \
FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-state-audit.ts /home/huawei/nano-infer
FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-integration.ts /home/huawei/nano-infer
FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-state-sources.ts /home/huawei/nano-infer
bun test/storage-alias-performance.ts /tmp/fsj-storage-current-baseline.ts /tmp/fsj-storage-current-baseline-ast 5 1000
bun test/storage-alias-performance.ts ../src/analysis native/build/fold-state-jump-ast 5 1000
# 按上述 batch 顺序各执行两次；真实 AST benchmark 参数及原始结果见 JSON。
bun test/storage-ast-performance.ts /tmp/fsj-storage-contract-final-asts/minicpm-v-4_7-pipeline.h.json ../src/analysis 5
git diff --check
```

保留的范围限制不是完成的功能：没有完整 CFG/分支可达性、任意返回值字段解释、容器元素/异步完成身份和完整 caller 集合证明。foreign typed pointer 内部的任意隐藏类型擦除/全局保留仍不建模；直接 void* 值有边界。不同引用根仍沿用仓库的对象身份约定，不宣称已证明任意引用参数之间不别名。详见契约文档，后续扩大语义范围必须增加调用上下文/escape 证据和精确回归。此次未修改 nano-infer、vendored 仓库、main 或缓存失效策略。

---

# 历史审计 2026-10-26：容器存储身份与引用别名复核

以下保留 c2b728f 中的历史原文；其中“当前/本次/本轮”均指当时的工作区。旧 JSON 应从 c2b728f 读取，当前 JSON 顶层对应上方 b1dadf401 验证，旧版本元数据保存在 `historical.previousReport`。

本节是当时验证结果；下方 2026-10-25 内容是历史审计。当前分析器基线为 `db9d7c2d2aa3a62bce0563faf42a4118cde6cfb9`，分支 `feat/multi-funcs`，验证对象是该 HEAD 上的**未提交工作区修改**，不是已发布的新提交。nano-infer 固定为 `562758447a716d05dabb3173cebac489bf7daf80`，工作区干净。本次通过 GitHub connector 的 commit API 再次核对两个远端分支，均与上述本地 HEAD 一致。没有提交、推送、合并或修改 nano-infer。

[历史结果 JSON（c2b728f）](https://github.com/0xUniko/fold-state-jump/blob/c2b728f086d74337fcc7954bffa614d636107979/docs/nano-infer-audit-results.json) 的 `analyzerRevision` 记录 HEAD、dirty 状态、分析器/Native 源码 SHA256 和 extractor SHA256；`realSourceQueries` 已用本轮真实提取结果全部替换。历史基线另行标记，不能将旧性能或旧查询结果算成本轮验证。[可复现性能原始数据](measurements/storage-alias-2026-10-26.json) 使用相同源码 SHA256，并分别记录 Native 提取、JSON 解码、索引准备和 query 时间。

## 已复现的基线缺陷

`test/storage-alias.test.ts` 使用独立的 C++20 fixture、真实 Clang AST。保存 `db9d7c2` 的分析器和 extractor 后运行同一套最终测试，结果 **37 pass / 28 fail**；修复后 **65/65**。其中 64 项是精确导航/边界查询，1 项验证每个已输出的类型引用都能解析。原 13 项容器回归保持原断言，合计 **78/78**。

28 项失败的名字和结果保存在性能/验证 JSON 中。已通过真实 AST 复现的主要错误包括：

- 聚合、嵌套聚合、引用成员、聚合字段后赋值、复制后的指针字段，经容器保存后仍返回过早写入。
- span、数组 span、string_view，以及 cref/包装变量复制，丢失目标关联。
- 指针先指向其他对象、再赋值为目标时漏掉逃逸；通过可写借用使指针来源未知时仍沿旧初始化器推断。
- 指针已明确重绑定到无关对象、span 指向无关对象，仍错误阻断；引用包装所指的指针变量/聚合字段后来改变时，仍错误使用旧内容；查询指针变量自身时，将复制指针值错误视为它自身的地址逃逸。
- 新分配的普通值副本，以及只读 `.get()`、经 `.get()` 进行普通值拷贝、无关包装对象写入，出现不必要的边界。

`std::ref` 的某些局部 `.get()` 路径、共享/独占指针、string 普通值拷贝等在基线上已经得到预期结果；这些是新增验证，不能算作本次新发现的基线缺陷。引用初始化后冻结、复制时间点、未知指针之间的潜在别名也有独立对照断言。

## 模型与修复规则

统一模型可用于这些场景，但“对象本身”“值中包含的借用”“副本的字段来源”“调用副作用”是不同问题，不能合并成一个 shared 布尔值或同一条 Path。

| 情况 | 本轮规则 |
|---|---|
| 对象自身 | 保持 declaration + member Path 的已有身份；普通值拷贝不把新对象本身关联回原对象 |
| 指针 | 复制的是指针值；访问需要再经过 `*`。保存 `&pointer` 与保存 `pointer` 分别处理；Clang 的 `p->field` 补上隐含的 pointee 类型身份 |
| 引用 | 初始化时绑定 lvalue；局部引用沿指针初始化时冻结绑定时间，随后改写指针不会重绑定引用；引用成员同样按绑定来源处理；绑定身份的时间与随后访问对象内容的时间分开，引用所指对象的字段仍可继续变化 |
| 聚合 | 只递归真正传递借用的字段，按 semantic InitList 字段名和 fieldwise copy 投影；纯值字段不会因对象外观相似被判定逃逸 |
| 复制与移动 | 复制保存当时的字段值，不能读取源对象后来的重绑定；移动保留可能传递的借用/所有权，但不伪造 moved-from 对象的精确状态 |
| view / owner / wrapper | 由 Native 分类 span/string_view、shared_ptr、unique_ptr、reference_wrapper；跟踪显式构造实参和复制/移动来源。新分配普通值本身独立，若其值又包含指针，则这些指针仍可传递目标关联 |
| optional/variant | 单独作为和类型保留工厂来源，不与拥有元素的容器合并；保留原有 copyBoundaries/copyValueBoundaries 的限制 |
| 已保存的借用 | 无法识别容器元素时，停在保存调用；不会将元素写编造为目标的精确写入。更晚的直接写仍优先 |
| 未知值 | 查询点前最近的简单、无条件赋值可作为来源；条件/循环内赋值、不可表示的写、可写借用使来源变未知。有兼容类型或显式来源证据时产生边界，不能沿初始化器猜测 |

Native 继续将 `sharedStorage`（潜在共享副作用）与 `copyBoundaries` / `copyValueBoundaries`（字段复制保真）分开。新增 `storageTypes` 表提供语义标签、共享字段和类型可达身份，`type.storageId` 引用它。身份来自 Clang canonical type USR 的 SHA256，避免地址导致冷解析与 PCH 解析产生不同结果。空 QualType 不生成引用。TS 消费这些标签，没有新增库类型字符串正则或容器函数名白名单。

`bindsTarget`、`storesTargetReference` 和 `exposesTarget` 共用存储来源判断，保留 unrelated / reachable / unknown 三种结果。类型可达信息只筛选可能关联，不能单独证明某个对象持有目标；不因外部资源内部可能存在任意回调就将所有会话状态关联过去。外部复制凭据等保留明确的构造/工厂实参来源，不能用 nominal 类型筛选抹掉既有保守边界。

`ref`/`cref` 的包装由 Native 标记。`reference_wrapper::get` 也由 Native 标记其返回借用语义：只读访问和普通值复制透明；写入或保存返回引用时，在 `.get()` 的准确偏移停止。`cref` 的 const 不会抹掉合法的 mutable 写。容器经 wrapper 保存后，边界仍在保存调用，不被随后容器元素的 `.get()` 覆盖。

开发过程中真实项目验证发现过三类中间回归：类型描述逐节点重复使 CLI 超过 64 MiB；空 QualType 触发新增 canonical 查询崩溃；将和类型与容器合并丢失已有工厂边界。均已修正，并通过原有断言重新验证。这些是本轮实现中的中间问题，不是 `db9d7c2` 的已确认缺陷。

## 当前验证结果与复现

| 检查 | 当前结果 |
|---|---|
| `bun run build:native` | 成功，LLVM/Clang 23.1.4；可选 LibEdit/zstd/CURL 未找到的 CMake 提示不阻断构建 |
| `bunx --no-install tsc --noEmit` | 成功 |
| `bun run build`、`bun run test/native-integration.ts` | 成功 |
| `bun test` | **435 pass / 0 fail，23 文件，15.79 s**；未跳过、删除或放宽任何既有测试 |
| 新 fixture + 既有容器套件 | **78/78**；成功断言准确文件、字节偏移、wrapped=false、frames=[]；失败断言具体原因和准确调用/重绑定偏移 |
| nano-infer audit | 9 文件、23 选择位置、46 次原精确断言通过 |
| 既有项目 integration | ffn.h 14、experts.h 3、pipeline.h 8，**25/25** |
| 项目 seed/caller sources | 原有 CLI 三条 seed 来源、generation wrapped 写、生产 discovery/USR 校验通过；provider 仍是 mock |
| `git diff --check` | 通过；只修改分析器、Native、独立 fixture/测试/基准和审计数据文档 |

沙箱内完整 Bun 的 Native worker 通信限制与历史记录相同。最终完整测试经自动审核允许在沙箱外运行，未修改测试以掩盖失败。没有启动真实 Extension Host、语言服务或 nano-infer 推理运行时。

关键位置仍精确定位：pipeline.h:1077（batch return）；ffn.h:250（prefill helper，帧 operator()）；pipeline.h:883（layer seed）；CLI:492（generation，wrapped=true）。原有 finish_host_copies、pending operator->、finish_request 等明确边界也保持原断言，未将成功查询一律改成失败。

```sh
# 在修改 Native 前保存可比较基线；本次已执行，未改动 Git 工作树基线。
git show db9d7c2:src/analysis.ts > /tmp/fsj-storage-baseline.ts
cp native/build/fold-state-jump-ast /tmp/fsj-storage-baseline-ast
# 上一行必须在 rebuild 前执行，保存的是 db9d7c2 对应二进制。

FSJ_ANALYSIS_MODULE=/tmp/fsj-storage-baseline.ts \
FSJ_AST_EXTRACTOR=/tmp/fsj-storage-baseline-ast \
  bun test test/storage-alias.test.ts
bun run build:native
bun test test/storage-alias.test.ts test/container-escape.test.ts
bunx --no-install tsc --noEmit
bun run build
bun run test/native-integration.ts
bun test

FSJ_AUDIT_AST_DIRECTORY=/tmp/fsj-storage-audit-asts \
FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-state-audit.ts /home/huawei/nano-infer
FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-integration.ts /home/huawei/nano-infer
FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-state-sources.ts /home/huawei/nano-infer
```

## 重复性能对照

同一生成的真实 C++ 输入，4 个函数各含一次目标保存和 100 次无关容器操作；输入 SHA256 为 `5d42bc36f7129f4ecd63d81bfc9c992a338980e67fc75afd000a979c5ebb04f7`。执行顺序为旧 5 轮 → 新 5 轮 → 新 5 轮 → 旧 5 轮，每版本 10 轮；每轮独立提取/prepare，每场景先预热 100 次再计时 1000 次。下表为中位数 [最小, 最大]，query 单位 µs。

| 场景 | db9d7c2 | 当前工作区 | 中位数变化 |
|---|---:|---:|---:|
| aggregate | 32.02 [28.45, 48.18] | 104.59 [97.62, 119.32] | +226.6% |
| pointer | 54.88 [52.47, 67.54] | 65.23 [63.44, 71.66] | +18.9% |
| view | 29.09 [27.87, 32.51] | 80.10 [76.49, 94.68] | +175.3% |
| value | 28.45 [24.93, 36.96] | 16.70 [15.94, 19.81] | -41.3% |

| 准备阶段 | db9d7c2 | 当前工作区 |
|---|---:|---:|
| extractMs (ms) | 266.62 [259.59, 426.63] | 269.92 [255.63, 282.55] |
| parseMs (ms) | 1.52 [1.46, 4.18] | 1.73 [1.59, 3.46] |
| prepareMs (ms) | 5.56 [3.94, 21.06] | 6.43 [4.62, 17.84] |

AST 大小固定为 1,380,193 → 1,780,891 bytes（+29.0%）。聚合与视图查询的额外来源分析有明确成本，不能宣称无退化。旧 aggregate 返回过早写；旧 view 停在最后一个无关 span 构造处，边界错误。因此这些是相同输入的耗时对照，不是相同正确性能力的性能等价证明。pointer 的结果边界前后一致；value 的精确写位置前后一致。未将一次样本或区间重叠解释成统计等价。

复现基准（每条连续运行，避免与其他大型提取并行）：

```sh
bun test/storage-alias-performance.ts /tmp/fsj-storage-baseline.ts /tmp/fsj-storage-baseline-ast 5 1000
bun test/storage-alias-performance.ts "$PWD/src/analysis.ts" "$PWD/native/build/fold-state-jump-ast" 5 1000
# 再按新、旧各执行一遍，得到每版本 10 轮。
```

本轮真实项目 pipeline/CLI 的 AST 为 10,615,640/28,361,136 bytes；本轮提取+prepare 为 14.078/16.654 s。这只是当前单次绝对值，不与下方历史不同版本的时间混比。

## 保守边界与尚未解决的范围

- 本次证明的是上述真实 AST 查询，不是完整 C++ 指针分析。容器元素身份、迭代器区间拼接、容器间 swap、返回值所有分支、异步/析构器延迟写、全局保存、类型擦除/任意强制转换，没有新增完整生命周期模型；这些仍是静态审查风险，未凭静态阅读宣称新确认的运行时错误。
- 本轮在已建立的类型/实参来源关联上，对于未知重绑定、共享返回和不可追踪元素写明确停止；不把 unrelated 原始对象全部当作逃逸。不同形参仍遵循现有 symbolic root 契约，并未求解任意两个调用实参在实际运行中是否别名。void*、设备内存和外部库内部物理地址关系不能由 nominal 类型证明。
- `.get()` 写和保存返回引用当前是准确边界；没有将它们宣称为已定位到内部对象的精确 MutationFound。移动后的源对象、复杂赋值表达式和多分支重绑定不生成精确新别名。
- 标准库语义使用本机 Clang 23 + libstdc++ 验证。libc++ 命名空间、第三方 view/owner、未展开继承/union、跨 TU 资源身份仍未全面验证。
- 下方历史风险列表中的局部 ref/cref 包装保存与直接指针后续赋值已被本轮复现并覆盖；仍不能据此扩大为容器拼接或所有间接别名均已支持。

---

# 2026-10-25 历史审计记录

以下数字、版本和“本次”字样均属于当日记录；当前验证以文档顶部和结果 JSON 的 `analyzerRevision` 为准。

# nano-infer 跨函数状态追踪审计

## 基线、范围与结论

日期：2026-10-25。通过 GitHub connector 的 commit API 实时核对，而非引用旧对话：

| 仓库 | 分支 | GitHub HEAD 与本地 HEAD |
|---|---|---|
| [fold-state-jump](https://github.com/0xUniko/fold-state-jump/commit/d16085eacdb4b54449b0359336df27a150f53170) | feat/multi-funcs | `d16085eacdb4b54449b0359336df27a150f53170` |
| [nano-infer](https://github.com/0xUniko/nano-infer/commit/562758447a716d05dabb3173cebac489bf7daf80) | main | `562758447a716d05dabb3173cebac489bf7daf80` |

两个工作区开始时均干净；本地分支分别跟踪 origin/feat/multi-funcs、origin-github/main。Git HTTPS 因本地代理 `127.0.0.1:7897` 不可达失败，改用 GitHub 连接器读取远端 HEAD。没有 fetch、reset、checkout、commit、push、merge 或删除分支；nano-infer 业务、配置、测试均未修改。

清单范围是三个应用目录全部 **26 个 C++ 文件、9129 行**，以及 **7 个测试 C++ 文件**和三个 CMakeLists。应用层有 **75 处 `ranges::fold_left` 调用**，测试另有 31 处。这是调用点数量，不是语义支持率。历史性能数据、模型结构大文档、llama.cpp/vcpkg 内部实现不计入范围。

按本次审计口径，归纳为 **14 类传递/修改模式**：直接成员写、聚合映射、默认字段复制/移动、自定义构造、引用和裸指针借用、按值包装共享存储、返回值重组、fold seed/轮次、lambda 捕获与调用时点、容器索引、optional/variant、第三方资源写、异步任务与汇合、跨文件调用者/receiver。累加器有 **7 类语义族**：标量/可空候选、纯数据容器、复合记录、外部状态借用指针、图节点返回指针、variant 状态机、资源所有权集合。分类可以交叉；例如 Retaining 是含借用指针的复合记录，不能据表示相似而把这些类型合并。

本次保留了索引、ValueSource、双命令、外部 CallerLink 的架构。新增 23 个真实 C++/Clang fixture 测试；原分析器在其中 16 个反例失败，修复后全部通过。真实项目新增 23 个位置、46 次精确断言，既有真实项目 25 个导航检查和 execute/CLI seed 测试也通过。**这证明下述具体查询，不等于整个 nano-infer 的每次运行都能追踪，更不等于全 C++ 正确性证明。**

## 证据标记

- `A:name`：`test/project-state-audit.ts` 的真实源码断言；完整目标、帧、边界见 [结果 JSON](nano-infer-audit-results.json)。
- `E:name`：`test/container-escape.test.ts` + `test/fixtures/container-escape.cpp`；真实 native Clang AST，验证容器参数逃逸边界与无逃逸时的精确写位置。
- `P`：`test/project-state-sources.ts`；真实 pipeline/CLI AST、生产 caller-discovery、模拟 providers、USR 校验。
- `I`：`test/project-integration.ts`；真实头文件的 25 个导航断言。
- `F:name`：`test/semantic-boundaries.test.ts` + `test/fixtures/semantic-boundaries.cpp`；真实 native AST。
- `N`：已有 state-sources/native/analysis/callers 测试；包括构造、指针、数组、fold 时序、多调用路径。
- `C`：已有 callers-command 测试；执行真实 extension 命令、native、缓存和过期保护，模拟 VS Code API。
- `S`：源码调用链审查；未给此具体位置增加自动断言。不能将 S 算成已验证的成功或正确边界。

下面 nano-infer 行号均对应固定 HEAD。`M` 是源码顺序上的 MutationFound，`O` 是 OriginFound；`O(parameter,boundary)` 是诚实的停止点。`O(seed)` 只确认 seed 表达式，不证明其中每个资源的完整来源。分支可达性、迭代次数、异常路径和同步关系没有被求解。

## 场景覆盖矩阵

| 文件/函数/行号与状态字段 | 从外层进入当前状态的完整主要链 | 修改位置/机制 | 当前支持与停止原因 | 应有/实际结果与错误风险 | 回归证据 |
|---|---|---|---|---|---|
| cli.cpp:225 prefill_text；BatchState.session_state | main → turn → prefill(TEXT) → prefill_text fold → run_batch(Session) → execute(Session) → BatchState seed | pipeline.h:1076 position、1077 rope_position；CLI 通过返回值继续传递 | 聚合实参 `{&pipeline, move(batch_state.session_state)}` 的成员映射支持；fold 返回值展开不支持 | execute seed 可到多个 O；prefill_text 返回转换处应边界，不能取 seed 后的写 | P；N direct/aggregate/helpers |
| cli.cpp:284 图像分批；同一状态 | main → turn → prefill(IMAGE) → image batch fold → run_embeddings → execute → batch seed | pipeline.h:1190 execute 实参，1076/1077 推进；图像 next_rope 独立 | 映射与文字分支分开保留；嵌套 fold 的返回转换不证明 | P 有独立 run_embeddings Origin 路径；不能把 run_batch 路径替代此分支 | P |
| pipeline.h:792/801 execute seed；Session/BatchState | CLI 两种 prefill + Generation → run_batch/run_embeddings → execute → `move(session.session_state)` | seed 是输入，后续才在 batch/layer fold 修改 | mappedArgument/valueSource 保留 session_state 后缀；三条 caller 路径 | Mutation 为 CLI:492 的前一轮整体替换；O 为 CLI:228、286、471 三个 seed，均核对帧 | P（精确 offset、文件、成员、调用帧） |
| pipeline.h:803 `auto &session_state = batch_state.session_state` | execute batch fold → 局部引用 | 同一 BatchState 子对象，1077 最后写 | 引用归一化支持，不把它当新副本 | M pipeline.h:1077；O pipeline.h:801 | A:batch-return；I |
| pipeline.h:924 LayerExecution.session_state* | execute → batch fold → `&session_state` → layer fold → `*layer_execution.session_state` → bank_state 引用 → helper | ffn.h:250 slots；finish_decode_layer:525 的整体 bank_state 赋值；I/O 凭据可能写资源 | 局部引用 helper 可追踪；借用跨轮返回与异步物理资源身份未完整证明 | helper 前可 M ffn.h:250；层返回处在 finish_host_copies 边界停止，不能越过它返回较早 bank 写 | A:prefill-helper/layer-borrow；I |
| pipeline.h:849–885 graph_cache.graphs/tick、counters | batch fold → 立即调用 lambda → build_language_graphs | 862 reuses；879 tick；883 builds；map erase/emplace | 立即调用时点可信；容器内部元素/unique_ptr 内容不展开 | whole session 的层 seed 可 M :883，O :801；不证明 graphs 中某个元素 | A:layer-seed；I |
| pipeline.h:1079、1082 返回 BatchState/BatchResult；:419 take_batch_state | layer/head 完成 → `{move(session_state), move(logits)}` → `{Session{this,...},...}` → take_batch_state → CLI | 返回对象重新组装，无直接赋值不是“没有来源” | 表达式中的聚合实参支持；跨函数 ReturnStmt 到调用结果的字段来源尚未建模 | 在函数内能定位最后写；函数结果外侧 Mutation 必须边界，不能跳入任意旧副本 | A:batch-return/generation-seed/chat-return；F:returned |
| cli.cpp:448/469 Generation.batch_state | turn(ChatState) → prefill → batch_state → Generation seed → 每轮 run_batch → take_batch_state | :492 整体替换，:473 读取 position | fold 当前轮前无写则返回同 fold 末写，标 wrapped；seed 不进入后续写 | M :492 wrapped=true；O :471；seed :471 本身 Mutation 是 CallExpr 边界 | A:generation-wrap/generation-seed；P；N fold-stages |
| cli.cpp:469 Generation.done/text；:508 history | prefill seed → generation fold；chat_state.history → history fold → ChatState 返回 | :483 done=true、:490 text+=；:510 push_back | 直接写和标准容器已知 mutator 支持；采样器 API 内部不推断 | done M :483 wrapped=true；History 为独立状态，不与 batch_state 混同 | A:generation-done；S history/sample；N standard mutations |
| cli.cpp:622 Interactive.chat_state/images/done；/clear | main initial ChatState(start_session) → &interactive fold → turn 或 clear_session → ChatState | :632 整体 clear；:644 turn 替换；images clear/push；done=true | 直接父成员写和指针路径支持；分支选择只按源码顺序 | /clear 输入可回绕到 :644，O :625；这只是前轮源码候选，不能声称该轮运行了 turn | A:clear-input |
| pipeline.h:1144 clear_session | main /clear → Session aggregate → clear_session → reset metadata/apply_prewarm → Session 返回 | 1150 backend buffer_clear；1166 起新 slots/frequencies/counters，复用 caches/graphs | 标量重建是初始化；设备 buffer 与返回对象来源为边界 | 不应将 clear 后状态解释成旧会话最后修改；本次未证明完整返回链 | S；N custom/factory；A:chat-return 同类返回边界 |
| experts.h:432/548 Planning、PrefetchPlan.slots | execute → start_decode_layer → plan_decode(bank_state const&)；finish_decode_layer → begin_decode_prefetch(BankState) → plan | :446/447 动态 keys/ages；:557/558 预取；:562 提交 slots | 纯字段/计数支持；vector operator[] 和动态槽号没有元素身份 | ages 查询在 operator[] 明确边界；O :433；不能把其他槽当本槽 | A:slot-index；N array-zero/array-unknown |
| ffn.h:163 Prefill Planning | start_prefill_layer → plan_prefill → slots 副本、missing/copies/expert_slots → PrefillPlan → slots 提交 | :175 起按去重专家填表；:250 slots=move(plan.slots) | slots 整体提交可 M；多容器动态索引、返回 plan 字段不追入 | M 是提交位置，不是其中某个 key 的精确最后写 | A:prefill-helper；S planning 内部 |
| ffn.h:262 BankState.pending | layer → start_decode_layer → move pending → optional reset → ActiveDecodeLayer | :270 pending.reset；分支提前 join/转 InFlight | reset 是已知 mutator；已验证的 optional 箭头保留 contained storage 路径 | 2026-10-26：仅 ffn.h 停在调用者边界；补入已验证 pipeline 调用者后回绕到 ffn.h:528 的整个 BankState 替换；O(seed) 明确仅为初始存储来源，详见 [pending 专项报告](pending-fold.md) | A:pending-reset / project-pending |
| ffn.h:445/522 frequencies 指针 fold | finish_prefill_read/finish_decode_layer → &frequencies.at(layer) → pointer accumulator | ++(*frequencies)[id]；阶段 counters 聚合赋值 | 直接 counters 写可索引；at/动态下标/具体元素及 variant 不证明 | 频次精确元素应边界；不能以没有索引写推断频次未变化 | S；A:prefill-counter 检查 enclosing callback 边界；N dynamic array |
| ffn.h:355 Retaining | finish_prefill_layer → retain_prefill → begin_retain_prefill(BankState&) → Retaining{&slots,&cache,&counter,{}} | :376 ++*counter；:378/379 动态 labels/LRU；提交 host copy | 可表示显式裸指针路径；多个借用经 fold 返回、cache[layer] 与复制完成关系不完整 | 局部 counter 写可候选；物理 records 必须边界 | S；A:layer-borrow 阻止跨复制凭据 |
| experts.h:585 BankState.pending/counters | finish_decode_layer → `bank_state = begin_decode_prefetch(move(bank_state),...)` → PendingPrefetch | :562 slots、:564 prefetch_experts、:585 pending | 整体/直接成员赋值可定位；不把 pending 非空解释成数据就绪 | M :585；O :511 参数边界；未证明 worker 已结束 | A:prefetch-return |
| experts.h:728/752 Prewarming/Warming | start_session/clear_session → make_bank/apply_prewarm → 外层 caches/slots/counters → 内层 slots/missing → read/start/finish → BankState 返回 | :763/765 标签/LRU；:768 slots；:775/776 统计；:781 返回 | 多层 fold seed 可识别；嵌套容器、返回字段、设备安装不展开 | 内层 O(seed) 可用；不能声称整条返回/设备内容链已可靠支持 | S；N nested aggregate/fold/copy boundaries |
| experts.h:332/619/664/701/703 | victim_slot(optional candidate)；hot_experts(set)；load/save table(rows/file*/row) | 候选返回新 optional；order.insert；rows.push_back；流写 | 已知容器 mutator 可用；纯返回替换、流和 optional 解包不建模 | 无写索引不能推导为未变化；返回变换处边界 | S；N no-fold-write/standard mutators |
| expert_io.h:200 Progress*、:280 IoCounters | worker → read_record → read_range → positional_read → &progress fold / sum_io 返回 | preadv 写 destination；:215/225/226 done/io；sum_io 聚合返回 | 标量写支持；buffer 地址算术、系统调用、返回聚合来源不展开 | 计数位置与物理字节写必须分开；destination 不应跳回旧 host 写 | S；F:unknown-ptr/constructor-effect |
| expert_io.h:669/755/770/834/850 records/staging | Bank records → Shared/Cache Read → Batch → task → queue → worker → execute_io_task → execute_* → read_record/memcpy | Host 直接写 bank；Staged 写 vector staging，finish 时上传 | 跨线程、共享_ptr 任务、地址算术和第三方内存写超出模型 | 必须视为资源边界；本次没有证明整个异步地址链自动识别完备 | S；F:thread-effect/shared-*；A:future-result/layer-borrow |
| expert_io.h:789/869 read_state.progress/promise | worker 完成事件 → &task.batch->read_state → progress 引用 → promise | :800 --remaining，io/error 分支更新；最后 set_value/set_exception | 局部源码计数写可定位；不推导 promise 对 future 的跨线程可见性 | remaining M :800 wrapped=true，O :790；不能据此证明数据已就绪 | A:read-progress |
| expert_io.h:497/529 ReadTicket.read_result | start_* → future → ticket → Active*/Pending → finish_* → get → Host/Staged → LoadedExperts | future.get 消费；Staged backend_tensor_set；析构 wait | user-defined ticket 构造/赋值、variant、future 与设备写均不透明 | get 前在 get_if 边界停止；O ticket 参数边界 | A:future-result；F:constructor-effect；N optional-copy |
| expert_io.h:736/925/941/974/1001 queue_state/tasks/stopped/workers | enqueue → shared queue → IoWorker thread lambda → take_io_task → IoTask → execute_io_task；析构 stop/join | dequeue reset/begin/count；enqueue optional.emplace；stopping=true | 局部直接字段可能定位；任务身份、唤醒、回调和线程 join 不求解 | queue 当前查询 M 无 verified caller、O 参数边界；不能跳到任意 enqueue 当唯一来源 | A:queue-count；S worker/queue |
| model.h:73/140/150；expert_index.h:112 | CLI load_model → manifest tensors；extent/max_resident/resident folds → LocalModel | emplace/push buffer；tensor->data/buffer；GGML 上传 | 纯标量/容器已知修改可用；iterator/structured binding、资源导入和自定义构造有限 | 列表所有权与共享物理映射分别处理；不能将资源副本当字节副本 | S；N constructor/copy boundaries |
| input.h:11、vision.h:69；runtime.h/cpu_arena.h | main → input_lines lazy view → interactive fold；load_vision → 临时 backing；ComputeGraph → allocator callbacks | getline 写 line；read/fwrite/mtmd 写外部资源；CpuArena 回调只分配 | 输入 lambda 执行时点由 range adaptor 驱动；third-party outputs 不推断 | 引用捕获无可信调用点必须边界；不把创建 view 当消费输入 | S；F:lambda-helper/unknown；I reference callback |
| attention_node.cpp:42/57 PrefillState/Generation variant | main → start_session → PrefillState(AttentionState/BatchResult) → run_batch → BatchResult → Generation(BatchResult/Finished) | `get_if/get` 分支移动状态；结束转 Finished | variant alternative 和返回对象映射不支持；两个 fold 不合并 | 两处 M 为 run_batch/holds_alternative 边界；O 分别 :44/:59 | A:deepseek-prefill/deepseek-generation |
| attention_pipeline.h:1537/1683 AttentionState.position/cache | attention_node → run_batch(move state) → state.cache unique_ptr → caches.layers[il] → execute_attention → 返回 AttentionState(position.advance,move cache,this) | :1731 返回新 position；:1646 compute 写 KV/压缩缓存 | default move 包装可识别；unique_ptr pointee、advance 自定义构造、返回映射/variant 未证明 | cache 局部别名 O :1716 仅是初始化；position M 没有 caller；不声称已回溯唯一设备缓存 | A:attention-cache/attention-return；S actual smart-pointee |
| attention_pipeline.h:1713 input fold | embedded → layer input → execute_attention(cache,...) → ffn.forward → ffn_output 返回 → 下一层 input | KV side effect + RPC 返回 activation | 纯返回累加器没有直接写不等于无变化；不把远端服务当同步本地源码调用 | 应在 returned transformation/RPC/设备边界停止 | S；A:attention-cache；N no-fold-write |
| attention_pipeline.h:98/214/895/1422 | compression plan sources、mask、parity、cache storage → Raw/CSA/HCA 分支 | 动态 vector 写/返回 parity；storage.push_back；GGML clear | 标量/容器 mutator 可定位，动态索引/variant/设备内容不证明 | 每种压缩分支独立边界，不能推断压缩 state 未改 | S；N dynamic arrays/optional boundaries |
| ffn_node.cpp:43 → ffn_service.h:483/476 FfnRuntime | main → FfnServer 构造 → prepare_ffn_runtime fold → find_or_prepare_expert_bank(state&) → banks.push_back → decode.push_back | :476 banks.push_back，:498 decode.push_back | 普通引用 helper 与容器 mutation 支持，unique_ptr 内部不展开 | banks M :476，帧 operator()；O :484 FfnRuntime seed | A:ffn-runtime |
| ffn_service.h:670 FfnServer::State{rpc,ffn} | server.run → event fold → transport.advance(move rpc) → RequestReady → handle_request(state.ffn) → service.handle → execute_ffn → finish_request → State 返回 | runtime prefill cache insert/erase；多次返回重新组装 state | 直接 helper 可跟踪；整个 event 返回态/资源共享关系不证明 | state.ffn M 在 finish_request 效果边界停止，O :671；不能跳至旧 runtime 初始化作最后写 | A:ffn-service |
| ffn_service.h:78/159/560/568/583 | prepare/router/execution → tensors/selections/groups/output → nested output fold | insert/push；groups[key].push；copy_n 写 output | 已知容器 mutator可用；动态 map key、iterator 及 copy_n 输出地址无法精确表示 | 不把不同 token/group 合并；应边界 | S；N arrays/copy；F unknown pointer |
| shared/ffn_rpc.h:320 RpcTransport::State | run event fold → advance(State,Event) → accept/read/finish/begin_shutdown → Awaiting/Reading/Finishing/Draining | gRPC Read/WriteAndFinish/Finish、CQ Next、unique_ptr move，返回 variant | 跨状态 variant、设备/网络事件、第三方异步回调不透明 | advance 的 state M 无 caller，O 参数边界；不能猜当前 alternative | A:rpc-variant；S branches |
| shared/ffn_rpc.h:385 RpcClient::unary/forward | AttentionPipeline → forward → encode(request) → unary → gRPC completion → decode reply → unpack_f32 → ffn_output | 请求/响应 buffers、status、tag、cq Next；远端 runtime 独立 | 不串接到服务端同名 handle；网络不构成可验证的 C++ CallerLink | 显式网络/函数返回边界，不声称已追踪远端修改 | S；A:attention-cache/ffn-service 仅覆盖局部边界 |
| shared/model_loader.cpp:48/59/81/85/110/120/127/216；shared/node_runtime.h | ff/attention node → load_model → load_distributed_model → shard/source/weight_blocks/weights → GGML APIs | push/emplace、块 byte累计；tensor buffer重绑；read_weight上传 | 容器/标量写可候选；跨文件 caller 需要 providers；资源内容仍边界 | 模型目录、buffer所有权与物理权重分别审查 | S；C 跨TU/缓存规则；N references |
| shared/ffn_rpc.h:57/64/68/74；dsv4_ffn.h:117；ffn.h:638 | model_info metadata → string/layout/hash；构图 helper → tensor sum 返回新节点 | 字符串/哈希/ggml_add返回替换，无对象字段赋值 | 初始化可导航；返回变换不追；图创建不等于执行缓存写 | 无 mutation 索引要报 boundary，不应伪造历史位置 | S；N no-fold-write；F:returned |

75 个应用 fold 的完整位置和测试 fold 计数见 [fold 清单](nano-infer-fold-inventory.md)。没有把每个语法命中都算作测试通过。

## 已复现缺陷与修复

最小反例先于分析器修改加入并实际运行。对固定原 `analysis.ts` 的最终同组测试为 **7 pass / 16 fail**；本次实现为 **23 pass / 0 fail**。这是 Clang AST 查询层复现；并发反例没有执行 C++ 线程调度来假装证明某一种运行顺序。

### 已复现的不可信确定跳转

| 根因与原代码 | 证据 | 修复与精度代价 |
|---|---|---|
| findPreviousMutation 对 `!callee` 直接 continue | F:unknown-ref/unknown-ptr/alias-unknown；旧结果均为未知调用之前的直接写 | native 给出参数效果；exposesTarget 仅作为屏障证据。无法验证 borrow/shared/callback 关系时 MutationBoundary；只读参数、标量值和可证明独立局部对象不阻断 |
| 不同声明 ID 被默认当独立存储 | F:possible-alias，两 State& 可能是同一对象 | 同类型借用参数按可能别名处理；已知 callee 可证明不写相应参数时保留追踪；不声称解决一般 alias analysis |
| 只检查引用/指针形参，忽略按值包装里的引用/指针 | F:shared-reference/shared-pointer/shared-reference-alias/shared-pointer-alias；实际后写 :20/:21 被漏，旧结果选早写 | 按值参数另有 shared 效果。暂不猜共享字段的映射，返回明确边界；Origin 原有 copyBoundaries 的边界语义保留 |
| 未知 callback 可以写捕获状态 | F:callback-unknown | 检查捕获和可见 callback body 的潜在效果。纯只读 closure 无须知道时点即可证明不写；反向值追踪仍要求可信调用点 |
| 引用捕获没有调用位置时退回 lambda 创建位置 | F:lambda-unknown/lambda-helper，旧返回 :7/:8 的写；Origin 也无可信时点 | Mutation/Origin 共用 captureSource 的 Snapshot / Invocations / Boundary。经 helper 或其他对象执行而无法证明时点的引用捕获停止；直接/存储后直接调用仍保留确切帧；值捕获用创建时快照 |
| 构造不是 CallExpr，完全未参与效果搜索 | F:constructor-effect/thread-effect | 独立 construction 元数据和索引保留语义区别；自定义构造或 thread/callback 参数暴露目标时为边界，不把构造体当普通同步 helper；默认字段复制不因此变黑箱 |
| 指针形参按值重绑被当成调用者指针写 | F:pointer-binding；旧定位 helper 局部 `p=q` | BorrowedTarget 与 PointerValueTarget 分案；按值 pointer 只向 pointee 传播。若本地重绑后又有可疑 pointee 效果，停止推断 caller 身份 |
| fold 用 includes('fold_left') 识别 | F:similar-name；not_fold_left 中读前无写却回绕到未来写 | 标识符精确匹配 fold_left，阻止 substring 假阳性；fold 识别仍是受限语法模型，未验证任意同名实现的数学契约 |

### 已复现的追踪遗漏

- `F:pointer-copy`：callee 只重绑自己的按值指针，却使 caller 现有 pointee 被当成未知。修复后定位原对象的写，文件、行、wrapped 与帧均有断言。
- 修改过程中真实 CLI :492 揭示完成赋值与 RHS call 的时序冲突：新增边界不能覆盖包含该调用、且已完成的外层赋值。现在显式排除被已完成写包含的 RHS 调用/构造；`F:assignment-order` 与 `A:generation-wrap` 防止回归。
- 过度保守地屏蔽所有引用捕获会阻断 run_batch 中只读 positions transform。对可见只读 callback 的效果做局部证明，保留 P 的原有三条来源路径；`F:readonly-callback` 防止回退成“一切 lambda 都阻断”。

### 容器参数逃逸短路（2026-10-25 第二轮复现）

**已复现缺陷。** `callEffectBoundary` 原来对 `standardMutationTarget()` 识别的全部标准库容器修改操作无条件返回 `undefined`。逃逸后的写经由容器元素身份（`storage[0]->value`）索引在容器 root 下，永远不会归属到目标 root；因此目标在逃逸前的最后一次直接写被当成"最新修改"返回。真实 Clang AST 反例：`state.value = 1; storage.push_back(&state); storage[0]->value = 2; consume(state.value)` 旧结果定位 `:1` 的写，而正确行为是在逃逸调用处停止。

**修复。** 共同根因是短路本身，不是某一个函数名识别错误，因此修复保留容器调用的 receiver 写索引（`vec.push_back(x)` 仍是 `vec` 的已证修改），只在参数把目标的**地址或引用**存入容器时返回 `MutationBoundary`：`storesTargetReference` 区分"值参数是副本"（不改目标，不阻断）与"地址/指针/`std::ref`/reference_wrapper 参数绑定目标存储"（后续元素写无法索引到目标，必须停止）。声明回溯沿局部指针变量（`State *p = &state; push_back(p)`）与引用别名（`State &a = state; push_back(&a)`）推导。`std::ref`/`std::cref` 是纯包装，与 `std::move`/`std::forward` 一样直通；`exposesTarget` 的声明回溯补充 `reference_wrapper`/`shared_ptr`/`unique_ptr` 共享存储类型，避免 `auto r = std::ref(state); unknown(r)` 漏报。未采用一律禁止标准库调用或无条件白名单。

**回归证据（全部精确到文件内偏移或明确边界，非仅检查非空）。**
- 逃逸必须停止（AnalysisFailure，原因匹配 `stores the target address or reference`，边界偏移落在逃逸语句行内）：`E:push-back-pointer`、`E:push-back-refwrapper`、`E:emplace-pointer`、`E:emplace-back-refwrapper`、`E:insert-pointer`、`E:insert-refwrapper`、`E:pointer-variable`、`E:alias-reference`。
- 无逃逸必须保留精确结果（MutationFound，mutation 偏移落在标记写语句行内，wrapped=false、零帧）：`E:by-value-copy`（值拷贝进容器）、`E:unrelated-pointer`（存入无关对象地址）、`E:readonly-parameter`、`E:escape-then-direct-write`（逃逸发生在直接写之前时仍定位到更新的直接写）、`E:container-self`（查询目标即容器自身时 `push_back` 是已证修改）。

**验证。** 修复前同组 13 个新测试中指针逃逸用例返回逃逸前旧写；修复后 13/13 通过，全量 **370 pass / 0 fail（22 文件）**。`bun test/analysis-performance.ts` 修复前后同输入对比（每项 20000 次 query）：无关写 4.36 vs 5.48 µs、历史写 2.48 vs 2.30 µs、最新 helper 调用 7.87 vs 8.61 µs、引用别名 Origin 15.6 vs 15.5 µs；单次微基准受调度/JIT 影响，只确认无数量级退化。

### 真实项目中的边界变化

I 的旧断言将 ffn.h:240/:393、pipeline.h:705/:742 的 callback 捕获直接退到外层参数/seed，这并不证明执行时点。现在这四处严格断言 `LambdaExpr + parameter + Reference capture invocation is not verified`。层返回处的旧断言越过 finish_host_copies 跳到早期 bank_state 赋值；现在严格断言目标路径 `layer_execution.session_state.*` 和 `finish_host_copies` 边界。没有跳过检查、接受任意结果或删除断言；修正了与语义不符的预期。

### 静态审查风险，尚未作为运行时错误复现

1. **一般共享/别名与逃逸生命周期仍不完整。** 子对象交叉别名、函数先保存地址再由后续无参函数/析构器/外部线程写入、跨多次调用的异步保留关系，没有全局 escape/happens-before 模型。当前屏障能阻止本次直接暴露目标的未知调用，不能声称覆盖所有间接或延迟别名。此类资源不属于可靠导航范围，尤其不能把整对象 M 当作其所有共享字节的最后写。后续应引入存储身份和 escaped/async 状态，不能仅新增函数名白名单。
   - 容器方向的残余：经 `auto w = std::ref(state); vec.push_back(w)` 这类包装变量间接存入、容器间拷贝/拼接（`insert(vec.begin(), other.begin(), other.end())`、`swap`）带入的第三方指针、`std::cref` 后 `const_cast` 改写，当前不判定为逃逸。指向目标的指针在逃逸前被重绑到无关对象（声明回溯只看初始化器，不看后续赋值）也不判定。这些都是静态审查风险，未作为运行时错误复现；修复方式是通用存储身份模型，不是扩充容器函数名单。
2. **返回转换仍不透明。** take_batch_state 的聚合 ReturnStmt 没有被映射回调用结果；不能从 ChatState/Generation 输出外部可靠倒推到每个旧字段。后续需要 typed ReturnSource，按所有 return 分支保留候选/边界，而不是选第一个 ReturnStmt。
3. **source order 不是控制流。** 分支、零次 fold、早退、异常、当前/前轮是否存在、被 move 后继续访问等不证明。`A:clear-input` 和 graph counters 只能作为源码候选；没有降为实际发生过的确定事件。
4. **标准库和第三方资源有保守假阳性。** optional/variant/get_if、某些 const handle 与共享子对象操作会提前停止；GGML 的图节点 side effect 不会被倒推为 C++ 字段写。不是“没有修改”的证据。
5. **调用者发现不保证全集。** 本次 mock 提供完整候选；真实 C++ 服务可能缺引用/模板实例。递归、间接调用、虚调用不可凭名称猜；当前虚调用不进入本地或外部已验证边集合。尚无真实 Extension Host 的全集证明。
6. **头文件编译上下文可选错。** root compile_commands 指向旧 build-cpu-debug；attention_pipeline.h 最近的 main.cpp 又缺 generated include。错误会由 runClangAst 拒绝，不会接受 partial AST；审计脚本显式借用实际 node TU 的目标参数。没有改自动 header inference 来掩盖问题。

### 已测试并正确处理的明确限制

- 自定义 copy/move、含共享引用/指针字段的复制、optional<Custom>、复杂 factory：N 明确验证 field-preservation / Unsupported expression 边界。
- 不能证明 invocation 的引用捕获、指针 copy capture、自定义 copy capture、[*this]：F/N 验证边界；普通值捕获和直接引用调用保留正确位置。
- builtin 固定数组下标不合并元素；动态下标、指针下标、重绑后的未知 pointee：N 验证具体错误原因。
- 返回对象变换和无索引 mutation 的 fold：A/N/F 验证明确停止；不会把 seed 后的写当作 seed 前发生。
- 原有跨 TU、header caller、重载/非调用 reference、候选去重/多路径、缓存/取消/脏文件：N/C 继续通过。

## 修改范围与可复核性

- `src/analysis.ts`：共享调用效果屏障、单独构造索引、指针值/借用分案、captureSource、虚调用边界、精确 fold 名称、赋值完成时序、容器参数逃逸检测（`storesTargetReference`/`bindsTarget` 区分值拷贝与地址/引用绑定，`std::ref`/`std::cref` 纯包装直通）。exposesTarget 不能生成 Path 或 Mutation，只能否定确定性。
- `native/ast-extractor.cpp`：参数 value/read/write/pointee/shared、receiver 效果、virtual 标记、构造参数效果、捕获初始化器。sharedStorage 与 copyBoundaries 分开，前者判断可能共享效果，后者判断字段值保真，未混为同一不变量。数组/record/std 常见持有类型分别处理；深度上限保守返回 shared。
- `test/fixtures/semantic-boundaries.cpp` / `test/semantic-boundaries.test.ts`：23 个真实 C++ 回归。
- `test/fixtures/container-escape.cpp` / `test/container-escape.test.ts`：8 个容器参数逃逸反例与 5 个无逃逸正例，全部断言精确偏移或明确边界。
- `test/project-state-audit.ts`：9 个真实文件、23 个选择位置、46 次结果断言；成功检查最终文件/行、wrapped、caller 序列及选中成员路径，边界检查具体原因；不接受任意 tag。
- `test/project-state-sources.ts`：保留原有精确 seed/caller/成员断言，加入生产 discoverCallerLocations 的 incoming+references 合并和 USR 校验；provider 含重复候选和 declaration 非调用候选。
- `test/project-integration.ts`：25 个真实源码断言，严格区分四个未知 callback 和复制凭据边界；支持显式编译数据库。
- 文档与 JSON：记录固定版本、逐场景证据、命令和性能；没有修改架构、nano-infer、vendored Effect 或第三方库。

Native 二进制指纹参与 buildIdentity，schema 元数据变化随 rebuild 自动隔离旧磁盘 AST；没有复用旧 extractor 的缓存作为新语义证明。原有缓存失效、取消和依赖校验流程保留。

## 实际验证命令与结果

从 fold-state-jump 根目录执行。所有项目解析只读 nano-infer；输出和可选 AST 存在 `/tmp`，未写 nano-infer 的构建目录。`FSJ_PROJECT_COMPILE_COMMANDS` 只是测试输入参数，不修改它的配置。

```sh
git status --short --branch
git rev-parse HEAD
git -C /home/huawei/nano-infer status --short --branch
git -C /home/huawei/nano-infer rev-parse HEAD
git ls-remote origin refs/heads/feat/multi-funcs
# 上项代理失败；随后 GitHub connector fetch_commit 分别读取两个指定分支。

bun run build:native
bunx --no-install tsc --noEmit
bun run build
bun run test/native-integration.ts
bun test

FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-state-audit.ts /home/huawei/nano-infer
FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-integration.ts /home/huawei/nano-infer
FSJ_PROJECT_COMPILE_COMMANDS=build-cpu-tests/compile_commands.json \
  bun test/project-state-sources.ts /home/huawei/nano-infer
# 同 flags 对比另外执行了未设置 FSJ_PROJECT_COMPILE_COMMANDS 的 project-state-sources。

bun test/analysis-performance.ts /tmp/fsj-analysis-baseline.ts 10000
bun test/analysis-performance.ts /home/huawei/fold-state-jump/src/analysis.ts 10000
bun test/query-performance.ts 10000
bun test/cache-performance.ts
bun test/services-performance.ts
```

| 检查 | 实际结果 |
|---|---|
| native CMake/LLVM 23.1.4 Release | 成功；CMake 提示未找到可选 LibEdit/zstd/CURL，不阻断构建 |
| TypeScript `tsc --noEmit` | 成功 |
| extension bundle | 成功 |
| native-integration | 成功 |
| 新增 C++ fixture | 23/23；原分析器同组 7/23，16 个反例失败 |
| 六个状态/调用者/extension adapter 定向套件 | 189/189 |
| 新真实项目审计 | 9 文件、23 选择位置、46 次精确结果断言通过 |
| 既有真实项目导航 | ffn.h 14、experts.h 3、pipeline.h 8，共 25 检查通过 |
| execute seed + CLI 路径 | 原精确断言保留并通过；生产 provider 合并 + native USR 验证通过；mock providers |
| 完整 Bun（沙箱内） | 基线 293 pass / 41 fail；最终 316 pass / 41 fail；同一批 preamble 问题 |
| 同 4 个 preamble 套件打包后使用 VS Code 自带 Node | 19 + 27 + 7 + 1 = 54 pass，0 fail |
| 完整 Bun（自动审核允许沙箱外重跑） | **357 pass / 0 fail，21 文件，14.53 s**；包括原先全部 41 个失败 |
| 第二轮：完整 Bun（容器逃逸修复后） | **370 pass / 0 fail，22 文件，14.97 s**；新增 13 个容器逃逸回归全通过 |
| cache/services benchmark | 缓存命中、无重提取、跨键复用、数据库复用断言通过 |

Node 复核使用的实际运行时为 `/home/huawei/.vscode-server/bin/e646868227c3e3a9e3f24277c8c7220be42c0be7/node`（本 shell 没有 `node` PATH），形式如下，四个 suite 均分别打包并运行：

```sh
bun build test/preamble-native.test.ts --target=node --format=esm \
  --outfile=/tmp/fsj-preamble-native.mjs
/home/huawei/.vscode-server/bin/e646868227c3e3a9e3f24277c8c7220be42c0be7/node \
  /tmp/fsj-preamble-native.mjs
# 同样运行 preamble.test.ts / preamble-ssd.test.ts / preamble-context.test.ts。
```

41 项的逐项结果见 [Bun 沙箱失败核对](nano-infer-bun-failures.md)。早先 `Native worker closed before response`、未产生 preamble-build/published 等，是 worker 通信失败后的连锁断言；不是通过吞错掩盖的状态追踪失败。沙箱外同一完整命令全部通过，已验证归因。

### 性能

下面是相同输入、每项 10000 次 query 的实测。单次微基准受调度/JIT 影响，不作为硬性能承诺。没有新增 workspace 扫描；caller provider 的两个来源仍并行合并，缓存仍按原二进制/编译参数/依赖身份校验。

| 分析场景 | 原 query µs | 当前 query µs | 原 prepare ms | 当前 prepare ms |
|---|---:|---:|---:|---:|
| 20000 无关写 | 2.76 | 2.86 | 43.47 | 41.58 |
| 历史写查询 | 2.18 | 2.06 | 35.51 | 26.61 |
| 20000 helper 调用，选择最新调用 | 4.62 | 4.59 | 49.90 | 48.10 |
| 2000 引用别名 Origin | 17.64 | 18.84 | 7.73 | 3.53 |

10000 函数的 cursor 基准：Mutation 6.05 → 6.32 µs，Origin 3.04 → 3.38 µs；没有观察到数量级或随总函数数量线性恶化。参考别名 Origin 小幅变慢，需继续观察多次运行分布，不能声称零开销。

相同默认编译参数的真实源码提取+prepare：pipeline 13.589 → 12.691 s，CLI 16.686 → 15.958 s；只有单次样本，不能归因于优化。AST 大小分别 6,088,024 → 6,298,281 bytes（约 +3.45%），20,376,853 → 20,884,484 bytes（约 +2.49%），是新增效果和捕获初始化元数据的可见开销。Release 配置的另一组 CLI AST 更小，**未与 debug 基线混比**。

cache fixture 冷提取 173.68 ms，15 次 warm hit 中位数约 1.53 ms，无意外重提取；20000 条编译数据库的 warm exact/header 中位数 0.265/0.187 ms，对应重建 21.894/30.735 ms。这两项是当前绝对值，未修改缓存/数据库实现，不伪称前后提升。真实语言服务 provider 搜索时延、真实大型 workspace 的常驻内存未测。

## 手动 Extension Host 验证

自动验证使用真实 Clang、真实生产 discovery/extension 适配代码和可控 mock providers；**没有启动真实 VS Code Extension Host、clangd 或 cpptools，也没有执行 nano-infer 模型推理、GPU 或 gRPC 服务端运行时验证。** CMake/业务测试源码用于核对状态契约，不把其历史 validation.md 结果算作本次运行。

1. 重建 native 和 extension；F5 启动宿主，打开固定 HEAD 的 nano-infer，启用 C++ 语言服务并完成索引，所有相关 buffer 保存。
2. 为当前目标设置有效的 compile_commands；MiniCPM 可用 build-cpu-tests。DeepSeek header 若继承 main.cpp 缺 generated 目录，应从实际 node TU 分析或提供包含正确 TU 上下文的独立分析数据库，不能接受失败解析的 partial AST。
3. 在 pipeline.h:801 的 session_state 分别执行 Mutation/Origin。核对 QuickPick 的 run_batch/run_embeddings、CLI:492 和 :228/:286/:471、frame 中成员后缀及 wrapped 标志。
4. 在 pipeline.h:996 bank_state、CLI:473 position、ffn_service.h:492 banks 核对 A 中具体目标；在 layer 返回、pending、未来 ticket、variant 位置核对明确边界提示，不能跳到过早赋值。
5. 在 references 与 incoming calls 各自不完整/不可用时核对并集；声明引用不能变调用；实际索引无外部 caller 时应停参数并给诊断。多路径 QuickPick 取消不得跳转。
6. 重复查询检查 warm hit 无 native 重提取；编辑 included header、改变 target flags、使 caller dirty、查询中取消或 reload 后，核对旧 AST/旧结果不会发布。

后续扩展顺序应为：可验证的 ReturnSource 分支模型 → fold 借用身份/返回映射 → 容器元素身份 → escaped/async 存储状态 → 真实语言服务录制与 Extension Host 集成。每一步都应继续保留无法证明的分支，不以某一光标跳成功作为覆盖率。
