// Native owns C++ type semantics. These descriptors describe possible borrows,
// independently of copy-value fidelity and of any particular object's contents.
export type ReachabilityReason = 'dependent-type' | 'erased-pointee' | 'callback';

export type Reachability =
  | { readonly kind: 'complete'; readonly identities: readonly string[] }
  | { readonly kind: 'incomplete'; readonly identities: readonly string[]; readonly reasons: readonly ReachabilityReason[] };

export type Storage = { readonly reachability: Reachability } & (
  | { readonly kind: 'value'; readonly identity: string; readonly shared: boolean }
  | { readonly kind: 'pointer' | 'reference'; readonly identity: string; readonly shared: boolean; readonly pointee: string }
  | { readonly kind: 'aggregate'; readonly identity: string; readonly shared: boolean;
      readonly fields: readonly { readonly name: string; readonly storageId: string }[] }
  | { readonly kind: 'array'; readonly identity: string; readonly shared: boolean; readonly element: string }
  | { readonly kind: 'reference-wrapper' | 'view' | 'shared-owner' | 'unique-owner' | 'elements' | 'sum' | 'callable' | 'opaque';
      readonly identity: string; readonly shared: boolean });

// Possible is a complete type-level overlap without object provenance.
// Incomplete records a missing proof; neither case may be discarded as unrelated.
export type StorageRelation =
  | { readonly kind: 'unrelated' }
  | { readonly kind: 'reachable' }
  | { readonly kind: 'possible' }
  | { readonly kind: 'incomplete'; readonly reasons: readonly string[] };

export const unrelated: StorageRelation = { kind: 'unrelated' };
export const reachable: StorageRelation = { kind: 'reachable' };
export const possible: StorageRelation = { kind: 'possible' };
export const incomplete = (...reasons: readonly string[]): StorageRelation => ({ kind: 'incomplete', reasons });

// A positive witness survives missing information elsewhere. Only all-negative
// proofs establish unrelatedness. No relation here creates a navigation path.
export const combineRelations = (relations: readonly StorageRelation[]): StorageRelation =>
  relations.reduce<StorageRelation>((relation, next) => {
    switch (relation.kind) {
      case 'reachable': return relation;
      case 'incomplete': return next.kind === 'reachable' ? next : relation;
      case 'possible': return next.kind === 'unrelated' ? relation : next;
      case 'unrelated': return next;
    }
  }, unrelated);

export const unknownRelation = (storage: Storage, identities: readonly string[] | undefined): StorageRelation => {
  if (storage.reachability.kind === 'incomplete') return incomplete(...storage.reachability.reasons);
  if (!storage.reachability.identities.length) return unrelated;
  if (!identities?.length) return incomplete('target-type');
  return storage.reachability.identities.some((identity) => identities.includes(identity)) ? possible : unrelated;
};

export const relationEvidence = (relation: Exclude<StorageRelation, { readonly kind: 'unrelated' }>): string => {
  switch (relation.kind) {
    case 'reachable': return 'verified borrow provenance';
    case 'possible': return 'compatible storage types; object provenance is unknown';
    case 'incomplete': return 'incomplete storage relation: ' + relation.reasons.join(', ');
  }
};
