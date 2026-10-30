#include <cstdint>
#include <utility>
#include <vector>

struct BankState {
  std::vector<int> slots;
  int hits = 0;
  int misses = 0;
};

struct SessionState {
  int position = 0;
  std::vector<int> slots;
  BankState bank_state;
};

struct LayerState {
  std::vector<int> slots;
  BankState bank_state;
  int *hidden = nullptr;
};

__attribute__((noinline)) SessionState load(SessionState s) {
  s.bank_state.hits += 1;
  return s;
}

std::vector<int> run(SessionState session_state, int n) {
  auto result = LayerState{std::move(session_state.slots), std::move(session_state.bank_state), nullptr};
  for (int i = 0; i < n; ++i) {
    auto &bank = result.bank_state;
    if (i % 2)
      ++bank.hits;
    else
      bank.misses = bank.misses + 1;
  }
  SessionState next_state{0, {}, std::move(result.bank_state)};
  auto next = load(std::move(next_state));
  (void)next;
  return std::move(result.slots);
}
