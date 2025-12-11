import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onPlayPause, onNext, onPrev }) => {
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <button
        onClick={onPrev}
        className="group flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white active:translate-y-0.5"
        title="Previous"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-5 w-5 sm:h-6 sm:w-6">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <button
        onClick={onPlayPause}
        className={`group flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center border-2 border-black transition-all active:translate-y-0.5 shadow-neo-sm hover:shadow-none ${
          isPlaying ? 'bg-neo-pink text-white' : 'bg-neo-green text-black'
        }`}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="h-6 w-6 sm:h-7 sm:w-7">
            <path strokeLinecap="square" strokeLinejoin="miter" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-6 w-6 sm:h-7 sm:w-7">
            <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
          </svg>
        )}
      </button>

      <button
        onClick={onNext}
        className="group flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center border-2 border-black bg-white hover:bg-black hover:text-white active:translate-y-0.5"
        title="Next"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-5 w-5 sm:h-6 sm:w-6">
          <path strokeLinecap="square" strokeLinejoin="miter" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
};

export default Controls;