// The crowd. Pedestrians walk the pavement rings around city blocks, cross the road at the
// corners where the crosswalks are painted, flee when something loud happens, and can be
// knocked flat by a car. Each one is given a small palette at spawn so a crowd never looks
// like a uniform.

import { TILE } from '../config.js';
import { clamp, dist, normalizeAngle, turnToward } from '../geometry.js';
import { resolveCircleAgainstWorld } from '../city/collision.js';

const SHIRTS = ['#e8574f', '#3f8fd6', '#f0c04a', '#4fbf9f', '#e8e2d0', '#b06ad0', '#e8843f', '#5f6b7a', '#f28fb0', '#7ad06a'];
const PANTS = ['#2f3440', '#3d4a5c', '#6b6255', '#8a8f96', '#4a3f38', '#2a2f38'];
const SKINS = ['#e8b48f', '#c98a5f', '#8d5a3c', '#f0c8a8', '#6b4430', '#d9a06f'];
const HAIR = ['#2a2118', '#4a3324', '#1a1a1c', '#8a6a3a', '#d9c9a8'];

let nextPedId = 1;

function paletteFor(rng) {
  return {
    shirt: rng.pick(SHIRTS),
    pants: rng.pick(PANTS),
    skin: rng.pick(SKINS),
    hair: rng.pick(HAIR),
  };
}

/** The eight pavement waypoints around a block, clockwise from the top-left corner. */
export function ringForBlock(block) {
  if (block.ring) return block.ring;
  const pad = TILE * 0.5;
  const x0 = block.x - pad;
  const y0 = block.y - pad;
  const x1 = block.x + block.w + pad;
  const y1 = block.y + block.h + pad;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  block.ring = [
    { x: x0, y: y0 },
    { x: cx, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: cy },
    { x: x1, y: y1 },
    { x: cx, y: y1 },
    { x: x0, y: y1 },
    { x: x0, y: cy },
  ];
  return block.ring;
}

export function createPedestrian(block, wpIndex, rng, options = {}) {
  const ring = ringForBlock(block);
  const point = ring[wpIndex % ring.length];
  return {
    id: nextPedId++,
    kind: options.kind ?? 'ped',
    x: point.x + rng.range(-4, 4),
    y: point.y + rng.range(-4, 4),
    angle: rng.range(0, Math.PI * 2),
    speed: 0,
    baseSpeed: rng.range(34, 58),
    state: 'walk',
    timer: 0,
    downTimer: 0,
    hp: 40,
    alive: true,
    block,
    wp: wpIndex % ring.length,
    dir: rng.chance(0.5) ? 1 : -1,
    palette: paletteFor(rng),
    stride: rng.range(0, 6.28),
    panic: 0,
    target: null,
    isCop: false,
    weapon: null,
    fireTimer: 0,
    radius: 8,
  };
}

/** The nearest waypoint index on a block's ring to a world point. */
function nearestWaypoint(block, x, y) {
  const ring = ringForBlock(block);
  let best = 0;
  let bestD = Infinity;
  for (let index = 0; index < ring.length; index += 1) {
    const d = dist(x, y, ring[index].x, ring[index].y);
    if (d < bestD) {
      bestD = d;
      best = index;
    }
  }
  return best;
}

/** A block that shares a road with this one, so a crossing stays at a corner. */
function neighbouringBlock(world, block, rng) {
  const candidates = world.layout.blocks.filter(
    (other) => Math.abs(other.i - block.i) + Math.abs(other.j - block.j) === 1,
  );
  if (candidates.length === 0) return null;
  return rng.pick(candidates);
}

/** Send a pedestrian fleeing from a point, for a few seconds. */
export function frighten(ped, fromX, fromY, seconds = 6) {
  if (!ped.alive || ped.state === 'down') return;
  ped.state = 'flee';
  ped.panic = Math.max(ped.panic, seconds);
  ped.angle = Math.atan2(ped.y - fromY, ped.x - fromX);
  ped.target = { x: ped.x + Math.cos(ped.angle) * 260, y: ped.y + Math.sin(ped.angle) * 260 };
}

