struct A { int b; };
struct State { A a; };
void mutate(A& a) { a.b++; }
int fun2(int b) { return b + 1; }
void example(State state) {
  mutate(state.a);
  int c = fun2(state.a.b);
}
