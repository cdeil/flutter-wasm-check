#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
git submodule init
if [[ ! -e references/firefox/.git ]]; then
  git clone --filter=blob:none --depth 1 --no-checkout https://github.com/mozilla-firefox/firefox.git references/firefox
  git -C references/firefox sparse-checkout set dom/canvas gfx/layers gfx/gl widget
  firefox_pin="$(git ls-tree HEAD references/firefox | awk '{print $3}')"
  git -C references/firefox fetch --depth 1 origin "$firefox_pin"
  git -C references/firefox checkout "$firefox_pin"
  git submodule absorbgitdirs references/firefox
fi
git submodule update --init --depth 1 --filter=blob:none references/firefox references/flutter references/flutter-hybrid references/flutter-wasm-compare references/trina-grid references/fl-chart references/syncfusion references/graphic
