// The four staged scenes behind ?shot=<name>. Each one moves the same real world into a starting
// position and hands the player to an autopilot, then the capture script lets the simulation run
// for a few seconds so the frame is a genuine moment of play: cars mid-chase, people scattering,
// bullets in the air. Nothing here draws anything.

import { ROAD_COLS, ROAD_ROWS, TERRAIN, TILE } from './config.js';
import { dist } from './geometry.js';
import { createVehicle } from './entities/vehicles.js';
import { spawnCruiser, spawnOfficer } from './entities/police.js';
import { spawnTrafficCar } from './entities/traffic.js';
import { createPedestrian } from './entities/pedestrians.js';
import { giveWeapon } from './entities/player.js';
import { say } from './game/dialogue.js';
import { createAutopilot } from './game/autopilot.js';

export const SHOT_LIST = ['chase', 'foot', 'drive', 'mission'];

const roadX = (col) => (col + 1) * TILE;
const roadY = (row) => (row + 1) * TILE;

function seatPlayer(world, car) {
  const player = world.player;
  player.mode = 'car';
  player.car = car;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  car.driver = 'player';
  car.spawnKind = 'player';
  if (!world.vehicles.includes(car)) world.vehicles.push(car);
}

function blocksNear(world, x, y, count) {
  return world.layout.blocks
    .filter((block) => !block.parking)
    .slice()
    .sort((a, b) => {
      const da = dist(a.x + a.w / 2, a.y + a.h / 2, x, y);
      const db = dist(b.x + b.w / 2, b.y + b.h / 2, x, y);
      return da - db;
    })
    .slice(0, count);
}

function addPeople(world, x, y, count, options = {}) {
  const blocks = blocksNear(world, x, y, 4);
  for (let index = 0; index < count; index += 1) {
    const block = blocks[index % blocks.length];
    if (!block) break;
    const ped = createPedestrian(block, world.rng.int(0, 7), world.rng, options);
    // Pull them toward the player so the crowd is in frame rather than a block away.
    ped.x = x + world.rng.range(-190, 190);
    ped.y = y + world.rng.range(-150, 150);
    ped.angle = world.rng.range(0, Math.PI * 2);
    if (options.hostile) {
      ped.hostile = true;
      ped.hp = 60;
      ped.armed = true;
      ped.weapon = 'pistol';
      ped.state = 'idle';
    }
    world.peds.push(ped);
  }
  return blocks;
}

// The nearest crossing of two avenues, so a staged street corner always lands on real asphalt.
function gridIntersection(world, x, y) {
  let col = ROAD_COLS[0];
  let row = ROAD_ROWS[0];
  for (const candidate of ROAD_COLS) {
    if (Math.abs(roadX(candidate) - x) < Math.abs(roadX(col) - x)) col = candidate;
  }
  for (const candidate of ROAD_ROWS) {
    if (Math.abs(roadY(candidate) - y) < Math.abs(roadY(row) - y)) row = candidate;
  }
  return { x: roadX(col), y: roadY(row) };
}

function placeTraffic(world, x, y, angle, speed) {
  const car = spawnTrafficCar(world, x, y, world.rng);
  if (!car) return null;
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.vx = Math.cos(angle) * speed;
  car.vy = Math.sin(angle) * speed;
  if (!world.vehicles.includes(car)) world.vehicles.push(car);
  return car;
}

