import React from 'react';
import { X, Bell, Clock, Check, Trash2 } from 'lucide-react';
import { Notification } from '../types';

interface MobileNotificationsProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    onMarkAllRead: () => void;
    onMarkRead: (id: string) => void;
}

const MobileNotifications: React.FC<MobileNotificationsProps> = ({
    isOpen,
    onClose,
    notifications,
    onMarkAllRead,
    onMarkRead
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] lg:hidden flex flex-col bg-black animate-in fade-in duration-300">
            {/* Background Blur Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>

            {/* Header */}
            <div className="relative h-16 flex items-center justify-between px-4 border-b border-white/5 bg-black/50 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-wider">Notifications</h2>
                        <p className="text-[10px] font-mono text-neutral-500 uppercase">
                            {notifications.filter(n => !n.read).length} Unread
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                        <button
                            onClick={onMarkAllRead}
                            className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-primary bg-white/5 rounded-xl border border-white/5 transition-all active:scale-95"
                            title="Mark all as read"
                        >
                            <Check size={18} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white bg-white/5 rounded-xl border border-white/5 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar relative">
                {notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center text-neutral-700 border border-neutral-800">
                            <Bell size={40} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold">No Notifications</h3>
                            <p className="text-xs text-neutral-500 max-w-[180px] mx-auto mt-1">
                                You're all caught up! Check back later for updates.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 pb-20">
                        {notifications.map((notif) => (
                            <div
                                key={notif.id}
                                onClick={() => onMarkRead(notif.id)}
                                className={`
                                    p-4 rounded-2xl flex gap-4 animate-in slide-in-from-bottom-2 duration-300 border
                                    ${notif.read
                                        ? 'bg-transparent border-transparent opacity-60'
                                        : 'bg-white/[0.03] border-white/5'
                                    }
                                `}
                            >
                                <div className={`
                                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border
                                    ${notif.type === 'sale'
                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                        : notif.type === 'system'
                                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                            : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                    }
                                `}>
                                    <div className={`w-2 h-2 rounded-full ${notif.read ? 'bg-current opacity-50' : 'bg-current animate-pulse'}`}></div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm font-bold truncate pr-2 ${notif.read ? 'text-neutral-400' : 'text-white'}`}>
                                            {notif.title}
                                        </h4>
                                        <span className="text-[9px] font-mono text-neutral-600 shrink-0">
                                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <p className="text-xs text-neutral-500 leading-relaxed mb-2 line-clamp-2">
                                        {notif.message}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black font-mono text-neutral-600 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                            {notif.type}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileNotifications;
