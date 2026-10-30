/**
 * State Trace: independent source-level provenance engine.
 *
 * The frontend is the Clang inventory emitted by prototype/native/ast-inventory.
 * This module owns the semantic model: storage identities, alias canonicalization,
 * CFG reaching definitions, fold seed/backedge rules, interprocedural mappings,
 * and the four query modes.  It does not import or extend src/analysis.ts.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

export type Mode = 'origin' | 'mutation' | 'history' | 'provenance';
export type ResultKind = 'Exact' | 'Multiple' | 'Conditional' | 'Boundary' | 'Unsupported' | 'NoPriorMutation';

export interface SourceLoc {
  file: string;
  line: number;
  column: number;
  offset: number;
  endLine: number;
  endColumn: number;
  endOffset: number;
}

export interface RawEvent {
  id: number;
  fn: string;
  block: number;
  order: number;
  event: string;
  subkind?: string;
  storage?: string;
  root?: string;
  suffix?: string;
  rootType?: string;
  value?: string;
  expr?: string;
  type?: string;
  file?: string;
  line?: number;
  col?: number;
  offset?: number;
  endLine?: number;
  endCol?: number;
  endOffset?: number;
  callee?: string;
  calleeUsr?: string;
  receiver?: string;
  captureKind?: string;
  captureFn?: string;
  captureStorage?: string;
  syntheticRelation?: string;
  returnEvent?: number;
  lambda?: string;
  args?: Array<{ index: number; storage?: string; value?: string; param?: string; paramUsr?: string; paramType?: string; text?: string }>;
}

export interface Event extends SourceLoc {
  raw: RawEvent;
  id: number;
  fn: string;
  block: number;
  order: number;
  kind: string;
  subkind: string;
  storage: string;
  root: string;
  suffix: string;
  rootType: string;
  value: string;
  expr: string;
  type: string;
  callee: string;
  calleeUsr: string;
  args: NonNullable<RawEvent['args']>;
  receiver: string;
}

export interface Fold {
  id: number;
  fn: string;
  file: string;
  line: number;
  column: number;
  seedOffset: number;
  seedLine: number;
  seedText: string;
  seedType: string;
  rangeText: string;
  rangeStart: string;
  lambdaUsr: string;
  dest: string;
  api: string;
  seedEvents: Event[];
  returns: Event[];
}

export interface Branch {
  fn: string;
  file: string;
  line: number;
  offset: number;
  condition: string;
  op: string;
  lhsText: string;
  rhsText: string;
  thenStart: number;
  thenEnd: number;
  elseStart?: number;
  elseEnd?: number;
}

export interface FunctionInfo {
  usr: string;
  qualified: string;
  name: string;
  file: string;
  line: number;
  column: number;
  params: Array<{ name: string; usr: string; type: string; index: number; line?: number; col?: number }>;
  bodyStart?: number;
  bodyEnd?: number;
  declFile?: string;
  declLine?: number;
  declColumn?: number;
  declText?: string;
  patternUsr?: string;
  templateArgs?: string;
  isLambda?: boolean;
}

export interface FieldInfo {
  name: string;
  usr: string;
  type: string;
  index: number;
  line?: number;
  col?: number;
}

export interface RecordInfo {
  usr: string;
  name: string;
  qualified: string;
  file: string;
  line: number;
  column: number;
  fields: FieldInfo[];
}

export interface CfgBlock {
  fn: string;
  id: number;
  entry: boolean;
  exit: boolean;
  succ: number[];
  events: number[];
  terminator?: string;
}

export interface Target {
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  anchor: string;
  frame: string;
  frameUsr: string;
  storage: string;
  relation: string;
  kind: string;
  may: boolean;
  conditions: string[];
  evidence: Array<{ file: string; line: number; column: number; relation: string; detail?: string }>;
}

export interface Boundary {
  file: string;
  line: number;
  column: number;
  anchor: string;
  frame: string;
  frameUsr: string;
  reason: string;
  storage?: string;
}

export interface Edge {
  from: { file: string; line: number; column: number; anchor: string; frame: string };
  to?: { file: string; line: number; column: number; anchor: string; frame: string };
  edge: string;
  detail?: string;
}

export interface QueryResult {
  query: {
    file: string;
    line: number;
    column: number;
    mode: Mode;
    expression: string;
    semantic: { frame: string; frameUsr: string; storage: string; event: string };
  };
  kind: ResultKind;
  targets: Target[];
  provenance: Edge[];
  boundaries: Boundary[];
  limitations: string[];
}

const asEvent = (r: RawEvent): Event => ({
  raw: r,
  id: r.id,
  fn: r.fn,
  block: r.block,
  order: r.order,
  kind: r.event,
  subkind: r.subkind ?? '',
  storage: r.storage ?? '',
  root: r.root ?? '',
  suffix: r.suffix ?? '',
  rootType: r.rootType ?? '',
  value: r.value ?? '',
  expr: r.expr ?? '',
  type: r.type ?? '',
  callee: r.callee ?? '',
  calleeUsr: r.calleeUsr ?? '',
  args: r.args ?? [],
  receiver: r.receiver ?? '',
  file: r.file ?? '',
  line: r.line ?? 0,
  column: r.col ?? 0,
  offset: r.offset ?? 0,
  endLine: r.endLine ?? r.line ?? 0,
  endColumn: r.endCol ?? r.col ?? 0,
  endOffset: r.endOffset ?? r.offset ?? 0,
});

const splitPath = (s: string): [string, string] => {
  const m = /^(.*?)((?:\.[A-Za-z_]\w*|->[A-Za-z_]\w*|\[[^\]]*\])*)$/.exec(s);
  return m ? [m[1], m[2]] : [s, ''];
};

const isDescendant = (child: string, parent: string): boolean =>
  child === parent || child.startsWith(parent + '.') || child.startsWith(parent + '->') || child.startsWith(parent + '[');

const dynamicNormalize = (s: string): string => s.replace(/\[[^\]]*\]/g, '[*]');

const storageSuffix = (storage: string, base: string): string =>
  base && isDescendant(storage, base) ? storage.slice(base.length) : '';

/** A write to d supplies q only when d is q or a parent of q. */
export const defSupplies = (d: string, q: string): boolean => {
  if (!d || !q) return false;
  if (isDescendant(q, d)) return true;
  const dn = dynamicNormalize(d);
  const qn = dynamicNormalize(q);
  return isDescendant(qn, dn);
};

const unique = <T,>(xs: T[]): T[] => [...new Set(xs)];

/** Target kinds that constitute alternative state sources.  Presentation nodes
 *  (calls, returns, assignments to the query site itself) are provenance
 *  evidence, not competing origins. */
const SOURCE_KINDS = new Set(['write', 'mutation', 'prior-write', 'prior-history',
  'fold-seed', 'fold-backedge', 'fold-result', 'loop-recurrence', 'pointee-write',
  'aggregate-field', 'field']);

interface FlowState { values: Map<string, Set<number>> }

const cloneState = (s: FlowState): FlowState => ({
  values: new Map([...s.values].map(([k, v]) => [k, new Set(v)])),
});

const joinInto = (dst: FlowState, src: FlowState): boolean => {
  let changed = false;
  for (const [k, v] of src.values) {
    const d = dst.values.get(k) ?? new Set<number>();
    for (const id of v) if (!d.has(id)) { d.add(id); changed = true; }
    dst.values.set(k, d);
  }
  return changed;
};

