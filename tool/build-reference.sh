#!/usr/bin/env bash
set -euo pipefail
root_dir="$(cd "$(dirname "$0")/.." && pwd)"
reference_dir="$root_dir/references/flutter-wasm-compare"
flutter_bin="${FLUTTER_BIN:-$HOME/fvm/versions/3.47.9/bin/flutter}"
cp "$root_dir/tool/reference_probe.dart" "$reference_dir/tool/wasm_check_probe.dart"
trap 'rm -f "$reference_dir/tool/wasm_check_probe.dart"' EXIT
cd "$reference_dir"
"$flutter_bin" pub get
"$flutter_bin" build web --profile --wasm --no-web-resources-cdn --target tool/wasm_check_probe.dart --output "$root_dir/build/reference"
