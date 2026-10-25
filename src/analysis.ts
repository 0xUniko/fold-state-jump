'use strict';

import path from 'node:path';

export type ClangLocation = {
  readonly file?: string;
  readonly offset?: number;
  readonly tokLen?: number;
  readonly expansionLoc?: ClangLocation;
  readonly spellingLoc?: ClangLocation;
};

export type ClangNode = {
  readonly id?: string;
  readonly kind: string;
  readonly name?: string;
  readonly opcode?: string;
  readonly memberOperator?: boolean;
  readonly copyOrMove?: boolean;
  readonly fieldwiseCopy?: boolean;
  readonly copyBoundaries?: readonly string[];
  readonly copyValueBoundaries?: readonly string[];
  readonly aggregateFields?: readonly string[];
  readonly arrow?: boolean;
  readonly value?: string;
  readonly castKind?: string;
  readonly symbol?: string;
  readonly dependent?: boolean;
  readonly referencedMemberDecl?: string;
  readonly callee?: { readonly id: string; readonly name: string; readonly qualifiedName?: string; readonly symbol?: string };
  readonly captures?: readonly { readonly id: string; readonly kind: 'reference' | 'copy';
    readonly copyBoundaries?: readonly string[]; readonly copyValueBoundaries?: readonly string[] }[];
  readonly captureDefault?: 'reference' | 'copy' | 'none';
  readonly thisCapture?: 'pointer' | 'copy';
  readonly type?: { readonly qualType?: string };
  readonly referencedDecl?: {
    readonly id?: string;
    readonly name?: string;
    readonly type?: { readonly qualType?: string };
  };
  readonly loc?: ClangLocation;
  readonly range?: { readonly begin?: ClangLocation; readonly end?: ClangLocation };
  readonly inner?: readonly ClangNode[];
};

export type WrappedNode = {
  readonly node: ClangNode;
  readonly file: string;
  readonly ancestors: readonly ClangNode[];
  readonly children: readonly WrappedNode[];
};

export type FunctionInfo = {
  readonly wrapped: WrappedNode;
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly body: WrappedNode;
  readonly params: readonly WrappedNode[];
  readonly file: string;
};

export type TraceFrame = {
  readonly callsite: WrappedNode;
  readonly caller: FunctionInfo;
  readonly parameterIndex?: number;
  readonly argument?: ExpressionPath;
  // Member-function traces map the implicit object to the call-site receiver
  // instead of fabricating a parameterIndex for `this`.
  readonly receiver?: ExpressionPath;
};

export type TraceCandidate = {
  readonly mutation: WrappedNode;
  readonly orderOffset: number;
  readonly frames: readonly TraceFrame[];
  readonly wrapped?: boolean;
};

export type OriginCandidate = {
  readonly origin: WrappedNode;
  readonly kind: 'initialization' | 'parameter';
  readonly frames: readonly TraceFrame[];
  readonly boundary?: string;
};

export type CallerLink = {
  readonly prepared: PreparedAst;
  readonly callsite: WrappedNode;
  readonly caller: FunctionInfo;
};

export type AnalysisResult =
  | { readonly _tag: 'MutationFound'; readonly mutation: WrappedNode; readonly via: 'direct' | 'call'; readonly wrapped?: boolean; readonly frames?: readonly TraceFrame[] }
  | { readonly _tag: 'CandidatesFound'; readonly candidates: readonly TraceCandidate[] }
  | { readonly _tag: 'OriginCandidatesFound'; readonly candidates: readonly OriginCandidate[] }
  | { readonly _tag: 'OriginFound'; readonly origin: WrappedNode; readonly kind: 'initialization' | 'parameter'; readonly boundary?: string; readonly frames?: readonly TraceFrame[] }
  | { readonly _tag: 'AnalysisFailure'; readonly reason: string };

export type AnalysisOptions = {
  readonly file: string;
  readonly sourceText: string;
  readonly cursorByteOffset: number;
  readonly sourceTextByFile?: ReadonlyMap<string, string>;
  readonly externalCallers?: ReadonlyMap<ClangNode, readonly CallerLink[]>;
  readonly callerDiagnostics?: readonly string[];
};

type AstIndex = {
  readonly all: readonly WrappedNode[];
  readonly functions: readonly FunctionInfo[];
  readonly calls: readonly WrappedNode[];
  readonly functionsByNode: ReadonlyMap<ClangNode, FunctionInfo>;
  readonly functionsById: ReadonlyMap<string, FunctionInfo>;
  readonly declarations: ReadonlyMap<string, WrappedNode>;
  readonly wrappedByNode: ReadonlyMap<ClangNode, WrappedNode>;
  readonly enclosingFunctions: ReadonlyMap<WrappedNode, FunctionInfo>;
  readonly normalizedPaths: ReadonlyMap<string, ExpressionPath>;
  readonly writesByFunctionId: ReadonlyMap<string, ReadonlyMap<string, readonly IndexedWrite[]>>;
  readonly writeBoundariesByFunctionId: ReadonlyMap<string, ReadonlyMap<string, readonly IndexedBoundary[]>>;
  readonly callsByCallerId: ReadonlyMap<string, readonly WrappedNode[]>;
  readonly callsByCalleeId: ReadonlyMap<string, readonly WrappedNode[]>;
  readonly resolvedCalls: ReadonlyMap<ClangNode, FunctionInfo | undefined>;
  readonly identifiersByFile: ReadonlyMap<string, FileIdentifiers>;
  readonly callsByFile: ReadonlyMap<string, readonly WrappedNode[]>;
};

type IndexedWrite = {
  readonly mutation: WrappedNode;
  readonly target: ExpressionPath;
  readonly start: number;
};

type IndexedBoundary = { readonly start: number; readonly reason: string };

type IndexedIdentifier = {
  readonly wrapped: WrappedNode;
  readonly range: { readonly start: number; readonly end: number };
  readonly order: number;
  readonly dependent: boolean;
};

type IdentifierTree = {
  readonly identifier: IndexedIdentifier;
  readonly maxEnd: number;
  readonly left: IdentifierTree | undefined;
  readonly right: IdentifierTree | undefined;
};

type FileIdentifiers = {
  readonly tree: IdentifierTree | undefined;
  // Legacy ASTs may omit both token length and spelling. Their ranges depend
  // on source text supplied at query time, rather than on the prepared AST.
  readonly unresolved: readonly { readonly wrapped: WrappedNode; readonly order: number }[];
};

// The tree and indexes are immutable after construction and reusable for
// cursor queries until the translation unit or its compile flags change.
export type PreparedAst = {
  readonly ast: ClangNode;
  readonly index: AstIndex;
};

type MutationCandidate = {
  readonly _tag: 'Mutation';
  readonly mutation: WrappedNode;
  readonly orderOffset: number;
  readonly frames: readonly TraceFrame[];
};

type MutationBoundary = { readonly _tag: 'MutationBoundary'; readonly orderOffset: number; readonly reason: string };
type PreviousMutation = MutationCandidate | MutationBoundary;

const CALLS = ['CallExpr', 'CXXMemberCallExpr', 'CXXOperatorCallExpr'] as const;
const FUNCTIONS = [
  'FunctionDecl',
  'CXXMethodDecl',
  'CXXConstructorDecl',
  'CXXConversionDecl',
  'CXXDestructorDecl'
] as const;
const ASSIGNMENTS = ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='] as const;
const INCREMENTS = ['++', '--'] as const;
const TRANSPARENT_EXPRESSIONS = [
  'ImplicitCastExpr',
  'ParenExpr',
  'ExprWithCleanups',
  'CXXBindTemporaryExpr',
  'MaterializeTemporaryExpr',
  'ConstantExpr',
  'FullExpr'
] as const;

const normalized = (file: string): string => path.resolve(file);
const isCall = (node: ClangNode): boolean => (CALLS as readonly string[]).includes(node.kind);
const isFunction = (node: ClangNode): boolean => (FUNCTIONS as readonly string[]).includes(node.kind);

const locationFile = (location: ClangLocation | undefined): string | undefined =>
  location?.file || location?.expansionLoc?.file || location?.spellingLoc?.file;

const explicitFile = (node: ClangNode, inheritedFile: string): string => {
  const file = locationFile(node.loc) || locationFile(node.range?.begin) || locationFile(node.range?.end);
  // Native nodes normally repeat the same absolute filename. Resolve only
  // file transitions; the inherited path is already normalized.
  return file ? file === inheritedFile ? file : normalized(file) : '';
};

