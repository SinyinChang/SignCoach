import { MOVEMENT } from '../data/thresholds';
import {
  pathLength,
  netDisplacement,
  countAxisReversals,
  distance,
  magnitude,
} from '../utils/geometry';
import { LM } from './featureExtractor';

/**
 * Analyze wrist trajectory and secondary metrics from an attempt sequence.
 * sequence items: { t, hand, face, features }
 */
export function analyzeMovement(sequence) {
  if (!sequence?.length) {
    return {
      assessable: false,
      reason: 'No frames recorded',
    };
  }

  const durationMs = sequence[sequence.length - 1].t - sequence[0].t;
  const wrists = sequence
    .map((frame) => frame.hand?.landmarks?.[LM.WRIST] ?? frame.features?.wrist)
    .filter(Boolean);

  if (wrists.length < MOVEMENT.minFrames || durationMs < MOVEMENT.minDurationMs) {
    return {
      assessable: false,
      reason: 'Insufficient movement data — hold the attempt longer with your hand visible',
      frameCount: wrists.length,
      durationMs,
      debug: {
        frameCount: wrists.length,
        minFrames: MOVEMENT.minFrames,
        durationMs,
        minDurationMs: MOVEMENT.minDurationMs,
      },
    };
  }

  const scales = sequence
    .map((f) => f.features?.palmScale)
    .filter((s) => s != null && s > 0);
  const avgScale =
    scales.length > 0
      ? scales.reduce((a, b) => a + b, 0) / scales.length
      : 0.1;

  const rawPath = pathLength(wrists);
  const pathNorm = rawPath / avgScale;
  const displacement = netDisplacement(wrists);
  const dispMag = magnitude(displacement) / avgScale;

  // Image coords: x increases right, y increases down.
  // "Outward" from face for a right-hand selfie (mirrored) is often +x or -x depending;
  // we treat significant horizontal OR away-from-face as outward.
  const absX = Math.abs(displacement.x);
  const absY = Math.abs(displacement.y);
  const dominant =
    absX >= absY ? 'horizontal' : displacement.y > 0 ? 'down' : 'up';

  const outward =
    pathNorm >= MOVEMENT.minPathLength &&
    (absX / (Math.hypot(displacement.x, displacement.y) || 1e-6) >=
      MOVEMENT.outwardDominance ||
      dispMag >= MOVEMENT.minPathLength);

  const forwardDown =
    pathNorm >= MOVEMENT.minPathLength * 0.8 &&
    (displacement.y > 0 || Math.abs(displacement.z ?? 0) > 0.02 || absX > 0.02);

  const verticalReversals = countAxisReversals(wrists, 'y', 0.012);
  const verticalNod =
    pathNorm >= MOVEMENT.minPathLength * 0.5 &&
    (verticalReversals >= MOVEMENT.minReversals ||
      (dominant === 'up' || dominant === 'down') && dispMag >= MOVEMENT.minPathLength * 0.6);

  // Closing pinch: track index tip to thumb tip distance over time
  const pinchDistances = sequence
    .map((frame) => {
      const lm = frame.hand?.landmarks;
      if (!lm) return null;
      const scale = frame.features?.palmScale || avgScale;
      const d = distance(lm[LM.INDEX_TIP], lm[LM.THUMB_TIP]);
      return d != null ? d / scale : null;
    })
    .filter((v) => v != null);

  let closingPinch = false;
  let pinchDelta = null;
  if (pinchDistances.length >= 4) {
    const early =
      pinchDistances.slice(0, Math.ceil(pinchDistances.length / 3)).reduce((a, b) => a + b, 0) /
      Math.ceil(pinchDistances.length / 3);
    const late =
      pinchDistances.slice(-Math.ceil(pinchDistances.length / 3)).reduce((a, b) => a + b, 0) /
      Math.ceil(pinchDistances.length / 3);
    pinchDelta = early - late;
    closingPinch = pinchDelta > 0.12;
  }

  const occurred = pathNorm >= MOVEMENT.minPathLength * 0.5;

  return {
    assessable: true,
    frameCount: wrists.length,
    durationMs,
    pathNorm,
    dispMag,
    displacement: {
      x: displacement.x / avgScale,
      y: displacement.y / avgScale,
      z: (displacement.z ?? 0) / avgScale,
    },
    dominant,
    occurred,
    outward,
    forwardDown,
    verticalNod,
    verticalReversals,
    closingPinch,
    pinchDelta,
    debug: {
      pathNorm,
      dispMag,
      minPathLength: MOVEMENT.minPathLength,
      dominant,
      outward,
      forwardDown,
      verticalNod,
      verticalReversals,
      closingPinch,
      pinchDelta,
      avgPalmScale: avgScale,
    },
  };
}

/** Summarize early vs late frame features for phase-based rules. */
export function phaseSnapshots(sequence) {
  if (!sequence?.length) return { start: null, end: null, mid: null };
  const start = sequence[0]?.features ?? null;
  const end = sequence[sequence.length - 1]?.features ?? null;
  const mid = sequence[Math.floor(sequence.length / 2)]?.features ?? null;
  return { start, end, mid };
}
