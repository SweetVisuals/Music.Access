import React from 'react';
import { Clock, Check, ArrowRight, User, Shield, Zap, Star, Sparkles } from 'lucide-react';
import { Service, UserProfile } from '../types';

interface ServiceCardProps {
    service: Service | Partial<Service>;
    user: UserProfile | null;
    onClick?: () => void; // For booking/viewing details
    isPreview?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, user, onClick, isPreview = false }) => {
    // Fallbacks for preview mode
    const title = service.title || 'Professional Service Title';
    const description = service.description || 'Service description will appear here. This is a preview of your offering.';
    const price = service.price || 0;
    const rateType = service.rateType || 'flat';
    const deliveryDays = service.deliveryDays || 3;
    const features = service.features || [];

    return (
        <div
            onClick={onClick}
            className={`
                group relative w-full flex flex-col
                bg-[#050505] border border-transparent rounded-3xl overflow-hidden
                transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${!isPreview ? 'hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7),0_0_20px_rgba(var(--primary-rgb),0.1)] cursor-pointer' : 'cursor-default'}
            `}
        >
            {/* 1. Header: Primary Focus (Price & Delivery) */}
            <div className="relative p-6 pb-4 overflow-hidden border-b border-transparent">
                {/* Dynamic Aura Background */}
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/20 blur-[80px] rounded-full group-hover:bg-primary/40 transition-all duration-700"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 blur-[50px] rounded-full opacity-50"></div>

                <div className="relative z-10 flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                            Active Listing
                        </span>
                        <div className="flex items-center gap-2 text-neutral-400">
                            <Clock size={12} className="text-white/40" />
                            <span className="text-[10px] font-bold tracking-wide uppercase">{deliveryDays} Day Turnaround</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="flex items-start gap-1">
                            <span className="text-xl font-black text-primary mt-1 opacity-80">$</span>
                            <span className="text-6xl font-black text-white tracking-[0.05em] leading-[0.8]">
                                {price}
                            </span>
                        </div>
                        {rateType === 'hourly' && (
                            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1">Flat Rate</span>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Body: Description & Details */}
            <div className="relative flex-1 p-6 pt-4 flex flex-col h-full bg-neutral-900/10">
                <h3 className="text-xl font-black text-white leading-[1.1] mb-0.5 group-hover:text-primary transition-colors duration-300">
                    {title}
                </h3>

                <p className="text-sm text-neutral-400 leading-relaxed mb-6 opacity-80 line-clamp-2">
                    {description}
                </p>

                {/* Features: Value Propositions */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {features.length > 0 ? (
                        features.slice(0, 3).map((feat, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white/[0.03] border border-transparent px-3 py-1.5 rounded-full">
                                <Sparkles size={10} className="text-primary/70" />
                                <span className="text-[10px] text-neutral-300 font-bold uppercase tracking-tight">{feat}</span>
                            </div>
                        ))
                    ) : (
                        <div className="text-[10px] text-neutral-600 font-mono italic">Standard inclusions apply</div>
                    )}
                </div>

                {/* 3. Footer: Trust & CTA */}
                <div className="mt-auto flex items-center justify-between pt-6 border-t border-transparent">
                    <div className="flex items-center gap-3">
                        <div className="relative group/avatar">
                            <div className="w-10 h-10 rounded-xl bg-neutral-800 border-2 border-transparent overflow-hidden transition-all duration-300 group-hover/avatar:border-primary/50">
                                {user?.avatar_url || user?.avatar ? (
                                    <img src={user?.avatar_url || user?.avatar} alt={user?.username || 'User'} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User size={16} className="text-neutral-500" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-white tracking-wide uppercase">{user?.username || 'Verified Creator'}</span>
                            <div className="flex items-center gap-1">
                                <Shield size={10} className="text-primary" />
                                <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-[0.1em]">Certified</span>
                            </div>
                        </div>
                    </div>

                    <button className="flex items-center gap-2 px-5 py-3 bg-white text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary transition-colors shadow-[0_10px_20px_-5px_rgba(255,255,255,0.1)] active:scale-95">
                        <span>Book</span>
                        <ArrowRight size={14} strokeWidth={3} />
                    </button>
                </div>
            </div>

            {/* Premium Glow Overlay */}
            <div className="absolute inset-0 ring-1 ring-inset ring-transparent rounded-3xl group-hover:ring-primary/20 pointer-events-none transition-all duration-500"></div>
        </div>
    );
};

export default ServiceCard;
