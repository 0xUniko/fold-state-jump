#include <vector>
#include <functional>
#include <span>
#include <string_view>
#include <memory>
struct State {
  mutable int value;
  void set_value(int value) { this->value = value; }
  int read_value() const { return value; }
};
struct Holder { State *ptr; };
struct Inner { Holder holder; };
struct Reference { State &state; };
struct Value { State state; };
void consume(int);
void consume_pointer(State *);
void unknown_holder(Holder);
void unknown_view(std::span<State>);
void readonly(const State &);
State *get_other_state();

void aggregate(State &state) {
  std::vector<Holder> storage;
  state.value = 1;
  Holder holder{&state};
  storage.push_back(holder); // @boundary aggregate
  storage[0].ptr->value = 2;
  consume(state.value); // @select aggregate
}
void nested(State &state) {
  std::vector<Inner> storage;
  state.value = 1;
  Inner holder{{&state}};
  Inner copy = holder;
  storage.push_back(copy); // @boundary nested
  storage[0].holder.ptr->value = 2;
  consume(state.value); // @select nested
}
void reference_member(State &state) {
  std::vector<Reference> storage;
  state.value = 1;
  Reference holder{state};
  storage.push_back(holder); // @boundary reference-member
  storage[0].state.value = 2;
  consume(state.value); // @select reference-member
}
void value_member(State &state) {
  std::vector<Value> storage;
  state.value = 1; // @write value-member
  Value holder{state};
  storage.push_back(holder);
  storage[0].state.value = 2;
  consume(state.value); // @select value-member
}
void unrelated_holder(State &state, State &other) {
  std::vector<Holder> storage;
  state.value = 1; // @write unrelated-holder
  Holder holder{&other};
  storage.push_back(holder);
  consume(state.value); // @select unrelated-holder
}
void aggregate_assignment(State &state, State &other) {
  std::vector<Holder> storage;
  Holder holder{&other};
  state.value = 1;
  holder.ptr = &state;
  storage.push_back(holder); // @boundary aggregate-assignment
  consume(state.value); // @select aggregate-assignment
}
void aggregate_reset(State &state, State &other) {
  std::vector<Holder> storage;
  Holder holder{&state};
  state.value = 1; // @write aggregate-reset
  holder.ptr = &other;
  storage.push_back(holder);
  consume(state.value); // @select aggregate-reset
}
void aggregate_unknown(State &state) {
  state.value = 1;
  Holder holder{&state};
  unknown_holder(holder); // @boundary aggregate-unknown
  consume(state.value); // @select aggregate-unknown
}
void aggregate_direct(State &state) {
  std::vector<Holder> storage;
  Holder holder{&state};
  storage.push_back(holder);
  state.value = 2; // @write aggregate-direct
  consume(state.value); // @select aggregate-direct
}
void span_view(State &state) {
  std::vector<std::span<State>> storage;
  state.value = 1;
  std::span<State> view(&state, 1);
  storage.push_back(view); // @boundary span
  storage[0][0].value = 2;
  consume(state.value); // @select span
}
void span_unknown(State &state) {
  state.value = 1;
  std::span<State> view(&state, 1);
  unknown_view(view); // @boundary span-unknown
  consume(state.value); // @select span-unknown
}
void span_unrelated(State &state, State &other) {
  std::vector<std::span<State>> storage;
  state.value = 1; // @write span-unrelated
  std::span<State> view(&other, 1);
  storage.push_back(view);
  consume(state.value); // @select span-unrelated
}
void string_view(char &state) {
  std::vector<std::string_view> storage;
  state = 'a';
  std::string_view view(&state, 1);
  storage.push_back(view); // @boundary string-view
  consume(state); // @select string-view
}
void string_value(char &state) {
  std::vector<std::string> storage;
  state = 'a'; // @write string-value
  std::string copy(&state, 1);
  storage.push_back(copy);
  consume(state); // @select string-value
}
void local_ref(State &state) {
  state.value = 1;
  auto wrapper = std::ref(state);
  wrapper.get().value = 2; // @boundary local-ref-get
  consume(state.value); // @select local-ref-get
}
void local_cref(State &state) {
  state.value = 1;
  auto wrapper = std::cref(state);
  wrapper.get().value = 2; // @boundary local-cref-get
  consume(state.value); // @select local-cref-get
}
void cref_only(State &state) {
  state.value = 1; // @write cref-only
  auto wrapper = std::cref(state);
  consume(state.value); // @select cref-only
}
void direct_cref(State &state) {
  std::vector<std::reference_wrapper<const State>> storage;
  state.value = 1;
  storage.push_back(std::cref(state)); // @boundary direct-cref
  storage[0].get().value = 2;
  consume(state.value); // @select direct-cref
}
void stored_ref(State &state) {
  std::vector<std::reference_wrapper<State>> storage;
  state.value = 1;
  auto wrapper = std::ref(state);
  storage.push_back(wrapper); // @boundary stored-ref
  storage[0].get().value = 2;
  consume(state.value); // @select stored-ref
}
void stored_cref(State &state) {
  std::vector<std::reference_wrapper<const State>> storage;
  state.value = 1;
  auto wrapper = std::cref(state);
  storage.push_back(wrapper); // @boundary stored-cref
  storage[0].get().value = 2;
  consume(state.value); // @select stored-cref
}
void wrapper_copy(State &state) {
  std::vector<std::reference_wrapper<State>> storage;
  state.value = 1;
  auto wrapper = std::ref(state);
  auto copy = wrapper;
  storage.push_back(copy); // @boundary wrapper-copy
  consume(state.value); // @select wrapper-copy
}
void shared_copy(State &state) {
  std::vector<std::shared_ptr<State>> storage;
  state.value = 1;
  std::shared_ptr<State> owner(&state, [](State *) {});
  auto copy = owner;
  storage.push_back(copy); // @boundary shared-copy
  consume(state.value); // @select shared-copy
}
void unique_move(State &state) {
  std::vector<std::unique_ptr<State>> storage;
  state.value = 1;
  std::unique_ptr<State> owner(&state);
  storage.push_back(std::move(owner)); // @boundary unique-move
  consume(state.value); // @select unique-move
}
void unique_unrelated(State &state) {
  std::vector<std::unique_ptr<State>> storage;
  state.value = 1; // @write unique-unrelated
  auto owner = std::make_unique<State>();
  storage.push_back(std::move(owner));
  consume(state.value); // @select unique-unrelated
}
void pointer_self(State &state) {
  std::vector<State *> storage;
  State *pointer = nullptr;
  pointer = &state; // @write pointer-self
  storage.push_back(pointer);
  consume_pointer(pointer); // @select pointer-self
}
void pointer_address(State &state) {
  std::vector<State **> storage;
  State *pointer = nullptr;
  pointer = &state;
  storage.push_back(&pointer); // @boundary pointer-address
  storage[0][0] = nullptr;
  consume_pointer(pointer); // @select pointer-address
}
void pointer_pointee(State *pointer) {
  std::vector<State *> storage;
  pointer->value = 1;
  storage.push_back(pointer); // @boundary pointer-pointee
  storage[0]->value = 2;
  consume(pointer->value); // @select pointer-pointee
}
void pointer_rebound(State &state) {
  std::vector<State *> storage;
  State *pointer = &state;
  state.value = 1;
  pointer = get_other_state();
  storage.push_back(pointer); // @boundary pointer-rebound
  consume(state.value); // @select pointer-rebound
}
void pointer_known_rebound(State &state, State &other) {
  std::vector<State *> storage;
  State *pointer = &state;
  state.value = 1; // @write pointer-known-rebound
  pointer = &other;
  storage.push_back(pointer);
  consume(state.value); // @select pointer-known-rebound
}
void pointer_late_bound(State &state, State &other) {
  std::vector<State *> storage;
  State *pointer = &other;
  state.value = 1;
  pointer = &state;
  storage.push_back(pointer); // @boundary pointer-late-bound
  consume(state.value); // @select pointer-late-bound
}
void conditional_rebound(State &state, State &other, bool condition) {
  std::vector<State *> storage;
  State *pointer = &state;
  state.value = 1;
  if (condition) pointer = &other;
  storage.push_back(pointer); // @boundary conditional-rebound
  consume(state.value); // @select conditional-rebound
}
void rebind_pointee(State &state) {
  State *pointer = &state;
  pointer->value = 1;
  pointer = get_other_state(); // @boundary rebind-pointee
  consume(pointer->value); // @select rebind-pointee
}
void rebind_self(State &state) {
  std::vector<State *> storage;
  State *pointer = &state;
  pointer = get_other_state(); // @write rebind-self
  storage.push_back(pointer);
  consume_pointer(pointer); // @select rebind-self
}
void const_mutable(State &state) {
  state.value = 1;
  readonly(state); // @boundary const-mutable
  consume(state.value); // @select const-mutable
}
void copy_snapshot(State &state, State &other) {
  std::vector<Holder> storage;
  Holder holder{&state};
  Holder copy = holder;
  holder.ptr = &other;
  state.value = 1;
  storage.push_back(copy); // @boundary copy-snapshot
  consume(state.value); // @select copy-snapshot
}
void copy_unrelated_snapshot(State &state, State &other) {
  std::vector<Holder> storage;
  Holder holder{&other};
  Holder copy = holder;
  holder.ptr = &state;
  state.value = 1; // @write copy-unrelated-snapshot
  storage.push_back(copy);
  consume(state.value); // @select copy-unrelated-snapshot
}
void pointer_snapshot(State &state, State &other) {
  std::vector<State *> storage;
  State *pointer = &state;
  State *copy = pointer;
  pointer = &other;
  state.value = 1;
  storage.push_back(copy); // @boundary pointer-snapshot
  consume(state.value); // @select pointer-snapshot
}
void span_copy(State &state) {
  std::vector<std::span<State>> storage;
  std::span<State> view(&state, 1);
  auto copy = view;
  state.value = 1;
  storage.push_back(copy); // @boundary span-copy
  consume(state.value); // @select span-copy
}
void array_view() {
  State state[2]{};
  std::vector<std::span<State>> storage;
  state[0].value = 1;
  std::span<State> view(state);
  storage.push_back(view); // @boundary array-view
  storage[0][0].value = 2;
  consume(state[0].value); // @select array-view
}
void borrow_pointer(State *&);
void unknown_rebind(State &state, State &other) {
  std::vector<State *> storage;
  State *pointer = &other;
  state.value = 1;
  borrow_pointer(pointer);
  storage.push_back(pointer); // @boundary unknown-rebind
  consume(state.value); // @select unknown-rebind
}
void shared_move(State &state) {
  std::vector<std::shared_ptr<State>> storage;
  std::shared_ptr<State> owner(&state, [](State *) {});
  auto copy = std::move(owner);
  state.value = 1;
  storage.push_back(std::move(copy)); // @boundary shared-move
  consume(state.value); // @select shared-move
}
void unique_local_move(State &state) {
  std::vector<std::unique_ptr<State>> storage;
  std::unique_ptr<State> owner(&state);
  auto copy = std::move(owner);
  state.value = 1;
  storage.push_back(std::move(copy)); // @boundary unique-local-move
  consume(state.value); // @select unique-local-move
}
struct Plain { int value; };
void readonly_plain(const Plain &);
void proved_readonly(Plain &state) {
  state.value = 1; // @write proved-readonly
  readonly_plain(state);
  consume(state.value); // @select proved-readonly
}
void indirect_ref(State &state) {
  std::vector<std::reference_wrapper<State>> storage;
  State *pointer = &state;
  State &alias = *pointer;
  state.value = 1;
  storage.push_back(std::ref(alias)); // @boundary indirect-ref
  consume(state.value); // @select indirect-ref
}
void ref_pointer(State &state) {
  std::vector<std::reference_wrapper<State *>> storage;
  State *pointer = &state;
  state.value = 1;
  storage.push_back(std::ref(pointer)); // @boundary ref-pointer
  consume(state.value); // @select ref-pointer
}
void ref_holder(State &state) {
  std::vector<std::reference_wrapper<Holder>> storage;
  Holder holder{&state};
  state.value = 1;
  storage.push_back(std::ref(holder)); // @boundary ref-holder
  consume(state.value); // @select ref-holder
}
void wrapper_move(State &state) {
  std::vector<std::reference_wrapper<State>> storage;
  auto wrapper = std::ref(state);
  state.value = 1;
  storage.push_back(std::move(wrapper)); // @boundary wrapper-move
  consume(state.value); // @select wrapper-move
}
struct Resource;
struct ResourceHolder { Resource *pointer; };
ResourceHolder resource_factory();
Holder holder_factory();
void use_resource(ResourceHolder);
void nominal_resource(State &state) {
  state.value = 1; // @write nominal-resource
  auto resource = resource_factory();
  use_resource(resource);
  consume(state.value); // @select nominal-resource
}
void unknown_factory(State &state) {
  std::vector<Holder> storage;
  state.value = 1;
  auto holder = holder_factory();
  storage.push_back(holder); // @boundary unknown-factory
  consume(state.value); // @select unknown-factory
}
void allocated_aggregate(State &state) {
  std::vector<std::unique_ptr<Holder>> storage;
  state.value = 1;
  auto owner = std::make_unique<Holder>(Holder{&state});
  storage.push_back(std::move(owner)); // @boundary allocated-aggregate
  consume(state.value); // @select allocated-aggregate
}
void allocated_value(State &state) {
  std::vector<std::shared_ptr<State>> storage;
  state.value = 1; // @write allocated-value
  auto owner = std::make_shared<State>(state);
  storage.push_back(owner);
  consume(state.value); // @select allocated-value
}
void readonly_wrapper_get(State &state) {
  auto wrapper = std::cref(state);
  state.value = 1; // @write readonly-wrapper-get
  consume(wrapper.get().value);
  consume(state.value); // @select readonly-wrapper-get
}
void wrapper_value_copy(State &state) {
  std::vector<State> storage;
  auto wrapper = std::ref(state);
  state.value = 1; // @write wrapper-value-copy
  storage.push_back(wrapper.get());
  storage[0].value = 2;
  consume(state.value); // @select wrapper-value-copy
}
void unrelated_wrapper_get(State &state, State &other) {
  auto wrapper = std::ref(other);
  state.value = 1; // @write unrelated-wrapper-get
  wrapper.get().value = 2;
  consume(state.value); // @select unrelated-wrapper-get
}
void retained_wrapper(State &state) {
  auto wrapper = std::ref(state);
  state.value = 1;
  State &alias = wrapper.get(); // @boundary retained-wrapper
  alias.value = 2;
  consume(state.value); // @select retained-wrapper
}
void unknown_pointer_alias(State *pointer, State *alias) {
  std::vector<State *> storage;
  pointer->value = 1;
  storage.push_back(alias); // @boundary unknown-pointer-alias
  storage[0]->value = 2;
  consume(pointer->value); // @select unknown-pointer-alias
}
#include <variant>
using Ticket = std::variant<std::shared_ptr<State>, int>;
Ticket retain(State &);
void finish(const Ticket &);
void sum_provenance(State &state) {
  state.value = 1;
  auto ticket = retain(state);
  finish(ticket); // @boundary sum-provenance
  consume(state.value); // @select sum-provenance
}
using ResourceTicket = std::variant<std::shared_ptr<Resource>, int>;
ResourceTicket resource_ticket();
void finish_resource(const ResourceTicket &);
void sum_unrelated(State &state) {
  state.value = 1; // @write sum-unrelated
  auto ticket = resource_ticket();
  finish_resource(ticket);
  consume(state.value); // @select sum-unrelated
}
void frozen_reference(State &state, State &other) {
  std::vector<State *> storage;
  State *pointer = &state;
  State &alias = *pointer;
  pointer = &other;
  state.value = 1;
  storage.push_back(&alias); // @boundary frozen-reference
  consume(state.value); // @select frozen-reference
}
void frozen_unrelated_reference(State &state, State &other) {
  std::vector<State *> storage;
  State *pointer = &other;
  State &alias = *pointer;
  pointer = &state;
  state.value = 1; // @write frozen-unrelated-reference
  storage.push_back(&alias);
  consume(state.value); // @select frozen-unrelated-reference
}
void reference_live_pointer(State &state, State &other) {
  std::vector<std::reference_wrapper<State *>> storage;
  State *pointer = &other;
  auto wrapper = std::ref(pointer);
  pointer = &state;
  state.value = 1;
  storage.push_back(wrapper); // @boundary reference-live-pointer
  consume(state.value); // @select reference-live-pointer
}
void reference_live_unrelated_pointer(State &state, State &other) {
  std::vector<std::reference_wrapper<State *>> storage;
  State *pointer = &state;
  auto wrapper = std::ref(pointer);
  pointer = &other;
  state.value = 1; // @write reference-live-unrelated-pointer
  storage.push_back(wrapper);
  consume(state.value); // @select reference-live-unrelated-pointer
}
struct HolderReference { Holder &holder; };
void reference_live_field(State &state, State &other) {
  std::vector<HolderReference> storage;
  Holder holder{&other};
  HolderReference reference{holder};
  holder.ptr = &state;
  state.value = 1;
  storage.push_back(reference); // @boundary reference-live-field
  consume(state.value); // @select reference-live-field
}
void reference_live_unrelated_field(State &state, State &other) {
  std::vector<HolderReference> storage;
  Holder holder{&state};
  HolderReference reference{holder};
  holder.ptr = &other;
  state.value = 1; // @write reference-live-unrelated-field
  storage.push_back(reference);
  consume(state.value); // @select reference-live-unrelated-field
}