// Build the wrapper tree without repeatedly copying every descendant array.
// Large C++ header ASTs can contain hundreds of thousands of declarations.
export const buildTree = (ast: ClangNode): { readonly root: WrappedNode; readonly all: readonly WrappedNode[] } => {
  const visit = (
    node: ClangNode,
    ancestors: readonly ClangNode[],
    inheritedFile: string
  ): { readonly root: WrappedNode; readonly lastFile: string } => {
    const file = explicitFile(node, inheritedFile) || inheritedFile;
    const nextAncestors = [...ancestors, node];
    const children = (node.inner ?? []).reduce(
      (state: { readonly file: string; readonly children: WrappedNode[] }, child) => {
        const result = visit(child, nextAncestors, state.file);
        state.children.push(result.root);
        return { file: result.lastFile, children: state.children };
      },
      { file, children: [] as WrappedNode[] }
    );
    return {
      root: { node, file, ancestors, children: children.children },
      lastFile: children.file
    };
  };
  // Thread the flat collection through the traversal without copying descendants.
  const appendChildren = (wrapped: WrappedNode, all: WrappedNode[]): WrappedNode[] =>
    wrapped.children.reduce((all, child) => {
      all.push(child);
      return appendChildren(child, all);
    }, all);
  const result = visit(ast, [], '');
  return { root: result.root, all: appendChildren(result.root, [result.root]) };
};

const findDescendant = (
  wrapped: WrappedNode,
  predicate: (wrapped: WrappedNode) => boolean
): WrappedNode | undefined =>
  predicate(wrapped) ? wrapped : wrapped.children.reduce<WrappedNode | undefined>(
    (found, child) => found ?? findDescendant(child, predicate), undefined
  );

const bodyOf = (wrapped: WrappedNode): WrappedNode | undefined =>
  wrapped.children.find((child) => child.node.kind === 'CompoundStmt' || child.node.kind === 'CXXTryStmt');

const functionInfo = (wrapped: WrappedNode): FunctionInfo | undefined => {
  const body = bodyOf(wrapped);
  return body
    ? {
        wrapped,
        id: wrapped.node.id ?? '',
        name: wrapped.node.name ?? '',
        type: wrapped.node.type?.qualType ?? '',
        body,
        params: wrapped.children.filter((child) => child.node.kind === 'ParmVarDecl'),
        file: wrapped.file
      }
    : undefined;
};

const buildIndex = (all: readonly WrappedNode[]): AstIndex => {
  const index = all.reduce((index, wrapped) => {
    const fn = isFunction(wrapped.node) ? functionInfo(wrapped) : undefined;
    if (fn) {
      index.functions.push(fn);
      index.functionsByNode.set(wrapped.node, fn);
      const previous = index.functionsById.get(fn.id);
      if (!previous || wrapped.ancestors.length > previous.wrapped.ancestors.length) index.functionsById.set(fn.id, fn);
    }
    if (isCall(wrapped.node)) index.calls.push(wrapped);
    if (wrapped.node.kind === 'VarDecl' || wrapped.node.kind === 'ParmVarDecl') index.declarations.set(wrapped.node.id ?? '', wrapped);
    index.wrappedByNode.set(wrapped.node, wrapped);
    return index;
  }, {
    all, functions: [] as FunctionInfo[], calls: [] as WrappedNode[],
    functionsByNode: new Map<ClangNode, FunctionInfo>(),
    functionsById: new Map<string, FunctionInfo>(),
    declarations: new Map<string, WrappedNode>(),
    wrappedByNode: new Map<ClangNode, WrappedNode>(),
    enclosingFunctions: new Map<WrappedNode, FunctionInfo>(),
    normalizedPaths: new Map<string, ExpressionPath>(),
    writesByFunctionId: new Map<string, Map<string, IndexedWrite[]>>(),
    writeBoundariesByFunctionId: new Map<string, Map<string, IndexedBoundary[]>>(),
    callsByCallerId: new Map<string, WrappedNode[]>(),
    callsByCalleeId: new Map<string, WrappedNode[]>(),
    resolvedCalls: new Map<ClangNode, FunctionInfo | undefined>(),
    identifiersByFile: buildIdentifierIndex(all),
    callsByFile: new Map<string, WrappedNode[]>()
  });

  // Thread ownership through the wrapper tree, including AST inputs that reuse
  // a raw node in different functions. No node needs to rescan its ancestors.
  const collectOwners = (
    children: readonly WrappedNode[],
    owner: FunctionInfo | undefined,
    enclosingFunctions: Map<WrappedNode, FunctionInfo>
  ): Map<WrappedNode, FunctionInfo> => children.reduce((enclosingFunctions, wrapped) => {
    if (owner) enclosingFunctions.set(wrapped, owner);
    return collectOwners(wrapped.children, index.functionsByNode.get(wrapped.node) ?? owner, enclosingFunctions);
  }, enclosingFunctions);
  collectOwners(all.length > 0 ? [all[0]] : [], undefined, index.enclosingFunctions);

  // C++ reference declarations normally follow their initializer declarations,
  // so each alias reuses the already-normalized prefix of a long alias chain.
  // Cyclic legacy ASTs retain the per-query visited-root behavior instead.
  [...index.declarations.values()].reduce((normalizedPaths, declaration) => {
    if (declaration.node.kind !== 'VarDecl' || !/&/.test(declaration.node.type?.qualType ?? '')) return normalizedPaths;
    const initial = expressionPath(declaration.children[0]);
    if (!initial) return normalizedPaths;
    const resolved = resolveNormalizedPath(initial, index, [declaration.node.id ?? '']);
    if (resolved._tag === 'NormalizedPath') normalizedPaths.set(declaration.node.id ?? '', resolved.target);
    return normalizedPaths;
  }, index.normalizedPaths);

  // Classify each node once instead of rescanning every function body on
  // each backward trace. Nested functions belong to their own nearest owner.
  all.reduce((index, wrapped) => {
    const owner = enclosingFunction(wrapped, index);
    if (!owner || !(wrapped.node === owner.body.node || wrapped.ancestors.includes(owner.body.node))) return index;
    // The backward trace only needs potential writes, not every expression
    // in the function. Classify these once per extracted AST.
    const write = writeTarget(wrapped) ?? (isCall(wrapped.node) ? standardMutationTarget(wrapped) : undefined);
    const target = write && (isCall(wrapped.node) && standardMutationTarget(wrapped)
      ? receiverPath(wrapped, index) : pathAt(write, index));
    const start = wrapped.node.range?.begin?.offset;
    const unsupportedRoot = write && !target && storageRoot(write, index);
    if (unsupportedRoot && start !== undefined) {
      const byRoot = index.writeBoundariesByFunctionId.get(owner.id) ?? new Map<string, IndexedBoundary[]>();
      const boundaries = byRoot.get(unsupportedRoot.rootId) ?? [];
      boundaries.push({ start, reason: 'Unsupported write identity (for example a dynamic array subscript).' });
      byRoot.set(unsupportedRoot.rootId, boundaries);
      index.writeBoundariesByFunctionId.set(owner.id, byRoot);
    }
    if (target && start !== undefined) {
      const byFunction = index.writesByFunctionId;
      const byRoot = byFunction.get(owner.id) ?? new Map<string, IndexedWrite[]>();
      const writes = byRoot.get(target.rootId) ?? [];
      writes.push({ mutation: wrapped, target, start });
      byRoot.set(target.rootId, writes);
      byFunction.set(owner.id, byRoot);
    }
    if (isCall(wrapped.node)) {
      const callers = index.callsByCallerId;
      const calls = callers.get(owner.id) ?? [];
      calls.push(wrapped);
      callers.set(owner.id, calls);
    }
    return index;
  }, index);

  index.calls.reduce((index, call) => {
    const callee = resolveFunction(call, index);
    index.resolvedCalls.set(call.node, callee);
    const byFile = index.callsByFile;
    const fileCalls = byFile.get(call.file) ?? [];
    fileCalls.push(call);
    byFile.set(call.file, fileCalls);
    if (!callee) return index;
    const callsByCalleeId = index.callsByCalleeId;
    const calls = callsByCalleeId.get(callee.id) ?? [];
    calls.push(call);
    callsByCalleeId.set(callee.id, calls);
    return index;
  }, index);
  // Visit the latest writes and calls first. Once a mutation is known, older
  // calls need no recursive tracing. Stable ordering retains AST precedence.
  [...index.writesByFunctionId.values()].reduce((index, byRoot) => {
    [...byRoot.values()].reduce((byRoot, writes) => {
      writes.sort((left, right) => right.start - left.start);
      return byRoot;
    }, byRoot);
    return index;
  }, index);
  [...index.callsByCallerId.values()].reduce((index, calls) => {
    calls.sort((left, right) =>
      (right.node.range?.begin?.offset ?? -1) - (left.node.range?.begin?.offset ?? -1));
    return index;
  }, index);
  [...index.writeBoundariesByFunctionId.values()].reduce((index, byRoot) => {
    [...byRoot.values()].reduce((byRoot, boundaries) => {
      boundaries.sort((left, right) => right.start - left.start);
      return byRoot;
    }, byRoot);
    return index;
  }, index);
  return index;
};

