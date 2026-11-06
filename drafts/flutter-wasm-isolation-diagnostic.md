# Proposed Wasm guide diagnostic — not posted

The HTTP-server section already lists `credentialless` and `require-corp`.
The proposed addition is a runtime success check and its deployment caveat:

> Check `window.crossOriginIsolated` after navigation. Header presence alone
> does not establish isolation. If it remains false with `credentialless`, try
> `require-corp` and verify that cross-origin resources opt in through CORP or
> CORS. Wasm can still render single-threaded when shared memory is unavailable.
> A successfully created Worker alone does not prove shared-memory support.

The [standalone validation](../docs/followup-validation-2026-11-06.md) tests
delivered headers, worker execution and an actual shared WebAssembly.Memory
round trip. Real Safari 27.2 works with `require-corp` and does not isolate with
`credentialless`; current Chrome and Firefox pass both policies in the recorded
matrix. WebKit already tracks credentialless implementation in
[230550](https://bugs.webkit.org/show_bug.cgi?id=230550).

Review the wording and latest guide before submission. This is a proposed
diagnostic clarification, not a new browser bug or a claim that all external
services work under require-corp. No upstream submission has been made.

*Draft prepared by Coding Agent; not posted upstream.*