const replaceKilled = (state: FlowState, p: string, id: number): void => {
  for (const key of [...state.values.keys()]) {
    if (key !== p && isDescendant(key, p)) state.values.delete(key);
  }
  state.values.set(p, new Set([id]));
};

export class Program {
  readonly file: string;
  readonly functions = new Map<string, FunctionInfo>();
  readonly folds = new Map<number, Fold>();
  readonly foldByLambda = new Map<string, Fold>();
  readonly events: Event[] = [];
  readonly byId = new Map<number, Event>();
  readonly byFn = new Map<string, Event[]>();
  readonly cfg = new Map<string, Map<number, CfgBlock>>();
  readonly branches: Branch[] = [];
  readonly aliases = new Map<string, Map<string, string>>();
  readonly callsByCallee = new Map<string, Event[]>();
  readonly capturesByLambda = new Map<string, Event[]>();
  readonly records = new Map<string, RecordInfo>();
  readonly pointerAliases = new Map<string, string>();
  readonly instancesByPattern = new Map<string, string[]>();
  private readonly flowCache = new Map<string, LocalFlow>();
  private pseudoId = -1;

  constructor(inventoryPath: string, inventoryText?: string) {
    this.file = inventoryPath;
    const records = (inventoryText ?? readFileSync(inventoryPath, 'utf8')).split('\n').filter(Boolean)
      .map((line) => { try { return JSON.parse(line) as any; } catch { return undefined; } })
      .filter((x): x is any => Boolean(x));
    for (const r of records) {
      if (r.kind === 'function') {
        const f: FunctionInfo = {
          usr: r.usr, qualified: r.qualified, name: r.name, file: r.file,
          line: r.line, column: r.col, params: r.params ?? [],
          bodyStart: r.bodyStart, bodyEnd: r.bodyEnd,
          declFile: r.declFile, declLine: r.declLine, declColumn: r.declCol,
          declText: r.declText,
          patternUsr: r.patternUsr, templateArgs: r.templateArgs, isLambda: r.isLambda,
        };
        this.functions.set(f.usr, f);
        if (f.patternUsr) {
          const a = this.instancesByPattern.get(f.patternUsr) ?? [];
          a.push(f.usr);
          this.instancesByPattern.set(f.patternUsr, a);
        }
      } else if (r.kind === 'event') {
        const e = asEvent(r as RawEvent);
        this.events.push(e);
        this.byId.set(e.id, e);
        const arr = this.byFn.get(e.fn) ?? [];
        arr.push(e);
        this.byFn.set(e.fn, arr);
        if (e.kind === 'call' && e.calleeUsr) {
          const c = this.callsByCallee.get(e.calleeUsr) ?? [];
          c.push(e);
          this.callsByCallee.set(e.calleeUsr, c);
        }
        if (e.kind === 'capture' && e.raw && (e.raw as any).lambda) {
          const a = this.capturesByLambda.get((e.raw as any).lambda) ?? [];
          a.push(e);
          this.capturesByLambda.set((e.raw as any).lambda, a);
        }
        if (e.kind === 'alias' && e.storage && e.value) {
          const m = this.aliases.get(e.fn) ?? new Map<string, string>();
          m.set(e.storage, e.value);
          this.aliases.set(e.fn, m);
        }
      } else if (r.kind === 'fold') {
        const f: Fold = {
          id: r.id, fn: r.fn, file: r.file, line: r.line, column: r.col ?? 0,
          seedOffset: r.seedOffset ?? 0, seedLine: r.seedLine ?? 0,
          seedText: r.seedText ?? '', seedType: r.seedType ?? '',
          rangeText: r.rangeText ?? '', rangeStart: r.rangeStart ?? '',
          lambdaUsr: r.lambdaUsr ?? '', dest: r.destStorage ?? '', api: r.api ?? '',
          seedEvents: [], returns: [],
        };
        this.folds.set(f.id, f);
        if (f.lambdaUsr) this.foldByLambda.set(f.lambdaUsr, f);
      } else if (r.kind === 'cfg-block') {
        const by = this.cfg.get(r.fn) ?? new Map<number, CfgBlock>();
        by.set(r.id, { fn: r.fn, id: r.id, entry: Boolean(r.entry), exit: Boolean(r.exit),
          succ: (r.succ ?? []).map((x: any) => x.id), events: r.events ?? [],
          terminator: r.terminator });
        this.cfg.set(r.fn, by);
      } else if (r.kind === 'record') {
        this.records.set(r.usr, { usr: r.usr, name: r.name, qualified: r.qualified,
          file: r.file, line: r.line, column: r.col ?? 0, fields: r.fields ?? [] });
      } else if (r.kind === 'branch') {
        this.branches.push({ fn: r.fn, file: r.file, line: r.line, offset: r.offset,
          condition: r.condition ?? '', op: r.op ?? '', lhsText: r.lhsText ?? '',
          rhsText: r.rhsText ?? '', thenStart: r.thenStart, thenEnd: r.thenEnd,
          elseStart: r.elseStart, elseEnd: r.elseEnd });
      }
    }
    for (const arr of this.byFn.values()) arr.sort((a, b) => a.block - b.block || a.order - b.order || a.id - b.id);
    for (const f of this.folds.values()) {
      const acc = this.lambdaParam(f.lambdaUsr);
      const lam = this.byFn.get(f.lambdaUsr) ?? [];
      for (const e of this.byFn.get(f.fn) ?? []) {
        if (e.kind === 'fold-seed' && acc && e.storage.startsWith(acc)) f.seedEvents.push(e);
      }
      f.returns = lam.filter((e) => e.kind === 'return');
    }
    // Address-of initialization establishes a pointer-member pointee identity.
    const addressOf = new Set<string>();
    for (const e of this.events) if (e.kind === 'address-of' && e.storage) addressOf.add(e.fn + '|' + e.storage);
    for (const e of this.events) {
      if (!e.storage || !e.value) continue;
      if (e.kind !== 'write' && e.kind !== 'fold-seed' && e.kind !== 'construct') continue;
      if (e.storage === e.value) continue;
      if (!addressOf.has(e.fn + '|' + e.value)) continue;
      if (isDescendant(e.storage, e.value)) continue;
      this.pointerAliases.set(e.storage, e.value);
    }
  }

  resolvePointer(p: string, depth = 0): string {
    if (!p || depth > 8) return p;
    for (const [dst, src] of this.pointerAliases) {
      if (p === dst) return this.resolvePointer(src, depth + 1);
      if (p.startsWith(dst + '->'))
        return this.resolvePointer(src + '.' + p.slice(dst.length + 2), depth + 1);
    }
    return p;
  }

