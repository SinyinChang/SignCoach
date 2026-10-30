import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import FeedbackPanel from '../components/FeedbackPanel';
import DebugPanel from '../components/DebugPanel';
import { getSignById } from '../data/signs';
import { useFeedbackMode } from '../hooks/useFeedbackMode';
import { clearDisplayedFeedback } from '../feedback/feedbackStore';

export default function Feedback() {
  const { signId } = useParams();
  const sign = getSignById(signId);
  const [searchParams] = useSearchParams();
  const showDebug = searchParams.get('debug') === '1';
  const { feedback } = useFeedbackMode(signId);

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
        <>
          <FeedbackPanel feedback={feedback} signName={sign.name} />
          <DebugPanel feedback={feedback} visible={showDebug} />
        </>
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
