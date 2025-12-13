
import React, { useState, useEffect } from 'react';
import { StrategyStageConfig, StageField } from '../../types';
import { Check, ChevronRight, ChevronLeft, X, Save, Sparkles, Lightbulb, Wand2, Plus, Trash2, Edit } from 'lucide-react';

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
    const [activeAiTarget, setActiveAiTarget] = useState<{ fieldId: string, index?: number, subFieldId?: string } | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Focused Array Item State (For "Focused Mode")
    const [focusedArrayItem, setFocusedArrayItem] = useState<{ fieldId: string, index: number, isNew?: boolean } | null>(null);

    // Initialize formData
    useEffect(() => {
        const initial = { ...initialData };
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
    const isFocusedMode = !!focusedArrayItem;

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

    const handleSaveFocusedItem = () => {
        if (!focusedArrayItem) return;
        setFocusedArrayItem(null);
    };

    // --- AI Logic ---
    const openAiHelper = (fieldId: string, index?: number, subFieldId?: string) => {
        setActiveAiField(fieldId);
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
            const topValue = formData[fieldId];

            if (typeof index === 'number' && subFieldId) {
                // Array Item Update
                const list = [...(Array.isArray(topValue) ? topValue : [])];
                const item = { ...list[index] };
                item[subFieldId] = aiResponse;
                list[index] = item;
                updateField(fieldId, list);
            } else {
                // Top Level Update
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

    // --- Render Helpers ---

    const renderMultiSelect = (field: StageField, value: string[] | undefined, onChange: (val: string[]) => void) => {
        const selected = value || [];
        const toggle = (opt: string) => {
            if (selected.includes(opt)) {
                onChange(selected.filter(s => s !== opt));
            } else {
                onChange([...selected, opt]);
            }
        };

        return (
            <div className="flex flex-wrap gap-2">
                {field.options?.map(opt => (
                    <button
                        key={opt}
                        onClick={() => toggle(opt)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${selected.includes(opt)
                            ? 'bg-white text-black border-white shadow-lg scale-105'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        );
    };

    const renderDateRange = (field: StageField, value: { from: string; to: string } | undefined, onChange: (val: any) => void) => {
        const val = value || { from: '', to: '' };
        return (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs text-neutral-500 ml-1">Start Date</label>
                    <input
                        type="date"
                        value={val.from}
                        onChange={(e) => onChange({ ...val, from: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-primary/50 focus:outline-none transition-all focus:ring-1 focus:ring-primary/20 text-xs"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-neutral-500 ml-1">End Date</label>
                    <input
                        type="date"
                        value={val.to}
                        onChange={(e) => onChange({ ...val, to: e.target.value })}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:border-primary/50 focus:outline-none transition-all focus:ring-1 focus:ring-primary/20 text-xs"
                    />
                </div>
            </div>
        );
    };

    const renderField = (field: StageField, value: any, onChange: (val: any) => void, pathPrefix: string = '', onAiRequest?: () => void) => {

        // Helper accessors for complex fields
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
            const items = (value as any[]) || [];

            // --- FOCUSED MODE RENDERING FOR THIS FIELD ---
            if (focusedArrayItem && focusedArrayItem.fieldId === field.id) {
                const idx = focusedArrayItem.index;
                const item = items[idx] || {};

                return (
                    <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setFocusedArrayItem(null)}
                                    className="p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                    title="Go Back"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {focusedArrayItem.isNew ? `Add New ${field.itemLabel || 'Item'}` : `Edit ${field.itemLabel || 'Item'}`}
                                    </h3>
                                    <p className="text-sm text-neutral-500">Fill out the details below.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSaveFocusedItem}
                                className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors flex items-center gap-2"
                            >
                                <Save size={16} />
                                {focusedArrayItem.isNew ? 'Save' : 'Save Changes'}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div className="grid grid-cols-1 gap-4 pb-16">
                                {field.fields?.map(subField => (
                                    <div key={subField.id} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                                                {subField.label} {subField.required && <span className="text-primary">*</span>}
                                            </label>
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
                                            subField.aiEnabled ? () => openAiHelper(field.id, idx, subField.id) : undefined
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }

            // --- LIST VIEW RENDERING ---
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                        {items.map((item: any, idx: number) => (
                            <div key={idx} className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 flex items-center justify-between group hover:border-neutral-700 transition-colors">
                                <div>
                                    <h4 className="font-bold text-white text-sm">{item.name || item.title || `${field.itemLabel || 'Item'} ${idx + 1}`}</h4>
                                    <span className="text-xs text-neutral-500">
                                        {item.timeframe ? (item.timeframe.from ? `${item.timeframe.from} - ${item.timeframe.to}` : item.timeframe) : 'No dates set'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setFocusedArrayItem({ fieldId: field.id, index: idx })}
                                        className="p-2 text-neutral-500 hover:text-white bg-black/20 hover:bg-black/40 rounded-lg transition-colors"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const newItems = items.filter((_, i) => i !== idx);
                                            onChange(newItems);
                                        }}
                                        className="p-2 text-neutral-500 hover:text-red-500 bg-black/20 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {items.length < (field.maxItems || 99) && (
                        <button
                            onClick={() => {
                                const newIdx = items.length;
                                onChange([...items, {}]);
                                setFocusedArrayItem({ fieldId: field.id, index: newIdx, isNew: true });
                            }}
                            className="w-full py-4 border border-dashed border-neutral-700 rounded-xl text-neutral-400 font-bold text-sm hover:text-white hover:border-neutral-500 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={18} />
                            <span>Add New {field.itemLabel || 'Item'}</span>
                        </button>
                    )}
                </div>
            );
        }

        if (field.type === 'multiselect') {
            return renderMultiSelect(field, value, onChange);
        }

        if (field.type === 'date-range') {
            return renderDateRange(field, value, onChange);
        }

        if (field.type === 'checkbox') {
            return (
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${value ? 'bg-primary border-primary text-black' : 'border-neutral-700 bg-neutral-900 group-hover:border-neutral-500'}`}>
                        {value && <Check size={12} strokeWidth={4} />}
                    </div>
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="hidden"
                    />
                    <span className={`text-sm ${value ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-300'}`}>{field.placeholder || field.label}</span>
                </label>
            )
        }

        if (field.type === 'textarea') {
            return (
                <div className="relative group/input">
                    <textarea
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full h-20 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:border-primary/50 focus:outline-none resize-none transition-all focus:ring-1 focus:ring-primary/20 leading-relaxed custom-scrollbar pb-8"
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
            );
        }

        if (field.type === 'select' && field.options) {
            return (
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
                                onClick={() => handleOptionToggle('')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border border-dashed transition-all ${(!field.allowSecondary && value && !field.options.includes(value)) ||
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
                                className={`w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 pr-12 text-xs text-white focus:border-primary/50 focus:outline-none transition-all ${(field.allowSecondary
                                    ? (typeof value === 'object' && value.primary && field.options.includes(value.primary))
                                    : (value && field.options.includes(value)))
                                    ? 'text-neutral-500 italic'
                                    : ''
                                    } `}
                            />
                        </div>
                    )}
                </div>
            );
        }

        // Default 'text'
        return (
            <div className="relative group/input">
                <input
                    type={field.type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 pr-10 text-xs text-white focus:border-primary/50 focus:outline-none transition-all focus:ring-1 focus:ring-primary/20"
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
        );
    };

    // --- MAIN RENDER ---
    return (
        <>
            <div className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}></div>

            <div className="fixed inset-0 z-50 top-16 lg:left-64 flex items-center justify-center p-2 sm:p-3 pointer-events-none">
                <div className="w-full max-w-5xl h-full max-h-[85vh] bg-[#0a0a0a] border border-neutral-800 rounded-xl flex flex-col shadow-2xl overflow-hidden relative pointer-events-auto">

                    {/* Header - HIDDEN IF FOCUSED */}
                    {!isFocusedMode && (
                        <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-5 bg-neutral-900/50">
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <span className="text-primary text-sm">{config.title}</span>
                                    <span className="text-neutral-600">/</span>
                                    <span className="text-neutral-500 font-normal text-xs">Strategy</span>
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full text-neutral-400 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* Progress Bar - HIDDEN IF FOCUSED */}
                    {!isFocusedMode && (
                        <div className="px-5 pt-4 pb-2">
                            <div className="flex items-center justify-between relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-neutral-800 -z-10"></div>
                                {config.steps.map((step, idx) => (
                                    <div
                                        key={step.id}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${currentStepIndex === idx
                                            ? 'bg-primary text-black border-primary font-bold shadow-[0_0_10px_rgba(var(--primary),0.3)]'
                                            : currentStepIndex > idx
                                                ? 'bg-green-500 text-black border-green-500 font-bold'
                                                : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                                            } `}
                                    >
                                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-black/20 text-[10px] font-mono">
                                            {currentStepIndex > idx ? <Check size={10} /> : idx + 1}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider hidden sm:inline-block">{step.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <div className={`p-5 space-y-5 animate-in slide-in-from-bottom-4 duration-300 key={currentStep.id} ${isFocusedMode ? 'h-full flex flex-col' : ''}`}>

                            {!isFocusedMode ? (
                                // STANDARD VIEW
                                <>
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-white mb-1">{currentStep.title}</h3>
                                        {currentStep.description && <p className="text-neutral-500 text-xs">{currentStep.description}</p>}
                                    </div>

                                    <div className="space-y-8">
                                        {currentStep.fields.map(field => (
                                            <div key={field.id} className="space-y-2 bg-neutral-900/20 p-4 rounded-xl border border-neutral-800/50 hover:border-neutral-700 transition-colors">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex flex-col">
                                                        <label className="text-[10px] font-bold text-neutral-300 tracking-wide block uppercase">
                                                            {field.label} {field.required && <span className="text-primary">*</span>}
                                                        </label>
                                                        {field.allowSecondary && (
                                                            <span className="text-[8px] text-neutral-600 font-medium mt-0.5">
                                                                Select Primary & Secondary Options
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {renderField(
                                                    field,
                                                    formData[field.id],
                                                    (val) => updateField(field.id, val),
                                                    undefined,
                                                    field.aiEnabled ? () => openAiHelper(field.id) : undefined
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                // FOCUSED VIEW - We just render the fields of the focused item
                                // We find the array field configuration that is currently focused
                                config.steps.flatMap(s => s.fields).filter(f => f.id === focusedArrayItem?.fieldId).map(field => (
                                    <React.Fragment key={field.id}>
                                        {renderField(
                                            field,
                                            formData[field.id], // Pass the array 
                                            (val) => updateField(field.id, val),
                                            '',
                                            () => { } // Disable AI at this container level
                                        )}
                                    </React.Fragment>
                                ))
                            )}
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

                    {/* Footer - HIDDEN IF FOCUSED */}
                    {!isFocusedMode && (
                        <div className="h-16 border-t border-neutral-800 flex items-center justify-between px-5 bg-neutral-900/50">
                            <button
                                onClick={handleBack}
                                disabled={currentStepIndex === 0}
                                className="px-6 py-2 rounded-lg font-bold text-sm text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Back
                            </button>

                            <button
                                onClick={handleNext}
                                className="px-6 py-2 bg-primary text-black rounded-lg font-bold text-xs hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
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
                    )}

                </div>
            </div >
        </>
    );
};

export default StageWizard;
