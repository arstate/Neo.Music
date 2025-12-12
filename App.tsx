import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VideoResult, VideoQuality, AudioQuality, LoopMode, SavedPlaylist } from './types';
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
  
  // Queue (Current Playlist)
  const [playlist, setPlaylist] = useState<VideoResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerObj, setPlayerObj] = useState<any>(null);

  // Saved Playlists (Library)
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  
  // Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Mobile Toggle
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true); // Desktop Toggle

  // Modals State
  const [modalMode, setModalMode] = useState<'NONE' | 'ADD_TO_PLAYLIST' | 'CREATE_PLAYLIST' | 'EDIT_PLAYLIST'>('NONE');
  const [selectedVideoForAdd, setSelectedVideoForAdd] = useState<VideoResult | null>(null);
  const [playlistFormName, setPlaylistFormName] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);

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

  // Player Container Ref (For Fullscreen)
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Refs for MediaSession
  const playlistRef = useRef(playlist);
  const currentIndexRef = useRef(currentIndex);
  const isPlayingRef = useRef(isPlaying);

  // --- PERSISTENCE ---
  // Load Playlists on Mount with Sanitization
  useEffect(() => {
    const stored = localStorage.getItem('neo_music_playlists');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // SANITIZATION: Ensure all videos have a valid thumbnail string to prevent "null.src" errors
          const sanitized = parsed.map((pl: any) => ({
             ...pl,
             videos: Array.isArray(pl.videos) ? pl.videos.map((v: any) => ({
                ...v,
                thumbnail: v.thumbnail || 'https://i.ytimg.com/mqdefault.jpg'
             })) : []
          }));
          setSavedPlaylists(sanitized);
        }
      } catch (e) {
        console.error("Failed to parse playlists", e);
      }
    }
  }, []);

  // Save Playlists on Change
  useEffect(() => {
    localStorage.setItem('neo_music_playlists', JSON.stringify(savedPlaylists));
  }, [savedPlaylists]);

  // Update refs whenever state changes
  useEffect(() => {
    playlistRef.current = playlist;
    currentIndexRef.current = currentIndex;
    isPlayingRef.current = isPlaying;
  }, [playlist, currentIndex, isPlaying]);

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
          setIsPlaying(true); // Auto-play enabled here
        }
      } catch (e) {
        console.error("Initial auto-search failed:", e);
      }
    };
    initSearch();
  }, []);

  // Timer loop for progress bar AND MediaSession Position Sync
  useEffect(() => {
    if (isPlaying && playerObj) {
      timerRef.current = window.setInterval(() => {
        if (playerObj.getCurrentTime && playerObj.getDuration) {
          const time = playerObj.getCurrentTime();
          const dur = playerObj.getDuration();
          setCurrentTime(time);
          if (dur && dur > 0 && dur !== duration) {
            setDuration(dur);
          }

          if ('mediaSession' in navigator) {
            try {
              if (!isNaN(dur) && !isNaN(time)) {
                navigator.mediaSession.setPositionState({
                  duration: dur,
                  playbackRate: 1,
                  position: time,
                });
              }
            } catch (e) {
              // Ignore
            }
          }
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
  useEffect(() => {
    if (isPlaying) {
      if (playerObj && typeof playerObj.playVideo === 'function') {
        playerObj.playVideo();
      }
      
      if (ghostAudioRef.current) {
        ghostAudioRef.current.volume = 0.05; 
        const playPromise = ghostAudioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Ghost Audio Play Error:", error);
          });
        }
      }

      startKeepAlive();
      requestWakeLock();

      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }

    } else {
      if (playerObj && typeof playerObj.pauseVideo === 'function') {
        playerObj.pauseVideo();
      }

      if (ghostAudioRef.current) {
        ghostAudioRef.current.pause();
      }

      stopKeepAlive();
      releaseWakeLock();

      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
  }, [isPlaying, playerObj]);


  // --- Logic Helpers ---

  // CRITICAL FIX: Directly call playerObj.loadVideoById.
  // This bypasses browser restrictions where React state updates (re-rendering the Player component)
  // are throttled in background tabs. Direct JS API calls to the player instance usually succeed
  // in the execution slice granted by the 'onEnd' event.
  const playNext = useCallback(() => {
    const pList = playlistRef.current; 
    const cIndex = currentIndexRef.current;
    if (pList.length === 0) return;
    
    const nextIndex = (cIndex + 1) % pList.length;
    const nextVideo = pList[nextIndex];

    if (playerObj && typeof playerObj.loadVideoById === 'function') {
       playerObj.loadVideoById(nextVideo.id);
    }

    setCurrentIndex(nextIndex);
    setIsPlaying(true);
  }, [playerObj]);

  const playPrev = useCallback(() => {
    const pList = playlistRef.current;
    const cIndex = currentIndexRef.current;
    if (pList.length === 0) return;
    
    const prevIndex = (cIndex - 1 + pList.length) % pList.length;
    const prevVideo = pList[prevIndex];

    if (playerObj && typeof playerObj.loadVideoById === 'function') {
      playerObj.loadVideoById(prevVideo.id);
    }

    setCurrentIndex(prevIndex);
    setIsPlaying(true);
  }, [playerObj]);

  // --- MEDIA SESSION API INTEGRATION ---
  useEffect(() => {
    if ('mediaSession' in navigator) {
      // Use the stable playNext/playPrev refs/logic inside media session
      // We need to wrap them to ensure they use the latest state if accessed via closure,
      // but relying on the refs inside playNext (if we used them) or just calling the latest function is safer.
      // Since playNext is now dependent on playerObj, we need to update the action handlers when playNext changes.
      
      const handleNextTrack = () => {
         playNext();
      };

      const handlePrevTrack = () => {
         playPrev();
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleStop = () => setIsPlaying(false);

      navigator.mediaSession.setActionHandler('play', handlePlay);
      navigator.mediaSession.setActionHandler('pause', handlePause);
      navigator.mediaSession.setActionHandler('stop', handleStop);
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
    }
  }, [playNext, playPrev]); // Update handlers when these change

  useEffect(() => {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime && playerObj) {
                playerObj.seekTo(details.seekTime);
                setCurrentTime(details.seekTime);
            }
        });
    }
  }, [playerObj]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentVideo) {
      // Defensive coding to filter out empty images which might cause "Cannot read properties of null (reading 'src')" in some browsers
      const validArtwork = [
        { src: currentVideo.thumbnail || '', sizes: '96x96', type: 'image/jpg' },
        { src: currentVideo.thumbnail || '', sizes: '128x128', type: 'image/jpg' },
        { src: currentVideo.thumbnail || '', sizes: '192x192', type: 'image/jpg' },
        { src: currentVideo.thumbnail || '', sizes: '512x512', type: 'image/jpg' },
      ].filter(img => typeof img.src === 'string' && img.src.trim() !== '');

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentVideo.title,
        artist: currentVideo.channelTitle,
        album: 'NEO MUSIC',
        artwork: validArtwork
      });
    }
  }, [currentVideo]);


  // --- AUDIO CONTEXT HACK ---
  const playSilentPing = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
        try {
          const osc = audioContextRef.current.createOscillator();
          const gain = audioContextRef.current.createGain();
          gain.gain.value = 0.001; 
          osc.connect(gain);
          gain.connect(audioContextRef.current.destination);
          osc.start();
          osc.stop(audioContextRef.current.currentTime + 0.1); 
        } catch(e) {}
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
        audioContextRef.current.resume().catch(() => {});
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

  // --- PLAYLIST MANAGEMENT ---

  const handleCreatePlaylist = () => {
    setPlaylistFormName('');
    setEditingPlaylistId(null);
    setModalMode('CREATE_PLAYLIST');
  };

  const handleEditPlaylist = (e: React.MouseEvent, pl: SavedPlaylist) => {
    e.stopPropagation();
    setPlaylistFormName(pl.name);
    setEditingPlaylistId(pl.id);
    setModalMode('EDIT_PLAYLIST');
  };

  const submitPlaylistForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistFormName.trim()) return;

    if (modalMode === 'CREATE_PLAYLIST') {
      const newPl: SavedPlaylist = {
        id: Date.now().toString(),
        name: playlistFormName,
        videos: [],
        createdAt: Date.now()
      };
      setSavedPlaylists([...savedPlaylists, newPl]);
    } else if (modalMode === 'EDIT_PLAYLIST' && editingPlaylistId) {
      setSavedPlaylists(savedPlaylists.map(pl => 
        pl.id === editingPlaylistId ? { ...pl, name: playlistFormName } : pl
      ));
    }
    setModalMode('NONE');
  };

  const handleDeletePlaylist = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this playlist?')) {
      setSavedPlaylists(savedPlaylists.filter(pl => pl.id !== id));
    }
  };

  const loadPlaylistToQueue = (pl: SavedPlaylist) => {
    if (pl.videos.length > 0) {
      setPlaylist([...pl.videos]);
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      alert('Playlist is empty!');
    }
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(false);
    }
  };

  const openAddToPlaylistModal = (video: VideoResult) => {
    setSelectedVideoForAdd(video);
    setModalMode('ADD_TO_PLAYLIST');
  };

  const addVideoToPlaylist = (playlistId: string) => {
    if (!selectedVideoForAdd) return;
    
    setSavedPlaylists(savedPlaylists.map(pl => {
      if (pl.id === playlistId) {
        // Prevent duplicates? Optional. Let's allow for now or just check id
        const exists = pl.videos.some(v => v.id === selectedVideoForAdd.id);
        if (exists) return pl;
        return { ...pl, videos: [...pl.videos, selectedVideoForAdd] };
      }
      return pl;
    }));
    
    setModalMode('NONE');
    setSelectedVideoForAdd(null);
  };

  // --- Search & Player Logic ---

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
    
    try {
      const results = await searchVideos(searchQuery, 10);
      if (results && results.length > 0) {
        setPlaylist(results);
        setCurrentIndex(0);
        setIsPlaying(true); 
      }
    } catch (error) {
      console.error("Search failed:", error);
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

  const handleVideoEnd = () => {
    if (loopMode === LoopMode.ONE) {
      playerObj?.seekTo(0);
      playerObj?.playVideo();
    } else {
      playNext();
    }
  };

  const togglePlayPause = () => {
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
        setIsPlaying(true); 
        startKeepAlive(); 
        requestWakeLock();
        
        if (ghostAudioRef.current) {
           ghostAudioRef.current.play().catch(e => console.log("Bg mode start error", e));
        }

        try {
          window.blur(); 
        } catch (e) {}

    } else {
        if (!isDataSaver) setShowVideo(true);
    }
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const effectiveQuality = (isDataSaver || isBackgroundMode || !showVideo) 
    ? VideoQuality.ZERO 
    : videoQuality;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden font-mono text-black selection:bg-neo-pink selection:text-white">
      
      {/* GHOST PLAYER */}
      <audio 
        ref={ghostAudioRef}
        src={SILENT_AUDIO_URI} 
        loop 
        playsInline 
        autoPlay={false}
        className="absolute opacity-0 pointer-events-none w-px h-px overflow-hidden" 
      />

      {/* MODALS */}
      {modalMode !== 'NONE' && (
        <div className="fixed inset-0 z-[100] flex items-start pt-20 sm:pt-0 sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           
           {/* CREATE / EDIT PLAYLIST MODAL */}
           {(modalMode === 'CREATE_PLAYLIST' || modalMode === 'EDIT_PLAYLIST') && (
              <div className="w-full max-w-sm bg-white border-4 border-black shadow-neo p-4 animate-in fade-in zoom-in duration-200">
                <h2 className="font-display text-xl font-black mb-4 uppercase">
                  {modalMode === 'CREATE_PLAYLIST' ? 'New Playlist' : 'Edit Playlist'}
                </h2>
                <form onSubmit={submitPlaylistForm} className="flex flex-col gap-4">
                  <input 
                    type="text" 
                    value={playlistFormName}
                    onChange={(e) => setPlaylistFormName(e.target.value)}
                    placeholder="PLAYLIST NAME" 
                    className="border-4 border-black p-2 font-bold uppercase focus:outline-none focus:bg-neo-yellow"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setModalMode('NONE')} className="px-4 py-2 border-2 border-black font-bold hover:bg-gray-200">CANCEL</button>
                    <button type="submit" className="px-4 py-2 border-2 border-black bg-neo-green font-bold shadow-neo-sm active:translate-y-1 active:shadow-none">SAVE</button>
                  </div>
                </form>
              </div>
           )}

           {/* ADD TO PLAYLIST MODAL */}
           {modalMode === 'ADD_TO_PLAYLIST' && selectedVideoForAdd && (
              <div className="w-full max-w-sm bg-white border-4 border-black shadow-neo p-4 animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
                 <h2 className="font-display text-xl font-black mb-2 uppercase">Add to Library</h2>
                 <p className="font-mono text-xs mb-4 truncate border-b-2 border-gray-200 pb-2">
                   {selectedVideoForAdd.title}
                 </p>
                 
                 <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 mb-4">
                    <button 
                      onClick={() => {
                        setPlaylistFormName(''); // Clear name so user can type custom name
                        setModalMode('CREATE_PLAYLIST');
                      }}
                      className="w-full flex items-center justify-center gap-2 border-2 border-black border-dashed p-3 hover:bg-neo-yellow font-bold text-sm"
                    >
                      <span className="text-xl">+</span> Create New Playlist
                    </button>
                    
                    {savedPlaylists.map(pl => (
                      <button
                        key={pl.id}
                        onClick={() => addVideoToPlaylist(pl.id)}
                        className="text-left border-2 border-black p-3 hover:bg-neo-green font-bold text-sm flex justify-between items-center group"
                      >
                        <span className="truncate">{pl.name}</span>
                        <span className="text-[10px] bg-black text-white px-1 group-hover:bg-white group-hover:text-black">
                          {pl.videos.length}
                        </span>
                      </button>
                    ))}
                 </div>
                 
                 <button onClick={() => setModalMode('NONE')} className="w-full py-2 border-2 border-black font-bold hover:bg-red-500 hover:text-white">CLOSE</button>
              </div>
           )}
        </div>
      )}

      {/* BACKGROUND MODE OVERLAY */}
      {isBackgroundMode && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-neo-yellow p-6 text-center">
              <div className="max-w-md border-4 border-black bg-white p-6 shadow-neo animate-bounce-slow">
                   {/* ... Content same as before ... */}
                  <h1 className="font-display text-2xl font-black uppercase mb-2">Background Mode ON</h1>
                  <p className="font-mono text-sm mb-6 font-bold">Safe to lock screen.</p>
                  <button 
                      onClick={toggleBackgroundMode}
                      className="mt-2 border-4 border-black bg-neo-pink px-6 py-3 font-display font-bold text-white shadow-neo-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                  >
                      RETURN TO APP
                  </button>
              </div>
          </div>
      )}

      {/* Top Section: Sidebar + Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        
        {/* SIDEBAR (Library) - Desktop (Toggleable & Wider: w-96) */}
        <aside 
          className={`hidden flex-col border-r-4 border-black bg-white transition-[width,opacity] duration-300 ease-in-out md:flex ${
            isDesktopSidebarOpen ? 'w-96 opacity-100' : 'w-0 opacity-0 overflow-hidden border-r-0'
          }`}
        >
          <div className="border-b-4 border-black bg-neo-yellow p-6 min-w-[24rem]">
            <h1 className="font-display text-2xl font-black uppercase tracking-tighter">
              NEO<span className="text-neo-pink">.</span>MUSIC
            </h1>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-6 min-w-[24rem]">
             
             {/* SAVED PLAYLISTS */}
             <div>
               <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-1">
                 <h3 className="font-display font-black text-lg">LIBRARY</h3>
                 <button onClick={handleCreatePlaylist} className="text-xl font-bold hover:text-neo-blue" title="Create Playlist">+</button>
               </div>
               
               {savedPlaylists.length === 0 ? (
                 <p className="text-xs text-gray-500 font-bold italic">No saved playlists.</p>
               ) : (
                 <div className="flex flex-col gap-2">
                   {savedPlaylists.map(pl => (
                     <div key={pl.id} className="group flex items-center justify-between border-2 border-transparent hover:border-black hover:bg-gray-100 p-1 cursor-pointer" onClick={() => loadPlaylistToQueue(pl)}>
                        <div className="truncate">
                          <span className="font-bold text-sm block truncate">{pl.name}</span>
                          <span className="text-[10px] text-gray-500">{pl.videos.length} tracks</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={(e) => handleEditPlaylist(e, pl)} className="text-[10px] border border-black px-1 hover:bg-neo-yellow">EDIT</button>
                           <button onClick={(e) => handleDeletePlaylist(e, pl.id)} className="text-[10px] border border-black px-1 hover:bg-red-500 hover:text-white">DEL</button>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>

             {/* CURRENT QUEUE */}
             <div className="flex-1 flex flex-col min-h-0">
               <div className="mb-2 border-b-2 border-black pb-1">
                 <h3 className="font-display font-black text-lg">NOW PLAYING</h3>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <Playlist 
                    videos={playlist} 
                    currentIndex={currentIndex} 
                    onSelect={setCurrentIndex}
                    onDelete={removeTrack}
                    onAddToLibrary={openAddToPlaylistModal}
                  />
               </div>
             </div>

          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex flex-1 flex-col bg-[#e5e7eb] relative min-w-0">
          {/* Top Bar: Search */}
          <div className="sticky top-0 z-40 w-full border-b-4 border-black bg-white p-2 sm:p-4">
            <div className="flex items-center gap-2">
                
                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center pr-2 font-display font-black text-lg">N.M</div>
                
                {/* Desktop Toggle Button */}
                <button 
                  onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
                  className="hidden md:flex items-center justify-center h-10 w-10 border-2 border-black bg-white hover:bg-neo-yellow mr-2"
                  title="Toggle Library"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                     {isDesktopSidebarOpen ? (
                       <path strokeLinecap="square" strokeLinejoin="miter" d="M15.75 19.5L8.25 12l7.5-7.5" />
                     ) : (
                       <path strokeLinecap="square" strokeLinejoin="miter" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                     )}
                  </svg>
                </button>

                {/* Mobile Library Toggle */}
                <button 
                  onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                  className="md:hidden border-2 border-black p-1 bg-neo-yellow"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>

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
                            <span className="sm:hidden">GO</span>
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

          {/* MOBILE DRAWER (For Library) */}
          {isMobileSidebarOpen && (
            <div className="md:hidden absolute inset-0 z-50 bg-white flex flex-col p-4 animate-in slide-in-from-left duration-200">
               <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-2">
                 <h2 className="font-display font-black text-2xl">LIBRARY</h2>
                 <button onClick={() => setIsMobileSidebarOpen(false)} className="border-2 border-black px-2 font-bold bg-red-500 text-white">X</button>
               </div>
               
               <div className="flex-1 overflow-y-auto">
                 <button onClick={handleCreatePlaylist} className="flex justify-center items-center w-full border-2 border-black border-dashed p-3 mb-4 font-bold bg-neo-yellow shadow-neo-xs active:shadow-none active:translate-y-1 transition-all">
                    + NEW PLAYLIST
                 </button>
                 
                 {savedPlaylists.map(pl => (
                   <div key={pl.id} className="border-2 border-black p-3 mb-2 flex justify-between items-center bg-gray-50" onClick={() => loadPlaylistToQueue(pl)}>
                      <div>
                        <div className="font-bold">{pl.name}</div>
                        <div className="text-xs text-gray-500">{pl.videos.length} Tracks</div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); loadPlaylistToQueue(pl); setIsMobileSidebarOpen(false); }}
                        className="bg-black text-white px-3 py-1 text-xs font-bold"
                      >
                        PLAY
                      </button>
                   </div>
                 ))}
                 
                 {savedPlaylists.length === 0 && <p className="text-center text-gray-400 font-bold">No playlists yet.</p>}
               </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 custom-scrollbar">
            <div className="mx-auto max-w-4xl">
              <div className="mb-4 sm:mb-6 w-full border-4 border-black bg-black shadow-neo">
                {currentVideo ? (
                    <PlayerScreen 
                      videoId={currentVideo.id}
                      thumbnail={currentVideo.thumbnail} 
                      showVideo={showVideo}
                      videoQuality={effectiveQuality}
                      loopMode={loopMode}
                      volume={volume}
                      onEnd={handleVideoEnd}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => {}} 
                      setPlayerRef={setPlayerObj}
                      containerRef={playerContainerRef}
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
              
              {/* Mobile View Playlist (Queue) */}
              <div className="md:hidden pb-4">
                 <div className="mb-2 font-display font-black border-b-2 border-black">NOW PLAYING</div>
                 <Playlist 
                    videos={playlist} 
                    currentIndex={currentIndex} 
                    onSelect={setCurrentIndex}
                    onDelete={removeTrack}
                    onAddToLibrary={openAddToPlaylistModal}
                  />
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="z-50 flex-none border-t-4 border-black bg-white p-2 shadow-[0px_-4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="w-full sm:mb-2 sm:w-1/4">
             <div className="overflow-hidden border-2 border-black bg-neo-yellow p-1 sm:p-2">
                <div className="whitespace-nowrap font-mono text-xs sm:text-sm font-bold text-black animate-marquee">
                  {currentVideo ? `${currentVideo.title} /// ${currentVideo.channelTitle}` : "WAITING FOR INPUT..."}
                </div>
              </div>
          </div>
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
               onToggleFullscreen={toggleFullscreen}
             />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;