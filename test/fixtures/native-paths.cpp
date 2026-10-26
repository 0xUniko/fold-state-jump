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

// Independent helpers are deliberately not lexical children of either fold.
void origin_leaf(Bank &bank) {
  consume(bank.records); // @case backward-leaf
}
void origin_middle(BankState &bank_state) {
  auto &bank = bank_state.bank;
  origin_leaf(bank);
}
void origin_outer(SessionState &session_state) { origin_middle(session_state.bank_state); }
SessionState backward_fold() {
  return fold_left(SessionState{}, [](SessionState session_state) {
    session_state.bank_state.bank.records = 10; // @write backward-entry
    origin_outer(session_state);
    return session_state;
  });
}
void wrap_leaf(Bank &bank) {
  consume(bank.records); // @case backward-wrap
}
void wrap_middle(BankState &bank_state) { wrap_leaf(bank_state.bank); }
SessionState wrap_fold_a() {
  return fold_left(SessionState{}, [](SessionState session_state) {
    wrap_middle(session_state.bank_state);
    session_state.bank_state.bank.records = 11; // @write wrap-a
    return session_state;
  });
}
SessionState wrap_fold_b() {
  return fold_left(SessionState{}, [](SessionState session_state) {
    wrap_middle(session_state.bank_state);
    session_state.bank_state.bank.records = 22; // @write wrap-b
    return session_state;
  });
}
void copy_leaf(Bank bank) {
  consume(bank.records); // @case backward-copy
  bank.records = 99;
}
void copy_entry() {
  Bank bank{}; // @origin copy-entry
  bank.records = 42; // @write copy-entry
  copy_leaf(bank);
  consume(bank.records); // @case backward-copy-isolation
}
void pointer_leaf(Bank *bank) {
  consume(bank->records); // @case backward-pointer
}
void pointer_entry() {
  Bank bank{}; // @origin pointer-entry
  auto &alias = bank;
  alias.records = 7; // @write pointer-entry
  pointer_leaf(&alias);
}
void overload_leaf(Bank &bank) {
  consume(bank.records); // @case backward-overload
}
void overload_leaf(int &records) { ++records; }
namespace other {
void overload_leaf(Bank &bank) { bank.records = 999; }
}
void overload_entry() {
  Bank bank{}; // @origin overload-entry
  bank.records = 8; // @write overload-entry
  overload_leaf(bank);
  int records = 0;
  overload_leaf(records);
  other::overload_leaf(bank);
}
template <typename T> void template_leaf(T &bank) {
  consume(bank.records); // @case backward-template
}
void template_entry() {
  Bank bank{}; // @origin template-entry
  bank.records = 9; // @write template-entry
  template_leaf(bank);
}
void recursive_leaf(Bank &bank) {
  recursive_leaf(bank);
  consume(bank.records); // @case backward-recursive
}

void indexed_leaf(int unused, Bank &bank) {
  consume(bank.records); // @case backward-parameter-index
}
void indexed_entry() {
  Bank bank{}; // @origin indexed-entry
  bank.records = 12; // @write indexed-entry
  indexed_leaf(0, bank);
}

void specialization_leaf(Bank &bank) {
  consume(bank.records); // @case backward-specializations
}
template <typename T> void specialization_middle(T &state) { specialization_leaf(state.bank); }
void specialization_a() {
  BankState state{};
  state.bank.records = 13;
  specialization_middle(state);
}
struct OtherBankState { Bank bank; };
void specialization_b() {
  OtherBankState state{};
  state.bank.records = 14;
  specialization_middle(state);
}

struct AuditedBank {
  int records = 0;
  void audit() { consume(records); } // @case this-mutation
};
void audited_run() {
  AuditedBank account{}; // @origin this-caller
  account.records++; // @write this-caller
  account.audit();
}
void audited_run_b() {
  AuditedBank account{}; // @origin this-caller-b
  account.records = 5; // @write this-caller-b
  account.audit();
}
void audited_pointer() {
  AuditedBank account{};
  AuditedBank *pointer = &account;
  pointer->records += 2; // @write this-pointer
  pointer->audit();
}
void audited_forward(AuditedBank &account) {
  account.records += 3; // @write this-forward
  account.audit();
}
struct AuditedSession {
  AuditedBank bank;
  void audit() { consume(bank.records); } // @case this-nested
};
void audited_session_run() {
  AuditedSession session{}; // @origin this-nested
  session.bank.records++; // @write this-nested-caller
  session.audit();
}
struct AuditedMulti {
  int records = 0;
  void ping() { consume(records); } // @case this-overload
  void ping(int) { records = 77; }
};
void audited_multi_run() {
  AuditedMulti multi{};
  multi.records++; // @write this-overload-caller
  multi.ping();
  multi.ping(0);
}
struct AuditedFold {
  Bank bank;
  void audit() { consume(bank.records); } // @case this-fold
};
SessionState audited_fold_entry() {
  return fold_left(SessionState{}, [](SessionState session_state) {
    AuditedFold member{}; // @origin this-fold
    member.bank.records = 31; // @write this-fold-caller
    member.audit();
    return session_state;
  });
}

template<class F> void invoke_reader(F read) { read(); }
struct LambdaBank {
  int records = 0;
  void stored() {
    auto read = [this] { consume(records); }; // @case lambda-this-stored
    ++records; // @write lambda-this-invocation
    read();
  }
  void immediate() {
    [this] { consume(records); }(); // @case lambda-this-immediate
  }
  void implicit_copy() {
    [=] { consume(records); }(); // @case lambda-this-default-copy
  }
  void implicit_reference() {
    [&] { consume(records); }(); // @case lambda-this-default-reference
  }
  void copied() {
    [*this] { consume(records); }(); // @case lambda-this-copy
  }
  void nested() {
    [this] { [&] { consume(records); }(); }(); // @case lambda-this-nested
  }
  void nested_copy() {
    [*this] { [this] { consume(records); }(); }(); // @case lambda-this-nested-copy
  }
  void algorithm() {
    fold_left(0, [this](int value) {
      consume(records); // @case lambda-this-algorithm
      return value;
    });
  }
  void generic_algorithm() {
    fold_left(0, [this](auto value) {
      consume(records); // @case lambda-this-generic
      return value;
    });
  }
  auto reader() {
    return [this] { consume(records); }; // @case lambda-this-escaped
  }
  template<class F> void invoke(F read) { invoke_reader(read); }
  void unavailable() {
    [this] { consume(records); }(); // @case lambda-this-unavailable
  }
};
void lambda_bank_a() {
  LambdaBank account{}; // @origin lambda-this-a
  account.stored();
  account.immediate();
  account.implicit_copy();
  account.implicit_reference();
  account.copied();
  account.nested();
  account.nested_copy();
  account.algorithm();
  account.generic_algorithm();
  auto read = account.reader();
  LambdaBank unrelated{};
  unrelated.invoke(read);
}
void lambda_bank_b() {
  LambdaBank account{}; // @origin lambda-this-b
  account.stored();
  account.immediate();
  account.implicit_copy();
  account.implicit_reference();
  account.copied();
  account.nested();
  account.nested_copy();
  account.algorithm();
  account.generic_algorithm();
}
