import React, { useState, useRef, useEffect } from 'react';
import {
    Search, Bell, Menu, User, Users, LogOut, Settings, Terminal, ShoppingBag,
    ArrowRight, ArrowLeft, Clock, Gem, Wallet, Eye, EyeOff, Palette, Star,
    Command, Sparkles, Music, Package, Mic, Info, X, ChevronDown, Trash2, Check, LayoutDashboard, Upload
} from 'lucide-react';
import type { Project, UserProfile, Notification, View } from '../types';
import MobileNotifications from './MobileNotifications';
import { useCart } from '../contexts/CartContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/supabaseService';
import { usePurchaseModal } from '../contexts/PurchaseModalContext';

interface TopBarProps {
    projects: Project[];
    currentView: View;
    onSearch: (query: string) => void;
    onNavigate: (view: View | string) => void;
    isLoggedIn: boolean;
    userProfile: UserProfile | null;
    onOpenAuth: () => void;
    onLogout: () => void;
    onClaimGems: () => void;
    gemsClaimedToday: boolean;
    profileLoading: boolean;
    onMenuClick: () => void;
    onToggleDiscoverView?: () => void;
    isDiscoverFeedMode?: boolean;
}

const RightActions: React.FC<{
    isLoggedIn: boolean;
    isFocused: boolean;
    mobileSearchOpen: boolean;
    currentView: View;
    userProfile: UserProfile | null;
    gemsClaimedToday: boolean;
    profileLoading: boolean;
    onClaimGems: () => void;
    onNavigate: (view: View | string) => void;
    showBalance: boolean;
    setShowBalance: (show: boolean) => void;
    isThemeOpen: boolean;
    setIsThemeOpen: (open: boolean) => void;
    handleThemeChange: (theme: string) => void;
    themeRef: React.RefObject<HTMLDivElement>;
    notifRef: React.RefObject<HTMLDivElement>;
    isNotificationsOpen: boolean;
    setIsNotificationsOpen: (open: boolean) => void;
    notifications: Notification[];
    handleMarkAllRead: () => void;
    handleMarkRead: (id: string) => void;
    cartRef: React.RefObject<HTMLDivElement>;
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
    cartItems: any[];
    cartTotal: number;
    removeFromCart: (id: string) => void;
    dropdownRef: React.RefObject<HTMLDivElement>;
    isProfileOpen: boolean;
    setIsProfileOpen: (open: boolean) => void;
    onOpenAuth: () => void;
    onLogout: () => void;
    isSpacer?: boolean;
    onMobileSearchOpen?: () => void;
    isCartAnimating?: boolean;
    projects: Project[];
    handleNotificationClick: (notification: Notification) => void;
    onToggleDiscoverView?: () => void;
    isDiscoverFeedMode?: boolean;
}> = ({
    isLoggedIn, isFocused, mobileSearchOpen, currentView, userProfile,
    gemsClaimedToday, profileLoading, onClaimGems, onNavigate,
    showBalance, setShowBalance, isThemeOpen, setIsThemeOpen, handleThemeChange,
    themeRef, notifRef, isNotificationsOpen, setIsNotificationsOpen, notifications,
    handleMarkAllRead, handleMarkRead, cartRef, isCartOpen, setIsCartOpen, cartItems,
    cartTotal, removeFromCart, dropdownRef, isProfileOpen, setIsProfileOpen,
    onOpenAuth, onLogout, isSpacer = false, onMobileSearchOpen, isCartAnimating, projects,
    handleNotificationClick, onToggleDiscoverView, isDiscoverFeedMode
}) => {
        const { openPurchaseModal } = usePurchaseModal();

        const [isMobile, setIsMobile] = useState(false);

        useEffect(() => {
            const checkMobile = () => setIsMobile(window.innerWidth < 1024);
            checkMobile(); // Check on mount
            window.addEventListener('resize', checkMobile);
            return () => window.removeEventListener('resize', checkMobile);
        }, []);

        // Spacer helper: makes content invisible and non-interactive
        // Spacer helper: makes content invisible and non-interactive
        const visibilityClasses = (mobileSearchOpen || isSpacer)
            ? 'opacity-0 pointer-events-none select-none'
            : 'opacity-100';

        const transformClasses = mobileSearchOpen ? 'translate-x-8' : 'translate-x-0';

        return (
            <div className={`flex items-center justify-end gap-2 sm:gap-3 z-40 h-full shrink-0 transition-all duration-300 ${transformClasses} ${visibilityClasses}`}>


                {/* Group 1: Balances */}
                {isLoggedIn && (
                    <div className={`hidden ${currentView === 'notes' ? 'lg:flex' : 'sm:flex'} items-center gap-2`}>
                        {/* Daily Claim Button */}
                        {!gemsClaimedToday && !profileLoading && userProfile && (
                            <button
                                onClick={isSpacer ? undefined : onClaimGems}
                                className="group relative h-9 px-4 flex items-center gap-2.5 bg-primary/5 hover:bg-primary/10 border border-transparent hover:border-primary/30 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden shadow-[0_0_5px_rgb(var(--primary)/0.05)] hover:shadow-[0_0_10px_rgb(var(--primary)/0.1)]"
                            >
                                <div className="absolute inset-0 bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <Gem size={13} className="text-primary relative z-10 animate-[pulse_3s_infinite]" />
                                <span className="text-[10px] font-black tracking-widest text-primary font-mono uppercase relative z-10 ml-0.5">CLAIM</span>
                            </button>
                        )}



                        {/* Upload Button */}
                        <button
                            onClick={isSpacer ? undefined : () => onNavigate('upload')}
                            className="group h-9 px-3.5 flex items-center gap-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-white/10 rounded-xl transition-all duration-300 cursor-pointer"
                        >
                            <Upload size={13} className="text-primary/70 group-hover:text-primary transition-colors" />
                            <div className="flex flex-col items-start justify-center h-full pt-0.5">
                                <span className="text-[10px] sm:text-[11px] font-bold text-neutral-300 group-hover:text-white font-mono leading-none transition-colors">
                                    UPLOAD
                                </span>
                            </div>
                        </button>

                        {/* Gem Balance */}
                        <div
                            onClick={isSpacer ? undefined : () => onNavigate('dashboard-wallet')}
                            className="group h-9 px-3.5 flex items-center gap-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-white/10 rounded-xl transition-all duration-300 cursor-pointer"
                        >
                            <Gem size={13} className="text-primary/70 group-hover:text-primary transition-colors" />
                            <div className="flex flex-col items-start justify-center h-full pt-0.5">
                                <span className="text-[10px] sm:text-[11px] font-bold text-neutral-300 group-hover:text-white font-mono leading-none transition-colors">
                                    {userProfile?.gems !== undefined ? userProfile.gems.toLocaleString() : '0'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}


                {/* Discover View Toggle (Moved to Profile Dropdown) */}

                <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block"></div>

                {/* Right Side Icons & Profile Wrapper */}
                <div className="flex items-center gap-1">
                    {/* Group 2: Icons */}
                    <div className={`flex items-center gap-1 ${currentView === 'notes' ? 'hidden lg:flex' : ''}`}>
                        {/* Mobile Search Icon */}
                        <button
                            onClick={isSpacer ? undefined : onMobileSearchOpen}
                            className="lg:hidden p-2 text-neutral-400 hover:text-white"
                        >
                            <Search size={18} />
                        </button>

                        {/* Color Picker */}
                        <div className="relative" ref={isSpacer ? null : themeRef}>
                            <button
                                onClick={isSpacer ? undefined : () => setIsThemeOpen(!isThemeOpen)}
                                className={`p-2 rounded-xl transition-all duration-200 ${isThemeOpen && !isSpacer ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Palette size={16} />
                            </button>
                            {isThemeOpen && !isSpacer && (
                                <div className="absolute right-0 top-full mt-3 w-56 p-4 rounded-2xl border border-transparent bg-[#0a0a0a] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="text-[10px] font-black font-mono text-neutral-500 uppercase mb-3 px-1 tracking-widest">Accent Color</div>
                                    <div className="grid grid-cols-5 gap-3 px-1">
                                        {THEMES.map(theme => (
                                            <button
                                                key={theme.name}
                                                onClick={() => handleThemeChange(theme.value)}
                                                className="w-7 h-7 rounded-full border border-white/20 hover:scale-125 transition-all shadow-lg active:scale-95"
                                                style={{ backgroundColor: theme.color }}
                                                title={theme.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Notifications */}
                        {isLoggedIn && (
                            <div className="relative" ref={isSpacer ? null : notifRef}>
                                <button
                                    onClick={isSpacer ? undefined : () => setIsNotificationsOpen(!isNotificationsOpen)}
                                    className={`relative p-2 rounded-xl transition-all duration-200 ${isNotificationsOpen && !isSpacer ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Bell size={16} />
                                    {notifications.some(n => !n.read) && (
                                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse border border-[#050505]"></span>
                                    )}
                                </button>

                                {isNotificationsOpen && !isSpacer && (
                                    <>
                                        {/* Desktop Dropdown */}
                                        <div className="hidden lg:block absolute right-0 top-full mt-3 w-96 bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                                            <div className="p-5 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent flex justify-between items-center">
                                                <h3 className="text-xs font-black text-white tracking-widest uppercase flex items-center gap-2">
                                                    <Bell size={14} className="text-primary" /> Notifications
                                                </h3>
                                                {notifications.some(n => !n.read) && (
                                                    <button
                                                        onClick={handleMarkAllRead}
                                                        className="text-[10px] text-primary hover:text-white transition-colors font-bold uppercase tracking-wider bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md"
                                                    >
                                                        Mark all read
                                                    </button>
                                                )}
                                            </div>
                                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                                {notifications.filter(n => !n.read).length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                                        <div className="w-16 h-16 bg-neutral-900/50 rounded-full flex items-center justify-center text-neutral-600 mb-4 border border-white/5 shadow-inner">
                                                            <Check size={24} className="text-neutral-500" />
                                                        </div>
                                                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">All Caught Up</h4>
                                                        <p className="text-[11px] text-neutral-500 max-w-[200px] leading-relaxed">
                                                            You have no new notifications at the moment. Take a breather.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    notifications.filter(n => !n.read).map(notif => (
                                                        <div
                                                            key={notif.id}
                                                            onClick={() => handleNotificationClick(notif)}
                                                            className={`p-4 border-b border-white/5 hover:bg-white/[0.06] transition-all cursor-pointer group relative overflow-hidden ${!notif.read ? 'bg-primary/[0.02]' : ''}`}
                                                        >
                                                            {!notif.read && (
                                                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/50 shadow-[0_0_10px_rgb(var(--primary)/0.5)]"></div>
                                                            )}
                                                            <div className="flex gap-4">
                                                                <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${notif.type === 'sale' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : notif.type === 'system' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-primary shadow-[0_0_10px_rgb(var(--primary)/0.5)]'}`}></div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-sm font-bold text-white mb-1 leading-tight group-hover:text-primary transition-colors">{notif.title}</h4>
                                                                    <p className="text-xs text-neutral-400 leading-relaxed mb-3">{notif.message}</p>
                                                                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-mono tracking-wider font-bold uppercase">
                                                                        <Clock size={10} /> {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                            <div className="p-3 bg-[#050505] text-center border-t border-white/5">
                                                <button className="text-[10px] font-black text-neutral-500 hover:text-white transition-colors uppercase tracking-widest py-1 w-full rounded-lg hover:bg-white/5">View Activity Log</button>
                                            </div>
                                        </div>


                                    </>
                                )}
                            </div>
                        )}

                        {/* Cart Section */}
                        <div className="relative" ref={isSpacer ? null : cartRef}>
                            <button
                                onClick={isSpacer ? undefined : () => setIsCartOpen(!isCartOpen)}
                                className={`
                                relative p-2 rounded-xl transition-all duration-200 group 
                                ${isCartOpen && !isSpacer ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/10'}
                                ${isCartAnimating ? 'animate-[bounce_0.5s_ease-in-out]' : ''}
                            `}
                            >
                                <ShoppingBag size={16} className={`${isCartAnimating ? 'text-primary scale-110' : ''} transition-all duration-300`} />
                                {cartItems.length > 0 && (
                                    <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_rgb(var(--primary)/0.6)] border border-[#050505] ${isCartAnimating ? 'scale-150' : ''} transition-transform duration-300`}></span>
                                )}
                            </button>

                            {isCartOpen && !isSpacer && (
                                <div className="hidden lg:block absolute right-0 top-full mt-3 w-96 bg-[#0a0a0a] border border-transparent rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                        <h3 className="text-sm font-bold text-white tracking-tight">Your Cart ({cartItems.length})</h3>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-mono text-neutral-500 uppercase">Subtotal: ${cartTotal.toFixed(2)}</span>
                                            <span className="text-[11px] font-mono font-bold text-primary">Total: ${(cartTotal * 1.02).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {cartItems.length === 0 ? (
                                            <div className="p-12 text-center text-neutral-500 text-sm">Your cart is currently empty</div>
                                        ) : (
                                            cartItems.map((item: any) => {
                                                let TypeIcon = Music;
                                                if (item.type.includes('Sound Kit')) TypeIcon = Package;
                                                if (item.type.includes('Service') || item.type.includes('Mixing')) TypeIcon = Mic;

                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => {
                                                            const project = projects.find(p => p.id === item.projectId);
                                                            if (project) {
                                                                openPurchaseModal(project, item);
                                                                setIsCartOpen(false);
                                                            }
                                                        }}
                                                        className="p-4 border-b border-white/5 flex gap-4 hover:bg-white/5 transition-colors group items-center cursor-pointer"
                                                    >
                                                        <div className="relative shrink-0">
                                                            <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-400 group-hover:text-primary group-hover:bg-primary/10 transition-all overflow-hidden border border-white/5">
                                                                {item.sellerAvatar ? (
                                                                    <img src={item.sellerAvatar} alt={item.sellerName} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <TypeIcon size={20} />
                                                                )}
                                                            </div>
                                                            {item.sellerAvatar && (
                                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-black border border-white/10 rounded-full flex items-center justify-center text-primary shadow-lg">
                                                                    <TypeIcon size={10} />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <h4 className="text-sm font-bold text-white truncate max-w-[140px]">{item.title}</h4>
                                                                <span className="text-sm font-mono font-black text-primary">${item.price.toFixed(2)}</span>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[9px] font-black text-neutral-400 px-1 py-0.5 rounded bg-white/5 border border-white/5 uppercase tracking-tighter whitespace-nowrap shrink-0">
                                                                    {item.type}
                                                                </span>
                                                                {item.licenseType && (
                                                                    <span className="text-[9px] font-bold text-neutral-600 truncate max-w-[90px] uppercase tracking-tighter shrink-0">
                                                                        {item.licenseType}
                                                                    </span>
                                                                )}
                                                                <div className="flex-1"></div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeFromCart(item.id);
                                                                    }}
                                                                    className="text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 bg-white/5 rounded-md"
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="p-4 bg-neutral-900/80 border-t border-white/5">
                                        <button
                                            onClick={() => {
                                                setIsCartOpen(false);
                                                onNavigate('checkout');
                                            }}
                                            className="w-full py-3 bg-primary text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_10px_20px_rgba(0,255,163,0.15)]"
                                            disabled={cartItems.length === 0}
                                        >
                                            Go to Checkout <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mobile Nav Actions Portal Target */}
                    <div id="mobile-nav-actions" className="lg:hidden flex items-center gap-1"></div>

                    {/* Group 3: Profile */}
                    <div className="relative" ref={isSpacer ? null : dropdownRef}>
                        <button
                            onClick={isSpacer ? undefined : (isLoggedIn ? () => setIsProfileOpen(!isProfileOpen) : onOpenAuth)}
                            className="flex items-center gap-2 lg:gap-3 lg:pl-2 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-transparent overflow-hidden group-hover:border-primary/50 transition-all shadow-lg">
                                    {isLoggedIn && userProfile ? (
                                        <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-500 bg-neutral-900">
                                            <User size={14} />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isLoggedIn && <ChevronDown size={12} className="text-neutral-500 group-hover:text-white transition-colors" />}
                        </button>

                        {/* Profile Dropdown */}
                        {isLoggedIn && isProfileOpen && !isSpacer && (
                            <div className="absolute right-0 top-full mt-6 lg:mt-3 w-80 bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                                <div className="p-5 bg-white/[0.02]">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-neutral-800 border border-transparent overflow-hidden shrink-0">
                                            {userProfile?.avatar ? (
                                                <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-primary">
                                                    <User size={18} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-black text-white truncate tracking-tight">{userProfile?.username || 'User'}</div>
                                            <div className="text-xs text-neutral-400 truncate mt-0.5">{userProfile?.handle ? `@${userProfile.handle}` : 'musician'}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsProfileOpen(false); onNavigate(userProfile?.handle ? `@${userProfile.handle}` : 'profile'); }}
                                        className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-[11px] font-black text-primary uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_5px_15px_rgba(var(--primary)/0.1)]"
                                    >
                                        View Profile <ArrowRight size={13} />
                                    </button>
                                </div>
                                <div className="h-px bg-white/5 w-full"></div>
                                <div className="p-2 space-y-0.5">
                                    <button onClick={(e) => { e.stopPropagation(); setIsProfileOpen(false); onNavigate('dashboard-settings'); }} className="group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-all text-left font-medium">
                                        <div className="flex items-center gap-3">
                                            <Settings size={15} className="text-primary group-hover:scale-110 transition-transform" /> Account Settings
                                        </div>
                                    </button>

                                    <button onClick={(e) => { e.stopPropagation(); setIsProfileOpen(false); onNavigate('subscription'); }} className="group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-all text-left font-medium">
                                        <div className="flex items-center gap-3">
                                            <Wallet size={15} className="text-primary group-hover:scale-110 transition-transform" /> Subscription Plan
                                        </div>
                                        <span className="text-[9px] font-black text-black bg-[#e5e52a] px-1.5 py-0.5 rounded tracking-wider uppercase">PRO</span>
                                    </button>

                                    <button onClick={(e) => { e.stopPropagation(); setIsProfileOpen(false); onNavigate('collaborate'); }} className="group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-all text-left font-medium">
                                        <div className="flex items-center gap-3">
                                            <Users size={15} className="text-primary group-hover:scale-110 transition-transform" /> Team Management
                                        </div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                                    </button>

                                    <button onClick={(e) => { e.stopPropagation(); setIsProfileOpen(false); onNavigate('help'); }} className="group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-all text-left font-medium">
                                        <div className="flex items-center gap-3">
                                            <Info size={15} className="text-primary group-hover:scale-110 transition-transform" /> Help & Support
                                        </div>
                                    </button>

                                    {/* Discover View Toggle (Mobile Only) */}
                                    {isMobile && currentView === 'home' && onToggleDiscoverView && (
                                        <div className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors font-medium">
                                            <div className="flex items-center gap-3 group">
                                                {isDiscoverFeedMode ? <LayoutDashboard size={15} className="text-neutral-500 group-hover:text-white transition-colors" /> : (
                                                    <svg className="text-neutral-500 group-hover:text-white transition-colors" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                                        <line x1="12" y1="18" x2="12.01" y2="18" />
                                                    </svg>
                                                )}
                                                <span>Discover Feed</span>
                                            </div>
                                            <div className="flex bg-black p-1 rounded-lg border border-white/5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); !isDiscoverFeedMode && onToggleDiscoverView(); }}
                                                    className={`p-1 rounded-md transition-all duration-300 ${isDiscoverFeedMode ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-400'}`}
                                                    title="Feed View"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                                        <line x1="12" y1="18" x2="12.01" y2="18" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); isDiscoverFeedMode && onToggleDiscoverView(); }}
                                                    className={`p-1 rounded-md transition-all duration-300 ${!isDiscoverFeedMode ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-400'}`}
                                                    title="Grid View"
                                                >
                                                    <LayoutDashboard size={14} strokeWidth={2} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="h-px bg-white/5 w-full"></div>
                                <div className="p-2">
                                    <button onClick={(e) => { e.stopPropagation(); setIsProfileOpen(false); onLogout(); }} className="group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-all text-left font-medium">
                                        <div className="flex items-center gap-3">
                                            <LogOut size={15} className="text-red-500/70 group-hover:text-red-500 group-hover:scale-110 transition-all" /> Log Out
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

const THEMES = [
    { name: 'Midnight', value: 'midnight', color: '#1db954' },
    { name: 'Ocean', value: 'ocean', color: '#0ea5e9' },
    { name: 'Crimson', value: 'crimson', color: '#ef4444' },
    { name: 'Violet', value: 'violet', color: '#8b5cf6' },
    { name: 'Orange', value: 'orange', color: '#f97316' }
];

const hexToRgb = (hex: string): string | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : null;
};

const TopBar: React.FC<TopBarProps> = ({
    projects,
    currentView,
    onSearch,
    onNavigate,
    isLoggedIn,
    userProfile,
    onOpenAuth,
    onLogout,
    onClaimGems,
    gemsClaimedToday,
    profileLoading,
    onMenuClick,
    onToggleDiscoverView,
    isDiscoverFeedMode
}) => {
    // Hooks
    const { items: cartItems, cartTotal, isOpen: isCartOpen, setIsOpen: setIsCartOpen, removeFromCart } = useCart();

    // State
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [searchMode, setSearchMode] = useState<'find' | 'ai'>('find');
    const [searchValue, setSearchValue] = useState('');
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [showBalance, setShowBalance] = useState(false);
    const [isThemeOpen, setIsThemeOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isCartAnimating, setIsCartAnimating] = useState(false);
    const prevItemsLength = useRef(cartItems.length);

    // Refs
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const themeRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const cartRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Derived
    const placeholderText = searchMode === 'ai'
        ? (mobileSearchOpen ? "Ask AI..." : "Ask me anything (e.g., 'Find me trap beats under $30')...")
        : (mobileSearchOpen ? "Search..." : "Search for beats, producers, or kits...");

    // Trigger cart animation when items change
    useEffect(() => {
        if (cartItems.length > prevItemsLength.current) {
            setIsCartAnimating(true);
            const timer = setTimeout(() => setIsCartAnimating(false), 500);
            return () => clearTimeout(timer);
        }
        prevItemsLength.current = cartItems.length;
    }, [cartItems.length]);

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            if (isLoggedIn && userProfile?.id) {
                try {
                    const data = await getNotifications(userProfile.id);
                    setNotifications(data);
                } catch (error) {
                    console.error("Error fetching notifications:", error);
                }
            } else {
                setNotifications([]);
            }
        };

        fetchNotifications();

        // Listen for refresh events
        const handleRefresh = () => fetchNotifications();
        window.addEventListener('notifications-updated', handleRefresh);
        return () => window.removeEventListener('notifications-updated', handleRefresh);
    }, [isLoggedIn, userProfile?.id]);

    // Initialize Theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('music_access_theme');
        if (savedTheme) {
            const themeOption = THEMES.find(t => t.value === savedTheme);
            if (themeOption) {
                const rgb = hexToRgb(themeOption.color);
                if (rgb) {
                    document.documentElement.style.setProperty('--primary', rgb);
                }
            }
        }
    }, []);


    // Handlers
    const toggleSearchMode = () => {
        setSearchMode(prev => prev === 'find' ? 'ai' : 'find');
        setSearchValue('');
        inputRef.current?.focus();
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchValue(e.target.value);
        if (searchMode === 'find') {
            onSearch(e.target.value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (searchMode === 'ai') {
                handleAiSubmit();
            } else {
                onSearch(searchValue);
                inputRef.current?.blur();
            }
        }
    };

    const handleAiSubmit = () => {
        if (!searchValue.trim()) return;
        setAiLoading(true);
        // Simulate AI response
        setTimeout(() => {
            setAiResponse("Here are some results based on your request. I found 3 producers matching 'Trap' style with licenses under $30.");
            setAiLoading(false);
        }, 1500);
    };

    const handleThemeChange = (themeValue: string) => {
        console.log("Theme changed to", themeValue);

        const themeOption = THEMES.find(t => t.value === themeValue);
        if (themeOption) {
            const rgb = hexToRgb(themeOption.color);
            if (rgb) {
                document.documentElement.style.setProperty('--primary', rgb);
                localStorage.setItem('music_access_theme', themeValue);
            }
        }
        setIsThemeOpen(false);
    };

    const handleMarkAllRead = async () => {
        if (!userProfile?.id) {
            console.warn('handleMarkAllRead: No user ID found');
            return;
        }

        // Optimistic update
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;

        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        try {
            await markAllNotificationsAsRead(userProfile.id);
            // Trigger a fresh fetch to ensure we are in sync
            window.dispatchEvent(new Event('notifications-updated'));
        } catch (error) {
            console.error("Error marking all as read:", error);
            // Revert on error? Or just log it. For UI responsiveness, optimistic is better.
        }
    };

    const handleMarkRead = async (id: string) => {
        const notification = notifications.find(n => n.id === id);
        if (!notification || notification.read) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? ({ ...n, read: true }) : n));

        try {
            await markNotificationAsRead(id);
        } catch (error) {
            console.error(`Error marking notification ${id} as read:`, error);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        // 1. Mark as read if needed
        handleMarkRead(notification.id);

        // 2. Determine destination
        let destination = 'dashboard-overview';

        switch (notification.type) {
            case 'sale':
                destination = 'dashboard-sales';
                break;
            case 'message':
                destination = 'dashboard-messages';
                break;
            case 'order':
            case 'manage_order':
                destination = 'dashboard-orders';
                break;
            case 'follow':
                destination = 'dashboard-overview'; // Or 'profile'
                break;
            case 'system':
            case 'alert':
            default:
                destination = 'dashboard-overview';
                break;
        }

        // 3. Navigate
        onNavigate(destination);
        setIsNotificationsOpen(false);
    };

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                // setMobileSearchOpen(false); // Only close if mobile? Maybe not force close
            }
            if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
                setIsThemeOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
            if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
                // Check if the click is inside the mobile cart portal
                const mobileCart = document.getElementById('mobile-cart-root');
                if (mobileCart && mobileCart.contains(event.target as Node)) {
                    return;
                }
                setIsCartOpen(false);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [setIsCartOpen]);

    return (
        <header className="h-[calc(56px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] fixed top-0 right-0 left-0 lg:left-[260px] z-[90] bg-[#050505]/90 backdrop-blur-lg border-b border-transparent flex items-center pr-3 lg:pr-6 pl-3 lg:pl-0 justify-between gap-4">



            {/* Hamburger Menu (Mobile) - Hide if search open */}
            <div className="flex items-center gap-2 lg:gap-4">
                <button
                    onClick={onMenuClick}
                    className={`lg:hidden p-2 -ml-2 text-neutral-400 hover:text-white transition-all duration-300 ${mobileSearchOpen ? 'opacity-0 pointer-events-none absolute' : 'opacity-100 translate-x-0'}`}
                >
                    <Menu size={20} />
                </button>

                {/* Back Button - Show only on detail pages (Listen, etc.) - Hidden on Main Tabs, Dashboard & Profile */}
                {!['home', 'notes', 'upload', 'browse-talent', 'browse-all-talent', 'browse-all-projects', 'browse-all-soundpacks', 'browse-all-releases', 'browse-all-services', 'collaborate', 'following', 'library', 'profile', 'subscription'].includes(currentView) && !currentView.startsWith('dashboard') && (
                    <button
                        onClick={() => onNavigate('BACK')}
                        className={`
                            p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-all duration-200 
                            ${mobileSearchOpen ? 'opacity-0 -translate-x-8 pointer-events-none hidden' : 'opacity-100 translate-x-0 block'}
                        `}
                        title="Go Back"
                    >
                        <ArrowLeft size={20} className="hidden lg:block" />
                        <ArrowLeft size={18} className="lg:hidden" />
                    </button>
                )}
            </div>

            {/* Mobile Page Title Portal Target */}
            <div id="mobile-page-title" className={`lg:hidden flex-1 flex justify-center items-center px-2 min-w-0 transition-all duration-300 ${mobileSearchOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}></div>

            {/* SEARCH BAR */}
            <div
                className={`
                transition-all duration-400
                ${mobileSearchOpen
                        ? 'absolute inset-0 bg-[#050505] flex items-center px-4 pt-[env(safe-area-inset-top)] opacity-100 pointer-events-auto translate-x-0 z-[70]'
                        : `opacity-0 pointer-events-none absolute inset-0 translate-x-4 lg:absolute lg:left-1/2 lg:opacity-100 lg:top-0 lg:bottom-0 lg:flex lg:items-center lg:pointer-events-auto lg:w-[40rem] lg:ml-[calc(-20rem-110px)] xl:w-[50rem] xl:ml-[calc(-25rem-110px)] ${isFocused ? 'lg:w-[43rem] xl:w-[53rem]' : ''} z-50`
                    }
            `}
            >
                <button
                    onClick={() => setMobileSearchOpen(false)}
                    className={`mr-3 p-2 -ml-2 text-neutral-400 transition-all duration-300 lg:hidden ${mobileSearchOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none absolute'}`}
                >
                    <ArrowLeft size={18} />
                </button>

                <div
                    ref={searchRef}
                    className={`relative group rounded-xl transition-all duration-300 w-full ${isFocused ? (searchMode === 'ai' ? 'lg:shadow-[0_0_15px_rgb(var(--primary)/0.15)]' : 'lg:shadow-[0_0_20px_rgb(var(--primary)/0.1)]') : ''}`}
                >
                    {/* Input Background */}
                    <div className={`absolute inset-0 rounded-xl border transition-all duration-300 ${isFocused || aiResponse ? 'border-primary/50 bg-black' : 'border-transparent bg-black/40'}`}></div>

                    {/* Main Input Area */}
                    <div className="relative flex items-center pl-1.5 pr-3 py-2">

                        {/* Mode Toggle */}
                        <button
                            onClick={toggleSearchMode}
                            className={`
                        flex items-center justify-center px-2 py-1 mr-2 rounded-lg transition-all duration-300 gap-2 border relative overflow-hidden shrink-0
                        ${searchMode === 'ai'
                                    ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_5px_rgb(var(--primary)/0.15)]'
                                    : 'bg-neutral-900/50 border-white/5 text-neutral-500 hover:text-white hover:bg-white/10 hover:border-white/10'
                                }
                    `}
                        >
                            <div className="relative z-10 flex items-center gap-2">
                                {searchMode === 'ai' ? <Sparkles size={12} className="animate-pulse" /> : <Search size={12} />}
                                <span className="text-[9px] font-black font-mono tracking-wider uppercase hidden sm:inline-block min-w-[45px] text-center">
                                    {searchMode === 'ai' ? 'AI' : 'FIND'}
                                </span>
                            </div>
                        </button>

                        <div className="flex-1 flex items-center relative h-7 min-w-0">
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchValue}
                                onChange={handleSearchChange}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                className={`
                            w-full h-full bg-transparent border-none focus:ring-0 focus:outline-none 
                            text-neutral-200 font-mono text-base sm:text-xs p-0 tracking-wide transition-colors
                            selection:bg-primary/30 selection:text-white placeholder-transparent z-10
                            ${searchMode === 'ai' ? 'text-primary' : ''}
                        `}
                                autoComplete="off"
                            />
                            {!searchValue && (
                                <div className={`absolute inset-0 flex items-center pointer-events-none select-none font-mono text-xs transition-opacity duration-300 ${isFocused ? 'opacity-30' : 'opacity-50'}`}>
                                    <span className={`truncate ${searchMode === 'ai' ? 'text-primary' : 'text-neutral-500'}`}>
                                        {placeholderText}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Right Icon */}
                        <div className="flex items-center pl-2 ml-2 border-l border-white/5 h-5 shrink-0">
                            {searchMode === 'ai' ? (
                                <button
                                    onClick={handleAiSubmit}
                                    disabled={!searchValue.trim() || aiLoading}
                                    className={`p-1 rounded transition-all flex items-center justify-center ${searchValue.trim() ? 'text-primary hover:bg-primary/10' : 'text-neutral-600'}`}
                                >
                                    {aiLoading ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div> : <ArrowRight size={12} />}
                                </button>
                            ) : (
                                <div className="hidden lg:flex items-center gap-1 px-1 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-mono text-neutral-500">
                                    <Command size={8} /> K
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Response Panel */}
                    {(aiResponse || (aiLoading && searchMode === 'ai')) && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border border-transparent rounded-xl shadow-2xl overflow-hidden z-50">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-2">
                                    <Terminal size={10} className="text-primary" />
                                    <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase">AI Analysis</span>
                                </div>
                                <button onClick={() => setAiResponse(null)} className="text-neutral-500 hover:text-white transition-colors p-1"><X size={10} /></button>
                            </div>
                            <div className="p-4 max-h-[350px] overflow-y-auto custom-scrollbar">
                                {aiLoading ? (
                                    <div className="flex flex-col items-center justify-center py-6 space-y-3">
                                        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-xs font-mono text-primary animate-pulse">PROCESSING...</p>
                                    </div>
                                ) : (
                                    <p className="text-neutral-300 text-xs leading-relaxed font-sans whitespace-pre-wrap">{aiResponse}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT SIDE ACTIONS */}
            <div className="ml-auto relative z-[60]">
                <RightActions
                    isLoggedIn={isLoggedIn} isFocused={isFocused} mobileSearchOpen={mobileSearchOpen}
                    currentView={currentView} userProfile={userProfile} gemsClaimedToday={gemsClaimedToday}
                    profileLoading={profileLoading} onClaimGems={onClaimGems} onNavigate={onNavigate}
                    showBalance={showBalance} setShowBalance={setShowBalance} isThemeOpen={isThemeOpen}
                    setIsThemeOpen={setIsThemeOpen} handleThemeChange={handleThemeChange} themeRef={themeRef}
                    notifRef={notifRef} isNotificationsOpen={isNotificationsOpen} setIsNotificationsOpen={setIsNotificationsOpen}
                    notifications={notifications} handleMarkAllRead={handleMarkAllRead} handleMarkRead={handleMarkRead}
                    cartRef={cartRef} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} cartItems={cartItems}
                    cartTotal={cartTotal} removeFromCart={removeFromCart} dropdownRef={dropdownRef}
                    isProfileOpen={isProfileOpen} setIsProfileOpen={setIsProfileOpen} onOpenAuth={onOpenAuth}
                    onLogout={onLogout} isSpacer={false} onMobileSearchOpen={() => setMobileSearchOpen(true)}
                    isCartAnimating={isCartAnimating}
                    projects={projects}
                    onToggleDiscoverView={onToggleDiscoverView}
                    isDiscoverFeedMode={isDiscoverFeedMode}
                    handleNotificationClick={handleNotificationClick}
                />
            </div>
            {/* Mobile Notifications Portal - Rendered outside transformed containers */}
            <MobileNotifications
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notifications}
                onMarkAllRead={handleMarkAllRead}
                onMarkRead={handleMarkRead}
                onNotificationClick={handleNotificationClick}
            />
        </header>
    );
};

export default TopBar;
