#!/usr/bin/env python3
"""Reconstruct the prior implementation for the identical V2 Node benchmark."""
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
BASELINE = Path('/tmp/fsj-v2-baseline')
BASELINE.mkdir(exist_ok=True)
archive = subprocess.run(['git', 'archive', 'a6abeb80c', 'src'], cwd=ROOT, capture_output=True, check=True)
subprocess.run(['tar', '-x', '-C', str(BASELINE)], input=archive.stdout, check=True)
if not (BASELINE / 'node_modules').exists():
    (BASELINE / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
# Both sides use identical project-location work; this module did not exist in V1.
shutil.copyfile(ROOT / 'src/cache-location.ts', BASELINE / 'src/cache-location.ts')
benchmark = (ROOT / 'test/cache-v2-performance.ts').read_text().replace("'../src/", "'/tmp/fsj-v2-baseline/src/")
# V1's load hook owns both disk restore and its native permit. Its ignored fifth
# argument below is intentional: V2 alone moves restoration before that permit.
benchmark = benchmark.replace("Effect.fail(new Error('Unexpected native extraction'))",
    "Effect.gen(function* () { const location = yield* Effect.promise(() => prepareCacheLocation(locationInput)); "
    "assert.notEqual(location._tag, 'UnavailableCache'); const loaded = yield* readDiskAst(disk, beforeIdentity); "
    "if (!loaded) return yield* Effect.fail(new Error('disk miss')); return loaded; })")
(BASELINE / 'benchmark.ts').write_text(benchmark)
subprocess.run(['bun', 'build', str(BASELINE / 'benchmark.ts'), '--target=node', '--format=esm',
                '--outfile=/tmp/fsj-cache-v2-baseline.mjs'], cwd=ROOT, check=True)
