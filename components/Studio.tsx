import React, { useState, useRef, useEffect } from 'react';
import { Project, Track, Contract, UserProfile } from '../types';
import {
    Plus,
    Search,
    Music,
    Box,
    MoreVertical,
    Edit,
    Download,
    Printer,
    Share2,
    Trash2,
    ArrowLeft,
    Play,
    Pause,
    Folder,
    CheckCircle,
    FileText,
    Mic2,
    Disc,
    X,
    Upload,
    ChevronRight,
    ShieldCheck,
    StickyNote,
    Check,
    Calendar,
    Filter,
    Eye,
    Briefcase,
    Menu,
    LayoutList
} from 'lucide-react';
import { MOCK_NOTES } from '../constants';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../contexts/ToastContext';
import {
    createProject,
    deleteProject as deleteProjectService,
    updateProject as updateProjectService,
    getLibraryAssets,
    createTask,
    updateTask,
    deleteTask,
    addTrack as addTrackService,
    updateTrack as updateTrackService,
    deleteTrack as deleteTrackService,
    getContracts
} from '../services/supabaseService';
import { Task } from '../types';

interface StudioProps {
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    currentTrackId: string | null;
    isPlaying: boolean;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
    userProfile?: UserProfile | null;
}

// Extended Type for Studio Workflow
interface StudioTrack extends Omit<Track, 'files'> {
    noteId?: string;
    statusTags: { label: string; active: boolean }[];
    files?: {
        main?: string; // ID of the main audio file
    };
}

interface StudioProject extends Omit<Project, 'status' | 'tracks' | 'tasks'> {
    releaseDate?: string;
    status: 'planning' | 'in_progress' | 'mixing' | 'mastering' | 'ready';
    progress: number;
    format: 'Album' | 'EP' | 'Single';
    tasks: { id: string; text: string; completed: boolean }[];
    tracks: StudioTrack[];
}

// Library Asset Interface
interface LibraryAsset {
    id: string;
    name: string;
    type: 'Purchased' | 'Pack' | 'Commission' | 'Upload' | 'Project' | 'folder';
    producer: string;
    date: string;
    fileType?: 'mp3' | 'wav' | 'zip';
    parentId?: string | null;
    url?: string;
}

/* REMOVED MOCK DATA */

