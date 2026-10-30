// Two template instances share one source token sequence.
#include <utility>

template <class T>
struct Cell {
  T count;
  T total;
};

template <class T>
T accumulate_like(T n) {
  Cell<T> cell{0, 0};
  for (T i = 0; i < n; ++i) {
    cell.count += 1;
    cell.total += i;
  }
  return cell.total;
}

int use_int() { return accumulate_like<int>(4); }
double use_double() { return accumulate_like<double>(3.0); }
