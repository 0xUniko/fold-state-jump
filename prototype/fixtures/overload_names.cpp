// Overload and same-name negative controls.
int convert(int value) { return value + 1; }
double convert(double value) { return value + 0.5; }

int caller(int value) {
  int local = convert(value);
  double other = convert(1.0);
  return local + static_cast<int>(other);
}

struct A { int state = 0; };
struct B { int state = 0; };

int same_name() {
  A a;
  B b;
  a.state = 1;
  b.state = 2;
  return a.state;
}
