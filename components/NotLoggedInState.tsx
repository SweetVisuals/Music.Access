import React from 'react';
import { Lock, LogIn } from 'lucide-react';

interface NotLoggedInStateProps {
    onOpenAuth: () => void;
}

const NotLoggedInState: React.FC<NotLoggedInStateProps> = ({ onOpenAuth }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-neutral-900 rounded-full flex items-center justify-center mb-6 border border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <Lock size={40} className="text-neutral-500" />
            </div>

            <h2 className="text-3xl font-black text-white tracking-tighter mb-4">
                Access Restricted
            </h2>

            <p className="text-neutral-400 max-w-md mb-8 leading-relaxed font-light">
                You need to be logged in to view this dashboard page. Sign in to access your studio, manage sales, and track your analytics.
            </p>

            <button
                onClick={onOpenAuth}
                className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-black transition-all duration-200 bg-primary font-lg rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-black"
            >
                <LogIn className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" />
                <span>Log In to Continue</span>
                <div className="absolute inset-0 rounded-xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all"></div>
            </button>

            <div className="mt-12 text-xs text-neutral-600 font-mono uppercase tracking-widest">
                Music Access Terminal v4.0
            </div>
        </div>
    );
};

export default NotLoggedInState;
