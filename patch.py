import os

file_path = r'c:\Users\Shadow\Desktop\Music Access V4.0 (Mobile Support)\components\ProjectCard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

start_marker = '// Default Layout (Beat Tape / Sound Pack)'
end_marker = 'export default ProjectCard;'

start_idx = text.find(start_marker)
end_idx = text.find(end_marker)

print(f'Start idx: {start_idx}, End idx: {end_idx}, File length: {len(text)}')

if start_idx != -1 and end_idx != -1:
    new_card = '''// Default Layout (Beat Tape / Sound Pack)
    return (
        <>
            <div
                className={`
                    group h-full flex flex-col bg-[#050505] transition-colors duration-300 relative cursor-pointer
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
                    <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none group-hover:text-primary transition-colors duration-300 flex-1 line-clamp-2">
                            {project.title}
                        </h3>

                        <div className="flex items-center gap-2 shrink-0 z-50">
                            {/* Metadata Info Icon */}
                            <div className="relative group/info">
                                <button
                                    className="text-neutral-600 hover:text-white transition-colors p-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Info size={14} />
                                </button>
                                {/* Info Popover */}
                                <div className="absolute right-0 top-full mt-2 w-56 bg-[#0a0a0a] overflow-hidden z-50 opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-300 transform translate-y-2 group-hover/info:translate-y-0 p-4 pointer-events-none group-hover/info:pointer-events-auto">
                                   <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between pb-2">
                                            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">MANIFEST</span>
                                            {project.fileSize && <span className="text-[10px] font-mono text-neutral-500">{project.fileSize}</span>}
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap font-mono">
                                            <span className="px-1.5 py-0.5 bg-white/5 text-[9px] text-neutral-300">MP3</span>
                                            {project.licenses?.some(l => l.fileTypesIncluded.includes('WAV')) && <span className="px-1.5 py-0.5 bg-white/5 text-[9px] text-neutral-300">WAV</span>}
                                            {project.licenses?.some(l => l.fileTypesIncluded.includes('STEMS')) && <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px]">STEMS</span>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 pt-1 font-mono">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] text-neutral-500">TRK</span>
                                                <span className="text-xs text-neutral-200">{project.tracks.length}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] text-neutral-500">DUR</span>
                                                <span className="text-xs text-neutral-200">
                                                    {(() => {
                                                        const totalSeconds = project.tracks.reduce((acc, t) => acc + t.duration, 0);
                                                        const minutes = Math.floor(totalSeconds / 60);
                                                        const seconds = Math.floor(totalSeconds % 60);
                                                        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                                    })()}
                                                </span>
                                            </div>
                                            {(project.bpm || project.key) && (
                                                <div className="col-span-2 flex items-center justify-between pt-2">
                                                    {(typeof project.bpm === 'string' ? project.bpm.length > 0 : project.bpm > 0) && (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[9px] text-neutral-500">BPM</span>
                                                            <span className="text-[10px] text-neutral-300">{project.bpm}</span>
                                                        </div>
                                                    )}
                                                    {project.key && project.key !== 'C' && (
                                                        <div className="flex flex-col gap-1 text-right">
                                                            <span className="text-[9px] text-neutral-500">KEY</span>
                                                            <span className="text-[10px] text-neutral-300">{project.key}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                   </div>
                                </div>
                            </div>
                            
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
                <div className="flex-1 bg-transparent overflow-y-auto no-scrollbar relative min-h-0">
                    <div className="flex flex-col">
                        {(() => {
                            const tracksToShow = [...project.tracks];
                            if (!hideEmptySlots) {
                                while (tracksToShow.length < 6) {
                                    tracksToShow.push({ id: `empty-${tracksToShow.length}`, title: 'EMPTY_SLOT', duration: 0, isPlaceholder: true } as any);
                                }
                            }

                            return tracksToShow.map((track, idx) => {
                                const isPlaceholder = (track as any).isPlaceholder;
                                if (isPlaceholder) {
                                    return (
                                        <div
                                            key={track.id}
                                            className="flex items-center px-4 md:px-5 py-2.5 opacity-20 pointer-events-none font-mono"
                                        >
                                            <div className="w-6 shrink-0 text-[10px] text-neutral-600">
                                                {(idx + 1).toString().padStart(2, '0')}
                                            </div>
                                            <div className="flex-1 min-w-0 mr-3">
                                                <div className="text-[10px] text-neutral-700 tracking-wider">
                                                    [ NO_DATA ]
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-neutral-700">--:--</div>
                                        </div>
                                    );
                                }

                                const trackId = track.id || `track-${idx}`;
                                const isTrackPlaying = isPlaying && currentTrackId === trackId;
                                return (
                                    <div
                                        key={trackId}
                                        className={`
                                            flex items-center px-4 md:px-5 py-2.5 transition-colors duration-200 cursor-pointer group/track font-mono
                                            ${isTrackPlaying
                                                ? 'bg-[#0a0a0a] text-primary'
                                                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.02]'
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
                                                    <span className="text-[10px] transition-opacity duration-200 group-hover/track:opacity-0 absolute">
                                                        {(idx + 1).toString().padStart(2, '0')}
                                                    </span>
                                                    <Play size={10} className="opacity-0 group-hover/track:opacity-100 transition-opacity duration-200 absolute text-white fill-white" />
                                                </>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 mr-3">
                                            <div className={`text-[11px] uppercase tracking-wider truncate transition-colors ${isTrackPlaying ? 'text-primary' : ''}`}>
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
                                            <span className="text-[10px]">
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
                <div className="p-4 md:p-5 bg-transparent flex items-center justify-between z-40 mt-auto">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                const handle = project.producerHandle || project.producer;
                                navigate(`/@${handle}`);
                            }}
                            className="h-6 w-6 bg-[#0a0a0a] flex items-center justify-center text-[10px] font-mono font-bold uppercase shrink-0 transition-colors cursor-pointer"
                        >
                            {project.producerAvatar ? (
                                <img src={project.producerAvatar} alt={project.producer} className="w-full h-full object-cover grayscale opacity-80" />
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
                            className="text-[10px] font-mono font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-widest cursor-pointer truncate"
                        >
                            {project.producer}
                        </span>
                    </div>

                    <div className={`flex items-center gap-2 shrink-0 ${hideActions ? 'hidden' : ''}`}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyze();
                            }}
                            className={`
                                p-1.5 transition-colors
                                ${description ? 'text-primary' : 'text-neutral-600 hover:text-white'}
                            `}
                            title="Generate AI Analysis"
                        >
                            <Cpu size={14} className={loadingDesc ? "animate-spin" : ""} />
                        </button>

                        <button
                            onClick={handleToggleSave}
                            className={`p-1.5 transition-colors ${isSaved ? 'text-primary' : 'text-neutral-600 hover:text-white'}`}
                            title={isSaved ? "Unsave Project" : "Save Project"}
                        >
                            <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
                        </button>

                        {/* Gem Button */}
                        <button
                            onClick={canUndo ? handleUndoGem : handleGiveGem}
                            disabled={(isOwnProject && !canUndo) || isGemLoading}
                            className={`
                                flex items-center gap-1.5 p-1.5 transition-colors
                                ${isOwnProject && !canUndo
                                    ? 'text-neutral-700 cursor-not-allowed'
                                    : hasGivenGem
                                        ? 'text-primary'
                                        : 'text-neutral-600 hover:text-primary'
                                }
                            `}
                            title={
                                isOwnProject
                                    ? "Cannot give gems to own project"
                                    : canUndo
                                        ? "Take Gem Back (15s)"
                                        : "Give Gem"
                            }
                        >
                            <Gem size={14} />
                            <span className={`text-[10px] font-mono ${hasGivenGem ? 'text-primary' : 'text-neutral-600'}`}>
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
                                    p-1.5 transition-colors
                                    ${isOwnProject
                                        ? 'text-neutral-700 cursor-not-allowed'
                                        : 'text-neutral-600 hover:text-primary'
                                    }
                                `}
                                title={isOwnProject ? "Cannot purchase own project" : "Add to Cart"}
                            >
                                <ShoppingCart size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
'''
    try:
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text[:start_idx] + new_card + '\n\n' + end_marker + '\n')
        print("Successfully wrote file without borders!")
    except Exception as e:
        print("Error writing:", e)
else:
    print("Markers not found in file")
