import 'package:flutter/widgets.dart';
import 'package:web/web.dart' as web;

class LocalPlatformView extends StatelessWidget {
  const LocalPlatformView({super.key});

  @override
  Widget build(BuildContext context) => HtmlElementView.fromTagName(
    tagName: 'iframe',
    onElementCreated: (element) {
      final frame = element as web.HTMLIFrameElement;
      frame.src = 'platform.html';
      frame.title = 'Local same-origin platform-view probe';
      frame.style.border = '2px solid #2563eb';
    },
  );
}
