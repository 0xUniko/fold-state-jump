// Nested aggregate field order, copy/move/alias, and distinct same-named fields.
#include <utility>

struct Left {
  int value = 1;
  int other = 2;
};

struct Right {
  int other = 3;
  int value = 4;
};

struct Pair {
  Left left;
  Right right;
};

Pair copy_left(Pair p) {
  Left l = p.left;      // copy, not storage identity
  l.value = 9;          // must not mutate p.left
  return p;
}

Pair move_pair(Pair p) {
  Pair q = std::move(p);
  q.right.value = 7;
  return q;
}

int read_after(Pair p) {
  Pair q{std::move(p.left), p.right};
  auto &alias = q.right;
  alias.value += 1;
  return q.left.value + q.right.value;
}
