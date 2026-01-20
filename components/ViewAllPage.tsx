import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, Verified, UserPlus, MessageCircle, UserMinus, Star, Zap, Music } from 'lucide-react';
import { TalentProfile, Project, Service } from '../types';
import { getTalentProfiles, getServices, getProjects, followUser, unfollowUser, getUserProfile } from '../services/supabaseService';
import ProjectCard, { ProjectSkeleton } from './ProjectCard';
import ServiceCard from './ServiceCard';

interface ViewAllPageProps {
    type: 'talent' | 'projects' | 'soundpacks' | 'releases' | 'services';
    title: string;
    description: string;
    // Props passed for ProjectCard functionality
    currentTrackId: string | null;
    isPlaying: boolean;
    currentProject: Project | null;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
    onOpenAuth?: () => void;
}

const ViewAllPage: React.FC<ViewAllPageProps> = ({
    type,
    title,
    description,
    currentTrackId,
    isPlaying,
    currentProject,
    onPlayTrack,
    onTogglePlay,
    onOpenAuth
}) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Data State
    const [talents, setTalents] = useState<TalentProfile[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [services, setServices] = useState<Service[]>([]);

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const user = await getUserProfile();
                if (user) setCurrentUserId(user.id || null);
            } catch (error) {
                console.error("Error fetching current user", error);
            }
        };
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (type === 'talent') {
                    const data = await getTalentProfiles();
                    setTalents(data);
                } else if (type === 'services') {
                    const data = await getServices();
                    setServices(data);
                } else {
                    // Projects, Soundpacks, Releases
                    const allProjects = await getProjects();
                    if (type === 'projects') {
                        // Filter out beat_tapes (Studio) handled in getProjects, 
                        // but specifically "Trending Projects" usually implies generic projects/beats or top featured.
                        // For now show all non-soundpack, non-release projects if 'projects' implies 'beats' or general.
                        // Or simply show all valid public projects. Implementation Plan said "Trending Projects" = All Projects.
                        // Let's filter out soundpacks and releases if "Trending Projects" refers to the beat feed.
                        // Actually, looking at BrowseTalentPage, "Trending Projects" just maps `projects.slice(0, 4)`.
                        // Those projects come from `getProjects` which excludes `beat_tape`.
                        // So `getProjects` mainly returns generic projects. 
                        // However, if we add Soundpacks/Releases as distinct types, we should filter them here to be specific.

                        setProjects(allProjects.filter(p => p.type !== 'sound_pack' && p.type !== 'release'));
                    } else if (type === 'soundpacks') {
                        setProjects(allProjects.filter(p => p.type === 'sound_pack'));
                    } else if (type === 'releases') {
                        setProjects(allProjects.filter(p => p.type === 'release'));
                    }
                }
            } catch (error) {
                console.error(`Error fetching data for ${type}:`, error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [type]);

    const handleFollow = async (e: React.MouseEvent, talent: TalentProfile) => {
        e.stopPropagation();
        if (!currentUserId) {
            onOpenAuth?.();
            return;
        }

        if (talent.id === currentUserId) return;

        if (talent.isFollowing) {
            // Optimistic Unfollow
            setTalents(prev => prev.map(t => t.id === talent.id ? { ...t, isFollowing: false } : t));
            try { await unfollowUser(talent.id); }
            catch (e) { setTalents(prev => prev.map(t => t.id === talent.id ? { ...t, isFollowing: true } : t)); }
        } else {
            // Optimistic Follow
            setTalents(prev => prev.map(t => t.id === talent.id ? { ...t, isFollowing: true } : t));
            try { await followUser(talent.id); }
            catch (e) { setTalents(prev => prev.map(t => t.id === talent.id ? { ...t, isFollowing: false } : t)); }
        }
    };

    const normalizeString = (str: string) => str.toLowerCase();

    // Filtering logic
    const filteredTalents = talents.filter(t =>
        normalizeString(t.username).includes(normalizeString(searchQuery)) ||
        normalizeString(t.handle).includes(normalizeString(searchQuery)) ||
        (t.role && normalizeString(t.role).includes(normalizeString(searchQuery)))
    );

    const filteredProjects = projects.filter(p =>
        normalizeString(p.title).includes(normalizeString(searchQuery)) ||
        normalizeString(p.producer).includes(normalizeString(searchQuery)) ||
        p.tags.some(tag => normalizeString(tag).includes(normalizeString(searchQuery)))
    );

    const filteredServices = services.filter(s =>
        normalizeString(s.title).includes(normalizeString(searchQuery)) ||
        normalizeString(s.user?.username || '').includes(normalizeString(searchQuery))
    );

    return (
        <div className="w-full max-w-[1900px] mx-auto pb-32 lg:pb-32 pt-4 lg:pt-6 px-4 lg:px-10 xl:px-14 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-4 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back
                </button>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter">{title}</h1>
                        <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">{description}</p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-64 lg:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                        <input
                            type="text"
                            placeholder={`Search ${title.toLowerCase()}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-full py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-neutral-700 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                        {[...Array(8)].map((_, i) => (
                            type === 'talent' ? <TalentSkeleton key={i} /> :
                                type === 'services' ? <ServiceSkeleton key={i} /> :
                                    <div key={i} className="h-auto md:h-[282px]"><ProjectSkeleton /></div>
                        ))}
                    </div>
                ) : (
                    <>
                        {type === 'talent' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {filteredTalents.map(talent => (
                                    <TalentCard
                                        key={talent.id}
                                        talent={talent}
                                        currentUserId={currentUserId}
                                        onFollow={handleFollow}
                                        navigate={navigate}
                                    />
                                ))}
                            </div>
                        )}

                        {(type === 'projects' || type === 'soundpacks' || type === 'releases') && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {filteredProjects.map(project => (
                                    <div key={project.id} className="h-auto md:h-[282px]">
                                        <ProjectCard
                                            project={project}
                                            currentTrackId={currentTrackId}
                                            isPlaying={currentProject?.id === project.id && isPlaying}
                                            onPlayTrack={(trackId) => onPlayTrack(project, trackId)}
                                            onTogglePlay={onTogglePlay}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {type === 'services' && (
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredServices.map(service => (
                                        <ServiceCard
                                            key={service.id}
                                            service={service}
                                            user={service.user}
                                            onClick={() => navigate(`/@${service.user?.handle}`)} // Or specific service page if available
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty States */}
                        {type === 'talent' && filteredTalents.length === 0 && <EmptyState term={searchQuery} />}
                        {(type === 'projects' || type === 'soundpacks' || type === 'releases') && filteredProjects.length === 0 && <EmptyState term={searchQuery} />}
                        {type === 'services' && filteredServices.length === 0 && <EmptyState term={searchQuery} />}
                    </>
                )}
            </div>
        </div>
    );
};

// Sub-components for cleaner generic file

const TalentCard = ({ talent, currentUserId, onFollow, navigate }: { talent: TalentProfile, currentUserId: string | null, onFollow: any, navigate: any, key?: any }) => (
    <div
        onClick={() => navigate(`/@${talent.handle}`)}
        className="bg-[#0a0a0a] border border-transparent rounded-xl p-5 transition-all group hover:-translate-y-1 flex flex-col h-full cursor-pointer hover:bg-neutral-900/40"
    >
        <div className="flex-1">
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
                    <span className="px-2 py-0.5 rounded bg-white/5 border border-transparent text-[9px] font-bold text-primary uppercase tracking-wide">
                        {talent.role}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 rounded-lg p-2 border border-transparent group-hover:bg-black/50 transition-colors">
                <div className="text-center">
                    <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Followers</div>
                    <div className="text-xs font-bold text-white">{talent.followers}</div>
                </div>
                <div className="text-center border-l border-transparent">
                    <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Plays</div>
                    <div className="text-xs font-bold text-white">{talent.streams ? talent.streams.toLocaleString() : '0'}</div>
                </div>
                <div className="text-center border-l border-transparent">
                    <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Tracks</div>
                    <div className="text-xs font-bold text-white">{talent.tracks || 0}</div>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2 pt-4 border-t border-transparent mt-4 group-hover:border-neutral-800/50">
            <button
                onClick={(e) => talent.id !== currentUserId && onFollow(e, talent)}
                disabled={talent.id === currentUserId}
                className={`flex-1 text-xs font-bold flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors border ${talent.id === currentUserId
                    ? 'bg-neutral-800 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-50'
                    : talent.isFollowing
                        ? 'bg-neutral-800 border-neutral-800 text-neutral-500 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500'
                        : 'text-white bg-primary/10 hover:bg-primary hover:text-black border-primary/20'
                    }`}
            >
                <UserPlus size={14} /> {talent.isFollowing ? 'Following' : 'Follow'}
            </button>
            <button className="text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-transparent hover:border-neutral-700 px-3 py-2 rounded-lg transition-colors" title="Message">
                <MessageCircle size={14} />
            </button>
        </div>
    </div>
);



const EmptyState = ({ term }: { term: string }) => (
    <div className="col-span-full py-20 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-4 text-neutral-600">
            <Search size={32} />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No results found</h3>
        <p className="text-neutral-500 text-sm max-w-md">
            {term ? `We couldn't find anything matching "${term}".` : "There are no items to display in this category yet."}
        </p>
    </div>
);

const TalentSkeleton = () => (
    <div className="bg-[#0a0a0a] border border-transparent rounded-xl p-5 flex flex-col h-full animate-pulse">
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
            <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 rounded-lg p-2 border border-transparent h-10"></div>
        </div>
        <div className="flex items-center gap-2 pt-4 border-t border-transparent mt-4">
            <div className="h-9 w-full bg-neutral-800 rounded-lg"></div>
        </div>
    </div>
);

const ServiceSkeleton = () => (
    <div className="bg-neutral-900/50 border border-transparent p-5 rounded-xl h-[160px] animate-pulse">
        <div className="flex justify-between mb-4">
            <div className="w-8 h-8 bg-neutral-800 rounded"></div>
            <div className="w-12 h-6 bg-neutral-800 rounded"></div>
        </div>
        <div className="w-3/4 h-4 bg-neutral-800 rounded mb-2"></div>
        <div className="w-full h-8 bg-neutral-800 rounded"></div>
    </div>
);

export default ViewAllPage;
