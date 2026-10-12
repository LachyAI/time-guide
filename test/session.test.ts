import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTicket, saveTicket, clearTicket } from "../lib/session.ts";

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

test("a saved ticket loads until a minute before it expires", () => {
  const s = mem();
  saveTicket({ ticket: "t", exp: 1_000_000 }, s);
  assert.equal(loadTicket(900_000, s), "t");
  assert.equal(loadTicket(940_001, s), null);
});

test("junk, a missing ticket or a cleared ticket loads as none", () => {
  const s = mem();
  assert.equal(loadTicket(0, s), null);
  s.setItem("lachy-os-ticket", "{bad");
  assert.equal(loadTicket(0, s), null);
  saveTicket({ ticket: "t", exp: 9e15 }, s);
  clearTicket(s);
  assert.equal(loadTicket(0, s), null);
  assert.equal(loadTicket(0, null), null);
});
