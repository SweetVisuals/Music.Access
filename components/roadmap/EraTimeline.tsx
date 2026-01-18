import React from 'react';
import { Strategy, CalendarEvent } from '../../types';
import { ArrowRight, Flag, Calendar } from 'lucide-react';

interface EraTimelineProps {
    strategies: Strategy[];
    campaigns: CalendarEvent[]; // Events with type='campaign'
    onAddCampaign: () => void;
}

const EraTimeline: React.FC<EraTimelineProps> = ({ strategies, campaigns, onAddCampaign }) => {
    // 1. Identify Current Era (Stage 4)
    const eraStrategy = strategies.find(s => s.stageId === 'stage-4');
    const eraData = eraStrategy?.data as any; // { where_do_i_find_myself_now, defined_environment, ... }

    // Fallback if no era defined
    if (!eraData) {
        return (
            <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-xl p-6 mb-8 text-center">
                <h3 className="text-xl font-bold text-white mb-2">No Era Defined</h3>
                <p className="text-neutral-400 text-sm mb-4">Start your roadmap strategy to define your current artist era.</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-neutral-300 text-xs font-mono">
                    <Flag size={12} /> Stage 4: Define Era
                </div>
            </div>
        );
    }

    const eraName = eraData.where_do_i_find_myself_now?.[0] || 'Unknown Era';
    const eraEnv = eraData.defined_environment?.[0] || 'Unknown World';

    return (
        <div className="bg-[#0a0a0a] rounded-xl p-6 mb-8 relative overflow-hidden group">
            {/* Background Texture/Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none" />

            <div className="relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-sm">Current Era</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-sm">{eraEnv}</span>
                        </div>
                        <h2 className="text-3xl font-black text-white">{eraName}</h2>
                    </div>

                    <button
                        onClick={onAddCampaign}
                        className="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2 shadow-lg shadow-white/5"
                    >
                        <Flag size={14} /> Note Campaign
                    </button>
                </div>

                {/* Campaign Timeline Visualization */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase flex items-center gap-2">
                        <Calendar size={12} /> Active Campaigns
                    </h4>

                    {campaigns.length === 0 ? (
                        <div className="h-12 bg-white/5 rounded-lg flex items-center justify-center text-xs text-neutral-500">
                            No campaigns scheduled. Plan one now!
                        </div>
                    ) : (
                        <div className="relative pt-2">
                            {/* Simple Gantt-like bars */}
                            {campaigns.map((camp) => {
                                const startDate = new Date(camp.startDate);
                                const endDate = camp.endDate ? new Date(camp.endDate) : new Date(startDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // Default 1 week
                                const now = new Date();

                                // Calculate status/progress visualization
                                const isPast = endDate < now;
                                const isActive = startDate <= now && endDate >= now;

                                return (
                                    <div key={camp.id} className="flex items-center gap-4 mb-2">
                                        <div className="w-24 text-[10px] text-neutral-400 truncate text-right font-mono">
                                            {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>

                                        <div className={`
                                            flex-1 h-8 rounded-lg flex items-center px-3 relative overflow-hidden transition-all hover:scale-[1.01] cursor-pointer
                                            ${isActive
                                                ? 'bg-gradient-to-r from-primary/20 to-primary/5'
                                                : isPast
                                                    ? 'bg-neutral-900 opacity-60' // Past
                                                    : 'bg-neutral-800/50' // Future
                                            }
                                        `}>
                                            <span className={`text-xs font-bold truncate z-10 ${isActive ? 'text-primary' : 'text-neutral-300'}`}>
                                                {camp.title}
                                            </span>

                                            {/* Progress Bar Background (Simulated) */}
                                            {isActive && (
                                                <div className="absolute left-0 top-0 bottom-0 bg-primary/5 w-1/3" />
                                            )}
                                        </div>

                                        <div className="w-24 text-[10px] text-neutral-400 truncate font-mono">
                                            {endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EraTimeline;
