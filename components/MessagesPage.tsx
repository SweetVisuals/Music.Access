import React, { useState, useEffect } from 'react';
import { Conversation } from '../types';
import { Search, Send, Paperclip, MoreVertical, Phone, Video, ArrowLeft, Plus } from 'lucide-react';
import { getConversations } from '../services/supabaseService';

const MessagesPage: React.FC = () => {
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
        if (window.innerWidth >= 1024 && !activeId && filteredConversations.length > 0) {
            setActiveId(filteredConversations[0].id);
        }
    }, [filteredConversations]);

    const activeConv = conversations.find(c => c.id === activeId);

    const handleSend = () => {
        if (!inputText.trim() || !activeConv) return;
        const newMsg = {
            id: Date.now().toString(),
            sender: 'Me',
            avatar: '',
            text: inputText,
            timestamp: 'Just now',
            isMe: true
        };

        const updatedConv = {
            ...activeConv,
            messages: [...activeConv.messages, newMsg],
            lastMessage: inputText,
            timestamp: 'Just now'
        };

        const updatedList = conversations.map(c => c.id === activeId ? updatedConv : c);
        setConversations(updatedList);
        // Also update filtered list to reflect changes immediately if it's there
        setFilteredConversations(prev => prev.map(c => c.id === activeId ? updatedConv : c));

        setInputText('');
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

    return (
        <div className="w-full h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] max-w-[1600px] mx-auto p-4 lg:p-8 flex gap-6 animate-in fade-in duration-500 relative">
            {/* List */}
            <div className={`
            w-full lg:w-80 flex-col bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden
            ${(activeId || isCreatingNew) ? 'hidden lg:flex' : 'flex'}
        `}>
                <div className="p-4 border-b border-neutral-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Messages</h2>
                        <button
                            onClick={() => {
                                setIsCreatingNew(true);
                                setActiveId(null);
                            }}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-neutral-300 hover:text-white transition-colors"
                            title="New Message"
                        >
                            <Plus size={18} />
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
                        <div
                            key={conv.id}
                            onClick={() => {
                                setActiveId(conv.id);
                                setIsCreatingNew(false);
                            }}
                            className={`p-4 flex items-center gap-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${activeId === conv.id ? 'bg-white/5 border-l-2 border-l-primary' : ''}`}
                        >
                            <div className="relative">
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
                    )) : (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <p className="text-neutral-500 font-mono text-xs">No conversations found.</p>
                                <button onClick={() => { setIsCreatingNew(true); setActiveId(null); }} className="text-xs text-primary mt-2 hover:underline">Start a new one</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`
            flex-1 flex-col bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden
            ${(activeId || isCreatingNew) ? 'flex' : 'hidden lg:flex'}
        `}>
                {isCreatingNew ? (
                    // --- NEW CONVERSATION VIEW ---
                    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Header: To Input */}
                        <div className="h-16 border-b border-neutral-800 flex items-center px-4 bg-neutral-900/30 gap-3">
                            <button
                                onClick={() => setIsCreatingNew(false)}
                                className="lg:hidden p-2 -ml-2 text-neutral-400 hover:text-white"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <span className="text-neutral-400 text-sm font-bold">To:</span>
                            <div className="flex-1 relative">
                                <input
                                    autoFocus
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
                        <div className="h-16 border-b border-neutral-800 flex items-center justify-between px-4 lg:px-6 bg-neutral-900/30 shrink-0">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveId(null)} className="lg:hidden p-2 -ml-2 text-neutral-400 hover:text-white">
                                    <ArrowLeft size={18} />
                                </button>
                                <img src={activeConv.avatar} className="w-8 h-8 rounded-full object-cover" />
                                <div>
                                    <h3 className="text-sm font-bold text-white">{activeConv.user}</h3>
                                    <span className="text-[10px] text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-neutral-400">
                                <button className="p-2 hover:bg-white/5 rounded"><Phone size={18} /></button>
                                <button className="p-2 hover:bg-white/5 rounded"><Video size={18} /></button>
                                <button className="p-2 hover:bg-white/5 rounded"><MoreVertical size={18} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 custom-scrollbar bg-dot-grid">
                            {activeConv.messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] lg:max-w-[70%] rounded-2xl px-4 py-3 ${msg.isMe ? 'bg-primary text-black rounded-br-none' : 'bg-neutral-800 text-white rounded-bl-none'}`}>
                                        <p className="text-sm leading-relaxed">{msg.text}</p>
                                        <span className={`text-[9px] block mt-1 opacity-70 ${msg.isMe ? 'text-black/70' : 'text-neutral-400'}`}>{msg.timestamp}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 shrink-0">
                            <div className="flex items-end gap-2">
                                <button className="p-3 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg"><Paperclip size={20} /></button>
                                <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg p-2 focus-within:border-primary/50 transition-colors">
                                    <textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                                        className="w-full bg-transparent text-sm text-white p-1 focus:outline-none resize-none h-10 max-h-32 custom-scrollbar"
                                        placeholder="Type a message..."
                                    />
                                </div>
                                <button onClick={handleSend} className="p-3 bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors"><Send size={20} /></button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-neutral-500 flex-col">
                        <p>Select a conversation to start messaging</p>
                        <button
                            onClick={() => setIsCreatingNew(true)}
                            className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm text-white transition-colors"
                        >
                            Start New Conversation
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default MessagesPage;