import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_wasm_check/data.dart';
import 'package:flutter_wasm_check/grids.dart';

void main() {
  testWidgets('Trina keeps fractional totals and missing monthly values', (
    tester,
  ) async {
    final key = GlobalKey<TrinaPageState>();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: TrinaPage(key: key, rows: [SampleRow(0)], onSelect: (_) {}),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final cells = key.currentState!.manager!.rows.single.cells;
    expect(cells['total']!.value, 376.25);
    expect(cells['m0']!.value, null);
    expect(cells['m11']!.value, 0);
  });
}
