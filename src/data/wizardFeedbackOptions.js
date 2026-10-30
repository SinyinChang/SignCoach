/**
 * Predefined Wizard-of-Oz feedback options.
 * Prefer general component-level guidance unless a verified sign-specific
 * correction is available under SIGN_WIZARD_OPTIONS.
 */

export const WIZARD_COMPONENTS = [
  { key: 'handshape', label: 'Handshape' },
  { key: 'position', label: 'Hand Position' },
  { key: 'movement', label: 'Movement' },
  { key: 'orientation', label: 'Palm Orientation' },
];

export const WIZARD_STATUS_OPTIONS = [
  { value: 'matched', label: 'Looks good' },
  { value: 'improve', label: 'Needs improvement' },
  { value: 'unable', label: 'Unable to assess' },
];

/** Default “looks good” messages */
export const GOOD_MESSAGES = {
  handshape: 'Your handshape looks good.',
  position: 'Your hand position looks good.',
  movement: 'Your movement looks good.',
  orientation: 'Your palm orientation looks good.',
};

/** Default “unable to assess” messages */
export const UNABLE_MESSAGES = {
  handshape:
    "We couldn't clearly assess your handshape. Make sure your entire hand is visible and try again.",
  position:
    "We couldn't clearly assess your hand position. Keep your hand clearly in the camera frame and try again.",
  movement:
    "We couldn't clearly assess your movement. Make sure your hand stays visible throughout the sign and try again.",
  orientation:
    "We couldn't clearly assess your palm orientation. Keep your hand facing the camera and try again.",
};

/**
 * General improvement messages for Needs improvement.
 * Avoid inventing unverified ASL mechanics.
 */
export const IMPROVE_OPTIONS = {
  handshape: [
    'Check your handshape against the reference and try again.',
    'Pay attention to your finger and thumb positions.',
  ],
  position: [
    'Compare your hand position with the reference and try again.',
  ],
  movement: [
    'Watch the movement in the reference again and try to match its direction and range.',
  ],
  orientation: [
    'Check which direction the palm faces in the reference and try again.',
  ],
};

/**
 * Optional per-sign overrides. Keys match current sign IDs.
 * Use only when corrections are confirmed for that sign.
 */
export const SIGN_WIZARD_OPTIONS = {
  'nice-to-meet-you': {},
  'thank-you': {},
  yesterday: {},
  walk: {},
};

export function getImproveOptions(signId, componentKey) {
  const specific = SIGN_WIZARD_OPTIONS[signId]?.improve?.[componentKey];
  if (specific?.length) return specific;
  return IMPROVE_OPTIONS[componentKey] ?? [];
}

export function getGoodMessage(signId, componentKey) {
  return (
    SIGN_WIZARD_OPTIONS[signId]?.good?.[componentKey] ||
    GOOD_MESSAGES[componentKey] ||
    'Looks good.'
  );
}

export function getUnableMessage(signId, componentKey) {
  return (
    SIGN_WIZARD_OPTIONS[signId]?.unable?.[componentKey] ||
    UNABLE_MESSAGES[componentKey] ||
    "We couldn't clearly assess this part of your sign. Please try again."
  );
}
