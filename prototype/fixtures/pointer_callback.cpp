// Unknown pointer, indirect call, and virtual dispatch boundaries.
struct Object { int field = 0; };
Object global;
Object other;

void external_mutate(Object *object);

int through_pointer(Object *object, bool replace) {
  if (replace)
    object = &global;          // pointer rebinding
  external_mutate(object);     // unknown external effect
  return object->field;
}

struct Interface {
  virtual int read() const = 0;
  virtual ~Interface() = default;
};

struct Impl : Interface {
  int value = 0;
  int read() const override { return value; }
};

int through_virtual(const Interface &interface) {
  return interface.read();     // virtual call target not statically unique
}

int through_callback(int (*callback)(int), int input) {
  return callback(input);      // indirect call
}