  /**
   * A source position inside a template (or a header included by several TUs)
   * denotes one semantic site with several concrete activation contexts.  A
   * source-level query must therefore return every event instance at that
   * position, not an arbitrary first one.  Non-template positions naturally
   * yield a single event.
   */
  resolveSites(file: string, line: number, column: number, preferWrite = false): Event[] {
    const base = path.basename(file);
    const same = this.events.filter((e) => path.basename(e.file) === base && e.line === line);
    const priority = (e: Event): number => e.kind === 'read' ? (preferWrite ? 2 : 0) :
      e.kind === 'write' ? (preferWrite ? 0 : 1) :
      e.kind === 'alias' ? 2 : e.kind === 'fold-seed' ? 5 : 3;
    const order = (a: Event, b: Event): number =>
      priority(a) - priority(b) || (a.endOffset - a.offset) - (b.endOffset - b.offset) ||
      b.storage.length - a.storage.length;
    const exact = same.filter((e) => e.column <= column && column <= Math.max(e.endColumn, e.column))
      .sort(order);
    const pool = exact.length ? exact : same.filter((e) => e.storage || e.kind === 'fold-seed' ||
      e.kind === 'alias' || e.kind === 'write' || e.kind === 'call' || e.kind === 'return');
    const best = exact.length ? exact[0] : pool.sort((a, b) =>
      Number(Boolean(b.storage)) - Number(Boolean(a.storage)) ||
      Math.abs(a.column - column) - Math.abs(b.column - column))[0];
    if (!best) return [];
    // Keep the semantic expression selected by the ranking, plus the same
    // expression in every other instantiation of the enclosing function.
    return pool.filter((e) => e.kind === best.kind && e.column === best.column &&
      e.endOffset === best.endOffset && e.expr === best.expr);
  }

  resolveSite(file: string, line: number, column: number, preferWrite = false): Event | undefined {
    return this.resolveSites(file, line, column, preferWrite)[0];
  }

  findPointerFieldDecl(storage: string): Event | undefined {
    const [root, suffix] = splitPath(storage);
    const name = suffix.startsWith('.') ? suffix.slice(1) : suffix;
    if (!root || !name) return undefined;
    const recordMatches = [...root.matchAll(/@S@([A-Za-z_]\w*)/g)];
    const recordName = recordMatches.length ? recordMatches[recordMatches.length - 1][1] : undefined;
    for (const record of this.records.values()) {
      if (!root.includes(record.usr) && record.name !== recordName) continue;
      const field = record.fields.find((f) => f.name === name && f.line);
      if (!field?.line) continue;
      const e = this.pseudo('field', record.usr, 'decl:' + field.usr, '', this.events[0], 'pointer-field');
      e.file = record.file; e.line = field.line; e.column = field.col ?? 1;
      e.offset = 0; e.endOffset = 0; e.endLine = e.line; e.endColumn = e.column;
      e.expr = field.type.trimEnd() + field.name;
      return e;
    }
    return undefined;
  }

  lambdaParam(fn: string): string {
    const p = this.functions.get(fn)?.params[0];
    return p ? 'decl:' + p.usr : '';
  }

  resolve(fn: string, p: string, depth = 0): string {
    if (!p || depth > 8) return p;
    const aliases = this.aliases.get(fn);
    if (aliases) {
      for (const [src, dst] of [...aliases].sort((a, b) => b[0].length - a[0].length)) {
        if (isDescendant(p, src)) return this.resolve(fn, dst + p.slice(src.length), depth + 1);
      }
    }
    const pointer = this.resolvePointer(p, depth);
    return pointer === p ? p : this.resolve(fn, pointer, depth + 1);
  }

  flow(fn: string): LocalFlow { return this.flowCache.get(fn) ?? this.makeFlow(fn); }

  private makeFlow(fn: string): LocalFlow {
    const f = new LocalFlow(this, fn);
    this.flowCache.set(fn, f);
    return f;
  }

  pseudo(kind: string, fn: string, storage: string, value: string, at: Event, relation = ''): Event {
    const id = this.pseudoId--;
    const e = asEvent({
      id, fn, block: at.block, order: at.order, event: kind, subkind: 'synthetic',
      storage, root: storage, suffix: '', value, expr: at.expr, file: at.file,
      line: at.line, col: at.column, offset: at.offset, endLine: at.endLine,
      endCol: at.endColumn, endOffset: at.endOffset,
    });
    e.raw.syntheticRelation = relation;
    this.byId.set(id, e);
    return e;
  }

  foldForLambda(fn: string): Fold | undefined { return this.foldByLambda.get(fn); }

  branchGuard(fn: string, e: Event): { first: boolean; later: boolean; conditions: string[] } {
    const f = this.foldForLambda(fn);
    const elem = this.functions.get(fn)?.params[1]?.name ?? '';
    let first = false, later = false;
    const conditions: string[] = [];
    for (const b of this.branches) {
      if (b.file && e.file && path.basename(b.file) !== path.basename(e.file)) continue;
      const inThen = e.offset >= b.thenStart && e.offset <= b.thenEnd;
      const inElse = b.elseStart !== undefined && e.offset >= b.elseStart && e.offset <= (b.elseEnd ?? b.elseStart);
      if (!inThen && !inElse) continue;
      if (!f || !f.rangeStart || !elem) continue;
      const lhs = b.lhsText.trim();
      const rhs = b.rhsText.trim();
      const eq = b.op === '==' || b.op === '!=';
      const elemOnLeft = lhs === elem || lhs.endsWith('.' + elem);
      const elemOnRight = rhs === elem || rhs.endsWith('.' + elem);
      const startOnOther = (elemOnLeft && rhs === f.rangeStart) || (elemOnRight && lhs === f.rangeStart);
      if (eq && startOnOther) {
        conditions.push(b.condition);
        const isEqual = b.op === '==';
        if ((isEqual && inThen) || (!isEqual && inElse)) first = true;
        if ((isEqual && inElse) || (!isEqual && inThen)) later = true;
      }
    }
    return { first, later, conditions };
  }
}

export class LocalFlow {
  readonly prog: Program;
  readonly fn: string;
  readonly blocks: Map<number, CfgBlock>;
  readonly in = new Map<number, FlowState>();
  private entryInitial: FlowState | undefined;

  constructor(prog: Program, fn: string) {
    this.prog = prog;
    this.fn = fn;
    this.blocks = new Map(prog.cfg.get(fn) ?? []);
    this.run();
  }

  private entryState(): FlowState {
    if (this.entryInitial) return cloneState(this.entryInitial);
    const st: FlowState = { values: new Map() };
    const add = (e: Event, p: string) => { if (!p) return; const set = st.values.get(p) ?? new Set<number>(); set.add(e.id); st.values.set(p, set); };
    const f = this.prog.functions.get(this.fn);
    const fold = this.prog.foldForLambda(this.fn);
    for (const p of f?.params ?? []) {
      if (fold && p.index === 0) continue; // represented by seed/backedge
      const anchor = this.prog.byFn.get(this.fn)?.[0] ?? this.prog.events[0];
      const ev = this.prog.pseudo('param', this.fn, 'decl:' + p.usr, '', anchor, 'parameter');
      ev.file = f?.file ?? ev.file; ev.line = p.line ?? f?.line ?? ev.line; ev.column = p.col ?? f?.column ?? ev.column;
      ev.offset = 0; ev.endOffset = 0; ev.endLine = ev.line; ev.endColumn = ev.column;
      ev.expr = p.type + ' ' + p.name;
      add(ev, 'decl:' + p.usr);
    }
    if (fold) {
      const acc = this.prog.lambdaParam(this.fn);
      for (const s of fold.seedEvents) add(s, this.prog.resolve(this.fn, s.storage));
      for (const r of fold.returns) {
        const back = this.prog.pseudo('fold-backedge', this.fn, acc, r.value, r, 'fold-backedge');
        add(back, acc);
      }
    }
    // Captured outer variables are values/aliases at the lambda entry.  A
    // by-reference capture is followed in the enclosing function; a by-value
    // capture is a snapshot boundary.
    let captures = this.prog.capturesByLambda.get(this.fn) ?? [];
    if (!captures.length) {
      const fnInfo = this.prog.functions.get(this.fn);
      captures = this.prog.events.filter((c) => c.kind === 'capture' && c.storage &&
        fnInfo?.file === c.file && (fnInfo.bodyStart ?? 0) <= c.offset &&
        c.offset <= (fnInfo.bodyEnd ?? 0));
    }
    for (const e of captures) {
      if (!e.storage) continue;
      const cap = this.prog.pseudo('capture', this.fn, e.storage, e.storage, e,
        e.subkind === 'value' ? 'capture-value' : 'capture-reference');
      cap.raw.captureKind = e.subkind;
      cap.raw.captureFn = e.fn;
      cap.raw.captureStorage = e.storage;
      add(cap, e.storage);
    }
    this.entryInitial = cloneState(st);
    return st;
  }

