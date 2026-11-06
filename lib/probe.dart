import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'dart:ui';

import 'package:flutter/scheduler.dart';

@JS('checkCommand')
external set command(JSFunction function);
@JS('checkState')
external set state(JSFunction function);
@JS('checkFrames')
external set exportFrames(JSFunction function);

class FrameProbe {
  final frames = <Map<String, int>>[];
  bool recording = false;

  void start() {
    frames.clear();
    recording = true;
  }

  void attach() {
    SchedulerBinding.instance.addTimingsCallback((timings) {
      if (!recording) return;
      for (final timing in timings) {
        frames.add({
          'startUs': timing.timestampInMicroseconds(FramePhase.buildStart),
          'buildUs': timing.buildDuration.inMicroseconds,
          'rasterUs': timing.rasterDuration.inMicroseconds,
          'spanUs': timing.totalSpan.inMicroseconds,
        });
      }
    });
    exportFrames = (() => jsonEncode(frames).toJS).toJS;
  }

  void expose(
    Future<void> Function(String) run,
    Map<String, Object?> Function() snapshot,
  ) {
    command = ((JSString name) => run(name.toDart).toJS).toJS;
    state = (() => jsonEncode(snapshot()).toJS).toJS;
  }
}
