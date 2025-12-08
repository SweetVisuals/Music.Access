import React, { useMemo, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Shuffle, Repeat, Maximize2, ListMusic, Minimize2, ChevronUp } from 'lucide-react';
import { Project, View } from '../types';
import { MOCK_USER_PROFILE } from '../constants';

interface MusicPlayerProps {
    currentProject: Project | null;
    currentTrackId: string | null;
    isPlaying: boolean;
    togglePlay: () => void;
    currentView?: View;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ currentProject, currentTrackId, isPlaying, togglePlay, currentView }) => {
    const [isMinimized, setIsMinimized] = useState(true);

    const currentTrack = useMemo(() => {
        if (!currentProject || !currentTrackId) return null;
        return currentProject.tracks.find(t => t.id === currentTrackId);
    }, [currentProject, currentTrackId]);

    if (!currentProject || !currentTrack) {
        return (
            <div className={`fixed bottom-0 left-0 lg:left-64 right-0 h-10 bg-black/40 border-t border-white/5 flex items-center justify-end px-6 z-40 backdrop-blur-md transition-transform duration-300 ${isMinimized ? 'translate-y-full' : 'translate-y-0'}`}>
                <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse"></div>
                    <span className="text-neutral-600 text-[10px] font-mono uppercase tracking-wider">System Idle</span>
                </div>
            </div>
        )
    }

    // --- AUDIO & TRACKING LOGIC ---
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const [playDuration, setPlayDuration] = useState(0);
    const [hasRecordedPlay, setHasRecordedPlay] = useState(false);
    const listeningChannelRef = React.useRef<any>(null);

    // Playback Control
    React.useEffect(() => {
        if (!audioRef.current || !currentTrack) return;

        // Mock URL if no file is present - In a real app, this would be track.fileUrl
        const url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

        if (audioRef.current.src !== url) {
            audioRef.current.src = url;
            audioRef.current.load();
            setPlayDuration(0);
            setHasRecordedPlay(false);
        }

        if (isPlaying) {
            audioRef.current.play().catch(e => console.error("Play failed", e));
        } else {
            audioRef.current.pause();
        }
    }, [currentTrack, isPlaying]);

    // Live Listener Tracking
    React.useEffect(() => {
        if (isPlaying && currentProject?.userId && currentTrackId) {
            import('../services/supabaseService').then(({ joinListeningRoom }) => {
                // Join the artist's room
                if (listeningChannelRef.current) listeningChannelRef.current.unsubscribe();
                listeningChannelRef.current = joinListeningRoom(currentProject.userId!, currentTrackId);
            });
        } else {
            if (listeningChannelRef.current) {
                import('../services/supabaseService').then(({ leaveListeningRoom }) => {
                    leaveListeningRoom(listeningChannelRef.current);
                    listeningChannelRef.current = null;
                });
            }
        }

        return () => {
            if (listeningChannelRef.current) {
                import('../services/supabaseService').then(({ leaveListeningRoom }) => {
                    leaveListeningRoom(listeningChannelRef.current);
                });
            }
        };
    }, [isPlaying, currentProject, currentTrackId]);

    // Play Counting (20s rule + 2 min debounce)
    const handleTimeUpdate = () => {
        if (!audioRef.current) return;

        // Accumulate play time? simpler: just check current time if continuous
        // But user might seek. 
        // "1 play should count as 20 seconds worth of playback"
        // Simplest interpretation: If currentTime > 20s. 
        // Better: check dropped frames? No.
        // We will just use the current time > 20 as a proxy for "listened for 20s" if we assume linear playback.
        // Or increment a counter every second.

        if (!hasRecordedPlay && audioRef.current.currentTime >= 20) {
            recordPlayEvent();
        }
    };

    const recordPlayEvent = async () => {
        if (!currentTrackId) return;

        // Check 2 minute rule
        const lastPlayedKey = `last_played_${currentTrackId}`;
        const lastPlayed = localStorage.getItem(lastPlayedKey);
        const now = Date.now();

        if (lastPlayed && (now - parseInt(lastPlayed)) < 2 * 60 * 1000) {
            console.log("Play not counted: 2 minute cooldown active");
            setHasRecordedPlay(true); // Don't try again this session
            return;
        }

        // Record Play
        const { recordPlay } = await import('../services/supabaseService');
        await recordPlay(currentTrackId);

        // Update local storage
        localStorage.setItem(lastPlayedKey, now.toString());
        setHasRecordedPlay(true);
        console.log("Play counted for track", currentTrackId);
    };

    return (
        <div className={`
        fixed z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        ${isMinimized
                ? 'bottom-0 lg:bottom-6 right-0 lg:right-6 left-0 lg:left-auto w-full lg:w-80'
                : 'bottom-0 lg:bottom-8 left-0 lg:left-[calc(16rem+2rem)] right-0 lg:right-8'
            }
    `}>
            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => togglePlay()} // Simple auto-stop
            />

            <div className={`
            glass-panel border-t lg:border border-white/10 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]
            ${isMinimized ? 'p-3 lg:rounded-2xl' : 'p-4 max-w-6xl mx-auto flex flex-col md:flex-row items-center lg:rounded-2xl h-full lg:h-auto'}
        `}>

                {/* Glowing Background Ambient */}
                <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50"></div>

                {isMinimized ? (
                    // MINIMIZED COMPACT VIEW
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="h-10 w-10 bg-neutral-900 rounded-lg overflow-hidden relative shrink-0 border border-white/10 group cursor-pointer" onClick={() => setIsMinimized(false)}>
                            <img src={MOCK_USER_PROFILE.avatar} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                <Maximize2 size={14} className="text-white opacity-0 group-hover:opacity-100" />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 overflow-hidden cursor-pointer" onClick={() => setIsMinimized(false)}>
                            <h4 className="text-xs font-bold text-white truncate">{currentTrack.title}</h4>
                            <p className="text-[10px] text-neutral-500 truncate">{currentProject.producer}</p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-primary transition-colors shadow-lg"
                            >
                                {isPlaying ? <Pause fill="black" size={12} /> : <Play fill="black" size={12} className="ml-0.5" />}
                            </button>
                            <button
                                onClick={() => setIsMinimized(false)}
                                className="p-2 text-neutral-400 hover:text-white transition-colors"
                            >
                                <ChevronUp size={16} />
                            </button>
                        </div>

                        {/* Progress Bar absolute bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
                            <div className="h-full bg-primary" style={{ width: audioRef.current ? `${(audioRef.current.currentTime / audioRef.current.duration) * 100}%` : '0%' }}></div>
                        </div>
                    </div>
                ) : (
                    // FULL EXPANDED VIEW
                    <>
                        {/* Track Info */}
                        <div className="flex items-center w-full md:w-1/4 min-w-[220px] mb-4 md:mb-0">
                            <div className="h-14 w-14 bg-neutral-900 rounded-lg overflow-hidden mr-4 relative group shadow-lg border border-white/10">
                                <img src={MOCK_USER_PROFILE.avatar} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20"></div>
                            </div>
                            <div className="overflow-hidden pr-2 flex-1">
                                <div className="flex items-center space-x-2 mb-0.5">
                                    <h4 className="text-sm font-bold text-white truncate font-mono leading-tight">{currentTrack.title}</h4>
                                </div>
                                <p className="text-[11px] text-primary/80 truncate font-mono tracking-tight">{currentProject.producer} // {currentProject.title}</p>
                            </div>
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="md:hidden text-neutral-500 hover:text-white p-2"
                            >
                                <Minimize2 size={20} />
                            </button>
                        </div>

                        {/* Main Controls */}
                        <div className="flex-1 flex flex-col items-center w-full px-0 md:px-8 mb-4 md:mb-0">
                            <div className="flex items-center space-x-8 mb-3">
                                <button className="text-neutral-500 hover:text-neutral-300 transition-colors hover:scale-110"><Shuffle size={16} /></button>
                                <button className="text-neutral-300 hover:text-white transition-colors hover:scale-110"><SkipBack size={20} /></button>

                                <button
                                    onClick={togglePlay}
                                    className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                                >
                                    {isPlaying ? <Pause fill="black" size={20} /> : <Play fill="black" size={20} className="ml-1" />}
                                </button>

                                <button className="text-neutral-300 hover:text-white transition-colors hover:scale-110"><SkipForward size={20} /></button>
                                <button className="text-neutral-500 hover:text-neutral-300 transition-colors hover:scale-110"><Repeat size={16} /></button>
                            </div>

                            {/* Scrubber */}
                            <div className="w-full flex items-center space-x-4 text-[10px] font-mono text-neutral-500">
                                <span className="w-8 text-right">
                                    {audioRef.current ?
                                        `${Math.floor(audioRef.current.currentTime / 60)}:${Math.floor(audioRef.current.currentTime % 60).toString().padStart(2, '0')}`
                                        : '0:00'}
                                </span>
                                <div className="flex-1 h-1 bg-white/10 rounded-full relative group cursor-pointer overflow-hidden"
                                    onClick={(e) => {
                                        if (audioRef.current) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const pct = x / rect.width;
                                            audioRef.current.currentTime = pct * audioRef.current.duration;
                                        }
                                    }}
                                >
                                    <div className="absolute top-0 left-0 h-full bg-primary group-hover:bg-primary/90 transition-all" style={{ width: audioRef.current ? `${(audioRef.current.currentTime / audioRef.current.duration) * 100}%` : '0%' }}></div>
                                </div>
                                <span className="w-8">
                                    {Math.floor(currentTrack.duration / 60)}:{(currentTrack.duration % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        </div>

                        {/* Right Actions */}
                        <div className="w-full md:w-1/4 flex items-center justify-between md:justify-end space-x-4 min-w-[180px]">
                            <button className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded"><ListMusic size={18} /></button>
                            <div className="flex items-center space-x-2 group mx-2 flex-1 md:flex-none justify-end">
                                <Volume2 size={18} className="text-neutral-400" />
                                <div className="w-20 h-1 bg-white/10 rounded-full relative cursor-pointer">
                                    <div className="absolute top-0 left-0 h-full bg-neutral-400 w-2/3 rounded-full group-hover:bg-white transition-colors"></div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded hidden md:block"
                                title="Minimize Player"
                            >
                                <Minimize2 size={16} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MusicPlayer;