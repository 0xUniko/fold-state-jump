#pragma once
#include <utility>
struct State { int value; };
struct TokenInput {};
struct EmbeddingInput {};
struct Pipeline {
  template<class Input>
  State execute(State state, Input input) const { // @member-declaration
    return state; // @member-use
  }
  State execute(State state, long) const { return state; } // @overload
  State run_tokens(State state) const { return execute(std::move(state), TokenInput{}); }
  State run_embeddings(State state) const { return execute(std::move(state), EmbeddingInput{}); }
};
template<class Input>
State execute(State state, Input input) { // @free-declaration
  return state; // @free-use
}
template<> inline State execute(State state, bool) { return State{99}; } // @specialization
