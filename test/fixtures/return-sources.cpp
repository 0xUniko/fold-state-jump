#include <utility>
#include <optional>
#include <algorithm>
struct State { int value; };
struct Pair { State left; State right; };
struct Elements { State values[2]; };
void consume(int);

State direct() {
  State state{0}; // @origin direct
  state.value = 11; // @write direct
  return state;
}
void direct_sink(State state) { consume(state.value); } // @select direct
void direct_entry() { direct_sink(direct()); }

State identity(State state) { return state; }
State relay(State state) { return identity(std::move(state)); }
void parameter_sink(State state) { consume(state.value); } // @select parameter
void parameter_entry() {
  State state{0}; // @origin parameter
  state.value = 21; // @write parameter
  parameter_sink(identity(state));
}
void unrelated_entry() { State other{0}; other.value = 999; consume(identity(other).value); }
void relay_sink(State state) { consume(state.value); } // @select relay
void relay_entry() {
  State state{0}; // @origin relay
  state.value = 31; // @write relay
  relay_sink(relay(state));
}

State field(Pair pair) { return pair.right; }
void field_sink(State state) { consume(state.value); } // @select field
void field_entry() {
  Pair pair{}; // @origin field
  pair.right.value = 41; // @write field
  pair.left.value = 42;
  field_sink(field(pair));
}

Pair aggregate(State left, State right) { return Pair{std::move(right), std::move(left)}; }
void aggregate_sink(Pair pair) {
  consume(pair.left.value); // @select aggregate-left
  consume(pair.right.value); // @select aggregate-right
}
void aggregate_entry() {
  State left{0}; // @origin aggregate-right
  State right{0}; // @origin aggregate-left
  left.value = 51; // @write aggregate-right
  right.value = 52; // @write aggregate-left
  aggregate_sink(aggregate(left, right));
}
State nested_field(State state) { return aggregate(state, state).right; }
void nested_sink(State state) { consume(state.value); } // @select nested
void nested_entry() {
  State state{0}; // @origin nested
  state.value = 53; // @write nested
  nested_sink(nested_field(state));
}

State branches(State first, State second, bool condition) {
  if (condition) return first;
  return second;
}
void branches_sink(State state) { consume(state.value); } // @select branches
void branches_entry(bool condition) {
  State first{0}; // @origin branch-first
  State second{0}; // @origin branch-second
  first.value = 61; // @write branch-first
  second.value = 62; // @write branch-second
  branches_sink(branches(first, second, condition));
}
State moved(State state) { return std::move(state); }
State forwarded(State state) { return std::forward<State>(state); }
void moved_entry() {
  State state{0};
  state.value = 71; // @write moved
  auto result = moved(state);
  state.value = 999;
  consume(result.value); // @select moved
}
void forwarded_entry() {
  State state{0};
  state.value = 72; // @write forwarded
  auto result = forwarded(state);
  consume(result.value); // @select forwarded
}

struct Tag {};
State operator+(State state, Tag) { return state; }
struct Invoker { State operator()(State state) const { return state; } };
void operator_entry() {
  State state{0};
  state.value = 81; // @write operator
  auto result = state + Tag{};
  consume(result.value); // @select operator
}
void member_operator_entry() {
  State state{0};
  state.value = 82; // @write member-operator
  auto result = Invoker{}(state);
  consume(result.value); // @select member-operator
}
void lambda_entry() {
  State state{0};
  state.value = 91; // @write lambda
  auto callable = [](auto state) { return state; };
  auto result = callable(state);
  consume(result.value); // @select lambda
}
void capture_entry() {
  State state{0};
  auto callable = [&]() { return state; };
  state.value = 92; // @write capture
  auto result = callable();
  state.value = 999;
  auto other = callable();
  consume(result.value); // @select capture
}
State dereference(State *pointer) { return *pointer; }
State element(Elements elements) { return elements.values[1]; }
void pointer_entry() {
  State state{0};
  state.value = 101; // @write pointer
  auto result = dereference(&state);
  consume(result.value); // @select pointer
}
void element_entry() {
  Elements elements{};
  elements.values[1].value = 102; // @write element
  elements.values[0].value = 999;
  auto result = element(elements);
  consume(result.value); // @select element
}

