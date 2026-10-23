#!/usr/bin/env python3
"""Opt-in sequential/parallel native, preprocessor trace and PCH experiments.
Run from repository root: python3 test/native-experiments.py /path/to/pipeline.h 3
No project inputs are modified. Requires installed matching clang++, GNU time, Bun.
"""
from functools import reduce
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from time import perf_counter, sleep

source = Path(sys.argv[1]).resolve()
repetitions = int(sys.argv[2]) if len(sys.argv) > 2 else 3
pch_only = '--pch-only' in sys.argv
validation_only = '--validation-only' in sys.argv
extractor = Path('native/build/fold-state-jump-ast').resolve()
clang = Path('/usr/lib/llvm-23/bin/clang++')

def command(source):
    script = '''import {Effect} from 'effect'; import {resolveCompileCommand,makeExtractionCommand} from './src/services';
const command=await Effect.runPromise(resolveCompileCommand(process.argv[1],[process.argv[2]],'clang++'));
console.log(JSON.stringify(makeExtractionCommand(command,process.argv[3])));'''
    return json.loads(subprocess.check_output(['bun', '-e', script, str(source), str(source.parent), str(extractor)]))


def invoke(arguments, cwd, directory, name, output=False):
    metrics = directory / (name + '.time')
    start = perf_counter()
    result = subprocess.run(['/usr/bin/time', '-o', str(metrics), '-f', '%e %U %S %M %I %O', *arguments],
        cwd=cwd, stdout=subprocess.PIPE if output else subprocess.DEVNULL, stderr=subprocess.PIPE)
    fields = metrics.read_text().strip().splitlines()[-1].split()
    return {'wallMs': (perf_counter() - start) * 1000, 'time': fields, 'exit': result.returncode,
        'diagnostics': result.stderr.decode(errors='replace')[-2000:]}, result.stdout


def rss_tree(pid):
    try:
        status = Path(f'/proc/{pid}/status').read_text()
        rss = next((int(line.split()[1]) for line in status.splitlines() if line.startswith('VmRSS:')), 0)
        children = Path(f'/proc/{pid}/task/{pid}/children').read_text().split()
        return rss + sum(map(lambda child: rss_tree(int(child)), children))
    except (OSError, ValueError):
        return 0


