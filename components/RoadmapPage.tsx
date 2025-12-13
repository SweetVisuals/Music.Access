import React, { useState, useEffect } from 'react';
import { View } from '../types';
import {
    Map,
    Calendar,
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
import { getGoals, createGoal, updateGoal, deleteGoal } from '../services/supabaseService';
import { STAGE_TEMPLATES } from './roadmap/StageTemplates';
import StageWizard from './roadmap/StageWizard';

interface RoadmapPageProps {
    onNavigate?: (view: View) => void;
}

const RoadmapPage: React.FC<RoadmapPageProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'planner' | 'strategy' | 'wizard'>('planner');
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loadingGoals, setLoadingGoals] = useState(true);
    const [isGoalsExpanded, setIsGoalsExpanded] = useState(false);

    // Goals State (Copied from GoalsPage logic)
    const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

    useEffect(() => {
        fetchGoals();
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
                        <Calendar size={14} />
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
                {activeTab === 'planner' && <PlannerTab />}
                {activeTab === 'strategy' && <StrategyTab />}
                {activeTab === 'wizard' && <RoadmapWizardTab />}
            </div>

        </div>
    );
};

// --- Sub-Components (Placeholders for now) ---

const PlannerTab: React.FC = () => {
    // Basic calendar implementation
    const [currentDate, setCurrentDate] = useState(new Date());
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    // Mock data for content plan
    const contentPlan: Record<string, { type: 'reel' | 'post' | 'story', title: string }[]> = {
        '5': [{ type: 'reel', title: 'Studio BTS' }],
        '12': [{ type: 'post', title: 'New Single Art' }],
        '15': [{ type: 'story', title: 'Q&A Session' }],
        '25': [{ type: 'reel', title: 'Teaser Clip' }]
    };

    const getTypeColor = (type: string) => {
        if (type === 'reel') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        if (type === 'post') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    };

    return (
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
            {/* Calendar Header */}
            <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar size={20} className="text-primary" />
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                    <p className="text-xs text-neutral-500">Scheduled Content: {Object.keys(contentPlan).length} items</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors">
                        <ChevronDown size={20} className="rotate-90" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors">
                        <ChevronDown size={20} className="-rotate-90" />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-900/30">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-[120px]">
                {/* Empty slots for start of month */}
                {[...Array(firstDayOfMonth)].map((_, i) => (
                    <div key={`empty-${i}`} className="border-r border-b border-neutral-800/50 bg-neutral-900/20"></div>
                ))}

                {/* Days */}
                {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const items = contentPlan[day.toString()];
                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();

                    return (
                        <div key={day} className={`border-r border-b border-neutral-800/50 p-2 relative group hover:bg-white/5 transition-colors ${isToday ? 'bg-primary/5' : ''}`}>
                            <span className={`text-sm font-bold block mb-2 ${isToday ? 'text-primary' : 'text-neutral-500'}`}>
                                {day}
                            </span>

                            {/* Items */}
                            <div className="space-y-1">
                                {items?.map((item, idx) => (
                                    <div key={idx} className={`p-1.5 rounded-md border text-[10px] font-bold truncate ${getTypeColor(item.type)}`}>
                                        {item.title}
                                    </div>
                                ))}

                                {/* Add Button (Hidden by default, shown on hover) */}
                                <button className="w-full py-1 text-[10px] text-neutral-500 border border-dashed border-neutral-700 rounded hover:border-neutral-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1 mt-1">
                                    <Plus size={10} /> Add
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StrategyTab: React.FC = () => {
    // State
    const [openWizard, setOpenWizard] = useState<string | null>(null); // Stage ID
    // Use explicit type slightly looser to avoid index signature issues if strictly checked, but standard Record is fine
    const [strategyData, setStrategyData] = useState<Record<string, { status: 'not_started' | 'in_progress' | 'completed', data: any }>>({});
    const [expandedStage, setExpandedStage] = useState<string | null>(null);

    // Let's define the handlers
    const handleStartStage = (stageId: string) => {
        setOpenWizard(stageId);
    };

    const handleSaveStage = (stageId: string, data: any) => {
        setStrategyData(prev => ({
            ...prev,
            [stageId]: {
                status: 'completed',
                data: data
            }
        }));
        setOpenWizard(null);
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-white">Strategy Roadmap</h2>
                    <p className="text-neutral-500">Define your artist identity, era, and execution plan.</p>
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-2 text-xs font-mono text-neutral-400">
                    {Object.values(strategyData).filter((s: any) => s.status === 'completed').length} / {STAGE_TEMPLATES.length} Stages Completed
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <StrategyTabContent
                    strategyData={strategyData}
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
                    initialData={strategyData[openWizard]?.data}
                />
            )}
        </div>
    );
};

// --- Sub-components for StrategyTab (to keep main file clean-ish) ---

const StrategyTabContent: React.FC<any> = ({ strategyData, onStartStage, onToggleDetails, expandedStage }) => {

    return (
        <div className="w-full pb-12 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 px-4 w-full">
                {STAGE_TEMPLATES.map((stage: any, index) => {
                    const status = strategyData[stage.id]?.status || 'not_started';
                    // No locking logic needed anymore as all stages are real
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
    // Find the config - If not generic usage
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

const RoadmapWizardTab: React.FC = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        eraName: '',
        duration: '1-year', // 3-months, 6-months, 1-year, 2-years, 5-years
        startDate: new Date().toISOString().split('T')[0],
        focus: 'revenue', // revenue, growth, branding
        targetRevenue: '',
        targetFollowers: '',
        primaryPlatform: 'instagram'
    });

    const steps = [
        { title: 'Define Era', icon: <Clock size={16} /> },
        { title: 'Set Targets', icon: <Target size={16} /> },
        { title: 'Review', icon: <CheckCircle size={16} /> }
    ];

    const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
    const handleFinish = () => {
        // Logic to save roadmap would go here
        alert("Roadmap Created! (Simulation)");
        // Reset or navigate
    };

    return (
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-8 max-w-4xl mx-auto">
            {/* Wizard Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Create New Roadmap</h3>
                    <p className="text-neutral-500 text-sm">Define your next era and set your strategic goals.</p>
                </div>
                <div className="flex gap-2">
                    {steps.map((s, i) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${step === i + 1
                            ? 'bg-primary/10 border-primary text-primary'
                            : step > i + 1
                                ? 'bg-green-500/10 border-green-500 text-green-500'
                                : 'bg-neutral-900 border-neutral-800 text-neutral-600'
                            }`}>
                            <span>{step > i + 1 ? <CheckCircle size={12} /> : s.icon}</span>
                            <span>{s.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="mb-8 min-h-[300px]">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Era Name</label>
                            <input
                                type="text"
                                value={formData.eraName}
                                onChange={(e) => setFormData({ ...formData, eraName: e.target.value })}
                                placeholder="e.g. The Come Up, Global Domination, Experimental Phase"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-primary/50 focus:outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Duration</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {['3-months', '6-months', '1-year', '2-years', '5-years'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setFormData({ ...formData, duration: opt })}
                                            className={`text-left px-4 py-3 rounded-lg border transition-all ${formData.duration === opt
                                                ? 'bg-primary/10 border-primary text-white'
                                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                                                }`}
                                        >
                                            <span className="capitalize font-bold">{opt.replace('-', ' ')}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Start Date</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-primary/50 focus:outline-none mb-6"
                                />

                                <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Primary Focus</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['revenue', 'growth', 'branding'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setFormData({ ...formData, focus: opt })}
                                            className={`px-2 py-3 rounded-lg border transition-all text-center ${formData.focus === opt
                                                ? 'bg-primary/10 border-primary text-white'
                                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                                                }`}
                                        >
                                            <span className="capitalize font-bold text-xs">{opt}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-white/5 border border-neutral-800 rounded-xl p-4 mb-6">
                            <h4 className="font-bold text-white mb-1">Goal Setting</h4>
                            <p className="text-xs text-neutral-400">Set realistic but ambitious targets for your {formData.duration.replace('-', ' ')} roadmap.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Revenue Target ($)</label>
                                <input
                                    type="number"
                                    value={formData.targetRevenue}
                                    onChange={(e) => setFormData({ ...formData, targetRevenue: e.target.value })}
                                    placeholder="e.g. 50000"
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-primary/50 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Follower Growth Target</label>
                                <input
                                    type="number"
                                    value={formData.targetFollowers}
                                    onChange={(e) => setFormData({ ...formData, targetFollowers: e.target.value })}
                                    placeholder="e.g. 10000"
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-primary/50 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Key Platform</label>
                            <select
                                value={formData.primaryPlatform}
                                onChange={(e) => setFormData({ ...formData, primaryPlatform: e.target.value })}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:border-primary/50 focus:outline-none"
                            >
                                <option value="instagram">Instagram</option>
                                <option value="tiktok">TikTok</option>
                                <option value="youtube">YouTube</option>
                                <option value="spotify">Spotify</option>
                            </select>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
                                <Map size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">Ready to Launch "{formData.eraName || 'New Era'}"?</h3>
                            <p className="text-neutral-500">Review your roadmap settings before finalizing.</p>
                        </div>

                        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
                            <div className="grid grid-cols-2 gap-y-4 text-sm">
                                <div className="text-neutral-500">Duration</div>
                                <div className="text-white font-bold capitalize text-right">{formData.duration.replace('-', ' ')}</div>

                                <div className="text-neutral-500">Focus</div>
                                <div className="text-white font-bold capitalize text-right">{formData.focus}</div>

                                <div className="text-neutral-500">Revenue Goal</div>
                                <div className="text-white font-bold text-right">${formData.targetRevenue || '0'}</div>

                                <div className="text-neutral-500">Follower Goal</div>
                                <div className="text-white font-bold text-right">+{formData.targetFollowers || '0'}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between pt-6 border-t border-neutral-800">
                <button
                    onClick={handleBack}
                    disabled={step === 1}
                    className="px-6 py-2.5 rounded-lg font-bold text-sm text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={step === 3 ? handleFinish : handleNext}
                    className="px-8 py-2.5 bg-primary text-black rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                    {step === 3 ? 'Create Roadmap' : 'Continue'}
                </button>
            </div>
        </div>
    );
};

export default RoadmapPage;
