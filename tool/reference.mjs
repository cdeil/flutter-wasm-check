import fs from "node:fs";
import { chromium, firefox } from "playwright";

const name = process.argv[2] || "chrome";
const type = name.includes("firefox") ? firefox : chromium;
const out = process.env.OUT || `output/${name}-reference.json`;
const records = [];
let version;

for (let rep = 0; rep < Number(process.env.REPEAT || 3); rep++) {
  for (const mode of (process.env.MODES || "js,wasm,st").split(",")) {
    // The continuously animating demo gets a fresh browser process per sample.
    const server = await type.launchServer({
      headless: process.env.HEADED !== "1",
      ...(process.env.BROWSER_PATH
        ? { executablePath: process.env.BROWSER_PATH }
        : {}),
    });
    const browser = await type.connect(server.wsEndpoint());
    version = browser.version();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    const resources = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      const url = new URL(r.url());
      if (/main\.dart|skwasm|canvaskit/.test(url.pathname))
        resources.push({ path: url.pathname, status: r.status() });
    });
    let stage = "load";
    let timer;
    try {
      const sample = async () => {
        await page.goto(
          `${process.env.BASE_URL || "http://localhost:8787/reference/"}?mode=${mode === "st" ? "wasm" : mode}&optin=true&st=${mode === "st" ? 1 : 0}&stress=manual&nodes=200&hz=60`,
        );
        stage = "first metrics";
        await page.waitForFunction(
          () =>
            window._lastFrameMetrics?.buildTimeMs > 0 && window.referenceRecord,
        );
        stage = "warmup";
        await page.waitForTimeout(10000);
        stage = "record start";
        const startUs = await page.evaluate(() => {
          referenceRecord(true);
          return performance.now() * 1000;
        });
        stage = "recording";
        await page.waitForTimeout(6000);
        const endUs = await page.evaluate(() => performance.now() * 1000);
        await page.waitForTimeout(500);
        stage = "read timings";
        await page.evaluate(() => referenceRecord(false));
        const result = await page.evaluate(() => ({
          wasm: referenceWasm,
          rawFrames: JSON.parse(referenceFrames()),
          hud: window._lastFrameMetrics,
          isolated: crossOriginIsolated,
        }));
        const frames = result.rawFrames.filter(
          (f) => f.startUs >= startUs && f.startUs <= endUs,
        );
        if (result.wasm !== (mode !== "js")) throw Error("Wrong compiler");
        if (errors.length) throw Error(errors.join("; "));
        if (frames.length < 3) throw Error("No usable frame-timing samples");
        stage = "screenshot";
        if (rep === 0)
          await page.screenshot({
            path: out.replace(/\.json$/, `-${mode}.png`),
            timeout: 5000,
          });
        return {
          rep,
          mode,
          passed: true,
          errors,
          resources,
          ...result,
          frames,
          window: { startUs, endUs },
        };
      };
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(Error(`Case timed out at ${stage}`)),
          55000,
        );
      });
      records.push(await Promise.race([sample(), deadline]));
    } catch (error) {
      records.push({
        rep,
        mode,
        passed: false,
        error: error.message,
        stage,
        errors,
        resources,
      });
      process.exitCode = 1;
      await page
        .screenshot({
          path: out.replace(/\.json$/, `-${rep}-${mode}-failure.png`),
          timeout: 3000,
        })
        .catch(() => {});
    } finally {
      clearTimeout(timer);
      await server.kill();
    }
    console.log(
      JSON.stringify({
        rep,
        mode,
        passed: records.at(-1).passed,
        stage,
        frames: records.at(-1).frames?.length,
      }),
    );
    fs.writeFileSync(
      out,
      JSON.stringify(
        {
          browser: name,
          version,
          headless: process.env.HEADED !== "1",
          freshBrowserPerCase: true,
          nodes: 200,
          profile: true,
          viewport: { width: 1440, height: 900 },
          dpr: 1,
          records,
        },
        null,
        2,
      ),
    );
  }
}
