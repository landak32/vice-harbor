// The world: it builds Vice Harbor from a seed, owns every living thing in it, and advances the
// whole simulation one fixed step at a time. Everything else in game/src is a part that this
// file plugs together; nothing here draws a pixel.

import { PLAYER, STEP, VIEW, VEHICLE_TYPES } from './config.js';
import { makeRandom } from './rng.js';
import { angleDiff, clamp, dist } from './geometry.js';
import { buildLayout } from './city/layout.js';
import { buildCityBuildings } from './city/buildings.js';
import { buildCityProps } from './city/props.js';
import { buildStaticGrid } from './city/collision.js';
import { buildRoadNetwork, nearestSidewalkPoint } from './city/navigation.js';
import { createEffects } from './game/effects.js';
import { createCamera, updateCamera } from './game/camera.js';
import { createDialogueState, updateDialogue, advanceDialogue } from './game/dialogue.js';
import { createMissionState, updateMission, failMission } from './game/missions.js';
import { createActivityState, updateActivity, tryStartActivity } from './game/activities.js';
import { createWanted, updateWanted, clearWanted, reportCrime, raiseAlarm } from './game/wanted.js';
import { saveGame } from './game/save.js';
import { createPlayer, updatePlayerOnFoot, damagePlayer, enterNearestCar, exitCar, currentWeapon, cycleWeapon } from './entities/player.js';
import { createVehicle, driveCar, collideCarWithWorld, resolveCarPair, carCircles } from './entities/vehicles.js';
import { spawnTrafficCar, updateTrafficCar, maintainTraffic, panicTraffic } from './entities/traffic.js';
import { populateCrowd, updatePedestrian, frighten, knockDown } from './entities/pedestrians.js';
import { updateOfficer, updateCruiser } from './entities/police.js';
import { updateBullets, fireBullet, punchAt } from './entities/bullets.js';
import { placeWorldPickups, updatePickups } from './entities/pickups.js';

const HOSPITAL_FEE = 120;
const BUST_FEE = 90;

export function createWorld(options = {}) {
  const seed = options.seed ?? 7;
  const rng = makeRandom(seed);
  const layout = buildLayout(seed);
  const buildings = buildCityBuildings(layout, makeRandom(seed ^ 0x51ab));
  const props = buildCityProps(layout, makeRandom(seed ^ 0x77c1));
  const grid = buildStaticGrid(layout, buildings, props);
  const network = buildRoadNetwork(layout);

  const start = nearestSidewalkPoint(layout, layout.landmarks.home.x + 40, layout.landmarks.home.y + 40, 8);

  const world = {
    seed,
    rng,
    layout,
    buildings,
    props,
    grid,
    network,
    clock: 0,
    dayTimer: options.hour ?? 17.4,
    state: 'play',
    ending: false,
    shot: options.shot ?? null,
    autopilot: null,
    actions: {},
    input: null,
    audio: null,
    save: null,
    paused: false,
    frozen: false,
    deathTimer: 0,
    deathKind: '',
    vehicles: [],
    peds: [],
    bullets: [],
    pickups: [],
    bubbles: [],
    toasts: [],
    trafficClock: 0,
    completedMissions: new Set(),
    completedActivities: 0,
    missionBubbles: [],
    settings: {
      trafficCount: 18,
      pedCount: 38,
      zoom: 1.25,
      hour: options.hour ?? 17.4,
    },
    stats: {
      missionsCompleted: 0,
      sideJobs: 0,
      vehiclesWrecked: 0,
      pedsDowned: 0,
      shotsFired: 0,
      arrests: 0,
      deaths: 0,
      distance: 0,
      playTime: 0,
    },
    effects: createEffects(rng),
    wanted: createWanted(),
    mission: createMissionState(),
    activity: createActivityState(),
    dialogue: createDialogueState(),
    camera: createCamera(start.x, start.y, 1.25),
    player: createPlayer(start.x, start.y),
  };

  world.save = () => saveGame(world);
  world.toast = (text, seconds = 2.8) => pushToast(world, text, seconds);
  world.reportCrime = (kind, x, y) => reportCrime(world, kind, x, y);
  world.damagePlayer = (amount, fromX = null, fromY = null) => damagePlayer(world.player, amount, world, fromX, fromY);
  world.onPlayerDied = () => beginDeath(world, 'dead');
  world.onPlayerBusted = (officer) => beginDeath(world, 'busted', officer);
  world.alarm = (x, y, radius = 420) => {
    panicTraffic(world, x, y, radius);
    for (const ped of world.peds) {
      if (!ped.isCop && ped.alive && dist(ped.x, ped.y, x, y) < radius) frighten(ped, x, y, 6);
    }
  };
  world.reset = () => resetWorld(world);
  world.step = (dt) => stepWorld(world, dt);
  world.startActivity = () => tryStartActivity(world);
  world.beginFrame = (input, actions) => {
    world.input = input;
    world.actions = actions ?? {};
  };

  placeWorldPickups(world);
  world.peds.push(...populateCrowd(world, world.settings.pedCount, rng));
  seedTraffic(world, 14);
  placePlayerCar(world);
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;
  return world;
}

