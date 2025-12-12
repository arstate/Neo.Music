
import React from 'react';
import { VideoResult } from '../types';

interface PlaylistProps {
  videos: VideoResult[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onAddToLibrary: (video: VideoResult) => void;
}

const Playlist: React.FC<PlaylistProps> = ({ videos, currentIndex, onSelect, onDelete, onAddToLibrary }) => {
  if (videos.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center border-4 border-black border-dashed bg-gray-50 p-2 text-center font-mono text-xs text-gray-500">
        <p>QUEUE EMPTY</p>
      </div>
    );
  }

  return (
    // Added padding (p-2) to the container to ensure hover effects (translate/shadoww) 
    // do not get clipped by the overflow-hidden/auto parent.
    <div className="flex flex-col gap-2 p-2 pb-20 md:pb-4">
      {videos.map((video, index) => (
        <div
          key={`${video.id}-${index}`}
          className={`group relative flex justify-between items-center gap-2 border-2 border-black p-2 transition-all hover:bg-neo-green ${
            index === currentIndex ? 'bg-neo-yellow shadow-neo-xs translate-x-1 -translate-y-1' : 'bg-white hover:translate-x-1 hover:-translate-y-1 hover:shadow-neo-xs'
          }`}
          onClick={() => onSelect(index)}
        >
          {/* Status Indicator */}
          {index === currentIndex && (
            <div className="absolute -left-1 -top-1 h-3 w-3 bg-neo-pink border border-black z-20"></div>
          )}

          {/* Left Side: Thumb + Text */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
             <div className="h-10 w-12 flex-shrink-0 overflow-hidden border border-black bg-gray-200">
                <img src={video.thumbnail} alt="thumb" className="h-full w-full object-cover grayscale group-hover:grayscale-0" />
            </div>
            
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p className="truncate font-mono text-xs font-bold leading-tight">{video.title}</p>
              <p className="truncate text-[10px] font-bold text-gray-500 group-hover:text-black">{video.channelTitle}</p>
            </div>
          </div>

          {/* Action Buttons Container - Fixed Right Alignment */}
          <div className="flex items-center gap-3 relative z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity pl-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToLibrary(video);
              }}
              className="flex h-8 w-8 items-center justify-center border-2 border-black bg-neo-blue text-white text-sm font-bold shadow-neo-xs active:shadow-none active:translate-y-1 hover:bg-blue-600 transition-all"
              title="Add to Playlist"
            >
              +
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(index);
              }}
              className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-sm font-bold shadow-neo-xs active:shadow-none active:translate-y-1 hover:bg-red-500 hover:text-white transition-all"
              title="Remove from Queue"
            >
              X
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Playlist;