  private transfer(st: FlowState, e: Event): void {
    if (e.kind === 'alias' || e.kind === 'capture' || e.kind === 'param') return;
    if (e.kind === 'read' || e.kind === 'branch-condition' || e.kind === 'lambda' ||
        e.kind === 'aggregate-value' || e.kind === 'construct' || e.kind === 'select' ||
        e.kind === 'address-of' || e.kind === 'unknown-effect' || e.kind === 'move' ||
        e.kind === 'copy' || e.kind === 'forward') return;
    if (e.kind === 'write' || e.kind === 'call-effect' || e.kind === 'method-mutation' ||
        e.kind === 'fold-seed' || e.kind === 'fold-result') {
      if (!e.storage) return;
      const p = this.prog.resolve(this.fn, e.storage);
      if (e.subkind === 'aggregate') {
        // The aggregate's field writes are emitted after this event; do not
        // discard them, but make the whole-object write itself reachable.
        const set = st.values.get(p) ?? new Set<number>();
        set.add(e.id);
        st.values.set(p, set);
      } else replaceKilled(st, p, e.id);
    }
  }

  private run(): void {
    const entry = [...this.blocks.values()].find((b) => b.entry);
    if (!entry) return;
    this.in.set(entry.id, this.entryState());
    const queue: number[] = [entry.id];
    while (queue.length) {
      const bid = queue.shift()!;
      const block = this.blocks.get(bid);
      if (!block) continue;
      const out = cloneState(this.in.get(bid) ?? { values: new Map() });
      for (const id of block.events) {
        const e = this.prog.byId.get(id);
        if (e) this.transfer(out, e);
      }
      for (const succ of block.succ) {
        const next = this.in.get(succ);
        if (!next) { this.in.set(succ, cloneState(out)); queue.push(succ); }
        else if (joinInto(next, out)) queue.push(succ);
      }
    }
  }

  before(e: Event): FlowState {
    const st = cloneState(this.in.get(e.block) ?? { values: new Map() });
    const block = this.blocks.get(e.block);
    for (const id of block?.events ?? []) {
      const x = this.prog.byId.get(id);
      if (!x || x.order >= e.order) break;
      this.transfer(st, x);
    }
    return st;
  }

  defsBefore(e: Event, p: string): Event[] {
    const st = this.before(e);
    const ids = new Set<number>();
    for (const [rawKey, vals] of st.values) {
      const key = this.prog.resolve(this.fn, rawKey);
      if (defSupplies(key, p)) vals.forEach((id) => ids.add(id));
    }
    return [...ids].map((id) => this.prog.byId.get(id)).filter((x): x is Event => Boolean(x));
  }

  /**
   * Field writes contribute to the value of the enclosing aggregate.  A whole
   * object read therefore observes writes to its subobjects even though those
   * writes did not overwrite the object as a whole.
   */
  defsContainedUnder(e: Event, p: string, limit = 64): Event[] {
    const st = this.before(e);
    const ids = new Set<number>();
    for (const [rawKey, vals] of st.values) {
      const key = this.prog.resolve(this.fn, rawKey);
      if (key === p || !isDescendant(key, p)) continue;
      vals.forEach((id) => { if (ids.size < limit) ids.add(id); });
    }
    return [...ids].map((id) => this.prog.byId.get(id)).filter((x): x is Event => Boolean(x));
  }
}

export class Engine {
  private readonly programs = new Map<string, Program>();

  constructor(programs: Program[]) {
    for (const p of programs) this.programs.set(p.file, p);
  }

  static fromFiles(files: string[]): Engine { return new Engine(files.map((f) => new Program(f))); }

  static fromPrograms(programs: Program[]): Engine { return new Engine(programs); }

  query(q: { file: string; line: number; column: number; mode: Mode; maxSteps?: number }): QueryResult {
    const file = path.resolve(q.file);
    const preferWrite = q.mode === 'mutation' || q.mode === 'history';
    const candidates = [...this.programs.values()]
      .flatMap((p) => p.resolveSites(file, q.line, q.column, preferWrite).map((e) => ({ p, e })));
    if (!candidates.length) throw new Error('no inventory event at requested source position');
    const results = candidates.map(({ p, e }) => {
      const tracer = new Tracer(p, e, q.mode, q.maxSteps);
      tracer.run();
      return tracer.result();
    });
    return results.length === 1 ? results[0] : mergeActivations(results);
  }
}

const mergeKey = (t: Target): string => [t.file, t.line, t.column, t.relation, t.kind, t.anchor].join('|');

/**
 * Merge the answers of several concrete activations of one source site.
 * The union is a may-answer: the same source expression may observe different
 * objects in different instantiations, so it can not be presented as Exact.
 */
const mergeActivations = (results: QueryResult[]): QueryResult => {
  const first = results[0];
  const targets = new Map<string, Target>();
  const boundaries = new Map<string, Boundary>();
  const provenance = new Map<string, Edge>();
  for (const r of results) {
    for (const t of r.targets) {
      const key = mergeKey(t);
      const current = targets.get(key);
      if (current) current.conditions = unique([...current.conditions, ...t.conditions]);
      else targets.set(key, { ...t, conditions: [...t.conditions] });
    }
    for (const b of r.boundaries) boundaries.set([b.file, b.line, b.reason].join('|'), b);
    for (const e of r.provenance) provenance.set(JSON.stringify(e), e);
  }
  const real = [...targets.values()].filter((t) => SOURCE_KINDS.has(t.kind));
  const kind: ResultKind = real.length > 1 ? 'Multiple'
    : real.length === 1 ? 'Conditional'
    : boundaries.size > 0 ? 'Boundary'
    : first.kind === 'NoPriorMutation' ? 'NoPriorMutation'
    : first.kind;
  return {
    query: first.query,
    kind,
    targets: [...targets.values()],
    provenance: [...provenance.values()],
    boundaries: [...boundaries.values()],
    limitations: unique([...results.flatMap((r) => r.limitations),
      'source site is instantiated in multiple activation contexts; targets are a union']),
  };
};

export class Tracer {
  readonly p: Program;
  readonly site: Event;
  readonly mode: Mode;
  readonly targets: Target[] = [];
  readonly boundaries: Boundary[] = [];
  readonly provenance: Edge[] = [];
  readonly conditions: string[] = [];
  private visited = new Set<string>();
  private originSeen = new Set<string>();
  private returnSeen = new Set<string>();
  private nodes = 0;
  private loop = false;
  private conditional = false;
  private emptyState = false;
  private budgetReported = false;

