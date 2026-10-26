#include <vector>
#include <functional>
#include <span>
#include <string_view>
#include <memory>
struct State { mutable int value; };
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
