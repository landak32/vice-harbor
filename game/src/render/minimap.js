// The minimap is drawn from the real tile grid, not a picture: the whole city is baked once
// into a small image at four pixels per tile, then a window of it is cropped around the player
// every frame and stamped with blips for the police, the mission marker and the landmarks.

import { TERRAIN, TILE } from '../config.js';
import { missionMarker } from '../game/missions.js';

const TILE_PX = 4;
const SPAN_TILES = 46;

const MAP_COLOURS = {
  [TERRAIN.ASPHALT]: '#2c3038',
  [TERRAIN.SIDEWALK]: '#6a6f76',
  [TERRAIN.LOT]: '#4b5057',
  [TERRAIN.GRASS]: '#3f6f3c',
  [TERRAIN.SAND]: '#cdb98c',
  [TERRAIN.WATER]: '#153048',
  [TERRAIN.PIER]: '#7c5f42',
  [TERRAIN.PARKING]: '#383c43',
};

export function buildMinimapImage(layout, buildings = []) {
  const canvas = document.createElement('canvas');
  canvas.width = layout.cols * TILE_PX;
  canvas.height = layout.rows * TILE_PX;
  const ctx = canvas.getContext('2d');
  for (let ty = 0; ty < layout.rows; ty += 1) {
    for (let tx = 0; tx < layout.cols; tx += 1) {
      const terrain = layout.terrain[ty * layout.cols + tx];
      ctx.fillStyle = MAP_COLOURS[terrain] ?? '#333';
      ctx.fillRect(tx * TILE_PX, ty * TILE_PX, TILE_PX, TILE_PX);
    }
  }
  // Buildings as darker blocks so the shape of the city reads at a glance.
  ctx.fillStyle = 'rgba(16,20,26,0.55)';
  for (const building of buildings) {
    ctx.fillRect(
      (building.x / TILE) * TILE_PX,
      (building.y / TILE) * TILE_PX,
      Math.max(1, (building.w / TILE) * TILE_PX),
      Math.max(1, (building.h / TILE) * TILE_PX),
    );
  }
  return canvas;
}

function worldToMap(player, box, x, y) {
  const scale = box.size / (SPAN_TILES * TILE);
  return {
    x: box.x + box.size / 2 + (x - player.x) * scale,
    y: box.y + box.size / 2 + (y - player.y) * scale,
  };
}

function blip(ctx, x, y, radius, colour, glow = false) {
  if (glow) {
    ctx.fillStyle = colour.replace('rgb', 'rgba').replace(')', ',0.28)');
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function playerArrow(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = '#f4f8ff';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5.2, 5.4);
  ctx.lineTo(0, 2.6);
  ctx.lineTo(-5.2, 5.4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function clampedMarker(ctx, player, box, marker, time) {
  const point = worldToMap(player, box, marker.x, marker.y);
  const centre = { x: box.x + box.size / 2, y: box.y + box.size / 2 };
  const radius = box.size / 2 - 10;
  const dx = point.x - centre.x;
  const dy = point.y - centre.y;
  const distance = Math.hypot(dx, dy);
  const clamped = distance > radius;
  const x = clamped ? centre.x + (dx / distance) * radius : point.x;
  const y = clamped ? centre.y + (dy / distance) * radius : point.y;
  const pulse = 1 + Math.sin(time * 4) * 0.16;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(-4 * pulse, -4 * pulse, 8 * pulse, 8 * pulse);
  ctx.strokeStyle = 'rgba(20,18,10,0.7)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-4 * pulse, -4 * pulse, 8 * pulse, 8 * pulse);
  ctx.restore();
}

export function drawMinimap(ctx, world, mapImage, box) {
  const { player } = world;
  const time = world.clock;
  const radius = box.size / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(box.x + radius, box.y + radius, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#10151c';
  ctx.fillRect(box.x, box.y, box.size, box.size);

  const sourceSpan = SPAN_TILES * TILE_PX;
  const sourceX = (player.x / TILE) * TILE_PX - sourceSpan / 2;
  const sourceY = (player.y / TILE) * TILE_PX - sourceSpan / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapImage, sourceX, sourceY, sourceSpan, sourceSpan, box.x, box.y, box.size, box.size);
  ctx.imageSmoothingEnabled = true;

  // Blips.
  for (const car of world.vehicles) {
    if (car.driver !== 'traffic') continue;
    if (Math.abs(car.x - player.x) > 1400 || Math.abs(car.y - player.y) > 1400) continue;
    const point = worldToMap(player, box, car.x, car.y);
    ctx.fillStyle = 'rgba(210,214,220,0.5)';
    ctx.fillRect(point.x - 1, point.y - 1, 2, 2);
  }

  for (const car of world.vehicles) {
    if (!car.police || !car.siren) continue;
    const point = worldToMap(player, box, car.x, car.y);
    const flash = Math.floor(time * 6) % 2 === 0 ? 'rgb(255,64,48)' : 'rgb(70,130,255)';
    blip(ctx, point.x, point.y, 3.4, flash, true);
  }

  for (const officer of world.peds) {
    if (!officer.isCop || officer.state === 'down' || officer.state === 'dead') continue;
    const point = worldToMap(player, box, officer.x, officer.y);
    blip(ctx, point.x, point.y, 2.8, 'rgb(90,140,255)');
  }

  const marker = missionMarker(world);
  if (marker) clampedMarker(ctx, player, box, marker, time);

  // Landmarks the player can navigate to.
  for (const [name, point] of Object.entries(world.layout.landmarks ?? {})) {
    if (name !== 'hospital' && name !== 'police') continue;
    const spot = worldToMap(player, box, point.x, point.y);
    ctx.fillStyle = name === 'hospital' ? 'rgba(120,220,160,0.9)' : 'rgba(130,170,255,0.9)';
    ctx.fillRect(spot.x - 2.5, spot.y - 2.5, 5, 5);
  }

  playerArrow(ctx, box.x + radius, box.y + radius, player.mode === 'car' && player.car ? player.car.angle : player.angle);

  // A faint glass sheen and the rim.
  const sheen = ctx.createLinearGradient(box.x, box.y, box.x, box.y + box.size);
  sheen.addColorStop(0, 'rgba(255,255,255,0.12)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = sheen;
  ctx.fillRect(box.x, box.y, box.size, box.size);
  ctx.restore();

  ctx.strokeStyle = 'rgba(240,246,255,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(box.x + radius, box.y + radius, radius - 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(8,12,18,0.55)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(box.x + radius, box.y + radius, radius + 2.5, 0, Math.PI * 2);
  ctx.stroke();

  // North marker.
  ctx.fillStyle = 'rgba(12,16,22,0.75)';
  ctx.beginPath();
  ctx.arc(box.x + radius, box.y + 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eef3fa';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('N', box.x + radius, box.y + 3);
}