  private readonly maxSteps: number;

  constructor(p: Program, site: Event, mode: Mode, maxSteps = 1200) {
    this.p = p;
    this.site = site;
    this.mode = mode;
    this.maxSteps = maxSteps;
    this.conditions = p.branchGuard(site.fn, site).conditions;
  }

  private addTarget(e: Event, relation: string, kind: string, may = true, conditions: string[] = []): void {
    if (!e.file || e.line <= 0) return;
    const t: Target = {
      file: e.file, line: e.line, column: e.column, endLine: e.endLine,
      endColumn: e.endColumn, anchor: e.expr, frame: this.p.functions.get(e.fn)?.qualified ?? e.fn,
      frameUsr: e.fn, storage: e.storage, relation, kind, may,
      conditions: [...this.conditions, ...conditions],
      evidence: [],
    };
    if (!this.targets.some((x) => x.file === t.file && x.line === t.line && x.column === t.column &&
      x.relation === t.relation && x.kind === t.kind && x.frameUsr === t.frameUsr && x.storage === t.storage))
      this.targets.push(t);
  }

  private addBoundary(e: Event, reason: string, storage = ''): void {
    const b: Boundary = {
      file: e.file, line: e.line, column: e.column, anchor: e.expr,
      frame: this.p.functions.get(e.fn)?.qualified ?? e.fn, frameUsr: e.fn,
      reason, storage: storage || e.storage,
    };
    if (!this.boundaries.some((x) => x.file === b.file && x.line === b.line && x.reason === b.reason))
      this.boundaries.push(b);
  }

  private edge(from: Event, to: Event | undefined, edge: string, detail = ''): void {
    const x: Edge = {
      from: { file: from.file, line: from.line, column: from.column, anchor: from.expr, frame: this.p.functions.get(from.fn)?.qualified ?? from.fn },
      edge, detail,
    };
    if (to) x.to = { file: to.file, line: to.line, column: to.column, anchor: to.expr, frame: this.p.functions.get(to.fn)?.qualified ?? to.fn };
    if (!this.provenance.some((y) => JSON.stringify(y) === JSON.stringify(x))) this.provenance.push(x);
  }

  run(): void {
    this.addTarget(this.site, 'selected', 'selected', false);
    if (this.mode === 'origin' || this.mode === 'provenance') {
      this.variantGuards();
      this.origin(this.site, 0, 'selected');
      this.forwardTransfers();
    } else this.mutation(this.site, this.mode === 'history');
  }

  private overBudget(): boolean {
    if (this.nodes++ <= this.maxSteps) return false;
    if (!this.budgetReported) {
      this.budgetReported = true;
      this.addBoundary(this.site, 'analysis budget exhausted');
    }
    return true;
  }

  private origin(e: Event, depth: number, relation: string): void {
    if (depth > 18 || this.overBudget()) return;
    // A write/initialization is itself the definition: its value comes from the
    // assigned expression, not from an earlier reaching definition.
    if (e.kind === 'write' || e.kind === 'fold-seed' || e.kind === 'call-effect' ||
        e.kind === 'method-mutation') {
      this.addTarget(e, 'write', 'mutation');
      if (e.value) this.followValue(e, e.value, depth + 1, 'write-value');
      else {
        // Aggregate assignment: its field writes immediately following the
        // whole-object write carry the member values.
        this.aggregateFields(e);
      }
      return;
    }
    const key = e.fn + '|' + e.storage + '|' + relation;
    if (this.originSeen.has(key)) return;
    this.originSeen.add(key);
    if ((e.kind === 'construct' && !e.storage || e.kind === 'return-field') &&
        (e.expr.trim().endsWith('{}') || e.value.endsWith('{}'))) {
      this.emptyState = true;
      return;
    }
    if (e.kind === 'alias') {
      this.addTarget(e, 'alias-binding', 'alias');
      this.edge(e, undefined, 'reference-alias', 'binding names the target');
      this.followValue(e, e.value, depth + 1, 'alias-target');
      return;
    }
    const storage = this.p.resolve(e.fn, e.storage);
    if (!storage) {
      if (e.value) this.followValue(e, e.value, depth + 1, relation);
      else this.addBoundary(e, 'expression has no storage identity');
      return;
    }
    if (storage.startsWith('call:')) { this.followCall(e, storage, depth); return; }
    if (storage.startsWith('fold:')) { this.expandFoldResult(e, storage, depth); return; }
    if (storage.includes('[*:') || storage.includes('[at:'))
      this.addBoundary(e, 'dynamic container index may alias other elements', storage);
    const flow = this.p.flow(e.fn);
    const defs = [...new Map([...flow.defsBefore(e, storage),
      ...flow.defsContainedUnder(e, storage)].map((d) => [d.id, d])).values()]
      .sort((a, b) => Number(a.kind === 'param') - Number(b.kind === 'param'));
    if (!defs.length) { this.addBoundary(e, 'no reaching definition in this translation unit'); return; }
    for (const d of defs) this.visitDef(d, storage, e, depth, relation);
  }

  private aggregateFields(e: Event): number {
    const storage = this.p.resolve(e.fn, e.storage);
    let fields = 0;
    for (const x of this.p.byFn.get(e.fn) ?? []) {
      if (x.id === e.id || x.block !== e.block || x.order <= e.order ||
          x.order > e.order + 48 || x.kind !== 'write') continue;
      if (!isDescendant(this.p.resolve(x.fn, x.storage), storage)) continue;
      this.edge(x, e, 'aggregate-field', x.storage);
      this.addTarget(x, 'aggregate-field', 'field');
      fields++;
    }
    return fields;
  }

  private visitDef(d: Event, storage: string, use: Event, depth: number, relation: string): void {
    if (this.overBudget()) return;
    if (d.kind === 'param') { this.followParam(d, storage, depth); return; }
    if (d.kind === 'fold-seed' || d.kind === 'fold-backedge') this.addFoldParameterTarget(d);
    if (d.kind === 'capture') { this.followCapture(d, storage, depth); return; }
    if (d.kind === 'fold-seed') {
      this.loop = true; this.conditional = true;
      this.edge(d, use, 'fold-seed-field', 'aggregate seed field');
      this.addTarget(d, 'fold-seed', 'initialization', true, ['fold iteration 0']);
      this.followValue(d, d.value, depth + 1, 'fold-seed-value'); return;
    }
    if (d.kind === 'fold-backedge') {
      const guard = this.p.branchGuard(d.fn, use);
      if (guard.first) return;
      this.loop = true; this.conditional = true;
      this.edge(d, use, 'fold-backedge', 'previous iteration returned accumulator');
      this.addTarget(d, 'fold-backedge', 'loop-recurrence', true, ['fold iteration > 0']);
      const ret = this.previousReturn(d);
      if (ret) this.followReturnSite(ret, depth + 1);
      return;
    }
    if (d.kind === 'fold-result') { this.expandFoldResult(d, storage, depth); return; }
    if (d.kind === 'call-effect' || d.kind === 'method-mutation') {
      this.edge(d, use, 'call-effect', 'callee may write through a reference/container');
      this.addBoundary(d, 'call effect on referenced storage is not fully modeled');
      return;
    }
    if (d.kind === 'write') {
      this.edge(d, use, 'reaching-write', d.subkind);
      this.addTarget(d, 'write', 'write');
      const suffix = storageSuffix(storage, this.p.resolve(d.fn, d.storage));
      const value = suffix && d.value ? d.value + suffix : d.value;
      if (value === 'increment' || value === 'compound' || value === storage) {
        this.loop = true;
        const prev = this.p.flow(d.fn).defsBefore(d, storage).filter((x) => x.id !== d.id);
        for (const x of prev) this.visitDef(x, storage, use, depth + 1, 'loop-recurrence');
      } else if (value) this.followValue(d, value, depth + 1, 'write-value');
      else {
        if (!this.aggregateFields(d)) this.addBoundary(d, 'write value is opaque');
      }
      return;
    }
    this.addBoundary(d, 'unmodeled definition');
  }