function pushToast(world, text, seconds) {
  world.toasts.push({ text, life: seconds, maxLife: seconds });
  if (world.toasts.length > 5) world.toasts.shift();
}

/** A parked sports car near the start so the first thing a new player can do is steal it. */
function placePlayerCar(world) {
  const home = world.layout.landmarks.home;
  const spot = nearestSidewalkPoint(world.layout, home.x - 70, home.y + 120, 10);
  const car = createVehicle('sports', spot.x, spot.y, 0, world.rng, {
    color: world.rng.pick(['#d94f3d', '#e8b23a', '#3f7fd0']),
    driver: null,
    spawnKind: 'parked',
  });
  world.vehicles.push(car);
  return car;
}

function seedTraffic(world, count) {
  const player = world.player;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const radius = 260 + (index % 5) * 120;
    const x = player.x + Math.cos(angle) * radius;
    const y = player.y + Math.sin(angle) * radius;
    spawnTrafficCar(world, x, y, world.rng);
  }
}

function resetWorld(world) {
  world.vehicles.length = 0;
  world.peds.length = 0;
  world.bullets.length = 0;
  world.pickups.length = 0;
  world.bubbles.length = 0;
  world.toasts.length = 0;
  world.effects.clearTransient();
  world.effects.marks.length = 0;
  world.clock = 0;
  world.deathTimer = 0;
  world.state = 'play';
  world.ending = false;
  clearWanted(world);
  world.mission = createMissionState();
  world.activity = createActivityState();
  world.completedMissions.clear();
  const start = nearestSidewalkPoint(world.layout, world.layout.landmarks.home.x + 40, world.layout.landmarks.home.y + 40, 8);
  world.player = createPlayer(start.x, start.y);
  world.camera.x = start.x;
  world.camera.y = start.y;
  placeWorldPickups(world);
  world.peds.push(...populateCrowd(world, world.settings.pedCount, world.rng));
  seedTraffic(world, 14);
  placePlayerCar(world);
}

// ---------------------------------------------------------------- controls

function readKeyboardControls(world) {
  const input = world.input;
  const player = world.player;
  if (!input) return { mx: 0, my: 0, run: false, fire: false, throttle: 0, steer: 0, handbrake: false };
  const mouse = input.mouse;
  const mouseWorldX = world.camera.x + (mouse.x - VIEW.width / 2) / world.camera.zoom;
  const mouseWorldY = world.camera.y + (mouse.y - VIEW.height / 2) / world.camera.zoom;
  const aim = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);
  if (player.mode === 'car') {
    const throttle = input.axisY() !== 0 ? -input.axisY() : 0;
    return {
      throttle: input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : input.isDown('KeyS') || input.isDown('ArrowDown') ? -1 : 0,
      steer: input.axisX(),
      handbrake: input.isDown('Space'),
      fire: mouse.down || input.isDown('KeyJ'),
      mx: 0,
      my: 0,
      run: false,
      aim,
    };
  }
  return {
    mx: input.axisX(),
    my: input.axisY(),
    run: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
    fire: mouse.down || input.isDown('KeyJ'),
    aim,
    throttle: 0,
    steer: 0,
    handbrake: false,
  };
}

function stepPlayer(world, controls, dt) {
  const player = world.player;
  if (!player.alive) return;

  if (player.mode === 'car' && player.car) {
    const car = player.car;
    driveCar(car, { throttle: controls.throttle ?? 0, steer: controls.steer ?? 0, handbrake: !!controls.handbrake }, dt, world.grid, world.effects);
    car.engineNoise = Math.min(1, Math.hypot(car.vx, car.vy) / 420);
    player.x = car.x;
    player.y = car.y;
    player.aim = controls.aim ?? car.angle;
    if (controls.fire) {
      const aim = player.aim;
      const weapon = currentWeapon(player);
      if (weapon && weapon.id !== 'fists') {
        fireBullet(world, { x: car.x, y: car.y, angle: aim }, aim, weapon.id, 'player');
      }
    }
    if (car.wrecked && car.health <= 0) {
      // A totalled car throws the driver out.
      exitCar(world, player);
    }
    return;
  }

  updatePlayerOnFoot(player, controls, dt, world);
  if (controls.fire) {
    const weapon = currentWeapon(player);
    if (weapon && weapon.id !== 'fists') {
      fireBullet(world, player, player.aim, weapon.id, 'player');
    } else if (player.punchTimer <= 0) {
      punchAt(world, player);
    }
  }
}

