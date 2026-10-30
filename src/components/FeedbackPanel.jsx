import FeedbackItem from './FeedbackItem';

export default function FeedbackPanel({ feedback, signName }) {
  if (!feedback?.components) {
    return (
      <div className="panel" role="status">
        <p>No feedback is available yet. Complete a practice attempt first.</p>
      </div>
    );
  }

  const entries = Object.entries(feedback.components);
  const order = ['handshape', 'position', 'movement', 'orientation'];
  const sorted = [...entries].sort(
    ([a], [b]) => order.indexOf(a) - order.indexOf(b),
  );

  return (
    <section aria-labelledby="feedback-heading">
      <div className="page-header">
        <h1 id="feedback-heading">Your Feedback</h1>
        <p>Feedback for {signName}</p>
      </div>
      <div className="feedback-list" role="list">
        {sorted.map(([key, result]) => (
          <div key={key} role="listitem">
            <FeedbackItem componentKey={key} result={result} />
          </div>
        ))}
      </div>
    </section>
  );
}
