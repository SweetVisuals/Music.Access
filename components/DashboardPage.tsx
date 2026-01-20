import React, { useState, useEffect } from 'react';
import { View, Project, Purchase, UserProfile, DashboardAnalytics } from '../types';
import ProjectCard from './ProjectCard';
// CustomerOrderDetail is defined properly in this file now
import { ContractSigningModal } from './ContractSigningModal';
import {
    DollarSign,
    ShoppingCart,
    Target,
    AlertTriangle,
    Users,
    Briefcase,
    Play,
    Gem,
    MoreHorizontal,
    Radio,
    ChevronDown,
    TrendingUp,
    User,
    Plus,
    FileText,
    Settings,
    Calendar,
    CreditCard,
    ArrowUpRight,
    Download,
    Package,
    Music,
    Mic2,
    Disc,
    MessageSquare,
    ArrowLeft,
    Clock,
    CheckCircle,
    Paperclip,
    Send,
    Link,
    X,
    Terminal,
    LayoutGrid,
    Info,
    ShoppingBag
} from 'lucide-react';
import Studio from './Studio';
import GoalsPage from './GoalsPage';
import WalletPage from './WalletPage';

import { MOCK_PURCHASES } from '../constants';
import {
    getPurchases,
    getSales,
    getDashboardAnalytics,
    subscribeToArtistPresence,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    archiveSale,
    unarchiveSale,
    supabase,
    recordDailyMetric
} from '../services/supabaseService';

interface DashboardPageProps {
    view: View;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    currentTrackId: string | null;
    isPlaying: boolean;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
    userProfile: UserProfile;
    onNavigate: (view: View | string) => void;
}



const DownloadCard = ({ title, type, purchase, isPackage }: any) => (
    <div className="bg-neutral-900 border border-transparent rounded-xl p-4 flex flex-col gap-4 hover:border-white/10 transition-colors group relative overflow-hidden">
        {/* Background Image Effect */}
        {purchase.image && (
            <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
                <img src={purchase.image} className="w-full h-full object-cover blur-sm" />
            </div>
        )}
        <div className="flex items-start justify-between relative z-10">
            <div className="w-10 h-10 bg-neutral-800 rounded-lg flex items-center justify-center text-white border border-white/5">
                {isPackage ? <Package size={20} /> : <Music size={20} />}
            </div>
            <span className="text-[10px] text-neutral-500 font-bold uppercase px-2 py-1 bg-black/50 rounded border border-white/5">
                {type}
            </span>
        </div>

        <div className="relative z-10">
            <h4 className="font-bold text-white text-sm mb-1 line-clamp-1">{title}</h4>
            <p className="text-[10px] text-neutral-500 font-mono">
                {isPackage ? 'ZIP Archive' : 'MP3 • WAV • STEMS'}
            </p>
        </div>

        <div className="flex gap-2 relative z-10 mt-auto pt-2">
            {!isPackage ? (
                <>
                    <button className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[10px] font-bold text-neutral-300 hover:text-white transition-colors">
                        MP3
                    </button>
                    <button className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded text-[10px] font-bold text-neutral-300 hover:text-white transition-colors">
                        WAV
                    </button>
                </>
            ) : null}
            <button className={`${isPackage ? 'w-full' : 'px-3'} py-1.5 bg-white text-black hover:bg-neutral-200 rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-2`}>
                <Download size={12} /> {isPackage ? 'Download ZIP' : ''}
            </button>
        </div>
    </div>
);

