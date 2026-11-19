// The mission runner. It reads a mission script from story.js, turns the current objective into
// a marker, spawns whatever the objective needs, and watches the world for the conditions that
// finish or fail it. Death, a lost target or a blown clock all end in a retryable failure.

import { dist } from '../geometry.js';
import { MISSIONS, missionById, nextMission } from './story.js';
import { say } from './dialogue.js';
import { createVehicle } from '../entities/vehicles.js';
import { createOfficer } from '../entities/police.js';
import { placeOnNetwork } from '../entities/traffic.js';
import { nearestNode } from '../city/navigation.js';
import { reportCrime } from './wanted.js';

export function createMissionState() {
  return {
    active: null,
    stepIndex: 0,
    step: null,
    timer: 0,
    timeLimit: 0,
    state: 'idle',
    marker: null,
    objective: '',
    actors: [],
    targets: [],
    hint: '',
    failedReason: '',
    lastReward: 0,
  };
}

/** Turn a named place or a coordinate into a point the marker can sit on. */
function resolvePlace(world, place) {
  const landmarks = world.layout.landmarks;
  const point = landmarks[place];
  if (point) return { x: point.x, y: point.y };
  return { x: world.player.x + 200, y: world.player.y };
}

/** A hostile body: same chassis as an officer, different clothes and no badge. */
function spawnThug(world, x, y, hp = 55) {
  const thug = createOfficer(x, y, world.rng, { hp });
  thug.isCop = false;
  thug.hostile = true;
  thug.kind = 'thug';
  thug.hp = hp;
  thug.maxHp = hp;
  thug.palette = {
    shirt: world.rng.pick(['#4a2f4a', '#5a3320', '#33404a', '#5c4a2a']),
    pants: '#242428',
    skin: world.rng.pick(['#c98a5f', '#8d5a3c', '#e8b48f', '#6b4430']),
    hair: '#1c1a18',
  };
  thug.fireTimer = world.rng.range(0.4, 1.4);
  world.peds.push(thug);
  return thug;
}

/** Spawn the cast a step asks for. */
function spawnForStep(world, step) {
  const mission = world.mission;
  const at = mission.marker ?? resolvePlace(world, step.place ?? 'docks');
  if (step.spawn === 'park-thugs') {
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2;
      const thug = spawnThug(world, at.x + Math.cos(angle) * 70, at.y + Math.sin(angle) * 70, 55);
      mission.actors.push(thug);
    }
  } else if (step.spawn === 'office-guards') {
    for (let index = 0; index < 3; index += 1) {
      const thug = spawnThug(world, at.x + (index - 1) * 46, at.y - 30, 65);
      mission.actors.push(thug);
    }
  } else if (step.spawn === 'pier-crew') {
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2 + 0.4;
      const thug = spawnThug(world, at.x + Math.cos(angle) * 90, at.y + Math.sin(angle) * 90, 70);
      mission.actors.push(thug);
    }
    const pike = spawnThug(world, at.x - 40, at.y - 60, 140);
    pike.palette.shirt = '#1d2430';
    pike.palette.hair = '#c9c4b8';
    pike.boss = true;
    mission.boss = pike;
    mission.actors.push(pike);
  }
  if (step.kind === 'wreck') {
    const node = nearestNode(world.network, at.x, at.y);
    const link = node.links.length > 0 ? node.links[world.rng.int(0, node.links.length - 1)] : null;
    const van = createVehicle('van', node.x, node.y, 0, world.rng, {
      color: '#eae6dc',
      driver: 'traffic',
      spawnKind: 'traffic',
      cruise: 0.95,
    });
    van.health = 150;
    van.maxHealth = 150;
    van.fleeing = true;
    van.panic = 999;
    if (link) placeOnNetwork(van, world.network, node, link);
    world.vehicles.push(van);
    mission.targets.push(van);
  }
}

