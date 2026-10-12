import { test } from "node:test";
import assert from "node:assert/strict";
import { signTicket, TICKET_TTL_MS } from "../lib/ticket.ts";

test("signs exactly like voice-brain (shared test vector)", () => {
  assert.equal(TICKET_TTL_MS, 43_200_000);
  const { ticket, exp } = signTicket("test-secret", 1700000000000);
  assert.equal(ticket, "eyJleHAiOjE3MDAwNDMyMDAwMDB9.AGIdX4ievJ1Cfj-lHlmjVXSY5jiUXEjB_aHN3aS2NxE");
  assert.equal(exp, 1700043200000);
});
