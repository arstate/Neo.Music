import React, { useState, useRef, useEffect } from 'react';
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
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const volumeRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close volume slider
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(event.target as Node)) {
        setIsVolumeOpen(false);
      }
    };

    if (isVolumeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVolumeOpen]);

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
      
      {/* Volume Control (Icon -> Slider Toggle) */}
      <div ref={volumeRef} className="relative flex items-center mr-1">
        {!isVolumeOpen ? (
          <button
            onClick={() => setIsVolumeOpen(true)}
            className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white hover:bg-neo-yellow transition-colors"
            title="Volume"
          >
            {volume === 0 ? (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                 <path strokeLinecap="square" strokeLinejoin="miter" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
               </svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                 <path strokeLinecap="square" strokeLinejoin="miter" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
               </svg>
            )}
          </button>
        ) : (
          <div className="flex h-8 items-center gap-2 border-2 border-black bg-white px-2 shadow-neo-xs animate-in fade-in zoom-in duration-100 origin-left">
             <button onClick={() => setIsVolumeOpen(false)} className="hover:text-neo-pink">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                 <path strokeLinecap="square" strokeLinejoin="miter" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
               </svg>
             </button>
             <input 
              type="range" 
              min="0" 
              max="100" 
              value={volume} 
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 sm:w-24 h-1 appearance-none bg-gray-300 accent-black cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
            />
          </div>
        )}
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
        /* Audio Quality Dropdown (Simplified) */
        <div className="h-8 flex items-center justify-center border-2 border-black bg-green-100 px-2 text-[10px] font-bold text-green-800">
           ECO/10p
        </div>
      ) : (
        /* Video Quality Dropdown */
        <select
          value={videoQuality}
          onChange={(e) => setVideoQuality(e.target.value as VideoQuality)}
          className="h-8 w-14 sm:w-auto border-2 border-black bg-white px-0 sm:px-1 text-[10px] sm:text-xs font-bold focus:outline-none"
          title="Video Quality"
        >
          <option value={VideoQuality.ZERO}>10p (Low)</option>
          <option value={VideoQuality.TINY}>144p</option>
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