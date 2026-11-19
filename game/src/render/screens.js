// The screens around the game: the title card, the pause menu, the controls overlay, the stats
// sheet and the two ways a run can end. Drawn with the same canvas API as everything else.

import { FONT, FONT_DISPLAY, FONT_MONO, VIEW } from '../config.js';
import { roundRect } from './buildings.js';

function scrim(ctx, alpha = 0.72) {
  ctx.fillStyle = `rgba(5,8,14,${alpha})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function titleArt(ctx, time) {
  // A horizon of towers and a sun going down behind them.
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  gradient.addColorStop(0, '#1a1636');
  gradient.addColorStop(0.42, '#5b2a52');
  gradient.addColorStop(0.62, '#c85a3c');
  gradient.addColorStop(0.72, '#f0a04a');
  gradient.addColorStop(1, '#10141c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sun = ctx.createRadialGradient(VIEW.width * 0.62, VIEW.height * 0.66, 4, VIEW.width * 0.62, VIEW.height * 0.66, 240);
  sun.addColorStop(0, 'rgba(255,224,150,0.85)');
  sun.addColorStop(0.4, 'rgba(255,150,70,0.35)');
  sun.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.restore();

  // Skyline: deterministic bars so the title is the same on every load.
  const baseY = VIEW.height * 0.72;
  for (let index = 0; index < 46; index += 1) {
    const seed = Math.sin(index * 12.9898) * 43758.5453;
    const rnd = seed - Math.floor(seed);
    const width = 26 + rnd * 46;
    const height = 60 + ((index * 37) % 210);
    const x = index * 30 - 40;
    const y = baseY - height;
    ctx.fillStyle = `rgba(${10 + rnd * 14},${12 + rnd * 16},${24 + rnd * 22},0.95)`;
    ctx.fillRect(x, y, width, height + 8);
    ctx.fillStyle = 'rgba(255,214,140,0.5)';
    for (let win = 0; win < 14; win += 1) {
      const wx = x + 4 + ((win * 13 + index * 5) % (width - 10));
      const wy = y + 6 + ((win * 23 + index * 11) % (height - 12));
      if ((win + index) % 3 === 0) ctx.fillRect(wx, wy, 3, 5);
    }
  }
  // Water below the skyline.
  ctx.fillStyle = '#0d1a26';
  ctx.fillRect(0, baseY + 6, VIEW.width, VIEW.height - baseY);
  ctx.fillStyle = 'rgba(255,180,110,0.12)';
  for (let line = 0; line < 24; line += 1) {
    const width = 40 + ((line * 53) % 160);
    const x = ((line * 137) % VIEW.width) - 40;
    const y = baseY + 18 + line * 9;
    ctx.fillRect(x, y, width, 2);
  }
  ctx.fillStyle = 'rgba(6,8,12,0.55)';
  ctx.fillRect(0, baseY + 6, VIEW.width, 3);
  if (time) {
    ctx.fillStyle = 'rgba(8,10,16,0.35)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

function menuRow(ctx, x, y, label, index, selected) {
  const width = 320;
  ctx.fillStyle = selected ? 'rgba(242,193,78,0.16)' : 'rgba(10,14,20,0.35)';
  roundRect(ctx, x, y, width, 44, 8);
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = 'rgba(242,193,78,0.85)';
    ctx.lineWidth = 1.6;
    roundRect(ctx, x + 0.8, y + 0.8, width - 1.6, 42.4, 8);
    ctx.stroke();
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 16);
    ctx.lineTo(x - 4, y + 22);
    ctx.lineTo(x - 16, y + 28);
    ctx.closePath();
    ctx.fill();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `600 17px ${FONT_DISPLAY}`;
  ctx.fillStyle = selected ? '#fff6df' : 'rgba(226,234,244,0.72)';
  ctx.fillText(label, x + 20, y + 23);
  ctx.textAlign = 'right';
  ctx.font = `600 11px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(226,234,244,0.4)';
  ctx.fillText(String(index + 1), x + width - 16, y + 23);
}

