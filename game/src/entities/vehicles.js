// The garage and the arcade physics that moves it. A car keeps a heading and a velocity; the
// engine pushes along the heading, grip bleeds off the sideways part, and steering turns the
// heading faster the quicker the car is going. Two collision circles along the body stand in
// for the chassis, which is what lets a long truck feel heavy and a sports car feel loose.

import { TILE, VEHICLE_TYPES } from '../config.js';
import { clamp, damp } from '../geometry.js';
import { resolveCircleAgainstWorld } from '../city/collision.js';

let nextVehicleId = 1;

/** Two circles along the car's axis: the chassis test used for every impact. */
export function carCircles(car) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  const offset = car.spec.length * 0.22;
  const r = car.spec.width * 0.58;
  return [
    { x: car.x + fx * offset, y: car.y + fy * offset, r },
    { x: car.x - fx * offset, y: car.y - fy * offset, r },
  ];
}

export function createVehicle(typeId, x, y, angle, rng, options = {}) {
  const spec = VEHICLE_TYPES[typeId] ?? VEHICLE_TYPES.sedan;
  const color = options.color ?? rng.pick(spec.colors);
  return {
    id: nextVehicleId++,
    type: typeId,
    spec,
    name: spec.name,
    x,
    y,
    angle,
    vx: 0,
    vy: 0,
    health: spec.health,
    maxHealth: spec.health,
    wrecked: false,
    color,
    driver: options.driver ?? null,
    police: Boolean(options.police),
    siren: Boolean(options.siren),
    sirenPhase: rng.range(0, 1),
    brake: false,
    throttle: 0,
    steer: 0,
    wheelSpin: rng.range(0, 6.28),
    skid: 0,
    smokeClock: rng.range(0, 1),
    honkClock: 0,
    route: null,
    routeIndex: 0,
    laneNode: null,
    laneFrom: null,
    cruise: options.cruise ?? 0.55,
    panic: 0,
    stuck: 0,
    spawnKind: options.spawnKind ?? 'parked',
    taxiFare: null,
    label: options.label ?? null,
  };
}

/**
 * One physics step for one car. `input` carries throttle in -1..1, steer in -1..1 and the
 * handbrake; everything else (grip, mass, top speed) comes from the car's own spec.
 */
export function driveCar(car, input, dt, grid, effects) {
  if (car.driver === null && !car.rolling) {
    car.vx = damp(car.vx, 0, 6, dt);
    car.vy = damp(car.vy, 0, 6, dt);
    return;
  }
  const spec = car.spec;
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  const rx = -fy;
  const ry = fx;
  let forward = car.vx * fx + car.vy * fy;
  let lateral = car.vx * rx + car.vy * ry;

  const power = car.wrecked ? 0.26 : 1 - (1 - car.health / car.maxHealth) * 0.22;
  const throttle = clamp(input.throttle ?? 0, -1, 1);
  const steer = clamp(input.steer ?? 0, -1, 1);
  car.brake = throttle < -0.05 && forward > 12;
  car.throttle = throttle;

  if (throttle > 0.02) {
    const grip = 1 - clamp(Math.abs(lateral) / 420, 0, 0.45);
    forward += spec.accel * throttle * power * grip * dt;
  } else if (throttle < -0.02) {
    if (forward > 14) forward -= spec.brake * -throttle * dt;
    else forward -= spec.reverse * -throttle * power * dt;
  }

  const topSpeed = spec.maxSpeed * (car.wrecked ? 0.34 : 1);
  if (forward > topSpeed) forward = damp(forward, topSpeed, 3, dt);
  if (forward < -spec.reverse * 1.05) forward = -spec.reverse * 1.05;

  // Rolling resistance and air drag, in two parts so a coasting car still slows gently.
  forward -= Math.sign(forward) * Math.min(Math.abs(forward), (26 + Math.abs(forward) * 0.34) * dt);

  const speed = Math.abs(forward);
  const steerAuthority = clamp(speed / 120, 0, 1) * (1 - clamp(speed / (spec.maxSpeed * 1.15), 0, 0.42));
  const handbrake = Boolean(input.handbrake);
  car.angle += steer * spec.steer * steerAuthority * dt * Math.sign(forward || 1);

  const gripRate = handbrake ? spec.grip * 0.16 : spec.grip;
  lateral *= Math.exp(-gripRate * dt);
  if (handbrake && speed > 40) {
    lateral += -steer * speed * 0.42 * dt;
    car.skid = Math.min(1, car.skid + dt * 4);
  } else {
    car.skid = Math.max(0, car.skid - dt * 1.6);
  }

  car.vx = fx * forward + rx * lateral;
  car.vy = fy * forward + ry * lateral;
  car.wheelSpin += (forward * dt) / 12;

  car.x += car.vx * dt;
  car.y += car.vy * dt;

  if (Math.abs(lateral) > 42 && speed > 60 && effects) {
    const side = Math.sign(lateral) || 1;
    const wheel = { x: car.x - fx * car.spec.length * 0.3 + rx * side * car.spec.width * 0.5, y: car.y - fy * car.spec.length * 0.3 + ry * side * car.spec.width * 0.5 };
    effects.skid(wheel.x, wheel.y, car.angle, clamp(Math.abs(lateral) / 220, 0.15, 0.6));
  }

  collideCarWithWorld(car, grid, effects);
}

