import { STATUS, getComponentMessage } from '../data/feedbackMessages';
import { POSITION, ORIENTATION } from '../data/thresholds';
import { makeComponentResult, makeFeedbackPayload } from '../feedback/feedbackSchema';
import { pickPrimaryHand, isHandConfident } from '../utils/confidence';
import { extractFrameFeatures } from './featureExtractor';
import { analyzeMovement, phaseSnapshots } from './movementAnalyzer';

function enrichSequence(rawSequence, preferredHand = 'either') {
  return (rawSequence ?? [])
    .map((frame) => {
      const hand = pickPrimaryHand(frame.hands, preferredHand);
      if (!hand || !isHandConfident(hand)) return null;
      const features = extractFrameFeatures(hand, frame.face);
      if (!features.assessable) return null;
      return {
        t: frame.t,
        hand,
        face: frame.face ?? null,
        features,
      };
    })
    .filter(Boolean);
}

function evaluateHandshape(sign, snapshots, movement) {
  const req = sign.requirements?.handshape;
  if (!req) return null;

  const samples = [snapshots.start, snapshots.mid, snapshots.end].filter(Boolean);
  const withShape = samples.filter((s) => s.handshape?.assessable);
  if (!withShape.length) {
    return makeComponentResult(
      STATUS.UNABLE,
      getComponentMessage(sign.id, 'handshape', STATUS.UNABLE),
      { reason: 'No assessable handshape frames' },
    );
  }

  const best = withShape[0];
  const shape = best.handshape;

  if (req.type === 'open_flat') {
    const openOk =
      shape.openness === 'open' ||
      shape.openness === 'mostly_open' ||
      (shape.extendedCount >= 3 && shape.avgTipNorm >= 0.5);
    return makeComponentResult(
      openOk ? STATUS.MATCHED : STATUS.IMPROVE,
      getComponentMessage(
        sign.id,
        'handshape',
        openOk ? STATUS.MATCHED : STATUS.IMPROVE,
      ),
      {
        ...shape.debug,
        result: openOk ? 'matched' : 'possible mismatch',
        expected: 'open / mostly_open flat hand',
      },
    );
  }

  if (req.type === 'fist') {
    const fistOk =
      shape.openness === 'closed' ||
      shape.openness === 'mostly_closed' ||
      (shape.bentCount >= 3 && shape.avgTipNorm <= 0.45);
    return makeComponentResult(
      fistOk ? STATUS.MATCHED : STATUS.IMPROVE,
      getComponentMessage(
        sign.id,
        'handshape',
        fistOk ? STATUS.MATCHED : STATUS.IMPROVE,
      ),
      {
        ...shape.debug,
        result: fistOk ? 'matched' : 'possible mismatch',
        expected: 'closed fist',
      },
    );
  }

  if (req.type === 'no_fingers') {
    // Prefer end-of-attempt when fingers may have closed
    const endShape = snapshots.end?.handshape ?? shape;
    const pinchClosing = movement?.closingPinch;
    const tipsClose =
      endShape.thumbToIndexTip != null && endShape.thumbToIndexTip < 0.55;
    const indexExtendedEarly =
      snapshots.start?.handshape?.fingers?.index?.extended === true ||
      snapshots.start?.handshape?.fingers?.index?.angle > 140;

    const ok = pinchClosing || (tipsClose && indexExtendedEarly);
    const unsure =
      endShape.thumbToIndexTip == null && pinchClosing == null;

    if (unsure) {
      return makeComponentResult(
        STATUS.UNABLE,
        getComponentMessage(sign.id, 'handshape', STATUS.UNABLE),
        { reason: 'Could not measure finger-to-thumb distance' },
      );
    }

    return makeComponentResult(
      ok ? STATUS.MATCHED : STATUS.IMPROVE,
      getComponentMessage(
        sign.id,
        'handshape',
        ok ? STATUS.MATCHED : STATUS.IMPROVE,
      ),
      {
        thumbToIndexTip: endShape.thumbToIndexTip,
        closingPinch: pinchClosing,
        result: ok ? 'matched' : 'possible mismatch',
        expected: 'index/middle toward thumb (closing)',
      },
    );
  }

  return makeComponentResult(
    STATUS.UNABLE,
    getComponentMessage(sign.id, 'handshape', STATUS.UNABLE),
    { reason: `Unknown handshape type: ${req.type}` },
  );
}

function evaluatePosition(sign, snapshots) {
  const req = sign.requirements?.location;
  if (!req) return null;

  const start = snapshots.start;
  if (!start?.position) {
    return makeComponentResult(
      STATUS.UNABLE,
      getComponentMessage(sign.id, 'position', STATUS.UNABLE),
      { reason: 'Missing start position features' },
    );
  }

  if (!start.position.assessable) {
    return makeComponentResult(
      STATUS.UNABLE,
      getComponentMessage(sign.id, 'position', STATUS.UNABLE),
      {
        reason: start.position.reason,
        screenY: start.position.screenY,
      },
    );
  }

  const pos = start.position;

  if (req.type === 'near_forehead') {
    const near =
      pos.distForehead <= POSITION.foreheadNearMax &&
      pos.yRelForehead <= POSITION.foreheadYMaxOffset &&
      pos.yRelForehead >= -0.5;
    return makeComponentResult(
      near ? STATUS.MATCHED : STATUS.IMPROVE,
      getComponentMessage(
        sign.id,
        'position',
        near ? STATUS.MATCHED : STATUS.IMPROVE,
      ),
      {
        ...pos.debug,
        expected: `forehead distance ${POSITION.foreheadNearMin}–${POSITION.foreheadNearMax}`,
        result: near ? 'matched' : 'possible mismatch',
      },
    );
  }

  if (req.type === 'near_chin') {
    const near =
      pos.distChin <= POSITION.chinNearMax && Math.abs(pos.yRelChin) <= 0.55;
    return makeComponentResult(
      near ? STATUS.MATCHED : STATUS.IMPROVE,
      getComponentMessage(
        sign.id,
        'position',
        near ? STATUS.MATCHED : STATUS.IMPROVE,
      ),
      {
        ...pos.debug,
        expected: `chin distance ≤ ${POSITION.chinNearMax}`,
        result: near ? 'matched' : 'possible mismatch',
      },
    );
  }

  return makeComponentResult(
    STATUS.UNABLE,
    getComponentMessage(sign.id, 'position', STATUS.UNABLE),
    { reason: `Unknown location type: ${req.type}` },
  );
}

