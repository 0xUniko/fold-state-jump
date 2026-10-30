// Borrowed resource and completion handle.
#include <future>
#include <vector>

struct Resource {
  std::vector<char> bytes;
  int state = 0;
};

struct Ticket {
  std::future<int> done;
  bool valid() const { return done.valid(); }
};

Ticket submit(Resource &resource) {
  resource.state = 1;                 // request metadata
  auto done = std::async(std::launch::async, [] { return 1; });
  return Ticket{std::move(done)};     // resource content is not written here
}

int finish(Resource &resource, Ticket ticket) {
  const int value = ticket.done.get(); // completion happens here
  resource.bytes.resize(value);        // actual content write
  resource.state = 2;
  return value;
}
