// Everything that is thrown off by the simulation and only lives for a moment: sparks, smoke,
// dust, glass, tyre marks, muzzle flashes, explosion rings and the screen shake that sells an
// impact. The state lives here; the drawing lives in render/particles.js.

import { clamp } from '../geometry.js';

const MAX_PARTICLES = 520;
const MAX_MARKS = 900;

export function createEffects(rng) {
  return {
    rng,
    particles: [],
    marks: [],
    flashes: [],
    rings: [],
    shake: 0,
    shakeTime: 0,
    /** A puff of sparks at an impact point, thrown back along `angle`. */
    sparks(x, y, angle, count = 6, color = '#ffd98a') {
      for (let index = 0; index < count; index += 1) {
        const spread = angle + this.rng.range(-0.9, 0.9);
        const speed = this.rng.range(60, 260);
        this.push({
          kind: 'spark',
          x,
          y,
          vx: Math.cos(spread) * speed,
          vy: Math.sin(spread) * speed,
          life: this.rng.range(0.16, 0.42),
          maxLife: 0.42,
          size: this.rng.range(1.2, 2.6),
          color,
        });
      }
    },
    /** Grey smoke, drifting up the screen and swelling as it fades. */
    smoke(x, y, strength = 1) {
      this.push({
        kind: 'smoke',
        x: x + this.rng.range(-6, 6),
        y: y + this.rng.range(-6, 6),
        vx: this.rng.range(-16, 16),
        vy: this.rng.range(-26, -6),
        life: this.rng.range(0.9, 1.9) * strength,
        maxLife: 1.9 * strength,
        size: this.rng.range(7, 15) * strength,
        color: '#3a3a40',
      });
    },
    dust(x, y) {
      this.push({
        kind: 'dust',
        x,
        y,
        vx: this.rng.range(-30, 30),
        vy: this.rng.range(-30, 10),
        life: this.rng.range(0.3, 0.7),
        maxLife: 0.7,
        size: this.rng.range(4, 9),
        color: '#c9b48a',
      });
    },
    glass(x, y, angle) {
      for (let index = 0; index < 7; index += 1) {
        const spread = angle + this.rng.range(-1.4, 1.4);
        this.push({
          kind: 'glass',
          x,
          y,
          vx: Math.cos(spread) * this.rng.range(50, 190),
          vy: Math.sin(spread) * this.rng.range(50, 190),
          life: this.rng.range(0.3, 0.6),
          maxLife: 0.6,
          size: this.rng.range(1.5, 3.4),
          color: '#dff4ff',
        });
      }
    },
    muzzle(x, y, angle) {
      this.flashes.push({ x, y, angle, life: 0.075, maxLife: 0.075 });
      for (let index = 0; index < 3; index += 1) {
        this.push({
          kind: 'spark',
          x,
          y,
          vx: Math.cos(angle) * this.rng.range(120, 300),
          vy: Math.sin(angle) * this.rng.range(120, 300),
          life: 0.1,
          maxLife: 0.1,
          size: 1.6,
          color: '#fff3c4',
        });
      }
    },
    ring(x, y, color = '#ffb057', size = 40) {
      this.rings.push({ x, y, life: 0.5, maxLife: 0.5, size, color });
    },
    explosion(x, y) {
      this.ring(x, y, '#ffb057', 70);
      for (let index = 0; index < 16; index += 1) {
        this.sparks(x, y, this.rng.range(0, 6.28), 2, index % 2 ? '#ffb057' : '#ffe9a8');
        this.smoke(x, y, 1.3);
      }
      this.shake = Math.min(22, this.shake + 16);
    },
    /** A black strip on the tarmac. Marks are permanent until the list is full. */
    skid(x, y, angle, strength) {
      const last = this.marks[this.marks.length - 1];
      if (last && Math.abs(last.x - x) < 3 && Math.abs(last.y - y) < 3) return;
      this.marks.push({ x, y, angle, alpha: clamp(strength, 0.05, 0.55) });
      if (this.marks.length > MAX_MARKS) this.marks.shift();
    },
    push(particle) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      this.particles.push(particle);
    },
    update(dt) {
      for (let index = this.particles.length - 1; index >= 0; index -= 1) {
        const p = this.particles[index];
        p.life -= dt;
        if (p.life <= 0) {
          this.particles.splice(index, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === 'spark' || p.kind === 'glass') {
          p.vx *= 0.94;
          p.vy *= 0.94;
        } else if (p.kind === 'smoke') {
          p.vx *= 0.99;
          p.vy *= 0.985;
          p.size += dt * 16;
        } else {
          p.vx *= 0.96;
          p.vy *= 0.96;
        }
      }
      for (let index = this.flashes.length - 1; index >= 0; index -= 1) {
        this.flashes[index].life -= dt;
        if (this.flashes[index].life <= 0) this.flashes.splice(index, 1);
      }
      for (let index = this.rings.length - 1; index >= 0; index -= 1) {
        this.rings[index].life -= dt;
        if (this.rings[index].life <= 0) this.rings.splice(index, 1);
      }
      this.shake = Math.max(0, this.shake - dt * 26);
    },
    /** Clears the transient bits but keeps the tyre marks, for a respawn. */
    clearTransient() {
      this.particles.length = 0;
      this.flashes.length = 0;
      this.rings.length = 0;
      this.shake = 0;
    },
  };
}
