import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Bookmark, BookmarkPlus, ShoppingCart, Info, MoreVertical, Edit, Trash2, Lock, Globe, Disc, Volume2, Cpu, Calendar, Star, Gem, LayoutList, Fingerprint, Sparkles, ArrowDownToLine, Flame, CheckCircle } from 'lucide-react';
import { Project } from '../types';
import { generateCreativeDescription } from '../services/geminiService';
import { usePurchaseModal } from '../contexts/PurchaseModalContext';
import { useToast } from '../contexts/ToastContext';
import { checkIsProjectSaved, saveProject, unsaveProject, giveGemToProject, undoGiveGem, checkIsGemGiven, getCurrentUser, updateProjectStatus } from '../services/supabaseService';

interface ProjectCardProps {
    project: Project;
    currentTrackId: string | null;
    isPlaying: boolean;
    onPlayTrack: (trackId: string) => void;
    onTogglePlay: () => void;
    renderTrackAction?: (track: any) => React.ReactNode;
    isPurchased?: boolean;
    isLocked?: boolean;
    onUnlock?: () => void;
    onEdit?: (project: Project) => void;
    onDelete?: (project: Project) => void;
    showStatusTags?: boolean;
    onStatusChange?: (project: Project, newStatus: string) => void;
    customMenuItems?: {
        label: string;
        icon: React.ReactNode;
        onClick: (project: Project) => void;
        variant?: 'default' | 'danger' | 'success' | 'warning';
    }[];
    onAction?: (project: Project) => void;
    hideEmptySlots?: boolean;
    className?: string;
    hideActions?: boolean;
}


const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};


