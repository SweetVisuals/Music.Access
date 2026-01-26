import React, { useState, useEffect } from 'react';
import { CalendarEvent, Strategy } from '../../types';
import { X, Calendar, Type, Link, AlignLeft, Layers, Smartphone, CheckCircle2, Clock, XCircle, Instagram, Youtube, Music2, Share2, Users, Award } from 'lucide-react';
import CustomDropdown from '../CustomDropdown';

interface CalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Partial<CalendarEvent>) => void;
    initialDate?: Date;
    existingEvent?: CalendarEvent;
    strategies: Strategy[]; // For linking to campaigns/content buckets
}

const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialDate,
    existingEvent,
    strategies
}) => {
    if (!isOpen) return null;

    // --- Derived Data for Dropdowns ---
    // Extract campaigns from Stage 5
    const campaigns: string[] = [];
    const campaignStrategy = strategies.find(s => s.stageId === 'stage-5');
    if (campaignStrategy?.data?.campaign_list) {
        campaignStrategy.data.campaign_list.forEach((c: any) => {
            if (c.name) campaigns.push(c.name);
        });
    }

    // Extract content buckets from Stage 6
    const contentBuckets: string[] = [];
    const bucketStrategy = strategies.find(s => s.stageId === 'stage-6');
    if (bucketStrategy?.data?.bucket_list) {
        bucketStrategy.data.bucket_list.forEach((b: any) => {
            if (b.name) contentBuckets.push(b.name);
        });
    }

    // --- State ---
    const [formData, setFormData] = useState({
        title: '',
        type: 'content' as CalendarEvent['type'],
        status: 'pending' as CalendarEvent['status'],
        startDate: '',
        endDate: '',
        description: '',
        platform: 'instagram' as any,
        linkedCampaign: '', // In metadata
        contentBucket: '' // In metadata
    });

    useEffect(() => {
        if (existingEvent) {
            setFormData({
                title: existingEvent.title,
                type: existingEvent.type,
                status: existingEvent.status,
                startDate: existingEvent.startDate.split('T')[0],
                endDate: existingEvent.endDate ? existingEvent.endDate.split('T')[0] : '',
                description: existingEvent.description || '',
                platform: existingEvent.platform || 'instagram',
                linkedCampaign: existingEvent.metadata?.linkedCampaign || '',
                contentBucket: existingEvent.metadata?.contentBucket || ''
            });
        } else {
            // New Event
            setFormData({
                title: '',
                type: 'content',
                status: 'pending',
                startDate: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                endDate: '',
                description: '',
                platform: 'instagram',
                linkedCampaign: '',
                contentBucket: ''
            });
        }
    }, [existingEvent, initialDate, isOpen]);

    const handleSubmit = () => {
        const payload: Partial<CalendarEvent> = {
            title: formData.title,
            type: formData.type,
            status: formData.status,
            startDate: new Date(formData.startDate).toISOString(),
            description: formData.description,
            platform: formData.platform,
            metadata: {
                linkedCampaign: formData.linkedCampaign,
                contentBucket: formData.contentBucket
            }
        };

        if (formData.endDate) {
            payload.endDate = new Date(formData.endDate).toISOString();
        }

        onSave(payload);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-xl md:p-4 animate-in fade-in duration-300">
            <div className="w-full h-full md:h-auto md:max-w-3xl bg-[#0a0a0a] md:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-300 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 md:py-3 bg-neutral-900/50 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white md:hidden">
                            <X size={24} />
                        </button>
                        <h3 className="text-lg md:text-base font-bold text-white flex items-center gap-2">
                            {existingEvent ? 'Edit Event' : 'New Event'}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="hidden md:flex p-1 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white">
                            <X size={18} />
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-6 md:px-4 py-2 md:py-1.5 rounded-full md:rounded-lg text-sm md:text-xs font-bold bg-primary text-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                        >
                            Save
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 md:p-4 space-y-6 md:space-y-3 overflow-y-auto custom-scrollbar flex-1 pb-32 md:pb-4">

                    {/* Title */}
                    <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase mb-2 md:mb-1 flex items-center gap-1.5">
                            <Type size={12} className="md:w-3 md:h-3" /> Title
                        </label>
                        <input
                            type="text"
                            className="w-full bg-neutral-900 rounded-xl md:rounded-lg px-4 py-3 md:px-2.5 md:py-1.5 text-base md:text-xs text-white focus:outline-none focus:bg-neutral-800 transition-colors"
                            placeholder="e.g. Teaser Video, Strategy Meeting..."
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:gap-3">
                        <CustomDropdown
                            label="Type"
                            value={formData.type}
                            onChange={(val) => setFormData({ ...formData, type: val as any })}
                            options={[
                                { value: 'content', label: 'Content', icon: <Smartphone size={14} /> },
                                { value: 'campaign', label: 'Campaign', icon: <Layers size={14} /> },
                                { value: 'meeting', label: 'Meeting', icon: <Users size={14} /> },
                                { value: 'milestone', label: 'Milestone', icon: <Award size={14} /> },
                                { value: 'task', label: 'Task', icon: <CheckCircle2 size={14} /> }
                            ]}
                        />
                        <CustomDropdown
                            label="Status"
                            value={formData.status}
                            onChange={(val) => setFormData({ ...formData, status: val as any })}
                            options={[
                                { value: 'pending', label: 'Pending', icon: <Clock size={14} /> },
                                { value: 'completed', label: 'Completed', icon: <CheckCircle2 size={14} className="text-green-500" /> },
                                { value: 'cancelled', label: 'Cancelled', icon: <XCircle size={14} className="text-red-500" /> }
                            ]}
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 md:gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-2 md:mb-1 flex items-center gap-1.5">
                                <Calendar size={12} className="md:w-3 md:h-3" /> Start Date
                            </label>
                            <input
                                type="date"
                                className="w-full bg-neutral-900 rounded-xl md:rounded-lg px-4 py-3 md:px-2.5 md:py-1.5 text-base md:text-xs text-white focus:outline-none focus:bg-neutral-800 transition-colors text-neutral-400"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-2 md:mb-1 flex items-center gap-1.5">
                                End Date (Opt)
                            </label>
                            <input
                                type="date"
                                className="w-full bg-neutral-900 rounded-xl md:rounded-lg px-4 py-3 md:px-2.5 md:py-1.5 text-base md:text-xs text-white focus:outline-none focus:bg-neutral-800 transition-colors text-neutral-400"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Platform (If Content) */}
                    {formData.type === 'content' && (
                        <div>
                            <CustomDropdown
                                label="Platform"
                                value={formData.platform}
                                onChange={(val) => setFormData({ ...formData, platform: val as any })}
                                options={[
                                    { value: 'instagram', label: 'Instagram', icon: <Instagram size={14} /> },
                                    { value: 'tiktok', label: 'TikTok', icon: <Share2 size={14} /> },
                                    { value: 'youtube', label: 'YouTube', icon: <Youtube size={14} /> },
                                    { value: 'spotify', label: 'Spotify', icon: <Music2 size={14} /> },
                                    { value: 'other', label: 'Other' }
                                ]}
                            />
                        </div>
                    )}

                    {/* Context Linking */}
                    <div className="pt-6 md:pt-3 mt-2 md:mt-1">
                        <h4 className="text-[10px] font-black text-white mb-4 md:mb-2 uppercase tracking-widest text-primary">Context & Strategy Link</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
                            <CustomDropdown
                                label="Linked Campaign"
                                value={formData.linkedCampaign}
                                onChange={(val) => setFormData({ ...formData, linkedCampaign: val })}
                                options={['None', ...campaigns]}
                                searchable
                            />
                            <CustomDropdown
                                label="Content Bucket"
                                value={formData.contentBucket}
                                onChange={(val) => setFormData({ ...formData, contentBucket: val })}
                                options={['None', ...contentBuckets]}
                                searchable
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase mb-2 md:mb-1 flex items-center gap-1.5">
                            <AlignLeft size={12} className="md:w-3 md:h-3" /> Description / Notes
                        </label>
                        <textarea
                            className="w-full bg-neutral-900 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-xs text-white focus:outline-none focus:bg-neutral-800 transition-colors min-h-[120px] md:min-h-[80px] resize-none"
                            placeholder="Add details..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>

                {/* Desktop Footer (Hidden on mobile as save is in header) */}
                <div className="hidden md:flex p-3 bg-neutral-900/30 justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-black hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        Save Event
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CalendarEventModal;
