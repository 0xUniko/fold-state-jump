import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Effect } from 'effect';
import { prepareAst, type ClangNode } from './analysis';
import { decodeNativeDependencies, fingerprintFile, reusableCommand, verifyDependencies } from './dependencies';
import { makeExtractionCommand, runClangAst, type CompileCommand } from './services';

export const extractVerifiedAst = Effect.fnUntraced(function* (
  source: string, command: CompileCommand, executable: string, maxAstBytes: number, signal: AbortSignal,
  report: (event: Readonly<Record<string, unknown>>) => void = () => {}
) {
  const before = yield* Effect.tryPromise({ try: () => fingerprintFile(source), catch: (error) => new Error(String(error)) });
  const directory = yield* Effect.tryPromise({
    try: () => mkdtemp(path.join(tmpdir(), 'fold-state-jump-')), catch: (error) => new Error(String(error))
  });
  return yield* Effect.gen(function* () {
    const extraction = makeExtractionCommand(command, executable);
    const manifest = path.join(directory, 'dependencies.json');
    const astText = yield* runClangAst({ ...extraction,
      args: [...extraction.args.slice(0, 2), '--cache-manifest', manifest, ...extraction.args.slice(2)]
    }, maxAstBytes, signal, report).pipe(Effect.mapError((error) => new Error(error.message)));
    const nativeDependencies = yield* Effect.tryPromise({
      try: async () => decodeNativeDependencies(JSON.parse(await readFile(manifest, 'utf8'))),
      catch: (error) => new Error('Could not read extractor dependency manifest. Rebuild the native extractor: ' + String(error))
    });
    const dependencies = yield* verifyDependencies(nativeDependencies);
    const after = yield* Effect.tryPromise({ try: () => fingerprintFile(source), catch: (error) => new Error(String(error)) });
    if (before.sha256 !== after.sha256 || before.real !== after.real || !dependencies) {
      return yield* Effect.fail(new Error('An input changed during analysis. Run the command again.'));
    }
    const prepared = yield* Effect.try({
      try: () => prepareAst(JSON.parse(astText) as ClangNode),
      catch: (error) => new Error('Could not prepare Clang AST: ' + String(error))
    });
    return { prepared, astBytes: Buffer.byteLength(astText), dependencies,
      cacheable: dependencies.reusable && reusableCommand(command), astText };
  }).pipe(Effect.ensuring(Effect.promise(() => rm(directory, { recursive: true, force: true }))));
});
