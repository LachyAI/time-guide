import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_RETRIES, retryDelay } from "../lib/live/reconnect.ts";

test("reconnect keeps trying for most of the server's 2-minute grace window, never past it", () => {
  let total = 0;
  for (let i = 0; i < MAX_RETRIES; i++) total += retryDelay(i);
  assert.ok(total >= 100_000, `gives up after ${total} ms`);
  assert.ok(total <= 120_000, `last try at ${total} ms lands after the grace window`);
  assert.equal(retryDelay(0), 500);
  assert.equal(retryDelay(20), 15_000);
});