function handleActions(world) {
  const actions = world.actions;
  const player = world.player;
  if (!actions) return;
  if (actions.enter) {
    if (player.mode === 'car') exitCar(world, player);
    else enterNearestCar(world, player);
  }
  if (actions.weapon && player.mode === 'foot') {
    player.weapon = cycleWeapon(player);
    world.audio?.blip();
  }
  if (actions.activity) {
    world.tryActivity = true;
  }
  if (actions.dialogue) advanceDialogue(world);
  world.actions = {};
}

// ---------------------------------------------------------------- death and respawn

function beginDeath(world, kind, officer = null) {
  if (world.state !== 'play') return;
  world.state = kind === 'busted' ? 'busted' : 'dead';
  world.deathTimer = 0;
  world.deathKind = kind;
  const player = world.player;
  player.alive = false;
  if (kind === 'busted') {
    world.stats.arrests += 1;
    world.audio?.fail();
    world.toast('Busted — the patrol takes your gun money', 3.4);
  } else {
    world.stats.deaths += 1;
    world.audio?.fail();
    world.effects.explosion(player.x, player.y);
  }
  if (world.mission.state === 'running') failMission(world, kind === 'busted' ? 'You were arrested' : 'You died');
  world.save?.();
}

export function respawnPlayer(world) {
  const fee = world.deathKind === 'busted' ? BUST_FEE : HOSPITAL_FEE;
  const paid = Math.min(world.player.money, fee);
  world.player.money -= paid;
  const place = world.deathKind === 'busted' ? world.layout.landmarks.police : world.layout.landmarks.hospital;
  const spot = nearestSidewalkPoint(world.layout, place.x + 46, place.y + 46, 10);
  const player = world.player;
  player.x = spot.x;
  player.y = spot.y;
  player.vx = 0;
  player.vy = 0;
  player.health = 100;
  player.armour = 0;
  player.alive = true;
  player.mode = 'foot';
  player.car = null;
  player.invuln = 2.5;
  world.state = 'play';
  world.deathTimer = 0;
  clearWanted(world);
  world.effects.clearTransient();
  world.camera.x = spot.x;
  world.camera.y = spot.y;
  world.toast(world.deathKind === 'busted' ? `Released — $${paid} fine` : `Stitched up — $${paid} bill`, 3);
  world.save?.();
}

// ---------------------------------------------------------------- the step

export function stepWorld(world, dt) {
  if (world.paused || world.frozen) {
    world.effects.update(dt);
    world.clock += dt * 0.2;
    return;
  }

  if (world.state === 'dead' || world.state === 'busted') {
    world.deathTimer += dt;
    world.effects.update(dt);
    updateCamera(world.camera, world, dt);
    if (world.deathTimer > 2.2) respawnPlayer(world);
    return;
  }

  world.clock += dt;
  world.dayTimer = (world.dayTimer + dt / 190) % 24;
  world.stats.playTime += dt;

  handleActions(world);

  const controls = world.autopilot ? world.autopilot.update(world, dt) : readKeyboardControls(world);
  if (world.tryActivity) {
    world.tryActivity = false;
    world.startActivity?.();
  }
  stepPlayer(world, controls, dt);

  // Cars: player-driven, traffic and patrol all share the same chassis.
  for (const car of world.vehicles) {
    if (car.driver === 'traffic') updateTrafficCar(car, dt, world, world.effects);
    else if (car.driver === 'police') updateCruiser(car, dt, world);
    else if (car.driver === null) {
      car.vx *= 0.9;
      car.vy *= 0.9;
    }
    collideCarWithWorld(car, world.grid, world.effects);

    // Rubber on the tarmac whenever a car is sliding sideways.
    const rolling = Math.hypot(car.vx, car.vy);
    if (rolling > 110 && dist(car.x, car.y, world.player.x, world.player.y) < 1200) {
      const travel = Math.atan2(car.vy, car.vx);
      if (Math.abs(angleDiff(car.angle, travel)) > 0.09) {
        const rearX = car.x - Math.cos(car.angle) * car.spec.length * 0.34;
        const rearY = car.y - Math.sin(car.angle) * car.spec.length * 0.34;
        const sideX = Math.cos(car.angle + Math.PI / 2) * car.spec.width * 0.36;
        const sideY = Math.sin(car.angle + Math.PI / 2) * car.spec.width * 0.36;
        world.effects.skid(rearX + sideX, rearY + sideY, car.angle, 0.62);
        world.effects.skid(rearX - sideX, rearY - sideY, car.angle, 0.62);
      }
    }
  }

  // Cornering squeal: a hard turn at speed always leaves rubber, whether or not the chassis is
  // sliding far enough to trip the slip test above.
  const driven = world.player.car;
  if (driven && Math.abs(controls.steer) > 0.12 && Math.hypot(driven.vx, driven.vy) > 150) {
    const rearX = driven.x - Math.cos(driven.angle) * driven.spec.length * 0.34;
    const rearY = driven.y - Math.sin(driven.angle) * driven.spec.length * 0.34;
    const sideX = Math.cos(driven.angle + Math.PI / 2) * driven.spec.width * 0.36;
    const sideY = Math.sin(driven.angle + Math.PI / 2) * driven.spec.width * 0.36;
    world.effects.skid(rearX + sideX, rearY + sideY, driven.angle, 0.55);
    world.effects.skid(rearX - sideX, rearY - sideY, driven.angle, 0.55);
  }

  for (let a = 0; a < world.vehicles.length; a += 1) {
    for (let b = a + 1; b < world.vehicles.length; b += 1) {
      resolveCarPair(world.vehicles[a], world.vehicles[b], world.effects);
    }
  }
  if (world.player.mode === 'car' && world.player.car) {
    world.player.x = world.player.car.x;
    world.player.y = world.player.car.y;
  }

  // Bodies.
  for (const ped of world.peds) {
    if (ped.isCop) updateOfficer(ped, dt, world);
    else if (ped.hostile) updateThug(ped, dt, world);
    else updatePedestrian(ped, dt, world);
  }

  // A car that reaches a person puts them on the floor.
  runOverCheck(world);
  updateBullets(world, dt);
  updateWanted(world, dt);
  updateMission(world, dt);
  updateActivity(world, dt);
  updateDialogue(world, dt);
  updatePickups(world, dt);
  world.effects.update(dt);
  maintainTraffic(world, dt);
  updateCamera(world.camera, world, dt);
  world.camera.shake = Math.min(18, world.effects.shake);

  for (let index = world.toasts.length - 1; index >= 0; index -= 1) {
    world.toasts[index].life -= dt;
    if (world.toasts[index].life <= 0) world.toasts.splice(index, 1);
  }
  for (let index = world.bubbles.length - 1; index >= 0; index -= 1) {
    world.bubbles[index].life -= dt;
    if (world.bubbles[index].life <= 0) world.bubbles.splice(index, 1);
  }

  world.audio?.update(dt, world);
  cullBodies(world);
}