State unknown(State);
State partial(State state, bool condition) {
  if (condition) return state;
  return unknown(state);
}
void partial_sink(State state) { consume(state.value); } // @select partial
void partial_entry(bool condition) {
  State state{0}; // @origin partial
  state.value = 111; // @write partial
  partial_sink(partial(state, condition));
}
int arithmetic(State state) { return state.value + 1; }
void arithmetic_entry() {
  State state{0}; state.value = 999;
  auto result = arithmetic(state);
  consume(result); // @select arithmetic
}
struct Custom { State state; Custom(const Custom &other) : state{other.state.value + 1} {} };
Custom custom(Custom &object) { return object; }
void custom_entry(Custom &object) {
  object.state.value = 999;
  auto result = custom(object);
  consume(result.state.value); // @select custom
}
State recursive(State state, bool condition) {
  if (condition) return state;
  return recursive(state, condition);
}
void recursive_entry(bool condition) {
  State state{0}; state.value = 121; // @write recursive
  auto result = recursive(state, condition);
  consume(result.value); // @select recursive
}
State conditional_write(State state, bool condition) {
  if (condition) state.value = 999;
  return state;
}
void conditional_entry(bool condition) {
  State state{0}; state.value = 999;
  auto result = conditional_write(state, condition);
  consume(result.value); // @select conditional-write
}
State rebound(State *pointer, State *other) {
  pointer = other;
  return *pointer;
}
void rebound_entry() {
  State state{0}, other{0}; state.value = 999;
  auto result = rebound(&state, &other);
  consume(result.value); // @select rebound
}
std::optional<State> optional(State state) { return state; }
void optional_entry() {
  State state{0}; state.value = 999;
  auto result = optional(state);
  consume(result->value); // @select optional
}
State &reference(State &state) { return state; }
State *pointer_return(State *state) { return state; }
void reference_entry() {
  State state{0}; state.value = 1;
  auto &result = reference(state);
  state.value = 999;
  consume(result.value); // @select reference-time
}
void pointer_return_entry() {
  State state{0}; state.value = 1;
  auto *result = pointer_return(&state);
  state.value = 999;
  consume(result->value); // @select pointer-time
}
State *algorithm(State *first, State *last, State *output) { return std::move(first, last, output); }
void algorithm_entry() {
  State states[2]{}, output[2]{};
  auto *result = algorithm(states, states + 2, output);
  consume(result != nullptr); // @select algorithm
}
State local_branches(State state, bool condition) {
  if (condition) {
    state.value = 131; // @write local-first
    return state;
  } else {
    state.value = 132; // @write local-second
    return state;
  }
}
void local_branches_entry(bool condition) {
  State state{0};
  auto result = local_branches(state, condition);
  consume(result.value); // @select local-branches
}
void repeated_sink(State state) { consume(state.value); } // @select repeated
void repeated_entry() {
  State state{0}; // @origin repeated
  state.value = 141; // @write repeated
  repeated_sink(identity(identity(state)));
}
void lambda_sink(State state) { consume(state.value); } // @select lambda-source
void lambda_source_entry() {
  State state{0}; // @origin lambda-source
  state.value = 142; // @write lambda-source
  auto callable = [](State state) { return state; };
  lambda_sink(callable(state));
}
struct Receiver {
  State state;
  State get() const { return state; }
};
void receiver_sink(State state) { consume(state.value); } // @select receiver
void receiver_entry() {
  Receiver receiver{}; // @origin receiver
  receiver.state.value = 143; // @write receiver
  receiver_sink(receiver.get());
}
State unreachable(State first, State second) {
  return first;
  return second;
}
void unreachable_entry() {
  State first{0}, second{0};
  first.value = 151; // @write unreachable
  second.value = 999;
  auto result = unreachable(first, second);
  consume(result.value); // @select unreachable
}
State unstructured(State first, State second) {
  goto other;
  return first;
other:
  return second;
}
void unstructured_entry() {
  State first{0}, second{0}; first.value = 999; second.value = 999;
  auto result = unstructured(first, second);
  consume(result.value); // @select unstructured
}
State &dangling() {
  State state{0}; state.value = 999;
  return state;
}
State *dangling_pointer() {
  State state{0}; state.value = 999;
  return &state;
}
struct Borrow { State *pointer; };
Borrow dangling_aggregate() {
  State state{0}; state.value = 999;
  return {&state};
}
void dangling_sink(State state) { consume(state.value); } // @select dangling
void dangling_pointer_sink(State *pointer) { consume(pointer->value); } // @select dangling-pointer
void dangling_aggregate_sink(Borrow object) { consume(object.pointer->value); } // @select dangling-aggregate
void dangling_entry() {
  dangling_sink(dangling());
  dangling_pointer_sink(dangling_pointer());
  dangling_aggregate_sink(dangling_aggregate());
}

