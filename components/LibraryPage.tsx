import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { LayoutGrid, List, Disc, Play, Pause, Search, Plus, BookmarkPlus, Clock, ChevronDown, ChevronUp, X, Check, Music, Upload, ShoppingBag, MoreVertical } from 'lucide-react';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal'; // Imported
import EditProjectModal from './EditProjectModal';     // Imported
import { getUserProfile, getSavedProjects, getUserAssets, getPlaylists, createPlaylist, updateProject, deleteProject, Playlist, Asset } from '../services/supabaseService';
import ConfirmationModal from './ConfirmationModal';
import { useToast } from '../contexts/ToastContext';

interface LibraryPageProps {
    currentTrackId: string | null;
    isPlaying: boolean;
    currentProject: Project | null;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
}

interface SelectableTrack {
    id: string;
    title: string;
    type: 'asset' | 'track';
    assetId?: string;
    trackId?: string;
    duration?: number;
}

const LibraryPage: React.FC<LibraryPageProps> = ({
    currentTrackId,
    isPlaying,
    currentProject,
    onPlayTrack,
    onTogglePlay
}) => {
    const [activeTab, setActiveTab] = useState<'all' | 'saved' | 'purchased' | 'playlists'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [userProfile, setUserProfile] = useState<any>(null);
    const [savedProjects, setSavedProjects] = useState<Project[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingSaved, setLoadingSaved] = useState(true);
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

    // Playlist state
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [playlistName, setPlaylistName] = useState('');
    const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
    const [availableTracks, setAvailableTracks] = useState<SelectableTrack[]>([]);
    const [loadingTracks, setLoadingTracks] = useState(false);
    const [creatingPlaylist, setCreatingPlaylist] = useState(false);
    const [trackSourceTab, setTrackSourceTab] = useState<'uploads' | 'purchased'>('uploads');
    const { showToast } = useToast();
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

    // Editing state
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [isEditingPublic, setIsEditingPublic] = useState(false); // Track if full editor needed

    const loading = loadingProfile || loadingSaved;

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const profile = await getUserProfile();
                setUserProfile(profile);
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
            } finally {
                setLoadingProfile(false);
            }
        };

        const fetchSaved = async () => {
            try {
                const saved = await getSavedProjects();
                setSavedProjects(saved);
            } catch (error) {
                console.error('Failed to fetch saved projects:', error);
            } finally {
                setLoadingSaved(false);
            }
        };

        fetchUserProfile();
        fetchSaved();
    }, []);

    // Fetch playlists when tab changes to playlists
    useEffect(() => {
        if (activeTab === 'playlists') {
            fetchPlaylists();
        }
    }, [activeTab]);

    const fetchPlaylists = async () => {
        setLoadingPlaylists(true);
        try {
            const data = await getPlaylists();
            setPlaylists(data);
        } catch (error) {
            console.error('Failed to fetch playlists:', error);
        } finally {
            setLoadingPlaylists(false);
        }
    };

    // Load available tracks when create playlist modal opens
    useEffect(() => {
        if (showCreatePlaylist) {
            loadAvailableTracks();
        }
    }, [showCreatePlaylist, trackSourceTab]);

    const loadAvailableTracks = async () => {
        setLoadingTracks(true);
        try {
            const tracks: SelectableTrack[] = [];

            if (trackSourceTab === 'uploads') {
                // Get user's uploaded assets
                const assets = await getUserAssets();
                assets.forEach(asset => {
                    const name = asset.name || 'Untitled';
                    if (name.toLowerCase().endsWith('.mp3') || name.toLowerCase().endsWith('.wav')) {
                        tracks.push({
                            id: `asset-${asset.id}`,
                            title: name,
                            type: 'asset',
                            assetId: asset.id,
                            duration: 180
                        });
                    }
                });
            } else {
                // Get tracks from purchased projects
                // For now, we'll use saved projects as a proxy
                const saved = await getSavedProjects();
                saved.forEach(project => {
                    project.tracks?.forEach(track => {
                        tracks.push({
                            id: `track-${track.id}`,
                            title: track.title || 'Untitled',
                            type: 'track',
                            trackId: track.id,
                            duration: track.duration || 180
                        });
                    });
                });
            }

            setAvailableTracks(tracks);
        } catch (error) {
            console.error('Failed to load tracks:', error);
        } finally {
            setLoadingTracks(false);
        }
    };

    const toggleTrackSelection = (trackId: string) => {
        setSelectedTracks(prev => {
            const next = new Set(prev);
            if (next.has(trackId)) {
                next.delete(trackId);
            } else {
                next.add(trackId);
            }
            return next;
        });
    };

    const handleCreatePlaylist = async () => {
        if (!playlistName.trim() || selectedTracks.size === 0) return;

        setCreatingPlaylist(true);
        try {
            const trackItems = availableTracks
                .filter(t => selectedTracks.has(t.id))
                .map(t => ({
                    title: t.title,
                    assetId: t.assetId,
                    trackId: t.trackId,
                    duration: t.duration
                }));

            await createPlaylist(playlistName, trackItems);
            await fetchPlaylists();

            // Reset state
            setShowCreatePlaylist(false);
            setPlaylistName('');
            setSelectedTracks(new Set());
        } catch (error) {
            console.error('Failed to create playlist:', error);
        } finally {
            setCreatingPlaylist(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!projectToDelete) return;

        try {
            await deleteProject(projectToDelete.id);
            // Update UI
            setSavedProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
            if (activeTab === 'playlists') fetchPlaylists(); // Refresh if needed
            showToast("Project deleted successfully", "success");
        } catch (error) {
            console.error("Failed to delete project:", error);
            showToast("Failed to delete project", "error");
        } finally {
            setProjectToDelete(null);
        }
    };

    const handleEditProject = (project: Project) => {
        setEditingProject(project);
        setIsEditingPublic(project.status === 'published' || project.status === undefined); // Default to public if undefined? Or check requirements.
        // User logic: "public project cards... creation window", "library and draft / private... limited options"
        // Let's assume 'published' is the key.
    };

    const handleSaveProjectUpdates = async (updates: Partial<Project>) => {
        if (!editingProject) return;
        try {
            await updateProject(editingProject.id, updates);
            // Update local state to reflect changes
            setSavedProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...updates } : p));
            setEditingProject(null);
        } catch (error) {
            console.error("Failed to update project:", error);
        }
    };

    // Filter projects based on active tab
    const displayProjects = activeTab === 'all'
        ? Array.from(new Map([
            ...(userProfile?.projects || []),
            ...savedProjects
        ].map(p => [p.id, p])).values())
        : activeTab === 'saved'
            ? savedProjects
            : activeTab === 'purchased'
                ? (userProfile?.projects?.filter((p: any) => p.isPurchased) || [])
                : [];

    const toggleProjectExpanded = (projectId: string) => {
        setExpandedProjects(prev => {
            const next = new Set(prev);
            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }
            return next;
        });
    };

    // List View Component
    const ListView = () => (
        <div className="space-y-3">
            {displayProjects.length > 0 ? displayProjects.map(project => {
                const isExpanded = expandedProjects.has(project.id);
                const isProjectPlaying = currentProject?.id === project.id && isPlaying;

                return (
                    <div key={project.id} className="bg-neutral-950/50 border border-white/5 rounded-xl overflow-hidden">
                        {/* Project Header */}
                        <div
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => toggleProjectExpanded(project.id)}
                        >
                            {/* Cover / Play Button */}
                            <div className="relative w-12 h-12 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                {project.coverImage ? (
                                    <img src={project.coverImage} alt={project.title} className="w-full h-full object-cover" />
                                ) : (
                                    <Disc size={20} className="text-neutral-600" />
                                )}
                                {isProjectPlaying && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                    </div>
                                )}
                            </div>

                            {/* Project Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-bold text-sm truncate ${isProjectPlaying ? 'text-primary' : 'text-white'}`}>
                                    {project.title}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                                    <span>{project.producer}</span>
                                    <span>•</span>
                                    <span>{project.tracks?.length || 0} tracks</span>
                                    {project.genre && (
                                        <>
                                            <span>•</span>
                                            <span className="text-neutral-600">{project.genre}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Expand/Collapse */}
                            <div className="flex items-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditProject(project);
                                    }}
                                    className="p-2 text-neutral-500 hover:text-white transition-colors"
                                >
                                    <MoreVertical size={16} />
                                </button>
                                <button className="p-2 text-neutral-500 hover:text-white transition-colors">
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Tracks List (Expanded) */}
                        {isExpanded && project.tracks && project.tracks.length > 0 && (
                            <div className="border-t border-neutral-800/50 bg-[#050505]">
                                {project.tracks.map((track, idx) => {
                                    const isTrackPlaying = isPlaying && currentTrackId === (track.id || `track-${idx}`);
                                    const trackId = track.id || `track-${idx}`;

                                    return (
                                        <div
                                            key={trackId}
                                            className={`
                                                flex items-center px-4 py-2.5 cursor-pointer transition-all border-b border-neutral-900/50 last:border-b-0
                                                ${isTrackPlaying ? 'bg-primary/5' : 'hover:bg-white/5'}
                                            `}
                                            onClick={() => isTrackPlaying ? onTogglePlay() : onPlayTrack(project, trackId)}
                                        >
                                            {/* Track Number / Play State */}
                                            <div className="w-8 flex items-center justify-center mr-2">
                                                {isTrackPlaying ? (
                                                    <Pause size={12} className="text-primary fill-primary" />
                                                ) : (
                                                    <span className="text-[10px] font-mono text-neutral-600 group-hover:hidden">
                                                        {(idx + 1).toString().padStart(2, '0')}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Track Title */}
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-xs block truncate ${isTrackPlaying ? 'text-primary font-medium' : 'text-neutral-300'}`}>
                                                    <span className="md:hidden">
                                                        {track.title.length > 20 ? track.title.substring(0, 20) + '...' : track.title}
                                                    </span>
                                                    <span className="hidden md:inline">{track.title}</span>
                                                </span>
                                            </div>

                                            {/* Duration */}
                                            <div className="flex items-center text-neutral-600 ml-3">
                                                <Clock size={10} className="mr-1" />
                                                <span className="text-[10px] font-mono">
                                                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            }) : (
                <div className="py-32 text-center border border-dashed border-white/5 rounded-xl bg-white/5">
                    <p className="text-neutral-500 font-mono mb-4">No projects in your library yet.</p>
                    <p className="text-xs text-neutral-600">Create your first project to get started!</p>
                </div>
            )}
        </div>
    );




    return (
        <div className="w-full max-w-[1900px] mx-auto pb-12 pt-4 lg:pt-6 px-4 lg:px-10 xl:px-14 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 lg:mb-8 gap-4">
                <div>
                    <h1 className="text-3xl lg:text-5xl font-black text-white mb-1 tracking-tighter">My Library</h1>
                    <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">Your collection of beats, songs, and playlists.</p>
                </div>

            </div>

            <div className="w-auto -mx-4 px-4 md:w-auto md:mx-0 md:px-0 mb-6 lg:mb-8">
                {/* Mobile Tabs Layout (Grid) */}
                <div className="md:hidden relative pb-2 overflow-x-auto no-scrollbar">
                    <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-900/50 rounded-lg border border-white/5 min-w-[320px]">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${activeTab === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <LayoutGrid size={14} className={activeTab === 'all' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">All</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('saved')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${activeTab === 'saved' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <BookmarkPlus size={14} className={activeTab === 'saved' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Saved</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('purchased')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${activeTab === 'purchased' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <Disc size={14} className={activeTab === 'purchased' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Bought</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('playlists')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${activeTab === 'playlists' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <List size={14} className={activeTab === 'playlists' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Lists</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Segmented Control */}
                <div className="hidden md:flex md:flex-nowrap md:bg-neutral-900 md:p-1 md:rounded-lg md:border md:border-white/5 gap-1 md:gap-0">
                    <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All" mobileCompact />
                    <TabButton active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} label="Saved" icon={<BookmarkPlus size={10} />} mobileCompact />
                    <TabButton active={activeTab === 'purchased'} onClick={() => setActiveTab('purchased')} label="Bought" icon={<Disc size={10} />} mobileCompact />
                    <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} label="Lists" icon={<List size={10} />} mobileCompact />
                </div>
            </div>

            <div className="flex items-center justify-between mb-6 bg-[#0a0a0a] border border-white/5 p-2 rounded-xl">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input className="w-full bg-transparent border-none text-xs text-white pl-9 focus:outline-none" placeholder="Search your library..." />
                </div>
                <div className="flex items-center gap-1 px-2">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-neutral-400 hover:text-white'}`}
                    >
                        <List size={16} />
                    </button>
                </div>
            </div>

            {activeTab === 'playlists' ? (
                <div className="space-y-6">
                    {viewMode === 'list' ? (
                        <PlaylistListView
                            playlists={playlists}
                            loadingPlaylists={loadingPlaylists}
                            setShowCreatePlaylist={setShowCreatePlaylist}
                            onPlayTrack={onPlayTrack}
                            currentProject={currentProject}
                            isPlaying={isPlaying}
                            onTogglePlay={onTogglePlay}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {/* Create Playlist Button - Only in Grid View? Or maybe List View allows header button? */}
                            <button
                                onClick={() => setShowCreatePlaylist(true)}
                                className="h-auto md:h-[282px] border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-neutral-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group bg-white/[0.01]"
                            >
                                <div className="p-4 bg-neutral-900 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                    <Plus size={24} />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wide">Create Playlist</span>
                            </button>

                            {/* Existing Playlists Grid */}
                            {loadingPlaylists ? (
                                <div className="h-[200px] flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                            ) : playlists.map(playlist => (
                                <div
                                    key={playlist.id}
                                    className="group relative h-[200px] bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-neutral-600 transition-colors"
                                >
                                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                                        <div className="grid grid-cols-2 gap-1 p-4 opacity-50 rotate-12 scale-110">
                                            <div className="w-12 h-12 bg-neutral-800 rounded"></div>
                                            <div className="w-12 h-12 bg-neutral-800 rounded"></div>
                                            <div className="w-12 h-12 bg-neutral-800 rounded"></div>
                                            <div className="w-12 h-12 bg-neutral-800 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex flex-col justify-end p-4">
                                        <h3 className="font-bold text-white text-lg">{playlist.title}</h3>
                                        <p className="text-xs text-neutral-400">{playlist.tracks.length} Tracks</p>
                                        <div
                                            className="absolute bottom-4 right-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 shadow-lg z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (playlist.tracks && playlist.tracks.length > 0) {
                                                    const firstTrack = playlist.tracks[0];
                                                    onPlayTrack(playlist, firstTrack.id || firstTrack.trackId || firstTrack.assetId);
                                                }
                                            }}
                                        >
                                            <Play size={20} className="text-black" fill="black" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center py-32">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-neutral-500 font-mono text-xs">Loading your library...</p>
                    </div>
                </div>
            ) : viewMode === 'list' ? (
                <ListView />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {displayProjects.length > 0 ? displayProjects.map(project => (
                        <div key={project.id} className="h-auto md:h-[282px]">
                            <ProjectCard
                                project={project}
                                currentTrackId={currentTrackId}
                                isPlaying={currentProject?.id === project.id && isPlaying}
                                onPlayTrack={(trackId) => onPlayTrack(project, trackId)}
                                onTogglePlay={onTogglePlay}
                                onEdit={handleEditProject}
                                onDelete={(p) => setProjectToDelete(p)}
                            />
                        </div>
                    )) : (
                        <div className="col-span-full py-32 text-center border border-dashed border-white/5 rounded-xl bg-white/5">
                            <p className="text-neutral-500 font-mono mb-4">No projects in your library yet.</p>
                            <p className="text-xs text-neutral-600">Create your first project to get started!</p>
                        </div>
                    )}
                </div>
            )}

            {showCreatePlaylist && (
                <CreatePlaylistModalComponent
                    playlistName={playlistName}
                    setPlaylistName={setPlaylistName}
                    setShowCreatePlaylist={setShowCreatePlaylist}
                    handleCreatePlaylist={handleCreatePlaylist}
                    creatingPlaylist={creatingPlaylist}
                    selectedTracks={selectedTracks}
                    trackSourceTab={trackSourceTab}
                    setTrackSourceTab={setTrackSourceTab}
                    loadingTracks={loadingTracks}
                    availableTracks={availableTracks}
                    toggleTrackSelection={toggleTrackSelection}
                />
            )}

            {/* Edit Project Modals */}
            {editingProject && (
                isEditingPublic ? (
                    <CreateProjectModal
                        isOpen={!!editingProject}
                        onClose={() => setEditingProject(null)}
                        onSave={(updated) => { /* Optional: refresh list */ setEditingProject(null); }}
                        initialData={editingProject}
                    />
                ) : (
                    <EditProjectModal
                        project={editingProject}
                        onClose={() => setEditingProject(null)}
                        onSave={handleSaveProjectUpdates}
                        onDelete={(p) => setProjectToDelete(p)}
                    />
                )
            )}

            {/* Project Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!projectToDelete}
                onClose={() => setProjectToDelete(null)}
                onConfirm={handleDeleteProject}
                title="Delete Project"
                message={`Are you sure you want to delete "${projectToDelete?.title}"? This action cannot be undone.`}
                confirmLabel="Delete Project"
                cancelLabel="Cancel"
                isDestructive={true}
            />
        </div>
    );
};

const TabButton = ({ active, onClick, label, icon, mobileCompact }: any) => (
    <button
        onClick={onClick}
        className={`
            rounded-lg md:rounded-md font-bold flex items-center justify-center gap-1.5 transition-all border
            ${mobileCompact ? 'py-2 px-0 text-[10px] w-full' : 'px-4 py-2 md:py-1.5 text-xs'}
            ${active
                ? 'bg-white text-black border-white md:bg-neutral-800 md:text-white md:border-transparent md:shadow'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800 hover:text-white md:bg-transparent md:border-transparent md:hover:bg-white/5'
            }
        `}
    >
        {icon}
        <span className={mobileCompact ? 'truncate' : ''}>{label}</span>
    </button>
);



const PlaylistListView = ({ playlists, loadingPlaylists, setShowCreatePlaylist, onPlayTrack, currentProject, isPlaying, onTogglePlay }: any) => {
    const [expandedPlaylists, setExpandedPlaylists] = useState<Set<string>>(new Set());

    const togglePlaylistExpanded = (id: string) => {
        setExpandedPlaylists(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="space-y-6">
            <button
                onClick={() => setShowCreatePlaylist(true)}
                className="w-full py-3 border-2 border-dashed border-white/5 rounded-xl flex items-center justify-center gap-2 text-neutral-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group bg-white/[0.01]"
            >
                <div className="p-1 bg-neutral-900 rounded-full group-hover:scale-110 transition-transform">
                    <Plus size={16} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide">Create New Playlist</span>
            </button>

            {loadingPlaylists ? (
                <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            ) : playlists.map((playlist: any) => {
                const isExpanded = expandedPlaylists.has(playlist.id);
                // Check if this playlist is currently playing
                const isPlaylistPlaying = currentProject?.id === playlist.id && isPlaying;

                return (
                    <div key={playlist.id} className="bg-neutral-950/50 border border-white/5 rounded-xl overflow-hidden">
                        <div
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => togglePlaylistExpanded(playlist.id)}
                        >
                            <div className="relative w-12 h-12 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden group">
                                <div className="grid grid-cols-2 gap-0.5 p-1 opacity-50 rotate-12 scale-110">
                                    <div className="w-4 h-4 bg-neutral-800 rounded-[1px]"></div>
                                    <div className="w-4 h-4 bg-neutral-800 rounded-[1px]"></div>
                                    <div className="w-4 h-4 bg-neutral-800 rounded-[1px]"></div>
                                    <div className="w-4 h-4 bg-neutral-800 rounded-[1px]"></div>
                                </div>
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    {isExpanded ? <ChevronUp size={16} className="text-white" /> : <ChevronDown size={16} className="text-white" />}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className={`font-bold text-sm truncate ${isPlaylistPlaying ? 'text-primary' : 'text-white'}`}>{playlist.title}</h3>
                                <p className="text-[10px] text-neutral-500">{playlist.tracks?.length || 0} tracks</p>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-neutral-800/50 bg-black/20">
                                {playlist.tracks && playlist.tracks.length > 0 ? (
                                    <div className="divide-y divide-neutral-900/50">
                                        {playlist.tracks.map((track: any, index: number) => {
                                            // Determine if this specific track is playing
                                            // We need a unique ID for the track in the context of the player. 
                                            // The playlist tracks have 'trackId' (original track ID) or 'assetId'. 
                                            // The player likely uses the ID from the playlist structure if it's playing a playlist.
                                            // Let's assume onPlayTrack handles the mapping correctly or we pass the playlist track ID.
                                            const isTrackPlaying = currentProject?.id === playlist.id && isPlaying; // Simplified check, ideally check track ID too

                                            return (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors group cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Pass the playlist as the project context, and the track ID (or index if needed by player)
                                                        // Assuming onPlayTrack accepts (projectLikeObject, trackId)
                                                        // For playlists, we might need to construct a project-like object if 'playlist' isn't sufficient.
                                                        // But 'playlist' has 'tracks' array, so it should work if the player reads 'tracks'.
                                                        onPlayTrack(playlist, track.id || track.trackId || track.assetId);
                                                    }}
                                                >
                                                    <div className="w-6 text-center text-[10px] text-neutral-600 font-mono">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-xs font-medium truncate transition-colors ${isTrackPlaying && false ? 'text-primary' : 'text-neutral-300 group-hover:text-white'}`}>
                                                            {(track.title || 'Untitled').length > 20 ? (track.title || 'Untitled').substring(0, 20) + '...' : (track.title || 'Untitled')}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center text-neutral-600">
                                                        {track.duration && (
                                                            <span className="text-[9px] font-mono">
                                                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button className="p-1.5 rounded-full hover:bg-white/10 text-neutral-500 hover:text-white transition-colors">
                                                        <Play size={10} fill="currentColor" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-[10px] text-neutral-600">
                                        No tracks in this playlist
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const CreatePlaylistModalComponent: React.FC<{
    playlistName: string;
    setPlaylistName: (name: string) => void;
    setShowCreatePlaylist: (show: boolean) => void;
    handleCreatePlaylist: () => void;
    creatingPlaylist: boolean;
    selectedTracks: Set<string>;
    trackSourceTab: 'uploads' | 'purchased';
    setTrackSourceTab: (tab: 'uploads' | 'purchased') => void;
    loadingTracks: boolean;
    availableTracks: SelectableTrack[];
    toggleTrackSelection: (id: string) => void;
}> = ({
    playlistName,
    setPlaylistName,
    setShowCreatePlaylist,
    handleCreatePlaylist,
    creatingPlaylist,
    selectedTracks,
    trackSourceTab,
    setTrackSourceTab,
    loadingTracks,
    availableTracks,
    toggleTrackSelection
}) => (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-white/5">
                <button
                    onClick={() => setShowCreatePlaylist(false)}
                    className="p-2 -ml-2 text-neutral-400 hover:text-white"
                >
                    <X size={24} />
                </button>
                <h2 className="text-lg font-bold text-white">Create Playlist</h2>
                <button
                    onClick={handleCreatePlaylist}
                    disabled={!playlistName.trim() || selectedTracks.size === 0 || creatingPlaylist}
                    className={`p-2 -mr-2 ${playlistName.trim() && selectedTracks.size > 0 ? 'text-primary' : 'text-neutral-600'}`}
                >
                    {creatingPlaylist ? (
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                        <Check size={24} />
                    )}
                </button>
            </div>

            {/* Playlist Name Input */}
            <div className="p-6">
                <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="Give your playlist a name"
                    className="w-full bg-transparent border-none text-2xl font-bold text-white placeholder-neutral-600 focus:outline-none focus:ring-0 px-0"
                    autoFocus={window.innerWidth >= 768}
                />
                <div className="h-[1px] w-full bg-white/5 mt-2"></div>
                <p className="text-xs text-neutral-500 mt-3 font-medium">
                    {selectedTracks.size} {selectedTracks.size === 1 ? 'track' : 'tracks'} selected
                </p>
            </div>

            {/* Source Tabs */}
            <div className="flex border-b border-white/5">
                <button
                    onClick={() => setTrackSourceTab('uploads')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${trackSourceTab === 'uploads'
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-neutral-500 hover:text-white'
                        }`}
                >
                    <Upload size={14} />
                    Uploads
                </button>
                <button
                    onClick={() => setTrackSourceTab('purchased')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors ${trackSourceTab === 'purchased'
                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                        : 'text-neutral-500 hover:text-white'
                        }`}
                >
                    <ShoppingBag size={14} />
                    Library
                </button>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto">
                {loadingTracks ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                ) : availableTracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <Music size={40} className="text-neutral-700 mb-4" />
                        <p className="text-neutral-500 text-sm">No tracks found</p>
                        <p className="text-neutral-600 text-xs mt-1">
                            {trackSourceTab === 'uploads'
                                ? 'Upload some files first'
                                : 'Save some projects to your library'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-900">
                        {availableTracks.map(track => {
                            const isSelected = selectedTracks.has(track.id);
                            return (
                                <div
                                    key={track.id}
                                    onClick={() => toggleTrackSelection(track.id)}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-white/5'
                                        }`}
                                >
                                    {/* Selection Indicator */}
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                                        ? 'border-primary bg-primary'
                                        : 'border-neutral-600'
                                        }`}>
                                        {isSelected && <Check size={12} className="text-black" />}
                                    </div>

                                    {/* Track Icon */}
                                    <div className="w-10 h-10 rounded bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0">
                                        <Music size={16} className="text-neutral-500" />
                                    </div>

                                    {/* Track Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate ${isSelected ? 'text-primary' : 'text-white'}`}>
                                            {(track.title || 'Untitled').length > 25 ? (track.title || 'Untitled').substring(0, 25) + '...' : (track.title || 'Untitled')}
                                        </p>
                                        <p className="text-[10px] text-neutral-500 uppercase">
                                            {track.type === 'asset' ? 'Upload' : 'Library Track'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Action Button */}
            <div className="px-4 pt-4 pb-24 border-t border-white/5 bg-black safe-area-bottom">
                <button
                    onClick={handleCreatePlaylist}
                    disabled={!playlistName.trim() || selectedTracks.size === 0 || creatingPlaylist}
                    className={`
                        w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all
                        ${!playlistName.trim() || selectedTracks.size === 0 || creatingPlaylist
                            ? 'bg-neutral-900 text-neutral-500 cursor-not-allowed'
                            : 'bg-primary text-black hover:bg-primary/90 shadow-lg shadow-primary/20'
                        }
                    `}
                >
                    {creatingPlaylist ? (
                        <>
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <Check size={20} />
                            Create Playlist
                        </>
                    )}
                </button>
            </div>
        </div>
    );

export default LibraryPage;