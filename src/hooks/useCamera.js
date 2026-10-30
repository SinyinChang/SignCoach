import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera access is not supported in this browser. Try Chrome or Edge on HTTPS or localhost.',
        );
      }

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch (err) {
      let message = 'Unable to start the camera.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        message =
          'Camera permission was denied. Allow camera access in your browser settings, then try again.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        message = 'No camera was found. Connect a webcam and try again.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        message =
          'Your camera may be in use by another application. Close other apps and try again.';
      } else if (err?.message) {
        message = err.message;
      }
      setError(message);
      setActive(false);
    } finally {
      setStarting(false);
    }
  }, [stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    active,
    error,
    starting,
    startCamera,
    stopCamera,
  };
}
