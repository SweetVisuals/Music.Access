import React, { useState, useRef, useEffect } from 'react';
import {
    Search, Bell, Menu, User, LogOut, Settings, Terminal, ShoppingBag,
    ArrowRight, ArrowLeft, Clock, Gem, Wallet, Eye, EyeOff, Palette,
    Command, Sparkles, Music, Package, Mic, Info, X, ChevronDown, Trash2, Check
} from 'lucide-react';
import { Project, UserProfile, Notification, View } from '../types';
import MobileNotifications from './MobileNotifications';
import { useCart } from '../contexts/CartContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/supabaseService';

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
}> = ({
    isLoggedIn, isFocused, mobileSearchOpen, currentView, userProfile,
    gemsClaimedToday, profileLoading, onClaimGems, onNavigate,
    showBalance, setShowBalance, isThemeOpen, setIsThemeOpen, handleThemeChange,
    themeRef, notifRef, isNotificationsOpen, setIsNotificationsOpen, notifications,
    handleMarkAllRead, handleMarkRead, cartRef, isCartOpen, setIsCartOpen, cartItems,
    cartTotal, removeFromCart, dropdownRef, isProfileOpen, setIsProfileOpen,
    onOpenAuth, onLogout, isSpacer = false, onMobileSearchOpen
}) => {
        // Spacer helper: makes content invisible and non-interactive
        const spacerClass = isSpacer ? "opacity-0 pointer-events-none select-none" : "opacity-100";

        return (
            <div className={`flex items-center justify-end gap-2 sm:gap-3 z-40 h-full shrink-0 transition-all duration-300 ${mobileSearchOpen ? 'opacity-0 translate-x-8 pointer-events-none' : 'opacity-100 translate-x-0'} ${spacerClass}`}>

                {/* Mobile Search Icon */}
                {currentView === 'home' && (
                    <button
                        onClick={isSpacer ? undefined : onMobileSearchOpen}
                        className="lg:hidden p-2 text-neutral-400 hover:text-white"
                    >
                        <Search size={18} />
                    </button>
                )}

                {/* Group 1: Balances */}
                {isLoggedIn && !isFocused && (
                    <div className="hidden sm:flex items-center gap-2">
                        {/* Daily Claim Button */}
                        {!gemsClaimedToday && !profileLoading && userProfile && (
                            <button
                                onClick={isSpacer ? undefined : onClaimGems}
                                className="flex items-center gap-1.5 px-2 py-1 bg-white/5 text-primary border border-primary/30 rounded-lg text-[10px] font-bold hover:bg-primary/10 transition-colors shadow-[0_0_15px_rgb(var(--primary)/0.2)] animate-pulse h-8"
                            >
                                <Gem size={10} />
                                <span className="font-mono tracking-tight">CLAIM</span>
                            </button>
                        )}

                        {/* Gem Balance */}
                        <div
                            onClick={isSpacer ? undefined : () => onNavigate('dashboard-wallet')}
                            className="h-8 bg-neutral-900 border border-white/10 rounded-full flex items-center px-3 gap-2 cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                            <Gem size={12} className="text-primary" />
                            <span className="text-[10px] font-bold text-white font-mono mt-0.5">
                                {userProfile?.gems !== undefined ? userProfile.gems.toLocaleString() : '0'}
                            </span>
                        </div>


                    </div>
                )}

                <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block"></div>

                {/* Group 2: Icons */}
                <div className="flex items-center gap-1">

                    {/* Color Picker */}
                    <div className="relative" ref={isSpacer ? null : themeRef}>
                        <button
                            onClick={isSpacer ? undefined : () => setIsThemeOpen(!isThemeOpen)}
                            className={`p-2 rounded-lg transition-all duration-200 ${isThemeOpen && !isSpacer ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Palette size={16} />
                        </button>
                        {isThemeOpen && !isSpacer && (
                            <div className="absolute right-0 top-full mt-3 w-44 p-3 rounded-xl border border-white/10 bg-[#0a0a0a] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="text-[9px] font-mono text-neutral-500 uppercase mb-2 px-1">Accent Color</div>
                                <div className="grid grid-cols-5 gap-2 px-1">
                                    {THEMES.map(theme => (
                                        <button
                                            key={theme.name}
                                            onClick={() => handleThemeChange(theme.value)}
                                            className="w-5 h-5 rounded-full border border-white/10 hover:scale-110 transition-transform shadow-lg"
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
                                className={`relative p-2 rounded-lg transition-all duration-200 ${isNotificationsOpen && !isSpacer ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Bell size={16} />
                                {notifications.some(n => !n.read) && (
                                    <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.6)] animate-pulse"></span>
                                )}
                            </button>

                            {isNotificationsOpen && !isSpacer && (
                                <>
                                    {/* Desktop Dropdown */}
                                    <div className="hidden lg:block absolute right-0 top-full mt-3 w-72 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="p-3 border-b border-white/5 flex justify-between items-center">
                                            <h3 className="text-xs font-bold text-white">Notifications</h3>
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="text-[9px] text-primary hover:underline"
                                            >
                                                Mark all read
                                            </button>
                                        </div>
                                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <div className="p-4 text-center text-neutral-500 text-xs">
                                                    No notifications
                                                </div>
                                            ) : (
                                                notifications.map(notif => (
                                                    <div
                                                        key={notif.id}
                                                        onClick={() => handleMarkRead(notif.id)}
                                                        className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? 'bg-white/[0.02]' : ''}`}
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notif.type === 'sale' ? 'bg-green-500' : notif.type === 'system' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-white mb-0.5">{notif.title}</h4>
                                                                <p className="text-[10px] text-neutral-400 leading-snug mb-1.5">{notif.message}</p>
                                                                <div className="flex items-center gap-1 text-[9px] text-neutral-600">
                                                                    <Clock size={8} /> {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="p-2 bg-neutral-900/50 text-center">
                                            <button className="text-[9px] font-bold text-neutral-500 hover:text-white transition-colors">View Activity Log</button>
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
                            className={`relative p-2 rounded-lg transition-all duration-200 group ${isCartOpen && !isSpacer ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white hover:bg-white/10'}`}
                        >
                            <ShoppingBag size={16} />
                            {cartItems.length > 0 && (
                                <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_5px_rgb(var(--primary)/0.6)]"></span>
                            )}
                        </button>

                        {isCartOpen && !isSpacer && (
                            <div className="hidden lg:block absolute right-0 top-full mt-3 w-72 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-3 border-b border-white/5 flex justify-between items-center">
                                    <h3 className="text-xs font-bold text-white">Your Cart ({cartItems.length})</h3>
                                    <span className="text-[9px] font-mono text-neutral-500">Total: ${cartTotal.toFixed(2)}</span>
                                </div>
                                <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                                    {cartItems.length === 0 ? (
                                        <div className="p-4 text-center text-neutral-500 text-xs">Your cart is empty</div>
                                    ) : (
                                        cartItems.map((item: any) => {
                                            let TypeIcon = Music;
                                            if (item.type.includes('Sound Kit')) TypeIcon = Package;
                                            if (item.type.includes('Service') || item.type.includes('Mixing')) TypeIcon = Mic;

                                            return (
                                                <div key={item.id} className="p-3 border-b border-white/5 flex gap-3 hover:bg-white/5 transition-colors group items-start">
                                                    <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center shrink-0 text-neutral-400 group-hover:text-primary group-hover:bg-primary/10 transition-all">
                                                        <TypeIcon size={14} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="text-xs font-bold text-white truncate max-w-[120px]">{item.title}</h4>
                                                            <span className="text-xs font-mono font-bold text-primary">${item.price.toFixed(2)}</span>
                                                        </div>

                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-bold text-neutral-400 px-1 py-0.5 rounded bg-white/5 border border-white/5">
                                                                {item.type}
                                                            </span>
                                                            {item.licenseType && (
                                                                <span className="text-[9px] text-neutral-600 truncate max-w-[70px]">
                                                                    {item.licenseType}
                                                                </span>
                                                            )}
                                                            <div className="flex-1"></div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeFromCart(item.id);
                                                                }}
                                                                className="text-neutral-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
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
                                <div className="p-3 bg-neutral-900/50">
                                    <button
                                        onClick={() => {
                                            setIsCartOpen(false);
                                            onNavigate('checkout');
                                        }}
                                        className="w-full py-2 bg-primary text-black font-bold rounded-lg text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                        disabled={cartItems.length === 0}
                                    >
                                        Checkout <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Group 3: Profile */}
                    <div className="relative ml-2" ref={isSpacer ? null : dropdownRef}>
                        <button
                            onClick={isSpacer ? undefined : (isLoggedIn ? () => setIsProfileOpen(!isProfileOpen) : onOpenAuth)}
                            className="flex items-center gap-2 pl-2"
                        >
                            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-white/10 overflow-hidden hover:border-white/30 transition-all">
                                {isLoggedIn && userProfile ? (
                                    <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                        <User size={14} />
                                    </div>
                                )}
                            </div>
                            {isLoggedIn && <ChevronDown size={12} className="text-neutral-500 hover:text-white transition-colors" />}
                        </button>

                        {/* Profile Dropdown */}
                        {isLoggedIn && isProfileOpen && !isSpacer && (
                            <div className="absolute right-0 top-full mt-3 w-52 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-3 border-b border-white/5">
                                    <div className="text-xs font-bold text-white">{userProfile?.username || 'User'}</div>
                                    <div className="text-[9px] text-neutral-500 truncate mb-2">{userProfile?.handle || '@user'}</div>

                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsProfileOpen(false);
                                            onNavigate('dashboard-wallet');
                                        }}
                                        className="flex items-center justify-between bg-neutral-900/50 p-2 rounded-lg border border-white/5 cursor-pointer hover:bg-neutral-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Wallet size={12} className="text-emerald-500" />
                                            <span className="text-[10px] font-mono font-bold text-white">
                                                ${(userProfile?.balance !== undefined ? userProfile.balance : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-1.5">
                                    <button onClick={(e) => { e.stopPropagation(); setIsProfileOpen(false); onNavigate(userProfile?.handle ? `@${userProfile.handle}` : 'profile'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors text-left">
                                        <User size={12} /> My Profile
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setIsProfileOpen(false); onNavigate('dashboard-overview'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors text-left">
                                        <Terminal size={12} /> Overview
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setIsProfileOpen(false); onNavigate('settings'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-white/5 transition-colors text-left">
                                        <Settings size={12} /> Settings
                                    </button>
                                </div>
                                <div className="p-1.5 border-t border-white/5">
                                    <button onClick={(e) => { e.stopPropagation(); setIsProfileOpen(false); onLogout(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left">
                                        <LogOut size={12} /> Sign Out
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
    onMenuClick
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
    const [showBalance, setShowBalance] = useState(true);
    const [isThemeOpen, setIsThemeOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

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

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            if (isLoggedIn) {
                try {
                    const data = await getNotifications();
                    setNotifications(data);
                } catch (error) {
                    console.error("Error fetching notifications:", error);
                }
            } else {
                setNotifications([]);
            }
        };

        fetchNotifications();

        // Optional: Set up real-time subscription here later if needed
    }, [isLoggedIn]);

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
        // Optimistic update
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;

        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        try {
            await markAllNotificationsAsRead();
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
        <header className="h-16 fixed top-0 right-0 left-0 lg:left-64 z-[90] bg-[#050505]/90 backdrop-blur-lg border-b border-white/5 flex items-center px-3 lg:px-6 justify-between gap-4">

            {/* SPACER FOR CENTERING (Hidden on mobile) */}
            <div className="hidden lg:block shrink-0">
                <RightActions
                    isLoggedIn={isLoggedIn} isFocused={isFocused} mobileSearchOpen={mobileSearchOpen}
                    currentView={currentView} userProfile={userProfile} gemsClaimedToday={gemsClaimedToday}
                    profileLoading={profileLoading} onClaimGems={onClaimGems} onNavigate={onNavigate}
                    showBalance={showBalance} setShowBalance={setShowBalance} isThemeOpen={false}
                    setIsThemeOpen={setIsThemeOpen} handleThemeChange={handleThemeChange} themeRef={themeRef}
                    notifRef={notifRef} isNotificationsOpen={false} setIsNotificationsOpen={setIsNotificationsOpen}
                    notifications={notifications} handleMarkAllRead={handleMarkAllRead} handleMarkRead={handleMarkRead}
                    cartRef={cartRef} isCartOpen={false} setIsCartOpen={setIsCartOpen} cartItems={cartItems}
                    cartTotal={cartTotal} removeFromCart={removeFromCart} dropdownRef={dropdownRef}
                    isProfileOpen={false} setIsProfileOpen={setIsProfileOpen} onOpenAuth={onOpenAuth}
                    onLogout={onLogout} isSpacer={true} onMobileSearchOpen={() => setMobileSearchOpen(true)}
                />
            </div>

            {/* Hamburger Menu (Mobile) - Hide if search open */}
            <button
                onClick={onMenuClick}
                className={`lg:hidden p-2 -ml-2 text-neutral-400 hover:text-white transition-all duration-300 ${mobileSearchOpen ? 'opacity-0 -translate-x-8 pointer-events-none' : 'opacity-100 translate-x-0'}`}
            >
                <Menu size={20} />
            </button>

            {/* Mobile Page Title Portal Target */}
            <div id="mobile-page-title" className={`lg:hidden flex-1 flex justify-center items-center px-2 min-w-0 transition-all duration-300 ${mobileSearchOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}></div>

            {/* SEARCH BAR */}
            <div
                className={`
                transition-all duration-400 z-50
                ${mobileSearchOpen
                        ? 'absolute inset-0 bg-[#050505] flex items-center px-4 opacity-100 pointer-events-auto translate-x-0'
                        : 'opacity-0 pointer-events-none absolute inset-0 translate-x-4 lg:relative lg:flex lg:opacity-100 lg:pointer-events-auto flex-1 justify-center px-4 lg:bg-transparent lg:translate-x-0'
                    }
                ${!mobileSearchOpen && isFocused ? 'lg:max-w-[35rem] xl:max-w-[45rem] w-full' : 'lg:max-w-[24rem] xl:max-w-[32rem] w-full'}
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
                    className={`relative group rounded-xl transition-all duration-300 w-full ${isFocused ? 'lg:shadow-[0_0_40px_rgb(var(--primary)/0.15)]' : ''}`}
                >
                    {/* Input Background */}
                    <div className={`absolute inset-0 rounded-xl border transition-all duration-300 ${isFocused || aiResponse ? 'border-primary/50 bg-black' : 'border-white/10 bg-black/40'}`}></div>

                    {/* Main Input Area */}
                    <div className="relative flex items-center px-3 py-2">

                        {/* Mode Toggle */}
                        <button
                            onClick={toggleSearchMode}
                            className={`
                        flex items-center justify-center px-2 py-1 mr-2 rounded-lg transition-all duration-300 gap-2 border relative overflow-hidden shrink-0
                        ${searchMode === 'ai'
                                    ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_15px_rgb(var(--primary)/0.2)]'
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
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50">
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
            />
            {/* Mobile Notifications Portal - Rendered outside transformed containers */}
            <MobileNotifications
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notifications}
                onMarkAllRead={handleMarkAllRead}
                onMarkRead={handleMarkRead}
            />
        </header>
    );
};

export default TopBar;