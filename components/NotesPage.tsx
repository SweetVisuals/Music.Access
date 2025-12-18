```
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
    Menu
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

// MOCK_AUDIO_FILES removed in favor of real storage


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
            return `long_${ vowel } `;
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
        return `${ vowels }_${ coda } `;
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

    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [cursorIndex, setCursorIndex] = useState(0);

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
            // Auto attach? Maybe. For now just list it.
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
        // We look at the difference to see if the last char added was a newline or punctuation space
        const lastChar = newContent.slice(-1);
        const prevLastChar = activeNote?.content.slice(-1) || '';
        
        // Trigger if user typed newline or space after punctuation
        if ((lastChar === '\n' && prevLastChar !== '\n') || (lastChar === ' ' && /[.?!,]/.test(prevLastChar))) {
             // Extract last meaningful word
             const words = newContent.trim().split(/\s+/);
             const lastWord = words[words.length - 1]?.replace(/[^a-zA-Z]/g, '');
             
             if (lastWord && lastWord.length > 2) {
                 setIsAiRhymeLoading(true);
                 getRhymesForWord(lastWord).then(rhymes => {
                     setAiRhymes(rhymes);
                     setIsAiRhymeLoading(false);
                 }).catch(() => setIsAiRhymeLoading(false));
             }
        } else if (newContent.length < (activeNote?.content.length || 0)) {
            // If deleting, maybe clear rhymes if we deleted the target word? 
            // For now, keep them until new trigger for stability.
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
        if (aiRhymes.length > 0 && word === currentWord) return aiRhymes; // Use AI rhymes if they match current context roughly
        // Actually, let's prioritize AI rhymes if they exist and are recent. 
        // Simple heuristic: If we have AI rhymes, show them. If not, fallback.
        if (aiRhymes.length > 0) return aiRhymes;

        if (!word || word.length < 2) return [];
        const lowerWord = word.toLowerCase();

        // Fallback to static list for suggestions sidebar
        for (const suffix in MOCK_RHYMES) {
            if (lowerWord.endsWith(suffix)) {
                return MOCK_RHYMES[suffix];
            }
        }
        return [];
    };

    const suggestions = aiRhymes.length > 0 ? aiRhymes : getRhymeSuggestions(currentWord);

    // --- Rendering Highlighting ---
    const renderHighlightedText = (text: string) => {
        if (!text) return null;

        // Split text by delimiters but capture them to reconstruct text exactly
        const tokens = text.split(/([^a-zA-Z0-9_']+)/);

        return tokens.map((token, i) => {
            const lower = token.toLowerCase();
            // Default to transparent so only the underlying textarea is visible
            let colorClass = 'text-transparent'; 

            if (rhymeMode) {
                const group = wordToGroup[lower];
                if (group && groupToColor[group]) {
                    colorClass = groupToColor[group];
                } else {
                     // If rhyme mode is on but no match, keep it transparent to show textarea text
                     // OR if we want to dim non-matches, we could use a low opacity.
                     // But for perfect sync, transparent is safest.
                     colorClass = 'text-transparent';
                }
            }

            return <span key={i} className={`${ colorClass } transition - colors duration - 300`}>{token}</span>;
        });
    };

    return (
    return (
        <div className="w-full h-[100dvh] lg:h-[calc(100vh_-_8rem)] max-w-[1600px] mx-auto pt-16 lg:pt-4 lg:px-8 animate-in fade-in duration-500 flex flex-col overflow-hidden bg-[#0a0a0a] lg:bg-transparent">
            {/* Mobile Header Removed - Using Global TopBar */}

            <div className={`
                hidden lg:flex items-end justify-between transition-all duration-500 ease-in-out overflow-hidden
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

            <div className="flex-1 flex bg-[#0a0a0a] lg:border-t lg:border-b border-neutral-800 lg:border lg:rounded-xl overflow-hidden shadow-none lg:shadow-2xl relative">

                {/* Sidebar List - The "Blue" List */}
                {/* Sidebar List - The "Blue" List */}
                <div className={`
                absolute inset-y-0 left-0 z-30 w-64 border-r border-neutral-800 flex flex-col bg-[#080808] transition-transform duration-300
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:relative lg:translate-x-0
                `}>
                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
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
                    <div className="px-4 mb-4">
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
                                    ${
                                        activeNoteId === note.id
                                            ? 'bg-primary/10 border-primary/20'
                                            : 'border-transparent hover:bg-white/5'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className={`text - sm font - bold truncate pr - 4 ${ activeNoteId === note.id ? 'text-primary' : 'text-neutral-300' } `}>{note.title}</h4>
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

                {/* Overlay for mobile sidebar */}
                {isSidebarOpen && (
                    <div
                        className="absolute inset-0 bg-black/80 z-20 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                )}

                {/* Main Area - Switches between Editor and File Browser */}
                <div className="flex-1 flex flex-col bg-[#050505] relative">
                    {activeNote ? (
                        <>
                            {/* Editor Toolbar */}
                            <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 lg:px-6 bg-neutral-900/30 z-20 shrink-0">
                                <div className="flex items-center gap-2 lg:gap-4">
                                    {/* Mobile Notebook Toggle */}
                                    <button
                                        onClick={() => setIsSidebarOpen(true)}
                                        className="lg:hidden p-2 -ml-2 text-neutral-400 hover:text-white"
                                    >
                                        <Book size={18} />
                                    </button>

                                    {viewMode === 'browser' && (
                                        <button
                                            onClick={() => setViewMode('editor')}
                                            className="p-1.5 hover:bg-white/5 rounded text-neutral-400 hover:text-white mr-2"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                    )}
                                    <div className="flex flex-col justify-center min-w-0">
                                        <input
                                            value={activeNote.title}
                                            onChange={(e) => handleUpdateTitle(e.target.value)}
                                            className="bg-transparent border-none text-sm font-bold text-white focus:outline-none p-0 placeholder-neutral-600 truncate w-full"
                                            placeholder="Untitled Note"
                                        />
                                        <span className="text-[10px] text-neutral-500 font-mono hidden sm:block">
                                            {viewMode === 'editor' ? 'Editing Mode' : 'Select Audio Attachment'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 lg:gap-3 hidden lg:flex">
                                    {viewMode === 'editor' && (
                                        <>
                                            {/* Rhyme Highlighting Toggle */}
                                            <button
                                                onClick={() => setRhymeMode(!rhymeMode)}
                                                className={`
                                                    flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all
                                                    ${
                                                        rhymeMode
                                                            ? 'bg-primary text-black shadow-[0_0_15px_rgba(var(--primary),0.3)]'
                                                            : 'text-neutral-500 hover:text-white hover:bg-white/5 border border-white/5'
                                                    }
                                                `}
                                            >
                                                <Highlighter size={12} />
                                                <span className="hidden sm:inline">Rhymes {rhymeMode ? 'ON' : 'OFF'}</span>
                                            </button>

                                            <div className="w-px h-4 bg-neutral-800 hidden sm:block"></div>
                                        </>
                                    )}

                                    <button
                                        onClick={() => setViewMode(viewMode === 'editor' ? 'browser' : 'editor')}
                                        onClick={() => setViewMode(viewMode === 'editor' ? 'browser' : 'editor')}
                                        className={`
                                            flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wide transition-all border
                                            ${
                                                viewMode === 'browser'
        ? 'bg-white text-black border-white'
        : 'bg-transparent border-neutral-700 text-neutral-400 hover:text-white hover:border-white'
}
`}
                                    >
                                        {viewMode === 'editor' ? (
                                            <>
                                                <FolderOpen size={12} /> <span className="hidden sm:inline">Attach</span>
                                            </>
                                        ) : (
                                            <>
                                                <FileText size={12} /> <span className="hidden sm:inline">Editor</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Content Switcher */}
                            {viewMode === 'editor' ? (
                                <div className="flex-1 flex overflow-hidden relative">
                                    <div className="flex-1 flex flex-col relative">
                                        {/* Embedded Audio Player */}
                                        {activeNote.attachedAudio && (
                                            <div className="h-12 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4 lg:px-6 shrink-0">
                                                {/* Hidden Audio Element for actual playback */}
                                                {audioPlaying && (
                                                    <audio
                                                        src={audioFiles.find(f => f.name === activeNote.attachedAudio)?.url}
                                                        autoPlay
                                                        onEnded={() => setAudioPlaying(false)}
                                                        onError={(e) => console.log('Audio error', e)}
                                                    />
                                                )}

                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center text-primary shrink-0">
                                                        <Music size={14} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-white truncate">{activeNote.attachedAudio}</div>
                                                        <div className="text-[9px] text-primary font-mono uppercase">Attached Track</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0">
                                                    <button
                                                        onClick={() => setAudioPlaying(!audioPlaying)}
                                                        className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                                                    >
                                                        {audioPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" className="ml-0.5" />}
                                                    </button>
                                                    <div className="w-px h-4 bg-neutral-800"></div>
                                                    <button onClick={handleDetachFile} className="text-neutral-500 hover:text-red-500">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Text Editor Area - Grid Layout for Perfect Highlighting Sync */}
                                        <div className="flex-1 relative font-mono text-xs lg:text-sm leading-relaxed overflow-y-auto custom-scrollbar">
                                            <div className="grid grid-cols-1 grid-rows-1 min-h-full">
                                                
                                            {/* Scrollable Container - The ONE source of truth for scrolling */}
                                            <div className="grid grid-cols-1 grid-rows-1 w-full h-full overflow-y-auto relative no-scrollbar">
                                                
                                                {/* Layer 1: Backdrop (Defines Height, Renders Highlights) */}
                                                <div
                                                    ref={backdropRef}
                                                    className="col-start-1 row-start-1 p-5 lg:p-8 whitespace-pre-wrap break-words overflow-visible pointer-events-none z-0 font-mono text-base lg:text-sm leading-relaxed"
                                                    style={{ color: 'transparent' }} // Extra safety
                                                >
                                                    {renderHighlightedText(activeNote.content + ' ')}
                                                </div>

                                                {/* Layer 2: Input (Captured events, transparent text/bg) */}
                                                <textarea
                                                    ref={textareaRef}
                                                    className={`
col - start - 1 row - start - 1 w - full h - full bg - transparent p - 5 lg: p - 8 resize - none overflow - hidden focus: outline - none z - 10 font - mono text - base lg: text - sm leading - relaxed whitespace - pre - wrap break-words
                                                        ${ rhymeMode ? 'text-transparent caret-white' : 'text-neutral-300 caret-white' }
`}
                                                    value={activeNote.content} onChange={(e) => {
                                                        handleUpdateContentWrapper(e.target.value);
                                                        handleSelectionChange(e);
                                                    }}
                                                    onSelect={handleSelectionChange}
                                                    placeholder="Start writing your lyrics or production notes here..."
                                                    spellCheck={false}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Rhyme Suggestions Sidebar - Hidden on Mobile */}
                                    <div className="hidden lg:flex w-60 bg-[#080808] border-l border-neutral-800 flex-col z-20">
                                        <div className="p-4 border-b border-neutral-800 bg-neutral-900/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                                    <Brain size={12} className="text-primary" /> Rhyme Assist
                                                </h3>
                                                <button
                                                    onClick={() => setAccent(accent === 'US' ? 'UK' : 'US')}
                                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-[9px] font-bold text-neutral-400 hover:text-white"
                                                    title="Toggle Accent"
                                                >
                                                    <Globe size={10} /> {accent}
                                                </button>
                                            </div>
                                            <div className="text-[10px] text-neutral-500">
                                                Context: <span className="text-primary font-mono">"{currentWord}"</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-2">
                                            {currentWord && suggestions.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {suggestions.map((word, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-300 hover:text-white hover:border-primary/30 hover:bg-white/5 cursor-pointer transition-colors"
                                                            onClick={() => {
                                                                const newContent = activeNote.content + " " + word;
                                                                handleUpdateContent(newContent);
                                                            }}
                                                        >
                                                            {word}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-neutral-600 space-y-2">
                                                    <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center">
                                                        {isAiRhymeLoading ? (
                                                            <Sparkles size={16} className="animate-pulse text-primary" />
                                                        ) : (
                                                            <Mic size={16} className="opacity-50" />
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-center px-4">
                                                        {isAiRhymeLoading ? 'Finding rhymes...' : `Type a line and hit Enter to get AI rhymes.`}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // File Browser View
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
p - 4 rounded - xl border bg - neutral - 900 / 50 cursor - pointer transition - all group
                                                    ${
    activeNote.attachedAudio === file.name
        ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.15)]'
        : 'border-white/5 hover:border-white/20 hover:bg-white/5'
}
`}
                                                >
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="p-3 bg-black/50 rounded-lg text-neutral-400 group-hover:text-white">
                                                            <Music size={20} />
                                                        </div>
                                                        {activeNote.attachedAudio === file.name && (
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
                            )}

                            {/* Bottom AI Assistant Panel */}
                            <div className="p-4 bg-[#080808] border-t border-neutral-800 z-20">
                                {aiResponse && (
                                    <div className="mb-4 p-4 bg-neutral-900/80 border border-primary/20 rounded-lg relative animate-in slide-in-from-bottom-2 max-h-60 overflow-y-auto custom-scrollbar">
                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 bg-primary/10 rounded text-primary mt-1">
                                                <Sparkles size={14} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-xs font-bold text-white mb-1">AI Suggestion</h4>
                                                <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                                            </div>
                                            <button onClick={() => setAiResponse(null)} className="text-neutral-500 hover:text-white"><X size={14} /></button>
                                        </div>
                                        <div className="flex justify-end mt-3 gap-2">
                                            <button onClick={() => setAiResponse(null)} className="text-[10px] font-bold text-neutral-500 hover:text-white px-3 py-1.5">Discard</button>
                                            <button onClick={insertAiResponse} className="text-[10px] font-bold bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded border border-white/5">Insert to Note</button>
                                        </div>
                                    </div>
                                )}

                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Sparkles size={14} className={`text - primary ${ aiLoading ? 'animate-pulse' : '' } `} />
                                    </div>
                                    <input
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-12 py-3 text-xs text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder-neutral-500 transition-all font-mono"
                                        placeholder="Ask AI for advice, ideas, structure..."
                                        disabled={aiLoading}
                                    />
                                    <button
                                        onClick={handleAiSubmit}
                                        disabled={aiLoading || !aiPrompt.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={12} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 bg-dot-grid">
                            <div className="w-16 h-16 bg-neutral-900 rounded-2xl border border-neutral-800 flex items-center justify-center mb-4 shadow-xl rotate-3">
                                <FileText size={32} className="opacity-50" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">Select a Note</h3>
                            <p className="text-xs">Choose a note from the sidebar or create a new one.</p>
                            <button onClick={() => setIsSidebarOpen(true)} className="mt-6 lg:hidden px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-bold">
                                Open Notebook
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Bottom Toolbar - Only visible when active note exists and on mobile */}
            {activeNote && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#080808] border-t border-neutral-800 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-around z-40">
                    <button
                        onClick={() => setRhymeMode(!rhymeMode)}
                        className={`flex flex - col items - center gap - 1 ${ rhymeMode ? 'text-primary' : 'text-neutral-500' } `}
                    >
                        <Highlighter size={20} />
                        <span className="text-[9px] font-bold">Rhymes</span>
                    </button>

                    <button
                        onClick={() => setViewMode(viewMode === 'editor' ? 'browser' : 'editor')}
                        className={`flex flex - col items - center gap - 1 ${ viewMode === 'browser' ? 'text-white' : 'text-neutral-500' } `}
                    >
                        {viewMode === 'editor' ? <FolderOpen size={20} /> : <FileText size={20} />}
                        <span className="text-[9px] font-bold">{viewMode === 'editor' ? 'Attach' : 'Editor'}</span>
                    </button>

                    <button
                        onClick={() => {
                            if (activeNote) {
                                navigator.clipboard.writeText(activeNote.content);
                            }
                        }}
                        className="flex flex-col items-center gap-1 text-neutral-500 active:text-white"
                    >
                        <span className="text-[9px] font-bold">Copy</span>
                    </button>
                </div>
            )}

            {/* Mobile Floating Action Button (FAB) for New Note - Position changed to be above toolbar if toolbar exists */}
            {/* FAB - Hidden on Mobile since we have header button, kept for desktop if needed or just hidden entirely on mobile as per new design */}
            {/* FAB - Visible on Mobile */}
            <button onClick={handleCreateNote} className={`lg:hidden fixed right - 6 w - 14 h - 14 bg - primary text - black rounded - full shadow - lg shadow - primary / 20 flex items - center justify - center transition - all duration - 300 hover: scale - 110 hover: shadow - primary / 40 z - 50
                ${ activeNote ? 'bottom-[5.5rem]' : 'bottom-6' }
`}>
                <Plus size={28} strokeWidth={2.5} />
            </button>
        </div>
    );
};

export default NotesPage;