const Studio: React.FC<StudioProps> = ({
    projects,
    setProjects,
    currentTrackId,
    isPlaying,
    onPlayTrack,
    onTogglePlay,
    userProfile
}) => {
    const [activeView, setActiveView] = useState<'dashboard' | 'workspace'>('dashboard');
    const [selectedProject, setSelectedProject] = useState<StudioProject | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
    const { showToast } = useToast();

    // --- CREATE MODAL STATE ---
    const [newProjectTitle, setNewProjectTitle] = useState('');
    const [newProjectFormat, setNewProjectFormat] = useState<'Album' | 'EP' | 'Single'>('Album');

    // --- STUDIO PROJECTS ---
    // Fetch unique studio projects for the logged in user
    const [studioProjects, setStudioProjects] = useState<StudioProject[]>([]);

    useEffect(() => {
        const fetchStudioProjects = async () => {
            if (userProfile?.id) {
                try {
                    // Import dynamically to avoid circular dependency if possible, or just use imported service
                    const { getProjectsByUserId } = await import('../services/supabaseService');
                    const data = await getProjectsByUserId(userProfile.id);

                    const formatted = data.map(p => ({
                        ...p,
                        status: (p.status || 'planning') as any,
                        format: (p.format || 'Album') as any,
                        progress: p.progress || 0,
                        tasks: p.tasks || [],
                        tracks: p.tracks.map(t => ({
                            ...t,
                            statusTags: t.statusTags || [{ label: 'Lyrics', active: false }, { label: 'Vocals', active: false }, { label: 'Mixed', active: false }],
                            files: t.files || {}
                        }))
                    })) as StudioProject[];

                    setStudioProjects(formatted);
                } catch (e) {
                    console.error("Failed to fetch studio projects", e);
                }
            }
        };

        fetchStudioProjects();
    }, [userProfile?.id]); // Re-fetch when user changes

    // Update handler for local state when creating/deleting
    // We also need to update the parent setProjects if we want to reflect changes elsewhere, 
    // but Studio now manages its own source of truth for the "private" view.


    const handleCreateProject = async () => {
        try {
            const newProj = await createProject({
                title: newProjectTitle || 'Untitled Project',
                type: 'beat_tape',
                format: newProjectFormat,
                status: 'planning' as any,
                bpm: 0,
                key: '-',
                genre: 'Unsorted',
                tracks: []
            });

            // We update the parent state which flows down to studioProjects
            // Map the raw DB response (snake_case) to our Project interface (camelCase)
            const studioProj: Project = {
                id: newProj.id,
                title: newProj.title,
                producer: userProfile?.username || 'Me',
                producerAvatar: userProfile?.avatar || '',
                coverImage: newProj.cover_image_url || '',
                price: 0,
                bpm: newProj.bpm,
                key: newProj.key,
                genre: newProj.genre,
                subGenre: newProj.sub_genre,
                type: newProj.type,
                tags: [],
                tracks: [],
                description: newProj.description,
                licenses: [],
                status: (newProj.status || 'planning') as any,
                created: newProj.created_at,
                userId: newProj.user_id || userProfile?.id, // Fallback to ensure visibility
                releaseDate: newProj.release_date,
                format: newProj.format,
                progress: newProj.progress || 0,
                gems: newProj.gems || 0,
                tasks: []
            };

            setProjects([studioProj, ...projects]);

            setIsCreateModalOpen(false);
            setNewProjectTitle('');

            // Open it (casting to satisfy local requirements until next render)
            openProject({
                ...studioProj,
                status: (studioProj.status || 'planning') as any,
                format: (studioProj.format || 'Album') as any,
                progress: studioProj.progress || 0,
                tasks: [],
                tracks: []
            } as StudioProject);

        } catch (error) {
            console.error("Failed to create project:", error);
        }
    };

    const openProject = (p: StudioProject) => {
        setSelectedProject(p);
        setActiveView('workspace');
    };

    const deleteProject = async (e?: React.MouseEvent, id?: string) => {
        if (e) e.stopPropagation();
        const targetId = id || projectToDelete;
        if (!targetId) return;

        try {
            await deleteProjectService(targetId);
            setProjects(prev => prev.filter(p => p.id !== targetId));
            showToast('Project deleted successfully', 'success');
        } catch (error) {
            console.error("Failed to delete project:", error);
            showToast('Failed to delete project', 'error');
        } finally {
            setProjectToDelete(null);
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative">
            {/* NEW PROJECT MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md md:p-4 animate-in fade-in duration-200">
                    <div className="w-full h-[100dvh] md:h-auto md:max-w-md bg-[#0a0a0a] border-0 md:border border-neutral-800 rounded-none md:rounded-2xl shadow-2xl flex flex-col max-h-none md:max-h-[90vh] overflow-hidden relative">

                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">New Release</h3>
                                <p className="text-xs text-neutral-500 mt-1">Start a new musical project</p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-900 text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                    <Edit size={12} /> Project Title
                                </label>
                                <input
                                    value={newProjectTitle}
                                    onChange={(e) => setNewProjectTitle(e.target.value)}
                                    placeholder="e.g. Summer Hitz Vol. 1"
                                    className="w-full bg-neutral-900/50 rounded-xl px-4 py-4 text-lg text-white font-bold placeholder-neutral-700 focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all"
                                    autoFocus={window.innerWidth >= 768}
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                    <Disc size={12} /> Release Format
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['Album', 'EP', 'Single'] as const).map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setNewProjectFormat(fmt)}
                                            className={`
                                                relative overflow-hidden py-3 rounded-xl text-sm font-bold transition-all
                                                ${newProjectFormat === fmt
                                                    ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                                                    : 'bg-neutral-900 text-neutral-500 hover:text-white'
                                                }
                                            `}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Visual Decor Element */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900 to-black flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                    <Music size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">Ready to create?</p>
                                    <p className="text-xs text-neutral-500">This will create a new workspace for your tracks.</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer (Mobile Bottom Bar Safe) */}
                        <div className="p-6 pt-4 border-t border-white/5 bg-[#0a0a0a] pb-[calc(2rem+env(safe-area-inset-bottom))] md:pb-6 shrink-0 mt-auto">
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-3.5 bg-neutral-900 text-neutral-400 font-bold rounded-xl hover:bg-neutral-800 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateProject}
                                    disabled={!newProjectTitle.trim()}
                                    className="flex-[2] py-3.5 bg-primary text-black font-black tracking-wide rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgb(var(--primary)/0.2)] transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Create Workspace</span>
                                    <ArrowLeft size={16} className="rotate-180" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeView === 'dashboard' ? (
                <div className="w-full flex-1 flex flex-col pb-40 lg:pb-12 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter">My Studio</h1>
                            <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">Manage your releases, organize purchased beats, and track contracts.</p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-black rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgb(var(--primary)/0.3)] w-full sm:w-auto"
                        >
                            <Plus size={16} />
                            <span>NEW PROJECT</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Create New Card (Shortcut) */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="h-[280px] rounded-xl flex flex-col items-center justify-center text-neutral-500 hover:text-primary hover:bg-primary/5 transition-all group bg-[#0a0a0a]"
                        >
                            <div className="h-16 w-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                <Plus size={28} />
                            </div>
                            <span className="font-mono text-xs font-bold uppercase tracking-widest">Start New Release</span>
                        </button>

                        {/* Project Workspace Cards */}
                        {studioProjects.map(project => (
                            <div
                                key={project.id}
                                onClick={() => openProject(project)}
                                className="group h-[280px] bg-[#0a0a0a] rounded-xl overflow-hidden transition-all relative cursor-pointer hover:shadow-2xl flex flex-col"
                            >
                                {/* Top Section: Cover & Info */}
                                <div className="flex-1 relative p-5 flex flex-col justify-between z-10">
                                    <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-[#0a0a0a]"></div>

                                    <div className="relative flex justify-between items-start">
                                        <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${project.status === 'ready' ? 'bg-green-500/10 text-green-500' :
                                            project.status === 'planning' ? 'bg-neutral-800 text-neutral-400' :
                                                'bg-blue-500/10 text-blue-400'
                                            }`}>
                                            {project.status}
                                        </span>
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            {/* Simple Dropdown for More Actions */}
                                            <div className="group/menu relative">
                                                <button className="text-neutral-500 hover:text-white"><MoreVertical size={16} /></button>
                                                <div className="absolute right-0 top-full mt-1 w-32 bg-neutral-900 rounded-lg shadow-xl hidden group-hover/menu:block z-20">
                                                    <button onClick={(e) => { e.stopPropagation(); setProjectToDelete(project.id); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 rounded-t-lg">Delete</button>
                                                    <button className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 rounded-b-lg">Rename</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-1 text-[10px] text-neutral-500 font-mono uppercase">
                                            <Disc size={12} /> {project.format}
                                        </div>
                                        <h3 className="text-xl font-bold text-white truncate group-hover:text-primary transition-colors">{project.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                                            <Calendar size={12} />
                                            <span>Target: {project.releaseDate || 'TBD'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Section: Stats */}
                                <div className="bg-neutral-900/30 border-t border-white/5 p-5 relative">
                                    <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase mb-2">
                                        <span>Progress</span>
                                        <span>{project.progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-3">
                                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${project.progress}%` }}></div>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] text-neutral-400">
                                        <span className="flex items-center gap-1"><Music size={12} /> {project.tracks.length} Tracks</span>
                                        <span className="flex items-center gap-1"><CheckCircle size={12} /> {project.tasks.filter(t => t.completed).length} Done</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                selectedProject && (
                    <WorkspaceView
                        project={selectedProject}
                        onBack={() => setActiveView('dashboard')}
                        onUpdate={(updated) => {
                            // Update local state temporarily/optimistically
                            // Ideally, we might reload data, but for responsiveness we update state
                            // We need to convert StudioProject back to Project compatible form for setProjects if we want to save it there
                            // But WorkspaceView handles its own async updates now internally for sub-items?
                            // Actually WorkspaceView calls onUpdate when items change.

                            // Let's implement onUpdate to update the parent projects state
                            setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } as Project : p));
                            setSelectedProject(updated);
                        }}
                        isPlaying={isPlaying}
                        setProjects={setProjects}
                        currentTrackId={currentTrackId}
                        onPlayTrack={onPlayTrack}
                        onTogglePlay={onTogglePlay}
                        setProjectToDelete={setProjectToDelete}
                    />
                )
            )}

            {/* Project Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!projectToDelete}
                onClose={() => setProjectToDelete(null)}
                onConfirm={deleteProject}
                title="Delete Project"
                message="Are you sure you want to delete this project? This will permanently remove all tracks and data associated with it."
                confirmLabel="Delete Project"
                cancelLabel="Cancel"
                isDestructive={true}
            />
        </div>
    );
};

interface WorkspaceViewProps {
    project: StudioProject;
    onBack: () => void;
    onUpdate: (project: StudioProject) => void;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    isPlaying: boolean;
    currentTrackId: string | null;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
    setProjectToDelete: (id: string | null) => void;
}

const WorkspaceView: React.FC<WorkspaceViewProps> = ({
    project,
    onBack,
    onUpdate,
    setProjects,
    isPlaying,
    currentTrackId,
    onPlayTrack,
    onTogglePlay,
    setProjectToDelete
}) => {
    const [tab, setTab] = useState<'tracks' | 'files' | 'contracts' | 'overview'>('tracks');
    const [draggingAsset, setDraggingAsset] = useState<LibraryAsset | null>(null);
    const [showMobileLib, setShowMobileLib] = useState(false);

    // Library State
    const [libraryFilter, setLibraryFilter] = useState<'All' | 'Purchased' | 'Uploaded'>('All');
    const [librarySearch, setLibrarySearch] = useState('');
    const [currentLibraryFolderId, setCurrentLibraryFolderId] = useState<string | null>(null);

    // Modal States
    const [activeContract, setActiveContract] = useState<Contract | null>(null);
    const [attachNoteModalOpen, setAttachNoteModalOpen] = useState(false);
    const [trackToAttachNote, setTrackToAttachNote] = useState<string | null>(null);
    const [newTaskText, setNewTaskText] = useState('');

    // Menu State
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Library Assets State (Real Data)
    const [assets, setAssets] = useState<LibraryAsset[]>([]);
    const [availableContracts, setAvailableContracts] = useState<Contract[]>([]);
    const [trackToDelete, setTrackToDelete] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const data = await getLibraryAssets();
                // Map the returned data (which aligns with our interface mostly) to strictly match LibraryAsset
                // The service returns objects compatible with LibraryAsset
                setAssets(data as LibraryAsset[]);
            } catch (error) {
                console.error("Failed to fetch library assets", error);
            }
        };
        fetchAssets();
    }, []);

    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const data = await getContracts();
                setAvailableContracts(data);
            } catch (error) {
                console.error("Failed to fetch contracts", error);
            }
        };
        fetchContracts();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setOpenMenuId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // -- ACTIONS --

    const addTrack = async () => {
        try {
            const newTrackStub = {
                trackNumber: project.tracks.length + 1,
                title: 'Untitled Track',
                duration: 0
            };
            const createdTrack = await addTrackService(project.id, newTrackStub);

            const newStudioTrack: StudioTrack = {
                ...createdTrack,
                statusTags: [{ label: 'Lyrics', active: false }, { label: 'Vocals', active: false }, { label: 'Mixed', active: false }],
                files: {}
            };

            onUpdate({
                ...project,
                tracks: [...project.tracks, newStudioTrack]
            });
        } catch (e) {
            console.error("Failed to add track", e);
        }
    };

    const deleteTrack = async () => {
        if (!trackToDelete) return;
        try {
            await deleteTrackService(trackToDelete);
            onUpdate({ ...project, tracks: project.tracks.filter(t => t.id !== trackToDelete) });
            showToast('Track removed from project', 'success');
        } catch (e) {
            console.error("Failed to delete track", e);
            showToast('Failed to remove track', 'error');
        } finally {
            setTrackToDelete(null);
        }
    };

    const toggleTask = async (taskId: string) => {
        const task = project.tasks.find(t => t.id === taskId);
        if (!task) return;

        const newCompleted = !task.completed;

        // Optimistic
        const newTasks = project.tasks.map(t => t.id === taskId ? { ...t, completed: newCompleted } : t);
        const progress = Math.round((newTasks.filter(t => t.completed).length / newTasks.length) * 100) || 0;
        onUpdate({ ...project, tasks: newTasks, progress });

        try {
            await updateTask(taskId, { completed: newCompleted });
            await updateProjectService(project.id, { progress }); // Update progress on project
        } catch (e) {
            console.error("Failed to toggle task", e);
            // Revert?
        }
    };

    const addTask = async () => {
        if (!newTaskText.trim()) return;

        try {
            const newTask = await createTask(project.id, newTaskText);

            const newTasks = [...project.tasks, newTask];
            const progress = Math.round((newTasks.filter(t => t.completed).length / newTasks.length) * 100) || 0;

            onUpdate({ ...project, tasks: newTasks, progress });
            setNewTaskText('');

            await updateProjectService(project.id, { progress });
        } catch (e) {
            console.error("Failed to add task", e);
        }
    };

    const handleDropOnTrack = async (trackId: string) => {
        if (draggingAsset) {
            const track = project.tracks.find(t => t.id === trackId);
            if (!track) return;

            const newTitle = track.title === 'Untitled Track' ? draggingAsset.name.replace(/_/g, ' ').replace(/\.(mp3|wav|zip)$/, '') : track.title;
            const newAssignedFileId = draggingAsset.id;

            // Updated local
            const updatedTracks = project.tracks.map(t => {
                if (t.id === trackId) {
                    return {
                        ...t,
                        title: newTitle,
                        files: { ...t.files, main: newAssignedFileId, mp3: draggingAsset.url }
                    };
                }
                return t;
            });
            onUpdate({ ...project, tracks: updatedTracks });
            setDraggingAsset(null);

            // DB Update
            try {
                await updateTrackService(trackId, {
                    title: newTitle,
                    assignedFileId: newAssignedFileId
                });
            } catch (e) {
                console.error("Failed to update track file", e);
            }
        }
    };

    const toggleStatusTag = async (trackId: string, tagLabel: string) => {
        const track = project.tracks.find(t => t.id === trackId);
        if (!track) return;

        const newStatusTags = track.statusTags.map(tag => tag.label === tagLabel ? { ...tag, active: !tag.active } : tag);

        const updatedTracks = project.tracks.map(t => t.id === trackId ? { ...t, statusTags: newStatusTags } : t);
        onUpdate({ ...project, tracks: updatedTracks });

        try {
            await updateTrackService(trackId, { statusTags: newStatusTags });
        } catch (e) {
            console.error("Failed to update track status", e);
        }
    };

    // Notes Logic
    const openAttachNoteModal = (trackId: string) => {
        setTrackToAttachNote(trackId);
        setAttachNoteModalOpen(true);
        setOpenMenuId(null); // Close menu
    };

    const attachNoteToTrack = async (noteId: string) => {
        if (trackToAttachNote) {
            const updatedTracks = project.tracks.map(t => t.id === trackToAttachNote ? { ...t, noteId } : t);
            onUpdate({ ...project, tracks: updatedTracks });

            try {
                await updateTrackService(trackToAttachNote, { noteId });
            } catch (e) {
                console.error("Failed to attach note", e);
            }

            setAttachNoteModalOpen(false);
            setTrackToAttachNote(null);
        }
    };

    const removeNoteFromTrack = async (trackId: string) => {
        const updatedTracks = project.tracks.map(t => {
            if (t.id === trackId) {
                const { noteId, ...rest } = t;
                return rest;
            }
            return t;
        });
        onUpdate({ ...project, tracks: updatedTracks });

        try {
            await updateTrackService(trackId, { noteId: null });
        } catch (e) {
            console.error("Failed to remove note", e);
        }
    };

    // Playback
    const handleTrackClick = (trackId: string) => {
        if (currentTrackId === trackId && isPlaying) {
            onTogglePlay();
        } else {
            // We need to cast StudioProject to Project as it is largely compatible
            // Note: StudioProject extends Project via Omit/Interface, but runtime object structure is what matters.
            // Since StudioTrack files structure differs slightly, MusicPlayer might need adjustment if it relies on specific file paths.
            // However, for UI demo purposes, as long as ID matches, it works.
            onPlayTrack(project as unknown as Project, trackId);
        }
    };

    // Library Filtering
    // Use fetched 'assets' instead of LIBRARY_ASSETS
    const filteredLibrary = assets.filter(asset => {
        const matchesFilter = libraryFilter === 'All'
            ? true
            : libraryFilter === 'Purchased'
                ? (asset.type === 'Purchased' || asset.type === 'Pack' || asset.type === 'Project')
                : (asset.type === 'Upload' || asset.type === 'folder');

        const matchesSearch = asset.name.toLowerCase().includes(librarySearch.toLowerCase());

        // detailed folder logic
        if (librarySearch.trim()) {
            return matchesFilter && matchesSearch;
        }

        // Hierarchy check
        const isChildOfCurrent = (asset.parentId || null) === currentLibraryFolderId;
        return matchesFilter && isChildOfCurrent;
    });

    const currentFolder = assets.find(a => a.id === currentLibraryFolderId);

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">

            {/* ATTACH NOTE MODAL */}
            {attachNoteModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
                    <div className="w-full h-[100dvh] md:h-auto md:max-w-lg bg-neutral-900 rounded-none md:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-none md:max-h-[85vh]">
                        <div className="flex items-center justify-between p-4 border-b border-white/5">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <StickyNote size={16} className="text-yellow-500" />
                                Select Note from Notebook
                            </h3>
                            <button onClick={() => setAttachNoteModalOpen(false)}><X size={18} className="text-neutral-500 hover:text-white" /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
                            {MOCK_NOTES.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => attachNoteToTrack(note.id)}
                                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
                                >
                                    <h4 className="text-sm font-bold text-white mb-1">{note.title}</h4>
                                    <p className="text-xs text-neutral-400 line-clamp-2">{note.content}</p>
                                    <div className="flex gap-2 mt-2">
                                        {note.tags.map(tag => (
                                            <span key={tag} className="text-[9px] bg-black px-2 py-0.5 rounded text-neutral-500">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-white/5 bg-neutral-950 text-center text-[10px] text-neutral-500">
                            Manage notes in the main Notes page
                        </div>
                    </div>
                </div>
            )}

            {/* CONTRACT VIEWER MODAL */}
            {activeContract && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
                    <div className="w-full h-[100dvh] md:h-auto md:max-w-2xl bg-white text-black rounded-none md:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-none md:max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">

                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-lg">{activeContract.title}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Status: {activeContract.status}</p>
                            </div>
                            <button onClick={() => setActiveContract(null)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 font-serif text-sm leading-relaxed">
                            <h1 className="text-center text-xl font-bold mb-6 underline">AGREEMENT TERMS</h1>
                            <p className="mb-4"><strong>Between:</strong> Producer (Me) AND Client ({activeContract.clientName || 'TBD'})</p>
                            <p className="mb-4"><strong>Date:</strong> {activeContract.created}</p>
                            <hr className="my-4 border-gray-300" />
                            <p className="mb-4 whitespace-pre-wrap">{activeContract.terms}</p>

                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <p className="font-bold mb-2">Producer Signature:</p>
                                    <div className="h-12 border-b border-black flex items-end font-signature text-2xl">
                                        {activeContract.producerSignature || <span className="text-gray-300 text-xs font-sans">Not Signed</span>}
                                    </div>
                                </div>
                                <div>
                                    <p className="font-bold mb-2">Client Signature:</p>
                                    <div className="h-12 border-b border-black flex items-end font-signature text-2xl">
                                        {activeContract.clientSignature || <span className="text-gray-300 text-xs font-sans">Waiting...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                            <button className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-black flex items-center gap-2"><Download size={14} /> Download PDF</button>
                            <button onClick={() => setActiveContract(null)} className="px-4 py-2 bg-black text-white text-xs font-bold rounded">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* WORKSPACE HEADER */}
            <div className="h-auto lg:h-16 bg-[#050505] flex flex-col lg:flex-row items-start lg:items-center justify-between px-4 lg:px-6 py-4 lg:py-0 shrink-0 gap-4">
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="h-8 w-px bg-neutral-800 hidden lg:block"></div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-none">{project.title}</h2>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono mt-1">
                            <span className="uppercase">{project.format}</span>
                            <span>•</span>
                            <span>{project.tracks.length} Tracks</span>
                            <span>•</span>
                            <span className={`uppercase font-bold ${project.status === 'ready' ? 'text-green-500' : 'text-primary'}`}>{project.status}</span>
                        </div>
                    </div>



                    {/* Mobile Library Toggle */}
                    <button
                        className="ml-auto lg:hidden p-2 rounded text-neutral-400"
                        onClick={() => setShowMobileLib(!showMobileLib)}
                    >
                        <Folder size={18} />
                    </button>
                </div>

                {/* Tabs - Mobile (Grid) & Desktop (Pills/List) */}
                <div className="w-full lg:w-auto lg:hidden">
                    {/* Mobile Grid Layout */}
                    <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-900/50 rounded-lg w-full">
                        <button
                            onClick={() => setTab('overview')}
                            className={`flex flex-col items-center justify-center gap-1 py-2 rounded transition-all ${tab === 'overview' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <LayoutList size={14} className={tab === 'overview' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Overview</span>
                        </button>
                        <button
                            onClick={() => setTab('tracks')}
                            className={`flex flex-col items-center justify-center gap-1 py-2 rounded transition-all ${tab === 'tracks' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <Music size={14} className={tab === 'tracks' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Tracks</span>
                        </button>
                        <button
                            onClick={() => setTab('contracts')}
                            className={`flex flex-col items-center justify-center gap-1 py-2 rounded transition-all ${tab === 'contracts' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <FileText size={14} className={tab === 'contracts' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Contracts</span>
                        </button>
                        <button
                            onClick={() => setTab('files')}
                            className={`flex flex-col items-center justify-center gap-1 py-2 rounded transition-all ${tab === 'files' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            <Folder size={14} className={tab === 'files' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Files</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Tabs - Centered & Spaced Out */}
                <div className="hidden lg:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
                    {['overview', 'tracks', 'contracts', 'files'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t as any)}
                            className={`relative py-5 text-sm font-bold transition-all uppercase tracking-widest ${tab === t
                                ? 'text-white'
                                : 'text-neutral-500 hover:text-white'
                                }`}
                        >
                            {t}
                            {tab === t && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Right Actions: Bin & Export */}
                {/* Right Actions: Bin & Export */}
                <div className="hidden lg:flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(project.id);
                        }}
                        className="group h-9 w-9 flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-white/10 rounded-xl transition-all duration-300"
                        title="Delete Workspace"
                    >
                        <Trash2 size={16} className="text-neutral-400 group-hover:text-red-500 transition-colors" />
                    </button>

                    <button
                        className="group h-9 w-9 flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-white/10 rounded-xl transition-all duration-300"
                        title="Export Project"
                    >
                        <Download size={16} className="text-white group-hover:text-primary transition-colors" />
                    </button>
                </div>
            </div>



            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

                {/* LEFT CONTENT (Dynamic based on Tab) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 pb-40 lg:pb-12">

                    {tab === 'overview' && (
                        <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-neutral-900/30 rounded-xl p-6">
                                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider flex justify-between items-center">
                                    Release Checklist
                                    <span className="text-[10px] text-neutral-500 normal-case">{project.tasks.filter(t => t.completed).length}/{project.tasks.length} Completed</span>
                                </h3>
                                <div className="space-y-3">
                                    {project.tasks.map(task => (
                                        <div key={task.id} className="flex items-center justify-between group">
                                            <div
                                                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer flex-1"
                                                onClick={() => toggleTask(task.id)}
                                            >
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${task.completed ? 'bg-primary border-primary text-black' : 'border-neutral-600 text-transparent'}`}>
                                                    <CheckCircle size={12} />
                                                </div>
                                                <span className={`text-sm ${task.completed ? 'text-neutral-500 line-through' : 'text-white'}`}>{task.text}</span>
                                            </div>
                                            <button onClick={() => {
                                                const newTasks = project.tasks.filter(t => t.id !== task.id);
                                                onUpdate({ ...project, tasks: newTasks });
                                            }} className="p-2 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add Task Input */}
                                    <div className="flex items-center gap-2 p-2 mt-2">
                                        <Plus size={14} className="text-neutral-500" />
                                        <input
                                            className="bg-transparent border-none text-sm text-white focus:outline-none w-full placeholder-neutral-600"
                                            placeholder="Add a new task..."
                                            value={newTaskText}
                                            onChange={(e) => setNewTaskText(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addTask()}
                                        />
                                        <button onClick={addTask} disabled={!newTaskText} className="text-xs font-bold text-primary disabled:opacity-50">Add</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'tracks' && (
                        <div className="w-full animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-end mb-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tracklist</h3>
                                <button onClick={addTrack} className="text-xs font-bold text-primary hover:text-white flex items-center gap-1"><Plus size={14} /> Add Track</button>
                            </div>

                            <div className="space-y-2">
                                {project.tracks.map((track, idx) => {
                                    const isTrackPlaying = isPlaying && currentTrackId === track.id;
                                    return (
                                        <div
                                            key={track.id}
                                            onClick={() => handleTrackClick(track.id)}
                                            className={`
                                            group bg-[#0f0f0f] border border-transparent rounded-xl p-3 lg:p-2 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 transition-colors cursor-pointer select-none
                                            ${isTrackPlaying ? 'border-primary bg-primary/5' : 'hover:bg-white/5'}
                                        `}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => handleDropOnTrack(track.id)}
                                        >
                                            <div className="flex items-center gap-3 w-full lg:w-auto">
                                                <div className="w-8 text-center text-neutral-600 font-mono text-sm flex justify-center shrink-0">
                                                    {isTrackPlaying ? (
                                                        <Pause size={14} className="text-primary fill-primary animate-pulse" />
                                                    ) : (
                                                        <span className="group-hover:hidden">{idx + 1}</span>
                                                    )}
                                                    {!isTrackPlaying && <Play size={14} className="hidden group-hover:block text-neutral-400" />}
                                                </div>

                                                {/* Track Title Input */}
                                                <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        className="bg-transparent text-sm font-bold text-white focus:outline-none w-full cursor-text"
                                                        value={track.title}
                                                        onChange={(e) => {
                                                            const updated = project.tracks.map(t => t.id === track.id ? { ...t, title: e.target.value } : t);
                                                            onUpdate({ ...project, tracks: updated });
                                                        }}
                                                        onBlur={async () => {
                                                            try {
                                                                await updateTrackService(track.id, { title: track.title });
                                                            } catch (e) {
                                                                console.error("Failed to save track title", e);
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                {/* Mobile Menu Trigger */}
                                                <div className="lg:hidden relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === track.id ? null : track.id);
                                                        }}
                                                        className="p-1.5 text-neutral-500"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {openMenuId === track.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-40 bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-2xl z-50 overflow-hidden">
                                                            <button onClick={(e) => { e.stopPropagation(); openAttachNoteModal(track.id); }} className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-white/5">Attach Note</button>
                                                            <button onClick={(e) => { e.stopPropagation(); setTrackToDelete(track.id); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5">Delete Track</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Track Info / Beat Source */}
                                            <div className="flex-1 flex flex-wrap items-center gap-2 lg:gap-4 text-[10px] pl-11 lg:pl-0">
                                                {track.files?.main ? (
                                                    <span className="flex items-center gap-1 text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                                                        <Music size={10} /> {assets.find(a => a.id === track.files?.main)?.name || 'Beat Assigned'}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                                                        <Upload size={10} /> Drag Beat Here
                                                    </span>
                                                )}

                                                {track.noteId && (
                                                    <span className="flex items-center gap-1 text-yellow-500">
                                                        <StickyNote size={10} />
                                                        {MOCK_NOTES.find(n => n.id === track.noteId)?.title || 'Note Attached'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Status Pills */}
                                            <div className="flex items-center gap-2 pl-11 lg:pl-0" onClick={(e) => e.stopPropagation()}>
                                                {track.statusTags.map(tag => (
                                                    <div
                                                        key={tag.label}
                                                        onClick={() => toggleStatusTag(track.id, tag.label)}
                                                        className={`px-2 py-1 rounded flex items-center gap-1 text-[9px] font-bold uppercase cursor-pointer transition-all ${tag.active ? 'bg-green-500/10 text-green-500' : 'bg-neutral-900 text-neutral-600'}`}
                                                    >
                                                        {tag.label === 'Vocals' ? <Mic2 size={10} /> : tag.label === 'Lyrics' ? <FileText size={10} /> : <CheckCircle size={10} />}
                                                        <span className="hidden sm:inline">{tag.label}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Desktop Actions */}
                                            <div className="hidden lg:flex items-center gap-2 pr-2 ml-4 relative">
                                                <button onClick={(e) => e.stopPropagation()} className="p-1.5 hover:bg-white/10 rounded text-neutral-500 hover:text-white" title="Link Contract">
                                                    <ShieldCheck size={14} />
                                                </button>

                                                {/* Click-based Dropdown Menu */}
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === track.id ? null : track.id);
                                                        }}
                                                        className={`p-1.5 rounded transition-colors ${openMenuId === track.id ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/10'}`}
                                                    >
                                                        <MoreVertical size={14} />
                                                    </button>

                                                    {openMenuId === track.id && (
                                                        <div className="absolute right-0 top-full mt-1 w-40 bg-[#0a0a0a] border border-neutral-800 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                            <button onClick={(e) => { e.stopPropagation(); openAttachNoteModal(track.id); }} className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 hover:text-white flex items-center gap-2">
                                                                <StickyNote size={12} /> Attach Note
                                                            </button>
                                                            {track.noteId && (
                                                                <button onClick={(e) => { e.stopPropagation(); removeNoteFromTrack(track.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2">
                                                                    <X size={12} /> Remove Note
                                                                </button>
                                                            )}
                                                            <button onClick={(e) => { e.stopPropagation(); setTrackToDelete(track.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 flex items-center gap-2">
                                                                <Trash2 size={12} /> Delete Track
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="mt-8 p-6 rounded-xl text-center text-neutral-500 text-xs flex flex-col items-center justify-center bg-white/[0.01]">
                                <p className="mb-2">Drag and drop Purchased Beats or Uploaded Files from the right panel onto a track to assign audio.</p>
                                <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-neutral-800 rounded text-[10px]">WAV</span>
                                    <span className="px-2 py-1 bg-neutral-800 rounded text-[10px]">MP3</span>
                                    <span className="px-2 py-1 bg-neutral-800 rounded text-[10px]">ZIP</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'contracts' && (
                        <div className="w-full animate-in fade-in slide-in-from-bottom-2">
                            <div className="w-full">
                                <div className="w-full h-[600px] animate-in fade-in slide-in-from-bottom-2 flex gap-6">
                                    {/* Contracts List Sidebar */}
                                    <div className="w-1/3 bg-neutral-900/30 rounded-xl p-4 flex flex-col">
                                        <div className="flex items-center gap-3 mb-4 p-2">
                                            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Briefcase size={20} /></div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white">Agreements</h3>
                                                <p className="text-xs text-neutral-500">Manage release contracts</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                            {availableContracts.length === 0 ? (
                                                <div className="text-center py-8 text-neutral-500 text-xs">
                                                    No contracts found.
                                                </div>
                                            ) : (
                                                availableContracts.map(contract => (
                                                    <div
                                                        key={contract.id}
                                                        onClick={() => setActiveContract(contract)}
                                                        className={`p-3 border rounded-lg cursor-pointer transition-all group ${
                                                            //@ts-ignore
                                                            activeContract?.id === contract.id
                                                                ? 'bg-blue-500/10 border-blue-500/30'
                                                                : 'bg-white/5 border-transparent hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className={`text-xs font-bold ${
                                                                //@ts-ignore
                                                                activeContract?.id === contract.id ? 'text-blue-400' : 'text-white'
                                                                }`}>{contract.title}</span>
                                                            <Eye size={12} className={
                                                                //@ts-ignore
                                                                activeContract?.id === contract.id ? 'text-blue-400' : 'text-neutral-600'
                                                            } />
                                                        </div>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${contract.status === 'signed'
                                                                ? 'bg-green-500/10 text-green-500'
                                                                : 'bg-yellow-500/10 text-yellow-500'
                                                                }`}>
                                                                {contract.status.toUpperCase()}
                                                            </span>
                                                            <span className="text-[9px] text-neutral-500">{contract.created}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <button className="w-full py-2 mt-4 rounded-lg text-xs font-bold text-neutral-400 hover:text-white flex items-center justify-center gap-2 transition-colors">
                                            <Plus size={14} /> Link New Contract
                                        </button>
                                    </div>

                                    {/* PDF Preview Pane (Right Side) */}
                                    <div className="flex-1 bg-neutral-900 rounded-xl flex flex-col overflow-hidden relative">
                                        {activeContract ? (
                                            <>
                                                {/* Preview Toolbar */}
                                                <div className="h-12 bg-white/[0.02] flex items-center justify-between px-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText size={14} className="text-neutral-400" />
                                                        {/* @ts-ignore */}
                                                        <span className="text-xs font-mono font-bold text-white">{activeContract.title}.pdf</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white"><Printer size={14} /></button>
                                                        <button className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white"><Download size={14} /></button>
                                                        <button className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white"><Share2 size={14} /></button>
                                                    </div>
                                                </div>

                                                {/* PDF Canvas area */}
                                                <div className="flex-1 overflow-y-auto bg-[#1a1a1a] p-8 flex justify-center custom-scrollbar">
                                                    <div className="w-full max-w-[600px] min-h-[800px] bg-white text-black p-8 shadow-2xl relative">
                                                        {/* Mock Document Content */}
                                                        <div className="flex justify-between items-start mb-8 pb-4">
                                                            <div>
                                                                <h1 className="text-xl font-bold uppercase tracking-widest mb-1">Music Access</h1>
                                                                <p className="text-[10px] font-mono text-neutral-500">OFFICIAL AGREEMENT</p>
                                                            </div>
                                                            <div className="text-right">
                                                                {/* @ts-ignore */}
                                                                <p className="text-[10px] uppercase font-bold text-red-600 border-2 border-red-600 px-2 py-1 inline-block rotate-[-5deg] opacity-50">{activeContract.status}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4 font-serif text-[10px] text-neutral-800 leading-relaxed text-justify">
                                                            <p><strong>DATED:</strong> {new Date().toLocaleDateString()}</p>
                                                            <p><strong>BETWEEN:</strong> Music Access Inc. ("Licensor") AND The Undersigned Artist ("Licensee").</p>

                                                            <p className="mt-6">1. <strong>GRANT OF RIGHTS</strong>. Licensor hereby grants to Licensee a non-exclusive, non-transferable license to use the accompanying audio file(s) in accordance with the terms set forth herein.</p>

                                                            <div className="h-2 bg-neutral-100 w-full rounded my-2"></div>
                                                            <div className="h-2 bg-neutral-100 w-full rounded my-2"></div>
                                                            <div className="h-2 bg-neutral-100 w-5/6 rounded my-2"></div>

                                                            <p className="mt-4">2. <strong>ROYALTIES</strong>. Licensee agrees to pay Licensor royalties as specified in the Schedule A attached hereto. Payment shall be made quarterly within thirty (30) days of the end of each calendar quarter.</p>

                                                            <div className="h-2 bg-neutral-100 w-full rounded my-2"></div>
                                                            <div className="h-2 bg-neutral-100 w-11/12 rounded my-2"></div>

                                                            <p className="mt-4">3. <strong>TERM</strong>. This Agreement shall commence on the Effective Date and shall continue in full force and effect for a period of [TERM] unless earlier terminated in accordance with the provisions of this Agreement.</p>

                                                            <div className="h-32 border border-neutral-200 mt-8 p-4 flex flex-col justify-end">
                                                                <div className="w-1/2 pt-1 text-[8px] uppercase font-bold">Authorized Signature</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
                                                <FileText size={48} className="mb-4 text-neutral-700" />
                                                <p className="text-sm font-bold text-neutral-400">No Contract Selected</p>
                                                <p className="text-xs">Select an agreement from the list to preview details.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'files' && (
                        <div className="w-full animate-in fade-in slide-in-from-bottom-2">
                            <div className="bg-neutral-900/30 rounded-xl overflow-hidden">
                                <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-neutral-900/50">
                                    <Folder size={16} className="text-neutral-400" />
                                    <span className="text-sm font-bold text-white">Project Files</span>
                                </div>
                                <div className="p-8 text-center text-neutral-500 text-sm">
                                    <p>No local files uploaded to this project workspace yet.</p>
                                    <button className="mt-4 px-4 py-2 bg-white/5 rounded hover:bg-white/10 text-white text-xs font-bold">Upload Files</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT SIDEBAR (Library / Inspector) */}
                <div className={`
                    fixed bg-[#080808] flex flex-col transform transition-transform duration-300
                    lg:relative lg:translate-x-0 lg:w-[335px] lg:inset-auto lg:z-auto
                    ${showMobileLib ? 'inset-0 z-50 translate-x-0' : 'inset-y-0 right-0 w-[335px] translate-x-full z-30'}
                `}>
                    {/* Mobile Close Button for Lib */}
                    <div className="lg:hidden p-2 flex justify-start">
                        <button onClick={() => setShowMobileLib(false)} className="p-2 text-white"><X size={20} /></button>
                    </div>

                    <div className="p-4">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Library Assets</h3>

                        {/* Filter Tabs */}
                        <div className="flex bg-neutral-900 p-0.5 rounded-lg mb-3">
                            {['All', 'Purchased', 'Uploaded'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setLibraryFilter(f as any)}
                                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-colors ${libraryFilter === f ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-2.5 text-neutral-500" />
                            <input
                                value={librarySearch}
                                onChange={(e) => setLibrarySearch(e.target.value)}
                                className="w-full bg-neutral-900 rounded-lg pl-8 py-2 text-xs text-white focus:outline-none placeholder-neutral-600"
                                placeholder="Search beats, packs..."
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {/* Folder Navigation Header */}
                        {currentLibraryFolderId && !librarySearch && (
                            <button
                                onClick={() => setCurrentLibraryFolderId(currentFolder?.parentId || null)}
                                className="w-full flex items-center gap-2 p-2 mb-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-xs font-bold"
                            >
                                <ArrowLeft size={14} />
                                <span>{currentFolder?.name || 'Back'}</span>
                            </button>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            {filteredLibrary.map(asset => (
                                <div
                                    key={asset.id}
                                    draggable={asset.type !== 'folder'}
                                    onDragStart={(e) => {
                                        if (asset.type !== 'folder') {
                                            setDraggingAsset(asset);
                                        } else {
                                            e.preventDefault();
                                        }
                                    }}
                                    onDragEnd={() => setDraggingAsset(null)}
                                    onClick={() => {
                                        if (asset.type === 'folder') {
                                            setCurrentLibraryFolderId(asset.id);
                                        }
                                    }}
                                    className={`
                                        p-3 rounded-xl transition-all group relative border border-transparent
                                        ${asset.type === 'folder'
                                            ? 'bg-neutral-900 hover:bg-neutral-800 cursor-pointer hover:border-white/10'
                                            : 'bg-white/5 hover:bg-white/10 cursor-grab active:cursor-grabbing hover:border-primary/20'
                                        }
                                    `}
                                >
                                    <div className="mb-3">
                                        <div className={`
                                            w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors
                                            ${asset.type === 'folder' ? 'bg-blue-500/20 text-blue-400' :
                                                asset.type === 'Purchased' ? 'bg-primary/20 text-primary' : 'bg-neutral-800 text-neutral-400'}
                                        `}>
                                            {asset.type === 'folder' ? <Folder size={16} /> :
                                                asset.type === 'Pack' ? <Box size={16} /> : <Music size={16} />}
                                        </div>
                                        <div className="text-xs font-bold text-white truncate pr-2" title={asset.name}>{asset.name}</div>
                                        <div className="text-[9px] text-neutral-500 truncate">{asset.producer === 'Me' ? 'Uploaded' : asset.producer}</div>
                                    </div>

                                    {asset.type !== 'folder' && (
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-[9px] font-mono text-neutral-600 uppercase bg-black/20 px-1 rounded">{asset.fileType}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {filteredLibrary.length === 0 && (
                            <div className="text-center py-12 text-neutral-600 text-xs flex flex-col items-center gap-2">
                                <Folder size={24} className="opacity-20" />
                                <span>No items found</span>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-neutral-900/30">
                        <button className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 transition-colors">
                            <Upload size={14} /> Upload New File
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
    <button
        onClick={onClick}
        className={`px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${active ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500 hover:text-neutral-300'}`}
    >
        {icon}
        {label}
    </button>
);

export default Studio;