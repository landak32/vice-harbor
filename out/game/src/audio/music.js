// The soundtrack: a synth bass, a kick, a snare and hats, sequenced against the audio clock.
// The arrangement opens up as the wanted level climbs, so a chase always sounds like one.

const BPM = 104;
const STEP = 60 / BPM / 4;

const BASS_ROOTS = [55, 55, 73.42, 65.41];
const BASS_PATTERN = [0, null, 0, 12, null, 0, 7, null, 0, null, 0, 12, 3, null, 7, null];

export function createMusic(context, synth) {
  const out = context.createGain();
  out.gain.value = 0;
  out.connect(context.destination);
  const previous = synth.destination;
  synth.destination = out;

  let step = 0;
  let nextTime = context.currentTime + 0.1;
  let intensity = 0;
  let running = false;

  function schedule(time, index) {
    const at = Math.max(0, time - context.currentTime);
    const bar = Math.floor(index / 16) % BASS_ROOTS.length;
    const root = BASS_ROOTS[bar];
    const slot = index % 16;

    if (intensity >= 1 && (slot % 4 === 0 || slot === 10)) {
      synth.tone({ type: 'sine', freq: 120, to: 44, at, dur: 0.18, gain: 0.55 });
    }
    if (intensity >= 2 && (slot === 4 || slot === 12)) {
      synth.noise({ at, dur: 0.13, gain: 0.16, type: 'bandpass', freq: 1900, q: 1.2 });
    }
    if (intensity >= 3 && slot % 2 === 1) {
      synth.noise({ at, dur: 0.03, gain: 0.05, type: 'highpass', freq: 7200 });
    }
    if (intensity >= 1) {
      const semitone = BASS_PATTERN[slot];
      if (semitone !== null) {
        const freq = root * Math.pow(2, semitone / 12);
        synth.tone({
          type: 'sawtooth',
          freq,
          at,
          dur: intensity >= 4 ? 0.14 : 0.2,
          gain: 0.16,
          filter: { type: 'lowpass', freq: intensity >= 4 ? 900 : 520, q: 4 },
        });
      }
    }
    if (intensity >= 4 && slot % 8 === 2) {
      synth.tone({ type: 'square', freq: root * 4, at, dur: 0.1, gain: 0.04, filter: { type: 'lowpass', freq: 2200 } });
    }
    if (intensity >= 5 && slot === 15) {
      synth.tone({ type: 'triangle', freq: root * 6, at, dur: 0.12, gain: 0.05 });
    }
  }

  return {
    start() {
      running = true;
      nextTime = context.currentTime + 0.08;
      out.gain.setTargetAtTime(0.5, context.currentTime, 0.6);
    },
    stop() {
      running = false;
      out.gain.setTargetAtTime(0, context.currentTime, 0.3);
    },
    setIntensity(value) {
      intensity = Math.max(0, Math.min(5, Math.round(value)));
    },
    update() {
      if (!running) return;
      while (nextTime < context.currentTime + 0.3) {
        schedule(nextTime, step);
        nextTime += STEP;
        step = (step + 1) % 64;
      }
    },
    get intensity() {
      return intensity;
    },
    restore() {
      synth.destination = previous;
    },
  };
}