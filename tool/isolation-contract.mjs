export function assertIsolation(result, policy) {
  const expectedHeaders = {
    "cross-origin-opener-policy": policy.coop === "none" ? null : policy.coop,
    "cross-origin-embedder-policy": policy.coep === "none" ? null : policy.coep,
  };
  for (const [key, value] of Object.entries(expectedHeaders))
    if (result.documentHeaders[key] !== value)
      throw Error(`Delivered header mismatch: ${key}`);
  if (!result.secure)
    throw Error("Probe requires a secure context (localhost is suitable)");
  if (policy.coep === "require-corp" && !result.isolated)
    throw Error("require-corp + COOP did not isolate");
  if (policy.coep === "none" && result.isolated)
    throw Error("Negative isolation control unexpectedly isolated");
  for (const worker of result.workers)
    if (
      !worker.executed ||
      worker.sharedRoundTrip !== result.isolated ||
      worker.environment.isolated !== result.isolated
    )
      throw Error(`Worker/shared-memory contract mismatch: ${worker.kind}`);
  for (const resource of result.resources) {
    const shouldLoad =
      resource.name !== "Cross-origin, CORP same-origin" &&
      !(
        policy.coep === "require-corp" &&
        resource.name === "Cross-origin, no CORP"
      );
    if (resource.loaded !== shouldLoad)
      throw Error(`Resource contract mismatch: ${resource.name}`);
  }
}
