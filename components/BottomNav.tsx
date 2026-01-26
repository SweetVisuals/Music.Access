import React from 'react';
import { Home, Users, Plus, Library, LayoutDashboard } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { View } from '../types';

interface BottomNavProps {
    onNavigate: (view: View | string) => void;
    currentView: View;
}

const BottomNav: React.FC<BottomNavProps> = ({ onNavigate, currentView }) => {
    const location = useLocation();

    const navItems = [
        { id: 'home', label: 'Home', icon: <Home size={22} />, view: 'home' },
        { id: 'browse', label: 'Browse', icon: <Users size={22} />, view: 'browse-talent' },
        { id: 'create', label: '', icon: <Plus size={28} />, view: 'upload', isCenter: true },
        { id: 'library', label: 'Library', icon: <Library size={22} />, view: 'library' },
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} />, view: 'dashboard-overview' },
    ];

    const isActive = (view: string) => {
        if (view === 'home') return currentView === 'home';
        if (view === 'browse-talent') return currentView === 'browse-talent';
        if (view === 'library') return currentView === 'library';
        if (view === 'dashboard-overview') return currentView.startsWith('dashboard');
        if (view === 'upload') return currentView === 'upload';
        return false;
    };

    return (
        <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[150] bg-[#050505] px-2 pb-[env(safe-area-inset-bottom)] border-t border-white/5"
        >
            <div className="flex items-center justify-between h-[50px] max-w-md mx-auto">
                {navItems.map((item) => {
                    if (item.isCenter) {
                        return (
                            <div key={item.id} className="relative flex flex-col items-center justify-center w-1/5 -mt-6 z-[160]">
                                <button
                                    onClick={() => onNavigate(item.view)}
                                    className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-black shadow-[0_4px_15px_rgba(var(--primary),0.4)] active:scale-95 transition-all border-4 border-[#050505]"
                                >
                                    {item.icon}
                                </button>
                                <span className="text-[10px] font-bold mt-1 text-neutral-500">Create</span>
                            </div>
                        );
                    }

                    const active = isActive(item.view);

                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.view)}
                            className={`flex flex-col items-center justify-center w-1/5 h-full transition-all active:scale-90 ${active ? 'text-primary' : 'text-neutral-500'}`}
                        >
                            <div className={`${active ? 'scale-110' : ''} transition-transform`}>
                                {item.icon}
                            </div>
                            <span className={`text-[9px] mt-0.5 font-bold ${active ? 'text-white' : ''}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
