import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, MoreVertical, Cpu, ShoppingCart, Bookmark, Sparkles, Clock, BookmarkPlus, Lock, Edit, Trash2, Globe, Disc, Info, ArrowDownToLine } from 'lucide-react';
import { Project } from '../types';
import { generateCreativeDescription } from '../services/geminiService';
import { usePurchaseModal } from '../contexts/PurchaseModalContext';
import { useToast } from '../contexts/ToastContext';
import { checkIsProjectSaved, saveProject, unsaveProject, giveGemToProject, undoGiveGem, checkIsGemGiven, getCurrentUser, updateProjectStatus } from '../services/supabaseService';
import { Gem } from 'lucide-react';

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
                className={`group relative aspect-square bg-neutral-900 border border-transparent rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(var(--primary),0.1)] cursor-pointer ${className}`}
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
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-transparent rounded-xl shadow-2xl overflow-hidden z-50">
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
                    group h-full flex flex-col bg-neutral-950/50 border border-transparent rounded-xl transition-all duration-300 relative backdrop-blur-sm cursor-pointer
                    ${isLocked ? 'grayscale opacity-75 border-neutral-800' : 'hover:border-primary/40 hover:shadow-[0_0_30px_rgba(var(--primary),0.05)]'}
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
                {/* Background Image - Added to prevent empty look */}
                <div className="absolute inset-0 z-0 rounded-xl overflow-hidden">
                    {project.coverImage ? (
                        <>
                            <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover opacity-40 blur-sm scale-110 group-hover:scale-100 transition-all duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]/40" />
                        </>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-neutral-800/20 to-neutral-900/20" />
                    )}

                </div>

                {/* Locked Overlay */}
                {isLocked && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform">
                            <Lock size={20} className="text-neutral-400" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300 bg-black/60 px-2 py-1 rounded">Sign to Unlock</span>
                    </div>
                )}
                {/* Top Gradient Line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-all duration-700"></div>

                {/* Header Section */}
                <div className="p-4 md:p-5 flex flex-col relative z-10 bg-gradient-to-b from-white/[0.02] to-transparent rounded-t-xl">
                    {/* Metadata Row - Moved Above Title */}

                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-bold text-white truncate tracking-tight group-hover:text-primary transition-colors duration-300 flex-1 leading-tight">
                            {project.title}
                        </h3>

                        <div className="flex items-center gap-2 shrink-0">
                            {/* Metadata Info Icon */}
                            <div className="relative group/info">
                                <button
                                    className="text-neutral-600 hover:text-white transition-colors p-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Info size={14} />
                                </button>
                                <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0a0a]/95 backdrop-blur-xl rounded-lg shadow-2xl overflow-hidden z-50 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-300 transform translate-y-2 group-hover/info:translate-y-0 p-3 pointer-events-none group-hover/info:pointer-events-auto border-none">
                                    <div className="flex flex-col gap-2.5">
                                        {/* Header */}
                                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">Includes</span>
                                            {project.fileSize && <span className="text-[10px] text-neutral-400">{project.fileSize}</span>}
                                        </div>

                                        {/* Formats Row */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {(() => {
                                                const hasWav = project.licenses?.some(l => l.fileTypesIncluded.includes('WAV')) || project.files?.wav;
                                                const hasStems = project.licenses?.some(l => l.fileTypesIncluded.includes('STEMS')) || project.files?.stems;
                                                // Always assume MP3 is available if it's a valid project
                                                return (
                                                    <>
                                                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] font-medium text-neutral-300 border border-white/5">MP3</span>
                                                        {hasWav && <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-[10px] font-medium text-purple-200 border border-purple-500/20">WAV</span>}
                                                        {hasStems && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[10px] font-medium text-blue-200 border border-blue-500/20">STEMS</span>}
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Stats Row */}
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[9px] text-neutral-600 uppercase">Tracks</span>
                                                <span className="text-xs font-medium text-neutral-300">{project.tracks.length}</span>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[9px] text-neutral-600 uppercase">Duration</span>
                                                <span className="text-xs font-medium text-neutral-300">
                                                    {(() => {
                                                        const totalSeconds = project.tracks.reduce((acc, t) => acc + t.duration, 0);
                                                        const minutes = Math.floor(totalSeconds / 60);
                                                        const seconds = Math.floor(totalSeconds % 60);
                                                        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                                    })()}
                                                </span>
                                            </div>
                                            {(project.bpm || project.key) && (
                                                <div className="col-span-2 flex items-center gap-3 pt-1 border-t border-white/5 mt-1">
                                                    {(typeof project.bpm === 'string' ? project.bpm.length > 0 : project.bpm > 0) && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] text-neutral-600">BPM</span>
                                                            <span className="text-[10px] text-neutral-400">{project.bpm}</span>
                                                        </div>
                                                    )}
                                                    {project.key && project.key !== 'C' && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] text-neutral-600">KEY</span>
                                                            <span className="text-[10px] text-neutral-400">{project.key}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* More Menu - Show if actions OR custom items exist */}
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
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-transparent rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                            <div className="p-1">
                                                {/* Custom Menu Items */}
                                                {customMenuItems?.map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${item.variant === 'danger' ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' :
                                                            item.variant === 'success' ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' :
                                                                'text-neutral-300 hover:text-white hover:bg-white/10'
                                                            }`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowMenu(false);
                                                            item.onClick(project);
                                                        }}
                                                    >
                                                        {item.icon}
                                                        <span>{item.label}</span>
                                                    </button>
                                                ))}

                                                {onEdit && (
                                                    <button
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left"
                                                        onClick={(e) => handleMenuAction('edit', e)}
                                                    >
                                                        <Edit size={14} />
                                                        <span>Edit Project</span>
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                                        onClick={(e) => handleMenuAction('delete', e)}
                                                    >
                                                        <Trash2 size={14} />
                                                        <span>Delete Project</span>
                                                    </button>
                                                )}
                                                {/* Make Private Option */}
                                                {isOwnProject && project.status === 'published' && (
                                                    <button
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors text-left"
                                                        onClick={(e) => handleMenuAction('make_private', e)}
                                                    >
                                                        <Lock size={14} />
                                                        <span>Make Private</span>
                                                    </button>
                                                )}

                                                {/* Unprivate Option */}
                                                {isOwnProject && project.status !== 'published' && (
                                                    <button
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors text-left"
                                                        onClick={(e) => handleMenuAction('publish', e)}
                                                    >
                                                        <Globe size={14} />
                                                        <span>Unprivate</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Analysis Overlay */}
                <div className={`
            overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] bg-[#080808] border-y border-dashed border-neutral-900
            ${description ? 'max-h-24 opacity-100 border-primary/20' : 'max-h-0 opacity-0'}
       `}>
                    <div className="px-4 py-3 md:px-5 md:py-4 flex items-start gap-3">
                        <div className="mt-0.5 p-1 rounded-md bg-primary/10">
                            <Sparkles size={10} className="text-primary animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <div className="text-[7px] text-primary/50 uppercase tracking-wider mb-0.5">System Analysis</div>
                            <p className="text-[9px] text-neutral-200 leading-relaxed line-clamp-2">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tracklist */}
                <div className="flex-1 bg-[#050505] overflow-y-auto no-scrollbar relative min-h-0">
                    <div className="p-2 space-y-2">
                        {(() => {
                            const tracksToShow = [...project.tracks];
                            // Ensure 6 slots are always shown (unless hidden)
                            if (!hideEmptySlots) {
                                while (tracksToShow.length < 6) {
                                    tracksToShow.push({ id: `empty-${tracksToShow.length}`, title: 'Empty Slot', duration: 0, isPlaceholder: true } as any);
                                }
                            }

                            return tracksToShow.map((track, idx) => {
                                const isPlaceholder = (track as any).isPlaceholder;
                                if (isPlaceholder) {
                                    return (
                                        <div
                                            key={track.id}
                                            className="flex items-center px-3 py-2 rounded-md border border-transparent opacity-20 pointer-events-none"
                                        >
                                            <div className="w-6 flex items-center justify-center mr-1">
                                                <span className="text-[9px] md:text-[10px] text-neutral-700">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0 mr-3">
                                                <div className="text-[10px] md:text-xs font-medium truncate text-neutral-800">
                                                    ••••••••••••
                                                </div>
                                            </div>
                                            <div className="flex items-center text-neutral-900">
                                                <Clock size={10} className="mr-1.5" />
                                                <span className="text-[8px] md:text-[9px]">--:--</span>
                                            </div>
                                        </div>
                                    );
                                }

                                const trackId = track.id || `track-${idx}`;
                                const isTrackPlaying = isPlaying && currentTrackId === trackId;
                                return (
                                    <div
                                        key={trackId}
                                        className={`
                                            flex items-center px-3 py-2 rounded-md transition-all duration-200 cursor-pointer group/track border border-transparent
                                            ${isTrackPlaying
                                                ? 'bg-primary/5 border-primary/10'
                                                : 'hover:bg-white/5 hover:border-transparent'
                                            }
                                        `}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            isTrackPlaying ? onTogglePlay() : onPlayTrack(trackId);
                                        }}
                                    >
                                        {/* Status Indicator */}
                                        <div className="w-6 flex items-center justify-center mr-1">
                                            {isTrackPlaying ? (
                                                <div className="relative flex items-center justify-center">
                                                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-20 animate-ping"></span>
                                                    <Pause size={10} className="text-primary fill-primary relative z-10" />
                                                </div>
                                            ) : (
                                                <span className="text-[9px] md:text-[10px] text-neutral-700 group-hover/track:hidden">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </span>
                                            )}
                                            {!isTrackPlaying && <Play size={10} className="text-neutral-300 fill-neutral-300 hidden group-hover/track:block" />}
                                        </div>

                                        {/* Track Info */}
                                        <div className="flex-1 min-w-0 mr-3">
                                            <div className={`text-[10px] md:text-xs font-semibold tracking-wide truncate transition-colors ${isTrackPlaying ? 'text-primary' : 'text-neutral-400 group-hover/track:text-white'}`}>
                                                {track.title}
                                            </div>
                                        </div>

                                        {/* Duration */}
                                        <div className="flex items-center text-neutral-700 group-hover/track:text-neutral-500 transition-colors">
                                            {isPurchased && track.files?.mp3 && (
                                                <a
                                                    href={track.files.mp3}
                                                    download
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="mr-3 p-1 text-neutral-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                                                    title="Download MP3"
                                                >
                                                    <ArrowDownToLine size={12} />
                                                </a>
                                            )}
                                            <Clock size={10} className="mr-1.5" />
                                            <span className="text-[8px] md:text-[9px]">
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

                {/* Footer */}
                <div className="rounded-b-xl p-4 md:p-5 bg-neutral-900/90 border-t border-transparent flex items-center justify-between z-20">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                const handle = project.producerHandle || project.producer;
                                navigate(`/@${handle}`);
                            }}
                            className="h-5 w-5 rounded-lg bg-neutral-800 text-neutral-400 border border-transparent flex items-center justify-center text-[9px] font-bold uppercase shrink-0 overflow-hidden cursor-pointer hover:border-white/20 transition-colors"
                        >
                            {project.producerAvatar ? (
                                <img src={project.producerAvatar} alt={project.producer} className="w-full h-full object-cover" />
                            ) : (
                                project.producer.charAt(0)
                            )}
                        </div>
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                const handle = project.producerHandle || project.producer;
                                navigate(`/@${handle}`);
                            }}
                            className="text-[10px] font-bold text-neutral-400 hover:text-white transition-colors truncate cursor-pointer"
                        >
                            {project.producer}
                        </span>
                    </div>

                    <div className={`flex items-center gap-1 shrink-0 ${hideActions ? 'hidden' : ''}`}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyze();
                            }}
                            className={`
                    flex items-center gap-1.5 px-2 py-1 rounded border transition-all duration-300
                    ${description
                                    ? 'bg-primary/10 border-primary/20 text-primary'
                                    : 'bg-transparent border-transparent text-neutral-500 hover:text-white hover:bg-white/5'
                                }
                `}
                            title="Generate AI Analysis"
                        >
                            <Cpu size={12} className={loadingDesc ? "animate-spin" : ""} />
                        </button>

                        <div className="w-px h-3 bg-neutral-800 mx-1"></div>

                        <button
                            onClick={handleToggleSave}
                            className={`p-1.5 rounded transition-all active:scale-75 ${isSaved ? 'text-primary bg-primary/5' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                            title={isSaved ? "Unsave Project" : "Save Project"}
                        >
                            <BookmarkPlus size={12} fill={isSaved ? "currentColor" : "none"} />
                        </button>

                        {/* Gem Button */}
                        <button
                            onClick={canUndo ? handleUndoGem : handleGiveGem}
                            disabled={(isOwnProject && !canUndo) || isGemLoading}
                            className={`
                                flex items-center gap-1 p-1.5 rounded transition-all active:scale-75
                                ${isOwnProject && !canUndo
                                    ? 'text-neutral-600 cursor-not-allowed opacity-50'
                                    : hasGivenGem
                                        ? 'text-primary bg-primary/5 border border-primary/20'
                                        : 'text-neutral-500 hover:text-primary hover:bg-primary/5'
                                }
                                ${hideActions ? 'hidden' : ''}
                            `}
                            title={
                                isOwnProject
                                    ? "Cannot give gems to own project"
                                    : canUndo
                                        ? "Take Gem Back (15s)"
                                        : "Give Gem"
                            }
                        >
                            <Gem size={12} />
                            <span className={`text-[9px] font-mono font-bold ${hasGivenGem ? 'text-primary' : 'text-neutral-500'}`}>
                                {canUndo ? "UNDO" : localGems}
                            </span>
                        </button>

                        {!isPurchased && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isOwnProject) openPurchaseModal(project);
                                }}
                                disabled={isOwnProject}
                                className={`
                                    p-1.5 rounded transition-all active:scale-75
                                    ${isOwnProject
                                        ? 'text-neutral-600 cursor-not-allowed opacity-50'
                                        : 'text-neutral-500 hover:text-primary hover:bg-white/5'
                                    }
                                    ${hideActions ? 'hidden' : ''}
                                `}
                                title={isOwnProject ? "Cannot purchase own project" : "Add to Cart"}
                            >
                                <ShoppingCart size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProjectCard;

export const ProjectSkeleton: React.FC = () => (
    <div className="flex flex-col h-full bg-neutral-950/50 border border-transparent rounded-xl overflow-hidden animate-pulse">
        <div className="p-4 pb-2 space-y-2 border-b border-transparent">
            <div className="flex gap-2">
                <div className="h-4 w-12 bg-neutral-800 rounded"></div>
                <div className="h-4 w-12 bg-neutral-800 rounded"></div>
            </div>
            <div className="h-6 w-3/4 bg-neutral-800 rounded"></div>
        </div>
        <div className="flex-1 bg-[#050505] p-2 space-y-2">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 w-full bg-neutral-900/50 rounded"></div>
            ))}
        </div>
        <div className="p-3 bg-neutral-900/90 border-t border-transparent flex justify-between items-center">
            <div className="h-4 w-20 bg-neutral-800 rounded"></div>
            <div className="flex gap-2">
                <div className="h-4 w-4 bg-neutral-800 rounded"></div>
                <div className="h-4 w-4 bg-neutral-800 rounded"></div>
            </div>
        </div>
    </div>
);
