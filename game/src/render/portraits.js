// Character portraits for the dialogue box, drawn from the same palette as the little figures on
// the street: shoulders, jaw, hair, brows and the odd pair of glasses. No image files anywhere.

import { roundRect } from './buildings.js';

function backdrop(ctx, x, y, size, accent) {
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, 'rgba(24,34,46,1)');
  gradient.addColorStop(1, 'rgba(12,18,26,1)');
  ctx.fillStyle = gradient;
  roundRect(ctx, x, y, size, size, 6);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + 0.75, y + 0.75, size - 1.5, size - 1.5, 6);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function hairShape(ctx, character, cx, cy, headR) {
  ctx.fillStyle = character.hair;
  switch (character.hairStyle) {
    case 'bald':
      ctx.beginPath();
      ctx.arc(cx, cy - headR * 0.2, headR * 0.9, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
      break;
    case 'bun':
      ctx.beginPath();
      ctx.arc(cx, cy - headR * 0.15, headR * 1.05, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy - headR * 1.35, headR * 0.34, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'slick':
      ctx.beginPath();
      ctx.moveTo(cx - headR * 1.05, cy - headR * 0.25);
      ctx.quadraticCurveTo(cx, cy - headR * 1.45, cx + headR * 1.05, cy - headR * 0.25);
      ctx.quadraticCurveTo(cx + headR * 0.4, cy - headR * 0.75, cx - headR * 0.3, cy - headR * 0.6);
      ctx.closePath();
      ctx.fill();
      break;
    case 'cap':
      ctx.fillStyle = '#1b2440';
      ctx.beginPath();
      ctx.arc(cx, cy - headR * 0.35, headR * 1.12, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - headR * 1.2, cy - headR * 0.42, headR * 2.4, headR * 0.3);
      break;
    default:
      ctx.beginPath();
      ctx.arc(cx, cy - headR * 0.2, headR * 1.06, Math.PI * 0.92, Math.PI * 2.08);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - headR * 1.02, cy - headR * 0.1);
      ctx.quadraticCurveTo(cx - headR * 1.2, cy + headR * 0.5, cx - headR * 0.8, cy + headR * 0.6);
      ctx.lineTo(cx - headR * 0.6, cy - headR * 0.2);
      ctx.fill();
  }
}

export function drawPortrait(ctx, character, x, y, size) {
  if (!character) return;
  const accent = character.accent ?? '#8fb8d8';
  backdrop(ctx, x, y, size, accent);
  const cx = x + size / 2;
  const cy = y + size * 0.46;
  const headR = size * 0.245;
  const jaw = character.jaw ?? 0.5;

  // Shoulders.
  ctx.fillStyle = character.shirt ?? '#2f3a4a';
  ctx.beginPath();
  ctx.ellipse(cx, y + size * 1.02, size * 0.46, size * 0.34, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.16, y + size * 0.96, size * 0.14, size * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Neck.
  ctx.fillStyle = character.skin ?? '#c98d63';
  ctx.fillRect(cx - headR * 0.34, cy + headR * 0.6, headR * 0.68, headR * 0.6);

  // Head: a rounded box, wider at the jaw the higher the jaw number.
  ctx.fillStyle = character.skin ?? '#c98d63';
  ctx.beginPath();
  ctx.moveTo(cx - headR, cy - headR * 0.6);
  ctx.quadraticCurveTo(cx - headR, cy + headR * (0.6 + jaw * 0.7), cx - headR * (0.55 - jaw * 0.15), cy + headR * (1.0 + jaw * 0.2));
  ctx.quadraticCurveTo(cx, cy + headR * (1.28 + jaw * 0.16), cx + headR * (0.55 - jaw * 0.15), cy + headR * (1.0 + jaw * 0.2));
  ctx.quadraticCurveTo(cx + headR, cy + headR * (0.6 + jaw * 0.7), cx + headR, cy - headR * 0.6);
  ctx.quadraticCurveTo(cx + headR * 0.8, cy - headR * 1.3, cx, cy - headR * 1.24);
  ctx.quadraticCurveTo(cx - headR * 0.8, cy - headR * 1.3, cx - headR, cy - headR * 0.6);
  ctx.fill();

  // Shadow down one side of the face.
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.beginPath();
  ctx.ellipse(cx + headR * 0.55, cy + headR * 0.2, headR * 0.42, headR * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  hairShape(ctx, character, cx, cy, headR);

  // Brows and eyes.
  const eyeY = cy + headR * 0.05;
  ctx.fillStyle = 'rgba(30,22,18,0.85)';
  ctx.fillRect(cx - headR * 0.62, eyeY - headR * 0.34, headR * 0.44, headR * 0.1);
  ctx.fillRect(cx + headR * 0.18, eyeY - headR * 0.34, headR * 0.44, headR * 0.1);
  ctx.fillStyle = '#f6f2ea';
  ctx.beginPath();
  ctx.ellipse(cx - headR * 0.4, eyeY, headR * 0.19, headR * 0.13, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + headR * 0.4, eyeY, headR * 0.19, headR * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242c';
  ctx.beginPath();
  ctx.arc(cx - headR * 0.36, eyeY, headR * 0.09, 0, Math.PI * 2);
  ctx.arc(cx + headR * 0.44, eyeY, headR * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Nose and mouth.
  ctx.strokeStyle = 'rgba(120,80,60,0.5)';
  ctx.lineWidth = Math.max(1, size * 0.008);
  ctx.beginPath();
  ctx.moveTo(cx + headR * 0.02, eyeY + headR * 0.12);
  ctx.lineTo(cx + headR * 0.12, eyeY + headR * 0.42);
  ctx.lineTo(cx - headR * 0.06, eyeY + headR * 0.46);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,44,38,0.8)';
  ctx.lineWidth = Math.max(1.4, size * 0.012);
  ctx.beginPath();
  ctx.moveTo(cx - headR * 0.3, eyeY + headR * 0.78);
  ctx.quadraticCurveTo(cx, eyeY + headR * 0.9, cx + headR * 0.3, eyeY + headR * 0.78);
  ctx.stroke();

  if (character.beard) {
    ctx.fillStyle = 'rgba(210,206,196,0.85)';
    ctx.beginPath();
    ctx.moveTo(cx - headR * 0.95, cy + headR * 0.5);
    ctx.quadraticCurveTo(cx - headR * 0.5, cy + headR * 1.5, cx, cy + headR * 1.45);
    ctx.quadraticCurveTo(cx + headR * 0.5, cy + headR * 1.5, cx + headR * 0.95, cy + headR * 0.5);
    ctx.quadraticCurveTo(cx + headR * 0.4, cy + headR * 1.0, cx, cy + headR * 1.02);
    ctx.quadraticCurveTo(cx - headR * 0.4, cy + headR * 1.0, cx - headR * 0.95, cy + headR * 0.5);
    ctx.fill();
  }

  if (character.glasses) {
    ctx.strokeStyle = 'rgba(220,230,240,0.75)';
    ctx.lineWidth = Math.max(1.2, size * 0.01);
    ctx.beginPath();
    ctx.ellipse(cx - headR * 0.4, eyeY, headR * 0.3, headR * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + headR * 0.4, eyeY, headR * 0.3, headR * 0.22, 0, 0, Math.PI * 2);
    ctx.moveTo(cx - headR * 0.1, eyeY);
    ctx.lineTo(cx + headR * 0.1, eyeY);
    ctx.stroke();
  }
}