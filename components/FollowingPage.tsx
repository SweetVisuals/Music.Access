import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Verified, UserPlus, MessageCircle, UserMinus } from 'lucide-react';
import { TalentProfile, Project } from '../types';
import { getFollowingProfiles, followUser, unfollowUser } from '../services/supabaseService';

interface FollowingPageProps {
    currentTrackId: string | null;
    isPlaying: boolean;
    currentProject: Project | null;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
}

const FollowingPage: React.FC<FollowingPageProps> = () => {
    const navigate = useNavigate();
    const [following, setFollowing] = useState<TalentProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFollowing = async () => {
            setLoading(true);
            try {
                const data = await getFollowingProfiles();
                setFollowing(data);
            } catch (error) {
                console.error('Error fetching following:', error);
                setFollowing([]);
            } finally {
                setLoading(false);
            }
        };

        fetchFollowing();
    }, []);

    const handleUnfollow = async (e: React.MouseEvent, talent: TalentProfile) => {
        e.stopPropagation(); // Prevent card click

        // Optimistic Update
        setFollowing(prev => prev.filter(t => t.id !== talent.id));

        try {
            await unfollowUser(talent.id);
            // Dispatch event to notify sidebar
            window.dispatchEvent(new CustomEvent('following-updated'));
        } catch (error) {
            console.error('Unfollow failed:', error);
            // Revert (add back)
            setFollowing(prev => [...prev, talent]);
        }
    };

    return (
        <div className="w-full max-w-[1900px] mx-auto pb-4 lg:pb-32 pt-4 lg:pt-6 px-4 lg:px-10 xl:px-14 animate-in fade-in duration-500">

            {/* Header */}
            <div className="mb-6 lg:mb-8">
                <h1 className="text-3xl lg:text-5xl font-black text-white mb-1 tracking-tighter">Following</h1>
                <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">Creators you follow and track using your private list.</p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                    [...Array(8)].map((_, i) => <TalentSkeleton key={i} />)
                ) : (
                    following.length > 0 ? (
                        following.map(talent => (
                            <div
                                key={talent.id}
                                onClick={() => navigate(`/@${talent.handle}`)}
                                className="bg-[#0a0a0a] rounded-xl p-5 transition-all group hover:-translate-y-1 flex flex-col h-full cursor-pointer"
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
                                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-primary uppercase tracking-wide">
                                                {talent.role}
                                            </span>
                                        )}
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 rounded-lg p-2">
                                        <div className="text-center">
                                            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Followers</div>
                                            <div className="text-xs font-bold text-white">{talent.followers}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Plays</div>
                                            <div className="text-xs font-bold text-white">{talent.streams ? talent.streams.toLocaleString() : '0'}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Tracks</div>
                                            <div className="text-xs font-bold text-white">{talent.tracks || 0}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center gap-2 pt-4 mt-4">
                                    <button
                                        onClick={(e) => handleUnfollow(e, talent)}
                                        className="flex-1 text-xs font-bold flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors bg-neutral-900 text-neutral-400 hover:text-red-500"
                                    >
                                        <UserMinus size={14} /> Unfollow
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/dashboard/messages?uid=${talent.id}`);
                                        }}
                                        className="text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 px-3 py-2 rounded-lg transition-colors"
                                        title="Message"
                                    >
                                        <MessageCircle size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-600">
                                <UserPlus size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Not following anyone yet</h3>
                            <p className="text-neutral-500 text-sm max-w-md mx-auto mb-6">
                                Start following creators to see them here and track their latest activity.
                            </p>
                            <button
                                onClick={() => navigate('/browse-talent')}
                                className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Browse Talent
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

const TalentSkeleton = () => (
    <div className="bg-[#0a0a0a] rounded-xl p-5 flex flex-col h-full animate-pulse">
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
            <div className="items-center gap-3 mb-3"></div>
            <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 rounded-lg p-2 h-10"></div>
        </div>
        <div className="flex items-center gap-2 pt-4 mt-4">
            <div className="h-9 w-full bg-neutral-800 rounded-lg"></div>
        </div>
    </div>
);

export default FollowingPage;
