import React from 'react';
import { VideoQuality, LoopMode } from '../types';

interface SettingsPanelProps {
  showVideo: boolean;
  setShowVideo: (show: boolean) => void;
  videoQuality: VideoQuality;
  setVideoQuality: (q: VideoQuality) => void;
  loopMode: LoopMode;
  setLoopMode: (m: LoopMode) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showVideo,
  setShowVideo,
  videoQuality,
  setVideoQuality,
  loopMode,
  setLoopMode,
}) => {
  return (
    <div className="flex flex-nowrap items-center gap-1 sm:gap-2">
      
      {/* Visual Toggle */}
      <button
        onClick={() => setShowVideo(!showVideo)}
        className={`flex h-8 w-12 sm:w-auto items-center justify-center border-2 border-black px-1 text-[10px] sm:text-xs font-bold transition-colors ${
          showVideo ? 'bg-neo-blue text-white' : 'bg-gray-200 text-gray-400'
        }`}
        title="Toggle Video Preview"
      >
        {showVideo ? 'VID' : 'OFF'}
      </button>

      {/* Loop Mode */}
      <button
        onClick={() => setLoopMode(loopMode === LoopMode.ONE ? LoopMode.ALL : LoopMode.ONE)}
        className={`flex h-8 w-8 sm:w-auto items-center justify-center border-2 border-black px-1 text-[10px] sm:text-xs font-bold transition-colors ${
          loopMode === LoopMode.ONE ? 'bg-neo-pink text-white' : 'bg-white text-black'
        }`}
        title="Toggle Loop Mode"
      >
        {loopMode === LoopMode.ONE ? '1' : '∞'}
      </button>

      {/* Quality */}
      <select
        value={videoQuality}
        onChange={(e) => setVideoQuality(e.target.value as VideoQuality)}
        className="h-8 w-14 sm:w-auto border-2 border-black bg-white px-0 sm:px-1 text-[10px] sm:text-xs font-bold focus:outline-none"
        title="Video Quality"
      >
        <option value={VideoQuality.SMALL}>240p</option>
        <option value={VideoQuality.MEDIUM}>360p</option>
        <option value={VideoQuality.LARGE}>480p</option>
        <option value={VideoQuality.HD720}>720p</option>
      </select>
    </div>
  );
};

export default SettingsPanel;