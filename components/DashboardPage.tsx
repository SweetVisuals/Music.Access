import React, { useState, useEffect } from 'react';
import { View, Project, Purchase, UserProfile, DashboardAnalytics } from '../types';
import ProjectCard from './ProjectCard';
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
    Terminal
} from 'lucide-react';
import Studio from './Studio';
import { MOCK_PURCHASES } from '../constants';
import { getPurchases, getSales, getDashboardAnalytics, subscribeToArtistPresence } from '../services/supabaseService';

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
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4 hover:border-white/10 transition-colors group relative overflow-hidden">
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
    const [selectedStat, setSelectedStat] = useState('revenue');
    const [dashboardAnalytics, setDashboardAnalytics] = useState<DashboardAnalytics | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [liveListeners, setLiveListeners] = useState(0);

    // Subscribe to live listeners
    useEffect(() => {
        if (!userProfile?.id) return;

        const channel = subscribeToArtistPresence(userProfile.id, (count) => {
            setLiveListeners(count);
        });

        return () => {
            channel.unsubscribe();
        };
    }, [userProfile?.id]);

    // State for Purchases/Orders View
    const [activePurchaseTab, setActivePurchaseTab] = useState<'all' | 'beats' | 'kits' | 'services'>('all');
    const [selectedOrder, setSelectedOrder] = useState<Purchase | null>(null);
    const [viewingReceipt, setViewingReceipt] = useState<Purchase | null>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [sales, setSales] = useState<Purchase[]>([]);

    useEffect(() => {
        /* ... existing fetchDashboardData ... */
        const fetchDashboardData = async () => {
            try {
                setAnalyticsLoading(true);

                // Fetch purchases, sales, and dashboard analytics
                const [purchasesData, salesData, analyticsData] = await Promise.all([
                    getPurchases(),
                    getSales(),
                    getDashboardAnalytics()
                ]);

                setPurchases(purchasesData);
                setSales(salesData);
                setDashboardAnalytics(analyticsData);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                // Fallback to mock data if fetch fails
                setPurchases(MOCK_PURCHASES);
            } finally {
                setAnalyticsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Helper function to get safe user profile values
    const getSafeUserProfileValue = (value: any, fallback: any) => {
        return value === null || value === undefined ? fallback : value;
    };

    // --- SUB-COMPONENTS FOR SIMPLE VIEWS ---

    const SalesView = () => (
        <div className="w-full max-w-[1600px] mx-auto p-8 animate-in fade-in duration-500">
            <h1 className="text-3xl font-black text-white mb-8">Sales History</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <StatCard
                    title="Total Revenue"
                    value={`$${(dashboardAnalytics?.totalRevenue || 0).toLocaleString()}`}
                    icon={<DollarSign size={20} />}
                    trend="+12%"
                    positive
                    color="text-emerald-400"
                    bgColor="bg-emerald-400/10" />
                <StatCard
                    title="Pending Payouts"
                    value="$0.00"
                    icon={<CreditCard size={20} />}
                    subtext="Next payout: Fri"
                    color="text-blue-400"
                    bgColor="bg-blue-400/10" />
                <StatCard
                    title="Avg. Order Value"
                    value={`$${dashboardAnalytics?.totalRevenue && sales.length > 0 ? (dashboardAnalytics.totalRevenue / sales.length).toFixed(2) : '0.00'}`}
                    icon={<ShoppingCart size={20} />}
                    trend="-2%"
                    positive={false}
                    color="text-orange-400"
                    bgColor="bg-orange-400/10" />
            </div>
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-sm font-bold text-white">Transactions</h3>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-neutral-900/50 text-[10px] font-mono uppercase text-neutral-500">
                        <tr><th className="px-6 py-3">ID</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Customer</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Status</th></tr>
                    </thead>
                    <tbody className="text-xs text-neutral-300">
                        {sales.slice(0, 50).map((sale, i) => (
                            <tr key={sale.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="px-6 py-4 font-mono text-neutral-500">{sale.id.slice(0, 8)}</td>
                                <td className="px-6 py-4">{sale.date}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    {sale.buyerAvatar && <img src={sale.buyerAvatar} className="w-5 h-5 rounded-full" />}
                                    {sale.buyer || 'Unknown'}
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-white">${sale.amount.toFixed(2)}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${sale.status === 'Completed' ? 'bg-green-500/10 text-green-500' :
                                    sale.status === 'Processing' ? 'bg-blue-500/10 text-blue-500' :
                                        'bg-red-500/10 text-red-500'
                                    }`}>{sale.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const WalletView = () => (
        <div className="w-full max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
            <h1 className="text-3xl font-black text-white mb-8">Wallet</h1>
            <div className="bg-gradient-to-br from-neutral-900 to-black border border-white/10 rounded-2xl p-8 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <div className="flex gap-8">
                        <div>
                            <div className="text-neutral-500 font-mono text-sm uppercase tracking-widest mb-2">Total Balance</div>
                            <div className="text-5xl font-black text-white mb-6">${getSafeUserProfileValue(userProfile.balance, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                        <div className="pl-8 border-l border-white/10">
                            <div className="text-neutral-500 font-mono text-sm uppercase tracking-widest mb-2">Gem Balance</div>
                            <div className="text-5xl font-black text-primary mb-6 flex items-center gap-2">
                                {getSafeUserProfileValue(userProfile.gems, 0).toLocaleString()} <Gem size={32} />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button className="px-6 py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90">Withdraw Funds</button>
                        <button className="px-6 py-3 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 border border-white/10">View Statement</button>
                    </div>
                </div>
            </div>
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Payment Methods</h3>
                <div className="p-4 bg-[#0a0a0a] border border-neutral-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center text-[8px] font-bold text-white">VISA</div>
                        <div>
                            <div className="text-sm font-bold text-white">•••• •••• •••• 4242</div>
                            <div className="text-xs text-neutral-500">Expires 12/28</div>
                        </div>
                    </div>
                    <button className="text-xs text-neutral-400 hover:text-white">Edit</button>
                </div>
                <div className="p-4 bg-[#0a0a0a] border border-neutral-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-6 bg-[#003087] rounded flex items-center justify-center text-[8px] font-bold text-white">PAYPAL</div>
                        <div>
                            <div className="text-sm font-bold text-white">{getSafeUserProfileValue(userProfile.email, 'user@example.com')}</div>
                            <div className="text-xs text-neutral-500">Primary Payout Method</div>
                        </div>
                    </div>
                    <button className="text-xs text-neutral-400 hover:text-white">Edit</button>
                </div>
            </div>
        </div>
    );

    // --- ROUTING ---

    if (view === 'dashboard-studio') {
        return <Studio
            projects={projects}
            setProjects={setProjects}
            currentTrackId={currentTrackId}
            isPlaying={isPlaying}
            onPlayTrack={onPlayTrack}
            onTogglePlay={onTogglePlay}
        />;
    }

    if (view === 'dashboard-sales') {
        return <SalesView />;
    }

    if (view === 'dashboard-wallet') {
        return <WalletView />;
    }

    if (view === 'dashboard-orders') {
        if (selectedOrder) {
            return <CustomerOrderDetail purchase={selectedOrder} onBack={() => setSelectedOrder(null)} />;
        }

        const filteredPurchases = purchases.filter(p => {
            if (activePurchaseTab === 'all') return true;
            if (activePurchaseTab === 'beats') return p.type === 'Beat License';
            if (activePurchaseTab === 'kits') return p.type === 'Sound Kit';
            if (activePurchaseTab === 'services') return p.type === 'Service' || p.type === 'Mixing';
            return true;
        });

        return (
            <div className="w-full max-w-[1600px] mx-auto pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500 relative">
                {viewingReceipt && (
                    <ReceiptModal purchase={viewingReceipt} onClose={() => setViewingReceipt(null)} />
                )}

                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white mb-2">My Purchases</h1>
                        <p className="text-neutral-500 text-sm">Manage your orders, download files, and communicate with sellers.</p>
                    </div>
                    <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800 hidden md:flex">
                        <TabButton active={activePurchaseTab === 'all'} onClick={() => setActivePurchaseTab('all')} label="All Items" />
                        <TabButton active={activePurchaseTab === 'beats'} onClick={() => setActivePurchaseTab('beats')} label="Beats & Projects" />
                        <TabButton active={activePurchaseTab === 'kits'} onClick={() => setActivePurchaseTab('kits')} label="Sound Packs" />
                        <TabButton active={activePurchaseTab === 'services'} onClick={() => setActivePurchaseTab('services')} label="Services & Orders" />
                    </div>
                    {/* Mobile Dropdown */}
                    <div className="relative w-full md:hidden">
                        <select
                            value={activePurchaseTab}
                            onChange={(e) => setActivePurchaseTab(e.target.value as any)}
                            className="w-full appearance-none bg-neutral-900 border border-neutral-800 text-white text-sm font-bold rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-colors"
                        >
                            <option value="all">All Items</option>
                            <option value="beats">Beats & Projects</option>
                            <option value="kits">Sound Packs</option>
                            <option value="services">Services & Orders</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                            <ChevronDown size={16} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {filteredPurchases.map(purchase => (
                        <div key={purchase.id} className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden hover:border-white/10 transition-colors group">
                            <div className="p-4 flex flex-col md:flex-row items-center gap-6">
                                {/* Info */}
                                <div className="flex-1 min-w-0 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${purchase.type.includes('Service') || purchase.type === 'Mixing' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                            purchase.type === 'Sound Kit' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                'bg-green-500/10 text-green-400 border-green-500/20'
                                            }`}>
                                            {purchase.type}
                                        </span>
                                        <span className="text-[10px] text-neutral-500 font-mono">{purchase.date}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">{purchase.item}</h3>
                                    <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-neutral-400">
                                        {purchase.sellerAvatar && (
                                            <img src={purchase.sellerAvatar} alt={purchase.seller} className="w-4 h-4 rounded-full" />
                                        )}
                                        <span>Sold by <span className="text-white">{purchase.seller}</span></span>
                                    </div>
                                </div>

                                {/* Price & Status */}
                                <div className="text-center md:text-right px-4 md:border-l border-neutral-800 min-w-[120px]">
                                    <div className="text-xl font-mono font-bold text-white mb-1">${purchase.amount.toFixed(2)}</div>
                                    <div className={`text-[10px] font-bold uppercase ${purchase.status === 'Completed' ? 'text-green-500' : purchase.status === 'Processing' ? 'text-blue-400' : 'text-red-500'}`}>
                                        {purchase.status}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 w-full md:w-auto min-w-[140px]">
                                    {purchase.type.includes('Service') || purchase.type === 'Mixing' ? (
                                        // Services don't expand for downloads in this view
                                        <>
                                            <button
                                                onClick={() => setSelectedOrder(purchase)}
                                                className="w-full py-2.5 bg-white text-black font-bold rounded-lg text-xs hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Briefcase size={14} /> Manage Order
                                            </button>
                                            <button
                                                onClick={() => setViewingReceipt(purchase)}
                                                className="w-full py-2.5 text-neutral-500 font-bold rounded-lg text-xs hover:text-white transition-colors border border-transparent hover:border-white/10"
                                            >
                                                View Receipt
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => setExpandedOrderId(expandedOrderId === purchase.id ? null : purchase.id)}
                                                className={`w-full py-2.5 font-bold rounded-lg text-xs border transition-all flex items-center justify-center gap-2 ${expandedOrderId === purchase.id
                                                    ? 'bg-neutral-800 text-white border-neutral-700'
                                                    : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                                                    }`}
                                            >
                                                {expandedOrderId === purchase.id ? (
                                                    <>Close Files <ChevronDown size={14} className="rotate-180 transition-transform" /></>
                                                ) : (
                                                    <>Download Files <ChevronDown size={14} className="transition-transform" /></>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => setViewingReceipt(purchase)}
                                                className="w-full py-2.5 text-neutral-500 font-bold rounded-lg text-xs hover:text-white transition-colors"
                                            >
                                                View Receipt
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedOrderId === purchase.id && !purchase.type.includes('Service') && (
                                <div className="border-t border-neutral-800 bg-[#050505] p-6 animate-in slide-in-from-top-2 duration-300">
                                    <div className="w-full max-w-md">
                                        <ProjectCard
                                            project={{
                                                id: purchase.projectId || purchase.id,
                                                title: purchase.item,
                                                producer: purchase.seller,
                                                price: purchase.amount,
                                                bpm: 140, // Mock or fetch if available
                                                key: 'Am',
                                                genre: purchase.type,
                                                type: purchase.type === 'Sound Kit' ? 'sound_pack' : 'beat_tape',
                                                tracks: purchase.tracks || [],
                                                tags: [],
                                                licenses: []
                                            } as any}
                                            currentTrackId={null}
                                            isPlaying={false}
                                            onPlayTrack={() => { }}
                                            onTogglePlay={() => { }}
                                            isPurchased={true}
                                            renderTrackAction={(track: any) => (
                                                <button
                                                    className="p-1.5 bg-neutral-800 hover:bg-white text-neutral-400 hover:text-black rounded transition-colors group/dl"
                                                    title="Download File"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div >
        );
    }

    // Default: Overview - Use real data or fallbacks
    const chartData = dashboardAnalytics?.monthlyData || [];
    const currentChart = {
        revenue: { label: 'Revenue Analytics', data: chartData.map(d => d.revenue), unit: '$' },
        listeners: { label: 'Live Listener Analytics', data: chartData.map(d => d.listeners), unit: '' },
        plays: { label: 'Play Analytics', data: chartData.map(d => d.plays), unit: '' },
        orders: { label: 'Order Analytics', data: chartData.map(d => d.orders), unit: '' },
        gems: { label: 'Gem Balance History', data: chartData.map(d => d.gems), unit: '' }
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-1">Dashboard</h1>
                    <p className="text-neutral-500 text-sm">Overview of your studio performance.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-xs font-medium text-neutral-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>System Online</span>
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] border border-neutral-800 rounded-lg text-xs font-bold text-white hover:bg-white/5 transition-colors">
                        <Calendar size={14} className="text-neutral-500" />
                        <span>Last 30 days</span>
                        <ChevronDown size={12} className="text-neutral-500 ml-1" />
                    </button>
                </div>
            </div>

            {/* Top Stats Row - Use real data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                <StatCard
                    title="Live Listeners"
                    value={liveListeners.toString()}
                    icon={<Radio size={20} />}
                    live={true}
                    color="text-red-500"
                    bgColor="bg-red-500/10"
                    borderColor="border-red-500/20"
                    isActive={selectedStat === 'listeners'}
                    onClick={() => setSelectedStat('listeners')}
                />
                <StatCard
                    title="Total Revenue"
                    value={`$${(dashboardAnalytics?.totalRevenue || 0).toLocaleString()}`}
                    icon={<DollarSign size={20} />}
                    trend="+12.5%"
                    positive
                    color="text-emerald-400"
                    bgColor="bg-emerald-400/10"
                    borderColor="border-emerald-400/20"
                    isActive={selectedStat === 'revenue'}
                    onClick={() => setSelectedStat('revenue')}
                />
                <StatCard
                    title="Total Plays"
                    value={`${(dashboardAnalytics?.totalPlays || 0).toLocaleString()}`}
                    icon={<Play size={20} />}
                    trend="+5.2%"
                    positive
                    color="text-blue-400"
                    bgColor="bg-blue-400/10"
                    borderColor="border-blue-400/20"
                    isActive={selectedStat === 'plays'}
                    onClick={() => setSelectedStat('plays')}
                />
                <StatCard
                    title="Active Orders"
                    value={(dashboardAnalytics?.activeOrders || 0).toString()}
                    icon={<ShoppingCart size={20} />}
                    trend="-2.1%"
                    positive={false}
                    color="text-orange-400"
                    bgColor="bg-orange-400/10"
                    borderColor="border-orange-400/20"
                    isActive={selectedStat === 'orders'}
                    onClick={() => setSelectedStat('orders')}
                />
                <StatCard
                    title="Gems Balance"
                    value={getSafeUserProfileValue(userProfile?.gems, 0).toLocaleString()}
                    icon={<Gem size={20} />}
                    subtext={`Approx. $${(getSafeUserProfileValue(userProfile?.gems, 0) * 0.01).toFixed(2)}`}
                    color="text-purple-400"
                    bgColor="bg-purple-400/10"
                    borderColor="border-purple-400/20"
                    isActive={selectedStat === 'gems'}
                    onClick={() => setSelectedStat('gems')}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Chart Section */}
                <div className="lg:col-span-2 bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 min-h-[300px] flex flex-col relative overflow-hidden transition-all duration-500">
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
                        <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span>
                        <span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span><span>DEC</span>
                    </div>

                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] pointer-events-none"></div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-1 bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-white">Recent Activity</h3>
                        <p className="text-[10px] text-neutral-500 font-mono">Latest notifications</p>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-6 relative">
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-neutral-800"></div>

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
                <div className="lg:col-span-2 bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                        <div>
                            <h3 className="text-sm font-bold text-white">Recent Orders</h3>
                            <p className="text-[10px] text-neutral-500 font-mono">Manage your sales</p>
                        </div>
                        <button className="text-[10px] font-bold text-primary hover:text-white transition-colors">VIEW ALL</button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
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
                                {(dashboardAnalytics?.recentOrders || []).map((order, idx) => (
                                    <TableRow
                                        key={order.id}
                                        id={`#ORD-${idx + 1}`}
                                        item={order.item}
                                        date={order.date}
                                        amount={order.amount}
                                        status={order.status}
                                        statusColor={order.statusColor}
                                    />
                                ))}

                                {/* Show empty state if no recent orders */}
                                {!dashboardAnalytics?.recentOrders?.length && (
                                    <tr className="border-b border-white/5">
                                        <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                                            <div className="flex flex-col items-center">
                                                <ShoppingCart size={24} className="mb-2 opacity-50" />
                                                <p className="text-sm font-medium">No Recent Orders</p>
                                                <p className="text-xs text-neutral-600 mt-1">Orders will appear here when you start making sales</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="lg:col-span-1 bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
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
const getActivityIcon = (iconName: string) => {
    const iconMap = {
        ShoppingCart: <ShoppingCart size={12} />,
        User: <User size={12} />,
        DollarSign: <DollarSign size={12} />,
        AlertTriangle: <AlertTriangle size={12} />,
        Briefcase: <Briefcase size={12} />
    };
    return iconMap[iconName as keyof typeof iconMap] || <ShoppingCart size={12} />;
};

const getActivityColor = (colorName: string) => {
    const colorMap = {
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        emerald: 'bg-emerald-500',
        orange: 'bg-orange-500',
        purple: 'bg-purple-500'
    };
    return colorMap[colorName as keyof typeof colorMap] || 'bg-green-500';
};

const StatCard = ({ title, value, icon, trend, positive, live, subtext, color, bgColor, borderColor, isActive, onClick }: any) => (
    <div
        onClick={onClick}
        className={`
            bg-[#0a0a0a] border rounded-xl p-5 transition-all duration-300 hover:shadow-lg group relative overflow-hidden cursor-pointer
            ${isActive ? 'border-primary ring-1 ring-primary/50' : 'border-neutral-800 hover:border-white/20'}
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

const ActivityItem = ({ icon, iconColor, title, desc, time }: any) => (
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

const TableRow = ({ id, item, date, amount, status, statusColor }: any) => (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer">
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

const QuickActionTile = ({ icon, label, onClick }: any) => (
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

// --- HELPER COMPONENTS FOR ORDERS VIEW ---

const TabButton = ({ active, onClick, label }: any) => (
    <button
        onClick={onClick}
        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${active ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
    >
        {label}
    </button>
);

const CustomerOrderDetail = ({ purchase, onBack }: { purchase: Purchase, onBack: () => void }) => {
    // Mock Timeline
    const timeline = [
        { title: 'Order Placed', date: purchase.date, status: 'completed' },
        { title: 'Requirements Submitted', date: purchase.date, status: 'completed' },
        { title: 'Order in Progress', date: 'In Progress', status: purchase.status === 'Completed' ? 'completed' : 'active' },
        { title: 'Delivery', date: purchase.status === 'Completed' ? 'Delivered' : 'Pending', status: purchase.status === 'Completed' ? 'completed' : 'pending' }
    ];

    return (
        <div className="w-full max-w-[1600px] mx-auto pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
            {/* Top Navigation */}
            <button onClick={onBack} className="flex items-center gap-2 text-neutral-500 hover:text-white mb-6 text-xs font-bold">
                <ArrowLeft size={14} /> Back to Purchases
            </button>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Content */}
                <div className="flex-1 space-y-6">
                    {/* Header Card */}
                    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-20 bg-blue-500/5 rounded-full blur-3xl"></div>
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                                    <img src={purchase.image} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-white mb-1">{purchase.item}</h1>
                                    <p className="text-sm text-neutral-400">Order #{purchase.id.slice(0, 8)} • Sold by {purchase.seller}</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded border text-xs font-bold uppercase ${purchase.status === 'Completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                {purchase.status}
                            </div>
                        </div>
                    </div>

                    {/* Timeline & Requirements */}
                    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
                        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">Order Status</h3>
                        <div className="relative pl-4 border-l border-neutral-800 space-y-8">
                            {timeline.map((step, idx) => (
                                <div key={idx} className="relative pl-6">
                                    <div className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 ${step.status === 'completed' ? 'bg-green-500 border-green-500' : step.status === 'active' ? 'bg-blue-500 border-blue-500 animate-pulse' : 'bg-neutral-900 border-neutral-700'}`}></div>
                                    <div className="text-sm font-bold text-white">{step.title}</div>
                                    <div className="text-xs text-neutral-500">{step.date}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Delivery Files (If Completed) */}
                    {purchase.status === 'Completed' && (
                        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                                <Package size={16} className="text-primary" /> Delivered Files
                            </h3>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-neutral-900 rounded text-white"><Music size={16} /></div>
                                        <div>
                                            <div className="text-sm font-bold text-white">Mixed_Master_Final.wav</div>
                                            <div className="text-[10px] text-neutral-500">45 MB</div>
                                        </div>
                                    </div>
                                    <button className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded hover:bg-neutral-200 flex items-center gap-2">
                                        <Download size={12} /> Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Chat */}
                <div className="w-full lg:w-96 bg-[#0a0a0a] border border-neutral-800 rounded-xl flex flex-col h-[600px]">
                    <div className="p-4 border-b border-neutral-800 bg-neutral-900/30">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <MessageSquare size={16} /> Chat with {purchase.seller}
                        </h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-dot-grid">
                        <div className="flex justify-center"><span className="text-[10px] text-neutral-500 bg-neutral-900 px-2 py-1 rounded">Order Started {purchase.date}</span></div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-white shrink-0">{purchase.seller[0]}</div>
                            <div className="bg-neutral-800 p-3 rounded-xl rounded-tl-none text-sm text-neutral-300">
                                Thanks for your order! Please submit your requirements and files so I can get started.
                            </div>
                        </div>
                        <div className="flex gap-3 flex-row-reverse">
                            <div className="bg-primary p-3 rounded-xl rounded-tr-none text-sm text-black">
                                Just uploaded the vocal stems. Let me know if you need anything else!
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t border-neutral-800 bg-neutral-900/30">
                        <div className="flex gap-2">
                            <button className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded"><Paperclip size={18} /></button>
                            <input className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none" placeholder="Type a message..." />
                            <button className="p-2 text-primary hover:bg-primary/10 rounded"><Send size={18} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const FileDownloadModal = ({ purchase, onClose }: { purchase: Purchase, onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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

const ReceiptModal = ({ purchase, onClose }: { purchase: Purchase, onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
        <div className="w-full max-w-md bg-[#111] text-white border border-neutral-800 rounded-xl shadow-2xl overflow-hidden relative flex flex-col" onClick={e => e.stopPropagation()}>

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

export default DashboardPage;