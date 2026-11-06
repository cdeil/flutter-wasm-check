# Draft contributions — not posted

These are starting points for human review, not messages sent to maintainers.
Update result links after the final repository commit, select the smallest
relevant table, and verify that the issue/PR is still open before any submission.

1. [Mozilla copy-cost update](mozilla-1788206.md): strongest low-risk evidence
   contribution, including the current Nightly.
2. [Flutter hybrid validation](flutter-195105.md): real-app A/B plus a reduced
   composition test; prefer helping the existing stack over duplicating it.
3. [Safari readiness evidence](flutter-178893.md): measured scope and isolation
   distinction, with no claim of complete device qualification.
4. [Isolation diagnostic](flutter-wasm-isolation-diagnostic.md): a runtime check
   and resource-permission caveat after verifying what the guide already covers.

The [candidate-targeted Firefox test/CI patch](../patches/) is also ready for
human review. The full 54-case bundle passes without skips locally on vendor
Firefox 148 and 159; actual upstream presubmits remain to be run.

The source and rendering checks in the reports determine what may be claimed.
An unexecuted engine test, an eventually correct screenshot, a microbenchmark's
cheap API submission, and a physical-display recording are different evidence.
Respect Flutter's contribution policy; a human needs to understand, edit and
own any eventual issue discussion or patch.
