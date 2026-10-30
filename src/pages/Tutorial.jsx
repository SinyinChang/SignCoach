import { Link, useParams, Navigate } from 'react-router-dom';
import VideoDemo from '../components/VideoDemo';
import { getSignById } from '../data/signs';

export default function Tutorial() {
  const { signId } = useParams();
  const sign = getSignById(signId);

  if (!sign) return <Navigate to="/" replace />;

  return (
    <div>
      <div className="page-header">
        <h1>{sign.name}</h1>
        <p>{sign.shortDescription}</p>
      </div>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <VideoDemo
          signName={sign.name}
          videoSrc={sign.videoSrc}
          youtubeVideoId={sign.youtubeVideoId}
          hasVerifiedVideo={sign.hasVerifiedVideo}
          captionPlaceholder={sign.captionPlaceholder}
        />
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>How to sign {sign.name}</h2>
        <ol className="instructions">
          {sign.instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p style={{ color: 'var(--color-ink-muted)', marginBottom: 0 }}>
          Feedback can cover:{' '}
          <strong>
            handshape, hand position, movement, and palm orientation
          </strong>
          .
        </p>
      </div>

      <div className="btn-row">
        <Link className="btn btn-primary" to={`/practice/${sign.id}`}>
          Start Practice
        </Link>
        <Link className="btn btn-secondary" to="/">
          Choose Another Sign
        </Link>
      </div>
    </div>
  );
}
