import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Note, Project, UserProfile } from '../types';
import { getNotes, createNote, updateNote, deleteNote, getUserFiles, uploadFile, getDeletedNotes, restoreNote, cleanupOldNotes, emptyTrashNotes, createNoteFolder } from '../services/supabaseService';
import ConfirmationModal from './ConfirmationModal';
import InputModal from './InputModal';
import { useToast } from '../contexts/ToastContext';
import {
    Plus,
    Copy,
    Trash2,
    FileText,
    Send,
    Globe,
    Mic,
    MoreVertical,
    X,
    Highlighter,
    Music,
    FolderOpen,
    Play,
    Pause,
    ChevronLeft,
    Paperclip,
    Headphones,
    Save,
    Book,
    Menu,
    Type,
    Minus,
    MessageSquare,
    ArrowRight,
    ArrowLeft,
    ChevronDown,
    RotateCcw,
    Trash,
    Edit2
} from 'lucide-react';
import { getRhymesForWord, chatWithGeneralAi } from '../services/geminiService';

// Mock rhyme database helper for suggestions sidebar
const MOCK_RHYMES: Record<string, string[]> = {
    'ing': ['King', 'Sing', 'Ring', 'Thing', 'Wing', 'Spring', 'Bling', 'Swing', 'Cling', 'Fling'],
    'at': ['Cat', 'Bat', 'Sat', 'Flat', 'Mat', 'Chat', 'That', 'Stat', 'Brat', 'Slat'],
    'ight': ['Night', 'Light', 'Fight', 'Sight', 'Bright', 'Height', 'Tight', 'White', 'Flight', 'Might'],
    'ove': ['Love', 'Dove', 'Above', 'Glove', 'Shove'],
    'ife': ['Life', 'Knife', 'Wife', 'Strife', 'Rife'],
    'ime': ['Time', 'Rhyme', 'Climb', 'Prime', 'Crime', 'Dime', 'Lime', 'Grime', 'Chime'],
    'ay': ['Day', 'Way', 'Say', 'Play', 'Stay', 'Gray', 'Pray', 'Away', 'Slay', 'Tray'],
    'eam': ['Dream', 'Team', 'Beam', 'Cream', 'Steam', 'Stream', 'Gleam', 'Scheme'],
    'one': ['Phone', 'Zone', 'Bone', 'Stone', 'Tone', 'Alone', 'Throne', 'Drone', 'Cone'],
    'all': ['Ball', 'Call', 'Fall', 'Tall', 'Wall', 'Small', 'Hall', 'Stall'],
    'eep': ['Deep', 'Keep', 'Sleep', 'Sweep', 'Weep', 'Creep', 'Steep', 'Sheep']
};

const RHYME_COLORS = [
    'text-blue-400',
    'text-green-400',
    'text-purple-400',
    'text-yellow-400',
    'text-pink-400',
    'text-orange-400',
    'text-cyan-400',
    'text-red-400'
];

