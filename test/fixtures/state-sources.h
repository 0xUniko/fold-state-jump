#pragma once
#include <utility>
struct State { int value; };
struct Session { const void *owner; State session_state; };
struct Batch { State session_state; };
void consume(int);
template<class T, class F> T fold_left(int count, T state, F fn) { return fn(state, count); }
void external_seed(Session session);
inline void header_entry() {
  State state{0}; // @origin header
  state.value = 62; // @write header
  external_seed({nullptr, std::move(state)});
}
