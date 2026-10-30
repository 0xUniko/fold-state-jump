import { Engine, type Mode } from './engine';

const args = process.argv.slice(2);
const arg = (name: string, fallback = ''): string => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
};
const inventories = args.reduce<string[]>((acc, x, i) => {
  if (x === '--inventory' && args[i + 1]) acc.push(args[i + 1]);
  return acc;
}, []);
if (!inventories.length) {
  console.error('usage: state-trace --inventory file.ndjson [--inventory ...] --file source --line N --column N --mode origin|mutation|history|provenance');
  process.exit(2);
}
const engine = Engine.fromFiles(inventories);
const result = engine.query({
  file: arg('--file'),
  line: Number(arg('--line')),
  column: Number(arg('--column')),
  mode: arg('--mode', 'origin') as Mode,
  maxSteps: Number(arg('--budget', '1200')),
});
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
