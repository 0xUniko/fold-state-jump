#include <vector>
#include <functional>
struct State { int value; };
void consume(int);
void read_only(const State &);

// Escapes: the target's address or reference enters a container, so a later
// element write can mutate the target without any write indexed to it.
void escape_push_back_pointer(State &state) {
  std::vector<State *> storage;
  state.value = 1;
  storage.push_back(&state); // @escape push-back-pointer
  storage[0]->value = 2;
  consume(state.value); // @select push-back-pointer
}
void escape_push_back_refwrapper(State &state) {
  std::vector<std::reference_wrapper<State>> storage;
  state.value = 3;
  storage.push_back(std::ref(state)); // @escape push-back-refwrapper
  storage[0].get().value = 4;
  consume(state.value); // @select push-back-refwrapper
}
void escape_emplace_pointer(State &state) {
  std::vector<State *> storage;
  state.value = 5;
  storage.emplace(storage.end(), &state); // @escape emplace-pointer
  storage[0]->value = 6;
  consume(state.value); // @select emplace-pointer
}
void escape_emplace_back_refwrapper(State &state) {
  std::vector<std::reference_wrapper<State>> storage;
  state.value = 7;
  storage.emplace_back(std::ref(state)); // @escape emplace-back-refwrapper
  storage.back().get().value = 8;
  consume(state.value); // @select emplace-back-refwrapper
}
void escape_insert_pointer(State &state) {
  std::vector<State *> storage;
  state.value = 9;
  storage.insert(storage.end(), &state); // @escape insert-pointer
  storage[0]->value = 10;
  consume(state.value); // @select insert-pointer
}
void escape_insert_refwrapper(State &state) {
  std::vector<std::reference_wrapper<State>> storage;
  state.value = 11;
  storage.insert(storage.end(), std::ref(state)); // @escape insert-refwrapper
  storage[0].get().value = 12;
  consume(state.value); // @select insert-refwrapper
}
void escape_pointer_variable(State &state) {
  std::vector<State *> storage;
  State *pointer = &state;
  state.value = 13;
  storage.push_back(pointer); // @escape pointer-variable
  storage[0]->value = 14;
  consume(state.value); // @select pointer-variable
}
void escape_alias_reference(State &state) {
  std::vector<State *> storage;
  State &alias = state;
  state.value = 15;
  storage.push_back(&alias); // @escape alias-reference
  storage[0]->value = 16;
  consume(state.value); // @select alias-reference
}

// Verified results that must not regress.
void container_self_mutation(std::vector<int> &records) {
  records.push_back(1);
  records.push_back(2); // @write container-self
  consume(records[0]); // @select container-self
}
void by_value_copy(State &state, std::vector<State> &storage) {
  state.value = 17; // @write by-value-copy
  storage.push_back(state);
  storage[0].value = 18;
  consume(state.value); // @select by-value-copy
}
void unrelated_pointer(State &state, State &other, std::vector<State *> &storage) {
  state.value = 19; // @write unrelated-pointer
  storage.push_back(&other);
  consume(state.value); // @select unrelated-pointer
}
void readonly_parameter(State &state, std::vector<int> &storage) {
  state.value = 20; // @write readonly-parameter
  storage.push_back(1);
  read_only(state);
  consume(state.value); // @select readonly-parameter
}
void escape_then_direct_write(State &state, std::vector<State *> &storage) {
  storage.push_back(&state);
  state.value = 21; // @write escape-then-direct-write
  consume(state.value); // @select escape-then-direct-write
}
