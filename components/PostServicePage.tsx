import React, { useState, useEffect } from 'react';
import { DollarSign, Clock, Sparkles, Type, Check, Trash2, ArrowRight, User } from 'lucide-react';
import { createService, getCurrentUser, getUserProfile } from '../services/supabaseService';
import { useNavigate } from 'react-router-dom';
import CustomInput from './CustomInput';
import { UserProfile } from '../types';
import ServiceCard from './ServiceCard';

import { useToast } from '../contexts/ToastContext';

const PostServicePage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [features, setFeatures] = useState<string[]>(['High Quality Audio', '2 Revisions']);
    const [priceType, setPriceType] = useState<'fixed' | 'hourly'>('fixed');
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('49.99');
    const [description, setDescription] = useState('');
    const [deliveryDays, setDeliveryDays] = useState('3');
    const [loading, setLoading] = useState(false);
    const [newFeature, setNewFeature] = useState('');

    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const user = await getCurrentUser();
                if (user) {
                    const profile = await getUserProfile(user.id);
                    setCurrentUserProfile(profile);
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
            }
        };
        fetchUser();
    }, []);

    const handleAddFeature = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (newFeature.trim()) {
            setFeatures([...features, newFeature.trim()]);
            setNewFeature('');
        }
    };

    const removeFeature = (index: number) => {
        setFeatures(features.filter((_, i) => i !== index));
    };

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !price || !description) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        setLoading(true);
        try {
            await createService({
                title,
                description,
                price: parseFloat(price) || 0,
                rateType: priceType === 'fixed' ? 'flat' : 'hourly',
                features: features.filter(f => f.trim() !== ''),
                deliveryDays: parseInt(deliveryDays) || 3
            });

            navigate('/dashboard/manage');
            showToast('Service published successfully!', 'success');
        } catch (error) {
            console.error('Error publishing service:', error);
            showToast('Failed to publish service.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen bg-black -mt-[80px]">
            {/* Hero Section - Seamless Integration */}
            <div className="hidden lg:block relative w-full bg-neutral-900/40 pt-[90px] lg:pt-[120px] pb-6 lg:pb-10 px-4 lg:px-10 xl:px-14 backdrop-blur-sm">
                <div className="max-w-[1900px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                                Seller Studio
                            </span>
                        </div>
                        <h1 className="text-2xl lg:text-5xl font-black text-white mb-1 tracking-tighter">
                            Post a Service
                        </h1>
                        <p className="text-neutral-500 text-xs lg:text-base max-w-2xl leading-relaxed">
                            Create a professional service listing to offer your skills to artists.
                        </p>
                    </div>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full pointer-events-none" />
            </div>

            <div className="max-w-[1900px] mx-auto px-4 lg:px-10 xl:px-14 py-6 lg:py-10">
                <form onSubmit={handlePublish} className="flex flex-col lg:flex-row gap-6 lg:gap-10">

                    {/* LEFT COLUMN: Editor */}
                    <div className="flex-1 min-w-0 space-y-6">

                        {/* Card: Basic Details */}
                        <div className="bg-neutral-900/30 rounded-2xl p-5 lg:p-8 space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-neutral-800 rounded-lg text-white">
                                    <Type size={18} />
                                </div>
                                <h3 className="text-base lg:text-lg font-bold text-white">Service Essentials</h3>
                            </div>

                            <div className="space-y-6">
                                <CustomInput
                                    label="Service Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Professional Mixing & Mastering"
                                    required
                                    className="text-base lg:text-lg bg-black/40 focus:border-primary/50"
                                />

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">About This Service</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => {
                                            setDescription(e.target.value);
                                            e.target.style.height = '140px';
                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 300)}px`;
                                        }}
                                        className="w-full min-h-[140px] bg-black/40 border-transparent rounded-xl p-4 text-xs lg:text-sm text-white focus:border-primary/50 focus:bg-black/60 focus:outline-none transition-all resize-none placeholder:text-neutral-600 leading-relaxed"
                                        placeholder="Detailed description of what you provide..."
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card: Pricing & Delivery */}
                        <div className="bg-neutral-900/30 rounded-2xl p-5 lg:p-8 space-y-8">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-neutral-800 rounded-lg text-white">
                                    <DollarSign size={18} />
                                </div>
                                <h3 className="text-base lg:text-lg font-bold text-white">Pricing & Logistics</h3>
                            </div>

                            <div className="space-y-8">
                                {/* Row 1: Model Selection */}
                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Pricing Model</label>
                                    <div className="flex bg-black/40 p-1 rounded-xl w-full md:w-1/2">
                                        <button
                                            type="button"
                                            onClick={() => setPriceType('fixed')}
                                            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${priceType === 'fixed' ? 'bg-neutral-800 text-white shadow-sm border border-white/10' : 'text-neutral-500 hover:text-white'}`}
                                        >
                                            Fixed Price
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPriceType('hourly')}
                                            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${priceType === 'hourly' ? 'bg-neutral-800 text-white shadow-sm border border-white/10' : 'text-neutral-500 hover:text-white'}`}
                                        >
                                            Hourly Rate
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Inputs Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Price Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono">$</span>
                                            <input
                                                type="number"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full h-12 bg-black/40 border-transparent rounded-xl pl-8 pr-4 text-white font-mono text-base lg:text-lg focus:border-primary/50 focus:outline-none transition-all placeholder:text-neutral-700"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Delivery Timeline</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={deliveryDays}
                                                onChange={(e) => setDeliveryDays(e.target.value)}
                                                placeholder="3"
                                                className="w-full h-12 bg-black/40 border-transparent rounded-xl pl-10 pr-4 text-white font-mono text-base lg:text-lg focus:border-primary/50 focus:outline-none transition-all placeholder:text-neutral-700"
                                                required
                                                min="1"
                                            />
                                            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-600 uppercase">Days</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card: Features */}
                        <div className="bg-neutral-900/30 rounded-2xl p-5 lg:p-8 space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-neutral-800 rounded-lg text-white">
                                    <Check size={18} />
                                </div>
                                <h3 className="text-base lg:text-lg font-bold text-white">What's Included?</h3>
                            </div>

                            <div className="bg-black/20 rounded-xl p-4">
                                <div className="flex gap-2 mb-4 w-full">
                                    <input
                                        type="text"
                                        value={newFeature}
                                        onChange={(e) => setNewFeature(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                                        placeholder="Add feature..."
                                        className="flex-1 w-full min-w-0 h-10 lg:h-11 bg-black/50 border-transparent rounded-lg px-3 lg:px-4 text-xs lg:text-sm text-white focus:border-primary/50 focus:outline-none transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddFeature}
                                        className="px-4 lg:px-6 h-10 lg:h-11 bg-white hover:bg-neutral-200 text-black rounded-lg font-bold text-xs transition-all shadow-lg shadow-white/5 shrink-0"
                                    >
                                        Add
                                    </button>
                                </div>

                                {features.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {features.map((feat, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-neutral-900/80 rounded-lg group hover:bg-neutral-800 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 shrink-0">
                                                        <Check size={10} strokeWidth={4} />
                                                    </div>
                                                    <span className="text-xs text-neutral-300 font-medium">{feat}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFeature(i)}
                                                    className="p-1.5 text-neutral-600 hover:text-red-500 bg-transparent hover:bg-red-500/10 rounded transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border border-dashed border-white/10 rounded-lg">
                                        <p className="text-neutral-500 text-xs">List features to clarify your deliverables.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Preview */}
                    <div className="lg:w-[340px] xl:w-[380px] shrink-0">
                        <div className="sticky top-24 space-y-8">

                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Card Preview</h3>
                                <div className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] text-neutral-400 font-mono">
                                    Module Style
                                </div>
                            </div>

                            <ServiceCard
                                service={{
                                    title,
                                    description,
                                    price: parseFloat(price) || 0,
                                    rateType: priceType === 'fixed' ? 'flat' : 'hourly',
                                    features: features,
                                    deliveryDays: parseInt(deliveryDays) || 3
                                }}
                                user={currentUserProfile}
                                isPreview={true}
                            />

                            <button
                                onClick={handlePublish}
                                disabled={loading}
                                className="w-full py-4 bg-primary text-black font-black text-sm uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-all shadow-[0_4px_30px_rgba(var(--primary-rgb),0.5)] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 group hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {loading ? (
                                    <span className="animate-pulse">Publishing...</span>
                                ) : (
                                    <>
                                        Publish Live <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                                    </>
                                )}
                            </button>

                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PostServicePage;
