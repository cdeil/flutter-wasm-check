import 'dart:math' as math;

class SampleRow {
  SampleRow(this.id)
    : name = 'Item ${id.toString().padLeft(5, '0')}',
      group = 'Group ${id % 8 + 1}',
      months = List.generate(12, (month) => value(id, month));

  final int id;
  final String name;
  final String group;
  final List<double?> months;

  static double? value(int id, int month) {
    if ((id + month) % 17 == 0) return null;
    if ((id + month) % 11 == 0) return 0;
    return ((id * 37 + month * 71) % 1600 - 240) / 4;
  }

  double get total => months.fold(0, (sum, value) => sum + (value ?? 0));
}

class SamplePoint {
  const SamplePoint(this.x, this.y);
  final double x;
  final double? y;
}

List<SamplePoint> points(int series, int count, double phase) => List.generate(
  count,
  (i) => SamplePoint(
    i.toDouble(),
    i % 137 == 0
        ? null
        : 80 + series * 12 + 40 * math.sin(i * .04 + series + phase),
  ),
);
