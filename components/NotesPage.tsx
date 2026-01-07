import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Note, Project, UserProfile } from '../types';
import { getNotes, createNote, updateNote, deleteNote, getUserFiles, uploadFile, getDeletedNotes, restoreNote, cleanupOldNotes, emptyTrashNotes } from '../services/supabaseService';
import ConfirmationModal from './ConfirmationModal';
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
    ChevronDown,
    RotateCcw,
    Trash
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

    // Split into words, stripping punctuation for analysis
    const words = text.split(/[^a-zA-Z']+/).filter(w => w.length > 0);
    const wordToGroup: Record<string, string> = {};
    const groupCounts: Record<string, number> = {};

    const getPhoneticGroup = (word: string) => {
        let lower = word.toLowerCase();
        // Remove leading/trailing non-alpha
        lower = lower.replace(/^[^a-z]+|[^a-z]+$/g, '');

        if (lower.length < 2) return null;
        // Skip common stopwords
        if (['the', 'a', 'an', 'and', 'is', 'in', 'it', 'to', 'of', 'for', 'my', 'on', 'at', 'by', 'but', 'or'].includes(lower)) return null;

        // --- ACCENT OVERRIDES ---
        if (accent === 'UK') {
            if (lower.endsWith('ance') || lower.endsWith('anch')) return 'ah_sound'; // dance, chance, branch
            if (lower.endsWith('ass') && lower !== 'bass') return 'ah_sound'; // grass, glass
            if (lower.endsWith('ast')) return 'ah_sound'; // fast, last
            if (lower.endsWith('path')) return 'ah_sound';
            if (lower.endsWith('alf')) return 'ah_sound'; // half
        }

        // --- SLANT RHYME MAPPINGS ---

        // 1. Long I group (find, ride, light, sky)
        if (/ind$/.test(lower)) return 'long_i';
        if (/ild$/.test(lower)) return 'long_i';
        if (/igh(t?)$/.test(lower)) return 'long_i';
        if (lower.endsWith('y') && !/[aeiou]y$/.test(lower) && lower.length <= 3) return 'long_i'; // my, fly, sky (but not play)

        // 2. Silent E Rules (ride, side, name, same)
        // Pattern: Vowel + Consonant + e
        // Exceptions: have (short a), love (uh), done (uh), gone (short o), one (uh)
        if (lower === 'have') return 'short_a';
        if (['love', 'dove', 'glove', 'shove'].includes(lower)) return 'uv_sound';
        if (['one', 'done', 'none'].includes(lower)) return 'un_sound';
        if (['gone'].includes(lower)) return 'short_o';

        const silentEMatch = lower.match(/([aeiou])([^aeiou]+)e$/);
        if (silentEMatch) {
            const [_, vowel] = silentEMatch;
            // Rough grouping: a_e -> long_a, i_e -> long_i, etc.
            return `long_${vowel}`;
        }

        // 3. Vowel Teams & Standard Suffixes
        const match = lower.match(/([aeiouy]+)([^aeiouy]*)$/);
        if (!match) return null;

        const [full, vowels, coda] = match;

        // Long I (pie, die)
        if (vowels === 'ie' && coda === '') return 'long_i';
        if (vowels === 'uy') return 'long_i'; // buy, guy

        // OU / OW (out, down)
        if ((vowels === 'ou' || vowels === 'ow') && ['t', 'nd', 'n', 'd', ''].includes(coda)) return 'ou_sound';

        // AY / AI (day, rain)
        if (vowels === 'ay') return 'long_a';
        if (vowels === 'ai' && coda === 'n') return 'long_a';

        // EE / EA (tree, heat)
        if (vowels === 'ee' || vowels === 'ea') return 'long_e';
        // Happy -> long_e sound
        if (vowels === 'y' && coda === '' && lower.length > 3) return 'long_e';

        // Fallback: Exact Vowel+Coda match (Cat -> at, Dog -> og)
        return `${vowels}_${coda}`;
    };

    words.forEach(w => {
        const group = getPhoneticGroup(w);
        if (group) {
            wordToGroup[w.toLowerCase()] = group;
            groupCounts[group] = (groupCounts[group] || 0) + 1;
        }
    });

    // Assign colors to groups with multiple words (matches)
    const groupToColor: Record<string, string> = {};
    let colorIndex = 0;

    // Sort groups by frequency desc so most common rhymes get colors first
    const sortedGroups = Object.keys(groupCounts).sort((a, b) => groupCounts[b] - groupCounts[a]);

    sortedGroups.forEach(group => {
        if (groupCounts[group] > 1) {
            groupToColor[group] = RHYME_COLORS[colorIndex % RHYME_COLORS.length];
            colorIndex++;
        }
    });

    return { wordToGroup, groupToColor };
};

// Standalone Component to prevent re-renders
const MobileTitlePortal = ({
    activeNote,
    onUpdateTitle,
    onOpenSidebar
}: {
    activeNote: Note | undefined,
    onUpdateTitle: (val: string) => void,
    onOpenSidebar: () => void
}) => {
    const [target, setTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setTarget(document.getElementById('mobile-page-title'));
    }, []);

    if (!target || !activeNote) return null;

    return createPortal(
        <div className="flex items-center gap-2 w-full animate-in fade-in duration-300 min-w-0">
            <button
                onClick={onOpenSidebar}
                className="p-1 -ml-1 text-neutral-400 hover:text-white shrink-0"
            >
                <Book size={18} />
            </button>
            <input
                value={activeNote.title}
                onChange={(e) => onUpdateTitle(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-white focus:outline-none p-0 placeholder-neutral-600 w-full truncate min-w-0"
                placeholder="Untitled Note"
            />
        </div>,
        target
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

const NotesPage: React.FC<NotesPageProps> = ({
    userProfile,
    currentProject,
    currentTrackId,
    isPlaying,
    onPlayTrack,
    onTogglePlay
}) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [audioFiles, setAudioFiles] = useState<any[]>([]);

    // Navigation handling
    const location = useLocation();
    const navigate = useNavigate();
    const hasHandledNavigation = useRef(false);

    // View State
    const [viewMode, setViewMode] = useState<'editor' | 'browser'>('editor');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [rhymes, setRhymes] = useState<string[]>([]);
    const [isRhymeLoading, setIsRhymeLoading] = useState(false);
    const [isToolkitOpen, setToolkitOpen] = useState(false);
    const [toolkitTab, setToolkitTab] = useState<'rhymes' | 'tools'>('rhymes');

    // Hidden file input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debounce timer ref
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Trash State
    const [trashView, setTrashView] = useState(false);

    // Confirmation Modal State
    const [confirmationModal, setConfirmationModal] = useState<{
        isOpen: boolean;
        type: 'delete' | 'emptyTrash';
        noteId?: string;
        title?: string;
        message?: string;
    }>({ isOpen: false, type: 'delete' });

    const handleConfirmAction = async () => {
        if (confirmationModal.type === 'delete' && confirmationModal.noteId) {
            const id = confirmationModal.noteId;
            const isPermanent = trashView;
            try {
                await deleteNote(id, isPermanent);
                const updatedNotes = notes.filter(n => n.id !== id);
                setNotes(updatedNotes);
                if (id === activeNoteId) {
                    setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
                }
            } catch (error) {
                console.error('Failed to delete note', error);
            }
        } else if (confirmationModal.type === 'emptyTrash') {
            try {
                await emptyTrashNotes();
                setNotes([]);
                setActiveNoteId(null);
            } catch (error) {
                console.error('Failed to empty trash', error);
            }
        }
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleEmptyTrash = () => {
        setConfirmationModal({
            isOpen: true,
            type: 'emptyTrash',
            title: 'Empty Recycling Bin',
            message: 'Are you sure you want to permanently delete all notes in the trash? This action cannot be undone.'
        });
    };

    // Initial Load & Cleanup
    useEffect(() => {
        const init = async () => {
            await cleanupOldNotes();
            fetchNotes();
        };
        init();
    }, []);

    // Fetch Notes based on view
    const fetchNotes = useCallback(async () => {
        setLoading(true);
        try {
            const data = trashView ? await getDeletedNotes() : await getNotes();
            setNotes(data);

            if (data.length > 0) {
                if (!activeNoteId || !data.find(n => n.id === activeNoteId)) {
                    setActiveNoteId(data[0].id);
                }
            } else {
                setActiveNoteId(null);
            }
        } catch (error) {
            console.error('Failed to load notes', error);
        } finally {
            setLoading(false);
        }
    }, [trashView, activeNoteId]);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    // Handle incoming navigation
    useEffect(() => {
        const checkNavigationState = async () => {
            if (hasHandledNavigation.current) return;

            const state = location.state as {
                createNewNote?: boolean;
                trackTitle?: string;
                trackId?: string;
                fileName?: string;
                trackUrl?: string; // Add trackUrl support
            } | null;

            if (state?.createNewNote && !loading) {
                hasHandledNavigation.current = true;
                const noteTitle = 'Untitled Note';
                const noteContent = '';
                // Prefer trackUrl if available, otherwise fallback to fileName
                await handleCreateNote(noteTitle, noteContent, state.trackUrl || state.fileName);
                navigate(location.pathname, { replace: true, state: {} });
            }
        };

        if (!loading) {
            checkNavigationState();
        }
    }, [location.state, loading, navigate]);

    // Load Audio Files
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const files = await getUserFiles();
                setAudioFiles(files.filter(f => f.type === 'audio'));
            } catch (error) {
                console.error('Failed to load audio files', error);
            }
        };

        if (viewMode === 'browser' || (activeNoteId && notes.find(n => n.id === activeNoteId)?.attachedAudio)) {
            fetchFiles();
        }
    }, [viewMode, activeNoteId, notes]);

    // Feature State
    const [rhymeMode, setRhymeMode] = useState(false);
    const [accent, setAccent] = useState<'US' | 'UK'>('US');
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [assistantTab, setAssistantTab] = useState<'rhymes' | 'tools'>('rhymes');
    const [cursorIndex, setCursorIndex] = useState(0);
    const [selection, setSelection] = useState<{ start: number, end: number, text: string } | null>(null);
    const [textSize, setTextSize] = useState<'xs' | 'sm' | 'base' | 'lg'>('xs');
    const [isSizeExpanded, setIsSizeExpanded] = useState(false);

    // AI Chat State
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    const handleSendChat = async () => {
        if (!chatInput.trim() || chatLoading) return;
        const userMsg = { role: 'user' as const, text: chatInput };
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setChatLoading(true);

        setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }), 10);

        try {
            const response = await chatWithGeneralAi([...chatMessages, userMsg], activeNote?.content);
            setChatMessages(prev => [...prev, { role: 'model', text: response }]);
            setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }), 10);
        } catch (e) {
            console.error(e);
        } finally {
            setChatLoading(false);
        }
    };

    // Mobile Assistant State
    const [isMobileAssistantOpen, setMobileAssistantOpen] = useState(false);
    const [mobileSheetHeight, setMobileSheetHeight] = useState(40);
    const sheetDragStart = useRef<number>(0);
    const sheetStartHeight = useRef<number>(0);

    useEffect(() => {
        if (isToolkitOpen) {
            document.documentElement.style.setProperty('--notes-toolkit-height', `${mobileSheetHeight}vh`);
        } else {
            document.documentElement.style.setProperty('--notes-toolkit-height', '0vh');
        }
    }, [isToolkitOpen, mobileSheetHeight]);

    const handleSheetDragStart = (e: React.TouchEvent) => {
        sheetDragStart.current = e.touches[0].clientY;
        sheetStartHeight.current = mobileSheetHeight;
    };

    const handleSheetDragMove = (e: React.TouchEvent) => {
        const deltaY = e.touches[0].clientY - sheetDragStart.current;
        const vhDelta = (deltaY / window.innerHeight) * 100;
        const newHeight = sheetStartHeight.current - vhDelta;
        if (newHeight >= 25 && newHeight <= 90) {
            setMobileSheetHeight(newHeight);
        }
    };

    const [debouncedRhymeTrigger, setDebouncedRhymeTrigger] = useState<NodeJS.Timeout | null>(null);
    const lastRhymedWordRef = useRef<string | null>(null);

    const getTargetWord = (text: string, index: number) => {
        if (!text) return '';
        let start = index;
        while (start > 0 && /[a-zA-Z']/.test(text[start - 1])) {
            start--;
        }
        let end = index;
        while (end < text.length && /[a-zA-Z']/.test(text[end])) {
            end++;
        }
        return text.slice(start, end);
    };

    const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        setCursorIndex(target.selectionStart);

        if (debouncedRhymeTrigger) clearTimeout(debouncedRhymeTrigger);

        const newTimer = setTimeout(() => {
            const word = getTargetWord(target.value, target.selectionStart);
            if (word && word.length > 2 && word !== lastRhymedWordRef.current) {
                lastRhymedWordRef.current = word;
                handleRhymeSearch(word);
            }
        }, 1000);

        setDebouncedRhymeTrigger(newTimer);
    };

    const checkSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        if (target.selectionStart !== target.selectionEnd) {
            setSelection({
                start: target.selectionStart,
                end: target.selectionEnd,
                text: target.value.substring(target.selectionStart, target.selectionEnd).trim()
            });
        } else {
            setSelection(null);
        }
    };

    const handleRhymeSearch = async (word: string) => {
        if (!word) return;
        setIsRhymeLoading(true);
        try {
            const results = await getRhymesForWord(word);
            setRhymes(results);
        } catch (e) {
            console.error(e);
        } finally {
            setIsRhymeLoading(false);
        }
    };

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    const activeNote = notes.find(n => n.id === activeNoteId);

    const { wordToGroup, groupToColor } = useMemo(() =>
        activeNote ? analyzeRhymeScheme(activeNote.content, accent) : { wordToGroup: {}, groupToColor: {} },
        [activeNote?.content, accent]);

    const debouncedSave = useCallback((id: string, updates: Partial<Note>) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await updateNote(id, updates);
            } catch (error) {
                console.error('Error saving note:', error);
            }
        }, 1000);
    }, []);

    const handleUpdateContent = (val: string) => {
        if (!activeNote) return;
        setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: val } : n));
        debouncedSave(activeNote.id, { content: val });
    };

    const handleUpdateTitle = (val: string) => {
        if (!activeNote) return;
        setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, title: val } : n));
        debouncedSave(activeNote.id, { title: val });
    };

    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const handleExport = () => {
        alert("Export feature coming soon to Studio+!");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await uploadFile(file);
            const files = await getUserFiles();
            setAudioFiles(files.filter(f => f.type === 'audio'));
        } catch (error) {
            console.error('Upload failed', error);
        }
    };

    const handleAttachFile = (fileName: string) => {
        if (activeNoteId) {
            setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, attachedAudio: fileName } : n));
            setViewMode('editor');
            setAudioPlaying(true);
            debouncedSave(activeNoteId, { attachedAudio: fileName });
        }
    };

    const handleDetachFile = () => {
        if (activeNoteId) {
            setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, attachedAudio: undefined } : n));
            setAudioPlaying(false);
            debouncedSave(activeNoteId, { attachedAudio: null as any });
        }
    };

    const handleCreateNote = async (
        initialTitle: string = 'Untitled Note',
        initialContent: string = '',
        initialAudio?: string
    ) => {
        try {
            const newNote = await createNote(initialTitle, initialContent, initialAudio);
            if (!trashView) {
                setNotes([newNote, ...notes]);
                setActiveNoteId(newNote.id);
            } else {
                setTrashView(false);
            }
            setViewMode('editor');
            setIsSidebarOpen(false);
        } catch (error) {
            console.error('Failed to create note', error);
        }
    };

    const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const isPermanent = trashView;
        const confirmMsg = isPermanent
            ? 'Are you sure you want to PERMANENTLY delete this note?'
            : 'Move this note to the trash?';

        setConfirmationModal({
            isOpen: true,
            type: 'delete',
            noteId: id,
            title: isPermanent ? 'Delete Note Permanently' : 'Delete Note',
            message: confirmMsg
        });
    };

    const handleRestoreNote = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await restoreNote(id);
            const updatedNotes = notes.filter(n => n.id !== id);
            setNotes(updatedNotes);
            if (id === activeNoteId) {
                setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
            }
        } catch (error) {
            console.error('Failed to restore note', error);
        }
    };

    const handleUpdateContentWrapper = (newContent: string) => {
        handleUpdateContent(newContent);
        const lastChar = newContent.slice(-1);
        const prevLastChar = activeNote?.content.slice(-1) || '';

        if ((lastChar === '\n' && prevLastChar !== '\n') || (lastChar === ' ' && /[.?!,]/.test(prevLastChar))) {
            const words = newContent.trim().split(/\s+/);
            const lastWord = words[words.length - 1]?.replace(/[^a-zA-Z]/g, '');

            if (lastWord && lastWord.length > 2) {
                setIsRhymeLoading(true);
                getRhymesForWord(lastWord).then(results => {
                    setRhymes(results);
                    setIsRhymeLoading(false);
                }).catch(() => setIsRhymeLoading(false));
            }
        }
    };

    const getWordUnderCursor = (text: string, index: number) => {
        if (!text) return '';
        let start = index;
        while (start > 0 && /[a-zA-Z']/.test(text[start - 1])) start--;
        let end = index;
        while (end < text.length && /[a-zA-Z']/.test(text[end])) end++;
        return text.slice(start, end);
    };

    const currentWord = activeNote ? getWordUnderCursor(activeNote.content, cursorIndex) : '';

    const getRhymeSuggestions = (word: string) => {
        if (rhymes.length > 0) return rhymes;
        if (!word || word.length < 2) return [];
        const lowerWord = word.toLowerCase();
        for (const suffix in MOCK_RHYMES) {
            if (lowerWord.endsWith(suffix)) return MOCK_RHYMES[suffix];
        }
        return [];
    };

    const suggestions = rhymes.length > 0 ? rhymes : getRhymeSuggestions(currentWord);

    const renderHighlightedText = (text: string) => {
        if (!text) return null;
        const tokens = text.split(/([^a-zA-Z0-9_']+)/);

        return tokens.map((token, i) => {
            const lower = token.toLowerCase();
            let colorClass = 'text-transparent';

            if (rhymeMode) {
                const group = wordToGroup[lower];
                if (group && groupToColor[group]) {
                    colorClass = groupToColor[group];
                } else {
                    colorClass = 'text-neutral-500';
                }
            }
            return <span key={i} className={`${colorClass} transition-colors duration-300`}>{token}</span>;
        });
    };

    const renderEditorView = () => (
        <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
            <MobileTitlePortal
                activeNote={activeNote}
                onUpdateTitle={handleUpdateTitle}
                onOpenSidebar={() => setIsSidebarOpen(true)}
            />

            {activeNote && activeNote.attachedAudio && (
                <div className="h-12 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-3 lg:px-6 shrink-0 z-20">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center text-primary shrink-0">
                            <Music size={12} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{activeNote.attachedAudio}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => {
                                // Find audio file url
                                let audioUrl = '';
                                const isUrl = activeNote.attachedAudio?.startsWith('http') || activeNote.attachedAudio?.startsWith('blob:');

                                if (isUrl && activeNote.attachedAudio) {
                                    audioUrl = activeNote.attachedAudio;
                                } else {
                                    const audioFile = audioFiles.find(f => f.name === activeNote.attachedAudio);
                                    if (audioFile) {
                                        audioUrl = audioFile.url;
                                    }
                                }

                                if (!audioUrl) {
                                    console.error('Audio file not found');
                                    return;
                                }

                                // Construct temporary project for global player
                                const noteTrackId = `note-audio-${activeNote.id}`;
                                const noteProjectId = `note-project-${activeNote.id}`;

                                // Check if currently playing this track
                                const isCurrentTrack = currentTrackId === noteTrackId && currentProject?.id === noteProjectId;

                                if (isCurrentTrack) {
                                    onTogglePlay();
                                } else {
                                    const noteProject: Project = {
                                        id: noteProjectId,
                                        title: 'My Notes',
                                        producer: userProfile?.username || 'Me',
                                        producerAvatar: userProfile?.avatar || '',
                                        coverImage: userProfile?.avatar || '',
                                        price: 0,
                                        bpm: 0,
                                        genre: 'Notes',
                                        type: 'track', // using 'track' or similar as per types
                                        tags: [],
                                        tracks: [
                                            {
                                                id: noteTrackId,
                                                title: activeNote.attachedAudio?.split('/').pop() || 'Audio Note',
                                                duration: 0,
                                                files: { mp3: audioUrl }
                                            }
                                        ]
                                    } as any; // Cast to avoid missing optional fields if strict

                                    onPlayTrack(noteProject, noteTrackId);
                                }
                            }}
                            className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            {(currentTrackId === `note-audio-${activeNote.id}` && isPlaying) ? <Pause size={12} fill="black" /> : <Play size={12} fill="black" className="ml-0.5" />}
                        </button>
                        <button onClick={handleDetachFile} className="text-neutral-500 hover:text-red-500">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <div className="flex-1 relative font-mono leading-relaxed overflow-y-auto custom-scrollbar bg-[#050505] scrollbar-hide-mobile" onScroll={handleScroll}>
                        {selection && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 w-max max-w-[90vw]">
                                <button
                                    onClick={() => handleRhymeSearch(selection.text)}
                                    className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-primary/30 active:scale-95 transition-all backdrop-blur-md"
                                >
                                    <Music size={16} className="text-primary" />
                                    <span className="text-xs font-bold">Rhyme "{selection.text}"</span>
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 grid-rows-1 min-h-full">
                            <div className="grid grid-cols-1 grid-rows-1 w-full h-full relative">
                                <div
                                    ref={backdropRef}
                                    className={`
                                        col-start-1 row-start-1 p-5 lg:p-12 whitespace-pre-wrap break-words overflow-visible pointer-events-none z-0 font-mono leading-relaxed text-transparent
                                        ${textSize === 'xs' ? 'text-xs' : textSize === 'sm' ? 'text-sm' : textSize === 'base' ? 'text-base' : 'text-lg'}
                                    `}
                                >
                                    {activeNote && renderHighlightedText(activeNote.content + ' ')}
                                </div>

                                <textarea
                                    ref={textareaRef}
                                    className={`
                                        col-start-1 row-start-1 w-full h-full bg-transparent p-5 lg:p-12 resize-none overflow-hidden focus:outline-none z-10 font-mono leading-relaxed whitespace-pre-wrap break-words
                                        ${textSize === 'xs' ? 'text-xs' : textSize === 'sm' ? 'text-sm' : textSize === 'base' ? 'text-base' : 'text-lg'}
                                        ${rhymeMode ? 'text-transparent caret-white' : 'text-neutral-300 caret-white'}
                                    `}
                                    value={activeNote ? activeNote.content : ''}
                                    onChange={(e) => {
                                        handleUpdateContentWrapper(e.target.value);
                                        handleSelectionChange(e);
                                    }}
                                    onSelect={(e) => {
                                        handleSelectionChange(e);
                                        checkSelection(e);
                                    }}
                                    onBlur={() => setTimeout(() => setSelection(null), 200)}
                                    placeholder="Start writing lyrics..."
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-32 lg:hidden shrink-0" />

                    <div className="lg:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-[48] bg-[#050505] border-t border-white/20 pb-0">
                        <div className="flex flex-col">
                            {isSizeExpanded && (
                                <div className="absolute bottom-[calc(100%+1px)] left-0 right-0 bg-[#0A0A0A] border-t border-white/10 p-4 z-[60] animate-in slide-in-from-bottom-2 fade-in duration-200 flex justify-center shadow-2xl">
                                    <div className="flex items-center gap-6 bg-white/5 rounded-full px-4 py-2 border border-white/10">
                                        <button
                                            onClick={() => setTextSize(prev => prev === 'xs' ? 'xs' : prev === 'sm' ? 'xs' : prev === 'base' ? 'sm' : 'base')}
                                            className={`p-2 rounded-full transition-colors ${textSize === 'xs' ? 'text-neutral-600 cursor-not-allowed' : 'text-white hover:bg-white/10 active:bg-white/20'}`}
                                            disabled={textSize === 'xs'}
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <span className="text-xs font-mono font-bold text-primary w-16 text-center uppercase tracking-wider">
                                            {textSize === 'xs' && 'Small'}
                                            {textSize === 'sm' && 'Medium'}
                                            {textSize === 'base' && 'Large'}
                                            {textSize === 'lg' && 'Huge'}
                                        </span>
                                        <button
                                            onClick={() => setTextSize(prev => prev === 'xs' ? 'sm' : prev === 'sm' ? 'base' : prev === 'base' ? 'lg' : 'lg')}
                                            className={`p-2 rounded-full transition-colors ${textSize === 'lg' ? 'text-neutral-600 cursor-not-allowed' : 'text-white hover:bg-white/10 active:bg-white/20'}`}
                                            disabled={textSize === 'lg'}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="h-16 flex items-center justify-between px-2 w-full max-sm MX-auto">
                                <button
                                    onClick={() => handleCreateNote()}
                                    className="flex-1 group flex flex-col items-center gap-1 transition-all py-1"
                                >
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all bg-white/5 border border-white/5 group-active:bg-primary group-active:text-black group-active:border-primary group-active:scale-95">
                                        <Plus size={18} className="stroke-[2.5px]" />
                                    </div>
                                    <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-neutral-400 group-active:text-primary">New</span>
                                </button>

                                <button
                                    onClick={() => { setIsSizeExpanded(!isSizeExpanded); setMobileAssistantOpen(false); }}
                                    className={`flex-1 group flex flex-col items-center gap-1 transition-all py-1`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all border ${isSizeExpanded ? 'bg-primary text-black border-primary' : 'bg-transparent text-neutral-400 border-transparent group-hover:text-white'}`}>
                                        <Type size={18} className="stroke-[2.5px]" />
                                    </div>
                                    <span className={`text-[9px] uppercase tracking-wider font-mono font-bold ${isSizeExpanded ? 'text-primary' : 'text-neutral-500'}`}>Size</span>
                                </button>

                                <button
                                    onClick={() => {
                                        setToolkitOpen(!isToolkitOpen);
                                        setIsSizeExpanded(false);
                                    }}
                                    className={`flex-1 group flex flex-col items-center gap-1 transition-all py-1`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all border ${isToolkitOpen ? 'bg-primary text-black border-primary' : 'bg-transparent text-neutral-400 border-transparent group-hover:text-white'}`}>
                                        <Globe size={18} className="stroke-[2.5px]" />
                                    </div>
                                    <span className={`text-[9px] uppercase tracking-wider font-mono font-bold ${isToolkitOpen ? 'text-primary' : 'text-neutral-500'}`}>Tools</span>
                                </button>

                                <button
                                    onClick={() => setRhymeMode(!rhymeMode)}
                                    className={`flex-1 group flex flex-col items-center gap-1 transition-all py-1`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all border ${rhymeMode ? 'bg-primary text-black border-primary' : 'bg-transparent text-neutral-400 border-transparent group-hover:text-white'}`}>
                                        <Highlighter size={18} className="stroke-[2.5px]" />
                                    </div>
                                    <span className={`text-[9px] uppercase tracking-wider font-mono font-bold ${rhymeMode ? 'text-primary' : 'text-neutral-500'}`}>Rhyme</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {isToolkitOpen && (
                        <div
                            style={{ height: `${mobileSheetHeight}vh` }}
                            className="lg:hidden absolute bottom-[env(safe-area-inset-bottom)] left-0 right-0 z-[50] bg-black border-t-2 border-white/20 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-bottom-full duration-300 transition-[height] ease-out"
                        >
                            <div className="w-full flex items-center justify-between px-4 py-2 bg-neutral-900/80 backdrop-blur-xl border-b border-white/10 relative shrink-0">
                                <div
                                    className="absolute left-1/2 -translate-x-1/2 w-32 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100"
                                    onTouchStart={handleSheetDragStart}
                                    onTouchMove={handleSheetDragMove}
                                >
                                    <div className="flex gap-0.5">
                                        <div className="w-8 h-[2px] bg-white/40"></div>
                                        <div className="w-8 h-[2px] bg-white/40"></div>
                                        <div className="w-8 h-[2px] bg-white/40"></div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setToolkitOpen(false)}
                                    className="w-6 h-6 flex items-center justify-center rounded bg-white/10 text-neutral-400 hover:text-white hover:bg-white/20 active:scale-95 transition-all"
                                >
                                    <ChevronDown size={14} />
                                </button>
                            </div>

                            <div className="flex items-center border-b border-white/10 bg-black">
                                <button
                                    onClick={() => setToolkitTab('rhymes')}
                                    className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors relative border-r border-white/5 ${toolkitTab === 'rhymes' ? 'text-black bg-primary' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    <Music size={12} /> Rhyme_Engine
                                </button>
                                <button
                                    onClick={() => setToolkitTab('tools')}
                                    className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors relative ${toolkitTab === 'tools' ? 'text-black bg-primary' : 'text-neutral-500 hover:text-white'}`}
                                >
                                    <FolderOpen size={12} /> Extras
                                </button>
                            </div>

                            <div className="flex-1 overflow-hidden relative bg-[#0c0c0c]">
                                {toolkitTab === 'rhymes' && (
                                    <div className="h-full flex flex-col">
                                        <div className="p-2 border-b border-white/5 flex justify-between items-center bg-white/5">
                                            <span className="text-[9px] uppercase font-bold text-neutral-500">Target Word: <span className="text-white">{currentWord || "..."}</span></span>
                                            <button onClick={() => setAccent(accent === 'US' ? 'UK' : 'US')} className="text-[10px] font-bold text-neutral-400 border border-white/10 px-2 py-0.5 rounded-full bg-black/20">{accent}</button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                                            {currentWord && suggestions.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {suggestions.map((word, i) => (
                                                        <button
                                                            key={i}
                                                            className="px-2.5 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-300 active:bg-primary active:text-black transition-colors"
                                                            onClick={() => {
                                                                if (activeNote) {
                                                                    const newContent = activeNote.content + " " + word;
                                                                    handleUpdateContent(newContent);
                                                                }
                                                            }}
                                                        >
                                                            {word}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-40 text-neutral-600 opacity-50 space-y-2">
                                                    <Mic size={24} />
                                                    <p className="text-xs">Tap a word to see rhymes.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {toolkitTab === 'tools' && (
                                    <div className="h-full flex flex-col bg-black">
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={chatScrollRef}>
                                            {chatMessages.length === 0 && (
                                                <div className="flex flex-col items-center justify-center h-48 text-neutral-600 opacity-50 space-y-2">
                                                    <MessageSquare size={32} />
                                                    <p className="text-xs text-center max-w-[200px]">Ask me anything about your lyrics, ideas, or music theory.</p>
                                                </div>
                                            )}
                                            {chatMessages.map((msg, i) => (
                                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user'
                                                        ? 'bg-primary text-black rounded-tr-sm'
                                                        : 'bg-neutral-800 text-neutral-200 rounded-tl-sm border border-neutral-700'
                                                        }`}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            ))}
                                            {chatLoading && (
                                                <div className="flex justify-start">
                                                    <div className="bg-neutral-800 p-3 rounded-2xl rounded-tl-sm border border-neutral-700 flex gap-1 items-center">
                                                        <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 border-t border-white/10 bg-black shrink-0 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                                            <div className="relative flex items-center">
                                                <input
                                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-neutral-700 placeholder-neutral-600"
                                                    placeholder="Message AI..."
                                                    value={chatInput}
                                                    onChange={e => setChatInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                                />
                                                <button
                                                    onClick={handleSendChat}
                                                    disabled={!chatInput.trim() || chatLoading}
                                                    className="absolute right-1 w-9 h-9 flex items-center justify-center bg-primary text-black rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                                                >
                                                    {chatLoading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <ArrowRight size={16} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Creative Assistant Sidebar (Desktop Only) */}
                <div className="hidden lg:flex w-80 h-full bg-[#080808] border-l border-neutral-800 flex-col shrink-0 transition-all duration-300">
                    <div className="flex items-center border-b border-neutral-800">
                        <button
                            onClick={() => setAssistantTab('rhymes')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${assistantTab === 'rhymes' ? 'text-primary bg-primary/5 border-b-2 border-primary' : 'text-neutral-500 hover:text-white'}`}
                        >
                            <Music size={14} /> Rhymes
                        </button>
                        <button
                            onClick={() => setAssistantTab('tools')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${assistantTab === 'tools' ? 'text-primary bg-primary/5 border-b-2 border-primary' : 'text-neutral-500 hover:text-white'}`}
                        >
                            <FileText size={14} /> Extras
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden relative flex flex-col">
                        {assistantTab === 'rhymes' && (
                            <>
                                <div className="p-4 border-b border-neutral-800 bg-neutral-900/20 shrink-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] uppercase font-bold text-neutral-500">Target Word</span>
                                        <button
                                            onClick={() => setAccent(accent === 'US' ? 'UK' : 'US')}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-[9px] font-bold text-neutral-400 hover:text-white"
                                            title="Toggle Accent"
                                        >
                                            <Globe size={10} /> {accent}
                                        </button>
                                    </div>
                                    <div className="text-xl font-black text-white truncate break-all">
                                        {currentWord || <span className="text-neutral-600 italic text-sm font-normal">Select a word...</span>}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    {currentWord && suggestions.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {suggestions.map((word, i) => (
                                                <button
                                                    key={i}
                                                    className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300 hover:text-white hover:border-primary/50 hover:bg-white/5 cursor-pointer transition-all active:scale-95"
                                                    onClick={() => {
                                                        if (activeNote) {
                                                            const newContent = activeNote.content + " " + word;
                                                            handleUpdateContent(newContent);
                                                        }
                                                    }}
                                                >
                                                    {word}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-40 text-neutral-600 space-y-3 mt-10">
                                            <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center">
                                                {isRhymeLoading ? (
                                                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                                ) : (
                                                    <Mic size={20} className="opacity-50" />
                                                )}
                                            </div>
                                            <p className="text-xs text-center px-4 leading-relaxed">
                                                {isRhymeLoading ? 'Analysing rhymes...' : 'Type or select a word to see rhymes.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {assistantTab === 'tools' && (
                            <div className="flex flex-col h-full bg-[#080808]">
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={chatScrollRef}>
                                    {chatMessages.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-64 text-neutral-600 opacity-30 space-y-3">
                                            <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center">
                                                <MessageSquare size={24} />
                                            </div>
                                            <p className="text-sm font-medium text-center px-4">Ask about rhymes, lyrics, or feedback.</p>
                                        </div>
                                    )}
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed break-words ${msg.role === 'user'
                                                ? 'bg-primary text-black rounded-tr-sm font-medium'
                                                : 'bg-neutral-800 text-neutral-200 rounded-tl-sm border border-neutral-700'
                                                }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-neutral-800 p-3 rounded-2xl rounded-tl-sm border border-neutral-700 flex gap-1 items-center">
                                                <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-neutral-800 bg-[#080808]">
                                    <div className="relative flex items-center">
                                        <textarea
                                            rows={1}
                                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:outline-none focus:border-neutral-700 placeholder-neutral-600 resize-none custom-scrollbar"
                                            placeholder="Ask AI..."
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendChat();
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={handleSendChat}
                                            disabled={!chatInput.trim() || chatLoading}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-primary text-black rounded-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                                        >
                                            {chatLoading ? <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <ArrowRight size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderBrowserView = () => (
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                    <FolderOpen size={24} className="text-primary" />
                    Select Audio to Attach
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {audioFiles.map(file => (
                        <div
                            key={file.id}
                            onClick={() => handleAttachFile(file.name)}
                            className={`
                                p-4 rounded-xl border bg-neutral-900/50 cursor-pointer transition-all group
                                ${activeNote && activeNote.attachedAudio === file.name
                                    ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.15)]'
                                    : 'border-white/5 hover:border-white/20 hover:bg-white/5'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-black/50 rounded-lg text-neutral-400 group-hover:text-white">
                                    <Music size={20} />
                                </div>
                                {activeNote && activeNote.attachedAudio === file.name && (
                                    <span className="px-2 py-1 bg-primary text-black text-[9px] font-bold rounded uppercase">Attached</span>
                                )}
                            </div>
                            <h3 className="text-sm font-bold text-white mb-1 truncate">{file.name}</h3>
                            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                                <span>{file.duration}</span>
                                <span>{file.size}</span>
                            </div>
                        </div>
                    ))}

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center p-4 text-neutral-500 hover:text-white hover:border-neutral-600 hover:bg-white/5 transition-colors cursor-pointer min-h-[140px]"
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="audio/*,.mp3,.wav,.m4a,.ogg"
                            className="hidden"
                        />
                        <Paperclip size={24} className="mb-2" />
                        <span className="text-xs font-bold">Upload New File</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const isOverlayOpen = isSidebarOpen || isMobileAssistantOpen || isSizeExpanded;

    return (
        <div className={`
            w-full animate-in fade-in duration-500 flex flex-col overflow-hidden
            fixed inset-x-0 bottom-0 top-16 ${isOverlayOpen ? 'z-[80]' : 'z-10'} bg-[#050505] lg:relative lg:z-30 lg:top-0 lg:h-full lg:bg-transparent
        `}>
            <div className="flex-1 flex bg-[#0a0a0a] overflow-hidden relative">

                {/* Sidebar (Left Side) */}
                <div className={`
                    absolute lg:static inset-y-0 left-0 z-[60] w-full lg:w-72 lg:border-r border-neutral-800 flex flex-col bg-black lg:bg-[#080808] transition-transform duration-300
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <FileText size={14} className="text-primary" />
                            My Notebook
                        </h3>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleCreateNote()}
                                className="lg:hidden text-neutral-400 hover:text-white transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-neutral-500 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="px-4 mb-4 shrink-0 flex gap-2">
                        <div className="relative mt-4 flex-1">
                            <input className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 pl-8" placeholder={trashView ? "Search deleted..." : "Search notes..."} />
                            <FileText size={12} className="absolute left-2.5 top-2.5 text-neutral-500" />
                        </div>
                        <button
                            onClick={() => setTrashView(!trashView)}
                            className={`mt-4 w-10 h-[34px] flex items-center justify-center rounded border transition-colors shrink-0 ${trashView ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}
                            title={trashView ? "View Active Notes" : "View Recycling Bin"}
                        >
                            {trashView ? <RotateCcw size={14} /> : <Trash size={14} />}
                        </button>
                        {trashView && notes.length > 0 && (
                            <button
                                onClick={handleEmptyTrash}
                                className="mt-4 w-10 h-[34px] flex items-center justify-center rounded border bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20 transition-colors shrink-0"
                                title="Empty Trash"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {notes.map(note => (
                            <div
                                key={note.id}
                                onClick={() => {
                                    setActiveNoteId(note.id);
                                    setIsSidebarOpen(false);
                                }}
                                className={`
                                    p-3 rounded-lg border cursor-pointer transition-all group relative
                                    ${activeNoteId === note.id
                                        ? 'bg-primary/10 border-primary/20'
                                        : 'border-transparent hover:bg-white/5'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`text-sm font-bold truncate pr-4 ${activeNoteId === note.id ? 'text-primary' : 'text-neutral-300'}`}>{note.title}</h4>
                                    {note.attachedAudio && (
                                        <Headphones size={12} className={activeNoteId === note.id ? 'text-primary' : 'text-neutral-600'} />
                                    )}
                                </div>
                                <p className="text-xs text-neutral-500 line-clamp-1 mb-2">{note.preview || 'No content'}</p>
                                <span className="text-[9px] text-neutral-600 font-mono">{note.updated}</span>

                                {trashView ? (
                                    <button
                                        onClick={(e) => handleRestoreNote(e, note.id)}
                                        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-green-500"
                                        title="Restore Note"
                                    >
                                        <RotateCcw size={12} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => handleDeleteNote(e, note.id)}
                                        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-500"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-[#050505] relative w-full overflow-hidden">
                    {activeNote ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Desktop Controls */}
                            <div className="hidden lg:flex h-14 border-b border-neutral-800 items-center justify-between px-6 bg-neutral-900/30 z-20 shrink-0">
                                <div className="flex items-center gap-4">
                                    {viewMode === 'browser' && (
                                        <button onClick={() => setViewMode('editor')} className="p-1.5 hover:bg-white/5 rounded text-neutral-400 hover:text-white"><ChevronLeft size={16} /></button>
                                    )}
                                    <input
                                        value={activeNote.title}
                                        onChange={(e) => handleUpdateTitle(e.target.value)}
                                        className="bg-transparent border-none text-sm font-bold text-white focus:outline-none p-0 w-64"
                                        placeholder="Untitled Note"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    {viewMode === 'editor' && (
                                        <button
                                            onClick={() => setRhymeMode(!rhymeMode)}
                                            className={`
                                                flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all
                                                ${rhymeMode
                                                    ? 'bg-primary text-black shadow-[0_0_15px_rgba(var(--primary),0.3)]'
                                                    : 'text-neutral-500 hover:text-white hover:bg-white/5 border border-white/5'
                                                }
                                            `}
                                        >
                                            <Highlighter size={12} />
                                            <span>Rhymes</span>
                                        </button>
                                    )}
                                    <div className="w-px h-4 bg-neutral-800 hidden sm:block"></div>
                                    <button
                                        onClick={() => setViewMode(viewMode === 'editor' ? 'browser' : 'editor')}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase border border-neutral-700 text-neutral-400 hover:text-white hover:border-white"
                                    >
                                        {viewMode === 'editor' ? <FolderOpen size={12} /> : <FileText size={12} />}
                                        <span>{viewMode === 'editor' ? 'Attach' : 'Editor'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Main Content Switcher */}
                            {viewMode === 'editor' ? renderEditorView() : renderBrowserView()}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 p-8 text-center">
                            <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mb-4">
                                {trashView ? <Trash2 size={32} /> : <FileText size={32} />}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{trashView ? 'Recycling Bin' : 'No Note Selected'}</h3>
                            <p className="text-sm max-w-xs mb-6">
                                {trashView
                                    ? 'Notes are permanently deleted after 30 days.'
                                    : 'Select a note from the sidebar or create a new one to start writing.'}
                            </p>
                            {!trashView && (
                                <button
                                    onClick={() => handleCreateNote()}
                                    className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform"
                                >
                                    Create New Note
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Overlay for mobile */}
                {isSidebarOpen && (
                    <div
                        className="absolute inset-0 bg-black/80 z-[58] lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                )}
            </div>

            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmAction}
                title={confirmationModal.title || 'Confirm Action'}
                message={confirmationModal.message || 'Are you sure?'}
                confirmLabel={confirmationModal.type === 'delete' ? 'Delete Note' : 'Empty Trash'}
                isDestructive={true}
            />
        </div>
    );
};

export default NotesPage;
