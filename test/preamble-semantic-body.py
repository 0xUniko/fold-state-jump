#!/usr/bin/env python3
"""Small semantic body-edit check after building /tmp/fsj-preamble-experiment."""
from functools import reduce
import json
import os
from pathlib import Path
import platform
import subprocess

ROOT = Path(__file__).resolve().parent.parent


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


directory = Path('/tmp/fsj-preamble-final-small')
directory.mkdir(exist_ok=True)
source = directory / 'fixture.h'
header = directory / 'fixture-dep.h'
original = '#pragma once\n#define INITIAL 1\n#include "fixture-dep.h"\nconstexpr int f() { return VALUE + INITIAL; }\n'
header.write_text('#pragma once\n#define VALUE 1\n')
source.write_text(original)
command = ['/tmp/fsj-preamble-experiment', str(source), '2', '--', '-std=c++17', '-x', 'c++-header']
result = subprocess.run(command, cwd=directory, capture_output=True, text=True,
                        env={**os.environ, 'FSJ_PREAMBLE_HEADER': str(header)})
assert result.returncode == 0, result.stderr
asts = list(map(json.loads, result.stdout.splitlines()))
source.write_text(original.replace('return VALUE + INITIAL;', 'return VALUE + INITIAL + 1;'))
cold_command = [str(ROOT / 'native/build/fold-state-jump-ast'), '--source', str(source), '--', '-std=c++17', '-x', 'c++-header']
cold = subprocess.run(cold_command, cwd=directory, capture_output=True, text=True, check=True)
assert normalize(asts[2], {}) == normalize(json.loads(cold.stdout), {})
assert normalize(asts[0], {}) == normalize(asts[1], {})
check_command = ['/usr/lib/llvm-23/bin/clang++', '-std=c++17', '-x', 'c++', '-fsyntax-only', '-']
check_input = '#include "fixture.h"\nstatic_assert(f()==3);\n'
check = subprocess.run(check_command, input=check_input, cwd=directory, capture_output=True, text=True)
assert check.returncode == 0, check.stderr
samples = list(map(lambda line: json.loads(line.removeprefix('FSJ_PREAMBLE ')),
                   filter(lambda line: line.startswith('FSJ_PREAMBLE '), result.stderr.splitlines())))
report = {'command': command, 'coldCommand': cold_command, 'semanticCheckCommand': check_command,
          'semanticCheckInput': check_input, 'cwd': str(directory), 'environment': {'platform': platform.platform()},
          'original': original, 'modified': source.read_text(), 'header': header.read_text(), 'exit': result.returncode,
          'coldModifiedAstEqualsPreambleBodyEdit': True, 'unmodifiedReuseAstEqual': True,
          'semanticStaticAssertExit': check.returncode, 'samples': samples, 'diagnostics': result.stderr,
          'limitations': ['Small semantic-body-edit fixture, N=1 session; timing is diagnostic, not a performance comparison.',
              'Final PoC rebuilt after real pipeline run; argument-vector fold refactoring and extra fixture body-edit case changed.']}
(ROOT / 'docs/measurements/pch-v2-semantic-body.json').write_text(json.dumps(report, indent=2) + '\n')
print('semantic body AST equals cold modified AST; static_assert(f()==3) passed')
