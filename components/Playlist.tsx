import React from 'react';
import { VideoResult } from '../types';

interface PlaylistProps {
  videos: VideoResult[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
}

const Playlist: React.FC<PlaylistProps> = ({ videos, currentIndex, onSelect, onDelete }) => {
  if (videos.length === 0) {
    return (
      <div className="mt-6 flex h-32 items-center justify-center border-4 border-black border-dashed bg-gray-100 font-mono text-gray-500">
        NO TAPES IN QUEUE
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <h3 className="font-display text-2xl font-black uppercase italic tracking-tighter text-black">
        Playlist ({videos.length})
      </h3>
      <div className="flex flex-col gap-3">
        {videos.map((video, index) => (
          <div
            key={`${video.id}-${index}`}
            className={`relative flex cursor-pointer items-center gap-4 border-4 border-black p-3 transition-all hover:-translate-y-1 hover:shadow-neo-sm ${
              index === currentIndex ? 'bg-neo-yellow' : 'bg-white'
            }`}
            onClick={() => onSelect(index)}
          >
            <div className="h-12 w-16 flex-shrink-0 overflow-hidden border-2 border-black bg-gray-200">
                <img src={video.thumbnail} alt="thumb" className="h-full w-full object-cover" />
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono font-bold leading-tight">{video.title}</p>
              <p className="truncate text-xs font-bold text-gray-500">{video.channelTitle}</p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(index);
              }}
              className="flex h-8 w-8 items-center justify-center border-2 border-black bg-neo-pink font-bold text-white hover:bg-red-600"
            >
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Playlist;