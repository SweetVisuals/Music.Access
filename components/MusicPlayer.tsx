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

    return (
        <>
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

                    {/* Artwork / Producer Avatar */}
                    {/* AVANT-GARDE: Square with rounded corners */}
                    <div className={`w-full max-w-[320px] aspect-square mx-auto rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative group mt-4 transform transition-all duration-1000 cubic-bezier(0.32, 0.72, 0, 1) ${isMinimized ? 'scale-90 opacity-0' : 'scale-100 opacity-100'}`}>
                        <img
                            src={displayImage}
                            alt="Producer"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Subtle Overlay for depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60"></div>
                    </div>

                    {/* Meta & Controls Wrapper */}
                    <div className={`space-y-10 mt-2 transition-all duration-700 delay-150 ${isMinimized ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`}>
                        {/* Meta */}
                        <div className="w-full text-center space-y-2">
                            <h2 className="text-xl font-bold text-white leading-tight line-clamp-2 tracking-tight">{currentTrack.title}</h2>
                            <p className="text-xs text-primary font-mono tracking-widest uppercase opacity-90">{currentProject.producer}</p>
                        </div>

                        {/* Unified Command Deck */}
                        <div className="w-full space-y-6">
                            {/* Scrubber */}
                            <div className="space-y-3 group px-2" onClick={(e) => e.stopPropagation()}>
                                <div className="h-1.5 w-full bg-white/10 rounded-full relative overflow-visible">
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
                                    />
                                    <div
                                        className="h-full bg-white relative shadow-[0_0_15px_rgba(255,255,255,0.3)] rounded-full transition-all duration-150"
                                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                    >
                                        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-xl scale-0 group-hover:scale-100 transition-transform duration-300"></div>
                                    </div>
                                </div>
                                <div className="flex justify-between text-[11px] font-mono font-bold text-neutral-400">
                                    <span className="opacity-60">{formatTime(currentTime)}</span>
                                    <span className="opacity-60">{formatTime(duration || currentTrack.duration || 0)}</span>
                                </div>
                            </div>

                            {/* Control Deck - Glassmorphism Pill */}
                            <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl rounded-[2rem] p-2 border border-white/5 shadow-2xl mx-2" onClick={(e) => e.stopPropagation()}>
                                {/* Shuffle */}
                                <button className="w-12 h-12 flex items-center justify-center text-neutral-500 hover:text-white transition-colors active:scale-95">
                                    <Shuffle size={18} />
                                </button>

                                {/* Center Controls */}
                                <div className="flex items-center gap-4">
                                    <button className="text-white hover:text-primary transition-colors active:scale-90 p-2">
                                        <SkipBack size={28} fill="currentColor" />
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                        className="w-16 h-16 flex items-center justify-center bg-white text-black rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {isPlaying ?
                                            <Pause fill="black" size={24} /> :
                                            <Play fill="black" size={24} className="ml-1" />
                                        }
                                    </button>

                                    <button className="text-white hover:text-primary transition-colors active:scale-90 p-2">
                                        <SkipForward size={28} fill="currentColor" />
                                    </button>
                                </div>

                                {/* Repeat */}
                                <button className="w-12 h-12 flex items-center justify-center text-neutral-500 hover:text-white transition-colors active:scale-95">
                                    <Repeat size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="relative z-10 flex justify-between items-center px-4 pb-12 w-full pt-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-6">
                            <button className="text-neutral-400 hover:text-white transition-colors active:scale-95"><Share2 size={22} /></button>
                            <button className="text-neutral-400 hover:text-white transition-colors active:scale-95"><Heart size={22} /></button>
                        </div>

                        <div className="flex items-center gap-6">
                            <button className="text-neutral-400 hover:text-white transition-colors active:scale-95"><StickyNote size={22} /></button>
                            <button
                                onClick={() => setShowQueue(!showQueue)}
                                className={`transition-colors active:scale-95 ${showQueue ? 'text-primary' : 'text-neutral-400 hover:text-white'}`}
                            >
                                <ListMusic size={22} />
                            </button>
                            <button className="text-neutral-400 hover:text-white transition-colors active:scale-95"><BookmarkPlus size={22} /></button>
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