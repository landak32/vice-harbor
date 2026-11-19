// Bullets. Each one is a short segment swept through the world a few pixels at a time, so a
// fast round never tunnels through a person or a wall. Hits throw sparks (never blood), crack
// glass on a car and leave a puff of dust on brickwork.

import { WEAPONS } from '../config.js';
import { pointIsSolid } from '../city/collision.js';
import { dist, pointSegmentDistance2 } from '../geometry.js';

const STEP = 14;

export function createBullet(x, y, angle, weaponId, owner) {
  const weapon = WEAPONS[weaponId] ?? WEAPONS.pistol;
  const spread = (Math.random() - 0.5) * weapon.spread * 2;
  const a = angle + spread;
  return {
    x,
    y,
    px: x,
    py: y,
    vx: Math.cos(a) * weapon.speed,
    vy: Math.sin(a) * weapon.speed,
    life: weapon.life,
    damage: weapon.damage,
    owner,
    weapon: weaponId,
    dead: false,
  };
}

/** Fire one round for any shooter: player, cop or a mission actor. */
export function fireBullet(world, shooter, angle, weaponId, owner) {
  const weapon = WEAPONS[weaponId] ?? WEAPONS.pistol;
  const muzzle = 18;
  const x = shooter.x + Math.cos(angle) * muzzle;
  const y = shooter.y + Math.sin(angle) * muzzle;
  world.bullets.push(createBullet(x, y, angle, weaponId, owner));
  world.effects.muzzle(
    shooter.x + Math.cos(angle) * (muzzle + 6),
    shooter.y + Math.sin(angle) * (muzzle + 6),
    angle,
  );
  const listener = world.player ?? shooter;
  world.audio?.gunshot(Math.hypot(listener.x - x, listener.y - y));
  if (owner === 'player') {
    world.stats.shotsFired += 1;
    world.reportCrime('gunshot', shooter.x, shooter.y, true);
  }
  return weapon;
}

function hitPerson(world, bullet, x, y) {
  const people = world.peds;
  for (const ped of people) {
    if (!ped.alive) continue;
    const radius = ped.radius + 2;
    if (pointSegmentDistance2(ped.x, ped.y, bullet.px, bullet.py, x, y) > radius * radius) continue;
    const damage = bullet.damage * (ped.isCop ? 0.85 : 1);
    ped.hp -= damage;
    ped.hitFlash = 0.2;
    world.effects.sparks(x, y, Math.atan2(bullet.vy, bullet.vx), 4, '#ffe2a8');
    if (ped.isCop) {
      ped.state = ped.hp <= 0 ? 'down' : 'engage';
      ped.alive = ped.hp > 0;
      if (bullet.owner === 'player') {
        world.stats.copsHit += 1;
        world.reportCrime(ped.hp <= 0 ? 'copKill' : 'copHit', ped.x, ped.y);
        if (ped.hp <= 0) world.stats.copsKilled += 1;
      }
    } else {
      if (ped.hp <= 0) {
        ped.alive = false;
        ped.state = 'down';
        ped.downTimer = 999;
        if (bullet.owner === 'player') {
          world.stats.pedsKilled += 1;
          world.reportCrime('pedKill', ped.x, ped.y);
        }
      } else {
        ped.state = 'flee';
        ped.panic = 8;
        ped.target = { x: ped.x + Math.cos(bullet.vx > 0 ? 0 : Math.PI) * 200, y: ped.y + (bullet.vy > 0 ? 160 : -160) };
      }
    }
    return true;
  }
  return false;
}

