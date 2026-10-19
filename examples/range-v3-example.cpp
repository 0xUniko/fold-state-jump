#include <range/v3/algorithm/fold_left.hpp>
#include <range/v3/view/iota.hpp>

struct A { int b; };
struct State { A a; };

void mutate(A& a) { a.b++; }
int fun2(int b) { return b + 1; }

int main() {
  auto result = ranges::fold_left(
      ranges::views::iota(1, 10), State{A{2}},
      [](State state, int) {
        mutate(state.a);
        int c = fun2(state.a.b);
        return state;
      });
}