  private addFoldParameterTarget(d: Event): void {
    const fold = [...this.p.folds.values()].find((f) => f.seedEvents.includes(d) || f.returns.includes(d));
    if (!fold) return;
    const fn = this.p.functions.get(fold.lambdaUsr);
    if (!fn) return;
    const acc = this.p.lambdaParam(fold.lambdaUsr);
    const anchor = this.p.byFn.get(fold.lambdaUsr)?.[0];
    if (!anchor || !acc) return;
    const p = this.p.pseudo('param', fold.lambdaUsr, acc, '', anchor, 'accumulator');
    p.file = fn.file; p.line = fn.line; p.column = fn.column; p.expr = (fn.params[0]?.type ?? '') + ' ' + (fn.params[0]?.name ?? '');
    p.offset = 0; p.endOffset = 0; p.endLine = p.line; p.endColumn = p.column;
    this.addTarget(p, 'accumulator-parameter', 'parameter', true, ['fold accumulator']);
  }

  private followValue(src: Event, value: string, depth: number, relation: string): void {
    if (depth > 18 || this.overBudget()) return;
    if (!value) { this.addBoundary(src, 'empty value provenance'); return; }
    if (value.startsWith('call:')) { this.followCall(src, value, depth); return; }
    if (value.startsWith('expr:')) { this.addBoundary(src, 'opaque expression value: ' + value.slice(5)); return; }
    if (value.startsWith('fold:')) { this.expandFoldResult(src, src.storage, depth); return; }
    if (value.startsWith('return:')) return;
    const flow = this.p.flow(src.fn);
    const defs = [...new Map([...flow.defsBefore(src, value),
      ...flow.defsContainedUnder(src, value)].map((d) => [d.id, d])).values()]
      .sort((a, b) => Number(a.kind === 'param') - Number(b.kind === 'param'));
    if (!defs.length) { this.addBoundary(src, 'no reaching definition for transferred value', value); return; }
    for (const d of defs) this.visitDef(d, value, src, depth, relation);
  }

  private followParam(d: Event, storage: string, depth: number): void {
    if (this.overBudget()) return;
    const fn = this.p.functions.get(d.fn);
    let idx = -1;
    for (const p of fn?.params ?? []) if (d.storage === 'decl:' + p.usr || d.storage.startsWith('decl:' + p.usr + '.')) { idx = p.index; break; }
    const fold = this.p.foldForLambda(d.fn);
    if (fold) {
      if (idx !== 0) { this.addBoundary(d, 'fold element identity is not statically fixed'); return; }
      this.loop = true; this.conditional = true;
      const acc = this.p.lambdaParam(d.fn);
      const suffix = storageSuffix(storage, d.storage);
      const guard = this.p.branchGuard(d.fn, this.site);
      if (!guard.first) {
        for (const s of fold.seedEvents) {
          if (!suffix || defSupplies(s.storage, acc + suffix)) {
            this.edge(d, s, 'fold-seed-parameter', 'first iteration accumulator');
            this.followValue(s, s.value + suffix, depth + 1, 'fold-seed');
          }
        }
      }
      if (!guard.later) {
        for (const r of fold.returns) {
          const back = this.p.pseudo('fold-backedge', d.fn, acc, r.value, r);
          this.edge(d, back, 'fold-backedge', 'previous iteration returned accumulator');
          this.followValue(back, back.value, depth + 1, 'fold-previous');
        }
      }
      return;
    }
    const sites: Array<{ call: Event; arg: string }> = [];
    for (const key of [d.fn, ...(this.p.instancesByPattern.get(d.fn) ?? [])]) {
      for (const call of this.p.callsByCallee.get(key) ?? []) {
        if (idx >= 0 && idx < call.args.length) sites.push({ call, arg: call.args[idx].storage ?? call.args[idx].value ?? '' });
        else if (idx < 0 && call.receiver) sites.push({ call, arg: call.receiver });
      }
    }
    if (!sites.length) { this.addBoundary(d, 'no call site in analyzed translation units'); return; }
    if (sites.length > 1) this.conditional = true;
    const suffix = storageSuffix(storage, d.storage);
    for (const { call, arg } of sites.slice(0, 8)) {
      if (!arg) { this.addBoundary(call, 'call argument has no storage path'); continue; }
      this.edge(call, d, 'argument-to-parameter', 'argument -> parameter');
      const read = this.p.pseudo('read', call.fn, arg + suffix, '', call, 'argument');
      this.origin(read, depth + 1, 'argument');
    }
    this.addTarget(d, 'parameter-binding', 'parameter');
  }

  private followCapture(d: Event, storage: string, depth: number): void {
    const kind = String(d.raw.captureKind ?? d.subkind);
    if (kind === 'value') { this.addTarget(d, 'capture-value', 'boundary', true, ['by-value snapshot']); this.addBoundary(d, 'by-value lambda capture snapshot'); return; }
    this.edge(d, undefined, 'reference-capture', 'lambda body aliases enclosing storage');
    const outerFn = String(d.raw.captureFn ?? '');
    const source = String(d.raw.captureStorage ?? storage);
    if (!outerFn || !source) { this.addBoundary(d, 'capture source is not resolvable'); return; }
    const read = this.p.pseudo('read', outerFn, source, '', d, 'capture');
    this.origin(read, depth + 1, 'capture');
  }

  /**
   * An aggregate `return {a, b}` has an empty whole-value expression but emits
   * one return-field per member.  Those fields are the actual value edges.
   */
  private followReturnSite(r: Event, depth: number, suffix = ''): void {
    if (depth > 28) return;
    const key = [r.fn, r.line, r.offset, suffix].join('|');
    if (this.returnSeen.has(key)) return;
    this.returnSeen.add(key);
    if (r.value) {
      this.edge(r, undefined, 'return-value', r.value + suffix);
      this.followValue(r, r.value + suffix, depth + 1, 'return');
      return;
    }
    const fields = (this.p.byFn.get(r.fn) ?? []).filter((e) =>
      e.kind === 'return-field' && e.line === r.line);
    if (!fields.length) { this.addBoundary(r, 'return value is empty'); return; }
    for (const f of fields) {
      this.edge(f, r, 'return-field', f.storage);
      this.addTarget(f, 'return-field', 'return');
      this.followValue(f, f.value, depth + 1, 'return-field');
    }
  }

  private synthetic(fn: string, file: string, line: number, column: number,
                    expr: string, kind: string): Event {
    const anchor = this.p.byFn.get(fn)?.[0] ?? this.site;
    const e = this.p.pseudo(kind, fn, '', '', anchor, kind);
    e.file = file; e.line = line; e.column = column;
    e.offset = 0; e.endOffset = 0; e.endLine = line; e.endColumn = column;
    e.expr = expr;
    return e;
  }

