import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_wasm_check/data.dart';

void main() {
  test('fixture preserves missing, zero and negative monthly observations', () {
    final row = SampleRow(0);
    expect(row.months.take(3).toList(), [null, -42.25, -24.5]);
    expect(row.months[11], 0);
    expect(row.total, 376.25);
  });
  test(
    'chart data preserves a missing point without shifting the time axis',
    () {
      final sample = points(0, 140, 0);
      expect(sample[137].x, 137);
      expect(sample[137].y, null);
      expect(sample[138].x, 138);
      expect(sample[138].y, isNotNull);
    },
  );
}
