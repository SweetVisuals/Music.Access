import React, { useState, useEffect } from 'react';
import { StrategyStageConfig, StageField } from '../../types';
import { Check, ChevronRight, ChevronLeft, X, Save } from 'lucide-react';

interface StageWizardProps {
    config: StrategyStageConfig;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

const StageWizard: React.FC<StageWizardProps> = ({ config, initialData, onClose, onSave }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [formData, setFormData] = useState<Record<string, any>>(initialData || {});
    // Initialize formData with empty strings for all fields if not present
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-4xl h-[80vh] bg-[#0a0a0a] border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">

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

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-300 key={currentStep.id}">
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-white mb-2">{currentStep.title}</h3>
                            {currentStep.description && <p className="text-neutral-400">{currentStep.description}</p>}
                        </div>

                        <div className="space-y-6">
                            {currentStep.fields.map(field => (
                                <div key={field.id} className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>

                                    {field.type === 'textarea' ? (
                                        <textarea
                                            value={formData[field.id] || ''}
                                            onChange={(e) => updateField(field.id, e.target.value)}
                                            placeholder={field.placeholder}
                                            className="w-full h-40 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none resize-none transition-all focus:ring-1 focus:ring-primary/20"
                                        />
                                    ) : field.type === 'select' ? (
                                        <select
                                            value={formData[field.id] || ''}
                                            onChange={(e) => updateField(field.id, e.target.value)}
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none transition-all"
                                        >
                                            <option value="">Select an option...</option>
                                            {field.options?.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
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
