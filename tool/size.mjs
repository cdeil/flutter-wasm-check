import fs from "node:fs";
import zlib from "node:zlib";
const dir = process.argv[2] || "build/release";
function bytes(file) {
  const b = fs.readFileSync(`${dir}/${file}`);
  return {
    file,
    raw: b.length,
    gzip: zlib.gzipSync(b, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(b, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}
const runtimes = {
  js: ["main.dart.js", "canvaskit/canvaskit.js", "canvaskit/canvaskit.wasm"],
  jsChromium: [
    "main.dart.js",
    "canvaskit/chromium/canvaskit.js",
    "canvaskit/chromium/canvaskit.wasm",
  ],
  wasm: [
    "main.dart.mjs",
    "main.dart.wasm",
    "canvaskit/skwasm.js",
    "canvaskit/skwasm.wasm",
  ],
  wasmHeavy: [
    "main.dart.mjs",
    "main.dart.wasm",
    "canvaskit/skwasm_heavy.js",
    "canvaskit/skwasm_heavy.wasm",
  ],
};
const result = {
  note: "Core runtime + app artifacts only. Shared fonts/assets/bootstrap excluded equally; optional browser-specific variants and fallback not downloaded twice. Brotli quality 11, gzip 9; byte counts do not measure latency.",
  runtimes: {},
};
for (const [name, files] of Object.entries(runtimes)) {
  const artifacts = files.map(bytes);
  result.runtimes[name] = {
    artifacts,
    ...Object.fromEntries(
      ["raw", "gzip", "brotli"].map((k) => [
        k,
        artifacts.reduce((s, a) => s + a[k], 0),
      ]),
    ),
  };
}
console.log(JSON.stringify(result, null, 2));