export const prepareAst = (ast: ClangNode): PreparedAst => ({
  ast,
  index: buildIndex(buildTree(ast).all)
});

const sourceFor = (sourceTextByFile: ReadonlyMap<string, string>, file: string): string =>
  sourceTextByFile.get(normalized(file)) ?? '';

const identifierByteEnd = (bytes: Buffer, offset: number): number => {
  const isIdentifierByte = (byte: number | undefined): boolean =>
    byte !== undefined &&
    ((byte >= 48 && byte <= 57) ||
      (byte >= 65 && byte <= 90) ||
      (byte >= 97 && byte <= 122) ||
      byte === 95 ||
      byte >= 128);
  const scan = (position: number): number =>
    isIdentifierByte(bytes[position]) ? scan(position + 1) : position;
  return scan(offset);
};

export const nodeRange = (
  wrapped: WrappedNode,
  sourceTextByFile: ReadonlyMap<string, string> = new Map()
): { readonly start: number; readonly end: number } | null => {
  const range = wrapped.node.range;
  const start = range?.begin?.offset;
  const endStart = range?.end?.offset;
  if (start === undefined || endStart === undefined) return null;
  // Clang supplies tokLen for nearly every node; avoid allocating a buffer
  // containing the entire source file on that overwhelmingly common path.
  const end =
    range?.end?.tokLen !== undefined
      ? endStart + range.end.tokLen
      : identifierByteEnd(Buffer.from(sourceFor(sourceTextByFile, wrapped.file), 'utf8'), endStart);
  return { start, end: Math.max(end, endStart + 1) };
};

const identifierRange = (
  wrapped: WrappedNode,
  sourceTextByFile?: ReadonlyMap<string, string>
): { readonly start: number; readonly end: number } | null => {
  const range = wrapped.node.range;
  if (!range?.begin || !range.end) return null;
  const member = ['MemberExpr', 'CXXDependentScopeMemberExpr'].includes(wrapped.node.kind);
  const declaration = ['VarDecl', 'ParmVarDecl'].includes(wrapped.node.kind);
  const location = declaration ? wrapped.node.loc : member ? range.end : range.begin;
  if (!location) return null;
  if (location.offset === undefined) return null;
  const name = member || declaration ? wrapped.node.name : wrapped.node.referencedDecl?.name;
  const end =
    location.tokLen !== undefined
      ? location.offset + location.tokLen
      : name
        ? location.offset + Buffer.byteLength(name, 'utf8')
        : sourceTextByFile
          ? identifierByteEnd(Buffer.from(sourceFor(sourceTextByFile, wrapped.file), 'utf8'), location.offset)
          : undefined;
  return end === undefined ? null : { start: location.offset, end };
};

const buildIdentifierTree = (
  identifiers: readonly IndexedIdentifier[],
  start = 0,
  end = identifiers.length
): IdentifierTree | undefined => {
  if (start >= end) return undefined;
  const middle = start + Math.floor((end - start) / 2);
  const identifier = identifiers[middle];
  const left = buildIdentifierTree(identifiers, start, middle);
  const right = buildIdentifierTree(identifiers, middle + 1, end);
  return { identifier, left, right, maxEnd: Math.max(identifier.range.end, left?.maxEnd ?? -1, right?.maxEnd ?? -1) };
};

const buildIdentifierIndex = (all: readonly WrappedNode[]): ReadonlyMap<string, FileIdentifiers> => {
  type Identifiers = {
    readonly ranged: IndexedIdentifier[];
    readonly unresolved: { readonly wrapped: WrappedNode; readonly order: number }[];
  };
  const identifiersByFile = all.reduce((identifiersByFile, wrapped, order) => {
    if (!['DeclRefExpr', 'MemberExpr', 'CXXDependentScopeMemberExpr', 'VarDecl', 'ParmVarDecl'].includes(wrapped.node.kind)) {
      return identifiersByFile;
    }
    const file = wrapped.file || normalized('');
    const identifiers = identifiersByFile.get(file) ?? { ranged: [], unresolved: [] };
    const range = identifierRange(wrapped);
    if (range) identifiers.ranged.push({ wrapped, range, order, dependent: isDependent(wrapped) });
    else identifiers.unresolved.push({ wrapped, order });
    identifiersByFile.set(file, identifiers);
    return identifiersByFile;
  }, new Map<string, Identifiers>());
  const sortedIdentifiersByFile = [...identifiersByFile.keys()].reduce((identifiersByFile, file) => {
    identifiersByFile.get(file)?.ranged.sort((left, right) => left.range.start - right.range.start || left.order - right.order);
    return identifiersByFile;
  }, identifiersByFile);
  return new Map([...sortedIdentifiersByFile].map(([file, identifiers]) => [
    file, { tree: buildIdentifierTree(identifiers.ranged), unresolved: identifiers.unresolved }
  ]));
};

const preferIdentifier = (
  selected: IndexedIdentifier | undefined,
  candidate: IndexedIdentifier
): IndexedIdentifier => {
  if (!selected) return candidate;
  const lengthDifference = candidate.range.end - candidate.range.start - (selected.range.end - selected.range.start);
  if (lengthDifference !== 0) return lengthDifference < 0 ? candidate : selected;
  if (candidate.dependent !== selected.dependent) return candidate.dependent ? selected : candidate;
  const depthDifference = candidate.wrapped.ancestors.length - selected.wrapped.ancestors.length;
  if (depthDifference !== 0) return depthDifference > 0 ? candidate : selected;
  return candidate.order < selected.order ? candidate : selected;
};

const findIndexedIdentifier = (
  tree: IdentifierTree | undefined,
  offset: number,
  selected?: IndexedIdentifier
): IndexedIdentifier | undefined => {
  if (!tree || offset >= tree.maxEnd) return selected;
  const left = findIndexedIdentifier(tree.left, offset, selected);
  const identifier = tree.identifier;
  if (offset < identifier.range.start) return left;
  const current = offset < identifier.range.end ? preferIdentifier(left, identifier) : left;
  return findIndexedIdentifier(tree.right, offset, current);
};

const findNodeAt = (
  index: AstIndex,
  file: string,
  offset: number,
  sourceTextByFile: ReadonlyMap<string, string>
): WrappedNode | undefined => {
  const identifiers = index.identifiersByFile.get(normalized(file));
  if (!identifiers) return undefined;
  return identifiers.unresolved.reduce((selected, { wrapped, order }) => {
    const range = identifierRange(wrapped, sourceTextByFile);
    return range && offset >= range.start && offset < range.end
      ? preferIdentifier(selected, { wrapped, range, order, dependent: isDependent(wrapped) })
      : selected;
  }, findIndexedIdentifier(identifiers.tree, offset))?.wrapped;
};

const isDependent = (wrapped: WrappedNode): boolean =>
  !!wrapped.node.dependent || wrapped.ancestors.some((node) => isFunction(node) && node.dependent);

const unwrap = (wrapped: WrappedNode | undefined): WrappedNode | undefined => {
  if (!wrapped || !(TRANSPARENT_EXPRESSIONS as readonly string[]).includes(wrapped.node.kind)) return wrapped;
  if (wrapped.node.kind === 'ImplicitCastExpr' && wrapped.node.castKind !== undefined &&
      !['NoOp', 'LValueToRValue', 'FunctionToPointerDecay', 'ArrayToPointerDecay'].includes(wrapped.node.castKind)) return wrapped;
  return unwrap(wrapped.children[0]);
};

export type ExpressionPath = {
  readonly rootId: string;
  readonly rootName: string;
  readonly members: readonly string[];
};

