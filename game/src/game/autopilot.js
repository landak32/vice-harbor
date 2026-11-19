// The autopilot behind the screenshot scenes. It produces exactly the same control object the
// keyboard does, so a captured frame is a real frame of play: the car really is being driven,
// the pistol really is aimed, the crowd really is reacting.

import { angleDiff, clamp, dist } from '../geometry.js';

function idleControls() {
  return { mx: 0, my: 0, run: false, fire: false, throttle: 0, steer: 0, handbrake: false, aim: 0 };
}

/** Holds a lane and a cruise speed, braking for anything directly ahead. */
function driveLane(world, shot, state) {
  const car = world.player.car;
  if (!car) return idleControls();
  const controls = idleControls();
  const speed = Math.hypot(car.vx, car.vy);
  const headingX = Math.cos(car.angle);
  const headingY = Math.sin(car.angle);
  const alongX = Math.abs(headingX) >= Math.abs(headingY);

  let error = 0;
  if (alongX && shot.laneY !== undefined) {
    error = (shot.laneY - car.y) * Math.sign(headingX || 1);
  } else if (!alongX && shot.laneX !== undefined) {
    error = (shot.laneX - car.x) * -Math.sign(headingY || 1);
  }
  controls.steer = clamp(error * 0.05, -0.75, 0.75);
  if (shot.name === 'chase') {
    // A fleeing driver weaves; it also lays rubber, which reads as speed on a still frame.
    controls.steer = clamp(controls.steer + Math.sin(state.time * 1.9) * 0.1, -1, 1);
  }

  // Look down the nose of the car for anything solid.
  let blocked = false;
  for (const other of world.vehicles) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = dx * headingX + dy * headingY;
    const side = Math.abs(dx * headingY - dy * headingX);
    if (ahead > 10 && ahead < 130 && side < 26) {
      blocked = true;
      break;
    }
  }

  const cruise = shot.cruise ?? 220;
  if (blocked) {
    controls.throttle = -0.7;
  } else if (speed < cruise) {
    controls.throttle = 1;
  } else if (speed > cruise * 1.18) {
    controls.throttle = -0.25;
  } else {
    controls.throttle = 0.25;
  }
  controls.aim = car.angle;
  return controls;
}

/** Walks toward a point, then stands there with the gun up. */
function walkTo(world, shot, state) {
  const player = world.player;
  const controls = idleControls();
  const target = shot.walkTo;
  if (target) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > 26) {
      controls.mx = dx / d;
      controls.my = dy / d;
      controls.run = d > 150;
    }
  }

  let aimAngle = shot.aim ?? player.aim ?? 0;
  let targetPed = null;
  let best = Infinity;
  for (const ped of world.peds) {
    if (!ped.alive || (!ped.isCop && !ped.hostile)) continue;
    const d = dist(ped.x, ped.y, player.x, player.y);
    if (d < best) {
      best = d;
      targetPed = ped;
    }
  }
  if (targetPed && best < 340) {
    aimAngle = Math.atan2(targetPed.y - player.y, targetPed.x - player.x);
    controls.fire = Boolean(shot.fireAtHostiles) && best < 300 && Math.abs(angleDiff(player.aim ?? 0, aimAngle)) < 0.5;
  }
  controls.aim = aimAngle;
  state.aim = aimAngle;
  return controls;
}

export function createAutopilot(name) {
  const state = { name, time: 0, aim: 0 };
  return {
    get name() {
      return state.name;
    },
    update(world, dt) {
      state.time += dt;
      const shot = world.shot ?? {};
      if (world.player.mode === 'car') return driveLane(world, shot, state);
      return walkTo(world, shot, state);
    },
  };
}