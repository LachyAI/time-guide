import { createHmac } from "node:crypto";

// Same format voice-brain checks: base64url(JSON{exp}) + "." + base64url(HMAC-SHA256(payload, secret)).
export const TICKET_TTL_MS = 12 * 60 * 60 * 1000;

export function signTicket(secret: string, now = Date.now(), ttlMs = TICKET_TTL_MS): { ticket: string; exp: number } {
  const exp = now + ttlMs;
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return { ticket: `${payload}.${sig}`, exp };
}
