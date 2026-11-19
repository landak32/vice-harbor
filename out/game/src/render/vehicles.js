// Cars from above: a shaded body, a cabin with glass, four wheels, lamps at both ends, and the
// bits that make each type recognisable at a glance — the taxi's roof sign, the cruiser's light
// bar, the van's slab sides, the hauler's trailer.

import { DISTRICT_STYLE } from '../config.js';
import { roundRect } from './buildings.js';

function bodyPath(ctx, length, width, nose = 0.28, tail = 0.2) {
  const halfL = length / 2;
  const halfW = width / 2;
  ctx.beginPath();
  ctx.moveTo(-halfL + tail, -halfW);
  ctx.lineTo(halfL - nose, -halfW);
  ctx.quadraticCurveTo(halfL, -halfW, halfL, -halfW + 4);
  ctx.lineTo(halfL, halfW - 4);
  ctx.quadraticCurveTo(halfL, halfW, halfL - nose, halfW);
  ctx.lineTo(-halfL + tail, halfW);
  ctx.quadraticCurveTo(-halfL, halfW, -halfL, halfW - 4);
  ctx.lineTo(-halfL, -halfW + 4);
  ctx.quadraticCurveTo(-halfL, -halfW, -halfL + tail, -halfW);
  ctx.closePath();
}

function wheels(ctx, car) {
  const { length, width } = car.spec;
  ctx.fillStyle = '#15181c';
  const wheelW = 4.5;
  const wheelL = 9;
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      ctx.save();
      ctx.translate(end * length * 0.3, side * (width / 2 - 1));
      ctx.fillRect(-wheelL / 2, -wheelW / 2, wheelL, wheelW);
      ctx.restore();
    }
  }
}

function glass(ctx, car) {
  const { length, width } = car.spec;
  const halfW = width / 2;
  ctx.fillStyle = 'rgba(28,42,56,0.92)';
  if (car.type === 'truck') {
    ctx.fillRect(length * 0.12, -halfW + 3.5, length * 0.16, width - 7);
    return;
  }
  if (car.type === 'van') {
    ctx.fillRect(length * 0.12, -halfW + 3, length * 0.12, width - 6);
    ctx.fillStyle = 'rgba(40,58,74,0.55)';
    ctx.fillRect(-length * 0.2, -halfW + 4, length * 0.28, width - 8);
    return;
  }
  // Windscreen, cabin roof and rear window.
  ctx.beginPath();
  ctx.moveTo(length * 0.16, -halfW + 3.5);
  ctx.lineTo(length * 0.34, -halfW + 5.5);
  ctx.lineTo(length * 0.34, halfW - 5.5);
  ctx.lineTo(length * 0.16, halfW - 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(52,74,92,0.55)';
  ctx.fillRect(-length * 0.16, -halfW + 3.5, length * 0.3, width - 7);
  ctx.fillStyle = 'rgba(26,38,50,0.9)';
  ctx.fillRect(-length * 0.34, -halfW + 5, length * 0.1, width - 10);
}

function lights(ctx, car, night) {
  const half = car.spec.width / 2;
  const front = car.spec.length / 2;
  const on = night > 0.3;
  ctx.fillStyle = on ? '#fff4d0' : '#d8d6c8';
  ctx.fillRect(front - 3, -half + 2, 3, 5);
  ctx.fillRect(front - 3, half - 7, 3, 5);
  ctx.fillStyle = car.braking ? '#ff5a48' : '#a8322a';
  ctx.fillRect(-front + 1, -half + 2, 2.5, 5);
  ctx.fillRect(-front + 1, half - 7, 2.5, 5);
}

function policeTrim(ctx, car, time) {
  const { length, width } = car.spec;
  ctx.fillStyle = '#1c2e56';
  ctx.fillRect(-length * 0.42, -width / 2 + 1, length * 0.84, 4);
  ctx.fillRect(-length * 0.42, width / 2 - 5, length * 0.84, 4);
  // Light bar: red on the left half, blue on the right, both burning at once.
  const pulse = 0.62 + 0.38 * Math.abs(Math.sin(time * 7));
  const barX = length * 0.05;
  const barW = 13;
  const barY = -width * 0.24;
  ctx.fillStyle = 'rgba(10,12,16,0.85)';
  ctx.fillRect(barX - barW / 2 - 1, barY - 1, barW + 2, width * 0.48 + 2);
  ctx.fillStyle = `rgba(255,58,44,${pulse})`;
  ctx.fillRect(barX - barW / 2, barY, barW / 2 - 1, width * 0.48);
  ctx.fillStyle = `rgba(72,132,255,${1.05 - pulse * 0.45})`;
  ctx.fillRect(barX, barY, barW / 2 - 1, width * 0.48);
}

function taxiTrim(ctx, car) {
  const { length, width } = car.spec;
  ctx.fillStyle = '#1d1f24';
  for (let index = 0; index < 4; index += 1) {
    ctx.fillRect(-length * 0.3 + index * 12, -width / 2 + 1, 6, 3);
    ctx.fillRect(-length * 0.3 + index * 12, width / 2 - 4, 6, 3);
  }
  ctx.fillStyle = '#f5f0dc';
  ctx.fillRect(-4, -4, 8, 8);
  ctx.fillStyle = '#2a2c33';
  ctx.fillRect(-3, -2, 6, 4);
}

function wreckLook(ctx, car) {
  ctx.fillStyle = 'rgba(20,18,16,0.45)';
  ctx.fillRect(-car.spec.length * 0.4, -car.spec.width * 0.4, car.spec.length * 0.8, car.spec.width * 0.8);
  ctx.strokeStyle = 'rgba(240,240,240,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let crack = 0; crack < 4; crack += 1) {
    ctx.moveTo(-8 + crack * 5, -6);
    ctx.lineTo(-2 + crack * 3, 6);
  }
  ctx.stroke();
}

