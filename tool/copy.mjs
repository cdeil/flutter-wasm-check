import fs from "node:fs";
import { chromium, firefox } from "playwright";
const name = process.argv[2] || "chrome";
const browser = await (name.includes("firefox") ? firefox : chromium).launch({
  headless: true,
  ...(process.env.BROWSER_PATH
    ? { executablePath: process.env.BROWSER_PATH }
    : {}),
});
const out = process.env.OUT || `output/${name}-copy.json`;
const results = [];
try {
  for (let rep = 0; rep < 3; rep++) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    await page.goto(
      `${process.env.BASE_URL || "http://localhost:8787"}/web/copy-probe.html`,
    );
    await page.waitForFunction(() => window.copyResult, undefined, {
      timeout: 120000,
    });
    const result = await page.evaluate(() => copyResult);
    results.push({ rep, ...result });
    fs.writeFileSync(
      out,
      JSON.stringify(
        { browser: name, version: browser.version(), results },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        rep,
        results: result.results.map(({ samples, ...r }) => r),
      }),
    );
    if (rep === 0)
      await page.screenshot({
        path: out.replace(/\.json$/, ".png"),
        fullPage: true,
      });
    await page.close();
  }
} finally {
  await browser.close();
}
