import { HANDSHAPE } from '../data/thresholds';
import {
  angleDegrees,
  distance,
  distance2D,
  palmNormal,
  average,
} from '../utils/geometry';

/** MediaPipe hand landmark indices */
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

const FINGER_JOINTS = {
  thumb: [LM.THUMB_CMC, LM.THUMB_MCP, LM.THUMB_IP, LM.THUMB_TIP],
  index: [LM.INDEX_MCP, LM.INDEX_PIP, LM.INDEX_DIP, LM.INDEX_TIP],
  middle: [LM.MIDDLE_MCP, LM.MIDDLE_PIP, LM.MIDDLE_DIP, LM.MIDDLE_TIP],
  ring: [LM.RING_MCP, LM.RING_PIP, LM.RING_DIP, LM.RING_TIP],
  pinky: [LM.PINKY_MCP, LM.PINKY_PIP, LM.PINKY_DIP, LM.PINKY_TIP],
};

function palmScale(landmarks) {
  const wrist = landmarks[LM.WRIST];
  const middleMcp = landmarks[LM.MIDDLE_MCP];
  const scale = distance(wrist, middleMcp);
  return scale && scale > 1e-6 ? scale : 0.1;
}

export function fingerExtension(landmarks, fingerName) {
  const joints = FINGER_JOINTS[fingerName];
  if (!joints || landmarks.length < 21) return null;

  if (fingerName === 'thumb') {
    const [cmc, mcp, ip, tip] = joints.map((i) => landmarks[i]);
    const angle = angleDegrees(cmc, mcp, tip);
    const tipDist = distance(tip, landmarks[LM.INDEX_MCP]);
    const scale = palmScale(landmarks);
    return {
      name: fingerName,
      angle,
      tipToPalmNorm: tipDist != null ? tipDist / scale : null,
      extended: angle != null ? angle > 140 : null,
      bent: angle != null ? angle < 130 : null,
      debug: { angle, tipToIndexMcpNorm: tipDist != null ? tipDist / scale : null },
    };
  }

  const [mcp, pip, dip, tip] = joints.map((i) => landmarks[i]);
  const pipAngle = angleDegrees(mcp, pip, tip);
  const scale = palmScale(landmarks);
  const tipToWrist = distance(tip, landmarks[LM.WRIST]);
  const tipNorm = tipToWrist != null ? tipToWrist / scale : null;

  const extended =
    pipAngle != null ? pipAngle >= HANDSHAPE.extendedAngleMin : null;
  const bent = pipAngle != null ? pipAngle <= HANDSHAPE.bentAngleMax : null;

  return {
    name: fingerName,
    angle: pipAngle,
    tipToWristNorm: tipNorm,
    extended,
    bent,
    debug: {
      pipAngle,
      expectedExtended: `>${HANDSHAPE.extendedAngleMin}°`,
      expectedBent: `<${HANDSHAPE.bentAngleMax}°`,
      tipToWristNorm: tipNorm,
    },
  };
}

export function extractHandshape(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return { assessable: false, reason: 'Insufficient hand landmarks' };
  }

  const fingers = {};
  for (const name of Object.keys(FINGER_JOINTS)) {
    fingers[name] = fingerExtension(landmarks, name);
  }

  const nonThumb = ['index', 'middle', 'ring', 'pinky']
    .map((n) => fingers[n])
    .filter(Boolean);
  const angles = nonThumb.map((f) => f.angle).filter((a) => a != null);
  const tipNorms = nonThumb.map((f) => f.tipToWristNorm).filter((v) => v != null);
  const avgAngle = average(angles);
  const avgTipNorm = average(tipNorms);

  const extendedCount = nonThumb.filter((f) => f.extended).length;
  const bentCount = nonThumb.filter((f) => f.bent).length;

  let openness = 'unknown';
  if (avgTipNorm != null) {
    if (avgTipNorm >= HANDSHAPE.openTipSpreadMin && extendedCount >= 3) {
      openness = 'open';
    } else if (avgTipNorm <= HANDSHAPE.closedTipSpreadMax && bentCount >= 3) {
      openness = 'closed';
    } else if (bentCount >= 2 && extendedCount <= 1) {
      openness = 'mostly_closed';
    } else if (extendedCount >= 3) {
      openness = 'mostly_open';
    } else {
      openness = 'partial';
    }
  }

  const scale = palmScale(landmarks);
  const thumbTip = landmarks[LM.THUMB_TIP];
  const indexTip = landmarks[LM.INDEX_TIP];
  const middleTip = landmarks[LM.MIDDLE_TIP];
  const indexMcp = landmarks[LM.INDEX_MCP];

  const thumbToIndexTip =
    distance(thumbTip, indexTip) != null ? distance(thumbTip, indexTip) / scale : null;
  const thumbToIndexMcp =
    distance(thumbTip, indexMcp) != null ? distance(thumbTip, indexMcp) / scale : null;
  const indexMiddleSpacing =
    distance(indexTip, middleTip) != null ? distance(indexTip, middleTip) / scale : null;

  return {
    assessable: true,
    fingers,
    openness,
    extendedCount,
    bentCount,
    avgAngle,
    avgTipNorm,
    thumbToIndexTip,
    thumbToIndexMcp,
    indexMiddleSpacing,
    debug: {
      avgFingerAngle: avgAngle,
      avgTipToWristNorm: avgTipNorm,
      openness,
      extendedCount,
      bentCount,
      openThreshold: HANDSHAPE.openTipSpreadMin,
      closedThreshold: HANDSHAPE.closedTipSpreadMax,
    },
  };
}

