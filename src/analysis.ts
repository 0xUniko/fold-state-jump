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
  | { readonly _tag: 'MutationFound'; readonly mutation: WrappedNode; readonly via: 'direct' | 'call' }
  | { readonly _tag: 'CandidatesFound'; readonly candidates: readonly TraceCandidate[] }
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
};

type MutationCandidate = {
  readonly mutation: WrappedNode;
  readonly orderOffset: number;
  readonly frames: readonly TraceFrame[];
};

type FoldContext = {
  readonly lambda: WrappedNode;
  readonly stateParam: WrappedNode;
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
  // A generator avoids quadratic flattening work in heavily templated ASTs.
  function* flatten(wrapped: WrappedNode): Generator<WrappedNode> {
    yield wrapped;
    for (const child of wrapped.children) yield* flatten(child);
  }
  const result = visit(ast, [], '');
  return { root: result.root, all: Array.from(flatten(result.root)) };
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
  return { all, functions, calls: all.filter((wrapped) => isCall(wrapped.node)) };
};

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
  const sourceBytes = Buffer.from(sourceFor(sourceTextByFile, wrapped.file), 'utf8');
  const end =
    range?.end?.tokLen !== undefined
      ? endStart + range.end.tokLen
      : identifierByteEnd(sourceBytes, endStart);
  return { start, end: Math.max(end, endStart + 1) };
};

const identifierRange = (
  wrapped: WrappedNode,
  sourceTextByFile: ReadonlyMap<string, string>
): { readonly start: number; readonly end: number } | null => {
  const range = wrapped.node.range;
  if (!range?.begin || !range.end) return null;
  const member = wrapped.node.kind === 'MemberExpr';
  const location = member ? range.end : range.begin;
  if (location.offset === undefined) return null;
  const name = member ? wrapped.node.name : wrapped.node.referencedDecl?.name;
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
        (wrapped.node.kind === 'DeclRefExpr' || wrapped.node.kind === 'MemberExpr')
    )
    .flatMap((wrapped) => {
      const range = identifierRange(wrapped, sourceTextByFile);
      return range && offset >= range.start && offset < range.end ? [{ wrapped, range }] : [];
    })
    .reduce<{ readonly wrapped: WrappedNode; readonly range: { readonly start: number; readonly end: number } } | undefined>(
      (selected, candidate) =>
        !selected || candidate.range.end - candidate.range.start < selected.range.end - selected.range.start
          ? candidate
          : selected,
      undefined
    )?.wrapped;

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
  if (node.kind === 'DeclRefExpr' && node.referencedDecl?.id) {
    return {
      rootId: node.referencedDecl.id,
      rootName: node.referencedDecl.name ?? '',
      members: []
    };
  }
  if (node.kind === 'MemberExpr' && wrapped.children[0]) {
    const base = expressionPath(wrapped.children[0]);
    return base ? { ...base, members: [...base.members, node.name ?? '?'] } : null;
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
  if (!call.children[0]) return undefined;
  const reference = descendants(call.children[0]).find(
    (wrapped) => wrapped.node.kind === 'DeclRefExpr' && wrapped.node.referencedDecl
  )?.node.referencedDecl;
  if (!reference) return undefined;
  return (
    index.functions.find((fn) => fn.id === reference.id) ??
    index.functions.find(
      (fn) => fn.name === reference.name && fn.type === (reference.type?.qualType ?? '')
    )
  );
};

const argsOf = (call: WrappedNode): readonly WrappedNode[] => call.children.slice(1);

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
    .flatMap((node) => index.functions.filter((fn) => fn.wrapped.node === node))
    .at(0);

const isFoldCall = (call: WrappedNode): boolean =>
  descendants(call.children[0] ?? call).some(
    (wrapped) =>
      wrapped.node.kind === 'DeclRefExpr' &&
      (wrapped.node.referencedDecl?.name ?? '').includes('fold_left')
  );

