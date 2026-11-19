// People from above: a shadow, two legs that swing with the stride, a torso, arms, and a head
// with a haircut. Officers get a cap and a badge, the player gets a bright jacket and a faint
// ring underfoot so they are never lost in a crowd.

import { roundRect } from './buildings.js';

function drawBody(ctx, who, time, options = {}) {
  const { palette } = who;
  const falling = who.state === 'down' || who.state === 'dead';
  const scale = options.scale ?? 1;
  const stride = Math.sin(who.stride ?? 0) * (who.state === 'flee' ? 4.6 : 3.1);

  ctx.save();
  ctx.translate(who.x, who.y);

  // Shadow.
  ctx.fillStyle = 'rgba(8,12,18,0.28)';
  ctx.beginPath();
  ctx.ellipse(3, 4, 8 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (falling) {
    ctx.rotate(who.angle + 0.5);
    ctx.fillStyle = palette.pants;
    roundRect(ctx, -9 * scale, -4 * scale, 16 * scale, 8 * scale, 3 * scale);
    ctx.fill();
    ctx.fillStyle = palette.shirt;
    roundRect(ctx, 1 * scale, -5 * scale, 9 * scale, 10 * scale, 3 * scale);
    ctx.fill();
    ctx.fillStyle = palette.skin;
    ctx.beginPath();
    ctx.arc(11 * scale, 0, 3.6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.rotate(who.angle);

  // Legs, behind the torso.
  ctx.fillStyle = palette.pants;
  roundRect(ctx, -9 * scale, -5 * scale + stride * 0.5, 8 * scale, 4.4 * scale, 2 * scale);
  ctx.fill();
  roundRect(ctx, -9 * scale, 0.6 * scale - stride * 0.5, 8 * scale, 4.4 * scale, 2 * scale);
  ctx.fill();

  // Arms swing opposite the legs.
  ctx.fillStyle = palette.shirt;
  roundRect(ctx, -3 * scale, -8.4 * scale - stride * 0.35, 8 * scale, 3.4 * scale, 1.6 * scale);
  ctx.fill();
  roundRect(ctx, -3 * scale, 5 * scale + stride * 0.35, 8 * scale, 3.4 * scale, 1.6 * scale);
  ctx.fill();

  // Torso.
  ctx.fillStyle = palette.shirt;
  roundRect(ctx, -6.5 * scale, -6.2 * scale, 12.5 * scale, 12.4 * scale, 4.2 * scale);
  ctx.fill();
  ctx.strokeStyle = 'rgba(9,13,19,0.42)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, -5.5 * scale, -5.4 * scale, 5 * scale, 10.8 * scale, 2.6 * scale);
  ctx.fill();

  // Head and hair.
  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.arc(4.2 * scale, 0, 4.9 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(9,13,19,0.38)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = palette.hair;
  ctx.beginPath();
  ctx.arc(3.4 * scale, 0, 4.6 * scale, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(2.2 * scale, 0, 3.4 * scale, 0, Math.PI * 2);
  ctx.fill();

  if (options.cap) {
    ctx.fillStyle = '#1b2440';
    ctx.beginPath();
    ctx.arc(3.6 * scale, 0, 4.9 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b3a63';
    ctx.beginPath();
    ctx.arc(4.6 * scale, 0, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  if (options.badge) {
    ctx.fillStyle = '#e8c96a';
    ctx.fillRect(-1.5 * scale, -5.5 * scale, 2.4 * scale, 2.4 * scale);
  }

  if (options.armed) {
    ctx.fillStyle = '#2a2f36';
    ctx.fillRect(7 * scale, 2.2 * scale, 11 * scale, 3.2 * scale);
    ctx.fillStyle = '#9aa3ad';
    ctx.fillRect(7 * scale, 2.2 * scale, 11 * scale, 1.2 * scale);
    ctx.fillStyle = '#3a4048';
    ctx.fillRect(6.4 * scale, 0.9 * scale, 4 * scale, 5.4 * scale);
    ctx.fillStyle = '#d7dde4';
    ctx.fillRect(16.6 * scale, 2.6 * scale, 2.2 * scale, 2 * scale);
  }

  if (who.hitFlash > 0) {
    ctx.fillStyle = `rgba(255,240,220,${Math.min(0.5, who.hitFlash * 0.8)})`;
    ctx.beginPath();
    ctx.arc(0, 0, 9 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawPedestrian(ctx, ped, time) {
  drawBody(ctx, ped, time, {
    scale: 1.22,
    cap: ped.isCop,
    badge: ped.isCop,
    armed: ped.armed,
  });
  if (ped.hostile && ped.state !== 'down' && ped.state !== 'dead') {
    ctx.strokeStyle = 'rgba(255,86,72,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y + 2, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawPlayer(ctx, player, time) {
  if (player.mode === 'car') return;
  ctx.save();
  // A soft ring on the ground so the player reads instantly in a crowd.
  ctx.strokeStyle = 'rgba(120,225,215,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(player.x + 2, player.y + 4, 13, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  drawBody(
    ctx,
    {
      ...player,
      state: player.alive ? 'walk' : 'down',
      stride: player.stride,
      palette: player.palette,
    },
    time,
    { scale: 1.95, armed: player.weapon !== 'fists', cap: false, badge: false },
  );
}