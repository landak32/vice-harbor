// The renderer itself: one function that takes the world and draws a frame. It sets up the
// camera transform, paints the ground, sorts everything standing on it by its feet so nearer
// things overlap farther ones, then lays the night over the top and the HUD over that.

import { TILE, VIEW } from '../config.js';
import { roundRect } from './shapes.js';
import { buildMinimapImage } from './minimap.js';
import { missionMarker } from '../game/missions.js';
import { drawGround } from './ground.js';
import { drawBuilding } from './buildings.js';
import { drawProp } from './props.js';
import { drawVehicle } from './vehicles.js';
import { drawPedestrian, drawPlayer } from './characters.js';
import { drawBullets, drawEffects, drawPlayerPool } from './particles.js';
import { drawAmbient, drawLights, nightAmount, drawVignette } from './lighting.js';
import { drawHud } from './hud.js';
import { drawBanner, drawControls, drawEnding, drawPause, drawStats, drawTitle } from './screens.js';

export function createScene(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  return { canvas, ctx, mapImage: null, dpr: 1, sortable: [], banner: null };
}

export function attachMinimap(scene, world) {
  scene.mapImage = buildMinimapImage(world.layout, world.buildings);
}

function markerBeacon(ctx, marker, time) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.save();
  const halo = ctx.createRadialGradient(marker.x, marker.y, 2, marker.x, marker.y, 70 + pulse * 18);
  halo.addColorStop(0, 'rgba(242,193,78,0.34)');
  halo.addColorStop(0.55, 'rgba(242,193,78,0.12)');
  halo.addColorStop(1, 'rgba(242,193,78,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,226,140,${0.55 + pulse * 0.35})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, 26 + pulse * 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(242,193,78,0.9)';
  ctx.beginPath();
  ctx.moveTo(marker.x, marker.y - 12);
  ctx.lineTo(marker.x + 10, marker.y);
  ctx.lineTo(marker.x, marker.y + 12);
  ctx.lineTo(marker.x - 10, marker.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function collectSortable(scene, world, view) {
  const list = scene.sortable;
  list.length = 0;
  const night = nightAmount(world);
  const time = world.clock;
  const swell = 140;

  for (const building of world.buildings) {
    if (building.x + building.w < view.x0 - swell || building.x > view.x1 + swell) continue;
    if (building.y + building.h + building.depth < view.y0 - swell || building.y > view.y1 + swell) continue;
    list.push({ y: building.y + building.h + building.depth * 0.35, kind: 'building', ref: building });
  }

  for (const prop of world.props) {
    if (prop.x < view.x0 - 60 || prop.x > view.x1 + 60) continue;
    if (prop.y < view.y0 - 60 || prop.y > view.y1 + 60) continue;
    list.push({ y: prop.y + (prop.kind === 'palm' ? 4 : 2), kind: 'prop', ref: prop });
  }

  for (const car of world.vehicles) {
    if (car.x < view.x0 - 120 || car.x > view.x1 + 120) continue;
    if (car.y < view.y0 - 120 || car.y > view.y1 + 120) continue;
    list.push({ y: car.y + 6, kind: 'car', ref: car });
  }

  for (const ped of world.peds) {
    if (ped.x < view.x0 - 40 || ped.x > view.x1 + 40) continue;
    if (ped.y < view.y0 - 40 || ped.y > view.y1 + 40) continue;
    list.push({ y: ped.y + 4, kind: 'ped', ref: ped });
  }

  for (const pickup of world.pickups) {
    if (pickup.taken) continue;
    list.push({ y: pickup.y, kind: 'pickup', ref: pickup });
  }

  if (world.player.mode === 'foot') {
    list.push({ y: world.player.y + 5, kind: 'player', ref: world.player });
  }

  list.sort((a, b) => a.y - b.y);

  for (const item of list) {
    if (item.kind === 'building') drawBuilding(scene.ctx, item.ref, night);
    else if (item.kind === 'prop') drawProp(scene.ctx, item.ref, night);
    else if (item.kind === 'car') drawVehicle(scene.ctx, item.ref, night, time);
    else if (item.kind === 'ped') drawPedestrian(scene.ctx, item.ref, time);
    else if (item.kind === 'player') {
      drawPlayerPool(scene.ctx, item.ref);
      drawPlayer(scene.ctx, item.ref, time);
    } else if (item.kind === 'pickup') drawPickup(scene.ctx, item.ref, time);
  }
}

function drawPickup(ctx, pickup, time) {
  const bob = Math.sin(time * 3 + pickup.x * 0.01) * 2;
  ctx.save();
  ctx.translate(pickup.x, pickup.y + bob);
  const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
  const colour = pickup.kind === 'health' ? '120,230,150' : pickup.kind === 'armour' ? '120,170,240' : '242,193,78';
  glow.addColorStop(0, `rgba(${colour},0.5)`);
  glow.addColorStop(1, `rgba(${colour},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(${colour},0.95)`;
  if (pickup.kind === 'health' || pickup.kind === 'armour') {
    ctx.fillRect(-7, -2.5, 14, 5);
    ctx.fillRect(-2.5, -7, 5, 14);
  } else if (pickup.kind === 'weapon') {
    ctx.fillRect(-8, -2, 16, 4);
    ctx.fillRect(-2, 0, 4, 6);
  } else {
    ctx.font = 'bold 14px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 1);
  }
  ctx.restore();
}

// The player is always the brightest thing on screen: a soft halo, a breathing ring and a chevron
// pointing the way they face, so the eye never has to hunt for them in a busy street.
function drawPlayerMarker(ctx, world, time) {
  const player = world.player;
  const body = player.car ?? player;
  const pulse = 0.55 + 0.45 * Math.sin(time * 4.2);
  const radius = player.car ? 26 : 15;

  ctx.save();
  ctx.translate(body.x, body.y);

  const halo = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius * 2.1);
  halo.addColorStop(0, 'rgba(126,240,222,0.16)');
  halo.addColorStop(1, 'rgba(126,240,222,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(190,255,246,${0.5 + 0.35 * pulse})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, radius + pulse * 4, 0, Math.PI * 2);
  ctx.stroke();

  if (player.car) {
    // A clean white edge around the body so the player's car never disappears into traffic.
    const spec = player.car.spec;
    ctx.rotate(player.car.angle);
    ctx.strokeStyle = 'rgba(240,255,252,0.55)';
    ctx.lineWidth = 1.6;
    roundRect(ctx, -spec.length * 0.56, -spec.width * 0.62, spec.length * 1.12, spec.width * 1.24, 6);
    ctx.stroke();
    ctx.rotate(-player.car.angle);

    // Speed streaks: the only motion cue a top-down camera can give a fast car.
    const speed = Math.hypot(player.car.vx, player.car.vy);
    if (speed > 220) {
      ctx.rotate(player.car.angle);
      ctx.strokeStyle = `rgba(232,246,255,${Math.min(0.3, (speed - 150) / 520)})`;
      ctx.lineWidth = 2;
      for (let lane = -1; lane <= 1; lane += 1) {
        const offset = lane * spec.width * 0.34;
        ctx.beginPath();
        ctx.moveTo(-spec.length * 0.7, offset);
        ctx.lineTo(-spec.length * (0.7 + speed / 900), offset);
        ctx.stroke();
      }
      ctx.rotate(-player.car.angle);
    }
  }

  ctx.rotate(body.angle);
  ctx.beginPath();
  ctx.moveTo(radius + 24, 0);
  ctx.lineTo(radius + 9, -9);
  ctx.lineTo(radius + 9, 9);
  ctx.closePath();
  ctx.fillStyle = '#eafff9';
  ctx.strokeStyle = 'rgba(6,20,24,0.75)';
  ctx.lineWidth = 1.6;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function renderScene(scene, world, ui) {
  const ctx = scene.ctx;
  const { camera } = world;
  const zoom = camera.zoom;
  const night = nightAmount(world);
  const time = world.clock;

  ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
  ctx.fillStyle = '#0b1016';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  const shakeX = camera.shakeX ?? 0;
  const shakeY = camera.shakeY ?? 0;
  const view = {
    x0: camera.x - VIEW.width / (2 * zoom),
    x1: camera.x + VIEW.width / (2 * zoom),
    y0: camera.y - VIEW.height / (2 * zoom),
    y1: camera.y + VIEW.height / (2 * zoom),
  };

  ctx.save();
  ctx.translate(VIEW.width / 2 + shakeX, VIEW.height / 2 + shakeY);
  ctx.scale(zoom, zoom);
  ctx.translate(-camera.x, -camera.y);

  drawGround(ctx, world, view);
  drawEffects(ctx, world);

  const marker = missionMarker(world);
  if (marker) markerBeacon(ctx, marker, time);

  collectSortable(scene, world, view);
  drawBullets(ctx, world);
  drawPlayerMarker(ctx, world, time);

  ctx.restore();

  // Light and air.
  drawAmbient(ctx, world, camera, night);
  drawLights(ctx, world, camera, night);
  drawVignette(ctx, world);

  if (world.state === 'title') {
    drawTitle(ctx, world, ui.items, ui.selection, time);
    return;
  }

  drawHud(ctx, world, scene.mapImage);

  if (ui.banner && ui.banner.alpha > 0) {
    drawBanner(ctx, ui.banner.text, ui.banner.alpha, ui.banner.accent);
  }

  if (world.state === 'paused') {
    drawPause(ctx, world, ui.items, ui.selection);
  } else if (world.state === 'dead' || world.state === 'busted') {
    drawEnding(ctx, world);
  } else if (world.state === 'controls') {
    drawControls(ctx);
  } else if (world.state === 'stats') {
    drawStats(ctx, world);
  } else if (world.state === 'loading') {
    ctx.fillStyle = '#0b1016';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#f2c14e';
    ctx.textAlign = 'center';
    ctx.font = '600 16px ui-monospace, monospace';
    ctx.fillText('BUILDING THE CITY…', VIEW.width / 2, VIEW.height / 2);
    ctx.textAlign = 'left';
  }
}

export { TILE };