// Small maths helpers shared by the simulation and the renderer: clamping, smoothing,
// angle arithmetic and the two collision tests the whole game is built on (circle against
// rectangle, and rectangle against rectangle). Nothing here touches the DOM.

export const TAU = Math.PI * 2;

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Frame-rate independent smoothing: the fraction of the gap closed in `dt` seconds. */
export function damp(a, b, lambda, dt) {
  return lerp(a, b, 1 - Math.exp(-lambda * dt));
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** An angle wrapped into (-PI, PI]. */
export function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= TAU;
  while (a <= -Math.PI) a += TAU;
  return a;
}

/** The signed turn from `from` to `to`, in (-PI, PI]. */
export function angleDiff(from, to) {
  return normalizeAngle(to - from);
}

/** Move an angle toward another by at most `step` radians. */
export function turnToward(angle, target, step) {
  const diff = angleDiff(angle, target);
  if (Math.abs(diff) <= step) return target;
  return normalizeAngle(angle + Math.sign(diff) * step);
}

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

/** True when a circle touches a rectangle: the test used for every prop and building hit. */
export function circleHitsRect(cx, cy, radius, rect) {
  const nearX = clamp(cx, rect.x, rect.x + rect.w);
  const nearY = clamp(cy, rect.y, rect.y + rect.h);
  return dist2(cx, cy, nearX, nearY) <= radius * radius;
}

/**
 * Push a circle out of a rectangle along the shallowest axis and report whether it moved.
 * Used for people and for the two collision circles of a car.
 */
export function pushCircleFromRect(body, rect, radius) {
  const nearX = clamp(body.x, rect.x, rect.x + rect.w);
  const nearY = clamp(body.y, rect.y, rect.y + rect.h);
  const dx = body.x - nearX;
  const dy = body.y - nearY;
  const d2 = dx * dx + dy * dy;
  if (d2 > radius * radius) return false;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    const push = radius - d;
    body.x += (dx / d) * push;
    body.y += (dy / d) * push;
    return true;
  }
  // The centre is inside the rectangle: leave by the nearest face.
  const left = body.x - rect.x;
  const right = rect.x + rect.w - body.x;
  const top = body.y - rect.y;
  const bottom = rect.y + rect.h - body.y;
  const smallest = Math.min(left, right, top, bottom);
  if (smallest === left) body.x = rect.x - radius;
  else if (smallest === right) body.x = rect.x + rect.w + radius;
  else if (smallest === top) body.y = rect.y - radius;
  else body.y = rect.y + rect.h + radius;
  return true;
}

/** Squared distance from a point to a segment: the bullet-versus-person test. */
export function pointSegmentDistance2(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  let t = lengthSq > 0 ? ((px - ax) * abx + (py - ay) * aby) / lengthSq : 0;
  t = clamp(t, 0, 1);
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return dist2(px, py, cx, cy);
}

/** The closest point on a segment, written into `out`. */
export function closestPointOnSegment(px, py, ax, ay, bx, by, out) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  let t = lengthSq > 0 ? ((px - ax) * abx + (py - ay) * aby) / lengthSq : 0;
  t = clamp(t, 0, 1);
  out.x = ax + abx * t;
  out.y = ay + aby * t;
  return out;
}

/** Whether a point is inside the circle, for the cheap pickups and blasts. */
export function circleHitsCircle(ax, ay, ar, bx, by, br) {
  const r = ar + br;
  return dist2(ax, ay, bx, by) <= r * r;
}
