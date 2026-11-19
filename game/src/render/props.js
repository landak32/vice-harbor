// Street furniture, drawn one kind at a time: palms that lean, trees with a broad shadow, lamp
// posts, benches, bins, hydrants, crates, shipping containers, beach umbrellas and the two
// harbour cranes. Every one casts a small shadow to keep the top-down view grounded.

import { hash2 } from '../rng.js';

function shadow(ctx, x, y, rx, ry, alpha = 0.24) {
  ctx.fillStyle = `rgba(8,12,18,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x + rx * 0.28, y + ry * 0.5, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPalm(ctx, prop) {
  const r = prop.r;
  shadow(ctx, prop.x, prop.y, r * 1.1, r * 0.7);
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.rotate(prop.rot ?? 0);
  ctx.strokeStyle = '#6b4f33';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -r * 0.5);
  ctx.stroke();
  ctx.fillStyle = '#2f6b3c';
  for (let frond = 0; frond < 7; frond += 1) {
    const angle = (frond / 7) * Math.PI * 2 + (prop.lean ?? 0);
    const length = r * (1.25 + hash2(frond, prop.x) * 0.3);
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.5, -length * 0.28, length, length * 0.1);
    ctx.quadraticCurveTo(length * 0.45, length * 0.12, 0, 0);
    ctx.fill();
    ctx.fillStyle = frond % 2 === 0 ? '#3d8148' : '#2f6b3c';
    ctx.restore();
  }
  ctx.fillStyle = '#7d5a3a';
  ctx.beginPath();
  ctx.arc(0, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTree(ctx, prop) {
  const r = prop.r;
  shadow(ctx, prop.x, prop.y, r * 1.15, r * 0.85, 0.26);
  const tone = prop.tone ?? 0.5;
  ctx.fillStyle = `rgb(${44 + tone * 22},${96 + tone * 34},${52 + tone * 18})`;
  ctx.beginPath();
  ctx.arc(prop.x - r * 0.35, prop.y - r * 0.2, r * 0.78, 0, Math.PI * 2);
  ctx.arc(prop.x + r * 0.4, prop.y + r * 0.1, r * 0.7, 0, Math.PI * 2);
  ctx.arc(prop.x, prop.y - r * 0.5, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,230,150,0.28)';
  ctx.beginPath();
  ctx.arc(prop.x - r * 0.3, prop.y - r * 0.55, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,44,26,0.5)';
  ctx.beginPath();
  ctx.arc(prop.x, prop.y, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawLamp(ctx, prop, night) {
  ctx.fillStyle = 'rgba(8,12,18,0.3)';
  ctx.beginPath();
  ctx.ellipse(prop.x + 2, prop.y + 3, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b3138';
  ctx.beginPath();
  ctx.arc(prop.x, prop.y, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = night > 0.3 ? '#ffe6a8' : '#8d939a';
  ctx.beginPath();
  ctx.arc(prop.x, prop.y, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawBench(ctx, prop) {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.rotate(prop.rot ?? 0);
  ctx.fillStyle = 'rgba(8,12,18,0.22)';
  ctx.fillRect(-11, -3, 24, 10);
  ctx.fillStyle = '#7a5638';
  ctx.fillRect(-12, -5, 24, 5);
  ctx.fillStyle = '#8d6742';
  ctx.fillRect(-12, 1, 24, 4);
  ctx.fillStyle = '#3c4046';
  ctx.fillRect(-10, 5, 3, 3);
  ctx.fillRect(7, 5, 3, 3);
  ctx.restore();
}

function drawPicnic(ctx, prop) {
  shadow(ctx, prop.x, prop.y, 14, 9);
  ctx.fillStyle = '#8a6340';
  ctx.fillRect(prop.x - 15, prop.y - 8, 30, 7);
  ctx.fillRect(prop.x - 15, prop.y + 3, 30, 7);
  ctx.fillStyle = '#6d4c30';
  ctx.fillRect(prop.x - 12, prop.y - 1, 24, 4);
}

function drawBin(ctx, prop) {
  shadow(ctx, prop.x, prop.y, 7, 5, 0.2);
  ctx.fillStyle = '#3d4750';
  ctx.beginPath();
  ctx.arc(prop.x, prop.y, 6.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#586570';
  ctx.beginPath();
  ctx.arc(prop.x, prop.y - 1, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a3238';
  ctx.fillRect(prop.x - 1, prop.y - 4, 2, 7);
}

function drawHydrant(ctx, prop) {
  shadow(ctx, prop.x, prop.y, 5, 4, 0.2);
  ctx.fillStyle = '#c8433a';
  ctx.beginPath();
  ctx.arc(prop.x, prop.y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e2635a';
  ctx.beginPath();
  ctx.arc(prop.x - 1, prop.y - 1, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrate(ctx, prop) {
  const s = prop.r;
  shadow(ctx, prop.x, prop.y, s * 0.8, s * 0.55, 0.2);
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.rotate(prop.rot ?? 0);
  ctx.fillStyle = '#9a7448';
  ctx.fillRect(-s, -s * 0.85, s * 2, s * 1.7);
  ctx.strokeStyle = '#6d4f2e';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-s, -s * 0.85, s * 2, s * 1.7);
  ctx.beginPath();
  ctx.moveTo(-s, -s * 0.85);
  ctx.lineTo(s, s * 0.85);
  ctx.moveTo(s, -s * 0.85);
  ctx.lineTo(-s, s * 0.85);
  ctx.stroke();
  ctx.restore();
}

function drawContainer(ctx, prop) {
  const hues = ['#8c4030', '#2e5f7a', '#4f7040', '#8a7530', '#6a4a7a'];
  const color = hues[(prop.hue ?? 0.5 * hues.length) | 0] ?? hues[0];
  shadow(ctx, prop.x, prop.y, 22, 12, 0.24);
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.rotate(prop.rot ?? 0);
  ctx.fillStyle = color;
  ctx.fillRect(-21, -10, 42, 20);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let rib = -18; rib <= 18; rib += 6) ctx.fillRect(rib, -9, 2, 18);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-21, -10, 42, 20);
  ctx.restore();
}

function drawUmbrella(ctx, prop) {
  shadow(ctx, prop.x, prop.y, 11, 7, 0.22);
  ctx.save();
  ctx.translate(prop.x, prop.y);
  const colors = ['#e8574f', '#3fa9a0', '#f2c14e', '#e07ab0'];
  const color = colors[(prop.hue ?? 0.4) * colors.length | 0] ?? colors[0];
  for (let slice = 0; slice < 8; slice += 1) {
    ctx.fillStyle = slice % 2 === 0 ? color : '#f4f0e6';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 12, (slice / 8) * Math.PI * 2, ((slice + 1) / 8) * Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBollard(ctx, prop) {
  ctx.fillStyle = '#2c3238';
  ctx.beginPath();
  ctx.arc(prop.x, prop.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#59616a';
  ctx.beginPath();
  ctx.arc(prop.x - 1, prop.y - 1, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrane(ctx, prop) {
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.fillStyle = 'rgba(8,12,18,0.28)';
  ctx.fillRect(-8, -4, 40, 26);
  ctx.fillStyle = '#d8a33c';
  ctx.fillRect(-10, -10, 20, 20);
  ctx.fillStyle = '#b2842c';
  ctx.fillRect(-10, -10, 20, 5);
  ctx.rotate(prop.rot ?? 0);
  ctx.fillStyle = '#d8a33c';
  ctx.fillRect(0, -4, 54, 8);
  ctx.fillStyle = '#8a6620';
  ctx.fillRect(48, -3, 6, 6);
  ctx.strokeStyle = 'rgba(60,44,10,0.8)';
  ctx.lineWidth = 1;
  for (let bar = 6; bar < 52; bar += 8) {
    ctx.beginPath();
    ctx.moveTo(bar, -4);
    ctx.lineTo(bar, 4);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawProp(ctx, prop, night) {
  switch (prop.kind) {
    case 'palm':
      drawPalm(ctx, prop);
      break;
    case 'tree':
      drawTree(ctx, prop);
      break;
    case 'lamp':
      drawLamp(ctx, prop, night);
      break;
    case 'bench':
      drawBench(ctx, prop);
      break;
    case 'picnic':
      drawPicnic(ctx, prop);
      break;
    case 'bin':
      drawBin(ctx, prop);
      break;
    case 'hydrant':
      drawHydrant(ctx, prop);
      break;
    case 'crate':
      drawCrate(ctx, prop);
      break;
    case 'container':
      drawContainer(ctx, prop);
      break;
    case 'umbrella':
      drawUmbrella(ctx, prop);
      break;
    case 'bollard':
      drawBollard(ctx, prop);
      break;
    case 'crane':
      drawCrane(ctx, prop);
      break;
    default:
      ctx.fillStyle = '#7a8088';
      ctx.fillRect(prop.x - 4, prop.y - 4, 8, 8);
  }
}