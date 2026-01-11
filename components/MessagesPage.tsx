import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Conversation } from '../types';
import {
    Search, Send, Paperclip, MoreVertical,
    ArrowLeft, Plus, X, MessageCircle, Trash
} from 'lucide-react';
import {
    getConversations,
    deleteConversation,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    createConversation,
    sendMessage,
    deleteMessage,
    searchUsers,
    getCurrentUser,
    supabase
} from '../services/supabaseService';

const StaticFab = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => {
    return createPortal(
        <button
            onClick={onClick}
            className="fixed z-[100] right-6 w-14 h-14 bg-black border-2 border-primary text-primary rounded-full shadow-[0_0_20px_rgba(var(--primary),0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 lg:hidden"
            style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
        >
            {isOpen ? <X size={24} /> : <MessageCircle size={24} fill="currentColor" />}
        </button>,
        document.body
    );
};

interface SwipeableProps {
    conv: Conversation;
    activeId: string | null;
    onClick: () => void;
    onDelete: () => Promise<void>;
}

const SwipeableConversationItem: React.FC<SwipeableProps> = ({
    conv,
    activeId,
    onClick,
    onDelete
}) => {

    const [offset, setOffset] = useState(0);
    const [startX, setStartX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const threshold = 100;
    const deleteThreshold = window.innerWidth * 0.75;

    const handleTouchStart = (e: React.TouchEvent) => {
        setStartX(e.touches[0].clientX);
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        if (diff > 0) setOffset(diff);
    };

    const handleTouchEnd = async () => {
        setIsDragging(false);
        if (offset > deleteThreshold) {
            await onDelete();
            setOffset(0);
        } else if (offset > threshold) {
            setOffset(threshold);
        } else {
            setOffset(0);
        }
    };

    return (
        <div className="relative overflow-hidden touch-pan-y select-none group bg-black lg:bg-[#0a0a0a]">
            {/* Background Actions */}
            <div
                className="absolute inset-y-0 left-0 bg-red-600 flex items-center justify-end pr-6 z-0 cursor-pointer overflow-hidden whitespace-nowrap"
                style={{
                    width: `${Math.max(offset, 0)}px`,
                    opacity: offset > 0 ? 1 : 0,
                    transition: isDragging ? 'none' : 'width 0.3s ease-out, opacity 0.2s',
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete().then(() => setOffset(0));
                }}
            >
                <span className="text-white font-bold flex items-center gap-1.5">
                    <Trash size={20} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Delete</span>
                </span>
            </div>

            {/* Foreground Content */}
            <div
                className={`
                    relative z-10 bg-black lg:bg-[#0a0a0a] border-b border-white/5
                    ${activeId === conv.id ? 'bg-white/5 border-l-2 border-l-primary' : ''}
                `}
                style={{
                    transform: `translateX(${offset}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => offset > 0 ? setOffset(0) : onClick()}
            >
                <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors">
                    <div className="relative shrink-0">
                        <img src={conv.avatar} alt={conv.user} className="w-10 h-10 rounded-full object-cover" />
                        {conv.unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a0a0a]"></span>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h4 className={`text-xl font-bold truncate ${activeId === conv.id ? 'text-white' : 'text-neutral-300'}`}>{conv.user}</h4>
                            <span className="text-xs text-neutral-500">{conv.timestamp}</span>
                        </div>
                        <p className={`text-lg truncate ${conv.unread > 0 ? 'text-white font-bold' : 'text-neutral-500'}`}>{conv.lastMessage}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MessagesPage: React.FC<{ isPlayerActive?: boolean }> = ({ isPlayerActive }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages');
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchParams] = useSearchParams();
    const uidParam = searchParams.get('uid');

    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [isStartingConversation, setIsStartingConversation] = useState(false);

    // Context Menu & Delete Dialog State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, messageId: string, isMe: boolean } | null>(null);
    const [messageToDelete, setMessageToDelete] = useState<{ id: string, isMe: boolean } | null>(null);

    const handleContextMenu = (e: React.MouseEvent, messageId: string, isMe: boolean) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, messageId, isMe });
    };

    const handleDeleteClick = () => {
        if (contextMenu) {
            setMessageToDelete({ id: contextMenu.messageId, isMe: contextMenu.isMe });
            setContextMenu(null);
        }
    };

    const handleDeleteMessage = async (messageId: string, forEveryone: boolean) => {
        try {
            await deleteMessage(messageId, forEveryone);
            // Optimistically update UI
            setConversations(prev => prev.map(c => {
                if (c.id === activeId) {
                    return {
                        ...c,
                        messages: c.messages.filter(m => m.id !== messageId)
                    };
                }
                return c;
            }));
        } catch (e) {
            console.error('Failed to delete message:', e);
            alert('Could not delete message. You can only delete your own messages for everyone.');
        } finally {
            setMessageToDelete(null);
        }
    };

    const loadConversations = useCallback(async () => {
        try {
            const data = await getConversations();
            setConversations(data);
            setFilteredConversations(data);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Clear unread message notifications when viewing messages
    useEffect(() => {
        const clearMessageNotifications = async () => {
            const user = await getCurrentUser();
            if (!user) return;

            try {
                const { data: unread } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('type', 'message')
                    .eq('read', false);

                if (unread && unread.length > 0) {
                    await Promise.all(unread.map(n => markNotificationAsRead(n.id)));
                    window.dispatchEvent(new CustomEvent('notifications-updated'));
                }
            } catch (e) {
                console.error("Error clearing message notifications", e);
            }
        };

        if (activeTab === 'messages') {
            clearMessageNotifications();
        }
    }, [activeTab]);

    useEffect(() => {
        if (!uidParam || loading) return;
        const handleUid = async () => {
            try {
                setIsStartingConversation(true);
                const convId = await createConversation(uidParam);
                await loadConversations();
                setActiveId(convId);
                setIsCreatingNew(false);
                setIsSidebarOpen(false);
            } catch (e) {
                console.error("UID handled failed", e);
            } finally {
                setIsStartingConversation(false);
            }
        };
        handleUid();
    }, [uidParam, loading, loadConversations]);

    const loadNotifications = useCallback(async () => {
        setLoadingNotifications(true);
        try {
            const user = await getCurrentUser();
            if (user) setNotifications(await getNotifications(user.id));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingNotifications(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'notifications') loadNotifications();
    }, [activeTab, loadNotifications]);

    const handleSend = async () => {
        const activeConv = conversations.find(c => c.id === activeId);
        if (!inputText.trim() || !activeConv) return;

        const text = inputText;
        setInputText('');

        // Optimistic
        const tempMsg = { id: Date.now().toString(), sender: 'Me', avatar: '', text, timestamp: 'Just now', isMe: true };
        setConversations(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, tempMsg], lastMessage: text, timestamp: 'Just now' } : c));

        try {
            await sendMessage(activeConv.id, text);
        } catch (e) {
            console.error(e);
        }
    };

    const handleUserSearch = async (query: string) => {
        setUserSearchQuery(query);
        if (query.length < 2) return setSearchResults([]);
        setIsSearchingUsers(true);
        try {
            setSearchResults(await searchUsers(query));
        } finally {
            setIsSearchingUsers(false);
        }
    };

    const handleStartConversation = async (userId: string) => {
        if (isStartingConversation) return;
        setIsStartingConversation(true);
        try {
            const newId = await createConversation(userId);
            setIsCreatingNew(false);
            await loadConversations();
            setActiveId(newId);
        } catch (e) {
            alert("Error starting conversation");
        } finally {
            setIsStartingConversation(false);
        }
    };

    const handleDeleteConvo = async (id: string) => {
        if (!confirm('Delete conversation?')) return;
        try {
            await deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeId === id) setActiveId(null);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const query = searchQuery.toLowerCase();
        setFilteredConversations(conversations.filter(c =>
            c.user.toLowerCase().includes(query) || c.lastMessage.toLowerCase().includes(query)
        ));
    }, [searchQuery, conversations]);

    useEffect(() => {
        if (window.innerWidth >= 1024 && !activeId && filteredConversations.length > 0) {
            setActiveId(filteredConversations[0].id);
        }
    }, [filteredConversations, activeId]);

    const activeConv = conversations.find(c => c.id === activeId);

    return (
        <div className={`w-full relative flex-1 ${isSidebarOpen ? 'z-[80]' : 'z-10'} bg-[#050505] lg:relative lg:z-30 lg:top-0 lg:h-full lg:bg-transparent overflow-hidden flex flex-col`}>
            <StaticFab isOpen={isSidebarOpen} onClick={() => setIsSidebarOpen(!isSidebarOpen)} />

            <div className="flex-1 flex bg-[#0a0a0a] overflow-hidden relative">
                <div className={`
                    absolute lg:static inset-y-0 left-0 z-[60] w-full lg:w-80 lg:border-r border-white/5 flex flex-col bg-black lg:bg-[#080808] transition-all duration-300
                    ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100'}
                `}>
                    <div className="p-4 border-b border-white/5 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <MessageCircle size={16} className="text-primary" />
                                Inbox
                            </h3>
                            <button onClick={() => { setIsCreatingNew(true); setActiveId(null); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} className="text-neutral-400 hover:text-white"><Plus size={18} /></button>
                        </div>

                        <div className="flex p-1 bg-neutral-900 rounded-lg">
                            <button onClick={() => setActiveTab('messages')} className={`flex-1 py-1.5 rounded text-xs font-bold uppercase transition-all ${activeTab === 'messages' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>Messages</button>
                            <button onClick={() => setActiveTab('notifications')} className={`flex-1 py-1.5 rounded text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'notifications' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>
                                Alerts {notifications.some(n => !n.read) && <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>}
                            </button>
                        </div>

                        {activeTab === 'messages' && (
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-neutral-900 border border-white/5 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none" placeholder="Search..." />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
                        {activeTab === 'messages' ? (
                            loading ? <div className="p-8 text-center text-xs text-neutral-500">Loading...</div> :
                                filteredConversations.map(conv => (
                                    <SwipeableConversationItem
                                        key={conv.id}
                                        conv={conv}
                                        activeId={activeId}
                                        onClick={() => { setActiveId(conv.id); setIsCreatingNew(false); setIsSidebarOpen(false); }}
                                        onDelete={() => handleDeleteConvo(conv.id)}
                                    />
                                ))
                        ) : (
                            <div className="space-y-1">
                                {loadingNotifications ? <div className="p-8 text-center text-xs text-neutral-500">Loading...</div> :
                                    notifications.map(n => (
                                        <div key={n.id} onClick={() => { if (!n.read) markNotificationAsRead(n.id); if (n.link) window.location.hash = '#' + n.link; }} className={`p-3 rounded-lg border cursor-pointer flex gap-3 ${n.read ? 'opacity-60 border-transparent' : 'bg-neutral-900 border-white/5'}`}>
                                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-white">{n.title}</h4>
                                                <p className="text-xs text-neutral-500">{n.message}</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
                    {isCreatingNew ? (
                        <div className="flex flex-col h-full bg-black/20">
                            <div className="h-24 border-b border-white/5 flex items-center px-4 gap-3 bg-neutral-900/30">
                                <span className="text-neutral-400 text-lg font-bold">To:</span>
                                <input autoFocus={window.innerWidth >= 768} value={userSearchQuery} onChange={(e) => handleUserSearch(e.target.value)} className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none" placeholder="Search creators..." />
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {searchResults.map(user => (
                                    <div key={user.id} onClick={() => handleStartConversation(user.id)} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer">
                                        <img src={user.avatar} className="w-14 h-14 rounded-full" />
                                        <div className="flex-1"><h4 className="text-xl font-bold text-white">{user.username}</h4><p className="text-base text-neutral-500">@{user.handle}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : activeConv ? (
                        <>
                            <div className="h-24 border-b border-white/5 flex items-center justify-between px-6 bg-neutral-900/30">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-neutral-400 mr-2"><ArrowLeft size={24} /></button>
                                    <div
                                        onClick={() => {
                                            if (activeConv.userId) {
                                                window.location.hash = `#@${activeConv.userId}`;
                                            }
                                        }}
                                        className="flex items-center gap-4 cursor-pointer group"
                                    >
                                        <img src={activeConv.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-white/5 group-hover:border-primary/50 transition-colors" />
                                        <div>
                                            <h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{activeConv.user}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                                <span className="text-xs text-green-500 font-bold uppercase tracking-wider">Online</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-3 text-neutral-400 hover:text-white transition-colors"><MoreVertical size={24} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {activeConv.messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            onContextMenu={(e) => handleContextMenu(e, msg.id, msg.isMe)}
                                            className={`max-w-[85%] rounded-2xl px-6 py-4 text-lg cursor-pointer select-none transition-transform active:scale-[0.98] ${msg.isMe ? 'bg-primary text-black' : 'bg-neutral-800 text-white border border-white/5 shadow-lg'}`}
                                        >
                                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                            <span className="text-[9px] opacity-50 block mt-1">{msg.timestamp}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
                                <div className="flex items-center gap-3 max-w-4xl mx-auto">
                                    <button className="text-neutral-500"><Paperclip size={20} /></button>
                                    <div className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2 flex items-center">
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => {
                                                setInputText(e.target.value);
                                                // Auto-resize logic
                                                e.target.style.height = 'auto';
                                                e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSend();
                                                    // Reset height
                                                    const target = e.target as HTMLTextAreaElement;
                                                    target.style.height = '1.5rem';
                                                }
                                            }}
                                            className="w-full bg-transparent text-sm text-white focus:outline-none resize-none h-6 custom-scrollbar"
                                            placeholder="Message..."
                                            rows={1}
                                        />
                                    </div>
                                    <button onClick={handleSend} disabled={!inputText.trim()} className={`p-2 rounded-full ${inputText.trim() ? 'bg-primary text-black' : 'bg-neutral-800 text-neutral-500'}`}><Send size={18} /></button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-500">
                            <MessageCircle size={48} className="mb-4 opacity-20" />
                            <h3 className="text-lg font-bold text-white mb-2">Inbox</h3>
                            <button onClick={() => setIsCreatingNew(true)} className="px-6 py-2 bg-white text-black font-bold rounded-lg uppercase text-xs tracking-widest mt-4">New Message</button>
                        </div>
                    )}
                </div>
            </div>

            {isSidebarOpen && <div className="absolute inset-0 bg-black/60 z-[58] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

            {/* Message Context Menu */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-[150]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
                    <div
                        className="fixed z-[160] bg-neutral-900 border border-white/5 rounded-xl shadow-2xl py-1 min-w-[160px] animate-in fade-in zoom-in duration-100"
                        style={{
                            left: Math.min(contextMenu.x, window.innerWidth - 170),
                            top: Math.min(contextMenu.y, window.innerHeight - 100)
                        }}
                    >
                        <button
                            onClick={handleDeleteClick}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-white/5 flex items-center gap-3 transition-colors"
                        >
                            <Trash size={16} />
                            Delete Message
                        </button>
                    </div>
                </>
            )}

            {/* Delete Confirmation Dialog */}
            {messageToDelete && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash size={28} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Delete Message?</h3>
                            <p className="text-neutral-400 text-sm mb-8">This action cannot be undone.</p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleDeleteMessage(messageToDelete.id, false)}
                                    className="w-full py-4 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl text-sm font-bold transition-all active:scale-95"
                                >
                                    Delete for me
                                </button>
                                {messageToDelete.isMe && (
                                    <button
                                        onClick={() => handleDeleteMessage(messageToDelete.id, true)}
                                        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-sm font-bold shadow-lg shadow-red-600/20 transition-all active:scale-95"
                                    >
                                        Delete for everyone
                                    </button>
                                )}
                                <button
                                    onClick={() => setMessageToDelete(null)}
                                    className="w-full py-4 text-neutral-500 hover:text-white text-sm font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesPage;