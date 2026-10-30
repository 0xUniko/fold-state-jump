#include <cstdint>
#include <utility>

struct Acc {
  int count;
  int total;
};

int sum_squares(int n) {
  Acc acc{0, 0};
  for (int i = 0; i < n; ++i) {
    acc.count += 1;
    acc.total += i * i;
  }
  return acc.total;
}
