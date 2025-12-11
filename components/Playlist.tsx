import React from 'react';
import { VideoResult } from '../types';

interface PlaylistProps {
  videos: VideoResult[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onAddToLibrary: (video: VideoResult) => void; // New prop
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
    <div className="flex flex-col gap-2">
      {videos.map((video, index) => (
        <div
          key={`${video.id}-${index}`}
          className={`group relative flex cursor-pointer items-center gap-2 border-2 border-black p-2 transition-all hover:bg-neo-green ${
            index === currentIndex ? 'bg-neo-yellow shadow-neo-xs translate-x-1 -translate-y-1' : 'bg-white hover:translate-x-1 hover:-translate-y-1 hover:shadow-neo-xs'
          }`}
          onClick={() => onSelect(index)}
        >
          {/* Status Indicator */}
          {index === currentIndex && (
            <div className="absolute -left-1 -top-1 h-3 w-3 bg-neo-pink border border-black"></div>
          )}

          <div className="h-8 w-10 flex-shrink-0 overflow-hidden border border-black bg-gray-200">
              <img src={video.thumbnail} alt="thumb" className="h-full w-full object-cover grayscale group-hover:grayscale-0" />
          </div>
          
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs font-bold leading-tight">{video.title}</p>
            <p className="truncate text-[10px] font-bold text-gray-500 group-hover:text-black">{video.channelTitle}</p>
          </div>

          {/* Action Buttons Container */}
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToLibrary(video);
              }}
              className="flex h-6 w-6 items-center justify-center border border-black bg-neo-blue text-white text-[10px] font-bold hover:bg-blue-600"
              title="Add to Playlist"
            >
              +
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(index);
              }}
              className="flex h-6 w-6 items-center justify-center border border-black bg-white text-[10px] font-bold hover:bg-red-500 hover:text-white"
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