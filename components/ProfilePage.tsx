
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Project } from '../types';
import {
    Verified,
    Mic2,
    Box,
    Download,
    Globe,
    MessageSquare,
    Disc,
    LayoutList,
    Info,
    Gem,
    UserPlus,
    MapPin,
    Eye,
    EyeOff,
    Camera,
    X,
    Save,
    Edit3,
    Link as LinkIcon,
    Music,
    CheckCircle,
    Calendar,
    ChevronDown,
    User
} from 'lucide-react';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';
import CreateSoundpackModal from './CreateSoundpackModal';
import CreateServiceModal from './CreateServiceModal';
import EditProjectModal from './EditProjectModal';
import { getUserProfile, getUserProfileByHandle, updateUserProfile, getCurrentUser, uploadFile, followUser, unfollowUser, checkIsFollowing, deleteProject, updateProject } from '../services/supabaseService';

interface ProfilePageProps {
    profile: UserProfile | null;
    profileUsername?: string;
    currentTrackId: string | null;
    currentProject: Project | null;
    isPlaying: boolean;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
}

type Tab = 'beat_tapes' | 'services' | 'sound_packs' | 'about';

const ProfilePage: React.FC<ProfilePageProps> = ({
    profile,
    profileUsername,
    currentTrackId,
    currentProject,
    isPlaying,
    onPlayTrack,
    onTogglePlay
}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<Tab>('beat_tapes');
    const [isFollowing, setIsFollowing] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateSoundpackModalOpen, setIsCreateSoundpackModalOpen] = useState(false);
    const [isCreateServiceModalOpen, setIsCreateServiceModalOpen] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(profile);
    const [isViewerMode, setIsViewerMode] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(false);
    const [isOwnProfile, setIsOwnProfile] = useState(false);

    // Follow loading state
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    // Edit Form State
    const [editForm, setEditForm] = useState({
        username: '',
        location: '',
        bio: '',
        website: '',
        role: ''
    });

    // Local projects state
    const [localProjects, setLocalProjects] = useState<Project[]>([]);
    const [hidePrivate, setHidePrivate] = useState(false);

    // Hidden file inputs for image uploads
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Fetch profile if profileUsername is provided
    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                if (profileUsername && !profile) {
                    // Fetch other user's profile
                    let fetchedProfile = await getUserProfileByHandle(profileUsername);

                    // REPAIR FALLBACK: If profile via handle fails, but we are logged in,
                    // check if this handle belongs to the current user (based on auth metadata).
                    // If so, call getUserProfile() (no args) to trigger JIT provisioning.
                    if (!fetchedProfile) {
                        try {
                            const currentUser = await getCurrentUser();
                            const metadataHandle = currentUser?.user_metadata?.handle || currentUser?.email?.split('@')[0];

                            // Loose check: handles match (case-insensitive) OR user has no handle set yet (fallback)
                            if (currentUser && (!metadataHandle || metadataHandle.toLowerCase() === profileUsername.toLowerCase())) {
                                console.log('Profile lookup failed, but handle matches current auth user. Attempting JIT provisioning...');
                                const jitProfile = await getUserProfile(); // This triggers the INSERT if missing
                                if (jitProfile && jitProfile.handle === profileUsername) {
                                    fetchedProfile = jitProfile;
                                }
                            }
                        } catch (err) {
                            console.warn('JIT fallback check failed:', err);
                        }
                    }

                    if (fetchedProfile) {
                        setUserProfile(fetchedProfile);
                    } else {
                        console.warn('Profile not found for username:', profileUsername);
                        setUserProfile(null);
                    }
                } else if (profile) {
                    // Use prop profile
                    setUserProfile(profile);
                } else {
                    // No profile prop and no username param - try fetching current user directly
                    try {
                        const currentUserProfile = await getUserProfile();
                        setUserProfile(currentUserProfile);
                    } catch (e) {
                        console.error('Fallback profile fetch failed:', e);
                        setUserProfile(null);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
                setUserProfile(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [profileUsername, profile]);

    // Update localProjects when userProfile changes
    useEffect(() => {
        if (userProfile?.projects) {
            setLocalProjects(userProfile.projects);
        }
    }, [userProfile]);

    // Check if the viewed profile is the current user's profile
    useEffect(() => {
        const checkOwnership = async () => {
            try {
                const currentUser = await getCurrentUser();
                if (currentUser && userProfile && userProfile.handle === currentUser.user_metadata?.handle) {
                    setIsOwnProfile(true);
                } else {
                    setIsOwnProfile(false);
                }
            } catch (error) {
                console.error('Error checking profile ownership:', error);
                setIsOwnProfile(false);
            }
        };

        if (userProfile) {
            checkOwnership();
        }
    }, [userProfile]);

    // Check if following
    // Initial check handled by the effect below that depends on userProfile?.id

    // Re-check follow status when the component mounts or userProfile ID changes specifically
    useEffect(() => {
        if (userProfile?.id && !isOwnProfile) {
            checkFollowStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userProfile?.id, isOwnProfile]);

    const checkFollowStatus = async () => {
        if (userProfile?.id && !isOwnProfile) {
            try {
                const following = await checkIsFollowing(userProfile.id);
                setIsFollowing(following);
            } catch (e) {
                console.error("Error checking follow status:", e);
            }
        }
    };

    const handleToggleFollow = async () => {
        if (!userProfile?.id) {
            console.warn("Cannot follow: User ID missing", userProfile);
            return;
        }
        if (isFollowLoading) return;

        setIsFollowLoading(true);
        const previousState = isFollowing;
        const previousCount = userProfile.subscribers;

        // Optimistic Update
        setIsFollowing(!previousState);
        setUserProfile(prev => prev ? ({
            ...prev,
            subscribers: previousState ? prev.subscribers - 1 : prev.subscribers + 1
        }) : null);

        try {
            if (previousState) {
                await unfollowUser(userProfile.id);
            } else {
                await followUser(userProfile.id);
            }
            // Dispatch event to notify sidebar
            window.dispatchEvent(new CustomEvent('following-updated'));
        } catch (error) {
            console.error('Toggle follow failed:', error);
            // Revert
            setIsFollowing(previousState);
            setUserProfile(prev => prev ? ({ ...prev, subscribers: previousCount }) : null);
            alert("Failed to update follow status.");
        } finally {
            setIsFollowLoading(false);
        }
    };

    const handleMessage = () => {
        if (!userProfile?.id) return;
        navigate(`/dashboard/messages?uid=${userProfile.id}`);
    };
    // I want `/dashboard/messages?uid=${userProfile.id}`


    if (loading) {
        return (
            <ProfileSkeleton />
        );
    }

    if (!userProfile) {
        return (
            <div className="w-full max-w-[1600px] mx-auto pb-12 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                        <UserPlus size={32} className="text-neutral-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
                    <p className="text-neutral-400 mb-6 max-w-md">
                        {profileUsername
                            ? `The profile "@${profileUsername}" could not be found.`
                            : 'Unable to load profile information.'
                        }
                    </p>
                    <button
                        onClick={() => window.history.back()}
                        className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const handleSaveProject = (newProjectData: Partial<Project>) => {
        const newProject: Project = {
            id: `p_${Date.now()}`,
            producer: userProfile.username,
            price: newProjectData.licenses ? Math.min(...newProjectData.licenses.map(l => l.price)) : 29.99,
            bpm: 140, // default if not set
            key: 'Am', // default
            genre: 'Trap', // default
            type: 'beat_tape',
            tags: [],
            tracks: [],
            ...newProjectData
        } as Project;

        setLocalProjects([newProject, ...localProjects]);
    };

    const handleSaveSoundpack = (newProjectData: Partial<Project>) => {
        const newProject: Project = {
            id: `p_${Date.now()}`,
            producer: userProfile.username,
            price: newProjectData.licenses ? Math.min(...newProjectData.licenses.map(l => l.price)) : 19.99,
            bpm: 140, // default if not set
            key: 'Am', // default
            genre: 'Electronic', // default
            type: 'sound_pack',
            tags: [],
            tracks: [],
            ...newProjectData
        } as Project;

        setLocalProjects([newProject, ...localProjects]);
    };

    const handleSaveProfile = async () => {
        if (!userProfile) return;

        const oldProfile = { ...userProfile };

        // Optimistic update
        const updatedProfile = {
            ...userProfile,
            username: editForm.username,
            location: editForm.location,
            bio: editForm.bio,
            website: editForm.website,
            role: editForm.role
        };
        setUserProfile(updatedProfile);
        setIsEditModalOpen(false);

        try {
            // Save to database
            const currentUser = await getCurrentUser();
            if (currentUser) {
                await updateUserProfile(currentUser.id, {
                    username: editForm.username,
                    location: editForm.location,
                    bio: editForm.bio,
                    website: editForm.website,
                    role: editForm.role
                });

                // Refetch to confirm the update
                const refreshedProfile = await getUserProfile();
                if (refreshedProfile) {
                    setUserProfile(refreshedProfile);
                }
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            // Revert on error
            setUserProfile(oldProfile);
        }
    };

    const handleSaveService = (newService: any) => {
        if (!userProfile) return;
        const updatedProfile = { ...userProfile, services: [...userProfile.services, newService] };
        setUserProfile(updatedProfile);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'banner' | 'avatar') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Optimistic preview
            const previewUrl = URL.createObjectURL(file);
            setUserProfile(prev => prev ? ({ ...prev, [field]: previewUrl }) : null);

            try {
                const { publicUrl } = await uploadFile(file);

                // Persist changes to database first
                const currentUser = await getCurrentUser();
                if (currentUser) {
                    await updateUserProfile(currentUser.id, { [field]: publicUrl });

                    // Refetch profile to get the updated data from database
                    const refreshedProfile = await getUserProfile();
                    if (refreshedProfile) {
                        setUserProfile(refreshedProfile);
                    }

                    // Dispatch custom event to notify sidebar to refresh storage
                    window.dispatchEvent(new CustomEvent('storage-updated'));
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                // Revert to previous state on error
                setUserProfile(prev => prev ? ({ ...prev, [field]: userProfile?.[field] || '' }) : null);
            }
        }
    };

    const triggerBannerUpload = () => !isViewerMode && isOwnProfile && bannerInputRef.current?.click();
    const triggerAvatarUpload = () => !isViewerMode && isOwnProfile && avatarInputRef.current?.click();

    const openEditModal = () => {
        setEditForm({
            username: userProfile.username,
            location: userProfile.location || "",
            bio: userProfile.bio || "",
            website: userProfile.website || "",
            role: userProfile.role || ""
        });
        setIsEditModalOpen(true);
    };

    const handleEditProject = (project: Project) => {
        setEditingProject(project);
    };

    const handleDeleteProject = async (project: Project) => {
        if (!isOwnProfile || isViewerMode) return;

        // Optimistic update
        setLocalProjects(prev => prev.filter(p => p.id !== project.id));

        try {
            await deleteProject(project.id);
            // Refresh profile to ensure sync?
            // setUserProfile(...) 
        } catch (error) {
            console.error("Failed to delete project:", error);
            // Revert could be hard without fetching, potentially refresh profile here
            const refreshedProfile = await getUserProfile();
            if (refreshedProfile) {
                setUserProfile(refreshedProfile);
            }
        }
    };

    const handleSaveProjectEdit = async (updates: Partial<Project>) => {
        if (!editingProject) return;

        // Optimistic
        setLocalProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...updates } as Project : p));
        setEditingProject(null);

        try {
            await updateProject(editingProject.id, updates);
        } catch (error) {
            console.error("Failed to update project:", error);
        }
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto pb-12 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveProject}
            />

            <CreateSoundpackModal
                isOpen={isCreateSoundpackModalOpen}
                onClose={() => setIsCreateSoundpackModalOpen(false)}
                onSave={handleSaveSoundpack}
            />

            <CreateServiceModal
                isOpen={isCreateServiceModalOpen}
                onClose={() => setIsCreateServiceModalOpen(false)}
                onSave={handleSaveService}
            />

            {/* PROJECT EDIT MODALS */}
            {editingProject && (
                editingProject.status === 'published' ? (
                    <CreateProjectModal
                        isOpen={!!editingProject}
                        onClose={() => setEditingProject(null)}
                        onSave={handleSaveProjectEdit} // Wrapper to match signatures if needed
                        initialData={editingProject}
                    />
                ) : (
                    <EditProjectModal
                        project={editingProject}
                        onClose={() => setEditingProject(null)}
                        onSave={handleSaveProjectEdit}
                        onDelete={(id) => handleDeleteProject(editingProject)}
                    />
                )
            )}

            {/* EDIT PROFILE MODAL - RESPONSIVE */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex flex-col lg:items-center lg:justify-center bg-black lg:bg-black/80 lg:backdrop-blur-sm lg:p-4 animate-in fade-in duration-200">
                    <div className="flex-1 lg:flex-none w-full lg:max-w-lg bg-black lg:bg-[#0a0a0a] lg:border border-neutral-800 lg:rounded-xl lg:shadow-2xl overflow-hidden flex flex-col h-full lg:max-h-[90vh]">

                        {/* HEADER */}
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-neutral-900/50 backdrop-blur-md shrink-0">
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                <Edit3 size={18} className="text-primary" /> Edit Profile
                            </h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* BODY */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0 lg:p-0">
                            <div className="p-6 space-y-6">

                                {/* Image Uploads Section (Mobile Friendly) */}
                                <div className="space-y-4 pb-4 border-b border-white/5">
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3">Profile Assets</h4>

                                    {/* Banner Upload */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Banner Image</label>
                                        <div
                                            onClick={() => bannerInputRef.current?.click()}
                                            className="h-28 w-full rounded-lg bg-neutral-900/50 border border-white/5 flex flex-col items-center justify-center text-neutral-500 hover:text-white hover:border-primary/30 hover:bg-white/5 transition-all cursor-pointer overflow-hidden relative group"
                                        >
                                            {userProfile.banner ? (
                                                <img src={userProfile.banner} className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" alt="Banner Preview" />
                                            ) : (
                                                <div className="absolute inset-0 bg-neutral-900 animate-pulse" />
                                            )}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 drop-shadow-md">
                                                <Camera size={24} className="text-primary" />
                                                <span className="text-[10px] uppercase font-bold bg-black/50 px-2 py-1 rounded backdrop-blur-sm">Tap to Change Banner</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Avatar Upload */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Profile Picture</label>
                                        <div className="flex items-center gap-4">
                                            <div
                                                onClick={() => avatarInputRef.current?.click()}
                                                className="h-20 w-20 rounded-full bg-neutral-900 border border-white/5 overflow-hidden shrink-0 relative group cursor-pointer"
                                            >
                                                <img src={userProfile.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" alt="Avatar Preview" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Camera size={20} className="text-white" />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => avatarInputRef.current?.click()}
                                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                                            >
                                                <Camera size={14} />
                                                Change Avatar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Display Name</label>
                                        <input
                                            value={editForm.username}
                                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                            className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors focus:bg-neutral-900"
                                            placeholder="Your Artist Name"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Handle (Username)</label>
                                        <div className="relative opacity-70">
                                            <input
                                                value={userProfile.handle}
                                                disabled
                                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-400 cursor-not-allowed"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 font-mono">Read-only</div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Role</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                                            <select
                                                value={editForm.role}
                                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg pl-10 pr-10 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors focus:bg-neutral-900 appearance-none cursor-pointer"
                                            >
                                                <option value="" className="bg-neutral-900">Select your role...</option>
                                                <option value="artist" className="bg-neutral-900">Artist</option>
                                                <option value="producer" className="bg-neutral-900">Producer</option>
                                                <option value="engineer" className="bg-neutral-900">Engineer</option>
                                                <option value="professional" className="bg-neutral-900">Professional / Other</option>
                                                <option value="listener" className="bg-neutral-900">Listener</option>
                                            </select>
                                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                                        </div>
                                        <p className="text-[10px] text-neutral-600">This determines how you appear in Browse Talent</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Location</label>
                                        <div className="relative">
                                            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                            <input
                                                value={editForm.location}
                                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors focus:bg-neutral-900"
                                                placeholder="City, Country"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bio</label>
                                        <textarea
                                            value={editForm.bio}
                                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                            className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none resize-none h-32 transition-colors focus:bg-neutral-900"
                                            placeholder="Tell your story..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Website</label>
                                        <div className="relative">
                                            <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                            <input
                                                value={editForm.website}
                                                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors focus:bg-neutral-900"
                                                placeholder="https://your-site.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="p-4 border-t border-white/5 bg-neutral-900/50 lg:bg-neutral-900/30 backdrop-blur-md flex justify-end gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-4">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 lg:py-2 rounded-xl lg:rounded-lg text-xs font-bold text-neutral-400 hover:text-white transition-colors bg-white/5 border border-white/5 lg:bg-transparent lg:border-none">
                                Cancel
                            </button>
                            <button onClick={handleSaveProfile} className="flex-1 lg:flex-none px-8 py-3 lg:py-2 bg-primary text-black rounded-xl lg:rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HEADER SECTION */}
            <div className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-neutral-800 mb-8 group/header shadow-2xl">

                {/* View As Toggle (Top Right) */}
                <div className="absolute top-4 right-4 z-20">
                    <button
                        onClick={() => setIsViewerMode(!isViewerMode)}
                        className={`
                        flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md text-xs font-bold border transition-all shadow-lg
                        ${isViewerMode
                                ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
                                : 'bg-black/60 border-white/10 text-white hover:bg-black/80'
                            }
                    `}
                    >
                        {isViewerMode ? <Eye size={14} /> : <EyeOff size={14} />}
                        {isViewerMode ? 'Viewing as Visitor' : 'Owner View'}
                    </button>
                </div>

                {/* Hidden Inputs for File Upload */}
                <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />

                {/* Banner Background */}
                <div
                    className={`
                    h-32 md:h-72 w-full relative bg-neutral-900 overflow-hidden
                    ${!isViewerMode ? 'cursor-pointer group/banner' : ''}
                `}
                    onClick={triggerBannerUpload}
                >
                    {userProfile.banner ? (
                        <img
                            src={userProfile.banner}
                            className={`
                            w-full h-full object-cover transition-all duration-700
                            ${!isViewerMode ? 'group-hover/banner:scale-105 group-hover/banner:opacity-50' : ''}
                            opacity-70
                        `}
                            alt="Banner"
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-500"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

                    {/* Banner Hover Overlay - Hidden on Mobile to prevent "pops up" issue */}
                    {!isViewerMode && isOwnProfile && (
                        <div className="absolute inset-0 hidden md:flex items-center justify-center gap-2 opacity-0 group-hover/banner:opacity-100 transition-all duration-300 bg-black/20 backdrop-blur-sm">
                            <Camera size={18} />
                            <span className="text-xs font-bold uppercase tracking-wide">Change Banner</span>
                        </div>
                    )}
                </div>

                {/* Profile Content Layer */}
                <div className="relative px-4 md:px-8 pb-4 md:pb-8 -mt-12 md:-mt-24 flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-8">

                    {/* Avatar */}
                    <div className={`
                    relative z-30 shrink-0 rounded-2xl md:rounded-3xl p-1 md:p-1.5 bg-[#0a0a0a] shadow-2xl
                    ${!isViewerMode ? 'cursor-pointer group/avatar' : ''}
                `} onClick={triggerAvatarUpload}>
                        <div className="h-24 w-24 md:h-44 md:w-44 rounded-xl md:rounded-2xl bg-neutral-800 overflow-hidden relative border border-neutral-800">
                            <img src={userProfile.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'} alt="Avatar" className="w-full h-full object-cover" />

                            {/* Avatar Hover Overlay */}
                            {!isViewerMode && isOwnProfile && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                                    <Camera size={28} className="text-white drop-shadow-lg" />
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-[#0a0a0a] p-1 md:p-1.5 rounded-full border border-neutral-800 z-40 pointer-events-none">
                            <Verified className="text-blue-400 fill-blue-400/10 w-4 h-4 md:w-6 md:h-6" />
                        </div>
                    </div>

                    {/* Info & Actions */}
                    <div className="flex-1 min-w-0 pb-2 flex flex-col md:flex-row justify-between items-end gap-6 w-full">

                        {/* Text Info */}
                        <div className="w-full md:w-auto mt-2 md:mt-0">
                            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                                <h1 className="text-2xl md:text-5xl font-black text-white tracking-tight">{userProfile.username}</h1>
                                <span className="px-1.5 py-0.5 md:px-2 md:py-0.5 bg-primary/20 rounded text-[9px] md:text-[10px] font-mono font-bold text-primary border border-primary/20 uppercase">
                                    Pro
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-2 text-sm text-neutral-400 mt-2 md:mt-3">
                                <span className="font-mono text-neutral-300 font-bold text-sm md:text-base">{userProfile.handle}</span>

                                {userProfile.location && (
                                    <div className="flex items-center gap-1.5 text-neutral-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                        <MapPin size={12} />
                                        <span className="text-xs font-medium">{userProfile.location}</span>
                                    </div>
                                )}

                                {userProfile.website && (
                                    <a href={userProfile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary hover:text-white transition-colors hover:underline decoration-primary/50 underline-offset-4">
                                        <LinkIcon size={12} />
                                        <span className="text-xs font-bold">
                                            {userProfile.website.replace('https://', '').replace('http://', '').replace('www.', '')}
                                        </span>
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Actions & Stats */}
                        <div className="flex flex-col items-start md:items-end gap-4 md:gap-5 w-full md:w-auto mt-4 md:mt-0">
                            <div className="flex items-center divide-x divide-white/10 bg-neutral-900/50 rounded-xl border border-white/5 backdrop-blur-md w-full md:w-auto">
                                <div className="px-4 md:px-5 py-2 md:py-3 text-center flex-1 md:flex-none">
                                    <div className="text-base md:text-lg font-black text-white font-mono">{userProfile.streams ? userProfile.streams.toLocaleString() : '0'}</div>
                                    <div className="text-[8px] md:text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Streams</div>
                                </div>
                                <div className="px-4 md:px-5 py-2 md:py-3 text-center flex-1 md:flex-none">
                                    <div className="text-base md:text-lg font-black text-white font-mono">{userProfile.subscribers.toLocaleString()}</div>
                                    <div className="text-[8px] md:text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Followers</div>
                                </div>
                                <div className="px-4 md:px-5 py-2 md:py-3 text-center flex-1 md:flex-none">
                                    <div className="text-base md:text-lg font-black text-primary flex items-center justify-center gap-1 font-mono">
                                        {userProfile.gems !== undefined ? userProfile.gems.toLocaleString() : '0'} <Gem size={14} />
                                    </div>
                                    <div className="text-[8px] md:text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Gems</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {!isViewerMode && isOwnProfile ? (
                                    <button
                                        onClick={openEditModal}
                                        className="h-11 px-6 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-xs hover:bg-white/20 transition-all flex items-center justify-center gap-2 flex-1 md:flex-auto"
                                    >
                                        <Edit3 size={16} />
                                        EDIT PROFILE
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleToggleFollow}
                                            disabled={isFollowLoading}
                                            className={`h-11 px-6 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border flex-1 md:flex-auto ${isFollowing
                                                ? 'bg-transparent border-neutral-600 text-neutral-300 hover:border-red-500 hover:text-red-500'
                                                : 'bg-primary border-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)]'
                                                } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <UserPlus size={16} />
                                            {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                                        </button>
                                        <button
                                            onClick={handleMessage}
                                            className="h-11 px-6 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-2 flex-1 md:flex-auto"
                                        >
                                            <MessageSquare size={16} />
                                            MESSAGE
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS NAVIGATION */}
            {/* Fix: Removed sticky on mobile if it causes issues, or ensured top offset is correct. 
                Using explicit z-index and background to ensure visibility without pushing content.
            */}
            <div className="relative bg-[#050505] lg:border-b lg:border-neutral-800 -mx-6 px-6 lg:-mx-8 lg:px-8 mb-6 lg:mb-8 py-2 transition-all">

                {/* Mobile Tabs Layout (Single Row Grid) */}
                <div className="lg:hidden relative pb-2">
                    <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-900/50 rounded-lg border border-white/5">
                        <button
                            onClick={() => setActiveTab('beat_tapes')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${activeTab === 'beat_tapes' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <Disc size={14} className={activeTab === 'beat_tapes' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Projects</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('sound_packs')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${activeTab === 'sound_packs' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <Box size={14} className={activeTab === 'sound_packs' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Sounds</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('services')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${activeTab === 'services' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <LayoutList size={14} className={activeTab === 'services' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">Services</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('about')}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                ${activeTab === 'about' ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                            `}
                        >
                            <Info size={14} className={activeTab === 'about' ? 'text-primary' : ''} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">About</span>
                        </button>
                    </div>
                </div>

                {/* Desktop Horizontal Layout */}
                <div className="hidden lg:flex items-center gap-8 overflow-x-auto no-scrollbar whitespace-nowrap">
                    <TabButton active={activeTab === 'beat_tapes'} onClick={() => setActiveTab('beat_tapes')} icon={<Disc size={18} />} label="Projects" count={localProjects.length} />
                    <TabButton active={activeTab === 'sound_packs'} onClick={() => setActiveTab('sound_packs')} icon={<Box size={18} />} label="Sound Packs" count={userProfile.soundPacks.length} />
                    <TabButton active={activeTab === 'services'} onClick={() => setActiveTab('services')} icon={<LayoutList size={18} />} label="Services" count={userProfile.services.length} />
                    <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon={<Info size={18} />} label="About" />
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[400px] px-0 md:px-0">

                {activeTab === 'beat_tapes' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Music size={18} className="text-primary" /> Latest Projects
                            </h2>
                            <div className="flex items-center gap-2">
                                {!isViewerMode && isOwnProfile && (
                                    <button
                                        onClick={() => setHidePrivate(!hidePrivate)}
                                        className={`flex items-center gap-2 text-[10px] font-mono px-3 py-1.5 rounded border transition-all uppercase ${hidePrivate ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_10px_rgba(var(--primary),0.1)]' : 'text-neutral-500 border-white/10 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {hidePrivate ? <Eye size={12} /> : <EyeOff size={12} />}
                                        {hidePrivate ? 'Show Private' : 'Hide Private'}
                                    </button>
                                )}
                                <button className="text-[10px] font-mono text-neutral-500 border border-white/10 px-3 py-1.5 rounded hover:text-white hover:bg-white/5 transition-colors uppercase">
                                    Sort By: Newest
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {/* Create Project Card - Only for Owner */}
                            {!isViewerMode && isOwnProfile && (
                                <div
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center h-[340px] text-neutral-600 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group bg-[#0a0a0a] relative overflow-hidden"
                                >
                                    <div className="h-16 w-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg relative z-10 group-hover:shadow-primary/20">
                                        <Box size={24} />
                                    </div>
                                    <span className="font-mono text-xs font-bold uppercase tracking-widest relative z-10">Create Project</span>
                                </div>
                            )}

                            {localProjects
                                .filter(project => {
                                    // If not owner (or viewing as visitor), only show published projects
                                    if (!isOwnProfile || isViewerMode) {
                                        return project.status === 'published';
                                    }
                                    // If owner and hidePrivate is active, also only show published
                                    if (hidePrivate) {
                                        return project.status === 'published';
                                    }
                                    return true; // Owner sees all by default
                                })
                                .map(project => (
                                    <div key={project.id} className="h-[340px]">
                                        <ProjectCard
                                            project={project}
                                            currentTrackId={currentTrackId}
                                            isPlaying={currentProject?.id === project.id && isPlaying}
                                            onPlayTrack={(trackId) => onPlayTrack(project, trackId)}
                                            onTogglePlay={onTogglePlay}
                                            onEdit={!isViewerMode && isOwnProfile ? handleEditProject : undefined}
                                            onDelete={!isViewerMode && isOwnProfile ? handleDeleteProject : undefined}
                                        />
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {activeTab === 'services' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Create Service Card - Only for Owner */}
                        {!isViewerMode && isOwnProfile && (
                            <div
                                onClick={() => setIsCreateServiceModalOpen(true)}
                                className="border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center h-full min-h-[300px] text-neutral-600 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group bg-[#0a0a0a] relative overflow-hidden"
                            >
                                <div className="h-16 w-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg relative z-10 group-hover:shadow-primary/20">
                                    <Mic2 size={24} />
                                </div>
                                <span className="font-mono text-xs font-bold uppercase tracking-widest relative z-10">Create Service</span>
                            </div>
                        )}

                        {userProfile.services.map(service => (
                            <div key={service.id} className="glass-panel p-6 rounded-xl border border-white/5 hover:border-primary/30 transition-all group hover:shadow-[0_0_30px_rgb(var(--primary)/0.1)] relative overflow-hidden flex flex-col">
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="p-3 bg-neutral-900 rounded-xl text-primary border border-primary/20 group-hover:bg-primary group-hover:text-black transition-colors shadow-lg">
                                        <Mic2 size={24} />
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-2xl font-bold text-white font-mono tracking-tight">
                                            ${service.price}
                                            {service.rateType === 'hourly' && <span className="text-sm text-neutral-500 font-normal ml-1">/hr</span>}
                                        </span>
                                        <span className="text-[10px] text-neutral-500 font-mono uppercase bg-neutral-900 px-1.5 rounded">
                                            {service.rateType === 'hourly' ? 'Hourly Rate' : 'Starting at'}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-white mb-3 relative z-10">{service.title}</h3>
                                <p className="text-neutral-400 text-sm mb-6 leading-relaxed relative z-10 line-clamp-3">{service.description}</p>

                                <div className="space-y-3 mb-8 relative z-10 flex-1">
                                    {service.features.map((feat, i) => (
                                        <div key={i} className="flex items-center text-xs text-neutral-300 font-medium">
                                            <CheckCircle size={12} className="text-primary mr-3 shrink-0" />
                                            {feat}
                                        </div>
                                    ))}
                                </div>

                                <button className="w-full py-3.5 bg-white text-black font-bold rounded-lg hover:bg-primary transition-all relative z-10 text-[10px] tracking-widest uppercase shadow-lg">
                                    Book Service
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'sound_packs' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Create Soundpack Card - Only for Owner */}
                        {!isViewerMode && isOwnProfile && (
                            <div
                                onClick={() => setIsCreateSoundpackModalOpen(true)}
                                className="border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center h-[340px] text-neutral-600 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group bg-[#0a0a0a] relative overflow-hidden"
                            >
                                <div className="h-16 w-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg relative z-10 group-hover:shadow-primary/20">
                                    <Box size={24} />
                                </div>
                                <span className="font-mono text-xs font-bold uppercase tracking-widest relative z-10">Create Soundpack</span>
                            </div>
                        )}

                        {userProfile.soundPacks.map(pack => (
                            <div key={pack.id} className="bg-neutral-900/50 border border-white/5 rounded-xl overflow-hidden group hover:border-primary/30 transition-all hover:-translate-y-1 hover:shadow-xl">
                                <div className="h-48 bg-black flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-black to-black opacity-50"></div>
                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                                    <Box size={56} className="text-neutral-700 group-hover:text-primary transition-all duration-500 relative z-10 group-hover:scale-110 group-hover:rotate-6 drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]" />

                                    <div className="absolute top-3 right-3 z-20">
                                        <span className="px-2.5 py-1 bg-black/80 backdrop-blur text-xs font-mono font-bold text-white border border-white/10 rounded-md">
                                            ${pack.price}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[9px] font-mono text-primary uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">{pack.type}</span>
                                    </div>
                                    <h3 className="text-base font-bold text-white mb-3 leading-tight group-hover:text-primary transition-colors">{pack.title}</h3>

                                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono mb-5 border-t border-white/5 pt-3">
                                        <span className="flex items-center gap-1.5"><Download size={12} /> {pack.fileSize}</span>
                                        <span className="flex items-center gap-1.5"><Box size={12} /> {pack.itemCount} Files</span>
                                    </div>

                                    <button className="w-full py-2.5 bg-white/5 hover:bg-white hover:text-black border border-white/10 rounded-lg text-[10px] font-bold text-white transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 space-y-8">
                            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-20 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2 relative z-10">
                                    <Info size={16} className="text-primary" /> Biography
                                </h3>
                                <div className="prose prose-invert prose-sm max-w-none relative z-10">
                                    <p className="text-neutral-300 leading-loose text-sm whitespace-pre-line">
                                        {userProfile.bio}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatsCard value="5+" label="Years Exp." />
                                <StatsCard value="300+" label="Projects Sold" />
                                <StatsCard value="100%" label="Satisfaction" />
                                <StatsCard value="24h" label="Avg. Turnaround" />
                            </div>
                        </div>

                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
                                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-5">Info & Contact</h3>
                                <div className="space-y-5">
                                    <div className="flex items-center gap-4 text-sm text-white">
                                        <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-neutral-400 border border-white/5"><MapPin size={18} /></div>
                                        <div>
                                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-0.5">Based In</div>
                                            <div className="font-bold">{userProfile.location || 'Not specified'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-white">
                                        <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-neutral-400 border border-white/5"><Calendar size={18} /></div>
                                        <div>
                                            <div className="text-[10px] text-neutral-500 uppercase font-bold mb-0.5">Member Since</div>
                                            <div className="font-bold">Sep 2023</div>
                                        </div>
                                    </div>
                                    {userProfile.website && (
                                        <div className="flex items-center gap-4 text-sm text-white">
                                            <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center text-neutral-400 border border-white/5"><Globe size={18} /></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-0.5">Website</div>
                                                <a href={userProfile.website} target="_blank" rel="noreferrer" className="font-bold hover:text-primary truncate block">{userProfile.website.replace('https://', '')}</a>
                                            </div>
                                        </div>
                                    )}
                                    <button className="w-full py-3.5 mt-2 bg-white text-black font-bold rounded-lg text-xs hover:bg-neutral-200 transition-colors shadow-lg uppercase tracking-wide">
                                        Contact For Inquiries
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6">
                                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4">Skills & Tools</h3>
                                <div className="flex flex-wrap gap-2">
                                    {['FL Studio', 'Pro Tools', 'Mixing', 'Mastering', 'Piano', 'Guitar', 'Sound Design', 'Vocal Tuning'].map(tag => (
                                        <span key={tag} className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors cursor-default">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatsCard = ({ value, label }: { value: string, label: string }) => (
    <div className="p-5 rounded-2xl bg-[#0a0a0a] border border-white/5 text-center hover:border-primary/20 transition-colors group">
        <div className="text-2xl font-black text-white mb-1 font-mono group-hover:text-primary transition-colors">{value}</div>
        <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest">{label}</div>
    </div>
)

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    count?: number;
}

const MobileTabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, count }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap shrink-0
            ${active
                ? 'bg-white text-black border-white shadow-lg scale-105'
                : 'bg-neutral-900/50 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
            }
        `}
    >
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
        {count !== undefined && (
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ml-1 ${active ? 'bg-black/10 text-black' : 'bg-white/10 text-neutral-500'}`}>
                {count}
            </span>
        )}
    </button>
);

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label, count }) => (
    <button
        onClick={onClick}
        className={`
            pb-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-all relative whitespace-nowrap px-2
            ${active
                ? 'border-primary text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:border-neutral-800'
            }
        `}
    >
        <span className={`transition-colors ${active ? 'text-primary' : ''}`}>{icon}</span>
        <span className="tracking-wide font-bold text-xs uppercase">{label}</span>
        {count !== undefined && (
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ml-1 font-bold ${active ? 'bg-primary/20 text-primary' : 'bg-neutral-800 text-neutral-500'}`}>
                {count}
            </span>
        )}
    </button>
);

export default ProfilePage;

const ProfileSkeleton = () => (
    <div className="w-full max-w-[1600px] mx-auto pb-12 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
        <div className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-neutral-800 mb-8 shadow-2xl animate-pulse">
            <div className="h-72 w-full bg-neutral-900 border-b border-white/5"></div>
            <div className="relative px-8 pb-8 -mt-24 flex flex-col md:flex-row items-end gap-8">
                <div className="relative z-30 shrink-0 rounded-3xl p-1.5 bg-[#0a0a0a]">
                    <div className="h-44 w-44 rounded-2xl bg-neutral-800 border border-neutral-700"></div>
                </div>
                <div className="flex-1 w-full pb-2 space-y-4">
                    <div className="h-10 w-48 bg-neutral-800 rounded-lg"></div>
                    <div className="h-4 w-32 bg-neutral-800 rounded"></div>
                </div>
            </div>
        </div>
        <div className="flex gap-8 mb-8 border-b border-neutral-800 pb-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-6 w-24 bg-neutral-900 rounded"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-[340px] bg-neutral-900/50 rounded-xl border border-neutral-800"></div>)}
        </div>
    </div>
);
