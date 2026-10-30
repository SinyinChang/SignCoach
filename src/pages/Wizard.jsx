/**
 * Researcher-only Wizard-of-Oz control panel (/wizard).
 * Not linked from participant navigation.
 * Observes participant attempt state over BroadcastChannel and sends ASL feedback.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SIGNS, getSignById } from '../data/signs';
import {
  WIZARD_COMPONENTS,
  WIZARD_STATUS_OPTIONS,
  getGoodMessage,
  getImproveOptions,
  getUnableMessage,
} from '../data/wizardFeedbackOptions';
import { makeComponentResult } from '../feedback/feedbackSchema';
import {
  readParticipantState,
  requestParticipantState,
  sendWizardFeedback,
  subscribeWizardChannel,
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

function statusLabel(status) {
  switch (status) {
    case 'waiting_for_feedback':
      return 'Waiting for feedback';
    case 'attempt_started':
      return 'Attempt in progress';
    case 'practicing':
      return 'On practice page';
    case 'idle':
      return 'Idle';
    default:
      return status || 'Unknown';
  }
}

function resolveValidSignId(candidate) {
  if (candidate && getSignById(candidate)) return candidate;
  return SIGNS[0]?.id || 'nice-to-meet-you';
}

export default function Wizard() {
  const [participant, setParticipant] = useState(() => readParticipantState());
  const initialSignId = resolveValidSignId(participant?.signId);
  const [signId, setSignId] = useState(initialSignId);
  const [components, setComponents] = useState(() => blankComponentState(initialSignId));
  const [statusNote, setStatusNote] = useState('');

  const sign = useMemo(() => getSignById(signId), [signId]);

  useEffect(() => {
    requestParticipantState();
    return subscribeWizardChannel((message) => {
      if (message?.type === 'PARTICIPANT_STATE') {
        setParticipant(message);
        const nextId = resolveValidSignId(message.signId);
        if (message.signId && getSignById(message.signId)) {
          setSignId((current) => {
            if (current !== nextId) {
              setComponents(blankComponentState(nextId));
            }
            return nextId;
          });
        }
      }
    });
  }, []);

  // When participant finishes an attempt, lock wizard onto that sign.
  useEffect(() => {
    if (
      participant?.signId &&
      participant.status === 'waiting_for_feedback' &&
      getSignById(participant.signId)
    ) {
      setSignId(participant.signId);
    }
  }, [participant]);

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

  const canSend =
    participant?.status === 'waiting_for_feedback' &&
    (!participant.signId || participant.signId === signId);

  const sendFeedback = () => {
    const payloadComponents = {};
    for (const { key } of WIZARD_COMPONENTS) {
      const entry = components[key];
      payloadComponents[key] = makeComponentResult(
        entry.status,
        resolveMessage(key, entry),
      );
    }

    const attemptId = participant?.attemptId ?? null;
    sendWizardFeedback({
      signId,
      attemptId,
      components: payloadComponents,
    });
    setStatusNote('Feedback sent successfully.');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Wizard Mode</h1>
        <p>
          Researcher control panel for this Wizard-of-Oz prototype. Select feedback
          for the participant’s attempt, then click Send Feedback.
        </p>
      </div>

      <div className="panel" style={{ marginBottom: '1rem' }} aria-live="polite">
        <p style={{ marginTop: 0 }}>
          <strong>Current Sign:</strong>{' '}
          {(participant?.signId && getSignById(participant.signId)?.name) ||
            sign?.name ||
            '—'}
        </p>
        <p>
          <strong>Participant Status:</strong>{' '}
          {statusLabel(participant?.status || 'idle')}
        </p>
        {participant?.attemptId && (
          <p style={{ marginBottom: 0, color: 'var(--color-ink-muted)' }}>
            Attempt ID: <code>{participant.attemptId}</code>
          </p>
        )}
        {!canSend && (
          <p style={{ marginBottom: 0, marginTop: '0.75rem' }} className="mode-chip">
            Waiting for the participant to finish an attempt before sending feedback.
          </p>
        )}
        {canSend && (
          <p style={{ marginBottom: 0, marginTop: '0.75rem' }} className="mode-chip">
            Participant is waiting — select feedback and click Send Feedback.
          </p>
        )}
      </div>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.35rem', fontWeight: 700 }}>
          Sign for this feedback
          <select
            value={signId}
            onChange={(e) => {
              const next = e.target.value;
              setSignId(next);
              setComponents(blankComponentState(next));
            }}
            aria-label="Sign for feedback"
          >
            {SIGNS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

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
          disabled={!canSend}
        >
          Send Feedback
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => requestParticipantState()}
        >
          Refresh participant status
        </button>
        <Link
          className="btn btn-ghost"
          to={`/practice/${signId}`}
          target="_blank"
          rel="noreferrer"
        >
          Open Practice (new tab)
        </Link>
      </div>

      {statusNote && (
        <div className="status-banner" role="status" style={{ marginTop: '1rem' }}>
          {statusNote}
        </div>
      )}

    </div>
  );
}
