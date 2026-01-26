
import React, { useState } from 'react';

import { X, Mail, Lock, Music, Mic2, Settings, CheckCircle, Briefcase, Headphones, Globe } from 'lucide-react';
import { signUp, signIn } from '../services/supabaseService';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
}

type AuthMode = 'login' | 'signup';
type Role = 'artist' | 'producer' | 'engineer' | 'professional' | 'listener' | 'platform';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [step, setStep] = useState(1);
    const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [handle, setHandle] = useState('');

    if (!isOpen) return null;

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await signIn(email, password);
            onLogin();
            onClose();
        } catch (err: any) {
            console.error('Login error details:', err);
            if (err.message && err.message.toLowerCase().includes('email not confirmed')) {
                setError('Please verify your email address. Check your inbox for the confirmation link.');
            } else {
                setError(err.message || `Login failed: ${err.status || 'Unknown error'}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async () => {
        if (!email || !password || !username || !handle) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Join roles with comma
            const roleString = selectedRoles.join(',');
            // signUp service throws on error, returns data directly
            const data = await signUp(email, password, username, handle, roleString || 'listener');

            if (data.user && !data.session) {
                // Email confirmation required
                setSuccess('Please check your email for confirmation. Once confirmed, you can log in.');
                switchMode('login'); // Switch to login view so they can log in after confirming
                return;
            }

            // After signup, automatically log in ONLY if session exists (no confirmation needed)
            if (data.session) {
                await signIn(email, password);
                onLogin();
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignupNext = () => {
        if (step === 1 && selectedRoles.length > 0) {
            setStep(2);
        } else if (step === 2) {
            handleSignup();
        }
    };

    const toggleRole = (role: Role) => {
        if (role === 'platform') {
            // If Platform is selected, it must be the only one
            if (selectedRoles.includes('platform')) {
                setSelectedRoles([]);
            } else {
                setSelectedRoles(['platform']);
            }
        } else {
            // If any other role is selected, remove Platform if present
            let newRoles = selectedRoles.filter(r => r !== 'platform');

            if (newRoles.includes(role)) {
                newRoles = newRoles.filter(r => r !== role);
            } else {
                newRoles.push(role);
            }
            setSelectedRoles(newRoles);
        }
    };

    // Reset state when switching modes
    const switchMode = (m: AuthMode) => {
        setMode(m);
        setStep(1);
        setSelectedRoles([]);
        setError(null);
        setSuccess(null);
        setEmail('');
        setPassword('');
        setUsername('');
        setHandle('');
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto">
            <div className="w-full max-w-[440px] bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] shadow-2xl flex flex-col relative max-h-[95vh] overflow-hidden my-auto">

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-neutral-500 hover:text-white transition-colors z-20 hover:scale-110 active:scale-95"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="pt-8 px-10 pb-4 flex flex-col items-center">
                    <div className="relative h-[38px] flex items-center mb-6">
                        <img
                            src="/images/MUSIC ACCESS-Photoroom.png"
                            alt="Music Access"
                            className="h-full w-auto object-contain brightness-110"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center p-1 bg-white/5 rounded-xl w-full max-w-[240px]">
                        <button
                            onClick={() => switchMode('login')}
                            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all duration-300 ${mode === 'login' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-neutral-500 hover:text-white'}`}
                        >
                            LOGIN
                        </button>
                        <button
                            onClick={() => switchMode('signup')}
                            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all duration-300 ${mode === 'signup' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-neutral-500 hover:text-white'}`}
                        >
                            SIGN UP
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="px-10 pb-4">
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium py-3 px-4 rounded-xl text-center">
                            {error}
                        </div>
                    </div>
                )}

                {success && (
                    <div className="px-10 pb-4">
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-medium py-3 px-4 rounded-xl text-center">
                            {success}
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="px-10 pb-10 overflow-y-auto custom-scrollbar">
                    {mode === 'login' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-primary/40 focus:bg-white/[0.05] focus:outline-none transition-all placeholder-neutral-700 font-medium"
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-primary/40 focus:bg-white/[0.05] focus:outline-none transition-all placeholder-neutral-700 font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleLogin}
                                disabled={isLoading || !email || !password}
                                className="w-full py-4 bg-primary text-black font-black rounded-2xl text-[11px] hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
                            >
                                {isLoading ? 'Authenticating...' : 'Login Account'}
                            </button>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-right-2 duration-500">
                            {step === 1 && (
                                <div>
                                    <div className="text-center mb-4">
                                        <h3 className="text-[11px] font-black text-white uppercase tracking-wider">Choose your role</h3>
                                        <p className="text-[9px] text-neutral-500 mt-1 uppercase tracking-widest font-medium">Select multiple</p>
                                    </div>

                                    {/* Ultra Compact Role Grid */}
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <RoleCard
                                            icon={<Mic2 size={14} />}
                                            label="ARTIST"
                                            active={selectedRoles.includes('artist')}
                                            onClick={() => toggleRole('artist')}
                                        />
                                        <RoleCard
                                            icon={<Music size={14} />}
                                            label="PRODUCER"
                                            active={selectedRoles.includes('producer')}
                                            onClick={() => toggleRole('producer')}
                                        />
                                        <RoleCard
                                            icon={<Settings size={14} />}
                                            label="ENGINEER"
                                            active={selectedRoles.includes('engineer')}
                                            onClick={() => toggleRole('engineer')}
                                        />
                                        <RoleCard
                                            icon={<Briefcase size={14} />}
                                            label="BUSINESS"
                                            active={selectedRoles.includes('professional')}
                                            onClick={() => toggleRole('professional')}
                                        />
                                        <RoleCard
                                            icon={<Headphones size={14} />}
                                            label="LISTENER"
                                            active={selectedRoles.includes('listener')}
                                            onClick={() => toggleRole('listener')}
                                        />
                                        <RoleCard
                                            icon={<Globe size={14} />}
                                            label="OTHER"
                                            active={selectedRoles.includes('platform')}
                                            onClick={() => toggleRole('platform')}
                                        />
                                    </div>

                                    <button
                                        onClick={handleSignupNext}
                                        disabled={selectedRoles.length === 0}
                                        className="w-full py-3 bg-white text-black font-black rounded-xl text-[10px] hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                                    >
                                        Continue
                                    </button>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-500">
                                    <div className="text-center mb-4">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] border border-primary/20 bg-primary/10 px-4 py-1.5 rounded-full">
                                            Create your identity
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <input className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary/40 focus:outline-none placeholder-neutral-700 transition-all font-medium" placeholder="First Name" />
                                        <input className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary/40 focus:outline-none placeholder-neutral-700 transition-all font-medium" placeholder="Last Name" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary/40 focus:outline-none placeholder-neutral-700 transition-all font-medium"
                                            placeholder="Username"
                                        />
                                        <input
                                            value={handle}
                                            onChange={(e) => setHandle(e.target.value)}
                                            className="bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary/40 focus:outline-none placeholder-neutral-700 transition-all font-medium"
                                            placeholder="@handle"
                                        />
                                    </div>
                                    <input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary/40 focus:outline-none placeholder-neutral-700 transition-all font-medium"
                                        placeholder="Email Address"
                                    />
                                    <input
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary/40 focus:outline-none placeholder-neutral-700 transition-all font-medium"
                                        type="password"
                                        placeholder="Password"
                                    />

                                    <div className="pt-2">
                                        <button
                                            onClick={handleSignup}
                                            disabled={isLoading || !email || !password || !username || !handle}
                                            className="w-full py-4 bg-primary text-black font-black rounded-2xl text-[11px] hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 uppercase tracking-[0.2em]"
                                        >
                                            {isLoading ? 'Creating...' : 'Launch Account'}
                                        </button>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="w-full text-[10px] font-black text-neutral-600 hover:text-primary py-4 mt-2 uppercase tracking-[0.2em] transition-colors"
                                        >
                                            Change Role
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const RoleCard = ({ icon, label, active, onClick }: any) => (
    <div
        onClick={onClick}
        className={`
            flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-300 group
            ${active
                ? 'bg-primary/15 shadow-[0_8px_30px_rgb(var(--primary)/0.1)] ring-1 ring-primary/30'
                : 'bg-white/[0.03] hover:bg-white/[0.06]'
            }
        `}
    >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-500 ${active ? 'bg-primary text-black shadow-[0_0_10px_rgb(var(--primary)/0.3)]' : 'bg-white/[0.05] text-neutral-600 group-hover:text-neutral-300'}`}>
            <span className="scale-75">{icon}</span>
        </div>
        <div className={`text-[8px] font-black uppercase tracking-wider leading-none ${active ? 'text-white' : 'text-neutral-400'}`}>{label}</div>
    </div>
);

export default AuthModal;
