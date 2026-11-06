#!/usr/bin/env bash
set -euo pipefail
[[ "$(uname -s)" == Linux ]] || { echo 'This procedure was validated on Linux; the resulting web bundle also runs on macOS.'; exit 2; }
root_dir="$(cd "$(dirname "$0")/.." && pwd)"
data_dir="${WASM_CHECK_DATA:-$HOME/data/flutter-wasm-check}"
stable_sdk="${STABLE_FLUTTER:-$HOME/fvm/versions/3.47.9}"
candidate="$data_dir/flutter-hybrid"
depot="$data_dir/depot_tools"
pin=b09e6cabd227035bc209757ae9586b7454049797
mkdir -p "$data_dir"
if [[ ! -d "$candidate/.git" ]]; then
  git clone --filter=blob:none --depth 1 --branch skwasm-hybrid-opt-in https://github.com/MarlonJD/flutter.git "$candidate"
fi
git -C "$candidate" fetch --depth 1 origin "$pin"
git -C "$candidate" checkout --detach "$pin"
if [[ ! -d "$depot/.git" ]]; then git clone --depth 1 https://chromium.googlesource.com/chromium/tools/depot_tools.git "$depot"; fi
export PATH="$depot:$PATH"
cd "$candidate"
cp engine/scripts/standard.gclient .gclient
node --input-type=module - <<'JS'
import fs from 'node:fs';
const p='.gclient';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('# "custom_vars"','"custom_vars"').replace('#   "download_emsdk"','  "download_emsdk"').replace('# },','},'));
JS
gclient sync --no-history
engine/src/flutter/lib/web_ui/dev/felt build sdk skwasm skwasm_heavy

# Feature-branch engine hashes need not have published Flutter tool-cache ZIPs.
# Only host/pub cache support is borrowed; Web SDK kernels and Skwasm binaries
# above are built from the actual candidate with its DEPS-pinned Dart SDK.
[[ -d "$stable_sdk/bin/cache/pkg" ]] || { echo 'Set STABLE_FLUTTER to a bootstrapped stable Flutter SDK.'; exit 2; }
mkdir -p bin/cache/pkg bin/cache/artifacts
rsync -a "$stable_sdk/bin/cache/pkg/" bin/cache/pkg/
rsync -a "$stable_sdk/bin/cache/artifacts/" bin/cache/artifacts/
ln -sfn "$candidate/engine/src/flutter/prebuilts/linux-x64/dart-sdk" bin/cache/dart-sdk
ln -sfn "$candidate/engine/src/out/wasm_release/flutter_web_sdk" bin/cache/flutter_web_sdk

# Local-only version tag for pub's Flutter constraint. This is not an official
# Flutter release/tag, and must never be pushed to an upstream repository.
local_tag=3.51.0-0.0.pre
if git rev-parse -q --verify "refs/tags/$local_tag" >/dev/null; then
  [[ "$(git rev-parse "$local_tag")" == "$pin" ]] || { echo 'Local bootstrap tag collides with an existing tag.'; exit 2; }
else git tag "$local_tag" "$pin"; fi
rm -f bin/cache/flutter.version.json
bin/internal/update_engine_version.sh
node --input-type=module - <<'JS'
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const cache='bin/cache';const hash=fs.readFileSync(`${cache}/engine.stamp`,'utf8').trim();
for(const name of ['engine-dart-sdk','engine_stamp','flutter_sdk','flutter_web_sdk','font-subset'])fs.writeFileSync(`${cache}/${name}.stamp`,hash);
fs.writeFileSync(`${cache}/engine_stamp.json`,JSON.stringify({build_time_ms:Date.now(),git_revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),git_revision_date:execFileSync('git',['log','-1','--format=%cI'],{encoding:'utf8'}).trim(),content_hash:hash}));
JS
mkdir -p "$data_dir/candidate-app"
rsync -a --exclude=.git --exclude=.fvm --exclude=.dart_tool --exclude=references --exclude=output --exclude=results --exclude=build --exclude=node_modules "$root_dir/" "$data_dir/candidate-app/"
cd "$data_dir/candidate-app"
"$candidate/bin/flutter" --local-engine-src-path="$candidate/engine/src" --local-web-sdk=wasm_release build web --profile --wasm --no-tree-shake-icons --no-web-resources-cdn --output "$root_dir/build/candidate"
"$candidate/bin/flutter" --local-engine-src-path="$candidate/engine/src" --local-web-sdk=wasm_release build web --profile --wasm --no-tree-shake-icons --no-web-resources-cdn --target lib/minimal_composition.dart --output "$root_dir/build/minimal-candidate"
