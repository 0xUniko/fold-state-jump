'use strict';

import path from 'node:path';
import { type Storage, type StorageRelation, combineRelations, unknownRelation, relationEvidence, unrelated, reachable, incomplete } from './storage';

export type ClangLocation = {
  readonly file?: string;
  readonly offset?: number;
  readonly tokLen?: number;
  readonly expansionLoc?: ClangLocation;
  readonly spellingLoc?: ClangLocation;
};

type ParameterEffect = 'value' | 'read' | 'write' | 'pointee' | 'shared';

export type ClangNode = {
  readonly id?: string;
  readonly storageTypes?: Readonly<Record<string, Storage>>;
  readonly kind: string;
  readonly name?: string;
  readonly opcode?: string;
  readonly memberOperator?: boolean;
  readonly receiverStorageId?: string;
  readonly returnBorrow?: 'reference' | 'pointer';
  readonly storageOperation?: 'identity' | 'bind-reference' | 'fresh' | 'borrow-reference' | 'borrow-projection' | 'optional-arrow' | 'optional-observe' | 'optional-empty';
  readonly copyOrMove?: boolean;
  readonly fieldwiseCopy?: boolean;
  readonly copyBoundaries?: readonly string[];
  readonly copyValueBoundaries?: readonly string[];
  readonly aggregateFields?: readonly string[];
  readonly arrow?: boolean;
  readonly hasElse?: boolean;
  readonly variantAlternative?: string;
  readonly variantProjection?: string;
  readonly value?: string;
  readonly castKind?: string;
  readonly symbol?: string;
  readonly dependent?: boolean;
  readonly referencedMemberDecl?: string;
  readonly callee?: { readonly id: string; readonly name: string; readonly qualifiedName?: string; readonly symbol?: string;
    readonly definition?: { readonly kind: 'unavailable' } | {
      readonly kind: 'user' | 'system-excluded'; readonly id: string; readonly loc: ClangLocation
    };
    readonly parameterEffects?: readonly ParameterEffect[]; readonly receiverEffect?: ParameterEffect; readonly virtual?: boolean };
  readonly captures?: readonly { readonly id: string; readonly kind: 'reference' | 'copy';
    readonly copyBoundaries?: readonly string[]; readonly copyValueBoundaries?: readonly string[] }[];
  readonly captureDefault?: 'reference' | 'copy' | 'none';
  readonly thisCapture?: 'pointer' | 'copy';
  readonly parameterEffect?: ParameterEffect;
  readonly construction?: { readonly name: string; readonly parameterEffects: readonly ParameterEffect[]; readonly storageBinding?: boolean };
  readonly type?: { readonly qualType?: string; readonly storage?: Storage; readonly storageId?: string; readonly extent?: number };
  readonly referencedDecl?: {
    readonly id?: string;
    readonly name?: string;
    readonly type?: { readonly qualType?: string; readonly storage?: Storage; readonly storageId?: string };
  };
  readonly loc?: ClangLocation;
  readonly range?: { readonly begin?: ClangLocation; readonly end?: ClangLocation };
  readonly inner?: readonly ClangNode[];
};

export type WrappedNode = {
  readonly storage?: Storage;
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
  readonly returned?: { readonly callee: FunctionInfo; readonly statement: WrappedNode; readonly members: readonly string[] };
  readonly fold?: {
    readonly initial: WrappedNode;
    readonly statement: WrappedNode;
    readonly target: ExpressionPath;
    readonly source: ExpressionPath;
    readonly kind: 'borrow-preserved' | 'value-return';
    readonly invariantObservations: readonly WrappedNode[];
  };
};

export type TraceCandidate = {
  readonly mutation: WrappedNode;
  readonly orderOffset: number;
  readonly frames: readonly TraceFrame[];
  readonly wrapped?: boolean;
  // Evidence for this path only. Query-level evidence also covers alternatives
  // that produced no candidate and must survive candidate selection.
  readonly returnMapping?: ReturnMapping;
};

export type OriginCandidate = {
  readonly origin: WrappedNode;
  readonly kind: 'initialization' | 'parameter';
  readonly frames: readonly TraceFrame[];
  readonly boundary?: string;
  readonly returnMapping?: ReturnMapping;
};

export type CallerLink = {
  readonly prepared: PreparedAst;
  readonly callsite: WrappedNode;
  readonly caller: FunctionInfo;
};

export type AnalysisResult =
  | { readonly _tag: 'MutationFound'; readonly mutation: WrappedNode; readonly via: 'direct' | 'call'; readonly wrapped?: boolean; readonly frames?: readonly TraceFrame[]; readonly returnMapping?: ReturnMapping }
  | { readonly _tag: 'CandidatesFound'; readonly candidates: readonly TraceCandidate[] }
  | { readonly _tag: 'OriginCandidatesFound'; readonly candidates: readonly OriginCandidate[] }
  | { readonly _tag: 'OriginFound'; readonly origin: WrappedNode; readonly kind: 'initialization' | 'parameter'; readonly boundary?: string; readonly frames?: readonly TraceFrame[]; readonly returnMapping?: ReturnMapping }
  | { readonly _tag: 'AnalysisFailure'; readonly reason: string };

export type AnalysisOptions = {
  readonly file: string;
  readonly sourceText: string;
  readonly cursorByteOffset: number;
  readonly sourceTextByFile?: ReadonlyMap<string, string>;
  readonly externalCallers?: ReadonlyMap<ClangNode, readonly CallerLink[]>;
  readonly callerDiagnostics?: ReadonlyMap<ClangNode, readonly string[]>;
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
  readonly storageTypes: Readonly<Record<string, Storage>>;
  readonly storageByPath: ReadonlyMap<string, { readonly storage: Storage; readonly target: ExpressionPath }>;
  readonly storageIdentitiesByPath: ReadonlyMap<string, readonly string[]>;
  readonly storageBorrowsByFunctionId: ReadonlyMap<string, ReadonlyMap<string, readonly StorageBorrow[]>>;
  readonly aliasWritesByFunctionId: ReadonlyMap<string, readonly IndexedWrite[]>;
  readonly writesByFunctionId: ReadonlyMap<string, ReadonlyMap<string, readonly IndexedWrite[]>>;
  readonly writeBoundariesByFunctionId: ReadonlyMap<string, ReadonlyMap<string, readonly IndexedBoundary[]>>;
  readonly callsByCallerId: ReadonlyMap<string, readonly WrappedNode[]>;
  readonly constructionsByCallerId: ReadonlyMap<string, readonly WrappedNode[]>;
  readonly callsByCalleeId: ReadonlyMap<string, readonly WrappedNode[]>;
  readonly resolvedCalls: ReadonlyMap<ClangNode, FunctionInfo | undefined>;
  readonly returnsByFunctionId: ReadonlyMap<string, readonly WrappedNode[]>;
  readonly returnSourcesByFunctionId: ReadonlyMap<string, readonly ReturnBranch[]>;
  readonly identifiersByFile: ReadonlyMap<string, FileIdentifiers>;
  readonly callsByFile: ReadonlyMap<string, readonly WrappedNode[]>;
};

type IndexedWrite = {
  readonly mutation: WrappedNode;
  readonly target: ExpressionPath;
  readonly start: number;
};

type StorageBorrow = { readonly start: number; readonly end: number; readonly target: ExpressionPath };

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
      root: { node, file, ancestors, children: children.children,
        storage: node.type?.storage ?? ast.storageTypes?.[node.type?.storageId ?? ''] },
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

