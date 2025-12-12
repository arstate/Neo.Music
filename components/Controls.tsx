import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrev,
  currentTime,
  duration,
  onSeek,
  onSkip
}) => {

  const formatTime = (seconds: number) => {
    if (!seconds) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Slider / Time Bar */}
      <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold font-mono">
        <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
        <div className="relative flex-1 h-4 sm:h-5 bg-white border-2 border-black flex items-center px-1">
           <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-2 appearance-none bg-gray-200 cursor-pointer accent-neo-pink focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white"
            />
        </div>
        <span className="w-10 tabular-nums">{formatTime(duration)}</span>
      </div>

      {/* Buttons Row */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mt-1">
        {/* Prev */}
        <button
          onClick={onPrev}
          className="group flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white active:translate-y-0.5"
          title="Previous"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5">
            <path strokeLinecap="square" strokeLinejoin="miter" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        {/* -10s */}
        <button
          onClick={() => onSkip(-10)}
          className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-[10px] font-bold hover:bg-neo-blue hover:text-white active:translate-y-0.5"
          title="Rewind 10s"
        >
          -10
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          className={`group flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center border-2 border-black transition-all active:translate-y-0.5 shadow-neo-sm hover:shadow-none ${
            isPlaying ? 'bg-neo-pink text-white' : 'bg-neo-green text-black'
          }`}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="h-5 w-5 sm:h-6 sm:w-6">
              <path strokeLinecap="square" strokeLinejoin="miter" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6">
              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          )}
        </button>

        {/* +10s */}
        <button
          onClick={() => onSkip(10)}
          className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-[10px] font-bold hover:bg-neo-blue hover:text-white active:translate-y-0.5"
          title="Forward 10s"
        >
          +10
        </button>

        {/* Next */}
        <button
          onClick={onNext}
          className="group flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white active:translate-y-0.5"
          title="Next"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5">
            <path strokeLinecap="square" strokeLinejoin="miter" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Controls;