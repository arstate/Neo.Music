import React, { useState, useCallback } from 'react';
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
    <div className="flex h-screen w-full flex-col overflow-hidden font-mono text-black selection:bg-neo-pink selection:text-white">
      
      {/* Top Section: Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR (Library/Queue) */}
        <aside className="hidden w-80 flex-col border-r-4 border-black bg-white md:flex">
          {/* Logo */}
          <div className="border-b-4 border-black bg-neo-yellow p-6">
            <h1 className="font-display text-2xl font-black uppercase tracking-tighter">
              NEO<span className="text-neo-pink">.</span>MUSIC
            </h1>
          </div>
          
          {/* Playlist Component fills the rest */}
          <div className="flex-1 overflow-y-auto p-4">
             <Playlist 
                videos={playlist} 
                currentIndex={currentIndex} 
                onSelect={setCurrentIndex}
                onDelete={removeTrack}
              />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex flex-1 flex-col bg-[#e5e7eb] relative">
          {/* Top Bar: Search */}
          <div className="sticky top-0 z-20 flex w-full gap-2 border-b-4 border-black bg-white p-4">
             {/* Mobile Logo (Visible only on small screens) */}
             <div className="md:hidden flex items-center pr-2 font-display font-black">N.M</div>

            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SEARCH YOUTUBE..."
                className="w-full flex-1 border-4 border-black bg-white p-2 font-bold uppercase outline-none placeholder:text-gray-400 focus:bg-neo-yellow focus:placeholder:text-black"
              />
              <button
                type="submit"
                className="hidden border-4 border-black bg-neo-green px-6 font-display font-bold uppercase text-black shadow-neo-sm transition-transform active:translate-y-1 active:shadow-none sm:block"
              >
                Find
              </button>
            </form>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-4xl">
              {/* Video Player Container */}
              <div className="mb-6 w-full border-4 border-black bg-black shadow-neo">
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
                  <div className="flex h-64 sm:h-96 w-full items-center justify-center bg-neo-blue text-white">
                    <div className="text-center">
                       <h2 className="font-display text-4xl font-black">NO TAPE</h2>
                       <p className="mt-2 font-mono">USE SEARCH TO INSERT CASSETTE</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Mobile View Playlist (Only shows on mobile) */}
              <div className="md:hidden">
                 <Playlist 
                    videos={playlist} 
                    currentIndex={currentIndex} 
                    onSelect={setCurrentIndex}
                    onDelete={removeTrack}
                  />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* FOOTER (Controls & Settings) */}
      <footer className="z-50 flex h-auto flex-col gap-4 border-t-4 border-black bg-white p-2 sm:h-24 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-4 shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)]">
        
        {/* Left: Current Info */}
        <div className="w-full sm:w-1/3">
           <div className="overflow-hidden border-2 border-black bg-neo-yellow p-1 sm:p-2">
              <div className="whitespace-nowrap font-mono text-xs sm:text-sm font-bold text-black animate-marquee">
                {currentVideo ? `${currentVideo.title} /// ${currentVideo.channelTitle}` : "WAITING FOR INPUT..."}
              </div>
            </div>
        </div>

        {/* Center: Controls */}
        <div className="flex w-full justify-center sm:w-1/3">
           <Controls 
              isPlaying={isPlaying} 
              onPlayPause={togglePlayPause} 
              onNext={playNext} 
              onPrev={playPrev}
            />
        </div>

        {/* Right: Settings (Volume/Config style) */}
        <div className="flex w-full justify-center sm:w-1/3 sm:justify-end">
          <SettingsPanel 
            showVideo={showVideo} 
            setShowVideo={setShowVideo}
            videoQuality={videoQuality}
            setVideoQuality={setVideoQuality}
            loopMode={loopMode}
            setLoopMode={setLoopMode}
          />
        </div>
      </footer>
    </div>
  );
};

export default App;