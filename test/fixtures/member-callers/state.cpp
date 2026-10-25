#include "state.h"
void State::inspect() {
  consume(records); // @case object
}
void Session::inspect() {
  consume(bank.records); // @case nested
}