export const expressionPath = (input: WrappedNode | undefined): ExpressionPath | null => {
  const wrapped = unwrap(input);
  if (!wrapped) return null;
  const node = wrapped.node;
  if (['VarDecl', 'ParmVarDecl'].includes(node.kind) && node.id) {
    return { rootId: node.id, rootName: node.name ?? '', members: [] };
  }
  if (node.kind === 'DeclRefExpr' && node.referencedDecl?.id) {
    return {
      rootId: node.referencedDecl.id,
      rootName: node.referencedDecl.name ?? '',
      members: []
    };
  }
  if (['MemberExpr', 'CXXDependentScopeMemberExpr'].includes(node.kind) && wrapped.children[0]) {
    const base = expressionPath(wrapped.children[0]);
    return base ? appendMembers(base, [...(node.arrow && base.rootId !== '$this' ? ['*'] : []), node.name ?? '?']) : null;
  }
  if (node.kind === 'CXXThisExpr') return { rootId: '$this', rootName: 'this', members: [] };
  if (node.kind === 'CallExpr' && ['std::move', 'std::forward'].includes(node.callee?.qualifiedName ?? '')) {
    return expressionPath(wrapped.children[1]);
  }
  if (node.kind === 'CXXConstructExpr' && node.fieldwiseCopy && !node.copyBoundaries?.length)
    return expressionPath(wrapped.children[0]);
  if (node.kind === 'ArraySubscriptExpr' && wrapped.children[0]) {
    if (/\*\s*$/.test(unwrap(wrapped.children[0])?.node.type?.qualType ?? '')) return null;
    const base = expressionPath(wrapped.children[0]);
    const subscript = unwrap(wrapped.children[1]);
    return base && subscript?.node.kind === 'IntegerLiteral' && subscript.node.value !== undefined
      ? appendMembers(base, ['[' + subscript.node.value + ']']) : null;
  }
  if (
    node.kind === 'UnaryOperator' &&
    ['&', '*'].includes(node.opcode ?? '') &&
    wrapped.children[0]
  ) {
    const base = expressionPath(wrapped.children[0]);
    return base ? appendMembers(base, [node.opcode!]) : null;
  }
  return null;
};

const appendMembers = (target: ExpressionPath, members: readonly string[]): ExpressionPath => ({
  ...target, members: members.reduce<readonly string[]>((members, member) =>
    member === '*' && members.at(-1) === '&' ? members.slice(0, -1) : [...members, member], target.members)
});

const resolveFunction = (call: WrappedNode, index: AstIndex): FunctionInfo | undefined => {
  if (index.resolvedCalls.has(call.node)) return index.resolvedCalls.get(call.node);
  if (call.node.callee) return index.functionsById.get(call.node.callee.id);
  if (!call.children[0]) return undefined;
  const callee = unwrap(call.children[0]);
  const declaration = callee?.node.referencedDecl?.id ? index.declarations.get(callee.node.referencedDecl.id) : undefined;
  const callable = callee?.node.kind === 'LambdaExpr' ? callee : declaration ? unwrap(declaration.children[0]) : undefined;
  if (callable?.node.kind === 'LambdaExpr') {
    const method = callable.children.flatMap((record) => record.children)
      .find((method) => method.node.kind === 'CXXMethodDecl' && method.node.name === 'operator()');
    if (method) return index.functionsByNode.get(method.node);
  }
  if (callee?.node.referencedMemberDecl) return index.functionsById.get(callee.node.referencedMemberDecl);
  const reference = findDescendant(call.children[0],
    (wrapped) => wrapped.node.kind === 'DeclRefExpr' && wrapped.node.referencedDecl !== undefined
  )?.node.referencedDecl;
  const exact = reference?.id && index.functionsById.get(reference.id);
  if (exact) return exact;
  return undefined;
};

const argsOf = (call: WrappedNode): readonly WrappedNode[] => call.children.slice(call.node.memberOperator ? 2 : 1);

const writeTarget = (wrapped: WrappedNode): WrappedNode | undefined => {
  const node = wrapped.node;
  if (node.kind === 'UnaryOperator' && (INCREMENTS as readonly string[]).includes(node.opcode ?? '')) {
    return wrapped.children[0];
  }
  if (
    (node.kind === 'BinaryOperator' || node.kind === 'CompoundAssignOperator') &&
    (ASSIGNMENTS as readonly string[]).includes(node.opcode ?? '')
  ) {
    return wrapped.children[0];
  }
  if (node.kind === 'CXXOperatorCallExpr' && (ASSIGNMENTS as readonly string[]).includes(node.opcode ?? '')) {
    return wrapped.children[1];
  }
  return undefined;
};

const sameOrParent = (parent: readonly string[], child: readonly string[]): boolean =>
  parent.length <= child.length && parent.every((member, index) => member === child[index]);

const affects = (writeMembers: readonly string[], targetMembers: readonly string[]): boolean =>
  // Rebinding a pointer does not write its pointee, nor vice versa.
  writeMembers.lastIndexOf('*') === targetMembers.lastIndexOf('*') &&
  (sameOrParent(writeMembers, targetMembers) || sameOrParent(targetMembers, writeMembers));

const isReferenceOrPointer = (parameter: WrappedNode): boolean =>
  /[&*]/.test(parameter.node.type?.qualType ?? '');

const enclosingFunction = (wrapped: WrappedNode, index: AstIndex): FunctionInfo | undefined =>
  index.enclosingFunctions.get(wrapped);

const lambdaFor = (fn: FunctionInfo, index: AstIndex): WrappedNode | undefined => {
  const lambdaNode = [...fn.wrapped.ancestors].reverse().find((node) => node.kind === 'LambdaExpr');
  return lambdaNode && index.wrappedByNode.get(lambdaNode);
};

const isFoldCall = (call: WrappedNode): boolean =>
  (call.node.callee?.name ?? '').includes('fold_left') ||
  call.children.slice(0, call.node.memberOperator ? 2 : 1).some((wrapped) =>
    findDescendant(wrapped, (wrapped) =>
      (wrapped.node.referencedDecl?.name ?? wrapped.node.name ?? '').includes('fold_left')) !== undefined);

const foldFor = (fn: FunctionInfo, index: AstIndex): { readonly call: WrappedNode; readonly initial: WrappedNode } | undefined => {
  const lambda = lambdaFor(fn, index);
  if (!lambda || fn.params.length === 0) return undefined;
  const callNode = [...lambda.ancestors].reverse().find(isCall);
  const call = callNode && index.wrappedByNode.get(callNode);
  const initial = call && argsOf(call).at(-2);
  return call && initial && isFoldCall(call) ? { call, initial } : undefined;
};

type NormalizedPathResolution =
  | { readonly _tag: 'NormalizedPath'; readonly target: ExpressionPath }
  | { readonly _tag: 'CyclicPath'; readonly target: ExpressionPath };

const resolveNormalizedPath = (
  target: ExpressionPath,
  index: AstIndex,
  visited: readonly string[]
): NormalizedPathResolution => {
  if (visited.includes(target.rootId)) return { _tag: 'CyclicPath', target };
  const normalizedPath = index.normalizedPaths.get(target.rootId);
  if (normalizedPath) return {
    _tag: 'NormalizedPath', target: { ...normalizedPath, members: [...normalizedPath.members, ...target.members] }
  };
  const declaration = index.declarations.get(target.rootId);
  if (declaration?.node.kind !== 'VarDecl' || !/&/.test(declaration.node.type?.qualType ?? '')) return { _tag: 'NormalizedPath', target };
  const initial = expressionPath(declaration.children[0]);
  return initial
    ? resolveNormalizedPath({ ...initial, members: [...initial.members, ...target.members] }, index, [...visited, target.rootId])
    : { _tag: 'NormalizedPath', target };
};

const normalizePath = (target: ExpressionPath, index: AstIndex): ExpressionPath => {
  const normalizedPath = index.normalizedPaths.get(target.rootId);
  if (normalizedPath) return { ...normalizedPath, members: [...normalizedPath.members, ...target.members] };
  const declaration = index.declarations.get(target.rootId);
  if (declaration?.node.kind !== 'VarDecl' || !/&/.test(declaration.node.type?.qualType ?? '')) return target;
  return resolveNormalizedPath(target, index, []).target;
};

const pathAt = (wrapped: WrappedNode | undefined, index: AstIndex): ExpressionPath | null => {
  const target = expressionPath(wrapped);
  return target && normalizePath(target, index);
};

// This fallback is only a barrier for an unprovable write, never a value map.
const storageRoot = (input: WrappedNode, index: AstIndex): ExpressionPath | null => {
  const expression = unwrap(input);
  if (!expression) return null;
  const target = pathAt(expression, index);
  if (target) return target;
  return ['ArraySubscriptExpr', 'MemberExpr', 'UnaryOperator'].includes(expression.node.kind) && expression.children[0]
    ? storageRoot(expression.children[0], index) : null;
};

