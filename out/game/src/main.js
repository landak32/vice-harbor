// Boot and glue. Builds the canvas, wires input to the world, runs the menus, unlocks the audio
// on the first real gesture, and — when the page is opened with ?shot=<name> — stages one of the
// four scenes and hands the player to the autopilot so the capture is a genuine frame of play.

import { VIEW } from './config.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { createScene, renderScene, attachMinimap } from './render/scene.js';
import { createLoop } from './loop.js';
import { createAudio } from './audio/engine.js';
import { saveGame, loadGame, hasSave, applySave } from './game/save.js';
import { prepareShot } from './shots.js';

const canvas = document.getElementById('game');
const scene = createScene(canvas);
const input = createInput(canvas);
const audio = createAudio();

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 20261119);

const ui = {
  items: [],
  selection: 0,
  returnTo: 'title',
  banner: { text: '', alpha: 0, accent: '#f2c14e' },
};

let world = null;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(VIEW.width * dpr);
  canvas.height = Math.round(VIEW.height * dpr);
  scene.dpr = dpr;
}

function wire(next) {
  world = next;
  world.audio = audio;
  world.save = () => saveGame(world);
  attachMinimap(scene, world);
}

function menuItems() {
  if (world.state === 'title') {
    return hasSave() ? ['NEW GAME', 'CONTINUE', 'CONTROLS'] : ['NEW GAME', 'CONTROLS'];
  }
  if (world.state === 'paused') return ['RESUME', 'CONTROLS', 'SAVE GAME', 'QUIT TO TITLE'];
  return [];
}

function refreshMenu() {
  ui.items = menuItems();
  if (ui.selection >= ui.items.length) ui.selection = 0;
}

function startNewGame() {
  wire(createWorld({ seed }));
  world.state = 'play';
  world.frozen = false;
  world.dayTimer = 18.2;
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;
  world.toast('Vice Harbor — find a car, find a job, find a way out', 4);
  refreshMenu();
}

function continueGame() {
  const data = loadGame();
  wire(createWorld({ seed }));
  if (data) applySave(world, data);
  world.state = 'play';
  world.frozen = false;
  refreshMenu();
}

function backToTitle() {
  saveGame(world);
  wire(createWorld({ seed }));
  world.state = 'title';
  world.frozen = true;
  world.dayTimer = 19.6;
  const tower = world.layout.landmarks.tower;
  world.camera.x = tower.x;
  world.camera.y = tower.y + 90;
  world.camera.zoom = 1.0;
  world.camera.targetZoom = 1.0;
  ui.selection = 0;
  refreshMenu();
}

function choose() {
  const label = ui.items[ui.selection];
  if (!label) return;
  if (world.state === 'title') {
    if (label === 'NEW GAME') startNewGame();
    else if (label === 'CONTINUE') continueGame();
    else if (label === 'CONTROLS') {
      ui.returnTo = 'title';
      world.state = 'controls';
    }
  } else if (world.state === 'paused') {
    if (label === 'RESUME') world.state = 'play';
    else if (label === 'CONTROLS') {
      ui.returnTo = 'paused';
      world.state = 'controls';
    } else if (label === 'SAVE GAME') {
      saveGame(world);
      world.toast('Saved', 1.6);
    } else if (label === 'QUIT TO TITLE') backToTitle();
  }
}

function readActions() {
  const actions = {};
  if (input.wasPressed('KeyE')) actions.enter = true;
  if (input.wasPressed('KeyQ')) actions.weapon = true;
  if (input.wasPressed('KeyF')) actions.dialogue = true;
  if (input.wasPressed('KeyG')) actions.activity = true;
  return actions;
}

function handleMenus() {
  const up = input.wasPressed('ArrowUp') || input.wasPressed('KeyW');
  const down = input.wasPressed('ArrowDown') || input.wasPressed('KeyS');
  const confirm = input.wasPressed('Enter') || input.wasPressed('Space') || input.mouse.clicked;
  const back = input.wasPressed('Escape') || input.wasPressed('Backspace');

  if (world.state === 'controls') {
    if (confirm || back) world.state = ui.returnTo;
    return;
  }
  if (world.state === 'stats') {
    if (confirm || back) world.state = 'play';
    return;
  }
  if (world.state === 'title' || world.state === 'paused') {
    if (up) ui.selection = (ui.selection + ui.items.length - 1) % ui.items.length;
    if (down) ui.selection = (ui.selection + 1) % ui.items.length;
    if (confirm) choose();
    if (back && world.state === 'paused') world.state = 'play';
  }
}

function frame(dt) {
  if (world.state === 'play') {
    const actions = readActions();
    if (input.wasPressed('Escape')) {
      world.state = 'paused';
      ui.selection = 0;
      refreshMenu();
    } else if (input.wasPressed('Tab')) {
      world.state = 'stats';
    } else {
      world.beginFrame(input, actions);
      world.step(dt);
    }
  } else {
    handleMenus();
    world.step(dt);
  }

  if (input.wasPressed('KeyM')) {
    const muted = audio.toggleMute();
    world.toast(muted ? 'Sound off' : 'Sound on', 1.2);
  }
  input.endFrame();
}

function draw() {
  try {
    renderScene(scene, world, ui);
  } catch (err) {
    window.vhDrawError = (err && err.stack) || String(err);
  }
}

function boot() {
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', () => audio.unlock(), { once: true });
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  if (shotName) {
    document.documentElement.classList.add('capture');
    wire(createWorld({ seed }));
    world.state = 'play';
    world.frozen = false;
    prepareShot(world, shotName);
    world.camera.x = world.player.x;
    world.camera.y = world.player.y;
    if (world.player.car) {
      world.camera.x = world.player.car.x;
      world.camera.y = world.player.car.y;
    }
  } else {
    wire(createWorld({ seed }));
    world.state = 'title';
    world.frozen = true;
    world.dayTimer = 19.6;
    const tower = world.layout.landmarks.tower;
    world.camera.x = tower.x;
    world.camera.y = tower.y + 90;
    world.camera.zoom = 1.0;
    world.camera.targetZoom = 1.0;
  }
  refreshMenu();

  const loop = createLoop(frame, draw);
  // A single hook for debugging and for the capture script: the live world, nothing else.
  window.viceHarbor = { world: () => world, scene, ui, input, audio };
  loop.start();
}

boot();