#include <algorithm>
#include <array>
#include <optional>
#include <stdexcept>
#include <utility>
#include <variant>

struct Reservation { int layer; };
struct Pending { Reservation reservation; };
struct BankState { std::optional<Pending> pending; int other = 0; };
struct SessionState { BankState bank_state; };
struct LayerExecution { SessionState *session_state; };
enum class Phase { Prefill, Decode };
struct PreparedPrefill { BankState *ticket; };
struct PreparedDecode {};
void consume(bool);
void opaque(BankState *);

BankState begin_prefetch(BankState bank_state, int layer, bool predicted) {
  if (bank_state.pending) throw std::logic_error("unconsumed");
  if (!predicted) return bank_state; // @return empty
  bank_state.pending = Pending{{layer}}; // @write pending
  return bank_state; // @return pending
}
void finish(BankState &bank_state, int layer, bool predicted) {
  if (layer + 1 < 3)
    bank_state = begin_prefetch(std::move(bank_state), layer + 1, predicted); // @write replacement
}
void start(BankState &bank_state, int layer) {
  if (bank_state.pending && // @select exists
      bank_state.pending->reservation.layer != layer) // @select arrow
    throw std::logic_error("mismatch");
  auto pending = std::move(bank_state.pending);
  bank_state.pending.reset(); // @select reset
}
void execute(SessionState &session_state, Phase phase, bool predicted) {
  std::ranges::fold_left(std::array{0, 1, 2},
      LayerExecution{&session_state}, // @seed execute
      [&](LayerExecution layer_execution, int layer) {
        auto &session_state = *layer_execution.session_state;
        auto &bank_state = session_state.bank_state;
        auto prepared = [&]() -> std::variant<PreparedPrefill, PreparedDecode> {
          switch (phase) {
          case Phase::Prefill: {
            opaque(&bank_state);
            return PreparedPrefill{&bank_state};
          }
          case Phase::Decode: {
            start(bank_state, layer);
            finish(bank_state, layer, predicted);
            return PreparedDecode{};
          }
          }
          throw std::logic_error("phase");
        }();
        if (auto *prefill = std::get_if<PreparedPrefill>(&prepared))
          opaque(prefill->ticket);
        return LayerExecution{&session_state}; // @return execute
      });
}

void optional_reads(BankState &bank_state) {
  bank_state.pending = Pending{{1}}; // @write optional
  if (bank_state.pending && // @select local-exists
      bank_state.pending->reservation.layer != 1) // @select local-arrow
    throw std::logic_error("mismatch");
  bank_state.pending.reset(); // @select local-reset
  consume(bool(bank_state.pending)); // @select after-reset
}
struct UserArrow {
  Pending pending;
  Pending *operator->();
};
void user_arrow(UserArrow &arrow) {
  arrow.pending.reservation.layer = 1;
  consume(arrow->reservation.layer != 0);
  consume(arrow.pending.reservation.layer != 0); // @select custom-arrow
}
void pointer_escape(BankState &bank_state) {
  bank_state.pending = Pending{{1}};
  auto *pending = bank_state.pending.operator->();
  pending->reservation.layer = 2; // @write projected
  consume(bool(bank_state.pending)); // @select projected-write
}
void projection_escape(BankState &bank_state) {
  bank_state.pending = Pending{{1}};
  auto *pending = bank_state.pending.operator->();
  opaque(reinterpret_cast<BankState *>(pending));
  consume(bool(bank_state.pending)); // @select projected-escape
}
void different_return(SessionState &session_state, SessionState &other) {
  std::ranges::fold_left(std::array{0, 1}, LayerExecution{&session_state},
      [&](LayerExecution layer_execution, int layer) {
        auto &bank_state = layer_execution.session_state->bank_state;
        consume(bool(bank_state.pending)); // @select different-return
        bank_state.pending = Pending{{layer}};
        return LayerExecution{&other};
      });
}
void unverified_effect(SessionState &session_state) {
  std::ranges::fold_left(std::array{0, 1}, LayerExecution{&session_state},
      [&](LayerExecution layer_execution, int layer) {
        auto &bank_state = layer_execution.session_state->bank_state;
        consume(bool(bank_state.pending)); // @select unverified-effect
        bank_state.pending = Pending{{layer}};
        opaque(&bank_state);
        return layer_execution;
      });
}
void unstable_phase(SessionState &session_state, Phase phase) {
  std::ranges::fold_left(std::array{0, 1}, LayerExecution{&session_state},
      [&](LayerExecution layer_execution, int layer) {
        auto &bank_state = layer_execution.session_state->bank_state;
        auto prepared = [&]() -> std::variant<PreparedPrefill, PreparedDecode> {
          switch (phase) {
          case Phase::Prefill: return PreparedPrefill{&bank_state};
          case Phase::Decode: {
            consume(bool(bank_state.pending)); // @select unstable-phase
            finish(bank_state, layer, true);
            return PreparedDecode{};
          }
          }
          throw std::logic_error("phase");
        }();
        if (auto *prefill = std::get_if<PreparedPrefill>(&prepared)) opaque(prefill->ticket);
        phase = Phase::Prefill;
        return layer_execution;
      });
}
void first_layer() {
  BankState bank_state{}; // @origin first-layer
  consume(bool(bank_state.pending)); // @select first-layer
}
void singleton(SessionState &session_state) {
  std::ranges::fold_left(std::array{0}, LayerExecution{&session_state},
      [&](LayerExecution layer_execution, int layer) {
        auto &bank_state = layer_execution.session_state->bank_state;
        consume(bool(bank_state.pending)); // @select singleton
        bank_state.pending = Pending{{layer}};
        return layer_execution;
      });
}

void change_variant(std::variant<PreparedPrefill, PreparedDecode> *);
void retained_variant(SessionState &session_state, Phase phase) {
  std::ranges::fold_left(std::array{0, 1}, LayerExecution{&session_state},
      [&](LayerExecution layer_execution, int layer) {
        auto &bank_state = layer_execution.session_state->bank_state;
        auto prepared = [&]() -> std::variant<PreparedPrefill, PreparedDecode> {
          switch (phase) {
          case Phase::Prefill: return PreparedPrefill{&bank_state};
          case Phase::Decode: {
            consume(bool(bank_state.pending)); // @select retained-variant
            finish(bank_state, layer, true);
            return PreparedDecode{};
          }
          }
          throw std::logic_error("phase");
        }();
        auto *alias = &prepared;
        change_variant(alias);
        finish(bank_state, layer, true);
        if (auto *prefill = std::get_if<PreparedPrefill>(&prepared)) opaque(prefill->ticket);
        return layer_execution;
      });
}

#ifdef FSJ_PENDING_RUNTIME
#include <cassert>
void consume(bool) {}
void change_variant(std::variant<PreparedPrefill, PreparedDecode> *) {}
void opaque(BankState *) { throw std::logic_error("unexpected prefill effect"); }
Pending *UserArrow::operator->() { return &pending; }
int main() {
  SessionState predicted{};
  execute(predicted, Phase::Decode, true);
  assert(!predicted.bank_state.pending);
  SessionState empty{};
  execute(empty, Phase::Decode, false);
  assert(!empty.bank_state.pending);
  BankState mismatch{Pending{{2}}};
  const bool rejected = [&] {
    try { start(mismatch, 0); } catch (const std::logic_error &) { return true; }
    return false;
  }();
  assert(rejected && mismatch.pending && mismatch.pending->reservation.layer == 2);
  BankState first{};
  start(first, 0);
  assert(!first.pending);
}
#endif