export function drawTitle(ctx, world, items, selected, time) {
  titleArt(ctx, time);
  const x = 92;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 14px ${FONT_MONO}`;
  ctx.fillStyle = '#f2c14e';
  ctx.fillText('A CRIME STORY IN FIVE NEIGHBOURHOODS', x, 150);

  ctx.font = `700 96px ${FONT_DISPLAY}`;
  ctx.fillStyle = 'rgba(10,12,20,0.55)';
  ctx.fillText('VICE HARBOR', x + 4, 232 + 4);
  const titleGradient = ctx.createLinearGradient(x, 160, x + 620, 232);
  titleGradient.addColorStop(0, '#fff3d8');
  titleGradient.addColorStop(0.55, '#f7c66a');
  titleGradient.addColorStop(1, '#e8734a');
  ctx.fillStyle = titleGradient;
  ctx.fillText('VICE HARBOR', x, 232);

  ctx.font = `500 17px ${FONT_DISPLAY}`;
  ctx.fillStyle = 'rgba(236,242,250,0.8)';
  ctx.fillText('Sun, salt water and a debt that will not wait.', x + 2, 272);

  items.forEach((item, index) => menuRow(ctx, x, 320 + index * 56, item.label ?? item, index, index === selected));

  ctx.font = `500 12px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(226,234,244,0.45)';
  ctx.fillText('↑ ↓ to choose   ·   ENTER to confirm   ·   H for controls', x, 560);

  const stats = world.stats;
  ctx.textAlign = 'right';
  ctx.font = `600 11px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(226,234,244,0.4)';
  ctx.fillText(`MISSIONS ${stats.missionsCompleted}   ·   SIDE JOBS ${stats.sideJobs}   ·   PLAY ${Math.floor(stats.playTime / 60)}m`, VIEW.width - 60, VIEW.height - 40);
  ctx.textAlign = 'left';
}

export function drawPause(ctx, world, items, selected) {
  scrim(ctx, 0.66);
  const x = VIEW.width / 2 - 160;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 40px ${FONT_DISPLAY}`;
  ctx.fillStyle = '#f6f1e2';
  ctx.fillText('PAUSED', VIEW.width / 2, 190);
  ctx.font = `600 11px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(226,234,244,0.5)';
  ctx.fillText('VICE HARBOR', VIEW.width / 2, 214);
  items.forEach((item, index) => menuRow(ctx, x, 250 + index * 56, item.label ?? item, index, index === selected));
  ctx.textAlign = 'center';
  ctx.font = `500 12px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(226,234,244,0.42)';
  ctx.fillText('ESC resumes', VIEW.width / 2, VIEW.height - 60);
  ctx.textAlign = 'left';
}

export function drawEnding(ctx, world) {
  const busted = world.state === 'busted';
  scrim(ctx, 0.74);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 64px ${FONT_DISPLAY}`;
  ctx.fillStyle = busted ? '#8fb8e8' : '#e8564c';
  ctx.fillText(busted ? 'BUSTED' : 'WASTED', VIEW.width / 2, 300);
  ctx.font = `500 17px ${FONT_DISPLAY}`;
  ctx.fillStyle = 'rgba(236,242,250,0.8)';
  ctx.fillText(
    busted ? 'The Harbour Patrol walks you into the back of a cruiser.' : 'Somebody in this city had a worse night than you.',
    VIEW.width / 2,
    338,
  );
  ctx.font = `600 13px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(226,234,244,0.55)';
  ctx.fillText(
    busted ? `FINE PAID  $${Math.round(world.lastFine ?? 0)}` : `HOSPITAL BILL  $${Math.round(world.lastBill ?? 0)}`,
    VIEW.width / 2,
    374,
  );
  ctx.textAlign = 'left';
}

