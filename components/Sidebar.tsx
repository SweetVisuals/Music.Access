import React, { useState, useEffect, useRef } from 'react';
import {
    Upload,
    PlusCircle,
    Search,
    Users,
    MessageSquare,
    Headphones,
    Library,
    FileText,
    Settings,
    HelpCircle,
    MoreVertical,
    LayoutDashboard,
    Wallet,
    DollarSign,
    Briefcase,
    ArrowLeft,
    ArrowRight,
    ShoppingBag,
    LayoutGrid,
    Clipboard,
    LogIn,
    X,
    CreditCard,
    ChevronRight,
    Map,
    Gem,
    Star
} from 'lucide-react';
import { View, UserProfile, TalentProfile } from '../types';
import { getStorageUsage, getFollowingProfilesForSidebar, supabase } from '../services/supabaseService';

interface SidebarProps {
    currentView: View;
    onNavigate: (view: View | string) => void;
    isLoggedIn: boolean;
    onOpenAuth: () => void;
    userProfile: UserProfile | null;
    profileLoading?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
    isPlayerActive?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isLoggedIn, onOpenAuth, userProfile, profileLoading = false, isOpen, onClose, isPlayerActive }) => {
    const isDashboard = currentView.startsWith('dashboard') && currentView !== 'dashboard-messages';
    const [following, setFollowing] = useState<TalentProfile[]>([]);
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const [storageUsage, setStorageUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 500 * 1024 * 1024 });
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({
        message: 0,
        sale: 0,
        order: 0,
        manage_order: 0
    });

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    let notifSubscription: any = null;

    const fetchUnreadCounts = async () => {
        if (!isLoggedIn || !userProfile?.id) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('type')
                .eq('user_id', userProfile.id)
                .eq('read', false);

            if (error) throw error;

            const counts = (data || []).reduce((acc: any, curr: any) => {
                acc[curr.type] = (acc[curr.type] || 0) + 1;
                return acc;
            }, {
                message: 0,
                sale: 0,
                order: 0,
                manage_order: 0
            });

            setUnreadCounts(counts);
        } catch (err) {
            console.error('Error fetching unread counts:', err);
        }
    };

    useEffect(() => {
        fetchUnreadCounts();

        if (isLoggedIn && userProfile?.id) {
            notifSubscription = supabase
                .channel('sidebar-notifications')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${userProfile.id}`
                    },
                    (payload) => {
                        fetchUnreadCounts();
                    }
                )
                .subscribe();

            // Listen for local updates (e.g. from Dashboard)
            const handleLocalUpdate = () => {
                console.log('Sidebar: Notification update event received');
                fetchUnreadCounts();
            };
            window.addEventListener('notifications-updated', handleLocalUpdate);

            return () => {
                if (notifSubscription) supabase.removeChannel(notifSubscription);
                window.removeEventListener('notifications-updated', handleLocalUpdate);
            };
        }
    }, [isLoggedIn, userProfile?.id]);

    useEffect(() => {
        if (isOpen && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [isOpen]);

    useEffect(() => {
        let subscription: any = null;

        const fetchFollowing = async () => {
            if (!isLoggedIn) {
                setFollowing([]);
                return;
            }
            setLoadingFollowing(true);
            try {
                const data = await getFollowingProfilesForSidebar();
                setFollowing(data);
            } catch (error) {
                console.error('Failed to fetch following:', error);
            } finally {
                setLoadingFollowing(false);
            }
        };

        const setupRealtime = async () => {
            if (!isLoggedIn || !userProfile?.id) return;
            fetchFollowing();
            subscription = supabase
                .channel('sidebar-following-changes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'followers',
                        filter: `follower_id=eq.${userProfile.id}`
                    },
                    () => {
                        setTimeout(fetchFollowing, 200);
                    }
                )
                .subscribe();
        };

        setupRealtime();

        const handleMessageUpdate = () => {
            fetchFollowing();
        };
        window.addEventListener('messages-updated', handleMessageUpdate);

        const handleManualUpdate = () => {
            setTimeout(fetchFollowing, 500);
        };
        window.addEventListener('following-updated', handleManualUpdate);

        return () => {
            if (subscription) supabase.removeChannel(subscription);
            window.removeEventListener('messages-updated', handleMessageUpdate);
            window.removeEventListener('following-updated', handleManualUpdate);
        };
    }, [isLoggedIn, userProfile?.id]);

    useEffect(() => {
        const fetchStorageUsage = async () => {
            if (!isLoggedIn) return;
            try {
                const usage = await getStorageUsage();
                setStorageUsage(usage);
            } catch (error) {
                console.error('Failed to fetch storage usage:', error);
            }
        };

        fetchStorageUsage();

        const handleStorageUpdate = () => {
            fetchStorageUsage();
        };

        window.addEventListener('storage-updated', handleStorageUpdate);
        window.addEventListener('notifications-updated', fetchUnreadCounts);

        return () => {
            window.removeEventListener('storage-updated', handleStorageUpdate);
            window.removeEventListener('notifications-updated', fetchUnreadCounts);
            if (notifSubscription) supabase.removeChannel(notifSubscription);
        };
    }, [isLoggedIn, userProfile?.id]);

    const formatStorageSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Swipe gesture state
    const touchStartRef = useRef<number | null>(null);
    const touchEndRef = useRef<number | null>(null);

    // Min swipe distance for detection
    const MIN_SWIPE_DISTANCE = 75;

    const onTouchStart = (e: React.TouchEvent) => {
        touchEndRef.current = null;
        touchStartRef.current = e.targetTouches[0].clientX;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndRef.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (!touchStartRef.current || !touchEndRef.current) return;

        const distance = touchStartRef.current - touchEndRef.current;
        const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;

        if (isLeftSwipe && onClose) {
            onClose();
        }
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                ></div>
            )}

            <aside
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className={`
        fixed inset-0 z-[140] w-full lg:w-[260px] bg-black lg:bg-[#050505] flex flex-col font-sans transition-transform duration-300 ease-in-out transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:h-screen
      `}>
                <div className="h-[calc(56px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] flex items-center justify-between lg:justify-center px-5 shrink-0 border-transparent relative overflow-hidden">
                    <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => onNavigate('home')}
                    >
                        <div className="relative h-[40px] flex items-start pt-[1px] transition-transform scale-100 min-[380px]:scale-[1.1] lg:scale-105 translate-x-[6px] lg:translate-x-[6px] origin-center">
                            <img
                                src="/images/MUSIC ACCESS-Photoroom.png"
                                alt="Music Access"
                                className="h-[42px] w-auto object-contain object-top"
                            />
                        </div>
                    </div>

                    {/* Mobile Stats & Close Button */}
                    <div className="flex items-center gap-3 lg:hidden">
                        {isLoggedIn && userProfile && (
                            <div className="flex items-center gap-1.5 min-[380px]:gap-2 mr-1 translate-y-px min-[380px]:translate-y-0">
                                {/* Gems */}
                                <div className="flex items-center gap-1 min-[380px]:gap-1.5 px-2 py-0.5 min-[380px]:py-1 bg-white/5 rounded-full border border-white/5">
                                    <Gem className="text-primary w-2.5 h-2.5 min-[380px]:w-3 min-[380px]:h-3" />
                                    <span className="text-[10px] min-[380px]:text-[11px] font-bold text-white font-mono">
                                        {userProfile.gems?.toLocaleString() || '0'}
                                    </span>
                                </div>
                            </div>
                        )}
                        <button onClick={onClose} className="text-neutral-500 hover:text-white p-1">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div ref={scrollContainerRef} className="flex-1 px-3 py-3 overflow-y-auto overscroll-y-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">

                    {isDashboard ? ( // --- DASHBOARD MODE ---
                        <div className="space-y-6">
                            {/* Actions */}
                            <div>
                                <button
                                    onClick={() => onNavigate('home')}
                                    className="flex items-center space-x-2 text-[10px] font-bold text-neutral-500 hover:text-white mb-3 pl-2 uppercase tracking-wider group transition-colors"
                                >
                                    <ArrowLeft size={10} className="group-hover:-translate-x-1 transition-transform" />
                                    <span>Back to Marketplace</span>
                                </button>

                                <div className="space-y-1.5">
                                    <button onClick={() => onNavigate('upload')} className="w-full flex items-center justify-center gap-2 py-2 bg-primary hover:bg-primary/90 text-black rounded-md font-bold text-[11px] transition-all shadow-[0_2px_10px_rgba(var(--primary),0.15)] border-none">
                                        <Upload size={14} />
                                        <span>Upload Track</span>
                                    </button>
                                    <button onClick={() => onNavigate('dashboard-studio')} className="w-full flex items-center justify-center gap-2 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-md font-bold text-[11px] transition-all">
                                        <PlusCircle size={14} />
                                        <span>New Project</span>
                                    </button>
                                </div>
                            </div>

                            {/* Section: Dashboard */}
                            <div>
                                <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] mb-2 pl-3">Dashboard</h3>
                                <nav className="space-y-1">
                                    <SidebarItem icon={<LayoutDashboard size={15} />} label="Overview" active={currentView === 'dashboard-overview'} onClick={() => onNavigate('dashboard-overview')} />
                                    <SidebarItem icon={<Headphones size={15} />} label="My Studio" active={currentView === 'dashboard-studio'} onClick={() => onNavigate('dashboard-studio')} />

                                    <SidebarItem icon={<DollarSign size={15} />} label="Sales" active={currentView === 'dashboard-sales'} onClick={() => onNavigate('dashboard-sales')} badge={unreadCounts.sale} />
                                    <SidebarItem icon={<Briefcase size={15} />} label="Manage Orders" active={currentView === 'dashboard-manage'} onClick={() => onNavigate('dashboard-manage')} badge={unreadCounts.manage_order} />
                                    <SidebarItem icon={<Map size={15} />} label="Roadmap" active={currentView === 'dashboard-roadmap'} onClick={() => onNavigate('dashboard-roadmap')} />
                                </nav>
                            </div>

                            {/* Section: Account */}
                            <div>
                                <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] mb-2 pl-3">Account</h3>
                                <nav className="space-y-1">
                                    <SidebarItem icon={<Users size={15} />} label="Profile" onClick={() => onNavigate(userProfile?.handle ? `@${userProfile.handle}` : 'profile')} />
                                    <SidebarItem icon={<Wallet size={15} />} label="Wallet" active={currentView === 'dashboard-wallet'} onClick={() => onNavigate('dashboard-wallet')} />
                                    <SidebarItem icon={<ShoppingBag size={15} />} label="Orders" active={currentView === 'dashboard-orders'} onClick={() => onNavigate('dashboard-orders')} badge={unreadCounts.order} />

                                </nav >
                            </div >

                            {/* Section: Tools */}
                            < div >
                                <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] mb-2 pl-3">Tools</h3>
                                <nav className="space-y-1">
                                    <SidebarItem icon={<FileText size={15} />} label="Contracts" active={currentView === 'contracts'} onClick={() => onNavigate('contracts')} />
                                    <SidebarItem icon={<PlusCircle size={15} />} label="Post Service" active={currentView === 'post-service'} onClick={() => onNavigate('post-service')} />
                                </nav>
                            </div >

                            {/* Section: Resources */}
                            < div className="pb-4" >
                                <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] mb-2 pl-3">Resources</h3>
                                <nav className="space-y-1">
                                    <SidebarItem icon={<Settings size={15} />} label="Settings" active={currentView === 'dashboard-settings'} onClick={() => onNavigate('dashboard-settings')} />
                                    <SidebarItem icon={<CreditCard size={15} />} label="Subscription" active={currentView === 'subscription'} onClick={() => onNavigate('subscription')} />
                                    <SidebarItem icon={<HelpCircle size={15} />} label="Get Help" active={currentView === 'dashboard-help' || currentView === 'help'} onClick={() => onNavigate('help')} />
                                </nav>
                            </div >
                        </div >

                    ) : ( // --- MARKETPLACE MODE ---
                        <div className="space-y-6">
                            {/* Quick Actions (Logged In) */}
                            {isLoggedIn && (
                                <div className="space-y-1.5 mb-4">
                                    <button onClick={() => onNavigate('upload')} className="w-full flex items-center justify-center gap-2 py-2 bg-primary hover:bg-primary/90 text-black rounded-md font-bold text-[11px] transition-all shadow-[0_2px_10px_rgba(var(--primary),0.15)] border-none">
                                        <Upload size={14} />
                                        <span>Upload Track</span>
                                    </button>
                                    <button onClick={() => onNavigate('dashboard-studio')} className="w-full flex items-center justify-center gap-2 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-md font-bold text-[11px] transition-all">
                                        <PlusCircle size={14} />
                                        <span>New Project</span>
                                    </button>
                                </div>
                            )}

                            {/* Section: Explore */}
                            <div>
                                <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] mb-2 pl-3">Explore</h3>
                                <nav className="space-y-1">
                                    <SidebarItem icon={<Search size={15} />} label="Discover" active={currentView === 'home'} onClick={() => onNavigate('home')} />
                                    <SidebarItem icon={<Users size={15} />} label="Browse Talent" active={currentView === 'browse-talent'} onClick={() => onNavigate('browse-talent')} />
                                    <SidebarItem icon={<MessageSquare size={15} />} label="Collaborate" active={currentView === 'collaborate'} onClick={() => onNavigate('collaborate')} />
                                </nav>
                            </div>

                            {/* Section: Following */}
                            {isLoggedIn && (
                                <div className={following.length === 0 ? "hidden lg:block" : ""}>
                                    <div
                                        className="flex items-center justify-between mb-2 pl-3 cursor-pointer group"
                                        onClick={() => onNavigate('browse-talent')}
                                    >
                                        <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] group-hover:text-neutral-400 transition-colors">Following</h3>
                                        <span className="text-[9px] font-mono text-neutral-500">{following.length}</span>
                                    </div>

                                    <div className="space-y-1">
                                        {loadingFollowing ? (
                                            <div className="flex items-center justify-center py-2">
                                                <div className="w-3 h-3 border border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            </div>
                                        ) : following.length > 0 ? (
                                            <>
                                                {following.slice(0, 4).map((talent) => (
                                                    <div
                                                        key={talent.id}
                                                        onClick={() => onNavigate(`@${talent.handle}`)}
                                                        className="group flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-white/5 transition-all cursor-pointer"
                                                    >
                                                        <div className="relative shrink-0">
                                                            <img src={talent.avatar} alt={talent.username} className="w-5 h-5 rounded-md object-cover ring-1 ring-black group-hover:ring-white/10 transition-all" />
                                                            {talent.isVerified && (
                                                                <div className="absolute -bottom-0.5 -right-0.5 bg-black rounded-full p-[1px]">
                                                                    <div className="w-1 h-1 bg-primary rounded-full"></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] font-medium text-neutral-400 group-hover:text-white truncate transition-colors">
                                                            {talent.username}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onNavigate(`/dashboard/messages?uid=${talent.id}`);
                                                            }}
                                                            className="ml-auto text-neutral-600 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <MessageSquare size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => onNavigate('following')}
                                                    className="w-full flex items-center gap-2 pl-3 py-2 mt-1 text-[9px] font-bold text-neutral-500 hover:text-white transition-colors group"
                                                >
                                                    <span>View All</span>
                                                    <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="px-2 py-3 bg-white/5 rounded-md border border-dashed border-white/5 text-center mx-1">
                                                <p className="text-[9px] text-neutral-500">No one yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Section: Library */}
                            {isLoggedIn && (
                                <div>
                                    <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] mb-2 pl-3">Library</h3>
                                    <nav className="space-y-1">
                                        <SidebarItem icon={<LayoutGrid size={15} />} label="My Library" active={currentView === 'library'} onClick={() => onNavigate('library')} />
                                        <SidebarItem icon={<MessageSquare size={15} />} label="Messages" active={currentView === 'dashboard-messages'} onClick={() => onNavigate('dashboard-messages')} badge={unreadCounts.message} />
                                        <SidebarItem icon={<Clipboard size={15} />} label="Notes" onClick={() => onNavigate('notes')} />
                                    </nav>
                                </div>
                            )}

                            {/* Section: Resources */}
                            {isLoggedIn && (
                                <div className="pb-4">
                                    <h3 className="text-[9px] font-bold text-neutral-600 uppercase tracking-[0.2em] mb-2 pl-3">Resources</h3>
                                    <nav className="space-y-1">
                                        <SidebarItem icon={<Settings size={15} />} label="Settings" active={currentView === 'settings'} onClick={() => onNavigate('settings')} />
                                        <SidebarItem icon={<CreditCard size={15} />} label="Subscription" active={currentView === 'subscription'} onClick={() => onNavigate('subscription')} />
                                        <SidebarItem icon={<HelpCircle size={15} />} label="Get Help" active={currentView === 'help'} onClick={() => onNavigate('help')} />
                                    </nav>
                                </div>
                            )}
                        </div>
                    )}
                </div >

                {isLoggedIn && !isDashboard && (
                    <div className="hidden lg:block px-4 pb-6 pt-2 bg-[#050505]">
                        <button
                            onClick={() => onNavigate('dashboard-overview')}
                            className="w-full group flex items-center justify-center gap-2 py-2 bg-primary hover:bg-primary/90 text-black rounded-md font-bold text-[11px] transition-all shadow-[0_2px_10px_rgba(var(--primary),0.15)]"
                        >
                            <LayoutDashboard size={14} />
                            <span>Go to Dashboard</span>
                            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform duration-300" />
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="shrink-0 relative">
                    {/* Footer Content - Storage & Profile */}
                    <div className={`
                        px-4 py-3 border-t border-transparent bg-[#050505]
                        ${isPlayerActive ? 'pb-[calc(130px+env(safe-area-inset-bottom))]' : 'pb-[calc(80px+env(safe-area-inset-bottom))]'} lg:pb-4
                    `}>
                        {/* Mobile: Profile first, then Storage. Desktop: Storage first, then Profile */}
                        <div className="flex flex-col-reverse lg:flex-col gap-3">
                            {/* Storage - appears second on mobile, first on desktop */}
                            {isLoggedIn && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider">Storage</span>
                                        <span className="text-[9px] font-mono text-neutral-500">{formatStorageSize(storageUsage.used)} / {formatStorageSize(storageUsage.limit)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full"
                                            style={{ width: `${Math.min((storageUsage.used / storageUsage.limit) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {/* Profile - hidden on mobile, visible on desktop */}
                            <div className="hidden lg:block">
                                {
                                    isLoggedIn ? (
                                        userProfile && !profileLoading ? (
                                            <div
                                                className="flex items-center gap-3 group cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
                                                onClick={() => onNavigate(userProfile?.handle ? `@${userProfile.handle}` : 'profile')}
                                            >
                                                <div className="relative shrink-0">
                                                    <img
                                                        src={userProfile.avatar || 'https://i.pravatar.cc/150?u=user'}
                                                        alt={userProfile.username}
                                                        className="h-9 w-9 rounded-xl object-cover ring-2 ring-black group-hover:ring-primary/20 transition-all shadow-sm"
                                                    />
                                                    <div className="absolute -bottom-1 -right-1 bg-[#050505] p-[2px] rounded-full">
                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full border border-[#050505]"></div>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors leading-tight mb-0.5">{userProfile.username}</div>
                                                    <div className="text-[10px] text-neutral-500 truncate font-medium leading-tight">{userProfile.email}</div>
                                                </div>

                                                {/* Plan Badge */}
                                                {userProfile.plan && (
                                                    <div className={`
                                                px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider mr-1
                                                ${userProfile.plan === 'Pro'
                                                            ? 'bg-primary/20 text-primary border border-primary/20'
                                                            : userProfile.plan === 'Studio+'
                                                                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/20'
                                                                : 'bg-white/10 text-neutral-400 border border-white/5'
                                                        }
                                            `}>
                                                        {userProfile.plan}
                                                    </div>
                                                )}

                                                <MoreVertical size={16} className="text-neutral-600 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 animate-pulse">
                                                <div className="h-8 w-8 bg-neutral-800 rounded-full"></div>
                                                <div className="space-y-1 flex-1">
                                                    <div className="h-2 w-16 bg-neutral-800 rounded"></div>
                                                    <div className="h-1.5 w-20 bg-neutral-800 rounded"></div>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-neutral-900/90 to-black border border-white/5 p-4 group">
                                            {/* Ambient Background Glow */}
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-all duration-500"></div>

                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-lg bg-neutral-800/80 flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:bg-neutral-800 transition-all shadow-inner">
                                                        <Users size={14} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-bold text-white leading-tight">Guest Access</div>
                                                        <div className="text-[9px] text-neutral-500 font-medium tracking-wide">Join the community</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={onOpenAuth}
                                                        className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-[10px] font-bold transition-all border border-white/5 hover:border-white/10"
                                                    >
                                                        Sign Up
                                                    </button>
                                                    <button
                                                        onClick={onOpenAuth}
                                                        className="px-3 py-2 bg-primary hover:bg-primary/90 text-black rounded-lg text-[10px] font-bold transition-all shadow-[0_2px_10px_rgba(var(--primary),0.15)] flex items-center justify-center gap-1.5"
                                                    >
                                                        <LogIn size={10} />
                                                        <span>Log In</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </aside >
        </>
    );
};

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
    badge?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick, badge }) => {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all group relative overflow-hidden
                ${active
                    ? 'text-primary'
                    : 'text-neutral-500 hover:text-white hover:bg-white/5'
                }
            `}
        >
            {/* Active Gradient Background */}
            {active && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-100 transition-opacity"></div>
            )}

            {/* Left Border Marker */}
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full shadow-[0_0_8px_rgba(var(--primary),0.6)]"></div>
            )}

            <span className={`relative z-10 transition-colors duration-300 ${active ? 'text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.3)]' : 'group-hover:text-white'}`}>
                {icon}
            </span>
            <span className={`relative z-10 text-[11px] font-medium tracking-wide transition-all ${active ? 'font-bold translate-x-0.5' : ''}`}>{label}</span>

            {badge !== undefined && badge > 0 && (
                <span className="relative z-10 ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-primary text-black text-[9px] font-bold rounded-full shadow-[0_0_12px_rgba(var(--primary),0.6)] border border-white/20 animate-in zoom-in-50 duration-300">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </button>
    )
}

export default Sidebar;
