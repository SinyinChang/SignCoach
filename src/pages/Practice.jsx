import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import VideoDemo from '../components/VideoDemo';
import WebcamView from '../components/WebcamView';
import { getSignById } from '../data/signs';
import { useCamera } from '../hooks/useCamera';
import { useHandTracking } from '../hooks/useHandTracking';
import {
  createAttemptId,
  publishParticipantState,
  saveDisplayedFeedback,
  subscribeWizardChannel,
} from '../feedback/feedbackStore';
import { makeFeedbackPayload } from '../feedback/feedbackSchema';

function toFeedbackPayload(message) {
  if (message?.payload) return message.payload;
  if (message?.feedback) {
    return makeFeedbackPayload({
      source: 'wizard',
      signId: message.signId,
      components: message.feedback,
      meta: { attemptId: message.attemptId ?? null },
    });
  }
  return null;
}

export default function Practice() {
  const { signId } = useParams();
  const sign = getSignById(signId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debugDefault = searchParams.get('debug') === '1';

  const { videoRef, active, error, starting, startCamera, stopCamera } = useCamera();
  const tracking = useHandTracking(videoRef, {
    enabled: active,
    includeFace: true,
  });

  const [showLandmarks, setShowLandmarks] = useState(debugDefault);
  const [attemptPhase, setAttemptPhase] = useState('idle'); // idle | recording | waiting
  const attemptIdRef = useRef(null);
  const waitingRef = useRef(false);

  const broadcastState = useCallback(
    (status, attemptId = attemptIdRef.current) => {
      if (!sign) return;
      publishParticipantState({
        signId: sign.id,
        signName: sign.name,
        status,
        attemptId,
      });
    },
    [sign],
  );

  // Announce current sign when entering practice; clear attempt on leave.
  useEffect(() => {
    if (!sign) return undefined;
    broadcastState('practicing', null);
    return () => {
      publishParticipantState({
        signId: sign.id,
        signName: sign.name,
        status: 'idle',
        attemptId: null,
      });
    };
  }, [sign, broadcastState]);

  // Reply when Wizard asks for current state.
  useEffect(() => {
    if (!sign) return undefined;
    return subscribeWizardChannel((message) => {
      if (message?.type === 'REQUEST_STATE') {
        const status =
          attemptPhase === 'waiting'
            ? 'waiting_for_feedback'
            : attemptPhase === 'recording'
              ? 'attempt_started'
              : 'practicing';
        broadcastState(status, attemptIdRef.current);
        return;
      }

      if (message?.type !== 'SIGN_FEEDBACK') return;
      if (!waitingRef.current) return;
      if (message.signId && message.signId !== sign.id) return;
      if (
        attemptIdRef.current &&
        message.attemptId &&
        message.attemptId !== attemptIdRef.current
      ) {
        return;
      }

      const payload = toFeedbackPayload(message);
      if (!payload) return;

      saveDisplayedFeedback(payload);
      waitingRef.current = false;
      setAttemptPhase('idle');
      attemptIdRef.current = null;
      broadcastState('practicing', null);
      navigate(`/feedback/${sign.id}`);
    });
  }, [sign, attemptPhase, broadcastState, navigate]);

  if (!sign) return <Navigate to="/" replace />;

  const onStartAttempt = () => {
    const id = createAttemptId();
    attemptIdRef.current = id;
    waitingRef.current = false;
    setAttemptPhase('recording');
    broadcastState('attempt_started', id);
  };

  const onFinishAttempt = () => {
    if (attemptPhase !== 'recording') return;
    waitingRef.current = true;
    setAttemptPhase('waiting');
    broadcastState('waiting_for_feedback', attemptIdRef.current);
  };

  const onRetry = () => {
    waitingRef.current = false;
    attemptIdRef.current = null;
    setAttemptPhase('idle');
    broadcastState('practicing', null);
  };

  const isWaiting = attemptPhase === 'waiting';
  const isRecording = attemptPhase === 'recording';

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
            hands={tracking.hands}
            showLandmarks={showLandmarks}
          />

          <p className="privacy-note" role="note">
            Your camera is used for practice and your video is not recorded or uploaded.
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

          <div className="toggle-row">
            <label>
              <input
                type="checkbox"
                checked={showLandmarks}
                onChange={(e) => setShowLandmarks(e.target.checked)}
              />
              Show hand landmarks (developer)
            </label>
          </div>
        </section>
      </div>

      {!isWaiting && (
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
            <button type="button" className="btn btn-secondary" onClick={stopCamera}>
              Stop Camera
            </button>
          )}

          <button
            type="button"
            className="btn btn-accent"
            onClick={onStartAttempt}
            disabled={!active || isRecording}
          >
            Start Attempt
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onFinishAttempt}
            disabled={!isRecording}
          >
            Finish Attempt
          </button>
          <button type="button" className="btn btn-secondary" onClick={onRetry}>
            Retry
          </button>
          <Link className="btn btn-ghost" to={`/sign/${sign.id}`}>
            Watch Tutorial Again
          </Link>
        </div>
      )}

      {isWaiting && (
        <div className="analyzing panel" role="status" aria-live="assertive">
          <strong>Checking your sign...</strong>
          <div className="analyzing-bar" aria-hidden="true">
            <span />
          </div>
          <p style={{ margin: 0, color: 'var(--color-ink-muted)' }}>
            Please wait while SignCoach reviews your attempt.
          </p>
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onRetry}>
              Cancel and retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