function enterStep(world, index) {
  const mission = world.mission;
  const def = mission.active;
  const step = def.steps[index];
  mission.stepIndex = index;
  mission.step = step;
  mission.timeLimit = step.time ?? 0;
  mission.timer = mission.timeLimit;
  mission.objective = step.text;
  mission.state = 'running';

  if (step.kind === 'wreck') {
    const point = resolvePlace(world, step.place ?? def.place);
    mission.marker = { x: point.x, y: point.y, label: step.text, kind: 'target' };
  } else if (step.kind === 'clear') {
    mission.marker = mission.marker ?? { x: world.player.x + 100, y: world.player.y, label: step.text, kind: 'target' };
  } else {
    const point = resolvePlace(world, step.place ?? def.place);
    mission.marker = { x: point.x, y: point.y, label: step.text, kind: 'objective' };
  }
  spawnForStep(world, step);
  world.toast(step.text, 3.4);
  world.audio?.objective();
}

export function startMission(world, id) {
  const def = missionById(id);
  if (!def) return false;
  const mission = world.mission;
  mission.active = def;
  mission.stepIndex = 0;
  mission.actors = [];
  mission.targets = [];
  mission.boss = null;
  mission.state = 'running';
  mission.failedReason = '';
  mission.marker = null;
  mission.lastReward = 0;
  world.missionBubbles = world.missionBubbles ?? [];
  if (def.steps[0].kind === 'goto' && !def.steps[0].spawn) {
    const point = resolvePlace(world, def.steps[0].place);
    mission.marker = { x: point.x, y: point.y, label: def.steps[0].text, kind: 'objective' };
  }
  enterStep(world, 0);
  say(world, def.intro);
  world.audio?.missionStart();
  world.save?.();
  return true;
}

/** Clear the bodies and props a mission brought into the world. */
export function clearMissionActors(world) {
  const mission = world.mission;
  for (const actor of mission.actors) {
    const index = world.peds.indexOf(actor);
    if (index >= 0) world.peds.splice(index, 1);
  }
  for (const target of mission.targets) {
    const index = world.vehicles.indexOf(target);
    if (index >= 0) world.vehicles.splice(index, 1);
  }
  mission.actors = [];
  mission.targets = [];
  mission.boss = null;
}

export function failMission(world, reason) {
  const mission = world.mission;
  if (mission.state !== 'running' || !mission.active) return;
  mission.state = 'failed';
  mission.failedReason = reason;
  mission.marker = null;
  world.audio?.fail();
  world.toast(`Mission failed: ${reason}`, 4);
  clearMissionActors(world);
  world.save?.();
}

export function completeMission(world) {
  const mission = world.mission;
  const def = mission.active;
  if (!def) return;
  mission.state = 'complete';
  mission.marker = null;
  world.player.money += def.reward;
  world.mission.lastReward = def.reward;
  world.stats.missionsCompleted += 1;
  world.completedMissions.add(def.id);
  if (def.unlock) {
    world.player.unlocked.add(def.unlock);
    if (def.unlock === 'smg') world.player.ammo.smg = (world.player.ammo.smg ?? 0) + 120;
    if (def.unlock === 'pistol') world.player.ammo.pistol = (world.player.ammo.pistol ?? 0) + 36;
    if (world.player.weapon === 'fists') world.player.weapon = def.unlock;
  }
  world.audio?.payday();
  world.toast(`Mission complete — $${def.reward}`, 4.2);
  say(world, def.outro);
  clearMissionActors(world);
  world.mission.active = null;
  world.save?.();
  if (world.completedMissions.size >= MISSIONS.length) {
    world.ending = true;
  }
}

function advanceStep(world) {
  const mission = world.mission;
  const def = mission.active;
  if (!def) return;
  const next = mission.stepIndex + 1;
  if (next >= def.steps.length) {
    completeMission(world);
    return;
  }
  world.audio?.objective();
  enterStep(world, next);
}

function livingActors(world) {
  const mission = world.mission;
  return mission.actors.filter((actor) => actor.alive && actor.state !== 'down' && actor.hp > 0);
}

