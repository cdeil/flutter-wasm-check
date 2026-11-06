# Proposed Safari readiness evidence — not posted

On real macOS Safari 27.2, a public synthetic app renders its TrinaGrid and
Syncfusion grid/chart pages with opted-in Dart Wasm and `skwasm_heavy`. Under
`COOP: same-origin` and `COEP: require-corp`, runtime proof shows isolation and
a Skwasm worker. With credentialless on the tested Safari, isolation is false
but the single-threaded path remains visible.

[Screenshots, versions and scope](https://github.com/cdeil/flutter-wasm-check/blob/main/docs/browser-readiness.md)
are available without an application backend. No forced canvas sizing or
injected layout correction is used. The default dual-build policy still chooses
JavaScript for Safari; this is evidence for review, not a claim that default
enablement shipped or that all old Safari releases and physical iPhones passed.

Corrected in-page timings also show the heavy chart improving from 26.76 to
43.59 Flutter frame starts/s (three samples, preserved viewport 1314 × 780 /
reported DPR 2.3). This is a rendering-benefit check, not physical-display FPS
or a repeated independent-context performance guarantee.

Is there a small remaining correctness/CI lane this standalone workload could
help qualify? The copy-performance umbrella and hybrid-presentation work are
tracked separately; these rendering checks do not establish that either is fixed.

*Draft prepared by Coding Agent; not posted upstream.*
