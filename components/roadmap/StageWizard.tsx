
import React, { useState, useEffect } from 'react';
import { StrategyStageConfig, StageField } from '../../types';
import { Check, ChevronRight, ChevronLeft, X, Save, Sparkles, Lightbulb, Wand2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

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
    const [activeAiTarget, setActiveAiTarget] = useState<{ fieldId: string, index?: number, subFieldId?: string } | null>(null); // Complex target persistence
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Initialize formData
    useEffect(() => {
        const initial = { ...initialData };
        // Shallow init for top level
        config.steps.forEach(step => {
            step.fields.forEach(field => {
                if (initial[field.id] === undefined) {
                    initial[field.id] = field.type === 'array' ? [] : '';
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
    const openAiHelper = (fieldId: string, index?: number, subFieldId?: string) => {
        setActiveAiField(fieldId); // Keep for simple check
        setActiveAiTarget({ fieldId, index, subFieldId });
        setAiPrompt('');
        setAiResponse(null);
    };

    const closeAiHelper = () => {
        setActiveAiField(null);
        setActiveAiTarget(null);
    };

    const handleAiGenerate = () => {
        if (!aiPrompt) return;
        setAiLoading(true);
        setTimeout(() => {
            const responses = [
                "Here's a concept: A juxtaposition of organic warmth and digital coldness...",
                "Try focusing on the theme of 'Eternal Return' - cycles that never end.",
                "Visuals could lean heavily into high-contrast monochrome with splashes of neon green.",
                "Character idea: 'The Architect' who builds worlds but cannot live in them.",
                "Positioning statement: 'Music for the end of the world, or the beginning of a new one.'",
                "Campaign Idea: 'The Lost Tapes' - releasing 'found' footage snippets leading up to the single."
            ];
            setAiResponse(responses[Math.floor(Math.random() * responses.length)] + "\n\n(This is a simulated AI response for brainstorming.)");
            setAiLoading(false);
        }, 1500);
    };

    const applyAiResponse = () => {
        if (activeAiTarget && aiResponse) {
            const { fieldId, index, subFieldId } = activeAiTarget;

            // 1. Get current top-level value
            const topValue = formData[fieldId];

            // 2. Determine functionality based on target type (array item vs simple field)
            if (typeof index === 'number' && subFieldId) {
                // Array Item Update
                const list = [...(Array.isArray(topValue) ? topValue : [])];
                const item = { ...list[index] };

                // Check if subfield allows secondary (requires finding schema. simpler to assume string for now or check current val?)
                // Accessing schema for subfield is hard here without passing it.
                // Improving: Let's assume recursion passed a callback to renderField, but here we are at top level.
                // Just doing a simple update for now. If complex logic needed, we need the schema.
                // Assuming simple string update for AI in nested fields for now.
                item[subFieldId] = aiResponse;
                list[index] = item;
                updateField(fieldId, list);

            } else {
                // Top Level Update
                // Find field config to check allowSecondary
                const fieldConfig = config.steps.flatMap(s => s.fields).find(f => f.id === fieldId);
                if (fieldConfig?.allowSecondary) {
                    const currentVal = topValue || {};
                    const secondary = typeof currentVal === 'object' ? currentVal.secondary : '';
                    updateField(fieldId, { primary: aiResponse, secondary });
                } else {
                    updateField(fieldId, aiResponse);
                }
            }
            closeAiHelper();
        }
    };


    // Helper for rendering recursively
    const renderField = (field: StageField, value: any, onChange: (val: any) => void, pathPrefix: string = '', onAiRequest?: () => void) => {

        const isSecondarySelected = (option: string) => {
            if (!field.allowSecondary) return false;
            const s = typeof value === 'object' ? value?.secondary : '';
            return s === option;
        };

        const isPrimarySelected = (option: string) => {
            if (!field.allowSecondary) return value === option;
            const p = typeof value === 'object' ? value?.primary : value;
            return p === option;
        };

        const handleOptionToggle = (option: string) => {
            if (!field.allowSecondary) {
                onChange(option);
                return;
            }
            const currentObj = value || {};
            const p = typeof currentObj === 'object' ? currentObj.primary : currentObj;
            const s = typeof currentObj === 'object' ? currentObj.secondary : '';

            if (p === option) onChange({ primary: '', secondary: s });
            else if (s === option) onChange({ primary: p, secondary: '' });
            else if (!p) onChange({ primary: option, secondary: s });
            else onChange({ primary: p, secondary: option });
        }


        if (field.type === 'array') {
            const items = Array.isArray(value) ? value : [];
            return (
                <div className="space-y-4">
                    {items.map((item: any, idx: number) => (
                        <div key={idx} className="bg-black/40 border border-neutral-800 rounded-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                            {/* Item Header */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/5">
                                <span className="font-bold text-sm text-white">
                                    {item.name || item.title || ((field.itemLabel || 'Item') + ' ' + (idx + 1))}
                                </span>
                                <button
                                    onClick={() => {
                                        const newItems = items.filter((_, i) => i !== idx);
                                        onChange(newItems);
                                    }}
                                    className="text-neutral-500 hover:text-red-500 transition-colors p-1"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Item Fields */}
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {field.fields?.map(subField => (
                                    <div key={subField.id} className={`space-y-2 ${subField.type === 'textarea' || subField.type === 'array' ? 'col-span-full' : ''}`}>
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                                                {subField.label} {subField.required && <span className="text-primary">*</span>}
                                            </label>
                                            {/* AI Button moved to inline */}
                                        </div>
                                        {renderField(
                                            subField,
                                            item[subField.id],
                                            (val) => {
                                                const newItem = { ...item, [subField.id]: val };
                                                const newItems = [...items];
                                                newItems[idx] = newItem;
                                                onChange(newItems);
                                            },
                                            (pathPrefix ? pathPrefix + '.' : '') + idx + '.' + subField.id,
                                            // Pass AI Request Callback
                                            subField.aiEnabled ? () => openAiHelper(field.id, idx, subField.id) : undefined
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {items.length < (field.maxItems || 99) && (
                        <button
                            onClick={() => onChange([...items, {}])}
                            className="w-full py-3 border border-dashed border-neutral-700 rounded-xl text-neutral-500 font-bold text-sm hover:text-white hover:border-neutral-500 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={16} /> Add {field.itemLabel || 'Item'}
                        </button>
                    )}
                </div>
            );
        }

        // Standard Rendering
        return (
            <div className="w-full">
                {field.type === 'select' && field.options ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {field.options.map(option => {
                                const isPri = isPrimarySelected(option);
                                const isSec = isSecondarySelected(option);
                                return (
                                    <button
                                        key={option}
                                        onClick={() => handleOptionToggle(option)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all relative overflow-hidden ${isPri
                                            ? 'bg-white text-black border-white shadow-lg scale-105 z-10'
                                            : isSec
                                                ? 'bg-primary/20 text-primary border-primary shadow-md shadow-primary/10'
                                                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                                            } `}
                                    >
                                        {isPri && <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />}
                                        {option}
                                        {isSec && <span className="ml-2 text-[8px] bg-primary text-black px-1 rounded-sm uppercase tracking-tighter">2nd</span>}
                                    </button>
                                );
                            })}
                            {field.allowCustom && (
                                <button
                                    onClick={() => handleOptionToggle('')} // Clear logic? Or focus?
                                    // Simplified: Focus input below
                                    className={`px-4 py-2 rounded-lg text-xs font-bold border border-dashed transition-all ${
                                        // Custom active check
                                        (!field.allowSecondary && value && !field.options.includes(value)) ||
                                            (field.allowSecondary && typeof value === 'object' && value.primary && !field.options.includes(value.primary))
                                            ? 'bg-white/10 text-white border-primary border-solid'
                                            : 'bg-transparent border-neutral-700 text-neutral-500 hover:text-white hover:border-neutral-500'
                                        } `}
                                >
                                    Custom...
                                </button>
                            )}
                        </div>
                        {field.allowCustom && (
                            <div className="relative group/input">
                                <input
                                    type="text"
                                    value={
                                        field.allowSecondary
                                            ? (typeof value === 'object' ? value.primary : value) || ''
                                            : value || ''
                                    }
                                    onChange={(e) => {
                                        const newVal = e.target.value;
                                        if (field.allowSecondary) {
                                            onChange({ ...(typeof value === 'object' ? value : {}), primary: newVal });
                                        } else {
                                            onChange(newVal);
                                        }
                                    }}
                                    placeholder={field.placeholder || "Type your custom response..."}
                                    className={`w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 pr-12 text-white focus:border-primary/50 focus:outline-none transition-all ${(field.allowSecondary
                                        ? (typeof value === 'object' && value.primary && field.options.includes(value.primary))
                                        : (value && field.options.includes(value)))
                                        ? 'text-neutral-500 italic'
                                        : ''
                                        } `}
                                />
                            </div>
                        )}
                    </div>
                ) : field.type === 'textarea' ? (
                    <div className="relative group/input">
                        <textarea
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none resize-none transition-all focus:ring-1 focus:ring-primary/20 leading-relaxed custom-scrollbar pb-10"
                        />
                        {field.aiEnabled && onAiRequest && (
                            <button
                                onClick={onAiRequest}
                                className="absolute right-3 bottom-3 p-1.5 text-neutral-500 hover:text-primary transition-colors hover:bg-white/5 rounded-md"
                                title="Generate with AI"
                            >
                                <Sparkles size={16} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="relative group/input">
                        <input
                            type={field.type}
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 pr-10 text-white focus:border-primary/50 focus:outline-none transition-all focus:ring-1 focus:ring-primary/20"
                        />
                        {field.aiEnabled && onAiRequest && (
                            <button
                                onClick={onAiRequest}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-primary transition-colors hover:bg-white/5 rounded-md"
                                title="Generate with AI"
                            >
                                <Sparkles size={16} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        )
    };

    return (
        <>
            {/* Backdrop - Low Z-index to sit behind TopBar (z-40) and Sidebar (z-50) */}
            <div className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}></div>

            {/* Modal Container - High Z-index but positioned to clear TopBar/Sidebar */}
            <div className="fixed inset-0 z-50 top-16 lg:left-64 flex items-center justify-center p-4 sm:p-8 pointer-events-none">
                <div className="w-full max-w-7xl h-full max-h-[85vh] bg-[#0a0a0a] border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden relative pointer-events-auto">

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
                                        } `}
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

                                        {/* Field Label (Only show for array if we assume it's a section, else standard label) */}
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
                                                )}
                                        </div>
                                        {/* Top Level AI Button Removed (Inline now) */}
                                    </div>

                                        {
                                        renderField(
                                            field,
                                            formData[field.id],
                                            (val) => updateField(field.id, val),
                                undefined,
                                            field.aiEnabled ? () => openAiHelper(field.id) : undefined
                                        )}
                            </div>
                                ))}
                        </div>
                    </div>

                    {/* AI Helper Overlay */}
                    {(activeAiField || activeAiTarget) && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-8 animate-in fade-in duration-200">
                            <div className="w-full max-w-2xl bg-[#0F0F0F] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[600px]">
                                <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                            <Wand2 size={16} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">AI Creative Assistant</h4>
                                            <p className="text-[10px] text-neutral-500">Brainstorming ideas</p>
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
                                                placeholder="Describe what you are looking for..."
                                            />
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

                {/* Footer - No changes needed, uses standard flow */}
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
        </div >
        </>
    );
};

export default StageWizard;
