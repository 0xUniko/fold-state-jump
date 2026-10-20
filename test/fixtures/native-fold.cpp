struct State { int value; };
void mutate(State &state) { state.value++; }
template <typename F> State fold_left(State state, F fn) { return fn(state); }
State example() {
  return fold_left(State{1}, [](State state) {
    mutate(state);
    state.value++;
    return state;
  });
}
