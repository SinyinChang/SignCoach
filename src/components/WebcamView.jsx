import LandmarkOverlay from './LandmarkOverlay';

export default function WebcamView({
  videoRef,
  active,
  hands,
  showLandmarks,
}) {
  return (
    <div className="webcam-shell">
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label="Live webcam feed for signing practice"
      />
      <LandmarkOverlay videoRef={videoRef} hands={hands} visible={showLandmarks && active} />
      {!active && (
        <div className="webcam-empty">
          <strong>Camera is off</strong>
          <span>Select Start Camera to practice with your live webcam inside SignCoach.</span>
        </div>
      )}
    </div>
  );
}
