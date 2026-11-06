import fs from "node:fs";
import path from "node:path";
const dir = process.argv[2] || "results/2026-11-06";
const median = (a) => [...a].sort((a, b) => a - b)[Math.floor(a.length / 2)];
const mean = (a) => a.reduce((a, b) => a + b, 0) / a.length;
export function metrics(frames) {
  const intervals = frames
    .slice(1)
    .map((f, i) => (f.startUs - frames[i].startUs) / 1000);
  const positive = intervals.filter((x) => x > 0);
  const avg = positive.length ? mean(positive) : 0;
  return {
    frames: frames.length,
    nonpositiveIntervals: intervals.length - positive.length,
    fps: avg ? 1000 / avg : 0,
    buildMs: mean(frames.map((f) => f.buildUs)) / 1000,
    rasterMs: mean(frames.map((f) => f.rasterUs)) / 1000,
    spanMs: mean(frames.map((f) => f.spanUs)) / 1000,
    intervalJitterMs:
      positive.length > 1
        ? Math.sqrt(
            positive.reduce((s, x) => s + (x - avg) ** 2, 0) /
              (positive.length - 1),
          )
        : 0,
  };
}
const summaries = [];
if (fs.existsSync(dir))
  for (const name of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const doc = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
    if (!doc.records) continue;
    const groups = new Map();
    for (const r of doc.records) {
      if (!r.passed || !r.frames || r.frames.length < 3) continue;
      const key = `${r.page || "reference-200"}|${r.mode}|${r.extraQuery || ""}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(metrics(r.frames));
    }
    for (const [key, runs] of groups)
      summaries.push({
        file: name,
        browser: doc.browser,
        version: doc.version,
        key,
        runs: runs.length,
        ...Object.fromEntries(
          ["fps", "buildMs", "rasterMs", "spanMs", "intervalJitterMs"].map(
            (k) => [k, Number(median(runs.map((r) => r[k])).toFixed(3))],
          ),
        ),
      });
  }
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, "summary.json"),
  JSON.stringify(summaries, null, 2),
);
console.log(
  summaries
    .map(
      (r) =>
        `${r.file} | ${r.key} | ${r.runs} | ${r.fps} | ${r.buildMs} | ${r.rasterMs} | ${r.spanMs} | ${r.intervalJitterMs}`,
    )
    .join("\n"),
);
