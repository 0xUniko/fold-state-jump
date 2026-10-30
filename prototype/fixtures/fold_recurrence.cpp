// Semantically equivalent to the nano-infer "session/accumulator/return"
// structure, with unrelated names and ordinary std::accumulate.
#include <numeric>
#include <utility>
#include <vector>

struct Bucket {
  int hits = 0;
  int misses = 0;
};

struct Box {
  std::vector<int> payload;
  Bucket bucket;
  int *handle = nullptr;
};

struct Env {
  int epoch = 0;
  Box box;
};

__attribute__((noinline)) Box carry(Box box) {
  box.bucket.hits += 1;
  return box;
}

int advance(Env env, int n) {
  auto box = Box{std::move(env.box.payload), std::move(env.box.bucket), nullptr};
  std::vector<int> layers(static_cast<size_t>(n));
  std::iota(layers.begin(), layers.end(), 0);
  auto result = std::accumulate(
      layers.begin(), layers.end(), box,
      [](Box acc, int layer) {
        auto &bucket = acc.bucket;
        if (layer % 2 == 0)
          ++bucket.hits;
        else
          bucket.misses += 1;
        return acc;
      });
  auto next = carry(std::move(result));
  (void)next;
  return result.bucket.hits;
}
