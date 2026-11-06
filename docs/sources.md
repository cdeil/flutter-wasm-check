# Sources and provenance

The app resolves exact pub.dev releases through `pubspec.lock`: TrinaGrid 2.4.0,
Syncfusion Charts/DataGrid 35.1.43, fl_chart 1.3.0, and Graphic 2.7.0.
Source references are Git submodules, not path overrides. A source checkout's
HEAD is not automatically identical to a published package with a similar version.
In particular, the Syncfusion Git pin declares Charts 35.1.37; the app actually
compiles the locked pub.dev 35.1.43 archive. No matching 35.1.43 tag was found.

| Reference | Pin |
| --- | --- |
| Flutter stable | `c197ca5199e9ee5661e865596c9c07294dfab51c` (3.47.9) |
| Flutter hybrid candidate | `b09e6cabd227035bc209757ae9586b7454049797` (PR 195105; fork reference) |
| Flutter reference demo | `969ee24238d938a76d6e1c536560683b0fe26438` |
| Firefox source | `d9bd6be9a67efb1c2667ef91a89856f35eb7cf5e` |
| TrinaGrid | `d46c7f9c63bfe77edb2bd0448212d8d04278e59c` (2.4.0 release commit) |
| fl_chart | `fc6a4b6256245dc9362b6396f0cac2d4fd1690ea` (1.3.0 tag) |
| Syncfusion | `4f7cfc2ac9a8b808b017b183281b842e22b47f03` |
| Graphic | `3b6f31e785948293f7c3c20dd5a2b7c0f7aecd92` |

Flutter's inspected beta was `368ac9e40bad0566927cc9428a42461152652c12`
(3.50.0-0.4.pre). The experimental local engine is separately pinned to
`b09e6cabd227035bc209757ae9586b7454049797`, the inspected head of
[Flutter PR 195105](https://github.com/flutter/flutter/pull/195105).
It is not the stable submodule or an official released SDK.

`make sources` performs optional initialization, with a sparse Firefox checkout
for canvas, graphics layers, GL and widget source. The application itself needs
none of these checkouts. Firefox and Flutter source downloads can be large.

Roboto-Regular.ttf and its accompanying license come from Flutter 3.47.9's
`bin/cache/artifacts/material_fonts/`. They are bundled so the dashboard does
not fetch its main typeface from Google Fonts during measurements. The unmodified
reference demo retains its own font behavior; do not conflate its resource
footprint with this app's.

Original app, probes, scripts and documentation use this repository's MIT
license. Flutter and its source keep BSD notices; Firefox keeps MPL-2.0 notices;
packages/submodules retain their respective licenses. The Syncfusion dependency
requires an appropriate vendor license; there is no license key in this repo.
The examples use generated fixtures and local assets only.

## Published evidence

`results/2026-11-06/` holds selected raw measurements, browser/runtime proof,
PNG evidence and exact upstream revision/status metadata. Regenerable engine
trees, build output, downloaded browsers and exploratory runs are excluded.
The reports state which runs are comparable and which tests are only startup
or rendering checks. Local user-agent/GL renderer aliases are recorded as
reported rather than renamed to guessed hardware models.
