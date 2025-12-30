
import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { LayoutGrid, List, Heart, Disc, Clock, Play, Search, Plus, ChevronDown } from 'lucide-react';
import ProjectCard from './ProjectCard';
import { getUserProfile } from '../services/supabaseService';

interface LibraryPageProps {
    currentTrackId: string | null;
    isPlaying: boolean;
    currentProject: Project | null;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
}

const LibraryPage: React.FC<LibraryPageProps> = ({
    currentTrackId,
    isPlaying,
    currentProject,
    onPlayTrack,
    onTogglePlay
}) => {
    const [activeTab, setActiveTab] = useState<'all' | 'liked' | 'purchased' | 'playlists'>('all');
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const profile = await getUserProfile();
                setUserProfile(profile);
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserProfile();
    }, []);

    // Filter projects based on active tab
    const displayProjects = userProfile?.projects || [];

    return (
        <div className="w-full max-w-[1600px] mx-auto pb-32 pt-4 lg:pt-6 px-4 lg:px-8 animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 lg:mb-8 gap-4">
                <div>
                    <h1 className="text-xl lg:text-3xl font-black text-white mb-1">My Library</h1>
                    <p className="text-neutral-500 text-xs lg:text-sm">Your collection of beats, songs, and playlists.</p>
                </div>

                <div className="w-auto -mx-4 px-4 md:w-auto md:mx-0 md:px-0">
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
                                onClick={() => setActiveTab('liked')}
                                className={`
                                    flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                    ${activeTab === 'liked' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                                `}
                            >
                                <Heart size={14} className={activeTab === 'liked' ? 'text-primary' : ''} />
                                <span className="text-[9px] font-bold uppercase tracking-tight">Liked</span>
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
                        <TabButton active={activeTab === 'liked'} onClick={() => setActiveTab('liked')} label="Liked" icon={<Heart size={10} />} mobileCompact />
                        <TabButton active={activeTab === 'purchased'} onClick={() => setActiveTab('purchased')} label="Bought" icon={<Disc size={10} />} mobileCompact />
                        <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} label="Lists" icon={<List size={10} />} mobileCompact />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6 bg-[#0a0a0a] border border-neutral-800 p-2 rounded-xl">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input className="w-full bg-transparent border-none text-xs text-white pl-9 focus:outline-none" placeholder="Search your library..." />
                </div>
                <div className="flex items-center gap-2 px-2">
                    <button className="p-1.5 hover:bg-white/5 rounded text-neutral-400 hover:text-white"><LayoutGrid size={16} /></button>
                    <button className="p-1.5 hover:bg-white/5 rounded text-neutral-400 hover:text-white"><List size={16} /></button>
                </div>
            </div>

            {activeTab === 'playlists' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <button className="h-[200px] border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-neutral-500 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group bg-white/[0.01]">
                        <div className="p-4 bg-neutral-900 rounded-full mb-3 group-hover:scale-110 transition-transform">
                            <Plus size={24} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wide">Create Playlist</span>
                    </button>

                    <div className="group relative h-[200px] bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden cursor-pointer hover:border-neutral-600">
                        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                            <div className="grid grid-cols-2 gap-1 p-4 opacity-50 rotate-12 scale-110">
                                <div className="w-12 h-12 bg-neutral-800 rounded"></div>
                                <div className="w-12 h-12 bg-neutral-800 rounded"></div>
                                <div className="w-12 h-12 bg-neutral-800 rounded"></div>
                                <div className="w-12 h-12 bg-neutral-800 rounded"></div>
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex flex-col justify-end p-4">
                            <h3 className="font-bold text-white text-lg">Late Night Drives</h3>
                            <p className="text-xs text-neutral-400">12 Tracks • 45m</p>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 shadow-lg">
                                <Play size={20} className="text-black ml-1" />
                            </div>
                        </div>
                    </div>
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center py-32">
                    <div className="text-center">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-neutral-500 font-mono text-xs">Loading your library...</p>
                    </div>
                </div>
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