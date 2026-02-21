
import React, { useState, useEffect } from 'react';
import { Project, Track, LicenseInfo } from '../types';
import { X, Check, ShoppingCart, Disc, Play, Info, Box, Gem } from 'lucide-react';

interface PurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    initialTrackId?: string | null;
    initialCartItem?: any; // Allow passing the existing item for editing
    onAddToCart: (item: any) => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, project, initialTrackId, initialCartItem, onAddToCart }) => {
    // Initialize with ID of first license or its index fallback
    const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>(() => {
        if (initialCartItem?.trackId) return [initialCartItem.trackId];
        return initialTrackId ? [initialTrackId] : [];
    });

    const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(() => {
        if (initialCartItem?.licenseId) return initialCartItem.licenseId;
        return project.licenses?.[0]?.id || (project.licenses?.length ? 'license-0' : null);
    });

    // Reset state when modal opens with new props
    useEffect(() => {
        if (isOpen) {
            if (initialCartItem) {
                if (initialCartItem.trackId) setSelectedTrackIds([initialCartItem.trackId]);
                if (initialCartItem.licenseId) setSelectedLicenseId(initialCartItem.licenseId);
            } else {
                setSelectedTrackIds(initialTrackId ? [initialTrackId] : []);
                // If not editing, default to first license if none selected
                if (!selectedLicenseId) {
                    setSelectedLicenseId(project.licenses?.[0]?.id || (project.licenses?.length ? 'license-0' : null));
                }
            }
            setIsAdded(false);
        }
    }, [isOpen, initialCartItem, initialTrackId, project]);

    // State for tracks where user specifically requested stems
    const [wantsStems, setWantsStems] = useState<Record<string, boolean>>({});
    const [isAdded, setIsAdded] = useState(false);

    // Find the currently selected license object
    const selectedLicense = project.licenses?.find((l, i) => (l.id || `license-${i}`) === selectedLicenseId);

    // Helper: Find best license that includes stems
    const stemsLicense = project.licenses?.find(l => (l.fileTypesIncluded || []).map(t => t.toUpperCase()).includes('STEMS'))
        || project.licenses?.slice().reverse().find(l => (l.fileTypesIncluded || []).map(t => t.toUpperCase()).includes('STEMS')); // Fallback to any stems license

    const toggleTrack = (id: string) => {
        setSelectedTrackIds(prev =>
            prev.includes(id)
                ? prev.filter(tid => tid !== id)
                : [...prev, id]
        );
    };

    const toggleStems = (trackId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setWantsStems(prev => {
            const newState = { ...prev, [trackId]: !prev[trackId] };

            // If turning stems ON, and track not selected, select it
            if (newState[trackId] && !selectedTrackIds.includes(trackId)) {
                setSelectedTrackIds(curr => [...curr, trackId]);
            }
            return newState;
        });
    };

    // Calculate Total
    const calculateTotal = () => {
        if (!selectedLicense) return 0;

        let total = 0;
        const count = project.type === 'beat_tape' ? Math.max(selectedTrackIds.length, 0) : 1;

        if (project.type === 'beat_tape') {
            selectedTrackIds.forEach(tid => {
                if (wantsStems[tid] && stemsLicense) {
                    total += stemsLicense.price;
                } else {
                    total += selectedLicense.price;
                }
            });
        } else {
            total = selectedLicense.price * count;
        }
        return total;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-6 animate-in fade-in duration-200">
            <div className="w-full max-w-6xl bg-[#050505] rounded-none md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-full md:h-auto md:max-h-[85vh] md:m-auto">

                {/* Left Side: Project/Track Info */}
                <div className="w-full md:w-[380px] bg-[#0a0a0a] p-4 md:p-8 flex flex-col shrink-0">
                    <div className="hidden md:block aspect-square w-full bg-[#050505] rounded-3xl mb-6 relative overflow-hidden shrink-0">
                        {/* Gems Overlay (Desktop) */}
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md">
                            <Gem size={10} className="text-primary" />
                            <span className="text-[9px] font-bold text-white font-mono">
                                {project.gems !== undefined ? project.gems.toLocaleString() : 0}
                            </span>
                        </div>
                        {project.producerAvatar || project.coverImage ? (
                            <img src={project.producerAvatar || project.coverImage} className="w-full h-full object-cover" alt="Cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-700 bg-dot-grid">
                                <Disc size={48} className="opacity-20" />
                            </div>
                        )}
                    </div>

                    <div className="mb-4 md:mb-6">
                        <div className="flex justify-between items-start md:block">
                            <div>
                                <h2 className="text-lg md:text-xl font-black text-white mb-1 leading-tight line-clamp-1 md:line-clamp-2">{project.title}</h2>
                                <p className="text-xs md:text-sm text-neutral-500 font-mono">by {project.producer}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 md:hidden">
                                <button onClick={onClose} className="p-2 -mr-2 text-neutral-500 hover:text-white">
                                    <X size={20} />
                                </button>
                                {/* Gems (Mobile - Top Right) */}
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5">
                                    <Gem size={10} className="text-primary" />
                                    <span className="text-[9px] font-bold text-neutral-300 font-mono">
                                        {project.gems !== undefined ? project.gems.toLocaleString() : 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex justify-between items-center mb-2 md:mb-3">
                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Select Items {project.type === 'beat_tape' && `(${selectedTrackIds.length})`}</h3>
                            {project.type === 'beat_tape' && (
                                <button
                                    onClick={() => {
                                        if (selectedTrackIds.length === project.tracks.length) {
                                            setSelectedTrackIds([]);
                                        } else {
                                            setSelectedTrackIds(project.tracks.map((t, idx) => t.id || `track-${idx}`));
                                        }
                                    }}
                                    className={`
                                        text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full transition-all duration-300 border
                                        ${selectedTrackIds.length === project.tracks.length
                                            ? 'bg-primary text-black border-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]'
                                            : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white hover:bg-white/10 hover:border-white/20'
                                        }
                                    `}
                                >
                                    {selectedTrackIds.length === project.tracks.length ? 'Deselect All' : 'Select All'}
                                </button>
                            )}
                        </div>

                        <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 space-y-1 max-h-[150px] md:max-h-none">
                            {project.type === 'beat_tape' && (
                                <>
                                    {project.tracks.map((track, idx) => {
                                        const trackId = track.id || `track-${idx}`;
                                        const isSelected = selectedTrackIds.includes(trackId);
                                        const hasStems = !!track.files?.stems || !!track.stemsIncluded; // Check if stems exist or flagged
                                        const stemsSelected = !!wantsStems[trackId];

                                        return (
                                            <div
                                                key={trackId}
                                                onClick={() => toggleTrack(trackId)}
                                                className={`
                                                    flex items-center gap-3 p-2 md:p-3 rounded-2xl cursor-pointer transition-all
                                                    ${isSelected
                                                        ? 'bg-white/10'
                                                        : 'bg-transparent hover:bg-white/5'
                                                    }
                                                `}
                                            >
                                                <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-black' : 'bg-white/10 text-transparent'}`}>
                                                    {isSelected && <Check size={10} className="text-black" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-xs md:text-base font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-400'}`}>
                                                        {track.title}
                                                    </div>
                                                    <div className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                                                        {hasStems ? 'Stems Available' : 'No Stems'}
                                                    </div>
                                                </div>

                                                {/* Stems Checkbox / Indicator */}
                                                {hasStems && (
                                                    <div
                                                        onClick={(e) => toggleStems(trackId, e)}
                                                        className={`
                                                            flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase transition-all
                                                            ${stemsSelected
                                                                ? 'bg-purple-500/20 text-purple-400'
                                                                : 'bg-white/10 text-neutral-500 hover:text-neutral-300'
                                                            }
                                                        `}
                                                        title={stemsSelected ? "Stems included (+Premium Price)" : "Add Stems"}
                                                    >
                                                        <Box size={10} />
                                                        <span>Stems</span>
                                                        {stemsSelected && <Check size={8} />}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {project.type === 'sound_pack' && (
                                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                                    <div className="text-xs font-bold text-white">Full Soundpack</div>
                                    <div className="text-[10px] text-primary/70 mt-1">Includes all {project.tracks.length} items</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Licenses */}
                <div className="flex-1 bg-[#050505] p-4 md:p-6 flex flex-col overflow-hidden">
                    <div className="hidden md:flex justify-between items-start mb-6 shrink-0">
                        <div>
                            <h3 className="text-lg font-bold text-white">Select License</h3>
                            <p className="text-xs text-neutral-500">Choose the rights that fit your needs.</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1 md:pr-2 pb-4">
                        <h3 className="md:hidden text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Select License</h3>
                        {project.licenses?.map((license, i) => {
                            const licenseId = license.id || `license-${i}`;
                            const isSelected = selectedLicenseId === licenseId;

                            // Sales Badging Logic
                            let badge = null;
                            const isHighestTier = i === (project.licenses?.length || 0) - 1;
                            const isMidTier = i === 1 && (project.licenses?.length || 0) >= 3;

                            if (license.type === 'UNLIMITED' || license.name?.toLowerCase().includes('unlimited')) {
                                badge = 'Best Value';
                            } else if (isMidTier) {
                                badge = 'Most Popular';
                            } else if (isHighestTier) {
                                badge = 'Pro Choice';
                            }


                            // Label & Style Determination
                            const nameUpper = (license.name || '').toUpperCase();
                            const typeUpper = (license.type || '').toUpperCase();

                            // Default Label based on Hierarchy (Heuristic)
                            let label = 'STANDARD LEASE';
                            let Icon = Disc;

                            // 1. Keyword Overrides (Strongest signal)
                            if (nameUpper.includes('UNLIMITED') || typeUpper === 'UNLIMITED') label = 'UNLIMITED LEASE';
                            else if (nameUpper.includes('TRACKOUT')) label = 'TRACKOUT LEASE';
                            else if (nameUpper.includes('STEMS')) label = 'STEMS LEASE';
                            else if (nameUpper.includes('PREMIUM')) label = 'PREMIUM LEASE';
                            else if (nameUpper.includes('BASIC') || nameUpper.includes('STARTER')) label = 'BASIC LEASE';
                            else if (nameUpper.includes('EXCLUSIVE')) label = 'EXCLUSIVE LEASE';
                            else {
                                // 2. Position Heuristic (Fallback if names are generic like "Lease 1")
                                const total = project.licenses?.length || 0;
                                if (i === 0) label = 'STARTER LEASE';
                                else if (i === total - 1 && total > 1) label = 'UNLIMITED LEASE';
                                else if (i === 1) label = 'PROFESSIONAL LEASE';
                            }

                            // Styling based on determined label
                            const isUnlimited = ['UNLIMITED', 'TRACKOUT', 'STEMS', 'EXCLUSIVE'].some(k => label.includes(k));
                            const isPro = ['PREMIUM', 'PROFESSIONAL'].some(k => label.includes(k));

                            let styleClass = 'bg-neutral-800 text-neutral-400 border border-neutral-700';

                            if (isUnlimited) {
                                styleClass = 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
                                Icon = Box;
                            } else if (isPro) {
                                styleClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                            }

                            if (isSelected) {
                                styleClass = 'bg-white text-black border border-white'; // High contrast for selection
                            }

                            return (
                                <div
                                    key={licenseId}
                                    onClick={() => setSelectedLicenseId(licenseId)}
                                    className={`
                                        relative group cursor-pointer transition-all duration-200 rounded-2xl overflow-hidden mb-3
                                        ${isSelected
                                            ? 'bg-white/10'
                                            : 'bg-[#0a0a0a] hover:bg-white/5'
                                        }
                                    `}
                                >
                                    {/* Badge - Clean Banner */}
                                    {badge && (
                                        <div className={`
                                            w-full text-center py-1 text-[9px] font-bold uppercase tracking-widest
                                            ${isSelected ? 'bg-primary text-black' : 'bg-black/20 text-neutral-500'}
                                        `}>
                                            {badge}
                                        </div>
                                    )}

                                    <div className="p-4">
                                        <div className="flex justify-between items-center mb-4 relative z-10">
                                            <div className="flex-1 mr-4">
                                                {/* Premium Left Border Accent */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isUnlimited ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' :
                                                    isPro ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' :
                                                        'bg-neutral-600'
                                                    } ${isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`} />

                                                <div className="pl-4">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Icon size={18} className={`${isSelected ? 'text-current' : isUnlimited ? 'text-purple-400' : isPro ? 'text-blue-400' : 'text-neutral-500'}`} />
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'opacity-80' : 'text-neutral-500'}`}>
                                                            {label.replace(' LEASE', '')} TIER
                                                        </span>
                                                    </div>
                                                    <h4 className={`text-xl md:text-2xl font-black uppercase tracking-tighter leading-none ${isSelected ? 'text-current' : 'text-white'}`}>
                                                        {license.name || label}
                                                    </h4>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end pl-4">
                                                <div className={`text-2xl md:text-3xl font-black font-mono tracking-tighter ${isSelected ? 'text-current' : isUnlimited ? 'text-purple-400' : isPro ? 'text-blue-400' : 'text-white'}`}>
                                                    ${license.price}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Features List - Minimalist */}
                                        <div className="w-full pt-3">
                                            <ul className="space-y-1.5">
                                                {(license.features || []).map((feat, j) => (
                                                    <li key={j} className="flex items-start gap-2 text-[11px] text-neutral-400 group-hover:text-neutral-300 transition-colors">
                                                        <div className={`mt-0.5 shrink-0 ${isSelected ? 'text-primary' : 'text-neutral-600'}`}>
                                                            <Check size={10} />
                                                        </div>
                                                        <span className="leading-tight">{feat}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-4 md:pt-6 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 bg-[#050505]">
                        <div className="hidden md:flex items-center gap-2 text-neutral-500 hover:text-white cursor-pointer">
                            <Info size={14} />
                            <span className="text-xs underline">Read Full License Agreement</span>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="text-right flex-1 md:flex-none">
                                <div className="text-[10px] text-neutral-500 uppercase font-bold">
                                    {selectedLicense ? (selectedLicense.name || `${selectedLicense.type || 'Standard'} License`) : 'Total'}
                                </div>
                                <div className="text-xl font-mono font-black text-white">
                                    ${calculateTotal().toFixed(2)}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (selectedLicense) {
                                        setIsAdded(true);
                                        if (project.type === 'beat_tape') {
                                            selectedTrackIds.forEach(trackId => {
                                                const track = project.tracks.find((t, idx) => (t.id || `track-${idx}`) === trackId);
                                                const effectiveLicense = (wantsStems[trackId] && stemsLicense) ? stemsLicense : selectedLicense;

                                                console.log('Adding to cart with contractId:', effectiveLicense.contractId);
                                                onAddToCart({
                                                    // If editing, use existing ID to replacing it, OR create new ID if user wants that...
                                                    // But here we want to replace.
                                                    // IMPORTANT: If we are editing, we should pass back the SAME ID so the context knows to replace.
                                                    // However, the logic below constructs a NEW item.
                                                    // We probably want to return a new object but with the OLD ID if we are editing.
                                                    id: initialCartItem ? initialCartItem.id : `${project.id}-${trackId}-${effectiveLicense.id}-${Date.now()}`,
                                                    title: track ? `${track.title} (${project.title})` : project.title,
                                                    type: effectiveLicense.name?.toUpperCase().includes('EXCLUSIVE') ? 'Exclusive License' : 'Lease License',
                                                    price: effectiveLicense.price,
                                                    sellerName: project.producer,
                                                    sellerHandle: '@' + project.producer,
                                                    sellerAvatar: project.producerAvatar,
                                                    sellerId: project.userId, // Correctly populate sellerId
                                                    licenseType: effectiveLicense.name,
                                                    projectId: project.id,
                                                    trackId: trackId,
                                                    licenseId: effectiveLicense.id || undefined,
                                                    contractId: effectiveLicense.contractId // Map contractId from license
                                                });
                                            });
                                        } else {
                                            console.log('Adding pack to cart with contractId:', selectedLicense.contractId);
                                            onAddToCart({
                                                id: initialCartItem ? initialCartItem.id : `${project.id}-pack-${selectedLicense.id}-${Date.now()}`,
                                                title: project.title,
                                                type: 'Sound Kit',
                                                price: selectedLicense.price,
                                                sellerName: project.producer,
                                                sellerHandle: '@' + project.producer,
                                                sellerAvatar: project.producerAvatar,
                                                sellerId: project.userId, // Correctly populate sellerId
                                                licenseType: selectedLicense.name,
                                                projectId: project.id,
                                                licenseId: selectedLicenseId || undefined,
                                                contractId: selectedLicense.contractId // Map contractId from license
                                            });
                                        }

                                        setTimeout(() => {
                                            onClose();
                                            setTimeout(() => setIsAdded(false), 500);
                                        }, 800);
                                    }
                                }}
                                disabled={(project.type === 'beat_tape' && selectedTrackIds.length === 0) || !selectedLicenseId || isAdded}
                                className={`
                                        flex-1 md:flex-none px-4 py-2 text-sm md:px-8 md:py-3 md:text-base font-bold rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed
                                        ${isAdded
                                        ? 'bg-green-500/10 text-green-500 scale-95'
                                        : 'bg-primary text-black hover:bg-primary/90'
                                    }
                                    `}
                            >
                                {isAdded ? (
                                    <>
                                        <Check size={16} className="md:w-5 md:h-5" />
                                        <span>{initialCartItem ? 'Cart Updated!' : 'Added to Cart!'}</span>
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={16} className="md:w-5 md:h-5" />
                                        <span>{initialCartItem ? 'Update Cart' : 'Add to Cart'} {project.type === 'beat_tape' && selectedTrackIds.length > 0 && `(${selectedTrackIds.length})`}</span>
                                    </>
                                )}
                            </button>

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PurchaseModal;
