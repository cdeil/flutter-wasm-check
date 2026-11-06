# Follow-up evidence

The [follow-up report](../../docs/followup-validation-2026-11-06.md) explains the
method, source/CI inspection and remaining contribution boundaries.

- `*-isolation-followup.json`: three fresh Playwright contexts per policy on
  Chrome for Testing 157 and patched Firefox 157, on macOS and Linux.
- `linux-firefox159-isolation.jsonl`: three fresh native vendor Firefox 159.0.1
  processes per policy, with completed-result gating and contract validation.
- `mac-safari27-isolation.jsonl`: four observed real Safari navigations, one per
  policy. Both module-worker forms execute in every case; shared-memory results
  are recorded separately from worker execution.
- `engine-firefox159-st-focused.log`: the initial 41-case focused single-thread run.
- `engine-firefox148-st-full.log`, `engine-firefox159-st-full.log`: the complete
  eight-file, 54-case Skwasm unit suite on the CI-pinned and current vendor browsers,
  zero skips, exit zero. Local paths/terminal padding are sanitized.
- `upstream-status.json`: current PR heads and WebKit feature/source evidence.
- `validation.json`: exact scope, versions, counts and checks.
- `screenshots/`: public-only native Safari and automated browser evidence.

Expected negative controls remain visible: a working Worker without shared
memory, and images blocked by their cross-origin policies, are valid results.
The first native Firefox attempt without a working completion gate is excluded.
The proposal patch is in [`patches/`](../../patches/), not submitted upstream.

`manifest.sha256` covers the evidence files in this directory.
