import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Bell, Shield, Palette, Trash2, Save, Globe, Lock, Check, X, Link as LinkIcon, Activity, Camera, Move, ArrowLeft, Music, Disc, Mic2, Box } from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfile, getCurrentUser, updatePassword, uploadFile, getUserProfile } from '../services/supabaseService';
import CustomDropdown from './CustomDropdown';
import ConfirmationModal from './ConfirmationModal';
import BannerPositionManager from './BannerPositionManager';
import { useToast } from '../contexts/ToastContext';

const PasswordChangeModal = ({ isOpen, onClose, showToast }: { isOpen: boolean; onClose: () => void; showToast: (msg: string, type: 'success' | 'error') => void }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast("New passwords do not match", "error");
            return;
        }
        if (newPassword.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }

        setLoading(true);
        try {
            await updatePassword(oldPassword, newPassword);
            showToast("Password updated successfully", "success");
            onClose();
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Failed to update password", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-3xl p-4 animate-in fade-in duration-500">
            <div className="w-full max-w-lg bg-black/80 backdrop-blur-md rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="p-8 pb-4 flex items-center justify-between">
                    <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-3">
                        <Lock size={16} className="text-emerald-400" />
                        Security Check
                    </h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2.5 rounded-full">
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2 group/input">
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-emerald-400 transition-colors pl-1">Current Password</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full bg-white/[0.02] border-none rounded-2xl px-5 py-4 text-sm font-bold text-white focus:bg-white/[0.04] focus:outline-none focus:ring-1 focus:ring-emerald-400/50 transition-all duration-300"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div className="space-y-2 group/input">
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-emerald-400 transition-colors pl-1">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-white/[0.02] border-none rounded-2xl px-5 py-4 text-sm font-bold text-white focus:bg-white/[0.04] focus:outline-none focus:ring-1 focus:ring-emerald-400/50 transition-all duration-300"
                            placeholder="At least 6 characters"
                            required
                        />
                    </div>
                    <div className="space-y-2 group/input">
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-emerald-400 transition-colors pl-1">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white/[0.02] border-none rounded-2xl px-5 py-4 text-sm font-bold text-white focus:bg-white/[0.04] focus:outline-none focus:ring-1 focus:ring-emerald-400/50 transition-all duration-300"
                            placeholder="Repeat new password"
                            required
                        />
                    </div>
                    <div className="pt-6 flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-transparent text-neutral-400 rounded-2xl text-xs font-bold hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-emerald-400 text-black rounded-2xl text-xs font-black hover:bg-emerald-300 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PRIMARY_ROLES = [
    'Artist', 'Producer', 'Engineer', 'DJ', 'Songwriter',
    'A&R', 'Label', 'Manager', 'Fan', 'Other'
];

const WORLD_LOCATIONS = [
    'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
    'France', 'Japan', 'Brazil', 'South Africa', 'India', 'Mexico',
    'Spain', 'Italy', 'Netherlands', 'Sweden', 'Argentina', 'Colombia',
    'Nigeria', 'South Korea', 'China', 'Russia', 'New Zealand', 'Ireland',
    'Switzerland', 'Belgium', 'Austria', 'Norway', 'Denmark', 'Finland',
    'Portugal', 'Greece', 'Turkey', 'Poland', 'Ukraine', 'Other'
];

