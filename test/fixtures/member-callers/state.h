#pragma once
struct State {
  int records = 0;
  void inspect();
  void inspect(int);
};
struct Session {
  State bank;
  void inspect();
};
void consume(int);
void helper(State &state);
void accept(void (State::*)());