const foldContext = (wrapped: WrappedNode, index: AstIndex): FoldContext | undefined =>
  [...wrapped.ancestors]
    .reverse()
    .filter((node) => node.kind === 'LambdaExpr')
    .flatMap((lambdaNode) => {
      const lambda = index.all.find((candidate) => candidate.node === lambdaNode);
      if (!lambda) return [];
      const lambdaPosition = wrapped.ancestors.indexOf(lambdaNode);
      const hasFoldParent = wrapped.ancestors
        .slice(0, lambdaPosition)
        .map((node) => index.all.find((candidate) => candidate.node === node))
        .some((candidate) => candidate !== undefined && isCall(candidate.node) && isFoldCall(candidate));
      if (!hasFoldParent) return [];
      const stateParam = descendants(lambda)
        .find((candidate) => candidate.node.kind === 'CXXMethodDecl' && candidate.node.name === 'operator()')
        ?.children.find((candidate) => candidate.node.kind === 'ParmVarDecl');
      return stateParam ? [{ lambda, stateParam }] : [];
    })[0];

const findPreviousMutation = (
  fn: FunctionInfo,
  rootId: string,
  targetMembers: readonly string[],
  beforeOffset: number,
  index: AstIndex,
  sourceTextByFile: ReadonlyMap<string, string>,
  visitedFunctionIds: readonly string[] = []
): MutationCandidate | undefined => {
  if (visitedFunctionIds.includes(fn.id)) return undefined;
  const nextVisited = [...visitedFunctionIds, fn.id];
  const body = descendants(fn.body).filter((wrapped) => enclosingFunction(wrapped, index)?.id === fn.id);
  const directCandidates = body.flatMap((wrapped) => {
    const target = writeTarget(wrapped);
    const range = nodeRange(wrapped, sourceTextByFile);
    const targetPath = expressionPath(target);
    return range &&
      range.end <= beforeOffset &&
      targetPath?.rootId === rootId &&
      affects(targetPath.members, targetMembers)
      ? [{ mutation: wrapped, orderOffset: range.start, frames: [] as readonly TraceFrame[] }]
      : [];
  });
  const callCandidates = body
    .filter((wrapped) => isCall(wrapped.node))
    .flatMap((call) => {
      const callRange = nodeRange(call, sourceTextByFile);
      const callee = resolveFunction(call, index);
      if (!callRange || callRange.end > beforeOffset || !callee) return [];
      return callee.params.flatMap((parameter, parameterIndex) => {
        if (!isReferenceOrPointer(parameter)) return [];
        const argumentPath = expressionPath(argsOf(call)[parameterIndex]);
        if (
          argumentPath?.rootId !== rootId ||
          !sameOrParent(argumentPath.members, targetMembers)
        ) {
          return [];
        }
        const nested = findPreviousMutation(
          callee,
          parameter.node.id ?? '',
          targetMembers.slice(argumentPath.members.length),
          Number.POSITIVE_INFINITY,
          index,
          sourceTextByFile,
          nextVisited
        );
        return nested
          ? [{
              mutation: nested.mutation,
              orderOffset: callRange.start,
              frames: [{ callsite: call, caller: fn }, ...nested.frames]
            }]
          : [];
      });
    });
  return [...directCandidates, ...callCandidates].reduce(
    (latest: MutationCandidate | undefined, candidate) =>
      !latest || candidate.orderOffset > latest.orderOffset ? candidate : latest,
    undefined
  );
};

const traceParameterToFold = (
  fn: FunctionInfo,
  parameterIndex: number,
  targetMembers: readonly string[],
  index: AstIndex,
  sourceTextByFile: ReadonlyMap<string, string>,
  visitedFunctionIds: readonly string[] = []
): readonly TraceCandidate[] => {
  if (visitedFunctionIds.includes(fn.id)) return [];
  const nextVisited = [...visitedFunctionIds, fn.id];
  return index.calls
    .filter((call) => resolveFunction(call, index)?.id === fn.id)
    .flatMap((call) => {
      const callRange = nodeRange(call, sourceTextByFile);
      const caller = enclosingFunction(call, index);
      const argumentPath = expressionPath(argsOf(call)[parameterIndex]);
      if (!callRange || !caller || !argumentPath) return [];
      const fold = foldContext(call, index);
      if (fold && argumentPath.rootId === (fold.stateParam.node.id ?? '')) {
        const previous = findPreviousMutation(
          caller,
          fold.stateParam.node.id ?? '',
          [...argumentPath.members, ...targetMembers],
          callRange.start,
          index,
          sourceTextByFile
        );
        return previous
          ? [{
              mutation: previous.mutation,
              orderOffset: callRange.start,
              frames: [{ callsite: call, caller }, ...previous.frames]
            }]
          : [];
      }
      const callerParameterIndex = caller.params.findIndex(
        (parameter) => parameter.node.id === argumentPath.rootId
      );
      return callerParameterIndex < 0
        ? []
        : traceParameterToFold(
            caller,
            callerParameterIndex,
            [...argumentPath.members, ...targetMembers],
            index,
            sourceTextByFile,
            nextVisited
          );
    });
};