const mutationBarrier = (fn: FunctionInfo, target: ExpressionPath, beforeOffset: number, index: AstIndex,
  afterOffset = Number.NEGATIVE_INFINITY) => {
  const unknownWrites = index.writeBoundariesByFunctionId.get(fn.id)?.get(target.rootId) ?? [];
  const unknownWrite = unknownWrites[firstAtMost(unknownWrites, beforeOffset - 1, (write) => write.start)];
  const writes = index.writesByFunctionId.get(fn.id)?.get(target.rootId) ?? [];
  const pointerWrite = target.members.includes('*') ? findFirstMapped(writes, (write) =>
    sameOrParent(write.target.members, target.members) && write.target.members.lastIndexOf('*') < target.members.lastIndexOf('*')
      ? { start: write.start, reason: 'Pointer was rebound; pointee identity is not verified.' } : undefined,
    firstAtMost(writes, beforeOffset - 1, (write) => write.start),
    firstAtMost(writes, afterOffset - 1, (write) => write.start)) : undefined;
  const barrier = pointerWrite && (!unknownWrite || pointerWrite.start > unknownWrite.start) ? pointerWrite : unknownWrite;
  return barrier && barrier.start >= afterOffset ? barrier : undefined;
};

const receiverOf = (call: WrappedNode): WrappedNode | undefined =>
  call.node.memberOperator ? call.children[1] : unwrap(call.children[0])?.children[0];

const receiverPath = (call: WrappedNode, index: AstIndex): ExpressionPath | null => {
  const receiver = receiverOf(call);
  const target = pathAt(receiver, index);
  return target && appendMembers(target, target.rootId !== '$this' && /\*\s*$/.test(receiver?.node.type?.qualType ?? '') ? ['*'] : []);
};

const captureMatches = (capture: { readonly id: string }, target: ExpressionPath, index: AstIndex): boolean =>
  normalizePath({ rootId: capture.id, rootName: '', members: [] }, index).rootId === target.rootId;

const opaqueCopy = (copy: { readonly copyBoundaries?: readonly string[]; readonly copyValueBoundaries?: readonly string[] },
  members: readonly string[]): boolean =>
  !!copy.copyBoundaries?.some((prefix) => prefix === '' || sameOrParent(prefix.split('.'), members)) ||
  !!copy.copyValueBoundaries?.some((prefix) => prefix === '' || affects(prefix.split('.'), members));

const standardMutationTarget = (call: WrappedNode): WrappedNode | undefined =>
  /^std::/.test(call.node.callee?.qualifiedName ?? '') &&
  ['push_back', 'emplace_back', 'emplace', 'insert', 'erase', 'clear', 'reset', 'resize', 'assign', 'swap', 'pop_back'].includes(call.node.callee?.name ?? '')
    ? receiverOf(call)
    : undefined;

// Balanced searches keep stack usage logarithmic while preserving the first
// matching AST occurrence. Neither skipped prefixes nor successful suffixes
// need to be copied or linearly visited on each cursor query.
const firstAtMost = <A>(
  values: readonly A[],
  offset: number,
  startOf: (value: A) => number,
  start = 0,
  end = values.length
): number => {
  if (start >= end) return start;
  const middle = start + Math.floor((end - start) / 2);
  return startOf(values[middle]) > offset
    ? firstAtMost(values, offset, startOf, middle + 1, end)
    : firstAtMost(values, offset, startOf, start, middle);
};

const findFirstMapped = <A, B>(
  values: readonly A[],
  select: (value: A) => B | undefined,
  start: number,
  end = values.length
): B | undefined => {
  if (start >= end) return undefined;
  if (end - start === 1) return select(values[start]);
  const middle = start + Math.floor((end - start) / 2);
  return findFirstMapped(values, select, start, middle) ?? findFirstMapped(values, select, middle, end);
};

const findPreviousMutation = (
  fn: FunctionInfo,
  target: ExpressionPath,
  beforeOffset: number,
  index: AstIndex,
  sourceTextByFile: ReadonlyMap<string, string>,
  visitedFunctionIds: readonly string[] = []
): PreviousMutation | undefined => {
  if (visitedFunctionIds.includes(fn.id)) return undefined;
  const nextVisited = [...visitedFunctionIds, fn.id];
  const writes = index.writesByFunctionId.get(fn.id)?.get(target.rootId) ?? [];
  const directWrite = findFirstMapped(writes, (write) => {
    if (!affects(write.target.members, target.members)) return undefined;
    const range = nodeRange(write.mutation, sourceTextByFile);
    return range !== null && range.end <= beforeOffset ? write : undefined;
  }, firstAtMost(writes, beforeOffset, (write) => write.start));
  const direct: MutationCandidate | undefined = directWrite && {
    _tag: 'Mutation', mutation: directWrite.mutation, orderOffset: directWrite.start, frames: []
  };
  const calls = index.callsByCallerId.get(fn.id) ?? [];
  const callStart = (call: WrappedNode): number => call.node.range?.begin?.offset ?? -1;
  const candidate = findFirstMapped(calls, (call): PreviousMutation | undefined => {
    const callRange = nodeRange(call, sourceTextByFile);
    if (!callRange || callRange.end > beforeOffset) return undefined;
    const callee = resolveFunction(call, index);
    if (!callee) return undefined;
    const args = argsOf(call);
    const parameterTargets = callee.params.flatMap((parameter, parameterIndex) => {
      if (!isReferenceOrPointer(parameter)) return [];
      const argument = pathAt(args[parameterIndex], index);
      if (!argument || argument.rootId !== target.rootId) return [];
      const address = argument.members.at(-1) === '&';
      const argumentMembers = address ? argument.members.slice(0, -1) : argument.members;
      if (!sameOrParent(argumentMembers, target.members) &&
          !(sameOrParent(target.members, argumentMembers) && !argumentMembers.slice(target.members.length).includes('*'))) return [];
      return [{ rootId: parameter.node.id ?? '', rootName: parameter.node.name ?? '',
        members: [...(address ? ['*'] : []), ...target.members.slice(argumentMembers.length)] }];
    });
    const receiver = receiverPath(call, index);
    const receiverTargets = receiver?.rootId === target.rootId && affects(receiver.members, target.members)
      ? [{ rootId: '$this', rootName: 'this', members: target.members.slice(receiver.members.length) }]
      : [];
    const lambda = lambdaFor(callee, index);
    const capture = lambda?.node.captures?.find((capture) => captureMatches(capture, target, index));
    const declaration = index.declarations.get(target.rootId);
    const owner = declaration && enclosingFunction(declaration, index);
    const defaultReference = lambda?.node.captureDefault === 'reference' && owner &&
      callee.wrapped.ancestors.some((node) => node.id === owner.id);
    const capturedTargets = capture?.kind === 'reference' || (!capture && defaultReference) ? [target] : [];
    return [...parameterTargets, ...receiverTargets, ...capturedTargets].reduce<PreviousMutation | undefined>((latest, target) => {
      if (latest?.orderOffset === callRange.start) return latest;
      const nested = findPreviousMutation(callee, target, Number.POSITIVE_INFINITY, index, sourceTextByFile, nextVisited);
      if (!nested) return latest;
      return nested._tag === 'MutationBoundary' ? { ...nested, orderOffset: callRange.start }
        : { ...nested, orderOffset: callRange.start, frames: [{ callsite: call, caller: fn }, ...nested.frames] };
    }, undefined);
  }, firstAtMost(calls, beforeOffset, callStart), direct ? firstAtMost(calls, direct.orderOffset, callStart) : calls.length) ?? direct;
  const barrier = mutationBarrier(fn, target, beforeOffset, index, candidate?.orderOffset);
  return barrier && (!candidate || candidate.orderOffset <= barrier.start)
    ? { _tag: 'MutationBoundary', orderOffset: barrier.start, reason: fn.file + ':' + barrier.start + ': ' + barrier.reason }
    : candidate;
};

// A query exposes only unresolved parameter owners to the editor adapter. Each
// external edge retains its own AST; process-local declaration IDs never cross it.
type TraceSearch<A> = {
  readonly candidates: readonly A[];
  readonly boundaries: readonly FunctionInfo[];
  readonly diagnostics?: readonly string[];
};

const combineSearches = <A>(searches: readonly TraceSearch<A>[]): TraceSearch<A> => ({
  candidates: searches.flatMap((search) => search.candidates),
  boundaries: [...new Set(searches.flatMap((search) => search.boundaries))],
  diagnostics: searches.flatMap((search) => search.diagnostics ?? [])
});

const functionKey = (fn: FunctionInfo): string =>
  [fn.file, fn.wrapped.node.loc?.offset ?? fn.id, fn.wrapped.node.symbol ?? fn.type].join(':');

const uniqueCallerLinks = (links: readonly CallerLink[]): readonly CallerLink[] =>
  links.reduce<readonly CallerLink[]>((unique, link) => unique.some((previous) =>
    functionKey(previous.caller) === functionKey(link.caller) && callKey(previous.callsite) === callKey(link.callsite))
    ? unique : [...unique, link], []);

