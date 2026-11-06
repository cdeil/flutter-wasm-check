import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const port = Number(process.argv[2] || 8787);
const screenshotGates = new Map();
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".png": "image/png",
};
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const coep =
      url.searchParams.get("coep") || process.env.COEP || "require-corp";
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", coep);
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Cache-Control", "no-store");
    if (url.pathname === "/screenshot-gate") {
      const key = url.searchParams.get("label");
      const timer = setTimeout(() => {
        screenshotGates.delete(key);
        res.writeHead(408).end("No completed result");
      }, 45000);
      screenshotGates.set(key, () => {
        clearTimeout(timer);
        res.setHeader("Content-Type", "image/gif");
        res.end(
          Buffer.from(
            "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
            "base64",
          ),
        );
      });
      res.on("close", () => {
        clearTimeout(timer);
        screenshotGates.delete(key);
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/result") {
      const parts = [];
      for await (const part of req) parts.push(part);
      const body = Buffer.concat(parts);
      if (body.length > 10_000_000) {
        res.writeHead(413).end();
        return;
      }
      const record = JSON.parse(body.toString());
      fs.mkdirSync(path.join(root, "output"), { recursive: true });
      fs.appendFileSync(
        path.join(root, "output", "native.jsonl"),
        JSON.stringify(record) + "\n",
      );
      screenshotGates.get(record.label)?.();
      screenshotGates.delete(record.label);
      res.end("saved");
      return;
    }
    const pathname =
      url.pathname === "/" ? "/release/index.html" : url.pathname;
    const relative = decodeURIComponent(pathname).replace(
      /^\/(final-profile|final-release|profile|release|reference|candidate|minimal-candidate|minimal-stable)\//,
      "/build/$1/",
    );
    let file = path.resolve(root, "." + relative);
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.setHeader(
      "Content-Type",
      mime[path.extname(file)] || "application/octet-stream",
    );
    if (
      path.extname(file) === ".html" &&
      path.basename(file) === "index.html"
    ) {
      const prefix =
        pathname.match(
          /^\/(final-profile|final-release|profile|release|reference|candidate|minimal-candidate|minimal-stable)\//,
        )?.[1] || "release";
      let html = fs
        .readFileSync(file, "utf8")
        .replace(/<base href="[^"]*">/, `<base href="/${prefix}/">`);
      if (url.searchParams.get("gate") === "1")
        html = html.replace(
          "</body>",
          `<img alt="" style="display:none" src="/screenshot-gate?label=${encodeURIComponent(url.searchParams.get("label") || "native")}"></body>`,
        );
      res.end(html);
      return;
    }
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`http://localhost:${port}/release/`),
  );
