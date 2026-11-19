// Civilian traffic. A traffic car follows the lane graph: it holds the edge it is on, steers for
// the next waypoint, brakes for a red light, for the car in front and for anyone standing in the
// road, and leans on the horn when it has been stuck for a moment. A shot nearby makes it panic:
// it swerves, speeds up and ignores the lights for a few seconds.

import { LANE_OFFSET, ROAD_HALF } from '../config.js';
import { angleDiff, clamp, dist } from '../geometry.js';
import { chooseNextLink, edgeWaypoints, lanePoint, lightState, nearestNode } from '../city/navigation.js';
import { createVehicle, driveCar, topSpeedOf } from './vehicles.js';

const TRAFFIC_TYPES = ['sedan', 'sedan', 'sedan', 'van', 'taxi', 'sports', 'truck'];

/** Put a car on the lane network at a node, heading down one of its links. */
export function placeOnNetwork(car, network, node, link) {
  car.trip = { from: node, to: link.node, axis: { dx: link.dx, dy: link.dy } };
  car.route = edgeWaypoints(node, link.node);
  car.routeIndex = 0;
  car.nextNode = link.node;
}

/** A new civilian car on a random street near a point. */
export function spawnTrafficCar(world, nearX, nearY, rng, options = {}) {
  const network = world.network;
  const node = nearestNode(network, nearX, nearY);
  const link = node.links.length > 0 ? rng.pick(node.links) : null;
  if (!link) return null;
  const typeId = options.type ?? rng.pick(TRAFFIC_TYPES);
  const start = lanePoint(node, link.node);
  const angle = Math.atan2(link.node.y - node.y, link.node.x - node.x);
  const car = createVehicle(typeId, start.x, start.y, angle, rng, {
    driver: options.driver ?? 'traffic',
    spawnKind: 'traffic',
    cruise: rng.range(0.45, 0.72),
  });
  placeOnNetwork(car, network, node, link);
  return car;
}

/** Extend the route when the car has eaten its waypoints. */
function advanceRoute(car, world) {
  const rng = world.rng;
  const trip = car.trip;
  if (!trip) return;
  if (car.routeIndex < car.route.length) return;
  const from = trip.to;
  const link = chooseNextLink(from, rng, trip.from);
  if (!link) {
    car.route = edgeWaypoints(trip.from, trip.to);
    car.routeIndex = 0;
    car.trip = { from: trip.to, to: trip.from, axis: { dx: -trip.axis.dx, dy: -trip.axis.dy } };
    return;
  }
  car.trip = { from, to: link.node, axis: { dx: link.dx, dy: link.dy } };
  car.route = edgeWaypoints(from, link.node);
  car.routeIndex = 0;
  car.nextNode = link.node;
}

/** Look ahead down the lane for anything that should make the car stop. */
function obstacleAhead(world, car, lookAhead = 76) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  let closest = Infinity;
  for (const other of world.vehicles) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * fx + dy * fy;
    if (along < 0 || along > lookAhead) continue;
    const across = Math.abs(-dx * fy + dy * fx);
    if (across > 26) continue;
    closest = Math.min(closest, along);
  }
  for (const ped of world.peds) {
    if (!ped.alive || ped.state === 'down') continue;
    const dx = ped.x - car.x;
    const dy = ped.y - car.y;
    const along = dx * fx + dy * fy;
    if (along < 0 || along > lookAhead) continue;
    const across = Math.abs(-dx * fy + dy * fx);
    if (across > 20) continue;
    closest = Math.min(closest, along);
  }
  if (world.player.mode === 'foot') {
    const dx = world.player.x - car.x;
    const dy = world.player.y - car.y;
    const along = dx * fx + dy * fy;
    const across = Math.abs(-dx * fy + dy * fx);
    if (along > 0 && along < lookAhead && across < 22) closest = Math.min(closest, along);
  }
  return closest;
}

/** Distance to the stop line of the junction the car is approaching. */
function stopLineAhead(car) {
  if (!car.trip) return Infinity;
  const node = car.trip.to;
  const d = dist(car.x, car.y, node.x, node.y);
  return d - ROAD_HALF;
}

