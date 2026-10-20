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
  readonly dependent?: boolean;
  readonly referencedMemberDecl?: string;
  readonly callee?: { readonly id: string; readonly name: string; readonly qualifiedName?: string };
  readonly captures?: readonly { readonly id: string; readonly kind: 'reference' | 'copy' }[];
  readonly captureDefault?: 'reference' | 'copy' | 'none';
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
};

export type TraceCandidate = {
  readonly mutation: WrappedNode;
  readonly orderOffset: number;
  readonly frames: readonly TraceFrame[];
};

export type AnalysisResult =
  | { readonly _tag: 'MutationFound'; readonly mutation: WrappedNode; readonly via: 'direct' | 'call'; readonly wrapped?: boolean }
  | { readonly _tag: 'CandidatesFound'; readonly candidates: readonly TraceCandidate[] }
  | { readonly _tag: 'OriginFound'; readonly origin: WrappedNode; readonly kind: 'initialization' | 'parameter' }
  | { readonly _tag: 'AnalysisFailure'; readonly reason: string };

export type AnalysisOptions = {
  readonly file: string;
  readonly sourceText: string;
  readonly cursorByteOffset: number;
  readonly sourceTextByFile?: ReadonlyMap<string, string>;
};

type AstIndex = {
  readonly all: readonly WrappedNode[];
  readonly functions: readonly FunctionInfo[];
  readonly calls: readonly WrappedNode[];
  readonly functionsByNode: ReadonlyMap<ClangNode, FunctionInfo>;
  readonly functionsById: ReadonlyMap<string, FunctionInfo>;
  readonly functionsByName: ReadonlyMap<string, readonly FunctionInfo[]>;
  readonly declarations: ReadonlyMap<string, WrappedNode>;
  readonly wrappedByNode: ReadonlyMap<ClangNode, WrappedNode>;
  readonly writesByFunctionId: ReadonlyMap<string, readonly WrappedNode[]>;
  readonly callsByCallerId: ReadonlyMap<string, readonly WrappedNode[]>;
  readonly callsByCalleeId: ReadonlyMap<string, readonly WrappedNode[]>;
  readonly resolvedCalls: Map<ClangNode, FunctionInfo | undefined>;
};

// The tree and indexes are immutable after construction and reusable for
// cursor queries until the translation unit or its compile flags change.
export type PreparedAst = {
  readonly ast: ClangNode;
  readonly index: AstIndex;
};

type MutationCandidate = {
  readonly mutation: WrappedNode;
  readonly orderOffset: number;
  readonly frames: readonly TraceFrame[];
};

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

const explicitFile = (node: ClangNode): string => {
  const locations = [node.loc, node.range?.begin, node.range?.end].flatMap((location) =>
    location
      ? [location, location.expansionLoc, location.spellingLoc].filter(
          (candidate): candidate is ClangLocation => candidate !== undefined
        )
      : []
  );
  const file = locations.find((location) => location.file)?.file;
  return file ? normalized(file) : '';
};

