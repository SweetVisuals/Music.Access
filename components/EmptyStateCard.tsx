import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    height?: string;
}

const EmptyStateCard: React.FC<EmptyStateCardProps> = ({ icon: Icon, title, description, height = "h-[282px]" }) => {
    return (
        <div className={`w-full ${height} rounded-xl border border-dashed border-white/10 bg-neutral-900/20 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500`}>
            <div className="w-16 h-16 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center mb-4 shadow-lg">
                <Icon size={32} className="text-neutral-600" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
            <p className="text-neutral-500 text-sm max-w-xs leading-relaxed">{description}</p>
        </div>
    );
};

export default EmptyStateCard;
