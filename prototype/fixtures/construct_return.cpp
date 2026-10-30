#include <utility>

struct Payload {
  int values[2];
};

struct Wrapped {
  Payload payload;
  explicit Wrapped(Payload value) : payload(std::move(value)) {}
};

Payload make_payload(int x) {
  return Payload{{x, x + 1}};
}

Wrapped build(int x) {
  return Wrapped{make_payload(x)};
}
