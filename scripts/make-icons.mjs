// Renders app/icon.svg onto the app background as the PWA icons (run once; the PNGs are committed).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "file:///C:/Dev/node_modules/playwright/index.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = fs.readFileSync(path.join(root, "app", "icon.svg"), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route("**/*", (r) => r.abort());
for (const [size, file] of [[192, "icon-192.png"], [512, "icon-512.png"], [180, "icon-180.png"]]) {
  const inner = Math.round(size * 0.62);
  const sized = svg.replace(/<svg([^>]*)>/, (m, attrs) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, "")} width="${inner}" height="${inner}">`);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#05050a;display:grid;place-items:center;width:${size}px;height:${size}px">${sized}</body></html>`);
  await page.screenshot({ path: path.join(root, "public", file) });
}
await browser.close();
console.log("icons written");
