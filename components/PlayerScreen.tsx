
import React, { useRef, useEffect, useState, useMemo } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { VideoQuality, LoopMode } from '../types';

interface PlayerScreenProps {
  videoId: string;
  thumbnail?: string;
  showVideo: boolean;
  videoQuality: VideoQuality;
  loopMode: LoopMode;
  volume: number;
  shouldPlay: boolean; 
  onEnd: () => void;
  onPlay: () => void;
  onPause: () => void;
  setPlayerRef: (player: any) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

const PlayerScreen: React.FC<PlayerScreenProps> = ({
  videoId,
  thumbnail,
  showVideo,
  videoQuality,
  loopMode,
  volume,
  shouldPlay, 
  onEnd,
  onPlay,
  onPause,
  setPlayerRef,
  containerRef
}) => {
  const playerRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Ref to track video changes
  const isChangingVideo = useRef(false);
  
  // Startup Guard
  const isStartingUp = useRef(true);

  const getApiQuality = (q: VideoQuality) => {
    if (q === VideoQuality.ZERO) return 'tiny';
    return q;
  };

  const applyQuality = (target: any) => {
    if (target && typeof target.setPlaybackQuality === 'function') {
      const apiQuality = getApiQuality(videoQuality);
      target.setPlaybackQuality(apiQuality);
    }
  };

  // Fullscreen Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- FORCE PLAY LOGIC ---
  useEffect(() => {
    if (!shouldPlay) {
        isChangingVideo.current = false;
        return; 
    }

    isChangingVideo.current = true;
    
    // Reset startup guard on new video
    isStartingUp.current = true;
    setTimeout(() => { isStartingUp.current = false; }, 4000); 

    const forcePlay = () => {
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        playerRef.current.playVideo();
      }
    };

    // Retry sequence to break browser throttling
    forcePlay();
    const t1 = setTimeout(forcePlay, 500);
    const t2 = setTimeout(forcePlay, 1500);
    const t3 = setTimeout(forcePlay, 3000);
    
    const tEnd = setTimeout(() => {
        forcePlay();
        isChangingVideo.current = false;
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tEnd);
    };
  }, [videoId]); // Dependency on videoId ensures this runs on track change

  // Handle Props Updates
  useEffect(() => {
    if (playerRef.current) applyQuality(playerRef.current);
  }, [videoQuality]);

  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(volume);
    }
  }, [volume]);

  // Handle Play/Pause intent changes from Parent (User clicks buttons)
  useEffect(() => {
    if (!playerRef.current) return;
    
    // If the parent says we should be playing, but the player is paused, play it.
    // If the parent says pause, pause it.
    // We check player state to avoid redundant calls.
    const state = playerRef.current.getPlayerState();
    
    if (shouldPlay && state !== 1 && state !== 3) {
        playerRef.current.playVideo();
    } else if (!shouldPlay && state === 1) {
        playerRef.current.pauseVideo();
    }
  }, [shouldPlay]);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    setPlayerRef(event.target);
    applyQuality(event.target);
    event.target.setVolume(volume);
    
    // Only auto-start on ready if the app state is Playing
    if (shouldPlay) {
        event.target.playVideo();
    } else {
        event.target.pauseVideo();
    }
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    const playerState = event.data;
    const player = event.target;

    // 1 = Playing, 2 = Paused, 3 = Buffering, 0 = Ended, -1 = Unstarted, 5 = Cued

    if (playerState === 1) { // PLAYING
       isChangingVideo.current = false; 
       isStartingUp.current = false; 
       onPlay();
       applyQuality(player);
    }
    
    else if (playerState === 3) { // BUFFERING
      applyQuality(player);
    }
    
    else if (playerState === 2) { // PAUSED
      // Only ignore browser pause if we are aggressively trying to play (during transition)
      if (shouldPlay && (isChangingVideo.current || isStartingUp.current)) {
        console.log("Auto-Resume: Ignoring Browser Auto-Pause");
        setTimeout(() => player.playVideo(), 200);
      } else {
        onPause();
      }
    }
    
    else if (playerState === -1 || playerState === 5) { // UNSTARTED / CUED
       // Only force play if we are supposed to be playing
       if (shouldPlay) {
         player.playVideo();
       }
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

  // MEMOIZE OPTS to prevent re-renders of the Iframe
  const opts: YouTubeProps['opts'] = useMemo(() => ({
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
      origin: window.location.origin, 
    },
  }), []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black border-4 border-black overflow-hidden group"
    >
      {/* Thumbnail Layer */}
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

      {/* YouTube Player */}
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

      {/* Exit Fullscreen */}
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
