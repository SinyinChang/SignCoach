import { STATUS_LABELS } from '../data/feedbackMessages';

const STATUS_GLYPH = {
  matched: '✓',
  improve: '△',
  unable: '?',
};

const COMPONENT_TITLES = {
  handshape: 'Handshape',
  position: 'Hand Position',
  movement: 'Movement',
  orientation: 'Palm Orientation',
};

export default function FeedbackItem({ componentKey, result }) {
  if (!result) return null;
  const status = result.status || 'unable';
  const title = COMPONENT_TITLES[componentKey] || componentKey;

  return (
    <article className="feedback-item" data-status={status}>
      <div className="feedback-status" aria-hidden="true">
        {STATUS_GLYPH[status] || '?'}
      </div>
      <div>
        <div className="status-text">{STATUS_LABELS[status] || status}</div>
        <h3>{title}</h3>
        <p>{result.message}</p>
      </div>
    </article>
  );
}
