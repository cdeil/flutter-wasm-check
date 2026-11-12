# Re-evaluation after Flutter 3.50 / Dart 3.14 — 2026-11-12

This report re-checks the [2026-11-06 investigation](upstream-investigation.md)
against Flutter 3.50.0 stable and Dart 3.14.0. It covers the release
announcements, the 3.50.0 engine source, current tracker state and short local
runs. Nothing was posted upstream. Claims marked *inferred* or *unverified* did
not pass an independent second check.

## Summary

- **Wasm is still opt-in in Flutter 3.50.0, and Firefox and Safari still get
  JavaScript.** `flutter build web` uses Wasm only with `--wasm`. Inside a
  `--wasm` build, the loader turns dart2wasm on by default only for Blink:
  `defaultWasmSupport = {blink: true, gecko: false, webkit: false}`. That value is
  the same in 3.47.0, 3.50.0, 3.51.0-0.1.pre and master. The
  [3.50 blog post](https://flutter.dev/blog/whats-new-in-flutter-3-50) says
  Safari 26.2+ and Firefox 147+ "deliver over 2x the frame rate of JavaScript on
  heavy widget benchmarks". It says they will be enabled by default "in a future
  stable release". It names no benchmark, metric or threading mode. No official
  3.50 or 3.14 text says Wasm is the default, or ready, on Firefox or Safari.
- **What 3.50 changes for Firefox and Safari:**
  - The loader is stricter. It now requires WasmGC, SIMD, JS string builtins and
    `try_table`.
  - Firefox below 147 is hard-blocked. `wasmAllowList` cannot override the block.
  - The loader logs new skip messages.
  - The Firefox Skwasm CI (193187) and Safari CI (193681) now ship in a stable
    release.
- **What Dart 3.14 changes:**
  - dart2wasm uses standard `try_table` exception handling by default.
  - Native JS string builtins are now required.
  - The loader has a buffered-compile fallback for the `compileStreaming` bug in
    Safari 26.5 and earlier.
  - `Int32x4`, `Float32x4` and `Float64x2` use hardware v128 SIMD.
  - `runtimeType` comparison is cheaper, which helps layout in every browser.
- **What did not ship in 3.50.0:** 188628 and 195103 (no bitmap capture). Both
  first appear in the 3.51.0-0.1.pre beta. The futex fix for the multi-threaded
  Skwasm FreeType race (194139) is also missing; it is on master and in the 3.51
  beta. All of the hybrid stack (195104, 195105, 195106) is still open. Skwasm in
  3.50.0 still calls `transferToImageBitmap` once per picture.
- **The browser-side blockers are unchanged.** Mozilla 1788206 has no new
  comments or patches. Firefox 160 now uses Metal ANGLE on macOS, but the local
  bitmap-creation cost is still about 12.5 ms at 2048² (headless). WebKit 230550 is
  unchanged. A new WebKit patch (331237 / PR 80626) adds credentialless only
  behind a preference that is off by default, and CORP is still required.
- **Recommendation for the production dashboard app this check models: do not
  switch Firefox or Safari users to Wasm.** Nothing in 3.50 changes the 2026-11-06
  decision to wait. A `--wasm` build would give Chromium 137+ Wasm and still serve
  JS/CanvasKit to Firefox and Safari. That is the same per-browser split as before,
  and its trade-off is unchanged. Do not hand-enable `wasmAllowList` for
  `gecko`/`webkit` in production either, for three reasons:
  - Flutter itself keeps them off.
  - 3.50.0 lacks the multi-threaded Skwasm race fix.
  - Safari isolates only with `require-corp`.

  Re-evaluate when three things have happened:
  - a stable release contains 195103 (the 3.51 line at the earliest);
  - upstream changes the WebKit/Gecko defaults;
  - the Firefox readback is fixed, or hybrid presentation ships.

## What changed since 2026-11-06

| Area | Change | Evidence |
| --- | --- | --- |
| Flutter release | 3.50.0 = `ab2912035e`. The tag commit is dated 2026-11-09; it reached stable on 2026-11-11 with Dart 3.14.0. 3.51.0-0.1.pre (`d040ef5c`, Dart 3.15.0-118.1.beta) was tagged 2026-11-10 and published on 2026-11-11. There is no 3.50.x hotfix yet. | `git ls-remote --tags https://github.com/flutter/flutter '3.50*' '3.51*'`; [releases_macos.json](https://storage.googleapis.com/flutter_infra_release/releases/releases_macos.json) |
| Branch point | 3.50 branched from master at `0e4dea427d` on 2026-10-12. It carries 27 branch commits. The only web engine cherry-pick is 195839. | `gh api repos/flutter/flutter/compare/master...3.50.0` |
| Default browsers | `defaultWasmSupport` is unchanged. Docs table: "Default behavior in Flutter 3.50 (`--wasm`)". WebKit/Gecko "falls back to dart2js + CanvasKit by default". | `~/fvm/versions/3.50.0/engine/src/flutter/lib/web_ui/flutter_js/src/browser_environment.js:8-13`; [Wasm guide](https://docs.flutter.dev/platform-integration/web/wasm) |
| Loader gates | dart2wasm probe for WasmGC + SIMD + js-string + try_table (193271, 193090). Firefox < 147 returns `false` before any override (193180, merged 2026-09-26). The allow-list check moved from the Skwasm-renderer case to the dart2wasm-target case, with new messages such as `WebAssembly is disabled by default for browser engine "gecko"`. | `browser_environment.js:58-70`; `flutter_js/src/loader.js` (3.50.0); `gh pr view 193180 -R flutter/flutter` |
| Skwasm threading | `skwasmSingleThreaded = !crossOriginIsolated \|\| isChromeExtension \|\| forceSingleThreadedSkwasm`. `enableWimp` no longer forces single-threaded mode. Firefox and Safari always load `skwasm_heavy`, because `hasImageCodecs` is Blink-only. | `flutter_js/src/skwasm_loader.js:9-15,43`; `browser_environment.js:35-47` |
| Presentation | Unchanged: `OffscreenCanvasRasterizer`, one `transferToImageBitmap()` per picture, `transferFromImageBitmap` on the main thread. No hybrid symbols are present. | `engine/src/flutter/skwasm/library_skwasm_support.js:278-283,349`; `skwasm/surface.cc:229-241`; `skwasm_impl/renderer.dart:300,418` |
| Dev server headers | `flutter run --wasm` still sends COEP `credentialless`. The runtime warning recommends `require-corp`. | `packages/flutter_tools/lib/src/web/web_constants.dart:28`; `device.dart:989` (3.50.0) |
| Cherry-pick 195839 | Makes resize and render atomic on the shared offscreen surface (from 194401, which fixes multi-view sizing regression 185034). It touches the same rasterizer files as 195104. | `gh pr view 195839 -R flutter/flutter` |
| Other 3.50 web items | WebParagraph preview; `--web-content-hash`; Wasm deferred loading behind a flag; CanvasKit/Skwasm unification refactors; legacy JS interop deprecated (`--no-deprecated-js-interop`). The CHANGELOG has only a pointer to the release notes. | [release notes](https://docs.flutter.dev/release/release-notes/release-notes-3.50.0); `CHANGELOG.md` at tag 3.50.0 |
| Dart 3.14 | dart2wasm changes: `try_table` by default (dart-lang/sdk#54394); native js-string builtins required plus the Safari ≤ 26.5 `compileStreaming` workaround (#63543); v128 SIMD (#64170, "up to 4x" on SIMD benchmarks, no baselines); `dart.library.isolate` is false (#64328). `runtimeType` comparison is now a class-ID compare (#63320, an ancestor of tag 3.14.0). There is still no shared-memory threading for Dart code (#55364, #55991 open). | [Dart 3.14 post](https://dart.dev/blog/announcing-dart-3-14); [CHANGELOG 3.14.0](https://raw.githubusercontent.com/dart-lang/sdk/3.14.0/CHANGELOG.md) |
| Firefox | Release 160.0 came out on 2026-11-10; Beta is 161.0b2 and Nightly is 162.0a1. Firefox 160 moves macOS WebGL to Metal ANGLE (2079810). Nightly 162 re-enables DOM blit uploads on Metal ANGLE (2089826), which caused talos regression 2090939; that bug is open, so 2089826 could still be backed out. The release and MDN notes for 160–162 have no OffscreenCanvas, ImageBitmap readback or Wasm items. | [product-details](https://product-details.mozilla.org/1.0/firefox_versions.json); [160 notes](https://www.mozilla.org/en-US/firefox/160.0/releasenotes/) |
| Safari / WebKit | Safari 27.2 (2026-10-26) has no Wasm, isolation or canvas items. 27.3 beta (2026-11-03) adds Memory64 and relaxed SIMD, and "improved the performance of WebGL canvas contents copied into an image, such as … an ImageBitmap" (184913852). STP 256 logs failed COOP/COEP isolation (328272, 324426@main). WebKit 331237 / [PR 80626](https://github.com/WebKit/WebKit/pull/80626) were opened 2026-11-12: credentialless behind an off-by-default preference, CORP still required. JSPI shipped in Safari 27.0. | [27.2](https://developer.apple.com/documentation/safari-release-notes/safari-27_2-release-notes), [27.3 beta](https://developer.apple.com/documentation/safari-release-notes/safari-27_3-release-notes), [27.0](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes) (line 1150), [STP 256](https://developer.apple.com/documentation/safari-technology-preview-release-notes/stp-release-256); [331237](https://bugs.webkit.org/show_bug.cgi?id=331237) |
| Flutter master | New overlapping PR [196104](https://github.com/flutter/flutter/pull/196104), opened 2026-11-06: it applies platform-view DOM changes after the multi-threaded raster round trip and does not reference 195104. Wasm-by-default tracking ([188813](https://github.com/flutter/flutter/issues/188813), [196000](https://github.com/flutter/flutter/issues/196000)) has not moved. | `gh pr view 196104 -R flutter/flutter`; `gh issue view 188813` |

## Item-by-item status

| Item | 2026-11-06 position | Status 2026-11-12 | Verdict | Evidence |
| --- | --- | --- | --- | --- |
| Mozilla [1788206](https://bugzilla.mozilla.org/show_bug.cgi?id=1788206) | The creation stage dominates the cost. Share a reduced probe and timing table. | NEW, P3/S3, unassigned. The last comment is still c40 (Flutter team, 2026-09-21); the only change since is a CC on 2026-10-17. No patches. | Still valid. Refresh the numbers. | `curl 'https://bugzilla.mozilla.org/rest/bug/1788206/history?new_since=2026-10-01'` |
| Firefox source path (TransferToImageBitmap → GetSurfaceSnapshot) | Source-guided diagnosis at `d9bd6be9` | Not re-inspected. No Mozilla change to the WebGL path was found. | Still valid (not re-checked against newer source) | Bugzilla REST `longdesc=transferToImageBitmap&chfieldfrom=2026-10-01` → only 1788206, 2001164 and unrelated bugs |
| Precedents 1891675 / 1889275 / 1887818 | Fixed in 127 / 129 / 126 | Unchanged | Still valid | Bugzilla REST |
| [1922769](https://bugzilla.mozilla.org/show_bug.cgi?id=1922769) | Open, related | NEW, untouched since 2024-10-29 | Still valid | Bugzilla REST |
| [2001164](https://bugzilla.mozilla.org/show_bug.cgi?id=2001164) | Not tracked; the old report missed it, though it predates 2026-11-06 | Canvas2D `transferToImageBitmap` fix. Landed 2026-10-27, backed out 2026-11-03 for regression 2088063, now REOPENED. 2D-only: it does not touch the WebGL readback. It extended `dom/canvas/test/test_offscreencanvas_toimagebitmap.html`. | Update needed: add it as context | Bugzilla 2001164 c4–c9 |
| Flutter [188628](https://github.com/flutter/flutter/pull/188628) | Merged 2026-10-30 | Not in 3.50.0; in 3.51.0-0.1.pre | Update needed: master/3.51 only | `gh api repos/flutter/flutter/compare/d555faf800...3.50.0` → diverged |
| Flutter [195103](https://github.com/flutter/flutter/pull/195103) | Merged 2026-11-05 | Not in 3.50.0; in 3.51.0-0.1.pre. 3.50.0 `surface.cc` still captures bitmaps unconditionally. | Update needed: master/3.51 only | `compare/c3f332d173...3.50.0` → diverged |
| Flutter [195104](https://github.com/flutter/flutter/pull/195104) | Open, non-draft, conflicting | Open and MERGEABLE (`ca5fe860b`, 2026-11-11). Blocked: no CICD label, no human review (bot review only). Overlaps 194401/195839 at file level (both modify `compositing/offscreen_canvas_rasterizer.dart` and `rasterizer.dart`). Competing 196104 exists. | Update needed | `gh pr view 195104 -R flutter/flutter --json mergeable,labels,reviews` |
| Flutter [195105](https://github.com/flutter/flutter/pull/195105) | Open draft | Draft, rebased to `e72b38d` on 2026-11-11, 0 reviews. The local A/B was built on the old `b09e6cab`. | Still valid; re-measure on the new head | `gh pr view 195105 --json headRefOid,isDraft` |
| Flutter [195106](https://github.com/flutter/flutter/pull/195106) | Open draft; requalify desktop WebKit/Firefox | Draft, rebased to `fa87b95`, 0 reviews. Its diff changes only the Dart-side presentation choice, not `flutter_js` `defaultWasmSupport`. | Still valid. Default enablement needs two upstream decisions. | `gh pr diff 195106 -R flutter/flutter` (no `flutter_js/src` files) |
| Flutter [193187](https://github.com/flutter/flutter/pull/193187) (Firefox Skwasm CI) | Merged; not a default | Ships in 3.50.0 | Done upstream | `compare/5b41d8b1f7...3.50.0` → ahead, behind 0 |
| Flutter [193681](https://github.com/flutter/flutter/pull/193681) (Safari CI) | Merged; not a default | Ships in 3.50.0 | Done upstream | `compare/d7fe60992f...3.50.0` → ahead, behind 0 |
| Default allow-list: WebKit/Gecko off | Off in 3.47.9 and the 3.50 beta | Off in 3.50.0, 3.51.0-0.1.pre and master | Still valid | `browser_environment.js:8-13` at all three refs |
| Capability floors (Chromium 137 / Safari 26.2 / Firefox 147) | From the 3.50 beta docs | Confirmed in stable. The Firefox 147 gate is in code; its comment cites flutter#186619 and Mozilla 2006811, but both numbers resolve to unrelated items. | Still valid; the references need fixing | `browser_environment.js:63-67`; `gh issue view 186619` |
| Safari isolates only with `require-corp`; WebKit [230550](https://bugs.webkit.org/show_bug.cgi?id=230550) | NEW | 230550 unchanged (last change 2026-09-07). New 331237 / PR 80626 adds the preference, off by default, and still requires CORP. Shipping Safari 27.2 has no change. | Still valid | `curl https://bugs.webkit.org/rest/bug/230550`; `gh pr view 80626 -R WebKit/WebKit` |
| Guide lists `credentialless` or `require-corp` (docs/diagnostic proposal) | Proposal saved | The 3.50 guide is unchanged and has no Safari caveat. Tooling sends `credentialless`; the runtime warning says `require-corp`. STP 256 adds a console message, but stable Safari does not have it. | Still valid | [Wasm guide](https://docs.flutter.dev/platform-integration/web/wasm); `web_constants.dart:28` |
| Issue [178893](https://github.com/flutter/flutter/issues/178893) | Offer Safari matrix | OPEN, no comments since 2026-09-08. kevmoo (2026-09-07): crashing Safari versions in the wild, a long tail of bugs, "We can't tolerate crashing apps". | Still valid | `gh api repos/flutter/flutter/issues/178893/comments` |
| WebKit umbrella [267291](https://bugs.webkit.org/show_bug.cgi?id=267291) | Keep a narrow bitmap test distinct | NEW, 34 dependencies, including 322812 (ImageBitmapRenderer readback tests). Safari 27.3 beta claims a faster WebGL-to-ImageBitmap copy. | Still valid; re-measure on 27.3 | WebKit REST; 27.3 notes line 702 |
| Recommendation 1 (Mozilla probe/timing table) | First priority | Nobody has posted one. Firefox 160 Metal ANGLE still shows the cost. 2001164 points to a concrete test location to ask about. | Still valid; update | See Local validation |
| Recommendation 2 (hybrid A/B for the stack) | Offer A/B and marker harness | The stack was rebased. 195104 is now mergeable. 196104 overlaps it. The A/B numbers refer to `b09e6cab`. | Update needed | `gh pr view 195104/195105/195106/196104` |
| Recommendation 3 (Safari matrix + docs) | Offer matrix; small docs clarification | Unchanged need. Add WebKit 331237 as in progress and the STP 256 logging. | Update needed (minor) | as above |
| Recommendation 4 (default policy later) | Wait for review and release integration | The blog commits to default-on in "a future stable release". Two gates: loader allow-list and 195106. | Still valid | blog; `gh pr diff 195106` |
| `patches/firefox-single-thread-unit-lane.patch` | Unposted; targets `b09e6cab` | `git apply --check` is clean on 3.50.0 (both blobs `39e39606`/`10f1d874` identical). It applies to master `8d46843` with offsets and the JSON stays valid. No ref defines `firefox-dart2wasm-skwasm-skwasm`. Not re-run. | Still valid; retarget to master | `git apply --check -v` on 3.50.0 and master copies |
| `patches/README.md` | Pins `b09e6cab` | The pin is outdated. Master now has `firefox-wimp`/`safari-wimp` configs (189953, `enable-ci: false`) and the Chrome drone split (195873). Both are master-only. | Update needed | `compare/3.50.0...93197e2de3` → diverged |
| `drafts/mozilla-1788206.md` | Unposted | The bug is unchanged. The draft cites Firefox 159.0.1 and an older Nightly build. | Update needed: versions, 2001164, Metal ANGLE row | `drafts/mozilla-1788206.md:4,12` |
| `drafts/flutter-195105.md` | Unposted | Its candidate SHA and every A/B number predate head `e72b38d`. | Update needed: re-measure | `drafts/flutter-195105.md:3-8,24-27` |
| `drafts/flutter-178893.md` | Unposted | The "dual-build still chooses JS for Safari" claim holds for 3.50.0. Its numbers are from the 3.47 toolchain. | Update needed: version labels | `drafts/flutter-178893.md:11-18` |
| `drafts/flutter-wasm-isolation-diagnostic.md` | Unposted | Still valid. Check any quoted loader message against the new 3.50 strings. | Update needed (minor) | `loader.js` (3.50.0) |
| Local SDK "3.47.x / Dart 3.13" | Baseline | 3.50.0 / Dart 3.14.0 is installed at `~/fvm/versions/3.50.0` (a git checkout with engine source). The `flutter` on PATH is still 3.47.0, and `.fvmrc` is unchanged. | Obsolete for new runs | `~/fvm/versions/3.50.0/bin/flutter --version` |

## Local validation with Flutter 3.50.0

All runs used Flutter 3.50.0 (`ab2912035e`, engine `371f77202a`, Dart 3.14.0,
DevTools 2.61.0) on the same Apple M1 Mac. The app ran in a detached scratch
worktree that has since been removed; the checkout is unchanged. Raw outputs
were left in a temporary scratch directory and are **not** saved under
`results/`. Repeat these runs before citing any number upstream.

**Measured**

| Check | 2026-11-06 (3.47.9) | 2026-11-12 (3.50.0) | Note |
| --- | --- | --- | --- |
| Unit tests | pass | 6/6 pass | — |
| `flutter analyze --no-pub lib test` | clean | 6 info items: `package:flutter/material.dart` deprecated in favour of `package:material_ui` | `make check` would fail (*inferred* from the analyze exit status) |
| Build release `--wasm` / profile `--wasm` / release JS | — | 42.4 s / 44.4 s / 37.8 s | The "WebAssembly compilation is new" banner is still printed |
| Brotli: Wasm + Skwasm (Chromium) | 2,136,480 | 2,159,158 | +1.1% |
| Brotli: Wasm + `skwasm_heavy` (Firefox/Safari) | 2,785,935 | 2,806,232 | +0.7% |
| Brotli: JS + generic CanvasKit | 3,132,407 | 3,165,238 | +1.0% |
| Brotli: JS + Chromium CanvasKit | 2,414,610 | 2,444,872 | +1.3% |
| Copy probe, vendor Firefox, 2048², create bitmap (alpha / no alpha) | 159.0.1 visible: 10.14 / 10.56 ms | 160.0 headless, ANGLE Metal: 12.52 / 13.63 ms | 1024²: 3.91 / 4.00; 512²: 1.17 / 1.20. 100 calls after 10 warmups, all bitmap pixel checks pass |
| Playwright WebKit 27.2 (not Safari), profile build, COOP + `require-corp` | — | default and `js` → CanvasKit JS; `wasm` and `st` → Dart Wasm + `skwasm_heavy`; `crossOriginIsolated` true; no page errors | Functional proof, not timing |
| Headless Chromium A/B, 3.47.9 vs 3.50.0 profile, same session (fps) | trina-grid js/wasm 45.4 / 59.6; fl-chart 19.0 / 26.8; sync-chart 2.34 / 2.39 | 45.8 / 59.5; 19.1 / 26.0; 2.33 / 2.40 | SwiftShader, one repetition; rules out only large changes. *Unverified*: the second pass did not recompute these. |
| dart2wasm `support.js` (Dart 3.14.0 stable) | — | 4 `WebAssembly.validate` probes: GC, v128 SIMD, js-string (must fail with a wrong signature), `try_table` | Byte-identical to the 3.14 beta output |

The Firefox comparison changes three things at once: version (159 → 160), WebGL
backend (`Apple M1` → ANGLE Metal) and window mode (visible → headless). It shows
that Metal ANGLE did not remove the area-proportional readback. It does not
measure how large any change is.

The Chromium frame rates are not comparable to the 2026-11-06 GPU numbers,
because headless Chromium used SwiftShader here.

The local harness cannot serve the new builds as-is. The new `index.html` has a
self-closing `<base href="/" />`, and `tool/serve.mjs:109` matches only
`<base href="…">`, so assets 404. A scratch regex fix worked. *Unverified*:
whether 3.50 or an earlier `web/index.html` edit is the cause.

**Not measured**

- Real Safari 27.2 with the 3.50 build. Safari 27.3 beta and Safari Technology
  Preview are not installed.
- Firefox app frame timing on 3.50: Playwright Firefox did not start in the agent
  sandbox ("Could not find profile folder").
- Visible vendor Firefox 160. Firefox 161 beta. Nightly 162 on macOS, which would
  include 2089826.
- Builds from 3.51.0-0.1.pre or master, so 195103 and 188628 were not exercised.
- Hybrid candidates at `e72b38d` / `fa87b95`.
- GPU-backed Chromium. Startup, compile time and the streaming-compile branch
  taken by Safari 27.2.
- Execution of the Firefox single-thread lane patch on 3.50.0 or master
  (`git apply --check` only).
- Linux and Windows Firefox.

## Revised contribution order

1. **Mozilla 1788206.** Update `drafts/mozilla-1788206.md`:
   - add a visible Firefox 160.0 Metal ANGLE row, plus 161 beta and a current
     Nightly;
   - state that 2001164 covers only Canvas2D;
   - ask whether `dom/canvas/test/test_offscreencanvas_toimagebitmap.html` is the
     right home for a WebGL texture-lifetime test.

   Do not repeat c40's status ping. This remains the highest-value item: no
   Flutter 3.50 change removes this cost for Skwasm.
2. **Firefox single-thread unit lane.** Rebase onto master next to the
   189953 wimp configs and the 195873 drone split, then re-run the 54-case bundle
   on Firefox 160. It is independent of the hybrid stack and is no longer tied to
   `b09e6cab`. It still needs human review under Flutter's
   [AI contribution policy](https://github.com/flutter/flutter/blob/master/CONTRIBUTING.ai.md).
3. **Hybrid stack evidence.** Re-run the same-bundle A/B and the marker harness on
   `e72b38d` / `fa87b95`. 195104 is now mergeable, and 196104 overlaps it. Offer
   the evidence, but do not take sides between the two PRs or rewrite either.
4. **Safari 178893 and docs.** Rebuild the matrix on 3.50.0, and on 27.3 once it
   is released. Document `require-corp` as the Safari path: `flutter run --wasm`
   sends `credentialless`, which Safari does not honour. Describe WebKit 331237 as
   in progress, not usable.
5. **Default policy.** Wait. Two separate upstream gates control default
   enablement: `defaultWasmSupport` in `flutter_js` and the presentation choice in
   195106. Do not file a default-enable PR.

## Corrections to research claims

- 2001164 was described as new. It was filed on 2025-11-19, and the patch landed
  and was backed out before 2026-11-06. The old report simply missed it.
- One claim was that the Firefox 147 minimum is docs policy. It is a hard-coded
  loader gate.
- One claim was that JSPI is absent from Safari. It shipped in Safari 27.0 even
  though WebKit 283054 is still NEW.
- 189953 and 195873 were described as part of 3.50. Both are master-only.
- 193293 (Skwasm WebGL context-failure report) is on master only, not in the 3.51
  beta.
- The non-Chromium image-decode fix (194069, for issue 194067) merged on
  2026-10-26 and is not in 3.50.0.
- Firefox issue 193703 (a platform view that never composites on first
  construction) was closed as NOT_PLANNED on 2026-10-15, so it is not fixed.
- Flutter's CHANGELOG.md for 3.50 does have an entry, but it only points to the
  release notes and the blog post.
- The claim that `canvaskit/wimp.wasm` is missing from 3.50 output is
  unconfirmed: the 3.50.0 SDK cache ships it.

## Open questions

- Which benchmark, metric (submission or presentation) and threading mode back
  the blog's "over 2x" Firefox/Safari figure? 188628, which adds the
  presentation-duration metric, is not in 3.50.0.
- Will cherry-pick 196127 bring the futex semaphore fix (194139) into a 3.50.x
  hotfix? It is open and labelled `cp: review`.
- When will 3.51 reach stable (the first stable with 195103)? Not checked.
- Is "wimp" a Wasm build of Impeller, and would it change the Firefox readback
  profile? *Inferred* from the PR 191747 description only.
- Does Safari 27.3's faster WebGL-to-ImageBitmap copy reduce Skwasm frame cost?
  Which `compileStreaming` branch does Safari 27.2 take? Neither was measured.
- Will WebKit PR 80626 land, and will Mozilla reland 2001164 or extend it to
  WebGL?
- What are the correct upstream references for the Firefox < 147 SpiderMonkey
  Ion WasmGC bug?
- Is there a tracking issue for the "future stable release" that enables WebKit
  and Gecko by default? 188813 and 196000 cover build defaults, not browser
  defaults.
