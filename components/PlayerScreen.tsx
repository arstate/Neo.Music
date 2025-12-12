import React, { useRef, useEffect, useState } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { VideoQuality, LoopMode } from '../types';

interface PlayerScreenProps {
  videoId: string;
  thumbnail?: string; // Added thumbnail prop
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
  thumbnail,
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

  const handleExitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  };

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      // DISABLE CONTROLS: Removes the bottom bar, progress, and settings gear.
      controls: 0, 
      disablekb: 1, // Disable keyboard shortcuts to prevent accidental UI triggers
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3, // Hide annotations
      playsinline: 1,
      fs: 0, // Disable native fullscreen button (we use our own)
    },
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black border-4 border-black overflow-hidden group"
    >
      
      {/* 1. Thumbnail Layer (Visible when showVideo is FALSE) */}
      <div 
        className={`absolute inset-0 z-10 flex items-center justify-center bg-black transition-opacity duration-300 overflow-hidden ${showVideo ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
          {thumbnail ? (
              <img 
                src={thumbnail} 
                alt="Audio Mode Art" 
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
          ) : (
             <div className="absolute inset-0 bg-neo-yellow opacity-100"></div>
          )}
          
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"></div>
          
          <div className="z-10 text-center p-4">
              <div className="inline-block border-4 border-black bg-white px-4 py-2 font-display font-black text-xl sm:text-2xl uppercase tracking-tighter shadow-neo">
                AUDIO MODE
              </div>
              <div className="mt-2 font-mono text-xs sm:text-sm font-bold text-white bg-black px-2 inline-block">
                {videoQuality === VideoQuality.ZERO || videoQuality === VideoQuality.TINY ? "10p ECO" : "PLAYING"}
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
            In NORMAL mode (not fullscreen), this invisible layer covers the video completely.
            This serves two purposes:
            1. Prevents clicking the video (which would pause it and show the big YouTube play button).
            2. Prevents HOVERING over the video (which would fade-in the top title bar and channel icon).
            
            In FULLSCREEN mode, this is HIDDEN to allow interaction if needed, 
            though controls are disabled via API so it remains clean.
        */}
        {showVideo && !isFullscreen && (
           <div className="absolute inset-0 z-30 bg-transparent w-full h-full cursor-default"></div>
        )}
      </div>

      {/* 3. CUSTOM EXIT FULLSCREEN BUTTON
          Visible only when in fullscreen mode.
      */}
      {isFullscreen && (
        <button
          onClick={handleExitFullscreen}
          className="absolute top-4 right-4 z-50 flex items-center gap-2 border-4 border-black bg-white px-4 py-2 font-display font-black uppercase text-black shadow-neo hover:bg-red-500 hover:text-white transition-all hover:scale-105 active:scale-95"
        >
          <span>EXIT</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="square" strokeLinejoin="miter" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

    </div>
  );
};

export default PlayerScreen;