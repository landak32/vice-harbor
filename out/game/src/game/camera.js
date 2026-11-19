// The follow camera. It trails the player, leans ahead in the direction of travel, shakes on an
// impact and never lets the view wander off the edge of the city.

import { VIEW, WORLD_H, WORLD_W } from '../config.js';
import { clamp, damp } from '../geometry.js';

export function createCamera(x, y, zoom = 1.25) {
  return { x, y, zoom, shake: 0, leadX: 0, leadY: 0, targetZoom: zoom };
}

export function updateCamera(camera, world, dt) {
  const player = world.player;
  const focus = player.mode === 'car' && player.car ? player.car : player;
  const vx = player.mode === 'car' && player.car ? player.car.vx : player.vx;
  const vy = player.mode === 'car' && player.car ? player.car.vy : player.vy;

  // Lead ahead of the direction of travel, but never so far that the player leaves the frame.
  const leadScale = 0.42;
  const leadX = clamp(vx * leadScale, -190, 190);
  const leadY = clamp(vy * leadScale, -150, 150);
  camera.leadX = damp(camera.leadX, leadX, 2.6, dt);
  camera.leadY = damp(camera.leadY, leadY, 2.6, dt);

  camera.zoom = damp(camera.zoom, camera.targetZoom, 3, dt);
  const halfW = VIEW.width / (2 * camera.zoom);
  const halfH = VIEW.height / (2 * camera.zoom);
  const targetX = clamp(focus.x + camera.leadX, halfW, WORLD_W - halfW);
  const targetY = clamp(focus.y + camera.leadY, halfH, WORLD_H - halfH);

  camera.x = damp(camera.x, targetX, 6.5, dt);
  camera.y = damp(camera.y, targetY, 6.5, dt);
  camera.x = clamp(camera.x, halfW, WORLD_W - halfW);
  camera.y = clamp(camera.y, halfH, WORLD_H - halfH);
}

/** The rectangle of the world the camera can see, padded so props do not pop at the edges. */
export function viewBounds(camera, pad = 140) {
  const halfW = VIEW.width / (2 * camera.zoom) + pad;
  const halfH = VIEW.height / (2 * camera.zoom) + pad;
  return {
    x0: camera.x - halfW,
    y0: camera.y - halfH,
    x1: camera.x + halfW,
    y1: camera.y + halfH,
  };
}

/** Applies the camera to a 2D context: one translate and one scale for the whole world pass. */
export function applyCamera(ctx, camera) {
  const shakeX = camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0;
  const shakeY = camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0;
  ctx.translate(VIEW.width / 2 + shakeX, VIEW.height / 2 + shakeY);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
}

/** World point to screen point, for HUD elements pinned to something in the city. */
export function worldToScreen(camera, x, y) {
  return {
    x: (x - camera.x) * camera.zoom + VIEW.width / 2,
    y: (y - camera.y) * camera.zoom + VIEW.height / 2,
  };
}