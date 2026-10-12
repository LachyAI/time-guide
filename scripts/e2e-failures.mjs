// Failure paths of the live screen, against `next dev` on :3000 with voice-brain faked by Playwright: no Deepgram,
// no Claude, localhost only. Start the app with APP_PASSWORD=e2e-pin NEXT_PUBLIC_VOICE_BRAIN_URL=http://127.0.0.1:8095.
import { chromium } from "file:///C:/Dev/node_modules/playwright/index.mjs";

const PIN = process.env.APP_PASSWORD || "e2e-pin";
const CORS = { "access-control-allow-origin": "http://localhost:3000", "access-control-allow-headers": "Authorization, Content-Type", "access-control-allow-methods": "GET, PUT, OPTIONS" };
const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
let failed = 0;

async function scenario(name, { onSocket, act, expect, timeoutMs }) {
  const ctx = await browser.newContext({ permissions: ["microphone"] });
  // Keep a handle on the mic stream so a scenario can end its track the way iOS does in the background.
  await ctx.addInitScript(() => {
    const md = navigator.mediaDevices;
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = async (c) => { const s = await orig(c); window.__mic = s; return s; };
  });
  await ctx.route("**/*", (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (u.port === "8095" && req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (u.port === "8095" && u.pathname === "/v1/agents") return route.fulfill({ status: 200, headers: CORS, json: { "stoic-advisor": { engine: "live", voice: "aura-2-zeus-en", display: "Stoic Advisor" } } });
    return ["localhost", "127.0.0.1"].includes(u.hostname) ? route.continue() : route.abort();
  });
  await ctx.routeWebSocket(/\/v1\/live/, onSocket);
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/");
  await page.fill("input[type=password]", PIN);
  await page.click(".password-submit");
  await page.getByText("Stoic Advisor", { exact: true }).first().click();
  await page.click(".mic-button");
  if (act) await act(page);
  const status = page.locator(".session-status");
  try {
    await status.filter({ hasText: expect }).waitFor({ timeout: timeoutMs });
    console.log(`PASS ${name}: "${(await status.textContent()).trim()}"`);
  } catch {
    failed++;
    console.log(`FAIL ${name}: wanted "${expect}", screen says "${(await status.textContent())?.trim()}"`);
  }
  await ctx.close();
}

await scenario("listening never answers", {
  onSocket: () => {},
  expect: "couldn't reach the listening service",
  timeoutMs: 20_000,
});

await scenario("Deepgram refuses: the clear reason stays on screen", {
  onSocket: (ws) => setTimeout(() => {
    ws.send(JSON.stringify({ type: "error", message: "Listening service refused (HTTP 402). Check the Deepgram key and balance." }));
    ws.close({ code: 1011, reason: "listening failed" });
  }, 300),
  expect: "Listening service refused (HTTP 402)",
  timeoutMs: 5_000,
});

await scenario("the mic ends while the app is in the background", {
  onSocket: (ws) => ws.send(JSON.stringify({ type: "ready", session: "x" })),
  act: async (page) => {
    await page.locator(".session-status", { hasText: "listening" }).waitFor({ timeout: 10_000 });
    await page.evaluate(() => { window.__mic.getAudioTracks()[0].stop(); document.dispatchEvent(new Event("visibilitychange")); });
  },
  expect: "microphone lost",
  timeoutMs: 5_000,
});

await browser.close();
process.exit(failed ? 1 : 0);
