import fs from "node:fs";
import { chromium } from "playwright";

const results = [];
for (const headless of [true, false]) {
  const browser = await chromium.launch({
    headless,
    ...(process.env.BROWSER_PATH
      ? { executablePath: process.env.BROWSER_PATH }
      : {}),
  });
  try {
    const page = await browser.newPage();
    const graphics = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) return { available: false };
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        available: true,
        renderer: gl.getParameter(gl.RENDERER),
        vendor: gl.getParameter(gl.VENDOR),
        unmaskedRenderer: debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : null,
        unmaskedVendor: debug
          ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)
          : null,
      };
    });
    results.push({ version: browser.version(), headless, graphics });
  } finally {
    await browser.close();
  }
}
fs.writeFileSync(
  process.env.OUT || "output/graphics.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
