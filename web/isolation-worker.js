self.postMessage({
  kind: "ready",
  isolated: self.crossOriginIsolated,
  secure: self.isSecureContext,
  sharedArrayBufferGlobal: typeof SharedArrayBuffer === "function",
});
self.onmessage = ({ data }) => {
  try {
    const view = new Int32Array(data.memory.buffer);
    const previous = Atomics.add(view, 0, 1);
    self.postMessage({
      kind: "shared",
      previous,
      current: Atomics.load(view, 0),
      bufferTag: Object.prototype.toString.call(data.memory.buffer),
    });
  } catch (error) {
    self.postMessage({ kind: "shared-error", error: String(error) });
  }
};
