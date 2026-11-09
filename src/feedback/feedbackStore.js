const API = '/api/review';
const FEEDBACK_KEY = 'signcoach-displayed-feedback';

async function request(path, options) {
  const response = await fetch(`${API}${path}`, { cache: 'no-store', ...options });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const error = new Error(body?.error || 'Could not reach the review server.');
    error.status = response.status;
    throw error;
  }
  return response;
}

export function uploadAttempt(id, signId, clip) {
  return request(`/attempt/${id}?sign=${encodeURIComponent(signId)}`, {
    method: 'PUT',
    body: clip,
    signal: AbortSignal.timeout(30_000),
  });
}

export async function readAttemptFeedback(id, signal) {
  const response = await request(`/attempt/${id}`, { signal });
  return (await response.json()).feedback;
}

export function discardAttempt(id) {
  return request(`/attempt/${id}`, { method: 'DELETE', keepalive: true }).catch(() => {});
}

export async function readPendingAttempt(key, signal) {
  const response = await request('/operator', {
    headers: { Authorization: `Bearer ${key}` },
    signal,
  });
  return response.json();
}

export async function readAttemptClip(key, id, signal) {
  const response = await request(`/operator/${id}/clip`, {
    headers: { Authorization: `Bearer ${key}` },
    signal,
  });
  return response.blob();
}

export function sendWizardFeedback(key, id, components) {
  return request(`/operator/${id}/feedback`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(components),
  });
}

export function pollReview(load, onResult, onError) {
  const controller = new AbortController();
  let timer;

  async function poll() {
    let keepPolling;
    try {
      const result = await load(controller.signal);
      if (!controller.signal.aborted) keepPolling = onResult(result) !== false;
    } catch (error) {
      if (!controller.signal.aborted) keepPolling = onError(error) !== false;
    }
    if (keepPolling) timer = window.setTimeout(poll, 750);
  }

  void poll();
  return () => {
    controller.abort();
    window.clearTimeout(timer);
  };
}

export function saveDisplayedFeedback(feedback) {
  try {
    sessionStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback));
    return true;
  } catch {
    return false;
  }
}

export function readDisplayedFeedback(signId) {
  try {
    const feedback = JSON.parse(sessionStorage.getItem(FEEDBACK_KEY));
    return feedback?.signId === signId ? feedback : null;
  } catch {
    return null;
  }
}

export function clearDisplayedFeedback() {
  try {
    sessionStorage.removeItem(FEEDBACK_KEY);
  } catch {
    // Feedback is available through navigation state when storage is blocked.
  }
}
