import type { AnalysisResult, WrappedNode } from '../src/analysis';
const target = (node: WrappedNode) => ({ file: node.file, kind: node.node.kind, id: node.node.id, range: node.node.range });
export const resultSignature = (result: AnalysisResult): unknown => {
  switch (result._tag) {
    case 'AnalysisFailure': return result;
    case 'MutationFound': return { tag: result._tag, mutation: target(result.mutation), via: result.via, wrapped: result.wrapped };
    case 'OriginFound': return { tag: result._tag, origin: target(result.origin), kind: result.kind };
    case 'OriginCandidatesFound': return { tag: result._tag, candidates: result.candidates.map((candidate) => ({
      origin: target(candidate.origin), kind: candidate.kind, frames: candidate.frames.map((frame) => target(frame.callsite))
    })) };
    case 'CandidatesFound': return { tag: result._tag, candidates: result.candidates.map((candidate) => ({
      mutation: target(candidate.mutation), orderOffset: candidate.orderOffset,
      frames: candidate.frames.map((frame) => ({ callsite: target(frame.callsite), caller: { id: frame.caller.id, name: frame.caller.name, type: frame.caller.type } }))
    })) };
  }
};
