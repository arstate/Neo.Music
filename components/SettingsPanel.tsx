import React from 'react';
import { VideoQuality, AudioQuality, LoopMode } from '../types';

interface SettingsPanelProps {
  showVideo: boolean;
  setShowVideo: (show: boolean) => void;
  videoQuality: VideoQuality;
  setVideoQuality: (q: VideoQuality) => void;
  audioQuality: AudioQuality;
  setAudioQuality: (q: AudioQuality) => void;
  isDataSaver: boolean;
  toggleDataSaver: () => void;
  loopMode: LoopMode;
  setLoopMode: (m: LoopMode) => void;
  isBackgroundMode: boolean;
  toggleBackgroundMode: () => void;
  volume: number;
  setVolume: (v: number) => void;
  installPrompt: any; // The PWA install prompt event
  handleInstallClick: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showVideo,
  setShowVideo,
  videoQuality,
  setVideoQuality,
  audioQuality,
  setAudioQuality,
  isDataSaver,
  toggleDataSaver,
  loopMode,
  setLoopMode,
  isBackgroundMode,
  toggleBackgroundMode,
  volume,
  setVolume,
  installPrompt,
  handleInstallClick
}) => {
  return (
    <div className="flex flex-nowrap items-center gap-1 sm:gap-2">

      {/* PWA Install Button (Only visible if prompt exists) */}
      {installPrompt && (
        <button
          onClick={handleInstallClick}
          className="flex h-8 w-auto items-center justify-center border-2 border-black bg-neo-yellow px-2 text-[10px] sm:text-xs font-bold shadow-neo-xs hover:translate-y-0.5 hover:shadow-none transition-all mr-2"
          title="Install App"
        >
          INSTALL APP
        </button>
      )}
      
      {/* Volume Control */}
      <div className="hidden sm:flex items-center gap-1 border-2 border-black bg-white px-2 h-8 mr-1">
        <span className="text-[10px] font-bold">VOL</span>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={volume} 
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-16 h-1 appearance-none bg-gray-300 accent-black cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:bg-black"
        />
      </div>

      {/* Background / Minimize Button */}
      <button
        onClick={toggleBackgroundMode}
        className={`flex h-8 w-10 sm:w-auto items-center justify-center border-2 border-black px-1 text-[10px] sm:text-xs font-bold transition-colors ${
          isBackgroundMode ? 'bg-purple-600 text-white shadow-neo-xs' : 'bg-white text-black hover:bg-purple-100'
        }`}
        title="Background Play / Minimize Info"
      >
        {isBackgroundMode ? 'BG:ON' : 'BG'}
      </button>

      {/* Visual Toggle (Disabled if Data Saver or BG Mode is ON) */}
      <button
        onClick={() => !isDataSaver && !isBackgroundMode && setShowVideo(!showVideo)}
        disabled={isDataSaver || isBackgroundMode}
        className={`flex h-8 w-10 sm:w-auto items-center justify-center border-2 border-black px-1 text-[10px] sm:text-xs font-bold transition-colors ${
          isDataSaver || isBackgroundMode
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
            : showVideo 
              ? 'bg-neo-blue text-white' 
              : 'bg-gray-200 text-gray-400'
        }`}
        title={isDataSaver || isBackgroundMode ? "Disabled in Eco/BG Mode" : "Toggle Video Preview"}
      >
        {showVideo ? 'VID' : 'OFF'}
      </button>

      {/* Internet Saver (ECO) Toggle */}
      <button
        onClick={toggleDataSaver}
        className={`flex h-8 w-10 sm:w-auto items-center justify-center border-2 border-black px-1 text-[10px] sm:text-xs font-bold transition-colors ${
          isDataSaver ? 'bg-green-500 text-white shadow-neo-xs' : 'bg-white text-black hover:bg-green-100'
        }`}
        title="Data Saver Mode (Audio Only)"
      >
        ECO
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

      {/* Quality (Changes based on Data Saver or BG mode) */}
      {isDataSaver || isBackgroundMode ? (
        /* Audio Quality Dropdown */
        <select
          value={audioQuality}
          onChange={(e) => setAudioQuality(e.target.value as AudioQuality)}
          className="h-8 w-14 sm:w-auto border-2 border-black bg-green-100 px-0 sm:px-1 text-[10px] sm:text-xs font-bold focus:outline-none"
          title="Audio Quality (Data Saver)"
        >
          <option value={AudioQuality.LOW}>LO</option>
          <option value={AudioQuality.MID}>MID</option>
          <option value={AudioQuality.HIGH}>HI</option>
        </select>
      ) : (
        /* Video Quality Dropdown */
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
      )}
    </div>
  );
};

export default SettingsPanel;