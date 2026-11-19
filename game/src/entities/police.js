// The Harbor Patrol. Officers on foot run the pavement with a pistol; cruisers work the street
// and spill their crew out when they get close. Both are ordinary bodies to the bullet code, so
// they live in the crowd list and are tagged `isCop` rather than kept in a separate simulation.

import { VEHICLE_TYPES } from '../config.js';
import { angleDiff, clamp, dist, turnToward } from '../geometry.js';
import { resolveCircleAgainstWorld, raycastWorld } from '../city/collision.js';
import { createVehicle, carCircles, resolveCarPair } from './vehicles.js';
import { fireBullet } from './bullets.js';
import { nearestNode } from '../city/navigation.js';

const UNIFORM = ['#2b3a60', '#33456e', '#243050'];
const SKIN = ['#e8b48f', '#c98a5f', '#8d5a3c', '#f0c8a8', '#6b4430'];

export function createOfficer(x, y, rng, options = {}) {
  return {
    id: `cop-${Math.floor(rng.next() * 1e9)}`,
    kind: 'cop',
    isCop: true,
    x,
    y,
    angle: rng.range(0, Math.PI * 2),
    speed: 0,
    baseSpeed: rng.range(96, 118),
    hp: options.hp ?? 70,
    maxHp: 70,
    alive: true,
    state: 'chase',
    radius: 8,
    palette: {
      shirt: rng.pick(UNIFORM),
      pants: '#1b2130',
      skin: rng.pick(SKIN),
      hair: '#1a1a1c',
    },
    stride: rng.range(0, 6.28),
    hitFlash: 0,
    fireTimer: rng.range(0.7, 1.8),
    downTimer: 0,
    block: null,
    wp: 0,
    dir: 1,
    target: null,
    panic: 0,
    weapon: 'pistol',
  };
}

/** A cruiser with two officers aboard, placed at a road node away from the player. */
export function spawnCruiser(world, x, y, rng) {
  const angle = rng.range(0, Math.PI * 2);
  const car = createVehicle('police', x, y, angle, rng, {
    driver: 'police',
    police: true,
    siren: true,
    spawnKind: 'police',
  });
  car.crew = 2;
  car.deployed = false;
  car.pursuit = 0;
  const node = nearestNode(world.network, x, y);
  const link = node.links.length > 0 ? rng.pick(node.links) : null;
  if (link) {
    car.x = node.x + link.dx * 40;
    car.y = node.y + link.dy * 40;
    car.angle = Math.atan2(link.dy, link.dx);
  }
  return car;
}

export function spawnOfficer(world, x, y, rng) {
  const officer = createOfficer(x, y, rng);
  world.peds.push(officer);
  return officer;
}

/** Line of sight between two points, for deciding when an officer may open fire. */
export function hasLineOfSight(world, ax, ay, bx, by) {
  const angle = Math.atan2(by - ay, bx - ax);
  const reach = dist(ax, ay, bx, by);
  if (reach < 30) return true;
  const hit = raycastWorld(world.grid, ax, ay, Math.cos(angle), Math.sin(angle), Math.min(reach, 700));
  return !hit.hit || hit.distance >= reach - 12;
}

