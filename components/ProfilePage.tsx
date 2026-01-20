
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    User,
    Lock
} from 'lucide-react';
import ProjectCard, { ProjectSkeleton } from './ProjectCard';
import ServiceCard from './ServiceCard';
import CreateProjectModal from './CreateProjectModal';
import CreateSoundpackModal from './CreateSoundpackModal';
import CreateServiceModal from './CreateServiceModal';
import EditProjectModal from './EditProjectModal';
import { getUserProfile, getUserProfileByHandle, updateUserProfile, getCurrentUser, uploadFile, followUser, unfollowUser, checkIsFollowing, deleteProject, updateProject } from '../services/supabaseService';
import EmptyStateCard from './EmptyStateCard';
import CustomDropdown from './CustomDropdown';
import BannerPositionManager from './BannerPositionManager';
import { Move } from 'lucide-react';


interface ProfilePageProps {
    profile: UserProfile | null;
    profileUsername?: string;
    currentTrackId: string | null;
    currentProject: Project | null;
    isPlaying: boolean;
    onPlayTrack: (project: Project, trackId: string) => void;
    onTogglePlay: () => void;
}

type Tab = 'beat_tapes' | 'releases' | 'services' | 'sound_packs' | 'about' | 'private';

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
    const [createModalInitialType, setCreateModalInitialType] = useState<'beat_tape' | 'sound_pack' | 'release' | undefined>(undefined);
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
        role: '',
        yearsExperience: '',
        satisfactionRate: '',
        avgTurnaround: ''
    });

    // Local projects state
    const [localProjects, setLocalProjects] = useState<Project[]>([]);
    const [hidePrivate, setHidePrivate] = useState(false);

    // Hidden file inputs for image uploads
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [isBannerAdjustOpen, setIsBannerAdjustOpen] = useState(false);

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

    // Helper to determine available tabs based on role
    const getAvailableTabs = () => {
        const role = userProfile?.role?.toLowerCase() || 'producer';
        const isOwner = !isViewerMode && isOwnProfile;

        let tabs: Tab[] = [];

        const isPublic = userProfile?.is_public ?? true;

        if (role === 'artist') {
            tabs = ['releases', 'services'];
        } else if (role === 'producer') {
            tabs = ['beat_tapes', 'sound_packs', 'services'];
        } else if (role === 'engineer') {
            tabs = ['beat_tapes', 'releases', 'sound_packs', 'services'];
        } else if (role === 'platform') {
            tabs = ['services'];
        } else {
            // Fallback
            tabs = ['beat_tapes', 'sound_packs', 'services'];
        }

        // Studio releases (beat_tapes) are now public
        // if (isViewerMode || !isOwnProfile) {
        //     tabs = tabs.filter(t => t !== 'beat_tapes');
        // }

        // If private profile and in viewer mode (or not owner), restrict tabs
        if (!isPublic && (isViewerMode || !isOwnProfile)) {
            return []; // No tabs when private for visitors
        }

        // Dynamically show Releases tab if user has content (even if role doesn't default to it)
        const hasReleases = localProjects.some(p => p.type === 'release' && p.status === 'published');
        if (hasReleases && !tabs.includes('releases')) {
            // Insert releases in logical order (usually after beat_tapes loop kits)
            // Or just push it - simplest approach
            // A better place might be second if beat_tapes exists, or first
            if (tabs.includes('beat_tapes')) {
                const idx = tabs.indexOf('beat_tapes');
                tabs.splice(idx + 1, 0, 'releases');
            } else {
                tabs.unshift('releases');
            }
        }

        if (isOwner) {
            tabs.push('private');
        }

        return tabs;
    };

    const availableTabs = getAvailableTabs();

    // Effect to reset active tab if not available for current role
    useEffect(() => {
        if (!userProfile) return;
        const tabs = getAvailableTabs();
        if (!tabs.includes(activeTab)) {
            setActiveTab(tabs[0]);
        }
    }, [userProfile?.role, isViewerMode, isOwnProfile]);



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
            role: editForm.role,
            yearsExperience: editForm.yearsExperience,
            satisfactionRate: editForm.satisfactionRate,
            avgTurnaround: editForm.avgTurnaround
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
                    role: editForm.role,
                    yearsExperience: editForm.yearsExperience,
                    satisfactionRate: editForm.satisfactionRate,
                    avgTurnaround: editForm.avgTurnaround,
                    bannerSettings: userProfile.bannerSettings
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
            } catch (error: any) {
                console.error('Error uploading file:', error);
                alert(`Failed to upload image: ${error.message || 'Unknown error'}`);
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
            role: userProfile.role || "",
            yearsExperience: userProfile.yearsExperience || "",
            satisfactionRate: userProfile.satisfactionRate || "",
            avgTurnaround: userProfile.avgTurnaround || ""
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

    const handleProjectStatusChange = (project: Project, newStatus: string) => {
        setLocalProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: newStatus as any } : p));
    };

    return (
        <div className="relative w-full -mt-4 lg:-mt-12 animate-in fade-in duration-500 min-h-screen overflow-x-hidden">
            {isBannerAdjustOpen && userProfile?.banner && (
                <BannerPositionManager
                    imageUrl={userProfile.banner}
                    initialSettings={userProfile.bannerSettings as any}
                    onSave={(settings) => {
                        setUserProfile(prev => prev ? ({ ...prev, bannerSettings: settings }) : null);
                        setIsBannerAdjustOpen(false);
                    }}
                    onCancel={() => setIsBannerAdjustOpen(false)}
                />
            )}

            <CreateProjectModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveProject}
                initialType={createModalInitialType}
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

            <div className="w-full max-w-[1900px] mx-auto px-4 lg:px-10 xl:px-14 pb-20 lg:pb-12 pt-[30px]">

                {/* EDIT PROFILE MODAL - RESPONSIVE */}
                {isEditModalOpen && createPortal(
                    <div className="fixed inset-0 z-[200] flex flex-col lg:items-center lg:justify-center bg-black lg:bg-black/80 lg:backdrop-blur-sm lg:p-4 animate-in fade-in duration-200">
                        <div className="flex-1 lg:flex-none w-full lg:max-w-3xl bg-black lg:bg-[#0a0a0a] lg:border border-transparent lg:rounded-xl lg:shadow-2xl overflow-hidden flex flex-col h-full lg:max-h-[90vh]">

                            {/* HEADER */}
                            <div className="p-4 border-b border-transparent flex justify-between items-center bg-neutral-900/50 backdrop-blur-md shrink-0">
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
                                    <div className="space-y-4 pb-4 border-b border-transparent">
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3">Profile Assets</h4>

                                        {/* Banner Upload */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Banner Image</label>
                                            <div className="flex gap-2 mb-2">
                                                <button
                                                    onClick={() => bannerInputRef.current?.click()}
                                                    className="flex-1 h-32 rounded-lg bg-neutral-900/50 border border-transparent flex flex-col items-center justify-center text-neutral-500 hover:text-white hover:border-primary/30 hover:bg-white/5 transition-all cursor-pointer overflow-hidden relative group"
                                                >
                                                    {userProfile.banner ? (
                                                        <img
                                                            src={userProfile.banner}
                                                            className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity"
                                                            alt="Banner Preview"
                                                            style={{
                                                                transform: (() => {
                                                                    const s = userProfile.bannerSettings;
                                                                    if (!s) return 'none';
                                                                    // Default to desktop for this preview or handle mixed
                                                                    const set = ('desktop' in s) ? s.desktop : (s as any);
                                                                    return `translate(${set.x - 50}%, ${set.y - 50}%) scale(${set.scale})`;
                                                                })()
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-neutral-900 animate-pulse" />
                                                    )}
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 drop-shadow-md">
                                                        <Camera size={24} className="text-primary" />
                                                        <span className="text-[10px] uppercase font-bold bg-black/50 px-2 py-1 rounded backdrop-blur-sm">Change Image</span>
                                                    </div>
                                                </button>
                                            </div>

                                            {userProfile.banner && (
                                                <button
                                                    onClick={() => setIsBannerAdjustOpen(true)}
                                                    className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors mb-4"
                                                >
                                                    <Move size={14} /> Adjust Position (Desktop & Mobile)
                                                </button>
                                            )}
                                        </div>

                                        {/* Avatar Upload */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Profile Picture</label>
                                            <div className="flex items-center gap-4">
                                                <div
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    className="h-20 w-20 rounded-full bg-neutral-900 border border-transparent overflow-hidden shrink-0 relative group cursor-pointer"
                                                >
                                                    <img src={userProfile.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" alt="Avatar Preview" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Camera size={20} className="text-white" />
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    className="px-4 py-2 bg-white/5 border border-transparent rounded-lg text-xs font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                                                >
                                                    <Camera size={14} />
                                                    Change Avatar
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Display Name</label>
                                                <input
                                                    value={editForm.username}
                                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                                    className="w-full bg-neutral-900/50 border border-transparent rounded-lg px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors focus:bg-neutral-900"
                                                    placeholder="Your Artist Name"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Role</label>
                                                <div className="relative">
                                                    <CustomDropdown
                                                        value={editForm.role}
                                                        onChange={(val) => setEditForm({ ...editForm, role: val })}
                                                        options={[
                                                            { value: 'artist', label: 'Artist' },
                                                            { value: 'producer', label: 'Producer' },
                                                            { value: 'engineer', label: 'Engineer' },
                                                            { value: 'professional', label: 'Professional / Other' },
                                                            { value: 'listener', label: 'Listener' }
                                                        ]}
                                                        placeholder="Select your role..."
                                                        className="z-[110]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Handle (Username)</label>
                                            <div className="relative opacity-70">
                                                <input
                                                    value={userProfile.handle}
                                                    disabled
                                                    className="w-full bg-neutral-900 border border-transparent rounded-lg px-4 py-3 text-sm text-neutral-400 cursor-not-allowed"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 font-mono">Read-only</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Location</label>
                                                <div className="relative">
                                                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                                    <input
                                                        value={editForm.location}
                                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                                        className="w-full bg-neutral-900/50 border border-transparent rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors focus:bg-neutral-900"
                                                        placeholder="City, Country"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Website</label>
                                                <div className="relative">
                                                    <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                                    <input
                                                        value={editForm.website}
                                                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                                        className="w-full bg-neutral-900/50 border border-transparent rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors focus:bg-neutral-900"
                                                        placeholder="https://your-site.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Years Exp.</label>
                                                <input
                                                    value={editForm.yearsExperience}
                                                    onChange={(e) => setEditForm({ ...editForm, yearsExperience: e.target.value })}
                                                    className="w-full bg-neutral-900/50 border border-transparent rounded-lg px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors focus:bg-neutral-900"
                                                    placeholder="e.g. 5+"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Satisfaction</label>
                                                <input
                                                    value={editForm.satisfactionRate}
                                                    onChange={(e) => setEditForm({ ...editForm, satisfactionRate: e.target.value })}
                                                    className="w-full bg-neutral-900/50 border border-transparent rounded-lg px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors focus:bg-neutral-900"
                                                    placeholder="e.g. 100%"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Avg. Turnaround</label>
                                                <input
                                                    value={editForm.avgTurnaround}
                                                    onChange={(e) => setEditForm({ ...editForm, avgTurnaround: e.target.value })}
                                                    className="w-full bg-neutral-900/50 border border-transparent rounded-lg px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors focus:bg-neutral-900"
                                                    placeholder="e.g. 24h"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Bio</label>
                                            <textarea
                                                value={editForm.bio}
                                                onChange={(e) => {
                                                    setEditForm({ ...editForm, bio: e.target.value });
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 400)}px`;
                                                }}
                                                style={{ height: 'auto', minHeight: '128px' }}
                                                className="w-full bg-neutral-900/50 border border-transparent rounded-lg px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none resize-none transition-all focus:bg-neutral-900 custom-scrollbar"
                                                placeholder="Tell your story..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div className="p-4 border-t border-transparent bg-neutral-900/50 lg:bg-neutral-900/30 backdrop-blur-md flex justify-end gap-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-4">
                                <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 lg:py-2 rounded-xl lg:rounded-lg text-xs font-bold text-neutral-400 hover:text-white transition-colors bg-white/5 border border-transparent lg:bg-transparent lg:border-none">
                                    Cancel
                                </button>
                                <button onClick={handleSaveProfile} className="flex-1 lg:flex-none px-8 py-3 lg:py-2 bg-primary text-black rounded-xl lg:rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* HEADER SECTION */}
                <div className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-transparent mb-6 group/header shadow-lg">

                    {/* View Controls (Top Right) */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                        {/* Private Indicator for Owner */}
                        {isOwnProfile && !(userProfile?.is_public ?? true) && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/80 backdrop-blur-md border border-white/5 text-neutral-400">
                                <Lock size={12} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Private</span>
                            </div>
                        )}

                        {isOwnProfile && !isViewerMode && (
                            <button
                                onClick={openEditModal}
                                className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md text-xs font-bold border bg-black/60 border-transparent text-white hover:bg-black/80 transition-all shadow-lg"
                            >
                                <Edit3 size={14} />
                                Edit Profile
                            </button>
                        )}
                        {isOwnProfile && (
                            <button
                                onClick={() => setIsViewerMode(!isViewerMode)}
                                className={`
                            flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md text-xs font-bold border transition-all shadow-lg
                            ${isViewerMode
                                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
                                        : 'bg-black/60 border-transparent text-white hover:bg-black/80'
                                    }
                        `}
                            >
                                {isViewerMode ? <Eye size={14} /> : <EyeOff size={14} />}
                                {isViewerMode ? 'Viewing as Visitor' : 'Owner View'}
                            </button>
                        )}
                    </div>

                    {/* Hidden Inputs for File Upload */}
                    <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner')} />
                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />

                    {/* Banner Background */}
                    <div
                        className={`
                    absolute inset-0 w-full h-full bg-[#0a0a0a] z-0
                    ${!isViewerMode ? 'cursor-pointer group/banner' : ''}
                `}
                        onClick={triggerBannerUpload}
                    >
                        {userProfile.banner ? (
                            <div className="w-full h-full relative">
                                <img
                                    src={userProfile.banner}
                                    className={`
                                w-full h-full object-cover transition-all duration-700
                                ${!isViewerMode ? 'group-hover/banner:scale-105 group-hover/banner:opacity-50' : ''}
                            `}
                                    alt="Banner"
                                    style={{
                                        transform: (() => {
                                            const s = userProfile.bannerSettings;
                                            if (!s) return 'none';

                                            // Handle multi-device vs legacy single-device
                                            let set;
                                            if ('desktop' in s) {
                                                // Responsive check: simpler to use matchesMedia or just CSS vars
                                                // Since we are inside a style object, we use window width check
                                                // Note: this only runs on render.
                                                const isMobile = window.innerWidth < 1024;
                                                set = isMobile ? s.mobile : s.desktop;
                                            } else {
                                                set = s as any;
                                            }

                                            return `translate(${set.x - 50}%, ${set.y - 50}%) scale(${set.scale})`;
                                        })()
                                    }}
                                />
                                {/* Gradient Overlay for Text Readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />
                            </div>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#111111] via-[#0a0a0a] to-black"></div>
                        )}

                        {/* Banner Hover Overlay - Hidden on Mobile to prevent "pops up" issue */}
                        {!isViewerMode && isOwnProfile && (
                            <div className="absolute inset-0 hidden md:flex items-center justify-center gap-2 opacity-0 group-hover/banner:opacity-100 transition-all duration-300 bg-black/40 backdrop-blur-sm z-20">
                                <Camera size={18} />
                                <span className="text-xs font-bold uppercase tracking-wide">Change Banner</span>
                            </div>
                        )}
                    </div>

                    {/* Profile Content Layer */}
                    <div className="relative z-10 px-4 md:px-8 pb-4 md:pb-8 pt-[72px] md:pt-32 flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-8 pointer-events-none">

                        {/* Avatar */}
                        <div className={`
                    relative z-30 shrink-0 rounded-2xl md:rounded-3xl p-1 md:p-1.5 bg-[#0a0a0a] shadow-2xl pointer-events-auto
                    ${!isViewerMode ? 'cursor-pointer group/avatar' : ''}
                `} onClick={triggerAvatarUpload}>
                            <div className="h-24 w-24 md:h-44 md:w-44 rounded-xl md:rounded-2xl bg-neutral-800 overflow-hidden relative border border-white/5">
                                <img src={userProfile.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'} alt="Avatar" className="w-full h-full object-cover" />

                                {/* Avatar Hover Overlay */}
                                {!isViewerMode && isOwnProfile && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                                        <Camera size={28} className="text-white drop-shadow-lg" />
                                    </div>
                                )}
                            </div>
                            {/* Only show Verified tick if plan is Pro or Studio+ */}
                            {(userProfile.plan === 'Pro' || userProfile.plan === 'Studio+') && (
                                <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 bg-[#0a0a0a] p-1 md:p-1.5 rounded-full border border-white/10 z-40 pointer-events-none">
                                    <Verified className="text-blue-400 fill-blue-400/10 w-4 h-4 md:w-6 md:h-6" />
                                </div>
                            )}
                        </div>

                        {/* Info & Actions */}
                        <div className="flex-1 min-w-0 pb-2 flex flex-col md:flex-row justify-between items-end gap-6 w-full pointer-events-auto">

                            {/* Text Info */}
                            <div className="w-full md:w-auto mt-2 md:mt-0">
                                <div className="flex items-center gap-2 md:gap-3 mb-1">
                                    <h1 className="text-2xl md:text-5xl font-black text-white tracking-tight">{userProfile.username}</h1>
                                    {/* Dynamic Plan Badge */}
                                    {userProfile.plan && userProfile.plan !== 'Basic' && (
                                        <span className={`px-1.5 py-0.5 md:px-2 md:py-0.5 rounded text-[9px] md:text-[10px] font-mono font-bold border uppercase
                                            ${userProfile.plan === 'Studio+'
                                                ? 'bg-amber-500/20 text-amber-500 border-amber-500/20'
                                                : 'bg-primary/20 text-primary border-primary/20'
                                            }
                                        `}>
                                            {userProfile.plan}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-2 text-sm text-neutral-400 mt-1 md:mt-2">
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
                            <div className="flex flex-col-reverse md:flex-row items-stretch gap-4 md:gap-6 w-full md:w-auto mt-4 md:mt-0 md:translate-y-6">
                                <div className="flex items-stretch gap-3 w-full md:w-auto">
                                    {(isViewerMode || !isOwnProfile) && (
                                        <>
                                            <button
                                                onClick={handleToggleFollow}
                                                disabled={isFollowLoading || isOwnProfile}
                                                className={`px-4 md:px-10 py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border flex-1 md:flex-auto ${isOwnProfile
                                                    ? 'bg-neutral-800 border-white/10 text-neutral-500 cursor-not-allowed opacity-50'
                                                    : isFollowing
                                                        ? 'bg-primary/20 border-primary/20 text-primary hover:bg-red-500/20 hover:border-red-500 hover:text-red-500'
                                                        : 'bg-primary border-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)]'
                                                    } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <UserPlus size={16} />
                                                {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                                            </button>
                                            <button
                                                onClick={handleMessage}
                                                className="px-4 md:px-10 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-2 flex-1 md:flex-auto"
                                            >
                                                <MessageSquare size={16} />
                                                MESSAGE
                                            </button>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center divide-x divide-white/10 bg-neutral-900/50 rounded-xl border border-white/5 backdrop-blur-md w-full md:w-auto">
                                    <div className="px-4 md:px-5 py-2 md:py-3 text-center flex-1 md:flex-none">
                                        <div className="text-base md:text-lg font-black text-white font-mono">{userProfile.streams ? userProfile.streams.toLocaleString() : '0'}</div>
                                        <div className="text-[8px] md:text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Streams</div>
                                    </div>
                                    <div className="px-4 md:px-5 py-2 md:py-3 text-center flex-1 md:flex-none">
                                        <div className="text-base md:text-lg font-black text-white font-mono">{userProfile.subscribers.toLocaleString()}</div>
                                        <div className="text-[8px] md:text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Followers</div>
                                    </div>
                                    <div className="px-6 md:px-8 py-2 md:py-3 text-center flex-1 md:flex-none">
                                        <div className="text-base md:text-lg font-black text-primary flex items-center justify-center gap-1 font-mono">
                                            {userProfile.gems !== undefined ? userProfile.gems.toLocaleString() : '0'} <Gem size={14} />
                                        </div>
                                        <div className="text-[8px] md:text-[9px] text-neutral-500 font-bold uppercase tracking-widest">Gems</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PRIVATE PROFILE STATE */}
                {(!userProfile.is_public && (isViewerMode || !isOwnProfile)) ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-500">
                        <div className="w-20 h-20 rounded-full bg-neutral-900 flex items-center justify-center mb-6">
                            <Lock size={32} className="text-neutral-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">This Account is Private</h2>
                        <p className="text-neutral-400 max-w-md">
                            @{userProfile.handle} has restricted access to their profile content.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* TABS NAVIGATION */}
                        <div className="relative bg-[#050505] lg:border-b lg:border-white/10 -mx-4 px-4 lg:-mx-8 lg:px-8 mb-4 lg:mb-6 py-2 transition-all">

                            {/* Mobile Tabs Layout */}
                            <div className="lg:hidden relative pb-2">
                                <div className={`grid grid-cols-${Math.min(availableTabs.length, 5)} gap-1 p-1 bg-neutral-900/50 rounded-lg border border-white/5`}>
                                    {availableTabs.map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`
                                        flex flex-col items-center justify-center gap-1 py-1.5 rounded transition-all
                                        ${activeTab === tab ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}
                                    `}
                                        >
                                            {tab === 'beat_tapes' && <Disc size={14} className={activeTab === 'beat_tapes' ? 'text-primary' : ''} />}
                                            {tab === 'releases' && <Disc size={14} className={activeTab === 'releases' ? 'text-primary' : ''} />}
                                            {tab === 'sound_packs' && <Box size={14} className={activeTab === 'sound_packs' ? 'text-primary' : ''} />}
                                            {tab === 'services' && <LayoutList size={14} className={activeTab === 'services' ? 'text-primary' : ''} />}
                                            {tab === 'about' && <Info size={14} className={activeTab === 'about' ? 'text-primary' : ''} />}
                                            {tab === 'private' && <Lock size={14} className={activeTab === 'private' ? 'text-primary' : ''} />}

                                            <span className="text-[9px] font-bold uppercase tracking-tight">
                                                {tab === 'beat_tapes' ? 'Projects' :
                                                    tab === 'releases' ? 'Releases' :
                                                        tab === 'sound_packs' ? 'Sounds' :
                                                            tab === 'services' ? 'Services' :
                                                                tab === 'private' ? 'Private' : 'About'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Desktop Horizontal Layout */}
                            <div className="hidden lg:flex items-center gap-8 overflow-x-auto no-scrollbar whitespace-nowrap">
                                {availableTabs.includes('beat_tapes') && (
                                    <TabButton active={activeTab === 'beat_tapes'} onClick={() => setActiveTab('beat_tapes')} icon={<Music size={18} />} label="Projects" count={localProjects.filter(p => p.status === 'published' && p.type === 'beat_tape').length} />
                                )}
                                {availableTabs.includes('releases') && (
                                    <TabButton active={activeTab === 'releases'} onClick={() => setActiveTab('releases')} icon={<Disc size={18} />} label="Releases" count={localProjects.filter(p => p.status === 'published' && p.type === 'release').length} />
                                )}
                                {availableTabs.includes('sound_packs') && (
                                    <TabButton active={activeTab === 'sound_packs'} onClick={() => setActiveTab('sound_packs')} icon={<Box size={18} />} label="Sound Packs" count={userProfile.soundPacks.length} />
                                )}
                                {availableTabs.includes('services') && (
                                    <TabButton active={activeTab === 'services'} onClick={() => setActiveTab('services')} icon={<LayoutList size={18} />} label="Services" count={userProfile.services.length} />
                                )}
                                {availableTabs.includes('private') && (
                                    <TabButton active={activeTab === 'private'} onClick={() => setActiveTab('private')} icon={<Lock size={18} />} label="Private" count={localProjects.filter(p => p.status !== 'published').length} />
                                )}
                                <TabButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon={<Info size={18} />} label="About" />
                            </div>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="animate-in fade-in duration-500 min-h-0 px-0 md:px-0">

                            {activeTab === 'beat_tapes' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Music size={18} className="text-primary" /> Latest Projects
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <button className="text-[10px] font-mono text-neutral-500 border border-white/10 px-3 py-1.5 rounded hover:text-white hover:bg-white/5 transition-colors uppercase">
                                                Sort By: Newest
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* Create Project Card - Only for Owner */}
                                        {!isViewerMode && isOwnProfile && (
                                            <div
                                                onClick={() => {
                                                    setCreateModalInitialType('beat_tape');
                                                    setIsCreateModalOpen(true);
                                                }}
                                                className="border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center h-[220px] md:h-[282px] text-neutral-600 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group bg-[#0a0a0a] relative overflow-hidden"
                                            >
                                                <div className="h-16 w-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg relative z-10 group-hover:shadow-primary/20">
                                                    <Box size={24} />
                                                </div>
                                                <span className="font-mono text-xs font-bold uppercase tracking-widest relative z-10">Create Project</span>
                                            </div>
                                        )}

                                        {localProjects.filter(project => project.status === 'published' && project.type === 'beat_tape').length === 0 && (isViewerMode || !isOwnProfile) ? (
                                            <div className="col-span-1 md:col-span-2 lg:col-span-4">
                                                <EmptyStateCard
                                                    icon={Music}
                                                    title="No Projects Found"
                                                    description="This user hasn't published any projects yet."
                                                />
                                            </div>
                                        ) : (
                                            localProjects
                                                .filter(project => project.status === 'published' && project.type === 'beat_tape')
                                                .map(project => (
                                                    <div key={project.id} className="h-auto md:h-[282px]">
                                                        <ProjectCard
                                                            project={project}
                                                            currentTrackId={currentTrackId}
                                                            isPlaying={currentProject?.id === project.id && isPlaying}
                                                            onPlayTrack={(trackId) => onPlayTrack(project, trackId)}
                                                            onTogglePlay={onTogglePlay}
                                                            onEdit={!isViewerMode && isOwnProfile ? handleEditProject : undefined}
                                                            onDelete={!isViewerMode && isOwnProfile ? handleDeleteProject : undefined}
                                                            onStatusChange={handleProjectStatusChange}
                                                        />
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'releases' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Disc size={18} className="text-primary" /> Latest Releases
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <button className="text-[10px] font-mono text-neutral-500 border border-white/10 px-3 py-1.5 rounded hover:text-white hover:bg-white/5 transition-colors uppercase">
                                                Sort By: Newest
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* Create Project Card - Only for Owner */}
                                        {!isViewerMode && isOwnProfile && (
                                            <div
                                                onClick={() => {
                                                    setCreateModalInitialType('release');
                                                    setIsCreateModalOpen(true);
                                                }}
                                                className="border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center h-[220px] md:h-[282px] text-neutral-600 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group bg-[#0a0a0a] relative overflow-hidden"
                                            >
                                                <div className="h-16 w-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg relative z-10 group-hover:shadow-primary/20">
                                                    <Disc size={24} />
                                                </div>
                                                <span className="font-mono text-xs font-bold uppercase tracking-widest relative z-10">Add Release</span>
                                            </div>
                                        )}

                                        {localProjects.filter(project => project.status === 'published' && project.type === 'release').length === 0 && (isViewerMode || !isOwnProfile) ? (
                                            <div className="col-span-1 md:col-span-2 lg:col-span-4">
                                                <EmptyStateCard
                                                    icon={Disc}
                                                    title="No Releases Found"
                                                    description="This artist hasn't published any releases yet."
                                                />
                                            </div>
                                        ) : (
                                            localProjects
                                                .filter(project => project.status === 'published' && project.type === 'release')
                                                .map(project => (
                                                    <div key={project.id} className="h-auto md:h-[282px]">
                                                        <ProjectCard
                                                            project={project}
                                                            currentTrackId={currentTrackId}
                                                            isPlaying={currentProject?.id === project.id && isPlaying}
                                                            onPlayTrack={(trackId) => onPlayTrack(project, trackId)}
                                                            onTogglePlay={onTogglePlay}
                                                            onEdit={!isViewerMode && isOwnProfile ? handleEditProject : undefined}
                                                            onDelete={!isViewerMode && isOwnProfile ? handleDeleteProject : undefined}
                                                            onStatusChange={handleProjectStatusChange}
                                                        />
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'services' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            <LayoutList size={18} className="text-primary" /> Services Available
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <button className="text-[10px] font-mono text-neutral-500 border border-white/10 px-3 py-1.5 rounded hover:text-white hover:bg-white/5 transition-colors uppercase">
                                                Sort By: Newest
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* Create Service Card - Only for Owner */}
                                        {!isViewerMode && isOwnProfile && (
                                            <div
                                                onClick={() => setIsCreateServiceModalOpen(true)}
                                                className="border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center h-[220px] md:h-[282px] text-neutral-600 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group bg-[#0a0a0a] relative overflow-hidden"
                                            >
                                                <div className="h-16 w-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg relative z-10 group-hover:shadow-primary/20">
                                                    <Mic2 size={24} />
                                                </div>
                                                <span className="font-mono text-xs font-bold uppercase tracking-widest relative z-10">Create Service</span>
                                            </div>
                                        )}

                                        {userProfile.services.length === 0 && (isViewerMode || !isOwnProfile) ? (
                                            <div className="col-span-1 md:col-span-2 lg:col-span-4">
                                                <EmptyStateCard
                                                    icon={Mic2}
                                                    title="No Services Available"
                                                    description="This user hasn't listed any services yet."
                                                />
                                            </div>
                                        ) : (
                                            userProfile.services.map(service => (
                                                <ServiceCard
                                                    key={service.id}
                                                    service={service}
                                                    user={userProfile}
                                                    onClick={() => {
                                                        // Handle booking logic or navigation
                                                        console.log('Book service', service.id);
                                                    }}
                                                />
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'sound_packs' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Box size={18} className="text-primary" /> Sound Kits
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <button className="text-[10px] font-mono text-neutral-500 border border-white/10 px-3 py-1.5 rounded hover:text-white hover:bg-white/5 transition-colors uppercase">
                                                Sort By: Newest
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {/* Create Soundpack Card - Only for Owner */}
                                        {!isViewerMode && isOwnProfile && (
                                            <div
                                                onClick={() => setIsCreateSoundpackModalOpen(true)}
                                                className="border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center h-[220px] md:h-[282px] text-neutral-600 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group bg-[#0a0a0a] relative overflow-hidden"
                                            >
                                                <div className="h-16 w-16 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg relative z-10 group-hover:shadow-primary/20">
                                                    <Box size={24} />
                                                </div>
                                                <span className="font-mono text-xs font-bold uppercase tracking-widest relative z-10">Create Soundpack</span>
                                            </div>
                                        )}

                                        {userProfile.soundPacks.length === 0 && (isViewerMode || !isOwnProfile) ? (
                                            <div className="col-span-1 md:col-span-2 lg:col-span-4">
                                                <EmptyStateCard
                                                    icon={Box}
                                                    title="No Soundpacks Available"
                                                    description="This user hasn't published any soundpacks yet."
                                                />
                                            </div>
                                        ) : (
                                            userProfile.soundPacks.map(pack => (
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
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'private' && (
                                <div className="animate-in fade-in duration-500">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Lock size={18} className="text-primary" /> Private Projects
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <button className="text-[10px] font-mono text-neutral-500 border border-white/10 px-3 py-1.5 rounded hover:text-white hover:bg-white/5 transition-colors uppercase">
                                                Sort By: Newest
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {localProjects.filter(p => p.status !== 'published').length === 0 ? (
                                            <div className="col-span-1 md:col-span-2 lg:col-span-4">
                                                <EmptyStateCard
                                                    icon={Lock}
                                                    title="No Private Projects"
                                                    description="You don't have any private or draft projects."
                                                />
                                            </div>
                                        ) : (
                                            localProjects
                                                .filter(p => p.status !== 'published')
                                                .map(project => (
                                                    <div key={project.id} className="h-auto md:h-[282px]">
                                                        <ProjectCard
                                                            project={project}
                                                            currentTrackId={currentTrackId}
                                                            isPlaying={currentProject?.id === project.id && isPlaying}
                                                            onPlayTrack={(trackId) => onPlayTrack(project, trackId)}
                                                            onTogglePlay={onTogglePlay}
                                                            onEdit={!isViewerMode && isOwnProfile ? handleEditProject : undefined}
                                                            onDelete={!isViewerMode && isOwnProfile ? handleDeleteProject : undefined}
                                                            onStatusChange={handleProjectStatusChange}
                                                        />
                                                    </div>
                                                ))
                                        )}
                                    </div>
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
                                            <StatsCard value={userProfile.yearsExperience || "0"} label="Years Exp." />
                                            <StatsCard value={(userProfile.projectsSold || 0).toString()} label="Projects Sold" />
                                            <StatsCard value={userProfile.satisfactionRate || "100%"} label="Satisfaction" />
                                            <StatsCard value={userProfile.avgTurnaround || "24h"} label="Avg. Turnaround" />
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
                                                    <span key={tag} className="px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition-colors cursor-default">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div >
        </div >
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
                : 'bg-neutral-900/50 text-neutral-400 border-white/10 hover:text-white hover:border-neutral-700'
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
                : 'border-white/10 text-neutral-500 hover:text-neutral-300 hover:border-neutral-500'
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
    <div className="w-full max-w-[1600px] mx-auto pb-0 -mt-6 px-6 lg:px-8 animate-in fade-in duration-500">
        <div className="relative rounded-3xl overflow-hidden bg-[#0a0a0a] border border-white/10 mb-8 shadow-2xl animate-pulse">
            <div className="h-16 md:h-36 w-full bg-neutral-900 border-b border-white/5"></div>
            <div className="relative px-8 pb-8 -mt-12 flex flex-col md:flex-row items-end gap-8">
                <div className="relative z-30 shrink-0 rounded-3xl p-1.5 bg-[#0a0a0a]">
                    <div className="h-44 w-44 rounded-2xl bg-neutral-800 border border-neutral-700"></div>
                </div>
                <div className="flex-1 w-full pb-2 space-y-4">
                    <div className="h-10 w-48 bg-neutral-800 rounded-lg"></div>
                    <div className="h-4 w-32 bg-neutral-800 rounded"></div>
                </div>
            </div>
        </div>
        <div className="flex gap-8 mb-8 border-b border-white/10 pb-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-6 w-24 bg-neutral-900 rounded"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-auto md:h-[282px] bg-neutral-900/50 rounded-xl border border-white/10"><ProjectSkeleton /></div>)}
        </div>
    </div>
);
