import { useCallback, useEffect, useId, useRef, useState } from 'react';

let youtubeApiPromise = null;

function loadYouTubeApi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('No window'));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };

    if (!document.querySelector('script[data-youtube-api]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.youtubeApi = 'true';
      document.body.appendChild(script);
    }

    // If the API finished loading before our handler was assigned.
    if (window.YT?.Player) resolve(window.YT);
  });

  return youtubeApiPromise;
}

export default function VideoDemo({
  signName,
  videoSrc,
  youtubeVideoId = null,
  captionPlaceholder,
  hasVerifiedVideo = false,
  compact = false,
}) {
  const reactId = useId().replace(/:/g, '');
  const playerElementId = `yt-player-${reactId}`;
  const videoRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState('1');
  const [youtubeReady, setYoutubeReady] = useState(false);

  const isYouTube = Boolean(youtubeVideoId);
  const canPlayLocal = Boolean(!isYouTube && hasVerifiedVideo && videoSrc);
  // Enable controls as soon as the YouTube embed is configured; API wires up when ready.
  const canPlay = isYouTube || canPlayLocal;

  useEffect(() => {
    if (!isYouTube) return undefined;

    let cancelled = false;
    let player = null;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        const host = document.getElementById(playerElementId);
        if (!host) return;

        player = new YT.Player(playerElementId, {
          videoId: youtubeVideoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              youtubePlayerRef.current = event.target;
              setYoutubeReady(true);
              try {
                event.target.setPlaybackRate(Number(speed) || 1);
              } catch {
                // Some playback rates are unavailable.
              }
            },
            onStateChange: (event) => {
              if (event.data === 1) setPlaying(true);
              else if (event.data === 2 || event.data === 0) setPlaying(false);
            },
          },
        });
        youtubePlayerRef.current = player;
      })
      .catch(() => {
        // Embed may still be usable via YouTube's native controls.
      });

    return () => {
      cancelled = true;
      setYoutubeReady(false);
      try {
        player?.destroy?.();
      } catch {
        // Ignore teardown errors during fast navigation / Strict Mode.
      }
      youtubePlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate only when video changes
  }, [isYouTube, youtubeVideoId, playerElementId]);

  useEffect(() => {
    if (videoRef.current && canPlayLocal) {
      videoRef.current.playbackRate = Number(speed) || 1;
    }
    if (youtubeReady && youtubePlayerRef.current?.setPlaybackRate) {
      try {
        youtubePlayerRef.current.setPlaybackRate(Number(speed) || 1);
      } catch {
        // Unsupported rate for this video.
      }
    }
  }, [speed, canPlayLocal, youtubeReady]);

  const playPause = useCallback(async () => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player?.playVideo) return;
      const state = player.getPlayerState?.();
      if (state === 1) player.pauseVideo();
      else player.playVideo();
      return;
    }

    const video = videoRef.current;
    if (!video || !canPlayLocal) return;
    if (video.paused) {
      await video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }, [isYouTube, canPlayLocal]);

  const replay = useCallback(async () => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player?.seekTo) return;
      player.seekTo(0, true);
      player.playVideo();
      return;
    }

    const video = videoRef.current;
    if (!video || !canPlayLocal) return;
    video.currentTime = 0;
    await video.play();
    setPlaying(true);
  }, [isYouTube, canPlayLocal]);

  return (
    <div className="video-demo">
      <div className="video-frame" aria-label={`Reference demonstration for ${signName}`}>
        {isYouTube ? (
          <div className="youtube-embed">
            <div id={playerElementId} className="youtube-player-host" />
            {!youtubeReady && (
              <div className="video-placeholder youtube-loading" aria-live="polite">
                <strong>Loading reference video…</strong>
              </div>
            )}
          </div>
        ) : canPlayLocal ? (
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            controls={false}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <div className="video-placeholder">
            <strong>{signName} — reference video placeholder</strong>
            <span>
              A verified ASL demonstration video will be inserted here later.
              Use the written instructions below while practicing.
            </span>
          </div>
        )}
      </div>

      <div className="video-controls" role="group" aria-label="Video playback controls">
        <button type="button" className="btn btn-secondary" onClick={playPause} disabled={!canPlay}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={replay} disabled={!canPlay}>
          Replay
        </button>
        <label>
          Speed
          <select
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            aria-label="Playback speed"
            disabled={!canPlay}
          >
            <option value="0.5">0.5×</option>
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
            <option value="1.25">1.25×</option>
          </select>
        </label>
      </div>

      {!compact && (
        <p className="caption-box" aria-label="Caption placeholder">
          <strong>Captions: </strong>
          {captionPlaceholder}
        </p>
      )}
    </div>
  );
}
