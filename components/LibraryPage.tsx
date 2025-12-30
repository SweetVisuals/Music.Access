
import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { LayoutGrid, List, Disc, Play, Pause, Search, Plus, BookmarkPlus, Clock, ChevronDown, ChevronUp, X, Check, Music, Upload, ShoppingBag } from 'lucide-react';
import ProjectCard from './ProjectCard';
import { getUserProfile, getSavedProjects, getUserAssets, getPlaylists, createPlaylist, Playlist, Asset } from '../services/supabaseService';

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
                    tracks.push({
                        id: `asset-${asset.id}`,
                        title: asset.name,
                        type: 'asset',
                        assetId: asset.id,
                        duration: 180
                    });
                });
            } else {
                // Get tracks from purchased projects
                // For now, we'll use saved projects as a proxy
                const saved = await getSavedProjects();
                saved.forEach(project => {
                    project.tracks?.forEach(track => {
                        tracks.push({
                            id: `track-${track.id}`,
                            title: track.title,
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
                    <div key={project.id} className="bg-neutral-950/50 border border-neutral-800/60 rounded-xl overflow-hidden">
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
                            <button className="p-2 text-neutral-500 hover:text-white transition-colors">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>

                        {/* Tracks List (Expanded) */}
                        {isExpanded && project.tracks && project.tracks.length > 0 && (
                            <div className="border-t border-neutral-800/50 bg-[#050505]">
                                {project.tracks.map((track, idx) => {
                                    const isTrackPlaying = isPlaying && currentTrackId === track.id;

                                    return (
                                        <div
                                            key={track.id}
                                            className={`
                                                flex items-center px-4 py-2.5 cursor-pointer transition-all border-b border-neutral-900/50 last:border-b-0
                                                ${isTrackPlaying ? 'bg-primary/5' : 'hover:bg-white/5'}
                                            `}
                                            onClick={() => isTrackPlaying ? onTogglePlay() : onPlayTrack(project, track.id)}
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
                <div className="py-32 text-center border border-dashed border-neutral-800 rounded-xl bg-white/5">
                    <p className="text-neutral-500 font-mono mb-4">No projects in your library yet.</p>
                    <p className="text-xs text-neutral-600">Create your first project to get started!</p>
                </div>
            )}
        </div>
    );

    // Create Playlist Modal (Full-screen on mobile)
    const CreatePlaylistModal = () => (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
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
            <div className="p-4 border-b border-neutral-800">
                <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="Playlist name..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-primary/50"
                    autoFocus
                />
                <p className="text-xs text-neutral-500 mt-2">
                    {selectedTracks.size} track{selectedTracks.size !== 1 ? 's' : ''} selected
                </p>
            </div>

            {/* Source Tabs */}
            <div className="flex border-b border-neutral-800">
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
                                            {track.title.length > 25 ? track.title.substring(0, 25) + '...' : track.title}
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
        </div>
    );

    return (
        <div className="w-full max-w-[1600px] mx-auto pb-32 pt-4 lg:pt-6 px-4 lg:px-8 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 lg:mb-8 gap-4">
                <div>
                    <h1 className="text-xl lg:text-3xl font-black text-white mb-1">My Library</h1>
                    <p className="text-neutral-500 text-xs lg:text-sm">Your collection of beats, songs, and playlists.</p>
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
                <div className="hidden md:flex md:flex-nowrap md:bg-neutral-900 md:p-1 md:rounded-lg md:border md:border-neutral-800 gap-1 md:gap-0">
                    <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All" mobileCompact />
                    <TabButton active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} label="Saved" icon={<BookmarkPlus size={10} />} mobileCompact />
                    <TabButton active={activeTab === 'purchased'} onClick={() => setActiveTab('purchased')} label="Bought" icon={<Disc size={10} />} mobileCompact />
                    <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} label="Lists" icon={<List size={10} />} mobileCompact />
                </div>
            </div>

            <div className="flex items-center justify-between mb-6 bg-[#0a0a0a] border border-neutral-800 p-2 rounded-xl">
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
                    {/* Create Playlist Button */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        <button
                            onClick={() => setShowCreatePlaylist(true)}
                            className="h-[200px] border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-neutral-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group bg-white/[0.01]"
                        >
                            <div className="p-4 bg-neutral-900 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                <Plus size={24} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wide">Create Playlist</span>
                        </button>

                        {/* Existing Playlists */}
                        {loadingPlaylists ? (
                            <div className="h-[200px] flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : playlists.map(playlist => (
                            <div
                                key={playlist.id}
                                className="group relative h-[200px] bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden cursor-pointer hover:border-neutral-600 transition-colors"
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
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 shadow-lg">
                                        <Play size={20} className="text-black ml-1" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayProjects.length > 0 ? displayProjects.map(project => (
                        <div key={project.id} className="h-[340px]">
                            <ProjectCard
                                project={project}
                                currentTrackId={currentTrackId}
                                isPlaying={currentProject?.id === project.id && isPlaying}
                                onPlayTrack={(trackId) => onPlayTrack(project, trackId)}
                                onTogglePlay={onTogglePlay}
                            />
                        </div>
                    )) : (
                        <div className="col-span-full py-32 text-center border border-dashed border-neutral-800 rounded-xl bg-white/5">
                            <p className="text-neutral-500 font-mono mb-4">No projects in your library yet.</p>
                            <p className="text-xs text-neutral-600">Create your first project to get started!</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Playlist Modal */}
            {showCreatePlaylist && <CreatePlaylistModal />}

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

export default LibraryPage;