// Unknown closures and erased pointers cannot be excluded by nominal type.
void callback_unknown(State &state, std::function<void()> callback) {
  std::vector<std::function<void()>> storage;
  state.value = 1;
  storage.push_back(callback); // @boundary callback-unknown
  storage[0]();
  consume(state.value); // @select callback-unknown
}
struct CallbackHolder { std::function<void()> callback; };
void nested_callback_unknown(State &state, CallbackHolder holder) {
  std::vector<CallbackHolder> storage;
  state.value = 1;
  storage.push_back(holder); // @boundary nested-callback-unknown
  consume(state.value); // @select nested-callback-unknown
}
void callback_later_write(State &state, std::function<void()> callback) {
  std::vector<std::function<void()>> storage;
  storage.push_back(callback);
  state.value = 2; // @write callback-later-write
  consume(state.value); // @select callback-later-write
}
void unknown_callback_call(State &state, const std::function<void()> &callback) {
  state.value = 1;
  callback(); // @boundary callback-call
  consume(state.value); // @select callback-call
}
void erased_pointer(State &state, void *pointer) {
  std::vector<void *> storage;
  state.value = 1;
  storage.push_back(pointer); // @boundary erased-pointer
  consume(state.value); // @select erased-pointer
}
struct BaseHolder { State *ptr; };
struct DerivedHolder : BaseHolder {};
DerivedHolder derived_factory();
void inherited_pointer(State &state) {
  std::vector<DerivedHolder> storage;
  auto holder = derived_factory();
  state.value = 1;
  storage.push_back(holder); // @boundary inherited-pointer
  consume(state.value); // @select inherited-pointer
}
struct UnrelatedBase { Resource *ptr; };
struct UnrelatedDerived : UnrelatedBase {};
UnrelatedDerived unrelated_derived_factory();
void unrelated_inherited_pointer(State &state) {
  std::vector<UnrelatedDerived> storage;
  auto holder = unrelated_derived_factory();
  state.value = 1; // @write unrelated-inherited-pointer
  storage.push_back(holder);
  consume(state.value); // @select unrelated-inherited-pointer
}
struct MixedHolder { State *known; std::function<void()> unknown; };
void mixed_unknown(State &state, State &other, std::function<void()> callback) {
  std::vector<MixedHolder> storage;
  MixedHolder holder{&other, callback};
  state.value = 1;
  storage.push_back(holder); // @boundary mixed-unknown
  consume(state.value); // @select mixed-unknown
}
void mixed_known(State &state, State &other) {
  std::vector<MixedHolder> storage;
  MixedHolder holder{&other, [] {}};
  state.value = 1; // @write mixed-known
  storage.push_back(holder);
  consume(state.value); // @select mixed-known
}
struct Deep0 { State * inner; };
struct Deep1 { Deep0 inner; };
struct Deep2 { Deep1 inner; };
struct Deep3 { Deep2 inner; };
struct Deep4 { Deep3 inner; };
struct Deep5 { Deep4 inner; };
struct Deep6 { Deep5 inner; };
struct Deep7 { Deep6 inner; };
struct Deep8 { Deep7 inner; };
struct Deep9 { Deep8 inner; };
struct Deep10 { Deep9 inner; };
struct Deep11 { Deep10 inner; };
struct Deep12 { Deep11 inner; };
struct Deep13 { Deep12 inner; };
struct Deep14 { Deep13 inner; };
struct Deep15 { Deep14 inner; };
struct Deep16 { Deep15 inner; };
struct Deep17 { Deep16 inner; };
struct Deep18 { Deep17 inner; };
struct Deep19 { Deep18 inner; };
struct Deep20 { Deep19 inner; };
struct Deep21 { Deep20 inner; };
struct Deep22 { Deep21 inner; };
struct Deep23 { Deep22 inner; };
struct Deep24 { Deep23 inner; };
struct Deep25 { Deep24 inner; };
struct Deep26 { Deep25 inner; };
struct Deep27 { Deep26 inner; };
struct Deep28 { Deep27 inner; };
struct Deep29 { Deep28 inner; };
struct Deep30 { Deep29 inner; };
struct Deep31 { Deep30 inner; };
struct Deep32 { Deep31 inner; };
struct Deep33 { Deep32 inner; };
struct Deep34 { Deep33 inner; };
struct Deep35 { Deep34 inner; };
struct Deep36 { Deep35 inner; };
struct Deep37 { Deep36 inner; };
struct Deep38 { Deep37 inner; };
struct Deep39 { Deep38 inner; };
struct Deep40 { Deep39 inner; };
struct Deep41 { Deep40 inner; };
struct Deep42 { Deep41 inner; };
struct Deep43 { Deep42 inner; };
struct Deep44 { Deep43 inner; };
struct Deep45 { Deep44 inner; };
struct Deep46 { Deep45 inner; };
struct Deep47 { Deep46 inner; };
struct Deep48 { Deep47 inner; };
struct Deep49 { Deep48 inner; };
struct Deep50 { Deep49 inner; };
struct Deep51 { Deep50 inner; };
struct Deep52 { Deep51 inner; };
struct Deep53 { Deep52 inner; };
struct Deep54 { Deep53 inner; };
struct Deep55 { Deep54 inner; };
struct Deep56 { Deep55 inner; };
struct Deep57 { Deep56 inner; };
struct Deep58 { Deep57 inner; };
struct Deep59 { Deep58 inner; };
struct Deep60 { Deep59 inner; };
struct Deep61 { Deep60 inner; };
struct Deep62 { Deep61 inner; };
struct Deep63 { Deep62 inner; };
struct Deep64 { Deep63 inner; };
struct Deep65 { Deep64 inner; };
struct Deep66 { Deep65 inner; };
struct Deep67 { Deep66 inner; };
struct Deep68 { Deep67 inner; };
struct Deep69 { Deep68 inner; };

