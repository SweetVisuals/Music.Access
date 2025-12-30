import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Conversation } from '../types';
import { Search, Send, Paperclip, MoreVertical, Phone, Video, ArrowLeft, Plus, Menu, X, MessageCircle, Trash } from 'lucide-react';
import { getConversations, deleteConversation } from '../services/supabaseService';

const StaticFab = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => {
    return createPortal(
        <button
            onClick={onClick}
            className="fixed z-[100] right-4 w-14 h-14 bg-primary text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 lg:hidden"
            style={{ bottom: 'calc(10rem + env(safe-area-inset-bottom))' }}
        >
            {isOpen ? <X size={24} /> : <MessageCircle size={24} fill="currentColor" />}
        </button>,
        document.body
    );
};

const SwipeableConversationItem = ({
    conv,
    activeId,
    onClick,
    onDelete
}: {
    conv: Conversation;
    activeId: string | null;
    onClick: () => void;
    onDelete: () => Promise<void>;
}) => {
    const [offset, setOffset] = useState(0);
    const [startX, setStartX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const threshold = 100; // px to reveal
    const deleteThreshold = window.innerWidth * 0.75; // 75% of screen width

    const handleTouchStart = (e: React.TouchEvent) => {
        setStartX(e.touches[0].clientX);
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;

        // Allow swiping right (diff > 0)
        // Add resistance if trying to swipe left
        if (diff > 0) {
            setOffset(diff);
        }
    };

    const handleTouchEnd = async () => {
        setIsDragging(false);
        if (offset > deleteThreshold) {
            // Auto trigger delete logic
            await onDelete();
            // Snap back if not deleted (cancelled)
            setOffset(0);
        } else if (offset > threshold) {
            // Snap to open
            setOffset(threshold);
        } else {
            // Snap back
            setOffset(0);
        }
    };

    return (
        <div className="relative overflow-hidden touch-pan-y select-none group bg-black lg:bg-[#0a0a0a]">
            {/* Background / Actions */}
            <div
                className="absolute inset-y-0 left-0 bg-red-600 flex items-center justify-end pr-6 z-0 cursor-pointer overflow-hidden whitespace-nowrap"
                style={{
                    // Width matches the swipe offset exactly
                    width: `${Math.max(offset, 0)}px`,
                    opacity: offset > 0 ? 1 : 0,
                    // Disable transition during drag for 1:1 follow, enable easing on release
                    transition: isDragging ? 'none' : 'width 0.3s ease-out, opacity 0.2s',
                }}
                onClick={async (e) => {
                    e.stopPropagation();
                    await onDelete();
                    setOffset(0);
                }}
            >
                <span className="text-white font-bold flex items-center gap-2">
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
                onClick={() => {
                    if (offset > 0) {
                        setOffset(0); // Close if open
                    } else {
                        onClick();
                    }
                }}
            >
                <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors">
                    <div className="relative shrink-0">
                        <img src={conv.avatar} alt={conv.user} className="w-10 h-10 rounded-full object-cover" />
                        {conv.unread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a0a0a]"></span>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h4 className={`text-sm font-bold truncate ${activeId === conv.id ? 'text-white' : 'text-neutral-300'}`}>{conv.user}</h4>
                            <span className="text-[10px] text-neutral-500">{conv.timestamp}</span>
                        </div>
                        <p className={`text-xs truncate ${conv.unread > 0 ? 'text-white font-bold' : 'text-neutral-500'}`}>{conv.lastMessage}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MessagesPage: React.FC<{ isPlayerActive?: boolean }> = ({ isPlayerActive }) => {
    // Default open on desktop, closed on mobile
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // New Conversation State
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [isStartingConversation, setIsStartingConversation] = useState(false);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const data = await getConversations();
                setConversations(data);
                setFilteredConversations(data);
            } catch (error) {
                console.error('Failed to fetch conversations:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();
    }, []);

    // Filter conversations
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredConversations(conversations);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredConversations(conversations.filter(c =>
                c.user.toLowerCase().includes(query) ||
                c.lastMessage.toLowerCase().includes(query)
            ));
        }
    }, [searchQuery, conversations]);

    // On desktop, select first convo by default if none selected
    React.useEffect(() => {
        if (!activeId && filteredConversations.length > 0) {
            setActiveId(filteredConversations[0].id);
        }
    }, [filteredConversations]);

    const activeConv = conversations.find(c => c.id === activeId);

    const handleSend = async () => {
        if (!inputText.trim() || !activeConv) return;
        const text = inputText;

        // Optimistic Update
        const tempId = Date.now().toString();
        const newMsg = {
            id: tempId,
            sender: 'Me',
            avatar: '', // You might want to grab this from a context or prop
            text: text,
            timestamp: 'Just now',
            isMe: true
        };

        const updatedConv = {
            ...activeConv,
            messages: [...activeConv.messages, newMsg],
            lastMessage: text,
            timestamp: 'Just now'
        };

        const updatedList = conversations.map(c => c.id === activeId ? updatedConv : c);
        setConversations(updatedList);
        setFilteredConversations(prev => prev.map(c => c.id === activeId ? updatedConv : c));

        setInputText('');

        try {
            const { sendMessage } = await import('../services/supabaseService');
            await sendMessage(activeConv.id, text);
        } catch (error) {
            console.error('Failed to send message:', error);
            // Optionally rollback here
        }
    };

    const handleUserSearch = async (query: string) => {
        setUserSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearchingUsers(true);
        try {
            const { searchUsers } = await import('../services/supabaseService');
            const results = await searchUsers(query);
            setSearchResults(results);
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsSearchingUsers(false);
        }
    };

    const handleStartConversation = async (targetUserId: string) => {
        if (isStartingConversation) return;
        setIsStartingConversation(true);
        try {
            const { createConversation } = await import('../services/supabaseService');
            const newConvId = await createConversation(targetUserId);

            setIsCreatingNew(false);
            setUserSearchQuery('');
            setSearchResults([]);

            // Refresh conversations
            setLoading(true);
            const { getConversations } = await import('../services/supabaseService');
            const data = await getConversations();
            setConversations(data);
            setActiveId(newConvId); // Select the new conversation
            // Dispatch event to notify sidebar to re-sort
            window.dispatchEvent(new CustomEvent('following-updated'));
        } catch (e) {
            console.error("Failed to start conversation", e);
            alert("Failed to start conversation. Please try again.");
        } finally {
            setLoading(false);
            setIsStartingConversation(false);
        }
    };

    const handleDeleteConversation = async (convId: string) => {
        if (!confirm('Are you sure you want to delete this conversation?')) return;

        try {
            await deleteConversation(convId);
            const updated = conversations.filter(c => c.id !== convId);
            setConversations(updated);
            setFilteredConversations(updated); // Simplified sync
            if (activeId === convId) setActiveId(null);
        } catch (e) {
            console.error('Failed to delete conversation', e);
            alert('Failed to delete conversation');
        }
    };

    const isOverlayOpen = isSidebarOpen;

    return (
        <div className={`
            w-full max-w-[1600px] mx-auto animate-in fade-in duration-500 flex flex-col overflow-hidden
            fixed inset-x-0 bottom-0 top-16 ${isOverlayOpen ? 'z-[80]' : 'z-10'} bg-[#050505] lg:relative lg:z-30 lg:top-0 lg:h-[calc(100vh_-_8rem)] lg:pt-4 lg:px-8 lg:bg-transparent
        `}>
            {/* Static FAB for Mobile */}
            <StaticFab isOpen={isSidebarOpen} onClick={() => setIsSidebarOpen(!isSidebarOpen)} />

            {/* Desktop Header */}
            <div className="hidden lg:flex items-end justify-between mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Messages</h1>
                    <p className="text-neutral-500 text-sm">Connect and collaborate with other artists.</p>
                </div>
                <button
                    onClick={() => { setIsCreatingNew(true); setActiveId(null); }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2"
                >
                    <Plus size={14} /> <span className="hidden sm:inline">New Message</span>
                </button>
            </div>

            <div className="flex-1 flex bg-[#0a0a0a] lg:border border-neutral-800 lg:rounded-xl overflow-hidden shadow-none lg:shadow-2xl relative">
                {/* Sidebar (List) */}
                <div className={`
                    absolute inset-0 z-[60] w-full lg:w-80 lg:static lg:border-r border-neutral-800 flex flex-col bg-black lg:bg-[#0a0a0a] transition-transform duration-300
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0
                `}>
                    <div className="p-4 border-b border-neutral-800 flex flex-col gap-4">
                        <div className="flex items-center justify-between lg:hidden">
                            <h2 className="text-lg font-bold text-white">Messages</h2>
                            <button onClick={() => setIsSidebarOpen(false)} className="text-neutral-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-primary/50"
                                placeholder="Search conversations..."
                            />
                        </div>
                        <button
                            onClick={() => {
                                setIsCreatingNew(true);
                                setActiveId(null);
                                setIsSidebarOpen(false);
                            }}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 lg:hidden"
                        >
                            <Plus size={14} /> New Conversastion
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="text-center">
                                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
                                    <p className="text-neutral-500 font-mono text-xs">Loading...</p>
                                </div>
                            </div>
                        ) : filteredConversations.length > 0 ? filteredConversations.map(conv => (
                            <SwipeableConversationItem
                                key={conv.id}
                                conv={conv}
                                activeId={activeId}
                                onClick={() => {
                                    setActiveId(conv.id);
                                    setIsCreatingNew(false);
                                    setIsSidebarOpen(false);
                                }}
                                onDelete={() => handleDeleteConversation(conv.id)}
                            />
                        )) : (
                            <div className="flex items-center justify-center py-8 px-4 text-center">
                                <div>
                                    <p className="text-neutral-500 font-mono text-xs">No conversations found.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-[#050505] relative w-full overflow-hidden">
                    {isCreatingNew ? (
                        // --- NEW CONVERSATION VIEW ---
                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Header: To Input */}
                            <div className="h-16 border-b border-neutral-800 flex items-center px-4 bg-neutral-900/30 gap-3">
                                <span className="text-neutral-400 text-sm font-bold">To:</span>
                                <div className="flex-1 relative">
                                    <input
                                        autoFocus={window.innerWidth >= 1024}
                                        value={userSearchQuery}
                                        onChange={(e) => handleUserSearch(e.target.value)}
                                        className="w-full bg-transparent border-none text-white text-sm focus:outline-none placeholder-neutral-600"
                                        placeholder="Type a name or handle..."
                                    />
                                    {isSearchingUsers && (
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Search Results */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {userSearchQuery.length > 1 && searchResults.length === 0 && !isSearchingUsers ? (
                                    <div className="text-center py-8 text-neutral-500 text-sm">No users found.</div>
                                ) : searchResults.length > 0 ? (
                                    <div className="space-y-1">
                                        {searchResults.map(user => (
                                            <div
                                                key={user.id}
                                                onClick={() => handleStartConversation(user.id)}
                                                className={`flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group ${isStartingConversation ? 'opacity-50 pointer-events-none' : ''}`}
                                            >
                                                <img src={user.avatar} className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform" />
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-white">{user.username}</h4>
                                                    <p className="text-xs text-neutral-500">@{user.handle}</p>
                                                </div>
                                                <ArrowLeft size={16} className="text-neutral-600 group-hover:text-primary rotate-180 transition-colors opacity-0 group-hover:opacity-100" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-neutral-600 space-y-4">
                                        <Search size={48} className="opacity-20" />
                                        <p className="text-xs">Search for creators to start a conversation.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeConv ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-16 lg:h-16 border-b border-neutral-800 flex items-center justify-between px-4 lg:px-6 bg-neutral-900/80 backdrop-blur-md shrink-0">
                                <div className="flex items-center gap-3">
                                    <img src={activeConv.avatar} className="w-9 h-9 rounded-full object-cover border border-white/10" />
                                    <div>
                                        <h3 className="text-sm font-bold text-white">{activeConv.user}</h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                            <span className="text-[10px] text-neutral-400">Online</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-neutral-400">
                                    {/* Call button hidden by default as requested (until following check is impl) */}
                                    {/* <button className="p-2 hover:bg-white/5 rounded-lg hover:text-white transition-colors"><Phone size={18} /></button> */}
                                    <button className="p-2 hover:bg-white/5 rounded-lg hover:text-white transition-colors"><MoreVertical size={18} /></button>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 custom-scrollbar bg-dot-grid">
                                {activeConv.messages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] lg:max-w-[70%] rounded-2xl px-4 py-3 ${msg.isMe ? 'bg-primary text-black rounded-br-none' : 'bg-neutral-800 text-white rounded-bl-none'}`}>
                                            <p className="text-sm leading-relaxed">{msg.text}</p>
                                            <span className={`text-[9px] block mt-1 opacity-70 ${msg.isMe ? 'text-black/70' : 'text-neutral-400'}`}>{msg.timestamp}</span>
                                        </div>
                                    </div>
                                ))}
                                {/* Spacer for Fixed Inputs on Mobile */}
                                <div className="h-20 lg:hidden" />
                            </div>

                            {/* Input Area */}
                            <div className={`
                                p-3 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur-xl shrink-0
                                lg:static lg:bg-neutral-900/50
                                fixed left-0 right-0 z-20 border-t lg:border-t-0
                                border-white/10 lg:border-neutral-800
                                transition-all duration-300
                            `}
                                style={{ bottom: isPlayerActive ? 'calc(8rem + env(safe-area-inset-bottom))' : 'calc(4.5rem + env(safe-area-inset-bottom))' }}
                            >
                                <div className="flex items-center gap-3 max-w-[1600px] mx-auto">
                                    <button className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0 flex items-center justify-center">
                                        <Paperclip size={20} />
                                    </button>
                                    <div className="flex-1 bg-black/40 lg:bg-neutral-950 border border-neutral-800 rounded-2xl p-1.5 pl-3 focus-within:border-neutral-600 transition-colors flex items-center">
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                                            className="w-full bg-transparent text-sm text-white focus:outline-none resize-none h-9 max-h-32 custom-scrollbar placeholder-neutral-600 py-2 leading-tight"
                                            placeholder="Message..."
                                            rows={1}
                                            style={{ minHeight: '36px' }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleSend}
                                        disabled={!inputText.trim()}
                                        className={`p-2.5 rounded-full transition-all duration-200 shrink-0 flex items-center justify-center ${inputText.trim() ? 'bg-primary text-black hover:scale-105 hover:shadow-lg hover:shadow-primary/20' : 'bg-neutral-800 text-neutral-500'}`}
                                    >
                                        <Send size={18} fill={inputText.trim() ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-neutral-500 flex-col p-8">
                            <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mb-4">
                                <Search size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No Conversation Selected</h3>
                            <p className="text-sm text-center mb-6">Select a conversation from the sidebar to start messaging.</p>
                            <button
                                onClick={() => setIsCreatingNew(true)}
                                className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform"
                            >
                                Start New Conversation
                            </button>
                        </div>
                    )}
                </div>

                {isSidebarOpen && (
                    <div
                        className="absolute inset-0 bg-black/80 z-[48] lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                )}
            </div>
        </div >
    );
};

export default MessagesPage;