// Negative control: no prior mutation, unrelated same-name field, overwrite.
struct Alpha { int count = 0; };
struct Beta { int count = 0; };

int unrelated() {
  Alpha a;
  Beta b;
  b.count = 5;
  return a.count;      // must not jump to b.count
}

int overwritten() {
  int value = 1;
  value = 2;
  value = 3;
  return value;        // nearest mutation is line with 3, not 1 or 2
}

int exclusive(bool flag) {
  int state = 0;
  if (flag)
    state = 10;
  else
    state = 20;
  return state;        // two may-definitions, not one
}

int snapshot_before_overwrite() {
  int value = 1;
  int copy = value;
  value = 2;
  return copy;
}
