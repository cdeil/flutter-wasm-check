# Proposed feedback on Flutter 195105 — not posted

I built `b09e6cab` and matching Skwasm/heavy binaries locally, then used the
same candidate bundle for bitmap/hybrid A/B. On Mac Playwright Firefox 157,
median TrinaGrid frame starts/s improved from 35.63 to 63.13 with a worker,
and 22.80 to 48.73 single-threaded. The heavy Syncfusion chart's worker result
changed much less: 25.97 to 26.46. These are Flutter timing samples, not
physical-display FPS; each row has three repetitions.

The [experiment record](https://github.com/cdeil/flutter-wasm-check/blob/main/docs/hybrid-experiment.md)
contains exact commits, runtime/thread proof, visible transferred-canvas proof,
raw measurements and retained failures. A Flutter-only iframe/overlay/viewport
test converged for all 576 requested states across four browser/host lanes.
Two first snapshots still showed frame 2 after removing the iframe for frame 3
(hybrid worker, Mac Firefox and Linux Chrome), then showed frame 3 at 105/106 ms.
Two rAFs are not treated as a presentation fence or those delays as confirmed
corruption. The reduced entry has no chart/grid imports.

The focused vendor Firefox 159.0.1 engine suites pass 49 cases, with two
intentional worker-mode context-mock skips. An initial Chrome 156 throughput
decline did not reproduce with fresh-process Chrome 157 A/B; both series remain
in the report rather than a new regression claim.

An independent Linux vendor Firefox 159.0.1 headless worker A/B also improves:
TrinaGrid 44.20 → 56.54 and Syncfusion chart 30.87 → 39.09 frame starts/s.
Those are medians of three in-page samples per URL, with zero captured errors
and visible transferred-canvas proof only for the hybrid arm.

Would a reduced case from this workload help extend the existing transition
tests or requalify the desktop policy? I can help adapt a confirmed narrow
regression into an engine-owned test without introducing third-party chart
dependencies. I am not proposing an allow-list/default flip from this matrix
alone or claiming physical-mobile qualification.

*Draft prepared by Coding Agent; not posted upstream.*
