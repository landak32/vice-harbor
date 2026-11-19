// Tyre marks, sparks, smoke, glass, muzzle flashes and the expanding ring of an explosion. All
// of it is drawn in world space so it sits under the camera transform with everything else.

import { roundRect } from './buildings.js';

function drawMarks(ctx, marks) {
  for (const mark of marks) {
    ctx.save();
    ctx.translate(mark.x, mark.y);
    ctx.rotate(mark.angle);
    ctx.fillStyle = `rgba(6,7,10,${Math.min(0.85, mark.alpha * 1.25)})`;
    ctx.fillRect(-11, -3.4, 22, 6.8);
    ctx.restore();
  }
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    const t = Math.max(0, p.life / (p.maxLife ?? p.life + 0.001));
    if (p.kind === 'spark') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    } else if (p.kind === 'smoke') {
      ctx.fillStyle = `rgba(70,74,82,${0.34 * t})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - t * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(180,184,190,${0.10 * t})`;
      ctx.beginPath();
      ctx.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * (1.1 - t * 0.4), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'dust') {
      ctx.fillStyle = `rgba(198,182,150,${0.4 * t})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.4 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'glass') {
      ctx.fillStyle = `rgba(214,240,250,${0.75 * t})`;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.x + p.y) * 0.1);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
    } else {
      ctx.fillStyle = p.color ?? '#ffffff';
      ctx.globalAlpha = t;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawFlashes(ctx, flashes) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const flash of flashes) {
    const t = Math.max(0, flash.life / flash.maxLife);
    ctx.save();
    ctx.translate(flash.x, flash.y);
    ctx.rotate(flash.angle);
    const gradient = ctx.createRadialGradient(4, 0, 0, 4, 0, 20);
    gradient.addColorStop(0, `rgba(255,244,210,${0.85 * t})`);
    gradient.addColorStop(0.4, `rgba(255,190,90,${0.4 * t})`);
    gradient.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -3.5);
    ctx.lineTo(18, 0);
    ctx.lineTo(0, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawRings(ctx, rings) {
  for (const ring of rings) {
    const t = Math.max(0, ring.life / ring.maxLife);
    ctx.strokeStyle = ring.color;
    ctx.globalAlpha = t * 0.8;
    ctx.lineWidth = 2 + 3 * (1 - t);
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.size * (1 - t) + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

export function drawEffects(ctx, world) {
  const effects = world.effects;
  drawMarks(ctx, effects.marks);
  drawRings(ctx, effects.rings);
  drawParticles(ctx, effects.particles);
  drawFlashes(ctx, effects.flashes);
}

function drawBullet(ctx, bullet) {
  const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
  const trailX = bullet.x - (bullet.vx / speed) * 14;
  const trailY = bullet.y - (bullet.vy / speed) * 14;
  ctx.strokeStyle = 'rgba(255,226,150,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(trailX, trailY);
  ctx.lineTo(bullet.x, bullet.y);
  ctx.stroke();
  ctx.fillStyle = '#fff6d0';
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, 1.9, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBullets(ctx, world) {
  for (const bullet of world.bullets) drawBullet(ctx, bullet);
}

/** A soft pool under the player so a busy frame always has a focal point. */
export function drawPlayerPool(ctx, player) {
  const gradient = ctx.createRadialGradient(player.x, player.y + 3, 2, player.x, player.y + 3, 26);
  gradient.addColorStop(0, 'rgba(190,255,246,0.16)');
  gradient.addColorStop(1, 'rgba(190,255,246,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(player.x, player.y + 3, 26, 0, Math.PI * 2);
  ctx.fill();
}

export { roundRect };