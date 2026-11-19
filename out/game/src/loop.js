// The fixed-timestep loop. Rendering happens once per animation frame; the simulation is
// stepped in exact 1/60 slices with a bounded catch-up, so a slow frame cannot make the world
// run faster than a fast one.

import { STEP } from './config.js';

export function createLoop(update, render) {
  let accumulator = 0;
  let last = 0;
  let running = false;
  let frame = 0;
  let fps = 60;
  let fpsClock = 0;
  let fpsFrames = 0;

  function tick(now) {
    if (!running) return;
    if (last === 0) last = now;
    let delta = (now - last) / 1000;
    last = now;
    if (delta > 0.25) delta = 0.25;
    accumulator += delta;
    let steps = 0;
    while (accumulator >= STEP && steps < 6) {
      update(STEP, frame);
      accumulator -= STEP;
      steps += 1;
      frame += 1;
    }
    if (steps === 6) accumulator = 0;
    render(delta, frame);
    fpsFrames += 1;
    fpsClock += delta;
    if (fpsClock >= 0.5) {
      fps = fpsFrames / fpsClock;
      fpsFrames = 0;
      fpsClock = 0;
    }
    requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = 0;
      requestAnimationFrame(tick);
    },
    stop() {
      running = false;
    },
    get frame() {
      return frame;
    },
    get fps() {
      return fps;
    },
  };
}