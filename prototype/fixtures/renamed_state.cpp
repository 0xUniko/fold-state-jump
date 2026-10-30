// Semantically equivalent to fold_recurrence.cpp with different names and
// changed member order. The analyzer must not depend on identifiers.
#include <numeric>
#include <utility>
#include <vector>

struct Tally {
  int misses = 0;
  int hits = 0;
};

struct Crate {
  int *handle = nullptr;
  std::vector<int> payload;
  Tally tally;
};

struct Envelope {
  Crate crate;
  int epoch = 0;
};

Crate relay(Crate crate) {
  crate.tally.hits += 1;
  return crate;
}

int advance_renamed(Envelope envelope, int count) {
  Crate crate{nullptr, std::move(envelope.crate.payload),
              std::move(envelope.crate.tally)};
  std::vector<int> steps(static_cast<size_t>(count));
  std::iota(steps.begin(), steps.end(), 0);
  auto result = std::accumulate(
      steps.begin(), steps.end(), crate,
      [](Crate acc, int step) {
        if (step % 2 == 0)
          ++acc.tally.hits;
        else
          acc.tally.misses += 1;
        return acc;
      });
  auto next = relay(std::move(result));
  (void)next;
  return result.tally.hits;
}
