import React, { useState, useEffect } from 'react';
import { StrategyStageConfig, StageField } from '../../types';
import { Check, ChevronRight, ChevronLeft, X, Save, Sparkles, Lightbulb, Wand2, Plus } from 'lucide-react';

interface StageWizardProps {
    config: StrategyStageConfig;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const StageWizard: React.FC<StageWizardProps> = ({ config, initialData, onClose, onSave }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [formData, setFormData] = useState<Record<string, any>>(initialData || {});

    // AI Helper State
    const [activeAiField, setActiveAiField] = useState<string | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Initialize formData
    useEffect(() => {
        const initial = { ...initialData };
        config.steps.forEach(step => {
            step.fields.forEach(field => {
                if (initial[field.id] === undefined) {
                    initial[field.id] = '';
                }
            });
        });
        setFormData(initial);
    }, [config, initialData]);

    const currentStep = config.steps[currentStepIndex];
    const isLastStep = currentStepIndex === config.steps.length - 1;

    const handleNext = () => {
        if (!isLastStep) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onSave(formData);
        }
    };

    const handleBack = () => {
        setCurrentStepIndex(prev => Math.max(0, prev - 1));
    };

    const updateField = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleOptionClick = (field: StageField, option: string) => {
        if (!field.allowSecondary) {
            updateField(field.id, option);
            return;
        }

        const currentVal = formData[field.id] || {};
        // Normalize
        const primary = typeof currentVal === 'object' ? currentVal.primary : currentVal;
        const secondary = typeof currentVal === 'object' ? currentVal.secondary : '';

        if (primary === option) {
            // Deselect primary -> shift secondary to primary? Or just clear? Let's just clear primary.
            updateField(field.id, { primary: '', secondary });
        } else if (secondary === option) {
            // Deselect secondary
            updateField(field.id, { primary, secondary: '' });
        } else {
            // Select new option
            if (!primary) {
                updateField(field.id, { primary: option, secondary });
            } else {
                // Set as secondary (replace existing secondary if any)
                updateField(field.id, { primary, secondary: option });
            }
        }
    };

    const getFieldValue = (field: StageField) => {
        const val = formData[field.id];
        if (field.allowSecondary) {
            const primary = typeof val === 'object' ? val?.primary : val;
            return primary || '';
        }
        return val || '';
    };

    const isOptionSelected = (field: StageField, option: string) => {
        const val = formData[field.id];
        if (field.allowSecondary) {
            const p = typeof val === 'object' ? val?.primary : val;
            const s = typeof val === 'object' ? val?.secondary : '';
            if (p === option) return 'primary';
            if (s === option) return 'secondary';
            return false;
        }
        return val === option ? 'primary' : false;
    };

    // AI Logic
    const openAiHelper = (fieldId: string) => {
        setActiveAiField(fieldId);
        setAiPrompt('');
        setAiResponse(null);
    };

    const closeAiHelper = () => {
        setActiveAiField(null);
    };

    const handleAiGenerate = () => {
        if (!aiPrompt) return;
        setAiLoading(true);
        // Simulate AI delay
        setTimeout(() => {
            const responses = [
                "Here's a concept: A juxtaposition of organic warmth and digital coldness...",
                "Try focusing on the theme of 'Eternal Return' - cycles that never end.",
                "Visuals could lean heavily into high-contrast monochrome with splashes of neon green.",
                "Character idea: 'The Architect' who builds worlds but cannot live in them.",
                "Positioning statement: 'Music for the end of the world, or the beginning of a new one.'"
            ];
            setAiResponse(responses[Math.floor(Math.random() * responses.length)] + "\n\n(This is a simulated AI response for brainstorming.)");
            setAiLoading(false);
        }, 1500);
    };

    const applyAiResponse = () => {
        if (activeAiField && aiResponse) {
            // If allowSecondary, apply to Primary or Description? Just Primary for now as simple string or merge.
            // For simplicity, AI just fills the main value (Primary).
            const field = config.steps.flatMap(s => s.fields).find(f => f.id === activeAiField);
            if (field?.allowSecondary) {
                const currentVal = formData[activeAiField] || {};
                const secondary = typeof currentVal === 'object' ? currentVal.secondary : '';
                updateField(activeAiField, { primary: aiResponse, secondary });
            } else {
                updateField(activeAiField, aiResponse);
            }
            closeAiHelper();
        }
    };

    return (
        <>
            {/* Backdrop - Low Z-index to sit behind TopBar (z-40) and Sidebar (z-50) */}
            <div className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}></div>

            {/* Modal Container - High Z-index but positioned to clear TopBar/Sidebar */}
            <div className="fixed inset-0 z-50 top-16 lg:left-64 flex items-center justify-center p-4 sm:p-8 pointer-events-none">
                <div className="w-full max-w-4xl h-full max-h-[85vh] bg-[#0a0a0a] border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden relative pointer-events-auto">

