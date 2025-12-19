import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Note } from '../types';
import { getNotes, createNote, updateNote, deleteNote, getUserFiles, uploadFile } from '../services/supabaseService';
import {
    Plus,
    Copy,
    Trash2,
    FileText,
    Sparkles,
    Brain,
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
    ArrowRight
} from 'lucide-react';
import { getWritingAssistance, getRhymesForWord } from '../services/geminiService';

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
    return { wordToGroup, groupToColor };
};

// --- Isolated Draggable FAB Component ---
const DraggableFab = ({ onClick, isSizeExpanded }: { onClick: () => void, isSizeExpanded: boolean }) => {
    const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const fabRef = useRef<HTMLButtonElement>(null);

    const handleFabTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        dragStartPos.current = {
            x: touch.clientX - fabPosition.x,
            y: touch.clientY - fabPosition.y
        };
        setIsDragging(true);
    };

    const handleFabTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const nextX = touch.clientX - dragStartPos.current.x;
        const nextY = touch.clientY - dragStartPos.current.y;
        setFabPosition({ x: nextX, y: nextY });
    };

    const handleFabTouchEnd = () => {
        setIsDragging(false);
    };

    return (
        <button
            ref={fabRef}
            onClick={(e) => {
                if (isDragging) return;
                onClick();
            }}
            onTouchStart={handleFabTouchStart}
            onTouchMove={handleFabTouchMove}
            onTouchEnd={handleFabTouchEnd}
            style={{
                transform: `translate(${fabPosition.x}px, ${fabPosition.y + (isSizeExpanded ? -60 : 0)}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
            className="lg:hidden fixed right-6 bottom-28 w-14 h-14 bg-gradient-to-br from-primary via-primary to-primary/80 text-black rounded-full shadow-[0_0_25px_rgba(var(--primary-rgb),0.6)] border border-white/20 flex items-center justify-center z-[60] active:scale-90"
        >
            <Plus size={28} strokeWidth={2.5} />
        </button>
    );
};

const NotesPage: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [audioFiles, setAudioFiles] = useState<any[]>([]); // Real files state

    // View State
    const [viewMode, setViewMode] = useState<'editor' | 'browser'>('editor');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
    const [aiRhymes, setAiRhymes] = useState<string[]>([]);
    const [isAiRhymeLoading, setIsAiRhymeLoading] = useState(false);

    // Hidden file input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debounce timer ref
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load Notes
    useEffect(() => {
        const fetchNotes = async () => {
            try {
                const data = await getNotes();
                setNotes(data);
                if (data.length > 0 && !activeNoteId) {
                    setActiveNoteId(data[0].id);
                }
            } catch (error) {
                console.error('Failed to load notes', error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotes();
    }, []);

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
        if (viewMode === 'browser') {
            fetchFiles();
        }
    }, [viewMode]);



    // Feature State
    const [rhymeMode, setRhymeMode] = useState(false);
    const [accent, setAccent] = useState<'US' | 'UK'>('US');
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [assistantTab, setAssistantTab] = useState<'rhymes' | 'chat'>('rhymes');

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [cursorIndex, setCursorIndex] = useState(0);
    const [selection, setSelection] = useState<{ start: number, end: number, text: string } | null>(null);
    const [textSize, setTextSize] = useState<'xs' | 'sm' | 'base' | 'lg'>('xs'); // New text size state
    const [isSizeExpanded, setIsSizeExpanded] = useState(false);

    // Mobile Assistant State
    const [isMobileAssistantOpen, setMobileAssistantOpen] = useState(false);
    const [mobileAssistantTab, setMobileAssistantTab] = useState<'rhymes' | 'chat'>('rhymes');



    const checkSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;

        if (start !== end) {
            const text = target.value.substring(start, end);
            if (text.trim().length > 0) {
                setSelection({
                    start: start,
                    end: end,
                    text: text.trim()
                });
                return;
            }
        }
        setSelection(null);
    };

    const handleAiRhymeSearch = async () => {
        if (!selection) return;
        setIsAiRhymeLoading(true);
        try {
            const rhymes = await getRhymesForWord(selection.text);
            setAiRhymes(rhymes);
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAiRhymeLoading(false);
            setSelection(null);
        }
    };

    // Refs for syncing scroll
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);

    const activeNote = notes.find(n => n.id === activeNoteId);

    // Memoize analysis for performance
    const { wordToGroup, groupToColor } = useMemo(() =>
        activeNote ? analyzeRhymeScheme(activeNote.content, accent) : { wordToGroup: {}, groupToColor: {} },
        [activeNote?.content, accent]);

    // Debounced save function
    const debouncedSave = useCallback((id: string, updates: Partial<Note>) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await updateNote(id, updates);
                console.log('Note saved:', id);
            } catch (error) {
                console.error('Error saving note:', error);
            }
        }, 1000); // 1.0s debounce
    }, []);

    const handleUpdateContent = (val: string) => {
        if (!activeNote) return;

        // Update local state immediately
        setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, content: val } : n));

        // Trigger background save
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

    const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        setCursorIndex(e.currentTarget.selectionStart);
    };

    const handleAiSubmit = async () => {
        if (!aiPrompt.trim() || !activeNote) return;
        setAiLoading(true);
        setAiResponse(null);

        const response = await getWritingAssistance(aiPrompt, activeNote.content);

        setAiResponse(response);
        setAiLoading(false);
        setAiPrompt('');
    };

    const insertAiResponse = () => {
        if (!aiResponse || !activeNote) return;
        const newContent = activeNote.content + "\n\n" + aiResponse;
        handleUpdateContent(newContent);
        setAiResponse(null);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await uploadFile(file);
            // Refresh list
            const files = await getUserFiles();
            setAudioFiles(files.filter(f => f.type === 'audio'));
        } catch (error) {
            console.error('Upload failed', error);
            alert('Upload failed: ' + (error as any).message);
        }
    };

    const handleAttachFile = (fileName: string) => {
        if (activeNoteId) {
            setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, attachedAudio: fileName } : n));
            setViewMode('editor');
            setAudioPlaying(true); // Auto play on attach/return
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

    const handleCreateNote = async () => {
        try {
            const newNote = await createNote();
            setNotes([newNote, ...notes]);
            setActiveNoteId(newNote.id);
            setViewMode('editor');
            setIsSidebarOpen(false); // Close sidebar on mobile
        } catch (error) {
            console.error('Failed to create note', error);
        }
    };



    const handleDeleteNote = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            await deleteNote(id);
            const updatedNotes = notes.filter(n => n.id !== id);
            setNotes(updatedNotes);
            if (id === activeNoteId) {
                setActiveNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
            }
        } catch (error) {
            console.error('Failed to delete note', error);
        }
    };

    // --- Content Handler Wrapper ---
    const handleUpdateContentWrapper = (newContent: string) => {
        handleUpdateContent(newContent);

        // Check for "Enter" or end of sentence triggers to fetch AI rhymes
        const lastChar = newContent.slice(-1);
        const prevLastChar = activeNote?.content.slice(-1) || '';

        if ((lastChar === '\n' && prevLastChar !== '\n') || (lastChar === ' ' && /[.?!,]/.test(prevLastChar))) {
            const words = newContent.trim().split(/\s+/);
            const lastWord = words[words.length - 1]?.replace(/[^a-zA-Z]/g, '');

            if (lastWord && lastWord.length > 2) {
                setIsAiRhymeLoading(true);
                getRhymesForWord(lastWord).then(rhymes => {
                    setAiRhymes(rhymes);
                    setIsAiRhymeLoading(false);
                }).catch(() => setIsAiRhymeLoading(false));
            }
        }
    };

    // --- Manual Sidebar Suggestion Logic (Legacy/Fallback) ---
    const getLastWord = (text: string, index: number) => {
        if (!text) return '';
        const textBefore = text.slice(0, index);
        const match = textBefore.match(/([a-zA-Z']+)$/);
        return match ? match[1] : '';
    };

    const currentWord = activeNote ? getLastWord(activeNote.content, cursorIndex) : '';

    const getRhymeSuggestions = (word: string) => {
        if (aiRhymes.length > 0 && word === currentWord) return aiRhymes;
        if (aiRhymes.length > 0) return aiRhymes;

        if (!word || word.length < 2) return [];
        const lowerWord = word.toLowerCase();

        for (const suffix in MOCK_RHYMES) {
            if (lowerWord.endsWith(suffix)) {
                return MOCK_RHYMES[suffix];
            }
        }
        return [];
    };

    const suggestions = aiRhymes.length > 0 ? aiRhymes : getRhymeSuggestions(currentWord);

    // --- Highlighting Renderer ---
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
                    // FIX: Visible text for non-rhymes in active mode
                    colorClass = 'text-neutral-500';
                }
            }
            return <span key={i} className={`${colorClass} transition-colors duration-300`}>{token}</span>;
        });
    };

    // --- Sub-Components / Renderers ---

    // Title Portal Component
    const MobileTitlePortal = () => {
        const [target, setTarget] = useState<HTMLElement | null>(null);

        useEffect(() => {
            setTarget(document.getElementById('mobile-page-title'));
        }, []);

        if (!target || !activeNote) return null;

        return createPortal(
            <div className="flex items-center gap-2 w-full animate-in fade-in duration-300 min-w-0">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-1 -ml-1 text-neutral-400 hover:text-white shrink-0"
                >
                    <Book size={18} />
                </button>
                <input
                    value={activeNote.title}
                    onChange={(e) => handleUpdateTitle(e.target.value)}
                    className="bg-transparent border-none text-sm font-bold text-white focus:outline-none p-0 placeholder-neutral-600 w-full truncate min-w-0"
                    placeholder="Untitled Note"
                />
            </div>,
            target
        );
    };

    const renderEditorView = () => (
        <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
            {/* Portal for Mobile Title */}
            <MobileTitlePortal />

            {/* Embedded Audio Player */}
            {activeNote && activeNote.attachedAudio && (
                <div className="h-12 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-3 lg:px-6 shrink-0 z-20">
                    {audioPlaying && (
                        <audio
                            src={audioFiles.find(f => f.name === activeNote.attachedAudio)?.url}
                            autoPlay
                            onEnded={() => setAudioPlaying(false)}
                            onError={(e) => console.log('Audio error', e)}
                        />
                    )}

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
                            onClick={() => setAudioPlaying(!audioPlaying)}
                            className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            {audioPlaying ? <Pause size={12} fill="black" /> : <Play size={12} fill="black" className="ml-0.5" />}
                        </button>
                        <button onClick={handleDetachFile} className="text-neutral-500 hover:text-red-500">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Text Editor Wrap - Handles scrolling and sticky bar */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="flex-1 relative font-mono leading-relaxed overflow-y-auto custom-scrollbar bg-[#050505] scrollbar-hide-mobile">

                    {/* Selection Popup */}
                    {selection && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 w-max max-w-[90vw]">
                            <button
                                onClick={handleAiRhymeSearch}
                                className="flex items-center gap-2 bg-neutral-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-primary/30 active:scale-95 transition-all backdrop-blur-md"
                            >
                                <Brain size={16} className="text-primary" />
                                <span className="text-xs font-bold">Rhyme "{selection.text}"</span>
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 grid-rows-1 min-h-full">
                        <div className="grid grid-cols-1 grid-rows-1 w-full h-full relative">
                            {/* Layer 1: Backdrop - Using textSize state */}
                            <div
                                ref={backdropRef}
                                className={`
                                col-start-1 row-start-1 p-5 lg:p-8 whitespace-pre-wrap break-words overflow-visible pointer-events-none z-0 font-mono leading-relaxed text-transparent
                                ${textSize === 'xs' ? 'text-xs' : textSize === 'sm' ? 'text-sm' : textSize === 'base' ? 'text-base' : 'text-lg'}
                            `}
                            >
                                {activeNote && renderHighlightedText(activeNote.content + ' ')}
                            </div>

                            {/* Layer 2: Input - Using textSize state */}
                            <textarea
                                ref={textareaRef}
                                className={`
                                col-start-1 row-start-1 w-full h-full bg-transparent p-5 lg:p-8 resize-none overflow-hidden focus:outline-none z-10 font-mono leading-relaxed whitespace-pre-wrap break-words
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

                {/* Mobile Bottom Control Bar */}
                <div className="lg:hidden absolute bottom-0 left-0 right-0 z-[45] bg-[#080808]/95 backdrop-blur border-t border-neutral-800 pb-[env(safe-area-inset-bottom)]">
                    <div className="flex flex-col">
                        {/* Font Size Row (Expanded) */}
                        {isSizeExpanded && (
                            <div className="flex items-center justify-between p-3 bg-neutral-900/50 border-b border-neutral-800 animate-in slide-in-from-bottom-2">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">Text Size</span>
                                <div className="flex items-center gap-1.5 bg-neutral-800 rounded-lg p-1 mr-1">
                                    <button
                                        onClick={() => setTextSize(prev => prev === 'xs' ? 'xs' : prev === 'sm' ? 'xs' : prev === 'base' ? 'sm' : 'base')}
                                        className={`p-2 rounded ${textSize === 'xs' ? 'text-neutral-600' : 'text-white hover:bg-white/10'}`}
                                        disabled={textSize === 'xs'}
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span className="text-xs font-bold text-white w-14 text-center">
                                        {textSize === 'xs' && 'Small'}
                                        {textSize === 'sm' && 'Medium'}
                                        {textSize === 'base' && 'Large'}
                                        {textSize === 'lg' && 'Huge'}
                                    </span>
                                    <button
                                        onClick={() => setTextSize(prev => prev === 'xs' ? 'sm' : prev === 'sm' ? 'base' : prev === 'base' ? 'lg' : 'lg')}
                                        className={`p-2 rounded ${textSize === 'lg' ? 'text-neutral-600' : 'text-white hover:bg-white/10'}`}
                                        disabled={textSize === 'lg'}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="h-16 flex items-center px-4 gap-4 justify-around">
                            <button
                                onClick={() => { setIsSizeExpanded(!isSizeExpanded); setMobileAssistantOpen(false); }}
                                className={`flex flex-col items-center gap-1 transition-all ${isSizeExpanded ? 'text-primary' : 'text-neutral-500 hover:text-white'}`}
                            >
                                <Type size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">Size</span>
                            </button>

                            <button
                                onClick={() => {
                                    setMobileAssistantOpen(!isMobileAssistantOpen);
                                    setIsSizeExpanded(false);
                                }}
                                className={`flex flex-col items-center gap-1 transition-all ${isMobileAssistantOpen ? 'text-primary' : 'text-neutral-500 hover:text-white'}`}
                            >
                                <Sparkles size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">Assistant</span>
                            </button>

                            <button
                                onClick={() => setRhymeMode(!rhymeMode)}
                                className={`flex flex-col items-center gap-1 transition-all ${rhymeMode ? 'text-primary' : 'text-neutral-500 hover:text-white'}`}
                            >
                                <Highlighter size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">Highlights</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Assistant Sheet */}
                {isMobileAssistantOpen && (
                    <div className="lg:hidden absolute bottom-[env(safe-area-inset-bottom)] left-0 right-0 z-[44] bg-[#0c0c0c] border-t border-primary/20 rounded-t-2xl shadow-2xl flex flex-col h-[60vh] animate-in slide-in-from-bottom-full duration-300">
                        {/* Drag Handle */}
                        <div className="w-full h-1.5 flex justify-center py-2" onClick={() => setMobileAssistantOpen(false)}>
                            <div className="w-12 h-1 bg-neutral-800 rounded-full"></div>
                        </div>

                        {/* Tabs */}
                        <div className="flex items-center px-4 mt-2 border-b border-neutral-800">
                            <button
                                onClick={() => setMobileAssistantTab('rhymes')}
                                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors relative ${mobileAssistantTab === 'rhymes' ? 'text-primary' : 'text-neutral-500'}`}
                            >
                                <Brain size={14} /> Rhymz
                                {mobileAssistantTab === 'rhymes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
                            </button>
                            <button
                                onClick={() => setMobileAssistantTab('chat')}
                                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors relative ${mobileAssistantTab === 'chat' ? 'text-primary' : 'text-neutral-500'}`}
                            >
                                <Sparkles size={14} /> AI Chat
                                {mobileAssistantTab === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></div>}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden relative bg-neutral-900/50">
                            {mobileAssistantTab === 'rhymes' && (
                                <div className="h-full flex flex-col">
                                    <div className="p-3 border-b border-neutral-800 flex justify-between items-center bg-black/20">
                                        <span className="text-[10px] uppercase font-bold text-neutral-500">Target Word: <span className="text-white">{currentWord || "..."}</span></span>
                                        <button onClick={() => setAccent(accent === 'US' ? 'UK' : 'US')} className="text-[10px] font-bold text-neutral-500 border border-neutral-800 px-1.5 rounded">{accent}</button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                                        {currentWord && suggestions.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {suggestions.map((word, i) => (
                                                    <button
                                                        key={i}
                                                        className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-300 active:bg-primary active:text-black transition-colors"
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

                            {mobileAssistantTab === 'chat' && (
                                <div className="h-full flex flex-col">
                                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                                        {aiResponse ? (
                                            <div className="space-y-3">
                                                <div className="p-3 bg-neutral-800/50 rounded-xl border border-white/5">
                                                    <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={insertAiResponse} className="flex-1 py-2.5 bg-primary text-black text-xs font-bold rounded-xl">Insert</button>
                                                    <button onClick={() => setAiResponse(null)} className="flex-1 py-2.5 bg-white/10 text-white text-xs font-bold rounded-xl">Clear</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-neutral-600 opacity-50">
                                                <Sparkles size={32} className="mb-2" />
                                                <p className="text-xs">Ask AI for suggestions...</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 bg-black/40 border-t border-neutral-800">
                                        <div className="relative">
                                            <input
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                                                className="w-full bg-neutral-800 border-none rounded-full pl-4 pr-10 py-3 text-sm text-white focus:ring-1 focus:ring-primary placeholder-neutral-500"
                                                placeholder="Ask AI..."
                                            />
                                            <button
                                                onClick={handleAiSubmit}
                                                disabled={aiLoading || !aiPrompt.trim()}
                                                className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-primary"
                                            >
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Restore Mobile FAB */}
                {!isMobileAssistantOpen && !isSidebarOpen && !isSizeExpanded && (
                    <DraggableFab onClick={handleCreateNote} isSizeExpanded={isSizeExpanded} />
                )}
            </div>

            {/* Creative Assistant Sidebar (Desktop Only) */}
            <div className="hidden lg:flex w-80 bg-[#080808] border-l border-neutral-800 flex-col shrink-0 transition-all duration-300">

                {/* Tabs */}
                <div className="flex items-center border-b border-neutral-800">
                    <button
                        onClick={() => setAssistantTab('rhymes')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${assistantTab === 'rhymes' ? 'text-primary bg-primary/5 border-b-2 border-primary' : 'text-neutral-500 hover:text-white'}`}
                    >
                        <Brain size={14} /> Rhymz
                    </button>
                    <button
                        onClick={() => setAssistantTab('chat')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${assistantTab === 'chat' ? 'text-primary bg-primary/5 border-b-2 border-primary' : 'text-neutral-500 hover:text-white'}`}
                    >
                        <Sparkles size={14} /> AI Chat
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative flex flex-col">

                    {/* RHYMES TAB */}
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
                                            {isAiRhymeLoading ? (
                                                <Sparkles size={20} className="animate-pulse text-primary" />
                                            ) : (
                                                <Mic size={20} className="opacity-50" />
                                            )}
                                        </div>
                                        <p className="text-xs text-center px-4 leading-relaxed">
                                            {isAiRhymeLoading ? 'Analysing rhymes...' : 'Type or select a word to see rhymes.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* CHAT TAB */}
                    {assistantTab === 'chat' && (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                                {aiResponse ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-2">
                                        <div className="p-3 bg-neutral-900/50 border border-primary/20 rounded-xl mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1 bg-primary/10 rounded text-primary"><Sparkles size={12} /></div>
                                                <span className="text-[10px] font-bold uppercase text-primary">Suggestion</span>
                                            </div>
                                            <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={insertAiResponse} className="flex-1 py-2 bg-primary text-black text-xs font-bold rounded-lg hover:bg-primary/90">Insert</button>
                                            <button onClick={() => setAiResponse(null)} className="flex-1 py-2 bg-white/5 text-white text-xs font-bold rounded-lg hover:bg-white/10">Discard</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-neutral-600 opacity-50">
                                        <Brain size={32} className="mb-2" />
                                        <p className="text-xs text-center">Ask for ideas, synonyms, or help with a block.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-neutral-800 bg-neutral-900/10">
                                <div className="relative">
                                    <textarea
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAiSubmit();
                                            }
                                        }}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-3 pr-10 py-3 text-sm text-white focus:outline-none focus:border-primary/50 min-h-[50px] max-h-[120px] resize-none scrollbar-hide"
                                        placeholder="Ask AI..."
                                        disabled={aiLoading}
                                    />
                                    <button
                                        onClick={handleAiSubmit}
                                        disabled={aiLoading || !aiPrompt.trim()}
                                        className="absolute right-2 bottom-2 p-1.5 bg-primary text-black rounded-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                                    >
                                        {aiLoading ? <Sparkles size={14} className="animate-spin" /> : <Send size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
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
                            accept="audio/*"
                            className="hidden"
                        />
                        <Paperclip size={24} className="mb-2" />
                        <span className="text-xs font-bold">Upload New File</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`
            w-full max-w-[1600px] mx-auto animate-in fade-in duration-500 flex flex-col overflow-hidden
            fixed inset-x-0 bottom-0 top-16 z-30 bg-[#050505] lg:relative lg:z-30 lg:top-0 lg:h-[calc(100vh_-_8rem)] lg:pt-4 lg:px-8 lg:bg-transparent
        `}>
            {/* Header - Desktop Only */}
            <div className={`
                hidden lg:flex items-end justify-between transition-all duration-500 ease-in-out shrink-0
                ${activeNote ? 'lg:max-h-40 lg:opacity-100 lg:mb-6 lg:pointer-events-auto' : 'max-h-40 opacity-100 mb-6'}
            `}>
                <div>
                    <h1 className="text-3xl font-black text-white mb-1">Notes & Lyrics</h1>
                    <p className="text-neutral-500 text-sm">Write lyrics, capture ideas, and organize your musical thoughts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCreateNote}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2"
                    >
                        <Plus size={14} /> <span className="hidden sm:inline">Write Note</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex bg-[#0a0a0a] lg:border border-neutral-800 lg:rounded-xl overflow-hidden shadow-none lg:shadow-2xl relative">
                {/* Sidebar */}
                <div className={`
                    absolute inset-0 z-[60] w-full lg:w-64 lg:static lg:border-r border-neutral-800 flex flex-col bg-black lg:bg-[#080808] transition-transform duration-300
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0
                `}>
                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between shrink-0">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <FileText size={14} className="text-primary" />
                            My Notebook
                        </h3>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCreateNote}
                                className="lg:hidden text-neutral-400 hover:text-white transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-neutral-500 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="px-4 mb-4 shrink-0">
                        <div className="relative mt-4">
                            <input className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 pl-8" placeholder="Search notes..." />
                            <FileText size={12} className="absolute left-2.5 top-2.5 text-neutral-500" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
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

                                <button
                                    onClick={(e) => handleDeleteNote(e, note.id)}
                                    className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-500"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col bg-[#050505] relative w-full overflow-hidden">
                    {activeNote ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Desktop Controls (Hidden on Mobile) */}
                            <div className="hidden lg:flex h-14 border-b border-neutral-800 items-center justify-between px-6 bg-neutral-900/30 z-20 shrink-0">
                                <div className="flex items-center gap-4">
                                    {viewMode === 'browser' && (
                                        <button onClick={() => setViewMode('editor')} className="p-1.5 hover:bg-white/5 rounded"><ChevronLeft size={16} /></button>
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
                                            <span className="hidden sm:inline">Rhymes</span>
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

                            {/* Desktop AI Assistant Panel Removed (Moved to Sidebar) */}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 p-8 text-center">
                            <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mb-4">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">No Note Selected</h3>
                            <p className="text-sm max-w-xs mb-6">Select a note from the sidebar or create a new one to start writing.</p>
                            <button
                                onClick={handleCreateNote}
                                className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform"
                            >
                                Create New Note
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
        </div>
    );
};

export default NotesPage;