/** Push the chassis out of walls and props, and take damage for the speed that was lost. */
export function collideCarWithWorld(car, grid, effects) {
  for (const circle of carCircles(car)) {
    const body = { x: circle.x, y: circle.y };
    const hits = resolveCircleAgainstWorld(grid, body, circle.r);
    if (hits.length === 0) continue;
    const dx = body.x - circle.x;
    const dy = body.y - circle.y;
    car.x += dx;
    car.y += dy;
    const impact = Math.hypot(car.vx, car.vy);
    if (impact > 40) {
      const damage = impact * 0.055 * car.spec.mass;
      car.health = Math.max(0, car.health - damage);
      if (effects) {
        effects.sparks(car.x + dx, car.y + dy, Math.atan2(-dy, -dx), impact > 150 ? 10 : 4);
        effects.shake = Math.min(14, effects.shake + impact * 0.02);
      }
    }
    const nx = Math.hypot(dx, dy);
    if (nx > 0.001) {
      const dot = (car.vx * dx + car.vy * dy) / nx;
      if (dot < 0) {
        car.vx -= (dx / nx) * dot * 1.25;
        car.vy -= (dy / nx) * dot * 1.25;
      }
    }
    car.vx *= 0.72;
    car.vy *= 0.72;
  }
  if (car.health <= 0 && !car.wrecked) {
    car.wrecked = true;
    if (effects) {
      effects.smoke(car.x, car.y, 1.4);
      effects.sparks(car.x, car.y, car.angle, 18);
      effects.shake = Math.min(18, effects.shake + 8);
    }
  }
}

/**
 * Car against car: an impulse along the line of centres, weighted by mass, plus panel damage
 * for both. Fast nose-to-tail shunts spin the lighter car out.
 */
export function resolveCarPair(a, b, effects) {
  const circlesA = carCircles(a);
  const circlesB = carCircles(b);
  let touched = false;
  for (const ca of circlesA) {
    for (const cb of circlesB) {
      const dx = cb.x - ca.x;
      const dy = cb.y - ca.y;
      const reach = ca.r + cb.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= reach * reach) continue;
      const d = Math.sqrt(d2) || 0.001;
      const nx = dx / d;
      const ny = dy / d;
      const overlap = reach - d;
      const totalMass = a.spec.mass + b.spec.mass;
      const pushA = (b.spec.mass / totalMass) * overlap;
      const pushB = (a.spec.mass / totalMass) * overlap;
      a.x -= nx * pushA;
      a.y -= ny * pushA;
      b.x += nx * pushB;
      b.y += ny * pushB;

      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel < 0) {
        const restitution = 0.34;
        const impulse = (-(1 + restitution) * rel) / (1 / a.spec.mass + 1 / b.spec.mass);
        a.vx -= (impulse / a.spec.mass) * nx;
        a.vy -= (impulse / a.spec.mass) * ny;
        b.vx += (impulse / b.spec.mass) * nx;
        b.vy += (impulse / b.spec.mass) * ny;
        const force = Math.abs(rel);
        if (force > 45) {
          a.health = Math.max(0, a.health - force * 0.03);
          b.health = Math.max(0, b.health - force * 0.03);
          if (effects) {
            effects.sparks((ca.x + cb.x) / 2, (ca.y + cb.y) / 2, Math.atan2(ny, nx), force > 180 ? 12 : 5);
            effects.shake = Math.min(16, effects.shake + force * 0.03);
          }
        }
        // A hard hit twists both cars a little, which is what sells the weight.
        a.angle -= rel * 0.0004 * Math.sign(ny * nx + 0.001);
        b.angle += rel * 0.0004 * Math.sign(ny * nx + 0.001);
      }
      touched = true;
    }
  }
  for (const car of [a, b]) {
    if (car.health <= 0 && !car.wrecked) {
      car.wrecked = true;
      if (effects) effects.smoke(car.x, car.y, 1.6);
    }
  }
  return touched;
}

/** Where a car's driver sits, so the player pops out on the correct side. */
export function exitPointFor(car, side = 1) {
  const rx = -Math.sin(car.angle);
  const ry = Math.cos(car.angle);
  const offset = car.spec.width * 0.5 + 14;
  return { x: car.x + rx * offset * side, y: car.y + ry * offset * side };
}

/** The front bumper, where muzzle flashes and headlights are anchored. */
export function noseOf(car) {
  return {
    x: car.x + Math.cos(car.angle) * car.spec.length * 0.5,
    y: car.y + Math.sin(car.angle) * car.spec.length * 0.5,
  };
}

/** A parked car's lane offset, used when the world scatters cars along the curbs. */
export function parkBeside(x, y, angle, rng) {
  return {
    x: x + Math.cos(angle + Math.PI / 2) * rng.range(-6, 6),
    y: y + Math.sin(angle + Math.PI / 2) * rng.range(-6, 6),
    angle: angle + rng.range(-0.06, 0.06),
  };
}

/** The top speed of a car in pixels per second, for the speedometer and the AI. */
export function topSpeedOf(car) {
  return car.spec.maxSpeed * (car.wrecked ? 0.34 : 1);
}

/** The distance a car covers in one tile, used by the shot stagers to place them. */
export const CAR_TILE = TILE;
