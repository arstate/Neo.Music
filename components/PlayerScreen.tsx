import React, { useRef, useEffect } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { VideoQuality, LoopMode } from '../types';

interface PlayerScreenProps {
  videoId: string;
  showVideo: boolean;
  videoQuality: VideoQuality;
  loopMode: LoopMode;
  volume: number; // New Prop
  onEnd: () => void;
  onPlay: () => void;
  onPause: () => void;
  setPlayerRef: (player: any) => void;
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
  setPlayerRef
}) => {
  const playerRef = useRef<any>(null);

  // Handle Quality Updates
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setPlaybackQuality === 'function') {
      playerRef.current.setPlaybackQuality(videoQuality);
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
    event.target.setPlaybackQuality(videoQuality);
    event.target.setVolume(volume);
    event.target.playVideo();
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1 = Playing, 2 = Paused, 0 = Ended
    if (event.data === 1) onPlay();
    if (event.data === 2) onPause();
    if (event.data === 0) {
      if (loopMode === LoopMode.ONE) {
        // seekTo(seconds: number, allowSeekAhead: boolean)
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
      playsinline: 1, // Crucial for mobile inline/background playback
    },
  };

  return (
    <div className="relative w-full aspect-video bg-black border-4 border-black overflow-hidden">
      
      {/* 1. Placeholder Layer (Visible when showVideo is FALSE) */}
      {/* FIXED: Changed z-20 to z-10 to allow search dropdown (z-50) to appear on top */}
      <div 
        className={`absolute inset-0 z-10 flex items-center justify-center bg-neo-yellow transition-opacity duration-300 ${showVideo ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black to-transparent"></div>
          <div className="z-10 text-center p-4">
              <h3 className="font-display text-4xl sm:text-6xl font-black text-black opacity-80 uppercase tracking-tighter">Audio Only</h3>
              <div className="mt-4 inline-block border-4 border-black bg-white px-4 py-1 font-mono text-sm font-bold animate-pulse">
                PLAYING...
              </div>
          </div>
      </div>

      {/* 2. YouTube Player Layer */}
      {/* We use opacity-0 when hidden, NOT display:none, to keep audio stream active on mobile */}
      <div className={`w-full h-full ${showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0'}`}>
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          className="h-full w-full"
          iframeClassName="h-full w-full"
        />
        {/* Overlay for CRT effect (Only visible when video is showing) */}
        {showVideo && (
           <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
        )}
      </div>

    </div>
  );
};

export default PlayerScreen;