void deep_unknown(State &state, Deep69 holder) {
  std::vector<Deep69> storage;
  state.value = 1;
  storage.push_back(holder); // @boundary deep-unknown
  consume(state.value); // @select deep-unknown
}

void empty_callback(State &state) {
  std::vector<std::function<void()>> storage;
  std::function<void()> callback;
  state.value = 1; // @write empty-callback
  storage.push_back(callback);
  consume(state.value); // @select empty-callback
}
void known_callback(State &state) {
  std::vector<std::function<void()>> storage;
  std::function<void()> callback = [&state] { state.value = 2; };
  state.value = 1;
  storage.push_back(callback); // @boundary known-callback
  consume(state.value); // @select known-callback
}
void pointer_alias_write(State *pointer, State *alias) {
  pointer->value = 1;
  alias->value = 2; // @boundary pointer-alias-write
  consume(pointer->value); // @select pointer-alias-write
}
void pointer_alias_later_write(State *pointer, State *alias) {
  alias->value = 2;
  pointer->value = 3; // @write pointer-alias-later-write
  consume(pointer->value); // @select pointer-alias-later-write
}
void pointer_disjoint_write(State &state) {
  State other{};
  State *alias = &other;
  state.value = 1; // @write pointer-disjoint-write
  alias->value = 2;
  consume(state.value); // @select pointer-disjoint-write
}
void helper_unknown_before(std::function<void()> callback, State &state) {
  callback();
  state.value = 3; // @helper-write helper-unknown-before
}
void helper_unknown_after(State &state, std::function<void()> callback) {
  state.value = 3;
  callback();
}
void helper_before(State &state, std::function<void()> callback) {
  state.value = 1;
  helper_unknown_before(callback, state); // @call helper-unknown-before
  consume(state.value); // @select helper-unknown-before
}
void helper_after(State &state, std::function<void()> callback) {
  state.value = 1;
  helper_unknown_after(state, callback); // @boundary helper-unknown-after
  consume(state.value); // @select helper-unknown-after
}
void helper_pointer_after(State &state, State *alias) {
  state.value = 3;
  alias->value = 4;
}
void helper_pointer(State &state, State *alias) {
  state.value = 1;
  helper_pointer_after(state, alias); // @boundary helper-pointer-after
  consume(state.value); // @select helper-pointer-after
}

