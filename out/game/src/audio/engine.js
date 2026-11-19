// The audio director. It owns the WebAudio context, lazily created on the first key or click
// because browsers demand a gesture, and mixes three things: one-shot effects, the siren, and
// the engine note that rises and falls with the player's speed.

import { createSynth } from './synth.js';
import { createSfx } from './sfx.js';
import { createMusic } from './music.js';

export function createAudio() {
  let context = null;
  let synth = null;
  let sfx = null;
  let music = null;
  let master = null;
  let engine = null;
  let siren = null;
  let sirenGain = null;
  let muted = false;
  let ready = false;
  let lastSiren = 0;

  function build() {
    if (context) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.55;
    master.connect(context.destination);
    synth = createSynth(context);
    synth.destination = master;
    sfx = createSfx(context, synth);
    music = createMusic(context, synth);
    sfx.out.disconnect();
    sfx.out.connect(master);
    music.restore();
    engine = context.createOscillator();
    const engineFilter = context.createBiquadFilter();
    const engineGain = context.createGain();
    engine.type = 'sawtooth';
    engine.frequency.value = 70;
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain.gain.value = 0;
    engine.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engine.start();
    engine.engineGain = engineGain;
    engine.engineFilter = engineFilter;

    siren = context.createOscillator();
    sirenGain = context.createGain();
    siren.type = 'sawtooth';
    siren.frequency.value = 760;
    sirenGain.gain.value = 0;
    const sirenFilter = context.createBiquadFilter();
    sirenFilter.type = 'bandpass';
    sirenFilter.frequency.value = 1100;
    sirenFilter.Q.value = 1.6;
    siren.connect(sirenFilter);
    sirenFilter.connect(sirenGain);
    sirenGain.connect(master);
    siren.start();
    ready = true;
  }

  function unlock() {
    build();
    if (context && context.state === 'suspended') context.resume();
    if (music && !muted) music.start();
  }

  return {
    unlock,
    get ready() {
      return ready;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55, context.currentTime, 0.1);
      return muted;
    },
    gunshot(distance = 0) {
      if (ready) sfx.gunshot(distance);
    },
    punch() {
      if (ready) sfx.punch();
    },
    thud() {
      if (ready) sfx.thud();
    },
    explosion(x = 0, y = 0) {
      if (!ready) return;
      const player = this._player;
      const distance = player ? Math.hypot(player.x - x, player.y - y) : 0;
      sfx.explosion(distance);
    },
    glass() {
      if (ready) sfx.glass();
    },
    pickup() {
      if (ready) sfx.pickup();
    },
    checkpoint() {
      if (ready) sfx.checkpoint();
    },
    objective() {
      if (ready) sfx.objective();
    },
    payday() {
      if (ready) sfx.payday();
    },
    fail() {
      if (ready) sfx.fail();
    },
    missionStart() {
      if (ready) sfx.missionStart();
    },
    alert() {
      if (ready) sfx.alert();
    },
    blip(volume = 0.05) {
      if (ready) sfx.blip(volume);
    },
    chime() {
      if (ready) sfx.chime();
    },
    doorOpen() {
      if (ready) sfx.doorOpen();
    },
    doorClose() {
      if (ready) sfx.doorClose();
    },
    horn(distance = 0) {
      if (ready) sfx.horn(distance);
    },

    /** Called once per simulation step: engine pitch, siren proximity, music intensity. */
    update(dt, world) {
      if (!ready) return;
      this._player = world.player;
      const car = world.player.mode === 'car' ? world.player.car : null;
      const speed = car ? Math.hypot(car.vx, car.vy) : 0;
      const targetGain = car ? 0.05 + Math.min(0.11, speed / 4200) : 0;
      engine.engineGain.gain.setTargetAtTime(targetGain, context.currentTime, 0.12);
      engine.frequency.setTargetAtTime(58 + speed * 0.55, context.currentTime, 0.1);
      engine.engineFilter.frequency.setTargetAtTime(320 + speed * 1.4, context.currentTime, 0.15);

      // Siren: only when the patrol is out, and louder the closer the nearest cruiser is.
      let nearest = Infinity;
      for (const ped of world.peds) {
        if (!ped.isCop) continue;
        const d = Math.hypot(ped.x - world.player.x, ped.y - world.player.y);
        if (d < nearest) nearest = d;
      }
      for (const car of world.vehicles) {
        if (!car.police) continue;
        const d = Math.hypot(car.x - world.player.x, car.y - world.player.y);
        if (d < nearest) nearest = d;
      }
      const sirenOn = world.wanted.stars > 0 && nearest < 1500;
      const proximity = sirenOn ? Math.max(0.02, 0.1 - nearest / 16000) : 0;
      sirenGain.gain.setTargetAtTime(proximity, context.currentTime, 0.25);
      if (sirenOn) {
        const t = context.currentTime;
        siren.frequency.setValueAtTime(760, t);
        siren.frequency.linearRampToValueAtTime(1080, t + 0.55);
        siren.frequency.linearRampToValueAtTime(760, t + 1.1);
      }

      music.setIntensity(world.wanted.stars);
      music.update();
      lastSiren = world.wanted.stars;
    },
  };
}