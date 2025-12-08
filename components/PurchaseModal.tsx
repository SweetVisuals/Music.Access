
import React, { useState } from 'react';
import { Project, Track, LicenseInfo } from '../types';
import { X, Check, ShoppingCart, Disc, Play, Info } from 'lucide-react';

interface PurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project;
    initialTrackId?: string | null;
    onAddToCart: (item: any) => void;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ isOpen, onClose, project, initialTrackId, onAddToCart }) => {
    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(initialTrackId || null);
    const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(project.licenses?.[0]?.id || null);

    const selectedLicense = project.licenses?.find(l => l.id === selectedLicenseId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] md:max-h-[80vh]">

                {/* Left Side: Project/Track Info - Hidden Image on Mobile to save space */}
                <div className="w-full md:w-1/3 bg-neutral-950 p-4 md:p-6 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col shrink-0">
                    <div className="hidden md:block aspect-square w-full bg-neutral-900 rounded-xl mb-6 border border-white/5 relative overflow-hidden shrink-0">
                        {project.coverImage ? (
                            <img src={project.coverImage} className="w-full h-full object-cover" alt="Cover" />
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
                            <button onClick={onClose} className="md:hidden p-2 -mr-2 text-neutral-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col">
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2 md:mb-3">Select Item</h3>

                        <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 space-y-1 max-h-[150px] md:max-h-none">
                            {project.type === 'beat_tape' && (
                                <>
                                    {project.tracks.map(track => (
                                        <div
                                            key={track.id}
                                            onClick={() => setSelectedTrackId(track.id)}
                                            className={`
                                                flex items-center gap-3 p-2 md:p-3 rounded-lg cursor-pointer transition-all border
                                                ${selectedTrackId === track.id
                                                    ? 'bg-primary/10 border-primary/30'
                                                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                                                }
                                            `}
                                        >
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ${selectedTrackId === track.id ? 'border-primary bg-primary' : 'border-neutral-600'}`}>
                                                {selectedTrackId === track.id && <div className="w-1.5 h-1.5 bg-black rounded-full"></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-xs font-bold truncate ${selectedTrackId === track.id ? 'text-white' : 'text-neutral-400'}`}>
                                                    {track.title}
                                                </div>
                                            </div>
                                            <button className="p-1 text-neutral-500 hover:text-white"><Play size={10} /></button>
                                        </div>
                                    ))}
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
                <div className="flex-1 bg-[#0a0a0a] p-4 md:p-6 flex flex-col overflow-hidden">
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
                        {project.licenses?.map(license => (
                            <div
                                key={license.id}
                                onClick={() => setSelectedLicenseId(license.id)}
                                className={`
                                    p-4 md:p-5 rounded-xl border cursor-pointer transition-all relative group
                                    ${selectedLicenseId === license.id
                                        ? 'bg-neutral-900 border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]'
                                        : 'bg-black border-neutral-800 hover:border-neutral-600'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start mb-2 md:mb-3">
                                    <h4 className={`text-sm md:text-base font-bold ${selectedLicenseId === license.id ? 'text-primary' : 'text-white'}`}>
                                        {license.name}
                                    </h4>
                                    <div className="text-base md:text-lg font-mono font-bold text-white">${license.price}</div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-3">
                                    {license.fileTypesIncluded.map(ft => (
                                        <span key={ft} className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-neutral-400">{ft}</span>
                                    ))}
                                </div>

                                <ul className="space-y-1 md:space-y-1.5">
                                    {license.features.slice(0, 3).map((feat, i) => (
                                        <li key={i} className="flex items-center gap-2 text-[10px] md:text-xs text-neutral-400">
                                            <Check size={12} className={selectedLicenseId === license.id ? 'text-primary' : 'text-neutral-600'} />
                                            {feat}
                                        </li>
                                    ))}
                                </ul>

                                {selectedLicenseId === license.id && (
                                    <div className="absolute top-1/2 right-4 -translate-y-1/2 hidden md:block">
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-black">
                                            <Check size={14} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-4 md:pt-6 border-t border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 bg-[#0a0a0a]">
                        <div className="hidden md:flex items-center gap-2 text-neutral-500 hover:text-white cursor-pointer">
                            <Info size={14} />
                            <span className="text-xs underline">Read Full License Agreement</span>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="text-right flex-1 md:flex-none">
                                <div className="text-[10px] text-neutral-500 uppercase font-bold">Total</div>
                                <div className="text-xl font-mono font-black text-white">
                                    ${(selectedLicense?.price || 0).toFixed(2)}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (selectedLicense) {
                                        onAddToCart({
                                            id: project.id, // Using project ID as the main ID for now, or track ID if selected? 
                                            // The mock logic in TopBar seemed to suggest simpler structure.
                                            // But CartItem interface is strict. Let's see what we can do.
                                            // CartItem: { id, title, type, price, sellerName, sellerHandle, licenseType ... }
                                            // Real implementation should probably have better ID strategy.
                                            // For now, let's form a CartItem compatible object.
                                            title: project.title,
                                            type: project.type === 'beat_tape' ? 'Exclusive License' : 'Sound Kit', // Simplified
                                            price: selectedLicense.price,
                                            sellerName: project.producer,
                                            sellerHandle: '@' + project.producer, // Mock handle if not available
                                            licenseType: selectedLicense.name,
                                            // Extra data needed for purchases later?
                                            // To make createPurchase work, adding extra fields we might need
                                            projectId: project.id,
                                            trackId: selectedTrackId,
                                            licenseId: selectedLicenseId
                                        });
                                        onClose();
                                    }
                                }}
                                className="flex-1 md:flex-none px-6 md:px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                <ShoppingCart size={16} />
                                <span>Add to Cart</span>
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PurchaseModal;
