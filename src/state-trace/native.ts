import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { statSync } from 'node:fs';
import type { CompileCommand } from '../services';
import { Program } from './engine';

const cache = new Map<string, Program>();

const stripped = (source: string, command: CompileCommand): string[] => {
  const out: string[] = [];
  const args = command.args;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-Xclang' && args[i + 1] === '-ast-dump=json') { i++; continue; }
    if (a === '-fsyntax-only' || a === '-c' || a === '-MD' || a === '-MMD' || a === '-MP') continue;
    if (a === '-o' || a === '-MF' || a === '-MT' || a === '-MQ') { i++; continue; }
    if (a.startsWith('-o') || a.startsWith('-MF') || a.startsWith('-MT') || a.startsWith('-MQ')) continue;
    if (path.resolve(command.cwd, a) === path.resolve(source)) continue;
    out.push(a);
  }
  return out;
};

const run = (executable: string, args: string[], cwd: string, signal?: AbortSignal): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    let settled = false;
    const finish = (fn: () => void) => { if (!settled) { settled = true; fn(); } };
    const abort = () => { child.kill('SIGTERM'); finish(() => reject(new Error('state inventory extraction cancelled'))); };
    signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (b: Buffer) => chunks.push(b));
    child.stderr.on('data', (b: Buffer) => errors.push(b));
    child.on('error', (e) => finish(() => reject(e)));
    child.on('close', (code) => finish(() => {
      signal?.removeEventListener('abort', abort);
      if (code !== 0) reject(new Error('state inventory failed: ' + Buffer.concat(errors).toString().slice(0, 4000)));
      else resolve(Buffer.concat(chunks).toString());
    }));
  });

export async function loadInventory(
  source: string,
  command: CompileCommand,
  root: string,
  executable: string,
  signal?: AbortSignal,
): Promise<Program> {
  const args = stripped(source, command);
  const stamp = (() => { try { return statSync(source).mtimeMs; } catch { return 0; } })();
  const key = createHash('sha256').update(JSON.stringify([source, stamp, args, executable, root])).digest('hex');
  const hit = cache.get(key);
  if (hit) return hit;
  const text = await run(executable, ['-root', root, source, '--', '-Wno-everything', ...args], command.cwd, signal);
  const program = new Program(source + '.inventory', text);
  cache.set(key, program);
  return program;
}

export const clearInventoryCache = (): void => cache.clear();
