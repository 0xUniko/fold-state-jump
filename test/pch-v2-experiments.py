#!/usr/bin/env python3
"""Opt-in sequential PCH and exact original-TU PrecompiledPreamble research.

python3 test/pch-v2-experiments.py /path/to/pipeline.h --samples 3 \
  --directory /tmp/fsj-pch-v2 --report docs/measurements/pch-v2.json

Build the separate native PoC using the command recorded in the report. No input
project is modified. JSON AST artifacts remain in the requested /tmp directory.
"""
import argparse
from functools import reduce
import hashlib
import json
import os
from pathlib import Path
import platform
import statistics
import subprocess
from time import perf_counter


ROOT = Path(__file__).resolve().parent.parent
CLANG = '/usr/lib/llvm-23/bin/clang++'


def normalize(value, identities):
    if isinstance(value, list):
        return list(map(lambda value: normalize(value, identities), value))
    if isinstance(value, dict):
        def attribute(state, key):
            state[key] = str(identities.setdefault(value[key], len(identities))) if key in (
                'id', 'referencedMemberDecl') and value[key] else normalize(value[key], identities)
            return state
        return reduce(attribute, sorted(value), {})
    return value


def order_specializations(value):
    if isinstance(value, list):
        return list(map(order_specializations, value))
    if not isinstance(value, dict):
        return value
    value = {key: order_specializations(item) for key, item in value.items()}
    # Only the serializer's lambda CXXRecordDecl contains primary call operator
    # followed by specializations. Never sort statement arrays or candidates.
    if value.get('kind') == 'CXXRecordDecl' and value.get('inner') and all(map(
            lambda item: item.get('kind') == 'CXXMethodDecl' and item.get('name') == 'operator()', value['inner'])):
        return {**value, 'inner': sorted(value['inner'], key=lambda item: item['type']['qualType'])}
    return value


def differences(cold, reused, pathname='$'):
    if type(cold) is not type(reused):
        return [{'path': pathname, 'cold': cold, 'reused': reused}]
    if isinstance(cold, dict):
        if cold.keys() != reused.keys():
            return [{'path': pathname, 'coldKeys': list(cold), 'reusedKeys': list(reused)}]
        return sum(map(lambda key: differences(cold[key], reused[key], pathname + '.' + key), cold), [])
    if isinstance(cold, list):
        if len(cold) != len(reused):
            return [{'path': pathname, 'coldLength': len(cold), 'reusedLength': len(reused)}]
        return sum(map(lambda item: differences(item[1][0], item[1][1], pathname + '[' + str(item[0]) + ']'), enumerate(zip(cold, reused))), [])
    return [] if cold == reused else [{'path': pathname, 'cold': cold, 'reused': reused}]


def invoke(args, cwd, directory, name, environment=None):
    start = perf_counter()
    with (directory / (name + '.jsonl')).open('wb') as output, (directory / (name + '.stderr')).open('wb') as diagnostics:
        result = subprocess.run(['/usr/bin/time', '-o', str(directory / (name + '.time')), '-f', '%e %U %S %M %I %O', *args],
                                cwd=cwd, stdout=output, stderr=diagnostics, env=environment)
    wall_ms = (perf_counter() - start) * 1000
    metrics = (directory / (name + '.time')).read_text().splitlines()[-1].split()
    stderr = (directory / (name + '.stderr')).read_text()
    samples = list(map(lambda line: json.loads(line.removeprefix('FSJ_PREAMBLE ')),
                       filter(lambda line: line.startswith('FSJ_PREAMBLE '), stderr.splitlines())))
    return {'name': name, 'command': args, 'cwd': str(cwd), 'exit': result.returncode, 'wallMs': wall_ms,
            'userSeconds': float(metrics[1]), 'systemSeconds': float(metrics[2]), 'peakRssKiB': int(metrics[3]),
            'inputBlocks': int(metrics[4]), 'outputBlocks': int(metrics[5]), 'preambleSamples': samples,
            'diagnosticTail': stderr[-1800:]}


def summary(samples):
    values = sorted(map(lambda sample: sample['wallMs'], samples))
    return {'n': len(values), 'p50Ms': statistics.median(values), 'p95Ms': values[__import__('math').ceil(len(values) * .95) - 1]}