function evaluateOrientation(sign, snapshots) {
  const req = sign.requirements?.orientation;
  if (!req) return null;

  const start = snapshots.start;
  if (!start?.orientation?.assessable) {
    return makeComponentResult(
      STATUS.UNABLE,
      getComponentMessage(sign.id, 'orientation', STATUS.UNABLE),
      { reason: start?.orientation?.reason ?? 'Orientation not assessable' },
    );
  }

  const ori = start.orientation;

  if (req.type === 'palm_toward_self_or_camera') {
    const ok =
      ori.towardCamera >= ORIENTATION.facingSelfDotMin ||
      ori.facingSelfOrCamera;
    // Soft fail: orientation is approximate
    const unclear = Math.abs(ori.towardCamera) < 0.08;
    if (unclear) {
      return makeComponentResult(
        STATUS.UNABLE,
        getComponentMessage(sign.id, 'orientation', STATUS.UNABLE),
        { ...ori.debug, reason: 'Palm direction ambiguous from webcam view' },
      );
    }
    return makeComponentResult(
      ok ? STATUS.MATCHED : STATUS.IMPROVE,
      getComponentMessage(
        sign.id,
        'orientation',
        ok ? STATUS.MATCHED : STATUS.IMPROVE,
      ),
      {
        ...ori.debug,
        expected: `towardCamera > ${ORIENTATION.facingSelfDotMin}`,
        result: ok ? 'matched' : 'possible mismatch',
      },
    );
  }

  return makeComponentResult(
    STATUS.UNABLE,
    getComponentMessage(sign.id, 'orientation', STATUS.UNABLE),
  );
}

function evaluateMovement(sign, movement) {
  const req = sign.requirements?.movement;
  if (!req) return null;

  if (!movement?.assessable) {
    return makeComponentResult(
      STATUS.UNABLE,
      getComponentMessage(sign.id, 'movement', STATUS.UNABLE),
      movement?.debug ?? { reason: movement?.reason },
    );
  }

  let ok = false;
  let expected = '';

  if (req.type === 'outward') {
    ok = movement.outward && movement.occurred;
    expected = 'outward / away-from-face path';
  } else if (req.type === 'forward_down') {
    ok = movement.forwardDown && movement.occurred;
    expected = 'forward / slightly downward path';
  } else if (req.type === 'nod_vertical') {
    ok = movement.verticalNod;
    expected = 'vertical nod with at least one reversal or clear vertical travel';
  } else if (req.type === 'closing_pinch') {
    ok = movement.closingPinch || (movement.pinchDelta != null && movement.pinchDelta > 0.08);
    expected = 'index tip moving closer to thumb';
  } else {
    return makeComponentResult(
      STATUS.UNABLE,
      getComponentMessage(sign.id, 'movement', STATUS.UNABLE),
      { reason: `Unknown movement type: ${req.type}` },
    );
  }

  return makeComponentResult(
    ok ? STATUS.MATCHED : STATUS.IMPROVE,
    getComponentMessage(
      sign.id,
      'movement',
      ok ? STATUS.MATCHED : STATUS.IMPROVE,
    ),
    {
      ...movement.debug,
      expected,
      result: ok ? 'matched' : 'possible mismatch',
    },
  );
}

/**
 * Evaluate a recorded landmark sequence against a sign configuration.
 * Returns the shared feedback payload format.
 */
export function evaluateSignAttempt(rawSequence, sign) {
  if (!sign) {
    return makeFeedbackPayload({
      source: 'automatic',
      signId: null,
      components: {},
      meta: { error: 'Unknown sign' },
    });
  }

  const sequence = enrichSequence(rawSequence, sign.preferredHand);
  const movement = analyzeMovement(sequence);
  const snapshots = phaseSnapshots(sequence);

  const components = {};

  const handshape = evaluateHandshape(sign, snapshots, movement);
  if (handshape) components.handshape = handshape;

  const position = evaluatePosition(sign, snapshots);
  if (position) components.position = position;

  const orientation = evaluateOrientation(sign, snapshots);
  if (orientation) components.orientation = orientation;

  const movementResult = evaluateMovement(sign, movement);
  if (movementResult) components.movement = movementResult;

  // If almost no usable frames, mark all as unable
  if (sequence.length < 3) {
    for (const key of Object.keys(components)) {
      components[key] = makeComponentResult(
        STATUS.UNABLE,
        getComponentMessage(sign.id, key, STATUS.UNABLE),
        {
          reason: 'Too few confident hand frames in the attempt',
          frameCount: sequence.length,
        },
      );
    }
  }

  return makeFeedbackPayload({
    source: 'automatic',
    signId: sign.id,
    components,
    meta: {
      usableFrames: sequence.length,
      totalRawFrames: rawSequence?.length ?? 0,
      movementAssessable: Boolean(movement?.assessable),
    },
  });
}
