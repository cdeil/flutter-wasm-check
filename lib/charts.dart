import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:graphic/graphic.dart' as g;
import 'package:syncfusion_flutter_charts/charts.dart';

import 'data.dart';

const palette = [
  Color(0xff2563eb),
  Color(0xffdb2777),
  Color(0xff059669),
  Color(0xffd97706),
  Color(0xff7c3aed),
  Color(0xff0891b2),
  Color(0xffdc2626),
  Color(0xff4d7c0f),
];

class Charts extends StatelessWidget {
  const Charts({
    super.key,
    required this.library,
    required this.count,
    required this.series,
    required this.phase,
    required this.onSelect,
  });
  final String library;
  final int count;
  final int series;
  final double phase;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final data = List.generate(series, (s) => points(s, count, phase));
    if (library == 'sync-chart') {
      return SfCartesianChart(
        primaryXAxis: const NumericAxis(),
        primaryYAxis: const NumericAxis(minimum: 0, maximum: 220),
        zoomPanBehavior: ZoomPanBehavior(
          enableMouseWheelZooming: true,
          enablePanning: true,
          enablePinching: true,
          enableDoubleTapZooming: true,
        ),
        trackballBehavior: TrackballBehavior(
          enable: true,
          activationMode: ActivationMode.singleTap,
          tooltipDisplayMode: TrackballDisplayMode.groupAllPoints,
        ),
        onChartTouchInteractionDown: (args) =>
            onSelect('Syncfusion plot interaction'),
        series: [
          for (var s = 0; s < series; s++)
            LineSeries<SamplePoint, double>(
              name: 'Series ${s + 1}',
              dataSource: data[s],
              xValueMapper: (p, _) => p.x,
              yValueMapper: (p, _) => p.y,
              emptyPointSettings: const EmptyPointSettings(
                mode: EmptyPointMode.gap,
              ),
              color: palette[s % palette.length],
              width: 1.5,
              animationDuration: 0,
            ),
        ],
      );
    }
    if (library == 'graphic') {
      final tuples = <Map<String, Object>>[];
      for (var s = 0; s < series; s++) {
        var segment = 0;
        for (final point in data[s]) {
          if (point.y == null) {
            segment++;
          } else {
            tuples.add({
              'x': point.x,
              'y': point.y!,
              'series': 'S$s',
              'segment': '$s/$segment',
            });
          }
        }
      }
      return g.Chart<Map<String, Object>>(
        data: tuples,
        variables: {
          'x': g.Variable(accessor: (d) => d['x'] as num),
          'y': g.Variable(
            accessor: (d) => d['y'] as num,
            scale: g.LinearScale(min: 0, max: 220),
          ),
          'series': g.Variable(accessor: (d) => d['series'] as String),
          'segment': g.Variable(accessor: (d) => d['segment'] as String),
        },
        marks: [
          g.LineMark(
            position: g.Varset('x') * g.Varset('y') / g.Varset('segment'),
            color: g.ColorEncode(variable: 'series', values: palette),
          ),
        ],
        axes: [g.Defaults.horizontalAxis, g.Defaults.verticalAxis],
        selections: {
          'touch': g.PointSelection(
            on: {g.GestureType.hover, g.GestureType.tap},
          ),
        },
        tooltip: g.TooltipGuide(variables: ['series', 'x', 'y']),
        crosshair: g.CrosshairGuide(),
      );
    }
    return LineChart(
      LineChartData(
        minX: 0,
        maxX: count - 1.0,
        minY: 0,
        maxY: 220,
        clipData: const FlClipData.all(),
        lineBarsData: [
          for (var s = 0; s < series; s++)
            LineChartBarData(
              spots: [
                for (final p in data[s])
                  p.y == null ? FlSpot.nullSpot : FlSpot(p.x, p.y!),
              ],
              color: palette[s % palette.length],
              barWidth: 1.5,
              dotData: const FlDotData(show: false),
            ),
        ],
        lineTouchData: LineTouchData(
          touchCallback: (event, response) {
            if (event is FlTapUpEvent) {
              onSelect(
                'fl_chart point ${response?.lineBarSpots?.first.spotIndex}',
              );
            }
          },
        ),
        titlesData: const FlTitlesData(
          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
      ),
      duration: Duration.zero,
    );
  }
}
