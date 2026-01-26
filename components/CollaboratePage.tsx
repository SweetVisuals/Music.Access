
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Verified, MessageSquare, Instagram, Youtube, Music, Radio, LayoutGrid } from 'lucide-react';
import { getCollabServices } from '../services/supabaseService';
import { CollabService } from '../types';

const CollaboratePage: React.FC = () => {
    const navigate = useNavigate();
    const [collabServices, setCollabServices] = useState<CollabService[]>([]);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        const fetchCollabs = async () => {
            try {
                const data = await getCollabServices();
                setCollabServices(data);
            } catch (error) {
                console.error('Error fetching collab services:', error);
                setCollabServices([]);
            }
        };
        fetchCollabs();
    }, []);

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'Instagram': return <Instagram size={16} className="text-pink-500" />;
            case 'YouTube': return <Youtube size={16} className="text-red-500" />;
            case 'TikTok': return <span className="font-black text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-500">TT</span>;
            case 'Spotify': return <Music size={16} className="text-green-500" />;
            default: return <Radio size={16} className="text-white" />;
        }
    };

    const filteredServices = activeTab === 'all'
        ? collabServices
        : collabServices.filter(service => service.platform.toLowerCase() === activeTab);

    return (
        <div className="w-full max-w-[1900px] mx-auto pb-4 lg:pb-32 pt-4 lg:pt-6 px-4 lg:px-10 xl:px-14 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 lg:mb-8 gap-4">
                <div className="hidden">
                    <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter">Collaborate</h1>
                    <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">Start or join collaborative projects with creative minds worldwide.</p>
                </div>

            </div>

            <div className="w-auto -mx-4 px-4 md:w-auto md:mx-0 md:px-0 mb-6 lg:mb-8">
                {/* Mobile Tabs Layout (Grid) */}
                <div className="md:hidden relative pb-2 overflow-x-auto no-scrollbar">
                    <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-900/50 rounded-lg border border-transparent min-w-[320px]">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`
                            flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                            ${activeTab === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                        `}
                        >
                            <LayoutGrid size={14} className={activeTab === 'all' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">All</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('instagram')}
                            className={`
                            flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                            ${activeTab === 'instagram' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                        `}
                        >
                            <Instagram size={14} className={activeTab === 'instagram' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">IG</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('spotify')}
                            className={`
                            flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                            ${activeTab === 'spotify' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                        `}
                        >
                            <Music size={14} className={activeTab === 'spotify' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Spotify</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('tiktok')}
                            className={`
                            flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                            ${activeTab === 'tiktok' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                        `}
                        >
                            <span className={`text-[10px] font-black ${activeTab === 'tiktok' ? 'text-primary' : ''}`}>TT</span>
                            <span className="text-[9px] font-bold uppercase tracking-tight">TikTok</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Segmented Control */}
                <div className="hidden md:flex md:flex-nowrap md:bg-neutral-900 md:p-1 md:rounded-lg md:border md:border-transparent gap-1 md:gap-0">
                    <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All" mobileCompact />
                    <TabButton active={activeTab === 'instagram'} onClick={() => setActiveTab('instagram')} label="Instagram" icon={<Instagram size={10} />} mobileCompact />
                    <TabButton active={activeTab === 'spotify'} onClick={() => setActiveTab('spotify')} label="Spotify" icon={<Music size={10} />} mobileCompact />
                    <TabButton active={activeTab === 'tiktok'} onClick={() => setActiveTab('tiktok')} label="TikTok" icon={<span className="font-bold text-[8px]">TT</span>} mobileCompact />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {filteredServices.length > 0 ? (
                    filteredServices.map(service => (
                        <div key={service.id} className="bg-[#0a0a0a] border border-transparent rounded-xl overflow-hidden hover:border-primary/30 transition-all group hover:-translate-y-1 shadow-lg">
                            <div className="p-6 relative">
                                <div className="absolute top-4 right-4 p-2 bg-neutral-900 rounded-lg border border-transparent">
                                    {getPlatformIcon(service.platform)}
                                </div>

                                <div className="flex items-center gap-3 mb-4">
                                    <img src={service.avatar} alt={service.name} className="w-12 h-12 rounded-lg object-cover border border-transparent" />
                                    <div>
                                        <h3 className="text-sm font-bold text-white flex items-center gap-1">
                                            {service.name}
                                            {service.verified && <Verified size={12} className="text-blue-400" />}
                                        </h3>
                                        <span className="text-[10px] text-neutral-500 font-mono">{service.handle}</span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h4 className="text-sm font-bold text-white mb-1">{service.serviceTitle}</h4>
                                    <p className="text-xs text-neutral-400 leading-relaxed h-10 line-clamp-2">{service.description}</p>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-neutral-900/50 rounded-lg mb-4 border border-transparent">
                                    {service.stats.map((stat, idx) => (
                                        <div key={idx} className="text-center flex-1 first:border-r border-transparent">
                                            <div className="text-xs font-bold text-white">{stat.value}</div>
                                            <div className="text-[8px] text-neutral-500 uppercase tracking-wider">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-transparent">
                                    <div className="text-xs font-mono">
                                        <span className="text-neutral-500">Price:</span> <span className="text-white font-bold">{service.priceRange}</span>
                                    </div>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-primary hover:text-black transition-colors">
                                        <MessageSquare size={14} /> Message
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center bg-gradient-to-b from-neutral-900/50 to-neutral-900/10 border border-transparent border-dashed rounded-3xl animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-neutral-900 rounded-2xl border border-transparent flex items-center justify-center mb-6 shadow-2xl shadow-black/50 relative group overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50"></div>
                            {activeTab === 'instagram' && <Instagram size={40} className="text-pink-500 relative z-10" />}
                            {activeTab === 'youtube' && <Youtube size={40} className="text-red-500 relative z-10" />}
                            {activeTab === 'tiktok' && <span className="font-black text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-500 relative z-10 font-mono">TT</span>}
                            {activeTab === 'spotify' && <Music size={40} className="text-green-500 relative z-10" />}
                            {activeTab === 'all' && <LayoutGrid size={40} className="text-white relative z-10" />}
                        </div>

                        <h3 className="text-2xl lg:text-3xl font-black text-white mb-3 max-w-md tracking-tight">
                            List Your Platform
                        </h3>

                        <p className="text-neutral-500 text-sm max-w-md mb-8 leading-relaxed">
                            {activeTab === 'all'
                                ? "Are you a curator, influencer, or platform? Advertise your reach and help artists promote their music."
                                : `Connect with artists on ${activeTab === 'tiktok' ? 'TikTok' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}. Only verified Platform Accounts can advertise here.`}
                        </p>

                        <div className="flex flex-col items-center gap-4">
                            <button
                                onClick={() => navigate('/subscription')}
                                className="group relative px-10 py-3.5 bg-primary text-black font-black rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                            >
                                <span className="relative z-10 flex items-center gap-2 uppercase text-xs tracking-widest font-black">
                                    Become a Platform Account
                                </span>
                            </button>
                            <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
                                Requires Studio+ or Pro Subscription
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, label, icon, mobileCompact }: any) => (
    <button
        onClick={onClick}
        className={`
            rounded-lg md:rounded-md font-bold flex items-center justify-center gap-1.5 transition-all border
            ${mobileCompact ? 'py-2 px-0 text-[10px] w-full' : 'px-4 py-2 md:py-1.5 text-xs'}
            ${active
                ? 'bg-white text-black border-transparent md:bg-neutral-800 md:text-white md:border-transparent md:shadow'
                : 'bg-neutral-900 text-neutral-400 border-transparent hover:bg-neutral-800 hover:text-white md:bg-transparent md:border-transparent md:hover:bg-white/5'
            }
        `}
    >
        {icon}
        <span className={mobileCompact ? 'truncate' : ''}>{label}</span>
    </button>
);

export default CollaboratePage;
