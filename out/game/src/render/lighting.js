// Light. The city runs on a 24-hour clock; this module turns the hour into a tint over the
// world and then paints the lights that survive the dark — lamp pools, headlight cones, the
// red-blue wash of a police light bar and the odd warm window.

import { VIEW } from '../config.js';

export function hourOf(world) {
  return ((world.dayTimer % 24) + 24) % 24;
}

export function nightAmount(world) {
  const hour = hourOf(world);
  if (hour >= 21 || hour < 5) return 1;
  if (hour >= 19.5) return (hour - 19.5) / 1.5;
  if (hour < 6.5) return 1 - (hour - 5) / 1.5;
  return 0;
}

export function sunsetAmount(world) {
  const hour = hourOf(world);
  if (hour >= 17 && hour < 20) return Math.sin(((hour - 17) / 3) * Math.PI);
  if (hour >= 5 && hour < 7.5) return Math.sin(((hour - 5) / 2.5) * Math.PI) * 0.8;
  return 0;
}

function screenOf(camera, x, y) {
  return {
    x: (x - camera.x) * camera.zoom + VIEW.width / 2,
    y: (y - camera.y) * camera.zoom + VIEW.height / 2,
  };
}

function inView(camera, x, y, margin = 120) {
  const point = screenOf(camera, x, y);
  return point.x > -margin && point.x < VIEW.width + margin && point.y > -margin && point.y < VIEW.height + margin;
}

/** The colour of the air: a warm wash at sunset, a deep blue at night. */
export function drawAmbient(ctx, world, camera, night) {
  const sunset = sunsetAmount(world);
  if (sunset > 0.02) {
    const gradient = ctx.createLinearGradient(0, 0, VIEW.width * 0.4, VIEW.height);
    gradient.addColorStop(0, `rgba(255,146,66,${0.56 * sunset})`);
    gradient.addColorStop(0.55, `rgba(255,104,86,${0.40 * sunset})`);
    gradient.addColorStop(1, `rgba(116,84,158,${0.38 * sunset})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // The sun itself, low over the water in the west.
    const sun = ctx.createRadialGradient(VIEW.width, VIEW.height * 0.2, 10, VIEW.width, VIEW.height * 0.2, VIEW.width * 0.6);
    sun.addColorStop(0, `rgba(255,214,150,${0.34 * sunset})`);
    sun.addColorStop(0.4, `rgba(255,158,92,${0.16 * sunset})`);
    sun.addColorStop(1, 'rgba(255,140,80,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  if (night > 0.02) {
    const gradient = ctx.createLinearGradient(0, 0, VIEW.width * 0.2, VIEW.height);
    gradient.addColorStop(0, `rgba(9,14,40,${0.66 * night})`);
    gradient.addColorStop(1, `rgba(16,20,50,${0.58 * night})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

function lampPool(ctx, camera, x, y, radius, alpha) {
  const point = screenOf(camera, x, y);
  const r = radius * camera.zoom;
  const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, r);
  gradient.addColorStop(0, `rgba(255,222,160,${alpha})`);
  gradient.addColorStop(0.45, `rgba(255,200,130,${alpha * 0.42})`);
  gradient.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function headlightCone(ctx, camera, car, alpha) {
  const point = screenOf(camera, car.x, car.y);
  const zoom = camera.zoom;
  const reach = (car.type === 'truck' ? 200 : 175) * zoom;
  const halfWidth = 38 * zoom;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(car.angle);
  const gradient = ctx.createLinearGradient(0, 0, reach, 0);
  gradient.addColorStop(0, `rgba(255,240,205,${0.13 * alpha})`);
  gradient.addColorStop(0.55, `rgba(255,232,180,${0.05 * alpha})`);
  gradient.addColorStop(1, 'rgba(255,225,170,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(car.spec.length * 0.4 * zoom, -10 * zoom);
  ctx.lineTo(reach, -halfWidth);
  ctx.lineTo(reach, halfWidth);
  ctx.lineTo(car.spec.length * 0.4 * zoom, 10 * zoom);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function sirenWash(ctx, camera, car, time) {
  const point = screenOf(camera, car.x, car.y);
  const phase = Math.floor(time * 6) % 2;
  const colour = phase === 0 ? '255,58,48' : '70,130,255';
  const radius = 96 * camera.zoom;
  const gradient = ctx.createRadialGradient(point.x, point.y, 4, point.x, point.y, radius);
  gradient.addColorStop(0, `rgba(${colour},0.30)`);
  gradient.addColorStop(0.5, `rgba(${colour},0.10)`);
  gradient.addColorStop(1, `rgba(${colour},0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function beamSweep(ctx, camera, x, y, angle, length, alpha) {
  const point = screenOf(camera, x, y);
  const reach = length * camera.zoom;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);
  const gradient = ctx.createLinearGradient(0, 0, reach, 0);
  gradient.addColorStop(0, `rgba(255,240,200,${alpha})`);
  gradient.addColorStop(1, 'rgba(255,235,190,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(reach, -26);
  ctx.lineTo(reach, 26);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Additive light pass, drawn after the world and after the ambient tint. */
export function drawLights(ctx, world, camera, night) {
  if (night <= 0.03) return;
  const time = world.clock;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const prop of world.props) {
    if (prop.kind !== 'lamp') continue;
    if (!inView(camera, prop.x, prop.y, 220)) continue;
    const flicker = 0.94 + 0.06 * Math.sin(time * 3 + prop.x);
    lampPool(ctx, camera, prop.x, prop.y, 108, 0.34 * night * flicker);
  }

  for (const car of world.vehicles) {
    if (!inView(camera, car.x, car.y, 320)) continue;
    if (car.wrecked) continue;
    headlightCone(ctx, camera, car, night);
    if (car.police && car.siren) sirenWash(ctx, camera, car, time);
  }

  // The two harbour cranes carry a working floodlight.
  for (const prop of world.props) {
    if (prop.kind !== 'crane') continue;
    if (!inView(camera, prop.x, prop.y, 400)) continue;
    beamSweep(ctx, camera, prop.x, prop.y, Math.sin(time * 0.25 + prop.rot) * 0.8 - 0.4, 220, 0.10 * night);
  }

  // Muzzle flashes and explosions already draw additively; a warm wash near them helps.
  for (const flash of world.effects.flashes) {
    if (!inView(camera, flash.x, flash.y, 120)) continue;
    lampPool(ctx, camera, flash.x, flash.y, 62, 0.5);
  }

  ctx.restore();
}

/** A soft vignette, deeper as health drops. */
export function drawVignette(ctx, world) {
  const player = world.player;
  const hurt = 1 - Math.max(0, Math.min(1, player.health / 100));
  const strength = 0.18 + hurt * 0.55;
  const gradient = ctx.createRadialGradient(
    VIEW.width / 2,
    VIEW.height / 2,
    VIEW.height * 0.32,
    VIEW.width / 2,
    VIEW.height / 2,
    VIEW.height * 0.86,
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(${hurt > 0.5 ? '90,6,10' : '4,6,12'},${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}