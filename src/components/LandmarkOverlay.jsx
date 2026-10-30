import { useEffect, useRef } from 'react';
import { HAND_CONNECTIONS } from '../vision/handTracker';

export default function LandmarkOverlay({ videoRef, hands, visible }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef?.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!visible || !hands?.length) return;

    for (const hand of hands) {
      const lm = hand.landmarks;
      if (!lm?.length) continue;

      ctx.strokeStyle = hand.handedness === 'Left' ? '#7dd3c0' : '#f0b27a';
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = 3;

      for (const [a, b] of HAND_CONNECTIONS) {
        const pa = lm[a];
        const pb = lm[b];
        if (!pa || !pb) continue;
        ctx.beginPath();
        ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
        ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
        ctx.stroke();
      }

      lm.forEach((point, index) => {
        const r = index === 0 ? 6 : 4;
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, r, 0, Math.PI * 2);
        ctx.fill();
        if (index === 0) {
          ctx.fillStyle = '#0f6b5c';
          ctx.beginPath();
          ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
        }
      });
    }
  }, [hands, visible, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="landmark-overlay"
      aria-hidden="true"
      style={{ visibility: visible ? 'visible' : 'hidden' }}
    />
  );
}
