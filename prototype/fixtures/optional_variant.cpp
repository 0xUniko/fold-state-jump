// Optional/variant state without inference-specific names.
#include <optional>
#include <variant>

struct Request {
  int target = 0;
  int credential = 0;
};

struct Machine {
  int state = 0;
  std::optional<Request> pending;
};

struct Done {};
using Outcome = std::variant<Machine, Done>;

Machine install(Machine machine, Request request) {
  if (machine.pending)
    throw 1;
  machine.pending = request;
  return machine;
}

Machine consume(Machine machine) {
  if (!machine.pending)
    return machine;
  auto request = std::move(*machine.pending);
  machine.pending.reset();
  machine.state += request.credential;
  return machine;
}

Outcome finish(Machine machine) {
  if (machine.state > 10)
    return Done{};
  return machine;
}

Machine roundtrip(Machine machine, Request request) {
  Machine installed = install(std::move(machine), request);
  return consume(std::move(installed));
}
