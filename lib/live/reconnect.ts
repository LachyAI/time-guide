// 0.5s doubling to a 15s cap. 11 tries: the last lands about 105s in, inside the server's 2-minute reconnect window.
export const MAX_RETRIES = 11;
export const retryDelay = (attempt: number): number => Math.min(15_000, 500 * 2 ** attempt);
