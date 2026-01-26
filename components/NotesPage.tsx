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
        try { const newNote = await createNote(title, content, audio, meta); setNotes(prev => [newNote, ...prev]); setActiveNoteId(newNote.id); setViewMode('editor'); setIsSidebarOpen(false); } catch (e) { console.error(e); }
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
                <div className="absolute inset-0 flex flex-row w-[200%] h-full transition-transform duration-500" style={{ transform: isChatOpen ? 'translateX(0%)' : 'translateX(-50%)' }} onTouchStart={(e) => touchStartRef.current = e.touches[0].clientX} onTouchEnd={(e) => { if (!touchStartRef.current) return; const d = touchStartRef.current - e.changedTouches[0].clientX; if (d < -50) setIsChatOpen(true); if (d > 50) setIsChatOpen(false); touchStartRef.current = null; }}>
                    <div className="w-1/2 h-full flex flex-col bg-[#050505] border-r border-white/5 relative overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black" ref={chatScrollRef}>
                            {chatMessages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-neutral-600 opacity-30"><MessageSquare size={48} /><p className="text-sm">How can I help?</p></div>}
                            {chatMessages.map((msg, i) => <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3.5 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-black' : 'bg-neutral-900 text-neutral-200 border border-neutral-800'}`}>{msg.text}</div></div>)}
                        </div>
                        <div className="p-4 bg-black border-t border-white/5"><div className="relative flex items-center"><input className="w-full bg-neutral-900 border border-white/5 rounded-full pl-5 pr-12 py-3.5 text-sm text-white focus:outline-none" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} /><button onClick={handleSendChat} className="absolute right-1.5 w-10 h-10 flex items-center justify-center bg-primary text-black rounded-full"><ArrowRight size={18} /></button></div></div>
                    </div>
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
                </div>
            </div>
            <div className={`lg:hidden fixed bottom-20 left-0 right-0 z-[70] flex flex-col bg-[#050505] border-t border-white/5 pb-[env(safe-area-inset-bottom)] transition-opacity duration-300 ${isChatOpen || isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
                            <ArrowRight size={16} className="text-secondary animate-pulse" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.15em] drop-shadow-sm">
                                Swipe Right for AI Assistant
                            </span>
                            <ArrowRight size={16} className="text-secondary animate-pulse" />
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
                    <div className="p-4 border-b border-white/5 flex items-center justify-between"><h3 className="text-[10px] font-bold text-white uppercase">Notebook</h3><div className="flex gap-2"><button onClick={handleCreateFolderClick} className="text-neutral-400"><FolderOpen size={16} /></button><button onClick={() => handleCreateNote()} className="text-neutral-400"><Plus size={16} /></button><button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-neutral-400"><X size={16} /></button></div></div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">{visibleItems.map(item => <div key={item.id} onClick={() => { if (item.type === 'folder') setCurrentFolderId(item.id); else setActiveNoteId(item.id); setIsSidebarOpen(false); }} className={`p-3 rounded-lg flex items-center justify-between group ${activeNoteId === item.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-white/5 border border-transparent'} cursor-pointer`}><div className="flex items-center gap-3 overflow-hidden">{item.type === 'folder' ? <FolderOpen size={14} className="text-yellow-500" /> : <FileText size={14} className="text-primary" />}<span className="text-xs font-bold text-white truncate">{item.title}</span></div><button onClick={(e) => { e.stopPropagation(); setConfirmationModal({ isOpen: true, type: 'delete', noteId: item.id, title: 'Delete', message: `Move "${item.title}" to trash?` }); }} className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-500"><Trash2 size={12} /></button></div>)}</div>
                </div>
                <div className="flex-1 flex flex-col relative w-full overflow-hidden">
                    {activeNote ? <div className="flex-1 flex flex-col overflow-hidden"><div className="hidden lg:flex h-16 border-b border-white/5 items-center justify-between px-6 bg-neutral-900/40 z-20 shrink-0"><input value={activeNote.title} onChange={e => handleUpdateTitle(e.target.value)} className="bg-transparent text-sm font-bold text-white border-none focus:outline-none w-64" /><div className="flex items-center gap-4"><button onClick={() => setViewMode(viewMode === 'editor' ? 'browser' : 'editor')} className="text-[10px] font-bold text-neutral-400 uppercase">Attach</button><div className="w-px h-4 bg-white/10"></div><button onClick={() => showToast("Export soon!", "info")} className="text-[10px] font-bold text-neutral-400 uppercase">Export</button></div></div>{viewMode === 'editor' ? renderEditorView() : renderBrowserView()}</div> : <div className="flex-1 flex items-center justify-center text-neutral-600 flex-col gap-4"><Book size={32} opacity={0.3} /><p className="text-sm">Select or create a note.</p></div>}
                </div>
            </div>
            {contextMenu.isOpen && contextMenu.note && createPortal(<ContextMenu x={contextMenu.x} y={contextMenu.y} note={contextMenu.note} onRename={() => setInputModal({ isOpen: true, title: 'Rename', initialValue: contextMenu.note.title, onConfirm: async (val: string) => { setNotes(prev => prev.map(n => n.id === contextMenu.note.id ? { ...n, title: val } : n)); await updateNote(contextMenu.note.id, { title: val }); } })} onDelete={() => setNotes(prev => prev.filter(n => n.id !== contextMenu.note.id))} onClose={() => setContextMenu((p: any) => ({ ...p, isOpen: false }))} />, document.body)}
            {createPortal(<InputModal isOpen={inputModal.isOpen} onClose={() => setInputModal((p: any) => ({ ...p, isOpen: false }))} onConfirm={inputModal.onConfirm} title={inputModal.title} initialValue={inputModal.initialValue} />, document.body)}
            {createPortal(<ConfirmationModal isOpen={confirmationModal.isOpen} onClose={() => setConfirmationModal({ isOpen: false })} onConfirm={handleConfirmAction} title={confirmationModal.title} message={confirmationModal.message} isDestructive />, document.body)}
        </div>
    );
};

const ContextMenu = ({ x, y, note, onRename, onDelete, onClose }: any) => {
    const style = { top: y, left: x }; if (x + 200 > window.innerWidth) style.left = x - 200;
    return (
        <div style={style} className="fixed z-[9999] w-48 bg-[#0a0a0a] rounded-xl shadow-2xl py-1 border border-white/10" onClick={e => e.stopPropagation()}>
            <button onClick={() => { onRename(); onClose(); }} className="w-full text-left px-4 py-2 text-xs text-neutral-300 hover:bg-white/5 flex items-center gap-2"><Edit2 size={12} /> Rename</button>
            <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2"><Trash2 size={12} /> Delete</button>
        </div>
    );
};

export default NotesPage;
