# EXPERIMENTS

所有实验均在本机执行；路径、退出码、日志可复现。

## E1 环境与仓库

```bash
git -C /home/huawei/fold-state-jump worktree add --detach \
  /home/huawei/fold-state-jump-research 89323138d
git -C /home/huawei/nano-infer rev-parse HEAD  # 2e523d9...
clangd --version                                # 18.1.3 (但实际用 clang 23)
/usr/lib/llvm-23/bin/clang++ --version           # 23.1.4
cmake --version; ninja --version; bun --version
```

结果：成功。原工作区保持不变；nano-infer 13 个 M 文件、2E hash 记录在 inventory。

## E2 Clang 23 LibTooling 构建

```bash
cmake -S prototype/native -B prototype/native/build -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm \
  -DClang_DIR=/usr/lib/llvm-23/lib/cmake/clang
cmake --build prototype/native/build -j 8
```

结果：成功。踩坑：`getName` 断言、模板 layout 崩溃、CFG succ null、fold arg 布局、`std::accumulate` seed、`std::variant` 不是 aggregate、`operator->` 路径。

## E3 nano-infer 提取

```bash
ast-inventory -p /tmp/opencode/nano-db -root /home/huawei/nano-infer \
  -include-tests <tu.cpp> > research/inventory/raw/<tu>.ndjson
```

结果：

```text
minicpm-v-4_7/cli.cpp            32,968 lines / 28MB / 15.3s / 1.06GB
deepseek attention_node          14,714 lines / 9.9MB / ~2.6s
deepseek ffn_node                11,405 lines / 7.7MB / ~2.3s
shared model_loader               1,973 lines / 1.2MB / ~2.4s
minicpm tests/local_test        37,137 lines / 31MB
```

DeepSeek 初始失败：`ffn.pb.h` 不在 `build-cpu-debug/generated`；protobuf 版本不匹配。解决：在 `/tmp/opencode/nano-db` 重写 compile DB 到 `build-cpu-tests/generated`（7036002），未改 nano-infer。

## E4 通用 fixtures

```bash
python3 -m unittest prototype/tests/test_fixtures.py -v
```

结果：13/13 OK。覆盖 fold seed/backedge、折叠结果、引用别名、同名不同对象、最近覆盖、互斥分支、复制不修改源、optional、模板两实例、外部异步 boundary、指针/虚调用/回调、动态下标 boundary、常量下标非 boundary。

## E5 Oracle 对照

```bash
python3 tools/author_oracle.py
python3 tools/run_oracle.py
python3 tools/coverage.py
```

结果：48 条；12 correct-conditional、5 correct-boundary、2 correct-multiple、3 targets-found-kind-mismatch、26 mismatch；`oracle-run.json` 有每条实际/期望/boundary。未通过类别见 `limitations.md`。

## E6 Clang Static Analyzer

```bash
clang++-23 -std=c++20 --analyze -Xanalyzer -analyzer-checker=debug.DumpCFG \
  prototype/fixtures/fold_recurrence.cpp
clang++-23 -std=c++20 --analyze -Xanalyzer -analyzer-output=text \
  prototype/fixtures/negative_control.cpp
```

结果：成功；DumpCFG 显示字段表达式但无状态历史；DeadStores 找到 `value=2` 死写。日志 `research/experiments/frameworks/clang-analyzer-*.txt`。

## E7 LLVM MemorySSA

```bash
clang++-23 -std=c++20 -O0 -g -S -emit-llvm ... 
opt-23 -passes='print<memoryssa>' -disable-output ...
llvm-dwarfdump --debug-line ...
llvm-objdump -dS --demangle ...
```

结果：O0 76 函数条目/2,746 行；O2 823 行；字段为 GEP 索引，无字段名；源码行可映射但字段 token 需额外重建。`research/experiments/llvm/`。

## E8 SVF

```bash
git clone --depth 1 https://github.com/SVF-tools/SVF.git
cmake -S . -B build-llvm23b -G Ninja -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm \
  -DCMAKE_PROJECT_INCLUDE=/tmp/opencode/frameworks/zstd-target.cmake
cmake --build build-llvm23b -j 8
```

