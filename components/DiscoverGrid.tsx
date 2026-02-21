import React from 'react';
import { Project, FilterState, TalentProfile, Service } from '../types';
import ProjectCard, { ProjectSkeleton } from './ProjectCard';
import { UserPlus, MessageCircle, Verified } from 'lucide-react';
import { UserProfile } from '../types';

interface DiscoverGridProps {
    loading: boolean;
    error: string | null;
    projects: Project[];
    filteredProjects: Project[];
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    searchedProfiles: TalentProfile[];
    searchedServices: Service[];
    handleNavigate: (path: string) => void;
    currentTrackId: string | null;
    currentProject: Project | null;
    isPlaying: boolean;
    handlePlayTrack: (project: Project, trackId: string) => void;
    handleTogglePlay: () => void;
    userProfile: UserProfile | null;
    setSearchedProfiles: React.Dispatch<React.SetStateAction<TalentProfile[]>>;
    unfollowUser: (id: string) => Promise<void>;
    followUser: (id: string) => Promise<void>;
    setIsAuthModalOpen: (isOpen: boolean) => void;
}

const DiscoverGrid: React.FC<DiscoverGridProps> = ({
    loading,
    error,
    projects,
    filteredProjects,
    filters,
    setFilters,
    searchedProfiles,
    searchedServices,
    handleNavigate,
    currentTrackId,
    currentProject,
    isPlaying,
    handlePlayTrack,
    handleTogglePlay,
    userProfile,
    setSearchedProfiles,
    unfollowUser,
    followUser,
    setIsAuthModalOpen
}) => {
    return (
        <>
            <div className="hidden mb-8 px-4 lg:px-8">
                <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter">Discover</h1>
                <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">
                    The future of sound is here. Browse trending loop kits, beats, and collaborative projects from the industries top creators.
                </p>
            </div>

            {error && (
                <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs rounded-lg font-mono text-center">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mt-6 pb-20">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="h-[350px] md:h-[285px]">
                            <ProjectSkeleton />
                        </div>
                    ))}
                </div>
            ) : null}

            {/* Search Results Sections */}
            {filters.searchQuery && (
                <div className="space-y-10 pb-20 mt-8">

                    {/* Profiles Section */}
                    {searchedProfiles.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <h2 className="text-lg font-bold text-white">Profiles</h2>
                                <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">{searchedProfiles.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {searchedProfiles.map(profile => (
                                    <div
                                        key={profile.id}
                                        onClick={() => handleNavigate(`@${profile.handle}`)}
                                        className="bg-[#0a0a0a] border border-transparent rounded-xl p-5 transition-all group hover:-translate-y-1 flex flex-col h-full cursor-pointer"
                                    >
                                        <div className="flex-1">
                                            {/* Header: User Info & Top Right Role */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <img src={profile.avatar} alt={profile.username} className="w-12 h-12 rounded-full border-2 border-[#0a0a0a] shadow-lg object-cover" />
                                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0a0a0a] rounded-full" title="Online"></div>
                                                    </div>

                                                    <div>
                                                        <h3 className="text-sm font-bold text-white flex items-center gap-1">
                                                            {profile.username}
                                                            {profile.isVerified && <Verified size={12} className="text-blue-400" />}
                                                        </h3>
                                                        <p className="text-[10px] text-neutral-500 font-mono">{profile.handle}</p>
                                                    </div>
                                                </div>

                                                {profile.role && (
                                                    <span className="px-2 py-0.5 rounded bg-white/5 border border-transparent text-[9px] font-bold text-primary uppercase tracking-wide">
                                                        {profile.role}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 rounded-lg p-2 border border-transparent">
                                                <div className="text-center">
                                                    <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Followers</div>
                                                    <div className="text-xs font-bold text-white">{profile.followers}</div>
                                                </div>
                                                <div className="text-center border-l border-transparent">
                                                    <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Plays</div>
                                                    <div className="text-xs font-bold text-white">{profile.streams ? profile.streams.toLocaleString() : '0'}</div>
                                                </div>
                                                <div className="text-center border-l border-transparent">
                                                    <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Tracks</div>
                                                    <div className="text-xs font-bold text-white">{profile.tracks || 0}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center gap-2 pt-4 border-t border-transparent mt-4">
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!userProfile) {
                                                        setIsAuthModalOpen(true);
                                                        return;
                                                    }
                                                    if (profile.id === userProfile.id) return;

                                                    if (profile.isFollowing) {
                                                        // Unfollow
                                                        setSearchedProfiles(prev => prev.map(t => t.id === profile.id ? { ...t, isFollowing: false, followers: (parseInt(t.followers) - 1).toString() } : t));
                                                        try { await unfollowUser(profile.id); } catch (err) { console.error(err); }
                                                    } else {
                                                        // Follow
                                                        setSearchedProfiles(prev => prev.map(t => t.id === profile.id ? { ...t, isFollowing: true, followers: (parseInt(t.followers) + 1).toString() } : t));
                                                        try { await followUser(profile.id); } catch (err) { console.error(err); }
                                                    }
                                                }}
                                                disabled={userProfile?.id === profile.id}
                                                className={`flex-1 text-xs font-bold flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors border ${userProfile?.id === profile.id
                                                    ? 'bg-neutral-800 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-50'
                                                    : profile.isFollowing
                                                        ? 'bg-neutral-800 border-neutral-800 text-neutral-500 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500'
                                                        : 'text-white bg-primary/10 hover:bg-primary hover:text-black border-primary/20'
                                                    }`}
                                            >
                                                <UserPlus size={14} /> {profile.isFollowing ? 'Following' : 'Follow'}
                                            </button>
                                            <button className="text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-transparent hover:border-neutral-700 px-3 py-2 rounded-lg transition-colors" title="Message">
                                                <MessageCircle size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Services Section */}
                    {searchedServices.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <h2 className="text-lg font-bold text-white">Services</h2>
                                <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">{searchedServices.length}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {searchedServices.map(service => (
                                    <div
                                        key={service.id}
                                        className="group bg-neutral-900/50 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 p-4 rounded-xl transition-all flex flex-col h-full"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-bold text-white group-hover:text-primary text-sm line-clamp-2">{service.title}</h3>
                                            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded ml-2 whitespace-nowrap">
                                                ${service.price}{service.rateType === 'hourly' ? '/hr' : ''}
                                            </span>
                                        </div>

                                        <p className="text-xs text-neutral-400 line-clamp-2 mb-3 flex-1">{service.description}</p>

                                        {service.user && (
                                            <div className="flex items-center gap-2 pt-3 border-t border-neutral-800/50 mt-auto">
                                                <img src={service.user.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'} className="w-5 h-5 rounded-full" />
                                                <span className="text-xs text-neutral-500 hover:text-white cursor-pointer transition-colors" onClick={() => handleNavigate(`@${service.user?.handle}`)}>
                                                    {service.user.username}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Sound Packs Section */}
                    {filteredProjects.filter(p => p.type === 'sound_pack').length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <h2 className="text-lg font-bold text-white">Sound Kits</h2>
                                <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                                    {filteredProjects.filter(p => p.type === 'sound_pack').length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {filteredProjects.filter(p => p.type === 'sound_pack').map(project => (
                                    <div key={project.id} className="h-[350px] md:h-[285px]">
                                        <ProjectCard
                                            project={project}
                                            currentTrackId={currentTrackId}
                                            isPlaying={currentProject?.id === project.id && isPlaying}
                                            onPlayTrack={(trackId) => handlePlayTrack(project, trackId)}
                                            onTogglePlay={handleTogglePlay}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Songs Section */}
                    {filteredProjects.filter(p => p.type === 'release').length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <h2 className="text-lg font-bold text-white">Songs</h2>
                                <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                                    {filteredProjects.filter(p => p.type === 'release').length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {filteredProjects.filter(p => p.type === 'release').map(project => (
                                    <div key={project.id} className="h-[350px] md:h-[285px]">
                                        <ProjectCard
                                            project={project}
                                            currentTrackId={currentTrackId}
                                            isPlaying={currentProject?.id === project.id && isPlaying}
                                            onPlayTrack={(trackId) => handlePlayTrack(project, trackId)}
                                            onTogglePlay={handleTogglePlay}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Projects (Beats) Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <h2 className="text-lg font-bold text-white">Beats</h2>
                            <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                                {filteredProjects.filter(p => p.type !== 'sound_pack' && p.type !== 'release').length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {filteredProjects.filter(p => p.type !== 'sound_pack' && p.type !== 'release').length > 0 ? (
                                filteredProjects.filter(p => p.type !== 'sound_pack' && p.type !== 'release').map(project => (
                                    <div key={project.id} className="h-[350px] md:h-[285px]">
                                        <ProjectCard
                                            project={project}
                                            currentTrackId={currentTrackId}
                                            isPlaying={currentProject?.id === project.id && isPlaying}
                                            onPlayTrack={(trackId) => handlePlayTrack(project, trackId)}
                                            onTogglePlay={handleTogglePlay}
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-10 text-center border border-dashed border-neutral-800 rounded-xl bg-white/5">
                                    <p className="text-neutral-500 font-mono text-xs">No beats found matching query.</p>
                                </div>
                            )}
                        </div>
                    </section>

                </div>
            )}

            {/* Existing Project Grid (Only show if NO search query is active) */}
            {!filters.searchQuery && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mt-6 pb-20">
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map(project => (
                            <div key={project.id} className="h-[350px] md:h-[285px]">
                                <ProjectCard
                                    project={project}
                                    currentTrackId={currentTrackId}
                                    isPlaying={currentProject?.id === project.id && isPlaying}
                                    onPlayTrack={(trackId) => handlePlayTrack(project, trackId)}
                                    onTogglePlay={handleTogglePlay}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center border border-dashed border-neutral-800 rounded-xl bg-white/5">
                            <p className="text-neutral-500 font-mono text-xs mb-4">No data found matching query parameters.</p>
                            <button
                                onClick={() => setFilters({ ...filters, genre: "All Genres", rootKey: "All Keys", scaleType: "All Scales", searchQuery: "" })}
                                className="px-4 py-2 bg-primary/10 text-primary border border-primary/50 rounded hover:bg-primary hover:text-black transition-colors font-mono text-xs uppercase tracking-wider"
                            >
                                Reset Search Query
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default DiscoverGrid;
