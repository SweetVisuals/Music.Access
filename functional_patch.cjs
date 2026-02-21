const fs = require('fs');

const filePath = 'c:\\Users\\Shadow\\Desktop\\Music Access V4.0 (Mobile Support)\\components\\ProjectCard.tsx';
const text = fs.readFileSync(filePath, 'utf-8');

const startMarker = '// Default Layout (Beat Tape / Sound Pack)';
const endMarker = 'export default ProjectCard;';

const startIdx = text.indexOf(startMarker);
const endIdx = text.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    const newCard = `// Default Layout (Beat Tape / Sound Pack)
    return (
        <>
            <div
                className={\`
                    group h-full flex flex-col bg-[#050505] transition-colors duration-300 relative cursor-pointer
                    \${isLocked ? 'opacity-50 grayscale' : 'hover:bg-[#0a0a0a]'}
                    \${className}
                \`}
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
                    navigate(\`/listen/\${project.shortId || project.id}\`);
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
                                {project.type && (
                                    <div className="bg-white text-black px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest">
                                        [ {project.type.replace('_', ' ')} ]
                                    </div>
                                )}
                                
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
                                                            className={\`w-full flex items-center gap-2 px-3 py-2 transition-colors text-left \${item.variant === 'danger' ? 'text-red-400 hover:bg-red-500/10' :
                                                                item.variant === 'success' ? 'text-green-400 hover:bg-green-500/10' :
                                                                    'text-neutral-400 hover:text-white hover:bg-white/5'
                                                                }\`}
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
                <div className={\`
                    overflow-hidden transition-all duration-300 bg-[#0a0a0a]
                    \${description ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}
               \`}>
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
                                    tracksToShow.push({ id: \`empty-\${tracksToShow.length}\`, title: 'EMPTY_SLOT', duration: 0, isPlaceholder: true } as any);
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

                                const trackId = track.id || \`track-\${idx}\`;
                                const isTrackPlaying = isPlaying && currentTrackId === trackId;
                                return (
                                    <div
                                        key={trackId}
                                        className={\`
                                            flex items-center px-4 md:px-5 py-2 transition-colors duration-200 cursor-pointer group/track
                                            \${isTrackPlaying
                                                ? 'bg-[#0a0a0a] text-primary'
                                                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]'
                                            }
                                        \`}
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
                                            <div className={\`text-[12px] font-medium tracking-tight truncate transition-colors \${isTrackPlaying ? 'text-primary' : ''}\`}>
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
                <div className="p-4 md:p-5 bg-transparent flex flex-col gap-4 z-40 mt-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden" onClick={(e) => {
                                e.stopPropagation();
                                const handle = project.producerHandle || project.producer;
                                navigate(\`/@\${handle}\`);
                            }}>
                            <div className="h-6 w-6 bg-white text-black flex items-center justify-center text-[10px] font-mono font-bold uppercase shrink-0 transition-colors cursor-pointer">
                                {project.producerAvatar ? (
                                    <img src={project.producerAvatar} alt={project.producer} className="w-full h-full object-cover grayscale" />
                                ) : (
                                    project.producer.charAt(0)
                                )}
                            </div>
                            <span className="text-[11px] font-mono font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest cursor-pointer truncate">
                                {project.producer}
                            </span>
                        </div>
                    </div>

                    <div className={\`grid grid-cols-4 gap-2 shrink-0 \${hideActions ? 'hidden' : ''}\`}>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                            className={\`flex items-center justify-center gap-1.5 py-2 px-1 transition-colors text-[9px] font-mono tracking-widest uppercase \${description ? 'bg-primary/10 text-primary' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}\`}
                        >
                            <Cpu size={10} className={loadingDesc ? "animate-spin" : ""} />
                            <span className="hidden sm:inline">Analyze</span>
                        </button>

                        <button
                            onClick={handleToggleSave}
                            className={\`flex items-center justify-center gap-1.5 py-2 px-1 transition-colors text-[9px] font-mono tracking-widest uppercase \${isSaved ? 'bg-white/10 text-white' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}\`}
                        >
                            <Bookmark size={10} fill={isSaved ? "currentColor" : "none"} />
                            <span className="hidden sm:inline">Save</span>
                        </button>

                        <button
                            onClick={canUndo ? handleUndoGem : handleGiveGem}
                            disabled={(isOwnProject && !canUndo) || isGemLoading}
                            className={\`flex items-center justify-center gap-1.5 py-2 px-1 transition-colors text-[9px] font-mono tracking-widest uppercase \${isOwnProject && !canUndo ? 'bg-white/5 text-neutral-600 cursor-not-allowed' : hasGivenGem ? 'bg-primary/10 text-primary' : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'}\`}
                        >
                            <Gem size={10} />
                            <span>{canUndo ? "UNDO" : localGems}</span>
                        </button>

                        {!isPurchased ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isOwnProject) openPurchaseModal(project);
                                }}
                                disabled={isOwnProject}
                                className={\`col-span-1 flex items-center justify-center gap-1.5 py-2 px-1 transition-colors text-[10px] font-mono font-bold tracking-widest uppercase \${isOwnProject ? 'bg-white/5 text-neutral-600 cursor-not-allowed' : 'bg-primary text-black hover:bg-primary/80'}\`}
                            >
                                <ShoppingCart size={11} />
                                <span>\${project.price || '0.00'}</span>
                            </button>
                        ) : (
                           <div className="col-span-1 flex items-center justify-center gap-1.5 py-2 px-1 bg-green-500/10 text-green-500 text-[10px] font-mono font-bold tracking-widest uppercase">
                               OWNED
                           </div> 
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
`;

    fs.writeFileSync(filePath, text.slice(0, startIdx) + newCard + '\n\n' + endMarker + '\n');
    console.log("Successfully overhauled layout to Functional Brutalism");
} else {
    console.log("Markers not found");
}
