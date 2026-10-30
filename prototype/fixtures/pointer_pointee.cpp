#include <algorithm>
#include <numeric>
#include <ranges>

struct Slot {
  int keys[4];
  int tick;
};

struct Retain {
  Slot *slots;
  int *counter;
};

int fold_through(Slot &slot, int *counter, int n) {
  const auto retained = std::ranges::fold_left(
      std::views::iota(0, n), Retain{&slot, counter},
      [](Retain state, int i) {
        state.slots->keys[i % 4] = i;
        ++*state.counter;
        ++state.slots->tick;
        return state;
      });
  return retained.slots->keys[0];
}
