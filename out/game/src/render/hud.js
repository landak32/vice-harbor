// Everything printed over the world: the minimap and the bars above it, cash, wanted stars, the
// weapon readout, the objective line, the district clock, the toast stack and the dialogue box.

import { FONT, FONT_DISPLAY, FONT_MONO, HUD, VEHICLE_TYPES, VIEW, WEAPONS } from '../config.js';
import { objectiveText, nextMissionHint } from '../game/missions.js';
import { drawMinimap } from './minimap.js';
import { drawPortrait } from './portraits.js';
import { roundRect } from './buildings.js';

const MAP_SIZE = 208;
const MAP_BOX = { x: 22, y: VIEW.height - MAP_SIZE - 22, size: MAP_SIZE };

function panel(ctx, x, y, w, h, alpha = 0.55) {
  ctx.fillStyle = `rgba(10,14,20,${alpha})`;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(232,240,250,0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8);
  ctx.stroke();
}

function star(ctx, x, y, radius, filled, pulse) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = (Math.PI / 5) * point - Math.PI / 2;
    const r = point % 2 === 0 ? radius * pulse : radius * 0.45 * pulse;
    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#f6d25a';
    ctx.shadowColor = 'rgba(246,210,90,0.65)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = 'rgba(220,228,238,0.28)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBars(ctx, world) {
  const player = world.player;
  const x = MAP_BOX.x;
  const width = MAP_SIZE;
  const barH = 11;
  const healthY = MAP_BOX.y - 38;
  const armourY = MAP_BOX.y - 23;

  ctx.fillStyle = 'rgba(8,12,18,0.62)';
  roundRect(ctx, x - 2, healthY - 3, width + 4, barH * 2 + 12, 6);
  ctx.fill();

  const health = Math.max(0, Math.min(1, player.health / 100));
  ctx.fillStyle = 'rgba(40,54,64,0.9)';
  roundRect(ctx, x, healthY, width, barH, 4);
  ctx.fill();
  const healthColour = health > 0.55 ? '#5fd08a' : health > 0.28 ? '#f0b24a' : '#e8564c';
  ctx.fillStyle = healthColour;
  roundRect(ctx, x, healthY, Math.max(6, width * health), barH, 4);
  ctx.fill();

  const armour = Math.max(0, Math.min(1, player.armour / 100));
  ctx.fillStyle = 'rgba(52,84,120,0.55)';
  roundRect(ctx, x, armourY, width, barH - 2, 4);
  ctx.fill();
  if (armour > 0) {
    ctx.fillStyle = '#6fa8e8';
    roundRect(ctx, x, armourY, Math.max(4, width * armour), barH - 2, 4);
    ctx.fill();
  }

  // A heart and a shield so the two bars never need reading twice.
  ctx.fillStyle = 'rgba(232,240,250,0.85)';
  ctx.beginPath();
  ctx.arc(x + 10, healthY + 4.6, 2.6, 0, Math.PI * 2);
  ctx.arc(x + 15, healthY + 4.6, 2.6, 0, Math.PI * 2);
  ctx.moveTo(x + 7.4, healthY + 5.4);
  ctx.lineTo(x + 12.6, healthY + 11);
  ctx.lineTo(x + 17.6, healthY + 5.4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 12, armourY + 0.5);
  ctx.lineTo(x + 18, armourY + 2.6);
  ctx.lineTo(x + 18, armourY + 6.4);
  ctx.lineTo(x + 12, armourY + 9.4);
  ctx.lineTo(x + 6, armourY + 6.4);
  ctx.lineTo(x + 6, armourY + 2.6);
  ctx.closePath();
  ctx.fill();

  ctx.font = `600 10px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(232,240,250,0.72)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('HEALTH', x + width - 6, healthY + barH / 2 + 0.5);
  ctx.fillText('ARMOUR', x + width - 6, armourY + (barH - 2) / 2);
}

function drawCash(ctx, world) {
  const player = world.player;
  const x = VIEW.width - 26;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 30px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(8,12,18,0.55)';
  ctx.fillText(`$${Math.floor(player.money)}`, x + 2, 48 + 2);
  ctx.fillStyle = '#8ef0b8';
  ctx.fillText(`$${Math.floor(player.money)}`, x, 48);
  ctx.font = `600 10px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(232,240,250,0.55)';
  ctx.fillText('CLEAN CASH', x, 62);
}

