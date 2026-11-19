// Buildings, drawn from above with a deliberate sense of height: a soft shadow on the pavement,
// the south wall dropped down below the roof, and the roof itself carrying the parapet, the air
// conditioning, the vents, the water tanks and the faded name of whoever owns it.

import { DISTRICT_STYLE, DISTRICTS, FONT_DISPLAY } from '../config.js';
import { hash2 } from '../rng.js';

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawShadow(ctx, building) {
  const depth = building.depth;
  ctx.fillStyle = 'rgba(10,14,22,0.26)';
  roundRect(ctx, building.x + depth * 0.32 + 7, building.y + depth * 0.42 + 9, building.w, building.h + depth, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(10,14,22,0.14)';
  roundRect(ctx, building.x + depth * 0.2 + 3, building.y + depth * 0.3 + 5, building.w + 4, building.h + depth, 3);
  ctx.fill();
}

function drawWall(ctx, building, night) {
  const { x, y, w, h, depth, wall } = building;
  const gradient = ctx.createLinearGradient(0, y + h, 0, y + h + depth);
  gradient.addColorStop(0, wall);
  gradient.addColorStop(0.65, wall);
  gradient.addColorStop(1, 'rgba(12,16,22,0.95)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y + h, w, depth);

  // A darker plinth where the wall meets the street.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x, y + h + depth - 3, w, 3);

  // Windows on the street face: dark by day, warm and lit at night.
  const columns = Math.max(2, Math.floor(w / 26));
  const cellW = w / columns;
  for (let row = 0; row < Math.max(1, Math.round(building.windowRows / 2)); row += 1) {
    const wy = y + h + 6 + row * ((depth - 8) / Math.max(1, Math.round(building.windowRows / 2)));
    if (wy + 7 > y + h + depth - 3) break;
    for (let column = 0; column < columns; column += 1) {
      const lit = hash2(building.x + column * 13, building.y + row * 7) < building.lit;
      if (night > 0.35 && lit) {
        ctx.fillStyle = 'rgba(255,206,130,0.85)';
      } else {
        ctx.fillStyle = 'rgba(20,28,38,0.55)';
      }
      ctx.fillRect(x + 4 + column * cellW + cellW * 0.22, wy, cellW * 0.5, 6);
    }
  }
}

function drawRoof(ctx, building, night) {
  const { x, y, w, h } = building;
  const gradient = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
  gradient.addColorStop(0, building.roof);
  gradient.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);

  // Parapet: a raised lip around the roof, read as a lighter edge and a dark inner line.
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);

  // Gravel speckle.
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  const speckles = Math.min(26, (w * h) / 900);
  for (let index = 0; index < speckles; index += 1) {
    const sx = x + 8 + hash2(x + index, y) * (w - 16);
    const sy = y + 8 + hash2(y + index, x + 3) * (h - 16);
    ctx.fillRect(sx, sy, 2, 2);
  }

  if (building.glass) {
    const glass = ctx.createLinearGradient(x, y, x + w, y + h);
    glass.addColorStop(0, 'rgba(150,220,235,0.24)');
    glass.addColorStop(0.5, 'rgba(60,120,160,0.10)');
    glass.addColorStop(1, 'rgba(180,240,255,0.20)');
    ctx.fillStyle = glass;
    ctx.fillRect(x + 6, y + 6, w - 12, h - 12);
    ctx.strokeStyle = 'rgba(210,245,255,0.16)';
    ctx.lineWidth = 1;
    for (let gx = x + 18; gx < x + w - 10; gx += 18) {
      ctx.beginPath();
      ctx.moveTo(gx, y + 6);
      ctx.lineTo(gx, y + h - 6);
      ctx.stroke();
    }
  }

  // Rooftop plant.
  for (const vent of building.vents) {
    ctx.fillStyle = 'rgba(28,32,38,0.75)';
    ctx.fillRect(vent.x, vent.y, vent.w, vent.h);
    ctx.fillStyle = 'rgba(160,170,180,0.5)';
    ctx.fillRect(vent.x + 1, vent.y + 1, vent.w - 2, 2);
  }
  for (const ac of building.acs) {
    ctx.save();
    ctx.translate(ac.x, ac.y);
    ctx.rotate(ac.rot);
    ctx.fillStyle = 'rgba(12,14,18,0.35)';
    ctx.fillRect(-ac.r + 2, -ac.r + 3, ac.r * 2, ac.r * 2);
    ctx.fillStyle = '#b9bec4';
    ctx.fillRect(-ac.r, -ac.r * 0.8, ac.r * 2, ac.r * 1.6);
    ctx.strokeStyle = 'rgba(60,66,74,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-ac.r, -ac.r * 0.8, ac.r * 2, ac.r * 1.6);
    ctx.fillStyle = '#6b727a';
    ctx.beginPath();
    ctx.arc(0, 0, ac.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,34,40,0.8)';
    ctx.beginPath();
    ctx.moveTo(-ac.r * 0.55, 0);
    ctx.lineTo(ac.r * 0.55, 0);
    ctx.stroke();
    ctx.restore();
  }
  for (const tank of building.tanks) {
    ctx.fillStyle = 'rgba(10,12,16,0.3)';
    ctx.beginPath();
    ctx.arc(tank.x + 3, tank.y + 4, tank.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a7a62';
    ctx.beginPath();
    ctx.arc(tank.x, tank.y, tank.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,34,26,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(tank.x - tank.r * 0.25, tank.y - tank.r * 0.25, tank.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,52,40,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(tank.x, tank.y, tank.r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Roof access hatch.
  ctx.fillStyle = 'rgba(20,24,30,0.6)';
  ctx.fillRect(x + w * 0.5 - 9, y + h * 0.5 - 7, 18, 14);
  ctx.fillStyle = 'rgba(180,190,200,0.25)';
  ctx.fillRect(x + w * 0.5 - 9, y + h * 0.5 - 7, 18, 3);

  if (building.name && w > 70 && h > 48) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.font = `700 ${Math.min(15, w / 8)}px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(building.name, x + w / 2, y + h * 0.79);
    ctx.restore();
  }

  if (building.awning) {
    const awning = building.awning;
    ctx.fillStyle = awning.color;
    ctx.fillRect(x + 5, y + h - 9, w - 10, 11);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let stripe = x + 5; stripe < x + w - 10; stripe += 12) ctx.fillRect(stripe, y + h - 9, 5, 11);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 5, y + h + 2, w - 10, 2);
  }

  if (night > 0.35) {
    // A roof-top glow from the plant and the stairwell, so towers read at night.
    const glow = ctx.createRadialGradient(x + w * 0.5, y + h * 0.45, 0, x + w * 0.5, y + h * 0.45, Math.max(w, h) * 0.7);
    glow.addColorStop(0, 'rgba(255,214,150,0.10)');
    glow.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 10, y - 10, w + 20, h + 20);
  }
}

export function drawBuilding(ctx, building, night) {
  drawShadow(ctx, building);
  drawWall(ctx, building, night);
  drawRoof(ctx, building, night);
}

/** The park pavilion, boatshed and beach huts get a lighter, flatter treatment. */
export function buildingShadowOnly(ctx, building) {
  ctx.fillStyle = 'rgba(10,14,22,0.2)';
  ctx.fillRect(building.x + 6, building.y + building.depth + 8, building.w, building.h);
}

export { roundRect };