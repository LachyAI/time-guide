const KEY = "lachy-os-ticket";

export type StoredTicket = { ticket: string; exp: number };
type Store = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };

const browserStore = (): Store | null => {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
};

// A ticket counts as gone a minute before it expires, so a session never starts on one about to lapse.
export function loadTicket(now = Date.now(), store: Store | null = browserStore()): string | null {
  try {
    const v = JSON.parse(store?.getItem(KEY) || "null") as StoredTicket | null;
    return v && typeof v.ticket === "string" && v.exp - 60_000 > now ? v.ticket : null;
  } catch {
    return null;
  }
}

export function saveTicket(t: StoredTicket, store: Store | null = browserStore()): void {
  try { store?.setItem(KEY, JSON.stringify(t)); } catch { /* private mode: the PIN is asked again next time */ }
}

export function clearTicket(store: Store | null = browserStore()): void {
  try { store?.removeItem(KEY); } catch { /* nothing stored */ }
}
