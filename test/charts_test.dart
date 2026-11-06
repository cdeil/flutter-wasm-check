import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_wasm_check/charts.dart';

void main() {
  for (final library in ['fl-chart', 'sync-chart', 'graphic']) {
    testWidgets('$library renders gaps and accepts a changed fixture', (
      tester,
    ) async {
      for (final phase in [0.0, 1.0]) {
        await tester.pumpWidget(
          MaterialApp(
            home: SizedBox(
              width: 800,
              height: 500,
              child: Charts(
                library: library,
                count: 200,
                series: 2,
                phase: phase,
                onSelect: (_) {},
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), null);
      }
    });
  }
}
