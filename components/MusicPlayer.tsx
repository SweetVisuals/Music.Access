import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Maximize2, ListMusic, Minimize2, ChevronUp, Move, Heart, Share2, MoreHorizontal, ChevronDown, StickyNote, PlusCircle, BookmarkPlus } from 'lucide-react';
import { Project, View } from '../types';
import { MOCK_USER_PROFILE } from '../constants';

interface MusicPlayerProps {
    currentProject: Project | null;
    currentTrackId: string | null;
    isPlaying: boolean;
    togglePlay: () => void;
    currentView?: View;
    onClose: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ currentProject, currentTrackId, isPlaying, togglePlay, currentView, onClose }) => {
    const [isMinimized, setIsMinimized] = useState(true);

    // --- Audio Logic ---
    const currentTrack = useMemo(() => {
        if (!currentProject || !currentTrackId) return null;
        return currentProject.tracks.find(t => t.id === currentTrackId);
    }, [currentProject, currentTrackId]);

    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (!audioRef.current || !currentTrack) return;
        const url = currentTrack.files?.mp3 || '';
        if (url && audioRef.current.src !== url) {
            audioRef.current.src = url;
            audioRef.current.load();
        }
        if (isPlaying) audioRef.current.play().catch(console.error);
        else audioRef.current.pause();
    }, [currentTrack, isPlaying]);

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

    if (!currentProject || !currentTrack) return null;

    // Use producer avatar as requested for mobile
    const displayImage = currentProject.producerAvatar || currentProject.coverImage || MOCK_USER_PROFILE.avatar;

    // Reset image loaded state when track changes
    useEffect(() => {
        setImageLoaded(false);
    }, [displayImage]);

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
                onEnded={() => togglePlay()}
                onError={(e) => {
                    console.error("Audio Playback Error Details:", {
                        error: e.currentTarget.error,
                        src: e.currentTarget.src,
                        networkState: e.currentTarget.networkState,
                        currentSrc: e.currentTarget.currentSrc
                    });
                }}
            />

            {/* --- MOBILE EMBEDDED BOTTOM BAR --- */}
            <div
                className={`lg:hidden fixed left-0 right-0 z-40 bg-[#050505] border-t border-white/20 shadow-[0_-4px_20px_rgba(0,0,0,0.8)] transition-all duration-300 ${isMinimized
                    ? (currentView === 'notes'
                        ? 'bottom-[calc(8.5rem+env(safe-area-inset-bottom)-1px)] translate-y-0 border-b-0'
                        : 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] translate-y-0')
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
                            className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)] relative"
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
                            className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full shadow-lg active:scale-95 transition-transform"
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
            <div className={`lg:hidden fixed inset-0 z-[100] bg-black flex flex-col transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isMinimized ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>

                {/* Background & Blur */}
                <div className="absolute inset-0 z-0">
                    <img src={displayImage} className="w-full h-full object-cover opacity-40 blur-3xl scale-125 saturate-50" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/95 to-black"></div>
                </div>

                {/* Header */}
                <div className="relative z-10 flex flex-col px-6 pt-2 pb-2">
                    {/* Grabber Handle */}
                    <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 mt-2"></div>

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
                <div className="relative z-10 flex-1 flex flex-col px-8 justify-evenly pb-8" onClick={(e) => e.stopPropagation()}>

                    {/* Artwork / Producer Avatar - SOLID Unified Order */}
                    <div className="w-full max-w-[320px] aspect-square mx-auto mt-8 relative group">
                        {/* Skeleton Loader */}
                        <div className={`absolute inset-0 bg-white/10 rounded-[2rem] animate-pulse ${imageLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}></div>

                        <div className={`w-full h-full rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative z-10 ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
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

                    {/* Meta & Controls Wrapper - Seamless, no internal delays */}
                    <div className="flex flex-col justify-between mt-8 flex-1">

                        {/* Meta with Scrolling Title */}
                        <div className="w-full text-center space-y-1 mb-8">
                            <div className="relative overflow-hidden h-8 w-64 mx-auto flex items-center justify-center">
                                {/* Only animate if title is long enough? For now, simpler to center or static-scroll if overly long. 
                                    Let's use a simpler approach: Just center, if too long, truncate. 
                                    The user specifically asked for "scroll if too long". 
                                    Implementing a conditional marquee is non-trivial without measuring. 
                                    We will apply marquee if string length is > 25 chars for a rough heuristic. 
                                */}
                                {currentTrack.title.length > 25 ? (
                                    <div className="flex animate-marquee whitespace-nowrap">
                                        <h2 className="text-lg font-bold text-white tracking-tight mr-12">{currentTrack.title}</h2>
                                        <h2 className="text-lg font-bold text-white tracking-tight mr-12">{currentTrack.title}</h2>
                                    </div>
                                ) : (
                                    <h2 className="text-lg font-bold text-white tracking-tight truncate px-4">{currentTrack.title}</h2>
                                )}
                            </div>
                            <p className="text-sm text-primary font-mono tracking-widest uppercase opacity-90">{currentProject.producer}</p>
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
                                <button className="text-neutral-500 hover:text-white transition-colors active:scale-95">
                                    <Shuffle size={20} />
                                </button>

                                {/* Center Cluster */}
                                <div className="flex items-center gap-8">
                                    <button className="text-white hover:text-white/80 transition-colors active:scale-95">
                                        <SkipBack size={32} fill="currentColor" />
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                        className="w-20 h-20 flex items-center justify-center bg-white text-black rounded-full shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {isPlaying ?
                                            <Pause fill="black" size={32} /> :
                                            <Play fill="black" size={32} className="ml-1" />
                                        }
                                    </button>

                                    <button className="text-white hover:text-white/80 transition-colors active:scale-95">
                                        <SkipForward size={32} fill="currentColor" />
                                    </button>
                                </div>

                                {/* Repeat */}
                                <button className="text-neutral-500 hover:text-white transition-colors active:scale-95">
                                    <Repeat size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="relative z-10 flex justify-between items-center px-4 pb-12 w-full pt-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-6">
                            <button className="text-neutral-400 hover:text-white transition-colors active:scale-95">
                                <Share2 size={22} />
                            </button>
                            <button
                                onClick={() => setIsLiked(!isLiked)}
                                className={`transition-colors active:scale-95 ${isLiked ? 'text-red-500' : 'text-neutral-400 hover:text-white'}`}
                            >
                                <Heart size={22} fill={isLiked ? "currentColor" : "none"} />
                            </button>
                        </div>

                        <div className="flex items-center gap-6">
                            <button className="text-neutral-400 hover:text-white transition-colors active:scale-95">
                                <StickyNote size={22} />
                            </button>
                            <button
                                onClick={() => setShowQueue(!showQueue)}
                                className={`transition-colors active:scale-95 ${showQueue ? 'text-primary' : 'text-neutral-400 hover:text-white'}`}
                            >
                                <ListMusic size={22} />
                            </button>
                            <button
                                onClick={() => setIsSaved(!isSaved)}
                                className={`transition-colors active:scale-95 ${isSaved ? 'text-primary' : 'text-neutral-400 hover:text-white'}`}
                            >
                                <BookmarkPlus size={22} fill={isSaved ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- QUEUE OVERLAY --- */}
                <div
                    className={`absolute inset-0 z-[110] bg-black/95 backdrop-blur-2xl transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${showQueue ? 'translate-y-0' : 'translate-y-full'}`}
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
                            {currentProject.tracks.filter(t => t.id !== currentTrackId).map(track => (
                                <div key={track.id} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-colors group">
                                    <img src={displayImage} className="w-12 h-12 rounded-lg object-cover opacity-60" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{currentProject.producer}</p>
                                    </div>
                                    <button className="text-neutral-600 group-hover:text-white transition-colors">
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


            {/* --- DESKTOP BOTTOM BAR --- */}
            <div className={`hidden lg:block fixed bottom-0 left-64 right-0 z-50 transition-transform duration-500 ${isMinimized ? 'translate-y-0' : 'translate-y-0'}`}>
                <div className="bg-[#050505]/95 border-t border-white/5 backdrop-blur-xl p-4 flex items-center justify-between h-24">

                    {/* Track Info */}
                    <div className="flex items-center w-1/4 min-w-[200px] gap-4">
                        <div className="h-14 w-14 rounded-lg overflow-hidden relative group cursor-pointer shadow-lg border border-white/10" onClick={() => { setIsMinimized(false) /* Should open expanded? Or separate desktop expand? Left as is for now */ }}>
                            <img src={currentProject.coverImage || MOCK_USER_PROFILE.avatar} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate mb-0.5">{currentTrack.title}</h4>
                            <p className="text-xs text-neutral-500 truncate hover:text-primary cursor-pointer transition-colors">{currentProject.producer}</p>
                        </div>
                        <button className="text-neutral-600 hover:text-primary transition-colors"><Heart size={16} /></button>
                    </div>

                    {/* Main Controls */}
                    <div className="flex-1 flex flex-col items-center max-w-xl px-8">
                        <div className="flex items-center gap-6 mb-2">
                            <button className="text-neutral-500 hover:text-white transition-colors text-[10px]"><Shuffle size={14} /></button>
                            <button className="text-neutral-300 hover:text-white transition-colors"><SkipBack fill="currentColor" size={18} /></button>
                            <button
                                onClick={togglePlay}
                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 hover:bg-primary transition-all shadow-lg"
                            >
                                {isPlaying ? <Pause fill="black" size={16} /> : <Play fill="black" size={16} className="ml-0.5" />}
                            </button>
                            <button className="text-neutral-300 hover:text-white transition-colors"><SkipForward fill="currentColor" size={18} /></button>
                            <button className="text-neutral-500 hover:text-white transition-colors text-[10px]"><Repeat size={14} /></button>
                        </div>

                        {/* Scrubber */}
                        <div className="w-full flex items-center gap-3 text-[10px] font-mono font-medium text-neutral-500">
                            <span className="w-8 text-right">{formatTime(currentTime)}</span>
                            <div
                                className="flex-1 h-1 bg-white/10 rounded-full relative group cursor-pointer overflow-hidden"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const pct = (e.clientX - rect.left) / rect.width;
                                    if (audioRef.current) audioRef.current.currentTime = pct * (audioRef.current.duration || 1);
                                }}
                            >
                                <div className="absolute top-0 left-0 h-full bg-primary/80 group-hover:bg-primary transition-all" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                            </div>
                            <span className="w-8">{formatTime(duration || currentTrack.duration || 0)}</span>
                        </div>
                    </div>

                    {/* Volume & Aux */}
                    <div className="w-1/4 flex items-center justify-end gap-4 min-w-[200px]">
                        <button className="text-neutral-500 hover:text-white transition-colors p-2"><ListMusic size={18} /></button>
                        <div className="flex items-center gap-2 group w-24">
                            <Volume2 size={18} className="text-neutral-500 group-hover:text-white transition-colors" />
                            <div className="flex-1 h-1 bg-white/10 rounded-full relative cursor-pointer overflow-hidden">
                                <div className="absolute top-0 left-0 h-full w-2/3 bg-neutral-500 group-hover:bg-primary transition-colors"></div>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
};

export default MusicPlayer;