// The closest plank of the harbour pier to the docks landmark — water on one side, sheds on the other.
function pierSpot(world) {
  const { terrain, cols, rows } = world.layout;
  const anchor = world.layout.landmarks.pier;
  let best = { x: anchor.x, y: anchor.y };
  let bestD = Infinity;
  for (let ty = 0; ty < rows; ty += 1) {
    for (let tx = 0; tx < cols; tx += 1) {
      if (terrain[ty * cols + tx] !== TERRAIN.PIER) continue;
      const x = (tx + 0.5) * TILE;
      const y = (ty + 0.5) * TILE;
      const d = dist(x, y, anchor.x, anchor.y);
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return best;
}

function stageChase(world) {
  world.dayTimer = 22.7;
  const x = 3480;
  const y = roadY(16) + 24;
  const car = createVehicle('sports', x, y, Math.PI, world.rng, {
    driver: 'player',
    color: '#e0574a',
    spawnKind: 'player',
  });
  car.vx = -235;
  seatPlayer(world, car);
  world.player.armour = 45;

  const pursuit = [
    { dx: 104, dy: 34, tilt: -0.06 },
    { dx: 196, dy: -40, tilt: 0.08 },
    { dx: 318, dy: 22, tilt: -0.03 },
  ];
  for (const slot of pursuit) {
    const cruiser = spawnCruiser(world, x + slot.dx, y + slot.dy, world.rng);
    cruiser.x = x + slot.dx;
    cruiser.y = y + slot.dy;
    cruiser.angle = Math.PI + slot.tilt;
    cruiser.vx = -235;
    cruiser.vy = 0;
    cruiser.siren = true;
    cruiser.pursuit = 1;
    world.vehicles.push(cruiser);
  }
  // The pursuit has been running for a few blocks: rubber on the road sells that.
  for (let index = 0; index < 90; index += 1) {
    const px = x + 80 + index * 8;
    world.effects.skid(px, y + 16, Math.PI + Math.sin(index * 0.3) * 0.05, 0.5);
    world.effects.skid(px + 4, y + 32, Math.PI + Math.cos(index * 0.3) * 0.04, 0.44);
  }

  for (let index = 0; index < 3; index += 1) {
    placeTraffic(world, x - 160 - index * 130, y - 48, 0, 170);
  }
  for (let index = 0; index < 4; index += 1) {
    placeTraffic(world, x + 240 + index * 210, y - 48, 0, 190);
  }
  // Cars at the kerb, headlights off, so the street reads as a real avenue.
  for (let index = 0; index < 4; index += 1) {
    const parked = createVehicle(index === 1 ? 'van' : 'sedan', x - 120 - index * 96, y + 78, Math.PI, world.rng, {
      spawnKind: 'parked',
    });
    world.vehicles.push(parked);
  }
  addPeople(world, x - 320, y + 96, 12);

  world.wanted.heat = 128;
  world.wanted.stars = 3;
  world.wanted.peakStars = 3;
  world.wanted.spawnTimer = 12;

  world.mission.state = 'running';
  world.mission.active = { id: 'shot-chase', title: 'CROSS TOWN', objective: 'Shake the patrol before the bridge' };
  world.mission.objective = 'Shake the patrol before the bridge';
  world.mission.marker = { x: x - 980, y, label: 'Bridge', kind: 'objective' };

  world.camera.zoom = 1.28;
  world.camera.targetZoom = 1.28;
  world.shot = { name: 'chase', laneY: y, heading: 'west', cruise: 190, policeSpeed: 200, warm: 0 };
  world.autopilot = createAutopilot('chase');
  return world.shot;
}

function stageFoot(world) {
  world.dayTimer = 11.4;
  const anchor = world.layout.landmarks.tower;
  const inter = gridIntersection(world, anchor.x + 140, anchor.y + 160);
  const player = world.player;
  // East pavement of the avenue, a few paces south of the crossing, looking north.
  player.x = inter.x + 62;
  player.y = inter.y + 96;
  player.angle = -Math.PI / 2;
  player.aim = -Math.PI / 2;
  giveWeapon(player, 'pistol', 24);
  player.weapon = 'pistol';
  player.money = 18450;
  world.camera.zoom = 1.5;
  world.camera.targetZoom = 1.5;

  addPeople(world, player.x + 10, player.y + 120, 26);
  addPeople(world, player.x + 10, player.y - 150, 12);

  // Traffic in both directions on the avenue, and cross traffic at the lights.
  placeTraffic(world, inter.x + 24, inter.y + 210, -Math.PI / 2, 150);
  placeTraffic(world, inter.x + 24, inter.y + 420, -Math.PI / 2, 150);
  placeTraffic(world, inter.x + 24, inter.y - 150, -Math.PI / 2, 150);
  placeTraffic(world, inter.x - 24, inter.y - 230, Math.PI / 2, 140);
  placeTraffic(world, inter.x - 24, inter.y - 430, Math.PI / 2, 140);
  placeTraffic(world, inter.x - 24, inter.y + 330, Math.PI / 2, 140);
  placeTraffic(world, inter.x + 250, inter.y - 24, Math.PI, 130);
  placeTraffic(world, inter.x + 430, inter.y - 24, Math.PI, 130);
  placeTraffic(world, inter.x - 300, inter.y + 24, 0, 130);
  placeTraffic(world, inter.x - 470, inter.y + 24, 0, 130);
  const parked = createVehicle('taxi', inter.x + 58, inter.y + 260, -Math.PI / 2, world.rng, {
    spawnKind: 'parked',
  });
  world.vehicles.push(parked);

  world.mission.state = 'running';
  world.mission.active = { id: 'shot-foot', title: 'THE MESSAGE', objective: 'Find Odell behind the Kessler market' };
  world.mission.objective = 'Find Odell behind the Kessler market';
  world.mission.marker = {
    x: player.x + 26,
    y: player.y - 330,
    label: 'Odell',
    kind: 'objective',
  };

  world.shot = {
    name: 'foot',
    walkTo: { x: player.x, y: player.y - 90 },
    aim: -Math.PI / 2,
    fireAtHostiles: false,
  };
  world.autopilot = createAutopilot('foot');
  return world.shot;
}

function stageDrive(world) {
  world.dayTimer = 18.2;
  const x = roadX(76);
  const y = roadY(28) + 260;
  const car = createVehicle('sports', x + 24, y, -Math.PI / 2, world.rng, {
    driver: 'player',
    color: '#2fa3a0',
    spawnKind: 'player',
  });
  car.vy = -250;
  seatPlayer(world, car);

  for (let index = 0; index < 7; index += 1) {
    placeTraffic(world, x - 24, y - 170 - index * 165, Math.PI / 2, 170);
  }
  // One car far ahead in the player's lane, so the road reads as used but stays drivable.
  placeTraffic(world, x + 24, y - 980, -Math.PI / 2, 190);
  for (let index = 0; index < 3; index += 1) {
    placeTraffic(world, x - 24, y + 220 + index * 260, Math.PI / 2, 160);
  }
  placeTraffic(world, x - 24, y - 340, Math.PI / 2, 150);
  addPeople(world, x - 190, y - 120, 12);
  addPeople(world, x - 240, y + 60, 8);

  const van = createVehicle('van', x + 24, y - 620, -Math.PI / 2, world.rng, { spawnKind: 'traffic' });
  world.vehicles.push(van);

  // Dress the sand beside the road: palms leaning over the kerb, umbrellas and towels below.
  const palms = world.props.filter((prop) => prop.kind === 'palm').slice(0, 9);
  palms.forEach((prop, index) => {
    prop.x = x + 74 + (index % 2) * 34;
    prop.y = y - 380 + index * 88;
  });
  const umbrellas = world.props.filter((prop) => prop.kind === 'umbrella').slice(0, 5);
  umbrellas.forEach((prop, index) => {
    prop.x = x + 152 + (index % 3) * 30;
    prop.y = y - 300 + index * 140;
  });
  const benches = world.props.filter((prop) => prop.kind === 'bench').slice(0, 3);
  benches.forEach((prop, index) => {
    prop.x = x + 66;
    prop.y = y - 200 + index * 160;
  });
  addPeople(world, x + 120, y - 60, 14);

  world.wanted.heat = 0;
  world.wanted.stars = 0;

  world.mission.state = 'running';
  world.mission.active = { id: 'shot-drive', title: 'SUNSET RUN', objective: 'Take the Strip north to the marina' };
  world.mission.objective = 'Take the Strip north to the marina';
  world.mission.marker = { x, y: y - 1200, label: 'Marina', kind: 'objective' };

  world.camera.zoom = 1.05;
  world.camera.targetZoom = 1.05;
  world.shot = { name: 'drive', laneX: x + 24, heading: 'north', cruise: 250 };
  world.autopilot = createAutopilot('drive');
  return world.shot;
}

function stageMission(world) {
  world.dayTimer = 20.2;
  const spot = pierSpot(world);
  const player = world.player;
  player.x = spot.x - 40;
  player.y = spot.y;
  player.angle = 0;
  player.aim = 0;
  giveWeapon(player, 'smg', 90);
  player.weapon = 'smg';
  player.health = 34;
  player.armour = 12;
  player.money = 7420;
  world.camera.zoom = 1.42;
  world.camera.targetZoom = 1.42;

  // Pike's crew on the pier, two of them already down.
  addPeople(world, spot.x + 150, spot.y - 40, 6, { hostile: true, kind: 'thug' });
  addPeople(world, spot.x + 90, spot.y + 150, 4);
  const hostiles = world.peds.filter((ped) => ped.hostile);
  for (const hostile of hostiles) hostile.armed = true;
  if (hostiles[0]) {
    hostiles[0].state = 'down';
    hostiles[0].downTimer = 8;
  }
  if (hostiles[1]) {
    hostiles[1].state = 'down';
    hostiles[1].downTimer = 8;
  }

  // The patrol arrives along the quay road behind them.
  for (let index = 0; index < 3; index += 1) {
    const officer = spawnOfficer(world, spot.x + 250 + index * 44, spot.y - 150 + index * 52, world.rng);
    officer.angle = Math.PI;
    officer.armed = true;
  }
  for (let index = 0; index < 2; index += 1) {
    const cruiser = spawnCruiser(world, spot.x + 400 + index * 96, spot.y - 40, world.rng);
    cruiser.angle = Math.PI;
    cruiser.siren = true;
    world.vehicles.push(cruiser);
  }
  const van = createVehicle('van', spot.x + 240, spot.y + 80, 0.35, world.rng, {
    spawnKind: 'parked',
    color: '#4a5160',
  });
  world.vehicles.push(van);

  // Dock clutter pulled into frame: containers to shoot over, crates to trip on.
  const containers = world.props.filter((prop) => prop.kind === 'container').slice(0, 3);
  containers.forEach((prop, index) => {
    prop.x = spot.x + 130 + index * 64;
    prop.y = spot.y + (index % 2 === 0 ? -110 : 96);
    prop.angle = index % 2 === 0 ? 0 : 0.12;
  });
  const crates = world.props.filter((prop) => prop.kind === 'crate').slice(0, 3);
  crates.forEach((prop, index) => {
    prop.x = spot.x + 60 + index * 40;
    prop.y = spot.y - 60 + index * 22;
  });

  world.wanted.heat = 176;
  world.wanted.stars = 4;
  world.wanted.peakStars = 4;
  world.wanted.spawnTimer = 20;

  world.mission.state = 'running';
  world.mission.active = { id: 'shot-mission', title: 'THE HARBOUR JOB', objective: 'Take the manifest off Pike' };
  world.mission.objective = 'Take the manifest off Pike';
  world.mission.marker = { x: spot.x + 190, y: spot.y - 20, label: 'Pike', kind: 'target' };

  say(world, [
    {
      who: 'odell',
      text: 'Pike is already on the pier. Two of his boys went down — you are not walking out of here clean.',
    },
  ]);
  world.dialogue.shown = 999;

  world.shot = {
    name: 'mission',
    walkTo: { x: spot.x + 70, y: spot.y - 20 },
    fireAtHostiles: true,
  };
  world.autopilot = createAutopilot('mission');
  return world.shot;
}

export function prepareShot(world, name) {
  world.settings.pedCount = 52;
  world.settings.trafficCount = 26;
  world.paused = false;
  world.frozen = false;
  world.state = 'play';
  world.shotSafe = true;
  world.player.money = 18450;
  switch (name) {
    case 'chase':
      stageChase(world);
      break;
    case 'foot':
      stageFoot(world);
      break;
    case 'drive':
      stageDrive(world);
      break;
    case 'mission':
      stageMission(world);
      break;
    default:
      break;
  }
  // Whatever the staging picked up on the way in, the frame starts clean.
  if (Array.isArray(world.toasts)) world.toasts.length = 0;
  return world.shot ?? null;
}

export function warmUpShot(world, steps = 260) {
  for (let index = 0; index < steps; index += 1) world.step(1 / 60);
}