                    {/* Header */}
                    <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-8 bg-neutral-900/50">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="text-primary">{config.title}</span>
                                <span className="text-neutral-600">/</span>
                                <span className="text-neutral-400 font-normal text-sm">Strategy Planning</span>
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-neutral-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="px-8 pt-6 pb-2">
                        <div className="flex items-center justify-between relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-neutral-800 -z-10"></div>
                            {config.steps.map((step, idx) => (
                                <div
                                    key={step.id}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${currentStepIndex === idx
                                        ? 'bg-primary text-black border-primary font-bold shadow-[0_0_10px_rgba(var(--primary),0.3)]'
                                        : currentStepIndex > idx
                                            ? 'bg-green-500 text-black border-green-500 font-bold'
                                            : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                                        }`}
                                >
                                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-black/20 text-xs font-mono">
                                        {currentStepIndex > idx ? <Check size={14} /> : idx + 1}
                                    </span>
                                    <span className="text-xs uppercase tracking-wider hidden sm:inline-block">{step.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <div className="p-8 max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-300 key={currentStep.id}">
                            <div className="mb-6">
                                <h3 className="text-2xl font-bold text-white mb-2">{currentStep.title}</h3>
                                {currentStep.description && <p className="text-neutral-400">{currentStep.description}</p>}
                            </div>

                            <div className="space-y-8">
                                {currentStep.fields.map(field => (
                                    <div key={field.id} className="space-y-3 bg-neutral-900/20 p-6 rounded-xl border border-neutral-800/50 hover:border-neutral-700 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex flex-col">
                                                <label className="text-sm font-bold text-white tracking-wide block">
                                                    {field.label} {field.required && <span className="text-primary">*</span>}
                                                </label>
                                                {field.allowSecondary && (
                                                    <span className="text-[10px] text-neutral-500 font-medium mt-1">
                                                        Select Primary & Secondary Options
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Component Type Rendering */}
                                        {field.type === 'select' && field.options ? (
                                            <div className="space-y-4">
                                                {/* Chip Selection for Options */}
                                                <div className="flex flex-wrap gap-2">
                                                    {field.options.map(option => {
                                                        const selectionStatus = isOptionSelected(field, option);
                                                        return (
                                                            <button
                                                                key={option}
                                                                onClick={() => handleOptionClick(field, option)}
                                                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all relative overflow-hidden ${selectionStatus === 'primary'
                                                                        ? 'bg-white text-black border-white shadow-lg scale-105 z-10'
                                                                        : selectionStatus === 'secondary'
                                                                            ? 'bg-primary/20 text-primary border-primary shadow-md shadow-primary/10'
                                                                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                                                                    }`}
                                                            >
                                                                {selectionStatus === 'primary' && (
                                                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                                                                )}
                                                                {option}
                                                                {selectionStatus === 'secondary' && (
                                                                    <span className="ml-2 text-[8px] bg-primary text-black px-1 rounded-sm uppercase tracking-tighter">2nd</span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                    {field.allowCustom && (
                                                        <button
                                                            onClick={() => {
                                                                // If custom clicked, clear primary? or just focus input.
                                                                // We'll let the input handle the value update.
                                                                // Just a visual trigger for now if we wanted a button.
                                                                // But we have the input below.
                                                                // For now, let's just use the button to clear if needed?
                                                                // Or simpler: Just rely on the input for custom values as "Primary".
                                                                updateField(field.id, field.allowSecondary ? { ...formData[field.id], primary: '' } : '');
                                                            }}
                                                            className={`px-4 py-2 rounded-lg text-xs font-bold border border-dashed transition-all ${(field.allowSecondary ? formData[field.id]?.primary : formData[field.id]) && !field.options.includes(field.allowSecondary ? formData[field.id]?.primary : formData[field.id])
                                                                    ? 'bg-white/10 text-white border-primary border-solid'
                                                                    : 'bg-transparent border-neutral-700 text-neutral-500 hover:text-white hover:border-neutral-500'
                                                                }`}
                                                        >
                                                            Custom...
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Custom Input (Show if value is not in options or explicitly typing) */}
                                                {field.allowCustom && (
                                                    <div className="relative group/input">
                                                        <input
                                                            type="text"
                                                            value={getFieldValue(field)}
                                                            onChange={(e) => {
                                                                const newVal = e.target.value;
                                                                if (field.allowSecondary) {
                                                                    const current = formData[field.id] || {};
                                                                    updateField(field.id, { ...current, primary: newVal });
                                                                } else {
                                                                    updateField(field.id, newVal);
                                                                }
                                                            }}
                                                            placeholder={field.placeholder || "Type your custom response..."}
                                                            className={`w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 pr-12 text-white focus:border-primary/50 focus:outline-none transition-all ${field.options.includes(getFieldValue(field)) ? 'text-neutral-500 italic' : ''
                                                                }`}
                                                        />
                                                        {field.aiEnabled && (
                                                            <button
                                                                onClick={() => openAiHelper(field.id)}
                                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-neutral-800 text-neutral-400 rounded-lg hover:text-primary hover:bg-primary/10 transition-all opacity-50 group-hover/input:opacity-100"
                                                                title="Get AI Ideas"
                                                            >
                                                                <Sparkles size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : field.type === 'textarea' ? (
                                            <div className="relative group/input">
                                                <textarea
                                                    value={formData[field.id] || ''}
                                                    onChange={(e) => updateField(field.id, e.target.value)}
                                                    placeholder={field.placeholder}
                                                    className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none resize-none transition-all focus:ring-1 focus:ring-primary/20 leading-relaxed custom-scrollbar pb-10"
                                                />
                                                {field.aiEnabled && (
                                                    <button
                                                        onClick={() => openAiHelper(field.id)}
                                                        className="absolute right-3 bottom-3 flex items-center gap-2 px-3 py-1.5 bg-neutral-800 text-neutral-400 rounded-lg text-[10px] font-bold hover:text-primary hover:bg-neutral-700 transition-all opacity-70 group-hover/input:opacity-100 border border-white/5"
                                                    >
                                                        <Sparkles size={12} />
                                                        <span>AI Assist</span>
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="relative group/input">
                                                <input
                                                    type={field.type}
                                                    value={formData[field.id] || ''}
                                                    onChange={(e) => updateField(field.id, e.target.value)}
                                                    placeholder={field.placeholder}
                                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none transition-all focus:ring-1 focus:ring-primary/20"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Helper Overlay */}
                        {activeAiField && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-8 animate-in fade-in duration-200">
                                <div className="w-full max-w-2xl bg-[#0F0F0F] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[600px]">
                                    <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                                <Wand2 size={16} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm">AI Creative Assistant</h4>
                                                <p className="text-[10px] text-neutral-500">Brainstorming ideas for this field</p>
                                            </div>
                                        </div>
                                        <button onClick={closeAiHelper} className="text-neutral-500 hover:text-white transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="p-6 flex-1 overflow-y-auto">
                                        {!aiResponse ? (
                                            <div className="space-y-4">
                                                <label className="text-xs font-bold text-neutral-400 uppercase">What kind of ideas do you need?</label>
                                                <textarea
                                                    autoFocus
                                                    value={aiPrompt}
                                                    onChange={(e) => setAiPrompt(e.target.value)}
                                                    className="w-full h-32 bg-black border border-neutral-800 rounded-xl p-4 text-white text-sm focus:border-primary/50 focus:outline-none"
                                                    placeholder="e.g. Give me 3 options for a futuristic branding style..."
                                                />
                                                <div className="text-xs text-neutral-600">
                                                    I will analyze the context of your project and suggest creative directions.
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                                                <div className="flex items-start gap-3">
                                                    <Lightbulb size={18} className="text-yellow-500 mt-1 shrink-0" />
                                                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                                                        {aiResponse}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 border-t border-neutral-800 bg-neutral-900/30 flex justify-end gap-3">
                                        <button
                                            onClick={closeAiHelper}
                                            className="px-4 py-2 rounded-lg text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        {!aiResponse ? (
                                            <button
                                                onClick={handleAiGenerate}
                                                disabled={!aiPrompt.trim() || aiLoading}
                                                className="px-6 py-2 bg-primary text-black rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {aiLoading ? (
                                                    <>Processing...</>
                                                ) : (
                                                    <><Sparkles size={14} /> Generate Ideas</>
                                                )}
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => { setAiResponse(null); setAiPrompt(''); }}
                                                    className="px-4 py-2 bg-neutral-800 text-white rounded-lg text-xs font-bold hover:bg-neutral-700 transition-colors"
                                                >
                                                    Try Again
                                                </button>
                                                <button
                                                    onClick={applyAiResponse}
                                                    className="px-6 py-2 bg-primary text-black rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
                                                >
                                                    <Check size={14} /> Use This Response
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="h-20 border-t border-neutral-800 flex items-center justify-between px-8 bg-neutral-900/50">
                        <button
                            onClick={handleBack}
                            disabled={currentStepIndex === 0}
                            className="px-6 py-2 rounded-lg font-bold text-sm text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            Back
                        </button>

                        <button
                            onClick={handleNext}
                            className="px-8 py-3 bg-primary text-black rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                        >
                            {isLastStep ? (
                                <>
                                    <Save size={16} /> Save Strategy
                                </>
                            ) : (
                                <>
                                    Next Step <ChevronRight size={16} />
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </>
    );
};

export default StageWizard;
