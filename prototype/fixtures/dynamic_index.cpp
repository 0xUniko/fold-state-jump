// Dynamic container index identity.
#include <vector>

struct Store {
  std::vector<int> values;
  int count = 0;
};

void set_at(Store &store, int index, int value) {
  store.values[index] = value;
  store.count += 1;
}

int get_at(const Store &store, int index) {
  return store.values[index];
}

void set_constant(Store &store) {
  store.values[0] = 7;
  store.values[1] = 8;
}
