/**
 * Wizard-of-Oz communication between participant SignCoach and /wizard.
 * Uses BroadcastChannel('signcoach-wizard') with localStorage fallback.
 *
 * Message types:
 * - PARTICIPANT_STATE: sign + attempt lifecycle for the Wizard panel
 * - SIGN_FEEDBACK: wizard-selected ASL feedback for a specific attempt
 * - REQUEST_STATE: wizard asks participant tab to re-broadcast state
 */

import { makeFeedbackPayload } from './feedbackSchema';

const CHANNEL_NAME = 'signcoach-wizard';
const FEEDBACK_KEY = 'signcoach-wizard-feedback';
const STATE_KEY = 'signcoach-participant-state';

let channel = null;

function getChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

export function createAttemptId() {
  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function publishParticipantState(state) {
  const payload = {
    type: 'PARTICIPANT_STATE',
    signId: state.signId ?? null,
    signName: state.signName ?? null,
    status: state.status ?? 'idle',
    attemptId: state.attemptId ?? null,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota / private-mode failures.
  }
  getChannel()?.postMessage(payload);
  return payload;
}

export function readParticipantState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function requestParticipantState() {
  getChannel()?.postMessage({ type: 'REQUEST_STATE', timestamp: Date.now() });
}

/**
 * Send ASL performance feedback from the Wizard to the participant.
 * Payload shape aligns with the WoZ protocol (status: matched|improve|unable).
 */
export function sendWizardFeedback({ signId, attemptId, components }) {
  const feedbackPayload = makeFeedbackPayload({
    source: 'wizard',
    signId,
    components,
    meta: { attemptId: attemptId ?? null },
  });

  const message = {
    type: 'SIGN_FEEDBACK',
    signId,
    attemptId: attemptId ?? null,
    feedback: feedbackPayload.components,
    payload: feedbackPayload,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(message));
  } catch {
    // Ignore storage failures; BroadcastChannel may still deliver.
  }
  getChannel()?.postMessage(message);
  return message;
}

export function readLastWizardFeedbackMessage() {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Persist feedback for the Feedback page (session only). */
export function saveDisplayedFeedback(feedbackPayload) {
  sessionStorage.setItem(
    'signcoach-displayed-feedback',
    JSON.stringify(feedbackPayload),
  );
  return feedbackPayload;
}

export function readDisplayedFeedback() {
  try {
    const raw = sessionStorage.getItem('signcoach-displayed-feedback');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDisplayedFeedback() {
  sessionStorage.removeItem('signcoach-displayed-feedback');
}

export function subscribeWizardChannel(listener) {
  const ch = getChannel();
  const onMessage = (event) => listener(event.data);
  const onStorage = (event) => {
    if (event.key === FEEDBACK_KEY || event.key === STATE_KEY) {
      try {
        const value = event.newValue ? JSON.parse(event.newValue) : { type: 'storage' };
        listener(value);
      } catch {
        listener({ type: 'storage' });
      }
    }
  };
  ch?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    ch?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}

// ---- Compatibility aliases used by older hooks (Feedback page) ----

export function subscribeFeedback(listener) {
  return subscribeWizardChannel(listener);
}

export function resolveFeedback(signId) {
  const displayed = readDisplayedFeedback();
  if (displayed && (!signId || displayed.signId === signId)) return displayed;
  const last = readLastWizardFeedbackMessage();
  if (last?.payload && (!signId || last.signId === signId)) return last.payload;
  return null;
}

export function getFeedbackMode() {
  return 'wizard';
}