export function updateMission(world, dt) {
  const mission = world.mission;
  if (mission.state !== 'running' || !mission.active) return;
  const step = mission.step;
  if (!step) return;
  const player = world.player;

  // The clock only runs while nobody is talking.
  if (!world.dialogue.open && mission.timeLimit > 0) {
    mission.timer -= dt;
    if (mission.timer <= 0) {
      failMission(world, 'You ran out of time');
      return;
    }
  }

  const marker = mission.marker;
  const atMarker = marker ? dist(player.x, player.y, marker.x, marker.y) < (step.radius ?? 50) : false;

  switch (step.kind) {
    case 'goto': {
      if (atMarker) {
        world.audio?.checkpoint();
        advanceStep(world);
      }
      break;
    }
    case 'deliver': {
      const inCar = player.mode === 'car' && player.car;
      const position = inCar ? player.car : player;
      const arrived = marker && dist(position.x, position.y, marker.x, marker.y) < (step.radius ?? 50);
      if (arrived && (!step.mustDrive || inCar)) {
        if (inCar) player.car.vx *= 0.2;
        world.audio?.checkpoint();
        advanceStep(world);
      }
      break;
    }
    case 'wreck': {
      const target = mission.targets[0];
      if (!target) {
        failMission(world, 'The van got away');
        return;
      }
      mission.marker = { x: target.x, y: target.y, label: step.text, kind: 'target' };
      if (target.wrecked || target.health <= 0) {
        world.effects.explosion(target.x, target.y);
        world.audio?.explosion(target.x, target.y);
        world.stats.vehiclesWrecked += 1;
        advanceStep(world);
        return;
      }
      if (dist(target.x, target.y, player.x, player.y) > (step.radius ?? 1500)) {
        failMission(world, 'The van got away');
      }
      break;
    }
    case 'clear': {
      const living = livingActors(world);
      if (living.length === 0) {
        world.audio?.checkpoint();
        advanceStep(world);
      } else if (mission.boss) {
        mission.marker = { x: mission.boss.x, y: mission.boss.y, label: 'Pike', kind: 'target' };
      }
      break;
    }
    case 'grab': {
      if (atMarker) {
        player.money += 0;
        world.toast('Case secured', 2.4);
        world.audio?.pickup();
        advanceStep(world);
      }
      break;
    }
    case 'escape': {
      if (step.stars && world.wanted.stars < step.stars) {
        reportCrime(world, 'gunshot', player.x, player.y);
        world.wanted.heat = Math.max(world.wanted.heat, [0, 20, 58, 108, 168, 240][step.stars]);
        world.wanted.stars = Math.max(world.wanted.stars, step.stars);
      }
      if (atMarker && world.wanted.stars === 0) {
        advanceStep(world);
      } else if (atMarker) {
        world.mission.hint = 'Lose the patrol before you stop';
      }
      break;
    }
    default:
      break;
  }
}

/** The marker the minimap and the world draw. */
export function missionMarker(world) {
  const mission = world.mission;
  if (mission.state !== 'running' || !mission.marker) return null;
  return mission.marker;
}

/** The one-line objective shown at the top of the HUD. */
export function objectiveText(world) {
  const mission = world.mission;
  if (mission.state === 'running' && mission.active) {
    return `${mission.active.title} — ${mission.objective}`;
  }
  if (world.activity && world.activity.kind) {
    return world.activity.objective;
  }
  return '';
}

/** Where the player is told to go next when no mission is running. */
export function nextMissionHint(world) {
  if (world.mission.state === 'running') return null;
  const next = nextMission(world.completedMissions);
  if (!next) return null;
  const point = resolvePlace(world, next.place);
  return { def: next, point };
}

/** Restart the job the player just failed. */
export function retryMission(world) {
  const mission = world.mission;
  const def = mission.active;
  if (!def) return;
  world.player.health = Math.max(45, world.player.health);
  startMission(world, def.id);
}