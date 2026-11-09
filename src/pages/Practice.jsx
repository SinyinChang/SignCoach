import { useCallback } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import VideoDemo from '../components/VideoDemo';
import WebcamView from '../components/WebcamView';
import { getSignById } from '../data/signs';
import { useCamera } from '../hooks/useCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import { useReviewAttempt } from '../hooks/useReviewAttempt';
import { saveDisplayedFeedback } from '../feedback/feedbackStore';

export default function Practice() {
  const { signId } = useParams();
  const sign = getSignById(signId);
  return sign ? <PracticeSign key={signId} sign={sign} /> : <Navigate to="/" replace />;
}

function PracticeSign({ sign }) {
  const navigate = useNavigate();
  const { videoRef, active, error, starting, startCamera, stopCamera } = useCamera();
  const tracking = useHandTracking(videoRef, {
    enabled: active,
    includeFace: true,
  });

  const showFeedback = useCallback((feedback) => {
    const saved = saveDisplayedFeedback(feedback);
    navigate(`/feedback/${sign.id}`, { state: saved ? null : { feedback } });
  }, [navigate, sign.id]);
  const attempt = useReviewAttempt(sign.id, showFeedback);
  const isRecording = attempt.phase === 'recording';
  const isUploading = attempt.phase === 'uploading';
  const isWaiting = attempt.phase === 'waiting';

  return (
    <div>
      <div className="page-header">
        <h1>Practice: {sign.name}</h1>
        <p>
          Watch the reference on the left. Use your webcam on the right to practice
          inside SignCoach.
        </p>
      </div>

      <div className="practice-layout">
        <section className="panel" aria-labelledby="reference-heading">
          <div className="pane-label">
            <h2 id="reference-heading">Reference sign</h2>
          </div>
          <VideoDemo
            signName={sign.name}
            videoSrc={sign.videoSrc}
            youtubeVideoId={sign.youtubeVideoId}
            hasVerifiedVideo={sign.hasVerifiedVideo}
            captionPlaceholder={sign.captionPlaceholder}
            compact
          />
        </section>

        <section className="panel" aria-labelledby="webcam-heading">
          <div className="pane-label">
            <h2 id="webcam-heading">Your webcam</h2>
            {isRecording && (
              <span className="recording-pill" role="status">
                Attempt in progress
              </span>
            )}
          </div>
          <WebcamView
            videoRef={videoRef}
            active={active}
          />

          <p className="privacy-note" role="note">
            Start Attempt captures video without audio. The clip is sent for review when
            you finish or reach 30 seconds. The server removes it after review, cancellation,
            or 10 minutes.
          </p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          {tracking.error && (
            <div className="alert alert-error" role="alert">
              {tracking.error}
            </div>
          )}
          {tracking.loading && (
            <div className="status-banner" role="status">
              Loading camera tracking…
            </div>
          )}
          {active && tracking.ready && (
            <div
              className="status-banner"
              role="status"
              data-code={tracking.status.code}
              aria-live="polite"
            >
              <strong>Camera guidance: </strong>
              {tracking.status.text}
            </div>
          )}
        </section>
      </div>

      {attempt.error && <div className="alert alert-error" role="alert">{attempt.error}</div>}

      {!isWaiting && !isUploading && (
        <div className="btn-row" role="group" aria-label="Practice controls">
          {!active ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={startCamera}
              disabled={starting}
            >
              {starting ? 'Starting camera…' : 'Start Camera'}
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={stopCamera} disabled={isRecording}>
              Stop Camera
            </button>
          )}

          <button
            type="button"
            className="btn btn-accent"
            onClick={() => attempt.startAttempt(videoRef.current?.srcObject)}
            disabled={!active || isRecording}
          >
            Start Attempt
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={attempt.finishAttempt}
            disabled={!isRecording}
          >
            Finish Attempt
          </button>
          {isRecording && (
            <button type="button" className="btn btn-secondary" onClick={attempt.cancelAttempt}>
              Cancel Attempt
            </button>
          )}
          <Link className="btn btn-ghost" to={`/sign/${sign.id}`}>
            Watch Tutorial Again
          </Link>
        </div>
      )}

      {(isUploading || isWaiting) && (
        <div className="analyzing panel" role="status" aria-live="assertive">
          <strong>{isUploading ? 'Submitting your attempt…' : 'Preparing your feedback…'}</strong>
          <div className="analyzing-bar" aria-hidden="true">
            <span />
          </div>
          <p style={{ margin: 0, color: 'var(--color-ink-muted)' }}>
            Feedback will appear here when it’s ready.
          </p>
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={attempt.cancelAttempt}>
              Cancel and retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
