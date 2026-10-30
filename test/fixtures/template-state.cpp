#include "template-state.h"
State tokens() {
  State state{1}; // @tokens-origin
  state.value = 2; // @tokens-write
  return Pipeline{}.run_tokens(std::move(state));
}
State embeddings() {
  State state{3}; // @embeddings-origin
  state.value = 4; // @embeddings-write
  return Pipeline{}.run_embeddings(std::move(state));
}
State free_tokens() {
  State state{5}; // @free-tokens-origin
  state.value = 6; // @free-tokens-write
  return execute(std::move(state), TokenInput{});
}
State free_embeddings() {
  State state{7}; // @free-embeddings-origin
  state.value = 8; // @free-embeddings-write
  return execute(std::move(state), EmbeddingInput{});
}
State unrelated() {
  return Pipeline{}.execute(State{9}, 0L);
}
State specialized() {
  return execute(State{10}, true);
}
