import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getSignById } from '../data/signs';
import {
  WIZARD_COMPONENTS,
  WIZARD_STATUS_OPTIONS,
  getGoodMessage,
  getImproveOptions,
  getUnableMessage,
} from '../data/wizardFeedbackOptions';
import { makeComponentResult } from '../feedback/feedbackSchema';
import {
  pollReview,
  readAttemptClip,
  readPendingAttempt,
  sendWizardFeedback,
} from '../feedback/feedbackStore';

function blankComponentState(signId) {
  const state = {};
  for (const { key } of WIZARD_COMPONENTS) {
    const improveOptions = getImproveOptions(signId, key);
    state[key] = {
      status: 'matched',
      improveChoice: improveOptions[0] || '',
      customMessage: '',
      useCustom: false,
    };
  }
  return state;
}

export default function Wizard() {
  const { hash } = useLocation();
  const accessKey = /^#[a-f0-9]{64}$/.test(hash) ? hash.slice(1) : '';
  return <OperatorConsole key={accessKey} accessKey={accessKey} />;
}

function OperatorConsole({ accessKey }) {
  const [attempt, setAttempt] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [sentId, setSentId] = useState(null);

  useEffect(() => {
    if (!accessKey) return;
    return pollReview(
      (signal) => readPendingAttempt(accessKey, signal),
      (pending) => {
        setAttempt(pending);
        setConnected(true);
        setError('');
      },
      (requestError) => {
        setError(requestError.status === 401
          ? requestError.message
          : 'Connection interrupted. Reconnecting to the review server…');
        setConnected(false);
        if (requestError.status === 401) return false;
      },
    );
  }, [accessKey]);

  return (
    <div>
      <div className="page-header">
        <h1>Operator Console</h1>
        <p>Replay the submitted sign, then choose feedback for each component.</p>
      </div>
      {!accessKey && (
        <p className="panel">Open the private operator link shown in the server terminal.</p>
      )}
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {accessKey && !connected && !error && <p role="status">Connecting to the review server…</p>}
      {connected && (!attempt || attempt.id === sentId) && (
        <p className="panel" role="status">
          {sentId ? 'Feedback sent. Waiting for the next attempt.' : 'Waiting for a participant to submit an attempt.'}
        </p>
      )}
      {attempt && attempt.id !== sentId && (
        <AttemptReview
          key={attempt.id}
          accessKey={accessKey}
          attempt={attempt}
          connected={connected}
          onSent={() => setSentId(attempt.id)}
        />
      )}
      {connected && (
        <div className="btn-row">
          <Link className="btn btn-ghost" to="/" target="_blank" rel="noreferrer">
            Open participant tab
          </Link>
        </div>
      )}
    </div>
  );
}

function AttemptReview({ accessKey, attempt, connected, onSent }) {
  const { id, signId } = attempt;
  const [components, setComponents] = useState(() => blankComponentState(signId));
  const [clipUrl, setClipUrl] = useState('');
  const [clipError, setClipError] = useState('');
  const [clipRetry, setClipRetry] = useState(0);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let url;
    readAttemptClip(accessKey, id, controller.signal).then((clip) => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(clip);
      setClipUrl(url);
    }).catch((requestError) => {
      if (!controller.signal.aborted) setClipError(requestError.message || 'Could not load the clip.');
    });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [accessKey, id, clipRetry]);

  const updateComponent = (key, patch) => {
    setComponents((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const onStatusChange = (key, status) => {
    updateComponent(key, { status });
  };

  const resolveMessage = (key, entry) => {
    if (entry.useCustom && entry.customMessage.trim()) {
      return entry.customMessage.trim();
    }
    if (entry.status === 'matched') return getGoodMessage(signId, key);
    if (entry.status === 'unable') return getUnableMessage(signId, key);
    return entry.improveChoice || getImproveOptions(signId, key)[0] || '';
  };

  const sendFeedback = async () => {
    setSending(true);
    setSendError('');
    const payloadComponents = {};
    for (const { key } of WIZARD_COMPONENTS) {
      const entry = components[key];
      payloadComponents[key] = makeComponentResult(
        entry.status,
        resolveMessage(key, entry),
      );
    }

    try {
      await sendWizardFeedback(accessKey, id, payloadComponents);
      onSent();
    } catch (requestError) {
      setSendError(requestError.message || 'Could not send feedback.');
      setSending(false);
    }
  };

  return (
    <div>
      <section className="panel review-video" aria-labelledby="review-video-title">
        <h2 id="review-video-title">{getSignById(signId).name}</h2>
        {clipUrl && (
          <video
            src={clipUrl}
            controls
            playsInline
            muted
            aria-label="Silent replay of the participant’s sign"
            onError={() => setClipError('The clip could not be played in this browser.')}
          />
        )}
        {!clipUrl && !clipError && <p role="status">Loading attempt video…</p>}
        {clipError && (
          <div>
            <p className="alert alert-error" role="alert">{clipError}</p>
            <button type="button" className="btn btn-secondary" onClick={() => {
              setClipUrl('');
              setClipError('');
              setClipRetry((count) => count + 1);
            }}>
              Reload clip
            </button>
          </div>
        )}
      </section>

      <div className="wizard-grid">
        {WIZARD_COMPONENTS.map(({ key, label }) => {
          const entry = components[key];
          if (!entry) return null;
          const improveOptions = getImproveOptions(signId, key);

          return (
            <fieldset key={key} className="wizard-component">
              <legend>
                <h3 style={{ display: 'inline', margin: 0 }}>{label}</h3>
              </legend>

              <div className="radio-row" role="radiogroup" aria-label={`${label} status`}>
                {WIZARD_STATUS_OPTIONS.map((opt) => (
                  <label key={opt.value}>
                    <input
                      type="radio"
                      name={`status-${key}`}
                      value={opt.value}
                      checked={entry.status === opt.value}
                      onChange={() => onStatusChange(key, opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>

              {entry.status === 'improve' && (
                <label style={{ display: 'grid', gap: '0.35rem' }}>
                  Feedback message
                  <select
                    value={entry.improveChoice}
                    onChange={(e) => updateComponent(key, { improveChoice: e.target.value })}
                    aria-label={`${label} improvement message`}
                    disabled={entry.useCustom}
                  >
                    {improveOptions.map((msg) => (
                      <option key={msg} value={msg}>
                        {msg}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {entry.status === 'matched' && (
                <p style={{ margin: 0, color: 'var(--color-ink-muted)' }}>
                  Message: {getGoodMessage(signId, key)}
                </p>
              )}

              {entry.status === 'unable' && (
                <p style={{ margin: 0, color: 'var(--color-ink-muted)' }}>
                  Message: {getUnableMessage(signId, key)}
                </p>
              )}

              <label>
                <input
                  type="checkbox"
                  checked={entry.useCustom}
                  onChange={(e) => updateComponent(key, { useCustom: e.target.checked })}
                />{' '}
                Use custom message
              </label>

              {entry.useCustom && (
                <label style={{ display: 'grid', gap: '0.35rem' }}>
                  Custom message
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={entry.customMessage}
                    onChange={(e) => updateComponent(key, { customMessage: e.target.value })}
                    aria-label={`${label} custom message`}
                  />
                </label>
              )}
            </fieldset>
          );
        })}
      </div>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={sendFeedback}
          disabled={!connected || sending || (!clipUrl && !clipError)}
        >
          {sending ? 'Sending…' : 'Send Feedback'}
        </button>
      </div>
      {sendError && <p className="alert alert-error" role="alert">{sendError}</p>}
    </div>
  );
}
