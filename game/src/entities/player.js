// The player character: on foot with acceleration, friction, eight-direction facing and a
// footstep bob, and behind the wheel of any car in the city. This module owns the body and
// its gun; the world owns the consequences.

import { PLAYER, WEAPONS } from '../config.js';
import { clamp, damp, normalizeAngle, turnToward } from '../geometry.js';
import { resolveCircleAgainstWorld } from '../city/collision.js';
import { exitPointFor } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    aim: -Math.PI / 2,
    mode: 'foot',
    car: null,
    health: PLAYER.maxHealth,
    armour: 0,
    weapon: 'fists',
    unlocked: new Set(['fists']),
    ammo: { pistol: 0, smg: 0 },
    fireTimer: 0,
    punchTimer: 0,
    stride: 0,
    bob: 0,
    invuln: 0,
    alive: true,
    money: 250,
    recoil: 0,
    hurtFlash: 0,
    lastCrime: 0,
    sprinting: false,
    palette: { shirt: '#2f8f86', pants: '#27333c', skin: '#c98d63', hair: '#221913' },
  };
}

/** Give the player a weapon and some rounds: the reward for most missions. */
export function giveWeapon(player, weaponId, rounds = 0) {
  player.unlocked.add(weaponId);
  if (rounds > 0) player.ammo[weaponId] = (player.ammo[weaponId] ?? 0) + rounds;
  if (player.weapon === 'fists') player.weapon = weaponId;
}

/** Cycle to the next weapon the player actually owns. */
export function cycleWeapon(player) {
  const order = ['fists', 'pistol', 'smg'];
  const owned = order.filter((id) => player.unlocked.has(id));
  if (owned.length <= 1) return player.weapon;
  const index = owned.indexOf(player.weapon);
  return owned[(index + 1) % owned.length];
}

