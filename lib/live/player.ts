export type Player = {
  play(buf: ArrayBuffer): number | null;
  newTurn(): void;
  stop(): void;
  playing(): boolean;
};

// Schedules 24 kHz PCM16 chunks back to back on one AudioContext. play() returns when the first chunk of a turn
// becomes audible (performance.now() ms, output latency included), so the app can time "you stopped → she started".
export function createPlayer(ctx: AudioContext, rate = 24000): Player {
  let next = 0;
  let fresh = true;
  let odd: number | null = null;
  let sources: AudioBufferSourceNode[] = [];
  return {
    play(buf) {
      let bytes = new Uint8Array(buf);
      if (odd !== null) { const merged = new Uint8Array(bytes.length + 1); merged[0] = odd; merged.set(bytes, 1); bytes = merged; odd = null; }
      if (bytes.length % 2) { odd = bytes[bytes.length - 1]; bytes = bytes.subarray(0, bytes.length - 1); }
      if (!bytes.length) return null;
      const pcm = new Int16Array(bytes.slice().buffer);
      const audio = ctx.createBuffer(1, pcm.length, rate);
      const ch = audio.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
      const src = ctx.createBufferSource();
      src.buffer = audio;
      src.connect(ctx.destination);
      const start = Math.max(ctx.currentTime + 0.02, next);
      src.start(start);
      next = start + audio.duration;
      sources.push(src);
      src.onended = () => { sources = sources.filter((s) => s !== src); };
      if (!fresh) return null;
      fresh = false;
      const outputLatency = (ctx.outputLatency || ctx.baseLatency || 0) * 1000;
      return performance.now() + (start - ctx.currentTime) * 1000 + outputLatency;
    },
    newTurn() { fresh = true; },
    stop() {
      for (const s of sources) { try { s.stop(); } catch { /* already stopped */ } }
      sources = [];
      next = 0;
      fresh = true;
      odd = null;
    },
    playing() { return sources.length > 0; },
  };
}
