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

    // New Conversation Modal State
    const [isNewMsgModalOpen, setIsNewMsgModalOpen] = useState(false);
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

            setIsNewMsgModalOpen(false);
            setUserSearchQuery('');
            setSearchResults([]);

            // Refresh conversations
            setLoading(true);
            const { getConversations } = await import('../services/supabaseService');
            const data = await getConversations();
            setConversations(data);
            setActiveId(newConvId); // Select the new conversation
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
            ${activeId ? 'hidden lg:flex' : 'flex'}
        `}>
                <div className="p-4 border-b border-neutral-800">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">Messages</h2>
                        <button
                            onClick={() => setIsNewMsgModalOpen(true)}
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
                            onClick={() => setActiveId(conv.id)}
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
                                <button onClick={() => setIsNewMsgModalOpen(true)} className="text-xs text-primary mt-2 hover:underline">Start a new one</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`
            flex-1 flex-col bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden
            ${activeId ? 'flex' : 'hidden lg:flex'}
        `}>
                {activeConv ? (
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
                            onClick={() => setIsNewMsgModalOpen(true)}
                            className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm text-white transition-colors"
                        >
                            Start New Conversation
                        </button>
                    </div>
                )}
            </div>

            {/* New Conversation Modal */}
            {isNewMsgModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">New Message</h3>
                            <button onClick={() => setIsNewMsgModalOpen(false)} className="text-neutral-500 hover:text-white"><ArrowLeft size={20} /></button>
                        </div>
                        <div className="p-4">
                            <div className="relative mb-4">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                <input
                                    autoFocus
                                    value={userSearchQuery}
                                    onChange={(e) => handleUserSearch(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/50"
                                    placeholder="Search people..."
                                />
                            </div>

                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                {isSearchingUsers ? (
                                    <div className="text-center py-4 text-neutral-500 text-sm">Searching...</div>
                                ) : userSearchQuery.length > 1 && searchResults.length === 0 ? (
                                    <div className="text-center py-4 text-neutral-500 text-sm">No users found.</div>
                                ) : (
                                    <div className="space-y-1">
                                        {searchResults.map(user => (
                                            <div
                                                key={user.id}
                                                onClick={() => handleStartConversation(user.id)}
                                                className={`flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors ${isStartingConversation ? 'opacity-50 pointer-events-none' : ''}`}
                                            >
                                                <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-white">{user.username}</h4>
                                                    <p className="text-xs text-neutral-500">@{user.handle}</p>
                                                </div>
                                                {isStartingConversation && (
                                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!userSearchQuery && (
                                    <div className="text-center py-8 text-neutral-600 text-xs">
                                        Type a name or handle to find users.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessagesPage;