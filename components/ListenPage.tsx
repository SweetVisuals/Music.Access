import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Play, Pause, Bookmark, Share2, MoreHorizontal,
    ShoppingCart, User, Disc, Box, Gem, ArrowLeft, Check, ChevronRight, X, Link as LinkIcon, Facebook, Twitter, Mail
} from 'lucide-react';
import { Project } from '../types';
import { getProjectById, saveProject, unsaveProject, checkIsProjectSaved, getProjects, giveGemToProject, undoGiveGem, checkIsGemGiven, getCurrentUser } from '../services/supabaseService';
import WaveformVisualizer from './WaveformVisualizer';
import { usePurchaseModal } from '../contexts/PurchaseModalContext';
import { useToast } from '../contexts/ToastContext';

interface ListenPageProps {
    currentTrackId: string | null;
    isPlaying: boolean;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
    currentProject: Project | null;
}

const ListenPage: React.FC<ListenPageProps> = ({
    currentTrackId,
    isPlaying,
    onPlayTrack,
    onTogglePlay,
    currentProject: globalCurrentProject
}) => {
    const { id: paramsId } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    // Fallback ID extraction
    const id = paramsId || location.pathname.split('/listen/')[1]?.replace(/\/$/, '');

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [suggestedProjects, setSuggestedProjects] = useState<Project[]>([]);
    const [isShareOpen, setIsShareOpen] = useState(false);

    // Gem & User State
    const [localGems, setLocalGems] = useState(0);
    const [hasGivenGem, setHasGivenGem] = useState(false);
    const [showUndo, setShowUndo] = useState(false);
    const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const { openPurchaseModal } = usePurchaseModal();
    const { showToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            if (!id) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                // Fetch current user
                try {
                    const user = await getCurrentUser();
                    setCurrentUserId(user?.id || null);
                } catch (e) {
                    console.error("Error fetching user", e);
                }

                const data = await getProjectById(id);
                if (data) {
                    setProject(data);
                    setLocalGems(data.gems || 0); // Initialize local gems
                    const saved = await checkIsProjectSaved(id);
                    // Check if gem is given
                    const gemGiven = await checkIsGemGiven(id);
                    setHasGivenGem(gemGiven);

                    // Fetch suggestions (mock logic: same genre or random)
                    const allProjects = await getProjects();
                    const suggestions = allProjects
                        .filter(p => p.id !== data.id) // Exclude current
                        .sort(() => 0.5 - Math.random()) // Shuffle
                        .slice(0, 10); // Take 10
                    setSuggestedProjects(suggestions);
                }
            } catch (error) {
                console.error("Failed to load project:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const isOwnProject = currentUserId && project?.userId === currentUserId;

    const handleGiveGem = async () => {
        if (!project || !project.id || hasGivenGem || isOwnProject) return;

        // Optimistic update
        setLocalGems(prev => prev + 1);
        setHasGivenGem(true);
        setShowUndo(true);

        // Start 1 minute timer to remove undo option
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
            setShowUndo(false);
        }, 60000);

        try {
            await giveGemToProject(project.id);
        } catch (error: any) {
            console.error('Failed to give gem:', error);
            // Revert state
            setLocalGems(prev => prev - 1);
            setHasGivenGem(false);
            setShowUndo(false);
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            showToast(error.message || "Failed to give gem", 'error');
        }
    };

    const handleUndoGem = async () => {
        if (!project || !project.id) return;

        // Optimistic revert
        setLocalGems(prev => prev - 1);
        setHasGivenGem(false);
        setShowUndo(false);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

        try {
            await undoGiveGem(project.id);
        } catch (error) {
            console.error('Failed to undo gem:', error);
            // Revert optimistic update if API fails (set back to given state)
            setLocalGems(prev => prev + 1);
            setHasGivenGem(true);
        }
    };

    const handleSave = async () => {
        if (!project || !project.id) return;
        try {
            if (isSaved) {
                await unsaveProject(project.id);
                setIsSaved(false);
                showToast('Removed from Library', 'success');
            } else {
                await saveProject(project.id);
                setIsSaved(true);
                showToast('Saved to Library', 'success');
            }
        } catch (error) {
            console.error('Failed to toggle save:', error);
            showToast('Failed to update library', 'error');
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showToast('Link copied to clipboard', 'success');
            setIsShareOpen(false);
        } catch (err) {
            showToast('Failed to copy link', 'error');
        }
    };

    const shareToSocial = (platform: string) => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(`Check out ${project?.title} on Music Access!`);
        let shareUrl = '';

        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'email':
                shareUrl = `mailto:?subject=${text}&body=${url}`;
                break;
        }

        if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
        setIsShareOpen(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-neutral-400 animate-pulse">Loading experience...</p>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                <h2 className="text-2xl font-bold mb-2">Project not found</h2>
                <button onClick={() => navigate('/')} className="text-primary hover:underline">Return Home</button>
            </div>
        );
    }

    const isCurrentProjectActive = globalCurrentProject?.id === project.id;
    // Calculate if right panel should show (desktop only perhaps?) or strictly full screen split.
    // User asked for "suggested panel extend to the bottom".

    return (
        <div className="w-full min-h-[calc(100vh-64px)] bg-black pt-4 lg:pt-0 animate-in fade-in duration-500 relative">
            {/* Mobile: Use h-auto so it grows. Desktop: fixed height for split pane. */}
            <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-64px)]">

                {/* LEFT PANEL: Tracklist + Header + Profile Footer */}
                {/* Mobile: Allow full height, no fixed scrolling container so layout flows naturally */}
                <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col h-auto min-h-[50vh] lg:h-full border-b lg:border-b-0 lg:border-r border-white/5 bg-black relative z-10">

                    {/* Header: Project Title & Stats */}
                    <div className="p-6 pb-4 border-b border-white/5 bg-black">
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter mb-2 leading-none">{project.title}</h1>
                        <div className="flex items-center gap-3 text-neutral-500 text-xs font-mono">
                            <div className="flex items-center gap-1">
                                <Box size={12} />
                                <span>{project.type === 'beat_tape' ? 'Studio Release' : 'Project'}</span>
                            </div>
                            <span>•</span>
                            <span>{project.tracks.length} Tracks</span>
                            <span>•</span>
                            <span>{project.bpm || 'N/A'} BPM</span>
                        </div>
                    </div>

                    {/* Scrollable Tracklist */}
                    {/* Mobile: height auto to show all tracks. Desktop: constrained height. */}
                    <div className="w-full flex-1 lg:flex-none lg:max-h-[calc(100%-250px)] lg:overflow-y-auto p-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="flex flex-col w-full pb-4">
                            {project.tracks.map((track, idx) => {
                                const isTrackActive = isCurrentProjectActive && currentTrackId === track.id;
                                const isTrackPlaying = isTrackActive && isPlaying;

                                return (
                                    <div
                                        key={track.id}
                                        className={`group relative flex items-center justify-between gap-3 px-6 py-3 transition-colors duration-200 cursor-pointer border-b border-white/5 last:border-0 ${isTrackActive ? 'bg-neutral-900/60' : 'hover:bg-neutral-900/30'
                                            }`}
                                        onClick={() => onPlayTrack(project, track.id)}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {/* Status Icon */}
                                            <div className="w-6 flex justify-center shrink-0">
                                                {isTrackPlaying ? (
                                                    <div className="flex gap-0.5 h-3 items-end">
                                                        <span className="w-0.5 bg-primary animate-[bounce_1s_infinite] h-full"></span>
                                                        <span className="w-0.5 bg-primary animate-[bounce_1.2s_infinite] h-2/3"></span>
                                                        <span className="w-0.5 bg-primary animate-[bounce_0.8s_infinite] h-full"></span>
                                                    </div>
                                                ) : (
                                                    <span className={`text-xs font-mono text-neutral-600 group-hover:hidden ${isTrackActive ? 'hidden' : 'block'}`}>
                                                        {(idx + 1).toString().padStart(2, '0')}
                                                    </span>
                                                )}
                                                <Play size={12} className={`text-white hidden ${isTrackPlaying ? 'hidden' : 'group-hover:block'}`} fill="currentColor" />
                                            </div>

                                            {/* Track Title */}
                                            <span className={`text-sm font-medium truncate flex-1 ${isTrackActive ? 'text-primary' : 'text-neutral-300 group-hover:text-white'}`}>
                                                {track.title}
                                            </span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-xs font-mono text-neutral-600 w-8 text-right">
                                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                            </span>

                                            {/* Add to Cart - Visible on Hover or Active */}
                                            {/* Add to Cart - Always Visible */}
                                            <button
                                                className={`p-2 rounded-full hover:bg-white/10 transition-all ml-1 ${isTrackActive ? 'text-primary' : 'text-neutral-500 hover:text-primary'} opacity-100`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openPurchaseModal(project);
                                                }}
                                                title="Add to Cart"
                                            >
                                                <ShoppingCart size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer: Profile & Gems */}
                    <div className="p-6 bg-black relative z-20">
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5"></div>
                        <div className="flex items-center justify-between mb-4">
                            {/* Producer Profile */}
                            <div
                                className="flex items-center gap-3 cursor-pointer group"
                                onClick={() => navigate(`/@${project.producerHandle || project.producer}`)}
                            >
                                <div className="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden border border-white/5 group-hover:border-primary/50 transition-colors">
                                    {project.producerAvatar ? (
                                        <img src={project.producerAvatar} alt={project.producer} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-500 font-bold bg-neutral-900">
                                            {project.producer.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] text-neutral-500 font-mono mb-0.5 uppercase tracking-wide">Producer</p>
                                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{project.producer}</p>
                                </div>
                            </div>

                            {/* Actions: Gem & Like */}
                            <div className="flex items-center gap-2">
                                {/* Gem Button */}
                                <button
                                    onClick={showUndo ? handleUndoGem : handleGiveGem}
                                    disabled={isOwnProject && !showUndo}
                                    className={`
                                                flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all active:scale-95
                                                ${hasGivenGem
                                            ? 'bg-transparent border-primary/50 text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]'
                                            : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:border-white/10'
                                        }
                                                ${isOwnProject && !showUndo ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                    title={isOwnProject ? "Cannot give gems to own project" : "Give Gem"}
                                >
                                    <Gem size={14} className={hasGivenGem ? "drop-shadow-[0_0_5px_rgba(var(--primary),0.5)]" : ""} />
                                    <span className="text-xs font-bold">{showUndo ? "UNDO" : localGems}</span>
                                </button>

                                {/* Save Button */}
                                <button
                                    onClick={handleSave}
                                    className={`p-2 rounded-full border transition-all active:scale-95 ${isSaved
                                        ? 'bg-primary/10 border-primary/20 text-primary'
                                        : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:border-white/10'
                                        }`}
                                    title={isSaved ? "Remove from Library" : "Save to Library"}
                                >
                                    <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
                                </button>

                                <button
                                    onClick={() => setIsShareOpen(true)}
                                    className="p-2 rounded-full bg-white/5 border border-white/5 text-neutral-400 hover:text-white hover:border-white/10 transition-colors"
                                >
                                    <Share2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="text-xs text-neutral-400 leading-relaxed font-mono">
                            {project.description || "No description provided."}
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Suggestions (Up Next) - Extended to Bottom */}
                {/* Mobile: h-auto, visible overflow. Desktop: full height, scrolled internally (if needed) or hidden. */}
                <div className="flex-1 bg-black flex flex-col h-auto lg:h-full lg:overflow-hidden border-l border-white/5">
                    <div className="p-6 pb-4 border-b border-white/5 bg-black z-10 flex items-center justify-between h-[89px] shrink-0">
                        <h3 className="text-xl font-bold text-white tracking-tight">Suggested</h3>
                        <div className="flex gap-2">
                            <button className="p-2 hover:bg-white/5 rounded-full text-neutral-400 hover:text-white transition-colors">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div className="flex flex-col gap-3">
                            {suggestedProjects.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        navigate(`/listen/${p.shortId || p.id}`);
                                        window.scrollTo(0, 0);
                                    }}
                                    className="group bg-neutral-900/20 rounded-xl overflow-hidden cursor-pointer hover:bg-white/5 transition-all shrink-0"
                                >
                                    <div className="flex items-center gap-3 p-3">
                                        {/* Cover Art */}
                                        <div className="relative w-12 h-12 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                            {p.coverImage ? (
                                                <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
                                                    <Disc size={20} className="text-neutral-600" />
                                                </div>
                                            )}
                                            {/* Hover Play Overlay */}
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Play size={16} fill="white" className="text-white ml-0.5" />
                                            </div>
                                        </div>

                                        {/* Project Info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                                            <h4 className="font-bold text-sm text-neutral-200 truncate group-hover:text-white transition-colors">
                                                {p.title}
                                            </h4>
                                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 group-hover:text-neutral-400">
                                                <span className="truncate max-w-[100px]">{p.producer?.username || 'Unknown'}</span>
                                                <span className="w-0.5 h-0.5 bg-neutral-600 rounded-full"></span>
                                                <span>{p.tracks.length} tracks</span>
                                            </div>
                                        </div>

                                        {/* Action/Chevron */}
                                        <div className="text-neutral-600 group-hover:text-white transition-colors">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>




            {/* Share Modal */}
            {
                isShareOpen && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-sm bg-neutral-900 border-none rounded-2xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white">Share Project</h3>
                                <button
                                    onClick={() => setIsShareOpen(false)}
                                    className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-6">
                                <button onClick={copyLink} className="flex flex-col items-center gap-2 group">
                                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/50 transition-all">
                                        <LinkIcon size={20} className="text-neutral-300 group-hover:text-primary" />
                                    </div>
                                    <span className="text-xs text-neutral-400 group-hover:text-white">Copy Link</span>
                                </button>

                                <button onClick={() => shareToSocial('twitter')} className="flex flex-col items-center gap-2 group">
                                    <div className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 flex items-center justify-center group-hover:bg-[#1DA1F2]/20 transition-all">
                                        <Twitter size={20} className="text-[#1DA1F2]" fill="currentColor" />
                                    </div>
                                    <span className="text-xs text-neutral-400 group-hover:text-white">Twitter</span>
                                </button>

                                <button onClick={() => shareToSocial('facebook')} className="flex flex-col items-center gap-2 group">
                                    <div className="w-12 h-12 rounded-full bg-[#4267B2]/10 border border-[#4267B2]/20 flex items-center justify-center group-hover:bg-[#4267B2]/20 transition-all">
                                        <span className="font-bold text-[#4267B2] text-xl">f</span>
                                    </div>
                                    <span className="text-xs text-neutral-400 group-hover:text-white">Facebook</span>
                                </button>

                                <button onClick={() => shareToSocial('email')} className="flex flex-col items-center gap-2 group">
                                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-all">
                                        <Mail size={20} className="text-neutral-300 group-hover:text-white" />
                                    </div>
                                    <span className="text-xs text-neutral-400 group-hover:text-white">Email</span>
                                </button>
                            </div>

                            <div className="p-3 rounded-lg bg-black border border-white/10 flex items-center justify-between gap-3">
                                <span className="text-xs text-neutral-500 truncate flex-1 font-mono">
                                    {window.location.href}
                                </span>
                                <button
                                    onClick={copyLink}
                                    className="text-xs font-bold text-primary hover:underline"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ListenPage;
