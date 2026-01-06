
import React, { useState, useEffect } from 'react';
import { User, Mail, Bell, Shield, Palette, Trash2, Save, Globe, Lock } from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfile, getCurrentUser } from '../services/supabaseService';
import CustomDropdown from './CustomDropdown';

interface SettingsPageProps {
    userProfile?: UserProfile | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ userProfile }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        marketing: false
    });
    const [language, setLanguage] = useState('English (US)');

    useEffect(() => {
        if (userProfile) {
            setProfile(userProfile);
        }
    }, [userProfile]);

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
                    location: profile.location,
                    website: profile.website,
                    is_public: profile.is_public
                });
                setMessage({ type: 'success', text: 'Profile updated successfully!' });

                // Force reload/re-fetch would be ideal here or strict state management
                // For now, we rely on the fact that we updated the DB.
                // In a perfect world, we'd callback to App.tsx to refetch.
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        const confirmed = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
        if (confirmed) {
            const doubleCheck = window.confirm("This will permanently delete all your tracks, projects, and data. Confirm deletion?");
            if (doubleCheck) {
                alert("Account deletion simulation: Account would be deleted here.");
            }
        }
    };

    if (!profile && !userProfile) {
        return (
            <div className="w-full max-w-4xl mx-auto pb-4 lg:pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
                <div className="text-white">Loading profile settings...</div>
            </div>
        );
    }

    // Use local state if active, otherwise prop (should be synced)
    const displayProfile = profile || userProfile;

    return (
        <div className="w-full max-w-4xl mx-auto pb-4 lg:pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
            <div className="mb-10">
                <h1 className="text-3xl font-black text-white mb-2">Settings</h1>
                <p className="text-neutral-500 text-sm">Manage your profile, preferences, and account security.</p>
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} text-xs font-bold`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-8">
                {/* Profile Settings */}
                <section className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="p-6 border-b border-neutral-800 bg-neutral-900/30 flex items-center gap-3 backdrop-blur-sm">
                        <User size={18} className="text-primary" />
                        <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Profile Information</h2>
                    </div>
                    {displayProfile && (
                        <div className="p-6 md:p-8 space-y-8 relative z-10">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                {/* Avatar Section - Centered on Mobile */}
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-32 h-32 rounded-full bg-neutral-900 border-2 border-neutral-800 relative group cursor-pointer overflow-hidden shadow-2xl shadow-primary/10">
                                        <img src={displayProfile.avatar || 'https://i.pravatar.cc/150?u=user'} alt="Avatar" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                            <span className="text-[10px] uppercase font-bold text-white tracking-widest">Change</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Section */}
                                <div className="flex-1 w-full space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2 group/input">
                                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-primary transition-colors">Display Name</label>
                                            <input
                                                value={displayProfile.username}
                                                onChange={(e) => setProfile({ ...displayProfile, username: e.target.value })}
                                                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm font-bold text-white focus:border-primary/50 focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all duration-300 placeholder:text-neutral-700"
                                                placeholder="Enter your name"
                                            />
                                        </div>
                                        <div className="space-y-2 group/input">
                                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-primary transition-colors">Handle</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm font-bold">@</span>
                                                <input
                                                    value={displayProfile.handle}
                                                    onChange={(e) => setProfile({ ...displayProfile, handle: e.target.value })}
                                                    className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg pl-8 pr-4 py-3 text-sm font-bold text-white focus:border-primary/50 focus:bg-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all duration-300"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 group/input">
                                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest group-focus-within/input:text-primary transition-colors">Bio</label>
                                        <textarea
                                            value={displayProfile.bio || ''}
                                            onChange={(e) => setProfile({ ...displayProfile, bio: e.target.value })}
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none h-24 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="p-4 bg-neutral-900/50 border-t border-neutral-800 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-4 py-2 bg-white text-black rounded-lg text-xs font-bold hover:bg-neutral-200 flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : <><Save size={14} /> Save Changes</>}
                        </button>
                    </div>
                </section>

                {/* Privacy Settings */}
                <section className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-neutral-800 bg-neutral-900/30 flex items-center gap-3">
                        <Lock size={18} className="text-purple-400" />
                        <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Privacy & Visibility</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-white mb-1">Public Profile</h3>
                                <p className="text-xs text-neutral-500">Allow your profile to be discovered in search and Browse Talent.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={displayProfile?.is_public ?? true} // Default to true if undefined
                                    onChange={(e) => setProfile({ ...displayProfile!, is_public: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    </div>
                </section>

                {/* Preferences */}
                <section className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-neutral-800 bg-neutral-900/30 flex items-center gap-3">
                        <Palette size={18} className="text-blue-400" />
                        <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Preferences</h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                                    <Bell size={14} /> Notifications
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-900/50 cursor-pointer hover:bg-neutral-900">
                                        <span className="text-sm text-neutral-300">Email Notifications</span>
                                        <input type="checkbox" checked={notifications.email} onChange={() => setNotifications(p => ({ ...p, email: !p.email }))} className="accent-primary" />
                                    </label>
                                    <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-900/50 cursor-pointer hover:bg-neutral-900">
                                        <span className="text-sm text-neutral-300">Push Notifications</span>
                                        <input type="checkbox" checked={notifications.push} onChange={() => setNotifications(p => ({ ...p, push: !p.push }))} className="accent-primary" />
                                    </label>
                                    <label className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-900/50 cursor-pointer hover:bg-neutral-900">
                                        <span className="text-sm text-neutral-300">Marketing Emails</span>
                                        <input type="checkbox" checked={notifications.marketing} onChange={() => setNotifications(p => ({ ...p, marketing: !p.marketing }))} className="accent-primary" />
                                    </label>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                                    <Globe size={14} /> Region & Language
                                </h3>
                                <div className="space-y-3">
                                    <CustomDropdown
                                        label="Language"
                                        value={language}
                                        onChange={setLanguage}
                                        options={[
                                            'English (US)',
                                            'English (UK)',
                                            'Spanish',
                                            'French',
                                            'German',
                                            'Japanese'
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Security */}
                <section className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-neutral-800 bg-neutral-900/30 flex items-center gap-3">
                        <Shield size={18} className="text-green-400" />
                        <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Security</h2>
                    </div>
                    <div className="p-8 space-y-4">
                        <div className="flex items-center justify-between p-4 bg-neutral-900/30 border border-neutral-800 rounded-lg">
                            <div>
                                <h3 className="text-sm font-bold text-white">Password</h3>
                                <p className="text-xs text-neutral-500">Last changed 3 months ago</p>
                            </div>
                            <button className="px-4 py-2 border border-neutral-700 rounded-lg text-xs font-bold text-white hover:bg-white/5">Change Password</button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-neutral-900/30 border border-neutral-800 rounded-lg">
                            <div>
                                <h3 className="text-sm font-bold text-white">Two-Factor Authentication</h3>
                                <p className="text-xs text-neutral-500">Add an extra layer of security to your account</p>
                            </div>
                            <button className="px-4 py-2 border border-neutral-700 rounded-lg text-xs font-bold text-white hover:bg-white/5">Enable 2FA</button>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-red-500/20 bg-red-500/10 flex items-center gap-3">
                        <Lock size={18} className="text-red-500" />
                        <h2 className="text-xs font-black text-red-500 uppercase tracking-[0.2em]">Danger Zone</h2>
                    </div>
                    <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h3 className="text-sm font-bold text-white mb-1">Delete Account</h3>
                            <p className="text-xs text-neutral-400 max-w-md">
                                Permanently remove your account and all of its contents from the MusicAccess platform. This action is not reversible, so please be certain.
                            </p>
                        </div>
                        <button
                            onClick={handleDeleteAccount}
                            className="px-6 py-3 bg-red-500 text-white font-bold rounded-lg text-xs hover:bg-red-600 transition-colors flex items-center gap-2 whitespace-nowrap shadow-lg shadow-red-500/20"
                        >
                            <Trash2 size={16} /> Delete Account
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SettingsPage;
