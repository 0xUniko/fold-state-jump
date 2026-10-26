#include "state-sources.h"
#include <optional>
void direct_seed(Session session) {
  auto batch = fold_left(1, Batch{std::move(session.session_state)}, // @select direct
    [](Batch state, int) { state.session_state.value = 900; return state; });
  batch.session_state.value = 901;
}
void direct_entry() {
  Session session{nullptr, {0}}; // @origin direct
  session.session_state.value = 10;
  session.session_state.value = 11; // @write direct
  direct_seed(session);
  session.session_state.value = 12;
}
void moved_seed(Session session) {
  auto batch = fold_left(1, Batch{std::move(session.session_state)}, // @select moved
    [](Batch state, int) { state.session_state.value = 900; return state; });
}
void moved_entry() {
  Session session{nullptr, {0}}; // @origin moved
  session.session_state.value = 21; // @write moved
  moved_seed(std::move(session));
}
void aggregate_seed(Session session) {
  auto batch = fold_left(1, Batch{std::move(session.session_state)}, // @select aggregate
    [](Batch state, int) { state.session_state.value = 900; return state; });
}
void aggregate_entry() {
  State state{0}; // @origin aggregate
  state.value = 31; // @write aggregate
  aggregate_seed(Session{nullptr, std::move(state)});
  state.value = 32;
}
struct Envelope { Session session; };
void nested_seed(Envelope envelope) {
  auto batch = fold_left(1, Batch{std::move(envelope.session.session_state)}, // @select nested
    [](Batch state, int) { state.session_state.value = 900; return state; });
}
void nested_entry() {
  State state{0}; // @origin nested
  state.value = 41; // @write nested
  nested_seed(Envelope{{nullptr, std::move(state)}});
}
void helper_seed(Session session) {
  auto batch = fold_left(1, Batch{std::move(session.session_state)}, // @select helpers
    [](Batch state, int) { state.session_state.value = 900; return state; });
}
void helper_one(Session session) { helper_seed(std::move(session)); }
void helper_two(Session session) { helper_one(std::move(session)); }
void helper_entry() {
  State state{0}; // @origin helpers
  state.value = 51; // @write helpers
  helper_two({nullptr, std::move(state)});
}
void external_entry() {
  State state{0}; // @origin external
  state.value = 61; // @write external
  external_seed({nullptr, std::move(state)});
}
void alternatives_seed(Session session) {
  consume(session.session_state.value); // @select alternatives
}
void alternatives_a() {
  State first{0}; // @origin alternative-a
  first.value = 71; // @write alternative-a
  alternatives_seed({nullptr, std::move(first)});
  first.value = 72;
}
void alternatives_b() {
  State second{0}; // @origin alternative-b
  second.value = 81; // @write alternative-b
  alternatives_seed({nullptr, std::move(second)});
}
void local_copy_seed(Session session) {
  consume(session.session_state.value); // @select local-copy
}
void local_copy_entry() {
  State original{0};
  original.value = 91; // @write local-copy
  State copy = original;
  original.value = 92;
  local_copy_seed({nullptr, std::move(copy)});
}
struct Custom {
  int value;
  Custom(int value) : value(value) {}
  Custom(const Custom &) : value(1000) {}
  Custom(Custom &&) : value(2000) {}
};
void custom_seed(Custom state) { consume(state.value); } // @select custom
void custom_entry() {
  Custom state{0};
  state.value = 100;
  custom_seed(std::move(state));
}
struct CustomParent { Custom state; };
void custom_parent_seed(CustomParent parent) { consume(parent.state.value); } // @select custom-parent
void custom_parent_entry() {
  CustomParent parent{Custom{0}};
  parent.state.value = 101;
  custom_parent_seed(std::move(parent));
}
void pointer_identity(int *p, int *q) {
  *p = 1; // @write pointee
  p = q; // @write pointer
  consume(*p); // @select rebind
  consume(p != nullptr); // @select pointer
}
void pointer_stable(int *p) {
  *p = 2; // @write stable-pointee
  consume(*p); // @select stable-pointee
}
void array_identity() {
  int values[2]{};
  values[0] = 3; // @write array-zero
  values[1] = 4;
  consume(values[0]); // @select array-zero
}
void array_unknown(int index) {
  int values[2]{};
  values[0] = 5;
  values[index] = 6;
  consume(values[0]); // @select array-unknown
}
void conditional_entry(bool condition) {
  Session session{nullptr, {0}};
  if (condition) session.session_state.value = 110; // @write conditional
  consume(session.session_state.value); // @select conditional
}
void no_mutation_seed(Session session) { consume(session.session_state.value); } // @select no-mutation
void no_mutation_entry() { no_mutation_seed({nullptr, {0}}); }
void factory_seed(Session session) { consume(session.session_state.value); } // @select factory
Session factory();
void factory_entry() { factory_seed(factory()); }
void single_seed(Session session) {
  consume(session.session_state.value); // @select single
}
void single_helper(Session session) { single_seed(std::move(session)); }
void single_entry() {
  State state{0}; // @origin single
  state.value = 120; // @write single
  single_helper({nullptr, std::move(state)});
}
void alias_seed(Session session) {
  consume(session.session_state.value); // @select alias
}
void alias_entry() {
  Session session{nullptr, {0}}; // @origin alias
  auto &alias = session.session_state;
  alias.value = 130; // @write alias
  alias_seed({nullptr, std::move(alias)});
}
void fold_stages(Session session) {
  session.session_state.value = 140; // @write fold-seed
  auto batch = fold_left(1, Batch{std::move(session.session_state)}, // @select fold-seed
    [](Batch state, int) {
      consume(state.session_state.value); // @select fold-round
      state.session_state.value = 141; // @write fold-round
      return state;
    });
  batch.session_state.value = 142; // @write fold-after
  consume(batch.session_state.value); // @select fold-after
}
void no_fold_write(Session session) {
  auto batch = fold_left(1, Batch{std::move(session.session_state)},
    [](Batch state, int) {
      consume(state.session_state.value); // @select no-fold-write
      return state;
    });
}
void custom_whole_seed(CustomParent parent) { consume(parent.state.value); consume(parent.state.value); } // @select custom-whole
void custom_whole_entry() {
  CustomParent parent{Custom{0}};
  parent.state.value = 150;
  custom_whole_seed(std::move(parent));
}
void header_root() { header_entry(); }
void pointer_nested(int **p, int *q) {
  **p = 160;
  *p = q;
  consume(**p); // @select nested-rebind
}
void pointer_subscript(int *p, int *q) {
  p = q;
  consume(p[1]); // @select pointer-subscript
}
void array_helper(State (&states)[2], int index) { states[index].value = 170; }
void array_helper_entry(int index) {
  State states[2]{};
  states[0].value = 171;
  array_helper(states, index);
  consume(states[0].value); // @select array-helper
}
void pointer_helper(int *&p, int *q) { p = q; }
void pointer_helper_entry(int *p, int *q) {
  *p = 172;
  pointer_helper(p, q);
  consume(*p); // @select pointer-helper-rebind
}
void custom_capture_entry() {
  Custom state{0};
  state.value = 180;
  auto fn = [state] {
    consume(state.value); // @select custom-capture
  };
  fn();
}
void pointer_capture_entry() {
  State state{0};
  State *p = &state;
  p->value = 181;
  auto fn = [p] {
    consume(p->value); // @select pointer-capture
  };
  p->value = 182;
  fn();
}
struct ReferenceSession { State &state; };
void reference_member_seed(ReferenceSession session) {
  consume(session.state.value); // @select reference-member-copy
}
void reference_member_entry() {
  State state{0};
  ReferenceSession session{state};
  session.state.value = 190;
  reference_member_seed(session);
}
struct PointerSession { State *state; };
void pointer_member_seed(PointerSession session) {
  consume(session.state->value); // @select pointer-member-copy
}
void pointer_member_entry() {
  State state{0};
  PointerSession session{&state};
  session.state->value = 191;
  pointer_member_seed(session);
}
void pointer_origin_order() {
  State state{0}; // @origin pointer-before
  state.value = 200; // @write pointer-before
  State other{0};
  State *p = &state;
  consume(p->value); // @select pointer-before
  p = &other;
  consume(p->value); // @select pointer-after
}
struct OptionalSession { std::optional<Custom> state; };
void optional_seed(OptionalSession session) {
  consume(session.state->value); // @select optional-copy
}
void optional_entry() {
  OptionalSession parent{};
  parent.state.emplace(210);
  optional_seed(std::move(parent));
}