/** Knock a pedestrian over. They get up again unless they were hit hard enough to die. */
export function knockDown(ped, impactAngle, force) {
  if (!ped.alive) return;
  ped.hp -= force;
  ped.state = 'down';
  ped.downTimer = ped.hp <= 0 ? 999 : 2.4 + Math.random() * 0.6;
  ped.angle = impactAngle;
  ped.speed = 0;
  if (ped.hp <= 0) ped.alive = false;
}

export function updatePedestrian(ped, dt, world) {
  if (ped.state === 'down') {
    ped.downTimer -= dt;
    if (ped.downTimer <= 0) {
      ped.state = 'walk';
      ped.hp = Math.max(20, ped.hp);
    }
    return;
  }
  if (ped.panic > 0) {
    ped.panic -= dt;
    if (ped.panic <= 0 && ped.state === 'flee') {
      ped.state = 'walk';
      ped.target = null;
      ped.wp = nearestWaypoint(ped.block, ped.x, ped.y);
    }
  }

  if (ped.state === 'flee') {
    const away = ped.target ?? { x: ped.x + Math.cos(ped.angle) * 200, y: ped.y + Math.sin(ped.angle) * 200 };
    const desired = Math.atan2(away.y - ped.y, away.x - ped.x);
    ped.angle = turnToward(ped.angle, desired, 7 * dt);
    ped.speed = 148;
    if (dist(ped.x, ped.y, away.x, away.y) < 26) {
      const block = neighbouringBlock(world, ped.block, world.rng) ?? ped.block;
      ped.block = block;
      ped.wp = nearestWaypoint(block, ped.x, ped.y);
      ped.target = null;
      ped.state = 'walk';
    }
  } else {
    const ring = ringForBlock(ped.block);
    const point = ring[ped.wp];
    const d = dist(ped.x, ped.y, point.x, point.y);
    if (d < 8) {
      // Reached a corner: sometimes step across the road to the next block instead.
      if (world.rng.chance(0.16)) {
        const next = neighbouringBlock(world, ped.block, world.rng);
        if (next) {
          ped.block = next;
          ped.wp = nearestWaypoint(next, ped.x, ped.y);
        } else {
          ped.wp = (ped.wp + ped.dir + ring.length) % ring.length;
        }
      } else if (world.rng.chance(0.1)) {
        ped.dir *= -1;
        ped.wp = (ped.wp + ped.dir + ring.length) % ring.length;
      } else {
        ped.wp = (ped.wp + ped.dir + ring.length) % ring.length;
      }
    }
    const target = ringForBlock(ped.block)[ped.wp];
    const desired = Math.atan2(target.y - ped.y, target.x - ped.x);
    ped.angle = turnToward(ped.angle, desired, 4.4 * dt);
    const targetSpeed = ped.baseSpeed * (Math.abs(normalizeAngle(desired - ped.angle)) < 0.5 ? 1 : 0.5);
    ped.speed += clamp(targetSpeed - ped.speed, -90 * dt, 90 * dt);
  }

  ped.x += Math.cos(ped.angle) * ped.speed * dt;
  ped.y += Math.sin(ped.angle) * ped.speed * dt;
  ped.stride += (ped.speed / 16) * dt;

  const body = { x: ped.x, y: ped.y };
  const hits = resolveCircleAgainstWorld(world.grid, body, ped.radius);
  if (hits.length > 0) {
    ped.x = body.x;
    ped.y = body.y;
    ped.wp = (ped.wp + ped.dir + 8) % 8;
  }
  ped.x = clamp(ped.x, 8, world.layout.width - 8);
  ped.y = clamp(ped.y, 8, world.layout.height - 8);
}

/** A whole crowd, spread over the blocks nearest to a point. */
export function populateCrowd(world, count, rng) {
  const peds = [];
  const blocks = world.layout.blocks.filter((block) => !block.parking);
  for (let index = 0; index < count; index += 1) {
    const block = rng.pick(blocks);
    peds.push(createPedestrian(block, rng.int(0, 7), rng));
  }
  return peds;
}