const ProjectCard: React.FC<ProjectCardProps> = ({
    project,
    currentTrackId,
    isPlaying,
    onPlayTrack,
    onTogglePlay,
    renderTrackAction,
    isPurchased,
    isLocked,
    onUnlock,
    onEdit,
    onDelete,
    onStatusChange,
    customMenuItems,
    onAction,
    hideEmptySlots = false,
    className = '',
    hideActions = false
}) => {
    const [description, setDescription] = useState<string | null>(null);
    const [loadingDesc, setLoadingDesc] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [localGems, setLocalGems] = useState(project.gems || 0);

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isGemLoading, setIsGemLoading] = useState(true);

    // Menu State
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);



    const { openPurchaseModal } = usePurchaseModal();
    const { showToast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndStatus = async () => {
            try {
                const user = await getCurrentUser();
                setCurrentUserId(user?.id || null);
            } catch (error) {
                console.error('Error fetching user:', error);
            }

            if (project.id) {
                const saved = await checkIsProjectSaved(project.id);
                setIsSaved(saved);
            }
        };
        fetchUserAndStatus();
    }, [project.id]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);



    const handleMenuAction = async (action: 'edit' | 'delete' | 'make_private' | 'publish', e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        if (action === 'edit' && onEdit) onEdit(project);
        if (action === 'delete' && onDelete) onDelete(project);

        if (action === 'make_private') {
            try {
                if (!project.id) return;
                await updateProjectStatus(project.id, 'draft');
                showToast('Project made private', 'success');
                if (onStatusChange) {
                    onStatusChange(project, 'draft');
                }
            } catch (error) {
                console.error('Failed to make private:', error);
                showToast('Failed to make private', 'error');
            }
        }

        if (action === 'publish') {
            try {
                if (!project.id) return;
                await updateProjectStatus(project.id, 'published');
                showToast('Project published', 'success');
                if (onStatusChange) {
                    onStatusChange(project, 'published');
                }
            } catch (error) {
                console.error('Failed to publish:', error);
                showToast('Failed to publish', 'error');
            }
        }
    };

    const handleToggleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!project.id) return;
        try {
            if (isSaved) {
                await unsaveProject(project.id);
                setIsSaved(false);
            } else {
                await saveProject(project.id);
                setIsSaved(true);
            }
        } catch (error) {
            console.error('Failed to toggle save:', error);
        }
    };

    const isOwnProject = currentUserId && project.userId === currentUserId;

    const [hasGivenGem, setHasGivenGem] = useState(false);
    const [canUndo, setCanUndo] = useState(false); // Only allowed for 15s after giving
    const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchUserAndStatus = async () => {
            try {
                setIsGemLoading(true);
                const user = await getCurrentUser();
                setCurrentUserId(user?.id || null);

                if (project.id && user) {
                    const [saved, given] = await Promise.all([
                        checkIsProjectSaved(project.id),
                        checkIsGemGiven(project.id)
                    ]);
                    setIsSaved(saved);
                    setHasGivenGem(given);
                }
            } catch (error) {
                console.error('Error fetching user:', error);
            } finally {
                setIsGemLoading(false);
            }
        };
        fetchUserAndStatus();
    }, [project.id]);

    // ... (existing code)

    const handleGiveGem = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!project.id || hasGivenGem || isOwnProject) return;

        // Optimistic update
        setLocalGems(prev => prev + 1);
        setHasGivenGem(true);
        setCanUndo(true);

        // Start 15s timer to remove undo option
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
            setCanUndo(false);
        }, 15000); // 15 seconds

        // Only show toast on desktop
        if (window.innerWidth >= 1024) {
            showToast("Sent 1 Gem to " + project.producer + "!", "success");
        }

        try {
            await giveGemToProject(project.id);
        } catch (error: any) {
            console.error('Failed to give gem:', error);
            // Revert state
            setLocalGems(prev => prev - 1);
            setHasGivenGem(false);
            setCanUndo(false);
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
            showToast(error.message || "Failed to give gem", 'error');
        }
    };

    const handleUndoGem = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!project.id) return;

        // Optimistic revert
        setLocalGems(prev => prev - 1);
        setHasGivenGem(false);
        setCanUndo(false);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

        try {
            await undoGiveGem(project.id);
        } catch (error) {
            console.error('Failed to undo gem:', error);
            // Revert optimistic update
            setLocalGems(prev => prev + 1);
            setHasGivenGem(true);
            setCanUndo(true); // Allow retrying undo? Or just fail.
        }
    };

    const handleAnalyze = async () => {
        if (description) {
            setDescription(null);
            return;
        }
        setLoadingDesc(true);
        const desc = await generateCreativeDescription(project);
        setDescription(desc);
        setLoadingDesc(false);
    };

    // Release Card Layout (Square, Cover Art Focus)
    if (project.type === 'release') {
        const releaseTrack = project.tracks[0] || { id: 'missing', duration: 0, title: 'Unknown' };
        const isTrackPlaying = isPlaying && currentTrackId === releaseTrack.id;

        return (
            <div
                className={`group relative aspect-square bg-[#050505] border border-white/5 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-[0_0_40px_rgba(var(--primary),0.15)] transition-all duration-500 hover:-translate-y-1 cursor-pointer ${className}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onAction) {
                        onAction(project);
                        return;
                    }
                    // Release Type: Play direct, don't open page
                    if (isTrackPlaying) {
                        onTogglePlay();
                    } else {
                        onPlayTrack(releaseTrack.id);
                    }
                }}
            >
                {/* Full Cover Background */}
                <div className="absolute inset-0 z-0">
                    {project.coverImage ? (
                        <img
                            src={project.coverImage}
                            alt={project.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                            <Disc size={48} className="text-neutral-800" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                    {/* Play/Pause Overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center z-10 transition-all duration-300 ${isTrackPlaying ? 'bg-black/20 backdrop-blur-[1px]' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border border-transparent shadow-xl transition-all duration-300 ${isTrackPlaying ? 'bg-primary text-black scale-110' : 'bg-white/10 text-white hover:bg-white hover:text-black hover:scale-110'}`}>
                            {isTrackPlaying ? (
                                <Pause size={24} fill="currentColor" />
                            ) : (
                                <Play size={24} fill="currentColor" className="ml-1" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Top Actions */}
                <div className="absolute top-0 left-0 right-0 p-4 md:p-5 flex justify-between items-start z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex gap-2">
                        {project.status !== 'published' && (
                            <div className="p-1 rounded-md bg-black/50 backdrop-blur border border-transparent text-neutral-400">
                                <Lock size={12} />
                            </div>
                        )}
                    </div>

                    {(onEdit || onDelete) && (
                        <div className="relative" onClick={e => e.stopPropagation()}>
                            <button
                                className="p-1.5 rounded-full bg-black/50 backdrop-blur border border-transparent text-white hover:bg-white hover:text-black transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                            >
                                <MoreVertical size={14} />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-transparent rounded-xl overflow-hidden z-50">
                                    <div className="p-1">
                                        {onEdit && (
                                            <button
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-white/10 rounded-lg transition-colors text-left"
                                                onClick={(e) => handleMenuAction('edit', e)}
                                            >
                                                <Edit size={14} /> Edit Project
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                                onClick={(e) => handleMenuAction('delete', e)}
                                            >
                                                <Trash2 size={14} /> Delete Project
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 z-20 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-xl font-bold text-white mb-1 truncate drop-shadow-md">{project.title}</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-300 font-medium truncate max-w-[120px]">{project.producer}</span>
                            {project.genre && (
                                <span className="px-1.5 py-0.5 rounded-full bg-white/10 border border-transparent text-[9px] text-neutral-400 backdrop-blur-sm">
                                    {project.genre}
                                </span>
                            )}
                        </div>

                        {/* Actions Row */}
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={canUndo ? handleUndoGem : handleGiveGem}
                                disabled={(isOwnProject && !canUndo) || isGemLoading}
                                className={`
                                    flex items-center gap-1 px-2.5 py-1.5 rounded-full backdrop-blur-md border transition-all
                                    ${hasGivenGem
                                        ? 'text-primary border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.3)] bg-black/40'
                                        : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
                                    }
                                    ${(isOwnProject || isGemLoading) ? 'opacity-50 cursor-not-allowed' : ''}
                                    ${/* Hide if requested */ hideActions ? 'hidden' : ''}
                                `}
                            >
                                <Gem size={12} className={`${hasGivenGem ? "text-primary drop-shadow-[0_0_5px_rgba(var(--primary),0.5)]" : "text-white"} ${isGemLoading ? 'animate-pulse' : ''}`} />
                                <span className="text-[10px] font-bold">{localGems}</span>
                            </button>

                            <button
                                onClick={handleToggleSave}
                                className={`p-1.5 rounded-full backdrop-blur-md border transition-all ${isSaved ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}
                            >
                                <BookmarkPlus size={14} fill={isSaved ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default Layout (Beat Tape / Sound Pack)
    return (
        <>
            <div
                className={`
                    group h-full flex flex-col bg-[#050505] rounded-3xl overflow-hidden transition-colors duration-300 relative cursor-pointer
                    ${isLocked ? 'opacity-50 grayscale' : 'hover:bg-[#0a0a0a]'}
                    ${className}
                `}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => {
                    if (isLocked) {
                        if (onUnlock) onUnlock();
                        return;
                    }
                    if (onAction) {
                        onAction(project);
                        return;
                    }
                    navigate(`/listen/${project.shortId || project.id}`);
                }}
            >
                {/* Locked Overlay */}
                {isLocked && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050505]/80 backdrop-blur-sm">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 bg-black py-1.5 px-3">
                            [ LOCKED ]
                        </span>
                    </div>
                )}

                {/* Header Section */}
                <div className="p-4 md:p-5 flex flex-col relative z-10">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none group-hover:text-primary transition-colors duration-300 flex-1 line-clamp-2">
                                {project.title}
                            </h3>

                            <div className="flex items-center gap-2 shrink-0 z-50">
                                {/* More Menu */}
                                {(onEdit || onDelete || (customMenuItems && customMenuItems.length > 0)) && (
                                    <div className="relative" ref={menuRef}>
                                        <button
                                            className="text-neutral-600 hover:text-white transition-colors p-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenu(!showMenu);
                                            }}
                                        >
                                            <MoreVertical size={14} />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {showMenu && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0a] z-50 font-mono text-xs">
                                                <div className="p-1 flex flex-col gap-1">
                                                    {/* Custom Menu Items */}
                                                    {customMenuItems?.map((item, idx) => (
                                                        <button
                                                            key={idx}
                                                            className={`w-full flex items-center gap-2 px-3 py-2 transition-colors text-left ${item.variant === 'danger' ? 'text-red-400 hover:bg-red-500/10' :
                                                                item.variant === 'success' ? 'text-green-400 hover:bg-green-500/10' :
                                                                    'text-neutral-400 hover:text-white hover:bg-white/5'
                                                                }`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowMenu(false);
                                                                item.onClick(project);
                                                            }}
                                                        >
                                                            {item.icon}
                                                            <span className="uppercase tracking-wider">{item.label}</span>
                                                        </button>
                                                    ))}

                                                    {onEdit && (
                                                        <button
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-neutral-400 hover:text-white hover:bg-white/5 transition-colors text-left"
                                                            onClick={(e) => handleMenuAction('edit', e)}
                                                        >
                                                            <Edit size={12} />
                                                            <span className="uppercase tracking-wider">EDIT</span>
                                                        </button>
                                                    )}
                                                    {onDelete && (
                                                        <button
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                                                            onClick={(e) => handleMenuAction('delete', e)}
                                                        >
                                                            <Trash2 size={12} />
                                                            <span className="uppercase tracking-wider">DELETE</span>
                                                        </button>
                                                    )}
                                                    {/* Make Private/Publish Options */}
                                                    {isOwnProject && project.status === 'published' && (
                                                        <button
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-colors text-left"
                                                            onClick={(e) => handleMenuAction('make_private', e)}
                                                        >
                                                            <Lock size={12} />
                                                            <span className="uppercase tracking-wider">MAKE PRIVATE</span>
                                                        </button>
                                                    )}
                                                    {isOwnProject && project.status !== 'published' && (
                                                        <button
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors text-left"
                                                            onClick={(e) => handleMenuAction('publish', e)}
                                                        >
                                                            <Globe size={12} />
                                                            <span className="uppercase tracking-wider">PUBLISH</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Surfaced Metadata functional row */}
                        <div className="flex flex-wrap text-[10px] font-mono text-neutral-500 gap-x-3 gap-y-1 tracking-tight">
                            {project.bpm && <span>BPM <span className="text-neutral-300">{project.bpm}</span></span>}
                            {project.bpm && project.key && <span className="opacity-50">/</span>}
                            {project.key && project.key !== 'C' && <span>KEY <span className="text-neutral-300">{project.key}</span></span>}

                            {project.fileSize && (
                                <>
                                    {(project.bpm || project.key) && <span className="opacity-50">/</span>}
                                    <span>VOL <span className="text-neutral-300">{project.fileSize}</span></span>
                                </>
                            )}

                            {project.licenses && project.licenses.length > 0 && (
                                <>
                                    {(project.bpm || project.key || project.fileSize) && <span className="opacity-50">/</span>}
                                    <span className="flex items-center gap-1.5">
                                        INC:
                                        {project.licenses.some(l => l.fileTypesIncluded.includes('WAV')) && <span className="text-neutral-300">WAV</span>}
                                        {project.licenses.some(l => l.fileTypesIncluded.includes('STEMS')) && <span className="text-primary bg-primary/10 px-1 py-0.5 rounded-sm">STEMS</span>}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Analysis Overlay */}
                <div className={`
                    overflow-hidden transition-all duration-300 bg-[#0a0a0a]
                    ${description ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}
               `}>
                    <div className="px-4 py-3 md:px-5 md:py-4 flex items-start gap-3">
                        <div className="mt-0.5 text-primary">
                            <Sparkles size={12} className="animate-pulse" />
                        </div>
                        <div className="flex-1 font-mono">
                            <div className="text-[9px] text-primary uppercase tracking-widest mb-1.5">[ SYSTEM.ANALYSIS ]</div>
                            <p className="text-[10px] text-neutral-400 leading-relaxed max-h-20 overflow-y-auto no-scrollbar">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tracklist */}
                <div className="flex-1 bg-transparent overflow-y-auto no-scrollbar relative min-h-0 border-y border-white/[0.02]">
                    <div className="flex flex-col">
                        {(() => {
                            const tracksToShow = [...project.tracks];
                            if (!hideEmptySlots) {
                                while (tracksToShow.length < 5) {
                                    tracksToShow.push({ id: `empty-${tracksToShow.length}`, title: 'EMPTY_SLOT', duration: 0, isPlaceholder: true } as any);
                                }
                            }

                            return tracksToShow.map((track, idx) => {
                                const isPlaceholder = (track as any).isPlaceholder;
                                if (isPlaceholder) {
                                    return (
                                        <div
                                            key={track.id}
                                            className="flex items-center px-4 md:px-5 py-2 opacity-30 pointer-events-none"
                                        >
                                            <div className="w-6 shrink-0 text-[10px] text-neutral-600 font-mono">
                                                {(idx + 1).toString().padStart(2, '0')}
                                            </div>
                                            <div className="flex-1 min-w-0 mr-3">
                                                <div className="text-[11px] text-neutral-700 tracking-widest">
                                                    ----
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-neutral-700 font-mono">--:--</div>
                                        </div>
                                    );
                                }

                                const trackId = track.id || `track-${idx}`;
                                const isTrackPlaying = isPlaying && currentTrackId === trackId;
                                return (
                                    <div
                                        key={trackId}
                                        className={`
                                            flex items-center px-4 md:px-5 py-2 transition-colors duration-200 cursor-pointer group/track
                                            ${isTrackPlaying
                                                ? 'bg-[#0a0a0a] text-primary'
                                                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]'
                                            }
                                        `}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            isTrackPlaying ? onTogglePlay() : onPlayTrack(trackId);
                                        }}
                                    >
                                        <div className="w-6 shrink-0 relative flex items-center">
                                            {isTrackPlaying ? (
                                                <Pause size={10} className="text-primary fill-primary" />
                                            ) : (
                                                <>
                                                    <span className="text-[10px] transition-opacity duration-200 group-hover/track:opacity-0 absolute font-mono">
                                                        {(idx + 1).toString().padStart(2, '0')}
                                                    </span>
                                                    <Play size={10} className="opacity-0 group-hover/track:opacity-100 transition-opacity duration-200 absolute text-white fill-white" />
                                                </>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 mr-3">
                                            <div className={`text-[12px] font-medium tracking-tight truncate transition-colors ${isTrackPlaying ? 'text-primary' : ''}`}>
                                                {track.title}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {isPurchased && track.files?.mp3 && (
                                                <a
                                                    href={track.files.mp3}
                                                    download
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-neutral-600 hover:text-white transition-colors"
                                                    title="Download MP3"
                                                >
                                                    <ArrowDownToLine size={12} />
                                                </a>
                                            )}
                                            <span className="text-[10px] font-mono">
                                                {formatDuration(track.duration)}
                                            </span>
                                        </div>

                                        {renderTrackAction && (
                                            <div className="ml-3" onClick={(e) => e.stopPropagation()}>
                                                {renderTrackAction(track)}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* Footer Console */}
                <div className="p-4 md:p-5 bg-transparent flex items-center justify-between z-40 mt-auto">
                    <div className="flex items-center gap-3 overflow-hidden" onClick={(e) => {
                        e.stopPropagation();
                        const handle = project.producerHandle || project.producer;
                        navigate(`/@${handle}`);
                    }}>
                        <div className="h-8 w-8 rounded-xl bg-white text-black flex items-center justify-center text-xs font-bold uppercase shrink-0 transition-all cursor-pointer">
                            {project.producerAvatar ? (
                                <img src={project.producerAvatar} alt={project.producer} className="w-full h-full object-cover rounded-xl grayscale" />
                            ) : (
                                project.producer.charAt(0)
                            )}
                        </div>
                        <span className="text-sm font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer truncate">
                            {project.producer}
                        </span>
                    </div>

                    <div className={`flex items-center gap-2 shrink-0 ${hideActions ? 'hidden' : ''}`}>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                            className={`p-2 rounded-xl transition-all ${description ? 'bg-primary/20 text-primary' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                            title="Analyze"
                        >
                            <Cpu size={15} className={loadingDesc ? "animate-spin" : ""} />
                        </button>

                        <button
                            onClick={handleToggleSave}
                            className={`p-2 rounded-xl transition-all ${isSaved ? 'bg-white/10 text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                            title="Save"
                        >
                            <Bookmark size={15} fill={isSaved ? "currentColor" : "none"} />
                        </button>

                        <button
                            onClick={canUndo ? handleUndoGem : handleGiveGem}
                            disabled={(isOwnProject && !canUndo) || isGemLoading}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-bold text-xs ${isOwnProject && !canUndo ? 'bg-white/5 text-neutral-600 cursor-not-allowed' : hasGivenGem ? 'bg-primary/20 text-primary' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                            title="Give Gem"
                        >
                            <Gem size={14} />
                            <span>{localGems}</span>
                        </button>

                        {!isPurchased ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isOwnProject) openPurchaseModal(project);
                                }}
                                disabled={isOwnProject}
                                className={`p-2 rounded-xl transition-all ${isOwnProject ? 'bg-white/5 text-neutral-600 cursor-not-allowed' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}`}
                                title={`Purchase ($${project.price || '0.00'})`}
                            >
                                <ShoppingCart size={15} />
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-500 font-bold text-xs">
                                <CheckCircle size={14} />
                                <span className="hidden sm:inline">OWNED</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export const ProjectSkeleton = () => (
    <div className="w-full h-full bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden animate-pulse">
        <div className="aspect-square w-full bg-neutral-900"></div>
        <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 bg-neutral-900 rounded"></div>
            <div className="h-3 w-1/2 bg-neutral-900 rounded"></div>
            <div className="flex justify-between items-center pt-2">
                <div className="h-8 w-20 bg-neutral-900 rounded-lg"></div>
                <div className="h-8 w-24 bg-neutral-900 rounded-lg"></div>
            </div>
        </div>
    </div>
);

export default ProjectCard;
