// The two primitives every sound in the game is built from: a tone with an envelope, and a
// burst of filtered noise. Nothing is loaded from disk — the noise buffer is generated once.

export function createSynth(context) {
  const noiseBuffer = (() => {
    const length = Math.floor(context.sampleRate * 1.2);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = 0.86 * last + 0.14 * white;
      data[index] = white * 0.7 + last * 0.6;
    }
    return buffer;
  })();

  /** A pitched blip: type, frequency, start, duration, peak gain. */
  function tone({ type = 'sine', freq = 440, to = null, at = 0, dur = 0.12, gain = 0.15, attack = 0.004, filter = null, detune = 0 }) {
    const now = context.currentTime + at;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + dur);
    osc.detune.value = detune;
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    let node = osc;
    if (filter) {
      const biquad = context.createBiquadFilter();
      biquad.type = filter.type ?? 'lowpass';
      biquad.frequency.setValueAtTime(filter.freq ?? 1200, now);
      if (filter.to) biquad.frequency.exponentialRampToValueAtTime(filter.to, now + dur);
      biquad.Q.value = filter.q ?? 1;
      node.connect(biquad);
      node = biquad;
    }
    node.connect(amp);
    amp.connect(this.destination ?? context.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
    return osc;
  }

  /** A burst of noise through a filter: impacts, gunfire, explosions, tyre hiss. */
  function noise({ at = 0, dur = 0.2, gain = 0.2, type = 'lowpass', freq = 1800, to = null, q = 0.8, attack = 0.002 }) {
    const now = context.currentTime + at;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const biquad = context.createBiquadFilter();
    biquad.type = type;
    biquad.frequency.setValueAtTime(freq, now);
    if (to !== null) biquad.frequency.exponentialRampToValueAtTime(Math.max(60, to), now + dur);
    biquad.Q.value = q;
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.linearRampToValueAtTime(gain, now + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    source.connect(biquad);
    biquad.connect(amp);
    amp.connect(this.destination ?? context.destination);
    source.start(now, Math.random() * 0.4);
    source.stop(now + dur + 0.05);
    return source;
  }

  return { tone, noise, noiseBuffer };
}