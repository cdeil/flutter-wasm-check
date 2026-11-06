import fs from "node:fs";
import path from "node:path";
import { chromium, firefox } from "playwright";
const name = process.argv[2] || "chromium";
const browser = await (name.includes("firefox") ? firefox : chromium).launch({
  headless: process.env.HEADED !== "1",
  ...(process.env.BROWSER_PATH
    ? { executablePath: process.env.BROWSER_PATH }
    : {}),
});
const base = process.env.BASE_URL || "http://localhost:8787/profile/";
const out = process.env.OUT || `output/${name}.json`;
fs.mkdirSync(path.dirname(out), { recursive: true });
const records = [];
function save(record) {
  records.push(record);
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        browser: name,
        version: browser.version(),
        base,
        viewport: { width: 1440, height: 900 },
        dpr: 1,
        headless: process.env.HEADED !== "1",
        records,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      browser: name,
      ...record,
      frames: undefined,
      rawFrames: undefined,
      proof: undefined,
    }),
  );
}
try {
  for (const pageName of (
    process.env.PAGES ||
    "trina-grid,sync-grid,fl-chart,sync-chart,graphic,composition"
  ).split(",")) {
    for (let rep = 0; rep < Number(process.env.REPEAT || 3); rep++)
      for (const mode of (process.env.MODES || "js,wasm,st").split(",")) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        try {
          await page.goto(
            `${base}?page=${pageName}&mode=${mode}${process.env.EXTRA_QUERY || ""}`,
          );
          if (process.env.HEADED === "1") await page.bringToFront();
          await page.waitForFunction(
            () => window.checkState && JSON.parse(checkState()).page,
            { timeout: 60000 },
          );
          await page.waitForTimeout(2000);
          const documentState = await page.evaluate(() => ({
            visibility: document.visibilityState,
            focused: document.hasFocus(),
          }));
          if (documentState.visibility !== "visible")
            throw Error("Document is hidden");
          const before = await page.evaluate(() => runtimeProof());
          const expectedWasm =
            mode === "default"
              ? !name.includes("firefox")
              : ["wasm", "st"].includes(mode);
          if (before.state.wasm !== expectedWasm)
            throw Error("Compiler did not match requested mode");
          if (before.errors.length) throw Error(before.errors.join("; "));
          await page.evaluate(() => checkCommand("update"));
          const action = pageName.endsWith("grid")
            ? "scroll"
            : pageName === "composition"
              ? "compose"
              : "animate";
          const window = await page.evaluate(async (action) => {
            await checkCommand("start");
            const startUs = performance.now() * 1000;
            await Promise.race([
              checkCommand(action),
              new Promise((_, reject) =>
                setTimeout(() => reject(Error("Timed action stalled")), 20000),
              ),
            ]);
            return { startUs, endUs: performance.now() * 1000 };
          }, action);
          // Timings are batched. A later neutral update flushes the final batch;
          // its frame and any queued startup frames are outside this window.
          await page.waitForTimeout(150);
          await page.evaluate(() => checkCommand("update"));
          await page.waitForTimeout(350);
          await page.evaluate(() => checkCommand("stop"));
          const rawFrames = await page.evaluate(() =>
            JSON.parse(checkFrames()),
          );
          const frames = rawFrames.filter(
            (f) => f.startUs >= window.startUs && f.startUs <= window.endUs,
          );
          const proof = await page.evaluate(() => runtimeProof());
          if (frames.length < 3)
            throw Error(`Only ${frames.length} frame timings`);
          if (proof.errors.length) throw Error(proof.errors.join("; "));
          const screenshot =
            rep === 0
              ? `${path.basename(out, ".json")}-${pageName}-${mode}.png`
              : null;
          if (screenshot)
            await page.screenshot({
              path: path.join(path.dirname(out), screenshot),
            });
          save({
            page: pageName,
            mode,
            rep,
            passed: true,
            action,
            window,
            frames,
            rawFrames,
            proof,
            screenshot,
            documentState,
            extraQuery: process.env.EXTRA_QUERY || "",
          });
        } catch (error) {
          save({
            page: pageName,
            mode,
            rep,
            passed: false,
            error: error.message,
          });
          process.exitCode = 1;
        } finally {
          await context.close();
        }
      }
  }
} finally {
  await browser.close();
}