  /**
   * A higher-order standard-library algorithm computes its result from the
   * returns of the callables nested in its source expression.  This is a
   * generic contract for ranges/std algorithms, not a business-specific rule.
   */
  private isRangePipeline(call: Event): boolean {
    return /\branges::|\bstd::ranges::/.test(call.callee) ||
      /ranges::(?:views|_to_|to_container|fold_left)/.test(call.expr);
  }

  private nestedLambdas(call: Event, start: number, end: number): Event[] {
    const out: Event[] = [];
    for (const fn of this.p.functions.values()) {
      if (!fn.isLambda || fn.file !== call.file || fn.bodyStart === undefined ||
          fn.bodyEnd === undefined) continue;
      if (fn.bodyStart >= start && fn.bodyEnd <= end) {
        const anchor = this.p.byFn.get(fn.usr)?.[0];
        if (anchor) out.push(anchor);
      }
    }
    return out;
  }

  private followAlgorithmLambdas(call: Event, src: Event, depth: number): void {
    const start = Math.min(...[call.offset, src.offset].filter((x) => x > 0));
    const end = Math.max(call.endOffset || 0, src.endOffset || 0);
    if (start && end) {
      // Conversion/adaptor calls rewritten by the library are part of the
      // pipeline value even when the outer operator has no source location.
      for (const e of this.p.byFn.get(src.fn) ?? []) {
        if (e.kind !== 'call' || e.id === call.id || !e.offset) continue;
        if (e.offset < start || e.endOffset > end) continue;
        if (!/\branges::|\bstd::ranges::/.test(e.callee)) continue;
        this.addTarget(e, 'algorithm-call', 'call');
      }
    }
    for (const anchor of this.nestedLambdas(call, start, end)) {
      for (const r of this.p.byFn.get(anchor.fn) ?? []) {
        if (r.kind !== 'return' && r.kind !== 'return-field') continue;
        this.edge(r, call, 'algorithm-element-return', r.value);
        this.addTarget(r, 'transform-return', 'return');
        this.followValue(r, r.value, depth + 1, 'transform-return');
      }
    }
  }