const callerLinks = (fn: FunctionInfo, index: AstIndex, options: AnalysisOptions): readonly CallerLink[] => {
  const local = (index.callsByCalleeId.get(fn.id) ?? []).flatMap((callsite) => {
    const caller = enclosingFunction(callsite, index);
    return caller ? [{ prepared: { ast: index.all[0].node, index }, callsite, caller }] : [];
  });
  return uniqueCallerLinks([...local, ...(options.externalCallers?.get(fn.wrapped.node) ?? [])]);
};

const callKey = (call: WrappedNode): string =>
  [call.file, call.node.range?.begin?.offset, call.node.range?.end?.offset].join(':');

type ValueSource =
  | { readonly _tag: 'Path'; readonly target: ExpressionPath }
  | { readonly _tag: 'Initialization'; readonly origin: WrappedNode }
  | { readonly _tag: 'Boundary'; readonly reason: string };

// Resolve a subobject of a value, rather than appending its suffix to an
// arbitrary child expression. Only Clang's semantic aggregate order is usable.
const valueSource = (input: WrappedNode | undefined, members: readonly string[], index: AstIndex): ValueSource => {
  const expression = unwrap(input);
  if (!expression) return { _tag: 'Boundary', reason: 'Missing argument expression.' };
  if (expression.node.kind === 'CXXFunctionalCastExpr' && expression.node.castKind === 'NoOp')
    return valueSource(expression.children[0], members, index);
  if (expression.node.kind === 'CallExpr' && ['std::move', 'std::forward'].includes(expression.node.callee?.qualifiedName ?? ''))
    return valueSource(expression.children[1], members, index);
  if (expression.node.kind === 'CXXConstructExpr' && expression.node.fieldwiseCopy) {
    return opaqueCopy(expression.node, members) ? { _tag: 'Boundary', reason: 'Unsupported argument expression: member copy/move field preservation is not verified.' }
      : valueSource(expression.children[0], members, index);
  }
  const target = pathAt(expression, index);
  if (target) return { _tag: 'Path', target: appendMembers(target, members) };
  if (expression.node.kind === 'InitListExpr') {
    if (members.length === 0) return { _tag: 'Initialization', origin: expression };
    const fieldIndex = expression.node.aggregateFields?.indexOf(members[0]) ?? -1;
    return fieldIndex >= 0
      ? valueSource(expression.children[fieldIndex], members.slice(1), index)
      : { _tag: 'Boundary', reason: 'Aggregate field mapping is unavailable for ' + members.join('.') + '.' };
  }
  if (['IntegerLiteral', 'FloatingLiteral', 'CXXBoolLiteralExpr', 'StringLiteral', 'ImplicitValueInitExpr'].includes(expression.node.kind))
    return members.length === 0 ? { _tag: 'Initialization', origin: expression }
      : { _tag: 'Boundary', reason: 'Scalar initialization cannot supply a member path.' };
  return { _tag: 'Boundary', reason: 'Unsupported argument expression: ' + expression.node.kind +
    (expression.node.copyOrMove ? ' (copy/move field preservation is not verified).' : '.') };
};

const mappedArgument = (link: CallerLink, parameterIndex: number, target: ExpressionPath): ValueSource =>
  valueSource(argsOf(link.callsite)[parameterIndex], target.members, link.prepared.index);

// A member function's implicit object maps to the receiver expression of each
// verified call site, keeping the traced member suffix: `this->bank.records`
// becomes `<receiver>.bank.records` in the caller.
const mappedReceiver = (link: CallerLink, target: ExpressionPath): ExpressionPath | null => {
  const receiver = receiverPath(link.callsite, link.prepared.index);
  return receiver && appendMembers(receiver, target.members);
};

// Language-service ranges identify candidates; the caller's Clang symbol proves
// the semantic call target, including overloads. A missing symbol is a boundary.
export const callerLinksAt = (
  prepared: PreparedAst, file: string, start: number, end: number, fn: FunctionInfo
): readonly CallerLink[] => {
  const symbol = fn.wrapped.node.symbol;
  if (!symbol) return [];
  // Reuse the per-file call index prepared once for this AST; many reference
  // locations can share it within a single analysis request.
  const calls = (prepared.index.callsByFile.get(normalized(file)) ?? []).filter((callsite) => {
    const range = nodeRange(callsite);
    const calleeRange = callsite.children[0] && nodeRange(callsite.children[0]);
    return callsite.file === normalized(file) && callsite.node.callee?.symbol === symbol &&
      range && range.start <= start && range.end >= end &&
      // A function reference used as an argument is not a call to that reference.
      !!calleeRange && calleeRange.start < Math.max(end, start + 1) && calleeRange.end > start;
  });
  // Nested calls may share a target. Choose the smallest actual call containing
  // the provider's range rather than interpreting a reference as an invocation.
  const callsite = calls.reduce<WrappedNode | undefined>((smallest, call) => {
    const range = nodeRange(call)!;
    const previous = smallest && nodeRange(smallest)!;
    return !previous || range.end - range.start < previous.end - previous.start ? call : smallest;
  }, undefined);
  const smallest = callsite && nodeRange(callsite);
  return uniqueCallerLinks(calls.flatMap((callsite) => {
    const range = nodeRange(callsite)!;
    const caller = enclosingFunction(callsite, prepared.index);
    return caller && smallest && range.end - range.start === smallest.end - smallest.start
      ? [{ prepared, callsite, caller: prepared.index.functionsById.get(caller.id) ?? caller }] : [];
  }));
};

