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
            updateField(activeAiField, aiResponse);
            closeAiHelper();
        }
    };

    return (
        <div className="fixed inset-0 top-16 lg:left-64 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-4xl h-[85vh] bg-[#0a0a0a] border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">

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
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-white tracking-wide block">
                                            {field.label} {field.required && <span className="text-primary">*</span>}
                                        </label>
                                        {field.aiEnabled && (
                                            <button
                                                onClick={() => openAiHelper(field.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary/20 transition-all group"
                                            >
                                                <Sparkles size={12} className="group-hover:animate-pulse" />
                                                <span>Brainstorm with AI</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Component Type Rendering */}
                                    {field.type === 'select' && field.options ? (
                                        <div className="space-y-4">
                                            {/* Chip Selection for Options */}
                                            <div className="flex flex-wrap gap-2">
                                                {field.options.map(option => (
                                                    <button
                                                        key={option}
                                                        onClick={() => updateField(field.id, option)}
                                                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${formData[field.id] === option
                                                            ? 'bg-white text-black border-white shadow-lg'
                                                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                                                            }`}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                                {field.allowCustom && (
                                                    <button
                                                        onClick={() => updateField(field.id, '')}
                                                        className={`px-4 py-2 rounded-lg text-xs font-bold border border-dashed transition-all ${!field.options.includes(formData[field.id]) && formData[field.id] !== ''
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
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={formData[field.id] || ''}
                                                        onChange={(e) => updateField(field.id, e.target.value)}
                                                        placeholder={field.placeholder || "Type your custom response..."}
                                                        className={`w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none transition-all ${field.options.includes(formData[field.id]) ? 'text-neutral-500 italic' : ''
                                                            }`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : field.type === 'textarea' ? (
                                        <div className="relative">
                                            <textarea
                                                value={formData[field.id] || ''}
                                                onChange={(e) => updateField(field.id, e.target.value)}
                                                placeholder={field.placeholder}
                                                className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none resize-none transition-all focus:ring-1 focus:ring-primary/20 leading-relaxed custom-scrollbar"
                                            />
                                        </div>
                                    ) : (
                                        <input
                                            type={field.type}
                                            value={formData[field.id] || ''}
                                            onChange={(e) => updateField(field.id, e.target.value)}
                                            placeholder={field.placeholder}
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none transition-all focus:ring-1 focus:ring-primary/20"
                                        />
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
    );
};

export default StageWizard;
