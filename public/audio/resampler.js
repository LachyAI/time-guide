// Device-rate float samples → 16 kHz PCM16 frames (80 ms = 1280 samples, what Flux wants) plus each frame's RMS.
// `pos` carries across chunks and can start at -1..0, so sample -1 is the previous chunk's last one.
// (The spike read index -1 here and produced NaN samples at chunk edges.)
export function createResampler(inRate, { outRate = 16000, frameSize = 1280, onFrame }) {
  const ratio = inRate / outRate;
  let pos = 0, last = 0, n = 0, sumSq = 0;
  let frame = new Int16Array(frameSize);
  return function push(ch) {
    while (pos < ch.length - 1) {
      const i = Math.floor(pos), f = pos - i;
      const v = (i < 0 ? last : ch[i]) * (1 - f) + ch[i + 1] * f;
      sumSq += v * v;
      frame[n++] = Math.max(-1, Math.min(1, v)) * 0x7fff;
      if (n === frameSize) {
        onFrame(frame, Math.sqrt(sumSq / n));
        frame = new Int16Array(frameSize);
        n = 0;
        sumSq = 0;
      }
      pos += ratio;
    }
    last = ch[ch.length - 1];
    pos -= ch.length;
  };
}
