#include <algorithm>
#include <ranges>

struct GuardState {
  int hits = 0;
  int misses = 0;
};

GuardState guard_fold(int n) {
  return std::ranges::fold_left(
      std::views::iota(0, n), GuardState{},
      [](GuardState state, int layer) {
        if (layer == 0)
          ++state.hits;
        else
          ++state.misses;
        return state;
      });
}
