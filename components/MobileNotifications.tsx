import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Bell, Check, Trash2, ArrowLeft } from 'lucide-react';
import { Notification } from '../types';

interface MobileNotificationsProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    onMarkAllRead: () => void;
    onMarkRead: (id: string) => void;
}

const SwipeableNotificationItem: React.FC<{
    item: Notification;
    onMarkRead: (id: string) => void;
}> = ({ item, onMarkRead }) => {
    const [offset, setOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const currentX = useRef(0);
    const itemRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        currentX.current = e.touches[0].clientX;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const x = e.touches[0].clientX;
        const diff = x - startX.current;

        // Only allow swiping left
        if (diff < 0) {
            // Add resistance
            const newOffset = Math.max(diff, -120);
            setOffset(newOffset);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (offset < -60) {
            // Swiped far enough - trigger action
            setOffset(-1000); // Animate out
            setTimeout(() => {
                onMarkRead(item.id);
                setOffset(0); // Reset for recycling if needed
            }, 300);
        } else {
            // Snap back
            setOffset(0);
        }
    };

    // Determine colors
    let typeColor = 'text-primary border-primary/20 bg-primary/10';
    if (item.type === 'sale') typeColor = 'text-green-500 border-green-500/20 bg-green-500/10';
    if (item.type === 'system') typeColor = 'text-blue-500 border-blue-500/20 bg-blue-500/10';
    if (item.type === 'alert') typeColor = 'text-red-500 border-red-500/20 bg-red-500/10';

    return (
        <div className="relative overflow-hidden mb-3">
            {/* Background Action (Read/Delete) */}
            <div className="absolute inset-y-0 right-0 w-full bg-red-500/20 flex items-center justify-end pr-6 rounded-2xl">
                <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-wider">
                    <span>Mark Read</span>
                    <Check size={16} />
                </div>
            </div>

            {/* Foreground Content */}
            <div
                ref={itemRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => onMarkRead(item.id)}
                style={{ transform: `translateX(${offset}px)`, transition: isDragging ? 'none' : 'transform 0.3s ease-out' }}
                className={`
                    relative p-4 rounded-2xl flex gap-4 border touch-pan-y select-none
                    ${item.read ? 'bg-black/40 border-white/5 opacity-60' : 'bg-[#111] border-white/10'}
                `}
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${typeColor}`}>
                    {item.read ? <Check size={20} /> : <div className="w-2.5 h-2.5 rounded-full bg-current animate-pulse shadow-[0_0_10px_currentColor]" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-bold truncate pr-2 ${item.read ? 'text-neutral-500' : 'text-white'}`}>
                            {item.title}
                        </h4>
                        <span className="text-[10px] font-mono text-neutral-600 shrink-0">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed mb-2 line-clamp-2">
                        {item.message}
                    </p>

                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black font-mono text-neutral-600 bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            {item.type}
                        </span>
                        {!item.read && (
                            <span className="text-[9px] font-bold text-primary animate-pulse">
                                NEW
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MobileNotifications: React.FC<MobileNotificationsProps> = ({
    isOpen,
    onClose,
    notifications,
    onMarkAllRead,
    onMarkRead
}) => {
    // Animation control
    const [render, setRender] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRender(true);
            document.body.style.overflow = 'hidden';
            // Trigger animation after mount
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
            document.body.style.overflow = '';
            // Wait for animation to finish
            const timer = setTimeout(() => setRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!render) return null;

    return createPortal(
        <div
            className={`
                fixed inset-0 z-[100] lg:hidden flex flex-col bg-black 
                transition-transform duration-300 ease-in-out will-change-transform
                ${visible ? 'translate-y-0' : 'translate-y-full'}
            `}
        >
            {/* Header */}
            <div className="relative h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] flex items-center justify-between px-4 border-b border-white/10 bg-black/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white bg-white/5 rounded-xl border border-white/5 transition-all active:scale-95"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-white uppercase tracking-wider">Notifications</h2>
                        <p className="text-[10px] font-mono text-neutral-500 uppercase">
                            {notifications.filter(n => !n.read).length} Unread
                        </p>
                    </div>
                </div>

                {notifications.length > 0 && (
                    <button
                        onClick={onMarkAllRead}
                        className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg border border-primary/20 transition-all uppercase tracking-wider"
                    >
                        <Check size={12} /> Mark All Read
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar bg-black">
                {notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 -mt-10">
                        <div className="relative">
                            <div className="w-24 h-24 bg-neutral-900/50 rounded-full flex items-center justify-center text-neutral-800 border border-white/5">
                                <Bell size={48} />
                            </div>
                            <div className="absolute top-0 right-0 w-6 h-6 bg-primary rounded-full animate-bounce delay-700 opacity-20"></div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-white">All Caught Up!</h3>
                            <p className="text-sm text-neutral-500 max-w-[200px] mx-auto leading-relaxed">
                                You have no new notifications at the moment.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-8 py-3 bg-white text-black font-bold rounded-xl text-xs hover:bg-neutral-200 transition-colors uppercase tracking-widest shadow-lg shadow-white/10"
                        >
                            Back to Home
                        </button>
                    </div>
                ) : (
                    <div className="pb-20">
                        <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-4 text-center">
                            Swipe left to mark read
                        </div>
                        {notifications.map((notif) => (
                            <SwipeableNotificationItem
                                key={notif.id}
                                item={notif}
                                onMarkRead={onMarkRead}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default MobileNotifications;
