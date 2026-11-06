# Flutter Wasm Check

Use FVM's pinned Flutter SDK. All data must be synthetic, deterministic and public.
Do not add company names, private URLs, analytics, credentials or internal screenshots.

Use Playwright for automation and Computer Use for real Safari / installed-browser
checks it cannot drive. Distinguish patched Firefox and WebKit from vendor browsers.
Keep macOS awake with a task-scoped caffeinate process during GUI checks.

Run `make check` before committing. Source submodules are pinned references, not
package overrides. Keep raw results, exact build/browser versions, repetitions,
isolation state and runtime proof. Never relabel an unexecuted experiment as passing.
Bound frame samples by an explicit `performance.now()` window: queued startup
timings can arrive after recording begins. Clearing a callback list alone is
insufficient. Distinguish frame timing from physical-display presentation.
Do not post upstream comments or PRs without explicit user authorization.
