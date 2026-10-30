import { useCallback, useRef, useState } from 'react';

/**
 * Records landmark frames while an attempt is active.
 * Sequence is cleared after evaluation or when starting a new attempt.
 */
export function useAttemptRecorder() {
  const [recording, setRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const sequenceRef = useRef([]);
  const recordingRef = useRef(false);

  const startAttempt = useCallback(() => {
    sequenceRef.current = [];
    recordingRef.current = true;
    setFrameCount(0);
    setRecording(true);
  }, []);

  const pushFrame = useCallback((frame) => {
    if (!recordingRef.current) return;
    sequenceRef.current.push({
      t: frame.t ?? performance.now(),
      hands: frame.hands ?? [],
      face: frame.face ?? null,
    });
    setFrameCount(sequenceRef.current.length);
  }, []);

  const finishAttempt = useCallback(() => {
    recordingRef.current = false;
    setRecording(false);
    return [...sequenceRef.current];
  }, []);

  const clearAttempt = useCallback(() => {
    recordingRef.current = false;
    sequenceRef.current = [];
    setFrameCount(0);
    setRecording(false);
  }, []);

  const getSequence = useCallback(() => [...sequenceRef.current], []);

  return {
    recording,
    frameCount,
    startAttempt,
    pushFrame,
    finishAttempt,
    clearAttempt,
    getSequence,
  };
}
