import React, { useState, useEffect } from 'react';
import { X, Upload, Music, Plus, Trash2, FileText, DollarSign, Check, FileAudio, Folder, LayoutTemplate, Box, FileSignature, Type, Lock, Globe, Archive } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import CustomInput from './CustomInput';
import { Project, Track, LicenseInfo } from '../types';
import { MOCK_CONTRACTS } from '../constants';
import { createProject, updateProject, getUserFiles } from '../services/supabaseService';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (project: Partial<Project>) => void;
    initialData?: Project; // Support editing
}

const GENRE_LIST = [
    "Trap", "Boom Bap", "R&B", "Drill", "Lofi", "Afrobeat", "Synthwave",
    "Pop", "Electronic", "Rock", "Jazz", "Soul", "Reggaeton", "Dancehall", "House"
];

const SUB_GENRES = [
    "Dark", "Melodic", "Hard", "Chill", "Guitar", "Piano", "Experimental", "Old School", "New Wave", "Ambient",
    "Cinematic", "Soulful", "Aggressive", "Upbeat", "Sad", "Romantic", "Groovy", "Minimal"
];

// Helper to format file size
const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [step, setStep] = useState(1);

    const [selectedGenres, setSelectedGenres] = useState<string[]>(
        initialData ? (initialData.genre ? [initialData.genre] : []) : []
    );
    const [selectedSubGenres, setSelectedSubGenres] = useState<string[]>(
        initialData ? (initialData.subGenre ? [initialData.subGenre] : []) : []
    );
    const [showAllGenres, setShowAllGenres] = useState(false);
    const [showAllSubGenres, setShowAllSubGenres] = useState(false);

    const [projectData, setProjectData] = useState<Partial<Project>>({
        title: initialData?.title || '',
        description: initialData?.description || '',
        type: initialData?.type || 'beat_tape',
        status: initialData?.status || 'published',
        tags: initialData?.tags || [],
        genre: initialData?.genre || '',
        subGenre: initialData?.subGenre || '',
        tracks: initialData?.tracks || [],
        bpm: initialData?.bpm || '',
        licenses: initialData?.licenses?.map(l => ({
            ...l,
            fileTypesIncluded: l.fileTypesIncluded || [],
            features: l.features || []
        })) || [
                { id: 'l1', type: 'MP3', name: 'Basic Lease', price: 29.99, features: ['MP3 File', '2,000 Streams', 'Non-Profit Use'], fileTypesIncluded: ['MP3'] },
                { id: 'l2', type: 'WAV', name: 'Premium Lease', price: 49.99, features: ['WAV + MP3', '50,000 Streams', 'Commercial Use'], fileTypesIncluded: ['WAV', 'MP3'] },
                { id: 'l3', type: 'STEMS', name: 'Unlimited License', price: 199.99, features: ['All Stems', 'Unlimited Streams', 'Full Ownership Transfer'], fileTypesIncluded: ['STEMS', 'WAV', 'MP3'] }
            ]
    });

    // BPM Range State
    const [minBpm, setMinBpm] = useState<string>('');
    const [maxBpm, setMaxBpm] = useState<string>('');

    // Initialize BPM state from string (e.g. "120-140") or number
    useEffect(() => {
        if (initialData?.bpm) {
            const bpmStr = String(initialData.bpm);
            if (bpmStr.includes('-')) {
                const [min, max] = bpmStr.split('-');
                setMinBpm(min.trim());
                setMaxBpm(max.trim());
            } else {
                setMinBpm(bpmStr);
                setMaxBpm(bpmStr);
            }
        }
    }, [initialData]);

    const [tracks, setTracks] = useState<Partial<Track>[]>(
        initialData?.tracks?.map(t => ({
            ...t,
            files: t.files || {} // Maintain existing file structure
        })) || []
    );
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
    const [fileSelectorOpen, setFileSelectorOpen] = useState<'mp3' | 'wav' | 'stems' | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // File Selection State
    const [userFiles, setUserFiles] = useState<any[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);

    // Fetch files when selector opens
    React.useEffect(() => {
        if (fileSelectorOpen) {
            const fetchFiles = async () => {
                setIsLoadingFiles(true);
                try {
                    const dbFiles = await getUserFiles();
                    // map to format needed
                    const mapped = dbFiles.map((f: any) => ({
                        id: f.id,
                        name: f.name,
                        type: (f.type?.includes('audio') || f.name.endsWith('.mp3') || f.name.endsWith('.wav')) ? (f.name.endsWith('.wav') ? 'WAV' : 'MP3') : (f.name.endsWith('.zip') ? 'ZIP' : 'FILE'),
                        size: f.size ? f.size : 'Unknown', // formatFileSize(f.size) if size is number
                        original: f
                    }));
                    setUserFiles(mapped);
                } catch (e) {
                    console.error("Failed to fetch user files", e);
                } finally {
                    setIsLoadingFiles(false);
                }
            };
            fetchFiles();
        }
    }, [fileSelectorOpen]);

    const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && e.currentTarget.value) {
            e.preventDefault();
            const newTag = e.currentTarget.value.replace(/,/g, '').trim();
            if (newTag && projectData.tags && projectData.tags.length < 5 && !projectData.tags.includes(newTag)) {
                setProjectData(prev => ({ ...prev, tags: [...(prev.tags || []), newTag] }));
                e.currentTarget.value = '';
            }
        }
    };

    const removeTag = (tag: string) => {
        setProjectData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }));
    };

    const toggleGenre = (g: string) => {
        if (selectedGenres.includes(g)) {
            setSelectedGenres(prev => prev.filter(i => i !== g));
        } else {
            if (selectedGenres.length < 3) {
                setSelectedGenres(prev => [...prev, g]);
            }
        }
    };

    const toggleSubGenre = (g: string) => {
        if (selectedSubGenres.includes(g)) {
            setSelectedSubGenres(prev => prev.filter(i => i !== g));
        } else {
            if (selectedSubGenres.length < 3) {
                setSelectedSubGenres(prev => [...prev, g]);
            }
        }
    };

    const addTrack = () => {
        setTracks([...tracks, { id: `new_${Date.now()} `, title: 'Untitled Track', duration: 0, files: {} }]);
    };

    const updateTrack = (index: number, field: string, value: any) => {
        const newTracks = [...tracks];
        newTracks[index] = { ...newTracks[index], [field]: value };
        setTracks(newTracks);
    };

    const openFileSelector = (index: number, type: 'mp3' | 'wav' | 'stems') => {
        setCurrentTrackIndex(index);
        setFileSelectorOpen(type);
    };

    const selectFile = (fileId: string) => {
        if (currentTrackIndex !== null && fileSelectorOpen) {
            const newTracks = [...tracks];
            const track = newTracks[currentTrackIndex];
            if (!track.files) track.files = {};
            track.files[fileSelectorOpen] = fileId;

            if (Object.keys(track.files).length === 1) {
                track.title = userFiles.find(f => f.id === fileId)?.name.split('.')[0] || track.title;
                track.duration = 180;
            }

            setTracks(newTracks);
            setFileSelectorOpen(null);
            setCurrentTrackIndex(null);
        }
    };

    const updateLicense = (index: number, field: keyof LicenseInfo, value: any) => {
        const newLicenses = [...(projectData.licenses || [])];
        newLicenses[index] = { ...newLicenses[index], [field]: value };
        setProjectData({ ...projectData, licenses: newLicenses });
    };

    const handleFinalSave = async () => {
        setIsSaving(true);
        const finalTags = Array.from(new Set([
            ...(projectData.tags || []),
            ...selectedGenres,
            ...selectedSubGenres
        ]));

        // Format BPM
        let finalBpm = '0';
        if (minBpm && maxBpm) {
            finalBpm = minBpm === maxBpm ? minBpm : `${minBpm}-${maxBpm}`;
        } else if (minBpm) {
            finalBpm = minBpm;
        } else if (maxBpm) {
            finalBpm = maxBpm;
        }

        const finalProject = {
            ...projectData,
            tracks: tracks as Track[],
            genre: selectedGenres[0] || 'Unknown',
            subGenre: selectedSubGenres[0] || '',
            tags: finalTags,
            bpm: finalBpm,
            key: '' // Key removed per request, sending empty string or could be removed if API allows
        };

        // Enforce license names
        if (finalProject.licenses) {
            finalProject.licenses = finalProject.licenses.map(l => ({
                ...l,
                name: l.name || `${l.type} Lease`
            }));
        }

        try {
            if (initialData && initialData.id) {
                await updateProject(initialData.id, finalProject);
            } else {
                await createProject(finalProject);
            }
            onSave(finalProject);
            onClose();
        } catch (error) {
            console.error(initialData ? "Failed to update project" : "Failed to create project:", error);
            // Ideally show an error message to the user
            setIsSaving(false);
        }
    };

    const [isClosing, setIsClosing] = useState(false);
    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
        } else if (shouldRender) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
            }, 450);
            return () => clearTimeout(timer);
        }
    }, [isOpen, shouldRender]);

    const handleInternalClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 450);
    };

    if (!shouldRender) return null;

    return (
        <div className={`fixed top-[56px] bottom-0 right-0 left-0 lg:left-[260px] z-[150] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/40 -z-10" />
            <div className={`w-full h-full bg-[#0a0a0a] border-0 flex flex-col shadow-2xl overflow-hidden relative ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

                <div className="h-14 md:h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-neutral-900/50 shrink-0">
                    <h2 className="text-base md:text-lg font-bold text-white">Create New Project</h2>
                    <button onClick={handleInternalClose} className="p-2 hover:bg-white/5 rounded-full text-neutral-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-4 md:px-8 pt-6 pb-2 shrink-0">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-neutral-800 -z-10"></div>
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border transition-all ${step === s ? 'bg-primary text-black border-primary font-bold' : step > s ? 'bg-green-500 text-black border-green-500' : 'bg-neutral-900 text-neutral-500 border-white/10'}`}
                            >
                                <span className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-black/20 text-[10px] md:text-xs">{step > s ? <Check size={12} md:size={14} /> : s}</span>
                                <span className="text-[10px] md:text-xs uppercase tracking-wider hidden md:inline">{s === 1 ? 'Details' : s === 2 ? 'Content' : 'Pricing'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    {step === 1 && (
                        <div className="space-y-5 md:space-y-8 max-w-3xl mx-auto">
                            <div className="space-y-4">
                                <CustomInput
                                    label="Title"
                                    value={projectData.title}
                                    onChange={(e) => setProjectData({ ...projectData, title: e.target.value })}
                                    placeholder="Project Title"
                                    icon={<Type size={16} />}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomDropdown
                                        label="Type"
                                        value={projectData.type || ''}
                                        onChange={(val) => setProjectData({ ...projectData, type: val as any })}
                                        options={[
                                            { value: 'beat_tape', label: 'Beat Tape / Project', icon: <LayoutTemplate size={14} />, description: 'A collection of beats or songs' },
                                            { value: 'sound_pack', label: 'Sound Pack / Kit', icon: <Box size={14} />, description: 'Drums, loops, or presets' }
                                        ]}
                                    />

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">BPM Range</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <CustomInput
                                                type="number"
                                                value={minBpm}
                                                onChange={(e) => setMinBpm(e.target.value)}
                                                placeholder="Min"
                                                className="text-center"
                                            />
                                            <CustomInput
                                                type="number"
                                                value={maxBpm}
                                                onChange={(e) => setMaxBpm(e.target.value)}
                                                placeholder="Max"
                                                className="text-center"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-400 uppercase">Description</label>
                                    <textarea
                                        value={projectData.description}
                                        onChange={(e) => {
                                            setProjectData({ ...projectData, description: e.target.value });
                                            e.target.style.height = 'auto';
                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 300)}px`;
                                        }}
                                        className="w-full min-h-[96px] md:min-h-[128px] h-auto bg-neutral-900 border border-white/10 rounded-lg px-4 py-2.5 md:py-3 text-white text-base md:text-sm focus:border-primary/50 focus:outline-none resize-none custom-scrollbar"
                                        placeholder="Tell us about this project..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-neutral-400 uppercase">Genre (Max 3)</label>
                                            <span className="text-[10px] text-primary">{selectedGenres.length}/3</span>
                                        </div>
                                        <div className={`flex flex-wrap gap-2 p-2 border border-white/10 rounded-lg bg-neutral-900 overflow-hidden transition-all ${showAllGenres ? 'max-h-[500px]' : 'max-h-[82px]'}`}>
                                            {GENRE_LIST.map(g => (
                                                <button
                                                    key={g}
                                                    onClick={() => toggleGenre(g)}
                                                    className={`px-3 py-1 rounded text-xs border transition-all ${selectedGenres.includes(g) ? 'bg-primary text-black border-primary font-bold shadow-[0_0_10px_rgba(var(--primary),0.3)]' : 'border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500'}`}
                                                >
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setShowAllGenres(!showAllGenres)}
                                            className="text-[10px] uppercase font-bold text-neutral-500 hover:text-white w-full text-center py-1 mt-1 border-t border-transparent hover:border-white/10"
                                        >
                                            {showAllGenres ? 'Show Less' : 'Show More'}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-neutral-400 uppercase">Sub-Genre (Max 3)</label>
                                            <span className="text-[10px] text-primary">{selectedSubGenres.length}/3</span>
                                        </div>
                                        <div className={`flex flex-wrap gap-2 p-2 border border-white/10 rounded-lg bg-neutral-900 overflow-hidden transition-all ${showAllSubGenres ? 'max-h-[500px]' : 'max-h-[82px]'}`}>
                                            {SUB_GENRES.map(g => (
                                                <button
                                                    key={g}
                                                    onClick={() => toggleSubGenre(g)}
                                                    className={`px-3 py-1 rounded text-xs border transition-all ${selectedSubGenres.includes(g) ? 'bg-white text-black border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500'}`}
                                                >
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setShowAllSubGenres(!showAllSubGenres)}
                                            className="text-[10px] uppercase font-bold text-neutral-500 hover:text-white w-full text-center py-1 mt-1 border-t border-transparent hover:border-white/10"
                                        >
                                            {showAllSubGenres ? 'Show Less' : 'Show More'}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-400 uppercase">Additional Tags (Max 5)</label>
                                    <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-900 border border-white/10 rounded-lg min-h-[50px]">
                                        {projectData.tags?.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-neutral-800 rounded flex items-center gap-1 text-xs text-white border border-neutral-700">
                                                #tag <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={10} /></button>
                                            </span>
                                        ))}
                                        {(!projectData.tags || projectData.tags.length < 5) && (
                                            <input
                                                onKeyDown={handleTagInput}
                                                className="bg-transparent text-xs text-white focus:outline-none min-w-[100px] p-1"
                                                placeholder="Type and press enter..."
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">Project Tracks</h3>
                                <button onClick={addTrack} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white">
                                    <Plus size={14} /> Add Track
                                </button>
                            </div>

                            <div className="space-y-3">
                                {tracks.map((track, idx) => (
                                    <div key={idx} className="bg-neutral-900/50 border border-white/10 rounded-xl p-4 animate-in slide-in-from-bottom-2">
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center text-sm font-mono font-bold text-neutral-500">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="flex gap-4">
                                                    <input
                                                        value={track.title}
                                                        onChange={(e) => updateTrack(idx, 'title', e.target.value)}
                                                        className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-white text-base md:text-sm focus:border-primary/50 focus:outline-none"
                                                        placeholder="Track Title"
                                                    />
                                                    <button onClick={() => { const nt = [...tracks]; nt.splice(idx, 1); setTracks(nt); }} className="p-2 text-neutral-500 hover:text-red-500">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                                                    {['mp3', 'wav', 'stems'].map((type: any) => (
                                                        <div
                                                            key={type}
                                                            onClick={() => openFileSelector(idx, type)}
                                                            className={`
                                                                border border-dashed rounded-lg p-3 flex items-center justify-between cursor-pointer transition-colors
                                                                ${track.files?.[type as 'mp3' | 'wav' | 'stems']
                                                                    ? 'border-green-500/30 bg-green-500/5'
                                                                    : 'border-neutral-700 hover:border-neutral-500 hover:bg-white/5'
                                                                }
`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                {track.files?.[type as 'mp3' | 'wav' | 'stems'] ? <Check size={14} className="text-green-500" /> : <Upload size={14} className="text-neutral-500" />}
                                                                <span className="text-xs font-bold uppercase text-neutral-400">{type}</span>
                                                            </div>
                                                            {track.files?.[type as 'mp3' | 'wav' | 'stems'] && (
                                                                <span className="text-[9px] font-mono text-neutral-500 truncate max-w-[80px]">
                                                                    {userFiles.find(f => f.id === track.files?.[type as 'mp3' | 'wav' | 'stems'])?.name || 'Unknown File'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {tracks.length === 0 && (
                                    <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl text-neutral-500">
                                        <Music size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No tracks added. Click "Add Track" to begin.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8">
                            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
                                <FileText size={16} className="text-blue-400 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-blue-400">Global Project Licenses</h4>
                                    <p className="text-xs text-blue-200/70 mt-1">These licenses will apply to all tracks in this project. Customers can select which file version they want to purchase.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {projectData.licenses?.map((license, idx) => (
                                    <div key={license.id} className="bg-neutral-900/40 border border-white/10 rounded-xl flex flex-col">
                                        <div className="p-4 md:p-6 border-t border-white/10 bg-neutral-900/30 flex justify-between items-center shrink-0 rounded-t-xl">
                                            <span className="text-xs font-bold uppercase text-neutral-400">{license.type} Lease</span>
                                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                                        </div>
                                        <div className="p-6 space-y-4 flex-1">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase">License Name</label>
                                                <input
                                                    value={license.name}
                                                    onChange={(e) => updateLicense(idx, 'name', e.target.value)}
                                                    className="w-full bg-black border border-white/10 rounded px-2 py-2 text-sm text-white focus:border-primary/50 focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-neutral-500 uppercase">Price</label>
                                                <div className="relative">
                                                    <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" />
                                                    <input
                                                        type="number"
                                                        value={license.price}
                                                        onChange={(e) => updateLicense(idx, 'price', parseFloat(e.target.value))}
                                                        className="w-full bg-black border border-white/10 rounded px-2 py-2 pl-8 text-lg font-mono font-bold text-white focus:border-primary/50 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <CustomDropdown
                                                label="Contract Template"
                                                value={license.contractId || ''}
                                                onChange={(val) => updateLicense(idx, 'contractId', val)}
                                                placeholder="Select Contract..."
                                                options={MOCK_CONTRACTS.map(c => ({
                                                    value: c.id,
                                                    label: c.title,
                                                    icon: <FileSignature size={14} className="text-primary" />
                                                }))}
                                                searchable
                                            />
                                            <div className="pt-2 border-t border-white/10">
                                                <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2">Included Files</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {license.fileTypesIncluded.map(ft => (
                                                        <span key={ft} className="px-1.5 py-0.5 bg-neutral-800 rounded text-[9px] text-neutral-300 border border-neutral-700">{ft}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-6 border-t border-white/10">
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Project Visibility</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { id: 'published', label: 'Public', icon: Globe, desc: 'Visible to everyone in the marketplace.' },
                                        { id: 'private', label: 'Private', icon: Lock, desc: 'Only visible to you. Not listed publicly.' },
                                        { id: 'draft', label: 'Draft', icon: Archive, desc: 'Save for later. Not finalized.' }
                                    ].map((option) => (
                                        <div
                                            key={option.id}
                                            onClick={() => setProjectData({ ...projectData, status: option.id as any })}
                                            className={`
                                                relative p-4 rounded-xl border cursor-pointer transition-all
                                                ${projectData.status === option.id
                                                    ? 'bg-primary border-primary text-black'
                                                    : 'bg-neutral-900/40 border-white/10 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-600'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <option.icon size={18} className={projectData.status === option.id ? 'text-black' : 'text-primary'} />
                                                <span className={`font-bold ${projectData.status === option.id ? 'text-black' : 'text-white'}`}>{option.label}</span>
                                            </div>
                                            <p className={`text-xs ${projectData.status === option.id ? 'text-black/70' : 'text-neutral-500'}`}>
                                                {option.desc}
                                            </p>
                                            {projectData.status === option.id && (
                                                <div className="absolute top-3 right-3">
                                                    <Check size={14} className="text-black" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-auto py-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 bg-neutral-900/50 gap-4 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <div className="text-xs text-neutral-500 hidden md:block">
                        {step === 3 && "Review details before publishing."}
                    </div>
                    <div className="flex flex-col-reverse md:flex-row w-full md:w-auto gap-4">
                        <button
                            onClick={handleInternalClose}
                            className="flex-1 md:flex-none px-6 py-3 md:py-2 rounded-lg font-bold text-xs text-neutral-500 hover:text-white bg-transparent justify-center md:justify-start"
                        >
                            Cancel
                        </button>
                        {step > 1 && (
                            <button onClick={() => setStep(s => s - 1)} className="flex-1 md:flex-none px-6 py-3 md:py-2 rounded-lg font-bold text-xs text-neutral-400 hover:text-white bg-white/5 md:bg-transparent justify-center md:justify-start">
                                Back
                            </button>
                        )}
                        {step < 3 ? (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                className="flex-1 md:flex-none px-8 py-3 bg-white text-black rounded-lg font-bold text-xs hover:bg-neutral-200 transition-colors justify-center"
                            >
                                Next Step
                            </button>
                        ) : (
                            <button
                                onClick={handleFinalSave}
                                className="flex-1 md:flex-none px-8 py-3 bg-primary text-black rounded-lg font-bold text-xs hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(var(--primary),0.3)] justify-center"
                            >
                                Publish Project
                            </button>
                        )}
                    </div>
                </div>

                {fileSelectorOpen && (
                    <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-8 animate-in fade-in duration-100">
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[500px]">
                            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                                <h3 className="text-sm font-bold text-white">Select {fileSelectorOpen.toUpperCase()} File</h3>
                                <button onClick={() => setFileSelectorOpen(null)}><X size={16} className="text-neutral-500 hover:text-white" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {isLoadingFiles ? (
                                    <div className="flex items-center justify-center h-40 text-neutral-500">
                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                                        Loading files...
                                    </div>
                                ) : userFiles.length === 0 ? (
                                    <div className="text-center py-8 text-neutral-500">
                                        <p>No files found.</p>
                                        <p className="text-xs mt-1">Upload files in the "Uploads" page first.</p>
                                    </div>
                                ) : (
                                    userFiles
                                        .filter(f => {
                                            if (fileSelectorOpen === 'mp3') return f.type === 'MP3' || f.name.toLowerCase().endsWith('.mp3');
                                            if (fileSelectorOpen === 'wav') return f.type === 'WAV' || f.name.toLowerCase().endsWith('.wav');
                                            if (fileSelectorOpen === 'stems') return f.type === 'ZIP' || f.name.toLowerCase().endsWith('.zip');
                                            return true;
                                        })
                                        .map(file => (
                                            <div
                                                key={file.id}
                                                onClick={() => selectFile(file.id)}
                                                className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer border border-transparent hover:border-white/10 group"
                                            >
                                                <div className="w-8 h-8 bg-neutral-900 rounded flex items-center justify-center text-neutral-500 group-hover:text-primary">
                                                    {file.type === 'ZIP' ? <Folder size={16} /> : <FileAudio size={16} />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-bold text-neutral-300 group-hover:text-white">{file.name}</div>
                                                    <div className="text-[10px] text-neutral-500">{file.size} • {file.type}</div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default CreateProjectModal;
