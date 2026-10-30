/** Vector and landmark geometry helpers (normalized landmark space). */

export function distance(a, b) {
  if (!a || !b) return null;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

export function distance2D(a, b) {
  if (!a || !b) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function subtract(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: (a.z ?? 0) - (b.z ?? 0),
  };
}

export function add(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: (a.z ?? 0) + (b.z ?? 0),
  };
}

export function scale(v, s) {
  return { x: v.x * s, y: v.y * s, z: (v.z ?? 0) * s };
}

export function magnitude(v) {
  return Math.hypot(v.x, v.y, v.z ?? 0);
}

export function normalize(v) {
  const m = magnitude(v);
  if (!m || m < 1e-8) return { x: 0, y: 0, z: 0 };
  return scale(v, 1 / m);
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + (a.z ?? 0) * (b.z ?? 0);
}

export function cross(a, b) {
  return {
    x: a.y * (b.z ?? 0) - (a.z ?? 0) * b.y,
    y: (a.z ?? 0) * b.x - a.x * (b.z ?? 0),
    z: a.x * b.y - a.y * b.x,
  };
}

/** Angle at point B formed by points A–B–C, in degrees. */
export function angleDegrees(a, b, c) {
  const ba = subtract(a, b);
  const bc = subtract(c, b);
  const ma = magnitude(ba);
  const mc = magnitude(bc);
  if (!ma || !mc) return null;
  const cos = Math.min(1, Math.max(-1, dot(ba, bc) / (ma * mc)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
  };
}

/** Approximate palm normal from wrist, index MCP, pinky MCP. */
export function palmNormal(wrist, indexMcp, pinkyMcp) {
  const v1 = subtract(indexMcp, wrist);
  const v2 = subtract(pinkyMcp, wrist);
  return normalize(cross(v1, v2));
}

/** Path length of a sequence of 2D/3D points. */
export function pathLength(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += distance(points[i - 1], points[i]) ?? 0;
  }
  return total;
}

/** Net displacement vector from first to last point. */
export function netDisplacement(points) {
  if (!points || points.length < 2) return { x: 0, y: 0, z: 0 };
  return subtract(points[points.length - 1], points[0]);
}

/** Count vertical direction reversals (for nodding). */
export function countAxisReversals(points, axis = 'y', minDelta = 0.015) {
  if (!points || points.length < 3) return 0;
  let reversals = 0;
  let lastSign = 0;
  for (let i = 1; i < points.length; i += 1) {
    const delta = points[i][axis] - points[i - 1][axis];
    if (Math.abs(delta) < minDelta) continue;
    const sign = Math.sign(delta);
    if (lastSign !== 0 && sign !== lastSign) reversals += 1;
    lastSign = sign;
  }
  return reversals;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function average(values) {
  if (!values?.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
