// The heat meter. Crimes add heat, heat maps to one to five stars, and the stars only come down
// once nobody has seen the player for a while. It also decides how many cruisers and officers
// the patrol puts on the street, spawning them out of sight and reaping them when they fall far
// behind.

import { CRIME, WANTED_DECAY, WANTED_STEPS } from '../config.js';
import { dist } from '../geometry.js';
import { hasLineOfSight, spawnCruiser, spawnOfficer } from '../entities/police.js';

const MAX_HEAT = 300;

export function createWanted() {
  return {
    heat: 0,
    stars: 0,
    decayTimer: 0,
    spawnTimer: 1.2,
    fleeTimer: 0,
    bustedTimer: 0,
    lastCrimeX: 0,
    lastCrimeY: 0,
    peakStars: 0,
    escapedAt: -1,
  };
}

/** Heat to stars, on the thresholds in the config. */
export function starsForHeat(heat) {
  let stars = 0;
  for (let index = 1; index < WANTED_STEPS.length; index += 1) {
    if (heat >= WANTED_STEPS[index]) stars = index;
  }
  return stars;
}

/** Every crime funnels through here, from any system. */
export function reportCrime(world, kind, x, y) {
  const gain = CRIME[kind] ?? 0;
  if (gain <= 0) return;
  const wanted = world.wanted;
  wanted.heat = Math.min(MAX_HEAT, wanted.heat + gain);
  wanted.decayTimer = 0;
  wanted.lastCrimeX = x;
  wanted.lastCrimeY = y;
  const before = wanted.stars;
  wanted.stars = starsForHeat(wanted.heat);
  wanted.peakStars = Math.max(wanted.peakStars, wanted.stars);
  if (wanted.stars > before) {
    world.audio?.alert(wanted.stars);
    world.toast(`${'★'.repeat(wanted.stars)} Harbor Patrol alerted`);
  }
}

/** Something loud happened: everyone nearby runs or swerves. */
export function raiseAlarm(world, x, y, radius = 420) {
  for (const ped of world.peds) {
    if (ped.isCop || !ped.alive) continue;
    if (dist(ped.x, ped.y, x, y) > radius) continue;
    ped.state = 'flee';
    ped.panic = Math.max(ped.panic, 7);
    ped.target = { x: ped.x + (ped.x - x) * 1.4, y: ped.y + (ped.y - y) * 1.4 };
  }
  for (const car of world.vehicles) {
    if (car.spawnKind === 'traffic' && dist(car.x, car.y, x, y) < radius * 1.2) {
      car.panic = Math.max(car.panic, 4.5);
    }
  }
}

/** A road node out of sight, at a sensible distance, for the next unit to appear at. */
function hiddenSpawnPoint(world, minDistance = 620, maxDistance = 1250) {
  const player = world.player;
  const nodes = world.network.nodes;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const node = world.rng.pick(nodes);
    if (node.links.length === 0) continue;
    const d = dist(node.x, node.y, player.x, player.y);
    if (d < minDistance || d > maxDistance) continue;
    return node;
  }
  return world.network.nodes[world.rng.int(0, nodes.length - 1)];
}

function countUnits(world) {
  let cruisers = 0;
  let officers = 0;
  for (const car of world.vehicles) if (car.spawnKind === 'police') cruisers += 1;
  for (const ped of world.peds) if (ped.isCop && ped.alive) officers += 1;
  return { cruisers, officers };
}

/** How many of each the current star rating justifies. */
export function patrolStrength(stars) {
  return {
    cruisers: [0, 1, 2, 3, 4, 5][stars],
    officers: [0, 1, 2, 3, 4, 6][stars],
  };
}

export function updateWanted(world, dt) {
  const wanted = world.wanted;
  const player = world.player;

  // Any officer with eyes on the player keeps the heat alive.
  let seen = false;
  for (const ped of world.peds) {
    if (!ped.isCop || !ped.alive) continue;
    if (dist(ped.x, ped.y, player.x, player.y) < 620 && hasLineOfSight(world, ped.x, ped.y, player.x, player.y)) {
      seen = true;
      break;
    }
  }
  for (const car of world.vehicles) {
    if (seen) break;
    if (car.spawnKind !== 'police') continue;
    if (dist(car.x, car.y, player.x, player.y) < 560) seen = true;
  }

  if (seen) {
    wanted.decayTimer = 0;
  } else {
    wanted.decayTimer += dt;
    if (wanted.decayTimer > 7 && wanted.heat > 0) {
      const rate = WANTED_DECAY * (1 + wanted.decayTimer * 0.06);
      wanted.heat = Math.max(0, wanted.heat - rate * dt);
      const stars = starsForHeat(wanted.heat);
      if (stars < wanted.stars) {
        wanted.stars = stars;
        if (stars === 0) {
          wanted.escapedAt = world.clock;
          world.toast('You lost the patrol');
          world.audio?.chime();
        }
      }
    }
  }

  // Spawning and reaping.
  wanted.spawnTimer -= dt;
  if (wanted.spawnTimer <= 0) {
    const strength = patrolStrength(wanted.stars);
    const units = countUnits(world);
    wanted.spawnTimer = 1.5;
    if (units.cruisers < strength.cruisers) {
      const node = hiddenSpawnPoint(world);
      if (node) world.vehicles.push(spawnCruiser(world, node.x, node.y, world.rng));
      wanted.spawnTimer = 2.4;
    } else if (units.officers < strength.officers) {
      const node = hiddenSpawnPoint(world, 480, 900);
      if (node) {
        const side = world.rng.range(-60, 60);
        spawnOfficer(world, node.x + side, node.y, world.rng);
      }
      wanted.spawnTimer = 2.2;
    }
  }

  for (let index = world.vehicles.length - 1; index >= 0; index -= 1) {
    const car = world.vehicles[index];
    if (car.spawnKind !== 'police') continue;
    if (dist(car.x, car.y, player.x, player.y) > 2400) world.vehicles.splice(index, 1);
  }
  for (let index = world.peds.length - 1; index >= 0; index -= 1) {
    const ped = world.peds[index];
    if (!ped.isCop) continue;
    const far = dist(ped.x, ped.y, player.x, player.y) > 2200;
    if (far || (!ped.alive && ped.downTimer > 26)) world.peds.splice(index, 1);
  }

  // Getting grabbed on foot is an arrest, not a kill.
  wanted.bustedTimer = Math.max(0, wanted.bustedTimer - dt * 0.55);
  if (wanted.stars > 0 && player.mode === 'foot' && player.alive) {
    for (const ped of world.peds) {
      if (!ped.isCop || !ped.alive || ped.state === 'down') continue;
      if (dist(ped.x, ped.y, player.x, player.y) > 34) continue;
      wanted.bustedTimer += dt;
      if (wanted.bustedTimer > 1.5) {
        world.onPlayerBusted(ped);
        return;
      }
      break;
    }
  }
}

/** Wipes the meter after a death or an arrest. */
export function clearWanted(world) {
  world.wanted.heat = 0;
  world.wanted.stars = 0;
  world.wanted.decayTimer = 0;
  world.wanted.bustedTimer = 0;
}

/** The size of the police presence right now, for the HUD and the soundtrack. */
export function policePresence(world) {
  const units = countUnits(world);
  return { ...units, total: units.cruisers + units.officers };
}