const DashboardPage: React.FC<DashboardPageProps> = ({
    view,
    projects,
    setProjects,
    currentTrackId,
    isPlaying,
    onPlayTrack,
    onTogglePlay,
    userProfile,
    onNavigate
}) => {
    const [selectedStat, setSelectedStat] = useState<'revenue' | 'listeners' | 'plays' | 'orders' | 'gems'>('revenue');
    const [dashboardAnalytics, setDashboardAnalytics] = useState<DashboardAnalytics | null>(null);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '6m' | '12m' | 'all'>('7d');
    const [isTimeRangeOpen, setIsTimeRangeOpen] = useState(false);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isClearing, setIsClearing] = useState(false);
    const [liveListeners, setLiveListeners] = useState(0);

    // Subscribe to live listeners
    useEffect(() => {
        if (!userProfile?.id) return;

        const channel = subscribeToArtistPresence(userProfile.id, (count) => {
            setLiveListeners(count);
            // Log this metric for history
            if (count > 0) {
                recordDailyMetric(userProfile.id, 'listeners', count).catch(console.error);
            }
        });

        return () => {
            channel.unsubscribe();
        };
    }, [userProfile?.id]);

    // Record followers on load
    useEffect(() => {
        if (dashboardAnalytics?.totalFollowers && userProfile?.id) {
            recordDailyMetric(userProfile.id, 'followers', dashboardAnalytics.totalFollowers).catch(console.error);
        }
    }, [dashboardAnalytics?.totalFollowers, userProfile?.id]);

    // State for Purchases/Orders View
    const [activePurchaseTab, setActivePurchaseTab] = useState<'all' | 'beats' | 'kits' | 'services'>('all');
    const [selectedOrder, setSelectedOrder] = useState<Purchase | null>(null);
    const [viewingReceipt, setViewingReceipt] = useState<Purchase | null>(null);
    const [signingContractId, setSigningContractId] = useState<string | null>(null);
    const [viewingContractId, setViewingContractId] = useState<string | null>(null);
    const [selectedSale, setSelectedSale] = useState<Purchase | null>(null); // Lifted state

    const handleSignContract = (contractId: string) => {
        setSigningContractId(contractId);
    };

    const handleContractSigned = () => {
        fetchCoreData();
    };

    const handleClearActivity = async () => {
        if (!userProfile?.id) return;
        setIsClearing(true);
        try {
            await markAllNotificationsAsRead(userProfile.id);
            // Refresh analytics to show empty list
            await fetchAnalytics();
        } catch (error) {
            console.error("Error clearing activity:", error);
        } finally {
            setIsClearing(false);
        }
    };
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [sales, setSales] = useState<Purchase[]>([]);

    // Fetch purchases and sales (independent of timeRange)
    // Fetch purchases and sales (Core Data - Once)
    const fetchCoreData = async () => {
        setIsLoading(true);
        try {
            console.log("Fetching core dashboard data...");
            const [purchasesData, salesData] = await Promise.all([
                getPurchases(),
                getSales(),
            ]);
            setPurchases(purchasesData);
            setSales(salesData);
        } catch (error) {
            console.error('Error fetching core data:', error);
            setPurchases(MOCK_PURCHASES);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCoreData();
    }, []);

    useEffect(() => {
        if (view === 'dashboard-sales' || view === 'dashboard-orders') {
            fetchCoreData();
        }
    }, [view]);

    // Fetch Analytics (Depends on timeRange)
    const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
            const data = await getDashboardAnalytics(timeRange);
            setDashboardAnalytics(data);
        } catch (error) {
            console.error('Error fetching dashboard analytics:', error);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    // Initial fetch and fetch on TimeRange change
    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]); // Removed userProfile?.id dependency as getDashboardAnalytics gets user internally

    // Listen for global profile updates (e.g. Gem Claim) to refresh chart
    useEffect(() => {
        const handleProfileUpdate = () => {
            console.log("Profile updated, refreshing dashboard analytics...");
            fetchAnalytics();
        };

        window.addEventListener('profile-updated', handleProfileUpdate);
        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate);
        };
    }, [timeRange]); // Re-bind if timeRange changes so fetchAnalytics uses current range

    // Mark notifications as read when visiting relevant views
    useEffect(() => {
        const markViewNotificationsRead = async () => {
            if (!userProfile?.id) return;

            let type: string | null = null;
            if (view === 'dashboard-sales') type = 'sale';
            if (view === 'dashboard-orders') type = 'order';
            if (view === 'dashboard-manage') type = 'manage_order';

            if (type) {
                try {
                    const { data: unread } = await supabase
                        .from('notifications')
                        .select('id')
                        .eq('user_id', userProfile.id)
                        .eq('type', type)
                        .eq('read', false);

                    if (unread && unread.length > 0) {
                        await Promise.all(unread.map(n => markNotificationAsRead(n.id)));
                        // Dispatch event to refresh sidebar if needed
                        window.dispatchEvent(new CustomEvent('notifications-updated'));
                    }
                } catch (e) {
                    console.error("Error clearing notifications for view", e);
                }
            }
        };
        markViewNotificationsRead();
    }, [view, userProfile?.id]);

    // Helper function to get safe user profile values
    const getSafeUserProfileValue = (value: any, fallback: any) => {
        return value === null || value === undefined ? fallback : value;
    };

    // --- ORDER VIEW LOGIC (Lifted to top level to avoid hook errors) ---
    // Filter Purchases
    const filteredOrders = purchases.filter(p => {
        if (activePurchaseTab === 'all') return true;
        if (activePurchaseTab === 'beats') return p.type === 'Beat License';
        if (activePurchaseTab === 'kits') return p.type === 'Sound Kit';
        if (activePurchaseTab === 'services') return p.type === 'Service' || p.type === 'Mixing';
        return true;
    });

    // Auto-select first order on desktop if none selected
    useEffect(() => {
        if (view === 'dashboard-orders') {
            if (window.innerWidth >= 1024 && !selectedOrder && filteredOrders.length > 0) {
                // Determine if we should auto-select logic here if desired
                // setSelectedOrder(filteredOrders[0]);
            }
        }
    }, [view, filteredOrders, selectedOrder]);

    // --- SUB-COMPONENTS FOR SIMPLE VIEWS ---

    const SalesView = () => {
        const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
        const [showArchived, setShowArchived] = useState(false);
        // selectedSale uses parent state now

        // Filter Sales Logic
        const filteredSales = sales.filter(sale => {
            const saleDate = new Date((sale as any).createdAt || sale.date); // Use raw timestamp
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today

            // 1. Archive Filter
            if (!showArchived && (sale as any).archived) return false;
            if (showArchived && !(sale as any).archived) return false;

            // 2. Date Filter
            const saleTime = saleDate.getTime();
            if (filter === 'today') {
                return saleTime >= today.getTime();
            }
            if (filter === 'week') {
                const lastWeek = new Date(today);
                lastWeek.setDate(today.getDate() - 7);
                return saleTime >= lastWeek.getTime();
            }
            if (filter === 'month') {
                const lastMonth = new Date(today);
                lastMonth.setMonth(today.getMonth() - 1);
                return saleTime >= lastMonth.getTime();
            }
            return true;
        });


        // Group by Date for Display
        const groupedSales = filteredSales.reduce((acc, sale) => {
            const dateKey = sale.date; // already formatted
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(sale);
            return acc;
        }, {} as Record<string, Purchase[]>);

        return (
            <div className="w-full max-w-[1600px] mx-auto px-4 pt-6 pb-32 lg:p-8 animate-in fade-in duration-500 relative">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl lg:text-5xl font-black text-white mb-1 tracking-tighter">Sales History</h1>
                        <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">Detailed overview of your marketplace transactions.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Filter Toggles */}
                        <div className="flex bg-neutral-900 p-1 rounded-lg border border-white/5">
                            {(['all', 'today', 'week', 'month'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${filter === f ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    {f === 'all' ? 'All Time' : f}
                                </button>
                            ))}
                        </div>

                        {/* Archive Toggle */}
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors flex items-center gap-2 ${showArchived ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-neutral-900 border-white/5 text-neutral-400 hover:text-white'}`}
                        >
                            <Package size={14} />
                            {showArchived ? 'Viewing Archived' : 'View Archive'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {(() => {
                        const filteredRevenue = filteredSales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
                        const filteredAvgOrder = filteredSales.length > 0 ? filteredRevenue / filteredSales.length : 0;

                        return (
                            <>
                                <StatCard
                                    title="Total Revenue"
                                    value={`$${filteredRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    icon={<DollarSign size={20} />}
                                    trend={filter === 'all' ? "+12%" : "Filtered"} // static trend for now, but label explicitly if filtered
                                    positive
                                    color="text-emerald-400"
                                    bgColor="bg-emerald-400/10"
                                />
                                <StatCard
                                    title="Pending Payouts"
                                    value="$0.00"
                                    icon={<CreditCard size={20} />}
                                    subtext="Next payout: Fri"
                                    color="text-blue-400"
                                    bgColor="bg-blue-400/10"
                                />
                                <StatCard
                                    title="Avg. Order Value"
                                    value={`$${filteredAvgOrder.toFixed(2)}`}
                                    icon={<ShoppingCart size={20} />}
                                    trend="-2%"
                                    positive={false}
                                    color="text-orange-400"
                                    bgColor="bg-orange-400/10"
                                    className="hidden md:block"
                                />
                            </>
                        );
                    })()}
                </div>

                <div className="space-y-8">
                    {filteredSales.length === 0 ? (
                        <div className="text-center py-20 bg-neutral-900/30 rounded-2xl border border-white/5 border-dashed">
                            <ShoppingCart size={32} className="mx-auto text-neutral-600 mb-3" />
                            <p className="text-neutral-500 font-medium">No sales found for this period.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {filteredSales.map((sale) => {
                                // Map Sale to Project structure for ProjectCard
                                // CRITICAL: We map the *Buyer* to the *Producer* fields so the card shows who BOUGHT it.

                                // Filter tracks to only show what was purchased
                                let displayTracks = sale.tracks || [];
                                if (sale.type === 'Beat License' || sale.type === 'Exclusive License') {
                                    // 1. Try precise matching if trackId is available
                                    const purchasedTrackId = sale.purchaseItems?.[0]?.trackId;
                                    const preciseMatch = sale.tracks?.find(t => t.id === purchasedTrackId);

                                    if (preciseMatch) {
                                        displayTracks = [preciseMatch];
                                    } else {
                                        // 2. Fallback to robust name matching
                                        const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                                        const saleItemNorm = normalize(sale.item);

                                        const matchedTrack = sale.tracks?.find(t => {
                                            const trackTitleNorm = normalize(t.title);
                                            return saleItemNorm.includes(trackTitleNorm) || trackTitleNorm.includes(saleItemNorm);
                                        });

                                        if (matchedTrack) {
                                            displayTracks = [matchedTrack];
                                        } else if (sale.tracks && sale.tracks.length > 0) {
                                            // 3. Last resort fallback to first track
                                            displayTracks = [sale.tracks[0]];
                                        }
                                    }
                                }

                                const projectData: Project = {
                                    id: sale.id,
                                    title: sale.item,
                                    producer: sale.buyer || 'Guest User',
                                    producerAvatar: sale.buyerAvatar || undefined,
                                    price: sale.amount,
                                    bpm: 0,
                                    genre: sale.type,
                                    type: sale.type === 'Sound Kit' ? 'sound_pack' : 'beat_tape',
                                    tags: [sale.status],
                                    tracks: displayTracks,
                                    coverImage: sale.image,
                                    status: 'published'
                                };

                                return (
                                    <div key={sale.id} className="h-[282px]">
                                        <ProjectCard
                                            project={projectData}
                                            isPurchased={true}
                                            hideEmptySlots={true}
                                            customMenuItems={[
                                                {
                                                    label: 'Transaction Details',
                                                    icon: <Info size={14} />,
                                                    onClick: () => setSelectedSale(sale)
                                                },
                                                {
                                                    label: (sale as any).archived ? 'Unarchive' : 'Archive',
                                                    icon: (sale as any).archived ? <ArrowUpRight size={14} /> : <Package size={14} />,
                                                    onClick: async () => {
                                                        if ((sale as any).archived) await unarchiveSale(sale.id);
                                                        else await archiveSale(sale.id);

                                                        // Optimistic Update
                                                        setSales(prev => prev.map(p =>
                                                            p.id === sale.id ? { ...p, archived: !(sale as any).archived } : p
                                                        ));
                                                    }
                                                }
                                            ]}
                                            onPlay={() => { }} // No playback for sales items usually, unless we have the track ID
                                            onAction={() => setSelectedSale(sale)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Detailed Transaction Modal */}
                {selectedSale && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedSale(null)}>
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex justify-between items-start bg-neutral-900/30">
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tight">Transaction Details</h2>
                                    <p className="text-xs text-neutral-500 font-mono mt-1">ID: {selectedSale.id}</p>
                                </div>
                                <button onClick={() => setSelectedSale(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Status Banner */}
                                <div className={`flex items-center gap-3 p-3 rounded-xl border ${selectedSale.status === 'Completed' ? 'bg-green-500/5 border-green-500/20' : 'bg-blue-500/5 border-blue-500/20'
                                    }`}>
                                    <div className={`p-2 rounded-lg ${selectedSale.status === 'Completed' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                        {selectedSale.status === 'Completed' ? <CheckCircle size={18} /> : <Clock size={18} />}
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold ${selectedSale.status === 'Completed' ? 'text-green-500' : 'text-blue-500'}`}>Payment {selectedSale.status}</div>
                                        <div className="text-[10px] text-neutral-500">Processed on {selectedSale.date} at {new Date((selectedSale as any).created_at || new Date()).toLocaleTimeString()}</div>
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Item Purchased</h3>
                                    <div className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="w-12 h-12 bg-neutral-800 rounded-lg overflow-hidden">
                                            <img src={selectedSale.image} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-white text-sm">{selectedSale.item}</div>
                                            <div className="text-xs text-neutral-500">{selectedSale.type}</div>
                                        </div>
                                        <div className="font-mono font-bold text-white">${selectedSale.amount.toFixed(2)}</div>
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div>
                                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Customer</h3>
                                    <div className="flex items-center gap-4">
                                        {selectedSale.buyerAvatar ? (
                                            <img src={selectedSale.buyerAvatar} className="w-10 h-10 rounded-full border border-white/10" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500">
                                                <User size={18} />
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-white text-sm">{selectedSale.buyer}</div>
                                            {/* If email is available (it's in the interface now), display masked */}
                                            <div className="text-xs text-neutral-500">{(selectedSale as any).buyerEmail || 'Email hidden'}</div>
                                        </div>
                                        <button className="ml-auto p-2 border border-white/5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors">
                                            <MessageSquare size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Financial Breakdown */}
                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <div className="flex justify-between text-xs text-neutral-400">
                                        <span>Subtotal</span>
                                        <span>${selectedSale.amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-neutral-400">
                                        <span>Platform Fee (0%)</span>
                                        <span>$0.00</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/5 mt-2">
                                        <span>Net Earnings</span>
                                        <span className="text-emerald-500">+${selectedSale.amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 bg-neutral-900/50 border-t border-white/5 flex gap-3">
                                <button className="flex-1 py-3 bg-white text-black font-bold rounded-xl text-xs hover:bg-neutral-200 transition-colors">
                                    Download Invoice
                                </button>
                                <button
                                    className="px-4 py-3 bg-white/5 text-neutral-400 hover:text-white font-bold rounded-xl text-xs hover:bg-white/10 transition-colors border border-white/5"
                                    onClick={async () => {
                                        // Archive from modal logic
                                        if ((selectedSale as any).archived) await unarchiveSale(selectedSale.id);
                                        else await archiveSale(selectedSale.id);

                                        // Optimistic Update
                                        setSales(prev => prev.map(p =>
                                            p.id === selectedSale.id ? { ...p, archived: !(selectedSale as any).archived } : p
                                        ));
                                        setSelectedSale(null);
                                    }}
                                >
                                    {(selectedSale as any).archived ? 'Unarchive' : 'Archive'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };



    // --- ROUTING ---

    if (view === 'dashboard-studio') {
        return <Studio
            projects={projects}
            setProjects={setProjects}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onPlayTrack={onPlayTrack}
            onTogglePlay={onTogglePlay}
            userProfile={userProfile}
        />;
    }

    if (view === 'dashboard-sales') {
        return <SalesView />;
    }

    if (view === 'dashboard-goals') {
        return <GoalsPage onNavigate={onNavigate} />;
    }

    if (view === 'dashboard-wallet') {
        return <WalletPage userProfile={userProfile} />;
    }

    if (view === 'dashboard-manage') {
        return <SalesView />;
    }

    if (view === 'dashboard-orders') {
        // --- NEW ORDERS VIEW IMPLEMENTATION ---



        return (
            <div className="flex h-full w-full overflow-hidden bg-[#050505]">
                {/* Orders View - Grid Mode vs Detail Mode */}
                <div className="flex-1 flex flex-col min-h-0">
                    {!selectedOrder ? (
                        /* Grid View */
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                                <div>
                                    <h1 className="text-3xl font-black text-white tracking-tighter mb-1">My Orders</h1>
                                    <p className="text-neutral-500 text-sm max-w-2xl">
                                        Manage your purchased beats, kits, and services.
                                    </p>
                                </div>
                                <div className="flex bg-neutral-900 p-1 rounded-lg border border-white/5 self-start md:self-auto">
                                    {(['all', 'beats', 'kits', 'services'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActivePurchaseTab(tab)}
                                            className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${activePurchaseTab === tab ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-white'}`}
                                        >
                                            {tab === 'all' ? 'All Orders' : tab}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="text-center py-20 text-neutral-500">Loading orders...</div>
                            ) : filteredOrders.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                                    {filteredOrders.map((purchase) => {
                                        // Determine Lock State
                                        const isLocked = purchase.contractId && purchase.contractStatus !== 'signed';

                                        // Convert Purchase to Project for Card
                                        const projectData: Project = {
                                            id: purchase.id,
                                            title: purchase.item,
                                            producer: purchase.seller,
                                            producerAvatar: purchase.sellerAvatar,
                                            price: purchase.amount,
                                            bpm: purchase.metadata?.bpm || 0,
                                            key: purchase.metadata?.key || undefined,
                                            genre: purchase.type,
                                            type: purchase.type === 'Sound Kit' ? 'sound_pack' : 'beat_tape',
                                            tags: [purchase.status],
                                            tracks: purchase.tracks || [],
                                            coverImage: purchase.image,
                                            status: 'published',
                                            contractId: purchase.contractId,
                                            userId: purchase.sellerId || 'unknown' // Required for Project type but used for context
                                        };

                                        return (
                                            <div key={purchase.id} className="h-full">
                                                <ProjectCard
                                                    project={projectData}
                                                    currentTrackId={currentTrackId}
                                                    isPlaying={isPlaying}
                                                    onPlayTrack={(trackId) => onPlayTrack(projectData, trackId)}
                                                    onTogglePlay={onTogglePlay}
                                                    isPurchased={true}
                                                    isLocked={!!isLocked}
                                                    onUnlock={() => purchase.contractId && handleSignContract(purchase.contractId)}
                                                    onAction={(!isLocked) ? (() => setSelectedOrder(purchase)) : undefined}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-neutral-900/30 rounded-2xl border border-white/5 border-dashed">
                                    <ShoppingBag size={32} className="mx-auto text-neutral-600 mb-3" />
                                    <p className="text-neutral-500 font-medium">No orders found.</p>
                                    <button onClick={() => onNavigate('home')} className="mt-4 px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition-colors">
                                        Browse Marketplace
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Detail View - Full Screen */
                        <CustomerOrderDetail
                            purchase={selectedOrder}
                            onBack={() => setSelectedOrder(null)}
                            onSignContract={handleSignContract}
                            onViewContract={(id) => setViewingContractId(id)}
                        />
                    )}
                </div>

                <ContractSigningModal
                    isOpen={!!viewingContractId}
                    onClose={() => setViewingContractId(null)}
                    contractId={viewingContractId || ''}
                    onSigned={() => { }}
                    isReadOnly={true}
                />

                <ContractSigningModal
                    isOpen={!!signingContractId}
                    onClose={() => setSigningContractId(null)}
                    contractId={signingContractId || ''}
                    onSigned={handleContractSigned}
                    isReadOnly={false}
                />
            </div>
        );
    }

    // Default: Overview - Use real data or fallbacks
    // Prefer chartData (new) over monthlyData (old)
    const chartSource = (dashboardAnalytics?.chartData && dashboardAnalytics.chartData.length > 0)
        ? dashboardAnalytics.chartData
        : (dashboardAnalytics?.monthlyData || []);

    const chartData = chartSource as any[]; // Type assertion for flexibility

    // Safety check for empty data
    if (chartData.length === 0) {
        // Fallback or empty placeholder if desired
    }

    const currentChart = {
        revenue: { label: 'Revenue Analytics', data: chartData.map(d => d.revenue), unit: '$' },
        listeners: { label: 'Live Listener Analytics', data: chartData.map(d => d.listeners), unit: '' },
        plays: { label: 'Play Analytics', data: chartData.map(d => d.plays), unit: '' },
        orders: { label: 'Order Analytics', data: chartData.map(d => d.orders), unit: '' },
        gems: { label: 'Gem Balance History', data: chartData.map(d => d.gems), unit: '' }
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto pb-32 lg:pb-8 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl lg:text-5xl font-black text-white tracking-tighter mb-1">Dashboard</h1>
                    <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">Overview of your studio performance.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-xs font-medium text-neutral-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>System Online</span>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsTimeRangeOpen(!isTimeRangeOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] border border-white/5 rounded-lg text-xs font-bold text-white hover:bg-white/5 transition-colors"
                        >
                            <Calendar size={14} className="text-neutral-500" />
                            <span>
                                {timeRange === '7d' ? 'Last 7 days' :
                                    timeRange === '30d' ? 'Last 30 days' :
                                        timeRange === '90d' ? 'Last 3 months' :
                                            timeRange === '6m' ? 'Last 6 months' :
                                                timeRange === '12m' ? 'Last Year' : 'All Time'}
                            </span>
                            <ChevronDown size={12} className="text-neutral-500 ml-1" />
                        </button>

                        {isTimeRangeOpen && (
                            <div className="absolute right-0 top-full mt-2 w-40 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-xl z-50 py-1">
                                {[
                                    { value: '7d', label: 'Last 7 days' },
                                    { value: '30d', label: 'Last 30 days' },
                                    { value: '90d', label: 'Last 3 months' },
                                    { value: '6m', label: 'Last 6 months' },
                                    { value: '12m', label: 'Last Year' },
                                    { value: 'all', label: 'All Time' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            setTimeRange(option.value as any);
                                            setIsTimeRangeOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/5 transition-colors ${timeRange === option.value ? 'text-white' : 'text-neutral-400'}`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Stats Row - Use real data */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                    title="Total Revenue"
                    value={`$${(dashboardAnalytics?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    trend={dashboardAnalytics?.revenueChange ? `${dashboardAnalytics.revenueChange >= 0 ? '+' : ''}${dashboardAnalytics.revenueChange.toFixed(1)}%` : undefined}
                    positive={(dashboardAnalytics?.revenueChange || 0) >= 0}
                    icon={<DollarSign size={20} />}
                    color="text-emerald-400"
                    bgColor="bg-emerald-400/10"
                    borderColor="border-emerald-400/20"
                    isActive={selectedStat === 'revenue'}
                    onClick={() => setSelectedStat('revenue')}
                />
                <StatCard
                    title="Live Listeners"
                    value={liveListeners.toString()}
                    trend={dashboardAnalytics?.listenersChange ? `${dashboardAnalytics.listenersChange >= 0 ? '+' : ''}${dashboardAnalytics.listenersChange.toFixed(1)}%` : undefined}
                    positive={(dashboardAnalytics?.listenersChange || 0) >= 0}
                    live={liveListeners > 0}
                    icon={<Radio size={20} />}
                    color="text-red-500"
                    bgColor="bg-red-500/10"
                    borderColor="border-red-500/20"
                    isActive={selectedStat === 'listeners'}
                    onClick={() => setSelectedStat('listeners')}
                />
                <StatCard
                    title="Total Plays"
                    value={(dashboardAnalytics?.totalPlays || 0).toLocaleString()}
                    trend={dashboardAnalytics?.playsChange ? `${dashboardAnalytics.playsChange >= 0 ? '+' : ''}${dashboardAnalytics.playsChange.toFixed(1)}%` : undefined}
                    positive={(dashboardAnalytics?.playsChange || 0) >= 0}
                    icon={<Play size={20} />}
                    color="text-blue-400"
                    bgColor="bg-blue-400/10"
                    borderColor="border-blue-400/20"
                    isActive={selectedStat === 'plays'}
                    onClick={() => setSelectedStat('plays')}
                />
                <StatCard
                    title="Active Orders"
                    value={(dashboardAnalytics?.activeOrders || 0).toString()}
                    trend={dashboardAnalytics?.ordersChange ? `${dashboardAnalytics.ordersChange >= 0 ? '+' : ''}${dashboardAnalytics.ordersChange.toFixed(1)}%` : undefined}
                    positive={(dashboardAnalytics?.ordersChange || 0) >= 0}
                    icon={<ShoppingCart size={20} />}
                    color="text-orange-400"
                    bgColor="bg-orange-400/10"
                    borderColor="border-orange-400/20"
                    isActive={selectedStat === 'orders'}
                    onClick={() => setSelectedStat('orders')}
                />
                <StatCard
                    title="Gems Balance"
                    value={getSafeUserProfileValue(userProfile?.gems, 0).toLocaleString()}
                    trend={dashboardAnalytics?.gemsChange ? `${dashboardAnalytics.gemsChange >= 0 ? '+' : ''}${dashboardAnalytics.gemsChange.toFixed(1)}%` : undefined}
                    positive={(dashboardAnalytics?.gemsChange || 0) >= 0}
                    icon={<Gem size={20} />}
                    subtext={`Approx. $${(getSafeUserProfileValue(userProfile?.gems, 0) * 0.01).toFixed(2)}`}
                    color="text-purple-400"
                    bgColor="bg-purple-400/10"
                    borderColor="border-purple-400/20"
                    isActive={selectedStat === 'gems'}
                    onClick={() => setSelectedStat('gems')}
                    className="hidden md:block"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Chart Section */}
                <div className="lg:col-span-2 bg-[#0a0a0a] border border-transparent rounded-xl p-6 min-h-[300px] flex flex-col relative overflow-hidden transition-all duration-500">
                    <div className="flex justify-between items-center mb-6 z-10">
                        <div>
                            <h3 className="text-sm font-bold text-white transition-all">{currentChart[selectedStat as keyof typeof currentChart]?.label || 'Analytics'}</h3>
                            <p className="text-[10px] text-neutral-500 font-mono">Performance over time</p>
                        </div>
                        <button className="p-2 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition-colors">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>

                    {/* Bar Chart */}
                    <div className="flex-1 flex items-end justify-between gap-2 mt-4 z-10 px-2 h-[200px]">
                        {(() => {
                            const data = currentChart[selectedStat as keyof typeof currentChart]?.data || [];
                            const maxVal = Math.max(...data, 1);
                            return data.map((h, i) => (
                                <div key={i} className="w-full bg-neutral-800/50 rounded-t-sm hover:bg-primary/50 transition-colors relative group h-full flex items-end">
                                    <div
                                        style={{ height: `${(h / maxVal) * 100}%` }}
                                        className="w-full bg-neutral-800 group-hover:bg-primary transition-all duration-500 rounded-t-sm ease-out"
                                    ></div>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[9px] py-1 px-2 rounded border border-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                        {currentChart[selectedStat as keyof typeof currentChart]?.unit}{h.toLocaleString()}
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] font-mono text-neutral-600 border-t border-white/5 pt-2">
                        {chartData.length > 0 ? (
                            // Show max 6-8 labels evenly distributed
                            chartData.filter((_, i) => {
                                const step = Math.ceil(chartData.length / 6);
                                return i === 0 || i === chartData.length - 1 || i % step === 0;
                            }).slice(0, 7).map((d, i) => (
                                <span key={i}>{d.label || d.date?.slice(5) || '-'}</span>
                            ))
                        ) : (
                            <span>No Data Available</span>
                        )}
                    </div>

                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] pointer-events-none"></div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-1 bg-[#0a0a0a] border border-transparent rounded-xl p-6 flex flex-col">
                    <div className="mb-6 flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-bold text-white">Recent Activity</h3>
                            <p className="text-[10px] text-neutral-500 font-mono">Latest notifications</p>
                        </div>
                        {(dashboardAnalytics?.recentActivity || []).length > 0 && (
                            <button
                                onClick={handleClearActivity}
                                disabled={isClearing}
                                className="text-[10px] font-bold text-neutral-500 hover:text-white transition-colors disabled:opacity-50"
                            >
                                {isClearing ? 'CLEARING...' : 'CLEAR'}
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-6 relative">
                        <div className={`absolute left-[11px] top-2 bottom-2 w-px bg-neutral-800 ${!dashboardAnalytics?.recentActivity?.length ? 'hidden md:block' : ''}`}></div>

                        {(dashboardAnalytics?.recentActivity || []).map((activity, idx) => (
                            <ActivityItem
                                key={idx}
                                icon={getActivityIcon(activity.icon)}
                                iconColor={getActivityColor(activity.color)}
                                title={activity.title}
                                desc={activity.description}
                                time={activity.time}
                            />
                        ))}

                        {/* No recent activity state */}
                        {!dashboardAnalytics?.recentActivity?.length && (
                            <div className="flex-1 flex items-center justify-center text-neutral-500">
                                <div className="text-center">
                                    <Clock size={24} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">No Recent Activity</p>
                                    <p className="text-xs text-neutral-600 mt-1">Activity will appear here when you start making sales</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Recent Orders Table */}
                <div className="lg:col-span-2 bg-[#0a0a0a] border border-transparent rounded-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                        <div>
                            <h3 className="text-sm font-bold text-white">Recent Orders</h3>
                            <p className="text-[10px] text-neutral-500 font-mono">Manage your sales</p>
                        </div>
                        <button className="text-[10px] font-bold text-primary hover:text-white transition-colors">VIEW ALL</button>
                    </div>

                    <div className="overflow-x-auto flex-1 flex flex-col">
                        {(dashboardAnalytics?.recentOrders || []).length > 0 ? (
                            <>
                                <table className="w-full text-left border-collapse hidden md:table">
                                    <thead>
                                        <tr className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider border-b border-white/5 bg-neutral-900/50">
                                            <th className="px-6 py-3 font-medium">Order ID</th>
                                            <th className="px-6 py-3 font-medium">Item</th>
                                            <th className="px-6 py-3 font-medium">Date</th>
                                            <th className="px-6 py-3 font-medium">Amount</th>
                                            <th className="px-6 py-3 font-medium text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs text-neutral-300">
                                        {dashboardAnalytics!.recentOrders.map((order, idx) => (
                                            <TableRow
                                                key={order.id}
                                                id={`#ORD-${idx + 1}`}
                                                item={order.item}
                                                date={order.date}
                                                amount={order.amount}
                                                status={order.status}
                                                statusColor={order.statusColor}
                                                onClick={() => {
                                                    const sale = sales.find(s => s.id === order.id);
                                                    if (sale) {
                                                        setSelectedSale(sale);
                                                        onNavigate('dashboard-sales');
                                                    }
                                                }}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                                {/* Mobile Card View */}
                                <div className="md:hidden">
                                    {dashboardAnalytics!.recentOrders.map((order, idx) => (
                                        <div
                                            key={order.id}
                                            onClick={() => {
                                                const sale = sales.find(s => s.id === order.id);
                                                if (sale) {
                                                    setSelectedSale(sale);
                                                    onNavigate('dashboard-sales');
                                                }
                                            }}
                                            className="p-4 border-b border-white/5 flex flex-col gap-3 hover:bg-white/5 transition-colors cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="text-sm font-bold text-white">{order.item}</div>
                                                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{order.date}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-bold text-white">{order.amount}</div>
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 ${order.statusColor}`}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-mono text-neutral-600">ID: #ORD-{idx + 1}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 text-center text-neutral-500 animate-in fade-in zoom-in-95 duration-500">
                                <ShoppingCart size={32} className="mb-3 opacity-20" />
                                <p className="text-sm font-bold text-white mb-1">No Recent Orders</p>
                                <p className="text-[10px] text-neutral-600 font-medium max-w-[200px] leading-relaxed">
                                    Your sales activity will automatically appear here once you start receiving orders.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="lg:col-span-1 bg-[#0a0a0a] border border-transparent rounded-xl p-6">
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-white">Quick Actions</h3>
                        <p className="text-[10px] text-neutral-500 font-mono">Shortcuts</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <QuickActionTile
                            icon={<Plus size={18} />}
                            label="New Upload"
                            onClick={() => onNavigate('upload')}
                        />
                        <QuickActionTile
                            icon={<FileText size={18} />}
                            label="Invoices"
                            onClick={() => onNavigate('dashboard-invoices')}
                        />
                        <QuickActionTile
                            icon={<Settings size={18} />}
                            label="Settings"
                            onClick={() => onNavigate('dashboard-settings')}
                        />
                        <QuickActionTile
                            icon={<Target size={18} />}
                            label="Goals"
                            onClick={() => onNavigate('dashboard-goals')}
                        />
                    </div>

                    <div className="mt-6 pt-6 border-t border-neutral-800">
                        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl p-4 relative overflow-hidden group cursor-pointer">
                            <div className="relative z-10">
                                <h4 className="text-primary font-bold text-sm mb-1">Pro Tips</h4>
                                <p className="text-[10px] text-neutral-400 leading-relaxed">
                                    Complete your profile to increase visibility by 25%.
                                </p>
                            </div>
                            <Gem className="absolute -bottom-2 -right-2 text-primary/10 w-16 h-16 group-hover:scale-110 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper functions for icons and colors
function getActivityIcon(iconName: string) {
    const iconMap = {
        ShoppingCart: <ShoppingCart size={12} />,
        User: <User size={12} />,
        DollarSign: <DollarSign size={12} />,
        AlertTriangle: <AlertTriangle size={12} />,
        Briefcase: <Briefcase size={12} />
    };
    return iconMap[iconName as keyof typeof iconMap] || <ShoppingCart size={12} />;
}

function getActivityColor(colorName: string) {
    const colorMap = {
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        emerald: 'bg-emerald-500',
        orange: 'bg-orange-500',
        purple: 'bg-purple-500'
    };
    return colorMap[colorName as keyof typeof colorMap] || 'bg-green-500';
}

function StatCard({ title, value, icon, trend, positive, live, subtext, color, bgColor, borderColor, isActive, onClick, className }: any) {
    return (
        <div
            onClick={onClick}
            className={`
            bg-[#0a0a0a] border rounded-xl p-4 md:p-5 transition-all duration-300 hover:shadow-lg group relative overflow-hidden cursor-pointer
            ${isActive ? 'border-primary ring-1 ring-primary/50' : 'border-transparent hover:border-white/20'}
            ${className || ''}
        `}
        >
            <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl opacity-5 transition-opacity group-hover:opacity-10 ${color ? color.replace('text-', 'bg-') : 'bg-white'}`}></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <div className={`p-2 rounded-lg ${bgColor} ${color}`}>
                        {icon}
                    </div>
                    {live ? (
                        <div className="flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full text-red-500 bg-red-500/10 border border-red-500/20 animate-pulse">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></div>
                            LIVE
                        </div>
                    ) : trend && (
                        <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${positive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                            {positive ? <TrendingUp size={10} className="mr-1" /> : <TrendingUp size={10} className="mr-1 rotate-180" />}
                            {trend}
                        </div>
                    )}
                </div>

                <div>
                    <div className="text-[11px] font-medium text-neutral-500 font-mono uppercase tracking-wider mb-0.5">{title}</div>
                    <div className="text-2xl font-black text-white tracking-tight">{value}</div>
                    {subtext && <div className="text-[10px] text-neutral-500 mt-1">{subtext}</div>}
                </div>
            </div>
        </div>
    );
}

function ActivityItem({ icon, iconColor, title, desc, time }: any) {
    return (
        <div className="relative flex gap-3 group cursor-pointer">
            <div className={`w-6 h-6 rounded-full ${iconColor} flex items-center justify-center text-black shadow-[0_0_10px_rgba(0,0,0,0.5)] shrink-0 relative z-10 ring-4 ring-[#0a0a0a]`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0 pb-4 border-b border-neutral-800/50 group-last:border-0">
                <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{title}</p>
                    <span className="text-[9px] text-neutral-600 whitespace-nowrap ml-2">{time}</span>
                </div>
                <p className="text-[11px] text-neutral-500 truncate">{desc}</p>
            </div>
        </div>
    );
}

function TableRow({ id, item, date, amount, status, statusColor, onClick }: any) {
    return (
        <tr onClick={onClick} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer">
            <td className="px-6 py-3 font-mono text-neutral-500 group-hover:text-white transition-colors">{id}</td>
            <td className="px-6 py-3 font-bold text-white">{item}</td>
            <td className="px-6 py-3 text-neutral-500">{date}</td>
            <td className="px-6 py-3 font-mono text-white">{amount}</td>
            <td className="px-6 py-3 text-right">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                    {status}
                </span>
            </td>
        </tr>
    );
}

function QuickActionTile({ icon, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] transition-all group"
        >
            <div className="text-neutral-400 group-hover:text-primary transition-colors">
                {icon}
            </div>
            <span className="text-[10px] font-bold text-neutral-300 group-hover:text-white uppercase tracking-wider">{label}</span>
        </button>
    );
}

// --- HELPER COMPONENTS FOR ORDERS VIEW ---

function TabButton({ active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${active ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
            {label}
        </button>
    );
}


function CustomerOrderDetail({ purchase, onBack, onSignContract, onViewContract }: { purchase: Purchase, onBack: () => void, onSignContract: (id: string) => void, onViewContract: (id: string) => void }) {
    // Determine stages based on purchase state
    const hasContract = !!purchase.contractId;
    const isSigned = !hasContract || purchase.contractStatus === 'signed';
    const isCompleted = purchase.status === 'Completed';

    // Timeline Logic
    const timeline = [
        { title: 'Order Placed', date: purchase.date, status: 'completed' },
        ...(hasContract ? [{
            title: 'Contract Signed',
            date: isSigned ? (purchase.signedAt || 'Signed') : 'Waitig for Signature',
            status: isSigned ? 'completed' : 'active'
        }] : []),
        { title: 'Processing', date: 'In Progress', status: isSigned ? (isCompleted ? 'completed' : 'active') : 'pending' },
        { title: 'Delivery', date: isCompleted ? 'Delivered' : 'Pending', status: isCompleted ? 'completed' : 'pending' }
    ];

    const canDispute = isSigned;
    const canDownload = isSigned && isCompleted;

    // Chat state
    const [chatText, setChatText] = useState('');

    return (
        <div className="flex-1 flex flex-col h-full bg-[#050505]">
            {/* Header / Nav */}
            <div className="h-16 lg:h-20 flex items-center justify-between px-6 bg-neutral-900/30 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="group flex items-center gap-2 p-2 -ml-2 text-neutral-400 hover:text-white transition-all duration-300"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">Back to Orders</span>
                    </button>
                    <div>
                        <h1 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
                            {purchase.item}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-neutral-400 border border-white/5 uppercase">{purchase.type}</span>
                        </h1>
                        <p className="text-xs text-neutral-500 font-mono">Order {purchase.id.slice(0, 12)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        disabled={!canDispute}
                        title={!canDispute ? "Contract must be signed to dispute" : "Open Dispute"}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${canDispute
                            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                            : 'bg-neutral-900 text-neutral-600 cursor-not-allowed opacity-50'
                            }`}
                    >
                        <AlertTriangle size={14} />
                        <span className="hidden sm:inline">Report Issue</span>
                    </button>
                </div>
            </div>

            {/* Split Content: Main (Scrollable) | Chat (Fixed Right) */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                    {/* Status Banner */}
                    <div className="bg-neutral-900/50 rounded-xl p-6">
                        {/* Enhanced Tracker */}
                        <div className="w-full">
                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-6">Order Status</h3>
                            <div className="flex items-start justify-between relative">
                                <div className="absolute top-3 left-0 w-full h-0.5 bg-neutral-800 -z-10 rounded"></div>
                                {/* Active Line */}
                                <div
                                    className="absolute top-3 left-0 h-0.5 bg-green-500 -z-10 rounded transition-all duration-500"
                                    style={{ width: `${(timeline.filter(t => t.status === 'completed').length / (timeline.length - 1)) * 100}%` }}
                                ></div>

                                {timeline.map((step, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-2 z-10 group min-w-[60px]">
                                        <div className={`
                                            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 bg-[#0a0a0a]
                                            ${step.status === 'completed' ? 'border-green-500 text-green-500' :
                                                step.status === 'active' ? 'border-primary text-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] scale-110' :
                                                    'border-neutral-800 text-neutral-700'
                                            }
                                        `}>
                                            {step.status === 'completed' ? <CheckCircle size={12} fill="currentColor" className="text-black" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                                        </div>
                                        <span className={`text-[10px] font-bold text-center ${step.status === 'pending' ? 'text-neutral-600' : 'text-white'}`}>{step.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Contract Card */}
                        <div className="bg-neutral-900/30 rounded-xl p-5 relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-lg ${isSigned ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'} `}>
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">License Agreement</h4>
                                        <p className="text-[10px] text-neutral-500">{isSigned ? 'Signed & Active' : 'Action Required'}</p>
                                    </div>
                                </div>

                                {hasContract ? (
                                    <button
                                        onClick={() => purchase.contractId ? (isSigned ? onViewContract(purchase.contractId) : onSignContract(purchase.contractId)) : null}
                                        className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${isSigned ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-primary text-black hover:brightness-110'}`}
                                    >
                                        {isSigned ? 'View Contract' : 'Sign Contract'}
                                    </button>
                                ) : (
                                    <div className="py-2.5 text-center text-xs text-neutral-600 italic">No contract required</div>
                                )}
                            </div>
                        </div>

                        {/* Deliverables Card */}
                        <div className={`bg-neutral-900/30 rounded-xl p-5 relative overflow-hidden ${!canDownload ? 'opacity-70' : ''}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                    <Package size={18} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">Deliverables</h4>
                                    <p className="text-[10px] text-neutral-500">{purchase.tracks?.length || 1} Files Included</p>
                                </div>
                            </div>

                            <button
                                disabled={!canDownload}
                                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${canDownload ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}`}
                            >
                                {canDownload ? <><Download size={14} /> Download All</> : <><Lock size={14} />Locked</>}
                            </button>
                        </div>
                    </div>

                    {/* Files List */}
                    {purchase.tracks && purchase.tracks.length > 0 && (
                        <div className="bg-[#0a0a0a] rounded-xl overflow-hidden">
                            <div className="px-5 py-3 bg-neutral-900/30 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Start Files</h3>
                                {!canDownload && <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1"><Lock size={10} /> Contract Required</span>}
                            </div>
                            <div className="divide-y divide-white/5">
                                {purchase.tracks.map((track, i) => (
                                    <div key={i} className={`flex items-center justify-between p-4 ${canDownload ? 'hover:bg-white/5 group' : 'opacity-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 flex items-center justify-center bg-neutral-900 rounded text-neutral-500 group-hover:text-primary transition-colors">
                                                <Music size={14} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{track.title}</div>
                                                <div className="text-[10px] text-neutral-500 flex gap-2">
                                                    <span>WAV</span>
                                                    <span>•</span>
                                                    <span>MP3</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button disabled={!canDownload} className="p-2 hover:bg-white/10 rounded-lg text-neutral-500 hover:text-white transition-colors disabled:cursor-not-allowed">
                                            {canDownload ? <Download size={16} /> : <Lock size={14} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Chat Column - Production Grade */}
                <div className="w-full lg:w-[360px] flex flex-col bg-[#080808] h-[500px] lg:h-auto">
                    <div className="p-4 bg-neutral-900/20 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                                    {purchase.seller.charAt(0)}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#0a0a0a] rounded-full"></span>
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white leading-none mb-1">{purchase.seller}</div>
                                <div className="text-[10px] text-neutral-500 font-mono">Usually replies in 1h</div>
                            </div>
                        </div>
                        <button className="p-2 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-white transition-colors">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>

                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-dot-grid custom-scrollbar">
                        <div className="flex justify-center my-4">
                            <span className="text-[10px] font-mono text-neutral-500 bg-neutral-900/80 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                                Order Created on {purchase.date}
                            </span>
                        </div>

                        {/* Seller Message */}
                        <div className="flex gap-3 max-w-[90%]">
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-white shrink-0 border border-white/5 mt-auto">
                                {purchase.seller.charAt(0)}
                            </div>
                            <div className="space-y-1">
                                <div className="bg-neutral-800 p-3 rounded-2xl rounded-bl-none text-sm text-neutral-200 leading-relaxed shadow-sm">
                                    Hey! Thanks for the order. I've just sent over the files. Please review the contract when you get a chance!
                                </div>
                                <div className="text-[10px] text-neutral-600 ml-1">10:30 AM</div>
                            </div>
                        </div>

                        {/* Buyer Message (Mock) */}
                        <div className="flex gap-3 flex-row-reverse max-w-[90%] ml-auto">
                            <div className="space-y-1 text-right">
                                <div className="bg-primary p-3 rounded-2xl rounded-br-none text-sm text-black font-medium leading-relaxed shadow-sm">
                                    Awesome, checking them now!
                                </div>
                                <div className="text-[10px] text-neutral-600 mr-1 flex items-center justify-end gap-1">
                                    10:32 AM <span className="text-primary font-bold">Read</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-neutral-900/30">
                        <div className="flex items-end gap-2 bg-neutral-900 rounded-xl p-2 shadow-inner">
                            <button className="p-2 text-neutral-500 hover:text-white transition-colors hover:bg-white/5 rounded-lg h-9 w-9 flex items-center justify-center">
                                <Paperclip size={18} />
                            </button>
                            <textarea
                                value={chatText}
                                onChange={(e) => setChatText(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none py-2 resize-none h-9 max-h-24 custom-scrollbar"
                                placeholder="Send a message..."
                                rows={1}
                            />
                            <button
                                disabled={!chatText.trim()}
                                className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all ${chatText.trim() ? 'bg-primary text-black hover:scale-105' : 'bg-white/5 text-neutral-600'}`}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FileDownloadModal({ purchase, onClose }: { purchase: Purchase, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] border border-transparent rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white">Download Files</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex flex-col sm:flex-row gap-6 mb-8">
                        <div className="w-24 h-24 bg-neutral-900 rounded-lg overflow-hidden shrink-0 border border-white/10">
                            <img src={purchase.image} className="w-full h-full object-cover" alt={purchase.item} />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">{purchase.type}</div>
                            <h2 className="text-2xl font-black text-white mb-2">{purchase.item}</h2>
                            <p className="text-sm text-neutral-400 mb-4">Sold by {purchase.seller}</p>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-[10px] font-bold uppercase">Ready to Download</span>
                                <span className="px-2 py-1 bg-white/5 text-neutral-400 border border-white/5 rounded text-[10px] font-mono">{purchase.tracks?.length || 0} Files</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Included Files</h4>
                        {purchase.tracks && purchase.tracks.length > 0 ? (
                            purchase.tracks.map((track, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg group hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-neutral-900 rounded flex items-center justify-center text-neutral-500 group-hover:text-primary transition-colors">
                                            <Music size={14} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{track.title}</div>
                                            <div className="text-[10px] text-neutral-500 font-mono">MP3 • WAV • Stems</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Download MP3">
                                            <span className="text-[10px] font-bold">MP3</span>
                                        </button>
                                        <button className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Download WAV">
                                            <span className="text-[10px] font-bold">WAV</span>
                                        </button>
                                        <button className="p-2 bg-white text-black hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-2" title="Download ZIP">
                                            <Download size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Fallback if no tracks were mapped (legacy or simple item)
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Package size={20} className="text-primary" />
                                    <div>
                                        <div className="text-sm font-bold text-white">Complete Package</div>
                                        <div className="text-[10px] text-neutral-500 font-mono">All included files</div>
                                    </div>
                                </div>
                                <button className="px-4 py-2 bg-white text-black font-bold rounded-lg text-xs hover:bg-neutral-200 transition-colors flex items-center gap-2">
                                    <Download size={14} /> Download ZIP
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

function ReceiptModal({ purchase, onClose }: { purchase: Purchase, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-md bg-[#111] text-white border border-transparent rounded-xl shadow-2xl overflow-hidden relative flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Receipt Header */}
                <div className="p-6 border-b border-white/10 text-center bg-white/5 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                    <div className="w-10 h-10 bg-primary text-black rounded-lg flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(var(--primary),0.4)]">
                        <Terminal size={20} />
                    </div>
                    <h2 className="text-xl font-black tracking-tight mb-1">PAYMENT RECEIPT</h2>
                    <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest">MusicAccess Terminal</p>
                </div>

                <div className="p-8 space-y-8 bg-dot-grid relative">
                    {/* Details */}
                    <div className="flex justify-between items-start">
                        <div className="text-left">
                            <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Billed To</p>
                            <p className="text-sm font-bold text-white">{purchase.seller}</p>
                            <p className="text-xs text-neutral-400">buyer@example.com</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Receipt ID</p>
                            <p className="text-sm font-mono text-primary">{purchase.id.slice(0, 8)}</p>
                        </div>
                    </div>

                    {/* Line Item */}
                    <div className="py-4 border-t border-b border-dashed border-white/10 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                                <p className="text-sm font-bold text-white">{purchase.item}</p>
                                <p className="text-[10px] text-neutral-500 mt-0.5 uppercase">{purchase.type} • {purchase.seller}</p>
                            </div>
                            <p className="font-mono font-bold text-white">${purchase.amount.toFixed(2)}</p>
                        </div>
                        {/* Tax */}
                        <div className="flex justify-between items-center text-xs text-neutral-500">
                            <span>Processing Fee (0%)</span>
                            <span>$0.00</span>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Date Paid</p>
                            <p className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                                <Calendar size={12} /> {purchase.date}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-neutral-500 uppercase mb-1">Total Paid</p>
                            <p className="text-3xl font-black tracking-tighter text-white">${purchase.amount.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white/5 border-t border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-neutral-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                        <span className="text-[10px] font-bold uppercase">Payment Successful</span>
                    </div>
                    <button className="px-3 py-1.5 bg-white text-black text-[10px] font-bold rounded hover:bg-neutral-200 flex items-center gap-1.5 transition-colors">
                        <Download size={12} /> DOWNLOAD PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DashboardPage;