import fs from "node:fs";

const esc = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const text = (x, y, value, size = 20, fill = "#24334b", weight = 400) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}">${esc(value)}</text>`;
const rect = (x, y, w, h, fill, stroke = "none", r = 14) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const cards = [
  {
    title: "Chrome / Edge",
    tag: "Default Wasm",
    color: "#16724b",
    tint: "#e5f5ed",
    lines: [
      "Covered grid/chart pages render",
      "Chrome chart: about 2×",
      "frame-start throughput",
    ],
    footer: "Chrome 157 · macOS + Linux",
  },
  {
    title: "Firefox 159.0.1",
    tag: "Explicit opt-in",
    color: "#985413",
    tint: "#fff0dc",
    lines: [
      "Wasm renders; default is JS",
      "Bitmap copy remains costly",
      "Hybrid candidate: +27–28%",
    ],
    footer: "Mozilla 1788206 · Flutter 145420",
  },
  {
    title: "Safari 27.2 · macOS",
    tag: "Explicit opt-in",
    color: "#2059a5",
    tint: "#e8f0ff",
    lines: [
      "Wasm renders; default is JS",
      "require-corp → shared memory",
      "credentialless → not isolated",
    ],
    footer: "WebKit 230550 · Flutter 178893",
  },
];
const steps = [
  {
    title: "Prove the capability",
    lines: [
      "Check actual headers, worker",
      "execution and a shared",
      "Wasm-memory round trip.",
    ],
    status: "Done: four-policy probe",
    color: "#16724b",
    tint: "#e5f5ed",
  },
  {
    title: "Close the test gap",
    lines: [
      "Non-isolated Firefox engine",
      "lane exercises the two",
      "worker-mode test skips.",
    ],
    status: "54 passed · 0 skipped",
    color: "#16724b",
    tint: "#e5f5ed",
  },
  {
    title: "Review the evidence",
    lines: [
      "Mozilla: release + Nightly.",
      "Flutter: candidate A/B and",
      "reduced transition cases.",
    ],
    status: "Drafts + test patch ready",
    color: "#2059a5",
    tint: "#e8f0ff",
  },
  {
    title: "Contribute, then recheck",
    lines: [
      "Human review → focused",
      "comment/patch → released",
      "fixes → rollout checks.",
    ],
    status: "Next: nothing posted",
    color: "#985413",
    tint: "#fff0dc",
  },
];
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1120" viewBox="0 0 1280 1120" role="img" aria-labelledby="title desc">
<title id="title">Flutter web Wasm: browser status and contribution steps</title>
<desc id="desc">Desktop checks dated 2026-11-06. Chrome and Edge use Wasm by default. Firefox and Safari render with explicit opt-in but default to JavaScript. Firefox bitmap transfer remains costly. Safari requires the working isolation policy for shared memory. A standalone worker probe and a 54-pass single-thread Firefox engine lane on both Firefox 148 and 159 strengthen the evidence before human-reviewed upstream contributions. No upstream submissions have been made.</desc>
<g font-family="Arial, Helvetica, sans-serif">
${rect(0, 0, 1280, 1120, "#f4f7fb", "none", 0)}
${rect(0, 0, 1280, 190, "#12233e", "none", 0)}
${text(40, 65, "Flutter web + Wasm", 42, "#ffffff", 700)}
${text(40, 107, "Current browser status and the contribution path", 25, "#d4e2f5")}
${text(40, 151, "Desktop evidence · 2026-11-06", 18, "#9eb8db")}
${rect(40, 214, 1200, 92, "#fff5df", "#e4c789")}
${rect(40, 214, 7, 92, "#c88a22", "none", 0)}
${text(64, 243, "RECOMMENDATION", 15, "#865712", 700)}
${text(64, 279, "Defer an all-browser switch; support the upstream work.", 27, "#352b18", 700)}
${text(40, 341, "Rendering gains are real. Developer startup / hot-reload gains were not established.", 21, "#475569")}`;
for (const [i, card] of cards.entries()) {
  const x = 40 + i * 408;
  svg += rect(x, 369, 384, 294, "#ffffff", "#ccd8e7");
  svg += text(x + 24, 412, card.title, 26, "#12233e", 700);
  svg +=
    rect(x + 24, 431, 166, 30, card.tint, "none", 15) +
    text(x + 38, 452, card.tag, 17, card.color, 700);
  for (const [line, value] of card.lines.entries())
    svg += text(x + 24, 504 + line * 34, value, 20);
  svg += `<line x1="${x + 24}" y1="606" x2="${x + 360}" y2="606" stroke="#e2e8f0"/>`;
  svg += text(x + 24, 636, card.footer, 16, "#52647d");
}
svg += text(40, 719, "The next steps", 29, "#12233e", 700);
for (const [i, step] of steps.entries()) {
  const x = 40 + i * 306;
  svg += rect(x, 746, 282, 249, "#ffffff", "#ccd8e7");
  svg +=
    `<circle cx="${x + 28}" cy="778" r="15" fill="#e6edf8"/>` +
    text(x + 23, 784, i + 1, 17, "#2059a5", 700);
  svg += text(x + 18, 823, step.title, i === 3 ? 19 : 21, "#12233e", 700);
  for (const [line, value] of step.lines.entries())
    svg += text(x + 18, 864 + line * 28, value, 17);
  svg +=
    rect(x + 16, 953, 250, 28, step.tint, "none", 14) +
    text(x + 28, 973, step.status, 16, step.color, 700);
  if (i < 3)
    svg += `<path d="M ${x + 287} 876 H ${x + 299} M ${x + 294} 871 L ${x + 299} 876 L ${x + 294} 881" fill="none" stroke="#8aa1c0" stroke-width="2"/>`;
}
svg += text(
  40,
  1033,
  "Rates are Flutter frame starts, not displayed FPS. Hybrid gains cover two vendor Firefox worker cases.",
  17,
  "#52647d",
);
svg += text(
  40,
  1061,
  "Desktop fixtures only; physical mobile, cold startup and every-refresh presentation remain unqualified.",
  17,
  "#52647d",
);
svg += text(
  40,
  1095,
  "Full evidence, raw data and unposted drafts: github.com/cdeil/flutter-wasm-check",
  16,
  "#52647d",
);
svg += "</g></svg>\n";
fs.mkdirSync("docs/assets", { recursive: true });
fs.writeFileSync("docs/assets/wasm-status.svg", svg);
