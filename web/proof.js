window.checkErrors = [];
window.checkWorkers = [];
window.checkCanvasTransfers = 0;
const transferredCanvases = new WeakSet();
const nativeTransfer = HTMLCanvasElement.prototype.transferControlToOffscreen;
HTMLCanvasElement.prototype.transferControlToOffscreen = function (...args) {
  const result = nativeTransfer.apply(this, args);
  checkCanvasTransfers++;
  transferredCanvases.add(this);
  return result;
};
const NativeWorker = window.Worker;
window.Worker = class extends NativeWorker {
  constructor(url, options) {
    super(url, options);
    checkWorkers.push({ url: String(url), name: options?.name || null });
  }
};
addEventListener("error", (event) =>
  checkErrors.push(String(event.error || event.message)),
);
addEventListener("unhandledrejection", (event) =>
  checkErrors.push(String(event.reason)),
);
window.runtimeProof = () => {
  const resources = performance
    .getEntriesByType("resource")
    .map((r) => new URL(r.name).pathname);
  const state = window.checkState ? JSON.parse(checkState()) : null;
  return {
    userAgent: navigator.userAgent,
    isolated: crossOriginIsolated,
    state,
    errors: checkErrors,
    resources: resources.filter((r) => /main\.dart|skwasm|canvaskit/.test(r)),
    workers: checkWorkers,
    onscreenTransfers: checkCanvasTransfers,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    canvases: (function find(root) {
      return [
        ...root.querySelectorAll("canvas"),
        ...[...root.querySelectorAll("*")]
          .filter((e) => e.shadowRoot)
          .flatMap((e) => find(e.shadowRoot)),
      ];
    })(document).map((c) => ({
      width: c.width,
      height: c.height,
      cssWidth: c.clientWidth,
      cssHeight: c.clientHeight,
      transferred: transferredCanvases.has(c),
      visibility: getComputedStyle(c).visibility,
      parent: c.parentElement?.tagName,
    })),
  };
};
setInterval(() => {
  const p = runtimeProof();
  const renderer =
    p.resources
      .find((r) => /(?:skwasm|canvaskit).*\.wasm$/.test(r))
      ?.split("/")
      .pop() || "?";
  document.querySelector("#proof").textContent =
    `${p.state?.wasm ? "Dart Wasm" : p.state ? "Dart JS" : "Loading"} | ${renderer} | isolated=${p.isolated} | errors=${p.errors.length}`;
}, 1000);

async function nativeMeasure() {
  while (!window.checkState) await new Promise((r) => setTimeout(r, 100));
  await new Promise((r) => setTimeout(r, 2000));
  const records = [];
  for (let rep = 0; rep < 3; rep++) {
    const page = JSON.parse(checkState()).page;
    await checkCommand("start");
    const startUs = performance.now() * 1000;
    await checkCommand(
      page.endsWith("grid")
        ? "scroll"
        : page === "composition"
          ? "compose"
          : "animate",
    );
    const endUs = performance.now() * 1000;
    await new Promise((r) => setTimeout(r, 150));
    await checkCommand("update");
    await new Promise((r) => setTimeout(r, 350));
    await checkCommand("stop");
    const rawFrames = JSON.parse(checkFrames());
    records.push({
      rep,
      page,
      mode: new URLSearchParams(location.search).get("mode") || "default",
      window: { startUs, endUs },
      rawFrames,
      frames: rawFrames.filter(
        (f) => f.startUs >= startUs && f.startUs <= endUs,
      ),
      proof: runtimeProof(),
    });
  }
  const result = {
    label: new URLSearchParams(location.search).get("label") || "native",
    records,
  };
  await fetch("/result", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });
  const box = document.createElement("pre");
  box.id = "native-result";
  box.style.cssText =
    "position:fixed;z-index:2147483646;top:50px;right:12px;background:#101828;color:white;padding:12px;max-width:45vw;white-space:pre-wrap;font:12px monospace";
  box.textContent =
    `Saved 3 runs: ${result.label}\n` +
    JSON.stringify(
      records.map((r) => ({
        page: r.page,
        frames: r.frames.length,
        wasm: r.proof.state.wasm,
        errors: r.proof.errors,
      })),
      null,
      1,
    );
  document.body.append(box);
}
if (new URLSearchParams(location.search).get("measure") === "1")
  nativeMeasure().catch((e) => checkErrors.push(String(e)));
if (new URLSearchParams(location.search).get("proof") === "1")
  (async () => {
    while (!window.checkState) await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 1000));
    await fetch("/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: new URLSearchParams(location.search).get("label"),
        proof: runtimeProof(),
      }),
    });
  })();
