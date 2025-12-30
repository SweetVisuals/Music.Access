import React, { useState, useEffect } from 'react';
import { StrategyStageConfig, StageField } from '../../types';
import { Check, ChevronRight, ChevronLeft, X, Save, Sparkles, Lightbulb, Wand2, Plus, Trash2, Edit, HelpCircle, ArrowRight, CornerUpLeft, Layout, Target } from 'lucide-react';
import WeeklySchedule from './WeeklySchedule';

interface StageWizardProps {
    config: StrategyStageConfig;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
    onSaveAndNext?: (data: Record<string, any>) => void;
    onSaveProgress?: (data: Record<string, any>) => void;
    nextStageTitle?: string;
    strategyData?: Record<string, any>;
}

// --- HELPER COMPONENTS ---

const MultiSelectField = ({ field, value, onChange, strategyData }: { field: StageField, value: string[] | undefined, onChange: (val: string[]) => void, strategyData?: Record<string, any> }) => {

    // Dynamic Options Logic
    let options = field.options || [];
    if (field.source && strategyData) {
        // Expected source format: 'stage-id.field-id' (assuming flattened or known structure)
        // Or 'stage-2.audience_personas' corresponding to 'audience_personas' array in 'stage-2' data.
        const [stageId, fieldId] = field.source.split('.');
        if (stageId && fieldId) {
            const stageData = strategyData[stageId]?.data;
            if (stageData && Array.isArray(stageData[fieldId])) {
                options = stageData[fieldId].map((item: any) => item.name).filter(Boolean);
            }
        }
    }

    const selected = value || [];
    const toggle = (opt: string) => {
        if (selected.includes(opt)) {
            onChange(selected.filter(s => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    const [customInput, setCustomInput] = useState('');

    const handleAddCustom = () => {
        if (customInput.trim() && !selected.includes(customInput.trim())) {
            onChange([...selected, customInput.trim()]);
            setCustomInput('');
        }
    };

    // Typography Visual Helpers
    const getfontStyle = (opt: string) => {
        if (field.id !== 'typography') return {};
        const lowered = opt.toLowerCase();
        if (lowered.includes('serif') && !lowered.includes('sans')) return { fontFamily: "Georgia, 'Times New Roman', Times, serif" };
        if (lowered.includes('sans')) return { fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" };
        if (lowered.includes('script') || lowered.includes('handwritten')) return { fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontStyle: 'italic' };
        if (lowered.includes('mono')) return { fontFamily: "'Courier New', Courier, monospace" };
        if (lowered.includes('display')) return { fontFamily: "Impact, 'Arial Black', sans-serif", letterSpacing: '1px' };
        return {};
    };

    const isTypography = field.id === 'typography';

    return (
        <div className="space-y-4">
            {isTypography ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {options.map(opt => {
                        const isSelected = selected.includes(opt);
                        return (
                            <button
                                key={opt}
                                onClick={() => toggle(opt)}
                                className={`relative h-28 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all p-4 group overflow-hidden ${isSelected
                                    ? 'bg-white text-black border-white shadow-xl scale-[1.02]'
                                    : 'bg-neutral-900/50 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white hover:bg-neutral-800'
                                    }`}
                            >
                                <div className="text-4xl" style={getfontStyle(opt)}>Aa</div>
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{opt.split(' (')[0]}</span>
                                {isSelected && <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-sm" />}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {options.length > 0 ? (
                        options.map(opt => (
                            <button
                                key={opt}
                                onClick={() => toggle(opt)}
                                className={`px-4 py-3 rounded-xl text-xs font-medium border transition-all duration-200 ${selected.includes(opt)
                                    ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-105'
                                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                                    }`}
                            >
                                {opt}
                            </button>
                        ))
                    ) : (
                        <span className="text-sm text-neutral-500 italic col-span-full">
                            {field.source ? "No options found from previous stages. Please complete Stage 2." : "No options available."}
                        </span>
                    )}

                    {selected.filter(s => !options.includes(s)).map(s => (
                        <button
                            key={s}
                            onClick={() => toggle(s)}
                            className="px-4 py-3 rounded-xl text-xs font-medium border border-primary bg-primary/20 text-primary flex items-center justify-center gap-2 group hover:bg-primary/30 transition-all"
                        >
                            {s}
                            <X size={12} className="opacity-50 group-hover:opacity-100" />
                        </button>
                    ))}
                </div>
            )}

            {field.allowCustom && (
                <div className="relative group/input flex gap-2">
                    <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustom();
                            }
                        }}
                        placeholder={field.placeholder || "Add custom..."}
                        className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-all placeholder:text-neutral-600"
                    />
                    <button
                        onClick={handleAddCustom}
                        disabled={!customInput.trim()}
                        className="px-4 py-2 bg-neutral-800 hover:bg-white/10 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

// Integrated Date Range Picker
const IntegratedDateRangePicker = ({ value, onChange }: { value: { from: string; to: string } | undefined, onChange: (val: { from: string; to: string }) => void }) => {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

    // Helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    const handleDateClick = (day: number) => {
        const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));

        if (!value?.from || (value.from && value.to)) {
            // Start new range
            onChange({ from: dateStr, to: '' });
        } else {
            // Complete range
            if (dateStr < value.from) {
                onChange({ from: dateStr, to: value.from });
            } else {
                onChange({ ...value, to: dateStr });
            }
        }
    };

    const isSelected = (day: number) => {
        const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        return value?.from === dateStr || value?.to === dateStr;
    };

    const isInRange = (day: number) => {
        if (!value?.from || !value?.to) return false;
        const dateStr = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        return dateStr > value.from && dateStr < value.to;
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors">
                    <ChevronLeft size={16} />
                </button>
                <span className="font-bold text-sm">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={handleNextMonth} className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors">
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                    <div key={d} className="text-[10px] text-neutral-500 font-bold">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const selected = isSelected(day);
                    const inRange = isInRange(day);

                    return (
                        <button
                            key={day}
                            onClick={(e) => { e.preventDefault(); handleDateClick(day); }}
                            className={`
                                h-8 rounded-lg text-xs font-medium transition-all relative
                                ${selected
                                    ? 'bg-primary text-black font-bold z-10 shadow-lg shadow-primary/20 scale-110'
                                    : inRange
                                        ? 'bg-primary/20 text-white rounded-none mx-[-2px]'
                                        : 'text-neutral-400 hover:bg-white/10 hover:text-white'
                                }
                                ${(value?.from && !value.to && value.from === formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))) ? 'animate-pulse' : ''}
                            `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
            {/* Legend / Status */}
            <div className="mt-4 flex items-center justify-between text-xs border-t border-neutral-800 pt-3">
                <div className="text-neutral-500">
                    {value?.from ? (
                        <>
                            <span className="text-white">{value.from}</span>
                            {value.to && <> <ArrowRight size={10} className="inline mx-1" /> <span className="text-white">{value.to}</span> </>}
                        </>
                    ) : 'Select dates'}
                </div>
                {value?.from && value?.to && (
                    <button
                        onClick={(e) => { e.preventDefault(); onChange({ from: '', to: '' }); }}
                        className="text-neutral-500 hover:text-red-400 transition-colors"
                    >
                        Reset
                    </button>
                )}
            </div>
        </div>
    );
};

const StageWizard: React.FC<StageWizardProps> = ({ config, initialData, onClose, onSave, onSaveAndNext, onSaveProgress, nextStageTitle, strategyData }) => {
    // ... rest of StageWizard
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [formData, setFormData] = useState<Record<string, any>>(initialData || {});

    // AI Helper State
    const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});
    const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

    // Focused Array Item State (For "Focused Mode")
    const [focusedArrayItem, setFocusedArrayItem] = useState<{ fieldId: string, index: number, isNew?: boolean } | null>(null);

    // Custom Options State (User added options for select fields)
    const [customOptions, setCustomOptions] = useState<Record<string, string[]>>({});
    // Custom Input Visibility State
    const [customInputOpen, setCustomInputOpen] = useState<Record<string, boolean>>({});
    // Custom Input Value State (De-coupled from field value)
    const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

    // Initialize formData - Only on mount or config change to prevent overwrites during auto-save
    useEffect(() => {
        // Check if we already have data to avoid resetting on background updates
        if (Object.keys(formData).length > 0 && formData !== initialData) return;

        const initial = { ...initialData };
        config.steps.forEach(step => {
            step.fields.forEach(field => {
                if (initial[field.id] === undefined) {
                    initial[field.id] = (field.type === 'array' || field.type === 'multiselect') ? [] : '';
                }
            });
        });
        setFormData(initial);
        setFormData(initial);
    }, [config.id]); // Only re-run if stage changes

    // Sync persistent custom values to customOptions state
    useEffect(() => {
        config.steps.forEach(step => {
            step.fields.forEach(field => {
                if (field.type === 'select' && field.allowCustom && formData[field.id]) {
                    const value = formData[field.id];
                    const idsToCheck = typeof value === 'object' ? [value.primary, value.secondary, value.tertiary] : [value];

                    idsToCheck.forEach(val => {
                        if (val && field.options && !field.options.includes(val)) {
                            setCustomOptions(prev => {
                                const current = prev[field.id] || [];
                                if (!current.includes(val)) {
                                    return { ...prev, [field.id]: [...current, val] };
                                }
                                return prev;
                            });
                        }
                    });
                }
            });
        });
    }, [formData, config.id]);

    // Auto-Save Effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            // Only save if dirty and we have a saver
            if (onSaveProgress && Object.keys(formData).length > 0) {
                onSaveProgress(formData);
            }
        }, 1500); // 1.5s debounce

        return () => clearTimeout(timeoutId);
    }, [formData, onSaveProgress]);

    const currentStep = config.steps[currentStepIndex];
    const isLastStep = currentStepIndex === config.steps.length - 1;
    const isFocusedMode = !!focusedArrayItem;

    const handleNext = () => {
        if (!isLastStep) {
            // Immediate save on navigation
            if (onSaveProgress) {
                onSaveProgress(formData);
            }
            setCurrentStepIndex(prev => prev + 1);
        } else {
            onSave(formData);
        }
    };

    const handleSaveAndNextAction = () => {
        if (onSaveAndNext) {
            onSaveAndNext(formData);
        }
    };

    // Force save on unmount (cleanup) - handled by page but good to ensure
    // Ref for saving on unmount if needed, but sticky debounce might clear it.

    const handleBack = () => {
        // Save on back too? Yes.
        if (onSaveProgress) onSaveProgress(formData);
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
    const getAiSuggestion = (fieldId: string): string => {
        const examples: Record<string, string> = {
            'mission_statement': "To create a sonic sanctuary where listeners find strength in vulnerability.",
            'vocabulary_rules': "Use terms like 'signal', 'transmission', 'static'. Avoid 'content', 'drops'.",
            'demographics': "Gen Z creative professionals, 18-24, urban centers, frequent concert-goers.",
            'differentiation': "Combining lo-fi hip hop textures with operatic vocals and high-fashion aesthetics.",
            'primary_colors': "Midnight Blue (#191970), Electric Lime (#CCFF00), and Slate Grey.",
            'fashion_notes': "Oversized silhouettes, tactical gear mixed with delicate lace, monochrome palette.",
            'typography': "Bold, extended sans-serifs for headers (e.g. Druk Wide) paired with mono-spaced body text.",
            'era_narrative': "The protagonist wakes up in a digital void and must reconstruct their memories through sound.",
            'setting_description': "A brutalist concrete city reclaimed by bioluminescent nature.",
            'phases': "1. The Glitch (Teasers) 2. The Signal (Single) 3. The Download (Album) 4. The System (Tour)",
            'series_concepts': "'Studio noir' - weekly black & white updates from the studio with jazz overlays.",
            'batching_plan': "Film all video content on first Monday of the month. Edit on Tuesdays. Schedule Wednesdays.",
            'bottleneck_prevention': "No phone usage after 9PM. Delegate graphic design. One weekend off per month.",
            'retention_strategy': "Exclusive Discord role for pre-savers. Hidden unreleased tracks in YouTube descriptions.",
            'activation_ideas': "Scavenger hunt for USB drives in major cities. Live listening party on Twitch.",
            'hi_fi_content': " Cinematic music videos, official press photos, animated 3D visualizers.",
            'lo_fi_content': "iPhone notes screenshots, raw vocal memos, car test videos.",
            'editing_style': "Fast-paced glitch cuts, CRT monitor effects, high grain overlay."
        };

        return examples[fieldId] || "A unique, authentic expression of your core artistic vision tailored to your audience.";
    };

    const handleAiGenerate = (fieldId: string, index?: number, subFieldId?: string) => {
        const key = subFieldId ? `${fieldId}-${index}-${subFieldId}` : fieldId;
        const lookupId = subFieldId || fieldId; // Use the specific field ID for the prompt lookup

        setAiLoading(prev => ({ ...prev, [key]: true }));
        setAiSuggestions(prev => {
            const temp = { ...prev };
            delete temp[key]; // Clear previous
            return temp;
        });

        setTimeout(() => {
            setAiLoading(prev => ({ ...prev, [key]: false }));
            setAiSuggestions(prev => ({ ...prev, [key]: getAiSuggestion(lookupId) }));
        }, 800);
    };

    const applyAiSuggestion = (fieldId: string, suggestion: string, index?: number, subFieldId?: string) => {
        const key = subFieldId ? `${fieldId}-${index}-${subFieldId}` : fieldId;

        if (typeof index === 'number' && subFieldId) {
            // Array Item Update
            const topValue = formData[fieldId];
            const list = [...(Array.isArray(topValue) ? topValue : [])];
            const item = { ...list[index] };
            item[subFieldId] = suggestion; // Replace or append? Replacing is cleaner for "example"
            list[index] = item;
            updateField(fieldId, list);
        } else {
            // Top Level Update
            const fieldConfig = config.steps.flatMap(s => s.fields).find(f => f.id === fieldId);
            if (fieldConfig?.allowSecondary) {
                const currentVal = formData[fieldId] || {};
                const secondary = typeof currentVal === 'object' ? currentVal.secondary : '';
                updateField(fieldId, { primary: suggestion, secondary });
            } else {
                updateField(fieldId, suggestion);
            }
        }

        // Clear suggestion
        setAiSuggestions(prev => {
            const temp = { ...prev };
            delete temp[key];
            return temp;
        });
    };


    // --- Render Helpers ---



    const renderField = (field: StageField, value: any, onChange: (val: any) => void, pathPrefix: string = '', aiParams?: { fieldId: string, index?: number, subFieldId?: string }) => {

        // Construct unique key for AI state
        const aiKey = aiParams
            ? (aiParams.subFieldId ? `${aiParams.fieldId}-${aiParams.index}-${aiParams.subFieldId}` : aiParams.fieldId)
            : field.id;

        const aiState = {
            loading: aiLoading[aiKey],
            suggestion: aiSuggestions[aiKey]
        };

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
            const t = typeof currentObj === 'object' ? currentObj.tertiary : '';

            // If unselecting
            if (p === option) {
                // Shift down: Secondary becomes primary, Tertiary becomes secondary
                onChange({ primary: s, secondary: t, tertiary: '' });
                return;
            }
            if (s === option) {
                // Shift down: Tertiary becomes secondary
                onChange({ primary: p, secondary: t, tertiary: '' });
                return;
            }
            if (t === option) {
                onChange({ primary: p, secondary: s, tertiary: '' });
                return;
            }

            // Selecting new option
            // Limit based on maxSelections if present, otherwise default to 3 if allowSecondary is true
            const limit = field.maxSelections || 3;

            if (!p) {
                onChange({ primary: option, secondary: s, tertiary: t });
            } else if (!s && limit >= 2) {
                onChange({ primary: p, secondary: option, tertiary: t });
            } else if (!t && limit >= 3) {
                onChange({ primary: p, secondary: s, tertiary: option });
            } else {
                // All slots full, replace tertiary or do nothing? User request implies just "can have a 3rd". 
                // Let's replace the last one (tertiary) to allow switching easily
                onChange({ primary: p, secondary: s, tertiary: option });
            }
        }

        const renderAiSuggestion = () => {
            if (!field.aiEnabled || !aiParams || (!aiState.loading && !aiState.suggestion)) return null;

            if (aiState.loading) {
                return (
                    <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500 animate-pulse">
                        <Sparkles size={12} /> Thinking...
                    </div>
                );
            }

            if (aiState.suggestion) {
                return (
                    <div className="mt-2 bg-neutral-900/50 border border-primary/20 rounded-lg p-3 animate-in slide-in-from-top-2">
                        <div className="flex items-start gap-3">
                            <div className="text-primary mt-0.5"><Lightbulb size={14} /></div>
                            <div className="flex-1">
                                <p className="text-sm text-neutral-300 italic mb-2">"{aiState.suggestion}"</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => applyAiSuggestion(aiParams.fieldId, aiState.suggestion!, aiParams.index, aiParams.subFieldId)}
                                        className="text-[10px] font-bold bg-primary text-black px-3 py-1 rounded-md hover:bg-primary/90 transition-colors"
                                    >
                                        Use This
                                    </button>
                                    <button
                                        onClick={() => setAiSuggestions(prev => { const n = { ...prev }; delete n[aiKey]; return n; })}
                                        className="text-[10px] font-bold text-neutral-500 hover:text-white px-3 py-1 transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            return null;
        };

        if (field.type === 'array') {
            const items = (value as any[]) || [];

            // --- FOCUSED MODE RENDERING FOR THIS FIELD ---
            if (focusedArrayItem && focusedArrayItem.fieldId === field.id) {
                const idx = focusedArrayItem.index;
                const item = items[idx] || {};

                return (
                    <div className="h-full flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setFocusedArrayItem(null)}
                                    className="p-2 -ml-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                    title="Go Back"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tight">
                                        {focusedArrayItem.isNew ? `New ${field.itemLabel || 'Item'}` : `Edit ${field.itemLabel || 'Item'}`}
                                    </h3>
                                    <p className="text-sm text-neutral-500">Fill out the details below.</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSaveFocusedItem}
                                className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-neutral-200 transition-colors flex items-center gap-2 shadow-lg shadow-white/10"
                            >
                                <Save size={16} />
                                {focusedArrayItem.isNew ? 'Add Item' : 'Save Changes'}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                            <div className="grid grid-cols-1 gap-6 pb-20">
                                {field.fields?.map(subField => (
                                    <div key={subField.id} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest pl-1">
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
                                            subField.aiEnabled ? { fieldId: field.id, index: idx, subFieldId: subField.id } : undefined
                                        )}

                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }

            // --- LIST VIEW RENDERING ---

            // Grouping Logic
            let uiGroups: { title?: string, items: { data: any, index: number }[], isPseudo?: boolean, customAdd?: () => void }[] = [];

            if (field.groupBySource && strategyData) {
                const parts = field.groupBySource.split('.');
                if (parts.length === 2) {
                    const stageObj = strategyData[parts[0]];
                    const sourceArray = stageObj?.data?.[parts[1]];

                    if (Array.isArray(sourceArray)) {
                        sourceArray.forEach((group: any) => {
                            uiGroups.push({
                                title: group.name,
                                items: items.map((d: any, i: number) => ({ data: d, index: i }))
                                    .filter((x: any) => Array.isArray(x.data.campaign_assignment) && x.data.campaign_assignment.includes(group.name)),
                                customAdd: () => {
                                    const newItem = { campaign_assignment: [group.name] };
                                    onChange([...items, newItem]);
                                    setFocusedArrayItem({ fieldId: field.id, index: items.length, isNew: true });
                                }
                            });
                        });
                        // Unassigned
                        uiGroups.push({
                            title: 'Unassigned',
                            isPseudo: true,
                            items: items.map((d: any, i: number) => ({ data: d, index: i }))
                                .filter((x: any) => !x.data.campaign_assignment || x.data.campaign_assignment.length === 0),
                            customAdd: () => {
                                onChange([...items, {}]);
                                setFocusedArrayItem({ fieldId: field.id, index: items.length, isNew: true });
                            }
                        });
                    }
                }
            }

            if (uiGroups.length === 0) {
                uiGroups.push({
                    items: items.map((d: any, i: number) => ({ data: d, index: i }))
                });
            }

            return (
                <div className="space-y-6">
                    {uiGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-3">
                            {group.title && (
                                <h5 className="text-xs font-black text-neutral-500 uppercase flex items-center gap-2 ml-1 mt-4 border-b border-neutral-800 pb-2">
                                    {group.isPseudo ? <Layout size={12} /> : <Target size={12} />}
                                    {group.title}
                                </h5>
                            )}

                            <div className="grid grid-cols-1 gap-3">
                                {group.items.map(({ data: item, index: idx }) => (
                                    <div key={idx} className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 flex items-center justify-between group hover:border-neutral-600 hover:bg-neutral-900/60 transition-all duration-300">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-500 font-bold text-xs">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-base">{item.name || item.title || `${field.itemLabel || 'Item'} ${idx + 1}`}</h4>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {item.frequency && <span className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">{item.frequency}</span>}
                                                    {item.platforms && item.platforms.slice(0, 3).map((p: string, i: number) => <span key={i} className="text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">{p}</span>)}
                                                </div>
                                                <span className="text-xs text-neutral-500 block mt-1">
                                                    {item.dates ? (item.dates.from ? `${item.dates.from} - ${item.dates.to}` : item.dates) : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setFocusedArrayItem({ fieldId: field.id, index: idx })}
                                                className="p-2 text-neutral-400 hover:text-white bg-black/40 hover:bg-black/60 rounded-lg transition-colors border border-transparent hover:border-neutral-700"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newItems = items.filter((_, i) => i !== idx);
                                                    onChange(newItems);
                                                }}
                                                className="p-2 text-neutral-400 hover:text-red-500 bg-black/40 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {group.customAdd && (
                                    <button
                                        onClick={group.customAdd}
                                        className="w-full py-4 border border-dashed border-neutral-800 rounded-xl text-neutral-500 font-bold text-xs hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group opacity-60 hover:opacity-100"
                                    >
                                        <Plus size={14} /> Add to {group.title}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Fallback Add Button if no groups (standard view) */}
                    {!field.groupBySource && items.length < (field.maxItems || 99) && (
                        <button
                            onClick={() => {
                                const newIdx = items.length;
                                onChange([...items, {}]);
                                setFocusedArrayItem({ fieldId: field.id, index: newIdx, isNew: true });
                            }}
                            className="w-full py-6 border border-dashed border-neutral-800 rounded-xl text-neutral-500 font-bold text-sm hover:text-white hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-3 group"
                        >
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-primary group-hover:text-black transition-colors">
                                <Plus size={18} />
                            </div>
                            <span>Add New {field.itemLabel || 'Item'}</span>
                        </button>
                    )}
                </div>
            );
        }

        if (field.type === 'multiselect') {
            return <MultiSelectField field={field} value={value} onChange={onChange} strategyData={strategyData} />;
        }

        if (field.type === 'date-range') {
            return <IntegratedDateRangePicker value={value} onChange={onChange} />;
        }


        if (field.type === 'weekly-schedule') {
            return (
                <WeeklySchedule
                    value={value}
                    onChange={onChange}
                    strategyData={strategyData}
                />
            );
        }

        if (field.type === 'checkbox') {
            return (
                <label className="flex items-center gap-3 cursor-pointer group p-3 bg-neutral-900/30 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${value ? 'bg-primary border-primary text-black' : 'border-neutral-600 bg-neutral-900 group-hover:border-neutral-400'}`}>
                        {value && <Check size={12} strokeWidth={4} />}
                    </div>
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="hidden"
                    />
                    <span className={`text-sm font-medium ${value ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-300'}`}>{field.placeholder || field.label}</span>
                </label>
            )
        }

        if (field.type === 'textarea') {
            return (
                <>
                    <div className="relative group/input">
                        <textarea
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full h-24 bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none resize-none transition-all focus:ring-1 focus:ring-primary/20 leading-relaxed custom-scrollbar placeholder:text-neutral-600"
                        />
                        {field.aiEnabled && aiParams && (
                            <button
                                onClick={() => handleAiGenerate(aiParams.fieldId, aiParams.index, aiParams.subFieldId)}
                                disabled={aiState.loading}
                                className="absolute right-3 bottom-3 p-2 text-neutral-500 hover:text-primary transition-colors hover:bg-primary/10 rounded-lg group-hover/input:opacity-100 opacity-50"
                                title="Generate with AI"
                            >
                                <Sparkles size={16} className={aiState.loading ? "animate-spin" : ""} />
                            </button>
                        )}
                    </div>
                    {renderAiSuggestion()}
                </>
            );
        }

        if (field.type === 'select' && field.options) {
            // Merge static options with user-added custom options
            const effectiveOptions = [...field.options, ...(customOptions[field.id] || [])];

            return (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {effectiveOptions.map(option => {
                            // Logic for 3 selections
                            const valObj = typeof value === 'object' ? value : { primary: value };
                            const isPri = valObj?.primary === option;
                            const isSec = valObj?.secondary === option;
                            const isTer = valObj?.tertiary === option;

                            const rank = isPri ? 1 : isSec ? 2 : isTer ? 3 : 0;

                            return (
                                <button
                                    key={option}
                                    onClick={() => handleOptionToggle(option)}
                                    className={`px-4 py-3 rounded-lg text-xs font-bold border transition-all duration-200 relative overflow-visible group ${rank > 0
                                        ? rank === 1
                                            ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-105 z-10'
                                            : rank === 2
                                                ? 'bg-primary/20 text-primary border-primary shadow-lg shadow-primary/10'
                                                : 'bg-neutral-800 text-neutral-300 border-neutral-600 shadow-lg'
                                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
                                        } `}
                                >
                                    {isPri && <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full shadow-sm z-20" />}
                                    {option}
                                    {isSec && <span className="ml-1.5 text-[9px] bg-primary text-black px-1 rounded-sm uppercase tracking-tighter font-extrabold">2nd</span>}
                                    {isTer && <span className="ml-1.5 text-[9px] bg-neutral-600 text-white px-1 rounded-sm uppercase tracking-tighter font-extrabold">3rd</span>}

                                    {!field.options.includes(option) && (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Remove from selection if selected
                                                if (isPri || isSec || isTer) {
                                                    // This is tricky. Simplified: just deselect passing the option will trigger toggle logic? 
                                                    // No, toggle logic handles SELECTING. We need to explicitly clear it?
                                                    // Actually, if we just remove it from options, render will fail or it will just disappear?
                                                    // We should clean up the value too.
                                                    const currentObj = typeof value === 'object' ? value : { primary: value };
                                                    let newObj = { ...currentObj };
                                                    if (newObj.primary === option) newObj.primary = '';
                                                    if (newObj.secondary === option) newObj.secondary = '';
                                                    if (newObj.tertiary === option) newObj.tertiary = '';

                                                    // Re-shift? Or just leave empty gaps? Toggle logic expects gaps allowed?
                                                    // Let's just clear for now.
                                                    if (!field.allowSecondary) {
                                                        onChange('');
                                                    } else {
                                                        // Shift logic isn't in 'onChange', it's in 'handleOptionToggle'.
                                                        // We can just call onChange with the cleaned object.
                                                        onChange(newObj);
                                                    }
                                                }

                                                setCustomOptions(prev => ({
                                                    ...prev,
                                                    [field.id]: (prev[field.id] || []).filter(o => o !== option)
                                                }));
                                            }}
                                            className="absolute -top-2 -right-2 p-1 bg-neutral-800 text-neutral-500 rounded-full hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100 z-30"
                                            title="Remove Option"
                                        >
                                            <X size={10} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                        {field.allowCustom && (
                            <button
                                onClick={() => setCustomInputOpen(prev => ({ ...prev, [field.id]: !prev[field.id] }))}
                                className={`px-4 py-3 rounded-lg text-xs font-bold border border-dashed transition-all ${customInputOpen[field.id]
                                    ? 'bg-white/10 text-white border-primary border-solid'
                                    : 'bg-transparent border-neutral-700 text-neutral-500 hover:text-white hover:border-neutral-500'
                                    } `}
                            >
                                Custom...
                            </button>
                        )}
                    </div>
                    {/* Show Custom Input if Toggled Open OR (Value is Set but Not in Options - Legacy fallback) */}
                    {(customInputOpen[field.id] ||
                        (field.allowSecondary ? (value?.primary && !effectiveOptions.includes(value.primary)) : (value && !effectiveOptions.includes(value)))
                    ) && (
                            <div className="relative group/input animate-in fade-in zoom-in-95 duration-200 flex items-center gap-2">
                                <input
                                    type="text"
                                    // If open explicitly, don't bind to value, bind to a temp internal state? 
                                    // Actually, if we want to add *new* options, we shouldn't be binding to 'value' at all.
                                    // We should use a local temp state for the input.
                                    // BUT we are in a render helper, not a component.
                                    // We need 'customInputValue' state map too.
                                    // Quick fix: Use the 'value' logic IF we are defining the primary. 
                                    // But the user wants to ADD options. 
                                    // If we bind to 'value', typing changes the selection.
                                    // If I want to add "Option C" while "Option A" is selected as Primary, I can't bind to Primary value without deselecting A.
                                    // THE FIX: Use a dedicated 'customInputs' state map for typing new values.
                                    value={customInputs[field.id] || ''}
                                    onChange={(e) => setCustomInputs(prev => ({ ...prev, [field.id]: e.target.value }))}
                                    placeholder="Type custom value..."
                                    className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-all focus:ring-1 focus:ring-primary/20 placeholder:text-neutral-600"
                                />
                                <button
                                    onClick={() => {
                                        const valToCommit = customInputs[field.id];

                                        if (valToCommit && valToCommit.trim()) {
                                            // Add to custom options
                                            setCustomOptions(prev => ({
                                                ...prev,
                                                [field.id]: [...(prev[field.id] || []), valToCommit.trim()]
                                            }));
                                            // Clear input and Close
                                            setCustomInputs(prev => ({ ...prev, [field.id]: '' }));
                                            setCustomInputOpen(prev => ({ ...prev, [field.id]: false }));
                                        }
                                    }}
                                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 border border-neutral-700 transition-colors"
                                    title="Add as option"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        )
                    }


                    {/* Selection Summary */}
                    {
                        field.allowSecondary && typeof value === 'object' && (value.primary || value.secondary || value.tertiary) && (
                            <div className="mt-4 flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2">
                                {value.primary && (
                                    <div className="flex items-center gap-3 bg-neutral-900 border border-white/20 p-3 rounded-lg">
                                        <div className="bg-white text-black text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">1st Choice</div>
                                        <span className="text-white font-bold text-sm">{value.primary}</span>
                                    </div>
                                )}
                                {value.secondary && (
                                    <div className="flex items-center gap-3 bg-neutral-900/50 border border-primary/20 p-3 rounded-lg">
                                        <div className="bg-primary text-black text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">2nd Choice</div>
                                        <span className="text-neutral-200 font-medium text-sm">{value.secondary}</span>
                                    </div>
                                )}
                                {value.tertiary && (
                                    <div className="flex items-center gap-3 bg-neutral-900/30 border border-neutral-800 p-3 rounded-lg">
                                        <div className="bg-neutral-700 text-neutral-300 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">3rd Choice</div>
                                        <span className="text-neutral-400 font-medium text-sm">{value.tertiary}</span>
                                    </div>
                                )}
                            </div>
                        )
                    }
                </div >
            );
        }

        // Default 'text'
        return (
            <>
                <div className="relative group/input">
                    <input
                        type={field.type}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:border-primary/50 focus:outline-none transition-all focus:ring-1 focus:ring-primary/20 placeholder:text-neutral-600"
                    />
                    {field.aiEnabled && aiParams && (
                        <button
                            onClick={() => handleAiGenerate(aiParams.fieldId, aiParams.index, aiParams.subFieldId)}
                            disabled={aiState.loading}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-primary transition-colors hover:bg-primary/10 rounded-lg opacity-50 group-hover/input:opacity-100"
                            title="Generate with AI"
                        >
                            <Sparkles size={16} className={aiState.loading ? "animate-spin" : ""} />
                        </button>
                    )}
                </div>
                {renderAiSuggestion()}
            </>
        );
    };

    // --- MAIN RENDER ---
    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#0A0A0A] text-[#EDEDED] animate-in fade-in slide-in-from-bottom-5 duration-300 md:relative md:inset-auto md:z-auto md:max-w-6xl md:mx-auto md:h-[85vh] md:min-h-[500px] md:border md:border-neutral-800/60 md:rounded-3xl md:shadow-2xl md:mb-24 md:overflow-hidden">

            {/* Header */}
            {!isFocusedMode && (
                <div className="h-16 md:h-20 border-b border-neutral-800 flex items-center justify-between px-4 md:px-8 bg-black/40 shrink-0">
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                        <button
                            onClick={onClose}
                            className="bg-neutral-800/50 hover:bg-white/10 text-neutral-400 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[10px] md:text-xs font-bold transition-colors flex items-center gap-2 shrink-0"
                        >
                            <CornerUpLeft size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">Back to Strategy</span><span className="sm:hidden">Back</span>
                        </button>

                        <div className="w-px h-6 bg-neutral-800 mx-1 md:mx-2 shrink-0"></div>

                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 shrink-0">
                                <span className="text-primary font-bold text-sm md:text-lg">{config.id.split('-')[1]}</span>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm md:text-xl font-black text-white tracking-tight truncate">{config.title}</h2>
                                <p className="text-neutral-500 text-[10px] md:text-xs font-medium uppercase tracking-widest truncate">{currentStep.title}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Indicator (Left Side or Top) */}
            {!isFocusedMode && (
                <div className="px-4 md:px-8 py-3 md:py-4 bg-black/20 border-b border-neutral-800 overflow-x-auto hide-scrollbar">
                    <div className="flex items-center gap-2 w-max">
                        {config.steps.map((step, idx) => (
                            <div key={step.id} className="flex items-center">
                                <div
                                    className={`
                                                    flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border text-[10px] md:text-xs font-bold transition-all whitespace-nowrap
                                                    ${currentStepIndex === idx
                                            ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-105 z-10'
                                            : currentStepIndex > idx
                                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                                        }
                                                `}
                                >
                                    <div className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center text-[8px] md:text-[9px] ${currentStepIndex === idx ? 'bg-black text-white' : currentStepIndex > idx ? 'bg-green-500 text-black' : 'bg-neutral-800'}`}>
                                        {currentStepIndex > idx ? <Check size={8} strokeWidth={4} /> : idx + 1}
                                    </div>
                                    {step.title}
                                </div>
                                {idx < config.steps.length - 1 && (
                                    <div className="w-4 md:w-6 h-[1px] bg-neutral-800 mx-1"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4 md:p-8">
                <div className={`max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 ${isFocusedMode ? 'h-full' : ''}`}>

                    {!isFocusedMode ? (
                        // STANDARD VIEW
                        <div className="space-y-6 md:space-y-8">
                            <div className="mb-4 md:mb-6">
                                <h3 className="text-2xl md:text-3xl font-black text-white mb-2">{currentStep.title}</h3>
                                <p className="text-sm md:text-lg text-neutral-400 leading-relaxed font-light">{currentStep.description}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pb-12">
                                {currentStep.fields.map(field => {
                                    // Make 'select' full width too as per user request for prominent options
                                    const isWide = ['textarea', 'array', 'multiselect', 'weekly-schedule', 'select'].includes(field.type) || field.fullWidth;
                                    return (
                                        <div key={field.id} className={`space-y-3 md:space-y-4 group/field ${isWide ? 'col-span-1 md:col-span-2' : ''}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <label className="text-xs md:text-sm font-bold text-neutral-300 tracking-wide block uppercase flex items-center gap-2">
                                                        {field.label}
                                                        {field.required && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                    </label>
                                                    {field.allowSecondary && (
                                                        <span className="text-[9px] md:text-[10px] text-neutral-500 mt-1 font-medium">
                                                            Select Primary & Priority Secondary
                                                        </span>
                                                    )}
                                                </div>
                                                {field.aiEnabled && (
                                                    <div className="opacity-100 md:opacity-0 group-hover/field:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-primary">
                                                        <Sparkles size={10} /> <span className="hidden sm:inline">AI Enabled</span>
                                                    </div>
                                                )}
                                            </div>
                                            {renderField(
                                                field,
                                                formData[field.id],
                                                (val) => updateField(field.id, val),
                                                undefined,
                                                field.aiEnabled ? { fieldId: field.id } : undefined
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        // FOCUSED VIEW
                        config.steps.flatMap(s => s.fields).filter(f => f.id === focusedArrayItem?.fieldId).map(field => (
                            <React.Fragment key={field.id}>
                                {renderField(
                                    field,
                                    formData[field.id],
                                    (val) => updateField(field.id, val),
                                    '',
                                    { fieldId: field.id }
                                )}
                            </React.Fragment>
                        ))
                    )}
                </div>


            </div>

            {/* Footer - HIDDEN IF FOCUSED */}
            {!isFocusedMode && (
                <div className="min-h-[80px] md:h-24 border-t border-neutral-800 flex flex-col-reverse md:flex-row items-center justify-between p-4 md:px-8 bg-black/40 shrink-0 backdrop-blur-sm gap-4 md:gap-0">
                    <button
                        onClick={handleBack}
                        disabled={currentStepIndex === 0}
                        className="w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-white/5"
                    >
                        Back
                    </button>

                    <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={handleNext}
                            className={`
                                            w-full md:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border
                                            ${isLastStep
                                    ? 'bg-transparent border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 hover:bg-white/5 order-2 md:order-1'
                                    : 'bg-primary text-black border-transparent shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-105 order-1'}
                                        `}
                        >
                            {isLastStep ? (
                                <>
                                    <Save size={16} /> Save & Exit
                                </>
                            ) : (
                                <>
                                    Next Step <ArrowRight size={16} />
                                </>
                            )}
                        </button>

                        {isLastStep && nextStageTitle && onSaveAndNext && (
                            <button
                                onClick={handleSaveAndNextAction}
                                className="w-full md:w-auto px-8 py-3 bg-primary text-black border border-transparent rounded-xl font-black text-sm transition-all shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-105 flex items-center justify-center gap-2 order-1 md:order-2 animate-in fade-in zoom-in-95"
                            >
                                <span className="truncate">Save & Start {nextStageTitle}</span> <ArrowRight size={18} />
                            </button>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default StageWizard;
