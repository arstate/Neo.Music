import React, { useRef, useEffect, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { VideoQuality, LoopMode } from '../types';

interface PlayerScreenProps {
  videoId: string;
  showVideo: boolean;
  videoQuality: VideoQuality;
  loopMode: LoopMode;
  volume: number;
  onEnd: () => void;
  onPlay: () => void;
  onPause: () => void;
  setPlayerRef: (player: any) => void;
  containerRef: React.RefObject<HTMLDivElement>; // Added ref for fullscreen
}

const PlayerScreen: React.FC<PlayerScreenProps> = ({
  videoId,
  showVideo,
  videoQuality,
  loopMode,
  volume,
  onEnd,
  onPlay,
  onPause,
  setPlayerRef,
  containerRef
}) => {
  const playerRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Helper to resolve custom qualities (ZERO/10p) to API supported ones
  const getApiQuality = (q: VideoQuality) => {
    if (q === VideoQuality.ZERO) return 'tiny'; // Map 10p to 144p (tiny)
    return q;
  };

  const applyQuality = (target: any) => {
    if (target && typeof target.setPlaybackQuality === 'function') {
      const apiQuality = getApiQuality(videoQuality);
      target.setPlaybackQuality(apiQuality);
    }
  };

  // Handle Fullscreen Change Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle Quality Updates
  useEffect(() => {
    if (playerRef.current) {
      applyQuality(playerRef.current);
    }
  }, [videoQuality]);

  // Handle Volume Updates
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    setPlayerRef(event.target);
    applyQuality(event.target);
    event.target.setVolume(volume);
    event.target.playVideo();
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1 = Playing, 2 = Paused, 3 = Buffering, 0 = Ended
    if (event.data === 1) {
       onPlay();
       applyQuality(event.target);
    }
    if (event.data === 3) {
      applyQuality(event.target);
    }
    if (event.data === 2) onPause();
    if (event.data === 0) {
      if (loopMode === LoopMode.ONE) {
        event.target.seekTo(0, true);
        event.target.playVideo();
      } else {
        onEnd();
      }
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0, // Custom controls
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3, // Hide annotations
      playsinline: 1,
      fs: 0, // Hide YouTube's native fullscreen button since we use ours
    },
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black border-4 border-black overflow-hidden"
    >
      
      {/* 1. Placeholder Layer (Visible when showVideo is FALSE) */}
      <div 
        className={`absolute inset-0 z-10 flex items-center justify-center bg-neo-yellow transition-opacity duration-300 ${showVideo ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black to-transparent"></div>
          <div className="z-10 text-center p-4">
              <h3 className="font-display text-4xl sm:text-6xl font-black text-black opacity-80 uppercase tracking-tighter">Audio Only</h3>
              <div className="mt-4 inline-block border-4 border-black bg-white px-4 py-1 font-mono text-sm font-bold animate-pulse">
                {videoQuality === VideoQuality.ZERO || videoQuality === VideoQuality.TINY ? "10p ECO MODE" : "PLAYING..."}
              </div>
          </div>
      </div>

      {/* 2. YouTube Player Layer */}
      <div className={`relative w-full h-full ${showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}>
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          className="h-full w-full"
          iframeClassName="h-full w-full"
        />
        
        {/* INTERACTION BLOCKER: 
            Prevents hover states on iframe (hides Watermark/Title).
            HIDDEN when in fullscreen so user can access YouTube settings. 
        */}
        {showVideo && !isFullscreen && (
           <div className="absolute inset-0 z-30 bg-transparent w-full h-full"></div>
        )}

        {/* CRT Noise texture removed as requested */}
      </div>

    </div>
  );
};

export default PlayerScreen;