function drawStars(ctx, world) {
  const stars = world.wanted.stars;
  const pulseOn = Math.floor(world.clock * 3.2) % 2 === 0;
  const x = VIEW.width - 26;
  for (let index = 0; index < 5; index += 1) {
    const filled = index < stars;
    const pulse = filled && pulseOn ? 1.14 : 1;
    star(ctx, x - (4 - index) * 25, 86, 10, filled, pulse);
  }
}

function drawSpeedometer(ctx, world, car) {
  const spec = VEHICLE_TYPES[car.type] ?? VEHICLE_TYPES.sedan;
  const speed = Math.hypot(car.vx, car.vy);
  const w = 226;
  const h = 62;
  const x = VIEW.width - w - 22;
  const y = VIEW.height - h - 22;
  panel(ctx, x, y, w, h, 0.55);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `700 13px ${FONT_DISPLAY}`;
  ctx.fillStyle = '#eef3fa';
  ctx.fillText((spec.name ?? 'Car').toUpperCase(), x + 14, y + 19);
  ctx.font = `600 10px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(232,240,250,0.5)';
  ctx.fillText(car.health > 45 ? 'ENGINE OK' : 'ENGINE DAMAGED', x + 14, y + 38);
  const wear = Math.max(0, Math.min(1, car.health / 100));
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, x + 14, y + 46, 108, 5, 2.5);
  ctx.fill();
  ctx.fillStyle = wear > 0.5 ? '#5fd08a' : wear > 0.25 ? '#f0b24a' : '#e8564c';
  roundRect(ctx, x + 14, y + 46, Math.max(3, 108 * wear), 5, 2.5);
  ctx.fill();
  ctx.textAlign = 'right';
  ctx.font = `700 26px ${FONT_MONO}`;
  ctx.fillStyle = '#f6d25a';
  ctx.fillText(`${Math.round(speed * 0.34)}`, x + w - 46, y + 32);
  ctx.font = `600 10px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(232,240,250,0.55)';
  ctx.fillText('MPH', x + w - 14, y + 33);
}

function drawWeapon(ctx, world) {
  const player = world.player;
  if (player.mode === 'car' && player.car) {
    drawSpeedometer(ctx, world, player.car);
    return;
  }
  const weapon = WEAPONS[player.weapon] ?? WEAPONS.fists;
  const ammo = player.weapon === 'fists' ? '∞' : `${player.ammo[player.weapon] ?? 0}`;
  const w = 206;
  const h = 56;
  const x = VIEW.width - w - 22;
  const y = VIEW.height - h - 22;
  panel(ctx, x, y, w, h, 0.5);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `700 13px ${FONT_DISPLAY}`;
  ctx.fillStyle = '#eef3fa';
  ctx.fillText(weapon.name.toUpperCase(), x + 14, y + 20);
  ctx.font = `600 10px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(232,240,250,0.5)';
  ctx.fillText(player.weapon === 'fists' ? 'HANDS' : 'ROUNDS', x + 14, y + 39);
  ctx.textAlign = 'right';
  ctx.font = `700 26px ${FONT_MONO}`;
  ctx.fillStyle = ammo === '0' ? '#e8564c' : '#f6d25a';
  ctx.fillText(ammo, x + w - 14, y + 30);
}

function drawObjective(ctx, world) {
  const text = objectiveText(world);
  const hint = text ? null : nextMissionHint(world);
  const line = text ?? (hint ? `Meet ${hint.def.title.replace(/^THE /, '')} at the marker` : null);
  if (!line) return;
  ctx.font = `600 14px ${FONT_DISPLAY}`;
  const width = Math.min(430, 96 + ctx.measureText(line).width);
  panel(ctx, 22, 20, width, 52, 0.55);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `700 10px ${FONT_MONO}`;
  ctx.fillStyle = text ? '#f2c14e' : 'rgba(180,200,220,0.75)';
  ctx.fillText(text ? 'OBJECTIVE' : 'NEXT', 36, 37);
  ctx.font = `600 14px ${FONT_DISPLAY}`;
  ctx.fillStyle = '#eef3fa';
  ctx.fillText(line, 36, 56);
}

function drawClock(ctx, world) {
  const hour = Math.floor(world.dayTimer);
  const minute = Math.floor((world.dayTimer % 1) * 60);
  const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const districtName = world.layout ? districtLabel(world) : '';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `600 11px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(232,240,250,0.62)';
  ctx.fillText(`${districtName}   ${label}`, MAP_BOX.x + 2, MAP_BOX.y - 46);
}

