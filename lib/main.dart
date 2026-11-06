import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import 'charts.dart';
import 'data.dart';
import 'grids.dart';
import 'probe.dart';
import 'platform_view.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CheckApp());
}

class CheckApp extends StatefulWidget {
  const CheckApp({super.key});
  @override
  State<CheckApp> createState() => _CheckAppState();
}

class _CheckAppState extends State<CheckApp>
    with SingleTickerProviderStateMixin {
  final probe = FrameProbe();
  final trina = GlobalKey<TrinaPageState>();
  final sync = GlobalKey<SyncGridPageState>();
  late final ticker = createTicker((elapsed) {
    if (animate && !page.endsWith('grid')) setState(() => phase += .03);
  });
  late String page = Uri.base.queryParameters['page'] ?? 'trina-grid';
  late int size = int.tryParse(Uri.base.queryParameters['rows'] ?? '') ?? 2500;
  late List<SampleRow> rows = List.generate(size, SampleRow.new);
  String selected = 'Select a row or inspect a point';
  int count = 1000;
  int series = 8;
  double phase = 0;
  bool animate = false;
  bool dark = false;
  bool platformView = false;
  bool overlay = false;
  double scale = 1;

  @override
  void initState() {
    super.initState();
    probe.attach();
    probe.expose(run, snapshot);
  }

  Map<String, Object?> snapshot() => {
    'wasm': const bool.fromEnvironment('dart.tool.dart2wasm'),
    'page': page,
    'rows': size,
    'points': count,
    'series': series,
    'phase': phase,
    'animate': animate,
    'platformView': platformView,
    'overlay': overlay,
    'selected': selected,
    'dark': dark,
  };

  Future<void> run(String action) async {
    if (action == 'start') {
      probe.start();
      return;
    }
    if (action == 'stop') {
      probe.recording = false;
      return;
    }
    if (action == 'scroll') {
      if (page == 'trina-grid') {
        await trina.currentState!.scroll();
      } else if (page == 'sync-grid') {
        await sync.currentState!.scroll();
      } else {
        throw StateError('scroll requires a grid page');
      }
    } else if (action == 'animate') {
      setAnimation(true);
      await Future<void>.delayed(const Duration(seconds: 4));
      setAnimation(false);
    } else if (action == 'compose') {
      for (var i = 0; i < 12; i++) {
        setState(() {
          platformView = !platformView;
          overlay = !overlay;
          phase += .2;
        });
        await Future<void>.delayed(const Duration(milliseconds: 200));
      }
    } else if (action.startsWith('page:')) {
      setAnimation(false);
      setState(() {
        page = action.substring(5);
        animate = false;
        platformView = false;
      });
    } else if (action == 'update') {
      setState(() {
        phase += 1;
        selected = 'Updated fixture';
      });
    } else {
      throw ArgumentError.value(action, 'action');
    }
    await SchedulerBinding.instance.endOfFrame;
  }

  void setAnimation(bool value) {
    setState(() => animate = value);
    if (value && !ticker.isActive) ticker.start();
    if (!value && ticker.isActive) ticker.stop();
  }

  @override
  void dispose() {
    ticker.dispose();
    super.dispose();
  }

  void select(String text) => setState(() => selected = text);

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Flutter Wasm Check',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorSchemeSeed: const Color(0xff2563eb),
      fontFamily: 'Roboto',
    ),
    darkTheme: ThemeData(
      brightness: Brightness.dark,
      colorSchemeSeed: const Color(0xff60a5fa),
      fontFamily: 'Roboto',
    ),
    themeMode: dark ? ThemeMode.dark : ThemeMode.light,
    home: Scaffold(
      appBar: AppBar(
        title: const Text('Flutter Wasm Check'),
        actions: [
          IconButton(
            tooltip: 'Toggle theme',
            onPressed: () => setState(() => dark = !dark),
            icon: const Icon(Icons.brightness_6),
          ),
          TextButton(
            onPressed: () => run('update'),
            child: const Text('Update data'),
          ),
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Wrap(
                spacing: 8,
                children: [
                  for (final entry in {
                    'trina-grid': 'TrinaGrid',
                    'sync-grid': 'Syncfusion grid',
                    'fl-chart': 'fl_chart',
                    'sync-chart': 'Syncfusion charts',
                    'graphic': 'Graphic',
                    'composition': 'Canvas + iframe',
                  }.entries)
                    ChoiceChip(
                      label: Text(entry.value),
                      selected: page == entry.key,
                      onSelected: (_) => run('page:${entry.key}'),
                    ),
                ],
              ),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                const SizedBox(width: 16),
                Text('Synthetic • $size rows • $series × $count points'),
                const SizedBox(width: 16),
                TextButton(
                  onPressed: () => setState(() {
                    count = count == 1000 ? 4000 : 1000;
                  }),
                  child: const Text('1k / 4k points'),
                ),
                TextButton(
                  onPressed: () => setAnimation(!animate),
                  child: Text(animate ? 'Pause updates' : 'Animate updates'),
                ),
                TextButton(
                  onPressed: () => run('compose'),
                  child: const Text('Cycle composition'),
                ),
                TextButton(
                  onPressed: () => setState(() => platformView = !platformView),
                  child: const Text('Toggle iframe'),
                ),
                TextButton(
                  onPressed: () => setState(() => overlay = !overlay),
                  child: const Text('Toggle overlay'),
                ),
                TextButton(
                  onPressed: () => setState(() => scale = scale == 1 ? .8 : 1),
                  child: const Text('Resize scene'),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: Stack(
              children: [
                Positioned.fill(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: FractionallySizedBox(
                      widthFactor: scale,
                      heightFactor: scale,
                      child: switch (page) {
                        'trina-grid' => TrinaPage(
                          key: trina,
                          rows: rows,
                          onSelect: select,
                        ),
                        'sync-grid' => SyncGridPage(
                          key: sync,
                          rows: rows,
                          onSelect: select,
                        ),
                        _ => Charts(
                          library: page == 'composition' ? 'fl-chart' : page,
                          count: count,
                          series: series,
                          phase: phase,
                          onSelect: select,
                        ),
                      },
                    ),
                  ),
                ),
                if (platformView)
                  const Positioned(
                    left: 140,
                    top: 120,
                    width: 420,
                    height: 190,
                    child: LocalPlatformView(),
                  ),
                if (overlay)
                  Positioned(
                    left: 220,
                    top: 200,
                    width: 380,
                    child: Card(
                      color: const Color(0xffdbeafe),
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            const Text(
                              'Flutter overlay above the native iframe',
                              style: TextStyle(color: Colors.black),
                            ),
                            TextButton(
                              onPressed: () => select('Overlay action clicked'),
                              child: const Text('Test overlay action'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Padding(padding: const EdgeInsets.all(10), child: Text(selected)),
        ],
      ),
    ),
  );
}
