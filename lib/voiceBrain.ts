import { clearTicket, loadTicket } from "@/lib/session";

export const BRAIN_URL = process.env.NEXT_PUBLIC_VOICE_BRAIN_URL || "https://brain.opscorescale.com";

export type AgentConfig = { engine: "live" | "elevenlabs"; voice: string | null; display?: string };
export type Voice = { id: string; name: string; accent: string; tags: string; engine: "Flux" | "Aura-2"; featured: boolean; shortlist: boolean };

// A missing or rejected ticket sends the app back to the PIN screen.
export function lock(): void {
  clearTicket();
  window.dispatchEvent(new Event("lachy-os-locked"));
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const ticket = loadTicket();
  if (!ticket) { lock(); throw new Error("locked"); }
  const res = await fetch(BRAIN_URL + path, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Ticket ${ticket}` } });
  if (res.status === 401) { lock(); throw new Error("locked"); }
  return res;
}

export async function fetchAgents(): Promise<Record<string, AgentConfig>> {
  const res = await call("/v1/agents");
  if (!res.ok) throw new Error(`agents HTTP ${res.status}`);
  return res.json();
}

export async function fetchVoices(): Promise<Voice[]> {
  const res = await call("/v1/voices");
  if (!res.ok) throw new Error(`voices HTTP ${res.status}`);
  return (await res.json()).voices;
}

export async function setAgentVoice(slug: string, voice: string): Promise<AgentConfig> {
  const res = await call(`/v1/agents/${encodeURIComponent(slug)}/voice`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voice }) });
  if (!res.ok) throw new Error(`voice HTTP ${res.status}`);
  return res.json();
}

export function fetchSample(voice: string): Promise<Response> {
  return call(`/v1/voices/${encodeURIComponent(voice)}/sample`);
}

export function liveUrl(slug: string, session: string, { bargeIn }: { bargeIn: boolean }): string | null {
  const ticket = loadTicket();
  if (!ticket) return null;
  const u = new URL("/v1/live", BRAIN_URL.replace(/^http/, "ws"));
  u.searchParams.set("agent", slug);
  u.searchParams.set("ticket", ticket);
  u.searchParams.set("session", session);
  if (!bargeIn) u.searchParams.set("bargeIn", "0");
  return u.toString();
}
