import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let handLandmarker = null;
let initPromise = null;

export async function initHandTracker() {
  if (handLandmarker) return handLandmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    const options = {
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    try {
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
      });
    } catch {
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'CPU' },
      });
    }
    return handLandmarker;
  })();

  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

/**
 * Detect hands for a video frame.
 * Returns a normalized array of { landmarks, worldLandmarks, handedness, score }.
 */
export function detectHands(video, timestampMs) {
  if (!handLandmarker || !video || video.readyState < 2) {
    return [];
  }

  const result = handLandmarker.detectForVideo(video, timestampMs);
  const hands = [];

  const count = result.landmarks?.length ?? 0;
  for (let i = 0; i < count; i += 1) {
    const handednessCategory =
      result.handedness?.[i]?.[0] ?? result.handednesses?.[i]?.[0];
    hands.push({
      landmarks: result.landmarks[i],
      worldLandmarks: result.worldLandmarks?.[i] ?? null,
      handedness: handednessCategory?.categoryName ?? 'Unknown',
      score: handednessCategory?.score ?? 1,
      presence: handednessCategory?.score ?? 1,
    });
  }

  return hands;
}

export function disposeHandTracker() {
  if (handLandmarker) {
    handLandmarker.close();
    handLandmarker = null;
  }
  initPromise = null;
}

/** MediaPipe hand connections for drawing. */
export const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];