def pair(commands, directory, concurrent, index):
    start = perf_counter()
    def launch(state, item):
        metric = directory / f'pair-{concurrent}-{index}-{item[0]}.time'
        process = subprocess.Popen(['/usr/bin/time', '-o', str(metric), '-f', '%e %U %S %M',
            item[1]['compiler'], *item[1]['args']], cwd=item[1]['cwd'], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if not concurrent:
            assert process.wait() == 0, process.stderr.read().decode()
        return [*state, (process, metric)]
    processes = reduce(launch, enumerate(commands), [])
    def observe(samples):
        sample = sum(map(lambda item: rss_tree(item[0].pid), processes))
        if all(map(lambda item: item[0].poll() is not None, processes)):
            return [*samples, sample]
        sleep(.1)
        return observe([*samples, sample])
    samples = observe([]) if concurrent else []
    results = list(map(lambda item: {'exit': item[0].wait(), 'time': item[1].read_text().strip(),
        'diagnostics': item[0].stderr.read().decode(errors='replace')[-500:]}, processes))
    assert all(map(lambda item: item['exit'] == 0, results)), results
    return {'wallMs': (perf_counter() - start) * 1000, 'sampledCombinedRssKiB': max(samples, default=0), 'processes': results}

with TemporaryDirectory(prefix='fsj-native-poc-') as directory:
    directory = Path(directory)
    report = {'source': str(source)}
    if not validation_only:
        main = command(source)
        peer = command(source.parent / 'experts.h')
        flags = main['args'][3:]
        report = {'source': str(source), 'command': main, 'parallel': [], 'sequential': []}
        report['sequential'] = list(map(lambda index: pair([main, peer], directory, False, index), range(0 if pch_only else repetitions)))
        report['parallel'] = list(map(lambda index: pair([main, peer], directory, True, index), range(0 if pch_only else repetitions)))
        trace = directory / 'tool-trace.json'
        report['toolTrace'], _ = invoke([main['compiler'], *main['args'], '-ftime-trace=' + str(trace)], main['cwd'], directory, 'tool-trace')
        report['toolTrace']['produced'] = trace.exists()
        # Clang driver preprocessing and frontend traces supplement LibTooling when
        # its ASTFrontendAction does not initialize the time-trace profiler.
        driver_trace = directory / 'driver-trace.json'
        report['preprocessor'], _ = invoke([str(clang), *flags, '-E', str(source)], main['cwd'], directory, 'preprocess')
        report['driverTrace'], _ = invoke([str(clang), *flags, '-c', str(source), '-o', str(directory / 'pipeline.o'),
            '-ftime-trace=' + str(driver_trace)], main['cwd'], directory, 'driver-trace')
        if driver_trace.exists():
            events = json.loads(driver_trace.read_text())['traceEvents']
            report['traceTotals'] = {event['name']: event.get('dur') for event in events if event['name'].startswith('Total ')}
        # Isolated PCH containing only the two real preamble includes. Absolute paths
        # preserve project header locations and never rewrite nano-infer.
        preamble = directory / 'preamble.h'
        includes = list(filter(lambda line: line.startswith('#include'), source.read_text().split('namespace minicpm')[0].splitlines()))
        preamble.write_text('\n'.join(map(lambda line: line.replace('"', '"' + str(source.parent) + '/', 1), includes)) + '\n')
        pch = directory / 'preamble.pch'
        report['pchBuild'], _ = invoke([str(clang), *flags, str(preamble), '-o', str(pch)], main['cwd'], directory, 'pch-build')
        report['pchBytes'] = pch.stat().st_size if pch.exists() else 0
        if report['pchBuild']['exit'] == 0:
            pch_args = [main['compiler'], *main['args'], '-include-pch', str(pch)]
            report['pchReuse'] = list(map(lambda index: invoke(pch_args, main['cwd'], directory, 'pch-' + str(index))[0], range(repetitions)))
            baseline_metrics, baseline = invoke([main['compiler'], *main['args']], main['cwd'], directory, 'oracle', True)
            pch_metrics, reused = invoke(pch_args, main['cwd'], directory, 'pch-oracle', True)
            spec = importlib.util.spec_from_file_location('benchmark', 'native/benchmark.py')
            benchmark = importlib.util.module_from_spec(spec); spec.loader.exec_module(benchmark)
            report['pchContractEqual'] = pch_metrics['exit'] == 0 and benchmark.normalize(json.loads(baseline), {}) == benchmark.normalize(json.loads(reused), {})
            def difference(a, b, pathname='$'):
                if type(a) is not type(b): return {'path': pathname, 'baseline': str(a)[:200], 'pch': str(b)[:200]}
                if isinstance(a, dict):
                    if a.keys() != b.keys(): return {'path': pathname, 'baselineKeys': list(a), 'pchKeys': list(b)}
                    return next(filter(None, map(lambda key: difference(a[key], b[key], pathname + '.' + key), a)), None)
                if isinstance(a, list):
                    if len(a) != len(b): return {'path': pathname, 'baselineLength': len(a), 'pchLength': len(b)}
                    return next(filter(None, map(lambda index: difference(a[index], b[index], pathname + '[' + str(index) + ']'), range(len(a)))), None)
                return None if a == b else {'path': pathname, 'baseline': str(a)[:200], 'pch': str(b)[:200]}
            report['pchFirstDifference'] = difference(benchmark.normalize(json.loads(baseline), {}), benchmark.normalize(json.loads(reused), {}))
            report['pchChangedMacro'], _ = invoke([*pch_args, '-D__cplusplus=1'], main['cwd'], directory, 'pch-macro')
    # Verify ordinary PCH validation on wholly temporary dependency changes.
    header = directory / 'macro.h'; header.write_text('#define VALUE 1\n')
    simple = directory / 'simple.h'; simple.write_text('#include "macro.h"\nstruct S { int value = VALUE; };\n')
    simple_pch = directory / 'simple.pch'
    main_file = directory / 'main.cpp'; main_file.write_text('int main() { S s; return s.value; }')
    report['simplePchBuild'], _ = invoke([str(clang), '-DOPTION=1', '-x', 'c++-header', str(simple), '-o', str(simple_pch)], directory, directory, 'simple-build')
    report['pchDifferentFlags'], _ = invoke([str(extractor), '--source', str(main_file), '--', '-DOPTION=2', '-include-pch', str(simple_pch)], directory, directory, 'pch-flags')
    header.write_text('#define VALUE 222\n')
    report['pchChangedHeader'], _ = invoke([str(extractor), '--source', str(main_file), '--', '-DOPTION=1', '-include-pch', str(simple_pch)], directory, directory, 'pch-changed-header')
    print(json.dumps(report, indent=2))
