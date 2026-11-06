import 'dart:convert';
import 'dart:js_interop';

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import 'platform_view.dart';

@JS('minimalStep')
external set step(JSFunction callback);
@JS('checkState')
external set exportState(JSFunction callback);

void main() => runApp(const MaterialApp(home: MinimalComposition()));

class MinimalComposition extends StatefulWidget {
  const MinimalComposition({super.key});
  @override
  State<MinimalComposition> createState() => _MinimalCompositionState();
}

class _MinimalCompositionState extends State<MinimalComposition> {
  int frame = 0;
  bool embedded = false;
  bool small = false;

  @override
  void initState() {
    super.initState();
    step = ((JSString request) => advance(request.toDart).toJS).toJS;
    exportState = (() => jsonEncode({
      'frame': frame,
      'embedded': embedded,
      'wasm': const bool.fromEnvironment('dart.tool.dart2wasm'),
    }).toJS).toJS;
  }

  Future<JSString> advance(String request) async {
    final input = jsonDecode(request) as Map<String, dynamic>;
    setState(() {
      frame = input['frame'] as int;
      embedded = input['embedded'] as bool;
      small = input['small'] as bool;
    });
    await SchedulerBinding.instance.endOfFrame;
    return jsonEncode({
      'frame': frame,
      'embedded': embedded,
      'small': small,
      'wasm': const bool.fromEnvironment('dart.tool.dart2wasm'),
    }).toJS;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Stack(
      children: [
        Positioned.fill(
          child: CustomPaint(painter: FramePattern(frame, false)),
        ),
        if (embedded)
          const Positioned(
            left: 128,
            top: 100,
            width: 420,
            height: 190,
            child: LocalPlatformView(),
          ),
        if (embedded)
          Positioned(
            left: 200,
            top: 180,
            width: small ? 220 : 380,
            height: 120,
            child: CustomPaint(painter: FramePattern(frame, true)),
          ),
        Positioned(
          left: 16,
          bottom: 30,
          child: Text('Frame $frame • iframe=$embedded • resize=$small'),
        ),
      ],
    ),
  );
}

class FramePattern extends CustomPainter {
  const FramePattern(this.frame, this.overlay);
  final int frame;
  final bool overlay;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..color = overlay ? const Color(0xffe0f2fe) : const Color(0xfff8fafc),
    );
    for (var bit = 0; bit < 8; bit++) {
      canvas.drawRect(
        Rect.fromLTWH(16 + bit * 16, 16, 16, 32),
        Paint()..color = frame & (1 << bit) != 0 ? Colors.black : Colors.white,
      );
    }
  }

  @override
  bool shouldRepaint(FramePattern old) =>
      old.frame != frame || old.overlay != overlay;
}
