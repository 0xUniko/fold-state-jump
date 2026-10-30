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
  args?: Array<{ index: number; storage?: string; param?: string; paramUsr?: string; paramType?: string; text?: string }>;
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
  patternUsr?: string;
  templateArgs?: string;
  isLambda?: boolean;
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

/** A write to d supplies q only when d is q or a parent of q. */
export const defSupplies = (d: string, q: string): boolean => {
  if (!d || !q) return false;
  if (isDescendant(q, d)) return true;
  const dn = dynamicNormalize(d);
  const qn = dynamicNormalize(q);
  return isDescendant(qn, dn);
};

const unique = <T,>(xs: T[]): T[] => [...new Set(xs)];

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
  }

  resolveSite(file: string, line: number, column: number, preferWrite = false): Event | undefined {
    const base = path.basename(file);
    const same = this.events.filter((e) => path.basename(e.file) === base && e.line === line);
    const priority = (e: Event): number => e.kind === 'read' ? (preferWrite ? 2 : 0) :
      e.kind === 'write' ? (preferWrite ? 0 : 1) :
      e.kind === 'alias' ? 2 : e.kind === 'fold-seed' ? 5 : 3;
    const exact = same.filter((e) => e.column <= column && column <= Math.max(e.endColumn, e.column))
      .sort((a, b) => priority(a) - priority(b) || (a.endOffset - a.offset) - (b.endOffset - b.offset) || b.storage.length - a.storage.length);
    if (exact.length) return exact[0];
    const nearest = same.filter((e) => e.storage || e.kind === 'fold-seed' || e.kind === 'alias' ||
      e.kind === 'write' || e.kind === 'call' || e.kind === 'return')
      .sort((a, b) => Number(Boolean(b.storage)) - Number(Boolean(a.storage)) ||
        Math.abs(a.column - column) - Math.abs(b.column - column));
    return nearest[0];
  }

  lambdaParam(fn: string): string {
    const p = this.functions.get(fn)?.params[0];
    return p ? 'decl:' + p.usr : '';
  }

  resolve(fn: string, p: string, depth = 0): string {
    if (!p || depth > 8) return p;
    const aliases = this.aliases.get(fn);
    if (!aliases) return p;
    for (const [src, dst] of [...aliases].sort((a, b) => b[0].length - a[0].length)) {
      if (isDescendant(p, src)) return this.resolve(fn, dst + p.slice(src.length), depth + 1);
    }
    return p;
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
    for (const e of this.prog.capturesByLambda.get(this.fn) ?? []) {
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
      if (e.storage) replaceKilled(st, this.prog.resolve(this.fn, e.storage), e.id);
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
    for (const [key, vals] of st.values) if (defSupplies(key, p)) vals.forEach((id) => ids.add(id));
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

  query(q: { file: string; line: number; column: number; mode: Mode }): QueryResult {
    const file = path.resolve(q.file);
    const preferWrite = q.mode === 'mutation' || q.mode === 'history';
    const candidates = [...this.programs.values()]
      .map((p) => ({ p, e: p.resolveSite(file, q.line, q.column, preferWrite) }))
      .filter((x) => x.e) as Array<{ p: Program; e: Event }>;
    if (!candidates.length) throw new Error('no inventory event at requested source position');
    const { p, e } = candidates.sort((a, b) => (b.p.byFn.get(b.e.fn)?.length ?? 0) - (a.p.byFn.get(a.e.fn)?.length ?? 0))[0];
    const tracer = new Tracer(p, e, q.mode);
    tracer.run();
    return tracer.result();
  }
}

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
  private nodes = 0;
  private loop = false;
  private conditional = false;
  private emptyState = false;

  constructor(p: Program, site: Event, mode: Mode) {
    this.p = p;
    this.site = site;
    this.mode = mode;
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
    if (this.mode === 'origin' || this.mode === 'provenance') this.origin(this.site, 0, 'selected');
    else this.mutation(this.site, this.mode === 'history');
  }

  private origin(e: Event, depth: number, relation: string): void {
    if (depth > 18 || this.nodes++ > 400) { this.addBoundary(e, 'analysis budget exhausted'); return; }
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
    const defs = this.p.flow(e.fn).defsBefore(e, storage);
    if (!defs.length) { this.addBoundary(e, 'no reaching definition in this translation unit'); return; }
    for (const d of defs) this.visitDef(d, storage, e, depth, relation);
  }

  private visitDef(d: Event, storage: string, use: Event, depth: number, relation: string): void {
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
      const ret = this.p.byId.get(d.raw.id as number);
      if (ret) this.followReturn(r0(d), depth + 1);
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
      const suffix = storage.startsWith(d.storage) ? storage.slice(d.storage.length) : '';
      const value = suffix && d.value ? d.value + suffix : d.value;
      if (value === 'increment' || value === 'compound' || value === storage) {
        this.loop = true;
        const prev = this.p.flow(d.fn).defsBefore(d, storage).filter((x) => x.id !== d.id);
        for (const x of prev) this.visitDef(x, storage, use, depth + 1, 'loop-recurrence');
      } else if (value) this.followValue(d, value, depth + 1, 'write-value');
      else this.addBoundary(d, 'write value is opaque');
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
    if (depth > 18 || this.nodes++ > 400) { this.addBoundary(src, 'analysis budget exhausted'); return; }
    if (!value) { this.addBoundary(src, 'empty value provenance'); return; }
    if (value.startsWith('call:')) { this.followCall(src, value, depth); return; }
    if (value.startsWith('expr:')) { this.addBoundary(src, 'opaque expression value: ' + value.slice(5)); return; }
    if (value.startsWith('fold:')) { this.expandFoldResult(src, src.storage, depth); return; }
    if (value.startsWith('return:')) return;
    const defs = this.p.flow(src.fn).defsBefore(src, value);
    if (!defs.length) { this.addBoundary(src, 'no reaching definition for transferred value', value); return; }
    for (const d of defs) this.visitDef(d, value, src, depth, relation);
  }

  private followParam(d: Event, storage: string, depth: number): void {
    const fn = this.p.functions.get(d.fn);
    let idx = -1;
    for (const p of fn?.params ?? []) if (d.storage === 'decl:' + p.usr || d.storage.startsWith('decl:' + p.usr + '.')) { idx = p.index; break; }
    const fold = this.p.foldForLambda(d.fn);
    if (fold) {
      if (idx !== 0) { this.addBoundary(d, 'fold element identity is not statically fixed'); return; }
      this.loop = true; this.conditional = true;
      const acc = this.p.lambdaParam(d.fn);
      const suffix = storage.startsWith(d.storage) ? storage.slice(d.storage.length) : '';
      const guard = this.p.branchGuard(d.fn, this.site);
      if (!guard.first) {
        for (const s of fold.seedEvents) {
          if (!suffix || defSupplies(s.storage, acc + suffix)) {
            this.edge(d, s, 'fold-seed-parameter', 'first iteration accumulator');
            this.followValue(s, s.value, depth + 1, 'fold-seed');
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
        if (idx >= 0 && idx < call.args.length) sites.push({ call, arg: call.args[idx].storage ?? '' });
        else if (idx < 0 && call.receiver) sites.push({ call, arg: call.receiver });
      }
    }
    if (!sites.length) { this.addBoundary(d, 'no call site in analyzed translation units'); return; }
    if (sites.length > 1) this.conditional = true;
    for (const { call, arg } of sites.slice(0, 8)) {
      if (!arg) { this.addBoundary(call, 'call argument has no storage path'); continue; }
      this.edge(call, d, 'argument-to-parameter', 'argument -> parameter');
      const read = this.p.pseudo('read', call.fn, arg, '', call, 'argument');
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

  private followReturn(r: Event, depth: number, suffix = ''): void {
    if (!r.value) { this.addBoundary(r, 'return value is empty'); return; }
    if (depth > 28) return;
    this.edge(r, undefined, 'return-value', r.value + suffix);
    this.followValue(r, r.value + suffix, depth + 1, 'return');
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
    const callee = call.calleeUsr;
    if (!callee || !this.p.functions.has(callee)) { this.addBoundary(call, 'external or indirect callee'); return; }
    const suffix = value.slice(m[0].length);
    this.edge(call, src, 'call-return', call.callee);
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
      this.followReturn(r, depth + 1);
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
      this.followValue(r, r.value, depth + 1, 'fold-return');
    }
  }

  private mutation(e: Event, history: boolean): void {
    const storage = this.p.resolve(e.fn, e.storage);
    if (!storage) { this.addBoundary(e, 'selection has no storage identity'); return; }
    if (storage.startsWith('call:')) { this.followCall(e, storage, 0); return; }
    if (storage.startsWith('fold:')) { this.expandFoldResult(e, storage, 0); return; }
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
        if (history) {
          const ret = this.p.byId.get(d.raw.id as number);
          if (ret) this.historyFrom(ret, storage, 0);
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
    if (depth > 12) return;
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
    const real = this.targets.filter((t) => t.kind !== 'selected' && t.kind !== 'parameter' && t.kind !== 'NoPriorMutation');
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

// Local helper to keep the fold-backedge target tied to the actual return event.
const r0 = (d: Event): Event => {
  const raw = d.raw as any;
  return { ...d, ...(raw.returnEvent ? { id: raw.returnEvent } : {}) };
};
