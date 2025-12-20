import React, { useState, useEffect } from 'react';
import { CalendarEvent, Strategy } from '../../types';
import { X, Calendar, Type, Link, AlignLeft, Layers, Smartphone } from 'lucide-react';

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
        campaignStrategy.data.campaign_list.forEach((c: any) => campaigns.push(c.name));
    }

    // Extract content buckets from Stage 6
    const contentBuckets: string[] = [];
    const bucketStrategy = strategies.find(s => s.stageId === 'stage-6');
    if (bucketStrategy?.data?.bucket_list) {
        bucketStrategy.data.bucket_list.forEach((b: any) => contentBuckets.push(b.name));
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#0a0a0a] border border-neutral-800 rounded-xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-neutral-800 bg-neutral-900/50">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        {existingEvent ? 'Edit Event' : 'New Event'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">

                    {/* Title */}
                    <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 flex items-center gap-1.5">
                            <Type size={10} /> Title
                        </label>
                        <input
                            type="text"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
                            placeholder="e.g. Teaser Video, Strategy Meeting..."
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* Type & Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 flex items-center gap-1.5">
                                <Layers size={10} /> Type
                            </label>
                            <select
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <option value="content">Content</option>
                                <option value="campaign">Campaign</option>
                                <option value="meeting">Meeting</option>
                                <option value="milestone">Milestone</option>
                                <option value="task">Task</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 flex items-center gap-1.5">
                                Status
                            </label>
                            <select
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 flex items-center gap-1.5">
                                <Calendar size={10} /> Start Date
                            </label>
                            <input
                                type="date"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 text-neutral-400"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 flex items-center gap-1.5">
                                End Date (Opt)
                            </label>
                            <input
                                type="date"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 text-neutral-400"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Platform (If Content) */}
                    {formData.type === 'content' && (
                        <div>
                            <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 flex items-center gap-1.5">
                                <Smartphone size={10} /> Platform
                            </label>
                            <select
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50"
                                value={formData.platform}
                                onChange={e => setFormData({ ...formData, platform: e.target.value as any })}
                            >
                                <option value="instagram">Instagram</option>
                                <option value="tiktok">TikTok</option>
                                <option value="youtube">YouTube</option>
                                <option value="spotify">Spotify</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    )}

                    {/* Context Linking */}
                    <div className="border-t border-neutral-800 pt-3 mt-1">
                        <h4 className="text-[10px] font-black text-white mb-2">Context & Strategy Link</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[8px] font-bold text-neutral-500 uppercase mb-1 block">Linked Campaign</label>
                                <select
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-primary/50"
                                    value={formData.linkedCampaign}
                                    onChange={e => setFormData({ ...formData, linkedCampaign: e.target.value })}
                                >
                                    <option value="">None</option>
                                    {campaigns.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[8px] font-bold text-neutral-500 uppercase mb-1 block">Content Bucket</label>
                                <select
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-primary/50"
                                    value={formData.contentBucket}
                                    onChange={e => setFormData({ ...formData, contentBucket: e.target.value })}
                                >
                                    <option value="">None</option>
                                    {contentBuckets.map((b, i) => <option key={i} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-bold text-neutral-400 uppercase mb-1 flex items-center gap-1.5">
                            <AlignLeft size={10} /> Description / Notes
                        </label>
                        <textarea
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[80px] resize-y"
                            placeholder="Add details..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-neutral-800 bg-neutral-900/30 flex justify-end gap-2">
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
