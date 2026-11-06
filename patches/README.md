# Unposted candidate patch

[`firefox-single-thread-unit-lane.patch`](firefox-single-thread-unit-lane.patch)
targets Flutter candidate `b09e6cabd227035bc209757ae9586b7454049797` (PR 195105).
It adds a non-isolated Firefox Skwasm unit lane and wires the explicit Linux CI
artifact-copy/run selections. The complete 54-case bundle passed without skips
locally on vendor Firefox 148.0 and 159.0.1.

See the [validation and limits](../docs/followup-validation-2026-11-06.md#a-concrete-firefox-testci-patch).
The patch applies cleanly to the pinned reference. It has not been submitted,
run through the actual upstream CI environment, or qualified against an
unrelated current-main revision. Human review and maintainer placement/rebase
are still needed.
