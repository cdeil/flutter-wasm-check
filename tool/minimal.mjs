import fs from "node:fs";
import { chromium, firefox } from "playwright";
import { PNG } from "pngjs";
const name = process.argv[2] || "firefox";
const browser = await (name.includes("firefox") ? firefox : chromium).launch({
  headless: true,
  ...(process.env.BROWSER_PATH
    ? { executablePath: process.env.BROWSER_PATH }
    : {}),
});
const out = process.env.OUT || `output/${name}-minimal.json`;
const records = [];
const decode = (image, x, y) => {
  let frame = 0;
  for (let bit = 0; bit < 8; bit++) {
    let i = ((y + 24) * image.width + x + 24 + bit * 16) * 4;
    let rgb = [image.data[i], image.data[i + 1], image.data[i + 2]];
    if (rgb.every((v) => v < 20)) frame |= 1 << bit;
    else if (!rgb.every((v) => v > 235))
      throw Error(`Unexpected marker color ${rgb}`);
  }
  return frame;
};
try {
  for (const hybrid of [0, 1])
    for (const mode of ["wasm", "st"]) {
      const context = await browser.newContext({
        viewport: { width: 1000, height: 700 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      try {
        await page.goto(
          `${process.env.BASE_URL || "http://localhost:8787/minimal-candidate/"}?mode=${mode}&hybrid=${hybrid}`,
        );
        await page.waitForFunction(() => window.minimalStep);
        await page.waitForTimeout(1500);
        const steps = [];
        for (let n = 1; n <= 36; n++) {
          const embedded = n % 3 !== 0;
          const small = n % 4 < 2;
          await page.setViewportSize({
            width: small ? 960 : 1000,
            height: small ? 660 : 700,
          });
          const state = JSON.parse(
            await page.evaluate((input) => minimalStep(JSON.stringify(input)), {
              frame: n,
              embedded,
              small,
            }),
          );
          if (!state.wasm) throw Error("Expected Dart Wasm");
          await page.evaluate(
            () =>
              new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
              ),
          );
          let png, background, overlay, passed;
          const attempts = [];
          const start = Date.now();
          do {
            png = await page.screenshot();
            const image = PNG.sync.read(png);
            background = decode(image, 0, 0);
            overlay = embedded ? decode(image, 200, 180) : null;
            passed = background === n && (!embedded || overlay === n);
            attempts.push({
              elapsedMs: Date.now() - start,
              background,
              overlay,
            });
            if (passed) break;
            if (attempts.length === 1)
              fs.writeFileSync(
                out.replace(/\.json$/, `-${hybrid}-${mode}-${n}-first.png`),
                png,
              );
            await page.waitForTimeout(50);
          } while (Date.now() - start < 2000);
          steps.push({
            n,
            embedded,
            small,
            background,
            overlay,
            passed,
            attempts,
            state,
            proof: await page.evaluate(() => runtimeProof()),
          });
          if (!passed || n === 2 || n === 36)
            fs.writeFileSync(
              out.replace(/\.json$/, `-${hybrid}-${mode}-${n}.png`),
              png,
            );
        }
        records.push({
          hybrid,
          mode,
          passed: steps.every((s) => s.passed),
          steps,
        });
        if (!records.at(-1).passed) process.exitCode = 1;
      } catch (error) {
        records.push({ hybrid, mode, passed: false, error: error.message });
        process.exitCode = 1;
      }
      fs.writeFileSync(
        out,
        JSON.stringify(
          {
            browser: name,
            version: browser.version(),
            note: "PNG pixel markers first sampled after requested state + two rAFs; poll at 50 ms until convergence or 2 s. This is not an every-refresh physical-display recording.",
            records,
          },
          null,
          2,
        ),
      );
      console.log(
        JSON.stringify({
          hybrid,
          mode,
          passed: records.at(-1).passed,
          error: records.at(-1).error,
        }),
      );
      await context.close();
    }
} finally {
  await browser.close();
}
