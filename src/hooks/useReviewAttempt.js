import { useCallback, useEffect, useRef, useState } from 'react';
import {
  discardAttempt,
  pollReview,
  readAttemptFeedback,
  uploadAttempt,
} from '../feedback/feedbackStore';

const MAX_DURATION_MS = 30_000;

export function useReviewAttempt(signId, onFeedback) {
  const current = useRef(null);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');

  const releaseAttempt = useCallback(() => {
    const attempt = current.current;
    if (!attempt) return;
    current.current = null;
    window.clearTimeout(attempt.timer);
    if (attempt.recorder.state !== 'inactive') attempt.recorder.stop();
    if (attempt.uploaded) void discardAttempt(attempt.id);
  }, []);

  const cancelAttempt = useCallback(() => {
    releaseAttempt();
    setPhase('idle');
    setError('');
  }, [releaseAttempt]);

  useEffect(() => {
    window.addEventListener('pagehide', cancelAttempt);
    return () => {
      window.removeEventListener('pagehide', cancelAttempt);
      releaseAttempt();
    };
  }, [cancelAttempt, releaseAttempt]);

  useEffect(() => {
    const attempt = current.current;
    if (phase !== 'waiting' || !attempt) return;
    return pollReview(
      (signal) => readAttemptFeedback(attempt.id, signal),
      (feedback) => {
        if (current.current !== attempt) return false;
        setError('');
        if (!feedback) return;
        releaseAttempt();
        setPhase('idle');
        onFeedback(feedback);
        return false;
      },
      (requestError) => {
        if (current.current !== attempt) return false;
        if (requestError.status === 404) {
          releaseAttempt();
          setPhase('idle');
          setError(requestError.message);
          return false;
        }
        setError('Connection interrupted. Reconnecting to retrieve your feedback…');
      },
    );
  }, [phase, releaseAttempt, onFeedback]);

  function startAttempt(stream) {
    if (current.current || !stream) return;
    setError('');
    try {
      const recorder = new MediaRecorder(stream, { videoBitsPerSecond: 2_000_000 });
      const attempt = { id: crypto.randomUUID(), recorder };
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        if (current.current !== attempt) return;
        releaseAttempt();
        setPhase('idle');
        setError('The camera could not capture this attempt. Please try again.');
      };
      recorder.onstop = async () => {
        if (current.current !== attempt) return;
        window.clearTimeout(attempt.timer);
        setPhase('uploading');

        const clip = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type });
        chunks.length = 0;
        if (!clip.size) {
          releaseAttempt();
          setPhase('idle');
          setError('No video was captured. Please try again.');
          return;
        }
        try {
          await uploadAttempt(attempt.id, signId, clip);
          if (current.current === attempt) {
            attempt.uploaded = true;
            setPhase('waiting');
          } else {
            void discardAttempt(attempt.id);
          }
        } catch (uploadError) {
          void discardAttempt(attempt.id);
          if (current.current !== attempt) return;
          releaseAttempt();
          setPhase('idle');
          setError(uploadError.status
            ? uploadError.message
            : 'Could not submit the attempt. Check your connection and try again.');
        }
      };

      recorder.start();
      current.current = attempt;
      attempt.timer = window.setTimeout(finishAttempt, MAX_DURATION_MS);
      setPhase('recording');
    } catch {
      setError('Video capture could not start. Try restarting the camera or using Chrome or Edge.');
    }
  }

  function finishAttempt() {
    const recorder = current.current?.recorder;
    if (recorder?.state === 'recording') recorder.stop();
  }

  return { phase, error, startAttempt, finishAttempt, cancelAttempt };
}