// Backward tracing follows the value at call entry, including copies. Forward
// effects in findPreviousMutation still require reference/pointer parameters.
const traceMutations = (
  fn: FunctionInfo, target: ExpressionPath, beforeOffset: number, index: AstIndex,
  sourceTextByFile: ReadonlyMap<string, string>, options: AnalysisOptions,
  visited: readonly string[] = []
): TraceSearch<TraceCandidate> => {
  const key = functionKey(fn);
  if (visited.includes(key)) return { candidates: [], boundaries: [], diagnostics: ['Recursive caller path; stopped at ' + fn.name + '.'] };
  const nextVisited = [...visited, key];
  const local = findPreviousMutation(fn, target, beforeOffset, index, sourceTextByFile);
  if (local?._tag === 'MutationBoundary') return { candidates: [], boundaries: [], diagnostics: [local.reason] };
  if (local) {
    const { _tag, ...candidate } = local;
    return { candidates: [candidate], boundaries: [] };
  }
  const parameterIndex = fn.params.findIndex((parameter) => parameter.node.id === target.rootId);
  const fold = foldFor(fn, index);
  const wrap = (): TraceSearch<TraceCandidate> => {
    const last = fold && findPreviousMutation(fn, target, Number.POSITIVE_INFINITY, index, sourceTextByFile);
    if (last?._tag === 'MutationBoundary') return { candidates: [], boundaries: [], diagnostics: [last.reason] };
    if (!last) return { candidates: [], boundaries: [] };
    const { _tag, ...candidate } = last;
    return { candidates: [{ ...candidate, wrapped: true }], boundaries: [] };
  };
  if (fold && parameterIndex === 0) {
    const wrapped = wrap();
    return wrapped.candidates.length > 0 ? wrapped : { ...wrapped, diagnostics: [...(wrapped.diagnostics ?? []),
      'Fold state has no indexed mutation; returned state transformations are not verified. Use Origin for the fold seed.'
    ] };
  }
  // Local call sites never prove caller completeness: another translation unit
  // can hold additional callers of the same function. A traced parameter (or
  // implicit member receiver) therefore stays in the external-discovery set
  // until the editor adapter has queried the language service for it, while
  // the verified local links keep contributing their own candidate paths.
  const receiverTrace = parameterIndex < 0 && target.rootId === '$this' && !lambdaFor(fn, index);
  if (parameterIndex >= 0 || receiverTrace) {
    const links = callerLinks(fn, index, options);
    const search = combineSearches(links.map((link): TraceSearch<TraceCandidate> => {
      const receiver = receiverTrace ? mappedReceiver(link, target) : null;
      const source: ValueSource = receiverTrace
        ? receiver ? { _tag: 'Path', target: receiver } : { _tag: 'Boundary', reason: 'Unsupported receiver expression.' }
        : mappedArgument(link, parameterIndex, target);
      const range = nodeRange(link.callsite, sourceTextByFile);
      if (source._tag !== 'Path' || !range) return { candidates: [], boundaries: [], diagnostics: [
        link.caller.file + ':' + (range?.start ?? '?') + ' -> ' + fn.name + ': ' +
        (source._tag === 'Boundary' ? source.reason : source._tag === 'Initialization'
          ? 'State is initialized here; no earlier mutation of this value is verified.' : 'Missing call range.')
      ] };
      const argument = source.target;
      const frame = receiverTrace
        ? { callsite: link.callsite, caller: link.caller, receiver: argument }
        : { callsite: link.callsite, caller: link.caller, parameterIndex, argument };
      const search = traceMutations(link.caller, argument, range.start, link.prepared.index, sourceTextByFile, options, nextVisited);
      return { ...search, candidates: search.candidates.map((candidate) => ({
        ...candidate, frames: [frame, ...candidate.frames]
      })) };
    }));
    const resolved = { ...search, candidates: search.candidates.length > 0 ? search.candidates : wrap().candidates,
      diagnostics: links.length > 0 ? search.diagnostics : ['No verified caller is available for ' + fn.name + '.'] };
    return options.externalCallers?.has(fn.wrapped.node)
      ? resolved
      : { ...resolved, boundaries: [...resolved.boundaries, fn] };
  }
  const parent = enclosingFunction(fn.wrapped, index);
  const lambda = lambdaFor(fn, index);
  const range = lambda && nodeRange(lambda, sourceTextByFile);
  const declaration = index.declarations.get(target.rootId);
  if (parent && lambda && range && enclosingFunction(declaration ?? fn.wrapped, index)?.id !== fn.id) {
    // A captured this pointer observes invocation-time mutations. Only a call
    // in this parent supplies that time; *this owns a separate object copy.
    if (target.rootId === '$this') {
      if (lambda.node.thisCapture !== 'pointer') return { candidates: [], boundaries: [] };
      const invocations = (index.callsByCalleeId.get(fn.id) ?? []).filter((call) =>
        enclosingFunction(call, index)?.id === parent.id);
      return combineSearches(invocations.map((call) => {
        const range = nodeRange(call, sourceTextByFile);
        if (!range) return { candidates: [], boundaries: [] };
        const search = traceMutations(parent, target, range.start, index, sourceTextByFile, options, nextVisited);
        return { ...search, candidates: search.candidates.map((candidate) => ({
          ...candidate, frames: [{ callsite: call, caller: parent }, ...candidate.frames]
        })) };
      }));
    }
    const capture = lambda.node.captures?.find((capture) => captureMatches(capture, target, index));
    if (capture?.kind === 'copy' && (opaqueCopy(capture, target.members) || target.members.includes('*'))) return {
      candidates: [], boundaries: [], diagnostics: ['Copy capture field or pointee preservation is not verified; stopped at the lambda.']
    };
    const reference = capture?.kind === 'reference' || (!capture && lambda.node.captureDefault === 'reference');
    const invocations = reference ? (index.callsByCalleeId.get(fn.id) ?? []).filter((call) =>
      enclosingFunction(call, index)?.id === parent.id) : [];
    if (invocations.length > 0) return combineSearches(invocations.map((call) => {
      const range = nodeRange(call, sourceTextByFile);
      if (!range) return { candidates: [], boundaries: [] };
      const search = traceMutations(parent, target, range.start, index, sourceTextByFile, options, nextVisited);
      return { ...search, candidates: search.candidates.map((candidate) => ({
        ...candidate, frames: [{ callsite: call, caller: parent }, ...candidate.frames]
      })) };
    }));
    const search = traceMutations(parent, target, range.start, index, sourceTextByFile, options, nextVisited);
    return search.candidates.length > 0 ? search : { ...search, candidates: wrap().candidates };
  }
  if (declaration?.node.kind === 'VarDecl' && declaration.children.length > 0) {
    const wrapped = wrap();
    if (wrapped.candidates.length > 0 || wrapped.diagnostics?.length) return wrapped;
    const source = valueSource(declaration.children[0], target.members, index);
    const range = nodeRange(declaration, sourceTextByFile);
    if (source._tag === 'Path' && range && source.target.rootId !== target.rootId)
      return traceMutations(fn, source.target, range.start, index, sourceTextByFile, options, visited);
    return { candidates: [], boundaries: [], diagnostics: [source._tag === 'Boundary' ? source.reason
      : 'No earlier mutation before local initialization of ' + target.rootName + '.'] };
  }
  return { ...wrap(), diagnostics: ['No verified caller or earlier mutation is available for ' + fn.name + '.' ] };
};

// The implicit object of a member function has no ParmVarDecl. Trace it like a
// parameter, but map it to the receiver expression at each verified call site
// and record that receiver on the frame instead of a fabricated parameterIndex.
const receiverOriginFor = (
  fn: FunctionInfo, target: ExpressionPath, index: AstIndex, options: AnalysisOptions,
  visited: readonly string[]
): TraceSearch<OriginCandidate> => {
  const fallback = (boundary: string): TraceSearch<OriginCandidate> => ({
    candidates: [{ origin: fn.wrapped, kind: 'parameter', frames: [], boundary }], boundaries: []
  });
  const key = functionKey(fn);
  if (visited.includes(key)) return fallback('Recursive caller path; stopped at the receiver.');
  const links = callerLinks(fn, index, options);
  if (links.length === 0) return {
    ...fallback('No verified caller is available; stopped at the receiver.'),
    boundaries: options.externalCallers?.has(fn.wrapped.node) ? [] : [fn]
  };
  const search = combineSearches(links.map((link): TraceSearch<OriginCandidate> => {
    const argument = mappedReceiver(link, target);
    const search = argument
      ? originFor(link.caller, argument, link.prepared.index, options, [...visited, key], link.callsite.node.range?.begin?.offset)
      : fallback('Unsupported receiver expression; stopped at the receiver.');
    const resolved = search.candidates.length > 0 ? search : fallback('Receiver source could not be resolved; stopped at the receiver.');
    return { ...resolved, candidates: resolved.candidates.map((candidate) => ({
      ...candidate, frames: [{ callsite: link.callsite, caller: link.caller, receiver: argument ?? undefined }, ...candidate.frames]
    })) };
  }));
  return options.externalCallers?.has(fn.wrapped.node)
    ? search
    : { ...search, boundaries: [...search.boundaries, fn] };
};