结果：configure 成功（需注入 zstd target）；build 失败于 LLVM 23 移除 `UnifyFunctionExitNodes.h`。日志 `research/experiments/frameworks/svf-*.log`。许可证 AGPLv3。

## E9 PhASAR

```bash
git clone --depth 1 .../phasar.git; git submodule update --init --recursive --depth 1
cmake ... -DPHASAR_LLVM_VERSION=23 -DLLVM_DIR=... \
  -DCMAKE_PROJECT_INCLUDE=/tmp/opencode/frameworks/zstd-target.cmake
cmake --build build-llvm23c -j 8
```

结果：configure 成功（临时改 `find_package(LLVM)` 无版本）；build 失败于 LLVM 23 `DenseMapInfo` API 变化（`Compressor.h`）。日志 `phasar-*.log`。许可证 MIT。

## E10 旧插件基线

```bash
cd /home/huawei/fold-state-jump
bun test/project-state-sources.ts /home/huawei/nano-infer
```

结果：32.7s / 1.05GB / 630 行输出；execute 两实例、三 CLI seed、generation source-order wrap verified；同时保留 fold return identity/no mutation boundary。日志 `research/measurements/old-plugin-*`。

## E11 查询性能

```bash
/usr/bin/time -v python3 tools/run_oracle.py
/usr/bin/time -f ... python3 prototype/src/state_trace.py --line 872 ...
```

结果：48 queries 1.47s/203MB；单查询 0.60s/123MB（含加载）。见 `performance-results.md`。

## E12 真实 Clang FlowSensitive DataflowAnalysis（第二轮）

```bash
cmake --build prototype/native/build -j 8
./prototype/native/build/flow-sensitive-probe -line 16 -function overwritten \
  prototype/fixtures/negative_control.cpp -- -std=c++20
./prototype/native/build/flow-sensitive-probe -line 25 -function exclusive \
  prototype/fixtures/negative_control.cpp -- -std=c++20
./prototype/native/build/flow-sensitive-probe -line 15 -function sum_squares \
  prototype/fixtures/loop.cpp -- -std=c++20
```

结果：

- `overwritten` 只得到 15:9（覆盖写杀死 13/14）；
- `exclusive` 得到 22:11 和 24:11（分支合流）；
- `sum_squares` 得到 `acc`/`acc.total` 的字段路径与循环写 13；
- 引用/字段 location canonicalization 与聚合字段初始化仍需自建；
- 证明 FlowSensitive 提供 CFG 固定点/Environment 基础设施，但不是完整状态追踪器。

## E13 新 TypeScript 引擎与 native inventory

```bash
cmake -S native -B native/build -G Ninja -DCMAKE_BUILD_TYPE=Release \
  -DLLVM_DIR=/usr/lib/llvm-23/lib/cmake/llvm \
  -DClang_DIR=/usr/lib/llvm-23/lib/cmake/clang
cmake --build native/build -j 8
bun check
bun test
bun run build
bun tools/run_oracle_ts.ts
```

结果：

```text
bun check:  no type errors (87 files)
bun test:   540 pass / 0 fail
bun build:  extension.js built
Oracle TS: 14 correct-conditional / 8 correct-boundary / 2 correct-multiple /
           2 targets-found-kind-mismatch / 1 unsupported / 21 mismatch
```

`test/state-trace-command.ts` 通过真实 activate/native/命令/mock VS Code，导航到目标行。

## E14 状态查询矩阵 / fold audit

```bash
python3 tools/build_state_matrix.py   # 8,788 state-related sites
python3 tools/build_fold_audit.py     # 84 sites / 86 instances
python3 tools/coverage.py
```

矩阵状态分层：`oracle` 107、`fold-context` 6,959、`mechanical` 1,722。fold audit 的 reviewed/mechanical 分层记录在 `fold-audit.json`，不等于全部通过。
