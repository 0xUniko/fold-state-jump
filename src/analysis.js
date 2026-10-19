'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CALLS = new Set(['CallExpr', 'CXXMemberCallExpr', 'CXXOperatorCallExpr']);
const FUNCTIONS = new Set(['FunctionDecl', 'CXXMethodDecl', 'CXXConstructorDecl', 'CXXConversionDecl', 'CXXDestructorDecl']);
const ASSIGNMENTS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);
const INCREMENTS = new Set(['++', '--']);

function normalized(file) { return file ? path.resolve(file) : ''; }
function explicitFile(node) {
  for (const loc of [node?.loc, node?.range?.begin, node?.range?.end]) {
    if (typeof loc?.file === 'string' && loc.file) return normalized(loc.file);
    const nested = loc?.expansionLoc || loc?.spellingLoc;
    if (typeof nested?.file === 'string' && nested.file) return normalized(nested.file);
  }
  return '';
}
function buildTree(ast) {
  const seen = new Set(), all = [], state = { file: '' };
  function visit(node, parent) {
    if (!node || typeof node !== 'object') return null;
    const file = explicitFile(node);
    if (file) state.file = file;
    if (node.id && seen.has(node.id)) return null;
    if (node.id) seen.add(node.id);
    const wrapped = { node, parent, children: [], file: state.file };
    all.push(wrapped);
    for (const child of node.inner || []) {
      const result = visit(child, wrapped);
      if (result) wrapped.children.push(result);
    }
    return wrapped;
  }
  return { root: visit(ast, null), all };
}
function nodeRange(wrapped, sourceForFile) {
  const r = wrapped?.node?.range;
  if (!Number.isInteger(r?.begin?.offset) || !Number.isInteger(r?.end?.offset)) return null;
  const bytes = Buffer.from(sourceForFile(wrapped.file) || '', 'utf8');
  const start = r.begin.offset, endStart = r.end.offset;
  let end = Math.min(bytes.length, endStart + 1);
  const ident = b => (b >= 48 && b <= 57) || (b >= 65 && b <= 90) || (b >= 97 && b <= 122) || b === 95 || b >= 128;
  if (endStart >= 0 && endStart < bytes.length && ident(bytes[endStart])) {
    end = endStart;
    while (end < bytes.length && ident(bytes[end])) end++;
  }
  return { start, end: Math.max(end, endStart + 1) };
}
function byteOffsetFromUtf16(text, offset) { return Buffer.byteLength(text.slice(0, offset), 'utf8'); }
function utf16OffsetFromByte(text, offset) { return Buffer.from(text, 'utf8').subarray(0, Math.max(0, offset)).toString('utf8').length; }
function unwrap(w) {
  const transparent = new Set(['ImplicitCastExpr', 'ParenExpr', 'ExprWithCleanups', 'CXXBindTemporaryExpr', 'MaterializeTemporaryExpr', 'ConstantExpr', 'FullExpr']);
  while (w && transparent.has(w.node.kind) && w.children.length) w = w.children[0];
  return w;
}
function expressionPath(input) {
  const w = unwrap(input);
  if (!w) return null;
  const n = w.node;
  if (n.kind === 'DeclRefExpr' && n.referencedDecl?.id) return { rootId: n.referencedDecl.id, rootName: n.referencedDecl.name || '', members: [] };
  if (n.kind === 'MemberExpr' && w.children.length) {
    const base = expressionPath(w.children[0]);
    return base ? { ...base, members: base.members.concat(n.name || '?') } : null;
  }
  if (n.kind === 'ArraySubscriptExpr' && w.children.length) {
    const base = expressionPath(w.children[0]);
    return base ? { ...base, members: base.members.concat('[]') } : null;
  }
  if (n.kind === 'UnaryOperator' && ['&', '*', '+'].includes(n.opcode) && w.children.length) return expressionPath(w.children[0]);
  return null;
}
function functionNode(w) { return !!w && FUNCTIONS.has(w.node.kind); }
function bodyOf(w) { return w?.children.find(c => ['CompoundStmt', 'CXXTryStmt'].includes(c.node.kind)) || null; }
function paramsOf(w) { return w ? w.children.filter(c => c.node.kind === 'ParmVarDecl') : []; }
function enclosingFunction(w) {
  for (let p = w; p; p = p.parent) if (functionNode(p) && bodyOf(p)) return p;
  return null;
}
function functionIndex(all) {
  const byId = new Map(), byName = new Map();
  for (const w of all) {
    if (!functionNode(w) || !bodyOf(w)) continue;
    const info = { wrapped: w, id: w.node.id || '', name: w.node.name || '', type: w.node.type?.qualType || '', body: bodyOf(w), params: paramsOf(w), file: w.file };
    if (info.id) byId.set(info.id, info);
    const key = info.name + '\u0000' + info.type;
    byName.set(key, [...(byName.get(key) || []), info]);
  }
  return { byId, byName };
}
function resolveFunction(call, index) {
  if (!CALLS.has(call.node.kind)) return null;
  const stack = [...(call.children[0] ? [call.children[0]] : [])];
  while (stack.length) {
    const w = stack.pop(), n = w.node;
    if (n.kind === 'DeclRefExpr' && n.referencedDecl) {
      const ref = n.referencedDecl;
      if (index.byId.has(ref.id)) return index.byId.get(ref.id);
      return (index.byName.get((ref.name || '') + '\u0000' + (ref.type?.qualType || '')) || [])[0] || null;
    }
    for (const c of w.children) stack.push(c);
  }
  return null;
}
function argsOf(call) { return call.children.slice(1); }
function writeTarget(w) {
  const n = w.node;
  if (n.kind === 'UnaryOperator' && INCREMENTS.has(n.opcode)) return w.children[0] || null;
  if (['BinaryOperator', 'CompoundAssignOperator'].includes(n.kind) && ASSIGNMENTS.has(n.opcode)) return w.children[0] || null;
  return null;
}
function walk(w, fn) { if (!w) return; fn(w); for (const c of w.children) walk(c, fn); }
function sameOrParent(a, b) { return a.length <= b.length && a.every((v, i) => v === b[i]); }
function affects(writeMembers, targetMembers) { return sameOrParent(writeMembers, targetMembers) || sameOrParent(targetMembers, writeMembers); }
function findNodeAt(all, file, offset, sourceForFile) {
  const candidates = [];
  for (const w of all) {
    if (normalized(w.file) !== normalized(file) || !['DeclRefExpr', 'MemberExpr'].includes(w.node.kind)) continue;
    const r = nodeRange(w, sourceForFile);
    if (r && offset >= r.start && offset < r.end) candidates.push({ w, span: r.end - r.start });
  }
  candidates.sort((a, b) => a.span - b.span);
  return candidates[0]?.w || null;
}
function foldContext(w) {
  for (let p = w; p; p = p.parent) {
    if (p.node.kind !== 'LambdaExpr') continue;
    const text = p.node.range;
    if (!text) continue;
    let lambdaParam = null;
    walk(p, child => { if (!lambdaParam && child.node.kind === 'ParmVarDecl') lambdaParam = child; });
    if (!lambdaParam) continue;
    let call = p.parent;
    while (call && !CALLS.has(call.node.kind)) call = call.parent;
    if (!call) continue;
    const sourceNode = call.children[0];
    let isFold = false;
    walk(sourceNode, child => { if (child.node.kind === 'DeclRefExpr' && /fold_left/.test(child.node.referencedDecl?.name || '')) isFold = true; });
    if (isFold) return { lambda: p, stateParam: lambdaParam, stateId: lambdaParam.node.id };
  }
  return null;
}
function findPreviousMutation(fn, rootId, targetMembers, beforeOffset, index, sourceForFile, visited = new Set()) {
  if (!fn || visited.has(fn.id)) return null;
  const next = new Set(visited); if (fn.id) next.add(fn.id);
  const candidates = [];
  walk(fn.body, w => {
    const r = nodeRange(w, sourceForFile);
    if (!r || r.start >= beforeOffset) return;
    const lhs = writeTarget(w);
    if (lhs) {
      const p = expressionPath(lhs);
      if (p?.rootId === rootId && affects(p.members, targetMembers)) candidates.push({ offset: r.start, mutation: w, via: 'direct' });
    }
    if (!CALLS.has(w.node.kind)) return;
    const callee = resolveFunction(w, index);
    if (!callee || !callee.body) return;
    const args = argsOf(w);
    walk(callee.body, inner => {
      const target = writeTarget(inner);
      if (!target) return;
      const p = expressionPath(target);
      if (!p) return;
      const paramIndex = callee.params.findIndex(param => param.node.id === p.rootId);
      if (paramIndex < 0 || !/(&|\*)/.test(callee.params[paramIndex].node.type?.qualType || '')) return;
      const argPath = expressionPath(args[paramIndex]);
      if (argPath?.rootId === rootId && affects(argPath.members.concat(p.members), targetMembers)) candidates.push({ offset: r.start, mutation: inner, via: 'call' });
    });
  });
  candidates.sort((a, b) => b.offset - a.offset);
  return candidates[0] || null;
}
function analyzeAst(ast, options) {
  const file = normalized(options.file), roots = (options.workspaceRoots || []).map(normalized);
  const sources = new Map([[file, options.sourceText]]);
  const sourceForFile = f => {
    f = normalized(f);
    if (sources.has(f)) return sources.get(f);
    try { const s = fs.readFileSync(f, 'utf8'); sources.set(f, s); return s; } catch { sources.set(f, ''); return ''; }
  };
  const tree = buildTree(ast), index = functionIndex(tree.all);
  const selected = findNodeAt(tree.all, file, options.cursorByteOffset, sourceForFile);
  if (!selected) return { ok: false, reason: 'No supported variable or member expression found at the cursor.' };
  const target = expressionPath(selected), current = enclosingFunction(selected);
  if (!target || !current) return { ok: false, reason: 'Could not resolve a variable path or enclosing function.' };
  const fold = foldContext(selected);
  if (fold && target.rootId === fold.stateId) {
    const r = nodeRange(selected, sourceForFile);
    const previous = findPreviousMutation({ id: current.node.id, body: bodyOf(current) }, target.rootId, target.members, r?.start ?? options.cursorByteOffset, index, sourceForFile);
    return previous ? { ok: true, mutation: previous.mutation, via: previous.via, path: target } : { ok: false, reason: 'No earlier mutation found for this fold-state path.' };
  }
  const params = paramsOf(current);
  const paramIndex = params.findIndex(p => p.node.id === target.rootId);
  if (paramIndex < 0) return { ok: false, reason: 'The expression is not rooted at the fold state or a function parameter; aliases are not supported yet.' };
  const local = findPreviousMutation({ id: current.node.id, body: bodyOf(current) }, target.rootId, target.members, options.cursorByteOffset, index, sourceForFile);
  if (local) return { ok: true, mutation: local.mutation, via: local.via, path: target };
  const paths = [];
  for (const call of tree.all) {
    if (!CALLS.has(call.node.kind)) continue;
    const callee = resolveFunction(call, index);
    if (callee?.id !== current.node.id) continue;
    const argPath = expressionPath(argsOf(call)[paramIndex]);
    if (!argPath) continue;
    const caller = enclosingFunction(call);
    if (!caller) continue;
    const context = foldContext(call);
    if (context && argPath.rootId === context.stateId) {
      const r = nodeRange(call, sourceForFile);
      const previous = findPreviousMutation({ id: caller.node.id, body: bodyOf(caller) }, argPath.rootId, argPath.members.concat(target.members), r?.start ?? 0, index, sourceForFile);
      if (previous) paths.push({ mutation: previous.mutation, callsite: call, caller });
    }
  }
  if (!paths.length) return { ok: false, reason: 'No fold_left call path was found in this translation unit.' };
  const unique = [...new Map(paths.map(p => [p.mutation.file + ':' + p.mutation.node.range?.begin?.offset, p])).values()];
  return { ok: true, needsChoice: unique.length > 1, callPaths: unique.map(p => ({ frames: [{ callsite: p.callsite, caller: p.caller }], mutation: p.mutation })), resolvePath: p => ({ ok: true, mutation: p.mutation, via: 'call' }) };
}
module.exports = { analyzeAst, byteOffsetFromUtf16, utf16OffsetFromByte, nodeRange, expressionPath, buildTree };
