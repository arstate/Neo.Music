import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VideoResult, VideoQuality, AudioQuality, LoopMode } from './types';
import { searchVideos, getSearchSuggestions } from './services/youtubeService';
import PlayerScreen from './components/PlayerScreen';
import Controls from './components/Controls';
import SettingsPanel from './components/SettingsPanel';
import Playlist from './components/Playlist';

// Tiny silent mp3 to trick iOS into keeping the session alive
const SILENT_AUDIO_URI = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASCCOzuFAAAAAAAAAAAAAAAAAAAA//OEZAAAAAAABEAAAAAAAAAAABAAAtxAAStAABAAAAAAAAAAAAAAA//OEZAAAAAAABEAAAAAAAAAAABAAAtxAAStAABAAAAAAAAAAAAAAA//OEZAAAAAAABEAAAAAAAAAAABAAAtxAAStAABAAAAAAAAAAAAAAA//OEZAAAAAAABEAAAAAAAAAAABAAAtxAAStAABAAAAAAAAAAAAAAA//OEZAAAAAAABEAAAAAAAAAAABAAAtxAAStAABAAAAAAAAAAAAAAA';

const App: React.FC = () => {
  // State
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [playlist, setPlaylist] = useState<VideoResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerObj, setPlayerObj] = useState<any>(null);

  // Time & Volume State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);

  // Settings
  const [showVideo, setShowVideo] = useState(true);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>(VideoQuality.MEDIUM);
  const [audioQuality, setAudioQuality] = useState<AudioQuality>(AudioQuality.MID);
  const [isDataSaver, setIsDataSaver] = useState(false);
  const [isBackgroundMode, setIsBackgroundMode] = useState(false);
  const [loopMode, setLoopMode] = useState<LoopMode>(LoopMode.ALL);

  // PWA State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const currentVideo = playlist[currentIndex];
  const timerRef = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);
  
  // Audio Context Ref for Background Hack (Android/Generic)
  const audioContextRef = useRef<AudioContext | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);

  // Ghost Player Ref (iOS Fix)
  const ghostAudioRef = useRef<HTMLAudioElement | null>(null);

  // Wake Lock Ref
  const wakeLockRef = useRef<any>(null);

  // Handle PWA Install Prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Initial Search
  useEffect(() => {
    const initSearch = async () => {
      try {
        const results = await searchVideos("dj tiktok", 3);
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
      }, 500); 
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

  // --- WAKE LOCK API ---
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.log('Wake Lock Error:', err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.log('Wake Lock Release Error:', err);
      }
    }
  };

  // --- MASTER PLAYBACK CONTROLLER ---
  // This syncs the "Ghost" HTML5 audio with the YouTube player.
  // This is CRITICAL for iOS.
  useEffect(() => {
    if (isPlaying) {
      // 1. YouTube Play
      playerObj?.playVideo();
      
      // 2. Ghost Audio Play (Keeps iOS Session Alive)
      if (ghostAudioRef.current) {
        // We set volume to almost zero, but not muted (muted often kills bg tasks)
        ghostAudioRef.current.volume = 0.01; 
        ghostAudioRef.current.play().catch(e => console.warn("Ghost play failed", e));
      }

      // 3. Keep Alive Ping (AudioContext)
      startKeepAlive();
      
      // 4. Wake Lock
      requestWakeLock();

      // 5. Update Media Session State explicitly
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }

    } else {
      // 1. YouTube Pause
      playerObj?.pauseVideo();

      // 2. Ghost Audio Pause
      if (ghostAudioRef.current) {
        ghostAudioRef.current.pause();
      }

      // 3. Stop Keep Alive
      stopKeepAlive();

      // 4. Release Wake Lock
      releaseWakeLock();

      // 5. Update Media Session State
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
  }, [isPlaying, playerObj]);


  // --- MEDIA SESSION API INTEGRATION ---
  // Updated with robust handlers for iOS
  useEffect(() => {
    if ('mediaSession' in navigator && currentVideo) {
      // 1. Set Metadata
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

      // 2. Set Action Handlers
      // CRITICAL: We update state locally, the useEffect above handles the actual hardware sync
      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
        // FORCE status update immediately for iOS so notification doesn't vanish
        navigator.mediaSession.playbackState = 'playing'; 
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
        navigator.mediaSession.playbackState = 'paused';
      });

      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && playerObj) {
            playerObj.seekTo(details.seekTime);
            setCurrentTime(details.seekTime);
        }
      });
    }
  }, [currentVideo, playerObj, currentIndex, playlist]); 

  // --- AUDIO CONTEXT HACK (Secondary Backup) ---
  const playSilentPing = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
        const osc = audioContextRef.current.createOscillator();
        const gain = audioContextRef.current.createGain();
        gain.gain.value = 0.001; 
        osc.connect(gain);
        gain.connect(audioContextRef.current.destination);
        osc.start();
        osc.stop(audioContextRef.current.currentTime + 0.1); 
    }
  };

  const startKeepAlive = () => {
    if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);

    if (!audioContextRef.current) {
       // @ts-ignore
       const AudioContext = window.AudioContext || window.webkitAudioContext;
       if (AudioContext) {
           audioContextRef.current = new AudioContext();
       }
    }

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    keepAliveIntervalRef.current = window.setInterval(() => {
        playSilentPing();
    }, 15000); 
    
    playSilentPing(); 
  };

  const stopKeepAlive = () => {
      if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
      }
  };

  // --- Logic Helpers ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setShowSuggestions(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length > 1) {
      debounceRef.current = window.setTimeout(async () => {
        const sugs = await getSearchSuggestions(val);
        setSuggestions(sugs);
      }, 300); 
    } else {
      setSuggestions([]);
    }
  };

  const executeSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setShowSuggestions(false); 
    const results = await searchVideos(searchQuery, 10);
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
    // Ensure we stay playing
    setIsPlaying(true);
  }, [currentIndex, playlist.length]);

  const playPrev = () => {
    if (playlist.length === 0) return;
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIndex);
    setIsPlaying(true);
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
    // If we are starting playback, ensure we are in a user-interaction context
    // to unlock audio contexts and play hidden audio
    if (!isPlaying) {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (ghostAudioRef.current) {
        ghostAudioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
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

  const toggleDataSaver = () => {
    const newState = !isDataSaver;
    setIsDataSaver(newState);
    if (newState) {
      setShowVideo(false); 
    } else if (!isBackgroundMode) {
      setShowVideo(true);
    }
  };

  const toggleBackgroundMode = () => {
    const newState = !isBackgroundMode;
    setIsBackgroundMode(newState);
    
    if (newState) {
        setShowVideo(false);
        setIsPlaying(true); // Force play state
        startKeepAlive(); 
        requestWakeLock();
        
        // Ensure ghost audio is active
        if (ghostAudioRef.current) {
           ghostAudioRef.current.play().catch(e => console.log("Bg mode start error", e));
        }

        // UX: Defocus
        try {
          window.blur(); 
        } catch (e) {}

    } else {
        if (!isDataSaver) setShowVideo(true);
    }
  };

  const effectiveQuality = (isDataSaver || isBackgroundMode) ? (audioQuality as unknown as VideoQuality) : videoQuality;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden font-mono text-black selection:bg-neo-pink selection:text-white">
      
      {/* THE GHOST PLAYER - Crucial for iOS Backgrounding */}
      {/* Plays a silent loop. iOS respects this more than YouTube Iframe. */}
      <audio 
        ref={ghostAudioRef}
        src={SILENT_AUDIO_URI} 
        loop 
        playsInline 
        autoPlay={false}
        className="hidden" 
      />

      {/* BACKGROUND MODE OVERLAY */}
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
                      Audio locked (Anti-Sleep Active). <br/>
                      Safe to lock screen or switch apps.
                  </p>
                  
                  <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => window.open('', '_self')}
                        className="border-2 border-black bg-gray-200 p-2 text-xs text-gray-500 font-bold uppercase cursor-not-allowed"
                    >
                        (Swipe Up / Home to Minimize)
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
          <div className="border-b-4 border-black bg-neo-yellow p-6">
            <h1 className="font-display text-2xl font-black uppercase tracking-tighter">
              NEO<span className="text-neo-pink">.</span>MUSIC
            </h1>
          </div>
          
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
                <div className="md:hidden flex items-center pr-2 font-display font-black text-lg">N.M</div>

                <div className="relative flex-1 min-w-0">
                    <form onSubmit={handleSearchSubmit} className="flex gap-1 sm:gap-2 w-full">
                        <input
                            type="text"
                            value={query}
                            onChange={handleInputChange}
                            onFocus={() => setShowSuggestions(true)}
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

                    {/* Suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-full border-4 border-black bg-white shadow-neo z-50">
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="cursor-pointer border-b-2 border-gray-100 p-2 text-sm font-bold uppercase hover:bg-neo-pink hover:text-white last:border-0"
                                    onMouseDown={() => handleSuggestionClick(suggestion)}
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
              {/* Video Player */}
              <div className="mb-4 sm:mb-6 w-full border-4 border-black bg-black shadow-neo">
                {currentVideo ? (
                    <PlayerScreen 
                      videoId={currentVideo.id}
                      showVideo={showVideo}
                      videoQuality={effectiveQuality}
                      loopMode={loopMode}
                      volume={volume}
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
              
              {/* Mobile View Playlist */}
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

      {/* FOOTER */}
      <footer className="z-50 flex-none border-t-4 border-black bg-white p-2 shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          
          {/* Song Info */}
          <div className="w-full sm:mb-2 sm:w-1/4">
             <div className="overflow-hidden border-2 border-black bg-neo-yellow p-1 sm:p-2">
                <div className="whitespace-nowrap font-mono text-xs sm:text-sm font-bold text-black animate-marquee">
                  {currentVideo ? `${currentVideo.title} /// ${currentVideo.channelTitle}` : "WAITING FOR INPUT..."}
                </div>
              </div>
          </div>

          {/* Controls */}
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

          {/* Settings */}
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
               volume={volume}
               setVolume={setVolume}
               installPrompt={installPrompt}
               handleInstallClick={handleInstallClick}
             />
          </div>

        </div>
      </footer>
    </div>
  );
};

export default App;