const buildIndex = (all: readonly WrappedNode[], storageTypes: Readonly<Record<string, Storage>>): AstIndex => {
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
    storageTypes,
    storageByPath: new Map<string, { readonly storage: Storage; readonly target: ExpressionPath }>(),
    storageIdentitiesByPath: new Map<string, readonly string[]>(),
    storageBorrowsByFunctionId: new Map<string, Map<string, StorageBorrow[]>>(),
    aliasWritesByFunctionId: new Map<string, IndexedWrite[]>(),
    writesByFunctionId: new Map<string, Map<string, IndexedWrite[]>>(),
    writeBoundariesByFunctionId: new Map<string, Map<string, IndexedBoundary[]>>(),
    callsByCallerId: new Map<string, WrappedNode[]>(),
    constructionsByCallerId: new Map<string, WrappedNode[]>(),
    callsByCalleeId: new Map<string, WrappedNode[]>(),
    resolvedCalls: new Map<ClangNode, FunctionInfo | undefined>(),
    returnsByFunctionId: new Map<string, WrappedNode[]>(),
    returnSourcesByFunctionId: new Map<string, readonly ReturnBranch[]>(),
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
    if (!owner || owner !== index.functionsById.get(owner.id) ||
        !(wrapped.node === owner.body.node || wrapped.ancestors.includes(owner.body.node))) return index;
    if (wrapped.node.kind === 'ReturnStmt' && owner === index.functionsById.get(owner.id)) {
      const returns = index.returnsByFunctionId.get(owner.id) ?? [];
      returns.push(wrapped);
      index.returnsByFunctionId.set(owner.id, returns);
    }
    const storagePath = wrapped.storage && ['DeclRefExpr', 'MemberExpr', 'UnaryOperator', 'ArraySubscriptExpr', 'CXXThisExpr'].includes(wrapped.node.kind)
      ? pathAt(wrapped, index) : null;
    if (storagePath) index.storageByPath.set(storagePathKey(storagePath), { storage: wrapped.storage!, target: storagePath });
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
      if (target.members.includes('*') && write && findDescendant(write, (expression) =>
        expression.node.kind === 'MemberExpr' && !!expression.node.arrow ||
        expression.node.kind === 'UnaryOperator' && expression.node.opcode === '*')) {
        const aliasWrites = index.aliasWritesByFunctionId.get(owner.id) ?? [];
        aliasWrites.push({ mutation: wrapped, target, start });
        index.aliasWritesByFunctionId.set(owner.id, aliasWrites);
      }
    }
    if (isCall(wrapped.node)) {
      if (!wrapped.node.storageOperation) argsOf(wrapped).reduce((index, input, parameterIndex) => {
        const effect = wrapped.node.callee?.parameterEffects?.[parameterIndex];
        const target = pathAt(input, index);
        const end = wrapped.node.range?.end?.offset;
        if (!target || start === undefined || end === undefined || effect === 'read' || effect === 'value' ||
            target.members.at(-1) !== '&' && effect !== 'write') return index;
        const byRoot = index.storageBorrowsByFunctionId.get(owner.id) ?? new Map<string, StorageBorrow[]>();
        const borrows = byRoot.get(target.rootId) ?? [];
        borrows.push({ start, end, target: { ...target, members: target.members.at(-1) === '&' ? target.members.slice(0, -1) : target.members } });
        byRoot.set(target.rootId, borrows);
        index.storageBorrowsByFunctionId.set(owner.id, byRoot);
        return index;
      }, index);
      const callers = index.callsByCallerId;
      const calls = callers.get(owner.id) ?? [];
      calls.push(wrapped);
      callers.set(owner.id, calls);
    }
    if (wrapped.node.kind === 'CXXConstructExpr' && !wrapped.node.fieldwiseCopy && !wrapped.node.construction?.storageBinding) {
      const constructions = index.constructionsByCallerId.get(owner.id) ?? [];
      constructions.push(wrapped);
      index.constructionsByCallerId.set(owner.id, constructions);
    }
    return index;
  }, index);

  index.calls.reduce((index, call) => {
    const callee = resolveFunction(call, index);
    index.resolvedCalls.set(call.node, callee);
    const owner = enclosingFunction(call, index);
    if (owner && owner !== index.functionsById.get(owner.id)) return index;
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
  [...index.aliasWritesByFunctionId.values()].reduce((index, writes) => {
    writes.sort((left, right) => right.start - left.start);
    return index;
  }, index);
  [...index.callsByCallerId.values()].reduce((index, calls) => {
    calls.sort((left, right) =>
      (right.node.range?.begin?.offset ?? -1) - (left.node.range?.begin?.offset ?? -1));
    return index;
  }, index);
  [...index.constructionsByCallerId.values()].reduce((index, constructions) => {
    constructions.sort((left, right) =>
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
  // Each selected path's type evidence is immutable preparation state. Reuse
  // ancestor identities at every relation check instead of rebuilding them per
  // aggregate field and per call. This cache contains no query-time provenance.
  [...index.storageByPath.values()].reduce((storageIdentitiesByPath, { target }) => {
    storageIdentitiesByPath.set(storagePathKey(target), targetStorageIdentities(target, index));
    return storageIdentitiesByPath;
  }, index.storageIdentitiesByPath);
  return { ...index, returnSourcesByFunctionId: buildReturnSources(index) };
};

export const prepareAst = (ast: ClangNode): PreparedAst => ({
  ast,
  index: buildIndex(buildTree(ast).all, ast.storageTypes ?? {})
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
      !['NoOp', 'LValueToRValue', 'FunctionToPointerDecay', 'ArrayToPointerDecay', 'ConstructorConversion'].includes(wrapped.node.castKind)) return wrapped;
  return unwrap(wrapped.children[0]);
};

export type ExpressionPath = {
  readonly rootId: string;
  readonly rootName: string;
  readonly members: readonly string[];
  readonly receiverStorageId?: string;
};

const storagePathKey = (target: ExpressionPath): string =>
  target.rootId + (target.receiverStorageId ? '@' + target.receiverStorageId : '') + ':' + target.members.join('.');

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
  if (node.kind === 'CXXThisExpr') return { rootId: '$this', rootName: 'this', members: [],
    receiverStorageId: wrapped.storage?.kind === 'pointer' ? wrapped.storage.pointee : undefined };
  if (node.storageOperation === 'borrow-reference') {
    const receiver = expressionPath(receiverOf(wrapped));
    return receiver ? appendMembers(receiver, ['*']) : null;
  }
  if (node.storageOperation === 'optional-arrow') {
    const receiver = expressionPath(receiverOf(wrapped));
    // Address of inline contained storage, not a separately owned pointee.
    return receiver ? appendMembers(receiver, ['&']) : null;
  }
  if (node.storageOperation === 'identity') {
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
    (member === '*' && members.at(-1) === '&' || member === '&' && members.at(-1) === '*')
      ? members.slice(0, -1) : [...members, member], target.members)
});

const resolveFunction = (call: WrappedNode, index: AstIndex): FunctionInfo | undefined => {
  if (call.node.callee?.virtual) return undefined;
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
  call.node.callee?.name === 'fold_left' ||
  call.children.slice(0, call.node.memberOperator ? 2 : 1).some((wrapped) =>
    findDescendant(wrapped, (wrapped) =>
      (wrapped.node.referencedDecl?.name ?? wrapped.node.name ?? '') === 'fold_left') !== undefined);

const foldFor = (fn: FunctionInfo, index: AstIndex): { readonly call: WrappedNode; readonly initial: WrappedNode; readonly extent?: number } | undefined => {
  const lambda = lambdaFor(fn, index);
  if (!lambda || fn.params.length === 0) return undefined;
  const callNode = [...lambda.ancestors].reverse().find(isCall);
  const call = callNode && index.wrappedByNode.get(callNode);
  const initial = call && argsOf(call).at(-2);
  const callback = call && argsOf(call).at(-1);
  return call && initial && callback && isFoldCall(call) &&
    !!findDescendant(callback, (wrapped) => wrapped.node === lambda.node)
    ? { call, initial, extent: argsOf(call).length >= 3 ? argsOf(call)[0].node.type?.extent : undefined } : undefined;
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
    _tag: 'NormalizedPath', target: appendMembers(normalizedPath, target.members)
  };
  const declaration = index.declarations.get(target.rootId);
  if (declaration?.node.kind !== 'VarDecl' || !/&/.test(declaration.node.type?.qualType ?? '')) return { _tag: 'NormalizedPath', target };
  const initial = expressionPath(declaration.children[0]);
  return initial
    ? resolveNormalizedPath(appendMembers(initial, target.members), index, [...visited, target.rootId])
    : { _tag: 'NormalizedPath', target };
};

const normalizePath = (target: ExpressionPath, index: AstIndex): ExpressionPath => {
  const normalizedPath = index.normalizedPaths.get(target.rootId);
  if (normalizedPath) return appendMembers(normalizedPath, target.members);
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

// Used only to stop a search. An address or callback reaching a target does
// not prove its storage identity, invocation time, or mutation location.
const exposesTarget = (input: WrappedNode | undefined, target: ExpressionPath, index: AstIndex,
  visited: readonly string[] = [], sharedValue = false): boolean => {
  const expression = unwrap(input);
  if (!expression) return false;
  if (expression.node.storageOperation === 'borrow-reference') return bindsTarget(expression, target, index, visited,
    expression.node.range?.begin?.offset ?? Number.POSITIVE_INFINITY).kind !== 'unrelated';
  if (expression.node.kind === 'LambdaExpr') {
    const exposed = !!expression.node.captures?.some((capture) => {
      const declaration = index.declarations.get(capture.id);
      const shared = capture.kind === 'reference' || opaqueCopy(capture, []) || !!capture.copyBoundaries?.length;
      return shared && (captureMatches(capture, target, index) || visited.includes(capture.id) ||
        !!declaration && exposesTarget(declaration.children[0], target, index, [...visited, capture.id]));
    }) || target.rootId === '$this' && expression.node.thisCapture === 'pointer';
    if (!exposed) return false;
    const method = expression.children.flatMap((record) => record.children).find((method) =>
      method.node.kind === 'CXXMethodDecl' && method.node.name === 'operator()');
    const fn = method && index.functionsByNode.get(method.node);
    // A read-only callback is harmless regardless of when it is invoked. This
    // proves effects only; backward capture tracing still requires a call time.
    return !fn || visited.includes(fn.id) || /[&*].*\(/.test(fn.type) ||
      !!findPreviousMutation(fn, target, Number.POSITIVE_INFINITY, index, new Map(), [...visited]);
  }
  const argument = pathAt(expression, index);
  if (argument) {
    const members = argument.members.at(-1) === '&' ? argument.members.slice(0, -1) : argument.members;
    if (argument.rootId === target.rootId)
      return sameOrParent(members, target.members) || sameOrParent(target.members, members);
    if (visited.includes(argument.rootId) || expression.storage?.kind === 'elements') return false;
    const declaration = index.declarations.get(argument.rootId);
    const targetDeclaration = index.declarations.get(target.rootId);
    const borrowedType = (declaration: WrappedNode | undefined): string | undefined => {
      if (declaration?.node.kind !== 'ParmVarDecl') return undefined;
      const storage = declaration.storage;
      if (storage) return storage.kind === 'pointer' || storage.kind === 'reference' ? storage.pointee : undefined;
      const type = declaration.node.type?.qualType;
      return declaration.node.kind === 'ParmVarDecl' && type && /[&*]/.test(type)
        ? type.replace(/\b(const|volatile|struct|class)\b|[&*\s]/g, '') : undefined;
    };
    const argumentType = borrowedType(declaration);
    if (argumentType && argumentType === borrowedType(targetDeclaration)) return true;
    const initial = declaration && unwrap(declaration.children[0]);
    // A factory can retain a borrow in foreign storage that C++ fields do not
    // describe (for example a host-copy ticket). Preserve explicit provenance
    // from its arguments; fieldwise value copies use the storage rules above.
    const factory = initial && isCall(initial.node) &&
      (!initial.node.storageOperation || initial.node.storageOperation === 'borrow-projection');
    return storesTargetReference(expression, target, index, visited) ||
      !!initial && sharedValue && (factory || !declaration?.storage) &&
        exposesTarget(initial, target, index, [...visited, argument.rootId], sharedValue);
  }
  return expression.children.some((child) => exposesTarget(child, target, index, visited, sharedValue));
};

// Reachability is a proof about storage, not a guessed mutation location.
// Unknown values preserve a boundary; they never become an exact alias path.

type StoredValue =
  | { readonly _tag: 'Value'; readonly expression: WrappedNode; readonly members: readonly string[]; readonly before: number }
  | { readonly _tag: 'Unknown' };

// A declaration initializer is valid only until a subsequent write. Branches,
// calls through a writable borrow, and unrepresentable writes invalidate it.
const storedValue = (argument: ExpressionPath, before: number, index: AstIndex, bindingOnly = false): StoredValue => {
  const declaration = index.declarations.get(argument.rootId);
  const fn = declaration && enclosingFunction(declaration, index);
  if (!declaration || !fn || declaration.node.kind !== 'VarDecl') return { _tag: 'Unknown' };
  const writes = index.writesByFunctionId.get(fn.id)?.get(argument.rootId) ?? [];
  const write = bindingOnly ? undefined : writes.find((write) => write.start < before && sameOrParent(write.target.members, argument.members));
  const after = write?.start ?? declaration.node.range?.begin?.offset ?? -1;
  const uncertainWrite = index.writeBoundariesByFunctionId.get(fn.id)?.get(argument.rootId)?.some((write) =>
    write.start > after && write.start < before);
  const uncertainCall = index.storageBorrowsByFunctionId.get(fn.id)?.get(argument.rootId)?.some((borrow) =>
    borrow.start > after && borrow.end < before && sameOrParent(borrow.target.members, argument.members));
  if (!bindingOnly && (uncertainWrite || uncertainCall)) return { _tag: 'Unknown' };
  if (write) {
    if (write.mutation.node.kind !== 'BinaryOperator' || write.mutation.node.opcode !== '=' ||
        write.mutation.ancestors.some((node) => ['IfStmt', 'SwitchStmt', 'ConditionalOperator',
          'ForStmt', 'WhileStmt', 'DoStmt', 'CXXForRangeStmt'].includes(node.kind))) return { _tag: 'Unknown' };
    const expression = write.mutation.children[1];
    return expression ? { _tag: 'Value', expression, members: argument.members.slice(write.target.members.length), before: write.start }
      : { _tag: 'Unknown' };
  }
  return declaration.children[0] ? { _tag: 'Value', expression: declaration.children[0], members: argument.members,
      before: (declaration.children[0].node.range?.end?.offset ?? before) + 1 }
    : { _tag: 'Unknown' };
};

// before freezes copied values; accessBefore remains the later use point for
// contents reached through addresses and references.
// Project a shared field through aggregate initialization and genuine fieldwise
// copies. Ordinary value fields never enter this traversal.
const projectedStorage = (input: WrappedNode, members: readonly string[], storage: Storage, target: ExpressionPath,
  before: number, index: AstIndex, visited: readonly string[], accessBefore = before): StorageRelation => {
  const expression = unwrap(input);
  if (!expression) return unknownStorageRelation(storage, target, index);
  if (!members.length) return storedRelation(expression, storage, target, before, index, visited, accessBefore);
  if (expression.node.kind === 'InitListExpr' && expression.node.aggregateFields) {
    const fieldIndex = expression.node.aggregateFields.indexOf(members[0]);
    const field = expression.children[fieldIndex];
    return field ? projectedStorage(field, members.slice(1), storage, target, before, index, visited, accessBefore) : unknownStorageRelation(storage, target, index);
  }
  if (expression.node.kind === 'CXXConstructExpr' && expression.node.fieldwiseCopy && expression.children[0])
    return projectedStorage(expression.children[0], members, storage, target, before, index, visited, accessBefore);
  const argument = pathAt(expression, index);
  return argument ? storedPathRelation(appendMembers(argument, members), storage, target, before, index, visited, accessBefore) : unknownStorageRelation(storage, target, index);
};

// Projection uses declaration storage and field type references when Clang
// omits an intermediate expression (notably the * in p->field).
const storageAt = (target: ExpressionPath, index: AstIndex): Storage | undefined => {
  const declaration = index.declarations.get(target.rootId);
  const storage = target.rootId === '$this' ? index.storageTypes[target.receiverStorageId ?? ''] : declaration?.storage;
  const project = (storage: Storage | undefined, members: readonly string[]): Storage | undefined => {
    if (!storage || !members.length) return storage;
    if (storage.kind === 'reference') return project(index.storageTypes[storage.pointee], members);
    const member = members[0];
    if (storage.kind === 'pointer' && member === '*') return project(index.storageTypes[storage.pointee], members.slice(1));
    if (storage.kind === 'array' && /^\[\d+\]$/.test(member)) return project(index.storageTypes[storage.element], members.slice(1));
    if (storage.kind === 'aggregate') {
      const field = storage.fields.find((field) => field.name === member);
      return field && project(index.storageTypes[field.storageId], members.slice(1));
    }
    return undefined;
  };
  return project(storage, target.members) ?? index.storageByPath.get(storagePathKey(target))?.storage;
};

const targetStorageIdentities = (target: ExpressionPath, index: AstIndex): readonly string[] =>
  Array.from({ length: target.members.length + 1 }, (_, length) => {
    const storage = storageAt({ ...target, members: target.members.slice(0, length) }, index);
    return storage ? [storage.identity, ...(storage.kind === 'pointer' && (target.members[length] === '*' || target.rootId === '$this')
      ? [storage.pointee] : [])] : [];
  }).flat();

const unknownStorageRelation = (storage: Storage, target: ExpressionPath, index: AstIndex): StorageRelation =>
  unknownRelation(storage, index.storageIdentitiesByPath.get(storagePathKey(target)) ??
    targetStorageIdentities(target, index));

const storedPathRelation = (argument: ExpressionPath, storage: Storage, target: ExpressionPath,
  before: number, index: AstIndex, visited: readonly string[], accessBefore = before): StorageRelation => {
  if (storage.kind === 'value' || !storage.shared) return unrelated;
  if (storage.kind === 'aggregate') return combineRelations(storage.fields.map((field) => {
    const storage = index.storageTypes[field.storageId];
    return storage ? storedPathRelation(appendMembers(argument, [field.name]), storage, target, before, index, visited, accessBefore)
      : incomplete('field-type');
  }));
  const pointee = appendMembers(argument, ['*']);
  if (argument.rootId === target.rootId)
    return affects(pointee.members, target.members) ? reachable : unrelated;
  const key = argument.rootId + ':' + argument.members.join('.');
  if (visited.includes(key)) return incomplete('provenance');
  const value = storedValue(argument, before, index, storage.kind === 'reference');
  return value._tag === 'Unknown' ? unknownStorageRelation(storage, target, index)
    : projectedStorage(value.expression, value.members, storage, target, value.before, index, [...visited, key], accessBefore);
};

type ReferenceBinding =
  | { readonly _tag: 'Bound'; readonly argument: ExpressionPath; readonly before: number }
  | { readonly _tag: 'Unknown' };

// A C++ reference freezes its lvalue at initialization; later assignments to
// a pointer used by that initializer do not rebind the reference.
const referenceBinding = (argument: ExpressionPath, before: number, index: AstIndex,
  visited: readonly string[] = []): ReferenceBinding => {
  if (visited.includes(argument.rootId)) return { _tag: 'Unknown' };
  const declaration = index.declarations.get(argument.rootId);
  if (declaration?.node.kind !== 'VarDecl' || declaration.storage?.kind !== 'reference')
    return { _tag: 'Bound', argument, before };
  const initial = declaration.children[0];
  const initialPath = expressionPath(initial);
  return initialPath ? referenceBinding(appendMembers(initialPath, argument.members),
    (initial.node.range?.end?.offset ?? before) + 1, index, [...visited, argument.rootId]) : { _tag: 'Unknown' };
};

const bindsTarget = (input: WrappedNode | undefined, target: ExpressionPath, index: AstIndex,
  visited: readonly string[] = [], before = Number.POSITIVE_INFINITY, accessBefore = before): StorageRelation => {
  const argumentRaw = expressionPath(input);
  if (!argumentRaw) return incomplete('provenance');
  const binding = referenceBinding(argumentRaw, before, index);
  if (binding._tag === 'Unknown') return incomplete('provenance');
  const argument = binding.argument;
  if (argument.rootId === target.rootId && affects(argument.members, target.members)) return reachable;
  const dereference = argument.members.indexOf('*');
  if (dereference >= 0) {
    const pointer = { ...argument, members: argument.members.slice(0, dereference) };
    const storage = storageAt(pointer, index);
    return storage ? storedPathRelation(pointer, storage, target, binding.before, index, visited, accessBefore) : incomplete('provenance');
  }
  // Borrowing a pointer variable or an aggregate can also expose its pointees.
  const expression = unwrap(input);
  const storage = expression?.storage;
  return expression && storage ? storedRelation(expression, storage, target, accessBefore, index, visited, accessBefore) : unrelated;
};

const storedRelation = (input: WrappedNode, storage: Storage, target: ExpressionPath,
  before: number, index: AstIndex, visited: readonly string[], accessBefore = before): StorageRelation => {
  const expression = unwrap(input);
  if (!expression || storage.kind === 'value' || !storage.shared) return unrelated;
  if (storage.kind === 'reference') return bindsTarget(expression, target, index, visited, before, accessBefore);
  if (expression.node.storageOperation === 'fresh') return combineRelations(argsOf(expression).map((child) =>
    storesTargetRelation(child, target, index, before, visited, accessBefore)));
  if (expression.node.storageOperation === 'bind-reference')
    return bindsTarget(expression.children[1], target, index, visited, before, accessBefore);
  if (expression.node.storageOperation === 'identity' && expression.children[1])
    return storedRelation(expression.children[1], storage, target, before, index, visited, accessBefore);
  if (expression.node.kind === 'CXXConstructExpr') {
    if (storage.kind === 'elements' && expression.children.every((child) => child.node.kind === 'CXXDefaultArgExpr')) return unrelated;
    if (expression.node.copyOrMove && expression.children[0])
      return storedRelation(expression.children[0], storage, target, before, index, visited, accessBefore);
    // Callable construction stores the supplied closure. In contrast, arbitrary
    // opaque constructors do not establish a complete field/provenance map.
    if (storage.kind === 'callable') return combineRelations(expression.children.map((child) =>
      storesTargetRelation(child, target, index, before, visited, accessBefore)));
    if (expression.node.construction?.storageBinding) return combineRelations(expression.children.map((child) =>
      storage.kind === 'reference-wrapper' || storage.kind === 'view' && unwrap(child)?.storage?.kind === 'array'
        ? bindsTarget(child, target, index, visited, before, accessBefore)
        : storesTargetRelation(child, target, index, before, visited, accessBefore)));
  }
  if (expression.node.kind === 'UnaryOperator' && expression.node.opcode === '&')
    return bindsTarget(expression.children[0], target, index, visited, before, accessBefore);
  if (['CXXNullPtrLiteralExpr', 'GNUNullExpr', 'IntegerLiteral', 'ImplicitValueInitExpr'].includes(expression.node.kind)) return unrelated;
  if (expression.node.kind === 'InitListExpr' && storage.kind === 'aggregate')
    return combineRelations(storage.fields.map((field) => {
      const storage = index.storageTypes[field.storageId];
      return storage ? projectedStorage(expression, [field.name], storage, target, before, index, visited, accessBefore) : incomplete('field-type');
    }));
  const argument = pathAt(expression, index);
  return argument ? storedPathRelation(argument, storage, target, before, index, visited, accessBefore)
    : unknownStorageRelation(storage, target, index);
};

const storesTargetRelation = (input: WrappedNode | undefined, target: ExpressionPath, index: AstIndex,
  before: number, visited: readonly string[] = [], accessBefore = before): StorageRelation => {
  const expression = unwrap(input);
  if (!expression) return unrelated;
  if (expression.node.kind === 'LambdaExpr') return exposesTarget(expression, target, index, visited) ? incomplete('provenance') : unrelated;
  const storage = expression.storage;
  // Legacy hand-built ASTs have no storage metadata. Preserve address evidence
  // without inventing semantics for type spellings.
  if (!storage) return expression.node.kind === 'UnaryOperator' && expression.node.opcode === '&'
    ? bindsTarget(expression.children[0], target, index, visited, before, accessBefore) : unrelated;
  return storedRelation(expression, storage, target, before, index, visited, accessBefore);
};

const storesTargetReference = (input: WrappedNode | undefined, target: ExpressionPath, index: AstIndex,
  visited: readonly string[] = [], before = input?.node.range?.begin?.offset ?? Number.POSITIVE_INFINITY): boolean =>
  storesTargetRelation(input, target, index, before, visited).kind !== 'unrelated';

const callEffectBoundary = (call: WrappedNode, callee: FunctionInfo | undefined,
  target: ExpressionPath, index: AstIndex, visitedFunctionIds: readonly string[]): string | undefined => {
  if (call.node.storageOperation === 'borrow-reference') {
    const writable = call.ancestors.some((node) => {
      const wrapped = index.wrappedByNode.get(node);
      const write = wrapped && writeTarget(wrapped);
      return write && !!findDescendant(write, (expression) => expression.node === call.node) ||
        node.kind === 'VarDecl' && wrapped?.storage?.kind === 'reference';
    });
    return writable && exposesTarget(receiverOf(call), target, index, visitedFunctionIds)
      ? 'Unverified call effect on ' + target.rootName + '.' + target.members.join('.') +
        ': ' + call.node.callee?.name + '; writes through a retained reference are not verified.' : undefined;
  }
  if (call.node.storageOperation === 'borrow-projection') {
    const retained = call.ancestors.some((node) => {
      const wrapped = index.wrappedByNode.get(node);
      const write = wrapped && writeTarget(wrapped);
      return write && !!findDescendant(write, (expression) => expression.node === call.node) ||
        node.kind === 'VarDecl' && (wrapped?.storage?.kind === 'reference' || wrapped?.storage?.kind === 'pointer');
    });
    const directlyBorrowed = argsOf(call).some((argument) => {
      const argumentPath = pathAt(argument, index);
      const members = argumentPath?.members.at(-1) === '&' ? argumentPath.members.slice(0, -1)
        : argumentPath && appendMembers(argumentPath, ['*']).members;
      return argumentPath?.rootId === target.rootId && !!members && affects(members, target.members);
    });
    return retained && directlyBorrowed ? 'Unverified call effect on ' + target.rootName + '.' + target.members.join('.') +
      ': ' + call.node.callee?.name + '; retained variant projection identity is not verified.' : undefined;
  }
  if (call.node.storageOperation) return undefined;
  if (standardMutationTarget(call)) {
    // The receiver write itself is already indexed as the call. Only an
    // argument storing the target's address or reference can redirect later
    // writes to the target; skipping that check would return a stale mutation
    // from before the escape.
    const relation = argsOf(call).reduce<StorageRelation>((relation, argument) => relation.kind === 'unrelated'
      ? storesTargetRelation(argument, target, index, argument.node.range?.begin?.offset ?? Number.POSITIVE_INFINITY, visitedFunctionIds)
      : relation, unrelated);
    return relation.kind === 'unrelated' ? undefined
      : 'Unverified call effect on ' + target.rootName + '.' + target.members.join('.') + ': ' +
        (call.node.callee?.name ?? 'container operation') + ' possibly stores the target address or reference; ' +
        'later container-mediated mutations are not verified; ' + relationEvidence(relation) + '.';
  }
  const argumentsExposed = argsOf(call).some((argument, parameterIndex) => {
    const parameter = callee?.params[parameterIndex];
    const effect = parameter?.node.parameterEffect ?? call.node.callee?.parameterEffects?.[parameterIndex];
    if (effect === 'value' || effect === 'read') return false;
    const argumentPath = pathAt(argument, index);
    if (effect === 'pointee' && argumentPath?.rootId === target.rootId &&
        argumentPath.members.at(-1) !== '&' && !target.members.slice(argumentPath.members.length).includes('*')) return false;
    if (!exposesTarget(argument, target, index, visitedFunctionIds, effect === 'shared')) return false;
    if (callee && parameter && argumentPath && argumentPath.rootId !== target.rootId && effect !== 'shared') {
      const members = target.members[0] === '*' ? target.members.slice(1) : target.members;
      return visitedFunctionIds.includes(callee.id) || !!findPreviousMutation(callee, {
        rootId: parameter.node.id ?? '', rootName: parameter.node.name ?? '',
        members: effect === 'pointee' ? ['*', ...members] : members
      }, Number.POSITIVE_INFINITY, index, new Map(), visitedFunctionIds);
    }
    // A known plain borrow is handled by recursive effect tracing. Aggregate
    // and callable arguments still need a boundary when no path is expressible.
    return !callee || call.node.callee?.virtual || effect === 'shared' || !argumentPath || argumentPath.rootId !== target.rootId ||
      !!findDescendant(argument, (expression) => expression.node.kind === 'LambdaExpr');
  });
  const receiver = receiverOf(call);
  // Element-mediated effects are bounded at the insertion which introduced
  // the alias. A later operator[] is not evidence of a new target association.
  const receiverEffect = (): boolean => {
    if (!callee || call.node.callee?.virtual) return true;
    if (receiverPath(call, index)?.rootId === target.rootId) return false;
    const members = target.members[0] === '*' ? target.members.slice(1) : target.members;
    return visitedFunctionIds.includes(callee.id) || !!findPreviousMutation(callee, {
      rootId: '$this', rootName: 'this', members, receiverStorageId: callee.wrapped.node.receiverStorageId
    }, Number.POSITIVE_INFINITY, index, new Map(), visitedFunctionIds);
  };
  const receiverExposed = call.node.callee?.receiverEffect !== 'read' &&
    exposesTarget(receiver, target, index, visitedFunctionIds) && receiverEffect();
  return argumentsExposed || receiverExposed
    ? 'Unverified call effect on ' + target.rootName + '.' + target.members.join('.') +
      ': ' + (call.node.callee?.name ?? 'indirect call') + '; shared storage or callback effects are not verified.'
    : undefined;
};

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

// Distinct switch labels alone do not exclude fallthrough. Only a case whose
// body exits the function proves that it cannot precede another case's read.
const exclusiveSwitchCase = (statement: WrappedNode, observation: WrappedNode | undefined, index: AstIndex): boolean => {
  if (!observation) return false;
  return statement.ancestors.some((ancestor) => {
    if (ancestor.kind !== 'SwitchStmt' || !observation.ancestors.includes(ancestor)) return false;
    const caseFor = (wrapped: WrappedNode) => wrapped.ancestors.slice(wrapped.ancestors.indexOf(ancestor) + 1)
      .find((node) => node.kind === 'CaseStmt' || node.kind === 'DefaultStmt');
    const statementCase = caseFor(statement);
    const observationCase = caseFor(observation);
    const statementBody = statementCase && index.wrappedByNode.get(statementCase)?.children.at(-1);
    return !!statementCase && !!observationCase && statementCase !== observationCase &&
      !!statementBody && exitsSequentialBlock(statementBody);
  });
};

const variantAlternatives = (input: WrappedNode | undefined, before: number, observations: readonly WrappedNode[],
  index: AstIndex, visited: readonly string[] = []): readonly string[] | undefined => {
  const expression = unwrap(input);
  if (!expression) return undefined;
  if (expression.node.variantAlternative) return [expression.node.variantAlternative];
  if (expression.node.storageOperation === 'identity' || expression.node.kind === 'CXXConstructExpr' && expression.node.fieldwiseCopy)
    return variantAlternatives(expression.children[expression.node.storageOperation === 'identity' ? 1 : 0], before, observations, index, visited);
  const target = pathAt(expression, index);
  if (target) {
    if (target.members.length || visited.includes(target.rootId)) return undefined;
    const declaration = index.declarations.get(target.rootId);
    const owner = declaration && enclosingFunction(declaration, index);
    // A retained alias can replace the variant through another root. The local
    // initializer alone does not establish its active alternative afterwards.
    const retained = [...index.declarations.values()].some((alias) => {
      if (alias.node.kind !== 'VarDecl' || !['pointer', 'reference'].includes(alias.storage?.kind ?? '') ||
          enclosingFunction(alias, index)?.id !== owner?.id || (alias.node.range?.begin?.offset ?? before) >= before) return false;
      const initial = pathAt(alias.children[0], index);
      return initial?.rootId === target.rootId && (initial.members.length === 0 ||
        initial.members.length === 1 && initial.members[0] === '&');
    });
    if (retained) return undefined;
    const stored = storedValue(target, before, index);
    return stored._tag === 'Value' && !stored.members.length
      ? variantAlternatives(stored.expression, stored.before, observations, index, [...visited, target.rootId]) : undefined;
  }
  const callee = isCall(expression.node) && resolveFunction(expression, index);
  if (!callee || visited.includes(callee.id)) return undefined;
  const branches = (index.returnsByFunctionId.get(callee.id) ?? []).filter((statement) => reachableReturn(statement, index) &&
    !observations.some((observation) => exclusiveSwitchCase(statement, observation, index)));
  const alternatives = branches.map((statement) => variantAlternatives(statement.children[0],
    statement.node.range?.begin?.offset ?? before, observations, index, [...visited, callee.id]));
  return alternatives.length && alternatives.every((alternative) => alternative !== undefined) ? alternatives.flatMap((alternative) => alternative!) : undefined;
};

// A type-based get_if in an if initializer is false when every reachable
// construction of the unchanged variant selected another alternative. Unknown
// returns, writes, retained borrows and condition shapes keep the boundary.
const excludedVariantBranch = (statement: WrappedNode, observations: readonly WrappedNode[], index: AstIndex): boolean =>
  statement.ancestors.some((ancestor, position) => {
    if (ancestor.kind !== 'IfStmt' || ancestor.hasElse === undefined) return false;
    const conditional = index.wrappedByNode.get(ancestor);
    const then = conditional?.children.at(ancestor.hasElse ? -2 : -1);
    const condition = conditional?.children.at(ancestor.hasElse ? -3 : -2);
    if (!then || !condition || (statement.ancestors[position + 1] ?? statement.node) !== then.node) return false;
    const conditionReference = condition.node.kind === 'ImplicitCastExpr' && condition.node.castKind === 'PointerToBoolean'
      ? pathAt(condition.children[0], index) : null;
    const declaration = conditionReference && index.declarations.get(conditionReference.rootId);
    const projection = declaration?.node.kind === 'VarDecl' && unwrap(declaration.children[0]);
    if (!projection || !projection.node.variantProjection || conditionReference!.members.length ||
        !declaration!.ancestors.includes(ancestor)) return false;
    const argument = unwrap(argsOf(projection)[0]);
    if (argument?.node.kind !== 'UnaryOperator' || argument.node.opcode !== '&') return false;
    const alternatives = variantAlternatives(argument.children[0], statement.node.range?.begin?.offset ?? Number.POSITIVE_INFINITY,
      observations, index);
    return !!alternatives?.length && !alternatives.includes(projection.node.variantProjection);
  });

const findPreviousMutation = (
  fn: FunctionInfo,
  target: ExpressionPath,
  beforeOffset: number,
  index: AstIndex,
  sourceTextByFile: ReadonlyMap<string, string>,
  visitedFunctionIds: readonly string[] = [],
  observation?: WrappedNode,
  observations: readonly WrappedNode[] = []
): PreviousMutation | undefined => {
  if (visitedFunctionIds.includes(fn.id)) return undefined;
  const nextVisited = [...visitedFunctionIds, fn.id];
  const excluded = (statement: WrappedNode): boolean => exclusiveSwitchCase(statement, observation, index) ||
    observations.some((observation) => exclusiveSwitchCase(statement, observation, index)) ||
    excludedVariantBranch(statement, observations, index);
  const writes = index.writesByFunctionId.get(fn.id)?.get(target.rootId) ?? [];
  const directWrite = findFirstMapped(writes, (write) => {
    if (excluded(write.mutation)) return undefined;
    if (!affects(write.target.members, target.members)) return undefined;
    const range = nodeRange(write.mutation, sourceTextByFile);
    return range !== null && range.end <= beforeOffset ? write : undefined;
  }, firstAtMost(writes, beforeOffset, (write) => write.start));
  const direct: MutationCandidate | undefined = directWrite && {
    _tag: 'Mutation', mutation: directWrite.mutation, orderOffset: directWrite.start, frames: []
  };
  const calls = index.callsByCallerId.get(fn.id) ?? [];
  const callStart = (call: WrappedNode): number => call.node.range?.begin?.offset ?? -1;
  const callCandidate = findFirstMapped(calls, (call): { readonly result: PreviousMutation; readonly evaluationRange: { readonly start: number; readonly end: number } } | undefined => {
    if (excluded(call)) return undefined;
    const callRange = nodeRange(call, sourceTextByFile);
    if (!callRange || callRange.end > beforeOffset) return undefined;
    // A completed assignment takes effect after its RHS calls. A call nested
    // in that write cannot replace the write as the most recent transition.
    const directRange = directWrite && nodeRange(directWrite.mutation, sourceTextByFile);
    if (directRange && directRange.start <= callRange.start && directRange.end >= callRange.end) return undefined;
    const callee = resolveFunction(call, index);
    const boundary = callEffectBoundary(call, callee, target, index, nextVisited);
    const boundaryResult: MutationBoundary | undefined = boundary ? { _tag: 'MutationBoundary', orderOffset: callRange.start,
      reason: call.file + ':' + callRange.start + ': ' + boundary } : undefined;
    if (!callee) return boundaryResult && { result: boundaryResult, evaluationRange: callRange };
    const args = argsOf(call);
    const parameterTargets = callee.params.flatMap((parameter, parameterIndex) => {
      if (!isReferenceOrPointer(parameter)) return [];
      const argument = pathAt(args[parameterIndex], index);
      if (!argument || argument.rootId !== target.rootId) return [];
      const address = argument.members.at(-1) === '&';
      const argumentMembers = address ? argument.members.slice(0, -1) : argument.members;
      // Rebinding a pointer passed by value changes only the callee's pointer.
      if (!address && /\*/.test(parameter.node.type?.qualType ?? '') &&
          !/&/.test(parameter.node.type?.qualType ?? '') &&
          !target.members.slice(argumentMembers.length).includes('*')) return [];
      if (!sameOrParent(argumentMembers, target.members) &&
          !(sameOrParent(target.members, argumentMembers) && !argumentMembers.slice(target.members.length).includes('*'))) return [];
      const pointerValue = /\*/.test(parameter.node.type?.qualType ?? '') && !/&/.test(parameter.node.type?.qualType ?? '');
      return [{ _tag: pointerValue ? 'PointerValueTarget' as const : 'BorrowedTarget' as const,
        frame: { callsite: call, caller: fn, parameterIndex, argument: target } satisfies TraceFrame,
        target: { rootId: parameter.node.id ?? '', rootName: parameter.node.name ?? '',
          members: [...(address ? ['*'] : []), ...target.members.slice(argumentMembers.length)] } }];
    });
    const receiver = receiverPath(call, index);
    const receiverTargets = receiver?.rootId === target.rootId && affects(receiver.members, target.members)
      ? [{ _tag: 'BorrowedTarget' as const, frame: { callsite: call, caller: fn, receiver: target } satisfies TraceFrame,
        target: { rootId: '$this', rootName: 'this', members: target.members.slice(receiver.members.length),
          receiverStorageId: callee.wrapped.node.receiverStorageId } }]
      : [];
    const lambda = lambdaFor(callee, index);
    const capture = lambda?.node.captures?.find((capture) => captureMatches(capture, target, index));
    const declaration = index.declarations.get(target.rootId);
    const owner = declaration && enclosingFunction(declaration, index);
    const defaultReference = lambda?.node.captureDefault === 'reference' && owner &&
      callee.wrapped.ancestors.some((node) => node.id === owner.id);
    const capturedTargets = capture?.kind === 'reference' || (!capture && defaultReference)
      ? [{ _tag: 'BorrowedTarget' as const, target, frame: { callsite: call, caller: fn } satisfies TraceFrame }] : [];
    const nested = [...parameterTargets, ...receiverTargets, ...capturedTargets].reduce<PreviousMutation | undefined>((latest, mapped) => {
      if (latest?.orderOffset === callRange.start) return latest;
      const target = mapped.target;
      if (mapped._tag === 'PointerValueTarget') {
        const binding = findPreviousMutation(callee, { ...target, members: [] }, Number.POSITIVE_INFINITY,
          index, sourceTextByFile, nextVisited);
        if (binding) {
          const writes = index.writesByFunctionId.get(callee.id)?.get(target.rootId) ?? [];
          const pointeeEffect = writes.some((write) => write.target.members.includes('*')) ||
            !!index.writeBoundariesByFunctionId.get(callee.id)?.get(target.rootId)?.length ||
            !!index.callsByCallerId.get(callee.id)?.length || !!index.constructionsByCallerId.get(callee.id)?.length;
          return pointeeEffect ? { _tag: 'MutationBoundary', orderOffset: callRange.start,
            reason: 'Pointer was rebound inside a value parameter; caller pointee identity is not verified.' } : latest;
        }
      }
      const nested = findPreviousMutation(callee, target, Number.POSITIVE_INFINITY, index, sourceTextByFile, nextVisited, undefined, observations);
      if (!nested) return latest;
      return nested._tag === 'MutationBoundary' ? { ...nested, orderOffset: callRange.start }
        : { ...nested, orderOffset: callRange.start, frames: [mapped.frame, ...nested.frames] };
    }, undefined);
    // Recursive tracing sees the callee's own ordering, including later calls
    // and aliased writes. A verified later write can supersede an uncertain
    // alias at call entry; a missing mapping keeps the call-site boundary.
    const result = nested?._tag === 'Mutation' ? nested : boundaryResult ?? nested;
    return result && { result, evaluationRange: callRange };
  }, firstAtMost(calls, beforeOffset, callStart), direct ? firstAtMost(calls, direct.orderOffset, callStart) : calls.length);
  const candidate = callCandidate?.result ?? direct;
  const constructions = index.constructionsByCallerId.get(fn.id) ?? [];
  const construction = findFirstMapped(constructions, (construction): MutationBoundary | undefined => {
    if (excluded(construction)) return undefined;
    const range = nodeRange(construction, sourceTextByFile);
    if (!range || range.end > beforeOffset) return undefined;
    const directRange = directWrite && nodeRange(directWrite.mutation, sourceTextByFile);
    if (directRange && directRange.start <= range.start && directRange.end >= range.end) return undefined;
    // Argument construction completes before the enclosing call's body effect.
    const evaluationRange = callCandidate?.evaluationRange;
    if (evaluationRange && evaluationRange.start <= range.start && evaluationRange.end >= range.end) return undefined;
    const exposed = construction.children.some((argument, parameterIndex) => {
      const effect = construction.node.construction?.parameterEffects[parameterIndex];
      return effect !== 'read' && effect !== 'value' && exposesTarget(argument, target, index, nextVisited, effect === 'shared');
    });
    return exposed ? { _tag: 'MutationBoundary', orderOffset: range.start,
      reason: construction.file + ':' + range.start + ': Unverified call effect in constructor ' +
        (construction.node.construction?.name ?? '(unknown)') + '; shared storage or callback effects are not verified.' } : undefined;
  }, firstAtMost(constructions, beforeOffset, callStart), candidate ? firstAtMost(constructions, candidate.orderOffset, callStart) : constructions.length);
  const latest = construction ?? candidate;
  const aliasWrites = index.aliasWritesByFunctionId.get(fn.id) ?? [];
  const aliasWrite = findFirstMapped(aliasWrites, (write): MutationBoundary | undefined => {
    if (excluded(write.mutation)) return undefined;
    const writePointer = write.target.members.slice(0, write.target.members.lastIndexOf('*') + 1);
    const targetPointer = target.members.slice(0, target.members.lastIndexOf('*') + 1);
    // One pointer identifies one object; its distinct ordinary fields stay
    // disjoint. Different pointer values still require an alias proof.
    if (write.target.rootId === target.rootId && writePointer.length === targetPointer.length &&
        sameOrParent(writePointer, targetPointer)) return undefined;
    const range = nodeRange(write.mutation, sourceTextByFile);
    const expression = writeTarget(write.mutation);
    if (!range || range.end > beforeOffset || !expression) return undefined;
    const exposed = bindsTarget(expression, target, index, nextVisited, write.start).kind !== 'unrelated';
    return exposed ? { _tag: 'MutationBoundary', orderOffset: write.start,
      reason: write.mutation.file + ':' + write.start + ': Unverified aliased write; target storage identity is not verified.' } : undefined;
  }, firstAtMost(aliasWrites, beforeOffset, (write) => write.start),
  latest ? firstAtMost(aliasWrites, latest.orderOffset, (write) => write.start) : aliasWrites.length);
  const barrier = mutationBarrier(fn, target, beforeOffset, index, latest?.orderOffset);
  const latestWithAlias = aliasWrite ?? latest;
  return barrier && (!latestWithAlias || latestWithAlias.orderOffset <= barrier.start)
    ? { _tag: 'MutationBoundary', orderOffset: barrier.start, reason: fn.file + ':' + barrier.start + ': ' + barrier.reason }
    : latestWithAlias;
};

// A query exposes only unresolved parameter owners to the editor adapter. Each
// external edge retains its own AST; process-local declaration IDs never cross it.
type TraceSearch<A> = {
  readonly candidates: readonly A[];
  readonly boundaries: readonly FunctionInfo[];
  readonly diagnostics?: readonly string[];
  readonly returnMapping?: ReturnMapping;
};

export type ReturnMapping =
  | { readonly kind: 'complete' }
  | { readonly kind: 'incomplete'; readonly reasons: readonly string[] };

const combineReturnMappings = (mappings: readonly (ReturnMapping | undefined)[]): ReturnMapping | undefined => {
  const reasons = [...new Set(mappings.flatMap((mapping) => mapping?.kind === 'incomplete' ? mapping.reasons : []))];
  return reasons.length ? { kind: 'incomplete', reasons } : mappings.some(Boolean) ? { kind: 'complete' } : undefined;
};

const returnBranchReason = (frame: TraceFrame & { readonly returned: NonNullable<TraceFrame['returned']> }, reason: string): string =>
  frame.returned.callee.file + ':' + frame.returned.statement.node.range?.begin?.offset + ' return: ' + reason;

const returnBranchMapping = (frame: TraceFrame & { readonly returned: NonNullable<TraceFrame['returned']> }, mapping: ReturnMapping | undefined): ReturnMapping =>
  mapping?.kind === 'incomplete'
    ? { kind: 'incomplete', reasons: mapping.reasons.map((reason) => returnBranchReason(frame, reason)) }
    : { kind: 'complete' };

const combineSearches = <A>(searches: readonly TraceSearch<A>[]): TraceSearch<A> => ({
  candidates: searches.flatMap((search) => search.candidates),
  boundaries: [...new Set(searches.flatMap((search) => search.boundaries))],
  diagnostics: searches.flatMap((search) => search.diagnostics ?? []),
  returnMapping: combineReturnMappings(searches.map((search) => search.returnMapping))
});

const functionKey = (fn: FunctionInfo): string =>
  [fn.file, fn.wrapped.node.loc?.offset ?? fn.id, fn.wrapped.node.symbol ?? fn.type].join(':');

const uniqueCallerLinks = (links: readonly CallerLink[]): readonly CallerLink[] =>
  links.reduce<readonly CallerLink[]>((unique, link) => unique.some((previous) =>
    functionKey(previous.caller) === functionKey(link.caller) && callKey(previous.callsite) === callKey(link.callsite))
    ? unique : [...unique, link], []);

type ReturnBinding = { readonly callee: FunctionInfo; readonly link: CallerLink; readonly statement: WrappedNode };
type TraceOptions = AnalysisOptions & {
  readonly returnBindings?: readonly ReturnBinding[];
  // Popping a return binding must retain the caller's actual observation path.
  readonly returnObservation?: { readonly caller: FunctionInfo; readonly callsite: WrappedNode };
  readonly observations?: readonly WrappedNode[];
};

const returnBinding = (fn: FunctionInfo, options: TraceOptions): ReturnBinding | undefined =>
  options.returnBindings?.reduce<ReturnBinding | undefined>((previous, binding) =>
    binding.callee.wrapped.node === fn.wrapped.node ? binding : previous, undefined);

const callerOptions = (fn: FunctionInfo, options: TraceOptions, link: CallerLink): TraceOptions => {
  const binding = returnBinding(fn, options);
  if (binding) return { ...options, observations: [...(options.observations ?? []), link.callsite], returnBindings: options.returnBindings!.slice(0, options.returnBindings!.indexOf(binding)),
    returnObservation: { caller: link.caller, callsite: link.callsite } };
  return { ...options, observations: [...(options.observations ?? []), link.callsite],
    returnObservation: { caller: link.caller, callsite: link.callsite } };
};

const callerLinks = (fn: FunctionInfo, index: AstIndex, options: TraceOptions): readonly CallerLink[] => {
  const binding = returnBinding(fn, options);
  if (binding) return [binding.link];
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
  | { readonly _tag: 'Returned'; readonly callsite: WrappedNode; readonly callee: FunctionInfo; readonly members: readonly string[] }
  | { readonly _tag: 'Boundary'; readonly reason: string; readonly returnMapping?: ReturnMapping };

// Resolve a subobject of a value, rather than appending its suffix to an
// arbitrary child expression. Only Clang's semantic aggregate order is usable.
const valueSource = (input: WrappedNode | undefined, members: readonly string[], index: AstIndex): ValueSource => {
  const expression = unwrap(input);
  if (!expression) return { _tag: 'Boundary', reason: 'Missing argument expression.' };
  if (expression.node.storageOperation === 'optional-empty') return members.length
    ? { _tag: 'Boundary', reason: 'An empty optional has no contained object.' }
    : { _tag: 'Initialization', origin: expression };
  if (expression.node.kind === 'CXXFunctionalCastExpr' && (expression.node.castKind === 'NoOp' ||
      expression.node.castKind === 'ConstructorConversion' && unwrap(expression.children[0])?.node.kind === 'CXXConstructExpr'))
    return valueSource(expression.children[0], members, index);
  if (expression.node.storageOperation === 'identity')
    return valueSource(expression.children[1], members, index);
  if (expression.node.kind === 'CXXConstructExpr' && expression.node.fieldwiseCopy) {
    return opaqueCopy(expression.node, members) ? { _tag: 'Boundary', reason: 'Unsupported argument expression: member copy/move field preservation is not verified.' }
      : valueSource(expression.children[0], members, index);
  }
  const target = pathAt(expression, index);
  if (target) return { _tag: 'Path', target: appendMembers(target, members) };
  if (expression.node.kind === 'MemberExpr' && !expression.node.arrow && expression.node.name)
    return valueSource(expression.children[0], [expression.node.name, ...members], index);
  if (expression.node.kind === 'InitListExpr') {
    if (members.length === 0) return { _tag: 'Initialization', origin: expression };
    const fieldIndex = expression.node.aggregateFields?.indexOf(members[0]) ?? -1;
    return fieldIndex >= 0
      ? valueSource(expression.children[fieldIndex], members.slice(1), index)
      : { _tag: 'Boundary', reason: 'Aggregate field mapping is unavailable for ' + members.join('.') + '.' };
  }
  if (isCall(expression.node)) {
    const callee = resolveFunction(expression, index);
    if (callee) return { _tag: 'Returned', callsite: expression, callee, members };
    const definition = expression.node.callee?.definition;
    const reason = 'Unsupported argument expression: ' + expression.node.kind + '. Return source unavailable: ' +
        (expression.node.callee?.qualifiedName ?? '(unresolved target)') +
        (expression.node.callee?.virtual ? ' (virtual dispatch).' : ' (definition unavailable).') +
        (definition?.kind === 'system-excluded' ? ' Definition exists at ' + definition.loc.file + ':' + definition.loc.offset +
          '; system-header body was excluded from the compact AST.' : '');
    return { _tag: 'Boundary', reason, returnMapping: { kind: 'incomplete', reasons: [reason] } };
  }
  if (['IntegerLiteral', 'FloatingLiteral', 'CXXBoolLiteralExpr', 'StringLiteral', 'ImplicitValueInitExpr'].includes(expression.node.kind))
    return members.length === 0 ? { _tag: 'Initialization', origin: expression }
      : { _tag: 'Boundary', reason: 'Scalar initialization cannot supply a member path.' };
  return { _tag: 'Boundary', reason: 'Unsupported argument expression: ' + expression.node.kind +
    (expression.node.copyOrMove ? ' (copy/move field preservation is not verified).' : '.') };
};

const mappedArgument = (link: CallerLink, parameterIndex: number, target: ExpressionPath): ValueSource =>
  valueSource(argsOf(link.callsite)[parameterIndex], target.members, link.prepared.index);

// A return summary is independent of callers and query time. Copies carry their
// own preservation proof; an aggregate owns field sources rather than an
// invented storage identity. Call binding happens only when consuming a summary.
export type ReturnSource =
  | { readonly kind: 'storage'; readonly target: ExpressionPath }
  | LoopReturnState
  | { readonly kind: 'aggregate'; readonly origin: WrappedNode; readonly fields: readonly { readonly name: string; readonly source: ReturnSource }[] }
  | { readonly kind: 'transparent'; readonly expression: WrappedNode; readonly source: ReturnSource }
  | { readonly kind: 'preserved-copy'; readonly expression: WrappedNode; readonly source: ReturnSource }
  | { readonly kind: 'call'; readonly callsite: WrappedNode; readonly callee: FunctionInfo; readonly members: readonly string[] }
  | { readonly kind: 'initialization'; readonly origin: WrappedNode }
  | { readonly kind: 'unsupported'; readonly reason: string };
export type ReturnBranch = { readonly statement: WrappedNode; readonly source: ReturnSource };

// These are AST witnesses, not an identity between the initial object and the
// final value. A replacement assigns a new value to the same local storage;
// a mutation changes a subobject. Neither proves the recurrence's call order.
export type LoopReturnState = {
  readonly kind: 'loop-carried';
  readonly target: ExpressionPath;
  readonly declaration: WrappedNode;
  readonly initial: WrappedNode | undefined;
  readonly updates: readonly (
    | { readonly kind: 'replacement'; readonly loop: WrappedNode; readonly statement: WrappedNode; readonly target: ExpressionPath; readonly value: WrappedNode }
    | { readonly kind: 'mutation'; readonly loop: WrappedNode; readonly statement: WrappedNode; readonly target: ExpressionPath }
  )[];
};

const loopReturnState = (target: ExpressionPath, declaration: WrappedNode, fn: FunctionInfo, index: AstIndex, beforeOffset: number): LoopReturnState | undefined => {
  const updates = (index.writesByFunctionId.get(fn.id)?.get(target.rootId) ?? []).flatMap((write): LoopReturnState['updates'] => {
    const loopNode = [...write.mutation.ancestors].reverse().find((ancestor) =>
      ['ForStmt', 'CXXForRangeStmt', 'WhileStmt', 'DoStmt'].includes(ancestor.kind));
    const loop = loopNode && index.wrappedByNode.get(loopNode);
    if (!loop || write.start >= beforeOffset ||
      !sameOrParent(target.members, write.target.members) && !sameOrParent(write.target.members, target.members)) return [];
    const value = write.mutation.node.opcode === '=' ? write.mutation.children.at(-1) : undefined;
    return value && sameOrParent(write.target.members, target.members)
      ? [{ kind: 'replacement', loop, statement: write.mutation, target: write.target, value }]
      : [{ kind: 'mutation', loop, statement: write.mutation, target: write.target }];
  });
  return updates.length ? { kind: 'loop-carried', target, declaration, initial: declaration.children[0], updates } : undefined;
};

// Also usable by the benchmark to isolate summary construction from the other
// immutable indexes. No caller bindings or observation times enter this cache.
export const buildReturnSources = (index: AstIndex): ReadonlyMap<string, readonly ReturnBranch[]> =>
  [...index.returnsByFunctionId].reduce((returnSources, [id, statements]) => {
    const fn = index.functionsById.get(id);
    const unstructured = fn && findDescendant(fn.body, (wrapped) =>
      ['GotoStmt', 'IndirectGotoStmt'].includes(wrapped.node.kind));
    returnSources.set(id, statements.filter((statement) => unstructured || reachableReturn(statement, index))
      .map((statement) => ({ statement, source: unstructured
        ? { kind: 'unsupported', reason: 'Unstructured return control flow (goto) is not verified.' }
        : returnSource(statement.children[0], index, fn, fn?.wrapped.node.returnBorrow) })));
    return returnSources;
  }, new Map<string, readonly ReturnBranch[]>());

const exitsSequentialBlock = (statement: WrappedNode): boolean =>
  statement.node.kind === 'ReturnStmt' || statement.node.kind === 'CXXThrowExpr' ||
  statement.node.kind === 'CompoundStmt' && statement.children.some(exitsSequentialBlock);

// Do not invent a possible source from a lexically unreachable return after an
// unconditional exit. Other control-flow feasibility stays conservative; this
// proof deliberately makes no assumptions about loop counts or conditions.
const reachableReturn = (statement: WrappedNode, index: AstIndex): boolean =>
  statement.ancestors.every((ancestor, position) => {
    if (ancestor.kind !== 'CompoundStmt') return true;
    const compound = index.wrappedByNode.get(ancestor);
    const child = statement.ancestors[position + 1] ?? statement.node;
    const childIndex = compound?.children.findIndex((wrapped) => wrapped.node === child) ?? -1;
    return childIndex < 0 || !compound!.children.slice(0, childIndex).some(exitsSequentialBlock);
  });

const returnSource = (input: WrappedNode | undefined, index: AstIndex, fn: FunctionInfo | undefined,
  returnBorrow: 'reference' | 'pointer' | undefined): ReturnSource => {
  const expression = unwrap(input);
  if (!expression) return { kind: 'unsupported', reason: 'Missing return expression.' };
  if (expression.node.kind === 'CXXConstructExpr' && expression.node.fieldwiseCopy) return {
    kind: 'preserved-copy', expression, source: returnSource(expression.children[0], index, fn, returnBorrow)
  };
  if (expression.node.kind === 'CXXFunctionalCastExpr' && (expression.node.castKind === 'NoOp' ||
      expression.node.castKind === 'ConstructorConversion' && unwrap(expression.children[0])?.node.kind === 'CXXConstructExpr') ||
      expression.node.storageOperation === 'identity') return {
    kind: 'transparent', expression, source: returnSource(expression.node.storageOperation === 'identity'
      ? argsOf(expression)[0] : expression.children[0], index, fn, returnBorrow)
  };
  if (expression.node.kind === 'InitListExpr' && expression.node.aggregateFields) return {
    kind: 'aggregate', origin: expression, fields: expression.node.aggregateFields.map((name, fieldIndex) => {
      const storage = expression.storage?.kind === 'aggregate'
        ? index.storageTypes[expression.storage.fields.find((field) => field.name === name)?.storageId ?? ''] : undefined;
      return { name, source: returnSource(expression.children[fieldIndex], index, fn,
        storage?.kind === 'reference' ? 'reference' : storage?.kind === 'pointer' ? 'pointer' : undefined) };
    })
  };
  const source = valueSource(expression, [], index);
  switch (source._tag) {
    case 'Path': {
      const declaration = index.declarations.get(source.target.rootId);
      const owned = declaration && fn && enclosingFunction(declaration, index)?.id === fn.id &&
        !/&/.test(declaration.node.type?.qualType ?? '');
      const address = source.target.members.at(-1) === '&';
      const localPointer = declaration?.node.kind === 'VarDecl' &&
        (returnBorrow === 'pointer' || returnBorrow === 'reference' && source.target.members.includes('*'));
      const ownedReference = returnBorrow === 'reference' && !source.target.members.includes('*');
      const loopState = owned && declaration.node.kind === 'VarDecl' && fn
        ? loopReturnState(source.target, declaration, fn, index, expression.node.range?.begin?.offset ?? Number.POSITIVE_INFINITY) : undefined;
      return owned && (address || localPointer || ownedReference)
        ? { kind: 'unsupported', reason: 'Return borrow lifetime from callee-owned storage is not verified.' }
        : loopState || { kind: 'storage', target: source.target };
    }
    case 'Initialization': return { kind: 'initialization', origin: source.origin };
    case 'Returned': return { kind: 'call', callsite: source.callsite, callee: source.callee, members: source.members };
    case 'Boundary': return { kind: 'unsupported', reason: source.reason };
  }
};

const projectReturnSource = (source: ReturnSource, members: readonly string[]): ValueSource => {
  switch (source.kind) {
    case 'loop-carried': {
      const target = appendMembers(source.target, members);
      const updates = source.updates.filter((update) => sameOrParent(target.members, update.target.members) ||
        sameOrParent(update.target.members, target.members));
      return updates.length ? { _tag: 'Boundary', reason: 'Loop-carried return value of ' + source.target.rootName +
        ' is not verified: initial storage at ' + source.declaration.file + ':' + source.declaration.node.range?.begin?.offset +
        ', ' + updates.length + ' indexed loop update(s). Zero-iteration and repeated-iteration values, operation returns, and call order require a recurrence proof.' }
        : { _tag: 'Path', target };
    }
    case 'storage': return { _tag: 'Path', target: appendMembers(source.target, members) };
    case 'call': return { _tag: 'Returned', callsite: source.callsite, callee: source.callee, members: [...source.members, ...members] };
    case 'unsupported': return { _tag: 'Boundary', reason: source.reason };
    case 'transparent': return projectReturnSource(source.source, members);
    case 'preserved-copy': return opaqueCopy(source.expression.node, members)
      ? { _tag: 'Boundary', reason: 'Return copy/move field preservation is not verified.' }
      : projectReturnSource(source.source, members);
    case 'aggregate': {
      if (!members.length) return { _tag: 'Initialization', origin: source.origin };
      const field = source.fields.find((field) => field.name === members[0]);
      return field ? projectReturnSource(field.source, members.slice(1))
        : { _tag: 'Boundary', reason: 'Return aggregate field mapping is unavailable for ' + members.join('.') + '.' };
    }
    case 'initialization': return !members.length ? { _tag: 'Initialization', origin: source.origin }
      : { _tag: 'Boundary', reason: 'Return initialization cannot supply a member path.' };
  }
};

// A fold carrying a borrow needs the pointer value to survive the accumulator
// copy, not a copy of the pointee's contents. A pointer-copy boundary below '*'
// must not be mistaken for a changed pointer; user-defined copy effects remain
// boundaries on the pointer prefix itself.
const projectFoldReturnSource = (source: ReturnSource, members: readonly string[]): ValueSource => {
  if (source.kind === 'transparent') return projectFoldReturnSource(source.source, members);
  if (source.kind === 'preserved-copy' && members.includes('*'))
    return opaqueCopy(source.expression.node, members.slice(0, members.indexOf('*')))
      ? { _tag: 'Boundary', reason: 'Fold returned pointer copy preservation is not verified.' }
      : projectFoldReturnSource(source.source, members);
  return projectReturnSource(source, members);
};

const mappedReturns = (source: Extract<ValueSource, { readonly _tag: 'Returned' }>, index: AstIndex, options: TraceOptions) => {
  const caller = enclosingFunction(source.callsite, index);
  const branches = index.returnSourcesByFunctionId.get(source.callee.id) ?? [];
  const reason = !caller ? 'Return call ownership is unavailable.'
    : options.returnBindings?.some((binding) => binding.callee.wrapped.node === source.callee.wrapped.node)
      ? 'Recursive return source; stopped at ' + source.callee.name + '.'
      : !branches.length ? 'No return expressions are available for ' + source.callee.name + '.' : undefined;
  if (reason || !caller) return { kind: 'unavailable' as const, reason: reason! };
  return { kind: 'branches' as const, branches: branches.map((branch) => ({
    source: projectReturnSource(branch.source, source.members),
    beforeOffset: branch.statement.node.range?.end?.offset,
    options: { ...options, returnBindings: [...(options.returnBindings ?? []), {
      callee: source.callee, statement: branch.statement,
      link: { callsite: source.callsite, caller, prepared: { ast: index.all[0].node, index } }
    }] },
    frame: { callsite: source.callsite, caller,
      returned: { callee: source.callee, statement: branch.statement, members: source.members } } satisfies TraceFrame
  })) };
};

const mutationsFromValue = (
  source: ValueSource, fn: FunctionInfo, beforeOffset: number, index: AstIndex,
  sourceTextByFile: ReadonlyMap<string, string>, options: TraceOptions, visited: readonly string[]
): TraceSearch<TraceCandidate> => {
  switch (source._tag) {
    case 'Path': return traceMutations(fn, source.target, beforeOffset, index, sourceTextByFile, options, visited);
    case 'Boundary': return { candidates: [], boundaries: [], diagnostics: [source.reason],
      returnMapping: source.returnMapping ?? (options.returnBindings?.length ? { kind: 'incomplete', reasons: [source.reason] } : undefined) };
    case 'Initialization': return { candidates: [], boundaries: [], diagnostics: ['State is initialized here; no earlier mutation of this value is verified.'] };
    case 'Returned': {
      const returns = mappedReturns(source, index, options);
      if (returns.kind === 'unavailable') return { candidates: [], boundaries: [], diagnostics: [returns.reason],
        returnMapping: { kind: 'incomplete', reasons: [returns.reason] } };
      const search = combineSearches(returns.branches.map((branch) => {
        if (branch.beforeOffset === undefined) return { candidates: [], boundaries: [], diagnostics: ['Return expression range is unavailable.'],
          returnMapping: { kind: 'incomplete', reasons: ['Return expression range is unavailable.'] } };
        const search = mutationsFromValue(branch.source, source.callee, branch.beforeOffset, index, sourceTextByFile, branch.options, visited);
        return { ...search, candidates: search.candidates.map((candidate) => ({ ...candidate,
          returnMapping: returnBranchMapping(branch.frame, candidate.returnMapping), frames: [branch.frame, ...candidate.frames] })),
          returnMapping: returnBranchMapping(branch.frame, search.returnMapping),
          diagnostics: search.diagnostics?.map((reason) => returnBranchReason(branch.frame, reason)) };
      }));
      const returnMapping = search.returnMapping ?? { kind: 'complete' as const };
      return search.candidates.length ? { ...search, returnMapping } : { ...search, returnMapping, diagnostics: [
        'Unsupported argument expression: ' + source.callsite.node.kind + '. No verified mutation through return source of ' + source.callee.name + '.',
        ...(search.diagnostics ?? [])
      ] };
    }
  }
};

const originsFromValue = (
  source: ValueSource, fn: FunctionInfo, beforeOffset: number, index: AstIndex,
  options: TraceOptions, visited: readonly string[]
): TraceSearch<OriginCandidate> => {
  switch (source._tag) {
    case 'Path': return originFor(fn, source.target, index, options, visited, beforeOffset);
    case 'Boundary': return { candidates: [], boundaries: [], diagnostics: [source.reason],
      returnMapping: source.returnMapping ?? (options.returnBindings?.length ? { kind: 'incomplete', reasons: [source.reason] } : undefined) };
    case 'Initialization': return { candidates: [{ origin: source.origin, kind: 'initialization', frames: [] }], boundaries: [] };
    case 'Returned': {
      const returns = mappedReturns(source, index, options);
      if (returns.kind === 'unavailable') return { candidates: [], boundaries: [], diagnostics: [returns.reason],
        returnMapping: { kind: 'incomplete', reasons: [returns.reason] } };
      const search = combineSearches(returns.branches.map((branch) => {
        if (branch.beforeOffset === undefined) return { candidates: [], boundaries: [], diagnostics: ['Return expression range is unavailable.'],
          returnMapping: { kind: 'incomplete', reasons: ['Return expression range is unavailable.'] } };
        const search = originsFromValue(branch.source, source.callee, branch.beforeOffset, index, branch.options, visited);
        return { ...search, candidates: search.candidates.map((candidate) => ({ ...candidate,
          returnMapping: returnBranchMapping(branch.frame, candidate.returnMapping ?? (candidate.boundary
            ? { kind: 'incomplete', reasons: [candidate.boundary] } : undefined)), frames: [branch.frame, ...candidate.frames] })),
          returnMapping: returnBranchMapping(branch.frame, combineReturnMappings([search.returnMapping,
            ...search.candidates.map((candidate) => candidate.returnMapping ?? (candidate.boundary
              ? { kind: 'incomplete' as const, reasons: [candidate.boundary] } : undefined))])),
          diagnostics: search.diagnostics?.map((reason) => returnBranchReason(branch.frame, reason)) };
      }));
      return { ...search, returnMapping: search.returnMapping ?? { kind: 'complete' } };
    }
  }
};

// A member function's implicit object maps to the receiver expression of each
// verified call site, keeping the traced member suffix: `this->bank.records`
// becomes `<receiver>.bank.records` in the caller.
const mappedReceiver = (link: CallerLink, target: ExpressionPath): ExpressionPath | null => {
  const receiver = receiverPath(link.callsite, link.prepared.index);
  return receiver && appendMembers(receiver, target.members);
};

type CaptureSource =
  | { readonly _tag: 'Snapshot'; readonly parent: FunctionInfo; readonly lambda: WrappedNode; readonly beforeOffset: number }
  | { readonly _tag: 'Invocations'; readonly parent: FunctionInfo; readonly calls: readonly WrappedNode[] }
  | { readonly _tag: 'Boundary'; readonly lambda: WrappedNode; readonly reason: string };

const captureSource = (fn: FunctionInfo, target: ExpressionPath, index: AstIndex, options: TraceOptions): CaptureSource | undefined => {
  const lambda = lambdaFor(fn, index);
  const declaration = index.declarations.get(target.rootId);
  if (!lambda || !declaration || enclosingFunction(declaration, index)?.id === fn.id) return undefined;
  const parent = enclosingFunction(lambda, index);
  if (!parent) return undefined;
  const capture = lambda.node.captures?.find((capture) => captureMatches(capture, target, index));
  if (capture?.kind === 'copy') {
    if (opaqueCopy(capture, target.members) || target.members.includes('*')) return { _tag: 'Boundary', lambda,
      reason: 'Copy capture field or pointee preservation is not verified; stopped at the lambda.' };
    const range = nodeRange(lambda);
    return range ? { _tag: 'Snapshot', parent, lambda, beforeOffset: range.start }
      : { _tag: 'Boundary', lambda, reason: 'Copy capture construction position is unavailable.' };
  }
  if (capture?.kind !== 'reference' && lambda.node.captureDefault !== 'reference') return undefined;
  const binding = returnBinding(fn, options);
  const calls = (binding ? [binding.link.callsite] : index.callsByCalleeId.get(fn.id) ?? []).filter((call) =>
    enclosingFunction(call, index)?.id === parent.id && !!nodeRange(call));
  return calls.length > 0 ? { _tag: 'Invocations', parent, calls }
    : { _tag: 'Boundary', lambda, reason: 'Reference capture invocation is not verified; stopped at the lambda.' };
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
    return callsite.file === normalized(file) && !callsite.node.callee?.virtual && callsite.node.callee?.symbol === symbol &&
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

const mutationBoundarySearch = (reason: string, options: TraceOptions): TraceSearch<TraceCandidate> => ({
  candidates: [], boundaries: [], diagnostics: [reason],
  returnMapping: options.returnBindings?.length || options.returnObservation ? { kind: 'incomplete', reasons: [reason] } : undefined
});

// Backward tracing follows the value at call entry, including copies. Forward
// Effects use explicit borrows; unverified shared value parameters are barriers.
const traceMutations = (
  fn: FunctionInfo, target: ExpressionPath, beforeOffset: number, index: AstIndex,
  sourceTextByFile: ReadonlyMap<string, string>, options: TraceOptions,
  visited: readonly string[] = []
): TraceSearch<TraceCandidate> => {
  const key = [functionKey(fn), storagePathKey(target), beforeOffset, returnBinding(fn, options)?.link.callsite.node.range?.begin?.offset,
    options.returnObservation && callKey(options.returnObservation.callsite)].join(':');
  if (visited.includes(key)) return mutationBoundarySearch('Recursive caller path; stopped at ' + fn.name + '.', options);
  const nextVisited = [...visited, key];
  const observation = returnBinding(fn, options)?.statement ?? (options.returnObservation?.caller.wrapped.node === fn.wrapped.node
    ? options.returnObservation.callsite : undefined);
  const local = findPreviousMutation(fn, target, beforeOffset, index, sourceTextByFile, [], observation, options.observations);
  if (local?._tag === 'MutationBoundary') return mutationBoundarySearch(local.reason, options);
  if (local) {
    const binding = returnBinding(fn, options);
    const mutation = local.frames[0]?.callsite ?? local.mutation;
    const mutationPath = [...mutation.ancestors, mutation.node];
    const observation = binding?.statement ?? (options.returnObservation?.caller.wrapped.node === fn.wrapped.node
      ? options.returnObservation.callsite : undefined);
    const observationPath = observation && [...observation.ancestors, observation.node];
    // Lexical order alone cannot prove that a write in another branch executed
    // on this return path. Keep the existing mutation search conservative here.
    const unverifiedBranch = observationPath && mutation.ancestors.some((ancestor, position) =>
      ['IfStmt', 'SwitchStmt', 'CaseStmt', 'DefaultStmt', 'ForStmt', 'CXXForRangeStmt', 'WhileStmt', 'DoStmt', 'CXXCatchStmt'].includes(ancestor.kind) &&
      (observationPath.indexOf(ancestor) < 0 || observationPath[observationPath.indexOf(ancestor) + 1] !== mutationPath[position + 1]));
    if (unverifiedBranch) return mutationBoundarySearch(binding
      ? 'Mutation execution on this return branch is not verified.'
      : 'Mutation execution before this return-source call is not verified.', options);
    const { _tag, ...candidate } = local;
    return { candidates: [candidate], boundaries: [] };
  }
  const parameterIndex = fn.params.findIndex((parameter) => parameter.node.id === target.rootId);
  const fold = foldFor(fn, index);
  const wrap = (): TraceSearch<TraceCandidate> => {
    if (!fold || parameterIndex !== 0) return { candidates: [], boundaries: [] };
    if (fold.extent !== undefined && Number.isSafeInteger(fold.extent) && fold.extent <= 1)
      return { candidates: [], boundaries: [], diagnostics: ['Fold range has at most one iteration; no previous iteration exists.'] };
    const branches = index.returnSourcesByFunctionId.get(fn.id) ?? [];
    const invariantObservations = (options.observations ?? []).filter((observation) =>
      observation.ancestors.some((ancestor) => {
        if (ancestor.kind !== 'SwitchStmt') return false;
        const conditional = index.wrappedByNode.get(ancestor);
        const discriminator = pathAt(conditional?.children.at(-2), index);
        const storage = discriminator && storageAt(discriminator, index);
        const declaration = discriminator && index.declarations.get(discriminator.rootId);
        return discriminator && storage?.kind === 'value' && !storage.shared && declaration &&
          enclosingFunction(declaration, index)?.id !== fn.id &&
          !findPreviousMutation(fn, discriminator, Number.POSITIVE_INFINITY, index, sourceTextByFile);
      }));
    const diagnostics = ['Fold previous-iteration candidates require an earlier iteration and their branch guards; ' +
      'the first iteration uses the initial state at ' + fold.initial.file + ':' + fold.initial.node.range?.begin?.offset + '.'];
    const search = combineSearches(branches.map((branch): TraceSearch<TraceCandidate> => {
      const source = projectFoldReturnSource(branch.source, target.members);
      // For borrowed storage, returning a different pointer does not carry the
      // observed object. Copies of an accumulator's ordinary fields instead
      // carry values, so their source may be a different local object.
      if (source._tag !== 'Path' || target.members.includes('*') &&
          (storagePathKey(source.target) !== storagePathKey(target) ||
            !!mutationBarrier(fn, target, branch.statement.node.range?.end?.offset ?? Number.POSITIVE_INFINITY, index)))
        return { candidates: [], boundaries: [], diagnostics: [source._tag === 'Boundary' ? source.reason :
          'Fold returned storage identity is not verified for ' + target.rootName + '.' + target.members.join('.') + '.'] };
      const last = findPreviousMutation(fn, source.target, branch.statement.node.range?.begin?.offset ?? Number.POSITIVE_INFINITY,
        index, sourceTextByFile, [], branch.statement, invariantObservations);
      if (last?._tag === 'MutationBoundary') return mutationBoundarySearch(last.reason, options);
      if (!last) return { candidates: [], boundaries: [], diagnostics: ['No mutation is verified on this fold return path.'] };
      const { _tag, ...candidate } = last;
      return { candidates: [{ ...candidate, wrapped: true, frames: [{ callsite: fold.call, caller: fn,
        fold: { initial: fold.initial, statement: branch.statement, target, source: source.target,
          kind: target.members.includes('*') ? 'borrow-preserved' : 'value-return', invariantObservations } }, ...candidate.frames] }], boundaries: [] };
    }));
    return { ...search, diagnostics: [...diagnostics, ...(search.diagnostics ?? [])] };
  };
  if (fold && parameterIndex === 0) {
    return wrap();
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
      if (!range) return { candidates: [], boundaries: [], diagnostics: [
        link.caller.file + ':? -> ' + fn.name + ': ' +
        (source._tag === 'Boundary' ? source.reason : source._tag === 'Initialization'
          ? 'State is initialized here; no earlier mutation of this value is verified.' : 'Missing call range.')
      ] };
      const argument = source._tag === 'Path' ? source.target : undefined;
      const frame = receiverTrace
        ? { callsite: link.callsite, caller: link.caller, receiver: argument }
        : { callsite: link.callsite, caller: link.caller, parameterIndex, argument };
      const search = mutationsFromValue(source, link.caller, range.start, link.prepared.index, sourceTextByFile, callerOptions(fn, options, link), nextVisited);
      return { ...search, candidates: search.candidates.map((candidate) => ({
        ...candidate, frames: [frame, ...candidate.frames]
      })), returnMapping: source._tag === 'Boundary' && returnBinding(fn, options)
        ? { kind: 'incomplete', reasons: [source.reason] } : search.returnMapping };
    }));
    const resolved = { ...search, candidates: search.candidates.length > 0 ? search.candidates : wrap().candidates,
      diagnostics: [...(links.length > 0 ? search.diagnostics ?? [] : ['No verified caller is available for ' + fn.name + '.']),
        ...(returnBinding(fn, options) ? [] : options.callerDiagnostics?.get(fn.wrapped.node) ?? [])] };
    return (returnBinding(fn, options) || options.externalCallers?.has(fn.wrapped.node))
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
      const binding = returnBinding(fn, options);
      const invocations = (binding ? [binding.link.callsite] : index.callsByCalleeId.get(fn.id) ?? []).filter((call) =>
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
    const source = captureSource(fn, target, index, options);
    if (!source || source._tag === 'Boundary') return mutationBoundarySearch(source?.reason ?? 'Lambda capture source is not verified.', options);
    if (source._tag === 'Invocations') return combineSearches(source.calls.map((call) => {
      const range = nodeRange(call, sourceTextByFile);
      if (!range) return { candidates: [], boundaries: [] };
      const search = traceMutations(parent, target, range.start, index, sourceTextByFile,
        { ...options, returnObservation: { caller: parent, callsite: call } }, nextVisited);
      return { ...search, candidates: search.candidates.map((candidate) => ({
        ...candidate, frames: [{ callsite: call, caller: parent }, ...candidate.frames]
      })) };
    }));
    const search = traceMutations(source.parent, target, source.beforeOffset, index, sourceTextByFile, options, nextVisited);
    return search.candidates.length > 0 ? search : { ...search, candidates: wrap().candidates };
  }
  if (declaration?.node.kind === 'VarDecl' && declaration.children.length > 0) {
    const wrapped = wrap();
    if (wrapped.candidates.length > 0 || wrapped.diagnostics?.length) return wrapped;
    const source = valueSource(declaration.children[0], target.members, index);
    const range = nodeRange(declaration, sourceTextByFile);
    if (source._tag === 'Path' && range && source.target.rootId !== target.rootId)
      return traceMutations(fn, source.target, range.start, index, sourceTextByFile, options, visited);
    if (source._tag === 'Returned' && (/&/.test(declaration.node.type?.qualType ?? '') || target.members.includes('*')))
      return mutationBoundarySearch('Returned borrow observation after local initialization is not verified; call-entry mutations cannot establish the observation-time value.', options);
    if (source._tag === 'Returned' && range)
      return mutationsFromValue(source, fn, range.start, index, sourceTextByFile, options, nextVisited);
    return { candidates: [], boundaries: [], returnMapping: source._tag === 'Boundary' ? source.returnMapping : undefined, diagnostics: [source._tag === 'Boundary' ? source.reason
      : 'No earlier mutation before local initialization of ' + target.rootName + '.'] };
  }
  return { ...wrap(), diagnostics: ['No verified caller or earlier mutation is available for ' + fn.name + '.' ] };
};

// The implicit object of a member function has no ParmVarDecl. Trace it like a
// parameter, but map it to the receiver expression at each verified call site
// and record that receiver on the frame instead of a fabricated parameterIndex.
const receiverOriginFor = (
  fn: FunctionInfo, target: ExpressionPath, index: AstIndex, options: TraceOptions,
  visited: readonly string[]
): TraceSearch<OriginCandidate> => {
  const fallback = (boundary: string, returnMapping: ReturnMapping | undefined = returnBinding(fn, options)
    ? { kind: 'incomplete', reasons: [boundary] } : undefined): TraceSearch<OriginCandidate> => ({
    candidates: [{ origin: fn.wrapped, kind: 'parameter', frames: [], boundary, returnMapping }], boundaries: [], returnMapping
  });
  const key = functionKey(fn);
  if (visited.includes(key)) return fallback('Recursive caller path; stopped at the receiver.');
  const links = callerLinks(fn, index, options);
  if (links.length === 0) return {
    ...fallback('No verified caller is available; stopped at the receiver.'),
    diagnostics: options.callerDiagnostics?.get(fn.wrapped.node),
    boundaries: (returnBinding(fn, options) || options.externalCallers?.has(fn.wrapped.node)) ? [] : [fn]
  };
  const search = combineSearches(links.map((link): TraceSearch<OriginCandidate> => {
    const argument = mappedReceiver(link, target);
    const search = argument
      ? originFor(link.caller, argument, link.prepared.index, callerOptions(fn, options, link), [...visited, key], link.callsite.node.range?.begin?.offset)
      : fallback('Unsupported receiver expression; stopped at the receiver.');
    const resolved = search.candidates.length > 0 ? search : {
      ...fallback('Receiver source could not be resolved; stopped at the receiver.', search.returnMapping), diagnostics: search.diagnostics };
    return { ...resolved, candidates: resolved.candidates.map((candidate) => ({
      ...candidate, frames: [{ callsite: link.callsite, caller: link.caller, receiver: argument ?? undefined }, ...candidate.frames]
    })) };
  }));
  const resolved = { ...search, diagnostics: [...(search.diagnostics ?? []), ...(returnBinding(fn, options) ? [] : options.callerDiagnostics?.get(fn.wrapped.node) ?? [])] };
  return (returnBinding(fn, options) || options.externalCallers?.has(fn.wrapped.node))
    ? resolved
    : { ...resolved, boundaries: [...resolved.boundaries, fn] };
};

const originFor = (
  fn: FunctionInfo, target: ExpressionPath, index: AstIndex, options: TraceOptions,
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
  const source = captureSource(fn, target, index, options);
  if (source) {
    const key = functionKey(fn);
    if (source._tag === 'Boundary' || visited.includes(key)) return {
      candidates: [{ origin: source._tag === 'Invocations' ? declaration : source.lambda, kind: 'parameter', frames: [],
        boundary: source._tag === 'Boundary' ? source.reason : 'Recursive capture path; stopped at the lambda.' }], boundaries: []
    };
    if (source._tag === 'Snapshot') return originFor(source.parent, target, index, options, [...visited, key], source.beforeOffset);
    return combineSearches(source.calls.map((call) => {
      const search = originFor(source.parent, target, index, options, [...visited, key], nodeRange(call)!.start);
      return { ...search, candidates: search.candidates.map((candidate) => ({ ...candidate,
        frames: [{ callsite: call, caller: source.parent }, ...candidate.frames] })) };
    }));
  }
  if (declaration.node.kind === 'VarDecl') {
    if (target.members.includes('*')) {
      const barrier = mutationBarrier(fn, target, beforeOffset, index);
      const binding = { ...target, members: target.members.slice(0, target.members.lastIndexOf('*')) };
      const rebound = findPreviousMutation(fn, binding, beforeOffset, index, options.sourceTextByFile ?? new Map());
      const source = valueSource(declaration.children[0], target.members, index);
      if (!barrier && !rebound && source._tag === 'Path' && source.target.rootId !== target.rootId)
        return originFor(fn, source.target, index, options, visited, declaration.node.range?.begin?.offset ?? beforeOffset);
      return { candidates: [{ origin: declaration, kind: 'parameter', frames: [], boundary:
        (barrier && fn.file + ':' + barrier.start + ': ' + barrier.reason) ?? (rebound ? 'Pointer binding may have changed through a helper; pointee identity is not verified.'
          : 'Pointee initialization source is not verified.') }], boundaries: [] };
    }
    return { candidates: declaration.children.length > 0 ? [{ origin: declaration, kind: 'initialization', frames: [] }] : [], boundaries: [] };
  }
  const declarationOwner = enclosingFunction(declaration, index) ?? fn;
  const owner = index.functionsById.get(declarationOwner.id) ?? declarationOwner;
  const fold = owner.params[0]?.node.id === target.rootId ? foldFor(owner, index) : undefined;
  if (fold) return { candidates: [{ origin: fold.initial, kind: 'initialization', frames: [],
    boundary: target.members.length ? 'Fold seed identifies the initial storage; the current member value may be carried from a previous iteration.' : undefined
  }], boundaries: [] };
  const fallback = (boundary: string, returnMapping: ReturnMapping | undefined = returnBinding(owner, options)
    ? { kind: 'incomplete', reasons: [boundary] } : undefined): TraceSearch<OriginCandidate> => ({
    candidates: [{ origin: declaration, kind: 'parameter', frames: [], boundary, returnMapping }], boundaries: [], returnMapping
  });
  const key = [functionKey(owner), storagePathKey(target), beforeOffset, returnBinding(owner, options)?.link.callsite.node.range?.begin?.offset].join(':');
  if (visited.includes(key)) return fallback('Recursive caller path; stopped at the parameter.');
  const parameterIndex = owner.params.findIndex((parameter) => parameter.node.id === target.rootId);
  if (parameterIndex < 0) return fallback('Parameter ownership could not be resolved.');
  const links = callerLinks(owner, index, options);
  if (links.length === 0) return {
    ...fallback('No verified caller is available; stopped at the parameter.'),
    diagnostics: options.callerDiagnostics?.get(owner.wrapped.node),
    boundaries: (returnBinding(owner, options) || options.externalCallers?.has(owner.wrapped.node)) ? [] : [owner]
  };
  const search = combineSearches(links.map((link): TraceSearch<OriginCandidate> => {
    const source = mappedArgument(link, parameterIndex, target);
    const argument = source._tag === 'Path' ? source.target : undefined;
    const search = source._tag === 'Returned'
      ? originsFromValue(source, link.caller, link.callsite.node.range?.begin?.offset ?? beforeOffset, link.prepared.index, callerOptions(owner, options, link), [...visited, key])
      : source._tag === 'Path' ? originFor(link.caller, source.target, link.prepared.index, callerOptions(owner, options, link), [...visited, key], link.callsite.node.range?.begin?.offset)
      : source._tag === 'Initialization'
        ? { candidates: [{ origin: source.origin, kind: 'initialization' as const, frames: [] }], boundaries: [] }
        : fallback(source.reason + ' Stopped at the parameter.', source.returnMapping);
    const resolved = search.candidates.length > 0 ? search : {
      ...fallback('Argument source could not be resolved; stopped at the parameter.', search.returnMapping), diagnostics: search.diagnostics };
    return { ...resolved, candidates: resolved.candidates.map((candidate) => ({
      ...candidate, frames: [{ callsite: link.callsite, caller: link.caller, parameterIndex, argument: argument ?? undefined }, ...candidate.frames]
    })) };
  }));
  const resolved = { ...search, diagnostics: [...(search.diagnostics ?? []), ...(returnBinding(owner, options) ? [] : options.callerDiagnostics?.get(owner.wrapped.node) ?? [])] };
  return (returnBinding(owner, options) || options.externalCallers?.has(owner.wrapped.node))
    ? resolved
    : { ...resolved, boundaries: [...resolved.boundaries, owner] };
};

const uniqueByPath = <A>(candidates: readonly A[], target: (candidate: A) => WrappedNode,
  frames: (candidate: A) => readonly TraceFrame[]): readonly A[] =>
  candidates.reduce((state, candidate) => {
    const key = callKey(target(candidate)) + '|' + frames(candidate).map((frame) => [callKey(frame.callsite), functionKey(frame.caller), frame.parameterIndex, frame.argument?.rootName, frame.argument?.members.join('.'), frame.receiver?.rootName, frame.receiver?.members.join('.'),
      ...(frame.returned ? [functionKey(frame.returned.callee), callKey(frame.returned.statement), frame.returned.members.join('.')] : [])].join(':')).join('>');
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
  readonly selected: WrappedNode;
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
  return { index, current, target, sourceTextByFile, selected: selectedExpression };
};

const mutationResult = (candidates: readonly TraceCandidate[]): AnalysisResult =>
  candidates.length === 1
    ? {
        _tag: 'MutationFound',
        mutation: candidates[0].mutation,
        via: candidates[0].frames.length > 0 ? 'call' : 'direct',
        wrapped: candidates[0].wrapped ?? false,
        frames: candidates[0].frames,
        returnMapping: candidates[0].returnMapping
      }
    : { _tag: 'CandidatesFound', candidates };

export type AnalysisQuery = {
  readonly result: AnalysisResult;
  readonly boundaries: readonly FunctionInfo[];
  readonly diagnostics?: readonly string[];
  readonly returnMapping?: ReturnMapping;
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
      ? { _tag: 'OriginFound', origin: candidates[0].origin, kind: candidates[0].kind, boundary: candidates[0].boundary, frames: candidates[0].frames, returnMapping: candidates[0].returnMapping }
      : candidates.length > 1 ? { _tag: 'OriginCandidatesFound', candidates }
      : { _tag: 'AnalysisFailure', reason: 'No supported initialization, fold seed, or parameter declaration was found for this expression.' };
    return { result, boundaries: search.boundaries, diagnostics: search.diagnostics ?? [], returnMapping: search.returnMapping };
  }
  const search = traceMutations(current, target, options.cursorByteOffset, index, sourceTextByFile,
    { ...options, observations: [selection.selected] });
  const candidates = uniqueByPath(search.candidates, (candidate) => candidate.mutation, (candidate) => candidate.frames);
  return {
    result: candidates.length > 0 ? mutationResult(candidates) : {
      _tag: 'AnalysisFailure', reason: ['No earlier mutation or supported fold wrap-around was found along verified caller paths.',
        ...new Set(search.diagnostics ?? [])].join(' ')
    },
    boundaries: search.boundaries,
    returnMapping: search.returnMapping,
    diagnostics: search.diagnostics ?? []
  };
};

export const analyzeAst = (ast: ClangNode, options: AnalysisOptions, prepared?: PreparedAst): AnalysisResult =>
  analyzeQuery('mutation', ast, options, prepared).result;

export const analyzeOriginAst = (ast: ClangNode, options: AnalysisOptions, prepared?: PreparedAst): AnalysisResult =>
  analyzeQuery('origin', ast, options, prepared).result;
