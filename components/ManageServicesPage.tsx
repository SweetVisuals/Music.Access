
import React, { useState, useEffect } from 'react';
import { getOrders } from '../services/supabaseService';
import { Order } from '../types';
import {
    Clock,
    MessageSquare,
    FileText,
    Upload,
    Calendar,
    MoreHorizontal,
    Send,
    Download,
    User,
    Star,
    Shield,
    CheckCircle,
    ChevronDown,
    ArrowLeft,
    Radio,
    List
} from 'lucide-react';

const ManageServicesPage: React.FC = () => {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [filter, setFilter] = useState('active');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = await getOrders();
                setOrders(data);
            } catch (error) {
                console.error('Failed to fetch orders:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

    if (loading) {
        return <OrdersSkeleton />;
    }

    return (
        <div className="w-full h-full max-w-[1600px] mx-auto pb-4 pt-6 px-4 lg:px-8 flex flex-col relative">

            {/* Header - Hidden on mobile if order selected to maximize space */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 gap-4 ${selectedOrder ? 'hidden lg:flex' : 'flex'}`}>
                <div>
                    <h1 className="text-3xl font-black text-white mb-2">Manage Orders</h1>
                    <p className="text-neutral-500 text-sm">Track and deliver your active services.</p>
                </div>

                {/* Desktop Filter Tabs */}
                <div className="hidden md:flex gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 overflow-x-auto max-w-full no-scrollbar w-full md:w-auto">
                    {['active', 'pending', 'delivered', 'completed'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all whitespace-nowrap flex-shrink-0 ${filter === status ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile Filter Tabs */}
            <div className={`md:hidden relative pb-4 overflow-x-auto no-scrollbar w-auto -mx-4 px-4 ${selectedOrder ? 'hidden' : 'block'}`}>
                <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-900/50 rounded-lg border border-white/5">
                    {['active', 'pending', 'delivered', 'completed'].map(status => {
                        const Icon = status === 'active' ? Radio :
                            status === 'pending' ? Clock :
                                status === 'delivered' ? Send :
                                    CheckCircle;

                        return (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${filter === status ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                            >
                                <Icon size={14} className={filter === status ? 'text-primary' : ''} />
                                <span className="text-[9px] font-bold uppercase tracking-tight">{status}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 flex gap-8 overflow-hidden flex-col lg:flex-row relative">
                {/* Orders List - Visible on mobile only when no order selected */}
                <div className={`
                flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar shrink-0 transition-all duration-300 pb-32 lg:pb-0
                ${selectedOrder ? 'hidden lg:flex lg:w-96' : 'flex w-full lg:w-96'}
            `}>
                    {filteredOrders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`
                            p-4 rounded-xl border cursor-pointer transition-all duration-200 relative overflow-hidden group
                            ${selectedOrder?.id === order.id
                                    ? 'bg-white/5 border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.1)] translate-x-1'
                                    : 'bg-[#0a0a0a] border-neutral-800 hover:border-neutral-700 hover:bg-white/[0.02]'
                                }
                        `}
                        >
                            {selectedOrder?.id === order.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>}

                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <img src={order.clientAvatar} className="w-10 h-10 rounded-full object-cover border border-white/10" alt={order.clientName} />
                                        <div className="absolute -bottom-1 -right-1 bg-neutral-900 rounded-full p-0.5">
                                            <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-neutral-900"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{order.clientName}</h4>
                                        <span className="text-[10px] text-neutral-500 font-mono">Client</span>
                                    </div>
                                </div>
                                <StatusBadge status={order.status} />
                            </div>

                            <h3 className="font-bold text-white mb-3 truncate text-sm">{order.serviceTitle}</h3>

                            <div className="flex justify-between items-center text-xs text-neutral-400 border-t border-white/5 pt-3">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    <span className="font-mono text-[10px]">{order.deadline}</span>
                                </div>
                                <div className="font-mono font-bold text-white bg-white/5 px-2 py-1 rounded">${order.amount}</div>
                            </div>
                        </div>
                    ))}
                    {filteredOrders.length === 0 && (
                        <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl">
                            <p className="text-neutral-500 text-sm">No orders found.</p>
                        </div>
                    )}
                </div>

                {/* Order Detail & Chat Area */}
                {/* Mobile: Fixed Overlay. Desktop: Flex Column */}
                <div className={`
                bg-[#0a0a0a] border border-neutral-800 lg:rounded-xl overflow-hidden flex flex-col
                ${selectedOrder
                        ? 'fixed inset-x-0 top-20 bottom-0 z-30 lg:static lg:z-auto lg:flex-1 lg:h-auto animate-in slide-in-from-right-4 duration-300 lg:animate-none'
                        : 'hidden lg:flex lg:flex-1'
                    }
            `}>
                    {selectedOrder ? (
                        <div className="flex-1 flex flex-col h-full pb-20 lg:pb-0">
                            {/* Top Bar */}
                            <div className="h-16 border-b border-neutral-800 flex justify-between items-center px-4 lg:px-6 bg-neutral-900/90 shrink-0 backdrop-blur-sm z-10">
                                <div className="flex items-center gap-3 lg:gap-4">
                                    <button onClick={() => setSelectedOrder(null)} className="lg:hidden p-2 -ml-2 text-neutral-400 hover:text-white flex items-center gap-1">
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                                <span className="hidden sm:inline">ORDER</span> #{selectedOrder.id.replace('ORD-', '')}
                                            </h2>
                                            <div className="scale-90 origin-left"><StatusBadge status={selectedOrder.status} /></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 lg:gap-3">
                                    <div className="hidden sm:block text-right mr-2">
                                        <div className="text-[10px] text-neutral-500 uppercase font-bold">Total Value</div>
                                        <div className="text-sm font-bold text-white font-mono">${selectedOrder.amount}</div>
                                    </div>
                                    <button className="px-3 py-2 bg-primary text-black font-bold rounded-lg text-[10px] lg:text-xs hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-shadow whitespace-nowrap">
                                        Deliver
                                    </button>
                                    <button className="p-2 hover:bg-white/5 rounded text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-white/10">
                                        <MoreHorizontal size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                                {/* Left: Order Context */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 bg-gradient-to-b from-neutral-900/20 to-transparent order-2 lg:order-1">
                                    <div className="max-w-3xl mx-auto space-y-6 lg:space-y-8 pb-24 lg:pb-0">
                                        {/* Service Title Header */}
                                        <div>
                                            <h1 className="text-lg lg:text-2xl font-black text-white mb-2 leading-tight">{selectedOrder.serviceTitle}</h1>
                                            <p className="text-neutral-400 text-xs lg:text-sm">Service provided to {selectedOrder.clientName}</p>
                                        </div>

                                        {/* Files Section */}
                                        <div className="bg-neutral-900/30 rounded-xl border border-white/5 overflow-hidden">
                                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                    <Upload size={14} className="text-primary" />
                                                    Project Files
                                                </h3>
                                                <span className="text-[10px] font-mono text-neutral-500">{selectedOrder.files?.length || 0} Files</span>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {selectedOrder.files?.map((file, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg group transition-colors cursor-pointer">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:bg-primary/20 transition-colors">
                                                                <FileText size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-white">{file.name}</div>
                                                                <div className="text-[10px] text-neutral-500 font-mono">{file.size}</div>
                                                            </div>
                                                        </div>
                                                        <button className="p-2 text-neutral-500 hover:text-white transition-colors"><Download size={16} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-2 border-t border-white/5">
                                                <button className="w-full py-3 border border-dashed border-neutral-700 rounded-lg flex items-center justify-center gap-2 text-neutral-500 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-bold">
                                                    <Upload size={14} /> Upload New Files
                                                </button>
                                            </div>
                                        </div>

                                        {/* Requirements */}
                                        <div className="bg-neutral-900/30 rounded-xl border border-white/5 overflow-hidden">
                                            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                                                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                    <FileText size={14} className="text-primary" />
                                                    Requirements
                                                </h3>
                                            </div>
                                            <div className="p-6 text-sm text-neutral-300 leading-relaxed font-serif italic bg-neutral-950/30">
                                                "{selectedOrder.requirements}"
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        <div>
                                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 pl-2">Activity Log</h3>
                                            <div className="space-y-0 pl-4 border-l border-neutral-800 ml-2">
                                                <TimelineItem title="Order Started" date="Oct 12, 10:00 AM" active />
                                                <TimelineItem title="Requirements Submitted" date="Oct 12, 10:05 AM" active />
                                                <TimelineItem title="Delivery in Progress" date="Currently working" active processing />
                                                <TimelineItem title="Delivery Submitted" date="Due Oct 25" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Prominent Chat & Profile */}
                                <div className="w-full lg:w-[400px] flex flex-col border-t lg:border-t-0 lg:border-l border-neutral-800 bg-[#050505] shrink-0 order-1 lg:order-2 h-[300px] lg:h-auto">
                                    {/* Client Profile Card */}
                                    <div className="p-4 border-b border-neutral-800 bg-neutral-900/20 flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-primary/20 to-neutral-800">
                                                <img src={selectedOrder.clientAvatar} className="w-full h-full rounded-full object-cover border border-[#0a0a0a]" alt="Client" />
                                            </div>
                                            <div className="absolute bottom-0 right-0 bg-[#0a0a0a] p-0.5 rounded-full">
                                                <Shield size={10} className="text-primary fill-primary/20" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-white">{selectedOrder.clientName}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-neutral-400 font-mono">Verified Client</span>
                                                <span className="flex items-center gap-1 text-[9px] text-yellow-500">
                                                    <Star size={8} fill="currentColor" /> 5.0
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chat Messages */}
                                    <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-dot-grid relative">
                                        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#050505] to-transparent z-10"></div>
                                        <div className="text-center my-4">
                                            <span className="text-[10px] text-neutral-600 bg-neutral-900 px-2 py-1 rounded-full border border-neutral-800">Today</span>
                                        </div>

                                        <ChatMessage
                                            text="Hi! I just uploaded the stems. Let me know if you need anything else."
                                            time="10:42 AM"
                                            isClient
                                            avatar={selectedOrder.clientAvatar}
                                        />
                                        <ChatMessage
                                            text="Got them! Everything looks good. I'll start working on the mix tonight."
                                            time="10:45 AM"
                                            isMe
                                        />
                                        <ChatMessage
                                            text="Could you emphasize the kick a bit more in this version? Similar to the reference track."
                                            time="11:20 AM"
                                            isClient
                                            avatar={selectedOrder.clientAvatar}
                                        />
                                    </div>

                                    {/* Chat Input */}
                                    <div className="p-4 bg-[#0a0a0a] border-t border-neutral-800">
                                        <div className="relative flex items-end gap-2 bg-neutral-900 border border-neutral-800 rounded-xl p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                                            <button className="p-2 text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                                                <Upload size={18} />
                                            </button>
                                            <textarea
                                                className="flex-1 bg-transparent border-none text-sm text-white resize-none max-h-32 py-2 focus:ring-0 placeholder-neutral-600"
                                                placeholder="Message client..."
                                                rows={1}
                                                style={{ minHeight: '2.5rem' }}
                                            />
                                            <button className="p-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors">
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-dot-grid relative">
                            <div className="w-64 h-64 bg-primary/5 rounded-full blur-3xl absolute"></div>
                            <div className="relative z-10 text-center p-8 border border-neutral-800 rounded-2xl bg-[#0a0a0a]/80 backdrop-blur-xl shadow-2xl">
                                <div className="w-16 h-16 mx-auto bg-neutral-900 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-inner transform rotate-3">
                                    <MessageSquare size={32} className="text-neutral-600" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No Order Selected</h3>
                                <p className="text-neutral-500 text-sm mb-6 max-w-xs mx-auto">Select an order from the list to view details, manage files, and chat with the client.</p>
                                <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/10 transition-colors">
                                    Refresh List
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const OrdersSkeleton = () => (
    <div className="w-full h-full max-w-[1600px] mx-auto pb-4 pt-6 px-4 lg:px-8 flex flex-col relative animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 gap-4">
            <div className="space-y-2">
                <div className="h-8 w-40 bg-neutral-800 rounded-lg"></div>
                <div className="h-4 w-60 bg-neutral-900 rounded-lg"></div>
            </div>
            <div className="hidden md:flex gap-1">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-8 w-20 bg-neutral-800 rounded-md"></div>
                ))}
            </div>
        </div>

        <div className="flex-1 flex gap-8 overflow-hidden flex-col lg:flex-row relative">
            {/* List Skeleton */}
            <div className="flex flex-col gap-4 w-full lg:w-96 shrink-0">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-32 bg-neutral-900/50 border border-neutral-800/60 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-neutral-800"></div>
                                <div className="space-y-1.5">
                                    <div className="h-3 w-24 bg-neutral-800 rounded"></div>
                                    <div className="h-2 w-12 bg-neutral-800 rounded"></div>
                                </div>
                            </div>
                            <div className="h-5 w-16 bg-neutral-800 rounded"></div>
                        </div>
                        <div className="h-4 w-3/4 bg-neutral-800 rounded mb-4"></div>
                        <div className="border-t border-neutral-800 pt-3 flex justify-between items-center">
                            <div className="h-3 w-20 bg-neutral-800 rounded"></div>
                            <div className="h-5 w-12 bg-neutral-800 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detail Skeleton */}
            <div className="hidden lg:flex flex-1 bg-neutral-900/20 border border-neutral-800 rounded-xl overflow-hidden flex-col">
                <div className="h-16 border-b border-neutral-800 bg-neutral-900/50 flex items-center px-6 justify-between">
                    <div className="flex gap-4">
                        <div className="h-6 w-32 bg-neutral-800 rounded"></div>
                        <div className="h-6 w-20 bg-neutral-800 rounded"></div>
                    </div>
                    <div className="h-8 w-24 bg-neutral-800 rounded"></div>
                </div>
                <div className="flex-1 p-8 flex gap-8">
                    <div className="flex-1 space-y-6">
                        <div className="space-y-2">
                            <div className="h-8 w-3/4 bg-neutral-800 rounded"></div>
                            <div className="h-4 w-1/2 bg-neutral-800 rounded"></div>
                        </div>
                        <div className="h-40 bg-neutral-800/30 rounded-xl border border-neutral-800"></div>
                        <div className="h-40 bg-neutral-800/30 rounded-xl border border-neutral-800"></div>
                    </div>
                    <div className="w-80 space-y-4">
                        <div className="h-20 bg-neutral-800/30 rounded-xl border border-neutral-800"></div>
                        <div className="h-full bg-neutral-800/30 rounded-xl border border-neutral-800 flex-1"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const ChatMessage = ({ text, time, isMe, isClient, avatar }: any) => (
    <div className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
        {isClient && (
            <img src={avatar} className="w-8 h-8 rounded-full border border-neutral-800 self-end mb-1" />
        )}
        <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
            <div className={`
                px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                ${isMe
                    ? 'bg-primary text-black rounded-br-sm'
                    : 'bg-neutral-800 text-neutral-200 rounded-bl-sm border border-neutral-700'
                }
            `}>
                {text}
            </div>
            <span className="text-[9px] text-neutral-600 mt-1 px-1">{time}</span>
        </div>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const styles: any = {
        active: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        pending: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        delivered: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        completed: 'bg-green-500/10 text-green-500 border-green-500/20',
        cancelled: 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[status] || styles.pending} flex items-center gap-1`}>
            {status === 'completed' && <CheckCircle size={10} />}
            {status === 'active' && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span></span>}
            {status}
        </span>
    );
};

const TimelineItem = ({ title, date, active, processing }: any) => (
    <div className="relative pb-8 last:pb-0 border-l border-neutral-800 last:border-0 ml-1">
        <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 box-content ${active ? 'bg-primary border-primary shadow-[0_0_10px_rgba(var(--primary),0.4)]' : 'bg-neutral-900 border-neutral-700'}`}></div>
        {processing && <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-primary animate-ping opacity-75"></div>}
        <div className="pl-6 -mt-1.5">
            <h4 className={`text-xs font-bold ${active ? 'text-white' : 'text-neutral-500'}`}>{title}</h4>
            <span className="text-[10px] text-neutral-600">{date}</span>
        </div>
    </div>
);

export default ManageServicesPage;