export function updatePlayerOnFoot(player, controls, dt, world) {
  const inputX = controls.mx ?? 0;
  const inputY = controls.my ?? 0;
  const magnitude = Math.hypot(inputX, inputY);
  const moving = magnitude > 0.08;
  const sprinting = Boolean(controls.run) && moving;
  player.sprinting = sprinting;
  const topSpeed = sprinting ? PLAYER.sprintSpeed : PLAYER.runSpeed;

  if (moving) {
    const nx = inputX / magnitude;
    const ny = inputY / magnitude;
    player.vx += nx * PLAYER.accel * dt;
    player.vy += ny * PLAYER.accel * dt;
    if (player.fireTimer <= 0) player.aim = Math.atan2(ny, nx);
  } else {
    const speed = Math.hypot(player.vx, player.vy);
    const drop = Math.min(speed, PLAYER.friction * dt);
    if (speed > 0.01) {
      player.vx -= (player.vx / speed) * drop;
      player.vy -= (player.vy / speed) * drop;
    }
  }

  const speed = Math.hypot(player.vx, player.vy);
  if (speed > topSpeed) {
    player.vx = (player.vx / speed) * damp(speed, topSpeed, 8, dt);
    player.vy = (player.vy / speed) * damp(speed, topSpeed, 8, dt);
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const body = { x: player.x, y: player.y };
  resolveCircleAgainstWorld(world.grid, body, PLAYER.radius);
  player.x = clamp(body.x, 10, world.layout.width - 10);
  player.y = clamp(body.y, 10, world.layout.height - 10);

  // Facing: the gun direction when shooting, otherwise the direction of travel.
  if (player.fireTimer > 0) {
    player.angle = turnToward(player.angle, player.aim, 14 * dt);
  } else if (speed > 12) {
    player.angle = turnToward(player.angle, Math.atan2(player.vy, player.vx), 12 * dt);
  }

  player.stride += (speed / 26) * dt;
  player.bob = Math.sin(player.stride * 2) * clamp(speed / 200, 0, 1);
  player.recoil = Math.max(0, player.recoil - dt * 6);
  player.invuln = Math.max(0, player.invuln - dt);
  player.hurtFlash = Math.max(0, player.hurtFlash - dt * 1.6);
  player.fireTimer = Math.max(0, player.fireTimer - dt);
  player.punchTimer = Math.max(0, player.punchTimer - dt);
}

/** The point a muzzle flash and a bullet come from. */
export function muzzlePoint(player) {
  const reach = 20;
  return {
    x: player.x + Math.cos(player.aim) * reach,
    y: player.y + Math.sin(player.aim) * reach,
  };
}

export function damagePlayer(player, amount, world, fromX = null, fromY = null) {
  if (player.invuln > 0 || !player.alive) return;
  // Staged screenshot scenes soften incoming fire so the frame survives to be captured.
  let left = world && world.shotSafe ? amount * 0.35 : amount;
  if (player.armour > 0) {
    const absorbed = Math.min(player.armour, left * 0.72);
    player.armour -= absorbed;
    left -= absorbed;
  }
  player.health = Math.max(0, player.health - left);
  player.hurtFlash = 1;
  if (fromX !== null) {
    player.angle = Math.atan2(fromY - player.y, fromX - player.x);
  }
  world.camera.shake = Math.min(16, world.camera.shake + amount * 0.28);
  if (player.health <= 0 && player.alive) {
    player.alive = false;
    player.mode = 'dead';
    world.onPlayerDied();
  }
}

/** Climb into the nearest car within reach, stealing it if someone is driving. */
export function enterNearestCar(world, player, radius = 64) {
  let best = null;
  let bestD = Infinity;
  for (const car of world.vehicles) {
    if (car.wrecked && car.health <= 0) continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    const reach = radius + car.spec.length * 0.3;
    if (d < reach && d < bestD) {
      bestD = d;
      best = car;
    }
  }
  if (!best) return false;
  const wasOccupied = best.driver !== null && best.driver !== 'player';
  if (best.taxiFare) {
    // A cab with a fare in it is a taxi job, not a car to steal.
    world.toast('Press F to start the fare');
    return false;
  }
  best.driver = 'player';
  best.spawnKind = best.spawnKind === 'traffic' ? 'stolen' : best.spawnKind;
  player.mode = 'car';
  player.car = best;
  player.x = best.x;
  player.y = best.y;
  if (wasOccupied) world.reportCrime('carjack', best.x, best.y);
  world.audio?.doorClose();
  return true;
}

/** Step out on the kerb side, or on the other side if that is a wall. */
export function exitCar(world, player) {
  const car = player.car;
  if (!car) return;
  car.driver = null;
  car.throttle = 0;
  car.steer = 0;
  let spot = exitPointFor(car, 1);
  const probe = { x: spot.x, y: spot.y };
  const hits = resolveCircleAgainstWorld(world.grid, probe, PLAYER.radius);
  if (hits.length > 0) {
    spot = exitPointFor(car, -1);
  }
  player.x = spot.x;
  player.y = spot.y;
  player.vx = 0;
  player.vy = 0;
  player.angle = car.angle + Math.PI / 2;
  player.aim = player.angle;
  player.mode = 'foot';
  player.car = null;
  player.invuln = 0.6;
  world.audio?.doorOpen();
}

/** What the player's current weapon is, as a full descriptor. */
export function currentWeapon(player) {
  return WEAPONS[player.weapon] ?? WEAPONS.fists;
}

/** True when the player has something to shoot with and rounds for it. */
export function canShoot(player) {
  const weapon = currentWeapon(player);
  if (weapon.melee) return true;
  return (player.ammo[weapon.id] ?? 0) > 0;
}

/** The little heading line the HUD uses for the compass. */
export function facingLabel(angle) {
  const a = normalizeAngle(angle);
  if (a > -Math.PI / 4 && a <= Math.PI / 4) return 'E';
  if (a > Math.PI / 4 && a <= (3 * Math.PI) / 4) return 'S';
  if (a > (3 * Math.PI) / 4 || a <= -(3 * Math.PI) / 4) return 'W';
  return 'N';
}