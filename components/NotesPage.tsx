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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

// --- AI Helper Utilities ---
interface DiffSuggestion {
    original: string;
    replacement: string;
}

const parseAiResponse = (text: string): { display: string; diff: DiffSuggestion | null } => {
    // Regex to match <diff> blocks, robust against whitespace
    const diffRegex = /<diff>[\s\S]*?<original>([\s\S]*?)<\/original>[\s\S]*?<replacement>([\s\S]*?)<\/replacement>[\s\S]*?<\/diff>/;
    const match = text.match(diffRegex);

    if (match) {
        return {
            display: text.replace(diffRegex, '').trim(),
            diff: {
                original: match[1].trim(),
                replacement: match[2].trim()
            }
        };
    }
    return { display: text, diff: null };
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

interface NoteEditorProps {
    content: string;
    textSize: 'xs' | 'sm' | 'base' | 'lg';
    rhymeMode: boolean;
    isMobile: boolean;
    rhymeTrayHeight: number;
    wordToGroup: Record<string, string>;
    groupToColor: Record<string, string>;
    onContentChange: (val: string) => void;
    onCursorChange: (e: any) => void;
    onSelectionChange: (e: any) => void;
}

const NoteEditor = React.memo(({
    content,
    textSize,
    rhymeMode,
    isMobile,
    rhymeTrayHeight,
    wordToGroup,
    groupToColor,
    onContentChange,
    onCursorChange,
    onSelectionChange
}: NoteEditorProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const renderHighlightedText = (text: string) => {
        if (!text) return null;
        return text.split(/([^a-zA-Z0-9_']+)/).map((token, i) => {
            let cls = 'text-transparent';
            if (rhymeMode) {
                const g = wordToGroup[token.toLowerCase()];
                cls = g ? (groupToColor[g] || 'text-neutral-500') : 'text-neutral-500';
            }
            return <span key={i} className={`${cls} transition-colors duration-300`}>{token}</span>;
        });
    };

    return (
        <div className="flex-1 relative font-mono overflow-y-auto custom-scrollbar bg-[#050505] h-full">
            <div className="grid grid-cols-1 grid-rows-1 min-h-full relative">
                <div
                    ref={backdropRef}
                    className={`col-start-1 row-start-1 p-5 w-full whitespace-pre-wrap break-words pointer-events-none z-0 ${textSize === 'xs' ? 'text-[11px]' : 'text-[15px]'}`}
                    style={{ paddingBottom: isMobile ? `${rhymeTrayHeight + 200}px` : '100px' }}
                >
                    {renderHighlightedText(content + ' ')}
                </div>
                <textarea
                    ref={textareaRef}
                    onScroll={handleScroll}
                    className={`col-start-1 row-start-1 w-full h-full bg-transparent p-5 resize-none focus:outline-none z-10 whitespace-pre-wrap break-words ${textSize === 'xs' ? 'text-[11px]' : 'text-[15px]'} ${rhymeMode ? 'text-transparent caret-white' : 'text-neutral-300'}`}
                    style={{ paddingBottom: isMobile ? `${rhymeTrayHeight + 200}px` : '100px' }}
                    value={content}
                    onChange={(e) => {
                        onContentChange(e.target.value);
                        onCursorChange(e);
                    }}
                    onSelect={onSelectionChange}
                    placeholder="Start writing..."
                    spellCheck={false}
                />
            </div>
        </div>
    );
});

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
    const [draggedItem, setDraggedItem] = useState<Note | null>(null);
    const [toolkitTab, setToolkitTab] = useState<'rhymes' | 'chat'>('rhymes');
    const [chatSelection, setChatSelection] = useState<string | null>(null);
    const [hasOpenedAiChat, setHasOpenedAiChat] = useState(() => {
        return localStorage.getItem('hasOpenedAiChat') === 'true';
    });

    useEffect(() => {
        if (isChatOpen && !hasOpenedAiChat) {
            setHasOpenedAiChat(true);
            localStorage.setItem('hasOpenedAiChat', 'true');
        }
    }, [isChatOpen, hasOpenedAiChat]);

    // DnD Handlers
    const handleDragStart = (e: React.DragEvent, item: Note) => {
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
        setDraggedItem(item);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnFolder = async (e: React.DragEvent, targetFolder: Note) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('text/plain');
        if (!itemId || itemId === targetFolder.id) return;
        if (targetFolder.parentId === itemId) return; // Prevent circular drop

        const item = notes.find(n => n.id === itemId);
        if (item) {
            await handleMoveItem(item.id, targetFolder.id);
            setDraggedItem(null);
        }
    };

    const handleDropOnBin = async (e: React.DragEvent) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData('text/plain');
        if (!itemId) return;
        const item = notes.find(n => n.id === itemId);
        if (item) {
            await deleteNote(item.id, false);
            fetchNotes();
            setDraggedItem(null);
            showToast("Moved to bin", "success");
        }
    };

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

    const handleApplyDiff = (original: string, replacement: string) => {
        if (!activeNote) return;
        const currentContent = activeNote.content;

        // Simple string replacement with check
        if (currentContent.includes(original)) {
            const newContent = currentContent.replace(original, replacement);
            handleUpdateContent(newContent);
            showToast("Suggestion applied!", "success");
        } else {
            // Fallback: Try a normalized check (ignore whitespace differences)
            const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
            const normContent = normalize(currentContent);
            const normOriginal = normalize(original);

            if (normContent.includes(normOriginal)) {
                showToast("Could not find exact text match.", "error");
            } else {
                showToast("Original text not found in note.", "error");
            }
        }
    };

    const handleInsertSelection = () => {
        if (!activeNote || !chatSelection) return;
        const insertAt = textareaRef.current?.selectionStart || activeNote.content.length;
        const before = activeNote.content.slice(0, insertAt);
        const after = activeNote.content.slice(insertAt);
        // Add space if needed
        const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
        const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);

        const textToInsert = (needsSpaceBefore ? ' ' : '') + chatSelection + (needsSpaceAfter ? ' ' : '');

        handleUpdateContent(before + textToInsert + after);
        setChatSelection(null);
        showToast("Inserted text", "success");
    };

    // UI Renderers
    const handleEditorChange = (e: any) => {
        setCursorIndex(e.target.selectionStart);
        const w = getWordUnderCursor(e.target.value, e.target.selectionStart);
        if (w && w.length > 2 && w !== lastRhymedWordRef.current) {
            lastRhymedWordRef.current = w;
            handleRhymeSearch(w);
        }
    };

    const handleEditorSelection = (e: any) => {
        setCursorIndex(e.target.selectionStart);
        if (e.target.selectionStart !== e.target.selectionEnd) setSelection({ text: e.target.value.substring(e.target.selectionStart, e.target.selectionEnd) });
        else setSelection(null);
    };

    const renderEditorView = () => {
        return (
            <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
                <MobileTitlePortal activeNote={activeNote} onUpdateTitle={handleUpdateTitle} onOpenSidebar={() => setIsSidebarOpen(true)} />
                <MobileActionsPortal rhymeMode={rhymeMode} setRhymeMode={setRhymeMode} setTextSize={setTextSize} isVisible={!isSidebarOpen && !isChatOpen} />

                <div className="flex-1 relative overflow-hidden flex flex-row">
                    {/* MOBILE LAYOUT (Swiper) */}
                    <div
                        className="lg:hidden absolute inset-0 flex flex-row w-[200%] h-full transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
                        style={{ transform: isChatOpen ? 'translateX(-50%)' : 'translateX(0%)' }}
                        onTouchStart={(e) => touchStartRef.current = e.touches[0].clientX}
                        onTouchEnd={(e) => {
                            if (!touchStartRef.current) return;
                            const deltaX = e.changedTouches[0].clientX - touchStartRef.current;
                            if (deltaX < -40) setIsChatOpen(true);
                            if (deltaX > 40) setIsChatOpen(false);
                            touchStartRef.current = null;
                        }}
                    >
                        {/* Mobile Editor Panel */}
                        <div className="w-1/2 h-full flex flex-col relative overflow-hidden">
                            {activeNote?.attachedAudio && (
                                <div className="h-12 bg-neutral-900 border-b border-white/5 flex items-center justify-between px-3 shrink-0 z-20">
                                    <span className="text-xs font-bold text-white truncate">{activeNote.attachedAudio.split('/').pop()}</span>
                                    <button onClick={() => { const url = audioFiles.find(f => f.name === activeNote.attachedAudio)?.url || activeNote.attachedAudio; const tid = `note-audio-${activeNote.id}`; if (currentTrackId === tid) onTogglePlay(); else onPlayTrack({ id: `p-${activeNote.id}`, title: 'Note Audio', producer: 'System', tracks: [{ id: tid, title: 'Audio', files: { mp3: url } }] } as any, tid); }} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center">{(currentTrackId === `note-audio-${activeNote.id}` && isPlaying) ? <Pause size={12} fill="black" /> : <Play size={12} fill="black" />}</button>
                                </div>
                            )}
                            <NoteEditor
                                key="mobile-editor"
                                content={activeNote?.content || ''}
                                textSize={textSize}
                                rhymeMode={rhymeMode}
                                isMobile={true}
                                rhymeTrayHeight={rhymeTrayHeight}
                                wordToGroup={wordToGroup}
                                groupToColor={groupToColor}
                                onContentChange={handleUpdateContent}
                                onCursorChange={handleEditorChange}
                                onSelectionChange={handleEditorSelection}
                            />
                        </div>
                        {/* Mobile Chat Panel */}
                        <div className="w-1/2 h-full flex flex-col bg-[#050505] border-l border-white/5 relative overflow-hidden">
                            <div className="h-12 bg-black border-b border-white/5 flex items-center px-3 shrink-0 z-20">
                                <button onClick={() => setIsChatOpen(false)} className="p-2 -ml-1 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all flex items-center gap-2">
                                    <ChevronLeft size={18} />
                                    <span className="text-xs font-bold">Back to Editor</span>
                                </button>
                            </div>
                            <ChatPanel
                                chatMessages={chatMessages}
                                chatInput={chatInput}
                                setChatInput={setChatInput}
                                handleSendChat={handleSendChat}
                                chatScrollRef={chatScrollRef}
                                handleApplyDiff={handleApplyDiff}
                                handleInsertSelection={handleInsertSelection}
                                setChatSelection={setChatSelection}
                                chatSelection={chatSelection}
                                currentTrackId={currentTrackId}
                            />
                        </div>
                    </div>

                    {/* DESKTOP LAYOUT (Split View) */}
                    <div className="hidden lg:flex flex-1 w-full h-full relative">
                        {/* Desktop Editor Area - Centered or Full width depending on right sidebar */}
                        <div className="flex-1 flex flex-col h-full bg-[#050505] relative min-w-0">
                            {/* Desktop Editor Top Bar (Title & Toolkit Toggles) */}
                            {/* Note: Main Title is handled in parent list header for now, or we can add floating header */}
                            {activeNote?.attachedAudio && (
                                <div className="h-10 bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Music size={14} className="text-primary" />
                                        <span className="text-xs font-medium text-white truncate">{activeNote.attachedAudio.split('/').pop()}</span>
                                    </div>
                                    <button onClick={() => { const url = audioFiles.find(f => f.name === activeNote.attachedAudio)?.url || activeNote.attachedAudio; const tid = `note-audio-${activeNote.id}`; if (currentTrackId === tid) onTogglePlay(); else onPlayTrack({ id: `p-${activeNote.id}`, title: 'Note Audio', producer: 'System', tracks: [{ id: tid, title: 'Audio', files: { mp3: url } }] } as any, tid); }} className="p-1 rounded-full bg-white text-black hover:scale-105 transition-transform">{(currentTrackId === `note-audio-${activeNote.id}` && isPlaying) ? <Pause size={12} fill="black" /> : <Play size={12} fill="black" />}</button>
                                </div>
                            )}
                            <NoteEditor
                                key="desktop-editor"
                                content={activeNote?.content || ''}
                                textSize={textSize}
                                rhymeMode={rhymeMode}
                                isMobile={false}
                                rhymeTrayHeight={rhymeTrayHeight}
                                wordToGroup={wordToGroup}
                                groupToColor={groupToColor}
                                onContentChange={handleUpdateContent}
                                onCursorChange={handleEditorChange}
                                onSelectionChange={handleEditorSelection}
                            />

                            {/* Desktop Formatting Toolbar (Floating or Bottom) */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[#111] border border-white/10 rounded-full shadow-2xl z-30">
                                <button onClick={() => setRhymeMode(!rhymeMode)} className={`p-2 rounded-full transition-all ${rhymeMode ? 'bg-primary text-black' : 'text-neutral-400 hover:bg-white/10 hover:text-white'}`} title="Rhyme Highlight Mode">
                                    <Highlighter size={16} />
                                </button>
                                <div className="w-px h-4 bg-white/10" />
                                <button onClick={() => setTextSize(s => s === 'xs' ? 'xs' : s === 'sm' ? 'xs' : s === 'base' ? 'sm' : 'base')} className="p-2 text-neutral-400 hover:text-white"><Minus size={16} /></button>
                                <span className="text-[10px] font-mono text-neutral-500 w-8 text-center">{textSize}</span>
                                <button onClick={() => setTextSize(s => s === 'xs' ? 'sm' : s === 'sm' ? 'base' : s === 'base' ? 'lg' : 'lg')} className="p-2 text-neutral-400 hover:text-white"><Plus size={16} /></button>
                            </div>
                        </div>

                        {/* Desktop Right Sidebar (Toolkit) */}
                        <div className="w-[400px] h-full border-l border-white/5 bg-[#0a0a0a] flex flex-col shrink-0">
                            {/* Toolkit Tabs */}
                            <div className="flex items-center border-b border-white/5">
                                <button
                                    onClick={() => setToolkitTab('rhymes')}
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${toolkitTab === 'rhymes' ? 'text-primary border-b-2 border-primary' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    Rhymes
                                </button>
                                <button
                                    onClick={() => setToolkitTab('chat')}
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${toolkitTab === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    Assistant
                                </button>
                            </div>

                            {/* Toolkit Content */}
                            {/* Toolkit Content */}
                            <div className="flex-1 overflow-hidden relative flex flex-col">
                                {toolkitTab === 'rhymes' && (
                                    <div className="absolute inset-0 overflow-y-auto p-4 custom-scrollbar">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Target Word</span>
                                                <span className="text-xl font-bold text-white max-w-[150px] truncate" title={currentWord}>{currentWord || "..."}</span>
                                            </div>
                                            <button onClick={() => handleRhymeSearch(currentWord)} className="p-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors">
                                                <RotateCcw size={16} className={isRhymeLoading ? 'animate-spin' : ''} />
                                            </button>
                                        </div>

                                        {!currentWord && (
                                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 mb-4">
                                                <p className="text-xs text-blue-400 text-center">Select a word in your lyrics to find perfect rhymes.</p>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            {isRhymeLoading ? (
                                                <div className="w-full text-center text-xs text-neutral-500 py-10 animate-pulse">Finding rhymes...</div>
                                            ) : suggestions.length > 0 ? (
                                                suggestions.map((w, i) => (
                                                    <button key={i} className="px-3 py-2 bg-[#141414] border border-white/5 rounded-lg text-xs text-neutral-300 hover:border-white/20 hover:text-white active:bg-primary active:text-black transition-all" onClick={() => handleUpdateContent((activeNote?.content || "") + " " + w)}>
                                                        {w}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="w-full text-center text-neutral-600 py-10">
                                                    <Type size={32} className="mx-auto mb-2 opacity-20" />
                                                    <p className="text-xs">No rhymes found yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {toolkitTab === 'chat' && (
                                    <ChatPanel
                                        chatMessages={chatMessages}
                                        chatInput={chatInput}
                                        setChatInput={setChatInput}
                                        handleSendChat={handleSendChat}
                                        chatScrollRef={chatScrollRef}
                                        handleApplyDiff={handleApplyDiff}
                                        handleInsertSelection={handleInsertSelection}
                                        setChatSelection={setChatSelection}
                                        chatSelection={chatSelection}
                                        currentTrackId={currentTrackId}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Rhyme Tray (Swipe-up) */}
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
                        {!hasOpenedAiChat && (
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
                        )}
                    </div>
                </div>
            </div>
        );
    };

    function renderBrowserView() {
        return (
            <div className="flex-1 p-4 overflow-y-auto">
                <h2 className="text-xl font-bold text-white mb-6">Audio Files</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {audioFiles.map(file => <div key={file.id} onClick={() => { if (activeNoteId) { setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, attachedAudio: file.name } : n)); setViewMode('editor'); updateNote(activeNoteId, { attachedAudio: file.name }).catch(console.error); } }} className={`p-4 rounded-xl border ${activeNote?.attachedAudio === file.name ? 'border-primary bg-primary/10' : 'border-white/5 bg-neutral-900/50'} cursor-pointer`}><Music size={18} /><h3 className="text-xs font-bold text-white truncate mt-2">{file.name}</h3></div>)}
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center p-4 text-neutral-500 cursor-pointer min-h-[100px]"><input type="file" ref={fileInputRef} onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { await uploadFile(f); const files = await getUserFiles(); setAudioFiles(files.filter(fi => fi.type === 'audio')); } catch (err) { console.error(err); } } }} accept="audio/*" className="hidden" /><Plus size={20} /><span>Upload</span></div>
                </div>
            </div>
        );
    }

    const visibleItems = useMemo(() => notes.filter(n => {
        if (trashView) return n.tags?.includes('TRASH');
        const matchesParent = (n.parentId || null) === currentFolderId;
        const matchesSearch = searchQuery ? n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return !n.tags?.includes('TRASH') && (searchQuery ? matchesSearch : matchesParent);
    }).sort((a, b) => (a.type === 'folder' ? -1 : 1) || new Date(b.updated).getTime() - new Date(a.updated).getTime()), [notes, currentFolderId, trashView, searchQuery]);

    const isOverlayOpen = isSidebarOpen || isToolkitOpen || isSizeExpanded;

    const folderItems = visibleItems.filter(i => i.type === 'folder');
    const noteItems = visibleItems.filter(i => i.type !== 'folder');

    return (
        <div className={`w-full flex flex-col overflow-hidden fixed inset-x-0 bottom-0 top-[56px] ${isOverlayOpen ? 'z-[80]' : 'z-10'} bg-[#050505] lg:relative lg:top-0 lg:h-full`}>
            <div className="flex-1 flex bg-[#0a0a0a] overflow-hidden relative">
                <div className={`absolute lg:static inset-y-0 left-0 z-[90] w-full lg:w-96 lg:border-r border-white/5 flex flex-col bg-[#0A0A0A] transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
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
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Folders Section - Grid View */}
                        {folderItems.length > 0 && (
                            <div className="grid grid-cols-3 gap-3">
                                {folderItems.map(item => (
                                    <div
                                        key={item.id}
                                        draggable={!trashView}
                                        onDragStart={(e) => handleDragStart(e, item)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDropOnFolder(e, item)}
                                        onClick={() => setCurrentFolderId(item.id)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({
                                                isOpen: true,
                                                x: e.clientX,
                                                y: e.clientY,
                                                note: item
                                            });
                                        }}
                                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 p-2 border transition-all cursor-pointer relative group ${draggedItem?.id === item.id ? 'opacity-40 scale-95' : ''
                                            } ${activeNoteId === item.id ? 'bg-white/10 border-white/20' : 'bg-[#141414] border-white/5 hover:border-white/10 hover:bg-[#1f1f1f]'}`}
                                    >
                                        <FolderOpen size={24} className="text-primary" fill="currentColor" fillOpacity={0.2} />
                                        <span className="text-[10px] text-center font-semibold text-neutral-400 line-clamp-2 leading-tight w-full break-words">{item.title}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Notes Section - List View */}
                        {noteItems.length > 0 && (
                            <div className="flex flex-col space-y-1">
                                {folderItems.length > 0 && <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest mb-2 mt-2">Notes</div>}
                                {noteItems.map(item => {
                                    // Extract first line or substantial text for preview
                                    const previewText = item.content?.split('\n').filter(line => line.trim().length > 0)[0] || "No additional text";

                                    return (
                                        <div
                                            key={item.id}
                                            draggable={!trashView}
                                            onDragStart={(e) => handleDragStart(e, item)}
                                            onClick={() => {
                                                if (trashView) return;
                                                setActiveNoteId(item.id);
                                                setIsSidebarOpen(false);
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
                                            className={`p-3 rounded-xl flex flex-col gap-1 group cursor-pointer border transition-all ${draggedItem?.id === item.id ? 'opacity-40' : ''
                                                } ${activeNoteId === item.id ? 'bg-primary/10 border-primary/20' : 'hover:bg-white/5 border-transparent'}`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className={`text-sm font-bold truncate ${activeNoteId === item.id ? 'text-primary' : 'text-neutral-200'}`}>{item.title}</span>
                                                <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                                                    {new Date(item.updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 w-full">
                                                <span className="text-xs text-neutral-500 truncate w-full">{previewText}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {visibleItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-neutral-700 gap-2">
                                <div className="p-3 rounded-full bg-white/5">
                                    {trashView ? <Trash2 size={20} /> : <Book size={20} />}
                                </div>
                                <span className="text-xs font-medium">{trashView ? 'Bin Empty' : 'No items'}</span>
                            </div>
                        )}
                    </div>

                    {/* Bin Access & Drop Zone */}
                    <div className={`p-4 lg:pb-4 border-t border-white/5 bg-[#0A0A0A] ${currentTrackId ? 'pb-[160px]' : 'pb-[100px]'}`}>
                        {trashView ? (
                            <div className="flex flex-col gap-2 w-full">
                                <button
                                    onClick={() => setConfirmationModal({ isOpen: true, type: 'emptyTrash' })}
                                    className="w-full p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center gap-2 cursor-pointer hover:bg-red-500/20 transition-all"
                                >
                                    <Trash size={16} />
                                    <span className="text-xs font-bold">Empty Bin</span>
                                </button>
                                <button
                                    onClick={() => { setTrashView(false); setCurrentFolderId(null); }}
                                    className="w-full p-3 rounded-xl border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 flex items-center justify-center gap-2 cursor-pointer transition-all"
                                >
                                    <RotateCcw size={16} />
                                    <span className="text-xs font-bold">Exit Bin</span>
                                </button>
                            </div>
                        ) : (
                            <div
                                onDragOver={handleDragOver}
                                onDrop={handleDropOnBin}
                                onClick={() => { setTrashView(true); setCurrentFolderId(null); }}
                                className="w-full p-3 rounded-xl border border-dashed border-white/10 text-neutral-500 hover:text-white hover:bg-white/5 flex items-center justify-center gap-2 cursor-pointer transition-all"
                            >
                                <Trash2 size={16} />
                                <span className="text-xs font-bold">Trash</span>
                            </div>
                        )}
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
                    isTrash={trashView}
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
                        title: trashView ? 'Delete Forever' : 'Delete',
                        message: trashView ? `Permanently delete "${contextMenu.note.title}"? This cannot be undone.` : `Move "${contextMenu.note.title}" to trash?`
                    })}
                    onRestore={async () => {
                        try {
                            await restoreNote(contextMenu.note.id);
                            fetchNotes();
                            showToast("Note restored", "success");
                        } catch (e) { console.error(e); }
                    }}
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

const ContextMenu = ({ x, y, note, onRename, onDelete, onMove, onRestore, isTrash, onClose }: any) => {
    const style: any = { top: y, left: x };
    if (x + 200 > window.innerWidth) style.left = x - 200;
    if (y + 150 > window.innerHeight) style.top = y - 150;

    return (
        <>
            {/* Backdrop to close menu */}
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div style={style} className="fixed z-[9999] w-52 bg-[#111] rounded-xl shadow-2xl py-2 border border-white/10" onClick={e => e.stopPropagation()}>
                {isTrash ? (
                    <>
                        <button onClick={() => { onRestore(); onClose(); }} className="w-full text-left px-4 py-3 text-xs text-neutral-300 hover:bg-white/5 flex items-center gap-3 active:bg-white/10">
                            <RotateCcw size={14} /> Restore
                        </button>
                        <div className="h-px bg-white/10 my-1" />
                        <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-4 py-3 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-3 active:bg-red-500/20">
                            <Trash2 size={14} /> Delete Forever
                        </button>
                    </>
                ) : (
                    <>
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
                    </>
                )}
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


function ChatPanel({
    chatMessages,
    chatInput,
    setChatInput,
    handleSendChat,
    chatScrollRef,
    handleApplyDiff,
    handleInsertSelection,
    setChatSelection,
    chatSelection,
    currentTrackId,
}: any) {
    useEffect(() => {
        const handleSelection = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                const chatContainer = document.getElementById('chat-container-area');
                if (chatContainer && chatContainer.contains(selection.anchorNode)) {
                    setChatSelection(selection.toString().trim());
                }
            }
        };
        document.addEventListener('selectionchange', handleSelection);
        return () => document.removeEventListener('selectionchange', handleSelection);
    }, [setChatSelection]);

    return (
        <>
            <div id="chat-container-area" className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black" ref={chatScrollRef} onClick={() => {
                // Clear selection if clicking empty space? 
                // Actually better to keep it unless explicit clear or new selection
            }}>
                {chatMessages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-neutral-600 opacity-30"><MessageSquare size={48} /><p className="text-sm">How can I help?</p></div>}
                {chatMessages.map((msg: any, i: number) => {
                    const { display, diff } = msg.role === 'model' ? parseAiResponse(msg.text) : { display: msg.text, diff: null };

                    return (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[90%] p-3.5 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-primary text-black' : 'bg-neutral-900 text-neutral-200 border border-neutral-800'}`}>
                                {msg.role === 'model' ? (
                                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-white mt-4 mb-2" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-base font-bold text-white mt-3 mb-2" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-white mt-2 mb-1" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="font-bold text-primary" {...props} />,
                                                em: ({ node, ...props }) => <em className="italic text-neutral-300" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-primary/50 pl-4 my-2 text-neutral-400 italic" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                table: ({ node, ...props }) => <div className="overflow-x-auto my-2 rounded border border-white/10"><table className="min-w-full divide-y divide-white/10" {...props} /></div>,
                                                thead: ({ node, ...props }) => <thead className="bg-white/5" {...props} />,
                                                th: ({ node, ...props }) => <th className="px-3 py-2 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider" {...props} />,
                                                td: ({ node, ...props }) => <td className="px-3 py-2 whitespace-nowrap text-sm text-neutral-300" {...props} />,
                                                code: ({ node, ...props }) => <code className="bg-black/30 rounded px-1 py-0.5 text-xs font-mono text-primary/80" {...props} />
                                            }}
                                        >
                                            {display}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    display
                                )}
                            </div>

                            {diff && (
                                <div className="mt-2 ml-1 max-w-[85%] bg-neutral-900 border border-primary/30 rounded-xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-primary/10 px-3 py-2 border-b border-primary/10 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                                            <Edit2 size={10} /> Suggestion
                                        </span>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-neutral-500 uppercase font-bold">Original</span>
                                            <div className="text-xs text-red-400 bg-red-400/5 p-2 rounded line-through opacity-70 border border-red-400/10 font-mono">
                                                {diff.original}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center text-neutral-600">
                                            <ArrowRight size={12} className="rotate-90" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-neutral-500 uppercase font-bold">Replacement</span>
                                            <div className="text-xs text-green-400 bg-green-400/5 p-2 rounded border border-green-400/10 font-mono">
                                                {diff.replacement}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2 bg-black/20 flex gap-2">
                                        <button
                                            onClick={() => handleApplyDiff(diff.original, diff.replacement)}
                                            className="flex-1 py-2 bg-primary text-black text-xs font-bold rounded-lg hover:bg-white hover:scale-[1.02] transition-all shadow-lg shadow-primary/20"
                                        >
                                            Insert Change
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div
                className="p-4 lg:pb-4 bg-black border-t border-white/5 relative"
                style={{
                    paddingBottom: (currentTrackId && window.innerWidth < 1024)
                        ? `calc(2rem + 106px + env(safe-area-inset-bottom))`
                        : (window.innerWidth < 1024 ? `calc(1.5rem + 50px + env(safe-area-inset-bottom))` : '1rem')
                }}
            >
                {chatSelection && (
                    <div className="absolute top-0 left-0 right-0 -translate-y-full flex justify-center pb-2 pointer-events-none">
                        <button
                            onClick={handleInsertSelection}
                            className="pointer-events-auto bg-neutral-900 border border-primary/20 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-in zoom-in slide-in-from-bottom-2 hover:scale-105 hover:border-primary transition-all"
                            onMouseDown={(e) => e.preventDefault()}
                        >
                            <Copy size={12} className="text-primary" />
                            Insert Selected Text
                        </button>
                    </div>
                )}
                <div className="relative flex items-center">
                    <input className="w-full bg-neutral-900 border border-white/5 rounded-full pl-5 pr-12 py-3.5 text-sm text-white focus:outline-none" placeholder="Ask me for advice..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendChat()} />
                    <button onClick={handleSendChat} className="absolute right-1.5 w-10 h-10 flex items-center justify-center bg-primary text-black rounded-full">
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </>
    );
};
export default NotesPage;
