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

  return (
    <div className={`relative w-full transition-all duration-300 border-4 border-black bg-black ${showVideo ? 'h-64 sm:h-80 md:h-96' : 'h-0 border-0 overflow-hidden'}`}>
      <div className={`absolute inset-0 ${showVideo ? 'block' : 'hidden'}`}>
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onPlayerReady}
          onStateChange={onPlayerStateChange}
          className="h-full w-full"
          iframeClassName="h-full w-full"
        />
      </div>
      
      {/* Overlay for CRT effect (optional aesthetic) */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]"></div>
    </div>
  );
};

export default PlayerScreen;