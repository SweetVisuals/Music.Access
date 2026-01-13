import React, { useState } from 'react';
import { X, Check, Plus, Trash2, DollarSign, Mic2, Clock, Hash, LayoutTemplate, Sparkles, ArrowRight, Type, User, Star, Shield } from 'lucide-react';
import { Service } from '../types';
import { createService } from '../services/supabaseService';
import CustomInput from './CustomInput';
import ServiceCard from './ServiceCard';

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
        features: [],
        deliveryDays: 3
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

    const [isClosing, setIsClosing] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);

    React.useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
        } else if (shouldRender) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
            }, 450);
            return () => clearTimeout(timer);
        }
    }, [isOpen, shouldRender]);

    const handleInternalClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 450);
    };

    if (!shouldRender) return null;

    return (
        <div className={`fixed top-[56px] bottom-0 right-0 left-0 lg:left-[260px] z-[150] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/40 -z-10" />
            <div className={`w-full h-full bg-[#0a0a0a] border-0 flex flex-col lg:flex-row shadow-2xl overflow-hidden relative ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

                {/* LEFT SIDE - FORM */}
                <div className="flex-1 flex flex-col border-r border-neutral-800 min-w-0 md:min-w-[50%]">
                    <div className="h-14 md:h-20 border-b border-neutral-800 flex items-center justify-between px-4 md:px-8 bg-neutral-900/30 shrink-0">
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                                <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg">
                                    <Mic2 size={18} className="text-primary md:w-5 md:h-5" />
                                </div>
                                Create Service
                            </h2>
                            <p className="text-[10px] md:text-xs text-neutral-500 mt-1 font-medium ml-1">Define your new service offering</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-6 md:space-y-8">

                        <div className="max-w-2xl w-full mx-auto space-y-8">
                            <CustomInput
                                label="Service Title"
                                value={serviceData.title}
                                onChange={(e) => setServiceData({ ...serviceData, title: e.target.value })}
                                placeholder="e.g. Mixing & Mastering"
                                icon={<Type size={16} />}
                                autoFocus={window.innerWidth >= 768}
                            />

                            <div className="space-y-2 group">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider group-focus-within:text-primary transition-colors">Description</label>
                                <textarea
                                    value={serviceData.description}
                                    onChange={(e) => setServiceData({ ...serviceData, description: e.target.value })}
                                    className="w-full h-24 md:h-32 bg-neutral-900/50 border border-neutral-800 rounded-xl px-5 py-2.5 md:py-4 text-base md:text-sm text-white focus:border-primary/50 focus:outline-none focus:bg-neutral-900 resize-none transition-all placeholder:text-neutral-700 leading-relaxed"
                                    placeholder="Describe exactly what the client gets..."
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Pricing Model</label>
                                <div className="flex bg-neutral-900 p-1.5 rounded-xl border border-neutral-800 w-full sm:w-2/3">
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <CustomInput
                                    label={serviceData.rateType === 'hourly' ? 'Hourly Rate' : 'Total Price'}
                                    type="number"
                                    value={serviceData.price}
                                    onChange={(e) => setServiceData({ ...serviceData, price: parseFloat(e.target.value) })}
                                    icon={<DollarSign size={18} />}
                                    className="text-lg md:text-xl font-mono font-bold h-12"
                                    placeholder="0.00"
                                />

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">
                                        Delivery Timeline
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={serviceData.deliveryDays || ''}
                                            onChange={(e) => setServiceData({ ...serviceData, deliveryDays: parseInt(e.target.value) || 0 })}
                                            placeholder="3"
                                            className="w-full h-12 bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 text-white font-mono text-sm font-bold focus:border-primary/50 focus:outline-none transition-all placeholder:text-neutral-700"
                                            min="1"
                                        />
                                        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-600 uppercase">Days</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Features Included</label>

                                <div className="flex gap-3">
                                    <CustomInput
                                        value={newFeature}
                                        onChange={(e) => setNewFeature(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()}
                                        placeholder="Add a feature (e.g. '2 Revisions')"
                                        fullWidth
                                        className="h-12"
                                    />
                                    <button
                                        onClick={() => handleAddFeature()}
                                        className="px-5 h-12 bg-white text-black rounded-xl hover:bg-neutral-200 transition-colors shadow-lg shadow-white/5 flex items-center justify-center shrink-0 mt-[1.5px] md:mt-0 self-end"
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

                    </div>

                    <div className="p-4 md:p-6 border-t border-neutral-800 bg-neutral-900/30 flex justify-between items-center shrink-0">
                        <button onClick={handleInternalClose} className="px-6 py-3 rounded-xl text-xs font-bold text-neutral-500 hover:text-white transition-colors uppercase tracking-wider">Cancel</button>
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

                    <div className="relative z-10 w-full max-w-[340px]">
                        <div className="space-y-4 text-center mb-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Live Preview</span>
                            </div>
                        </div>

                        {/* PREVIEW CARD */}
                        <ServiceCard
                            service={serviceData}
                            user={{
                                id: 'preview',
                                username: 'You',
                                full_name: 'Your Name',
                                avatar_url: null
                            } as any} // Mocking profile for preview
                            isPreview={true}
                        />
                    </div>
                </div>

                <button
                    onClick={handleInternalClose}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full transition-all backdrop-blur-sm z-50 border border-transparent hover:border-neutral-700"
                >
                    <X size={20} />
                </button>

            </div>
        </div>
    );
};

export default CreateServiceModal;
