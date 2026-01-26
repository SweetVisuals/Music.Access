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
    Lock,
    Sparkles
} from 'lucide-react';
import { Goal } from '../types';
import { getGoals, getStrategies, saveStrategy, getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, saveStrategyToCalendar, getCurrentUser, markStageStarted } from '../services/supabaseService';
// ... imports

// ... inside RoadmapPage component



// ... inside StrategyTabContent


import { STAGE_TEMPLATES } from './roadmap/StageTemplates';
import AiPlanner from './roadmap/AiPlanner';
import StageWizard from './roadmap/StageWizard';
import EraTimeline from './roadmap/EraTimeline';
import CalendarEventModal from './roadmap/CalendarEventModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, isValid, parseISO } from 'date-fns';
import AiPlannerModal from './roadmap/AiPlannerModal';

interface RoadmapPageProps {
    onNavigate?: (view: View) => void;
}

const RoadmapPage: React.FC<RoadmapPageProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'planner' | 'strategy' | 'wizard'>('planner');
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loadingGoals, setLoadingGoals] = useState(true);
    const [isGoalsExpanded, setIsGoalsExpanded] = useState(true);

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

    // ------------------------------



    const [openStrategyWizard, setOpenStrategyWizard] = useState<string | null>(null);
    const [showFullCalendar, setShowFullCalendar] = useState(false);
    const [showMobileAiWizard, setShowMobileAiWizard] = useState(false);

    return (
        <div className="w-full max-w-[1800px] mx-auto relative animate-in fade-in duration-500 min-h-[500px]">

            {/* Header & Goals Section - Collapsible */}
            <div className={`px-6 lg:px-8 pt-6 transition-all duration-700 ease-in-out overflow-hidden ${openStrategyWizard ? 'max-h-0 opacity-0 mb-0' : 'max-h-[800px] opacity-100 mb-8'}`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">

                    <div className="hidden">
                        <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter flex items-center gap-3">
                            <Map className="text-primary" size={32} />
                            Roadmap
                        </h1>
                        <p className="text-neutral-500 text-sm lg:text-base">Plan your career trajectory, manage campaigns, and track goals.</p>
                    </div>

                    <div className="flex w-full md:w-auto bg-neutral-900/50 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('planner')}
                            className={`flex-1 md:flex-none justify-center px-3 md:px-4 py-2 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center gap-1.5 md:gap-2 ${activeTab === 'planner' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <CalendarIcon size={14} />
                            <span className="truncate">Planner</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('strategy')}
                            className={`flex-1 md:flex-none justify-center px-3 md:px-4 py-2 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center gap-1.5 md:gap-2 ${activeTab === 'strategy' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Layout size={14} />
                            <span className="truncate">Roadmap</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('wizard')}
                            className={`flex-1 md:flex-none justify-center px-3 md:px-4 py-2 rounded-md text-[10px] md:text-xs font-bold transition-all flex items-center gap-1.5 md:gap-2 ${activeTab === 'wizard' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <PenTool size={14} />
                            <span className="truncate">Creator</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Calendar Trigger - Only on Planner Tab */}
                {activeTab === 'planner' && (
                    <div className="md:hidden pb-8">
                        <button
                            onClick={() => setShowFullCalendar(true)}
                            className="w-full py-5 bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl flex flex-col items-center justify-center gap-3 text-neutral-400 hover:text-white transition-all shadow-lg active:scale-95 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors shadow-inner">
                                <CalendarIcon size={24} />
                            </div>
                            <div>
                                <span className="block text-lg font-black text-white">Open Calendar</span>
                                <span className="block text-xs font-medium text-neutral-500 mt-1">View full schedule & events</span>
                            </div>
                        </button>
                    </div>
                )}

                <div className="h-px bg-neutral-800/20"></div>
            </div>

            {/* Main Content Area */}
            <div className="min-h-[500px]">
                {activeTab === 'planner' && (
                    <PlannerTab
                        strategies={strategies}
                        goals={goals}
                        loadingGoals={loadingGoals}
                        isGoalsExpanded={isGoalsExpanded}
                        setIsGoalsExpanded={setIsGoalsExpanded}
                        showFullCalendar={showFullCalendar}
                        setShowFullCalendar={setShowFullCalendar}
                    />
                )}

                {activeTab === 'strategy' && (
                    <StrategyTab
                        strategies={strategies}
                        onUpdate={fetchStrategies}
                        openWizard={openStrategyWizard}
                        setOpenWizard={setOpenStrategyWizard}
                    />
                )}
                {activeTab === 'wizard' && (
                    <>
                        {/* Desktop: Inline */}
                        <div className="hidden md:block">
                            <AiPlanner strategies={strategies} onEventsAdded={() => setActiveTab('planner')} />
                        </div>

                        {/* Mobile: Trigger Button */}
                        <div className="md:hidden pb-8 px-6">
                            <button
                                onClick={() => setShowMobileAiWizard(true)}
                                className="w-full py-5 bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl flex flex-col items-center justify-center gap-3 text-neutral-400 hover:text-white transition-all shadow-lg active:scale-95 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-colors shadow-inner">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <span className="block text-lg font-black text-white">Open AI Assistant</span>
                                    <span className="block text-xs font-medium text-neutral-500 mt-1">Chat to build your roadmap</span>
                                </div>
                            </button>
                        </div>

                        {/* Mobile: Full Screen Modal */}
                        {showMobileAiWizard && (
                            <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-in slide-in-from-bottom-5 duration-300">
                                {/* Header */}
                                <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900/50 backdrop-blur-md">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={16} className="text-primary" />
                                        <span className="font-bold text-white">AI Assistant</span>
                                    </div>
                                    <button
                                        onClick={() => setShowMobileAiWizard(false)}
                                        className="p-2 bg-neutral-800 rounded-full text-white hover:bg-neutral-700"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                {/* Content */}
                                <div className="flex-1 overflow-hidden">
                                    <AiPlanner strategies={strategies} onEventsAdded={() => {
                                        setActiveTab('planner');
                                        setShowMobileAiWizard(false);
                                    }} />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

        </div>
    );
};

// --- Planner Tab ---

interface PlannerTabProps {
    strategies: Strategy[];
    goals: Goal[];
    loadingGoals: boolean;
    isGoalsExpanded: boolean;
    setIsGoalsExpanded: (expanded: boolean) => void;
    showFullCalendar: boolean;
    setShowFullCalendar: (show: boolean) => void;
}

const PlannerTab: React.FC<PlannerTabProps> = ({
    strategies,
    goals,
    loadingGoals,
    isGoalsExpanded,
    setIsGoalsExpanded,
    showFullCalendar,
    setShowFullCalendar
}) => {

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

    // Derived: Strategy Campaigns for Calendar Coloring
    const strategyCampaigns = React.useMemo(() => {
        const stage5 = strategies.find(s => s.id === 'stage-5');
        if (!stage5?.data?.campaigns?.campaign_list) return [];
        return (stage5.data.campaigns.campaign_list as any[]).map((c, i) => {
            const start = c.dates?.from ? new Date(c.dates.from) : undefined;
            const end = c.dates?.to ? new Date(c.dates.to) : undefined;
            // Define styles: [bg, text, border]
            const palettes = [
                ['bg-indigo-500/10', 'text-indigo-400', ''],
                ['bg-emerald-500/10', 'text-emerald-400', ''],
                ['bg-orange-500/10', 'text-orange-400', ''],
                ['bg-pink-500/10', 'text-pink-400', ''],
                ['bg-cyan-500/10', 'text-cyan-400', '']
            ];
            const theme = palettes[i % palettes.length];
            return {
                name: c.name,
                dates: c.dates,
                start,
                end,
                style: { bg: theme[0], text: theme[1], border: theme[2] }
            };
        }).filter(c => c.dates?.from && c.dates?.to);
    }, [strategies]);

    // Derived: Active Era for coloring
    const activeEra = React.useMemo(() => {
        const stage4 = strategies.find(s => s.stageId === 'stage-4');
        if (!stage4?.data) return null;

        // 1. Prioritize explicit era_dates (New)
        if (stage4.data.era_dates?.from) {
            const fromDate = stage4.data.era_dates.from;
            let toDate = stage4.data.era_dates.to;

            // FIX: If toDate is empty OR equals fromDate, treat as open-ended (start date only)
            if (!toDate || toDate === fromDate) {
                toDate = undefined;
            }

            // Validate they look like dates at least.
            if (fromDate.length === 10) {
                // Determine Color
                let bgClass = 'bg-yellow-500/10'; // Default
                if (stage4.data.era_color) {
                    if (stage4.data.era_color.includes('Purple')) bgClass = 'bg-purple-500/10';
                    if (stage4.data.era_color.includes('Blue')) bgClass = 'bg-blue-500/10';
                    if (stage4.data.era_color.includes('Red')) bgClass = 'bg-red-500/10';
                    if (stage4.data.era_color.includes('Green')) bgClass = 'bg-green-500/10';
                    if (stage4.data.era_color.includes('Pink')) bgClass = 'bg-pink-500/10';
                }

                return {
                    from: fromDate,
                    to: toDate,
                    style: bgClass
                };
            }
        }

        // 2. Fallback to start-only (Legacy - Convert to YYYY-MM-DD)
        let start: Date | undefined;
        if (stage4.data.startDate) start = parseISO(stage4.data.startDate);
        if (!start && stage4.data.date) start = parseISO(stage4.data.date);
        if (!start && (stage4 as any).updated_at) start = new Date((stage4 as any).updated_at);

        if (start && isValid(start)) {
            return {
                from: format(start, 'yyyy-MM-dd'),
                to: undefined,
                style: 'bg-yellow-500/10'
            };
        }
        return null;
    }, [strategies]);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'content': return 'bg-blue-500/10 text-blue-400';
            case 'campaign': return 'bg-primary/10 text-primary';
            case 'meeting': return 'bg-purple-500/10 text-purple-400';
            case 'milestone': return 'bg-yellow-500/10 text-yellow-400';
            default: return 'bg-neutral-800 text-neutral-400';
        }
    };

    return (
        <div>
            {/* Era Timeline - "Bigger Picture" */}
            <EraTimeline
                strategies={strategies}
                campaigns={activeCampaigns}
                strategyCampaigns={strategyCampaigns}
                onAddCampaign={() => {
                    setSelectedEvent(undefined);
                    setSelectedDate(new Date());
                    // Pre-fill type would require expanding modal props or generic wrapper
                    // For now, modal defaults to content, user can switch
                    setIsModalOpen(true);
                }}
            />

            {/* Active Goals Section (Swapped with Mobile Calendar Trigger) */}
            <div className="mb-8 mt-8 px-6 md:px-0">
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
                                        <div key={goal.id} className="bg-[#0a0a0a] rounded-lg p-4 transition-colors">
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
                                <button className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all flex flex-col items-center justify-center gap-2 group">
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

            <div className={`
                bg-[#0a0a0a] transition-all duration-300
                ${showFullCalendar
                    ? 'fixed top-[60px] bottom-0 inset-x-0 z-[40] flex flex-col shadow-2xl'
                    : 'overflow-hidden shadow-2xl hidden md:block'
                }
            `}>

                {/* Calendar Header */}
                <div className={`
                    bg-neutral-900/50 flex items-center justify-between shrink-0
                    ${showFullCalendar ? 'p-4' : 'p-6'}
                `}>
                    {/* Mobile Header View */}
                    {showFullCalendar && (
                        <div className="md:hidden w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowFullCalendar(false)} className="mr-2">
                                    <ArrowRight size={20} className="rotate-180 text-neutral-400" />
                                </button>
                                <span className="text-lg font-bold text-white">Calendar</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button onClick={handlePrevMonth} className="p-2 bg-neutral-800 rounded-lg text-white">
                                    <ChevronDown size={18} className="rotate-90" />
                                </button>
                                <span className="text-sm font-bold text-white w-20 text-center">{format(currentDate, 'MMM yyyy')}</span>
                                <button onClick={handleNextMonth} className="p-2 bg-neutral-800 rounded-lg text-white">
                                    <ChevronDown size={18} className="-rotate-90" />
                                </button>
                            </div>

                            <button onClick={() => setShowFullCalendar(false)} className="p-2 bg-neutral-800 rounded-full text-white">
                                <X size={20} />
                            </button>
                        </div>
                    )}

                    {/* Desktop Header View */}
                    <div className={`${showFullCalendar ? 'hidden md:flex' : 'flex'} w-full items-center justify-between`}>
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
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors">
                                <ChevronDown size={20} className="rotate-90" />
                            </button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 hover:bg-white/10 rounded-lg text-xs font-bold text-neutral-400 hover:text-white transition-colors">
                                Today
                            </button>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors">
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
                </div>

                {/* Calendar Grid Wrapper for Scroll */}
                <div className="overflow-x-auto overflow-y-auto flex-1 relative custom-scrollbar bg-neutral-900/20 overscroll-x-contain">
                    {/* Sticky Days Header */}
                    <div className="grid grid-cols-7 bg-neutral-900/95 backdrop-blur-sm sticky top-0 z-10 min-w-[700px] md:min-w-0">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="py-3 text-center text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>

                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 auto-rows-[140px] min-w-[700px] md:min-w-0 pb-12">
                            {/* Empty slots for start of month */}
                            {[...Array(startDay)].map((_, i) => (
                                <div key={`empty - ${i} `} className="bg-neutral-900/40"></div>
                            ))}

                            {/* Days */}
                            {days.map((day) => {
                                const isToday = isSameDay(day, new Date());
                                const dayEvents = events.filter(e => isSameDay(new Date(e.startDate), day));
                                const dayStr = format(day, 'yyyy-MM-dd'); // Normalize to YYYY-MM-DD for matching

                                // Check for Active Strategy Campaign (Date Range)
                                const activeStrategyCampaign = strategyCampaigns.find(c =>
                                    c.dates?.from && c.dates?.to && dayStr >= c.dates.from && dayStr <= c.dates.to
                                );

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`
                                            p-2 relative group transition-colors cursor-pointer flex flex-col gap-1
                                            ${activeStrategyCampaign
                                                ? 'bg-primary/10 text-primary' // Use simpler fallback as dynamic styles were failing? Or assume styling is known.
                                                : activeEra && ((activeEra.to && dayStr >= activeEra.from && dayStr <= activeEra.to) || (!activeEra.to && dayStr >= activeEra.from))
                                                    ? activeEra.style
                                                    : isToday
                                                        ? 'bg-primary/5'
                                                        : 'hover:bg-white/5'
                                            }
                                        `}
                                        onClick={() => handleAddEvent(day)}
                                    >
                                        {/* Campaign Label */}
                                        {activeStrategyCampaign && (
                                            <div className={`text-[8px] font-black uppercase tracking-wider truncate px-1 rounded-sm opacity-80 ${activeStrategyCampaign.style.text}`}>
                                                {activeStrategyCampaign.name}
                                            </div>
                                        )}
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
                                                    className={`p-1.5 rounded-md text-[10px] font-bold truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 ${getTypeColor(event.type)}`}
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
    openWizard: string | null;
    setOpenWizard: (id: string | null) => void;
}

const StrategyTab: React.FC<StrategyTabProps> = ({ strategies, onUpdate, openWizard, setOpenWizard }) => {
    // Convert strategies array to map for easier lookup
    const strategyMap = strategies.reduce((acc, curr) => {
        acc[curr.stageId] = { status: curr.status, data: curr.data };
        return acc;
    }, {} as Record<string, { status: 'not_started' | 'in_progress' | 'completed', data: any }>);

    const [expandedStage, setExpandedStage] = useState<string | null>(null);

    const handleStartStage = async (stageId: string) => {
        setOpenWizard(stageId);
        // Removed immediate markStageStarted to prevent "Continue" status before editing
    };

    const handleSaveStage = async (stageId: string, data: any, status: 'in_progress' | 'completed' = 'completed', shouldClose: boolean = true) => {
        try {
            await saveStrategy(stageId, data, status);

            // Sync to Calendar if this is the Campaign stage AND it's completed
            // (We might want to sync visible campaigns even if in_progress, but let's stick to completed for now or checks)
            // Sync to Calendar if this is a relevant stage (Campaigns, Content, Schedule) AND it's completed (or saving progress)
            // We sync even on progress save to keep calendar updated interactively
            if (['stage-5', 'stage-6', 'stage-9'].includes(stageId)) {
                const user = await getCurrentUser();
                if (user) {
                    // We pass 'data' but the service will likely re-fetch full state to ensure cross-stage consistency
                    await saveStrategyToCalendar(user.id, data);

                    // Trigger a refresh of the events in the PlannerTab if they share state/context
                    // For now, this is a distinct side-effect.
                }
            }

            // Only close if completed, otherwise just update without closing (for auto-save/progress)
            if (status === 'completed' && shouldClose) {
                setOpenWizard(null);
            }
            onUpdate(); // Reload strategies
        } catch (e) {
            console.error("Failed to save strategy", e);
        }
    };

    return (
        <div className="space-y-8 w-full">
            <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between mb-8 px-6 lg:px-8 gap-4">
                <div className="hidden lg:block">
                    <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter">Roadmap</h1>
                    <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">Strategic planning and long-term release schedule.</p>
                </div>
                <div className="w-full lg:max-w-md flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] lg:text-xs font-bold uppercase tracking-wider">
                        <span className="text-neutral-500">Total Completion</span>
                        <span className="text-white">{Math.round((strategies.filter(s => s.status === 'completed').length / STAGE_TEMPLATES.length) * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 lg:h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all duration-1000 ease-out"
                            style={{ width: `${(strategies.filter(s => s.status === 'completed').length / STAGE_TEMPLATES.length) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-neutral-600 font-mono">
                        <span>Strategy Progress</span>
                        <span>{strategies.filter(s => s.status === 'completed').length} / {STAGE_TEMPLATES.length} Stages</span>
                    </div>
                </div>
            </div>

            {/* Content: Show Grid OR Wizard (Inline) */}
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
                <StrategyTabContent
                    strategyData={strategyMap}
                    onStartStage={handleStartStage}
                    onToggleDetails={(id: string) => setExpandedStage(expandedStage === id ? null : id)}
                    expandedStage={expandedStage}
                />
            </div>

            {/* Wizard Overlay */}
            {openWizard && (
                <StageWizardContainer
                    stageId={openWizard}
                    onClose={() => setOpenWizard(null)}
                    onSave={(data: any) => handleSaveStage(openWizard, data, 'completed')}
                    onSaveProgress={(data: any) => handleSaveStage(openWizard, data, 'in_progress', false)}
                    onSaveAndNext={(data: any, nextId: string) => {
                        handleSaveStage(openWizard, data, 'completed', false);
                        setOpenWizard(nextId);
                    }}
                    initialData={strategyMap[openWizard]?.data}
                    strategyData={strategyMap}
                />
            )}
        </div>
    );
};

// --- Sub-components for StrategyTab (Unchanged logic, passed via props) ---
const StrategyTabContent: React.FC<any> = ({ strategyData, onStartStage, onToggleDetails, expandedStage }) => {


    return (
        <div className="w-full pb-12 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 px-4 w-full">
                {STAGE_TEMPLATES.map((stage: any, index) => {
                    const status = strategyData[stage.id]?.status || 'not_started';
                    const isLocked = false;
                    const isInProgress = status === 'in_progress';

                    return (
                        <div key={stage.id} className="flex flex-col group h-full">
                            {/* Card */}
                            <div className={`
                                w-full h-[280px] md:h-[260px] flex flex-col relative
                                rounded-xl backdrop-blur-sm transition-all duration-300
                                hover:-translate-y-1 hover:shadow-2xl
                                ${status === 'completed'
                                    ? 'bg-green-500/10 hover:bg-green-500/15'
                                    : isInProgress
                                        ? 'bg-primary/10 hover:bg-primary/15'
                                        : isLocked
                                            ? 'bg-neutral-900/40 opacity-60'
                                            : 'bg-[#121212] hover:bg-[#1a1a1a]'
                                }
                            `}>
                                {/* Header Image / Icon Area */}
                                <div className={`
                                    h-20 w-full flex items-center justify-center relative overflow-hidden rounded-t-xl
                                    ${status === 'completed' ? 'bg-green-500/10' : isInProgress ? 'bg-primary/10' : 'bg-white/5'}
                                `}>
                                    <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                                        Step {String(index + 1).padStart(2, '0')}
                                    </div>

                                    {/* Icon Circle */}
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center shadow-2xl z-10 transition-all duration-500
                                        ${status === 'completed'
                                            ? 'bg-green-500 text-black'
                                            : isInProgress
                                                ? 'bg-[#1a1a1a] text-primary animate-pulse'
                                                : isLocked
                                                    ? 'bg-neutral-800 text-neutral-600'
                                                    : 'bg-[#1a1a1a] text-primary group-hover:scale-110 group-hover:shadow-primary/20'
                                        }
                                    `}>
                                        {status === 'completed' ? <CheckCircle size={20} /> : <div className="text-base font-bold">{index + 1}</div>}
                                    </div>

                                    {/* Background decorative glow */}
                                    {!isLocked && <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />}

                                    {/* In Progress Indicator */}
                                    {isInProgress && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/50 animate-pulse"></div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className={`text-sm font-bold mb-2 ${status === 'completed' ? 'text-green-400' : isInProgress ? 'text-primary' : 'text-white'} `}>
                                        {stage.title}
                                    </h3>
                                    <p className="text-xs text-neutral-400 leading-relaxed mb-4 flex-1 line-clamp-3">
                                        {stage.description}
                                    </p>

                                    {/* Footer / Actions */}
                                    <div className="mt-auto">
                                        <button
                                            onClick={() => onStartStage(stage.id)}
                                            disabled={isLocked}
                                            className={`
                                                w-full py-3 rounded-lg font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2
                                                ${status === 'completed'
                                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                    : isInProgress
                                                        ? 'bg-primary text-black hover:bg-primary/90 shadow-lg shadow-primary/20'
                                                        : isLocked
                                                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                                            : 'bg-white text-black hover:bg-neutral-200 shadow-lg shadow-white/5'
                                                }
                                            `}
                                        >
                                            {status === 'completed' ? (
                                                <>Edit <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1"></div></>
                                            ) : isInProgress ? (
                                                <>Continue <ArrowRight size={14} className="animate-pulse" /></>
                                            ) : isLocked ? (
                                                <><Lock size={14} /> Locked</>
                                            ) : (
                                                <>Start <ArrowRight size={14} /></>
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

const StageWizardContainer: React.FC<any> = ({ stageId, onClose, onSave, onSaveAndNext, onSaveProgress, initialData }) => {
    const config = STAGE_TEMPLATES.find(t => t.id === stageId);

    // Animation State
    const [isClosing, setIsClosing] = useState(false);
    const [shouldRender, setShouldRender] = useState(true);

    // Find next stage
    const currentIndex = STAGE_TEMPLATES.findIndex(t => t.id === stageId);
    const nextStage = STAGE_TEMPLATES[currentIndex + 1];

    useEffect(() => {
        // Reset when stage changes or mounts
        setShouldRender(true);
        setIsClosing(false);

        // Lock Body Scroll
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [stageId]);

    const handleInternalClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 450); // Match duration-450 roughly or standard 300-500ms
    };

    if (!config) return null;
    if (!shouldRender) return null;

    return (
        <div
            className={`fixed left-0 lg:left-[260px] top-[calc(56px+env(safe-area-inset-top))] bottom-0 right-0 z-[50] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        >
            <div className="absolute inset-0 bg-black/40 -z-10 backdrop-blur-[2px]" onClick={handleInternalClose} />
            <div className={`
                w-full h-full bg-[#0a0a0a] flex flex-col shadow-2xl overflow-hidden relative 
                ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}
            `}>

                {/* Header (replicating CreateProjectModal style for consistency) */}
                <div
                    className="h-14 md:h-16 flex items-center justify-between px-4 md:px-8 bg-neutral-900/50 shrink-0"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {currentIndex + 1}
                        </div>
                        <h2 className="text-base md:text-lg font-bold text-white">{config.title}</h2>
                    </div>
                    <button onClick={handleInternalClose} className="p-2 hover:bg-white/5 rounded-full text-neutral-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    <StageWizard
                        config={config}
                        onClose={handleInternalClose}
                        onSave={onSave}
                        onSaveProgress={onSaveProgress}
                        onSaveAndNext={nextStage ? (data) => onSaveAndNext(data, nextStage.id) : undefined}
                        nextStageTitle={nextStage?.title}
                        initialData={initialData}
                        hideHeader={true}
                    />
                </div>
            </div>
        </div>
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

