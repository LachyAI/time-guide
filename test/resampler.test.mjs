import { test } from "node:test";
import assert from "node:assert/strict";
import { createResampler } from "../public/audio/resampler.js";

function run(inRate, seconds, chunk = 128, amp = 0.5) {
  const frames = [];
  const push = createResampler(inRate, { onFrame: (f, rms) => frames.push({ f: Int16Array.from(f), rms }) });
  const total = inRate * seconds;
  for (let off = 0; off < total; off += chunk) {
    const c = new Float32Array(Math.min(chunk, total - off));
    for (let i = 0; i < c.length; i++) c[i] = amp * Math.sin((2 * Math.PI * 440 * (off + i)) / inRate);
    push(c);
  }
  return frames;
}

test("48 kHz in 128-sample chunks gives clean 80 ms frames (no NaN at chunk edges)", () => {
  const frames = run(48000, 1);
  assert.equal(frames.length, 12);
  for (const { f, rms } of frames) {
    assert.equal(f.length, 1280);
    assert.ok(Number.isFinite(rms));
    assert.ok(f.every((v) => Number.isFinite(v) && v >= -32767 && v <= 32767));
  }
  assert.ok(Math.abs(frames[5].rms - 0.5 / Math.SQRT2) < 0.02);
});

test("44.1 kHz works too", () => {
  const frames = run(44100, 1);
  assert.equal(frames.length, 12);
  assert.ok(frames.every(({ rms }) => Number.isFinite(rms) && rms > 0.3));
});

test("silence gives a zero RMS", () => {
  const frames = run(48000, 0.2, 128, 0);
  assert.ok(frames.length >= 2);
  assert.ok(frames.every(({ rms }) => rms === 0));
});
