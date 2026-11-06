import fs from "node:fs";
import path from "node:path";
import { chromium, firefox } from "playwright";
import { assertIsolation } from "./isolation-contract.mjs";
const name = process.argv[2] || "chromium";
const out = process.env.OUT || `output/${name}-isolation.json`;
fs.mkdirSync(path.dirname(out), { recursive: true });
const browser = await (name.includes("firefox") ? firefox : chromium).launch({
  headless: process.env.HEADED !== "1",
  ...(process.env.BROWSER_PATH
    ? { executablePath: process.env.BROWSER_PATH }
    : {}),
});
const policies = [
  { name: "none", coop: "none", coep: "none" },
  { name: "coop-only", coop: "same-origin", coep: "none" },
  { name: "require-corp", coop: "same-origin", coep: "require-corp" },
  { name: "credentialless", coop: "same-origin", coep: "credentialless" },
];
const records = [];
try {
  for (const policy of policies)
    for (let rep = 0; rep < Number(process.env.REPEAT || 3); rep++) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      try {
        const url = new URL(
          "/web/isolation-probe.html",
          process.env.BASE_URL || "http://localhost:8791",
        );
        url.searchParams.set("coop", policy.coop);
        url.searchParams.set("coep", policy.coep);
        await page.goto(url.href);
        await page.waitForFunction(() => window.isolationResult, undefined, {
          timeout: 30000,
        });
        const result = await page.evaluate(() => isolationResult);
        if (errors.length) throw Error(errors.join("; "));
        assertIsolation(result, policy);
        if (rep === 0)
          await page.screenshot({
            path: out.replace(/\.json$/, `-${policy.name}.png`),
            fullPage: true,
          });
        records.push({ policy, rep, passed: true, result, errors });
      } catch (error) {
        records.push({
          policy,
          rep,
          passed: false,
          error: error.message,
          errors,
          result: await page.evaluate(() => window.isolationResult),
        });
        process.exitCode = 1;
      }
      await context.close();
      fs.writeFileSync(
        out,
        JSON.stringify(
          {
            browser: name,
            version: browser.version(),
            headless: process.env.HEADED !== "1",
            records,
          },
          null,
          2,
        ),
      );
      console.log(
        policy.name,
        rep,
        records.at(-1).passed,
        records.at(-1).error || "",
      );
    }
} finally {
  await browser.close();
}