export function updateTrafficCar(car, dt, world, effects) {
  advanceRoute(car, world);
  const rng = world.rng;
  car.honkClock = Math.max(0, car.honkClock - dt);
  if (car.panic > 0) car.panic -= dt;

  const target = car.route[car.routeIndex];
  if (target && dist(car.x, car.y, target.x, target.y) < 26) {
    car.routeIndex += 1;
  }
  const aim = car.route[Math.min(car.routeIndex, car.route.length - 1)];
  let desired = car.angle;
  if (aim) desired = Math.atan2(aim.y - car.y, aim.x - car.x);
  let steer = clamp(angleDiff(car.angle, desired) / 0.5, -1, 1);

  // Lane keeping: nudge toward the lane centre of the current road.
  if (car.trip && Math.abs(car.panic) <= 0) {
    const centre = car.trip.axis.dx !== 0
      ? { x: car.x, y: car.trip.from.y + (car.trip.axis.dy || 0) }
      : { x: car.trip.from.x, y: car.y };
    void centre;
  }

  const speed = Math.hypot(car.vx, car.vy);
  const cruise = topSpeedOf(car) * car.cruise * (car.panic > 0 ? 1.25 : 1);
  let throttle = speed < cruise ? 1 : 0;
  let handbrake = false;

  const ahead = obstacleAhead(world, car, 70 + speed * 0.12);
  if (ahead < 34 + speed * 0.18) {
    throttle = -1;
    if (car.honkClock <= 0 && speed < 40) {
      car.honkClock = rng.range(1.8, 3.6);
      if (world.audio) world.audio.horn(car.x, car.y);
    }
  }

  // Traffic lights, only for the junction being entered.
  if (car.trip && car.panic <= 0) {
    const state = lightState(car.trip.to, car.trip.axis.dx, car.trip.axis.dy, world.clock);
    const distance = stopLineAhead(car);
    if (state !== 'green' && distance < 46 && distance > -6 && speed > 12) {
      throttle = -1;
    } else if (state === 'red' && distance < 12 && distance > -20) {
      throttle = -1;
      handbrake = true;
    }
  }

  if (car.panic > 0) {
    steer = clamp(steer + Math.sin(world.clock * 2.4 + car.id) * 0.5, -1, 1);
  }

  driveCar(car, { throttle, steer, handbrake }, dt, world.grid, effects);

  // A car nudged off the network gets put back on the nearest lane rather than driving into a wall.
  if (!car.trip) {
    const node = nearestNode(world.network, car.x, car.y);
    if (node.links.length > 0) placeOnNetwork(car, world.network, node, rng.pick(node.links));
  }
  if (car.stuck > 5) {
    car.stuck = 0;
    const node = nearestNode(world.network, car.x, car.y);
    if (node.links.length > 0) {
      const link = rng.pick(node.links);
      const point = lanePoint(node, link.node);
      car.x = point.x;
      car.y = point.y;
      car.vx = 0;
      car.vy = 0;
      placeOnNetwork(car, world.network, node, link);
    }
  }
  if (speed < 8 && car.panic <= 0) car.stuck += dt;
  else car.stuck = 0;
}

/** Startle every civilian near a gunshot: they swerve and put their foot down. */
export function panicTraffic(world, x, y, radius = 420) {
  for (const car of world.vehicles) {
    if (car.spawnKind !== 'traffic') continue;
    if (dist(car.x, car.y, x, y) < radius) car.panic = Math.max(car.panic, 4.5);
  }
}

/** Keep the streets around the player populated, spawning out of sight and culling far away. */
export function maintainTraffic(world, dt) {
  const player = world.player;
  const rng = world.rng;
  world.trafficClock -= dt;
  const target = world.settings.trafficCount;
  let civilian = 0;
  for (const car of world.vehicles) if (car.spawnKind === 'traffic') civilian += 1;
  if (world.trafficClock <= 0 && civilian < target) {
    world.trafficClock = 0.55;
    const angle = rng.range(0, Math.PI * 2);
    const distance = rng.range(520, 900);
    const car = spawnTrafficCar(world, player.x + Math.cos(angle) * distance, player.y + Math.sin(angle) * distance, rng);
    if (car) world.vehicles.push(car);
  }
  for (let index = world.vehicles.length - 1; index >= 0; index -= 1) {
    const car = world.vehicles[index];
    if (car.spawnKind !== 'traffic') continue;
    const d = dist(car.x, car.y, player.x, player.y);
    if (d > 1900) world.vehicles.splice(index, 1);
  }
}

/** The nearest civilian car to a point, for missions that need a cab or a chase target. */
export function findNearestCar(world, x, y, filter) {
  let best = null;
  let bestD = Infinity;
  for (const car of world.vehicles) {
    if (filter && !filter(car)) continue;
    const d = dist(car.x, car.y, x, y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export const LANE_WIDTH = LANE_OFFSET * 2;