interface SettingsPageProps {
    userProfile?: UserProfile | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ userProfile }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    // Expanded Settings States
    const [notifications, setNotifications] = useState({ email: true, push: true, marketing: false, updates: true });
    const [language, setLanguage] = useState('English (US)');
    const [socialLinks, setSocialLinks] = useState({ instagram: '', twitter: '', soundcloud: '' });

    // File upload refs
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [isBannerAdjustOpen, setIsBannerAdjustOpen] = useState(false);

    // Simulate a cover image for the banner preview
    const defaultCover = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=2674&auto=format&fit=crop';

    useEffect(() => {
        if (userProfile) {
            setProfile(userProfile);
        }
    }, [userProfile]);

    useEffect(() => {
        if (!userProfile || !profile) {
            setHasUnsavedChanges(false);
            return;
        }

        const isDifferent =
            (profile.username || '') !== (userProfile.username || '') ||
            (profile.handle || '') !== (userProfile.handle || '') ||
            (profile.bio || '') !== (userProfile.bio || '') ||
            (profile.role || '') !== (userProfile.role || '') ||
            (profile.location || '') !== (userProfile.location || '') ||
            (profile.website || '') !== (userProfile.website || '') ||
            (profile.yearsExperience || '') !== (userProfile.yearsExperience || '') ||
            (profile.avgTurnaround || '') !== (userProfile.avgTurnaround || '') ||
            (profile.is_public !== userProfile.is_public) ||
            JSON.stringify(profile.visible_tabs || []) !== JSON.stringify(userProfile.visible_tabs || []);

        setHasUnsavedChanges(isDifferent);
    }, [profile, userProfile]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'banner' | 'avatar') => {
        if (!profile) return;
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const previewUrl = URL.createObjectURL(file);
            setProfile(prev => prev ? ({ ...prev, [field]: previewUrl }) : null);

            try {
                const { publicUrl } = await uploadFile(file);
                const currentUser = await getCurrentUser();
                if (currentUser) {
                    await updateUserProfile(currentUser.id, { [field]: publicUrl });
                    const refreshedProfile = await getUserProfile();
                    if (refreshedProfile) {
                        setProfile(refreshedProfile);
                    }
                    window.dispatchEvent(new CustomEvent('storage-updated'));
                    showToast(`${field === 'banner' ? 'Cover' : 'Avatar'} updated successfully`, "success");
                }
            } catch (error: any) {
                console.error('Error uploading file:', error);
                showToast(`Failed to upload ${field}: ${error.message || 'Unknown error'}`, "error");
                setProfile(prev => prev ? ({ ...prev, [field]: profile[field] || '' }) : null);
            }
        }
    };

    const triggerBannerUpload = () => bannerInputRef.current?.click();
    const triggerAvatarUpload = () => avatarInputRef.current?.click();

    const handleSave = async () => {
        if (!profile) return;
        setLoading(true);
        setMessage(null);

        try {
            const user = await getCurrentUser();
            if (user) {
                await updateUserProfile(user.id, {
                    username: profile.username,
                    handle: profile.handle,
                    bio: profile.bio,
                    is_public: profile.is_public,
                    role: profile.role,
                    location: profile.location,
                    website: profile.website,
                    yearsExperience: profile.yearsExperience,
                    satisfactionRate: profile.satisfactionRate,
                    avgTurnaround: profile.avgTurnaround,
                    visible_tabs: profile.visible_tabs
                });

                const refreshedProfile = await getUserProfile();
                if (refreshedProfile) {
                    setProfile(refreshedProfile);
                    setHasUnsavedChanges(false);
                }

                window.dispatchEvent(new CustomEvent('profile-updated'));
                setMessage({ type: 'success', text: 'Profile updated successfully.' });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        showToast("Account deletion initiated.", "info");
    };

    if (!profile && !userProfile) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center animate-in fade-in duration-500">
                <div className="text-neutral-500 font-mono text-xs uppercase tracking-widest">Loading settings...</div>
            </div>
        );
    }

    const displayProfile = profile || userProfile;

    return (
        <div className="relative w-full -mt-4 lg:-mt-12 animate-in fade-in duration-500 min-h-screen overflow-x-hidden">

            {isBannerAdjustOpen && displayProfile.banner && (
                <BannerPositionManager
                    imageUrl={displayProfile.banner}
                    initialSettings={displayProfile.bannerSettings as any}
                    onSave={async (settings) => {
                        setProfile(prev => prev ? ({ ...prev, bannerSettings: settings }) : null);
                        setIsBannerAdjustOpen(false);
                        try {
                            const currentUser = await getCurrentUser();
                            if (currentUser) {
                                await updateUserProfile(currentUser.id, { bannerSettings: settings });
                                showToast("Banner position saved", "success");
                            }
                        } catch (error) {
                            console.error("Failed to save banner position", error);
                        }
                    }}
                    onCancel={() => setIsBannerAdjustOpen(false)}
                />
            )}

            {/* Hidden Inputs for File Upload */}
            <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
            <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />

            <div className="w-full max-w-[1900px] mx-auto px-4 lg:px-10 xl:px-14 pb-20 lg:pb-12 pt-[30px]">

                {/* Standardized Profile Header Preview */}
                <div className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-transparent mb-6 shadow-xl w-full group/header">

                    {/* Back to Profile Button Layer */}
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 z-30 pointer-events-auto">
                        <button
                            onClick={() => navigate(userProfile?.handle ? `/@${userProfile.handle}` : '/profile')}
                            className="flex items-center gap-2 text-[10px] font-black text-white/70 hover:text-white uppercase tracking-widest transition-colors w-fit group bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-black/60"
                        >
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Profile
                        </button>
                    </div>

                    {/* Banner Background */}
                    <div
                        className="absolute inset-0 w-full h-full bg-[#0a0a0a] z-0 cursor-pointer group/banner"
                        onClick={triggerBannerUpload}
                    >
                        {displayProfile.banner ? (
                            <div className="w-full h-full relative">
                                <img
                                    src={displayProfile.banner}
                                    className="w-full h-full object-cover transition-all duration-700 group-hover/banner:opacity-50 group-hover/banner:scale-105"
                                    alt="Banner"
                                    style={(() => {
                                        const s = displayProfile.bannerSettings;
                                        if (!s) return {};
                                        let set;
                                        if ('desktop' in s) {
                                            const isMobile = window.innerWidth < 1024;
                                            set = isMobile ? s.mobile : s.desktop;
                                        } else {
                                            set = s as any;
                                        }
                                        return {
                                            objectPosition: `${set.x}% ${set.y}%`,
                                            transform: set.scale !== 1 ? `scale(${set.scale})` : undefined
                                        };
                                    })()}
                                />
                                {/* Gradient Overlay for Text Readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent opacity-90" />
                            </div>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#111111] via-[#0a0a0a] to-black"></div>
                        )}

                        {/* Hover Overlay Desktop */}
                        <div className="absolute inset-0 hidden md:flex items-center justify-center gap-4 opacity-0 group-hover/banner:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-sm z-20">
                            <button onClick={(e) => { e.stopPropagation(); triggerBannerUpload(); }} className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-all">
                                <Camera size={16} /> Update Image
                            </button>
                            {displayProfile.banner && (
                                <button onClick={(e) => { e.stopPropagation(); setIsBannerAdjustOpen(true); }} className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full font-bold text-xs flex items-center gap-2 backdrop-blur-md transition-all">
                                    <Move size={16} /> Adjust Position
                                </button>
                            )}
                        </div>

                        {/* Mobile Overlay Actions */}
                        <div className="absolute top-4 right-4 md:hidden z-30 flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); triggerBannerUpload(); }} className="p-2.5 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white rounded-full shadow-lg">
                                <Camera size={16} />
                            </button>
                            {displayProfile.banner && (
                                <button onClick={(e) => { e.stopPropagation(); setIsBannerAdjustOpen(true); }} className="p-2.5 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white rounded-full shadow-lg">
                                    <Move size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Profile Content Layer */}
                    <div className="relative z-10 px-4 md:px-8 pb-4 md:pb-8 pt-[72px] md:pt-32 flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-8 pointer-events-none">

                        {/* Avatar */}
                        <div
                            className="relative z-30 shrink-0 rounded-2xl md:rounded-3xl p-1 md:p-1.5 bg-[#0a0a0a] shadow-2xl pointer-events-auto md:translate-y-6 cursor-pointer group/avatar"
                            onClick={triggerAvatarUpload}
                        >
                            <div className="h-24 w-24 md:h-44 md:w-44 rounded-xl md:rounded-2xl bg-neutral-800 border-none overflow-hidden relative">
                                <img src={displayProfile.avatar || 'https://i.pravatar.cc/300?u=user'} alt="Avatar" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                    <Camera size={28} className="text-white drop-shadow-lg" />
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pb-2 flex flex-col md:flex-row justify-between items-end gap-4 md:gap-6 w-full pointer-events-auto">
                            <div className="w-full md:w-auto mt-2 md:mt-0 md:translate-y-6 drop-shadow-2xl">
                                <div className="flex items-center gap-2 md:gap-3 mb-1">
                                    <h1 className="text-2xl md:text-5xl font-black text-white tracking-tight leading-none">{displayProfile.username || 'Ghost'}</h1>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-2 text-sm text-neutral-400 mt-1 md:mt-2">
                                    <span className="font-mono text-primary font-bold text-sm md:text-base tracking-[0.05em] uppercase">@{displayProfile.handle || 'unknown'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-24 mt-6">

                    {/* Header Context */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-none mt-16 md:mt-24">
                        <div>
                            <h2 className="text-2xl lg:text-4xl font-black text-white tracking-tighter mb-3">Settings</h2>
                            <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed font-medium">Manage your account preferences, profile details, and system settings.</p>
                        </div>
                        {message && (
                            <div className={`px-6 py-4 rounded-full backdrop-blur-xl ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'} text-xs font-black tracking-widest flex items-center gap-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]`}>
                                {message.type === 'success' ? <Check size={16} /> : <X size={16} />}
                                {message.text}
                            </div>
                        )}
                    </div>

                    {/* Grid Layout taking advantage of wide viewport */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 lg:gap-20">

                        {/* Left Column: Core Identity & Links - 7 Cols */}
                        <div className="xl:col-span-7 space-y-20">

                            {/* Identity Sector */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/[0.02] rounded-2xl text-primary"><User size={20} /></div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Profile Information</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3 group/input">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-primary transition-colors pl-2">Display Name</label>
                                        <input
                                            value={displayProfile.username}
                                            onChange={(e) => setProfile({ ...displayProfile, username: e.target.value })}
                                            className="w-full bg-white/[0.02] border-none rounded-[2rem] px-6 py-5 text-base font-bold text-white focus:bg-white/[0.05] focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all duration-300 placeholder:text-neutral-700"
                                            placeholder="Artist Name"
                                        />
                                    </div>
                                    <div className="space-y-3 group/input">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-primary transition-colors pl-2">Username</label>
                                        <div className="relative">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-neutral-600 font-bold">@</span>
                                            <input
                                                value={displayProfile.handle}
                                                onChange={(e) => setProfile({ ...displayProfile, handle: e.target.value })}
                                                className="w-full bg-white/[0.02] border-none rounded-[2rem] pl-12 pr-6 py-5 text-base font-bold text-white focus:bg-white/[0.05] focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all duration-300"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3 group/input md:col-span-2">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-primary transition-colors pl-2">Bio</label>
                                        <textarea
                                            value={displayProfile.bio || ''}
                                            onChange={(e) => setProfile({ ...displayProfile, bio: e.target.value })}
                                            className="w-full bg-white/[0.02] border-none rounded-[2rem] px-6 py-5 text-base font-medium text-white focus:bg-white/[0.05] focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all duration-300 h-40 resize-none leading-relaxed"
                                            placeholder="Tell us about yourself..."
                                        />
                                    </div>

                                    {/* Additional Identity Inputs */}
                                    <div className="space-y-3 group/input">
                                        <CustomDropdown
                                            label="Primary Role"
                                            value={displayProfile.role || ''}
                                            options={['', ...PRIMARY_ROLES]}
                                            onChange={(val) => setProfile({ ...displayProfile, role: val })}
                                            placeholder="Select Role"
                                            buttonClassName="!bg-white/[0.02] !rounded-[2rem] !px-6 !py-5 !text-base !font-bold hover:!bg-white/[0.05] focus:!ring-1 focus:!ring-primary/50"
                                        />
                                    </div>
                                    <div className="space-y-3 group/input">
                                        <CustomDropdown
                                            label="Location"
                                            value={displayProfile.location || ''}
                                            options={['', ...WORLD_LOCATIONS]}
                                            onChange={(val) => setProfile({ ...displayProfile, location: val })}
                                            placeholder="Select Country"
                                            searchable
                                            buttonClassName="!bg-white/[0.02] !rounded-[2rem] !px-6 !py-5 !text-base !font-bold hover:!bg-white/[0.05] focus:!ring-1 focus:!ring-primary/50"
                                        />
                                    </div>
                                    <div className="space-y-3 group/input">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-primary transition-colors pl-2">Website</label>
                                        <input
                                            value={displayProfile.website || ''}
                                            onChange={(e) => setProfile({ ...displayProfile, website: e.target.value })}
                                            className="w-full bg-white/[0.02] border-none rounded-[2rem] px-6 py-5 text-base font-bold text-white focus:bg-white/[0.05] focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all duration-300 placeholder:text-neutral-700"
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div className="space-y-3 group/input">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-primary transition-colors pl-2">Years Exp.</label>
                                        <input
                                            value={displayProfile.yearsExperience || ''}
                                            onChange={(e) => setProfile({ ...displayProfile, yearsExperience: e.target.value })}
                                            className="w-full bg-white/[0.02] border-none rounded-[2rem] px-6 py-5 text-base font-bold text-white focus:bg-white/[0.05] focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all duration-300 placeholder:text-neutral-700"
                                            placeholder="e.g. 5+"
                                        />
                                    </div>
                                    <div className="space-y-3 group/input">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-primary transition-colors pl-2">Satisfaction (Computed)</label>
                                        <input
                                            value={displayProfile.satisfactionRate || '100%'}
                                            readOnly
                                            title="Computed from order deliverability and dispute ratio"
                                            className="w-full bg-white/[0.01] border-none rounded-[2rem] px-6 py-5 text-base font-bold text-neutral-500 focus:outline-none transition-all duration-300 cursor-not-allowed"
                                            placeholder="e.g. 100%"
                                        />
                                    </div>
                                    <div className="space-y-3 group/input">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-primary transition-colors pl-2">Avg. Turnaround</label>
                                        <input
                                            value={displayProfile.avgTurnaround || ''}
                                            onChange={(e) => setProfile({ ...displayProfile, avgTurnaround: e.target.value })}
                                            className="w-full bg-white/[0.02] border-none rounded-[2rem] px-6 py-5 text-base font-bold text-white focus:bg-white/[0.05] focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all duration-300 placeholder:text-neutral-700"
                                            placeholder="e.g. 24h"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Social Integrations Sector */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/[0.02] rounded-2xl text-blue-400"><LinkIcon size={20} /></div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Social Links</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3 group/input">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-blue-400 transition-colors pl-2">Instagram URL</label>
                                        <input
                                            value={socialLinks.instagram}
                                            onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                                            className="w-full bg-white/[0.02] border-none rounded-[2rem] px-6 py-5 text-sm font-medium text-white focus:bg-white/[0.05] focus:ring-1 focus:ring-blue-400/50 focus:outline-none transition-all duration-300"
                                            placeholder="instagram.com/..."
                                        />
                                    </div>
                                    <div className="space-y-3 group/input">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-blue-400 transition-colors pl-2">Twitter / X URL</label>
                                        <input
                                            value={socialLinks.twitter}
                                            onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                                            className="w-full bg-white/[0.02] border-none rounded-[2rem] px-6 py-5 text-sm font-medium text-white focus:bg-white/[0.05] focus:ring-1 focus:ring-blue-400/50 focus:outline-none transition-all duration-300"
                                            placeholder="x.com/..."
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Profile Layout Section */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/[0.02] rounded-2xl text-primary"><Box size={20} /></div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Profile Layout</h3>
                                </div>

                                <div className="bg-white/[0.02] rounded-[2rem] p-4 flex flex-col gap-2">
                                    {[
                                        { id: 'beat_tapes', label: 'Beat Tapes', icon: <Music size={14} /> },
                                        { id: 'releases', label: 'Releases', icon: <Disc size={14} /> },
                                        { id: 'services', label: 'Services', icon: <Mic2 size={14} /> },
                                        { id: 'sound_packs', label: 'Sound Kits', icon: <Box size={14} /> }
                                    ].map((tab) => {
                                        const isVisible = profile?.visible_tabs ? profile.visible_tabs.includes(tab.id) : true;
                                        return (
                                            <div
                                                key={tab.id}
                                                onClick={() => {
                                                    const currentTabs = profile?.visible_tabs || ['beat_tapes', 'releases', 'services', 'sound_packs'];
                                                    const nextTabs = isVisible
                                                        ? currentTabs.filter(t => t !== tab.id)
                                                        : [...currentTabs, tab.id];
                                                    setProfile({ ...profile!, visible_tabs: nextTabs });
                                                }}
                                                className="flex items-center justify-between p-6 sm:p-8 cursor-pointer hover:bg-white/[0.02] transition-colors rounded-3xl group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className={`transition-colors ${isVisible ? 'text-primary' : 'text-neutral-600'}`}>
                                                        {tab.icon}
                                                    </span>
                                                    <span className={`text-sm font-bold transition-colors ${isVisible ? 'text-white' : 'text-neutral-500'}`}>
                                                        {tab.label}
                                                    </span>
                                                </div>
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${isVisible ? 'bg-primary text-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]' : 'bg-black/50 group-hover:bg-white/10'}`}>
                                                    {isVisible && <Check size={14} strokeWidth={4} />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Preferences, Security, System - 5 Cols */}
                        <div className="xl:col-span-5 space-y-20">

                            {/* Privacy & Notifications */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/[0.02] rounded-2xl text-amber-400"><Activity size={20} /></div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Privacy & Notifications</h3>
                                </div>

                                <div className="bg-white/[0.02] rounded-[2rem] p-4 flex flex-col gap-2">
                                    {/* Public Access Toggle */}
                                    <div className="flex items-center justify-between p-6 sm:p-8 hover:bg-white/[0.02] transition-colors rounded-3xl">
                                        <div className="pr-8">
                                            <h3 className="text-sm font-black text-white mb-2">Public Profile</h3>
                                            <p className="text-xs text-neutral-500 leading-relaxed font-medium">Allow your profile to be discovered in search and Browse Talent.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer overflow-hidden rounded-full shrink-0">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={displayProfile?.is_public ?? true}
                                                onChange={(e) => setProfile({ ...displayProfile!, is_public: e.target.checked })}
                                            />
                                            <div className="w-14 h-8 bg-black/60 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-neutral-500 after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-400 peer-checked:after:bg-black shadow-inner"></div>
                                        </label>
                                    </div>

                                    <div className="h-px w-full bg-white/[0.02]"></div>

                                    {/* Custom Notification Switches */}
                                    <div
                                        onClick={() => setNotifications(p => ({ ...p, push: !p.push }))}
                                        className="flex items-center justify-between p-6 sm:p-8 cursor-pointer hover:bg-white/[0.02] transition-colors rounded-3xl group"
                                    >
                                        <span className="text-sm font-bold text-neutral-400 group-hover:text-white transition-colors">OS Push Notifications</span>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${notifications.push ? 'bg-amber-400 text-black shadow-[0_0_15px_rgb(var(--primary)/0.6)]' : 'bg-black/50 group-hover:bg-white/10'}`}>
                                            {notifications.push && <Check size={14} strokeWidth={4} />}
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => setNotifications(p => ({ ...p, email: !p.email }))}
                                        className="flex items-center justify-between p-6 sm:p-8 cursor-pointer hover:bg-white/[0.02] transition-colors rounded-3xl group"
                                    >
                                        <span className="text-sm font-bold text-neutral-400 group-hover:text-white transition-colors">Digest Emails</span>
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ${notifications.email ? 'bg-amber-400 text-black shadow-[0_0_15px_rgb(var(--primary)/0.6)]' : 'bg-black/50 group-hover:bg-white/10'}`}>
                                            {notifications.email && <Check size={14} strokeWidth={4} />}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Security Infrastructure */}
                            <section className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/[0.02] rounded-2xl text-emerald-400"><Shield size={20} /></div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Security</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-8 bg-white/[0.02] hover:bg-white/[0.04] transition-colors rounded-[2rem] gap-6">
                                        <div>
                                            <h3 className="text-sm font-black text-white mb-2">Password</h3>
                                            <p className="text-xs text-neutral-500 max-w-[200px]">Update your account password.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowPasswordModal(true)}
                                            className="px-6 py-3 bg-white/5 rounded-2xl text-xs font-black text-white uppercase tracking-widest hover:bg-emerald-400 hover:text-black transition-all shrink-0"
                                        >
                                            Change Password
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Obliteration */}
                            <section className="space-y-8 pt-12">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-8 sm:p-10 bg-red-500/[0.02] hover:bg-red-500/[0.05] transition-colors rounded-[3rem] gap-8 group">
                                    <div>
                                        <h3 className="text-lg font-black text-red-500 mb-2 flex items-center gap-3">
                                            <Trash2 size={24} /> Delete Account
                                        </h3>
                                        <p className="text-sm text-neutral-500 max-w-sm font-medium">
                                            Permanently delete your profile and all associated data. This action cannot be undone.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="w-full sm:w-auto px-8 py-5 bg-red-500/10 text-red-500 font-black rounded-3xl text-xs uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-2xl shrink-0"
                                    >
                                        Delete Account
                                    </button>
                                </div>
                            </section>

                        </div>
                    </div>
                </div>

                {/* Global Actions */}
                <div className={`fixed bottom-20 lg:bottom-0 left-0 w-full p-4 lg:p-10 pointer-events-none z-[160] flex justify-end transition-all duration-500 transform ${hasUnsavedChanges ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`${hasUnsavedChanges ? 'pointer-events-auto' : 'pointer-events-none'} px-8 md:px-10 py-4 md:py-5 bg-primary text-black rounded-full text-sm font-black uppercase tracking-widest hover:bg-primary/90 flex items-center gap-3 transition-all disabled:opacity-50 shadow-[0_20px_50px_rgba(var(--primary),0.4)] hover:scale-105 active:scale-95`}
                    >
                        {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                    </button>
                </div>

                {/* Account Deletion Confirmation Modal */}
                <ConfirmationModal
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleDeleteAccount}
                    title="Confirm Account Deletion"
                    message="Are you sure you want to permanently delete your account? This action cannot be undone."
                    confirmLabel="Delete Account"
                    cancelLabel="Cancel"
                    isDestructive={true}
                />

                <PasswordChangeModal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    showToast={showToast}
                />
            </div>
        </div>
    );
};

export default SettingsPage;
