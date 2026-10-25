#include "state.h"
void run() {
  State state{}; // @origin A
  state.records++; // @write A
  state.inspect(); // @call A
  State other{}; // @origin B
  other.records++; // @write B
  other.inspect(); // @call B
}
void pointer_run() {
  State state{};
  State *pointer = &state; // @origin C
  pointer->records++; // @write C
  pointer->inspect(); // @call C
}
void helper(State &state) {
  state.inspect(); // @call helper
}
void helper_run() {
  State state{}; // @origin helper
  state.records++; // @write helper
  helper(state); // @call outer
}
void nested_run() {
  Session session{}; // @origin nested
  session.bank.records++; // @write nested
  session.inspect(); // @call nested
}
void rejected() {
  State state{};
  state.inspect(1); // @call overload
  auto reference = static_cast<void (State::*)()>(&State::inspect); // @call reference
  accept(static_cast<void (State::*)()>(&State::inspect)); // @call argument
}
