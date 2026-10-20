// 中文注释和 emoji 😀 验证 Clang 字节位置与编辑器 UTF-16 位置的转换。
#include <utility>
#include <vector>

struct Bank { int records = 0; };
struct Counters { int hits = 0; int misses = 0; };
struct BankState { Bank bank; Counters counters; };
struct SessionState { BankState bank_state; int position = 0; };
struct BatchState { SessionState session_state; };
template <typename T> void consume(const T &) {}
template <typename T, typename F> T fold_left(T state, F fn) { return fn(std::move(state)); }

void mutate_records(Bank &bank) {
  bank.records++; // @write helper-records
}
void mutate_copy(BankState bank_state) { bank_state.bank.records++; }
struct Worker {
  void mutate(BankState &bank_state) {
    bank_state.bank.records++; // @write member-helper
  }
};

void aliases(SessionState &session_state) {
  auto &bank_state = session_state.bank_state;
  auto &bank = bank_state.bank;
  bank.records = 1; // @write alias-records
  consume(bank_state.bank); // @case alias-bank
  consume(bank_state.bank.records); // @case alias-records
  consume(session_state.bank_state.bank.records); // @case full-records
  ++session_state.bank_state.counters.hits; // @write counters
  consume(session_state.bank_state.counters); // @case counters
  consume(session_state); // @case whole-session
  consume(bank_state.bank.records); // @case sibling-isolation
  bank = Bank{2}; // @write bank-assignment
  consume(bank_state.bank.records); // @case assignment-records
  consume(bank_state.bank); // @case assignment-bank
}

void helper_calls(BankState &bank_state, Worker &worker) {
  mutate_records(bank_state.bank);
  consume(bank_state.bank.records); // @case helper-records
  consume(bank_state); // @case helper-parent
  worker.mutate(bank_state);
  consume(bank_state.bank.records); // @case member-helper
}

void value_isolation(BankState &bank_state) {
  bank_state.bank.records = 1; // @write isolation
  mutate_copy(bank_state);
  auto bank_state_copy = bank_state;
  bank_state_copy.bank.records++;
  consume(bank_state.bank.records); // @case copy-isolation
}

void captures(SessionState &session_state) {
  session_state.bank_state.bank.records = 1; // @write before-capture
  auto read = [&]() {
    consume(session_state.bank_state.bank.records); // @case captured-read
    auto &bank_state = session_state.bank_state;
    consume(bank_state.bank.records); // @case captured-alias
  };
  read();
  auto unused = [&]() { session_state.bank_state.bank.records = 99; };
  consume(session_state.bank_state.bank.records); // @case uncalled-capture
  auto copy = [session_state]() mutable { session_state.bank_state.bank.records = 88; };
  copy();
  consume(session_state.bank_state.bank.records); // @case copy-capture-isolation
  auto edit = [&]() {
    session_state.bank_state.bank.records++; // @write called-capture
  };
  edit();
  consume(session_state.bank_state.bank.records); // @case called-capture
  [&]() {
    session_state.bank_state.bank.records++; // @write immediate-capture
  }();
  consume(session_state.bank_state.bank.records); // @case immediate-capture
}

void origins(BankState &parameter) { // @origin parameter
  consume(parameter.bank); // @case parameter-origin
  BankState bank_state{}; // @origin local
  consume(bank_state.bank); // @case bank-origin
  consume(bank_state.bank.records); // @case records-origin
  SessionState session_state{}; // @origin session
  auto &session_state_alias = session_state;
  auto &bank_state_alias = session_state_alias.bank_state;
  consume(bank_state_alias.bank.records); // @case alias-origin
}

SessionState generic_fold() {
  return fold_left(SessionState{}, [](auto session_state) {
    auto &bank_state = session_state.bank_state;
    bank_state.bank.records = 1; // @write generic-records
    consume(bank_state.bank); // @case generic-bank
    consume(bank_state.bank.records); // @case generic-records
    [&]() {
      ++session_state.bank_state.counters.hits; // @write nested-counters
      consume(session_state.bank_state.counters); // @case nested-counters
      consume(session_state); // @case nested-session
    }();
    consume(session_state.bank_state.counters); // @case after-nested-counters
    return session_state;
  });
}

void inspect(BankState &bank_state) {
  consume(bank_state.bank.records); // @case caller-mutations
}
void callers() {
  BankState one{};
  one.bank.records++; // @write caller-one
  inspect(one);
  BankState two{};
  two.bank.records++; // @write caller-two
  inspect(two);
}

void collections(std::vector<int> &records) {
  records.push_back(1); // @write push-back
  consume(records); // @case collection-mutation
}

void mutate_pointer(Bank *bank) {
  bank->records++; // @write pointer-helper
}
void pointer_calls(BankState &bank_state) {
  mutate_pointer(&bank_state.bank);
  consume(bank_state.bank.records); // @case pointer-helper
}

void bridge(Bank &bank) { mutate_records(bank); }
void multi_hop(BankState &bank_state) {
  bridge(bank_state.bank);
  consume(bank_state.bank.records); // @case multi-hop
}

struct StatefulBank {
  int records = 0;
  void touch() { ++records; } // @write receiver
};
void receiver_calls(StatefulBank &bank) {
  bank.touch();
  consume(bank.records); // @case receiver
}

template <typename T, typename F> T fold_index(T state, F fn) { return fn(std::move(state), 0); }
SessionState concrete_state_generic_fold() {
  return fold_index(SessionState{}, [](SessionState session_state, auto entry) {
    [&]() { ++session_state.bank_state.counters.hits; }(); // @write concrete-nested
    consume(session_state.bank_state.counters); // @case concrete-nested
    return session_state;
  });
}

void uninitialized() {
  int records;
  consume(records); // @case uninitialized
}

#include "native-paths-helper.h"
void external_calls(BankState &bank_state) {
  mutate_external(bank_state);
  consume(bank_state.bank.records); // @case external-helper
}

void deferred_generic() {
  auto deferred = [](SessionState session_state, auto entry) {
    [&]() { ++session_state.bank_state.counters.hits; }(); // @write deferred-reference
    consume(session_state.bank_state.counters); // @case deferred-reference
    auto edit = [&]() { ++session_state.bank_state.counters.hits; }; // @write deferred-stored
    edit();
    consume(session_state.bank_state.counters); // @case deferred-stored
    return session_state;
  };
  auto copied = [](SessionState session_state, auto entry) {
    [session_state]() mutable { ++session_state.bank_state.counters.hits; }();
    consume(session_state.bank_state.counters); // @case deferred-copy
    return session_state;
  };
}

SessionState generic_external() {
  return fold_left(SessionState{}, [](auto session_state) {
    mutate_external(session_state.bank_state);
    consume(session_state.bank_state.bank.records); // @case generic-external
    return session_state;
  });
}

void capture_timing(SessionState &session_state) {
  session_state.bank_state.bank.records = 1;
  auto read_reference = [&]() {
    consume(session_state.bank_state.bank.records); // @case reference-invocation-time
  };
  session_state.bank_state.bank.records = 2; // @write reference-invocation-time
  read_reference();
  auto read_copy = [session_state]() {
    consume(session_state.bank_state.bank.records); // @case copy-construction-time
  };
  session_state.bank_state.bank.records = 3;
  read_copy();
}
