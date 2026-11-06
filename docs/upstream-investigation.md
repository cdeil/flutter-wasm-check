# Upstream investigation — 2026-11-06

The useful contribution is verified evidence and a reduced test, not another
allow-list bypass or duplicate renderer rewrite. This repository makes no
upstream submissions. [Drafts](../drafts/) require human review and editing.

## Firefox: identify the actual expensive operation

The [1788206 discussion](https://bugzilla.mozilla.org/show_bug.cgi?id=1788206#c38)
describes CPU-backed ImageBitmap handling and remote-texture lifetime work.
The fresh probe separates draw submission, `transferToImageBitmap`, and
`transferFromImageBitmap`, with size/alpha controls and untimed pixel checks.
The creation stage dominates the measured Firefox cost. Merely changing the
destination bitmap-renderer call is not a demonstrated fix.

The inspected Firefox Git source is pinned at
`d9bd6be9a67efb1c2667ef91a89856f35eb7cf5e`:

1. [OffscreenCanvas::TransferToImageBitmap](https://github.com/mozilla-firefox/firefox/blob/d9bd6be9a67efb1c2667ef91a89856f35eb7cf5e/dom/canvas/OffscreenCanvas.cpp#L405)
   creates the ImageBitmap and resets the original backing bitmap.
2. [ImageBitmap::CreateFromOffscreenCanvas](https://github.com/mozilla-firefox/firefox/blob/d9bd6be9a67efb1c2667ef91a89856f35eb7cf5e/dom/canvas/ImageBitmap.cpp#L1005)
   obtains a source surface through the layout helper before constructing its image.
3. [ClientWebGLContext::GetSurfaceSnapshot](https://github.com/mozilla-firefox/firefox/blob/d9bd6be9a67efb1c2667ef91a89856f35eb7cf5e/dom/canvas/ClientWebGLContext.cpp#L1171)
   enters the back-buffer snapshot path. The synchronous snapshot code handles
   CPU data and IPC/shmem results.
4. [ImageBitmapRenderingContext](https://github.com/mozilla-firefox/firefox/blob/d9bd6be9a67efb1c2667ef91a89856f35eb7cf5e/dom/canvas/ImageBitmapRenderingContext.cpp)
   and [RemoteTextureMap](https://github.com/mozilla-firefox/firefox/blob/d9bd6be9a67efb1c2667ef91a89856f35eb7cf5e/gfx/layers/RemoteTextureMap.h)
   show why changing a single readback call is insufficient: ownership,
   synchronization, detached images, multiple consumers and lifetime matter.

This is source-guided diagnosis, not a sampled C++ CPU profile or a built Firefox
patch. The source Git pin is not claimed to be the exact Hg revision of every
tested binary. Nightly 162.0a1 build `20261106044122` reports Hg
`e3f5b185b198689444fa9c533726980c8ab8ce3d`; record both identities.

The analogous video fast paths cited in the bug are already fixed:
[1891675](https://bugzilla.mozilla.org/show_bug.cgi?id=1891675) (127),
[1889275](https://bugzilla.mozilla.org/show_bug.cgi?id=1889275) (129), and
[1887818](https://bugzilla.mozilla.org/show_bug.cgi?id=1887818) (126).
They are precedents, not outstanding patches that need filing again.
[1922769](https://bugzilla.mozilla.org/show_bug.cgi?id=1922769) remains open for
a related createImageBitmap workload; this probe is not that site's reproduction.

A useful initial comment is a short latest-release/Nightly timing table with
the exact probe, graphics environment and pixel-check caveats. A later Firefox
PR would need a GPU-backed image representation and resource-lifetime tests,
not an unsupported promise that an existing preference removes the readback.
No Firefox engine build or speculative C++ patch is presented as validated here.
The bug has three non-patch attachments (profile image, Flutter example and
HTML probe), with no attached implementation patch. The latest visible comment
is the Flutter team's September 2026 request for progress. Another status ping
would add little; a current release/Nightly table and a narrowly scoped worker/
texture-lifetime test would add evidence that that comment did not contain.

## Flutter: support the existing split stack

| Work | Inspected status | Contribution that would add evidence |
| --- | --- | --- |
| [188628](https://github.com/flutter/flutter/pull/188628) | Merged 2026-10-30 | Use presentation duration when measuring engine submission; don't equate it to displayed FPS |
| [195103](https://github.com/flutter/flutter/pull/195103) | Merged 2026-11-05 | Build matching native Skwasm artifacts for the dependent Dart code |
| [195104](https://github.com/flutter/flutter/pull/195104) | Open, non-draft, conflicting | Focused retained-DOM/resize/overlay regression evidence after rasterization |
| [195105](https://github.com/flutter/flutter/pull/195105) | Open draft | Same-engine bitmap/hybrid A/B on real third-party widgets and a minimal composition regression |
| [195106](https://github.com/flutter/flutter/pull/195106) | Open draft | Requalify desktop WebKit/Firefox and single-threaded Chromium; worker Chromium/mobile/Wimp remain opt-in |

The open 195105 review had no submitted reviews or inline threads at inspection.
195104 had a bot review with one resolved documentation thread and one outdated,
unresolved redundancy thread. These are not human acceptance of the design.
Do not add another bot-style review that repeats those points.

The [candidate experiment](hybrid-experiment.md) builds the actual source and
records visible transferred-canvas proof. The tiny
[`minimal_composition.dart`](../lib/minimal_composition.dart) entry removes chart
and grid imports: it is the better starting point for an engine-owned regression
test. The dashboard is the integration/performance case, not a proposed new
commercial dependency for Flutter's engine test suite.

The pixel-marker harness verifies requested frames, native-view overlap and
real viewport resize, with bounded convergence and first-snapshot evidence.
It does not replace continuous physical-display recording. A two-rAF wait alone
is not a presentation fence. Keep stale initial snapshots, mismatched layers and
failure to converge distinct rather than calling every delayed capture corruption.

The source's promotion readiness check and separate export surface address the
same lifetime/transition risks. A cheap direct-canvas clear in a microbenchmark
does not validate those mechanisms. The local direct probe's late blank source
snapshots use `preserveDrawingBuffer=false`. WebGL permits post-presentation
buffer clearing, so these are a probe limitation, not a reproduced display
defect. The separate buffer-lifecycle diagnostic distinguishes immediate buffer
contents from later source readback. API submission time still does not qualify
renderer correctness.

## Safari / documentation / CI

[193187](https://github.com/flutter/flutter/pull/193187) added Firefox Skwasm CI;
[193681](https://github.com/flutter/flutter/pull/193681) enabled suitable Safari
CI lanes. Those are concrete progress, already merged. They should not be
proposed again or mistaken for all-browser default enablement.

The [standalone follow-up](followup-validation-2026-11-06.md) now verifies
delivered headers, actual worker execution and a shared Wasm-memory round trip.
Real Safari 27.2 isolates with `require-corp` and does not with `credentialless`,
even though both workers execute. [WebKit 230550](https://bugs.webkit.org/show_bug.cgi?id=230550)
already tracks the missing policy. The current guide lists both header values;
the saved docs proposal adds a runtime diagnostic and resource-permission caveat.
It does not duplicate the list or propose another browser bug.

The follow-up also adds a concrete, unposted Firefox single-thread test/CI
patch: the full 54-case unit bundle passes with zero skips on both CI-pinned
Firefox 148 and current 159. This exercises the two mocks skipped in worker
mode and includes the builder's explicit suite selections.

For [178893](https://github.com/flutter/flutter/issues/178893), offer the real
Safari screenshots, exact heavy-renderer/worker proof and a bounded test matrix.
Do not say a physical iPhone, old OS release, or every external embed passed.
For WebKit's umbrella, keep a narrowly reproduced bitmap test distinct from
video, 2D, WebGL and WebGPU workloads; don't report the umbrella as fixed.

Before any future Flutter submission, read its
[AI contribution policy](https://github.com/flutter/flutter/blob/master/CONTRIBUTING.ai.md)
and contributor guide. Human understanding and review of the code, concise
reproducibility, and accurate verification claims are necessary. No maintainer
has been contacted by this evaluation, and no release ETA is inferred.

## Recommended contribution order

1. Share the reduced canvas probe and current vendor release/Nightly evidence
   on Mozilla 1788206 after human review. Ask where a texture-lifetime regression
   test belongs, rather than opening a duplicate bug or claiming a one-line fix.
2. Offer the existing Flutter hybrid stack the same-bundle A/B and marker
   harness. If a transition failure survives reduction and an engine test, make
   that test the patch. Current eventual-correctness results alone do not justify
   filing a corruption bug or rewriting the candidate.
3. Supply Safari 178893 with the exact native rendering/isolation matrix. A
   diagnostic/docs clarification can be small and useful, but first avoid
   duplicating the guide's existing `require-corp` alternative.
4. Revisit desktop/default policy after review and release integration of the
   dependent renderer work. Do not turn this single-machine matrix into a
   default-enable PR or expand the unrelated video issue.