// --- Dynamic Rhyme Analysis Engine ---
const analyzeRhymeScheme = (text: string, accent: 'US' | 'UK' = 'US') => {
    if (!text) return { wordToGroup: {}, groupToColor: {} };
    const words = text.split(/[^a-zA-Z']+/).filter(w => w.length > 0);
    const wordToGroup: Record<string, string> = {};
    const groupCounts: Record<string, number> = {};
    const getPhoneticGroup = (word: string) => {
        let lower = word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '');
        if (lower.length < 2) return null;
        if (['the', 'a', 'an', 'and', 'is', 'in', 'it', 'to', 'of', 'for', 'my', 'on', 'at', 'by', 'but', 'or'].includes(lower)) return null;
        if (accent === 'UK') {
            if (lower.endsWith('ance') || lower.endsWith('anch')) return 'ah_sound';
            if (lower.endsWith('ass') && lower !== 'bass') return 'ah_sound';
            if (lower.endsWith('ast')) return 'ah_sound';
            if (lower.endsWith('path')) return 'ah_sound';
            if (lower.endsWith('alf')) return 'ah_sound';
        }
        if (/ind$/.test(lower) || /ild$/.test(lower) || /igh(t?)$/.test(lower)) return 'long_i';
        if (lower.endsWith('y') && !/[aeiou]y$/.test(lower) && lower.length <= 3) return 'long_i';
        const silentEMatch = lower.match(/([aeiou])([^aeiou]+)e$/);
        if (silentEMatch && !['have', 'love', 'dove', 'glove', 'shove', 'one', 'done', 'none', 'gone'].includes(lower)) return `long_${silentEMatch[1]}`;
        const match = lower.match(/([aeiouy]+)([^aeiouy]*)$/);
        if (!match) return null;
        const [_, vowels, coda] = match;
        if (vowels === 'ie' || vowels === 'uy') return 'long_i';
        if ((vowels === 'ou' || vowels === 'ow') && ['t', 'nd', 'n', 'd', ''].includes(coda)) return 'ou_sound';
        if (vowels === 'ay' || (vowels === 'ai' && coda === 'n')) return 'long_a';
        if (vowels === 'ee' || vowels === 'ea') return 'long_e';
        if (vowels === 'y' && coda === '' && lower.length > 3) return 'long_e';
        return `${vowels}_${coda}`;
    };
    words.forEach(w => {
        const g = getPhoneticGroup(w);
        if (g) { wordToGroup[w.toLowerCase()] = g; groupCounts[g] = (groupCounts[g] || 0) + 1; }
    });
    const groupToColor: Record<string, string> = {};
    let cIdx = 0;
    Object.keys(groupCounts).sort((a, b) => groupCounts[b] - groupCounts[a]).forEach(g => {
        if (groupCounts[g] > 1) { groupToColor[g] = RHYME_COLORS[cIdx % RHYME_COLORS.length]; cIdx++; }
    });
    return { wordToGroup, groupToColor };
};

// Portal Components
const MobileTitlePortal = ({ activeNote, onUpdateTitle, onOpenSidebar }: any) => {
    const [target, setTarget] = useState<HTMLElement | null>(null);
    useEffect(() => { setTarget(document.getElementById('mobile-page-title')); }, []);
    if (!target || !activeNote) return null;
    return createPortal(
        <div className="flex items-center gap-2 w-full animate-in fade-in duration-300 min-w-0">
            <button onClick={onOpenSidebar} className="p-1 -ml-1 text-neutral-400 shrink-0"><Book size={18} /></button>
            <input value={activeNote.title} onChange={(e) => onUpdateTitle(e.target.value)} className="bg-transparent border-none text-sm font-bold text-white focus:outline-none p-0 w-full truncate" placeholder="Untitled Note" />
        </div>, target
    );
};

const MobileActionsPortal = ({ rhymeMode, setRhymeMode, setTextSize, isVisible }: any) => {
    const [target, setTarget] = useState<HTMLElement | null>(null);
    useEffect(() => { setTarget(document.getElementById('mobile-nav-actions')); }, []);
    if (!target || !isVisible) return null;
    return createPortal(
        <div className="flex items-center gap-1 animate-in fade-in duration-300">
            <button onClick={() => setRhymeMode(!rhymeMode)} className={`p-2 rounded-xl transition-all ${rhymeMode ? 'bg-primary text-black' : 'text-neutral-400 hover:bg-white/5'}`}><Highlighter size={18} /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={() => setTextSize((p: any) => p === 'xs' ? 'xs' : p === 'sm' ? 'xs' : p === 'base' ? 'sm' : 'base')} className="p-2 rounded-xl text-neutral-400"><Minus size={18} /></button>
            <button onClick={() => setTextSize((p: any) => p === 'xs' ? 'sm' : p === 'sm' ? 'base' : p === 'base' ? 'lg' : 'lg')} className="p-2 rounded-xl text-neutral-400"><Plus size={18} /></button>
        </div>, target
    );
};

interface NotesPageProps {
    userProfile: UserProfile | null;
    currentProject: Project | null;
    currentTrackId: string | null;
    isPlaying: boolean;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
}

const NotesPage: React.FC<NotesPageProps> = ({ userProfile, currentProject, currentTrackId, isPlaying, onPlayTrack, onTogglePlay }) => {
    const { showToast } = useToast();
    // State Declarations (Consolidated at top)
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [audioFiles, setAudioFiles] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'editor' | 'browser'>('editor');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [rhymes, setRhymes] = useState<string[]>([]);
    const [isRhymeLoading, setIsRhymeLoading] = useState(false);
    const [isToolkitOpen, setToolkitOpen] = useState(false);
    const [trashView, setTrashView] = useState(false);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [rhymeMode, setRhymeMode] = useState(false);
    const [accent, setAccent] = useState<'US' | 'UK'>('US');
    const [cursorIndex, setCursorIndex] = useState(0);
    const [selection, setSelection] = useState<any>(null);
    const [textSize, setTextSize] = useState<'xs' | 'sm' | 'base' | 'lg'>('xs');
    const [isSizeExpanded, setIsSizeExpanded] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [rhymeTrayHeight, setRhymeTrayHeight] = useState(180);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [contextMenu, setContextMenu] = useState<any>({ isOpen: false, x: 0, y: 0, note: null });
    const [inputModal, setInputModal] = useState<any>({ isOpen: false, onConfirm: () => { } });
    const [confirmationModal, setConfirmationModal] = useState<any>({ isOpen: false });
    const [moveModal, setMoveModal] = useState<{ isOpen: boolean; item: Note | null }>({ isOpen: false, item: null });

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<any>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const touchStartRef = useRef<number | null>(null);
    const rhymeTrayDragStart = useRef<number>(0);
    const rhymeTrayStartHeight = useRef<number>(0);
    const lastRhymedWordRef = useRef<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const hasHandledNavigation = useRef(false);
    const longPressTimerRef = useRef<any>(null);

    // Derived State (Must be after state/refs but before handlers that use them)
    const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);
    const { wordToGroup, groupToColor } = useMemo(() => activeNote ? analyzeRhymeScheme(activeNote.content, accent) : { wordToGroup: {}, groupToColor: {} }, [activeNote?.content, accent]);

    const getWordUnderCursor = (text: string, index: number) => {
        if (!text) return '';
        let start = index; while (start > 0 && /[a-zA-Z']/.test(text[start - 1])) start--;
        let end = index; while (end < text.length && /[a-zA-Z']/.test(text[end])) end++;
        return text.slice(start, end);
    };
    const currentWord = useMemo(() => activeNote ? getWordUnderCursor(activeNote.content, cursorIndex) : '', [activeNote, cursorIndex]);
    const suggestions = rhymes;

    // Handlers
    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const data = trashView ? await getDeletedNotes() : await getNotes();
            setNotes(data);
            if (data.length > 0 && (!activeNoteId || !data.find(n => n.id === activeNoteId))) setActiveNoteId(data[0].id);
            else if (data.length === 0) setActiveNoteId(null);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [trashView, activeNoteId]);

    useEffect(() => { fetchNotes(); }, [fetchNotes]);

    // Auto-open sidebar on mobile when no note is selected
    useEffect(() => {
        if (window.innerWidth < 1024 && !activeNoteId && !loading) {
            setIsSidebarOpen(true);
        }
    }, [activeNoteId, loading]);

    const handleUpdateContent = (val: string) => {
        if (!activeNote) return;
        setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: val } : n));
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => updateNote(activeNote.id, { content: val }).catch(console.error), 1000);
    };

    const handleUpdateTitle = (val: string) => {
        if (!activeNote) return;
        setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, title: val } : n));
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => updateNote(activeNote.id, { title: val }).catch(console.error), 1000);
    };

    const handleRhymeSearch = async (word: string) => {
        if (!word) return; setIsRhymeLoading(true);
        try { const results = await getRhymesForWord(word); setRhymes(results); } catch (e) { console.error(e); } finally { setIsRhymeLoading(false); }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim() || chatLoading) return;
        const userMsg = { role: 'user', text: chatInput };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput(''); setChatLoading(true);
        try {
            const response = await chatWithGeneralAi([...chatMessages, userMsg], activeNote?.content);
            setChatMessages(prev => [...prev, { role: 'model', text: response }]);
            setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }), 10);
        } catch (e) { console.error(e); } finally { setChatLoading(false); }
    };

    const handleCreateNote = async (title: string = 'Untitled Note', content: string = '', audio?: string, meta?: any) => {
        try {
            const newNote = await createNote(title, content, audio, meta, currentFolderId);
            setNotes(prev => [newNote, ...prev]);
            setActiveNoteId(newNote.id);
            setViewMode('editor');
            setIsSidebarOpen(false);
        } catch (e) { console.error(e); }
    };

    const handleCreateFolderClick = async () => {
        try { const newFolder = await createNoteFolder('New Folder', currentFolderId); setNotes(prev => [newFolder, ...prev]); if (window.innerWidth >= 1024) { setEditingItemId(newFolder.id); setEditingValue('New Folder'); } } catch (e) { console.error(e); }
    };

    const handleConfirmAction = async () => {
        if (confirmationModal.type === 'delete' && confirmationModal.noteId) {
            try { await deleteNote(confirmationModal.noteId, trashView); fetchNotes(); } catch (e) { console.error(e); }
        } else if (confirmationModal.type === 'emptyTrash') {
            try { await emptyTrashNotes(); setNotes([]); setActiveNoteId(null); } catch (e) { console.error(e); }
        }
        setConfirmationModal({ isOpen: false });
    };

    const handleMoveItem = async (itemId: string, targetFolderId: string | null) => {
        try {
            await updateNote(itemId, { parentId: targetFolderId });
            setNotes(prev => prev.map(n => n.id === itemId ? { ...n, parentId: targetFolderId } : n));
            showToast('Item moved successfully', 'success');
            setMoveModal({ isOpen: false, item: null });
        } catch (e) {
            console.error(e);
            showToast('Failed to move item', 'error');
        }
    };

    const handleLongPress = (item: Note, e: React.TouchEvent) => {
        e.preventDefault();
        setContextMenu({
            isOpen: true,
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            note: item
        });
    };

    // UI Renderers
    const renderHighlightedText = (text: string) => {
        if (!text) return null; return text.split(/([^a-zA-Z0-9_']+)/).map((token, i) => {
            let cls = 'text-transparent'; if (rhymeMode) { const g = wordToGroup[token.toLowerCase()]; cls = g ? (groupToColor[g] || 'text-neutral-500') : 'text-neutral-500'; }
            return <span key={i} className={`${cls} transition-colors duration-300`}>{token}</span>;
        });
    };

    const renderEditorView = () => (
        <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
            <MobileTitlePortal activeNote={activeNote} onUpdateTitle={handleUpdateTitle} onOpenSidebar={() => setIsSidebarOpen(true)} />
            <MobileActionsPortal rhymeMode={rhymeMode} setRhymeMode={setRhymeMode} setTextSize={setTextSize} isVisible={!isSidebarOpen && !isChatOpen} />
            <div className="flex-1 relative overflow-hidden">
                <div
                    className="absolute inset-0 flex flex-row w-[200%] h-full transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                    style={{ transform: isChatOpen ? 'translateX(-50%)' : 'translateX(0%)' }}
                    onTouchStart={(e) => touchStartRef.current = e.touches[0].clientX}
                    onTouchEnd={(e) => {
                        if (!touchStartRef.current) return;
                        const deltaX = e.changedTouches[0].clientX - touchStartRef.current;
                        // deltaX < 0 means swiping LEFT (reveals right side / chat)
                        // deltaX > 0 means swiping RIGHT (reveals left side / editor)
                        if (deltaX < -40) setIsChatOpen(true);
                        if (deltaX > 40) setIsChatOpen(false);
                        touchStartRef.current = null;
                    }}
                >
                    {/* Editor Panel (Left - Default View) */}
                    <div className="w-1/2 h-full flex flex-col relative overflow-hidden">
                        {activeNote?.attachedAudio && (
                            <div className="h-12 bg-neutral-900 border-b border-white/5 flex items-center justify-between px-3 shrink-0 z-20">
                                <span className="text-xs font-bold text-white truncate">{activeNote.attachedAudio.split('/').pop()}</span>
                                <button onClick={() => { const url = audioFiles.find(f => f.name === activeNote.attachedAudio)?.url || activeNote.attachedAudio; const tid = `note-audio-${activeNote.id}`; if (currentTrackId === tid) onTogglePlay(); else onPlayTrack({ id: `p-${activeNote.id}`, title: 'Note Audio', producer: 'System', tracks: [{ id: tid, title: 'Audio', files: { mp3: url } }] } as any, tid); }} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center">{(currentTrackId === `note-audio-${activeNote.id}` && isPlaying) ? <Pause size={12} fill="black" /> : <Play size={12} fill="black" />}</button>
                            </div>
                        )}
                        <div className="flex-1 relative font-mono overflow-y-auto custom-scrollbar bg-[#050505]" onScroll={() => { if (textareaRef.current && backdropRef.current) backdropRef.current.scrollTop = textareaRef.current.scrollTop; }}>
                            <div className="grid grid-cols-1 grid-rows-1 min-h-full relative">
                                <div ref={backdropRef} className={`col-start-1 row-start-1 p-5 w-full whitespace-pre-wrap break-words pointer-events-none z-0 ${textSize === 'xs' ? 'text-[11px]' : 'text-[15px]'}`} style={{ paddingBottom: `${rhymeTrayHeight + 200}px` }}>{activeNote && renderHighlightedText(activeNote.content + ' ')}</div>
                                <textarea ref={textareaRef} className={`col-start-1 row-start-1 w-full h-full bg-transparent p-5 resize-none focus:outline-none z-10 whitespace-pre-wrap break-words ${textSize === 'xs' ? 'text-[11px]' : 'text-[15px]'} ${rhymeMode ? 'text-transparent caret-white' : 'text-neutral-300'}`} style={{ paddingBottom: `${rhymeTrayHeight + 200}px` }} value={activeNote?.content || ''} onChange={(e) => { handleUpdateContent(e.target.value); setCursorIndex(e.target.selectionStart); const w = getWordUnderCursor(e.target.value, e.target.selectionStart); if (w && w.length > 2 && w !== lastRhymedWordRef.current) { lastRhymedWordRef.current = w; handleRhymeSearch(w); } }} onSelect={(e: any) => { setCursorIndex(e.target.selectionStart); if (e.target.selectionStart !== e.target.selectionEnd) setSelection({ text: e.target.value.substring(e.target.selectionStart, e.target.selectionEnd) }); else setSelection(null); }} placeholder="Start writing..." spellCheck={false} />
                            </div>
                        </div>
                    </div>
                    {/* Chat Panel (Right - Slides in from right) */}
                    <div className="w-1/2 h-full flex flex-col bg-[#050505] border-l border-white/5 relative overflow-hidden">
                        {/* Chat Header with Back Arrow */}
                        <div className="lg:hidden h-12 bg-black border-b border-white/5 flex items-center px-3 shrink-0 z-20">
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="p-2 -ml-1 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <ChevronLeft size={18} />
                                <span className="text-xs font-bold">Back to Editor</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black" ref={chatScrollRef}>
                            {chatMessages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-neutral-600 opacity-30"><MessageSquare size={48} /><p className="text-sm">How can I help?</p></div>}
                            {chatMessages.map((msg, i) => <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3.5 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-black' : 'bg-neutral-900 text-neutral-200 border border-neutral-800'}`}>{msg.text}</div></div>)}
                        </div>
                        <div
                            className="p-4 lg:pb-4 bg-black border-t border-white/5"
                            style={{
                                paddingBottom: currentTrackId
                                    ? `calc(2rem + 106px + env(safe-area-inset-bottom))`
                                    : `calc(1.5rem + 50px + env(safe-area-inset-bottom))`
                            }}
                        >
                            <div className="relative flex items-center">
                                <input className="w-full bg-neutral-900 border border-white/5 rounded-full pl-5 pr-12 py-3.5 text-sm text-white focus:outline-none" placeholder="Ask me for advice..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} />
                                <button onClick={handleSendChat} className="absolute right-1.5 w-10 h-10 flex items-center justify-center bg-primary text-black rounded-full">
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`lg:hidden fixed ${currentTrackId ? 'bottom-[106px]' : 'bottom-[50px]'} left-0 right-0 z-[70] flex flex-col bg-[#050505] border-t border-white/5 pb-[env(safe-area-inset-bottom)] transition-opacity duration-300 ${isChatOpen || isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="w-full flex flex-col bg-[#0A0A0A] relative border-t border-white/5" style={{ height: `${rhymeTrayHeight}px` }}>
                    <div className="absolute -top-4 left-0 right-0 h-8 z-[70] flex items-center justify-center cursor-row-resize" onTouchStart={(e) => { e.stopPropagation(); rhymeTrayDragStart.current = e.touches[0].clientY; rhymeTrayStartHeight.current = rhymeTrayHeight; }} onTouchMove={(e) => { e.stopPropagation(); const dy = e.touches[0].clientY - rhymeTrayDragStart.current; setRhymeTrayHeight(Math.min(Math.max(rhymeTrayStartHeight.current - dy, 100), window.innerHeight * 0.8)); }}>
                        <div className="w-12 h-1 bg-white/30 rounded-full" />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Target: {currentWord || "..."}</span>
                            <button onClick={() => handleRhymeSearch(currentWord)} className="p-1.5 text-neutral-500 hover:text-white transition-colors">
                                <RotateCcw size={14} className={isRhymeLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {isRhymeLoading ? (
                                <div className="w-full text-center text-[10px] text-neutral-500 animate-pulse">Rhyming...</div>
                            ) : suggestions.map((w, i) => (
                                <button key={i} className="px-3 py-2 bg-neutral-900 border border-white/5 rounded-lg text-xs text-neutral-300 active:bg-primary active:text-black transition-all" onClick={() => handleUpdateContent((activeNote?.content || "") + " " + w)}>
                                    {w}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Integrated Swipe Trigger - Highly Visible */}
                    <div
                        className="w-full py-4 bg-black border-t border-white/10 flex items-center justify-center gap-3 cursor-pointer shrink-0 z-[80]"
                        onClick={() => setIsChatOpen(true)}
                    >
                        <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-primary/10 border-2 border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.1)] active:scale-95 transition-all">
                            <ArrowLeft size={16} className="text-secondary animate-pulse" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.15em] drop-shadow-sm">
                                Swipe Left for AI Assistant
                            </span>
                            <ArrowLeft size={16} className="text-secondary animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderBrowserView = () => (
        <div className="flex-1 p-4 overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-6">Audio Files</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {audioFiles.map(file => <div key={file.id} onClick={() => { if (activeNoteId) { setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, attachedAudio: file.name } : n)); setViewMode('editor'); updateNote(activeNoteId, { attachedAudio: file.name }).catch(console.error); } }} className={`p-4 rounded-xl border ${activeNote?.attachedAudio === file.name ? 'border-primary bg-primary/10' : 'border-white/5 bg-neutral-900/50'} cursor-pointer`}><Music size={18} /><h3 className="text-xs font-bold text-white truncate mt-2">{file.name}</h3></div>)}
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center p-4 text-neutral-500 cursor-pointer min-h-[100px]"><input type="file" ref={fileInputRef} onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { await uploadFile(f); const files = await getUserFiles(); setAudioFiles(files.filter(fi => fi.type === 'audio')); } catch (err) { console.error(err); } } }} accept="audio/*" className="hidden" /><Plus size={20} /><span>Upload</span></div>
            </div>
        </div>
    );

    const visibleItems = useMemo(() => notes.filter(n => {
        if (trashView) return n.tags?.includes('TRASH');
        const matchesParent = (n.parentId || null) === currentFolderId;
        const matchesSearch = searchQuery ? n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return !n.tags?.includes('TRASH') && (searchQuery ? matchesSearch : matchesParent);
    }).sort((a, b) => (a.type === 'folder' ? -1 : 1) || new Date(b.updated).getTime() - new Date(a.updated).getTime()), [notes, currentFolderId, trashView, searchQuery]);

    const isOverlayOpen = isSidebarOpen || isToolkitOpen || isSizeExpanded;

    return (
        <div className={`w-full flex flex-col overflow-hidden fixed inset-x-0 bottom-0 top-[56px] ${isOverlayOpen ? 'z-[80]' : 'z-10'} bg-[#050505] lg:relative lg:top-0 lg:h-full`}>
            <div className="flex-1 flex bg-[#0a0a0a] overflow-hidden relative">
                <div className={`absolute lg:static inset-y-0 left-0 z-[90] w-full lg:w-80 lg:border-r border-white/5 flex flex-col bg-black transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {currentFolderId && (
                                <button
                                    onClick={() => {
                                        const currentFolder = notes.find(n => n.id === currentFolderId);
                                        setCurrentFolderId(currentFolder?.parentId || null);
                                    }}
                                    className="p-1.5 -ml-1.5 rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                            )}
                            <h3 className="text-[10px] font-bold text-white uppercase">
                                {currentFolderId ? notes.find(n => n.id === currentFolderId)?.title || 'Folder' : 'Notebook'}
                            </h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleCreateFolderClick} className="text-neutral-400"><FolderOpen size={16} /></button>
                            <button onClick={() => handleCreateNote()} className="text-neutral-400"><Plus size={16} /></button>
                            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-neutral-400"><X size={16} /></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {visibleItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    if (item.type === 'folder') {
                                        // Navigate into folder, stay on sidebar
                                        setCurrentFolderId(item.id);
                                    } else {
                                        // Select note and close sidebar on mobile
                                        setActiveNoteId(item.id);
                                        setIsSidebarOpen(false);
                                    }
                                }}
                                onTouchStart={(e) => {
                                    longPressTimerRef.current = setTimeout(() => {
                                        handleLongPress(item, e);
                                    }, 500);
                                }}
                                onTouchEnd={() => {
                                    if (longPressTimerRef.current) {
                                        clearTimeout(longPressTimerRef.current);
                                    }
                                }}
                                onTouchMove={() => {
                                    if (longPressTimerRef.current) {
                                        clearTimeout(longPressTimerRef.current);
                                    }
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({
                                        isOpen: true,
                                        x: e.clientX,
                                        y: e.clientY,
                                        note: item
                                    });
                                }}
                                className={`p-3 rounded-lg flex items-center justify-between group ${activeNoteId === item.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'} cursor-pointer`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {item.type === 'folder'
                                        ? <FolderOpen size={14} className="text-yellow-500" />
                                        : <FileText size={14} className="text-primary" />
                                    }
                                    <span className="text-xs font-bold text-white truncate">{item.title}</span>
                                </div>
                                {/* Mobile: Always visible menu button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setContextMenu({
                                            isOpen: true,
                                            x: e.currentTarget.getBoundingClientRect().right,
                                            y: e.currentTarget.getBoundingClientRect().top,
                                            note: item
                                        });
                                    }}
                                    className="lg:opacity-0 lg:group-hover:opacity-100 text-neutral-500 hover:text-white p-1 transition-opacity"
                                >
                                    <MoreVertical size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 flex flex-col relative w-full overflow-hidden">
                    {activeNote ? <div className="flex-1 flex flex-col overflow-hidden"><div className="hidden lg:flex h-16 border-b border-white/5 items-center justify-between px-6 bg-neutral-900/40 z-20 shrink-0"><input value={activeNote.title} onChange={e => handleUpdateTitle(e.target.value)} className="bg-transparent text-sm font-bold text-white border-none focus:outline-none w-64" /><div className="flex items-center gap-4"><button onClick={() => setViewMode(viewMode === 'editor' ? 'browser' : 'editor')} className="text-[10px] font-bold text-neutral-400 uppercase">Attach</button><div className="w-px h-4 bg-white/10"></div><button onClick={() => showToast("Export soon!", "info")} className="text-[10px] font-bold text-neutral-400 uppercase">Export</button></div></div>{viewMode === 'editor' ? renderEditorView() : renderBrowserView()}</div> : <div className="flex-1 flex items-center justify-center text-neutral-600 flex-col gap-4"><Book size={32} opacity={0.3} /><p className="text-sm">Select or create a note.</p></div>}
                </div>
            </div>
            {contextMenu.isOpen && contextMenu.note && createPortal(
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    note={contextMenu.note}
                    onRename={() => setInputModal({
                        isOpen: true,
                        title: 'Rename',
                        initialValue: contextMenu.note.title,
                        onConfirm: async (val: string) => {
                            setNotes(prev => prev.map(n => n.id === contextMenu.note.id ? { ...n, title: val } : n));
                            await updateNote(contextMenu.note.id, { title: val });
                        }
                    })}
                    onDelete={() => setConfirmationModal({
                        isOpen: true,
                        type: 'delete',
                        noteId: contextMenu.note.id,
                        title: 'Delete',
                        message: `Move "${contextMenu.note.title}" to trash?`
                    })}
                    onMove={() => setMoveModal({ isOpen: true, item: contextMenu.note })}
                    onClose={() => setContextMenu((p: any) => ({ ...p, isOpen: false }))}
                />,
                document.body
            )}
            {createPortal(<InputModal isOpen={inputModal.isOpen} onClose={() => setInputModal((p: any) => ({ ...p, isOpen: false }))} onConfirm={inputModal.onConfirm} title={inputModal.title} initialValue={inputModal.initialValue} />, document.body)}
            {createPortal(<ConfirmationModal isOpen={confirmationModal.isOpen} onClose={() => setConfirmationModal({ isOpen: false })} onConfirm={handleConfirmAction} title={confirmationModal.title} message={confirmationModal.message} isDestructive />, document.body)}
            <MoveModal
                isOpen={moveModal.isOpen}
                item={moveModal.item}
                folders={notes}
                currentFolderId={currentFolderId}
                onMove={(targetId) => moveModal.item && handleMoveItem(moveModal.item.id, targetId)}
                onClose={() => setMoveModal({ isOpen: false, item: null })}
            />
        </div>
    );
};

const ContextMenu = ({ x, y, note, onRename, onDelete, onMove, onClose }: any) => {
    const style: any = { top: y, left: x };
    if (x + 200 > window.innerWidth) style.left = x - 200;
    if (y + 150 > window.innerHeight) style.top = y - 150;

    return (
        <>
            {/* Backdrop to close menu */}
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div style={style} className="fixed z-[9999] w-52 bg-[#111] rounded-xl shadow-2xl py-2 border border-white/10" onClick={e => e.stopPropagation()}>
                <button onClick={() => { onRename(); onClose(); }} className="w-full text-left px-4 py-3 text-xs text-neutral-300 hover:bg-white/5 flex items-center gap-3 active:bg-white/10">
                    <Edit2 size={14} /> Rename
                </button>
                <button onClick={() => { onMove(); onClose(); }} className="w-full text-left px-4 py-3 text-xs text-neutral-300 hover:bg-white/5 flex items-center gap-3 active:bg-white/10">
                    <FolderOpen size={14} /> Move to Folder
                </button>
                <div className="h-px bg-white/10 my-1" />
                <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-4 py-3 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-3 active:bg-red-500/20">
                    <Trash2 size={14} /> Delete
                </button>
            </div>
        </>
    );
};

interface MoveModalProps {
    isOpen: boolean;
    item: Note | null;
    folders: Note[];
    currentFolderId: string | null;
    onMove: (targetId: string | null) => void;
    onClose: () => void;
}

const MoveModal: React.FC<MoveModalProps> = ({ isOpen, item, folders, currentFolderId, onMove, onClose }) => {
    if (!isOpen || !item) return null;

    // Filter out the item being moved and its children (if it's a folder)
    const availableFolders = folders.filter(f =>
        f.type === 'folder' &&
        f.id !== item.id &&
        f.parentId !== item.id
    );

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="w-full max-w-sm bg-[#111] rounded-2xl border border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white">Move "{item.title}"</h3>
                    <p className="text-xs text-neutral-500 mt-1">Select destination folder</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    {/* Root option */}
                    <button
                        onClick={() => onMove(null)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-colors ${item.parentId === null ? 'bg-primary/10 text-primary' : 'text-neutral-300'}`}
                    >
                        <Book size={16} />
                        <span className="text-xs font-medium">Notebook (Root)</span>
                    </button>
                    {availableFolders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => onMove(folder.id)}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 active:bg-white/10 transition-colors ${item.parentId === folder.id ? 'bg-primary/10 text-primary' : 'text-neutral-300'}`}
                        >
                            <FolderOpen size={16} className="text-yellow-500" />
                            <span className="text-xs font-medium truncate">{folder.title}</span>
                        </button>
                    ))}
                    {availableFolders.length === 0 && (
                        <div className="px-4 py-6 text-center text-xs text-neutral-600">
                            No folders available. Create a folder first.
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-white/10">
                    <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-white/5 text-xs font-bold text-neutral-400 hover:bg-white/10 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default NotesPage;
