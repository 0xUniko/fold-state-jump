# Storage relation contract

Native extracts C++ type semantics; TypeScript interprets object provenance and
operation order. Type reachability never creates a navigable expression path.

`storageTypes` interns canonical type descriptors. Aggregate fields, pointer
pointees, array elements and method receivers reference that table. Ordinary
fields remain available for type projection, but copying their values does not
associate their storage with the source. `sharedStorage` describes possible
borrowed effects; `copyBoundaries` and `copyValueBoundaries` independently describe
whether member values survive a copy/move. These contracts must not be merged.

Reachability is a discriminated union:

- `complete` enumerates reachable nominal C++ type identities in the supported
  model. Canonical-type visitation closes cycles; deep finite aggregates are not
  cut off at 16 or 64 levels.
- `incomplete` retains known identities and a reason (`callback`,
  `dependent-type`, or direct `erased-pointee`). Its missing identities cannot
  prove that an object is unrelated. There is no `"?"` identity sentinel.

This remains a nominal, local storage model. It does not infer arbitrary casts
inside foreign C resource implementations or arbitrary global side effects.
An incomplete foreign declaration retains its nominal identity; that alone does
not associate every resource with every local state. Direct `void*` values have
an explicit boundary. Transitive hidden type erasure behind a foreign typed
pointer, global retention, arbitrary pointer arithmetic and representation
punning need additional provenance/effect models. `complete` must not be read as
a whole-program points-to proof covering these unsupported operations.

The object relation is separate:

| Relation | Evidence | Effect on navigation |
| --- | --- | --- |
| `reachable` | Address/reference binding or projected copy provenance | May introduce an effect boundary; still not an exact mutation path |
| `unrelated` | Complete incompatible nominal identities, independent value storage, a null value, or proved disjoint provenance | Allows backward search to continue |
| `possible` | Compatible complete type graph, object provenance unavailable | Keeps a boundary |
| `incomplete` | Missing type/provenance evidence or unbounded callable storage | Keeps a boundary with its evidence |

Combining fields returns unrelated only if every field is unrelated. A positive
witness is enough to establish association even if another field is incomplete.
Known closure construction can prove an empty or unrelated callback harmless;
an unknown `std::function` parameter cannot. A single unknown field therefore
does not erase usable provenance for all objects.

`storageAt` projects declaration types through references, pointers and aggregate
fields, including the implicit dereference in `p->member`. Observed AST lvalues
supply fallback evidence; temporary conversion types cannot overwrite lvalue
storage. Receiver paths carry a canonical receiver type identity so `$this` in
different classes cannot collide. Target ancestor type evidence is prepared once
per observed path; no mutable query-result cache needs invalidation.

Provenance has two times. Copying freezes pointer/field contents at the copy;
access through a retained reference uses the later access time. Initializers are
invalidated by relevant later assignments, conditional/unrepresentable writes
and writable borrows. A pointer variable, its value, its pointee and its address
are different storage identities. Moving can transfer an association without
establishing an exact moved-from value.

Mutation search compares ordered effects. A later direct write supersedes an
earlier unknown effect. A known function is analyzed in its own order: a verified
write after an uncertain callback can be returned, while a callback or aliased
write after that write keeps a boundary. Argument construction precedes the
function body's effect. If recursive analysis cannot establish a mutation, the
existing conservative call-site boundary remains. Direct writes through another
potentially aliased pointer and calls to a known mutating method through such a
pointer are also boundaries. Distinct ordinary fields reached through the same
pointer do not become arbitrary aliases.

Native marks `std::get_if` as a borrow projection. Reading a variant does not
invoke a stored callback; retaining a projection of the selected target still
keeps its identity boundary. A later callback invocation is analyzed separately.
Provenance through the projection remains available to later consumers (for
example `finish_host_copies`); classifying an operation as a read must not erase
its returned borrow's source.

Native also qualifies `std::optional<T>` presence reads, default empty
construction and `operator->` using the canonical specialization, system
declaration and exact method signature. An optional arrow returns the address
of contained inline storage: dereferencing it keeps the optional path prefix.
This contract does not apply to user-defined arrows. Retained-pointer writes and
escapes still pass through alias/effect checks.

Fold wrap-around now requires a returned accumulator projection. Borrowed
storage additionally requires the same returned pointer path and an unchanged
binding. Frames retain the seed, return statement, projected source/target and
invariant branch observations. A known `std::array` extent below two excludes a
previous iteration. Conditional writes remain candidates with branch/iteration
diagnostics; a fresh local object cannot wrap merely because its function is a
fold callback. Member Origin identifies initial storage and explicitly leaves
current loop-carried contents unresolved.

Switch cases are excluded only with an exiting case body. A stable captured
value discriminator can carry that constraint across iterations. Native variant
construction/projection identities can then prove a `get_if<T>` branch false;
unknown variant writes, mutable discriminators, incompatible returns and missing
provenance retain the effect boundary. See [the pending regression report](pending-fold.md).

Container element identities and callback invocation times remain unsupported;
an insertion retaining a target borrow is a boundary rather than an invented
mutation. Unknown mutation effects do not erase the known initialization of an
object. Origin of a rebound pointee stops with a boundary carrying the actual
rebinding file and byte offset.

Other existing limits remain: no full CFG/path feasibility, arbitrary return
source interpretation, union active-member tracking, asynchronous completion
identity, complete caller discovery, or proof of disjointness of all possible
reference-parameter bindings. The regressions distinguish supported object-path
identities from uncertain pointer values; distinct reference roots retain the
repository's existing object identity convention. Extending those assumptions
requires separate regression and caller-context work.

The extractor executable fingerprint participates in AST cache identity. The
new internal metadata format therefore cannot reuse an old extractor's cached
AST. Legacy synthetic ASTs without storage metadata retain their explicit
address evidence; they do not define the native protocol.