  /**
   * A constructed variant alternative is guarded earlier in the function by a
   * `holds_alternative<T>` / `get_if<T>` test on the same alternative type.
   * That test is path evidence for the new alternative.
   */
  private variantGuards(): void {
    const m = /^\s*([A-Za-z_]\w*)\s*\{/.exec(this.site.expr) ||
      /\b([A-Za-z_]\w*)\s*\{\s*\}/.exec(this.site.expr);
    const alternative = m?.[1];
    if (!alternative) return;
    for (const b of this.p.branches) {
      if (b.file !== this.site.file || b.line >= this.site.line) continue;
      if (!new RegExp(`(?:holds_alternative|get_if|get)\\s*<\\s*${alternative}\\s*>`).test(b.condition)) continue;
      const condition = (this.p.byFn.get(this.site.fn) ?? []).find((e) =>
        e.kind === 'branch-condition' && e.line === b.line);
      if (condition) this.addTarget(condition, 'path-condition', 'condition');
      else {
        const synthetic = this.synthetic(this.site.fn, b.file, b.line, 1,
          b.condition, 'condition');
        this.addTarget(synthetic, 'path-condition', 'condition');
      }
    }
  }

  private forwardTransfers(): void {
    const storage = this.p.resolve(this.site.fn, this.site.storage);
    if (!storage || storage.endsWith('.<ret>')) return;
    for (const e of this.p.byFn.get(this.site.fn) ?? []) {
      if (e.offset <= this.site.offset) continue;
      if (e.kind !== 'move' && e.kind !== 'return-field' && e.kind !== 'return') continue;
      if (e.storage !== storage && e.value !== storage) continue;
      this.edge(this.site, e, 'value-transfer', e.kind);
      this.addTarget(e, 'value-transfer', 'transfer');
    }
  }

  private followCall(src: Event, value: string, depth: number): void {
    const m = /call:(\d+)/.exec(value);
    if (!m) { this.addBoundary(src, 'unknown call result'); return; }
    const call = this.p.byId.get(Number(m[1]));
    if (!call) { this.addBoundary(src, 'call event is not indexed'); return; }
    const short = call.callee.split('::').pop() ?? '';
    if ((short === 'move' || short === 'forward') && call.args[0]?.storage) {
      this.edge(call, src, 'move-value', 'std::move preserves the value, not the storage identity');
      const read = this.p.pseudo('read', call.fn, call.args[0].storage, '', call, 'move-argument');
      this.origin(read, depth + 1, 'move-argument');
      return;
    }
    const suffix = value.slice(m[0].length);
    this.addTarget(call, 'call-result', 'call');
    if (this.isRangePipeline(call)) this.followAlgorithmLambdas(call, src, depth);
    const callee = call.calleeUsr;
    const calleeInfo = callee ? this.p.functions.get(callee) : undefined;
    if (!calleeInfo) { this.addBoundary(call, 'external or indirect callee'); return; }
    this.edge(call, src, 'call-return', call.callee);
    // The declared transformation itself is part of the value's provenance.
    const declaration = this.synthetic(calleeInfo.usr,
      calleeInfo.declFile || calleeInfo.file,
      calleeInfo.declLine ?? calleeInfo.line,
      calleeInfo.declColumn ?? calleeInfo.column,
      calleeInfo.declText || calleeInfo.name, 'callee-declaration');
    this.addTarget(declaration, 'callee-declaration', 'function');
    const returns = (this.p.byFn.get(callee) ?? []).filter((e) => e.kind === 'return-field');
    const fields = returns.filter((e) => !suffix || e.storage.endsWith(suffix));
    if (fields.length) {
      for (const f of fields) {
        this.edge(f, call, 'return-field', f.storage);
        this.addTarget(f, 'return-field', 'return');
        this.followValue(f, f.value, depth + 1, 'return-field');
      }
      return;
    }
    if (suffix) { this.addBoundary(call, 'no aggregate return field for suffix ' + suffix); return; }
    const plain = (this.p.byFn.get(callee) ?? []).filter((e) => e.kind === 'return');
    if (!plain.length) { this.addBoundary(call, 'callee has no return event'); return; }
    for (const r of plain) {
      this.addTarget(r, 'return-value', 'return');
      this.followReturnSite(r, depth + 1);
    }
  }

  private expandFoldResult(d: Event, storage: string, depth: number): void {
    const m = /fold:(\d+):result/.exec(d.value || d.storage);
    if (!m) return;
    const f = this.p.folds.get(Number(m[1]));
    if (!f) return;
    this.loop = true; this.conditional = true;
    const suffix = d.storage && storage.startsWith(d.storage) ? storage.slice(d.storage.length) : '';
    for (const s of f.seedEvents) {
      if (!suffix || s.storage.endsWith(suffix) || defSupplies(s.storage + suffix, s.storage)) {
        this.edge(d, s, 'fold-seed', 'zero-iteration accumulator');
        this.followValue(s, s.value, depth + 1, 'fold-seed');
      }
    }
    for (const r of f.returns) {
      this.edge(d, r, 'fold-recurrence', 'last iteration returned accumulator');
      this.addTarget(r, 'fold-return', 'fold-return');
      this.followReturnSite(r, depth + 1);
    }
  }

  private previousReturn(backedge: Event): Event | undefined {
    for (const f of this.p.folds.values()) {
      if (f.returns.some((r) => r.fn === backedge.fn)) {
        const acc = this.p.lambdaParam(f.lambdaUsr);
        if (acc && defSupplies(backedge.storage, acc)) return f.returns[0];
      }
    }
    return this.p.byFn.get(backedge.fn)?.find((x) => x.kind === 'return');
  }

  /** The value currently in a storage may be consumed by a later move/read. */
  /**
   * `&obj` exposes obj for mutation through the pointer value.  The mutations
   * live in the fold that seeds its pointer fields with that address, so the
   * pointee writes are the history of the queried object.
   */
  private pointerMutation(e: Event, pointee: string): void {
    const folds = [...this.p.folds.values()].filter((f) =>
      f.seedEvents.some((s) => s.value === this.site.storage ||
        this.p.resolve(s.fn, s.storage) === this.site.storage));
    if (!folds.length) return;
    for (const f of folds) {
      for (const seed of f.seedEvents) {
        if (seed.value !== this.site.storage && this.p.resolve(seed.fn, seed.storage) !== this.site.storage) continue;
        const field = this.p.findPointerFieldDecl(seed.storage);
        if (field) this.addTarget(field, 'pointer-field', 'declaration', true, ['pointee field']);
      }
      for (const x of this.p.byFn.get(f.lambdaUsr) ?? []) {
        if (x.kind !== 'write' && x.kind !== 'method-mutation' && x.kind !== 'call-effect') continue;
        const target = this.p.resolve(x.fn, x.storage);
        if (!isDescendant(target, pointee) && !isDescendant(pointee, target)) continue;
        this.edge(x, this.site, 'pointee-write', target);
        this.addTarget(x, 'pointee-write', 'mutation');
      }
    }
  }

  private priorConsumption(e: Event, storage: string): void {
    const block = this.p.cfg.get(e.fn)?.get(e.block);
    for (const id of block?.events ?? []) {
      const x = this.p.byId.get(id);
      if (!x || x.order >= e.order) continue;
      if (x.kind !== 'move' && x.kind !== 'read') continue;
      const xStorage = this.p.resolve(x.fn, x.storage);
      if (!isDescendant(xStorage, storage) && !isDescendant(storage, xStorage)) continue;
      if (x.kind === 'read' && x.subkind !== 'deref' && x.subkind !== 'member') continue;
      this.addTarget(x, 'value-consumption', 'transfer');
      if (x.value) this.followValue(x, x.value, 0, 'consumption');
    }
  }

  private mutation(e: Event, history: boolean): void {
    const storage = this.p.resolve(e.fn, e.storage);
    if (!storage) { this.addBoundary(e, 'selection has no storage identity'); return; }
    if (storage.startsWith('call:')) { this.followCall(e, storage, 0); return; }
    if (storage.startsWith('fold:')) { this.expandFoldResult(e, storage, 0); return; }
    if (this.site.kind === 'address-of') {
      this.pointerMutation(e, storage);
      return;
    }
    if (e.kind === 'write' || e.kind === 'method-mutation' || e.kind === 'call-effect')
      this.priorConsumption(e, storage);
    if (storage.includes('[*:') || storage.includes('[at:'))
      this.addBoundary(e, 'dynamic container index may alias other elements', storage);
    const defs = this.p.flow(e.fn).defsBefore(e, storage);
    if (!defs.length) {
      this.addBoundary(e, 'no reaching prior definition in this translation unit');
      return;
    }
    let real = 0;
    for (const d of defs) {
      if (d.kind === 'param') {
        this.addTarget(d, 'parameter-binding', 'parameter');
        this.followParam(d, storage, 0);
        if (!this.targets.some((t) => t.kind !== 'selected' && t.kind !== 'parameter'))
          this.addBoundary(d, 'prior value comes from a parameter with no verified caller');
        continue;
      }
      if (d.kind === 'fold-seed') {
        this.addTarget(d, 'fold-seed', 'initialization', true, ['fold iteration 0']); real++;
        this.followValue(d, d.value, 0, 'fold-seed-value');
        continue;
      }
      if (d.kind === 'fold-backedge') {
        const guard = this.p.branchGuard(d.fn, e);
        if (guard.first) continue;
        this.loop = true; this.conditional = true;
        this.addTarget(d, 'fold-backedge', 'loop-recurrence', true, ['fold iteration > 0']); real++;
        const ret = this.previousReturn(d);
        if (ret) {
          this.followReturnSite(ret, 0);
          if (history) this.historyFrom(ret, storage, 0);
        }
        continue;
      }
      if (d.kind === 'fold-result') { this.addTarget(d, 'fold-result', 'fold-result'); this.expandFoldResult(d, storage, 0); real++; continue; }
      if (d.kind === 'alias') { this.addTarget(d, 'alias-binding', 'alias'); continue; }
      this.addTarget(d, 'prior-write', 'mutation'); real++;
      if (history) this.historyFrom(d, storage, 0);
    }
    if (!real && !this.boundaries.length) {
      this.addTarget(e, 'no-prior-mutation', 'NoPriorMutation', false);
    }
  }

  private historyFrom(d: Event, storage: string, depth: number): void {
    if (depth > 12 || this.overBudget()) return;
    const prior = this.p.flow(d.fn).defsBefore(d, storage);
    for (const x of prior) {
      if (x.id === d.id) continue;
      if (x.kind === 'param') { this.addBoundary(x, 'history continues into caller parameter'); continue; }
      if (x.kind === 'fold-seed') { this.addTarget(x, 'fold-seed', 'initialization', true, ['fold iteration 0']); continue; }
      if (x.kind === 'fold-backedge') {
        if (this.p.branchGuard(x.fn, d).first) continue;
        this.addTarget(x, 'fold-backedge', 'loop-recurrence', true, ['fold iteration > 0']);
        continue;
      }
      this.addTarget(x, 'prior-history', 'mutation');
      this.historyFrom(x, storage, depth + 1);
    }
  }

  result(): QueryResult {
    const real = this.targets.filter((t) => SOURCE_KINDS.has(t.kind));
    let kind: ResultKind = 'Exact';
    if (this.boundaries.length) kind = 'Boundary';
    if (real.length > 1) kind = 'Multiple';
    if (this.conditional && kind === 'Exact') kind = 'Conditional';
    if (this.loop && (kind === 'Exact' || kind === 'Conditional')) kind = 'Conditional';
    if ((this.mode === 'mutation' || this.mode === 'history') && !real.length)
      kind = this.boundaries.length ? 'Boundary' : 'NoPriorMutation';
    if (this.emptyState && !real.length) kind = 'NoPriorMutation';
    return {
      query: {
        file: this.site.file, line: this.site.line, column: this.site.column,
        mode: this.mode, expression: this.site.expr,
        semantic: { frame: this.p.functions.get(this.site.fn)?.qualified ?? this.site.fn,
          frameUsr: this.site.fn, storage: this.site.storage, event: this.site.kind },
      },
      kind, targets: this.targets, provenance: this.provenance,
      boundaries: this.boundaries,
      limitations: ['may analysis; path feasibility is not proven',
        'translation-unit cluster only; external callers are boundaries',
        'dynamic element identity and unknown pointer aliases are conservative'],
    };
  }
}
