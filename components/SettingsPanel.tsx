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
    <div className="mb-6 flex flex-col gap-4 border-4 border-black bg-neo-blue p-4 shadow-neo">
      <h2 className="font-display text-xl font-bold text-white underline decoration-4 underline-offset-4">
        CONFIG
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Toggle Video */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-sm font-bold text-white">VISUALS</label>
          <button
            onClick={() => setShowVideo(!showVideo)}
            className={`border-4 border-black px-4 py-2 font-bold shadow-neo-sm transition-transform active:translate-y-1 ${
              showVideo ? 'bg-neo-green text-black' : 'bg-gray-300 text-gray-500'
            }`}
          >
            {showVideo ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Quality Selector */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-sm font-bold text-white">QUALITY</label>
          <select
            value={videoQuality}
            onChange={(e) => setVideoQuality(e.target.value as VideoQuality)}
            className="border-4 border-black bg-white px-2 py-2 font-mono font-bold shadow-neo-sm focus:outline-none"
          >
            <option value={VideoQuality.SMALL}>LOW (240p)</option>
            <option value={VideoQuality.MEDIUM}>MED (360p)</option>
            <option value={VideoQuality.LARGE}>HIGH (480p)</option>
            <option value={VideoQuality.HD720}>HD (720p)</option>
          </select>
        </div>

        {/* Loop Mode */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-sm font-bold text-white">MODE</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLoopMode(loopMode === LoopMode.ONE ? LoopMode.ALL : LoopMode.ONE)}
              className={`flex-1 border-4 border-black py-2 font-bold shadow-neo-sm transition-transform active:translate-y-1 ${
                loopMode === LoopMode.ONE ? 'bg-neo-pink text-white' : 'bg-white text-black'
              }`}
            >
              {loopMode === LoopMode.ONE ? 'LOOP 1' : 'AUTO NEXT'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;