function updateThug(thug, dt, world) {
  if (!thug.alive) return;
  const player = world.player;
  const d = dist(thug.x, thug.y, player.x, player.y);
  const aim = Math.atan2(player.y - thug.y, player.x - thug.x);
  thug.angle = aim;
  thug.fireTimer -= dt;
  if (d > 150) {
    thug.x += Math.cos(aim) * 74 * dt;
    thug.y += Math.sin(aim) * 74 * dt;
    thug.stride = (thug.stride ?? 0) + dt * 9;
  } else if (thug.fireTimer <= 0) {
    thug.fireTimer = world.rng.range(0.7, 1.5);
    fireBullet(world, thug, aim + world.rng.range(-0.12, 0.12), 'pistol', 'thug');
  }
  thug.hitFlash = Math.max(0, (thug.hitFlash ?? 0) - dt * 3);
}

function runOverCheck(world) {
  const player = world.player;
  for (const car of world.vehicles) {
    const speed = Math.hypot(car.vx, car.vy);
    if (speed < 45) continue;
    const circles = carCircles(car);
    for (const ped of world.peds) {
      if (!ped.alive || ped.state === 'down') continue;
      for (const circle of circles) {
        if (dist(circle.x, circle.y, ped.x, ped.y) > circle.r + 7) continue;
        knockDown(ped, Math.atan2(car.vy, car.vx), speed);
        world.effects.sparks(ped.x, ped.y, Math.atan2(car.vy, car.vx), 4, '#ffe6b0');
        world.effects.shake = Math.min(14, world.effects.shake + 6);
        world.audio?.thud();
        if (car === player.car) {
          world.stats.pedsDowned += 1;
          world.reportCrime(ped.isCop ? 'killCop' : 'hitPed', ped.x, ped.y);
        }
        break;
      }
    }
  }
}

function cullBodies(world) {
  const player = world.player;
  for (let index = world.vehicles.length - 1; index >= 0; index -= 1) {
    const car = world.vehicles[index];
    if (car === player.car) continue;
    if (dist(car.x, car.y, player.x, player.y) > 2600) world.vehicles.splice(index, 1);
  }
  for (let index = world.peds.length - 1; index >= 0; index -= 1) {
    const ped = world.peds[index];
    if (ped.isCop || ped.hostile) continue;
    if (dist(ped.x, ped.y, player.x, player.y) > 2000) world.peds.splice(index, 1);
  }
  if (world.peds.length < world.settings.pedCount) {
    world.peds.push(...populateCrowd(world, Math.min(4, world.settings.pedCount - world.peds.length), world.rng));
  }
}

export { VEHICLE_TYPES, PLAYER, STEP, raiseAlarm, clamp };