// Local storage identity alone cannot prove the final accumulator's value.
State step_state(State state) { state.value = 301; return state; }
State counted_state(State seed, int count) {
  if (count == 0) return State(seed); // @return counted-zero
  State accumulator = seed; // @initial counted
  for (int i = 0; i < count; ++i)
    accumulator = step_state(accumulator); // @update counted
  return accumulator; // @return counted-final
}
void counted_sink(State state) { consume(state.value); } // @select counted
void counted_entry(int count) {
  State seed{0}; // @origin counted
  seed.value = 302; // @write counted
  counted_sink(counted_state(seed, count));
}
State mutated_state(State seed, int count) {
  State accumulator = seed;
  while (count-- > 0) accumulator.value += 1;
  return accumulator;
}
void mutated_sink(State state) { consume(state.value); } // @select mutated
void mutated_entry(int count) { State seed{0}; seed.value = 303; mutated_sink(mutated_state(seed, count)); }
State nested_iteration(State seed) {
  auto unused = [](State state) { while (state.value < 10) ++state.value; return state; };
  return seed;
}
void nested_iteration_sink(State state) { consume(state.value); } // @select nested-iteration
void nested_iteration_entry() { State seed{0}; seed.value = 304; nested_iteration_sink(nested_iteration(seed)); }

State constructed_state(State state) { return State(state); }
void constructed_sink(State state) { consume(state.value); } // @select constructed
void constructed_entry() {
  State seed{0}; // @origin constructed
  seed.value = 305; // @write constructed
  constructed_sink(constructed_state(seed));
}

Pair disjoint_iteration(Pair seed, int count) {
  Pair accumulator = seed; // @origin disjoint-iteration
  while (count-- > 0) accumulator.right.value += 1;
  return accumulator;
}
void disjoint_iteration_sink(Pair pair) { consume(pair.left.value); } // @select disjoint-iteration
void disjoint_iteration_entry(int count) {
  Pair seed{}; // @seed disjoint-iteration
  seed.left.value = 306; // @write disjoint-iteration
  disjoint_iteration_sink(disjoint_iteration(seed, count));
}

struct TemporaryReceiver { State state; State get_state() { return state; } };
TemporaryReceiver unavailable_receiver();
void unavailable_receiver_sink(State state) { consume(state.value); } // @select unavailable-receiver
void unavailable_receiver_entry() { unavailable_receiver_sink(unavailable_receiver().get_state()); }

// A nontrivial destructor makes Clang insert CXXBindTemporaryExpr around the
// implicit, field-preserving copy inside ConstructorConversion.
struct ManagedState { int value; ~ManagedState() {} };
ManagedState constructed_managed(ManagedState state) { return ManagedState(state); }
void constructed_managed_sink(ManagedState state) { consume(state.value); } // @select constructed-managed
void constructed_managed_entry() {
  ManagedState seed{0}; // @origin constructed-managed
  seed.value = 307; // @write constructed-managed
  constructed_managed_sink(constructed_managed(seed));
}

void exclusive_sink(State state) { consume(state.value); } // @select exclusive
void exclusive_entry(bool branch) {
  State state{0};
  if (branch) state.value = 999;
  else exclusive_sink(identity(state));
}
void shared_branch_sink(State state) { consume(state.value); } // @select shared-branch
void shared_branch_entry(bool branch) {
  State state{0}; // @origin shared-branch
  if (branch) {
    state.value = 308; // @write shared-branch
    shared_branch_sink(identity(state));
  }
}
