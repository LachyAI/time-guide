// Local end-to-end: drives the real app in bundled Chromium with recorded speech as the mic, localhost only.
// Needs: voice-brain on 127.0.0.1:8095 and `next dev` on :3000, both with the same VOICE_TICKET_SECRET.
// Env: APP_PASSWORD (the PIN the dev server was started with), AGENT_NAME (default "Stoic Advisor"),
// BENCH_AUDIO_DIR (the voice-brain bench's audio), SECS (listen time, default 40).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "file:///C:/Dev/node_modules/playwright/index.mjs";

const AUDIO = process.env.BENCH_AUDIO_DIR || "C:/Dev/.worktrees/live-voice/vps-automation/voice-brain/bench/audio";
const pcms = [0, 1, 2].map((i) => fs.readFileSync(path.join(AUDIO, `u${i}.pcm`)));
const gap = Buffer.alloc(16000 * 2 * 9);
const body = Buffer.concat([Buffer.alloc(16000 * 2 * 3), ...pcms.flatMap((p) => [p, gap])]);
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + body.length, 4); hdr.write("WAVE", 8); hdr.write("fmt ", 12);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22); hdr.writeUInt32LE(16000, 24);
hdr.writeUInt32LE(32000, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34); hdr.write("data", 36); hdr.writeUInt32LE(body.length, 40);
const wav = path.join(os.tmpdir(), "voice-e2e-mic.wav");
fs.writeFileSync(wav, Buffer.concat([hdr, body]));

const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${wav}`, "--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ permissions: ["microphone"] });
await ctx.route("**/*", (route) => (["localhost", "127.0.0.1"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort()));
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:3000/");
await page.fill("input[type=password]", process.env.APP_PASSWORD || "");
await page.click(".password-submit");
await page.getByText(process.env.AGENT_NAME || "Stoic Advisor", { exact: true }).first().click();
await page.click(".mic-button");
await page.waitForTimeout(Number(process.env.SECS || 40) * 1000);
const status = page.locator(".session-status");
await status.dispatchEvent("pointerdown");
await page.waitForTimeout(800);
await status.dispatchEvent("pointerup");
const out = await page.evaluate(() => ({
  status: document.querySelector(".session-status")?.textContent,
  agentLines: [...document.querySelectorAll(".caption-agent")].map((p) => p.textContent),
  userLines: [...document.querySelectorAll(".caption-user")].map((p) => p.textContent),
  debug: document.querySelector(".debug-panel")?.textContent,
}));
console.log(JSON.stringify(out, null, 1));
if (errors.length) console.log("page errors:", errors.slice(0, 5));
await browser.close();
// The clips start while she is still talking, so a reply queued behind audio she was still playing shows up as
// one slow turn. Captions only land when a reply finishes, so "she answered" is counted from turns she was heard.
const totals = ((out.debug || "").match(/recent: ([\d · ]+) ms/)?.[1] || "").split(" · ").filter(Boolean).map(Number);
const worst = totals.length ? Math.max(...totals) : Infinity;
console.log(`heard her on ${totals.length} turns, worst you stopped → she started: ${worst} ms (bar 8000 ms)`);
process.exit(totals.length >= 2 && out.agentLines.length >= 1 && !errors.length && worst < 8000 ? 0 : 1);
