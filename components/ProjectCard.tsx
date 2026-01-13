import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, MoreVertical, Cpu, ShoppingCart, Bookmark, Sparkles, Clock, BookmarkPlus, Lock, Edit, Trash2 } from 'lucide-react';
import { Project } from '../types';
import { generateCreativeDescription } from '../services/geminiService';
import { usePurchaseModal } from '../contexts/PurchaseModalContext';
import { useToast } from '../contexts/ToastContext';
import { checkIsProjectSaved, saveProject, unsaveProject, giveGemToProject, undoGiveGem, getCurrentUser } from '../services/supabaseService';
import { Gem } from 'lucide-react';

interface ProjectCardProps {
    project: Project;
    currentTrackId: string | null;
    isPlaying: boolean;
    onPlayTrack: (trackId: string) => void;
    onTogglePlay: () => void;
    renderTrackAction?: (track: any) => React.ReactNode;
    isPurchased?: boolean;
    onEdit?: (project: Project) => void;
    onDelete?: (project: Project) => void;
    showStatusTags?: boolean;
}


const ProjectCard: React.FC<ProjectCardProps> = ({
    project,
    currentTrackId,
    isPlaying,
    onPlayTrack,
    onTogglePlay,
    renderTrackAction,
    isPurchased,
    onEdit,
    onDelete,
    showStatusTags = true
}) => {
    const [description, setDescription] = useState<string | null>(null);
    const [loadingDesc, setLoadingDesc] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [localGems, setLocalGems] = useState(project.gems || 0);
    const [hasGivenGem, setHasGivenGem] = useState(false); // Local tracking for interaction feedback
    const [showUndo, setShowUndo] = useState(false);
    const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Menu State
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const { openPurchaseModal } = usePurchaseModal();
    const { showToast } = useToast();

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

    const handleMenuAction = (action: 'edit' | 'delete', e: React.MouseEvent) => {
        e.stopPropagation();
        setShowMenu(false);
        if (action === 'edit' && onEdit) onEdit(project);
        if (action === 'delete' && onDelete) onDelete(project);
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

    const handleGiveGem = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!project.id || hasGivenGem || isOwnProject) return;

        // Optimistic update
        setLocalGems(prev => prev + 1);
        setHasGivenGem(true);
        setShowUndo(true);
        // Toast removed as requested

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
            // Optional: Show toast error
            showToast(error.message || "Failed to give gem", 'error');
        }
    };

    const handleUndoGem = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!project.id) return;

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

    return (
        <>
            <div
                // ... (rest of the file as is)
                className="group h-full flex flex-col bg-neutral-950/50 border border-white/5 rounded-xl hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(var(--primary),0.05)] relative backdrop-blur-sm cursor-pointer"
                style={{ zoom: '110%' }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => openPurchaseModal(project)}
            >
                {/* Top Gradient Line */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/50 transition-all duration-700"></div>

                {/* Header Section */}
                <div className="p-4 pb-2 flex flex-col relative z-10 bg-gradient-to-b from-white/[0.02] to-transparent rounded-t-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-1.5">
                            {project.genre && project.genre !== 'Uploads' && (
                                <span className="px-1.5 py-0.5 rounded-[3px] bg-neutral-900 border border-white/10 text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                                    {project.genre}
                                </span>
                            )}
                            {(typeof project.bpm === 'string' ? project.bpm.length > 0 : project.bpm > 0) && project.genre !== 'Uploads' && (
                                <span className="px-1.5 py-0.5 rounded-[3px] bg-neutral-900 border border-white/10 text-[9px] font-mono text-neutral-500">
                                    {project.bpm} BPM
                                </span>
                            )}
                            {project.key && project.key !== 'C' && project.genre !== 'Uploads' && (
                                <span className="px-1.5 py-0.5 rounded-[3px] bg-neutral-900 border border-white/10 text-[9px] font-mono text-neutral-500">
                                    {project.key}
                                </span>
                            )}
                            {project.genre === 'Uploads' && (
                                <span className="px-1.5 py-0.5 rounded-[3px] bg-primary/10 border border-primary/20 text-[9px] font-mono font-bold text-primary uppercase tracking-wider">
                                    Upload
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {project.status && project.status !== 'published' && showStatusTags && (
                                <div className="p-1 rounded bg-neutral-900 border border-white/5 text-neutral-500" title="Private Project">
                                    <Lock size={12} />
                                </div>
                            )}

                            {/* More Menu - Only show if actions exist */}
                            {(onEdit || onDelete) && (
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
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                            <div className="p-1">
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
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <h3 className="text-lg font-bold text-white truncate tracking-tight group-hover:text-primary transition-colors duration-300">
                        {project.title}
                    </h3>
                </div>

                {/* AI Analysis Overlay */}
                <div className={`
            overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] bg-[#080808] border-y border-dashed border-neutral-900
            ${description ? 'max-h-24 opacity-100 border-primary/20' : 'max-h-0 opacity-0'}
       `}>
                    <div className="px-4 py-3 flex items-start gap-3">
                        <div className="mt-0.5 p-1 rounded-md bg-primary/10">
                            <Sparkles size={10} className="text-primary animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <div className="text-[9px] text-primary/50 font-mono uppercase tracking-widest mb-0.5">System Analysis</div>
                            <p className="text-[11px] text-neutral-200 font-mono leading-relaxed line-clamp-2">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tracklist */}
                <div className="flex-1 bg-[#050505] overflow-y-auto custom-scrollbar relative">
                    <div className="p-2 space-y-0.5">
                        {(() => {
                            const tracksToShow = project.tracks.slice(0, 5);
                            // Ensure 5 slots are always shown on mobile
                            while (tracksToShow.length < 5) {
                                tracksToShow.push({ id: `empty-${tracksToShow.length}`, title: 'Empty Slot', duration: 0, isPlaceholder: true } as any);
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
                                                <span className="text-[9px] md:text-[10px] font-mono text-neutral-700">
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
                                                <span className="text-[8px] md:text-[9px] font-mono">--:--</span>
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
                                                : 'hover:bg-white/5 hover:border-white/5'
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
                                                <span className="text-[9px] md:text-[10px] font-mono text-neutral-700 group-hover/track:hidden">
                                                    {(idx + 1).toString().padStart(2, '0')}
                                                </span>
                                            )}
                                            {!isTrackPlaying && <Play size={10} className="text-neutral-300 fill-neutral-300 hidden group-hover/track:block" />}
                                        </div>

                                        {/* Track Info */}
                                        <div className="flex-1 min-w-0 mr-3">
                                            <div className={`text-[10px] md:text-xs font-medium truncate transition-colors ${isTrackPlaying ? 'text-primary' : 'text-neutral-400 group-hover/track:text-white'}`}>
                                                {track.title}
                                            </div>
                                        </div>

                                        {/* Duration */}
                                        <div className="flex items-center text-neutral-700 group-hover/track:text-neutral-500 transition-colors">
                                            <Clock size={10} className="mr-1.5" />
                                            <span className="text-[8px] md:text-[9px] font-mono">
                                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
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
                <div className="rounded-b-xl px-3 py-2.5 bg-neutral-900/90 border-t border-white/5 flex items-center justify-between z-20">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="h-5 w-5 rounded bg-neutral-800 text-neutral-400 border border-white/5 flex items-center justify-center text-[9px] font-bold uppercase shrink-0 overflow-hidden">
                            {project.producerAvatar ? (
                                <img src={project.producerAvatar} alt={project.producer} className="w-full h-full object-cover" />
                            ) : (
                                project.producer.charAt(0)
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-neutral-400 hover:text-white transition-colors truncate cursor-pointer">
                            {project.producer}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
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
                            <span className="text-[9px] font-mono font-bold tracking-wider hidden group-hover:block">AI</span>
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
                            onClick={showUndo ? handleUndoGem : handleGiveGem}
                            disabled={isOwnProject && !showUndo}
                            className={`
                                flex items-center gap-1 p-1.5 rounded transition-all active:scale-75
                                ${isOwnProject
                                    ? 'text-neutral-600 cursor-not-allowed opacity-50'
                                    : hasGivenGem
                                        ? 'text-primary bg-primary/10 border border-primary/20'
                                        : 'text-neutral-500 hover:text-primary hover:bg-primary/5'
                                }
                            `}
                            title={
                                isOwnProject
                                    ? "Cannot give gems to own project"
                                    : showUndo
                                        ? "Take Gem Back (1m)"
                                        : "Give Gem"
                            }
                        >
                            <Gem size={12} fill={hasGivenGem ? "currentColor" : "none"} />
                            <span className={`text-[9px] font-mono font-bold ${hasGivenGem ? 'text-primary' : 'hidden group-hover:inline-block'}`}>
                                {showUndo ? "UNDO" : localGems}
                            </span>
                        </button>

                        {!isPurchased && (
                            <button
                                onClick={(e) => { e.stopPropagation(); openPurchaseModal(project); }}
                                className="p-1.5 text-neutral-500 hover:text-primary hover:bg-white/5 rounded transition-colors"
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
    <div className="flex flex-col h-full bg-neutral-950/50 border border-white/5 rounded-xl overflow-hidden animate-pulse">
        <div className="p-4 pb-2 space-y-2 border-b border-white/5">
            <div className="flex gap-2">
                <div className="h-4 w-12 bg-neutral-800 rounded"></div>
                <div className="h-4 w-12 bg-neutral-800 rounded"></div>
            </div>
            <div className="h-6 w-3/4 bg-neutral-800 rounded"></div>
        </div>
        <div className="flex-1 bg-[#050505] p-2 space-y-2">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 w-full bg-neutral-900/50 rounded"></div>
            ))}
        </div>
        <div className="p-3 bg-neutral-900/90 border-t border-white/5 flex justify-between items-center">
            <div className="h-4 w-20 bg-neutral-800 rounded"></div>
            <div className="flex gap-2">
                <div className="h-4 w-4 bg-neutral-800 rounded"></div>
                <div className="h-4 w-4 bg-neutral-800 rounded"></div>
            </div>
        </div>
    </div>
);
