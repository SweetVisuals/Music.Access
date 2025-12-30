
import React, { useState } from 'react';
import { X, Mail, Lock, ArrowRight, Music, Mic2, Settings, CheckCircle, Terminal, Briefcase, Headphones, User } from 'lucide-react';
import { signUp, signIn } from '../services/supabaseService';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
}

type AuthMode = 'login' | 'signup';
type Role = 'artist' | 'producer' | 'engineer' | 'professional' | 'listener';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [step, setStep] = useState(1);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            setError(err.message || `Login failed: ${err.status || 'Unknown error'}`);
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
            await signUp(email, password, username, handle, selectedRole || 'listener');
            // After signup, automatically log in
            await signIn(email, password);
            onLogin();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignupNext = () => {
        if (step === 1 && selectedRole) {
            setStep(2);
        } else if (step === 2) {
            handleSignup();
        }
    };

    // Reset state when switching modes
    const switchMode = (m: AuthMode) => {
        setMode(m);
        setStep(1);
        setSelectedRole(null);
        setError(null);
        setEmail('');
        setPassword('');
        setUsername('');
        setHandle('');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-[480px] bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-2xl flex flex-col relative max-h-[90vh] overflow-hidden">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="pt-8 px-8 pb-6 flex flex-col items-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 text-primary mb-4 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                        <Terminal size={24} />
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-8 border-b border-neutral-800 w-full justify-center">
                        <button
                            onClick={() => switchMode('login')}
                            className={`pb-3 text-sm font-bold transition-all relative ${mode === 'login' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            Login
                            {mode === 'login' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgb(var(--primary))]"></div>}
                        </button>
                        <button
                            onClick={() => switchMode('signup')}
                            className={`pb-3 text-sm font-bold transition-all relative ${mode === 'signup' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            Sign Up
                            {mode === 'signup' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgb(var(--primary))]"></div>}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="px-8 py-2">
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-2 rounded-lg text-center">
                            {error}
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="px-8 pb-8 flex-1 overflow-y-auto custom-scrollbar">
                    {mode === 'login' ? (
                        <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Email Address</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors placeholder-neutral-600"
                                            placeholder="producer@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Password</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors placeholder-neutral-600"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleLogin}
                                disabled={isLoading || !email || !password}
                                className="w-full py-3 bg-primary text-black font-bold rounded-lg text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide shadow-[0_0_20px_rgba(var(--primary),0.2)]"
                            >
                                {isLoading ? 'Logging in...' : 'Login'}
                            </button>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            {step === 1 && (
                                <div>
                                    <div className="text-center mb-4">
                                        <h3 className="text-sm font-bold text-white">I am a...</h3>
                                    </div>

                                    {/* Compact Role Grid */}
                                    <div className="space-y-2 mb-6">
                                        <RoleCard
                                            icon={<Mic2 size={18} />}
                                            label="Artist"
                                            desc="I need beats & services"
                                            active={selectedRole === 'artist'}
                                            onClick={() => setSelectedRole('artist')}
                                        />
                                        <RoleCard
                                            icon={<Music size={18} />}
                                            label="Producer"
                                            desc="I sell beats & kits"
                                            active={selectedRole === 'producer'}
                                            onClick={() => setSelectedRole('producer')}
                                        />
                                        <RoleCard
                                            icon={<Settings size={18} />}
                                            label="Engineer"
                                            desc="I provide mixing services"
                                            active={selectedRole === 'engineer'}
                                            onClick={() => setSelectedRole('engineer')}
                                        />
                                        <RoleCard
                                            icon={<Briefcase size={18} />}
                                            label="Professional / Other"
                                            desc="Manager, Label, A&R"
                                            active={selectedRole === 'professional'}
                                            onClick={() => setSelectedRole('professional')}
                                        />
                                        <RoleCard
                                            icon={<Headphones size={18} />}
                                            label="Listener"
                                            desc="I'm here to discover music"
                                            active={selectedRole === 'listener'}
                                            onClick={() => setSelectedRole('listener')}
                                        />
                                    </div>

                                    <button
                                        onClick={handleSignupNext}
                                        disabled={!selectedRole}
                                        className="w-full py-3 bg-white text-black font-bold rounded-lg text-xs hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                                    >
                                        Continue
                                    </button>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                                    <div className="text-center mb-2">
                                        <span className="text-xs font-bold text-primary uppercase tracking-widest border border-primary/20 bg-primary/10 px-3 py-1 rounded-full">
                                            Setup Profile
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <input className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none placeholder-neutral-600" placeholder="First Name" />
                                        <input className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none placeholder-neutral-600" placeholder="Last Name" />
                                    </div>
                                    <input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none placeholder-neutral-600"
                                        placeholder="Username"
                                    />
                                    <input
                                        value={handle}
                                        onChange={(e) => setHandle(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none placeholder-neutral-600"
                                        placeholder="Handle (e.g. @username)"
                                    />
                                    <input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none placeholder-neutral-600"
                                        placeholder="Email"
                                    />
                                    <input
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none placeholder-neutral-600"
                                        type="password"
                                        placeholder="Password"
                                    />

                                    <div className="pt-2">
                                        <button
                                            onClick={handleSignup}
                                            disabled={isLoading || !email || !password || !username || !handle}
                                            className="w-full py-3 bg-primary text-black font-bold rounded-lg text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(var(--primary),0.2)] uppercase tracking-wide"
                                        >
                                            {isLoading ? 'Creating...' : 'Create Account'}
                                        </button>
                                        <button onClick={() => setStep(1)} className="w-full text-[10px] font-bold text-neutral-500 hover:text-white py-3 mt-1">
                                            Back to Roles
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

const RoleCard = ({ icon, label, desc, active, onClick }: any) => (
    <div
        onClick={onClick}
        className={`
            flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all group
            ${active
                ? 'bg-primary/10 border-primary shadow-[inset_0_0_20px_rgba(var(--primary),0.1)]'
                : 'bg-neutral-900/50 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700'
            }
        `}
    >
        <div className={`p-2 rounded-md transition-colors ${active ? 'bg-primary text-black' : 'bg-black text-neutral-500 group-hover:text-white'}`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className={`text-xs font-bold ${active ? 'text-white' : 'text-neutral-300'}`}>{label}</div>
            <div className={`text-[10px] truncate ${active ? 'text-primary/80' : 'text-neutral-600'}`}>{desc}</div>
        </div>
        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${active ? 'border-primary bg-primary text-black' : 'border-neutral-700 text-transparent'}`}>
            <CheckCircle size={12} />
        </div>
    </div>
);

export default AuthModal;
