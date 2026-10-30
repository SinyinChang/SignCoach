/**
 * Tunable thresholds for rule-based sign evaluation.
 * Prefer normalized distances, joint angles, and tolerance ranges
 * over rigid pixel values.
 */

export const CONFIDENCE = {
  minHandPresence: 0.55,
  minTracking: 0.5,
  minFacePresence: 0.5,
};

export const HANDSHAPE = {
  /** Degrees: MCP–PIP–DIP angle above this ≈ extended finger */
  extendedAngleMin: 150,
  /** Degrees: below this ≈ clearly bent */
  bentAngleMax: 120,
  /** Normalized tip-to-wrist distance ratios for open hand */
  openTipSpreadMin: 0.55,
  closedTipSpreadMax: 0.38,
  /** Thumb tip near index MCP for fist-like shapes */
  thumbFistProximityMax: 0.35,
};

export const POSITION = {
  /** Hand-to-forehead distance (normalized by face height) */
  foreheadNearMax: 0.55,
  foreheadNearMin: 0.05,
  /** Hand near chin */
  chinNearMax: 0.5,
  chinNearMin: 0.05,
  /** Upper-face band (y relative to face) */
  foreheadYMaxOffset: 0.35,
};

export const MOVEMENT = {
  /** Minimum normalized path length to count as intentional movement */
  minPathLength: 0.08,
  /** Minimum attempt frames */
  minFrames: 8,
  /** Minimum duration in ms */
  minDurationMs: 400,
  /** Direction agreement: cosine similarity / axis dominance */
  outwardDominance: 0.35,
  verticalDominance: 0.3,
  /** Repeated vertical direction reversals */
  minReversals: 1,
};

export const ORIENTATION = {
  /** Palm facing roughly toward camera / self */
  facingSelfDotMin: 0.25,
  facingOutDotMax: -0.1,
};
