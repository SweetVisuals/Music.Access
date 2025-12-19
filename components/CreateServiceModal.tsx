import React, { useState } from 'react';
import { X, Check, Plus, Trash2, DollarSign, Mic2, Clock, Hash, LayoutTemplate, Sparkles, ArrowRight } from 'lucide-react';
import { Service } from '../types';
import { createService } from '../services/supabaseService';

interface CreateServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (service: Service) => void;
}

const CreateServiceModal: React.FC<CreateServiceModalProps> = ({ isOpen, onClose, onSave }) => {
    const [isLoading, setIsLoading] = useState(false);

    // Default data for the preview
    const [serviceData, setServiceData] = useState<Partial<Service>>({
        title: '',
        description: '',
        price: 49.99,
        rateType: 'flat',
        features: []
    });

    const [newFeature, setNewFeature] = useState('');

    const handleAddFeature = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (newFeature.trim()) {
            setServiceData(prev => ({
                ...prev,
                features: [...(prev.features || []), newFeature.trim()]
            }));
            setNewFeature('');
        }
    };

    const removeFeature = (index: number) => {
        setServiceData(prev => ({
            ...prev,
            features: prev.features?.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!serviceData.title || !serviceData.description || !serviceData.price) {
            return;
        }

        setIsLoading(true);
        try {
            const newService = await createService(serviceData);
            if (newService) {
                onSave(newService);
                onClose();
            }
        } catch (error) {
            console.error('Failed to create service:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full h-full md:max-w-5xl md:h-auto md:max-h-[90vh] bg-[#0a0a0a] border-0 md:border border-neutral-800 rounded-none md:rounded-3xl flex shadow-2xl overflow-hidden relative mx-0 md:mx-4">

                {/* LEFT SIDE - FORM */}
                <div className="flex-1 flex flex-col border-r border-neutral-800 min-w-0 md:min-w-[50%]">
                    <div className="h-16 md:h-20 border-b border-neutral-800 flex items-center justify-between px-4 md:px-8 bg-neutral-900/30 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Mic2 size={20} className="text-primary" />
                                </div>
                                Create Service
                            </h2>
                            <p className="text-xs text-neutral-500 mt-1 font-medium ml-1">Define your new service offering</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-6 md:space-y-8">

                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider group-focus-within:text-primary transition-colors">Service Title</label>
                            <input
                                value={serviceData.title}
                                onChange={(e) => setServiceData({ ...serviceData, title: e.target.value })}
                                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl px-5 py-4 text-white text-base md:text-sm focus:border-primary/50 focus:outline-none focus:bg-neutral-900 transition-all font-medium placeholder:text-neutral-700"
                                placeholder="e.g. Mixing & Mastering"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider group-focus-within:text-primary transition-colors">Description</label>
                            <textarea
                                value={serviceData.description}
                                onChange={(e) => setServiceData({ ...serviceData, description: e.target.value })}
                                className="w-full h-32 bg-neutral-900/50 border border-neutral-800 rounded-xl px-5 py-4 text-base md:text-sm text-white focus:border-primary/50 focus:outline-none focus:bg-neutral-900 resize-none transition-all placeholder:text-neutral-700 leading-relaxed"
                                placeholder="Describe exactly what the client gets..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Pricing Model</label>
                                <div className="flex bg-neutral-900 p-1.5 rounded-xl border border-neutral-800">
                                    <button
                                        onClick={() => setServiceData({ ...serviceData, rateType: 'flat' })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-lg transition-all ${serviceData.rateType === 'flat' ? 'bg-neutral-800 text-white shadow-lg ring-1 ring-white/10' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Hash size={14} /> Flat Rate
                                    </button>
                                    <button
                                        onClick={() => setServiceData({ ...serviceData, rateType: 'hourly' })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-lg transition-all ${serviceData.rateType === 'hourly' ? 'bg-neutral-800 text-white shadow-lg ring-1 ring-white/10' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Clock size={14} /> Per Hour
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 group">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider group-focus-within:text-primary transition-colors">
                                    {serviceData.rateType === 'hourly' ? 'Hourly Rate' : 'Total Price'}
                                </label>
                                <div className="relative group-focus-within:transform group-focus-within:-translate-y-0.5 transition-transform duration-300">
                                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors" />
                                    <input
                                        type="number"
                                        value={serviceData.price}
                                        onChange={(e) => setServiceData({ ...serviceData, price: parseFloat(e.target.value) })}
                                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl pl-10 pr-4 py-3.5 text-xl font-mono font-bold text-white focus:border-primary/50 focus:outline-none focus:bg-neutral-900 transition-all placeholder:text-neutral-800"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Features Included</label>

                            <div className="flex gap-3">
                                <input
                                    value={newFeature}
                                    onChange={(e) => setNewFeature(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()}
                                    className="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-xl px-5 py-3 text-base md:text-sm text-white focus:border-primary/50 focus:outline-none focus:bg-neutral-900 transition-all placeholder:text-neutral-700"
                                    placeholder="Add a feature (e.g. '2 Revisions')"
                                />
                                <button
                                    onClick={() => handleAddFeature()}
                                    className="px-4 bg-white text-black rounded-xl hover:bg-neutral-200 transition-colors shadow-lg shadow-white/5"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="space-y-2 pr-2">
                                {serviceData.features?.length === 0 && (
                                    <div className="text-center py-6 border-2 border-dashed border-neutral-800 rounded-xl text-neutral-600 text-sm">
                                        No features added yet
                                    </div>
                                )}
                                {serviceData.features?.map((feature, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 pl-4 bg-neutral-900/30 border border-white/5 rounded-xl group hover:border-white/10 transition-all animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-1 rounded-full bg-primary/20 text-primary">
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                            <span className="text-sm text-neutral-300 font-medium">{feature}</span>
                                        </div>
                                        <button
                                            onClick={() => removeFeature(idx)}
                                            className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    <div className="p-4 md:p-6 border-t border-neutral-800 bg-neutral-900/30 flex justify-between items-center shrink-0">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-wider">Cancel</button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="group relative px-6 md:px-8 py-3 bg-white text-black rounded-xl text-xs font-bold hover:bg-neutral-200 transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                        >
                            <span className="relative z-10">{isLoading ? 'Creating...' : 'Create Service'}</span>
                            {!isLoading && <ArrowRight size={14} className="relative z-10 group-hover:translate-x-1 transition-transform" />}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shimmer" />
                        </button>
                    </div>

                </div>

                {/* RIGHT SIDE - PREVIEW */}
                <div className="w-[45%] bg-neutral-950/50 hidden lg:flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900/50 via-neutral-950 to-neutral-950" />
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    <div className="relative z-10 w-full max-w-sm">
                        <div className="flex items-center gap-2 mb-6 text-neutral-500 mx-auto justify-center">
                            <Sparkles size={14} className="text-primary" />
                            <span className="text-xs font-bold uppercase tracking-widest">Live Preview</span>
                        </div>

                        {/* MOCK CARD */}
                        <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/50 transform transition-all duration-500 hover:scale-[1.02] group relative overflow-hidden mx-6">

                            {/* Card Content */}
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="p-3 bg-neutral-900 rounded-xl text-primary border border-primary/20 group-hover:bg-primary group-hover:text-black transition-colors shadow-lg">
                                    <Mic2 size={24} />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-2xl font-bold text-white font-mono tracking-tight">
                                        ${serviceData.price || 0}
                                        {serviceData.rateType === 'hourly' && <span className="text-sm text-neutral-500 font-normal ml-1">/hr</span>}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 font-mono uppercase bg-neutral-900 px-1.5 rounded">
                                        {serviceData.rateType === 'hourly' ? 'Hourly Rate' : 'Starting at'}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                                {serviceData.title || 'Service Title'}
                            </h3>

                            <p className="text-sm text-neutral-400 mb-6 line-clamp-2 h-10 leading-relaxed">
                                {serviceData.description || 'Service description will appear here...'}
                            </p>

                            <div className="space-y-2 mb-6">
                                {(serviceData.features?.slice(0, 3) || []).map((feature, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-neutral-300">
                                        <Check size={12} className="text-primary" />
                                        <span className="line-clamp-1">{feature}</span>
                                    </div>
                                ))}
                                {(serviceData.features?.length || 0) > 3 && (
                                    <div className="text-xs text-neutral-500 pl-5 italic">
                                        + {(serviceData.features?.length || 0) - 3} more features
                                    </div>
                                )}
                                {(!serviceData.features || serviceData.features.length === 0) && (
                                    <div className="flex items-center gap-2 text-xs text-neutral-600 italic">
                                        <div className="w-3 h-3 rounded-full border border-neutral-700 border-dashed" />
                                        <span>Features specific to this service</span>
                                    </div>
                                )}
                            </div>

                            <button className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-primary hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-white/5">
                                Book Now
                            </button>

                            {/* Gradient Glow Effect */}
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 blur-[60px] rounded-full pointer-events-none group-hover:bg-primary/30 transition-all duration-500" />
                            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full transition-all backdrop-blur-sm z-50 border border-transparent hover:border-neutral-700"
                >
                    <X size={20} />
                </button>

            </div>
        </div>
    );
};

export default CreateServiceModal;
