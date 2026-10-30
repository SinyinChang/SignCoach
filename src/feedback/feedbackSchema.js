import { STATUS } from '../data/feedbackMessages';

export const COMPONENT_KEYS = ['handshape', 'position', 'movement', 'orientation'];

/**
 * Normalize a component result into the shared feedback shape.
 */
export function makeComponentResult(status, message, debug = null) {
  let normalized = status;
  // Protocol may use "good"; UI/schema stores as "matched".
  if (normalized === 'good') normalized = STATUS.MATCHED;
  if (
    normalized !== STATUS.MATCHED &&
    normalized !== STATUS.IMPROVE &&
    normalized !== STATUS.UNABLE
  ) {
    normalized = STATUS.UNABLE;
  }

  const result = {
    status: normalized,
    message: message || 'Unable to assess this component.',
  };
  if (debug) result.debug = debug;
  return result;
}

export function makeFeedbackPayload({
  source = 'automatic',
  signId,
  components = {},
  meta = {},
}) {
  return {
    source,
    signId: signId ?? null,
    timestamp: Date.now(),
    components,
    meta,
  };
}

export function emptyComponents(keys = COMPONENT_KEYS) {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      makeComponentResult(STATUS.UNABLE, 'Not evaluated yet.'),
    ]),
  );
}
