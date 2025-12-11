import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VideoResult, VideoQuality, AudioQuality, LoopMode } from './types';
import { searchVideos, getSearchSuggestions } from './services/youtubeService';
import PlayerScreen from './components/PlayerScreen';
import Controls from './components/Controls';
import SettingsPanel from './components/SettingsPanel';
import Playlist from './components/Playlist';

const App: React.FC = () => {
  // State
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [playlist, setPlaylist] = useState<VideoResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerObj, setPlayerObj] = useState<any>(null);

  // Time State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Settings
  const [showVideo, setShowVideo] = useState(true);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>(VideoQuality.MEDIUM);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>(AudioQuality.MID);
  const [isDataSaver, setIsDataSaver] = useState(false);
  const [loopMode, setLoopMode] = useState<LoopMode>(LoopMode.ALL);

  const currentVideo = playlist[currentIndex];
  const timerRef = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);

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

  // Timer loop for progress bar
  useEffect(() => {
    if (isPlaying && playerObj) {
      timerRef.current = window.setInterval(() => {
        const time = playerObj.getCurrentTime();
        const dur = playerObj.getDuration();
        setCurrentTime(time);
        if (dur && dur > 0 && dur !== duration) {
          setDuration(dur);
        }
      }, 500); // Update every 500ms
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playerObj, duration]);

  // Reset time when video changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [currentIndex]);

  // Handle Search Input Change with Debounce for Suggestions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowSuggestions(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length > 1) {
      debounceRef.current = window.setTimeout(async () => {
        const sugs = await getSearchSuggestions(val);
        setSuggestions(sugs);
      }, 300); // Wait 300ms after typing stops
    } else {
      setSuggestions([]);
    }
  };

  const executeSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setShowSuggestions(false); // Hide suggestions
    const results = await searchVideos(searchQuery);
    if (results.length > 0) {
      setPlaylist(results);
      setCurrentIndex(0);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    executeSearch(suggestion);
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

  // Seek and Skip handlers
  const handleSeek = (time: number) => {
    if (playerObj) {
      playerObj.seekTo(time);
      setCurrentTime(time);
    }
  };

  const handleSkip = (seconds: number) => {
    if (playerObj) {
      const newTime = currentTime + seconds;
      playerObj.seekTo(newTime);
      setCurrentTime(newTime);
    }
  };

  // Data Saver Toggle Logic
  const toggleDataSaver = () => {
    const newState = !isDataSaver;
    setIsDataSaver(newState);
    if (newState) {
      setShowVideo(false); // Force video off
    } else {
      setShowVideo(true); // Restore video
    }
  };

  // Effective Quality Logic
  const effectiveQuality = isDataSaver ? (audioQuality as unknown as VideoQuality) : videoQuality;

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
          <div className="sticky top-0 z-20 w-full border-b-4 border-black bg-white p-2 sm:p-4">
            <div className="flex items-center gap-2">
                {/* Mobile Logo (Visible only on small screens) */}
                <div className="md:hidden flex items-center pr-2 font-display font-black text-lg">N.M</div>

                <div className="relative flex-1 min-w-0">
                    <form onSubmit={handleSearchSubmit} className="flex gap-1 sm:gap-2 w-full">
                        <input
                            type="text"
                            value={query}
                            onChange={handleInputChange}
                            onFocus={() => setShowSuggestions(true)}
                            // Delayed blur to allow click on suggestion to register
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder="SEARCH..."
                            className="w-full flex-1 border-2 sm:border-4 border-black bg-white p-2 font-bold uppercase outline-none placeholder:text-gray-400 focus:bg-neo-yellow focus:placeholder:text-black text-sm sm:text-base"
                            autoComplete="off"
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

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-full border-4 border-black bg-white shadow-neo z-50">
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="cursor-pointer border-b-2 border-gray-100 p-2 text-sm font-bold uppercase hover:bg-neo-pink hover:text-white last:border-0"
                                    onMouseDown={() => handleSuggestionClick(suggestion)} // onMouseDown fires before onBlur
                                >
                                    {suggestion}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
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
                      videoQuality={effectiveQuality}
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          
          {/* Top Row on Mobile: Song Info */}
          <div className="w-full sm:mb-2 sm:w-1/4">
             <div className="overflow-hidden border-2 border-black bg-neo-yellow p-1 sm:p-2">
                <div className="whitespace-nowrap font-mono text-xs sm:text-sm font-bold text-black animate-marquee">
                  {currentVideo ? `${currentVideo.title} /// ${currentVideo.channelTitle}` : "WAITING FOR INPUT..."}
                </div>
              </div>
          </div>

          {/* Center: Controls (Now includes slider) */}
          <div className="flex-1 w-full sm:w-2/4">
              <Controls 
                  isPlaying={isPlaying} 
                  onPlayPause={togglePlayPause} 
                  onNext={playNext} 
                  onPrev={playPrev}
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={handleSeek}
                  onSkip={handleSkip}
                />
          </div>

          {/* Right: Settings */}
          <div className="flex w-full justify-center sm:w-1/4 sm:justify-end sm:mb-2">
             <SettingsPanel 
               showVideo={showVideo} 
               setShowVideo={setShowVideo}
               videoQuality={videoQuality}
               setVideoQuality={setVideoQuality}
               audioQuality={audioQuality}
               setAudioQuality={setAudioQuality}
               isDataSaver={isDataSaver}
               toggleDataSaver={toggleDataSaver}
               loopMode={loopMode}
               setLoopMode={setLoopMode}
             />
          </div>

        </div>
      </footer>
    </div>
  );
};

export default App;