export function extractPalmOrientation(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return { assessable: false, reason: 'Insufficient landmarks for orientation' };
  }

  const wrist = landmarks[LM.WRIST];
  const indexMcp = landmarks[LM.INDEX_MCP];
  const pinkyMcp = landmarks[LM.PINKY_MCP];
  const middleMcp = landmarks[LM.MIDDLE_MCP];

  const normal = palmNormal(wrist, indexMcp, pinkyMcp);
  // Camera looks along -Z in MediaPipe image space approximation;
  // facing camera ≈ normal.z pointing toward camera (negative z often).
  // Using image coords: outward from palm. For mirrored selfie view this is approximate.
  const towardCamera = -normal.z;
  const palmUp = -normal.y;

  const wristToMiddle = {
    x: middleMcp.x - wrist.x,
    y: middleMcp.y - wrist.y,
    z: (middleMcp.z ?? 0) - (wrist.z ?? 0),
  };

  return {
    assessable: true,
    normal,
    towardCamera,
    palmUp,
    wristToMiddle,
    facingSelfOrCamera: towardCamera > 0.15,
    facingOut: towardCamera < -0.05,
    debug: {
      normalZ: normal.z,
      towardCamera,
      note: 'Approximate 2D/3D estimate from wrist–index–pinky; not precise 3D orientation.',
    },
  };
}

export function extractHandPosition(handLandmarks, face) {
  if (!handLandmarks || handLandmarks.length < 21) {
    return { assessable: false, reason: 'No hand landmarks' };
  }

  const wrist = handLandmarks[LM.WRIST];
  const middleMcp = handLandmarks[LM.MIDDLE_MCP];
  const handCenter = {
    x: (wrist.x + middleMcp.x) / 2,
    y: (wrist.y + middleMcp.y) / 2,
    z: ((wrist.z ?? 0) + (middleMcp.z ?? 0)) / 2,
  };

  if (!face) {
    return {
      assessable: false,
      reason: 'Face not detected — cannot estimate relative position',
      handCenter,
      screenY: handCenter.y,
    };
  }

  const faceH = face.faceHeight || 0.2;
  const distForehead = distance2D(handCenter, face.forehead) / faceH;
  const distChin = distance2D(handCenter, face.chin) / faceH;
  const yRelForehead = (handCenter.y - face.forehead.y) / faceH;
  const yRelChin = (handCenter.y - face.chin.y) / faceH;

  return {
    assessable: true,
    handCenter,
    distForehead,
    distChin,
    yRelForehead,
    yRelChin,
    nearForehead: distForehead <= 0.55 && Math.abs(yRelForehead) <= 0.45,
    nearChin: distChin <= 0.5 && Math.abs(yRelChin) <= 0.45,
    debug: {
      distForehead,
      distChin,
      yRelForehead,
      yRelChin,
      faceHeight: faceH,
    },
  };
}

export function extractFrameFeatures(hand, face) {
  if (!hand?.landmarks) {
    return { assessable: false, reason: 'No primary hand' };
  }

  const handshape = extractHandshape(hand.landmarks);
  const orientation = extractPalmOrientation(hand.landmarks);
  const position = extractHandPosition(hand.landmarks, face);
  const wrist = hand.landmarks[LM.WRIST];
  const scale = palmScale(hand.landmarks);

  return {
    assessable: true,
    handedness: hand.handedness,
    score: hand.score,
    wrist,
    palmScale: scale,
    handshape,
    orientation,
    position,
  };
}
