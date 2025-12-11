import React, { useRef, useEffect } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { VideoQuality, LoopMode } from '../types';

interface PlayerScreenProps {
  videoId: string;
  showVideo: boolean;
  videoQuality: VideoQuality;
  loopMode: LoopMode;
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
  onEnd,
  onPlay,
  onPause,
  setPlayerRef
}) => {
  const playerRef = useRef<any>(null);

  // Handle Quality Updates
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setPlaybackQuality(videoQuality);
    }
  }, [videoQuality]);

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
    setPlayerRef(event.target);
    event.target.setPlaybackQuality(videoQuality);
    event.target.playVideo();
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    // 1 = Playing, 2 = Paused, 0 = Ended
    if (event.data === 1) onPlay();
    if (event.data === 2) onPause();
    if (event.data === 0) {
      if (loopMode === LoopMode.ONE) {
        event.target.seekTo(0);
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
    },
  };

  // If video is hidden, we render a placeholder art instead of hiding the div completely, 
  // to maintain structure in the main view.
  if (!showVideo) {
      return (
        <div className="relative w-full h-full aspect-video bg-neo-yellow border-black flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black to-transparent"></div>
             <div className="z-10 text-center p-4">
                 <h3 className="font-display text-4xl sm:text-6xl font-black text-black opacity-80 uppercase tracking-tighter">Audio Only</h3>
                 <div className="mt-4 inline-block border-4 border-black bg-white px-4 py-1 font-mono text-sm font-bold animate-pulse">
                    PLAYING...
                 </div>
             </div>
             {/* Hidden player to keep audio running */}
             <div className="hidden">
                <YouTube
                    videoId={videoId}
                    opts={opts}
                    onReady={onPlayerReady}
                    onStateChange={onPlayerStateChange}
                />
             </div>
        </div>
      )
  }

  return (
    <div className="relative w-full aspect-video bg-black">
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={onPlayerReady}
        onStateChange={onPlayerStateChange}
        className="h-full w-full"
        iframeClassName="h-full w-full"
      />
      {/* Overlay for CRT effect (optional aesthetic) */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
    </div>
  );
};

export default PlayerScreen;