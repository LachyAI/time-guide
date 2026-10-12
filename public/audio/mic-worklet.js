import { createResampler } from "./resampler.js";

class Mic extends AudioWorkletProcessor {
  constructor() {
    super();
    this.push = createResampler(sampleRate, {
      onFrame: (frame, rms) => this.port.postMessage({ pcm: frame.buffer, rms }, [frame.buffer]),
    });
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.push(ch);
    return true;
  }
}

registerProcessor("mic", Mic);
