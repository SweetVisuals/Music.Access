import React, { useState, useEffect } from 'react';
import { View, CalendarEvent, Strategy } from '../types';
import {
    Map,
    Calendar as CalendarIcon,
    PenTool,
    Plus,
    ArrowRight,
    Target,
    ChevronDown,
    Layout,
    CheckCircle,
    Clock,
    Zap,
    DollarSign,
    Users,
    Music,
    TrendingUp,
    BarChart3,
    Edit,
    Trash2,
    X,
    BookOpen,
    Video,
    Smartphone,
    Rocket,
    BarChart,
    Check,
    Lock
} from 'lucide-react';
import { Goal } from '../types';
import { getGoals, getStrategies, saveStrategy, getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../services/supabaseService';
import { STAGE_TEMPLATES } from './roadmap/StageTemplates';
import StageWizard from './roadmap/StageWizard';
import EraTimeline from './roadmap/EraTimeline';
import CalendarEventModal from './roadmap/CalendarEventModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval } from 'date-fns';

interface RoadmapPageProps {
    onNavigate?: (view: View) => void;
}

const RoadmapPage: React.FC<RoadmapPageProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'planner' | 'strategy' | 'wizard'>('planner');
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loadingGoals, setLoadingGoals] = useState(true);
    const [isGoalsExpanded, setIsGoalsExpanded] = useState(false);

    // Shared Strategy Data (needed for both Strategy Tab and Planner Tab context)
    const [strategies, setStrategies] = useState<Strategy[]>([]);

    useEffect(() => {
        fetchGoals();
        fetchStrategies();
    }, []);

    const fetchGoals = async () => {
        setLoadingGoals(true);
        try {
            const data = await getGoals();
            setGoals(data);
        } catch (error) {
            console.error('Error fetching goals:', error);
        } finally {
            setLoadingGoals(false);
        }
    };

    const fetchStrategies = async () => {
        try {
            const data = await getStrategies();
            setStrategies(data);
        } catch (error) {
            console.error('Error fetching strategies:', error);
        }
    };

    // --- Helpers from GoalsPage ---
    const getGoalIcon = (type: string) => {
        switch (type) {
            case 'revenue': return <DollarSign size={16} />;
            case 'followers': return <Users size={16} />;
            case 'uploads': return <Music size={16} />;
            case 'plays': return <TrendingUp size={16} />;
            case 'sales': return <BarChart3 size={16} />;
            default: return <Target size={16} />;
        }
    };

    const getGoalColor = (type: string) => {
        switch (type) {
            case 'revenue': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'followers': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'uploads': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
            case 'plays': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case 'sales': return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
            default: return 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20';
        }
    };

    const calculateProgress = (current: number, target: number) => {
        if (target === 0) return 0;
        return Math.min((current / target) * 100, 100);
    };

    // ------------------------------

    return (
        <div className="w-full max-w-[1800px] mx-auto pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                        <Map className="text-primary" size={32} />
                        Roadmap & Planning
                    </h1>
                    <p className="text-neutral-500 text-sm">Plan your career trajectory, manage campaigns, and track goals.</p>
                </div>

                <div className="flex bg-neutral-900/50 p-1 rounded-lg border border-neutral-800">
                    <button
                        onClick={() => setActiveTab('planner')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'planner' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <CalendarIcon size={14} />
                        Calendar & Planner
                    </button>
                    <button
                        onClick={() => setActiveTab('strategy')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'strategy' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Layout size={14} />
                        Strategy Roadmap
                    </button>
                    <button
                        onClick={() => setActiveTab('wizard')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'wizard' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <PenTool size={14} />
                        Roadmap Creator
                    </button>
                </div>
            </div>

            {/* Goals Section (Compact) */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setIsGoalsExpanded(!isGoalsExpanded)}>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Target className="text-primary" size={18} />
                        Active Goals
                        <ChevronDown size={16} className={`text-neutral-500 transition-transform ${isGoalsExpanded ? 'rotate-180' : ''}`} />
                    </h2>
                    <button className="text-xs font-bold text-neutral-500 hover:text-white transition-colors">
                        {isGoalsExpanded ? 'Collapse' : 'Expand'}
                    </button>
                </div>

                {isGoalsExpanded && (
                    <>
                        {loadingGoals ? (
                            <div className="h-24 bg-white/5 animate-pulse rounded-xl"></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
                                {goals.slice(0, 4).map(goal => { // Show top 4 goals
                                    const progress = calculateProgress(goal.current, goal.target);
                                    return (
                                        <div key={goal.id} className="bg-[#0a0a0a] border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className={`p-1.5 rounded-md border ${getGoalColor(goal.type)}`}>
                                                    {getGoalIcon(goal.type)}
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-neutral-500">{goal.category}</span>
                                            </div>
                                            <h3 className="text-sm font-bold text-white truncate mb-1">{goal.title}</h3>
                                            <div className="w-full bg-neutral-900 rounded-full h-1.5 mb-2">
                                                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-neutral-500">
                                                <span>{Math.round(progress)}%</span>
                                                <span>{goal.current} / {goal.target}</span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add Goal Button */}
                                <button className="bg-white/5 border border-dashed border-neutral-800 rounded-lg p-4 hover:bg-white/10 hover:border-neutral-600 transition-all flex flex-col items-center justify-center gap-2 group">
                                    <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-primary group-hover:text-black transition-colors">
                                        <Plus size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-neutral-400 group-hover:text-white">Add New Goal</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="h-px bg-neutral-800 mb-8"></div>

            {/* Main Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'planner' && <PlannerTab strategies={strategies} />}
                {activeTab === 'strategy' && <StrategyTab strategies={strategies} onUpdate={fetchStrategies} />}
                {activeTab === 'wizard' && <RoadmapWizardTab />}
            </div>

        </div>
    );
};

// --- Planner Tab ---

const PlannerTab: React.FC<{ strategies: Strategy[] }> = ({ strategies }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(undefined);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Padding days for grid
    const startDay = monthStart.getDay();

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const fetchEvents = async () => {
        setLoading(true);
        // Fetch extra buffer manually for range
        const start = subMonths(monthStart, 1);
        const end = addMonths(monthEnd, 1);
        try {
            const data = await getCalendarEvents(start, end);
            setEvents(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const handleAddEvent = (date?: Date) => {
        setSelectedDate(date || new Date());
        setSelectedEvent(undefined);
        setIsModalOpen(true);
    };

    const handleEditEvent = (event: CalendarEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDate(new Date(event.startDate));
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
        try {
            if (selectedEvent) {
                await updateCalendarEvent(selectedEvent.id, eventData);
            } else {
                await createCalendarEvent(eventData);
            }
            setIsModalOpen(false);
            fetchEvents(); // Refresh
        } catch (e) {
            console.error("Failed to save event", e);
        }
    };

    // Derived: Campaigns for EraTimeline
    const activeCampaigns = events.filter(e => e.type === 'campaign');

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'content': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'campaign': return 'bg-primary/10 text-primary border-primary/20';
            case 'meeting': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'milestone': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            default: return 'bg-neutral-800 text-neutral-400 border-neutral-700';
        }
    };

    return (
        <div>
            {/* Era Timeline - "Bigger Picture" */}
            <EraTimeline
                strategies={strategies}
                campaigns={activeCampaigns}
                onAddCampaign={() => {
                    setSelectedEvent(undefined);
                    setSelectedDate(new Date());
                    // Pre-fill type would require expanding modal props or generic wrapper
                    // For now, modal defaults to content, user can switch
                    setIsModalOpen(true);
                }}
            />

            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
                {/* Calendar Header */}
                <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <CalendarIcon size={20} className="text-primary" />
                            {format(currentDate, 'MMMM yyyy')}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1">
                            {events.filter(e => isSameMonth(new Date(e.startDate), currentDate)).length} events scheduled
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700">
                            <ChevronDown size={20} className="rotate-90" />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 hover:bg-white/10 rounded-lg text-xs font-bold text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700">
                            Today
                        </button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors border border-transparent hover:border-neutral-700">
                            <ChevronDown size={20} className="-rotate-90" />
                        </button>

                        <div className="w-px h-8 bg-neutral-800 mx-2"></div>

                        <button
                            onClick={() => handleAddEvent()}
                            className="px-4 py-2 bg-primary text-black rounded-lg text-xs font-bold hover:bg-primary/90 flex items-center gap-2"
                        >
                            <Plus size={14} /> New Event
                        </button>
                    </div>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-900/80">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="py-3 text-center text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                {loading ? (
                    <div className="h-[600px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-7 auto-rows-[140px] bg-neutral-900/20">
                        {/* Empty slots for start of month */}
                        {[...Array(startDay)].map((_, i) => (
                            <div key={`empty-${i}`} className="border-r border-b border-neutral-800/50 bg-neutral-900/40"></div>
                        ))}

                        {/* Days */}
                        {days.map((day) => {
                            const isToday = isSameDay(day, new Date());
                            const dayEvents = events.filter(e => isSameDay(new Date(e.startDate), day));

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`
                                        border-r border-b border-neutral-800/50 p-2 relative group transition-colors cursor-pointer
                                        ${isToday ? 'bg-primary/5' : 'hover:bg-white/5'}
                                    `}
                                    onClick={() => handleAddEvent(day)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`
                                            text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                                            ${isToday ? 'bg-primary text-black' : 'text-neutral-500 group-hover:text-white'}
                                        `}>
                                            {format(day, 'd')}
                                        </span>
                                        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-neutral-400 hover:text-white transition-opacity">
                                            <Plus size={12} />
                                        </button>
                                    </div>

                                    {/* Event List */}
                                    <div className="space-y-1 overflow-y-auto max-h-[90px] custom-scrollbar">
                                        {dayEvents.map((event) => (
                                            <div
                                                key={event.id}
                                                onClick={(e) => handleEditEvent(event, e)}
                                                className={`p-1.5 rounded-md border text-[10px] font-bold truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 ${getTypeColor(event.type)}`}
                                            >
                                                {/* Mini Icons per type */}
                                                {event.platform === 'instagram' && <Smartphone size={8} />}
                                                {event.type === 'meeting' && <Users size={8} />}

                                                <span className={event.status === 'completed' ? 'line-through opacity-50' : ''}>
                                                    {event.title}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <CalendarEventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvent}
                initialDate={selectedDate}
                existingEvent={selectedEvent}
                strategies={strategies}
            />
        </div>
    );
};

// --- Strategy Tab ---

interface StrategyTabProps {
    strategies: Strategy[];
    onUpdate: () => void;
}

const StrategyTab: React.FC<StrategyTabProps> = ({ strategies, onUpdate }) => {
    // Convert strategies array to map for easier lookup
    const strategyMap = strategies.reduce((acc, curr) => {
        acc[curr.stageId] = { status: curr.status, data: curr.data };
        return acc;
    }, {} as Record<string, { status: 'not_started' | 'in_progress' | 'completed', data: any }>);

    const [openWizard, setOpenWizard] = useState<string | null>(null); // Stage ID
    const [expandedStage, setExpandedStage] = useState<string | null>(null);

    const handleStartStage = (stageId: string) => {
        setOpenWizard(stageId);
    };

    const handleSaveStage = async (stageId: string, data: any) => {
        try {
            await saveStrategy(stageId, data);
            setOpenWizard(null);
            onUpdate(); // Reload
        } catch (e) {
            console.error("Failed to save strategy", e);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-white">Strategy Roadmap</h2>
                    <p className="text-neutral-500">Define your artist identity, era, and execution plan.</p>
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-2 text-xs font-mono text-neutral-400">
                    {strategies.filter(s => s.status === 'completed').length} / {STAGE_TEMPLATES.length} Stages Completed
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <StrategyTabContent
                    strategyData={strategyMap}
                    onStartStage={handleStartStage}
                    onToggleDetails={(id: string) => setExpandedStage(expandedStage === id ? null : id)}
                    expandedStage={expandedStage}
                />
            </div>

            {/* Wizard Modal */}
            {openWizard && (
                <StageWizardContainer
                    stageId={openWizard}
                    onClose={() => setOpenWizard(null)}
                    onSave={(data: any) => handleSaveStage(openWizard, data)}
                    initialData={strategyMap[openWizard]?.data}
                />
            )}
        </div>
    );
};

// --- Sub-components for StrategyTab (Unchanged logic, passed via props) ---
const StrategyTabContent: React.FC<any> = ({ strategyData, onStartStage, onToggleDetails, expandedStage }) => {

    return (
        <div className="w-full pb-12 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 px-4 w-full">
                {STAGE_TEMPLATES.map((stage: any, index) => {
                    const status = strategyData[stage.id]?.status || 'not_started';
                    const isLocked = false;

                    return (
                        <div key={stage.id} className="flex flex-col group h-full">
                            {/* Card */}
                            <div className={`
                                w-full h-[200px] flex flex-col relative
                                rounded-xl border backdrop-blur-sm transition-all duration-300
                                hover:translate-y-[-4px] hover:shadow-xl
                                ${status === 'completed'
                                    ? 'bg-green-500/10 border-green-500/30 hover:shadow-green-500/20'
                                    : isLocked
                                        ? 'bg-neutral-900/40 border-neutral-800/50 opacity-60'
                                        : 'bg-neutral-900/60 border-neutral-800 hover:border-primary/50 hover:shadow-primary/10'
                                }
                            `}>
                                {/* Header Image / Icon Area */}
                                <div className={`
                                    h-16 w-full border-b flex items-center justify-center relative overflow-hidden
                                    ${status === 'completed' ? 'border-green-500/20 bg-green-500/5' : 'border-neutral-800 bg-black/20'}
                                `}>
                                    <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                                        Step {String(index + 1).padStart(2, '0')}
                                    </div>

                                    {/* Icon Circle */}
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg z-10
                                        ${status === 'completed'
                                            ? 'bg-green-500 text-black border-green-400'
                                            : isLocked
                                                ? 'bg-neutral-800 text-neutral-600 border-neutral-700'
                                                : 'bg-neutral-900 text-primary border-primary/30 group-hover:scale-110 transition-transform duration-300'
                                        }
                                    `}>
                                        {status === 'completed' ? <CheckCircle size={18} /> : <div className="text-sm font-bold">{index + 1}</div>}
                                    </div>

                                    {/* Background decorative glow */}
                                    {!isLocked && <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />}
                                </div>

                                {/* Content */}
                                <div className="p-3 flex-1 flex flex-col">
                                    <h3 className={`text-xs font-bold mb-1 ${status === 'completed' ? 'text-green-400' : 'text-white'}`}>
                                        {stage.title}
                                    </h3>
                                    <p className="text-[10px] text-neutral-400 leading-snug mb-2 flex-1 line-clamp-2">
                                        {stage.description}
                                    </p>

                                    {/* Footer / Actions */}
                                    <div className="mt-auto">
                                        <button
                                            onClick={() => onStartStage(stage.id)}
                                            disabled={isLocked}
                                            className={`
                                                w-full py-2.5 rounded-lg font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-1.5
                                                ${status === 'completed'
                                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20'
                                                    : isLocked
                                                        ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                                                        : 'bg-white text-black hover:bg-neutral-200 shadow-lg shadow-white/10'
                                                }
                                            `}
                                        >
                                            {status === 'completed' ? (
                                                <>Edit <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1"></div></>
                                            ) : isLocked ? (
                                                <><Lock size={12} /> Locked</>
                                            ) : (
                                                <>Start <ArrowRight size={12} /></>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const StageWizardContainer: React.FC<any> = ({ stageId, onClose, onSave, initialData }) => {
    const config = STAGE_TEMPLATES.find(t => t.id === stageId);
    if (!config) return null;
    return (
        <StageWizard
            config={config}
            onClose={onClose}
            onSave={onSave}
            initialData={initialData}
        />
    );
}

// Wizard Tab (Placeholder form for now unchanged)
const RoadmapWizardTab: React.FC = () => {
    // ... (Existing implementation kept simple for now)
    return (
        <div className="flex items-center justify-center h-48 text-neutral-500">
            Roadmap Wizard (Use Strategy Tab for granular planning for now)
        </div>
    );
};

export default RoadmapPage;