export function drawControls(ctx) {
  scrim(ctx, 0.86);
  const x = 220;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 34px ${FONT_DISPLAY}`;
  ctx.fillStyle = '#f6f1e2';
  ctx.fillText('CONTROLS', x, 116);
  ctx.font = `600 11px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(242,193,78,0.8)';
  ctx.fillText('KEYBOARD AND MOUSE', x, 138);

  const rows = [
    ['W A S D / ARROWS', 'Walk, run, drive'],
    ['SHIFT', 'Sprint on foot'],
    ['E', 'Enter or leave a car · advance dialogue'],
    ['SPACE', 'Handbrake · brake hard'],
    ['LEFT CLICK / J', 'Fire · punch'],
    ['Q', 'Change weapon'],
    ['F', 'Start the side job at a dispatch point'],
    ['TAB', 'Open the map'],
    ['ESC / P', 'Pause'],
    ['M', 'Mute'],
  ];
  rows.forEach((row, index) => {
    const y = 190 + index * 34;
    if (index % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(x - 14, y - 21, 720, 30);
    }
    ctx.font = `600 13px ${FONT_MONO}`;
    ctx.fillStyle = '#f2c14e';
    ctx.fillText(row[0], x, y);
    ctx.font = `500 15px ${FONT_DISPLAY}`;
    ctx.fillStyle = 'rgba(236,242,250,0.86)';
    ctx.fillText(row[1], x + 230, y);
  });
  ctx.font = `500 12px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(226,234,244,0.45)';
  ctx.fillText('PRESS ANY KEY TO RETURN', x, VIEW.height - 60);
}

export function drawStats(ctx, world) {
  scrim(ctx, 0.9);
  const stats = world.stats;
  const x = 200;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 34px ${FONT_DISPLAY}`;
  ctx.fillStyle = '#f6f1e2';
  ctx.fillText('CAREER', x, 110);
  ctx.font = `600 11px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(242,193,78,0.8)';
  ctx.fillText('VICE HARBOR', x, 132);

  const rows = [
    ['Missions passed', stats.missionsCompleted],
    ['Side jobs run', stats.sideJobs],
    ['Cars wrecked', stats.vehiclesWrecked],
    ['People knocked down', stats.pedsDowned],
    ['Rounds fired', stats.shotsFired],
    ['Times arrested', stats.arrests],
    ['Times hospitalised', stats.deaths],
    ['Distance driven', `${(stats.distance / 1000).toFixed(1)} km`],
    ['Time in the city', `${Math.floor(stats.playTime / 60)}m ${Math.floor(stats.playTime % 60)}s`],
  ];
  rows.forEach((row, index) => {
    const y = 190 + index * 38;
    ctx.font = `500 16px ${FONT_DISPLAY}`;
    ctx.fillStyle = 'rgba(236,242,250,0.72)';
    ctx.fillText(row[0], x, y);
    ctx.textAlign = 'right';
    ctx.font = `700 20px ${FONT_MONO}`;
    ctx.fillStyle = '#f2c14e';
    ctx.fillText(String(row[1]), x + 620, y);
    ctx.textAlign = 'left';
  });
  ctx.font = `500 12px ${FONT_MONO}`;
  ctx.fillStyle = 'rgba(226,234,244,0.45)';
  ctx.fillText('PRESS ANY KEY TO RETURN', x, VIEW.height - 56);
}

/** A short banner across the top for mission results. */
export function drawBanner(ctx, text, alpha, accent = '#f2c14e') {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const width = Math.min(680, 140 + text.length * 12);
  const x = (VIEW.width - width) / 2;
  const y = 92;
  ctx.fillStyle = 'rgba(10,14,20,0.78)';
  roundRect(ctx, x, y, width, 56, 10);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = alpha * 0.7;
  roundRect(ctx, x + 0.8, y + 0.8, width - 1.6, 54.4, 10);
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 20px ${FONT_DISPLAY}`;
  ctx.fillStyle = accent;
  ctx.fillText(text, VIEW.width / 2, y + 29);
  ctx.restore();
  ctx.textAlign = 'left';
}

export { FONT };