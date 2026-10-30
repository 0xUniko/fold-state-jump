struct Inner {
  int a;
  int b;
};

struct Outer {
  Inner inner;
  int other;
};

void assign_aggregate(Outer &outer, int x) {
  outer.inner = Inner{x, x + 1};
}

int read_after_assign(Outer &outer, int x) {
  outer.inner = Inner{x, x + 1};
  return outer.inner.b;
}
