#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${FIREFOX_EXECUTABLE:?Set FIREFOX_EXECUTABLE to a disposable vendor Firefox binary}"
base="${BASE_URL:-http://localhost:8790}"
label_prefix="${LABEL_PREFIX:-linux-firefox-vendor}"
profile_dir="$(mktemp -d)"
trap 'rm -rf "$profile_dir"' EXIT
mkdir -p output
"$FIREFOX_EXECUTABLE" --version
for item in trina-grid:wasm sync-grid:wasm fl-chart:wasm sync-chart:wasm graphic:wasm composition:wasm trina-grid:default; do
  page="${item%:*}"; mode="${item#*:}"; label="$label_prefix-$page-$mode"
  timeout 60 "$FIREFOX_EXECUTABLE" --headless --no-remote --profile "$profile_dir" --window-size 1440,900 --screenshot "$PWD/output/$label.png" "$base/final-profile/?page=$page&mode=$mode&proof=1&gate=1&label=$label"
done
for item in trina-grid:js trina-grid:wasm sync-chart:js sync-chart:wasm; do
  page="${item%:*}"; mode="${item#*:}"; label="$label_prefix-measure-$page-$mode"
  timeout 60 "$FIREFOX_EXECUTABLE" --headless --no-remote --profile "$profile_dir" --window-size 1440,900 --screenshot "$PWD/output/$label.png" "$base/final-profile/?page=$page&mode=$mode&measure=1&gate=1&label=$label"
done
# This separate diagnostic explains why the older direct probe's late
# drawImage snapshot is not a correctness assertion with buffer preservation off.
timeout 10 "$FIREFOX_EXECUTABLE" --headless --no-remote --profile "$profile_dir" "$base/web/copy-lifecycle.html?save=1&label=$label_prefix-lifecycle" || [[ "$?" == 124 ]]
# Normal headless navigation stays open; terminate only this owned process after
# the probe has had time to POST. A timed-out process is not a passing probe.
label="$label_prefix-copy"
timeout 25 "$FIREFOX_EXECUTABLE" --headless --no-remote --profile "$profile_dir" "$base/web/copy-probe.html?save=1&label=$label" || [[ "$?" == 124 ]]
LABEL_PREFIX_TO_CHECK="$label_prefix" node --input-type=module - <<'JS'
import fs from 'node:fs';
const records=fs.readFileSync('output/native.jsonl','utf8').trim().split('\n').map(JSON.parse);
const prefix=process.env.LABEL_PREFIX_TO_CHECK;
const get=suffix=>records.findLast(r=>r.label===`${prefix}-${suffix}`);
for(const page of ['trina-grid','sync-grid','fl-chart','sync-chart','graphic','composition']){
  const proof=get(`${page}-wasm`)?.proof;
  if(!proof?.state?.wasm||proof.errors.length)throw Error(`Missing/failed vendor Wasm proof: ${page}`);
}
if(get('trina-grid-default')?.proof?.state?.wasm!==false)throw Error('Expected stock JS fallback');
for(const page of ['trina-grid','sync-chart'])for(const mode of ['js','wasm']){
  const samples=get(`measure-${page}-${mode}`)?.records;
  if(samples?.length!==3||samples.some(r=>r.frames.length<3||r.proof.errors.length||r.proof.state.wasm!==(mode==='wasm')||r.frames.some(f=>f.startUs<r.window.startUs||f.startUs>r.window.endUs)))throw Error(`Missing/failed native samples: ${page}/${mode}`);
}
if(get('copy')?.copy?.results?.length!==12)throw Error('Vendor copy probe did not finish');
if(get('lifecycle')?.lifecycle?.results?.length!==4)throw Error('Vendor lifecycle probe did not finish');
JS
