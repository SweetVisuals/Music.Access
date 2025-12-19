
import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { LayoutGrid, List, Heart, Disc, Clock, Play, Search, Plus } from 'lucide-react';
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

                <div className="w-full md:w-auto overflow-x-auto pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800 min-w-max">
                        <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All" />
                        <TabButton active={activeTab === 'liked'} onClick={() => setActiveTab('liked')} label="Liked" icon={<Heart size={12} />} />
                        <TabButton active={activeTab === 'purchased'} onClick={() => setActiveTab('purchased')} label="Purchased" icon={<Disc size={12} />} />
                        <TabButton active={activeTab === 'playlists'} onClick={() => setActiveTab('playlists')} label="Playlists" icon={<List size={12} />} />
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

const TabButton = ({ active, onClick, label, icon }: any) => (
    <button
        onClick={onClick}
        className={`
            px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all
            ${active
                ? 'bg-neutral-800 text-white shadow'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
            }
        `}
    >
        {icon}
        {label}
    </button>
);

export default LibraryPage;