def compare(cold, reused, directory, name, source):
    cold_normalized = normalize(cold, {})
    reused_normalized = normalize(reused, {})
    cold_path = directory / (name + '-cold-normalized.json')
    reused_path = directory / (name + '-reused-normalized.json')
    cold_path.write_text(json.dumps(cold_normalized))
    reused_path.write_text(json.dumps(reused_normalized))
    query = subprocess.run(['bun', 'test/pch-query-comparison.ts', str(cold_path), str(reused_path), str(source)],
                           cwd=ROOT, capture_output=True, text=True, check=True)
    return {'allDifferences': differences(cold_normalized, reused_normalized),
            'specializationOrderNormalizedEqual': normalize(order_specializations(cold), {}) == normalize(order_specializations(reused), {}),
            'queries': json.loads(query.stdout)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--samples', type=int, default=3)
    parser.add_argument('--directory', type=Path, default=Path('/tmp/fsj-pch-v2'))
    parser.add_argument('--report', type=Path, default=ROOT / 'docs/measurements/pch-v2.json')
    parser.add_argument('--poc', type=Path, default=Path('/tmp/fsj-preamble-experiment'))
    options = parser.parse_args()
    assert options.samples > 0
    directory = options.directory.resolve()
    directory.mkdir(exist_ok=True)
    source = options.source.resolve()
    resolver = """import {Effect} from 'effect'; import {resolveCompileCommand,makeExtractionCommand} from './src/services';
const command=await Effect.runPromise(resolveCompileCommand(process.argv[1],[process.argv[2]],'clang++'));
console.log(JSON.stringify(makeExtractionCommand(command,process.argv[3])));"""
    command = json.loads(subprocess.check_output(['bun', '-e', resolver, str(source), str(source.parent), str(ROOT / 'native/build/fold-state-jump-ast')], cwd=ROOT))
    flags = command['args'][3:]
    cold_samples = list(map(lambda index: invoke([command['compiler'], *command['args']], command['cwd'], directory, 'cold-' + str(index)), range(options.samples)))
    cold = json.loads((directory / 'cold-0.jsonl').read_text())
    # Reproduce the previous flawed approach exactly, as a comparison only.
    includes = list(filter(lambda line: line.startswith('#include'), source.read_text().split('namespace minicpm')[0].splitlines()))
    header = directory / 'manual-prefix.h'
    header.write_text('\n'.join(map(lambda line: line.replace('"', '"' + str(source.parent) + '/', 1), includes)) + '\n')
    pch = directory / 'manual-prefix.pch'
    pch_build = invoke([CLANG, *flags, str(header), '-o', str(pch)], command['cwd'], directory, 'manual-build')
    assert pch_build['exit'] == 0
    pch_samples = list(map(lambda index: invoke([command['compiler'], *command['args'], '-include-pch', str(pch)],
        command['cwd'], directory, 'manual-' + str(index)), range(options.samples)))
    assert all(map(lambda sample: sample['exit'] == 0, cold_samples + pch_samples))
    manual = compare(cold, json.loads((directory / 'manual-0.jsonl').read_text()), directory, 'manual', source)
    assert manual['specializationOrderNormalizedEqual'] and manual['queries']['equal'], manual
    preamble = invoke([str(options.poc), str(source), str(options.samples), '--', *flags], command['cwd'], directory, 'preamble')
    assert preamble['exit'] == 0, preamble
    preamble_asts = list(map(json.loads, (directory / 'preamble.jsonl').read_text().splitlines()))
    preamble_comparison = list(map(lambda item: compare(cold, item[1], directory, 'preamble-' + str(item[0]), source), enumerate(preamble_asts[:options.samples])))
    assert len(preamble_comparison) == options.samples
    assert all(map(lambda comparison: comparison['specializationOrderNormalizedEqual'] and comparison['queries']['equal'], preamble_comparison)), preamble_comparison
    fixture = directory / 'fixture.h'
    dependency = directory / 'fixture-dep.h'
    dependency.write_text('#pragma once\n#define VALUE 1\n')
    fixture.write_text('#pragma once\n#define INITIAL 1\n#include "fixture-dep.h"\ninline int f() { return VALUE + INITIAL; }\n')
    fixture_result = invoke([str(options.poc), str(fixture), '2', '--', '-std=c++17', '-x', 'c++-header'],
        directory, directory, 'fixture', {**os.environ, 'FSJ_PREAMBLE_HEADER': str(dependency)})
    assert fixture_result['exit'] == 0, fixture_result
    fixture_reuse = {sample['name']: sample['canReuse'] for sample in fixture_result['preambleSamples']}
    assert fixture_reuse == {'build': False, 'reuse-0': True, 'reuse-1': True, 'body-edit': True,
        'preamble-edit': False, 'macro-edit': True, 'standard-edit': True,
        'header-size-edit': False, 'header-same-size-restored-mtime': True}, fixture_reuse
    # An explicit preprocessing counterexample to include-line extraction.
    dependency.write_text('#pragma once\n#ifndef MODE\n#define MODE 2\n#endif\nconstexpr int selected() { return MODE; }\n')
    context = directory / 'context.h'
    context.write_text('#pragma once\n#define MODE 1\n#include "fixture-dep.h"\nstatic_assert(selected() == 1);\ninline int answer() { return selected(); }\n')
    prefix = directory / 'context-prefix.h'
    prefix.write_text('#include "fixture-dep.h"\n')
    context_pch = directory / 'context-prefix.pch'
    context_samples = [invoke([CLANG, '-std=c++17', '-x', 'c++-header', str(prefix), '-o', str(context_pch)], directory, directory, 'context-build'),
                       invoke([command['compiler'], '--source', str(context), '--', '-std=c++17', '-x', 'c++-header'], directory, directory, 'context-cold'),
                       invoke([command['compiler'], '--source', str(context), '--', '-std=c++17', '-x', 'c++-header', '-include-pch', str(context_pch)], directory, directory, 'context-reused')]
    assert list(map(lambda sample: sample['exit'], context_samples)) == [0, 0, 1], context_samples
    assert 'static assertion failed' in context_samples[2]['diagnosticTail'], context_samples
    lambda_header = directory / 'lambda.h'
    lambda_header.write_text('#pragma once\nstruct A { int value; }; struct B { int value; };\n'
        'inline int helper() { auto f = [](const auto &x) { return x.value; }; return f(A{1}) + f(B{2}); }\n')
    lambda_source = directory / 'lambda-main.cpp'
    lambda_source.write_text('#include "lambda.h"\nint entry() { return helper(); }\n')
    lambda_pch = directory / 'lambda.pch'
    lambda_samples = [invoke([CLANG, '-std=c++17', '-x', 'c++-header', str(lambda_header), '-o', str(lambda_pch)], directory, directory, 'lambda-build'),
        invoke([command['compiler'], '--source', str(lambda_source), '--', '-std=c++17'], directory, directory, 'lambda-cold'),
        invoke([command['compiler'], '--source', str(lambda_source), '--', '-std=c++17', '-include-pch', str(lambda_pch)], directory, directory, 'lambda-reused')]
    lambda_comparison = compare(json.loads((directory / 'lambda-cold.jsonl').read_text()),
        json.loads((directory / 'lambda-reused.jsonl').read_text()), directory, 'lambda', lambda_source)
    assert lambda_comparison['specializationOrderNormalizedEqual'] and lambda_comparison['queries']['equal'], lambda_comparison
    report = {'environment': {'platform': platform.platform(), 'cpu': subprocess.check_output(['lscpu'], text=True),
        'clang': subprocess.check_output([CLANG, '--version'], text=True), 'bun': subprocess.check_output(['bun', '--version'], text=True).strip(),
        'memory': Path('/proc/meminfo').read_text(), 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'gitHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()},
        'source': str(source), 'command': command, 'artifacts': str(directory),
        'pocBuildCommand': [CLANG, '-std=c++17', '-O2', '-I/usr/lib/llvm-23/include', 'native/preamble-experiment.cpp',
            '/usr/lib/llvm-23/lib/libclang-cpp.so.23.1', '-L/usr/lib/llvm-23/lib', '-lLLVM', '-Wl,-rpath,/usr/lib/llvm-23/lib', '-o', str(options.poc)],
        'cold': cold_samples, 'coldSummary': summary(cold_samples), 'manualBuild': pch_build, 'manualPchBytes': pch.stat().st_size,
        'manualReuse': pch_samples, 'manualReuseSummary': summary(pch_samples), 'manualComparison': manual,
        'preamble': preamble, 'preambleComparison': preamble_comparison, 'fixture': fixture_result,
        'contextCounterexample': context_samples,
        'minimalLambda': {'header': lambda_header.read_text(), 'source': lambda_source.read_text(),
            'samples': lambda_samples, 'comparison': lambda_comparison},
        'limitations': ['Sequential warm OS page cache, uncontrolled CPU frequency/other applications.',
            'N=3 p95 is the maximum, not a reliable production tail.',
            'PrecompiledPreamble RSS is whole persistent process high-water mark, including build and prior parses.',
            'CanReuse is not a BuildIdentity/dependency proof substitute; changed compilation contexts are gated before reuse.']}
    options.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'report': str(options.report), 'cold': report['coldSummary'], 'manual': report['manualReuseSummary'],
        'manualDifferences': len(manual['allDifferences']), 'manualQueriesEqual': manual['queries']['equal'],
        'preambleQueriesEqual': all(map(lambda comparison: comparison['queries']['equal'], preamble_comparison))}, indent=2))


if __name__ == '__main__':
    main()
