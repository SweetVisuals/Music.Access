import React, { useState } from 'react';
import { DollarSign, Clock, List, Plus, X, Sparkles, Type } from 'lucide-react';
import { createService } from '../services/supabaseService';
import { useNavigate } from 'react-router-dom'; // Assuming react-router is used, or we need a way to navigate back
import CustomInput from './CustomInput';

const PostServicePage: React.FC = () => {
    const [features, setFeatures] = useState<string[]>(['']);
    const [priceType, setPriceType] = useState<'fixed' | 'hourly'>('fixed');
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const addFeature = () => setFeatures([...features, '']);
    const removeFeature = (index: number) => setFeatures(features.filter((_, i) => i !== index));
    const updateFeature = (index: number, val: string) => {
        const newFeatures = [...features];
        newFeatures[index] = val;
        setFeatures(newFeatures);
    };

    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createService({
                title,
                description,
                price: parseFloat(price) || 0,
                features: features.filter(f => f.trim() !== '')
            });
            // Reset form or navigate away
            setTitle('');
            setPrice('');
            setDescription('');
            setFeatures(['']);
            alert('Service published successfully!');
        } catch (error) {
            console.error('Error publishing service:', error);
            alert('Failed to publish service.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto pb-48 pt-6 px-4 md:pt-12 md:px-6 animate-in fade-in duration-500">
            <div className="mb-10 text-center">
                <h1 className="text-2xl md:text-3xl font-black text-white mb-3">Post a Service</h1>
                <p className="text-neutral-500 text-sm">Offer your production skills to the world.</p>
            </div>

            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 md:p-8 shadow-2xl mb-20">
                <form className="space-y-6 md:space-y-8" onSubmit={handlePublish}>
                    {/* Title */}
                    <CustomInput
                        label="Service Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. I will mix and master your track"
                        icon={<Type size={16} />}
                        required
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Price */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Price</label>
                                <div className="flex bg-neutral-900 p-0.5 rounded border border-neutral-800">
                                    <button
                                        type="button"
                                        onClick={() => setPriceType('fixed')}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${priceType === 'fixed' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                                    >
                                        Fixed
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPriceType('hourly')}
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${priceType === 'hourly' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                                    >
                                        /Hr
                                    </button>
                                </div>
                            </div>
                            <CustomInput
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                icon={<DollarSign size={16} />}
                                placeholder={priceType === 'fixed' ? "150.00" : "50.00"}
                                required
                            />
                        </div>
                        {/* Delivery */}
                        <CustomInput
                            label="Delivery Time (Days)"
                            type="number"
                            icon={<Clock size={16} />}
                            placeholder="2"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white uppercase tracking-wider">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 300)}px`;
                            }}
                            className="w-full min-h-[128px] h-auto bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-white focus:border-primary/50 focus:outline-none resize-none custom-scrollbar"
                            placeholder="Describe exactly what you offer..."
                            required
                        />
                    </div>

                    {/* Features */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2"><List size={14} /> Included Features</label>
                        {features.map((feat, i) => (
                            <div key={i} className="flex gap-2">
                                <CustomInput
                                    value={feat}
                                    onChange={(e) => updateFeature(i, e.target.value)}
                                    placeholder="e.g. HQ Audio File"
                                    fullWidth
                                />
                                <button type="button" onClick={() => removeFeature(i)} className="p-2 text-neutral-500 hover:text-white hover:bg-white/5 rounded mt-auto h-[46px] transition-colors"><X size={16} /></button>
                            </div>
                        ))}
                        <button type="button" onClick={addFeature} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                            <Plus size={14} /> Add Feature
                        </button>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full md:w-auto px-8 py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Sparkles size={16} />
                            {loading ? 'Publishing...' : 'Publish Service'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PostServicePage;