function districtLabel(world) {
  const player = world.player;
  const tx = Math.floor(player.x / world.layout.tile);
  const ty = Math.floor(player.y / world.layout.tile);
  const index = Math.min(world.layout.district.length - 1, Math.max(0, ty * world.layout.cols + tx));
  const id = world.layout.district[index];
  const names = ['KESSLER MILE', 'HARBOUR DOCKS', 'SUNSET STRIP', 'VERDE PARK', 'MARLOW ROW'];
  return names[id] ?? 'VICE HARBOR';
}

function drawToasts(ctx, world) {
  let y = MAP_BOX.y - 70;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let index = world.toasts.length - 1; index >= 0; index -= 1) {
    const toast = world.toasts[index];
    const alpha = Math.min(1, toast.life / 0.5);
    ctx.font = `600 13px ${FONT_DISPLAY}`;
    const width = ctx.measureText(toast.text).width + 28;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(12,16,24,0.72)';
    roundRect(ctx, MAP_BOX.x - 2, y - 13, width, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#dfe8f2';
    ctx.fillText(toast.text, MAP_BOX.x + 12, y);
    y -= 32;
    ctx.globalAlpha = 1;
  }
}

function drawDialogue(ctx, world) {
  const dialogue = world.dialogue;
  if (!dialogue.open) return;
  const width = 700;
  const height = 126;
  const x = (VIEW.width - width) / 2;
  const y = VIEW.height - height - 22;
  panel(ctx, x, y, width, height, 0.78);
  drawPortrait(ctx, dialogue.speaker, x + 12, y + 12, 102);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 14px ${FONT_DISPLAY}`;
  ctx.fillStyle = dialogue.speaker?.accent ?? '#f2c14e';
  ctx.fillText((dialogue.speaker?.name ?? 'VICE HARBOR').toUpperCase(), x + 130, y + 30);
  ctx.font = `600 10px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(200,214,230,0.6)';
  ctx.fillText(dialogue.speaker?.role ?? '', x + 130, y + 46);

  ctx.font = `500 15px ${FONT_DISPLAY}`;
  ctx.fillStyle = '#eef3fa';
  wrapText(ctx, dialogue.text ?? '', x + 130, y + 72, width - 156, 21);

  const blink = Math.sin(world.clock * 5) > 0;
  if (blink) {
    ctx.fillStyle = 'rgba(242,193,78,0.9)';
    ctx.beginPath();
    ctx.moveTo(x + width - 30, y + height - 26);
    ctx.lineTo(x + width - 18, y + height - 26);
    ctx.lineTo(x + width - 24, y + height - 18);
    ctx.closePath();
    ctx.fill();
  }
  ctx.font = `600 10px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(200,214,230,0.45)';
  ctx.textAlign = 'right';
  ctx.fillText('E / CLICK', x + width - 38, y + height - 20);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let offset = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + offset);
      line = word;
      offset += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y + offset);
}

export function drawHud(ctx, world, mapImage) {
  drawMinimap(ctx, world, mapImage, MAP_BOX);
  drawBars(ctx, world);
  drawClock(ctx, world);
  drawCash(ctx, world);
  drawStars(ctx, world);
  drawWeapon(ctx, world);
  drawObjective(ctx, world);
  drawToasts(ctx, world);
  if (HUD.showDialogue !== false) drawDialogue(ctx, world);
}

export { MAP_BOX, wrapText };