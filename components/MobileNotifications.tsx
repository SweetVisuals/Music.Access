import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Bell, Check, ArrowLeft, Info, ShoppingBag, MessageSquare, AlertCircle, User } from 'lucide-react';
import type { Notification } from '../types';

interface MobileNotificationsProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    onMarkAllRead: () => void;
    onMarkRead: (id: string) => void;
    onNotificationClick: (notification: Notification) => void;
}

const getIconForType = (type: Notification['type']) => {
    switch (type) {
        case 'sale': return <ShoppingBag size={18} />;
        case 'message': return <MessageSquare size={18} />;
        case 'alert': return <AlertCircle size={18} />;
        case 'order': return <ShoppingBag size={18} />;
        case 'manage_order': return <ShoppingBag size={18} />;
        case 'follow': return <User size={18} />;
        default: return <Info size={18} />;
    }
};

const SwipeableNotificationItem: React.FC<{
    item: Notification;
    onMarkRead: (id: string) => void;
    onClick: () => void;
}> = ({ item, onMarkRead, onClick }) => {
    const [offset, setOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const itemRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const x = e.touches[0].clientX;
        const diff = x - startX.current;

        // Only allow swiping left
        if (diff < 0) {
            // Add resistance
            const newOffset = Math.max(diff, -100);
            setOffset(newOffset);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (offset < -50) {
            // Swiped far enough - trigger action
            setOffset(-1000); // Animate out
            setTimeout(() => {
                onMarkRead(item.id);
                // Reset happens if the component is still mounted (e.g. if we don't remove it optimistically)
                // But usually the parent removes/updates it. 
                // We'll reset just in case functionality changes to "keep but mark read"
                setOffset(0);
            }, 300);
        } else {
            // Snap back
            setOffset(0);
        }
    };

    // Determine colors
    // We want a premium look. Opaque backgrounds are critical to avoid the "overlap" issue.
    const isRead = item.read;

    // Status Colors based on type for the icon/accent
    let accentColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (item.type === 'sale') accentColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (item.type === 'alert') accentColor = 'text-red-400 bg-red-500/10 border-red-500/20';
    if (item.type === 'message') accentColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    if (item.type === 'follow') accentColor = 'text-pink-400 bg-pink-500/10 border-pink-500/20';

    return (
        <div className="relative mb-3 group">
            {/* Background Action (Mark Read) - Hidden behind the card */}
            {/* Using a nice Green for 'Mark Read' success action instead of Red */}
            <div className="absolute inset-0 flex items-center justify-end px-6 rounded-2xl bg-emerald-900/20 border border-emerald-500/10">
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                    <span>Mark Read</span>
                    <Check size={16} strokeWidth={3} />
                </div>
            </div>

            {/* Foreground Content - MUST BE OPAQUE to hide the action behind it */}
            <div
                ref={itemRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={onClick}
                style={{
                    transform: `translateX(${offset}px)`,
                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
                className={`
                    relative p-4 rounded-2xl flex gap-4 border touch-pan-y select-none shadow-sm
                    ${isRead
                        ? 'bg-[#0a0a0a] border-white/5 opacity-80' // Slightly dimmer but opaque background
                        : 'bg-[#121212] border-white/10 shadow-black/50' // Highlighted
                    }
                `}
            >
                {/* Icon Column */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isRead ? 'grayscale opacity-50 border-transparent bg-white/5' : accentColor} transition-all duration-300`}>
                    {getIconForType(item.type)}
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start gap-3">
                        <h4 className={`text-[13px] font-bold truncate leading-tight ${isRead ? 'text-neutral-500' : 'text-neutral-200'}`}>
                            {item.title}
                        </h4>
                        <span className="text-[10px] font-mono text-neutral-600 shrink-0 mt-0.5">
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>

                    <p className={`text-[11px] leading-relaxed mt-1 line-clamp-2 ${isRead ? 'text-neutral-600' : 'text-neutral-400'}`}>
                        {item.message}
                    </p>

                    {!isRead && (
                        <div className="mt-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] font-bold text-primary uppercase tracking-wider">New Notification</span>
                        </div>
                    )}
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
    onMarkRead,
    onNotificationClick
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

    const unreadCount = notifications.filter(n => !n.read).length;

    return createPortal(
        <div
            className={`
                fixed inset-0 z-[300] lg:hidden flex flex-col bg-black 
                transition-transform duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) will-change-transform
                ${visible ? 'translate-y-0' : 'translate-y-full'}
            `}
        >
            {/* Header */}
            <div className="flex flex-col shrink-0 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="h-[env(safe-area-inset-top)] bg-black" /> {/* Safe Area Spacer */}
                <div className="h-16 flex items-center justify-between px-4">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white bg-white/5 rounded-full active:scale-95 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-white tracking-wide">NOTIFICATIONS</span>
                        {unreadCount > 0 && (
                            <span className="text-[10px] text-primary font-mono">{unreadCount} Unread</span>
                        )}
                    </div>

                    <div className="w-10 flex justify-end">
                        {unreadCount > 0 ? (
                            <button
                                onClick={onMarkAllRead}
                                className="w-10 h-10 flex items-center justify-center text-primary bg-primary/10 rounded-full active:scale-95 transition-all"
                                title="Mark All Read"
                            >
                                <Check size={18} />
                            </button>
                        ) : <div className="w-10" />}
                    </div>
                </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar bg-black">
                {notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 -mt-20">
                        <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center text-neutral-700 ring-1 ring-white/5">
                            <Bell size={32} />
                        </div>
                        <div className="space-y-2 max-w-[240px]">
                            <h3 className="text-base font-bold text-white">All Caught Up!</h3>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                You have no new notifications. Activity will show up here.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="pb-20 space-y-1">
                        <div className="flex items-center justify-between px-2 mb-4">
                            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Recent</span>
                            <span className="text-[10px] text-neutral-700 flex items-center gap-1">
                                <span>Swipe to read</span>
                                <ArrowLeft size={10} />
                            </span>
                        </div>

                        {notifications.map((notif) => (
                            <SwipeableNotificationItem
                                key={notif.id}
                                item={notif}
                                onMarkRead={onMarkRead}
                                onClick={() => onNotificationClick(notif)}
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