const originFor = (
  fn: FunctionInfo, target: ExpressionPath, index: AstIndex, options: AnalysisOptions,
  visited: readonly string[] = [], beforeOffset = Number.POSITIVE_INFINITY
): TraceSearch<OriginCandidate> => {
  if (target.rootId === '$this') {
    const lambda = lambdaFor(fn, index);
    if (!lambda) return receiverOriginFor(fn, target, index, options, visited);
    // Clang records actual captures, including implicit `this` under [=]/[&].
    // The captured pointer belongs to the object at closure construction, not
    // to the closure receiver at operator() invocation (which may be elsewhere).
    // Follow each enclosing capture in turn, then verified member callers; never
    // infer a capture from the default or treat a *this copy as the original.
    const parent = enclosingFunction(lambda, index);
    const key = functionKey(fn);
    if (lambda.node.thisCapture !== 'pointer' || !parent || visited.includes(key)) return {
      candidates: [{ origin: lambda, kind: 'parameter', frames: [], boundary:
        lambda.node.thisCapture === 'copy' ? 'Object copy capture; stopped at the lambda.'
          : 'Captured receiver source could not be verified; stopped at the lambda.' }], boundaries: []
    };
    return originFor(parent, target, index, options, [...visited, key]);
  }
  const declaration = index.declarations.get(target.rootId);
  if (!declaration) return { candidates: [], boundaries: [] };
  const lambda = lambdaFor(fn, index);
  const capture = lambda?.node.captures?.find((capture) => captureMatches(capture, target, index));
  if (lambda && capture?.kind === 'copy' && (opaqueCopy(capture, target.members) || target.members.includes('*'))) return {
    candidates: [{ origin: lambda, kind: 'parameter', frames: [], boundary:
      'Copy capture field or pointee preservation is not verified; stopped at the lambda.' }], boundaries: []
  };
  if (lambda && capture?.kind === 'reference' && target.members.includes('*') && enclosingFunction(declaration, index)?.id !== fn.id)
    return { candidates: [{ origin: lambda, kind: 'parameter', frames: [], boundary:
      'Captured pointee binding is not verified; stopped at the lambda.' }], boundaries: [] };
  if (declaration.node.kind === 'VarDecl') {
    if (target.members.includes('*')) {
      const barrier = mutationBarrier(fn, target, beforeOffset, index);
      const binding = { ...target, members: target.members.slice(0, target.members.lastIndexOf('*')) };
      const rebound = findPreviousMutation(fn, binding, beforeOffset, index, options.sourceTextByFile ?? new Map());
      const source = valueSource(declaration.children[0], target.members, index);
      if (!barrier && !rebound && source._tag === 'Path' && source.target.rootId !== target.rootId)
        return originFor(fn, source.target, index, options, visited, declaration.node.range?.begin?.offset ?? beforeOffset);
      return { candidates: [{ origin: declaration, kind: 'parameter', frames: [], boundary:
        barrier?.reason ?? (rebound ? 'Pointer binding may have changed through a helper; pointee identity is not verified.'
          : 'Pointee initialization source is not verified.') }], boundaries: [] };
    }
    return { candidates: declaration.children.length > 0 ? [{ origin: declaration, kind: 'initialization', frames: [] }] : [], boundaries: [] };
  }
  const declarationOwner = enclosingFunction(declaration, index) ?? fn;
  const owner = index.functionsById.get(declarationOwner.id) ?? declarationOwner;
  const fold = owner.params[0]?.node.id === target.rootId ? foldFor(owner, index) : undefined;
  if (fold) return { candidates: [{ origin: fold.initial, kind: 'initialization', frames: [] }], boundaries: [] };
  const fallback = (boundary: string): TraceSearch<OriginCandidate> => ({
    candidates: [{ origin: declaration, kind: 'parameter', frames: [], boundary }], boundaries: []
  });
  const key = functionKey(owner);
  if (visited.includes(key)) return fallback('Recursive caller path; stopped at the parameter.');
  const parameterIndex = owner.params.findIndex((parameter) => parameter.node.id === target.rootId);
  if (parameterIndex < 0) return fallback('Parameter ownership could not be resolved.');
  const links = callerLinks(owner, index, options);
  if (links.length === 0) return {
    ...fallback('No verified caller is available; stopped at the parameter.'),
    boundaries: options.externalCallers?.has(owner.wrapped.node) ? [] : [owner]
  };
  const search = combineSearches(links.map((link): TraceSearch<OriginCandidate> => {
    const source = mappedArgument(link, parameterIndex, target);
    const argument = source._tag === 'Path' ? source.target : undefined;
    const search = source._tag === 'Path' ? originFor(link.caller, source.target, link.prepared.index, options, [...visited, key], link.callsite.node.range?.begin?.offset)
      : source._tag === 'Initialization'
        ? { candidates: [{ origin: source.origin, kind: 'initialization' as const, frames: [] }], boundaries: [] }
        : fallback(source.reason + ' Stopped at the parameter.');
    const resolved = search.candidates.length > 0 ? search : fallback('Argument source could not be resolved; stopped at the parameter.');
    return { ...resolved, candidates: resolved.candidates.map((candidate) => ({
      ...candidate, frames: [{ callsite: link.callsite, caller: link.caller, parameterIndex, argument: argument ?? undefined }, ...candidate.frames]
    })) };
  }));
  return options.externalCallers?.has(owner.wrapped.node)
    ? search
    : { ...search, boundaries: [...search.boundaries, owner] };
};

const uniqueByPath = <A>(candidates: readonly A[], target: (candidate: A) => WrappedNode,
  frames: (candidate: A) => readonly TraceFrame[]): readonly A[] =>
  candidates.reduce((state, candidate) => {
    const key = callKey(target(candidate)) + '|' + frames(candidate).map((frame) => [callKey(frame.callsite), functionKey(frame.caller), frame.parameterIndex, frame.argument?.rootName, frame.argument?.members.join('.'), frame.receiver?.rootName, frame.receiver?.members.join('.')].join(':')).join('>');
    if (state.keys.has(key)) return state;
    state.keys.add(key);
    state.unique.push(candidate);
    return state;
  }, { keys: new Set<string>(), unique: [] as A[] }).unique;

export const byteOffsetFromUtf16 = (text: string, offset: number): number =>
  Buffer.byteLength(text.slice(0, offset), 'utf8');

export const utf16OffsetFromByte = (text: string, offset: number): number =>
  Buffer.from(text, 'utf8').subarray(0, Math.max(0, offset)).toString('utf8').length;

type AnalysisSelection = {
  readonly index: AstIndex;
  readonly current: FunctionInfo;
  readonly target: ExpressionPath;
  readonly sourceTextByFile: ReadonlyMap<string, string>;
};

const resolveSelection = (
  ast: ClangNode,
  options: AnalysisOptions,
  prepared?: PreparedAst
): AnalysisSelection | Extract<AnalysisResult, { readonly _tag: 'AnalysisFailure' }> => {
  const sourceTextByFile = new Map([
    ...(options.sourceTextByFile ?? []),
    [normalized(options.file), options.sourceText] as const
  ]);
  const index = prepared?.index ?? prepareAst(ast).index;
  const selected = findNodeAt(index, options.file, options.cursorByteOffset, sourceTextByFile);
  if (!selected) {
    return { _tag: 'AnalysisFailure', reason: 'No supported variable or member expression found at the cursor.' };
  }
  const selectedExpression = [...selected.ancestors].reverse().reduce<{ readonly expression: WrappedNode; readonly stopped: boolean }>(
    (selection, node) => {
      if (selection.stopped) return selection;
      if ((TRANSPARENT_EXPRESSIONS as readonly string[]).includes(node.kind)) return selection;
      const expression = index.wrappedByNode.get(node);
      return expression && ((node.kind === 'UnaryOperator' && node.opcode === '*') ||
        node.kind === 'ArraySubscriptExpr' && unwrap(expression.children[0])?.node === selection.expression.node)
        ? { expression, stopped: false } : { ...selection, stopped: true };
    }, { expression: selected, stopped: false }).expression;
  const target = pathAt(selectedExpression, index);
  const current = enclosingFunction(selected, index);
  if (!target || !current) {
    return { _tag: 'AnalysisFailure', reason: 'Could not resolve the expression path or enclosing function.' };
  }
  return { index, current, target, sourceTextByFile };
};

const mutationResult = (candidates: readonly TraceCandidate[]): AnalysisResult =>
  candidates.length === 1
    ? {
        _tag: 'MutationFound',
        mutation: candidates[0].mutation,
        via: candidates[0].frames.length > 0 ? 'call' : 'direct',
        wrapped: candidates[0].wrapped ?? false,
        frames: candidates[0].frames
      }
    : { _tag: 'CandidatesFound', candidates };

export type AnalysisQuery = {
  readonly result: AnalysisResult;
  readonly boundaries: readonly FunctionInfo[];
  readonly diagnostics?: readonly string[];
};

export const analyzeQuery = (
  mode: 'origin' | 'mutation', ast: ClangNode, options: AnalysisOptions, prepared?: PreparedAst
): AnalysisQuery => {
  const selection = resolveSelection(ast, options, prepared);
  if ('_tag' in selection) return { result: selection, boundaries: [] };
  const { current, target, index, sourceTextByFile } = selection;
  if (mode === 'origin') {
    const search = originFor(current, target, index, options, [], options.cursorByteOffset);
    const candidates = uniqueByPath(search.candidates, (candidate) => candidate.origin, (candidate) => candidate.frames);
    const result: AnalysisResult = candidates.length === 1
      ? { _tag: 'OriginFound', origin: candidates[0].origin, kind: candidates[0].kind, boundary: candidates[0].boundary, frames: candidates[0].frames }
      : candidates.length > 1 ? { _tag: 'OriginCandidatesFound', candidates }
      : { _tag: 'AnalysisFailure', reason: 'No supported initialization, fold seed, or parameter declaration was found for this expression.' };
    return { result, boundaries: search.boundaries, diagnostics: [...(options.callerDiagnostics ?? []), ...(search.diagnostics ?? [])] };
  }
  const search = traceMutations(current, target, options.cursorByteOffset, index, sourceTextByFile, options);
  const candidates = uniqueByPath(search.candidates, (candidate) => candidate.mutation, (candidate) => candidate.frames);
  return {
    result: candidates.length > 0 ? mutationResult(candidates) : {
      _tag: 'AnalysisFailure', reason: ['No earlier mutation or supported fold wrap-around was found along verified caller paths.',
        ...new Set([...(options.callerDiagnostics ?? []), ...(search.diagnostics ?? [])])].join(' ')
    },
    boundaries: search.boundaries,
    diagnostics: [...(options.callerDiagnostics ?? []), ...(search.diagnostics ?? [])]
  };
};

export const analyzeAst = (ast: ClangNode, options: AnalysisOptions, prepared?: PreparedAst): AnalysisResult =>
  analyzeQuery('mutation', ast, options, prepared).result;

export const analyzeOriginAst = (ast: ClangNode, options: AnalysisOptions, prepared?: PreparedAst): AnalysisResult =>
  analyzeQuery('origin', ast, options, prepared).result;
