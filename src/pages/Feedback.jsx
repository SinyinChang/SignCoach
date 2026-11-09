import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import FeedbackPanel from '../components/FeedbackPanel';
import { getSignById } from '../data/signs';
import { clearDisplayedFeedback, readDisplayedFeedback } from '../feedback/feedbackStore';

export default function Feedback() {
  const { signId } = useParams();
  const sign = getSignById(signId);
  const { state } = useLocation();
  const feedback = readDisplayedFeedback(signId) ?? state?.feedback;

  if (!sign) return <Navigate to="/" replace />;

  const onTryAgain = () => {
    clearDisplayedFeedback();
  };

  return (
    <div>
      {!feedback ? (
        <div className="panel" role="status">
          <h1 style={{ marginTop: 0 }}>No feedback yet</h1>
          <p>
            Finish a practice attempt for {sign.name} to receive feedback.
          </p>
        </div>
      ) : (
        <FeedbackPanel feedback={feedback} signName={sign.name} />
      )}

      <div className="btn-row">
        <Link
          className="btn btn-primary"
          to={`/practice/${sign.id}`}
          onClick={onTryAgain}
        >
          Try Again
        </Link>
        <Link className="btn btn-secondary" to={`/sign/${sign.id}`}>
          Watch Tutorial Again
        </Link>
        <Link className="btn btn-ghost" to="/">
          Choose Another Sign
        </Link>
      </div>
    </div>
  );
}
