
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_TALENT } from '../constants';
import { Verified, UserPlus, ChevronRight, Star, Music, Zap, MessageCircle } from 'lucide-react';
import ProjectCard, { ProjectSkeleton } from './ProjectCard';
import { Project, TalentProfile, Service } from '../types';
import { getTalentProfiles, getServices, getProjects, getCurrentUser } from '../services/supabaseService';

interface BrowseTalentPageProps {
    currentTrackId: string | null;
    isPlaying: boolean;
    currentProject: Project | null;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
}

const BrowseTalentPage: React.FC<BrowseTalentPageProps> = ({
    currentTrackId,
    isPlaying,
    currentProject,
    onPlayTrack,
    onTogglePlay
}) => {
    const navigate = useNavigate();
    const [talents, setTalents] = useState<TalentProfile[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // 1. Fetch Talents
            try {
                const talentData = await getTalentProfiles();
                // If we get 0 talents, we might still want to show mocks during development/demo 
                // BUT the user asked why it's not real data. So let's show real data (empty) if it's empty, 
                // or maybe keep mocks only if it's REALLY empty and we want to populate the UI.
                // For now, let's prefer real data. If empty, show empty state or mocks if strictly needed for layout.
                // Reverting to MOCK_TALENT only on ERROR or if explicitly desired for empty state.
                setTalents(talentData.length > 0 ? talentData : []);
            } catch (error) {
                console.error('Error fetching talent profiles:', error);
                // Fallback to empty array on error, avoid Showing mock data which confuses users
                setTalents([]);
            }

            // 2. Fetch Services
            try {
                const serviceData = await getServices();
                setServices(serviceData);
            } catch (error) {
                console.error('Error fetching services:', error);
                setServices([]);
            }

            // 3. Fetch Projects
            try {
                const projectData = await getProjects();
                setProjects(projectData);
            } catch (error) {
                console.error('Error fetching projects:', error);
                setProjects([]);
            }

            setLoading(false);
        };
        fetchData();

        const checkUser = async () => {
            const user = await getCurrentUser();
            if (user) setCurrentUserId(user.id);
        };
        checkUser();
    }, []);

    const handleFollow = async (e: React.MouseEvent, talent: TalentProfile) => {
        e.stopPropagation(); // Prevent card click
        const { followUser, unfollowUser } = await import('../services/supabaseService');

        if (talent.isFollowing) {
            // Unfollow
            // Optimistic Update
            setTalents(prev => prev.map(t =>
                t.id === talent.id
                    ? { ...t, isFollowing: false, followers: (parseInt(t.followers) - 1).toString() }
                    : t
            ));
            try {
                await unfollowUser(talent.id);
            } catch (error) {
                console.error('Unfollow failed:', error);
                // Revert
                setTalents(prev => prev.map(t =>
                    t.id === talent.id
                        ? { ...t, isFollowing: true, followers: (parseInt(t.followers) + 1).toString() }
                        : t
                ));
            }
        } else {
            // Follow
            // Optimistic Update
            setTalents(prev => prev.map(t =>
                t.id === talent.id
                    ? { ...t, isFollowing: true, followers: (parseInt(t.followers) + 1).toString() }
                    : t
            ));
            try {
                await followUser(talent.id);
            } catch (error) {
                console.error('Follow failed:', error);
                // Revert
                setTalents(prev => prev.map(t =>
                    t.id === talent.id
                        ? { ...t, isFollowing: false, followers: (parseInt(t.followers) - 1).toString() }
                        : t
                ));
            }
        }
        // Dispatch event to notify sidebar
        window.dispatchEvent(new CustomEvent('following-updated'));
    };

    return (
        <div className="w-full max-w-[1900px] mx-auto pb-4 lg:pb-32 pt-4 lg:pt-6 px-4 lg:px-10 xl:px-14 animate-in fade-in duration-500">

            {/* Header */}
            <div className="mb-6 lg:mb-8">
                <h1 className="text-3xl lg:text-5xl font-black text-white mb-1 tracking-tighter">Browse Talent</h1>
                <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">Discover the best emerging producers, vocalists, and engineers.</p>
            </div>

            {/* Featured Talent Section */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Star size={18} className="text-primary" /> Featured Creators
                    </h2>
                    <button className="text-xs text-neutral-500 hover:text-white flex items-center gap-1">View All <ChevronRight size={12} /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {loading ? (
                        [...Array(4)].map((_, i) => <TalentSkeleton key={i} />)
                    ) : (
                        talents.map(talent => (
                            <div
                                key={talent.id}
                                onClick={() => navigate(`/@${talent.handle}`)}
                                className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 hover:border-neutral-600 transition-all group hover:-translate-y-1 flex flex-col h-full cursor-pointer"
                            >
                                <div className="flex-1">
                                    {/* Header: User Info & Top Right Role */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img src={talent.avatar} alt={talent.username} className="w-12 h-12 rounded-full border-2 border-[#0a0a0a] shadow-lg object-cover" />
                                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0a0a0a] rounded-full" title="Online"></div>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-bold text-white flex items-center gap-1">
                                                    {talent.username}
                                                    {talent.isVerified && <Verified size={12} className="text-blue-400" />}
                                                </h3>
                                                <p className="text-[10px] text-neutral-500 font-mono">{talent.handle}</p>
                                            </div>
                                        </div>

                                        {talent.role && (
                                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-bold text-primary uppercase tracking-wide">
                                                {talent.role}
                                            </span>
                                        )}
                                    </div>



                                    {/* Stats Grid - No bottom margin to align with footer spacing */}
                                    <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 rounded-lg p-2 border border-white/5">
                                        <div className="text-center">
                                            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Followers</div>
                                            <div className="text-xs font-bold text-white">{talent.followers}</div>
                                        </div>
                                        <div className="text-center border-l border-white/5">
                                            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Plays</div>
                                            <div className="text-xs font-bold text-white">{talent.streams ? talent.streams.toLocaleString() : '0'}</div>
                                        </div>
                                        <div className="text-center border-l border-white/5">
                                            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Tracks</div>
                                            <div className="text-xs font-bold text-white">{talent.tracks || 0}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer with symmetrical spacing (mt-4 / pt-4) */}
                                <div className="flex items-center gap-2 pt-4 border-t border-white/5 mt-4">
                                    <button
                                        onClick={(e) => talent.id !== currentUserId && handleFollow(e, talent)}
                                        disabled={talent.id === currentUserId}
                                        className={`flex-1 text-xs font-bold flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors border ${talent.id === currentUserId
                                            ? 'bg-neutral-800 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-50'
                                            : talent.isFollowing
                                                ? 'bg-transparent border-white/5 text-neutral-400 hover:text-red-500 hover:border-red-900'
                                                : 'text-white bg-primary/10 hover:bg-primary hover:text-black border-primary/20'
                                            }`}
                                    >
                                        <UserPlus size={14} /> {talent.isFollowing ? 'Following' : 'Follow'}
                                    </button>
                                    <button className="text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-white/5 hover:border-neutral-700 px-3 py-2 rounded-lg transition-colors" title="Message">
                                        <MessageCircle size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Trending Beat Tapes */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Music size={18} className="text-primary" /> Trending Projects
                    </h2>
                    <button className="text-xs text-neutral-500 hover:text-white flex items-center gap-1">View All <ChevronRight size={12} /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {loading ? (
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="h-auto md:h-[282px]">
                                <ProjectSkeleton />
                            </div>
                        ))
                    ) : (
                        projects.slice(0, 4).map(project => (
                            <div key={project.id} className="h-auto md:h-[282px]">
                                <ProjectCard
                                    project={project}
                                    currentTrackId={currentTrackId}
                                    isPlaying={currentProject?.id === project.id && isPlaying}
                                    onPlayTrack={(trackId) => onPlayTrack(project, trackId)}
                                    onTogglePlay={onTogglePlay}
                                />
                            </div>
                        ))
                    )}
                </div>
                {!loading && projects.length === 0 && (
                    <div className="col-span-4 text-center py-8 text-neutral-500 text-sm">
                        No beat tapes available yet.
                    </div>
                )}
            </div>

            {/* New Services Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Zap size={18} className="text-primary" /> New Services
                    </h2>
                    <button className="text-xs text-neutral-500 hover:text-white flex items-center gap-1">View All <ChevronRight size={12} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loading ? (
                        [...Array(3)].map((_, i) => <ServiceSkeleton key={i} />)
                    ) : (
                        services.slice(0, 3).map(service => (
                            <div key={service.id} className="bg-neutral-900/50 border border-white/5 p-5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-2 bg-neutral-800 rounded-lg text-neutral-300">
                                        <Star size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-white bg-primary/20 px-2 py-1 rounded border border-primary/30 font-mono">${service.price}+</span>
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1">{service.title}</h3>
                                <p className="text-[10px] text-neutral-400 mb-3 line-clamp-2">{service.description}</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[8px] text-white">
                                        {/* Placeholder for user avatar if not available in service object directly */}
                                        ?
                                    </div>
                                    <span className="text-[10px] text-neutral-500">by Service Provider</span>
                                </div>
                            </div>
                        ))
                    )}
                    {!loading && services.length === 0 && (
                        <div className="col-span-3 text-center py-8 text-neutral-500 text-sm">
                            No services available yet.
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

const TalentSkeleton = () => (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-5 flex flex-col h-full animate-pulse">
        <div className="flex-1">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-neutral-800"></div>
                    <div>
                        <div className="h-3 w-24 bg-neutral-800 rounded mb-1"></div>
                        <div className="h-2 w-16 bg-neutral-800 rounded"></div>
                    </div>
                </div>
                <div className="h-4 w-16 bg-neutral-800 rounded"></div>
            </div>
            <div className="flex gap-1.5 mb-3">
                <div className="h-5 w-12 bg-neutral-800 rounded"></div>
                <div className="h-5 w-12 bg-neutral-800 rounded"></div>
                <div className="h-5 w-12 bg-neutral-800 rounded"></div>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 rounded-lg p-2 border border-white/5 h-10"></div>
        </div>
        <div className="flex items-center gap-2 pt-4 border-t border-white/5 mt-4">
            <div className="h-9 w-full bg-neutral-800 rounded-lg"></div>
        </div>
    </div>
);



const ServiceSkeleton = () => (
    <div className="bg-neutral-900/50 border border-white/5 p-5 rounded-xl h-[130px] animate-pulse">
        <div className="flex justify-between mb-4">
            <div className="w-8 h-8 bg-neutral-800 rounded"></div>
            <div className="w-12 h-6 bg-neutral-800 rounded"></div>
        </div>
        <div className="w-3/4 h-4 bg-neutral-800 rounded mb-2"></div>
        <div className="w-full h-8 bg-neutral-800 rounded"></div>
    </div>
);

export default BrowseTalentPage;