import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Maximize2, ListMusic, Minimize2, ChevronUp, Move, Heart, Share2, MoreHorizontal, ChevronDown } from 'lucide-react';
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
        if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) setDuration(audioRef.current.duration);
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
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => togglePlay()}
            />

            {/* --- MOBILE EMBEDDED BOTTOM BAR --- */}
            {/* 
                "Integrated seamlessly": Fixed at bottom.
                Z-index: 40 (Below Sidebar & AuthModal z-50, but above content).
                Background: Glassmorphism / Solid Black to blend with footer.
            */}
            <div
                className={`lg:hidden fixed left-0 right-0 z-40 bg-[#050505] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${isMinimized ? (currentView === 'notes' ? 'bottom-24 translate-y-0' : 'bottom-0 translate-y-0') : 'bottom-0 translate-y-full'}`}
                onClick={() => setIsMinimized(false)}
            >
                {/* Progress Bar (Thin, Top) */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5">
                    <div
                        className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    ></div>
                </div>

                <div className="flex items-center justify-between p-3 pb-[env(safe-area-inset-bottom)] h-[4.5rem] box-content">
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {/* Producer Avatar (Circular) */}
                        <img
                            src={displayImage}
                            alt="Producer"
                            className="w-10 h-10 rounded-full border border-white/10 object-cover shrink-0"
                        />

                        <div className="flex flex-col min-w-0 justify-center">
                            <h4 className="text-sm font-bold text-white truncate leading-tight">{currentTrack.title}</h4>
                            <p className="text-[10px] text-neutral-400 truncate leading-tight mt-0.5">{currentProject.producer}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pl-3">
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                            className="text-neutral-500 hover:text-white p-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full shadow-lg"
                        >
                            {isPlaying ? <Pause fill="black" size={18} /> : <Play fill="black" size={18} className="ml-0.5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- IMMERSIVE MOBILE FULLSCREEN PLAYER --- */}
            <div className={`lg:hidden fixed inset-0 z-[100] bg-black flex flex-col transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${isMinimized ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>

                {/* Background & Blur */}
                <div className="absolute inset-0 z-0">
                    <img src={displayImage} className="w-full h-full object-cover opacity-30 blur-3xl scale-125" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black"></div>
                </div>

                {/* Header */}
                <div className="relative z-10 flex justify-between items-center p-6 mt-safe">
                    <button onClick={() => setIsMinimized(true)} className="text-white/80 p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ChevronDown size={28} />
                    </button>
                    <span className="text-xs font-bold tracking-[0.2em] text-white/50 uppercase">Now Playing</span>
                    <button onClick={onClose} className="text-white/80 p-2 hover:bg-white/10 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Main Content */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 space-y-10">
                    {/* Avatar (Large, Circular/Rounded for "User" focus) */}
                    {/* User requested "profile picture". Large circle is standard for profile focus. */}
                    <div className="w-64 h-64 rounded-full border-4 border-white/5 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden relative group">
                        <img
                            src={displayImage}
                            className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${isPlaying ? 'rotate-[360deg]' : ''}`} // Subtle rotation? Or keep static? Let's keep existing vinyl spin if playing? Or just static since it's a person? User said "integrated... fits perfectly". Spinning people is weird. Static image.
                            style={{ animation: isPlaying ? 'spin 12s linear infinite' : 'none' }}
                        />
                        {/* Removing spin for avatar usually, but if "vinyl" style requested before... Let's keeping it static for "Avant-Garde" clean look if it's a person. */}
                        {/* Actually, user said "Rather than... circular popup... embed it". 
                            The Expanded view was already redesigned. I'll make it static to be safe, spinning profile pics is odd.
                         */}
                        <img
                            src={displayImage}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>

                    {/* Meta */}
                    <div className="w-full text-center space-y-2">
                        <h2 className="text-2xl font-black text-white leading-tight line-clamp-2">{currentTrack.title}</h2>
                        <p className="text-lg text-primary/80 font-medium">{currentProject.producer}</p>
                    </div>

                    {/* Progress */}
                    <div className="w-full space-y-3">
                        <div
                            className="h-2 bg-white/10 rounded-full relative overflow-hidden group cursor-pointer"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pct = (e.clientX - rect.left) / rect.width;
                                if (audioRef.current) audioRef.current.currentTime = pct * (audioRef.current.duration || 1);
                            }}
                        >
                            <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs font-mono text-neutral-500 font-bold">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration || currentTrack.duration || 0)}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between w-full max-w-[80%]">
                        <button className="text-neutral-400 hover:text-white transition-colors"><Shuffle size={20} /></button>
                        <button className="text-white hover:scale-110 transition-transform"><SkipBack fill="white" size={32} /></button>
                        <button
                            onClick={togglePlay}
                            className="w-20 h-20 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary),0.4)] hover:scale-105 transition-all"
                        >
                            {isPlaying ? <Pause fill="black" size={32} /> : <Play fill="black" size={32} className="ml-1" />}
                        </button>
                        <button className="text-white hover:scale-110 transition-transform"><SkipForward fill="white" size={32} /></button>
                        <button className="text-neutral-400 hover:text-white transition-colors"><Repeat size={20} /></button>
                    </div>
                </div>

                {/* Footer Tools */}
                <div className="relative z-10 flex justify-between px-10 py-10 mb-safe">
                    <button className="flex flex-col items-center gap-1 text-neutral-500 hover:text-white transition-colors">
                        <ListMusic size={20} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Queue</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-neutral-500 hover:text-white transition-colors">
                        <Heart size={20} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Like</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-neutral-500 hover:text-white transition-colors">
                        <Share2 size={20} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Share</span>
                    </button>
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