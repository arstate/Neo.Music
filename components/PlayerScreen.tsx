
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
  
  // Ref to track if we just changed videos to prevent pause loops
  const isChangingVideo = useRef(false);

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

  // --- AGGRESSIVE AUTOPLAY FIX FOR BACKGROUND/MINIMIZED ---
  // When videoId changes, we set a flag and force play repeatedly 
  // to overcome browser throttling in background tabs.
  useEffect(() => {
    isChangingVideo.current = true;
    
    const timeouts: NodeJS.Timeout[] = [];
    
    // Function to force play safely
    const forcePlay = () => {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        console.log("Force Play: Triggering for new video");
        playerRef.current.playVideo();
      }
    };

    // Attempt 1: Immediate
    forcePlay();

    // Attempt 2: 500ms (standard lag)
    timeouts.push(setTimeout(forcePlay, 500));
    
    // Attempt 3: 1500ms (throttled tab check)
    timeouts.push(setTimeout(forcePlay, 1500));
    
    // Attempt 4: 3000ms (heavy throttle check)
    timeouts.push(setTimeout(() => {
        forcePlay();
        isChangingVideo.current = false; // Release lock
    }, 3000));

    return () => {
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [videoId]);


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
    const playerState = event.data;
    const player = event.target;

    // YT Player States:
    // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)

    if (playerState === 1) { // PLAYING
       isChangingVideo.current = false; // Confirm we are playing
       onPlay();
       applyQuality(player);
    }
    
    else if (playerState === 3) { // BUFFERING
      applyQuality(player);
    }
    
    else if (playerState === 2) { // PAUSED
      // BACKGROUND FIX: If we just changed video and it paused immediately, 
      // it means the browser blocked autoplay. Force it back!
      if (isChangingVideo.current) {
        console.log("Auto-Resume: Browser tried to pause new video, forcing play.");
        setTimeout(() => player.playVideo(), 100);
      } else {
        onPause();
      }
    }
    
    else if (playerState === -1 || playerState === 5) { // UNSTARTED or CUED
       // Critical for Background tabs: if it stays in -1 or 5, it means it loaded but didn't start.
       // We force it.
       console.log("State Stuck (Unstarted/Cued): Forcing Play");
       player.playVideo();
    }
    
    else if (playerState === 0) { // ENDED
      if (loopMode === LoopMode.ONE) {
        player.seekTo(0, true);
        player.playVideo();
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
      controls: 0, 
      disablekb: 1, 
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3, 
      playsinline: 1,
      fs: 0, 
      origin: window.location.origin, // Helps with some autoplay policies
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
        
        {showVideo && !isFullscreen && (
           <div className="absolute inset-0 z-30 bg-transparent w-full h-full cursor-default"></div>
        )}
      </div>

      {/* 3. CUSTOM EXIT FULLSCREEN BUTTON */}
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
