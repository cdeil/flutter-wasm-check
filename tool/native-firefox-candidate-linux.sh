#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${FIREFOX_EXECUTABLE:?Set FIREFOX_EXECUTABLE to a disposable vendor Firefox binary}"
base="${BASE_URL:-http://localhost:8790}"
prefix="${LABEL_PREFIX:-linux-firefox159-candidate}"
profile_dir="$(mktemp -d)"
trap 'rm -rf "$profile_dir"' EXIT
# Refresh only browser-side recording/proof instrumentation. This does not
# rebuild or change the candidate Dart application or renderer artifacts.
cp web/proof.js build/candidate/proof.js
for page in trina-grid sync-chart; do
  for hybrid in 0 1; do
    label="$prefix-$page-h$hybrid"
    timeout 60 "$FIREFOX_EXECUTABLE" --headless --no-remote --profile "$profile_dir" --window-size 1440,900 --screenshot "$PWD/output/$label.png" "$base/candidate/?page=$page&mode=wasm&hybrid=$hybrid&measure=1&gate=1&label=$label"
  done
done
LABEL_PREFIX_TO_CHECK="$prefix" node --input-type=module - <<'JS'
import fs from 'node:fs';
const rows=fs.readFileSync('output/native.jsonl','utf8').trim().split('\n').map(JSON.parse);
for(const page of ['trina-grid','sync-chart'])for(const hybrid of [0,1]){
  const record=rows.findLast(r=>r.label===`${process.env.LABEL_PREFIX_TO_CHECK}-${page}-h${hybrid}`);
  if(record?.records?.length!==3)throw Error('Missing candidate samples');
  for(const r of record.records){
    if(!r.proof.state.wasm||r.proof.errors.length||r.proof.workers.length!==1||r.frames.length<3||r.frames.some(f=>f.startUs<r.window.startUs||f.startUs>r.window.endUs))throw Error('Invalid candidate sample');
    const direct=r.proof.canvases.some(c=>c.transferred&&c.visibility==='visible');
    if(direct!==(hybrid===1))throw Error('Candidate presentation path did not match requested flag');
  }
}
JS