function hitVehicle(world, bullet, x, y) {
  for (const car of world.vehicles) {
    if (car.driver === 'player' && bullet.owner === 'player') continue;
    const dx = x - car.x;
    const dy = y - car.y;
    const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const across = -dx * Math.sin(car.angle) + dy * Math.cos(car.angle);
    if (Math.abs(along) > car.spec.length * 0.5 + 2) continue;
    if (Math.abs(across) > car.spec.width * 0.5 + 2) continue;
    car.health = Math.max(0, car.health - bullet.damage * 0.42);
    world.effects.glass(x, y, Math.atan2(bullet.vy, bullet.vx));
    if (car.health <= 0 && !car.wrecked) {
      car.wrecked = true;
      world.effects.smoke(car.x, car.y, 1.5);
    }
    if (car.spawnKind === 'traffic' && bullet.owner === 'player') car.panic = 6;
    return true;
  }
  return false;
}

export function updateBullets(world, dt) {
  const bullets = world.bullets;
  for (let index = bullets.length - 1; index >= 0; index -= 1) {
    const bullet = bullets[index];
    bullet.life -= dt;
    if (bullet.life <= 0) {
      bullets.splice(index, 1);
      continue;
    }
    const travel = Math.hypot(bullet.vx, bullet.vy) * dt;
    const steps = Math.max(1, Math.ceil(travel / STEP));
    bullet.px = bullet.x;
    bullet.py = bullet.y;
    let done = false;
    for (let step = 0; step < steps && !done; step += 1) {
      const nx = bullet.x + (bullet.vx * dt) / steps;
      const ny = bullet.y + (bullet.vy * dt) / steps;
      if (pointIsSolid(world.grid, nx, ny)) {
        world.effects.sparks(nx, ny, Math.atan2(-bullet.vy, -bullet.vx), 5, '#ffd08a');
        world.effects.dust(nx, ny);
        done = true;
        break;
      }
      if (hitVehicle(world, bullet, nx, ny)) {
        done = true;
        break;
      }
      if (hitPerson(world, bullet, nx, ny)) {
        done = true;
        break;
      }
      if (bullet.owner !== 'player' && world.player.alive && world.player.mode === 'foot') {
        const player = world.player;
        const r = 12;
        if (dist(nx, ny, player.x, player.y) < r) {
          world.damagePlayer(bullet.damage, bullet.x, bullet.y);
          done = true;
          break;
        }
      }
      bullet.x = nx;
      bullet.y = ny;
    }
    if (done) bullets.splice(index, 1);
  }
}

/** Melee: a short arc in front of the player. Fists only, but they hurt a cop's pride. */
export function punchAt(world, player) {
  const reach = WEAPONS.fists.range;
  const angle = player.aim;
  let connected = false;
  for (const ped of world.peds) {
    if (!ped.alive) continue;
    const d = dist(player.x, player.y, ped.x, ped.y);
    if (d > reach + ped.radius) continue;
    const toPed = Math.atan2(ped.y - player.y, ped.x - player.x);
    if (Math.abs(Math.atan2(Math.sin(toPed - angle), Math.cos(toPed - angle))) > 0.9) continue;
    ped.hp -= WEAPONS.fists.damage;
    ped.hitFlash = 0.25;
    connected = true;
    world.effects.sparks(ped.x, ped.y, angle, 3, '#fff0c0');
    if (ped.hp <= 0) {
      ped.alive = false;
      ped.state = 'down';
      ped.downTimer = 999;
    } else if (ped.isCop) {
      ped.state = 'engage';
      world.reportCrime('copHit', ped.x, ped.y);
    } else {
      ped.state = 'flee';
      ped.panic = 7;
      ped.target = { x: ped.x + Math.cos(angle) * 220, y: ped.y + Math.sin(angle) * 220 };
    }
  }
  for (const car of world.vehicles) {
    if (dist(player.x, player.y, car.x, car.y) < car.spec.length * 0.6 + 12) {
      world.effects.sparks(player.x + Math.cos(angle) * 24, player.y + Math.sin(angle) * 24, angle, 4, '#fff0c0');
      connected = true;
    }
  }
  world.audio?.punch(connected);
  player.punchTimer = 0.22;
  return connected;
}

export const BULLET_TRAIL = 18;