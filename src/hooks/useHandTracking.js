import { useCallback, useEffect, useRef, useState } from 'react';
import { initHandTracker, detectHands, disposeHandTracker } from '../vision/handTracker';
import { initFaceTracker, detectFace, disposeFaceTracker } from '../vision/faceTracker';
import { trackingStatusLabel } from '../utils/confidence';

export function useHandTracking(videoRef, { enabled = true, includeFace = true } = {}) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hands, setHands] = useState([]);
  const [face, setFace] = useState(null);
  const [status, setStatus] = useState({ code: 'idle', text: 'Tracking idle' });
  const rafRef = useRef(null);
  const lastTsRef = useRef(-1);
  const latestRef = useRef({ hands: [], face: null });

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        await initHandTracker();
        if (includeFace) await initFaceTracker();
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.message ||
              'Failed to load hand tracking. Check your network connection and reload.',
          );
          setReady(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [enabled, includeFace]);

  useEffect(() => {
    if (!enabled || !ready) return undefined;

    const loop = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const now = performance.now();
        if (video.currentTime !== lastTsRef.current) {
          lastTsRef.current = video.currentTime;
          try {
            const nextHands = detectHands(video, now);
            const nextFace = includeFace ? detectFace(video, now) : null;
            latestRef.current = { hands: nextHands, face: nextFace };
            setHands(nextHands);
            setFace(nextFace);
            setStatus(
              trackingStatusLabel({
                hands: nextHands,
                face: nextFace,
                cameraActive: true,
              }),
            );
          } catch {
            // Keep previous frame on transient detect errors
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, ready, videoRef, includeFace]);

  useEffect(
    () => () => {
      // Do not dispose globally on unmount of every consumer if shared;
      // pages that fully leave practice may call disposeTrackers.
    },
    [],
  );

  const getLatest = useCallback(() => latestRef.current, []);

  return {
    ready,
    loading,
    error,
    hands,
    face,
    status,
    getLatest,
  };
}

export function disposeTrackers() {
  disposeHandTracker();
  disposeFaceTracker();
}