export function drawVehicle(ctx, car, night, time) {
  const spec = car.spec;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // Shadow, offset down-right as if the sun sits up-left.
  ctx.fillStyle = 'rgba(8,12,18,0.3)';
  roundRect(ctx, -spec.length / 2 + 3, -spec.width / 2 + 4, spec.length, spec.width, 5);
  ctx.fill();

  wheels(ctx, car);

  // Body.
  ctx.fillStyle = car.color;
  bodyPath(ctx, spec.length, spec.width);
  ctx.fill();
  const sheen = ctx.createLinearGradient(0, -spec.width / 2, 0, spec.width / 2);
  sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
  sheen.addColorStop(0.45, 'rgba(255,255,255,0.02)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = sheen;
  bodyPath(ctx, spec.length, spec.width);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  bodyPath(ctx, spec.length, spec.width);
  ctx.stroke();

  glass(ctx, car);

  if (car.type === 'truck') {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(-spec.length * 0.46, -spec.width / 2 + 2, spec.length * 0.52, spec.width - 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    for (let rib = -spec.length * 0.44; rib < spec.length * 0.05; rib += 6) {
      ctx.beginPath();
      ctx.moveTo(rib, -spec.width / 2 + 2);
      ctx.lineTo(rib, spec.width / 2 - 2);
      ctx.stroke();
    }
  }
  if (car.type === 'sports') {
    ctx.fillStyle = 'rgba(14,16,20,0.85)';
    ctx.fillRect(-spec.length / 2 - 1, -spec.width * 0.42, 4, spec.width * 0.84);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(-spec.length * 0.02, -spec.width * 0.46, 3, spec.width * 0.92);
  }
  if (car.type === 'van') {
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(-spec.length * 0.42, -spec.width / 2 + 2, spec.length * 0.2, spec.width - 4);
  }
  if (car.type === 'taxi') taxiTrim(ctx, car);
  if (car.police) policeTrim(ctx, car, time);

  lights(ctx, car, night);
  if (car.health < spec.health * 0.4) wreckLook(ctx, car);

  ctx.restore();

  if (car.police && car.siren) {
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(time * 7));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sides = [
      { dx: -12, colour: `rgba(255,64,48,${0.45 * pulse})` },
      { dx: 12, colour: `rgba(70,130,255,${0.45 * (1.05 - pulse)})` },
    ];
    for (const side of sides) {
      const glow = ctx.createRadialGradient(car.x + side.dx, car.y, 2, car.x + side.dx, car.y, 60);
      glow.addColorStop(0, side.colour);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(car.x + side.dx, car.y, 60, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** A parked car never moves, so it is drawn slightly darker with a longer shadow. */
export function drawParkedVehicle(ctx, car, night, time) {
  drawVehicle(ctx, car, night, time);
}

export { DISTRICT_STYLE };