/** The officer's own movement and trigger discipline. */
export function updateOfficer(officer, dt, world) {
  officer.hitFlash = Math.max(0, officer.hitFlash - dt);
  if (!officer.alive) {
    officer.downTimer += dt;
    return;
  }
  if (officer.state === 'down') return;

  const player = world.player;
  const targetX = player.mode === 'car' && player.car ? player.car.x : player.x;
  const targetY = player.mode === 'car' && player.car ? player.car.y : player.y;
  const range = dist(officer.x, officer.y, targetX, targetY);
  const stars = world.wanted.stars;
  const stopRange = player.mode === 'car' ? 150 : 210;

  let moveX = 0;
  let moveY = 0;
  if (range > stopRange) {
    const angle = Math.atan2(targetY - officer.y, targetX - officer.x);
    moveX = Math.cos(angle);
    moveY = Math.sin(angle);
  } else if (range < stopRange * 0.55 && stars < 4) {
    const angle = Math.atan2(targetY - officer.y, targetX - officer.x);
    moveX = -Math.cos(angle) * 0.5;
    moveY = -Math.sin(angle) * 0.5;
  }

  // Sidestep so a group of officers does not stack into one silhouette.
  const sway = Math.sin(world.clock * 1.7 + officer.x * 0.01) * 0.35;
  moveX += -Math.sin(officer.angle) * sway;
  moveY += Math.cos(officer.angle) * sway;

  const magnitude = Math.hypot(moveX, moveY) || 1;
  const speed = officer.baseSpeed * (range > 420 ? 1 : 0.75);
  officer.x += (moveX / magnitude) * speed * dt;
  officer.y += (moveY / magnitude) * speed * dt;
  officer.stride += (speed / 16) * dt;
  officer.angle = turnToward(officer.angle, Math.atan2(targetY - officer.y, targetX - officer.x), 8 * dt);

  const body = { x: officer.x, y: officer.y };
  resolveCircleAgainstWorld(world.grid, body, officer.radius);
  officer.x = body.x;
  officer.y = body.y;
  officer.x = clamp(officer.x, 8, world.layout.width - 8);
  officer.y = clamp(officer.y, 8, world.layout.height - 8);

  officer.fireTimer -= dt;
  const canFire = stars >= 1 && range < 470 && officer.fireTimer <= 0 && hasLineOfSight(world, officer.x, officer.y, targetX, targetY);
  if (canFire) {
    officer.fireTimer = Math.max(0.55, 1.5 - stars * 0.14) + world.rng.range(0, 0.5);
    const spread = world.rng.range(-0.09, 0.09);
    const aim = Math.atan2(targetY - officer.y, targetX - officer.x) + spread;
    fireBullet(world, officer, aim, 'pistol', 'police');
    officer.state = 'engage';
  }
}

/**
 * Cruiser driving: aim straight at the player when close, otherwise pick the nearest road node
 * to the player and follow the street towards it. A wall ahead makes it steer around.
 */
export function updateCruiser(car, dt, world) {
  car.sirenPhase = (car.sirenPhase + dt * 2.6) % 1;
  const player = world.player;
  const targetX = player.mode === 'car' && player.car ? player.car.x : player.x;
  const targetY = player.mode === 'car' && player.car ? player.car.y : player.y;
  const range = dist(car.x, car.y, targetX, targetY);

  let aimX = targetX;
  let aimY = targetY;
  if (range > 520) {
    const node = nearestNode(world.network, targetX, targetY);
    aimX = node.x;
    aimY = node.y;
  }
  const desired = Math.atan2(aimY - car.y, aimX - car.x);
  let steer = clamp(angleDiff(car.angle, desired) / 0.55, -1, 1);

  // Wall ahead: turn away from it.
  const probe = raycastWorld(world.grid, car.x, car.y, Math.cos(car.angle), Math.sin(car.angle), 96);
  if (probe.hit) steer += Math.sin(car.id * 1.7) > 0 ? 0.85 : -0.85;

  const speed = Math.hypot(car.vx, car.vy);
  const topSpeed = Math.min(330, world.shot?.policeSpeed ?? 330);
  let throttle = speed < topSpeed && range > 90 ? 1 : 0;
  if (range < 55) throttle = -0.6;
  if (Math.abs(angleDiff(car.angle, desired)) > 1.5 && speed > 220) throttle = 0;

  car.throttle = throttle;
  car.steer = clamp(steer, -1, 1);
  car.brake = throttle < 0;

  // Deploy the crew when the cruiser has closed in, then keep driving interference.
  if (!car.deployed && range < 190 && car.crew > 0) {
    car.deployed = true;
    for (let index = 0; index < car.crew; index += 1) {
      const side = index === 0 ? 1 : -1;
      const spot = {
        x: car.x - Math.sin(car.angle) * 22 * side,
        y: car.y + Math.cos(car.angle) * 22 * side,
      };
      spawnOfficer(world, spot.x, spot.y, world.rng);
    }
    car.crew = 0;
  }
}

/** Ramming: a cruiser that touches the player's car damages it and shoves it. */
export function cruiserRam(world, dt) {
  const player = world.player;
  if (player.mode !== 'car' || !player.car) return;
  for (const car of world.vehicles) {
    if (car.spawnKind !== 'police' || car === player.car) continue;
    if (dist(car.x, car.y, player.car.x, player.car.y) < 90) {
      resolveCarPair(car, player.car, world.effects);
    }
  }
  void dt;
}

export const POLICE_CAR_BODY = VEHICLE_TYPES.police;
export const COP_RADIUS = 8;
export const COP_CIRCLES = carCircles;