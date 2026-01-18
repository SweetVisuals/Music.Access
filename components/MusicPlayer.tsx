
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Maximize2, ListMusic, Minimize2, ChevronUp, Move, Share2, MoreHorizontal, ChevronDown, StickyNote, PlusCircle, BookmarkPlus } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';
import { useNavigate } from 'react-router-dom';
import { Project, View } from '../types';
import { MOCK_USER_PROFILE } from '../constants';
import { checkIsProjectSaved, saveProject, unsaveProject, convertAssetToProject, getSavedProjectIdForAsset, joinListeningRoom, incrementTrackPlays } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';

import BottomNav from './BottomNav';

interface MusicPlayerProps {
    currentProject: Project | null;
    currentTrackId: string | null;
    isPlaying: boolean;
    togglePlay: () => void;
    currentView?: View;
    onClose: () => void;
    onNavigate: (view: View | string) => void;
    isSidebarOpen?: boolean;
    onNext?: () => void;
    onPrev?: () => void;
    hasPrev?: boolean;
    repeatMode?: 'off' | 'all' | 'one';
    isShuffling?: boolean;
    onToggleRepeat?: () => void;
    onToggleShuffle?: () => void;
    isExpanded: boolean;
    onExpandToggle: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({
    currentProject,
    currentTrackId,
    isPlaying,
    togglePlay,
    currentView,
    onClose,
    onNavigate,
    isSidebarOpen = false,
    onNext,
    onPrev,
    hasPrev,
    repeatMode = 'off',
    isShuffling = false,
    onToggleRepeat,
    onToggleShuffle,
    isExpanded,
    onExpandToggle
}) => {
    const navigate = useNavigate();
    const [isMinimized, setIsMinimized] = useState(true);

    // --- Audio Logic ---
    const currentTrack = useMemo(() => {
        if (!currentProject || !currentTrackId) return null;
        return currentProject.tracks.find((t, i) => (t.id || `track-${i}`) === currentTrackId);
    }, [currentProject, currentTrackId]);

    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        if (!audioRef.current || !currentTrack) return;
        const url = currentTrack.files?.mp3 || '';
        if (url && audioRef.current.src !== url) {
            audioRef.current.src = url;
            audioRef.current.load();
        } else if (!url && audioRef.current) {
            // Handle missing URL - console warning and maybe pause?
            console.warn("Audio URL is missing for track:", currentTrack.title);
            // Optionally, you might want to stop playback or set a specific state,
            // but strictly sticking to not breaking:
            if (isPlaying) togglePlay(); // Pause if we were trying to play
            return;
        }
        if (isPlaying) audioRef.current.play().catch(console.error);
        else audioRef.current.pause();

        // Check if project is saved
        const checkSavedStatus = async () => {
            if (currentProject?.id) {
                if (currentProject.id === 'upload_browser_proj' && currentTrack?.id) {
                    const savedProjectId = await getSavedProjectIdForAsset(currentTrack.id);
                    setIsSaved(!!savedProjectId);
                } else {
                    const saved = await checkIsProjectSaved(currentProject.id);
                    setIsSaved(saved);
                }
            }
        };
        checkSavedStatus();

        // Track Live Listeners (Presence)
        let cleanupPresence: { unsubscribe: () => void } | undefined;
        if (isPlaying && currentProject?.userId && currentTrack?.id) {
            // joinListeningRoom(artistId, trackId, userId)
            cleanupPresence = joinListeningRoom(currentProject.userId, currentTrack.id, currentProject.userId === 'guest' ? undefined : undefined);
        }

        return () => {
            if (cleanupPresence) cleanupPresence.unsubscribe();
        };
    }, [currentTrack, isPlaying, currentProject?.id, currentProject?.userId]);

    // --- Play Counting Logic ---
    const playRecordedRef = useRef(false);

    // Reset recorded flag when track changes
    useEffect(() => {
        playRecordedRef.current = false;
    }, [currentTrackId]);

    // Record play after threshold
    useEffect(() => {
        if (!isPlaying || !currentTrackId || playRecordedRef.current) return;

        // 5 second threshold to count as a "stream"
        const timer = setTimeout(() => {
            if (isPlaying && currentTrackId && !playRecordedRef.current) {
                // Ensure we don't count uploads/previews if specified, but usually we count everything played here
                incrementTrackPlays(currentTrackId);
                playRecordedRef.current = true;
                // console.log("Stream recorded for:", currentTrackId);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [isPlaying, currentTrackId]);

    const handleTimeUpdate = () => {
        if (audioRef.current && !isScrubbing) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const handleScrubbingStart = () => {
        setIsScrubbing(true);
    };

    const handleScrubbingEnd = () => {
        setIsScrubbing(false);
    };

    const formatTime = (time: number) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    // --- Back Button Logic ---
    const handlePrevClick = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        // Critical requirement: If no track before it (hasPrev is false), 
        // OR if we are deep into the track (> 3s), restart.
        // The user specifically asked: "make the back button if pressed with no track before it, to take the current track back to the start."
        // We combine this with standard UX:
        if (audioRef.current && (audioRef.current.currentTime > 3 || !hasPrev)) {
            audioRef.current.currentTime = 0;
            setCurrentTime(0);
        } else if (onPrev) {
            onPrev();
        }
    };

    // Use producer avatar as requested for mobile
    const displayImage = currentProject?.producerAvatar || currentProject?.coverImage || MOCK_USER_PROFILE.avatar;

    // Reset image loaded state when track changes
    useEffect(() => {
        setImageLoaded(false);
    }, [displayImage]);

    if (!currentProject || !currentTrack) return null;

    return (
        <>
            <style>{`
@keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
}
.animate-marquee {
    animation: marquee 10s linear infinite;
    min-width: 200%;
}
`}</style>
            <audio
                ref={audioRef}
                crossOrigin="anonymous"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => {
                    if (repeatMode === 'one' && audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(console.error);
                    } else if (onNext) {
                        onNext();
                    } else {
                        togglePlay();
                    }
                }}
                onError={(e) => {
                    const error = e.currentTarget.error;
                    console.error("Audio Playback Error Details:", {
                        error,
                        src: e.currentTarget.src,
                        networkState: e.currentTarget.networkState,
                        currentSrc: e.currentTarget.currentSrc
                    });

                    // Show user-friendly error
                    if (error) {
                        let message = "Playback failed";
                        if (error.code === 4) message = "Audio file not found or format not supported";
                        else if (error.code === 3) message = "Playback decode error";
                        else if (error.code === 2) message = "Network error while loading audio";
                        else if (error.code === 1) message = "Playback aborted";

                        showToast(message, 'error');
                    }
                }}
            />

            {/* --- MOBILE EMBEDDED BOTTOM BAR --- */}
            <div
                className={`lg:hidden fixed left-0 right-0 bg-[#050505] border-t border-white/20 border-b-0 shadow-none transition-all duration-300 ${isMinimized
                    ? (currentView === 'notes' && !isSidebarOpen
                        ? 'bottom-[calc(max(8.5rem,var(--notes-toolkit-height,0vh))+env(safe-area-inset-bottom))] translate-y-0 z-[121]'
                        : 'bottom-[calc(50px+env(safe-area-inset-bottom))] translate-y-0 z-[119]')
                    : 'bottom-0 translate-y-full opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsMinimized(false)}
            >
                {/* Progress Bar (Scrubbable, Top) */}
                <div className="absolute top-0 left-0 w-full h-1 group">
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={currentTime}
                        onChange={handleSeek}
                        onMouseDown={handleScrubbingStart}
                        onMouseUp={handleScrubbingEnd}
                        onTouchStart={handleScrubbingStart}
                        onTouchEnd={handleScrubbingEnd}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="absolute inset-0 bg-white/5">
                        <div
                            className="h-full bg-primary relative"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full scale-0 group-hover:scale-100 transition-transform"></div>
                        </div>
                    </div>
                </div>

                <div className={`flex items-center justify-between px-4 h-14 box-content`}>
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {/* Producer Avatar (Circular) */}
                        <img
                            src={displayImage}
                            alt="Producer"
                            className="w-9 h-9 rounded-full border border-white/10 object-cover shrink-0"
                        />

                        <div className="flex flex-col min-w-0 justify-center">
                            <h4 className="text-sm font-bold text-white truncate leading-tight">{currentTrack.title}</h4>
                            <p className="text-[10px] text-neutral-400 truncate leading-tight opacity-70">{currentProject.producer}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 pl-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full active:scale-95 transition-transform"
                        >
                            {isPlaying ? <Pause fill="black" size={14} /> : <Play fill="black" size={14} className="ml-0.5" />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="text-neutral-500 hover:text-white p-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- IMMERSIVE MOBILE FULLSCREEN PLAYER --- */}
            <div className={`lg:hidden fixed inset-0 z-[130] bg-black flex flex-col transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) shadow-none overflow-hidden ${isMinimized ? 'translate-y-full opacity-0 invisible pointer-events-none' : 'translate-y-0 opacity-100 visible'}`}>

                {/* Background & Blur */}
                <div className="absolute inset-0 z-0">
                    <img src={displayImage} className="w-full h-full object-cover opacity-40 blur-3xl scale-125 saturate-50" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/95 to-black"></div>
                </div>

                {/* Header */}
                <div className="relative z-10 flex flex-col px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-0 shrink-0">
                    {/* Grabber Handle */}
                    <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2"></div>

                    <div className="flex justify-between items-center">
                        <button onClick={() => setIsMinimized(true)} className="text-white/80 p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors active:scale-95">
                            <ChevronDown size={28} />
                        </button>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">Now Playing</span>
                        <button onClick={onClose} className="text-white/80 p-2 -mr-2 hover:bg-white/10 rounded-full transition-colors active:scale-95">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="relative z-10 flex-1 flex flex-col px-6 pb-24 pt-2 overflow-hidden" onClick={(e) => e.stopPropagation()}>

                    {/* Artwork / Producer Avatar - SOLID Unified Order */}
                    <div className="w-full max-w-[200px] aspect-square mx-auto relative group shrink-0">
                        {/* Skeleton Loader */}
                        <div className={`absolute inset-0 bg-white/10 rounded-[1.5rem] animate-pulse ${imageLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}></div>

                        <div className={`w-full h-full rounded-[1.5rem] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 relative z-10 ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                            <img
                                src={displayImage}
                                alt="Producer"
                                className="w-full h-full object-cover"
                                onLoad={() => setImageLoaded(true)}
                            />
                            {/* Subtle Overlay for depth */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60"></div>
                        </div>
                    </div>

                    {/* Meta with Scrolling Title - Moved Up for Closer Proximity */}
                    <div className="w-full text-center space-y-1 mt-4 mb-2 shrink-0">
                        <div className="relative overflow-hidden h-7 w-64 mx-auto flex items-center justify-center">
                            {currentTrack.title.length > 25 ? (
                                <div className="flex animate-marquee whitespace-nowrap">
                                    <h2 className="text-base font-bold text-white tracking-tight mr-12">{currentTrack.title}</h2>
                                    <h2 className="text-base font-bold text-white tracking-tight mr-12">{currentTrack.title}</h2>
                                </div>
                            ) : (
                                <h2 className="text-base font-bold text-white tracking-tight truncate px-4">{currentTrack.title}</h2>
                            )}
                        </div>
                        <p className="text-xs text-primary font-mono tracking-widest uppercase opacity-90">{currentProject.producer}</p>
                    </div>

                    {/* Meta & Controls Wrapper - Grouped closer to top */}
                    <div className="flex flex-col mt-2">

                        {/* Visualizer */}
                        <div className="w-full mb-2 opacity-80">
                            <WaveformVisualizer isPlaying={isPlaying} />
                        </div>

                        {/* Unified Command Deck - Clean, Performant Scrubber */}
                        <div className="w-full space-y-4 px-2">
                            {/* Scrubber - Simplified for performance */}
                            <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                                <div className="relative h-6 flex items-center">
                                    <div className="absolute left-0 right-0 h-1 bg-white/10 rounded-full">
                                        <div
                                            className="h-full bg-white rounded-full"
                                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || 0}
                                        step="0.01"
                                        value={currentTime}
                                        onChange={handleSeek}
                                        onMouseDown={handleScrubbingStart}
                                        onMouseUp={handleScrubbingEnd}
                                        onTouchStart={handleScrubbingStart}
                                        onTouchEnd={handleScrubbingEnd}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    {/* Minimal thumb logic */}
                                    <div
                                        className="absolute w-3 h-3 bg-white rounded-full pointer-events-none"
                                        style={{ left: `${(currentTime / (duration || 1)) * 100}%`, transform: 'translateX(-50%)' }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] font-mono text-neutral-500 px-1">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration || currentTrack.duration || 0)}</span>
                                </div>
                            </div>

                            {/* Main Controls - Spaced & Centerea */}
                            <div className="flex items-center justify-between pt-4 pb-4 px-4" onClick={(e) => e.stopPropagation()}>
                                {/* Shuffle */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleShuffle?.(); }}
                                    className={`transition-colors active:scale-95 ${isShuffling ? 'text-primary' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    <Shuffle size={20} />
                                    {isShuffling && <div className="mx-auto w-1 h-1 bg-primary rounded-full mt-1"></div>}
                                </button>

                                {/* Center Cluster */}
                                <div className="flex items-center gap-6 sm:gap-8">
                                    <button onClick={handlePrevClick} className={`text-white hover:text-white/80 transition-colors active:scale-95 ${!hasPrev && currentTime < 3 ? 'opacity-50' : 'opacity-100'}`}>
                                        <SkipBack size={24} fill="currentColor" />
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                        className="w-14 h-14 flex items-center justify-center bg-white text-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {isPlaying ?
                                            <Pause fill="black" size={24} /> :
                                            <Play fill="black" size={24} className="ml-1" />
                                        }
                                    </button>

                                    <button onClick={onNext} className="text-white hover:text-white/80 transition-colors active:scale-95">
                                        <SkipForward size={24} fill="currentColor" />
                                    </button>
                                </div>

                                {/* Repeat */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleRepeat?.(); }}
                                    className={`transition-colors active:scale-95 relative ${repeatMode !== 'off' ? 'text-primary' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    <Repeat size={20} />
                                    {repeatMode === 'one' && (
                                        <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-primary text-black px-0.5 rounded-sm">1</span>
                                    )}
                                    {repeatMode !== 'off' && <div className="mx-auto w-1 h-1 bg-primary rounded-full mt-1"></div>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions Row - Pinned to bottom - moved up with mt-6 */}
                    <div className="relative z-10 flex justify-between items-center px-4 w-full pt-2 shrink-0 mt-6 pb-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-6">
                            <button className="text-neutral-400 hover:text-white transition-colors active:scale-95">
                                <Share2 size={22} />
                            </button>
                        </div>

                        <div className="flex items-center gap-6">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMinimized(true);
                                    const audioUrl = currentTrack.files?.mp3 || currentTrack.files?.wav || currentTrack.files?.main;
                                    navigate('/notes', {
                                        state: {
                                            createNewNote: true,
                                            trackTitle: currentTrack.title,
                                            trackId: currentTrack.id,
                                            fileName: `${currentTrack.title}.mp3`,
                                            trackUrl: audioUrl,
                                            producerName: currentProject.producer,
                                            producerAvatar: currentProject.producerAvatar
                                        }
                                    });
                                }}
                                className="text-neutral-400 hover:text-white transition-colors active:scale-95"
                            >
                                <StickyNote size={22} />
                            </button>
                            <button
                                onClick={() => setShowQueue(!showQueue)}
                                className={`transition-colors active:scale-95 ${showQueue ? 'text-primary' : 'text-neutral-400 hover:text-white'}`}
                            >
                                <ListMusic size={22} />
                            </button>
                            <button
                                onClick={async () => {
                                    if (!currentProject?.id) return;
                                    try {
                                        if (currentProject.id === 'upload_browser_proj') {
                                            // Handle converting local upload to saved project
                                            if (currentTrack?.id) {
                                                if (isSaved) {
                                                    const savedProjectId = await getSavedProjectIdForAsset(currentTrack.id);
                                                    if (savedProjectId) {
                                                        await unsaveProject(savedProjectId);
                                                        setIsSaved(false);
                                                    }
                                                } else {
                                                    await convertAssetToProject(
                                                        currentTrack.id,
                                                        currentTrack.title,
                                                        { username: currentProject.producer, avatar: currentProject.producerAvatar }
                                                    );
                                                    setIsSaved(true);
                                                }
                                            }
                                        } else {
                                            if (isSaved) {
                                                await unsaveProject(currentProject.id);
                                                setIsSaved(false);
                                            } else {
                                                await saveProject(currentProject.id);
                                                setIsSaved(true);
                                            }
                                        }
                                    } catch (error) {
                                        console.error('Failed to toggle save:', error);
                                    }
                                }}
                                className={`transition-all duration-300 active:scale-75 ${isSaved ? 'text-primary' : 'text-neutral-400 hover:text-white'}`}
                            >
                                <BookmarkPlus size={22} fill={isSaved ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- BOTTOM NAVIGATION BAR IN FULLSCREEN --- */}
                <div onClick={(e) => {
                    // Prevent closing player when clicking nav
                    e.stopPropagation();
                    // Minimize player when navigating
                    setIsMinimized(true);
                }}>
                    <BottomNav currentView={currentView || 'home'} onNavigate={onNavigate} />
                </div>

                {/* --- QUEUE OVERLAY --- */}
                <div
                    className={`absolute inset-0 z-[140] bg-black/95 backdrop-blur-2xl transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${showQueue ? 'translate-y-0' : 'translate-y-full'}`}
                >
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center px-6 py-6 border-b border-white/5">
                            <h3 className="text-lg font-bold text-white">Next Up</h3>
                            <button onClick={() => setShowQueue(false)} className="text-white/60 p-1">
                                <ChevronDown size={28} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                            {/* Current Playing */}
                            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/10">
                                <img src={displayImage} className="w-12 h-12 rounded-lg object-cover" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-primary truncate">{currentTrack.title}</h4>
                                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider">{currentProject.producer}</p>
                                </div>
                                <div className="text-primary"><Pause size={16} fill="currentColor" /></div>
                            </div>

                            {/* Rest of the tracks in project (Simulated Queue) */}
                            {currentProject.tracks.filter(t => t.id !== currentTrackId).map((track, idx) => (
                                <div key={track.id || `queue-${idx}`} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-colors group">
                                    <img src={displayImage} className="w-12 h-12 rounded-lg object-cover opacity-60" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{currentProject.producer}</p>
                                    </div>
                                    <button
                                        onClick={() => togglePlay()}
                                        className="text-neutral-600 group-hover:text-white transition-colors"
                                    >
                                        <Play size={16} fill="currentColor" />
                                    </button>
                                </div>
                            ))}

                            {currentProject.tracks.length <= 1 && (
                                <div className="py-20 text-center space-y-2">
                                    <p className="text-neutral-500 text-sm italic">Queue is empty</p>
                                    <p className="text-[10px] text-neutral-600">Add some fire to your session</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/5">
                            <button className="w-full py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                                <PlusCircle size={20} />
                                Add More Tracks
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- DESKTOP FLOATING CARD --- */}
            {/* --- DESKTOP FLOATING CARD --- */}
            <div className={`
                hidden lg:flex fixed bottom-6 right-6 z-[100] w-[400px]
transition-all duration-500 transform cubic-bezier(0.2, 0.8, 0.2, 1) 
                ${isExpanded ? 'translate-y-24 opacity-0 pointer-events-none' : (isMinimized ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none')}
`}>
                <div className="w-full bg-[#050505] border border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col gap-4 relative overflow-hidden group">

                    {/* Top Row: Art & Track */}
                    <div className="flex items-center gap-4 relative z-10">
                        {/* Artwork with playing indicator */}
                        <div className="h-12 w-12 rounded-lg bg-neutral-900 border border-white/5 overflow-hidden shrink-0 relative group/image shadow-md">
                            <img src={currentProject.producerAvatar || currentProject.coverImage || MOCK_USER_PROFILE.avatar} className="w-full h-full object-cover" />
                            {isPlaying && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                                    <div className="w-0.5 h-2.5 bg-white/90 rounded-full animate-[bounce_1s_infinite]"></div>
                                    <div className="w-0.5 h-3.5 bg-white/90 rounded-full animate-[bounce_1.2s_infinite]"></div>
                                    <div className="w-0.5 h-2 bg-white/90 rounded-full animate-[bounce_0.8s_infinite]"></div>
                                </div>
                            )}
                        </div>

                        {/* Track Info */}
                        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white truncate leading-tight tracking-tight">{currentTrack.title}</h4>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={onExpandToggle}
                                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all hover:scale-105"
                                        title="Expand Player"
                                    >
                                        <Maximize2 size={12} />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!currentProject?.id) return;
                                            try {
                                                if (currentProject.id === 'upload_browser_proj') {
                                                    if (currentTrack?.id) {
                                                        if (isSaved) {
                                                            const savedProjectId = await getSavedProjectIdForAsset(currentTrack.id);
                                                            if (savedProjectId) { await unsaveProject(savedProjectId); setIsSaved(false); }
                                                        } else {
                                                            await convertAssetToProject(currentTrack.id, currentTrack.title, { username: currentProject.producer, avatar: currentProject.producerAvatar });
                                                            setIsSaved(true);
                                                        }
                                                    }
                                                } else {
                                                    if (isSaved) { await unsaveProject(currentProject.id); setIsSaved(false); }
                                                    else { await saveProject(currentProject.id); setIsSaved(true); }
                                                }
                                            } catch (error) { console.error('Failed to toggle save:', error); }
                                        }}
                                        className={`text-neutral-500 hover:text-white transition-colors ${isSaved ? 'text-primary' : ''}`}
                                    >
                                        <BookmarkPlus size={14} fill={isSaved ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <p className="text-[11px] text-neutral-400 font-medium truncate group-hover:text-neutral-300 transition-colors">{currentProject.producer}</p>
                                {currentProject.bpm && (
                                    <>
                                        <span className="text-[10px] text-neutral-600">•</span>
                                        <span className="text-[10px] text-neutral-500 font-mono bg-white/5 px-1 py-0.5 rounded border border-white/5 leading-none">{currentProject.bpm} BPM</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Scrubber - Clean & Functional */}
                    <div className="space-y-1.5 relative z-10">
                        <div className="relative h-1 w-full flex items-center cursor-pointer py-2 group/scrubber">
                            {/* Transparent Scrubber Input */}
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                step="0.1"
                                value={currentTime}
                                onChange={handleSeek}
                                onMouseDown={handleScrubbingStart}
                                onMouseUp={handleScrubbingEnd}
                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                            />

                            {/* Visual Track */}
                            <div className="absolute left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden transition-all duration-200 group-hover/scrubber:h-1.5 pointer-events-none">
                                <div className="h-full bg-neutral-200 rounded-full group-hover/scrubber:bg-primary transition-colors relative" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover/scrubber:opacity-100 transition-opacity duration-200"></div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between px-0.5">
                            <span className="text-[10px] font-mono font-medium text-neutral-500 select-none">{formatTime(currentTime)}</span>
                            <span className="text-[10px] font-mono font-medium text-neutral-500 select-none">{formatTime(duration || currentTrack.duration || 0)}</span>
                        </div>
                    </div>

                    {/* Bottom Controls - Dashboard Style (Flexbox) */}
                    <div className="flex items-center justify-between pt-1 relative z-10">
                        {/* Volume */}
                        <div className="flex items-center gap-2 group/vol w-24">
                            <button
                                onClick={() => { if (audioRef.current) audioRef.current.muted = !audioRef.current.muted; }}
                                className="text-neutral-500 hover:text-white transition-colors"
                            >
                                <Volume2 size={14} />
                            </button>
                            <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden cursor-pointer relative group/slider">
                                <input
                                    type="range" min="0" max="1" step="0.05" defaultValue="1"
                                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                    onChange={(e) => { if (audioRef.current) audioRef.current.volume = parseFloat(e.target.value); }}
                                />
                                <div className="h-full w-[80%] bg-neutral-500 group-hover/slider:bg-white transition-colors"></div>
                            </div>
                        </div>

                        {/* Transport - Centered in Flex */}
                        <div className="flex items-center gap-5">
                            <button onClick={handlePrevClick} className="text-neutral-500 hover:text-white transition-colors active:scale-95"><SkipBack size={18} fill="currentColor" /></button>
                            <button
                                onClick={togglePlay}
                                className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-colors shadow-lg active:scale-95"
                            >
                                {isPlaying ? <Pause fill="black" size={16} /> : <Play fill="black" size={16} className="ml-0.5" />}
                            </button>
                            <button onClick={onNext} className="text-neutral-500 hover:text-white transition-colors active:scale-95"><SkipForward size={18} fill="currentColor" /></button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 justify-end w-24">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const audioUrl = currentTrack.files?.mp3 || currentTrack.files?.wav || currentTrack.files?.main;
                                    onNavigate('notes');
                                    navigate('/notes', { state: { createNewNote: true, trackTitle: currentTrack.title, trackId: currentTrack.id, fileName: `${currentTrack.title}.mp3`, trackUrl: audioUrl, producerName: currentProject.producer, producerAvatar: currentProject.producerAvatar } });
                                }}
                                className="p-2 text-neutral-500 hover:text-white transition-colors active:scale-90 hover:bg-white/5 rounded-lg"
                            >
                                <StickyNote size={16} />
                            </button>
                            <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white transition-colors active:scale-90 hover:bg-white/5 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            {/* --- DESKTOP BOTTOM BAR (EXPANDED) --- */}
            <div className={`
                hidden lg:flex fixed bottom-0 lg:left-[260px] right-0 z-[200] h-[90px] bg-[#0a0a0a]
border-t border-white/5 px-8 items-center justify-between
transition-all duration-500 cubic-bezier(0.2, 0.8, 0.2, 1) shadow-[0_-4px_20px_rgba(0,0,0,0.2)]
                ${isExpanded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}
`}>

                {/* Top Scrubber */}
                <div className="absolute top-0 left-0 right-0 h-[2px] hover:h-1 transition-all group/scrubber cursor-pointer z-20">
                    {/* Hit Area */}
                    <div className="absolute -top-3 bottom-0 left-0 right-0"></div>

                    {/* Transparent Range Input */}
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={currentTime}
                        onChange={handleSeek}
                        onMouseDown={handleScrubbingStart}
                        onMouseUp={handleScrubbingEnd}
                        className="absolute inset-x-0 -top-2 h-4 opacity-0 z-30 cursor-pointer"
                    />

                    {/* Visual Bar */}
                    <div className="absolute inset-0 bg-white/10 pointer-events-none">
                        <div className="h-full bg-primary relative transition-all" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/scrubber:opacity-100 transition-opacity shadow-sm scale-0 group-hover/scrubber:scale-100 duration-200"></div>
                        </div>
                    </div>
                </div>

                {/* Left: Track Info */}
                <div className="flex items-center gap-3 w-1/4 min-w-0">
                    <div className="h-10 w-10 rounded bg-neutral-900 border border-white/5 overflow-hidden shrink-0 relative group">
                        <img src={currentProject.producerAvatar || currentProject.coverImage || MOCK_USER_PROFILE.avatar} className="w-full h-full object-cover" />
                        {/* Mini Overlay Toggle */}
                        {/* Mini Overlay Toggle */}
                        <button
                            onClick={onExpandToggle}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Minimize2 size={18} className="text-white" />
                        </button>
                    </div>
                    <div className="flex flex-col min-w-0 justify-center gap-1">
                        <h4 className="text-sm font-bold text-white truncate leading-tight">{currentTrack.title}</h4>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer truncate">{currentProject.producer}</p>
                            <button
                                onClick={async () => {
                                    if (!currentProject?.id) return;
                                    try {
                                        if (currentProject.id === 'upload_browser_proj') {
                                            if (currentTrack?.id) {
                                                if (isSaved) {
                                                    const savedProjectId = await getSavedProjectIdForAsset(currentTrack.id);
                                                    if (savedProjectId) { await unsaveProject(savedProjectId); setIsSaved(false); }
                                                } else {
                                                    await convertAssetToProject(currentTrack.id, currentTrack.title, { username: currentProject.producer, avatar: currentProject.producerAvatar });
                                                    setIsSaved(true);
                                                }
                                            }
                                        } else {
                                            if (isSaved) { await unsaveProject(currentProject.id); setIsSaved(false); }
                                            else { await saveProject(currentProject.id); setIsSaved(true); }
                                        }
                                    } catch (error) { console.error('Failed to toggle save:', error); }
                                }}
                                className={`text-neutral-500 hover:text-white transition-colors ${isSaved ? 'text-primary' : ''}`}
                            >
                                <BookmarkPlus size={12} fill={isSaved ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Center: Controls */}
                <div className="flex items-center justify-center gap-6 w-2/4">
                    <span className="text-[10px] font-mono text-neutral-600 w-10 text-right tabular-nums">{formatTime(currentTime)}</span>

                    <div className="flex items-center gap-6">
                        {/* Shuffle */}
                        <button
                            onClick={onToggleShuffle}
                            className={`transition-colors active:scale-95 ${isShuffling ? 'text-primary' : 'text-neutral-600 hover:text-white'}`}
                            title="Shuffle"
                        >
                            <Shuffle size={18} />
                        </button>

                        <button onClick={handlePrevClick} className="text-neutral-300 hover:text-white transition-colors active:scale-95">
                            <SkipBack size={24} fill="currentColor" />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full shadow-[0_4px_12px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all"
                        >
                            {isPlaying ? <Pause fill="black" size={20} /> : <Play fill="black" size={20} className="ml-0.5" />}
                        </button>

                        <button onClick={onNext} className="text-neutral-300 hover:text-white transition-colors active:scale-95">
                            <SkipForward size={24} fill="currentColor" />
                        </button>

                        {/* Repeat */}
                        <button
                            onClick={onToggleRepeat}
                            className={`transition-colors active:scale-95 relative ${repeatMode !== 'off' ? 'text-primary' : 'text-neutral-600 hover:text-white'}`}
                            title="Repeat"
                        >
                            <Repeat size={18} />
                            {repeatMode === 'one' && (
                                <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-primary text-black px-0.5 rounded-sm">1</span>
                            )}
                        </button>
                    </div>

                    <span className="text-[10px] font-mono text-neutral-600 w-10 text-left tabular-nums">{formatTime(duration || currentTrack.duration || 0)}</span>
                </div>


                {/* Right: Actions */}
                <div className="flex items-center justify-end gap-3 w-1/4">
                    {/* Volume */}
                    <div className="flex items-center gap-3 group/vol mr-4">
                        <button
                            onClick={() => { if (audioRef.current) audioRef.current.muted = !audioRef.current.muted; }}
                            className="text-neutral-500 hover:text-white transition-colors"
                        >
                            <Volume2 size={20} />
                        </button>
                        <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer relative group/slider">
                            <input
                                type="range" min="0" max="1" step="0.05" defaultValue="1"
                                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                onChange={(e) => { if (audioRef.current) audioRef.current.volume = parseFloat(e.target.value); }}
                            />
                            <div className="h-full w-[80%] bg-neutral-500 group-hover/slider:bg-white transition-colors"></div>
                        </div>
                    </div>

                    <div className="h-6 w-[1px] bg-white/10 mx-2"></div>

                    <button className="text-neutral-500 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-colors"><ListMusic size={20} /></button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            const audioUrl = currentTrack.files?.mp3 || currentTrack.files?.wav || currentTrack.files?.main;
                            onNavigate('notes');
                            navigate('/notes', { state: { createNewNote: true, trackTitle: currentTrack.title, trackId: currentTrack.id, fileName: `${currentTrack.title}.mp3`, trackUrl: audioUrl, producerName: currentProject.producer, producerAvatar: currentProject.producerAvatar } });
                        }}
                        className="text-neutral-500 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <StickyNote size={20} />
                    </button>
                    <button onClick={onExpandToggle} className="text-neutral-500 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-colors" title="Collapse">
                        <Minimize2 size={20} />
                    </button>
                    <button onClick={onClose} className="text-neutral-500 hover:text-red-500 p-1.5 hover:bg-white/5 rounded transition-colors ml-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

            </div>
        </>
    );
};

export default MusicPlayer;