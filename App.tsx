import React, { useState, useCallback, useEffect } from 'react';
import { VideoResult, VideoQuality, LoopMode } from './types';
import { searchVideos } from './services/youtubeService';
import PlayerScreen from './components/PlayerScreen';
import Controls from './components/Controls';
import SettingsPanel from './components/SettingsPanel';
import Playlist from './components/Playlist';

const App: React.FC = () => {
  // State
  const [query, setQuery] = useState('');
  const [playlist, setPlaylist] = useState<VideoResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerObj, setPlayerObj] = useState<any>(null);

  // Settings
  const [showVideo, setShowVideo] = useState(true);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>(VideoQuality.MEDIUM);
  const [loopMode, setLoopMode] = useState<LoopMode>(LoopMode.ALL);

  const currentVideo = playlist[currentIndex];

  // Initial Search for "dj tiktok"
  useEffect(() => {
    const initSearch = async () => {
      try {
        const results = await searchVideos("dj tiktok");
        if (results && results.length > 0) {
          setPlaylist(results);
          setCurrentIndex(0);
        }
      } catch (e) {
        console.error("Initial auto-search failed:", e);
      }
    };
    initSearch();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const results = await searchVideos(query);
    if (results.length > 0) {
      setPlaylist(results);
      setCurrentIndex(0);
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
    // Use h-[100dvh] for better mobile browser support
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden font-mono text-black selection:bg-neo-pink selection:text-white">
      
      {/* Top Section: Sidebar + Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* SIDEBAR (Library/Queue) - Hidden on Mobile */}
        <aside className="hidden w-80 flex-col border-r-4 border-black bg-white md:flex">
          {/* Logo */}
          <div className="border-b-4 border-black bg-neo-yellow p-6">
            <h1 className="font-display text-2xl font-black uppercase tracking-tighter">
              NEO<span className="text-neo-pink">.</span>MUSIC
            </h1>
          </div>
          
          {/* Playlist Component fills the rest */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
             <Playlist 
                videos={playlist} 
                currentIndex={currentIndex} 
                onSelect={setCurrentIndex}
                onDelete={removeTrack}
              />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex flex-1 flex-col bg-[#e5e7eb] relative min-w-0">
          {/* Top Bar: Search */}
          <div className="sticky top-0 z-20 flex w-full items-center gap-2 border-b-4 border-black bg-white p-2 sm:p-4">
             {/* Mobile Logo (Visible only on small screens) */}
             <div className="md:hidden flex items-center pr-2 font-display font-black text-lg">N.M</div>

            <form onSubmit={handleSearch} className="flex flex-1 gap-1 sm:gap-2 min-w-0">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SEARCH..."
                className="w-full flex-1 border-2 sm:border-4 border-black bg-white p-2 font-bold uppercase outline-none placeholder:text-gray-400 focus:bg-neo-yellow focus:placeholder:text-black text-sm sm:text-base"
              />
              <button
                type="submit"
                className="flex items-center justify-center border-2 sm:border-4 border-black bg-neo-green px-3 sm:px-6 font-display font-bold uppercase text-black shadow-neo-sm transition-transform active:translate-y-1 active:shadow-none"
              >
                <span className="hidden sm:inline">Find</span>
                <span className="sm:hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </span>
              </button>
            </form>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 custom-scrollbar">
            <div className="mx-auto max-w-4xl">
              {/* Video Player Container */}
              <div className="mb-4 sm:mb-6 w-full border-4 border-black bg-black shadow-neo">
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
                  <div className="flex h-48 sm:h-96 w-full items-center justify-center bg-neo-blue text-white">
                    <div className="text-center p-4">
                       <h2 className="font-display text-2xl sm:text-4xl font-black">LOADING...</h2>
                       <p className="mt-2 font-mono text-xs sm:text-base">INITIALIZING TAPE</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Mobile View Playlist (Only shows on mobile) */}
              <div className="md:hidden pb-4">
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
      <footer className="z-50 flex-none border-t-4 border-black bg-white p-2 shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          
          {/* Top Row on Mobile: Song Info */}
          <div className="w-full sm:w-1/3">
             <div className="overflow-hidden border-2 border-black bg-neo-yellow p-1 sm:p-2">
                <div className="whitespace-nowrap font-mono text-xs sm:text-sm font-bold text-black animate-marquee">
                  {currentVideo ? `${currentVideo.title} /// ${currentVideo.channelTitle}` : "WAITING FOR INPUT..."}
                </div>
              </div>
          </div>

          {/* Bottom Row on Mobile: Controls + Settings combined */}
          <div className="flex items-center justify-between gap-2 sm:contents">
             {/* Center: Controls */}
             <div className="flex flex-1 justify-center sm:w-1/3">
                <Controls 
                    isPlaying={isPlaying} 
                    onPlayPause={togglePlayPause} 
                    onNext={playNext} 
                    onPrev={playPrev}
                  />
             </div>

             {/* Right: Settings */}
             <div className="flex flex-none sm:w-1/3 sm:justify-end">
                <SettingsPanel 
                  showVideo={showVideo} 
                  setShowVideo={setShowVideo}
                  videoQuality={videoQuality}
                  setVideoQuality={setVideoQuality}
                  loopMode={loopMode}
                  setLoopMode={setLoopMode}
                />
             </div>
          </div>

        </div>
      </footer>
    </div>
  );
};

export default App;