struct ReceiverState {
  State state;
  void run() {
    std::vector<Holder> storage;
    state.value = 1;
    auto holder = holder_factory();
    storage.push_back(holder); // @boundary receiver-related
    consume(state.value); // @select receiver-related
  }
};
struct OtherState { int value; };
struct ReceiverOther {
  OtherState state;
  void run() {
    std::vector<Holder> storage;
    state.value = 1; // @write receiver-unrelated
    auto holder = holder_factory();
    storage.push_back(holder);
    consume(state.value); // @select receiver-unrelated
  }
};

void known_receiver_alias(State &state, State *alias) {
  state.value = 1;
  alias->set_value(2); // @boundary known-receiver-alias
  consume(state.value); // @select known-receiver-alias
}
void known_receiver_disjoint(State &state) {
  State other{};
  State *alias = &other;
  state.value = 1; // @write known-receiver-disjoint
  alias->set_value(2);
  consume(state.value); // @select known-receiver-disjoint
}
void readonly_receiver_alias(State &state, State *alias) {
  state.value = 1; // @write readonly-receiver-alias
  consume(alias->read_value());
  consume(state.value); // @select readonly-receiver-alias
}
struct Link { Link *next; State *ptr; };
void cyclic_unknown(State &state, Link holder) {
  std::vector<Link> storage;
  state.value = 1;
  storage.push_back(holder); // @boundary cyclic-unknown
  consume(state.value); // @select cyclic-unknown
}

void callback_projection_read(State &state, std::variant<std::function<void()>, int> callbacks) {
  state.value = 1; // @write callback-projection-read
  auto *callback = std::get_if<std::function<void()>>(&callbacks);
  consume(state.value); // @select callback-projection-read
}
void callback_projection_invoke(State &state, std::variant<std::function<void()>, int> callbacks) {
  state.value = 1;
  auto *callback = std::get_if<std::function<void()>>(&callbacks);
  if (callback) (*callback)(); // @boundary callback-projection-invoke
  consume(state.value); // @select callback-projection-invoke
}
