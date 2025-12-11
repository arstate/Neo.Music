import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentTitle: string;
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause, onNext, onPrev, currentTitle }) => {
  return (
    <div className="flex flex-col gap-4 border-4 border-black bg-neo-white p-4 shadow-neo">
      {/* Marquee Title */}
      <div className="overflow-hidden border-2 border-black bg-neo-yellow p-2">
        <div className="whitespace-nowrap font-mono font-bold text-black animate-marquee">
          {currentTitle || "NO TAPE INSERTED // WAITING FOR INPUT..."}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={onPrev}
          className="group relative flex h-16 items-center justify-center border-4 border-black bg-white transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-neo-sm active:bg-neo-blue active:text-white"
        >
          <span className="font-display text-xl font-bold">PREV</span>
        </button>

        <button
          onClick={onPlayPause}
          className={`group relative flex h-16 items-center justify-center border-4 border-black transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-neo-sm ${isPlaying ? 'bg-neo-pink text-white' : 'bg-neo-green text-black'}`}
        >
          <span className="font-display text-xl font-bold">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
        </button>

        <button
          onClick={onNext}
          className="group relative flex h-16 items-center justify-center border-4 border-black bg-white transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-neo-sm active:bg-neo-blue active:text-white"
        >
          <span className="font-display text-xl font-bold">NEXT</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;