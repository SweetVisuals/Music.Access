import React, { useState, useEffect } from 'react';
import { X, Upload, Music, Plus, Trash2, FileText, DollarSign, Check, FileAudio, Folder, LayoutTemplate, Box, FileSignature, Type, Lock, Globe, Archive, Disc, Image as ImageIcon } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import CustomInput from './CustomInput';
import { Project, Track, LicenseInfo, Contract } from '../types';
import { createProject, updateProject, getUserFiles, uploadFile, getContracts } from '../services/supabaseService';

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (project: Partial<Project>) => void;
    initialData?: Project; // Support editing
    initialType?: 'beat_tape' | 'sound_pack' | 'release'; // Default type for new projects
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

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSave, initialData, initialType }) => {
    const [step, setStep] = useState(1);

    const [selectedGenres, setSelectedGenres] = useState<string[]>(
        initialData ? (initialData.genre ? [initialData.genre] : []) : []
    );
    const [selectedSubGenres, setSelectedSubGenres] = useState<string[]>(
        initialData ? (initialData.subGenre ? [initialData.subGenre] : []) : []
    );
    // On mobile, expand genres/subgenres by default
    const isMobileInit = typeof window !== 'undefined' && window.innerWidth < 768;
    const [showAllGenres, setShowAllGenres] = useState(isMobileInit);
    const [showAllSubGenres, setShowAllSubGenres] = useState(isMobileInit);

    const [availableContracts, setAvailableContracts] = useState<Contract[]>([]);

    useEffect(() => {
        if (isOpen) {
            const fetchContracts = async () => {
                try {
                    const contracts = await getContracts();
                    setAvailableContracts(contracts);
                } catch (error) {
                    console.error("Failed to fetch contracts", error);
                }
            };
            fetchContracts();
        }
    }, [isOpen]);

    const [projectData, setProjectData] = useState<Partial<Project>>({
        title: initialData?.title || '',
        description: initialData?.description || '',
        coverImage: initialData?.coverImage || '',
        type: initialData?.type || initialType || 'beat_tape',
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

    // Reset/Sync type when modal opens
    useEffect(() => {
        if (isOpen && !initialData) {
            setProjectData(prev => ({
                ...prev,
                type: initialType || 'beat_tape'
            }));
        }
    }, [isOpen, initialType, initialData]);

    const [tracks, setTracks] = useState<Partial<Track>[]>(
        initialData?.tracks?.map(t => ({
            ...t,
            files: t.files || {} // Maintain existing file structure
        })) || []
    );
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
    const [fileSelectorOpen, setFileSelectorOpen] = useState<'mp3' | 'wav' | 'stems' | 'cover' | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const coverInputRef = React.useRef<HTMLInputElement>(null);

    // File Selection State
    const [userFiles, setUserFiles] = useState<any[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [calculatingTrackIds, setCalculatingTrackIds] = useState<Set<string>>(new Set());

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
                        url: f.url,
                        type: (f.type?.includes('audio') || f.name.endsWith('.mp3') || f.name.endsWith('.wav'))
                            ? (f.name.endsWith('.wav') ? 'WAV' : 'MP3')
                            : (f.name.endsWith('.zip') ? 'ZIP'
                                : ((f.type?.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)) ? 'IMAGE' : 'FILE')),
                        size: f.size ? f.size : 'Unknown', // formatFileSize(f.size) if size is number
                        duration: f.duration,
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

    const getAudioDuration = (url: string): Promise<number> => {
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            audio.onloadedmetadata = () => {
                resolve(audio.duration);
            };
            audio.onerror = (e) => reject(e);
        });
    };

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
        if (projectData.type === 'release' && tracks.length >= 1) {
            // Shake effect or notification that limit reached could go here
            return;
        }
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
        if (fileSelectorOpen === 'cover') {
            const file = userFiles.find(f => f.id === fileId);
            if (file && file.url) {
                setProjectData(prev => ({ ...prev, coverImage: file.url }));
            }
        } else {
            const newTracks = [...tracks];
            const track = newTracks[currentTrackIndex!];
            if (!track.files) track.files = {};
            // @ts-ignore
            track.files[fileSelectorOpen!] = fileId;

            if (Object.keys(track.files).length === 1) {
                const file = userFiles.find(f => f.id === fileId);
                track.title = file?.name.split('.')[0] || track.title || 'Untitled Track';

                // Use stored duration if available, otherwise try to calculate it
                if (file?.duration && file.duration > 0) {
                    track.duration = file.duration;
                } else if (file?.url) {
                    if (track.id) {
                        const tId = track.id;
                        setCalculatingTrackIds(prev => new Set(prev).add(tId));

                        getAudioDuration(file.url)
                            .then(duration => {
                                setTracks(currentTracks => {
                                    const tracksCopy = [...currentTracks];
                                    if (tracksCopy[currentTrackIndex!]) {
                                        tracksCopy[currentTrackIndex!] = {
                                            ...tracksCopy[currentTrackIndex!],
                                            duration: Math.round(duration)
                                        };
                                    }
                                    return tracksCopy;
                                });
                                setCalculatingTrackIds(prev => {
                                    const next = new Set(prev);
                                    next.delete(tId);
                                    return next;
                                });
                            })
                            .catch(err => {
                                console.warn("Failed to separate audio duration", err);
                                setCalculatingTrackIds(prev => {
                                    const next = new Set(prev);
                                    next.delete(tId);
                                    return next;
                                });
                                // Fallback to 180 if calculation fails
                                setTracks(currentTracks => {
                                    const tracksCopy = [...currentTracks];
                                    if (tracksCopy[currentTrackIndex!]) {
                                        tracksCopy[currentTrackIndex!] = {
                                            ...tracksCopy[currentTrackIndex!],
                                            duration: 180
                                        };
                                    }
                                    return tracksCopy;
                                });
                            });
                    }
                    track.duration = 0; // Set to 0 while calculating
                } else {
                    track.duration = 180;
                }
            }
            setTracks(newTracks);
        }

        setFileSelectorOpen(null);
        setCurrentTrackIndex(null);
    };

    const updateLicense = (index: number, field: keyof LicenseInfo, value: any) => {
        const newLicenses = [...(projectData.licenses || [])];
        newLicenses[index] = { ...newLicenses[index], [field]: value };
        setProjectData({ ...projectData, licenses: newLicenses });
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploadingCover(true);
            try {
                const file = e.target.files[0];
                const { publicUrl } = await uploadFile(file);
                setProjectData(prev => ({ ...prev, coverImage: publicUrl }));
            } catch (error) {
                console.error("Cover upload failed", error);
            } finally {
                setIsUploadingCover(false);
            }
        }
    };

    const handleFinalSave = async () => {
        if (calculatingTrackIds.size > 0) {
            // Check if these tracks still exist
            const relevantIds = Array.from(calculatingTrackIds).filter(id => tracks.some(t => t.id === id));
            if (relevantIds.length > 0) {
                alert("Please wait for audio analysis to complete...");
                return;
            }
        }
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

        // Clear licenses for 'release' type as they are not needed
        if (finalProject.type === 'release') {
            finalProject.licenses = [];
        }

        if (finalProject.licenses && finalProject.licenses.length > 0) {
            // Validate that all licenses have a contract assigned
            const invalidLicense = finalProject.licenses.find(l => !l.contractId);
            if (invalidLicense) {
                alert(`Please select a contract template for the ${invalidLicense.name} license.`);
                setIsSaving(false);
                return;
            }

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
        <div className={`fixed inset-0 z-[1000] transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/40 -z-10" />
            <div className={`w-full h-[100dvh] bg-[#0a0a0a] border-0 flex flex-col shadow-2xl overflow-hidden relative ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

                <div
                    className="h-14 md:h-16 flex items-center justify-between px-4 md:px-8 bg-neutral-900/50 shrink-0"
                    style={{ paddingTop: 'env(safe-area-inset-top)' }}
                >
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
                                className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-all ${step === s ? 'bg-primary text-black font-bold' : step > s ? 'bg-green-500 text-black' : 'bg-neutral-900 text-neutral-500'}`}
                            >
                                <span className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full bg-black/20 text-[10px] md:text-xs">{step > s ? <Check className="w-3 h-3 md:w-3.5 md:h-3.5" /> : s}</span>
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
                                    className="border-0 focus:ring-0"
                                />

                                {projectData.type === 'release' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Cover Art <span className="text-red-500">*</span></label>
                                        <div
                                            onClick={() => coverInputRef.current?.click()}
                                            className={`
                                                relative w-64 h-64 rounded-xl border border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden group transition-all mx-auto
                                                ${projectData.coverImage ? 'border-transparent' : 'border-neutral-700 hover:border-neutral-500 hover:bg-white/5'}
                                            `}
                                        >
                                            <input
                                                type="file"
                                                ref={coverInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleCoverUpload}
                                            />

                                            {projectData.coverImage ? (
                                                <>
                                                    <img src={projectData.coverImage} className="w-full h-full object-cover" alt="Cover" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                        <ImageIcon size={24} className="text-white" />
                                                        <span className="text-xs font-bold text-white">Change Cover</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-neutral-500 group-hover:text-neutral-300">
                                                    {isUploadingCover ? (
                                                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                                                    ) : (
                                                        <ImageIcon size={32} />
                                                    )}
                                                    <span className="text-xs font-bold uppercase tracking-wider">Upload Cover Art</span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFileSelectorOpen('cover');
                                                        }}
                                                        className="mt-2 text-[10px] text-primary hover:underline z-20 relative"
                                                    >
                                                        Select from Library
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CustomDropdown
                                    label="Type"
                                    value={projectData.type || ''}
                                    onChange={(val) => setProjectData({ ...projectData, type: val as any })}
                                    options={[
                                        { value: 'beat_tape', label: 'Beat Tape / Project', icon: <LayoutTemplate size={14} />, description: 'A collection of beats or songs' },
                                        { value: 'sound_pack', label: 'Sound Pack / Kit', icon: <Box size={14} />, description: 'Drums, loops, or presets' },
                                        { value: 'release', label: 'Release (Single)', icon: <Disc size={14} />, description: '' }
                                    ]}
                                    buttonClassName="border-0 focus:ring-0"
                                />

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">BPM Range</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <CustomInput
                                            type="number"
                                            value={minBpm}
                                            onChange={(e) => setMinBpm(e.target.value)}
                                            placeholder="Min"
                                            className="text-center border-0 focus:ring-0"
                                        />
                                        <CustomInput
                                            type="number"
                                            value={maxBpm}
                                            onChange={(e) => setMaxBpm(e.target.value)}
                                            placeholder="Max"
                                            className="text-center border-0 focus:ring-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {projectData.type !== 'release' && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-400 uppercase">Description</label>
                                    <textarea
                                        value={projectData.description}
                                        onChange={(e) => {
                                            setProjectData({ ...projectData, description: e.target.value });
                                            e.target.style.height = 'auto';
                                            e.target.style.height = `${Math.min(e.target.scrollHeight, 300)}px`;
                                        }}
                                        className="w-full min-h-[96px] md:min-h-[128px] h-auto bg-neutral-900 rounded-lg px-4 py-2.5 md:py-3 text-white text-base md:text-sm focus:outline-none resize-none custom-scrollbar"
                                        placeholder="Tell us about this project..."
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-neutral-400 uppercase">Genre (Max 3)</label>
                                        <span className="text-[10px] text-primary">{selectedGenres.length}/3</span>
                                    </div>
                                    <div className={`flex flex-wrap gap-2 p-2 rounded-lg bg-neutral-900 overflow-hidden transition-all ${showAllGenres ? 'max-h-[500px]' : 'max-h-[82px]'}`}>
                                        {GENRE_LIST.map(g => (
                                            <button
                                                key={g}
                                                onClick={() => toggleGenre(g)}
                                                className={`px-3 py-1 rounded text-xs transition-all ${selectedGenres.includes(g) ? 'bg-primary text-black font-bold shadow-[0_0_10px_rgba(var(--primary),0.3)]' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
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
                                    <div className={`flex flex-wrap gap-2 p-2 rounded-lg bg-neutral-900 overflow-hidden transition-all ${showAllSubGenres ? 'max-h-[500px]' : 'max-h-[82px]'}`}>
                                        {SUB_GENRES.map(g => (
                                            <button
                                                key={g}
                                                onClick={() => toggleSubGenre(g)}
                                                className={`px-3 py-1 rounded text-xs transition-all ${selectedSubGenres.includes(g) ? 'bg-white text-black font-bold shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
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
                                <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-900 rounded-lg min-h-[50px]">
                                    {projectData.tags?.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-neutral-800 rounded flex items-center gap-1 text-xs text-white">
                                            #{tag} <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={10} /></button>
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
                    )
                    }

                    {
                        step === 2 && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-white">
                                        {projectData.type === 'release' ? 'Single Track' : 'Project Tracks'}
                                    </h3>
                                    {(projectData.type !== 'release' || tracks.length === 0) && (
                                        <button onClick={addTrack} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white">
                                            <Plus size={14} /> Add Track
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {tracks.map((track, idx) => (
                                        <div key={idx} className="bg-neutral-900/50 rounded-xl p-4 animate-in slide-in-from-bottom-2">
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center text-sm font-mono font-bold text-neutral-500">
                                                    {projectData.type === 'release' ? <Disc size={14} /> : (idx + 1)}
                                                </div>
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex gap-4">
                                                        <input
                                                            value={track.title}
                                                            onChange={(e) => updateTrack(idx, 'title', e.target.value)}
                                                            className="flex-1 bg-black rounded px-3 py-2 text-white text-base md:text-sm focus:outline-none"
                                                            placeholder="Track Title"
                                                        />
                                                        <button onClick={() => { const nt = [...tracks]; nt.splice(idx, 1); setTracks(nt); }} className="p-2 text-neutral-500 hover:text-red-500">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                                                        {(projectData.type === 'release' ? ['mp3', 'wav'] : ['mp3', 'wav', 'stems']).map((type: any) => (
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
                        )
                    }

                    {
                        step === 3 && (
                            <div className="space-y-8">
                                {projectData.type !== 'release' && (
                                    <>
                                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
                                            <FileText size={16} className="text-blue-400 mt-0.5" />
                                            <div>
                                                <h4 className="text-sm font-bold text-blue-400">Global Project Licenses</h4>
                                                <p className="text-xs text-blue-200/70 mt-1">These licenses will apply to all tracks in this project. Customers can select which file version they want to purchase.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {projectData.licenses?.map((license, idx) => (
                                                <div key={license.id} className="bg-neutral-900/40 rounded-xl flex flex-col">
                                                    <div className="p-4 md:p-6 bg-neutral-900/30 flex justify-between items-center shrink-0 rounded-t-xl">
                                                        <span className="text-xs font-bold uppercase text-neutral-400">{license.type} Lease</span>
                                                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                    </div>
                                                    <div className="p-6 space-y-4 flex-1">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] font-bold text-neutral-500 uppercase">License Name</label>
                                                            <input
                                                                value={license.name}
                                                                onChange={(e) => updateLicense(idx, 'name', e.target.value)}
                                                                className="w-full bg-black rounded px-2 py-2 text-sm text-white focus:outline-none"
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
                                                                    className="w-full bg-black rounded px-2 py-2 pl-8 text-lg font-mono font-bold text-white focus:outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <CustomDropdown
                                                                label="Contract Template"
                                                                value={license.contractId || ''}
                                                                onChange={(val) => updateLicense(idx, 'contractId', val)}
                                                                placeholder={availableContracts.length === 0 ? "No contracts found" : "Select Contract..."}
                                                                options={availableContracts.map(c => ({
                                                                    value: c.id,
                                                                    label: c.title,
                                                                    icon: <FileSignature size={14} className="text-primary" />
                                                                }))}
                                                                searchable
                                                                buttonClassName="border-0 focus:ring-0"
                                                                disabled={availableContracts.length === 0}
                                                            />
                                                            {availableContracts.length === 0 && (
                                                                <div className="flex items-center gap-2 mt-1 px-1">
                                                                    <p className="text-[10px] text-red-400">
                                                                        * You must create a contract before assigning it.
                                                                    </p>
                                                                    <a href="/dashboard/contracts" target="_blank" className="text-[10px] font-bold text-primary hover:underline">
                                                                        Create Contract
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="pt-2">
                                                            <div className="text-[10px] font-bold text-neutral-500 uppercase mb-2">Included Files</div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {license.fileTypesIncluded.map(ft => (
                                                                    <span key={ft} className="px-1.5 py-0.5 bg-neutral-800 rounded text-[9px] text-neutral-300">{ft}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                <div className="space-y-4 pt-6">
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
                                                relative p-4 rounded-xl cursor-pointer transition-all
                                                ${projectData.status === option.id
                                                        ? 'bg-primary text-black'
                                                        : 'bg-neutral-900/40 text-neutral-400 hover:bg-neutral-800'
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
                        )
                    }
                </div >

                <div
                    className="h-auto py-4 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 bg-neutral-900/50 gap-4 shrink-0"
                    style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
                >
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
                                disabled={isSaving}
                                className={`flex-1 md:flex-none px-8 py-3 bg-primary text-black rounded-lg font-bold text-xs hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(var(--primary),0.3)] justify-center ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSaving ? 'Publishing...' : 'Publish Project'}
                            </button>
                        )}
                    </div>
                </div>

                {
                    fileSelectorOpen && (
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
                                                if (fileSelectorOpen === 'cover') return f.type === 'IMAGE' || /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name);
                                                return true;
                                            })
                                            .map(file => (
                                                <div
                                                    key={file.id}
                                                    onClick={() => selectFile(file.id)}
                                                    className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer border border-transparent hover:border-white/10 group"
                                                >
                                                    <div className="w-8 h-8 bg-neutral-900 rounded flex items-center justify-center text-neutral-500 group-hover:text-primary">
                                                        {file.type === 'ZIP' ? <Folder size={16} /> : (file.type === 'IMAGE' ? <ImageIcon size={16} /> : <FileAudio size={16} />)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-neutral-300 group-hover:text-white">{file.name}</div>
                                                        <div className="text-[10px] text-neutral-500">{file.size} • {file.type}</div>
                                                    </div>
                                                    {file.type === 'IMAGE' && file.url && (
                                                        <div className="w-10 h-10 rounded overflow-hidden">
                                                            <img src={file.url} className="w-full h-full object-cover" alt="Preview" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

            </div >
        </div>

    );
};

export default CreateProjectModal;
