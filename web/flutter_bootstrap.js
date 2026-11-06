{{flutter_js}}
{{flutter_build_config}}

const query = new URLSearchParams(location.search);
const config = {canvasKitBaseUrl: new URL('canvaskit/', document.baseURI).href};
if (query.get('mode') === 'js') config.renderer = 'canvaskit';
if (['wasm', 'st'].includes(query.get('mode'))) {
  config.renderer = 'skwasm';
  config.wasmAllowList = {blink: true, gecko: true, webkit: true};
}
if (query.get('mode') === 'st') config.forceSingleThreadedSkwasm = true;
// Only engines containing flutter/flutter#195105 understand this experiment.
if (query.get('hybrid') === '1') config.skwasmUseHybridRasterizer = true;
_flutter.loader.load({config});
