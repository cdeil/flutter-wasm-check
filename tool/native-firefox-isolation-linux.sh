#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${FIREFOX_EXECUTABLE:?Set FIREFOX_EXECUTABLE to a disposable vendor binary}"
base="${BASE_URL:-http://localhost:8791}"
prefix="${LABEL_PREFIX:-linux-firefox159-isolation}"
profile_dir="$(mktemp -d)"
trap 'rm -rf "$profile_dir"' EXIT
mkdir -p output
"$FIREFOX_EXECUTABLE" --version
for policy in none coop-only require-corp credentialless; do
  coop=same-origin; coep="$policy"
  if [[ "$policy" == none ]]; then coop=none; coep=none; fi
  if [[ "$policy" == coop-only ]]; then coep=none; fi
  for rep in 0 1 2; do
    label="$prefix-$policy-$rep"
    timeout 60 "$FIREFOX_EXECUTABLE" --headless --no-remote --profile "$profile_dir" --window-size 1440,900 --screenshot "$PWD/output/$label.png" "$base/web/isolation-probe.html?coop=$coop&coep=$coep&save=1&gate=1&label=$label"
  done
done
LABEL_PREFIX_TO_CHECK="$prefix" node --input-type=module - <<'JS'
import fs from 'node:fs';
import {assertIsolation} from './tool/isolation-contract.mjs';
const all=fs.readFileSync('output/native.jsonl','utf8').trim().split('\n').map(JSON.parse);
for(const name of ['none','coop-only','require-corp','credentialless'])for(const rep of [0,1,2]){
  const record=all.findLast(r=>r.label===`${process.env.LABEL_PREFIX_TO_CHECK}-${name}-${rep}`);
  if(!record?.isolation)throw Error('Missing native isolation result');
  assertIsolation(record.isolation,{coop:name==='none'?'none':'same-origin',coep:['none','coop-only'].includes(name)?'none':name});
}
JS
