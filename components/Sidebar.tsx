import React, { useState, useEffect } from 'react';
import {
    Upload,
    PlusCircle,
    Search,
    Users,
    MessageSquare,
    Headphones,
    TrendingUp,
    Library,
    FileText,
    Settings,
    HelpCircle,
    MoreVertical,
    Terminal,
    LayoutDashboard,
    Wallet,
    DollarSign,
    Briefcase,
    ArrowLeft,
    ShoppingBag,
    LayoutGrid,
    Clipboard,
    ChevronRight,
    LogIn,
    X,
    Target,
    Map
} from 'lucide-react';
import { View, UserProfile, TalentProfile } from '../types';
import { getTalentProfiles, getStorageUsage } from '../services/supabaseService';

interface SidebarProps {
    currentView: View;
    onNavigate: (view: View | string) => void;
    isLoggedIn: boolean;
    onOpenAuth: () => void;
    userProfile: UserProfile | null;
    profileLoading?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isLoggedIn, onOpenAuth, userProfile, profileLoading = false, isOpen, onClose }) => {
    const isDashboard = currentView.startsWith('dashboard');
    const [following, setFollowing] = useState<TalentProfile[]>([]);
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const [storageUsage, setStorageUsage] = useState<{ used: number; limit: number }>({ used: 0, limit: 500 * 1024 * 1024 });

    useEffect(() => {
        if (isLoggedIn) {
            const fetchFollowing = async () => {
                setLoadingFollowing(true);
                try {
                    const data = await getTalentProfiles();
                    // Filter out the user's own profile from following
                    const filteredData = data.filter(talent => talent.handle !== userProfile?.handle);
                    setFollowing(filteredData.slice(0, 4)); // Show first 4 for now
                } catch (error) {
                    console.error('Failed to fetch following:', error);
                } finally {
                    setLoadingFollowing(false);
                }
            };
            fetchFollowing();
        }
    }, [isLoggedIn, userProfile?.handle]);

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

        // Listen for storage updates from other components (e.g., profile picture upload)
        const handleStorageUpdate = () => {
            fetchStorageUsage();
        };

        window.addEventListener('storage-updated', handleStorageUpdate);

        return () => {
            window.removeEventListener('storage-updated', handleStorageUpdate);
        };
    }, [isLoggedIn]);

    const formatStorageSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                ></div>
            )}

            <aside className={`
        fixed inset-y-0 left-0 z-50 w-full lg:w-64 bg-[#050505] lg:border-r border-neutral-800 flex flex-col font-sans transition-transform duration-300 ease-in-out transform h-[100dvh] lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
                {/* Logo Area */}
                <div className="h-16 lg:h-20 flex items-center justify-between px-4 border-b border-neutral-800 shrink-0">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => onNavigate('home')}>
                        <div className="p-1.5 bg-primary/10 rounded-md border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <Terminal size={16} className="text-primary" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <h1 className="text-sm font-black text-white tracking-tighter leading-none">
                                MUSIC<span className="text-primary">ACCESS</span>
                            </h1>
                            <span className="text-[8px] font-mono text-neutral-500 tracking-widest uppercase">Terminal v2.0</span>
                        </div>
                    </div>
                    {/* Mobile Close Button */}
                    <button onClick={onClose} className="lg:hidden text-neutral-500 hover:text-white p-2">
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 py-4 px-3 overflow-y-auto custom-scrollbar space-y-6">

                    {isDashboard ? (
                        /* --- DASHBOARD SIDEBAR LAYOUT (Only visible when logged in) --- */
                        <>
                            {/* Back to Marketplace */}
                            <div>
                                <button
                                    onClick={() => onNavigate('home')}
                                    className="flex items-center space-x-2 text-[9px] font-bold text-neutral-500 hover:text-white mb-3 px-2 transition-colors uppercase tracking-wider group"
                                >
                                    <ArrowLeft size={10} className="group-hover:-translate-x-1 transition-transform" />
                                    <span>Back to Marketplace</span>
                                </button>

                                <div className="space-y-1 mb-2">
                                    <button onClick={() => onNavigate('upload')} className="w-full flex items-center justify-center space-x-2 px-2 py-2 bg-primary text-black rounded-lg font-bold text-[10px] hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                                        <Upload size={14} />
                                        <span>Upload Track</span>
                                    </button>
                                    <button onClick={() => onNavigate('dashboard-studio')} className="w-full flex items-center justify-center space-x-2 px-2 py-2 bg-white/5 text-white border border-white/10 rounded-lg font-bold text-[10px] hover:bg-white/10 transition-colors">
                                        <PlusCircle size={14} />
                                        <span>New Project</span>
                                    </button>
                                </div>
                            </div>

                            {/* DASHBOARD */}
                            <div>
                                <div className="text-[9px] font-bold text-neutral-500 px-3 mb-2 uppercase tracking-widest">
                                    Dashboard
                                </div>
                                <nav className="space-y-0">
                                    <SidebarItem
                                        icon={<LayoutDashboard size={14} />}
                                        label="Overview"
                                        active={currentView === 'dashboard-overview'}
                                        onClick={() => onNavigate('dashboard-overview')}
                                    />
                                    <SidebarItem
                                        icon={<Headphones size={14} />}
                                        label="My Studio"
                                        active={currentView === 'dashboard-studio'}
                                        onClick={() => onNavigate('dashboard-studio')}
                                    />
                                    <SidebarItem
                                        icon={<DollarSign size={14} />}
                                        label="Sales"
                                        active={currentView === 'dashboard-sales'}
                                        onClick={() => onNavigate('dashboard-sales')}
                                    />
                                    <SidebarItem
                                        icon={<Briefcase size={14} />}
                                        label="Manage Orders"
                                        active={currentView === 'dashboard-manage'}
                                        onClick={() => onNavigate('dashboard-manage')}
                                    />
                                    <SidebarItem
                                        icon={<Map size={14} />}
                                        label="Roadmap"
                                        active={currentView === 'dashboard-roadmap'}
                                        onClick={() => onNavigate('dashboard-roadmap')}
                                    />
                                </nav>
                            </div>

                            {/* ACCOUNT */}
                            <div>
                                <div className="text-[9px] font-bold text-neutral-500 px-3 mb-2 uppercase tracking-widest">
                                    Account
                                </div>
                                <nav className="space-y-0">
                                    <SidebarItem icon={<Users size={14} />} label="Profile" onClick={() => window.location.href = `/@${userProfile?.handle || 'user'}`} />
                                    <SidebarItem
                                        icon={<Wallet size={14} />}
                                        label="Wallet"
                                        active={currentView === 'dashboard-wallet'}
                                        onClick={() => onNavigate('dashboard-wallet')}
                                    />
                                    <SidebarItem
                                        icon={<ShoppingBag size={14} />}
                                        label="Orders"
                                        active={currentView === 'dashboard-orders'}
                                        onClick={() => onNavigate('dashboard-orders')}
                                    />
                                    <SidebarItem
                                        icon={<MessageSquare size={14} />}
                                        label="Messages"
                                        active={currentView === 'dashboard-messages'}
                                        onClick={() => onNavigate('dashboard-messages')}
                                    />
                                </nav>
                            </div>

                            {/* TOOLS */}
                            <div>
                                <div className="text-[9px] font-bold text-neutral-500 px-3 mb-2 uppercase tracking-widest">
                                    Tools
                                </div>
                                <nav className="space-y-0">
                                    <SidebarItem
                                        icon={<FileText size={14} />}
                                        label="Contracts"
                                        active={currentView === 'contracts'}
                                        onClick={() => onNavigate('contracts')}
                                    />
                                    <SidebarItem
                                        icon={<PlusCircle size={14} />}
                                        label="Post A Service"
                                        active={currentView === 'post-service'}
                                        onClick={() => onNavigate('post-service')}
                                    />
                                    <SidebarItem
                                        icon={<Clipboard size={14} />}
                                        label="Notes & Lyrics"
                                        active={currentView === 'notes'}
                                        onClick={() => onNavigate('notes')}
                                    />
                                    <SidebarItem
                                        icon={<TrendingUp size={14} />}
                                        label="Analytics"
                                        active={currentView === 'dashboard-analytics'}
                                        onClick={() => onNavigate('dashboard-analytics')}
                                    />
                                </nav>
                            </div>

                            {/* RESOURCES */}
                            <div>
                                <div className="text-[9px] font-bold text-neutral-500 px-3 mb-2 uppercase tracking-widest">
                                    Resources
                                </div>
                                <nav className="space-y-0">
                                    <SidebarItem
                                        icon={<Settings size={14} />}
                                        label="Settings"
                                        active={currentView === 'dashboard-settings'}
                                        onClick={() => onNavigate('dashboard-settings')}
                                    />
                                    <SidebarItem
                                        icon={<HelpCircle size={14} />}
                                        label="Get Help"
                                        active={currentView === 'dashboard-help' || currentView === 'help'}
                                        onClick={() => onNavigate('help')}
                                    />
                                </nav>
                            </div>
                        </>
                    ) : (
                        /* --- MARKETPLACE SIDEBAR LAYOUT --- */
                        <>
                            {/* QUICK ACTIONS (Logged In Only) */}
                            {isLoggedIn && (
                                <div>
                                    <div className="text-[9px] font-bold text-neutral-500 px-3 mb-2 uppercase tracking-widest">
                                        Quick Actions
                                    </div>
                                    <nav className="space-y-0">
                                        <SidebarAction icon={<Upload size={14} />} label="Upload Track" onClick={() => onNavigate('upload')} />
                                        <SidebarAction icon={<PlusCircle size={14} />} label="New Project" onClick={() => onNavigate('dashboard-studio')} />
                                    </nav>
                                </div>
                            )}

                            {/* NAVIGATION */}
                            <div>
                                <div className="text-[9px] font-bold text-neutral-500 px-3 mb-2 uppercase tracking-widest">
                                    Navigation
                                </div>
                                <nav className="space-y-0">
                                    <SidebarItem
                                        icon={<Search size={14} />}
                                        label="Discover"
                                        active={currentView === 'home'}
                                        onClick={() => onNavigate('home')}
                                    />
                                    <SidebarItem
                                        icon={<Users size={14} />}
                                        label="Browse Talent"
                                        active={currentView === 'browse-talent'}
                                        onClick={() => onNavigate('browse-talent')}
                                    />
                                    <SidebarItem
                                        icon={<MessageSquare size={14} />}
                                        label="Collaborate"
                                        active={currentView === 'collaborate'}
                                        onClick={() => onNavigate('collaborate')}
                                    />
                                    {isLoggedIn && (
                                        <>
                                            <SidebarItem
                                                icon={<Headphones size={14} />}
                                                label="My Studio"
                                                onClick={() => onNavigate('dashboard-studio')}
                                            />
                                            <SidebarItem
                                                icon={<Briefcase size={14} />}
                                                label="Manage Orders"
                                                onClick={() => onNavigate('dashboard-manage')}
                                            />
                                        </>
                                    )}
                                </nav>
                            </div>

                            {/* FOLLOWING (Logged In Only) */}
                            {isLoggedIn && (
                                <div className={following.length === 0 ? "hidden lg:block" : ""}>
                                    <div className="flex items-center justify-between px-3 mb-2 group cursor-pointer" onClick={() => onNavigate('browse-talent')}>
                                        <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest group-hover:text-neutral-300 transition-colors">
                                            Following
                                        </div>
                                        <span className="text-[8px] font-mono font-bold text-neutral-600 bg-neutral-900 border border-neutral-800 px-1 py-0.5 rounded">
                                            {following.length}
                                        </span>
                                    </div>
                                    <div className="space-y-1 mb-4">
                                        {loadingFollowing ? (
                                            <div className="flex items-center justify-center py-3">
                                                <div className="w-4 h-4 border border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                            </div>
                                        ) : following.length > 0 ? following.map((talent) => (
                                            <div
                                                key={talent.id}
                                                onClick={() => onNavigate('browse-talent')}
                                                className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg group transition-all text-left cursor-pointer"
                                            >
                                                <div className="relative shrink-0">
                                                    <img src={talent.avatar} alt={talent.username} className="w-6 h-6 rounded-md object-cover border border-white/10 group-hover:border-white/30 transition-colors" />
                                                    {talent.isVerified && (
                                                        <div className="absolute -bottom-1 -right-1 bg-[#050505] rounded-full p-[1px]">
                                                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 overflow-hidden">
                                                    <div className="text-[10px] font-bold text-neutral-400 group-hover:text-white truncate transition-colors">{talent.username}</div>
                                                    <div className="text-[9px] text-neutral-600 font-mono truncate group-hover:text-neutral-500 transition-colors">{talent.handle}</div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onNavigate('dashboard-messages');
                                                    }}
                                                    className="p-1 text-neutral-500 hover:text-white hover:bg-white/10 rounded-md transition-all"
                                                >
                                                    <MessageSquare size={10} />
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="px-2 py-3 text-center">
                                                <p className="text-[9px] text-neutral-600 font-mono">No following yet</p>
                                                <p className="text-[8px] text-neutral-700 mt-1">Follow creators to see them here</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => onNavigate('browse-talent')}
                                            className="w-full flex items-center justify-between px-2 py-1.5 text-[9px] font-bold text-neutral-600 hover:text-white transition-colors group border-t border-white/5 mt-2"
                                        >
                                            <span>View all creators</span>
                                            <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* LIBRARY (Logged In Only) */}
                            {isLoggedIn && (
                                <div>
                                    <div className="text-[9px] font-bold text-neutral-500 px-3 mb-2 uppercase tracking-widest">
                                        Library
                                    </div>
                                    <nav className="space-y-0">
                                        <SidebarItem
                                            icon={<LayoutGrid size={14} />}
                                            label="My Library"
                                            active={currentView === 'library'}
                                            onClick={() => onNavigate('library')}
                                        />
                                        <SidebarItem
                                            icon={<FileText size={14} />}
                                            label="Contracts"
                                            onClick={() => onNavigate('contracts')}
                                        />
                                        <SidebarItem
                                            icon={<Clipboard size={14} />}
                                            label="Notes"
                                            onClick={() => onNavigate('notes')}
                                        />
                                    </nav>
                                </div>
                            )}

                            {/* RESOURCES */}
                            <div>
                                <div className="text-[9px] font-bold text-neutral-500 px-3 mb-2 uppercase tracking-widest">
                                    Resources
                                </div>
                                <nav className="space-y-0">
                                    <SidebarItem
                                        icon={<Settings size={14} />}
                                        label="Settings"
                                        active={currentView === 'settings'}
                                        onClick={() => onNavigate('settings')}
                                    />
                                    <SidebarItem
                                        icon={<HelpCircle size={14} />}
                                        label="Get Help"
                                        active={currentView === 'help'}
                                        onClick={() => onNavigate('help')}
                                    />
                                </nav>
                            </div>
                        </>
                    )}

                </div>

                {/* Footer - Storage & Profile or Guest */}
                <div className="p-4 border-t border-neutral-800 bg-[#080808] shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">

                    {isLoggedIn ? (
                        <>
                            {/* Storage Info */}
                            <div className="mb-4 px-0.5">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Storage</span>
                                    <span className="text-[9px] font-mono text-neutral-500 font-bold">{formatStorageSize(storageUsage.used)} / {formatStorageSize(storageUsage.limit)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(var(--primary),0.3)]"
                                        style={{ width: `${Math.min((storageUsage.used / storageUsage.limit) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="h-px bg-neutral-800/50 mb-4"></div>

                            {/* User Profile */}
                            {profileLoading || !userProfile ? (
                                <div className="flex items-center gap-3 p-1">
                                    {/* Avatar Skeleton */}
                                    <div className="h-9 w-9 rounded-lg bg-neutral-800 animate-pulse shrink-0"></div>

                                    <div className="flex-1 min-w-0 space-y-2">
                                        {/* Username Skeleton */}
                                        <div className="h-3 w-20 bg-neutral-800 animate-pulse rounded"></div>
                                        {/* Email Skeleton */}
                                        <div className="h-2 w-28 bg-neutral-800 animate-pulse rounded"></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 group cursor-pointer hover:bg-white/5 p-1.5 -mx-1.5 rounded-xl transition-all" onClick={() => window.location.href = `/@${userProfile?.handle || 'user'}`}>
                                    {/* Avatar - Square */}
                                    <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden relative shrink-0 group-hover:border-primary/40 transition-colors">
                                        <img src={userProfile?.avatar || 'https://i.pravatar.cc/150?u=user'} alt={userProfile?.username || 'User'} className="h-full w-full object-cover" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] font-bold text-white truncate group-hover:text-primary transition-colors">{userProfile?.username || 'User'}</div>
                                        <div className="text-[10px] text-neutral-500 truncate font-mono mt-0.5">{userProfile?.email || 'user@example.com'}</div>
                                    </div>

                                    <button className="p-2 text-neutral-500 hover:text-white transition-colors hover:bg-white/5 rounded-lg">
                                        <MoreVertical size={14} />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* GUEST FOOTER */
                        <div className="p-1.5 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500 border border-neutral-700">
                                    <Users size={12} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-white">Guest User</div>
                                    <div className="text-[8px] text-neutral-500">Sign in to unlock features</div>
                                </div>
                            </div>
                            <button
                                onClick={onOpenAuth}
                                className="w-full py-1.5 bg-white text-black font-bold rounded-lg text-[10px] flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                            >
                                <LogIn size={12} /> Log In / Sign Up
                            </button>
                        </div>
                    )}
                </div>
            </aside >
        </>
    );
};

interface SidebarActionProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}

const SidebarAction: React.FC<SidebarActionProps> = ({ icon, label, onClick }) => {
    return (
        <button onClick={onClick} className="w-full flex items-center space-x-2 px-2 py-1.5 text-[10px] font-bold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all mb-1 group">
            <span className="text-primary group-hover:scale-110 transition-transform">{icon}</span>
            <span>{label}</span>
        </button>
    )
}

interface SidebarItemProps {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg transition-all group
                ${active
                    ? 'bg-primary/10 text-primary font-bold border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.15)]'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
                }
            `}
        >
            <span className={active ? '' : 'group-hover:text-white transition-colors'}>{icon}</span>
            <span className="text-[10px] tracking-wide">{label}</span>
            {active && <div className="ml-auto w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_rgb(var(--primary))]"></div>}
        </button>
    )
}

export default Sidebar;