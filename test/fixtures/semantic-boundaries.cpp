#include <memory>
#include <functional>
#include <thread>
#include <utility>
struct State { int value; };
void consume(int);
void unknown(State &);
void unknown_pointer(State *);
void scalar(int);
void read_only(const State &);
void unknown_ref(State &state) {
  state.value = 1;
  unknown(state);
  consume(state.value); // @select unknown-ref
}
void unknown_ptr(State &state) {
  state.value = 2;
  unknown_pointer(&state);
  consume(state.value); // @select unknown-ptr
}
void unrelated(State &state) {
  State other{0};
  state.value = 3; // @write unrelated
  unknown(other);
  scalar(state.value);
  read_only(state);
  consume(state.value); // @select unrelated
}
struct ReferenceSession { State &state; };
void update_reference(ReferenceSession session) { session.state.value = 20; }
void shared_reference(ReferenceSession session) {
  session.state.value = 4;
  update_reference(session);
  consume(session.state.value); // @select shared-reference
}
struct PointerSession { State *state; };
void shared_reference_alias() {
  State state{0};
  ReferenceSession session{state};
  state.value = 40;
  update_reference(session);
  consume(state.value); // @select shared-reference-alias
}
void update_pointer(PointerSession session) { session.state->value = 21; }
void shared_pointer(PointerSession session) {
  session.state->value = 5;
  update_pointer(session);
  consume(session.state->value); // @select shared-pointer
}
struct SmartSession { std::shared_ptr<State> state; };
void shared_pointer_alias() {
  State state{0};
  PointerSession session{&state};
  state.value = 50;
  update_pointer(session);
  consume(state.value); // @select shared-pointer-alias
}
void update_smart(SmartSession session) { session.state->value = 22; }
void shared_smart(SmartSession session) {
  session.state->value = 6;
  update_smart(session);
  consume(session.state->value); // @select shared-smart
}
void deferred(std::function<void()>);
void lambda_unknown(State &state) {
  state.value = 7;
  auto fn = [&] { consume(state.value); }; // @select lambda-unknown
  deferred(fn);
}
template<class Fn> void invoke(Fn fn) { fn(); }
void lambda_helper(State &state) {
  state.value = 8;
  auto fn = [&] { consume(state.value); }; // @select lambda-helper
  state.value = 9;
  invoke(fn);
}
void lambda_direct(State &state) {
  state.value = 10;
  auto fn = [&] { consume(state.value); }; // @select lambda-direct
  state.value = 11; // @write lambda-direct
  fn();
}
void lambda_snapshot(State &state) {
  state.value = 12; // @write lambda-snapshot
  auto fn = [state] { consume(state.value); }; // @select lambda-snapshot
  state.value = 13;
  fn();
}
void callback_unknown(State &state) {
  state.value = 14;
  deferred([&] { state.value = 15; });
  consume(state.value); // @select callback-unknown
}
void alias_unknown(State &state) {
  auto *alias = &state;
  state.value = 16;
  unknown_pointer(alias);
  consume(state.value); // @select alias-unknown
}
struct Returning { State state; };
Returning returned(State state) { state.value = 17; return {std::move(state)}; }
void returned_entry() {
  auto result = returned({0});
  consume(result.state.value); // @select returned
}
struct Constructing {
  explicit Constructing(State &state) { state.value = 30; }
};
void constructor_effect(State &state) {
  state.value = 31;
  Constructing constructing(state);
  consume(state.value); // @select constructor-effect
}
void thread_effect(State &state) {
  state.value = 32;
  std::thread thread([&] { state.value = 33; });
  consume(state.value); // @select thread-effect
  thread.join();
}
State assigned_result(State &state);
void assignment_order(State &state) {
  state = assigned_result(state); // @write assignment-order
  consume(state.value); // @select assignment-order
}
template<class Fn> State not_fold_left(State state, Fn fn) { return fn(state); }
void similar_name() {
  not_fold_left(State{}, [](State state) {
    consume(state.value); // @select similar-name
    state.value = 99;
    return state;
  });
}
void local_rebind(State *p, State *q) { p = q; }
void pointer_binding(State *p, State *q) {
  p = q; // @write pointer-binding
  local_rebind(p, nullptr);
  consume(p != nullptr); // @select pointer-binding
}
void pointer_copy() {
  State state{0}; // @origin pointer-copy
  state.value = 41; // @write pointer-copy
  auto *p = &state;
  local_rebind(p, nullptr);
  consume(p->value); // @select pointer-copy
}
void possible_alias(State &state, State &other) {
  state.value = 42;
  unknown(other);
  consume(state.value); // @select possible-alias
}
void readonly_callback(State &state) {
  state.value = 43; // @write readonly-callback
  deferred([&] { consume(state.value); });
  consume(state.value); // @select readonly-callback
}
