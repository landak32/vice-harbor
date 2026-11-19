// Every one-shot sound the game makes, synthesised on demand. Guns, punches, glass, explosions,
// the siren's two-tone wail, and the small interface chimes.

export function createSfx(context, synth) {
  const out = context.createGain();
  out.gain.value = 0.9;
  out.connect(context.destination);
  synth.destination = out;

  function gunshot(distance = 0) {
    const loud = Math.max(0.08, 0.5 - distance / 2600);
    synth.noise({ dur: 0.09, gain: loud, type: 'bandpass', freq: 2400, to: 500, q: 0.9 });
    synth.tone({ type: 'square', freq: 180, to: 60, dur: 0.08, gain: loud * 0.5, filter: { type: 'lowpass', freq: 900 } });
  }

  function punch() {
    synth.noise({ dur: 0.09, gain: 0.28, type: 'lowpass', freq: 700, to: 120 });
    synth.tone({ type: 'sine', freq: 140, to: 60, dur: 0.1, gain: 0.2 });
  }

  function thud() {
    synth.noise({ dur: 0.12, gain: 0.3, type: 'lowpass', freq: 420, to: 90 });
  }

  function explosion(distance = 0) {
    const loud = Math.max(0.12, 0.7 - distance / 2400);
    synth.noise({ dur: 0.75, gain: loud, type: 'lowpass', freq: 1600, to: 70 });
    synth.tone({ type: 'sine', freq: 90, to: 32, dur: 0.7, gain: loud * 0.8 });
    synth.noise({ at: 0.05, dur: 0.4, gain: loud * 0.4, type: 'bandpass', freq: 900, to: 200, q: 1.4 });
  }

  function glass() {
    synth.noise({ dur: 0.18, gain: 0.16, type: 'highpass', freq: 2600 });
  }

  function pickup() {
    synth.tone({ type: 'triangle', freq: 720, dur: 0.08, gain: 0.12 });
    synth.tone({ type: 'triangle', freq: 1080, at: 0.07, dur: 0.12, gain: 0.1 });
  }

  function checkpoint() {
    synth.tone({ type: 'sine', freq: 640, dur: 0.1, gain: 0.1 });
    synth.tone({ type: 'sine', freq: 960, at: 0.08, dur: 0.14, gain: 0.09 });
  }

  function objective() {
    synth.tone({ type: 'triangle', freq: 420, dur: 0.14, gain: 0.1 });
    synth.tone({ type: 'triangle', freq: 630, at: 0.1, dur: 0.18, gain: 0.08 });
  }

  function payday() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((freq, index) => synth.tone({ type: 'triangle', freq, at: index * 0.07, dur: 0.2, gain: 0.1 }));
  }

  function fail() {
    synth.tone({ type: 'sawtooth', freq: 260, to: 90, dur: 0.55, gain: 0.14, filter: { type: 'lowpass', freq: 800 } });
  }

  function missionStart() {
    synth.tone({ type: 'square', freq: 220, dur: 0.16, gain: 0.08, filter: { type: 'lowpass', freq: 1100 } });
    synth.tone({ type: 'square', freq: 330, at: 0.14, dur: 0.22, gain: 0.07, filter: { type: 'lowpass', freq: 1300 } });
  }

  function alert() {
    synth.tone({ type: 'sawtooth', freq: 900, to: 1400, dur: 0.18, gain: 0.08, filter: { type: 'bandpass', freq: 1600, q: 2 } });
  }

  function blip(volume = 0.05) {
    synth.tone({ type: 'square', freq: 1400, dur: 0.03, gain: volume });
  }

  function chime() {
    synth.tone({ type: 'sine', freq: 880, dur: 0.4, gain: 0.06 });
    synth.tone({ type: 'sine', freq: 1320, at: 0.02, dur: 0.3, gain: 0.03 });
  }

  function doorOpen() {
    synth.noise({ dur: 0.12, gain: 0.08, type: 'bandpass', freq: 800, to: 1600, q: 1.2 });
  }

  function doorClose() {
    synth.noise({ dur: 0.1, gain: 0.14, type: 'lowpass', freq: 900, to: 200 });
  }

  function horn(distance = 0) {
    const loud = Math.max(0.03, 0.16 - distance / 4000);
    synth.tone({ type: 'square', freq: 392, dur: 0.22, gain: loud, filter: { type: 'lowpass', freq: 1800 } });
    synth.tone({ type: 'square', freq: 294, dur: 0.22, gain: loud * 0.8, filter: { type: 'lowpass', freq: 1600 } });
  }

  return { gunshot, punch, thud, explosion, glass, pickup, checkpoint, objective, payday, fail, missionStart, alert, blip, chime, doorOpen, doorClose, horn, out };
}