#include "state-sources.h"
void external_seed(Session session) {
  auto batch = fold_left(1, Batch{std::move(session.session_state)}, // @select external
    [](Batch state, int) { state.session_state.value = 900; return state; });
}
