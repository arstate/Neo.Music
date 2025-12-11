import React, { useState, useEffect, useCallback } from 'react';
import { VideoResult, VideoQuality, LoopMode } from './types';
import { searchVideos } from './services/youtubeService';
import { MOCK_SEARCH_RESULTS } from './constants';
import PlayerScreen from './components/PlayerScreen';
import Controls from './components/Controls';
import SettingsPanel from './components/SettingsPanel';
import Playlist from './components/Playlist';

const App: React.FC = () => {
  // State
  const [query, setQuery] = useState('');
  const [playlist, setPlaylist] = useState<VideoResult[]>(MOCK_SEARCH_RESULTS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerObj, setPlayerObj] = useState<any>(null);

  // Settings
  const [showVideo, setShowVideo] = useState(true);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>(VideoQuality.MEDIUM);
  const [loopMode, setLoopMode] = useState<LoopMode>(LoopMode.ALL);

  const currentVideo = playlist[currentIndex];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const results = await searchVideos(query);
    if (results.length > 0) {
      // Add results to playlist instead of replacing? Let's append for "Queue" feel, or replace.
      // For this style, let's just replace the playlist with search results to keep it simple, 
      // or add to queue. Let's add to queue.
      setPlaylist(prev => [...prev, ...results]);
    }
    setQuery('');
  };

  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIndex);
  }, [currentIndex, playlist.length]);

  const playPrev = () => {
    if (playlist.length === 0) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIndex);
  };

  const handleVideoEnd = () => {
    if (loopMode === LoopMode.ONE) {
      // Handled in PlayerScreen via seekTo(0) usually, but double check here
      playerObj?.seekTo(0);
      playerObj?.playVideo();
    } else {
      playNext();
    }
  };

  const togglePlayPause = () => {
    if (!playerObj) return;
    if (isPlaying) {
      playerObj.pauseVideo();
    } else {
      playerObj.playVideo();
    }
  };

  const removeTrack = (index: number) => {
    const newPlaylist = playlist.filter((_, i) => i !== index);
    setPlaylist(newPlaylist);
    if (index === currentIndex && newPlaylist.length > 0) {
      setCurrentIndex(index % newPlaylist.length);
    } else if (newPlaylist.length === 0) {
      setIsPlaying(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 font-mono text-black selection:bg-neo-pink selection:text-white">
      <div className="mx-auto max-w-3xl">
        
        {/* Header */}
        <header className="mb-8 border-4 border-black bg-white p-6 shadow-neo">
          <h1 className="text-center font-display text-4xl font-black uppercase tracking-tighter sm:text-5xl md:text-6xl">
            Neo<span className="text-neo-pink">.</span>Music
          </h1>
          <p className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-gray-500">
            Neo-Brutalist Audio/Visual Interface
          </p>
        </header>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="INSERT SEARCH TERM..."
            className="flex-1 border-4 border-black bg-white p-4 font-bold uppercase outline-none placeholder:text-gray-400 focus:bg-neo-yellow focus:placeholder:text-black"
          />
          <button
            type="submit"
            className="border-4 border-black bg-neo-green px-6 font-display font-bold uppercase text-black shadow-neo transition-transform active:translate-y-1 active:shadow-none"
          >
            Search
          </button>
        </form>

        {/* Main Interface Grid */}
        <div className="mb-8">
            
          {/* Settings Toggle */}
          <SettingsPanel 
            showVideo={showVideo} 
            setShowVideo={setShowVideo}
            videoQuality={videoQuality}
            setVideoQuality={setVideoQuality}
            loopMode={loopMode}
            setLoopMode={setLoopMode}
          />

          {/* Video Player Area */}
          <div className="mb-4">
             {currentVideo ? (
                <PlayerScreen 
                  videoId={currentVideo.id}
                  showVideo={showVideo}
                  videoQuality={videoQuality}
                  loopMode={loopMode}
                  onEnd={handleVideoEnd}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  setPlayerRef={setPlayerObj}
                />
             ) : (
               <div className="flex h-64 items-center justify-center border-4 border-black bg-black text-white">
                  <span className="animate-pulse font-mono">NO SIGNAL</span>
               </div>
             )}
          </div>

          {/* Controls */}
          <Controls 
            isPlaying={isPlaying} 
            onPlayPause={togglePlayPause} 
            onNext={playNext} 
            onPrev={playPrev}
            currentTitle={currentVideo?.title || ''}
          />

        </div>

        {/* Playlist */}
        <Playlist 
          videos={playlist} 
          currentIndex={currentIndex} 
          onSelect={setCurrentIndex}
          onDelete={removeTrack}
        />

      </div>
    </div>
  );
};

export default App;