const uniqueCandidates = (candidates: readonly TraceCandidate[]): readonly TraceCandidate[] =>
  candidates.reduce((unique: readonly TraceCandidate[], candidate) => {
    const range = candidate.mutation.node.range;
    const mutationKey = [
      candidate.mutation.file,
      range?.begin?.offset ?? -1,
      candidate.frames.map((frame) => {
        const callOffset = frame.callsite.node.range?.begin?.offset ?? -1;
        return frame.callsite.file + ':' + callOffset;
      }).join('>')
    ].join('|');
    const existingKeys = unique.map((existing) => {
      const existingRange = existing.mutation.node.range;
      return [
        existing.mutation.file,
        existingRange?.begin?.offset ?? -1,
        existing.frames.map((frame) => {
          const callOffset = frame.callsite.node.range?.begin?.offset ?? -1;
          return frame.callsite.file + ':' + callOffset;
        }).join('>')
      ].join('|');
    });
    return existingKeys.includes(mutationKey) ? unique : [...unique, candidate];
  }, []);

export const byteOffsetFromUtf16 = (text: string, offset: number): number =>
  Buffer.byteLength(text.slice(0, offset), 'utf8');

export const utf16OffsetFromByte = (text: string, offset: number): number =>
  Buffer.from(text, 'utf8').subarray(0, Math.max(0, offset)).toString('utf8').length;

export const analyzeAst = (
  ast: ClangNode,
  options: AnalysisOptions
): AnalysisResult => {
  const sourceTextByFile = new Map([
    ...(options.sourceTextByFile ?? []),
    [normalized(options.file), options.sourceText] as const
  ]);
  const index = buildIndex(buildTree(ast).all);
  const selected = findNodeAt(index.all, options.file, options.cursorByteOffset, sourceTextByFile);
  if (!selected) {
    return { _tag: 'AnalysisFailure', reason: 'No supported variable or member expression found at the cursor.' };
  }
  const target = expressionPath(selected);
  const current = enclosingFunction(selected, index);
  if (!target || !current) {
    return { _tag: 'AnalysisFailure', reason: 'Could not resolve the expression path or enclosing function.' };
  }
  const fold = foldContext(selected, index);
  if (fold && target.rootId === (fold.stateParam.node.id ?? '')) {
    const range = nodeRange(selected, sourceTextByFile);
    const previous = findPreviousMutation(
      current,
      target.rootId,
      target.members,
      range?.start ?? options.cursorByteOffset,
      index,
      sourceTextByFile
    );
    return previous
      ? { _tag: 'MutationFound', mutation: previous.mutation, via: previous.frames.length > 0 ? 'call' : 'direct' }
      : { _tag: 'AnalysisFailure', reason: 'No earlier mutation found for this fold-state path.' };
  }
  const parameterIndex = current.params.findIndex((parameter) => parameter.node.id === target.rootId);
  if (parameterIndex < 0) {
    return { _tag: 'AnalysisFailure', reason: 'The expression is not rooted at the fold state or a supported function parameter; local aliases are not supported yet.' };
  }
  const local = findPreviousMutation(
    current,
    target.rootId,
    target.members,
    options.cursorByteOffset,
    index,
    sourceTextByFile
  );
  if (local) {
    return { _tag: 'MutationFound', mutation: local.mutation, via: local.frames.length > 0 ? 'call' : 'direct' };
  }
  const candidates = uniqueCandidates(
    traceParameterToFold(current, parameterIndex, target.members, index, sourceTextByFile)
  );
  if (candidates.length === 0) {
    return { _tag: 'AnalysisFailure', reason: 'No fold_left call path with an earlier mutation was found in this translation unit.' };
  }
  return candidates.length === 1
    ? { _tag: 'MutationFound', mutation: candidates[0].mutation, via: 'call' }
    : { _tag: 'CandidatesFound', candidates };
};
