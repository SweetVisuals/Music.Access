
import React, { useState } from 'react';
import { Service, UserProfile } from '../types';
import { X, Check, ShoppingCart, MessageSquare, AlertCircle } from 'lucide-react';

interface ServiceBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    service: Service;
    user: UserProfile | { username: string; handle?: string; avatar?: string; avatar_url?: string; } | null;
    onAddToCart: (item: any, notes: string) => void;
}

const ServiceBookingModal: React.FC<ServiceBookingModalProps> = ({
    isOpen,
    onClose,
    service,
    user,
    onAddToCart
}) => {
    const [notes, setNotes] = useState('');
    const [hasMessaged, setHasMessaged] = useState(false);
    const [isAdded, setIsAdded] = useState(false);

    if (!isOpen) return null;

    const handleAddToCart = () => {
        setIsAdded(true);
        onAddToCart(service, notes);

        setTimeout(() => {
            onClose();
            // Reset state
            setTimeout(() => {
                setIsAdded(false);
                setNotes('');
                setHasMessaged(false);
            }, 500);
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#0a0a0a] border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-neutral-900/50 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-black text-white leading-tight mb-1">{service.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <span>by {user?.username || 'Unknown'}</span>
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider">
                                {service.rateType === 'hourly' ? 'Hourly Rate' : 'Flat Rate'}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-neutral-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* Price Tag */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-900 border border-white/5">
                        <div className="text-sm font-bold text-neutral-400 uppercase tracking-wide">Total Price</div>
                        <div className="text-3xl font-black text-white font-mono tracking-tighter">
                            ${service.price}
                        </div>
                    </div>

                    {/* Warning / Verification */}
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-3">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-yellow-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-200/80 leading-relaxed">
                                <strong className="text-yellow-500 block mb-1">Before you book:</strong>
                                Have you discussed this project with the seller? It's highly recommended to agree on requirements and timeline first.
                            </div>
                        </div>

                        <label className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-white/5 cursor-pointer hover:bg-black/40 transition-colors">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasMessaged ? 'bg-yellow-500 border-yellow-500' : 'border-neutral-600'}`}>
                                {hasMessaged && <Check size={14} className="text-black" />}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={hasMessaged}
                                onChange={(e) => setHasMessaged(e.target.checked)}
                            />
                            <span className={`text-sm font-bold ${hasMessaged ? 'text-white' : 'text-neutral-500'}`}>
                                Yes, I have messaged {user?.username || 'the seller'}
                            </span>
                        </label>
                    </div>

                    {/* Notes Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider pl-1">Project Details / Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full h-32 bg-neutral-900/50 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-primary/50 focus:bg-neutral-900 transition-all resize-none"
                            placeholder="Describe your project, link to demos, or list specific requirements..."
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-neutral-900/30">
                    <button
                        onClick={handleAddToCart}
                        disabled={!hasMessaged || isAdded}
                        className={`
                            w-full py-4 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2
                            ${isAdded
                                ? 'bg-green-500 text-white scale-95 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                                : hasMessaged
                                    ? 'bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:scale-[1.02]'
                                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            }
                        `}
                    >
                        {isAdded ? (
                            <>
                                <Check size={18} />
                                <span>Added to Cart!</span>
                            </>
                        ) : (
                            <>
                                <ShoppingCart size={18} />
                                <span>Add to Cart - ${service.price}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ServiceBookingModal;
