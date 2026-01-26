import React from 'react';
import { Strategy, CalendarEvent } from '../../types';
import { Flag, Sparkles, TrendingUp, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { format, isValid } from 'date-fns';

interface EraTimelineProps {
    strategies: Strategy[];
    campaigns: CalendarEvent[];
    strategyCampaigns: any[];
    onAddCampaign: () => void;
}

const EraTimeline: React.FC<EraTimelineProps> = ({ strategies, campaigns, strategyCampaigns, onAddCampaign }) => {
    // 1. Identify Current Era (Stage 4)
    const eraStrategy = strategies.find(s => s.stageId === 'stage-4');
    const eraData = eraStrategy?.data as any;

    if (!eraData) {
        return (
            <div className="px-6 md:px-0">
                <div className={`group relative overflow-hidden rounded-3xl bg-neutral-900 p-8 mb-8 transition-all`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800" />
                    <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-500">
                            <Flag size={24} className="text-neutral-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Define Your Era</h3>
                        <p className="text-neutral-500 max-w-md">The most successful artists don't just release music—they build eras. Define yours to unlock this planner.</p>
                    </div>
                </div>
            </div>
        );
    }

    const eraName = eraData.era_title || eraData.where_do_i_find_myself_now?.[0] || 'Untitled Era';

    // Merge Campaigns
    const allCampaigns = React.useMemo(() => {
        const mappedStrategyCampaigns = (strategyCampaigns || []).map(c => ({
            id: `strat-${c.name}`,
            title: c.name,
            startDate: c.dates?.from || new Date().toISOString(),
            endDate: c.dates?.to || new Date().toISOString(),
            type: 'campaign',
        }));

        const combined = [...mappedStrategyCampaigns];
        campaigns.forEach(calEvent => {
            if (!combined.find(c => c.title === calEvent.title)) {
                combined.push(calEvent);
            }
        });
        return combined.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [campaigns, strategyCampaigns]);

    const activeCampaigns = allCampaigns.filter(c => {
        const start = new Date(c.startDate);
        const end = c.endDate ? new Date(c.endDate) : new Date();
        const now = new Date();
        return start <= now && end >= now;
    });

    const upcomingCampaigns = allCampaigns.filter(c => new Date(c.startDate) > new Date()).slice(0, 1);

    return (
        <div className="px-6 md:px-0">
            <div className="relative w-full rounded-2xl md:rounded-[2rem] overflow-hidden mb-8 md:mb-10 group shadow-2xl shadow-indigo-900/20">
                {/* Dynamic Background */}
                <div className="absolute inset-0 bg-black">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 opacity-80" />
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />

                    {/* Animated Orbs */}
                    <div className="absolute -top-24 -right-24 w-64 md:w-96 h-64 md:h-96 bg-pink-500 rounded-full blur-[100px] md:blur-[128px] opacity-40 animate-pulse" />
                    <div className="absolute -bottom-24 -left-24 w-64 md:w-96 h-64 md:h-96 bg-indigo-500 rounded-full blur-[100px] md:blur-[128px] opacity-40 animate-pulse delay-1000" />
                </div>

                <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 md:gap-8">

                    {/* Main Content */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-bold uppercase tracking-widest mb-6">
                            <Sparkles size={10} className="text-yellow-300" />
                            Current Era
                        </div>

                        <h1 className="text-3xl md:text-7xl font-black text-white tracking-tighter leading-tight md:leading-[0.9] drop-shadow-xl mb-4 md:mb-6 uppercase">
                            {eraName}
                        </h1>

                        {/* Active Campaign Status - Glass Bar */}
                        <div className="inline-flex flex-col md:flex-row items-center gap-4 p-2 md:p-2 bg-black/20 backdrop-blur-xl rounded-2xl px-4 md:pr-6">
                            <div className="flex -space-x-2 px-2">
                                {/* Fake Avatars / Icons for visual density */}
                                <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white/20 flex items-center justify-center text-white"><TrendingUp size={14} /></div>
                                <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-white/20 flex items-center justify-center text-white"><CalendarIcon size={14} /></div>
                            </div>

                            <div className="text-left">
                                <div className="text-xs font-bold text-white/60 uppercase tracking-wider">Active Operations</div>
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                    {activeCampaigns.length > 0 ? (
                                        <>
                                            {activeCampaigns.length} Campaigns Live
                                            <span className="w-1 h-1 rounded-full bg-white/40" />
                                            <span className="text-white/80 font-normal truncate max-w-[120px] md:max-w-[150px]">{activeCampaigns[0].title}</span>
                                        </>
                                    ) : (
                                        <span className="text-white/80 font-normal">No active campaigns</span>
                                    )}
                                </div>
                            </div>

                            {upcomingCampaigns.length > 0 && (
                                <>
                                    <div className="w-px h-8 bg-white/10 hidden md:block" />
                                    <div className="text-left hidden md:block">
                                        <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Up Next</div>
                                        <div className="text-xs font-bold text-white">{upcomingCampaigns[0].title}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* KPI / Action Area */}
                    <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[200px]">
                        <button
                            onClick={onAddCampaign}
                            className="group relative px-6 py-4 bg-white text-black rounded-xl font-black text-sm tracking-wide transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Manage Roadmap <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </button>

                        <div className="text-center">
                            <span className="text-[10px] font-medium text-white/40">
                                {allCampaigns.length} Total Campaigns
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EraTimeline;
