import fs from "node:fs";
import { chromium, firefox } from "playwright";
const name = process.argv[2] || "firefox";
const browser = await (name.includes("firefox") ? firefox : chromium).launch({
  headless: true,
  ...(process.env.BROWSER_PATH
    ? { executablePath: process.env.BROWSER_PATH }
    : {}),
});
const records = [];
const out = process.env.OUT || `output/${name}-composition.json`;
try {
  for (const hybrid of [0, 1])
    for (const mode of ["wasm", "st"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      try {
        await page.goto(
          `${process.env.BASE_URL || "http://localhost:8787/candidate/"}?page=composition&mode=${mode}&hybrid=${hybrid}`,
        );
        await page.waitForFunction(() => window.checkState);
        await page.evaluate(() =>
          document.querySelector("flt-semantics-placeholder")?.click(),
        );
        await page
          .getByRole("button", { name: "Toggle iframe", exact: true })
          .waitFor();
        await page.waitForTimeout(1500);
        const before = await page.screenshot();
        const transitions = [];
        for (let rep = 0; rep < 3; rep++) {
          await page
            .getByRole("button", { name: "Toggle iframe", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Toggle overlay", exact: true })
            .click();
          await page.waitForTimeout(700);
          const proof = await page.evaluate(() => runtimeProof());
          await page
            .getByRole("button", { name: "Test overlay action", exact: true })
            .click();
          await page.waitForFunction(
            () =>
              JSON.parse(checkState()).selected === "Overlay action clicked",
          );
          await page.screenshot({
            path: out.replace(/\.json$/, `-${hybrid}-${mode}-layers.png`),
          });
          // Also verify the actual embedded document remains interactive.
          await page
            .getByRole("button", { name: "Toggle overlay", exact: true })
            .click();
          const frame = page.frameLocator(
            'iframe[title="Local same-origin platform-view probe"]',
          );
          await frame
            .getByRole("textbox", { name: "Native text", exact: true })
            .click();
          await frame
            .getByRole("textbox", { name: "Native text", exact: true })
            .fill("Native input works");
          await page
            .getByRole("button", { name: "Toggle iframe", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Resize scene", exact: true })
            .click();
          await page.waitForTimeout(300);
          await page
            .getByRole("button", { name: "Resize scene", exact: true })
            .click();
          await page.waitForTimeout(700);
          // Selection text changes deliberately; compare just the plot pixels.
          const clip = { x: 16, y: 180, width: 1000, height: 500 };
          const plot = await page.screenshot({ clip });
          if (rep === 0)
            fs.writeFileSync(
              out.replace(/\.json$/, `-${hybrid}-${mode}-restored.png`),
              plot,
            );
          transitions.push({
            rep,
            proof,
            restoredProof: await page.evaluate(() => runtimeProof()),
            plot,
          });
        }
        const same = transitions.every((t) =>
          t.plot.equals(transitions[0].plot),
        );
        if (!same)
          throw Error(
            "Restored plot pixels differ across identical round trips",
          );
        const proof = await page.evaluate(() => runtimeProof());
        if (proof.errors.length) throw Error(proof.errors.join("; "));
        records.push({
          hybrid,
          mode,
          passed: true,
          roundTrips: 3,
          identicalRestoredPlot: same,
          beforeBytes: before.length,
          transitions: transitions.map(({ plot, ...r }) => r),
        });
      } catch (error) {
        records.push({
          hybrid,
          mode,
          passed: false,
          error: error.message,
          proof: await page.evaluate(() => window.runtimeProof?.()),
        });
        process.exitCode = 1;
      }
      fs.writeFileSync(
        out,
        JSON.stringify(
          { browser: name, version: browser.version(), records },
          null,
          2,
        ),
      );
      console.log(
        records.at(-1).passed,
        hybrid,
        mode,
        records.at(-1).error || "",
      );
      await context.close();
    }
} finally {
  await browser.close();
}
