import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** Landmark indices useful for ASL location relative to the face. */
export const FACE_INDEX = {
  FOREHEAD: 10,
  NOSE_TIP: 1,
  CHIN: 152,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
};

let faceLandmarker = null;
let initPromise = null;

export async function initFaceTracker() {
  if (faceLandmarker) return faceLandmarker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    const options = {
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    try {
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
      });
    } catch {
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'CPU' },
      });
    }
    return faceLandmarker;
  })();

  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

/**
 * Detect face landmarks and return a compact summary for position rules.
 */
export function detectFace(video, timestampMs) {
  if (!faceLandmarker || !video || video.readyState < 2) {
    return null;
  }

  const result = faceLandmarker.detectForVideo(video, timestampMs);
  if (!result.faceLandmarks?.length) return null;

  const lm = result.faceLandmarks[0];
  const forehead = lm[FACE_INDEX.FOREHEAD];
  const chin = lm[FACE_INDEX.CHIN];
  const nose = lm[FACE_INDEX.NOSE_TIP];
  const leftCheek = lm[FACE_INDEX.LEFT_CHEEK];
  const rightCheek = lm[FACE_INDEX.RIGHT_CHEEK];

  if (!forehead || !chin) return null;

  const faceHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y) || 0.2;
  const faceWidth =
    leftCheek && rightCheek
      ? Math.hypot(rightCheek.x - leftCheek.x, rightCheek.y - leftCheek.y)
      : faceHeight * 0.7;

  return {
    landmarks: lm,
    forehead,
    chin,
    nose,
    faceHeight,
    faceWidth,
    center: {
      x: (forehead.x + chin.x) / 2,
      y: (forehead.y + chin.y) / 2,
      z: ((forehead.z ?? 0) + (chin.z ?? 0)) / 2,
    },
  };
}

export function disposeFaceTracker() {
  if (faceLandmarker) {
    faceLandmarker.close();
    faceLandmarker = null;
  }
  initPromise = null;
}
