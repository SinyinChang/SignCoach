export const STATUS = {
  MATCHED: 'matched',
  IMPROVE: 'improve',
  UNABLE: 'unable',
};

export const STATUS_LABELS = {
  matched: 'Looks good',
  improve: 'Needs improvement',
  unable: 'Unable to assess',
};

/** Shared defaults; Wizard presets live in wizardFeedbackOptions.js */
export const DEFAULT_MESSAGES = {
  handshape: {
    matched: 'Your handshape looks good.',
    improve: 'Check your handshape against the reference and try again.',
    unable:
      "We couldn't clearly assess your handshape. Make sure your entire hand is visible and try again.",
  },
  position: {
    matched: 'Your hand position looks good.',
    improve: 'Compare your hand position with the reference and try again.',
    unable:
      "We couldn't clearly assess your hand position. Keep your hand clearly in the camera frame and try again.",
  },
  movement: {
    matched: 'Your movement looks good.',
    improve:
      'Watch the movement in the reference again and try to match its direction and range.',
    unable:
      "We couldn't clearly assess your movement. Make sure your hand stays visible throughout the sign and try again.",
  },
  orientation: {
    matched: 'Your palm orientation looks good.',
    improve: 'Check which direction the palm faces in the reference and try again.',
    unable:
      "We couldn't clearly assess your palm orientation. Keep your hand facing the camera and try again.",
  },
};

export const SIGN_SPECIFIC_MESSAGES = {};

export function getComponentMessage(signId, component, status) {
  const specific = SIGN_SPECIFIC_MESSAGES[signId]?.[component]?.[status];
  if (specific) return specific;
  return DEFAULT_MESSAGES[component]?.[status] ?? 'No feedback available for this component.';
}
