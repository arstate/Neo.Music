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
  const [isBackgroundMode, setIsBackgroundMode] = useState(false);
  const [loopMode, setLoopMode] = useState<LoopMode>(LoopMode.ALL);

  const currentVideo = playlist[currentIndex];
  const timerRef = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);
  
  // Audio Context Ref for iOS Background Hack
  const audioContextRef = useRef<AudioContext | null>(null);

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

  // --- MEDIA SESSION API INTEGRATION (For Background Play) ---
  useEffect(() => {
    if ('mediaSession' in navigator && currentVideo) {
      // 1. Set Metadata (Notification Content)
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentVideo.title,
        artist: currentVideo.channelTitle,
        album: 'NEO MUSIC',
        artwork: [
          { src: currentVideo.thumbnail, sizes: '96x96', type: 'image/jpg' },
          { src: currentVideo.thumbnail, sizes: '128x128', type: 'image/jpg' },
          { src: currentVideo.thumbnail, sizes: '192x192', type: 'image/jpg' },
          { src: currentVideo.thumbnail, sizes: '512x512', type: 'image/jpg' },
        ]
      });

      // 2. Set Action Handlers (Lock Screen Controls)
      navigator.mediaSession.setActionHandler('play', () => {
        playerObj?.playVideo();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        playerObj?.pauseVideo();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && playerObj) {
            playerObj.seekTo(details.seekTime);
        }
      });
    }
  }, [currentVideo, playerObj, currentIndex, playlist]); // Re-run when video or player changes

  // Update Media Session Playback State
  useEffect(() => {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // --- iOS BACKGROUND AUDIO HACK ---
  // This plays a silent sound using Web Audio API. 
  // This tricks iOS into thinking the app is a dedicated music player, preventing suspension.
  const initSilentAudio = () => {
    if (!audioContextRef.current) {
      // @ts-ignore - Handle webkit prefix for older Safari
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
      }
    }

    const ctx = audioContextRef.current;
    if (ctx) {
       // Create a silent oscillator
       const oscillator = ctx.createOscillator();
       const gainNode = ctx.createGain();
       
       // Nearly silent gain (not 0, or browser might optimize it away)
       gainNode.gain.value = 0.001; 
       
       oscillator.connect(gainNode);
       gainNode.connect(ctx.destination);
       
       oscillator.start();
       // Stop after a tiny fraction of a second, or loop it?
       // For iOS, just engaging the context is usually enough, 
       // but running a silent loop is safer for long sessions.
       // We'll leave the context 'running'.
    }
  };


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
      // On Resume, also ensure audio context is running (iOS policy)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
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
      setShowVideo(false); 
    } else if (!isBackgroundMode) {
      setShowVideo(true);
    }
  };

  // Background Mode Toggle
  const toggleBackgroundMode = () => {
    const newState = !isBackgroundMode;
    setIsBackgroundMode(newState);
    
    if (newState) {
        // ACTIVATING BACKGROUND MODE
        setShowVideo(false);
        initSilentAudio(); // FORCE iOS Audio Context
        
        // Attempt to "Minimize" (Best effort for UX)
        // Note: Browsers generally block window.close() for scripts that didn't open the window.
        // We simulate this by defocusing.
        try {
          window.blur(); 
        } catch (e) {}

    } else {
        // DEACTIVATING
        if (!isDataSaver) setShowVideo(true);
    }
  };

  // Effective Quality Logic
  const effectiveQuality = (isDataSaver || isBackgroundMode) ? (audioQuality as unknown as VideoQuality) : videoQuality;

  return (
    // Use h-[100dvh] for better mobile browser support
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden font-mono text-black selection:bg-neo-pink selection:text-white">
      
      {/* BACKGROUND MODE OVERLAY (Simulates "Minimized" state visually and instructs user) */}
      {isBackgroundMode && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-neo-yellow p-6 text-center">
              <div className="max-w-md border-4 border-black bg-white p-6 shadow-neo animate-bounce-slow">
                  <div className="mb-4 flex justify-center text-purple-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-16 h-16">
                      <path strokeLinecap="square" strokeLinejoin="miter" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                    </svg>
                  </div>
                  <h1 className="font-display text-2xl font-black uppercase mb-2">Background Mode ON</h1>
                  <p className="font-mono text-sm mb-6 font-bold">
                      Audio is locked and optimized. <br/>
                      You can now Swipe Home or lock your screen.
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => {
                            // Try to simulate a "home" action by focusing out (rarely works but good for intent)
                            window.open('', '_self');
                        }}
                        className="border-2 border-black bg-gray-200 p-2 text-xs text-gray-500 font-bold uppercase cursor-not-allowed"
                    >
                        (Swipe Up to Minimize)
                    </button>
                    <button 
                        onClick={toggleBackgroundMode}
                        className="mt-2 border-4 border-black bg-neo-pink px-6 py-3 font-display font-bold text-white shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                    >
                        RETURN TO APP
                    </button>
                  </div>
              </div>
              <div className="absolute bottom-10 animate-pulse font-mono text-xs font-bold">
                  PLAYING: {currentVideo ? currentVideo.title.substring(0, 30) + '...' : 'AUDIO STREAM'}
              </div>
          </div>
      )}

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
               isBackgroundMode={isBackgroundMode}
               toggleBackgroundMode={toggleBackgroundMode}
             />
          </div>

        </div>
      </footer>
    </div>
  );
};

export default App;