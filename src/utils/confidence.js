import { CONFIDENCE } from '../data/thresholds';

export function isHandConfident(hand) {
  if (!hand?.landmarks?.length) return false;
  const score = hand.score ?? hand.presence ?? 1;
  return score >= CONFIDENCE.minHandPresence;
}

export function areLandmarksInFrame(landmarks, margin = 0.02) {
  if (!landmarks?.length) return false;
  return landmarks.every(
    (lm) =>
      lm.x >= -margin &&
      lm.x <= 1 + margin &&
      lm.y >= -margin &&
      lm.y <= 1 + margin,
  );
}

export function estimatePartialOcclusion(landmarks) {
  if (!landmarks?.length) return true;
  const outside = landmarks.filter(
    (lm) => lm.x < 0 || lm.x > 1 || lm.y < 0 || lm.y > 1,
  ).length;
  return outside / landmarks.length > 0.15;
}

export function pickPrimaryHand(hands, preferred = 'either') {
  const confident = (hands ?? []).filter(isHandConfident);
  if (!confident.length) return null;

  if (preferred === 'left' || preferred === 'right') {
    const match = confident.find(
      (h) => (h.handedness || '').toLowerCase() === preferred,
    );
    if (match) return match;
  }

  // Prefer highest score; fallback to first
  return [...confident].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
}

/**
 * Tracking guidance only — landmark visibility, not ASL correctness.
 */
export function trackingStatusLabel({ hands, face, cameraActive }) {
  if (!cameraActive) return { code: 'camera_off', text: 'Camera is off' };
  if (!hands?.length) {
    return {
      code: 'no_hand',
      text: 'No hand detected — move into the camera frame and keep your hand fully visible',
    };
  }
  const primary = pickPrimaryHand(hands);
  if (!primary) {
    return {
      code: 'low_confidence',
      text: 'Hand not clearly visible — move closer or improve lighting',
    };
  }
  if (estimatePartialOcclusion(primary.landmarks)) {
    return {
      code: 'partial',
      text: 'Make sure your entire hand is fully visible in the frame',
    };
  }
  const handLabel = primary.handedness
    ? `${primary.handedness} hand visible`
    : 'Hand visible';
  if (!face) {
    return {
      code: 'hand_only',
      text: `${handLabel}. Make sure your face / upper body is also visible`,
    };
  }
  return { code: 'ok', text: `${handLabel}. Face visible` };
}