// Build the wrapper tree without repeatedly copying every descendant array.
// Large C++ header ASTs can contain hundreds of thousands of declarations.
export const buildTree = (ast: ClangNode): { readonly root: WrappedNode; readonly all: readonly WrappedNode[] } => {
  const visit = (
    node: ClangNode,
    ancestors: readonly ClangNode[],
    inheritedFile: string
  ): { readonly root: WrappedNode; readonly lastFile: string } => {
    const file = explicitFile(node) || inheritedFile;
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

const descendants = (wrapped: WrappedNode): readonly WrappedNode[] =>
  [wrapped, ...wrapped.children.flatMap(descendants)];

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
  const functions = all.filter((wrapped) => isFunction(wrapped.node)).flatMap((wrapped) => {
    const info = functionInfo(wrapped);
    return info ? [info] : [];
  });
  const index: AstIndex = {
    all, functions, calls: all.filter((wrapped) => isCall(wrapped.node)),
    functionsByNode: new Map(functions.map((fn) => [fn.wrapped.node, fn])),
    functionsById: functions.reduce((functionsById, fn) => {
      const previous = functionsById.get(fn.id);
      if (!previous || fn.wrapped.ancestors.length > previous.wrapped.ancestors.length) functionsById.set(fn.id, fn);
      return functionsById;
    }, new Map<string, FunctionInfo>()),
    functionsByName: functions.reduce((byName, fn) => {
      const matching = byName.get(fn.name) ?? [];
      matching.push(fn);
      byName.set(fn.name, matching);
      return byName;
    }, new Map<string, FunctionInfo[]>()),
    declarations: new Map(all.filter((wrapped) => ['VarDecl', 'ParmVarDecl'].includes(wrapped.node.kind))
      .map((wrapped) => [wrapped.node.id ?? '', wrapped])),
    wrappedByNode: new Map(all.map((wrapped) => [wrapped.node, wrapped])),
    writesByFunctionId: new Map<string, WrappedNode[]>(),
    callsByCallerId: new Map<string, WrappedNode[]>(),
    callsByCalleeId: new Map<string, WrappedNode[]>(),
    resolvedCalls: new Map<ClangNode, FunctionInfo | undefined>()
  };

  // Classify each node once instead of rescanning every function body on
  // each backward trace. Nested functions belong to their own nearest owner.
  all.reduce((index, wrapped) => {
    const owner = enclosingFunction(wrapped, index);
    if (!owner || !(wrapped.node === owner.body.node || wrapped.ancestors.includes(owner.body.node))) return index;
    // The backward trace only needs potential writes, not every expression
    // in the function. Classify these once per extracted AST.
    const isWrite = writeTarget(wrapped) !== undefined ||
      (isCall(wrapped.node) && standardMutationTarget(wrapped) !== undefined);
    if (isWrite) {
      const byFunction = index.writesByFunctionId as Map<string, WrappedNode[]>;
      const writes = byFunction.get(owner.id) ?? [];
      writes.push(wrapped);
      byFunction.set(owner.id, writes);
    }
    if (isCall(wrapped.node)) {
      const callers = index.callsByCallerId as Map<string, WrappedNode[]>;
      const calls = callers.get(owner.id) ?? [];
      calls.push(wrapped);
      callers.set(owner.id, calls);
    }
    return index;
  }, index);

  index.calls.reduce((index, call) => {
    const callee = resolveFunction(call, index);
    index.resolvedCalls.set(call.node, callee);
    if (!callee) return index;
    const callsByCalleeId = index.callsByCalleeId as Map<string, WrappedNode[]>;
    const calls = callsByCalleeId.get(callee.id) ?? [];
    calls.push(call);
    callsByCalleeId.set(callee.id, calls);
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
  sourceTextByFile: ReadonlyMap<string, string>
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
        : identifierByteEnd(Buffer.from(sourceFor(sourceTextByFile, wrapped.file), 'utf8'), location.offset);
  return { start: location.offset, end };
};

const findNodeAt = (
  all: readonly WrappedNode[],
  file: string,
  offset: number,
  sourceTextByFile: ReadonlyMap<string, string>
): WrappedNode | undefined =>
  all
    .filter(
      (wrapped) =>
        normalized(wrapped.file) === normalized(file) &&
        ['DeclRefExpr', 'MemberExpr', 'CXXDependentScopeMemberExpr', 'VarDecl', 'ParmVarDecl'].includes(wrapped.node.kind)
    )
    .flatMap((wrapped) => {
      const range = identifierRange(wrapped, sourceTextByFile);
      return range && offset >= range.start && offset < range.end ? [{ wrapped, range }] : [];
    })
    .reduce<{ readonly wrapped: WrappedNode; readonly range: { readonly start: number; readonly end: number } } | undefined>(
      (selected, candidate) =>
        !selected || candidate.range.end - candidate.range.start < selected.range.end - selected.range.start ||
          (candidate.range.end - candidate.range.start === selected.range.end - selected.range.start &&
            (Number(isDependent(candidate.wrapped)) < Number(isDependent(selected.wrapped)) ||
              (isDependent(candidate.wrapped) === isDependent(selected.wrapped) &&
                candidate.wrapped.ancestors.length > selected.wrapped.ancestors.length)))
          ? candidate
          : selected,
      undefined
    )?.wrapped;

const isDependent = (wrapped: WrappedNode): boolean =>
  !!wrapped.node.dependent || wrapped.ancestors.some((node) => isFunction(node) && node.dependent);

const unwrap = (wrapped: WrappedNode | undefined): WrappedNode | undefined => {
  if (!wrapped || !(TRANSPARENT_EXPRESSIONS as readonly string[]).includes(wrapped.node.kind)) return wrapped;
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
    return base ? { ...base, members: [...base.members, node.name ?? '?'] } : null;
  }
  if (node.kind === 'CXXThisExpr') return { rootId: '$this', rootName: 'this', members: [] };
  if (node.kind === 'CallExpr' && ['std::move', 'std::forward'].includes(node.callee?.qualifiedName ?? '')) {
    return expressionPath(wrapped.children[1]);
  }
  if (node.kind === 'ArraySubscriptExpr' && wrapped.children[0]) {
    const base = expressionPath(wrapped.children[0]);
    return base ? { ...base, members: [...base.members, '[]'] } : null;
  }
  if (
    node.kind === 'UnaryOperator' &&
    ['&', '*', '+'].includes(node.opcode ?? '') &&
    wrapped.children[0]
  ) {
    return expressionPath(wrapped.children[0]);
  }
  return null;
};

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
  const reference = descendants(call.children[0]).find(
    (wrapped) => wrapped.node.kind === 'DeclRefExpr' && wrapped.node.referencedDecl
  )?.node.referencedDecl;
  const exact = reference?.id && index.functionsById.get(reference.id);
  if (exact) return exact;
  const name = reference?.name ?? callee?.node.name;
  const matching = name === undefined ? [] : (index.functionsByName.get(name) ?? []);
  const functions = [...new Map(matching.filter((fn) =>
    !reference?.type?.qualType || fn.type === reference.type.qualType
  ).map((fn) => [fn.id, fn])).values()];
  return functions.length === 1 ? functions[0] : undefined;
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
  sameOrParent(writeMembers, targetMembers) || sameOrParent(targetMembers, writeMembers);

const isReferenceOrPointer = (parameter: WrappedNode): boolean =>
  /[&*]/.test(parameter.node.type?.qualType ?? '');

const enclosingFunction = (wrapped: WrappedNode, index: AstIndex): FunctionInfo | undefined =>
  [...wrapped.ancestors]
    .reverse()
    .filter(isFunction)
    .flatMap((node) => {
      const fn = index.functionsByNode.get(node);
      return fn ? [fn] : [];
    })
    .at(0);

const lambdaFor = (fn: FunctionInfo, index: AstIndex): WrappedNode | undefined => {
  const lambdaNode = [...fn.wrapped.ancestors].reverse().find((node) => node.kind === 'LambdaExpr');
  return lambdaNode && index.wrappedByNode.get(lambdaNode);
};

const isFoldCall = (call: WrappedNode): boolean =>
  (call.node.callee?.name ?? '').includes('fold_left') ||
  call.children.slice(0, call.node.memberOperator ? 2 : 1).flatMap(descendants).some((wrapped) =>
    (wrapped.node.referencedDecl?.name ?? wrapped.node.name ?? '').includes('fold_left'));

const foldFor = (fn: FunctionInfo, index: AstIndex): { readonly call: WrappedNode; readonly initial: WrappedNode } | undefined => {
  const lambda = lambdaFor(fn, index);
  if (!lambda || fn.params.length === 0) return undefined;
  const callNode = [...lambda.ancestors].reverse().find(isCall);
  const call = callNode && index.calls.find((call) => call.node === callNode);
  const initial = call && argsOf(call).at(-2);
  return call && initial && isFoldCall(call) ? { call, initial } : undefined;
};

const normalizePath = (target: ExpressionPath, index: AstIndex, visited: readonly string[] = []): ExpressionPath => {
  if (visited.includes(target.rootId)) return target;
  const declaration = index.declarations.get(target.rootId);
  if (declaration?.node.kind !== 'VarDecl' || !/&/.test(declaration.node.type?.qualType ?? '')) return target;
  const initial = expressionPath(declaration.children[0]);
  return initial ? normalizePath({ ...initial, members: [...initial.members, ...target.members] }, index, [...visited, target.rootId]) : target;
};

const pathAt = (wrapped: WrappedNode | undefined, index: AstIndex): ExpressionPath | null => {
  const target = expressionPath(wrapped);
  return target && normalizePath(target, index);
};

const receiverOf = (call: WrappedNode): WrappedNode | undefined =>
  call.node.memberOperator ? call.children[1] : unwrap(call.children[0])?.children[0];

const captureMatches = (capture: { readonly id: string }, target: ExpressionPath, index: AstIndex): boolean =>
  normalizePath({ rootId: capture.id, rootName: '', members: [] }, index).rootId === target.rootId;

const standardMutationTarget = (call: WrappedNode): WrappedNode | undefined =>
  /^std::/.test(call.node.callee?.qualifiedName ?? '') &&
  ['push_back', 'emplace_back', 'emplace', 'insert', 'erase', 'clear', 'reset', 'resize', 'assign', 'swap', 'pop_back'].includes(call.node.callee?.name ?? '')
    ? receiverOf(call)
    : undefined;

const findPreviousMutation = (
  fn: FunctionInfo,
  target: ExpressionPath,
  beforeOffset: number,
  index: AstIndex,
  sourceTextByFile: ReadonlyMap<string, string>,
  visitedFunctionIds: readonly string[] = []
): MutationCandidate | undefined => {
  if (visitedFunctionIds.includes(fn.id)) return undefined;
  const nextVisited = [...visitedFunctionIds, fn.id];
  const writes = index.writesByFunctionId.get(fn.id) ?? [];
  const directCandidates = writes.flatMap((wrapped) => {
    const write = writeTarget(wrapped) ?? (isCall(wrapped.node) ? standardMutationTarget(wrapped) : undefined);
    const range = nodeRange(wrapped, sourceTextByFile);
    const writePath = pathAt(write, index);
    return range && range.end <= beforeOffset && writePath?.rootId === target.rootId && affects(writePath.members, target.members)
      ? [{ mutation: wrapped, orderOffset: range.start, frames: [] as readonly TraceFrame[] }]
      : [];
  });
  const callCandidates = (index.callsByCallerId.get(fn.id) ?? []).flatMap((call) => {
    const callRange = nodeRange(call, sourceTextByFile);
    const callee = resolveFunction(call, index);
    if (!callRange || callRange.end > beforeOffset || !callee) return [];
    const parameterTargets = callee.params.flatMap((parameter, parameterIndex) => {
      if (!isReferenceOrPointer(parameter)) return [];
      const argument = pathAt(argsOf(call)[parameterIndex], index);
      if (!argument || argument.rootId !== target.rootId || !affects(argument.members, target.members)) return [];
      return [{ rootId: parameter.node.id ?? '', rootName: parameter.node.name ?? '', members: target.members.slice(argument.members.length) }];
    });
    const receiver = pathAt(receiverOf(call), index);
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
    return [...parameterTargets, ...receiverTargets, ...capturedTargets].flatMap((target) => {
      const nested = findPreviousMutation(callee, target, Number.POSITIVE_INFINITY, index, sourceTextByFile, nextVisited);
      return nested ? [{ ...nested, orderOffset: callRange.start, frames: [{ callsite: call, caller: fn }, ...nested.frames] }] : [];
    });
  });
  return [...directCandidates, ...callCandidates].reduce<MutationCandidate | undefined>(
    (latest, candidate) => !latest || candidate.orderOffset > latest.orderOffset ? candidate : latest,
    undefined
  );
};

// Backward tracing preserves the value passed by copy, while forward call effects
// above only follow parameters that can change the caller's object.
const traceMutations = (
  fn: FunctionInfo,
  target: ExpressionPath,
  beforeOffset: number,
  index: AstIndex,
  sourceTextByFile: ReadonlyMap<string, string>,
  visited: readonly string[] = []
): readonly TraceCandidate[] => {
  const key = fn.id + ':' + target.rootId + ':' + target.members.join('.');
  if (visited.includes(key)) return [];
  const nextVisited = [...visited, key];
  const local = findPreviousMutation(fn, target, beforeOffset, index, sourceTextByFile);
  if (local) return [local];
  const parameterIndex = fn.params.findIndex((parameter) => parameter.node.id === target.rootId);
  if (parameterIndex >= 0) {
    return (index.callsByCalleeId.get(fn.id) ?? []).flatMap((call) => {
      const caller = enclosingFunction(call, index);
      const range = nodeRange(call, sourceTextByFile);
      const argument = pathAt(argsOf(call)[parameterIndex], index);
      if (!caller || !range || !argument || caller.id === fn.id) return [];
      return traceMutations(caller, { ...argument, members: [...argument.members, ...target.members] }, range.start, index, sourceTextByFile, nextVisited)
        .map((candidate) => ({ ...candidate, frames: [{ callsite: call, caller }, ...candidate.frames] }));
    });
  }
  const parent = enclosingFunction(fn.wrapped, index);
  const lambda = lambdaFor(fn, index);
  const range = lambda && nodeRange(lambda, sourceTextByFile);
  const declaration = index.declarations.get(target.rootId);
  if (parent && lambda && range && enclosingFunction(declaration ?? fn.wrapped, index)?.id !== fn.id) {
    const capture = lambda.node.captures?.find((capture) => captureMatches(capture, target, index));
    const reference = capture?.kind === 'reference' || (!capture && lambda.node.captureDefault === 'reference');
    const invocations = reference ? (index.callsByCalleeId.get(fn.id) ?? []).filter((call) =>
      enclosingFunction(call, index)?.id === parent.id) : [];
    if (invocations.length > 0) return invocations.flatMap((call) => {
      const range = nodeRange(call, sourceTextByFile);
      return range ? traceMutations(parent, target, range.start, index, sourceTextByFile, nextVisited)
        .map((candidate) => ({ ...candidate, frames: [{ callsite: call, caller: parent }, ...candidate.frames] })) : [];
    });
    return traceMutations(parent, target, range.start, index, sourceTextByFile, nextVisited);
  }
  return [];
};

// Wrap-around is bounded by the lexical fold. A helper shared by several
// folds cannot infer which fold invocation should supply its wrap target.
const enclosingFold = (fn: FunctionInfo, index: AstIndex): FunctionInfo | undefined => {
  if (foldFor(fn, index)) return fn;
  const parent = enclosingFunction(fn.wrapped, index);
  return parent && parent.id !== fn.id ? enclosingFold(parent, index) : undefined;
};

const originFor = (
  fn: FunctionInfo,
  target: ExpressionPath,
  index: AstIndex
): Extract<AnalysisResult, { readonly _tag: 'OriginFound' }> | undefined => {
  const declaration = index.declarations.get(target.rootId);
  if (!declaration) return undefined;
  if (declaration.node.kind === 'VarDecl') return declaration.children.length > 0
    ? { _tag: 'OriginFound', origin: declaration, kind: 'initialization' }
    : undefined;
  const owner = enclosingFunction(declaration, index) ?? fn;
  const fold = owner.params[0]?.node.id === target.rootId ? foldFor(owner, index) : undefined;
  if (fold) return { _tag: 'OriginFound', origin: fold.initial, kind: 'initialization' };
  return { _tag: 'OriginFound', origin: declaration, kind: 'parameter' };
};

const uniqueCandidates = (candidates: readonly TraceCandidate[]): readonly TraceCandidate[] =>
  candidates.reduce(
    (state, candidate) => {
      const range = candidate.mutation.node.range;
      const mutationKey = [
        candidate.mutation.file,
        range?.begin?.offset ?? -1,
        candidate.frames.map((frame) => frame.callsite.file + ':' +
          (frame.callsite.node.range?.begin?.offset ?? -1)).join('>')
      ].join('|');
      if (!state.keys.has(mutationKey)) {
        state.keys.add(mutationKey);
        state.unique.push(candidate);
      }
      return state;
    },
    { keys: new Set<string>(), unique: [] as TraceCandidate[] }
  ).unique;

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
  const selected = findNodeAt(index.all, options.file, options.cursorByteOffset, sourceTextByFile);
  if (!selected) {
    return { _tag: 'AnalysisFailure', reason: 'No supported variable or member expression found at the cursor.' };
  }
  const target = pathAt(selected, index);
  const current = enclosingFunction(selected, index);
  if (!target || !current) {
    return { _tag: 'AnalysisFailure', reason: 'Could not resolve the expression path or enclosing function.' };
  }
  return { index, current, target, sourceTextByFile };
};

const mutationResult = (
  candidates: readonly TraceCandidate[],
  wrapped = false
): AnalysisResult =>
  candidates.length === 1
    ? {
        _tag: 'MutationFound',
        mutation: candidates[0].mutation,
        via: candidates[0].frames.length > 0 ? 'call' : 'direct',
        wrapped
      }
    : { _tag: 'CandidatesFound', candidates };

// Previous-mutation navigation never silently changes to origin navigation.
export const analyzeAst = (
  ast: ClangNode,
  options: AnalysisOptions,
  prepared?: PreparedAst
): AnalysisResult => {
  const selection = resolveSelection(ast, options, prepared);
  if ('_tag' in selection) return selection;
  const { current, target, index, sourceTextByFile } = selection;
  const previous = uniqueCandidates(traceMutations(current, target, options.cursorByteOffset, index, sourceTextByFile));
  if (previous.length > 0) return mutationResult(previous);

  const fold = enclosingFold(current, index);
  if (fold) {
    const last = findPreviousMutation(fold, target, Number.POSITIVE_INFINITY, index, sourceTextByFile);
    if (last) return mutationResult([last], true);
  }
  return {
    _tag: 'AnalysisFailure',
    reason: fold
      ? 'No supported mutation of this state was found inside the enclosing fold.'
      : 'No earlier mutation was found; the cursor is not inside a supported fold for wrap-around.'
  };
};

// Origin navigation is explicit, regardless of whether earlier mutations exist.
export const analyzeOriginAst = (
  ast: ClangNode,
  options: AnalysisOptions,
  prepared?: PreparedAst
): AnalysisResult => {
  const selection = resolveSelection(ast, options, prepared);
  if ('_tag' in selection) return selection;
  return originFor(selection.current, selection.target, selection.index) ?? {
    _tag: 'AnalysisFailure',
    reason: 'No supported initialization, fold seed, or parameter declaration was found for this expression.'
  };
};
