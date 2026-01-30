import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Project, Track, UserProfile, CartItem } from '../types';
import ProjectCard from './ProjectCard';
import { Play, Pause, Heart, MessageCircle, Bookmark, Share2, Music2, MoreHorizontal, Gem, ShoppingBag, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WaveformVisualizer from './WaveformVisualizer';
import { usePlayer } from '../contexts/PlayerContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { checkIsProjectSaved, saveProject, unsaveProject, checkIsGemGiven, giveGemToProject, undoGiveGem, getCurrentUser } from '../services/supabaseService';
import { MOCK_USER_PROFILE } from '../constants';

interface DiscoverFeedProps {
    projects: Project[];
    currentTrackId: string | null;
    isPlaying: boolean;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
    userProfile: UserProfile | null;
    onOpenSidebar?: () => void;
}

interface FeedItem {
    project: Project;
    track: Track;
    uniqueId: string; // To avoid key collisions if we repeat tracks
}

const DiscoverFeedItem = ({
    item,
    active,
    isPlaying,
    currentTrackId,
    navigate,
    onFeedClick,
    onPlayTrack,
    onTogglePlay
}: {
    item: FeedItem;
    active: boolean;
    isPlaying: boolean;
    currentTrackId: string | null;
    navigate: any;
    onFeedClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
}) => {
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const [isSaved, setIsSaved] = useState(false);
    const [localGems, setLocalGems] = useState(item.project.gems || 0);
    const [hasGivenGem, setHasGivenGem] = useState(false);
    const [canUndoGem, setCanUndoGem] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Determine the track to display (active track from project, or default feed track)
    const displayTrack = useMemo(() => {
        if (currentTrackId && item.project.tracks.some(t => t.id === currentTrackId)) {
            return item.project.tracks.find(t => t.id === currentTrackId) || item.track;
        }
        return item.track;
    }, [currentTrackId, item.project, item.track]);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const user = await getCurrentUser();
                setCurrentUserId(user?.id || null);
                if (item.project.id && user) {
                    const [saved, given] = await Promise.all([
                        checkIsProjectSaved(item.project.id),
                        checkIsGemGiven(item.project.id)
                    ]);
                    setIsSaved(saved);
                    setHasGivenGem(given);
                }
            } catch (e) {
                console.error("Error checking status", e);
            }
        };
        checkStatus();
    }, [item.project.id]);

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!item.project.id) return;

        // Optimistic
        const newState = !isSaved;
        setIsSaved(newState);

        try {
            if (newState) {
                await saveProject(item.project.id);
                // showToast("Saved to Library", "success");
            } else {
                await unsaveProject(item.project.id);
                // showToast("Removed from Library", "success");
            }
        } catch (err) {
            setIsSaved(!newState); // Revert
            showToast("Failed to update save status", "error");
        }
    };

    const handleGem = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!item.project.id || hasGivenGem) {
            if (canUndoGem) {
                // Handle Undo
                setLocalGems(prev => prev - 1);
                setHasGivenGem(false);
                setCanUndoGem(false);
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                try {
                    await undoGiveGem(item.project.id);
                } catch (err) {
                    setLocalGems(prev => prev + 1);
                    setHasGivenGem(true);
                    setCanUndoGem(true);
                }
            }
            return;
        }

        // Give Gem
        setLocalGems(prev => prev + 1);
        setHasGivenGem(true);
        setCanUndoGem(true);
        // showToast(`Sent 1 Gem to ${item.project.producer}!`, "success");

        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setCanUndoGem(false), 15000);

        try {
            await giveGemToProject(item.project.id);
        } catch (err) {
            setLocalGems(prev => prev - 1);
            setHasGivenGem(false);
            setCanUndoGem(false);
            showToast("Failed to give gem", "error");
        }
    };

    const handleCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        const cartItem: CartItem = {
            id: `${item.project.id}-${Date.now()}`,
            title: displayTrack.title,
            type: 'Lease License', // Default implementation
            price: item.project.price || 29.99,
            sellerName: item.project.producer,
            sellerHandle: item.project.producerHandle || item.project.producer,
            projectId: item.project.id,
            trackId: displayTrack.id,
            sellerAvatar: item.project.producerAvatar,
            licenseType: 'Basic Lease'
        };
        addToCart(cartItem);
        // showToast("Added to Cart", "success");
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Fallback or Navigator Share
        const url = `${window.location.origin}/listen/${item.project.shortId || item.project.id}`;
        const isMobile = window.innerWidth < 768; // Identify mobile via width

        if (navigator.share) {
            navigator.share({
                title: item.project.title,
                text: `Check out ${displayTrack.title} by ${item.project.producer}`,
                url: url
            }).catch(() => {
                navigator.clipboard.writeText(url);
                if (!isMobile) showToast("Link copied to clipboard", "success");
            });
        } else {
            navigator.clipboard.writeText(url);
            if (!isMobile) showToast("Link copied to clipboard", "success");
        }
    };

    return (
        <>
            {/* Interaction Overlay */}
            <div className="absolute inset-0 z-10 cursor-pointer" onClick={onFeedClick}></div>

            {/* Content Container - Split Layout */}
            <div className="absolute inset-0 z-20 pointer-events-none">

                {/* TOP HALF: Project Card */}
                <div className="absolute inset-x-0 top-0 h-[70%] flex items-center justify-center pointer-events-none z-10 pt-8">
                    <div className={`relative w-[85vw] max-w-[380px] h-[45vh] max-h-[470px] -translate-y-[25px] transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-auto ${active && isPlaying ? 'scale-100' : 'scale-95'}`}>
                        {/* Dynamic Glow Behind */}
                        <div className={`absolute -inset-4 bg-gradient-to-tr from-primary/30 via-blue-500/20 to-purple-500/30 rounded-xl blur-2xl opacity-0 transition-opacity duration-1000 ${active && isPlaying ? 'opacity-100' : 'opacity-0'}`}></div>

                        <div className="w-full h-full relative z-10">
                            <ProjectCard
                                project={item.project}
                                currentTrackId={currentTrackId}
                                isPlaying={isPlaying}
                                onPlayTrack={(trackId) => onPlayTrack(item.project, trackId)}
                                onTogglePlay={onTogglePlay}
                                className="w-full h-full shadow-2xl"
                                hideActions={true}
                            />
                        </div>
                    </div>
                </div>

                {/* BOTTOM HALF: Info & Interactions */}
                <div className="absolute inset-x-0 bottom-0 pointer-events-none z-20 pb-[55px] px-4 flex flex-col justify-end">
                    <div className="flex justify-between items-end w-full">
                        <div className="flex-1 min-w-0 pr-8">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md shadow-sm">
                                    {item.project.genre || 'Beat'}
                                </span>
                                <span className="text-white/80 text-[10px] font-mono drop-shadow-md">
                                    {item.project.bpm} BPM • {item.project.key || 'C Maj'}
                                </span>
                            </div>
                            <h2 className="text-3xl font-black text-white leading-none mb-1 drop-shadow-lg line-clamp-2 tracking-tight">
                                {displayTrack.title}
                            </h2>
                            <h3
                                className="text-white/90 font-bold text-base flex items-center gap-2 cursor-pointer hover:underline drop-shadow-md pointer-events-auto"
                                onClick={() => navigate(`/@${item.project.producerHandle || item.project.producer}`)}
                            >
                                {item.project.producer}
                            </h3>

                            <div className="mt-6 w-full opacity-90">
                                {/* Minimal Waveform Visualization */}
                                <WaveformVisualizer isPlaying={active && isPlaying} />
                            </div>
                        </div>

                        {/* Right Side Actions - Moved Down */}
                        <div className="flex flex-col items-center gap-4 mb-0 pointer-events-auto">
                            {/* Gem Button */}
                            <div className="flex flex-col items-center gap-1 group w-[60px]">
                                <button
                                    onClick={handleGem}
                                    className={`drop-shadow-lg hover:scale-110 transition-all active:scale-95 ${hasGivenGem ? 'text-primary' : 'text-white'}`}
                                >
                                    <Gem size={28} strokeWidth={1.5} className={`drop-shadow-md ${hasGivenGem ? 'fill-primary/20' : ''}`} />
                                </button>
                                <span className={`text-[10px] font-medium drop-shadow-lg ${hasGivenGem ? 'text-primary' : 'text-white'}`}>
                                    {canUndoGem ? 'Undo' : 'Gift'}
                                </span>
                            </div>

                            {/* Cart Button */}
                            <div className="flex flex-col items-center gap-1 group w-[60px]">
                                <button
                                    onClick={handleCart}
                                    className="text-white drop-shadow-lg hover:scale-110 transition-transform active:scale-95"
                                >
                                    <ShoppingBag size={28} strokeWidth={1.5} className="drop-shadow-md" />
                                </button>
                                <span className="text-[10px] font-medium text-white drop-shadow-lg">Cart</span>
                            </div>

                            {/* Bookmark Button */}
                            <div className="flex flex-col items-center gap-1 group w-[60px]">
                                <button
                                    onClick={handleSave}
                                    className={`drop-shadow-lg hover:scale-110 transition-transform active:scale-95 ${isSaved ? 'text-primary' : 'text-white'}`}
                                >
                                    <Bookmark size={28} strokeWidth={1.5} className={`drop-shadow-md ${isSaved ? 'fill-primary' : ''}`} />
                                </button>
                                <span className={`text-[10px] font-medium drop-shadow-lg ${isSaved ? 'text-primary' : 'text-white'}`}>
                                    {isSaved ? 'Saved' : 'Bookmark'}
                                </span>
                            </div>

                            {/* Share Button */}
                            <div className="flex flex-col items-center gap-1 group w-[60px]">
                                <button
                                    onClick={handleShare}
                                    className="text-white drop-shadow-lg hover:scale-110 transition-transform active:scale-95"
                                >
                                    <Share2 size={28} strokeWidth={1.5} className="drop-shadow-md" />
                                </button>
                                <span className="text-[10px] font-medium text-white drop-shadow-lg">Share</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

const DiscoverFeed: React.FC<DiscoverFeedProps> = ({
    projects,
    currentTrackId,
    isPlaying,
    onPlayTrack,
    onTogglePlay,
    userProfile,
    onOpenSidebar
}) => {
    const navigate = useNavigate();
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const { currentTime, duration, seek, skip, setCurrentTime } = usePlayer();
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Filter and Flatten Tracks
    useEffect(() => {
        // Filter for "Beats" (Not releases, Not soundpacks)
        const validProjects = projects.filter(p => p.type !== 'release' && p.type !== 'sound_pack');

        let allTracks: FeedItem[] = [];
        validProjects.forEach(project => {
            project.tracks.forEach((track, index) => {
                allTracks.push({
                    project,
                    track,
                    uniqueId: `${project.id}-${track.id || index}-${Math.random()}`
                });
            });
        });

        // Shuffle
        for (let i = allTracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allTracks[i], allTracks[j]] = [allTracks[j], allTracks[i]];
        }

        setFeedItems(allTracks);
    }, [projects]);


    // Intersection Observer to Auto-Play with Debounce
    useEffect(() => {
        const options = {
            root: containerRef.current,
            threshold: 0.7 // Increased threshold for stricter overlap
        };

        const handleIntersect: IntersectionObserverCallback = (entries) => {
            // Find the entry with the highest intersection ratio
            const bestEntry = entries.reduce((prev, current) => {
                return (prev.intersectionRatio > current.intersectionRatio) ? prev : current;
            });

            if (bestEntry.isIntersecting && bestEntry.intersectionRatio >= 0.7) {
                const index = Number(bestEntry.target.getAttribute('data-index'));
                const item = feedItems[index];

                // Check if we are already playing a track from this project
                const isProjectTrackPlaying = currentTrackId && item.project.tracks.some(t => t.id === currentTrackId);

                if (item && !isProjectTrackPlaying) {
                    // Clear any pending play
                    if (clickTimeoutRef.current) {
                        clearTimeout(clickTimeoutRef.current);
                    }

                    // Set a small debounce to wait for scroll to settle slightly
                    clickTimeoutRef.current = setTimeout(() => {
                        onPlayTrack(item.project, item.track.id || '');
                    }, 500); // 500ms debounce
                }
            }
        };

        observerRef.current = new IntersectionObserver(handleIntersect, options);

        const elements = containerRef.current?.querySelectorAll('.feed-item');
        elements?.forEach(el => observerRef.current?.observe(el));

        return () => {
            observerRef.current?.disconnect();
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
            }
        };
    }, [feedItems, currentTrackId, onPlayTrack]);

    // Handle initial play of first item when feed loads??
    // Maybe better to wait for user interaction or observer? Observer will trigger on mount if visible.

    const handleFeedClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const width = target.clientWidth;
        const x = e.nativeEvent.offsetX;

        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            if (x > width / 2) {
                skip(5);
            } else {
                skip(-5);
            }
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                onTogglePlay();
                clickTimeoutRef.current = null;
            }, 300);
        }
    };

    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart || !onOpenSidebar) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStart.x;
        const deltaY = touchEndY - touchStart.y;

        // Check for horizontal swipe (Right Swipe > 50px)
        // Also ensure vertical movement is less than horizontal movement (to distinguish from scroll)
        if (deltaX > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
            onOpenSidebar();
        }

        setTouchStart(null);
    };

    return (
        <div className="relative w-full h-full bg-black overflow-hidden">
            {/* Feed Scroll Container */}
            <div
                ref={containerRef}
                className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
            >
                <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: rotate 8s linear infinite; }
            `}</style>

                {feedItems.map((item, index) => {
                    const isProjectActive = item.project.tracks.some(t => t.id === currentTrackId);
                    const active = isProjectActive;

                    return (
                        <div
                            key={item.uniqueId}
                            data-index={index}
                            className="feed-item h-full w-full shrink-0 snap-start snap-stop-always relative overflow-hidden bg-black"
                        >
                            <DiscoverFeedItem
                                item={item}
                                active={active}
                                isPlaying={active && isPlaying}
                                currentTrackId={currentTrackId}
                                navigate={navigate}
                                onFeedClick={handleFeedClick}
                                onPlayTrack={onPlayTrack}
                                onTogglePlay={onTogglePlay}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const VerifiedBadge = ({ verified }: { verified?: boolean }) => {
    if (!verified) return null;
    return (
        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
    );
};

export default DiscoverFeed;
