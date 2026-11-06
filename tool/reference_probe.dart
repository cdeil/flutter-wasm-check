import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'dart:ui';

import 'package:flutter/widgets.dart';
import 'package:flutter/scheduler.dart';

import '../lib/main.dart' as reference;

@JS('referenceFrames')
external set exportFrames(JSFunction function);
@JS('referenceRecord')
external set record(JSFunction function);
@JS('referenceWasm')
external set wasm(JSBoolean value);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final frames = <Map<String, int>>[];
  var recording = false;
  SchedulerBinding.instance.addTimingsCallback((timings) {
    if (!recording) return;
    for (final t in timings) {
      frames.add({
        'startUs': t.timestampInMicroseconds(FramePhase.buildStart),
        'buildUs': t.buildDuration.inMicroseconds,
        'rasterUs': t.rasterDuration.inMicroseconds,
        'spanUs': t.totalSpan.inMicroseconds,
      });
    }
  });
  exportFrames = (() => jsonEncode(frames).toJS).toJS;
  record = ((JSBoolean value) {
    if (value.toDart) frames.clear();
    recording = value.toDart;
  }).toJS;
  wasm = const bool.fromEnvironment('dart.tool.dart2wasm').toJS;
  reference.main();
}
