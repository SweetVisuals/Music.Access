import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Project,
  UserProfile,
  Service,
  Order,
  Conversation,
  Contract,
  Note,
  TalentProfile,
  CollabService,
  Purchase,
  LicenseInfo,
  Goal,
  DashboardAnalytics,
  Notification,
  Strategy,
  CalendarEvent
} from '../types';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const isUuid = (val: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(val);
};

// Add SavedProject interface
export interface SavedProject {
  id: string;
  user_id: string;
  project_id: string;
  created_at: string;
  project?: Project;
}

console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key exists:', !!SUPABASE_ANON_KEY);

// Create Supabase client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth functions
export const signUp = async (email: string, password: string, username: string, handle: string, role?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        handle,
        role
      }
    }
  });
  if (error) throw error;

  // Create user profile in our users table
  if (data.user) {
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        username,
        handle,
        email,
        role: role || 'producer', // Save the selected role (lowercase for consistency)
        hashed_password: '', // Not needed since Supabase handles auth
        gems: 0,
        balance: 0.00
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Don't throw here as auth was successful
    }
  }

  return data;
};

export const signIn = async (email: string, password: string) => {
  console.log('Attempting sign in for:', email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    console.error('Sign in error:', error);
    throw error;
  }
  console.log('Sign in successful');
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const updatePassword = async (oldPassword: string, newPassword: string) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || !user.email) throw new Error('User not authenticated');

  // Verify old password by signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: oldPassword
  });

  if (signInError) {
    throw new Error('Incorrect current password');
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) throw updateError;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper function to format time
export const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// Helper: Extract sale amount safely (handling missing 'amount' column)
export const getSaleAmount = (sale: any): number => {
  if (sale.amount !== undefined && sale.amount !== null) return Number(sale.amount);
  if (sale.purchase_items && sale.purchase_items.length > 0) {
    return sale.purchase_items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
  }
  return 0;
};

// Helper function to format date
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Database functions
export const getProjectById = async (id: string): Promise<Project> => {
  let query = supabase.from('projects').select(`
      *,
      user:user_id (
        username,
        handle,
        avatar_url
      ),
      tracks (
        id,
        title,
        duration_seconds,
        track_number,
        note_id,
        status_tags,
        assigned_file_id
      ),
      project_licenses (
        license:licenses (
          id,
          name,
          type,
          default_price,
          features,
          file_types_included
        ),
        price
      ),
      project_tags (
        tag:tags (
          name
        )
      ),
      tasks (
        id,
        project_id,
        text,
        completed,
        created_at
      )
    `);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (isUuid) {
    query = query.eq('id', id);
  } else {
    query = query.eq('short_id', id);
  }

  const { data, error } = await query.single(); // Only show published projects on public pages


  if (error) throw error;

  // Manual Asset Fetching (Workaround for missing FK)
  const projectData = data as any;
  const assetIds = new Set<string>();

  projectData.tracks?.forEach((t: any) => {
    if (t.assigned_file_id) assetIds.add(t.assigned_file_id);
  });

  const assetMap = new Map<string, string>();
  if (assetIds.size > 0) {
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, storage_path')
      .in('id', Array.from(assetIds));

    if (!assetsError && assets) {
      assets.forEach((a: any) => {
        if (a.storage_path) {
          const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(a.storage_path);
          assetMap.set(a.id, publicUrl);
        }
      });
    }
  }

  // Transform data to match Project interface
  const projectFormatted: Project = {
    id: projectData.id,
    shortId: projectData.short_id,
    title: projectData.title,
    producer: projectData.user?.username || 'Unknown',
    producerHandle: projectData.user?.handle,
    producerAvatar: projectData.user?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
    coverImage: projectData.cover_image_url,
    price: projectData.project_licenses?.[0]?.price || projectData.project_licenses?.[0]?.license?.default_price || 0,
    bpm: projectData.bpm,
    key: projectData.key,
    genre: projectData.genre,
    subGenre: projectData.sub_genre,
    type: projectData.type,
    tags: projectData.project_tags?.map((pt: any) => pt.tag?.name).filter(Boolean) || [],
    tracks: projectData.tracks?.map((track: any) => {
      // Use manually fetched URL (prioritize) or fallback logic if we kept the join (we removed it)
      const mp3Url = track.assigned_file_id ? (assetMap.get(track.assigned_file_id) || '') : '';

      return {
        id: track.id,
        title: track.title,
        duration: track.duration_seconds,
        trackNumber: track.track_number,
        noteId: track.note_id,
        statusTags: track.status_tags,
        assignedFileId: track.assigned_file_id,
        files: {
          mp3: mp3Url
        }
      };
    }) || [],
    description: projectData.description,
    licenses: projectData.project_licenses?.map((pl: any) => ({
      id: pl.license?.id,
      type: pl.license?.type,
      name: pl.license?.name,
      price: pl.price || pl.license?.default_price,
      features: pl.license?.features || [],
      fileTypesIncluded: pl.license?.file_types_included || []
    })) || [],
    status: projectData.status,
    created: projectData.created_at,
    userId: projectData.user_id,
    releaseDate: projectData.release_date,
    format: projectData.format,
    progress: projectData.progress,
    gems: projectData.gems || 0, // Map gems from DB or default to 0
    tasks: projectData.tasks?.map((t: any) => ({ id: t.id, projectId: t.project_id, text: t.text, completed: t.completed, createdAt: t.created_at })) || []
  };
  return projectFormatted;
};

export const getProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      user:user_id (
        username,
        handle,
        avatar_url
      ),
      tracks (
        id,
        title,
        duration_seconds,
        track_number,
        note_id,
        status_tags,
        assigned_file_id
      ),
      project_licenses (
        license:licenses (
          id,
          name,
          type,
          default_price,
          features,
          file_types_included
        ),
        price
      ),
      project_tags (
        tag:tags (
          name
        )
      ),
      tasks (
        id,
        project_id,
        text,
        completed,
        created_at
      )
    `)
    .eq('status', 'published'); // Only show published projects on public pages


  if (error) throw error;

  // Manual Asset Fetching (Workaround for missing FK)
  const projectsData = data as any[];
  const assetIds = new Set<string>();

  projectsData.forEach(p => {
    p.tracks?.forEach((t: any) => {
      if (t.assigned_file_id) assetIds.add(t.assigned_file_id);
    });
  });

  const assetMap = new Map<string, string>();
  if (assetIds.size > 0) {
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id, storage_path')
      .in('id', Array.from(assetIds));

    if (!assetsError && assets) {
      assets.forEach((a: any) => {
        if (a.storage_path) {
          const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(a.storage_path);
          assetMap.set(a.id, publicUrl);
        }
      });
    }
  }

  // Transform data to match Project interface
  return projectsData.map(project => ({
    id: project.id,
    shortId: project.short_id,
    title: project.title,
    producer: project.user?.username || 'Unknown',
    producerHandle: project.user?.handle,
    producerAvatar: project.user?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
    coverImage: project.cover_image_url,
    price: project.project_licenses?.[0]?.price || project.project_licenses?.[0]?.license?.default_price || 0,
    bpm: project.bpm,
    key: project.key,
    genre: project.genre,
    subGenre: project.sub_genre,
    type: project.type,
    tags: project.project_tags?.map((pt: any) => pt.tag?.name).filter(Boolean) || [],
    tracks: project.tracks?.map((track: any) => {
      // Use manually fetched URL (prioritize) or fallback logic if we kept the join (we removed it)
      const mp3Url = track.assigned_file_id ? (assetMap.get(track.assigned_file_id) || '') : '';

      return {
        id: track.id,
        title: track.title,
        duration: track.duration_seconds,
        trackNumber: track.track_number,
        noteId: track.note_id,
        statusTags: track.status_tags,
        assignedFileId: track.assigned_file_id,
        files: {
          mp3: mp3Url
        }
      };
    }) || [],
    description: project.description,
    licenses: project.project_licenses?.map((pl: any) => ({
      id: pl.license?.id,
      type: pl.license?.type,
      name: pl.license?.name,
      price: pl.price || pl.license?.default_price,
      features: pl.license?.features || [],
      fileTypesIncluded: pl.license?.file_types_included || []
    })) || [],
    status: project.status,
    created: project.created_at,
    userId: project.user_id,
    releaseDate: project.release_date,
    format: project.format,
    progress: project.progress,
    gems: project.gems || 0, // Map gems from DB or default to 0
    tasks: project.tasks?.map((t: any) => ({ id: t.id, projectId: t.project_id, text: t.text, completed: t.completed, createdAt: t.created_at })) || []
  }));
};


export const giveGemToProject = async (projectId: string) => {
  // Call the atomic RPC function
  const { error } = await supabase.rpc('give_gem', { project_id_arg: projectId });

  if (error) {
    console.error('Error giving gem:', error);
    throw new Error(error.message || 'Failed to give gem');
  }

  // Dispatch event to refresh global profile (gem balance)
  window.dispatchEvent(new Event('profile-updated'));
};

export const undoGiveGem = async (projectId: string) => {
  // Call the atomic RPC function for undo
  const { error } = await supabase.rpc('undo_give_gem', { project_id_arg: projectId });

  if (error) {
    console.error('Error undoing gem:', error);
    throw new Error(error.message || 'Failed to undo gem');
  }

  // Dispatch event to refresh global profile (gem balance)
  window.dispatchEvent(new Event('profile-updated'));
};

export const checkIsGemGiven = async (projectId: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return false;

  const { count, error } = await supabase
    .from('project_gem_givers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', currentUser.id)
    .eq('project_id', projectId);

  if (error) {
    if (error.code !== 'PGRST116') { // Ignore if not found which might be common if RLS blocks or table missing
      console.warn('Error checking gem status:', error.message);
    }
    return false;
  }

  return (count || 0) > 0;
};

// Helper: Ensure user exists in 'users' table (JIT Provisioning)
// This should be called before any write operation that relies on a foreign key to the users table.
export const ensureUserExists = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Check if user exists in public.users
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existingUser && (!fetchError || fetchError.code === 'PGRST116')) {
    console.log('JIT Provisioning (Global): Creating missing user record for', user.id);
    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
    const handle = user.user_metadata?.handle || user.email?.split('@')[0] || 'user';

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        username,
        handle,
        email: user.email,
        gems: 0,
        balance: 0.00,
        promo_credits: 0,
        avatar_url: user.user_metadata?.avatar_url,
        banner_url: user.user_metadata?.banner_url
      });

    if (insertError) {
      console.error('Failed to JIT provision user:', insertError);
      return null;
    }
  }
  return user;
};

export const getUserProfile = async (userId?: string): Promise<UserProfile | null> => {
  // If userId is provided, we are looking for a specific user.
  // If not, we are looking for the current authenticated user.
  let targetUserId = userId;
  let currentUser = null;

  if (!targetUserId) {
    try {
      currentUser = await getCurrentUser();
      targetUserId = currentUser?.id;
    } catch (e) {
      console.error('Error getting current user for profile fetch:', e);
      return null;
    }
  }

  if (!targetUserId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, handle, location, avatar_url, banner_url, banner_settings, bio, website, gems, balance, promo_credits, last_gem_claim_date, role, plan, subscription_status, subscription_id, current_period_end, cancel_at_period_end, stripe_account_id, stripe_customer_id, years_experience, satisfaction_rate, avg_turnaround, is_public')
    .eq('id', targetUserId)
    .single();

  // 1b. Get Projects Sold Count (Real Data)
  const { count: projectsSoldCount, error: projectsSoldError } = await supabase
    .from('purchase_items')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', targetUserId);

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user from DB:', error);
    // Continue to fallback if possible, but log error
  }

  // Get auth email for current user only
  let authEmail = 'user@example.com';
  if (!currentUser && !userId) {
    // If we didn't fetch current user yet and we are looking for self (shouldn't happen due to logic above)
    // or if we are looking for someone else, we might want to know if WE are logged in?
    // Actually, email is private, so we only show it if it's our own profile or we are admin (not impl).
    // For now, let's just get current user if we haven't.
    try {
      currentUser = await getCurrentUser();
    } catch (e) { }
  }

  if (currentUser && (currentUser.id === targetUserId)) {
    authEmail = currentUser.email || 'user@example.com';
  }

  if (data) {
    const userData = data as any;
    // Fetch related data
    try {
      const [projects, services, followersCount, stats] = await Promise.all([
        getProjectsByUserId(userData.id),
        getServicesByUserId(userData.id),
        getFollowersCount(userData.id),
        getUserStats(userData.id)
      ]);

      return {
        id: userData.id,
        username: userData.username,
        handle: userData.handle,
        role: userData.role || (userData as any).raw_user_meta_data?.role || 'Producer',
        email: authEmail,
        location: userData.location,
        avatar: userData.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
        banner: userData.banner_url || '',
        subscribers: followersCount,
        streams: stats.streams,
        gems: userData.gems || 0,
        balance: userData.balance || 0,
        promo_credits: userData.promo_credits || 0,
        plan: userData.plan,
        lastGemClaimDate: userData.last_gem_claim_date,
        yearsExperience: userData.years_experience || '0',
        projectsSold: projectsSoldCount || 0,
        satisfactionRate: userData.satisfaction_rate || '100%',
        avgTurnaround: userData.avg_turnaround || '24h',
        bio: userData.bio,
        website: userData.website,
        projects: projects,
        services: services,
        soundPacks: projects.filter(p => p.type === 'sound_pack').map(p => ({
          id: p.id,
          title: p.title,
          type: 'Loop Kit', // Defaulting for now
          price: p.price,
          fileSize: '0 MB', // Placeholder
          itemCount: p.tracks?.length || 0
        })),
        subscription_status: userData.subscription_status,
        subscription_id: userData.subscription_id,
        current_period_end: userData.current_period_end,
        cancel_at_period_end: userData.cancel_at_period_end,
        stripe_account_id: userData.stripe_account_id,
        stripe_customer_id: userData.stripe_customer_id,
        bannerSettings: userData.banner_settings,
        is_public: userData.is_public
      };
    } catch (err) {
      console.error('Error fetching related profile data:', err);
      // Return basic profile if related data fails
      return {
        id: userData.id,
        username: userData.username,
        handle: userData.handle,
        email: authEmail,
        location: userData.location,
        avatar: userData.avatar_url,
        banner: userData.banner_url,
        subscribers: 0,
        streams: 0,
        gems: userData.gems || 0,
        balance: userData.balance || 0,
        promo_credits: userData.promo_credits || 0,
        plan: userData.plan,
        lastGemClaimDate: userData.last_gem_claim_date,
        bio: userData.bio,
        website: userData.website,
        projects: [],
        services: [],
        soundPacks: []
      };
    }
  } else {
    // Fallback: ONLY if we are looking for OURSELVES and the DB entry is missing
    // If we are looking for someone else (userId provided) and they are not in DB, they don't exist.
    if (!userId && currentUser) {
      // JIT Provisioning: User exists in Auth but not in public.users
      // Create the missing user record immediately
      const username = currentUser.user_metadata?.username || currentUser.email?.split('@')[0] || 'User';
      const handle = currentUser.user_metadata?.handle || currentUser.email?.split('@')[0] || 'user';
      const email = currentUser.email || 'user@example.com';

      console.log('JIT Provisioning: Creating missing user record for', currentUser.id);

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: currentUser.id,
          username,
          handle,
          email,
          hashed_password: '', // Not needed
          gems: 0,
          balance: 0.00,
          promo_credits: 0,
          avatar_url: currentUser.user_metadata?.avatar_url,
          banner_url: currentUser.user_metadata?.banner_url
        });

      if (insertError) {
        console.error('Failed to JIT provision user:', insertError);
      } else {
        console.log('JIT Provisioning successful');
      }

      return {
        id: currentUser.id,
        username,
        handle,
        email: authEmail,
        location: '',
        avatar: currentUser.user_metadata?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
        banner: '',
        subscribers: 0,
        gems: 0,
        balance: 0,
        promo_credits: 0,
        plan: undefined,
        bio: '',
        website: '',
        projects: [],
        services: [],
        soundPacks: []
      };
    }
    return null;
  }
};

export const getUserProfileByHandle = async (handle: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, handle, email, location, avatar_url, banner_url, banner_settings, bio, website, gems, balance, promo_credits, last_gem_claim_date, role, plan, years_experience, satisfaction_rate, avg_turnaround, is_public')
    .eq('handle', handle)
    .single();

  // Get Projects Sold Count (Real Data)
  let projectsSoldCount = 0;
  if (data) {
    const { count } = await supabase
      .from('purchase_items')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', (data as any).id);
    projectsSoldCount = count || 0;
  }

  if (error && error.code !== 'PGRST116') throw error;

  if (data) {
    const userData = data as any;
    // Fetch related data
    const [projects, services, followersCount, stats] = await Promise.all([
      getProjectsByUserId(userData.id),
      getServicesByUserId(userData.id),
      getFollowersCount(userData.id),
      getUserStats(userData.id)
    ]);

    return {
      id: userData.id,
      username: userData.username,
      handle: userData.handle,
      role: userData.role || 'Producer',
      email: userData.email,
      location: userData.location,
      avatar: userData.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
      banner: userData.banner_url || '',
      subscribers: followersCount,
      streams: stats.streams,
      gems: userData.gems,
      balance: userData.balance,
      promo_credits: userData.promo_credits || 0,
      plan: userData.plan,
      lastGemClaimDate: userData.last_gem_claim_date,
      yearsExperience: userData.years_experience || '0',
      projectsSold: projectsSoldCount,
      satisfactionRate: userData.satisfaction_rate || '100%',
      avgTurnaround: userData.avg_turnaround || '24h',
      bio: userData.bio,
      website: userData.website,
      projects: projects, // Show all projects including beat_tapes
      services: services,
      soundPacks: projects.filter(p => p.type === 'sound_pack').map(p => ({
        id: p.id,
        title: p.title,
        type: 'Loop Kit', // Defaulting for now as type is generic in Project
        price: p.price,
        fileSize: '0 MB', // Placeholder
        itemCount: p.tracks?.length || 0
      })),
      bannerSettings: userData.banner_settings,
      is_public: userData.is_public
    };
  } else {
    return null;
  }
};

export const deletePlaylist = async (playlistId: string) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId)
    .eq('user_id', currentUser.id); // Ensure ownership

  if (error) throw error;
};

export const updatePlaylist = async (playlistId: string, updates: { title?: string, tracks?: any[] }) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('playlists')
    .update(updates)
    .eq('id', playlistId)
    .eq('user_id', currentUser.id);

  if (error) throw error;
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  // Ensure user exists before trying to update them
  if (userId) {
    const currentUser = await ensureUserExists();
    // If we are updating ourselves, ensure existence. 
    // If updating another user (admin?), the ensureUserExists checks current auth session, which is fine.
  }

  const updateObj: any = {};
  if (updates.username !== undefined) updateObj.username = updates.username;
  if (updates.location !== undefined) updateObj.location = updates.location;
  if (updates.bio !== undefined) updateObj.bio = updates.bio;
  if (updates.website !== undefined) updateObj.website = updates.website;
  if (updates.avatar !== undefined) updateObj.avatar_url = updates.avatar;
  if (updates.banner !== undefined) updateObj.banner_url = updates.banner;
  if (updates.gems !== undefined) updateObj.gems = updates.gems;
  if (updates.balance !== undefined) updateObj.balance = updates.balance;
  if (updates.promo_credits !== undefined) updateObj.promo_credits = updates.promo_credits;
  if (updates.lastGemClaimDate !== undefined) updateObj.last_gem_claim_date = updates.lastGemClaimDate;
  if (updates.is_public !== undefined) updateObj.is_public = updates.is_public;
  if (updates.role !== undefined) updateObj.role = updates.role;
  if (updates.plan !== undefined) updateObj.plan = updates.plan;
  if (updates.subscription_status !== undefined) updateObj.subscription_status = updates.subscription_status;
  if (updates.subscription_id !== undefined) updateObj.subscription_id = updates.subscription_id;
  if (updates.current_period_end !== undefined) updateObj.current_period_end = updates.current_period_end;
  if (updates.cancel_at_period_end !== undefined) updateObj.cancel_at_period_end = updates.cancel_at_period_end;
  if (updates.stripe_account_id !== undefined) updateObj.stripe_account_id = updates.stripe_account_id;
  if (updates.stripe_customer_id !== undefined) updateObj.stripe_customer_id = updates.stripe_customer_id;
  if (updates.bannerSettings !== undefined) updateObj.banner_settings = updates.bannerSettings;
  // if (updates.yearsExperience !== undefined) updateObj.years_experience = updates.yearsExperience;
  // if (updates.satisfactionRate !== undefined) updateObj.satisfaction_rate = updates.satisfactionRate;
  // if (updates.avgTurnaround !== undefined) updateObj.avg_turnaround = updates.avgTurnaround;

  const { error } = await supabase
    .from('users')
    .update(updateObj)
    .eq('id', userId);

  if (error) throw error;
};

/**
 * Exchange gems for promotion credits atomically via RPC
 */
export const exchangeGemsForCredits = async (userId: string, gemsCost: number, promoGain: number) => {
  const { error } = await supabase.rpc('exchange_gems_for_promo', {
    p_user_id: userId,
    p_gems_cost: gemsCost,
    p_promo_gain: promoGain
  });

  if (error) throw error;
};

export const createProject = async (project: Partial<Project>) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  // 1. Create Project
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: currentUser.id,
      title: project.title,
      description: project.description,
      type: project.type,
      bpm: project.bpm,
      key: project.key,
      genre: project.genre,
      sub_genre: project.subGenre,
      cover_image_url: project.coverImage, // Ensure cover image is saved
      status: project.status || 'published', // Default to published if not specified
      short_id: Math.random().toString(36).substring(2, 10) // Generate random 8-char string
    })
    .select()
    .single();

  if (projectError) throw projectError;

  const projectId = projectData.id;

  // 2. Create Tracks
  if (project.tracks && project.tracks.length > 0) {
    const tracksToInsert = project.tracks.map((track, index) => {
      // Extract assigned file ID (prefer MP3 for now as primary playback)
      const assignedFileId = track.files?.mp3 || track.files?.wav || null;

      return {
        project_id: projectId,
        title: track.title,
        duration_seconds: track.duration || 180, // Default duration
        track_number: index + 1,
        assigned_file_id: assignedFileId,
        // For releases, we might want to flag the "main" track if needed, but for now 1 track logic suffices
      };
    });

    const { error: tracksError } = await supabase
      .from('tracks')
      .insert(tracksToInsert);

    if (tracksError) console.error('Error creating tracks:', tracksError);
  }

  // 3. Create Licenses (Project Licenses)
  // Note: In a real app, we'd likely select from existing license templates or create new ones.
  // For simplicity, we'll assume we're creating new license templates for this project or linking existing ones.
  // However, the UI passes full license objects. Let's create them as templates first if they don't exist (mock logic)
  // or just link them. The schema uses a many-to-many via project_licenses.

  if (project.licenses && project.licenses.length > 0) {
    for (const license of project.licenses) {
      // Create a new license template for this user/project specific
      const { data: licenseData, error: licenseError } = await supabase
        .from('licenses')
        .insert({
          user_id: currentUser.id,
          name: license.name,
          type: license.type,
          default_price: license.price,
          features: license.features,
          file_types_included: license.fileTypesIncluded
        })
        .select()
        .single();

      if (licenseError) {
        console.error('Error creating license:', licenseError);
        continue;
      }

      // Link to project
      const { error: linkError } = await supabase
        .from('project_licenses')
        .insert({
          project_id: projectId,
          license_id: licenseData.id,
          price: license.price
        });

      if (linkError) console.error('Error linking license:', linkError);
    }
  }

  // 4. Create Tags
  if (project.tags && project.tags.length > 0) {
    for (const tagName of project.tags) {
      // Check if tag exists, if not create it
      // This is a bit inefficient doing one by one but safe for now
      let tagId;

      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName)
        .single();

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        const { data: newTag, error: tagError } = await supabase
          .from('tags')
          .insert({ name: tagName })
          .select()
          .single();

        if (!tagError && newTag) {
          tagId = newTag.id;
        }
      }

      if (tagId) {
        const { error: tagLinkError } = await supabase
          .from('project_tags')
          .insert({
            project_id: projectId,
            tag_id: tagId
          });
        if (tagLinkError) console.error('Error linking tag:', tagLinkError);
      }
    }
  }

  return projectData;
};

export const createService = async (service: Partial<Service>) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('services')
    .insert({
      user_id: currentUser.id,
      title: service.title,
      description: service.description,
      price: service.price,
      features: service.features,
      rate_type: service.rateType || 'flat',
      delivery_days: service.deliveryDays || 3
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    price: data.price,
    features: data.features,
    rateType: data.rate_type,
    deliveryDays: data.delivery_days
  };
};

export const getProjectsByUserId = async (userId: string): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      user:user_id (
        username,
        handle,
        avatar_url
      ),
      tracks (
        id,
        title,
        duration_seconds,
        track_number,
        note_id,
        status_tags,
        assigned_file_id,
        files:assigned_file_id (
            storage_path
        )
      ),
      project_licenses (
        license:licenses (
          id,
          name,
          type,
          default_price,
          features,
          file_types_included
        ),
        price
      ),
      project_tags (
        tag:tags (
          name
        )
      ),
      tasks (
        id,
        project_id,
        text,
        completed,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Manual Asset URL Generation (since we only have storage_path from join)
  // We can optimize this by generating signed or public URLs in bulk if needed,
  // but for public buckets, getPublicUrl is synchronous/local mostly.
  const projectsData = data as any[];

  return projectsData.map(project => ({
    id: project.id,
    shortId: project.short_id,
    title: project.title,
    producer: project.user?.username || 'Unknown',
    producerAvatar: project.user?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
    coverImage: project.cover_image_url,
    price: project.project_licenses?.[0]?.price || project.project_licenses?.[0]?.license?.default_price || 0,
    bpm: project.bpm,
    key: project.key,
    genre: project.genre,
    subGenre: project.sub_genre,
    type: project.type,
    tags: project.project_tags?.map((pt: any) => pt.tag?.name).filter(Boolean) || [],
    tracks: project.tracks?.map((track: any) => {
      let mp3Url = '';
      if (track.files?.storage_path) {
        const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(track.files.storage_path);
        mp3Url = publicUrl;
      }

      return {
        id: track.id,
        title: track.title,
        duration: track.duration_seconds,
        trackNumber: track.track_number,
        noteId: track.note_id,
        statusTags: track.status_tags,
        assignedFileId: track.assigned_file_id,
        files: {
          mp3: mp3Url
        }
      };
    }) || [],
    description: project.description,
    licenses: project.project_licenses?.map((pl: any) => ({
      id: pl.license?.id,
      type: pl.license?.type,
      name: pl.license?.name,
      price: pl.price || pl.license?.default_price,
      features: pl.license?.features || [],
      fileTypesIncluded: pl.license?.file_types_included || []
    })) || [],
    status: project.status,
    created: project.created_at,
    userId: project.user_id,
    releaseDate: project.release_date,
    format: project.format,
    progress: project.progress,
    gems: project.gems || 0,
    tasks: project.tasks?.map((t: any) => ({ id: t.id, projectId: t.project_id, text: t.text, completed: t.completed, createdAt: t.created_at })) || []
  }));
};

export const getSavedProjects = async (): Promise<Project[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('saved_projects')
    .select(`
      project_id,
      project:projects (
        *,
        user:user_id (
          username,
          handle,
          avatar_url
        ),
        tracks (
          id,
          title,
          duration_seconds,
          track_number,
          note_id,
          status_tags,
          assigned_file_id
        ),
        project_licenses (
          license:licenses (
            id,
            name,
            type,
            default_price,
            features,
            file_types_included
          ),
          price
        ),
        project_tags (
          tag:tags (
            name
          )
        )
      )
    `)
    .eq('user_id', currentUser.id);

  if (error) throw error;

  return (data as any[]).map(item => {
    const project = item.project;
    if (!project) return null;
    return {
      id: project.id,
      title: project.title,
      producer: project.user?.username || 'Unknown',
      producerAvatar: project.user?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
      coverImage: project.cover_image_url,
      price: project.project_licenses?.[0]?.price || project.project_licenses?.[0]?.license?.default_price || 0,
      bpm: project.bpm,
      key: project.key,
      genre: project.genre,
      subGenre: project.sub_genre,
      type: project.type,
      tags: project.project_tags?.map((pt: any) => pt.tag?.name).filter(Boolean) || [],
      tracks: project.tracks?.map((track: any) => ({
        id: track.id,
        title: track.title,
        duration: track.duration_seconds,
        trackNumber: track.track_number,
        noteId: track.note_id,
        statusTags: track.status_tags,
        assignedFileId: track.assigned_file_id
      })) || [],
      description: project.description,
      licenses: project.project_licenses?.map((pl: any) => ({
        id: pl.license?.id,
        type: pl.license?.type,
        name: pl.license?.name,
        price: pl.price || pl.license?.default_price,
        features: pl.license?.features || [],
        fileTypesIncluded: pl.license?.file_types_included || []
      })) || [],
      status: project.status,
      created: project.created_at,
      userId: project.user_id
    };
  }).filter(Boolean) as Project[];
};

export const checkIsProjectSaved = async (projectId: string): Promise<boolean> => {
  const currentUser = await getCurrentUser();
  if (!currentUser || !projectId || !isUuid(projectId)) return false;

  const { data, error } = await supabase
    .from('saved_projects')
    .select('id')
    .eq('user_id', currentUser.id)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) {
    console.error('Error checking if project is saved:', error);
    return false;
  }

  return !!data;
};

export const getSavedProjectIdForAsset = async (assetId: string): Promise<string | null> => {
  const currentUser = await getCurrentUser();
  if (!currentUser || !assetId) return null;

  const { data: tracks, error } = await supabase
    .from('tracks')
    .select('project_id, project:projects!inner(user_id)')
    .eq('assigned_file_id', assetId)
    .eq('project.user_id', currentUser.id);

  if (error || !tracks || tracks.length === 0) return null;

  const projectIds = tracks.map((t: any) => t.project_id);

  const { data: saved } = await supabase
    .from('saved_projects')
    .select('project_id')
    .eq('user_id', currentUser.id)
    .in('project_id', projectIds)
    .limit(1);

  if (!saved || saved.length === 0) return null;
  return saved[0].project_id;
};

export const saveProject = async (projectId: string) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');
  if (!projectId || !isUuid(projectId)) {
    console.warn('Attempted to save non-UUID project ID:', projectId);
    return;
  }

  const { error } = await supabase
    .from('saved_projects')
    .insert({
      user_id: currentUser.id,
      project_id: projectId
    });

  if (error && error.code !== '23505') { // Ignore unique violation
    console.error('Error saving project:', error);
    throw error;
  }
};

export const unsaveProject = async (projectId: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');
  if (!projectId || !isUuid(projectId)) {
    console.warn('Attempted to unsave non-UUID project ID:', projectId);
    return;
  }

  const { error } = await supabase
    .from('saved_projects')
    .delete()
    .eq('user_id', currentUser.id)
    .eq('project_id', projectId);

  if (error) {
    console.error('Error unsaving project:', error);
    throw error;
  }
};

export const convertAssetToProject = async (assetId: string, trackTitle: string, userProfile: any): Promise<string> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  // Check for existing project with this asset owned by current user
  const { data: existingTracks } = await supabase
    .from('tracks')
    .select('project_id, project:projects!inner(user_id)')
    .eq('assigned_file_id', assetId)
    .eq('project.user_id', currentUser.id)
    .limit(1);

  if (existingTracks && existingTracks.length > 0) {
    const existingProjectId = existingTracks[0].project_id;
    // Ensure it's saved
    const isSaved = await checkIsProjectSaved(existingProjectId);
    if (!isSaved) {
      await saveProject(existingProjectId);
    }
    return existingProjectId;
  }

  const projectTitle = trackTitle || 'Untitled Upload';

  // Use the established createProject function to ensure we satisfy all RLS/Constraints
  // Use 'draft' status to keep converted uploads private (not shown on public Browse pages)
  const projectData = await createProject({
    title: projectTitle,
    description: 'Converted from uploaded file',
    type: 'beat_tape',
    status: 'draft',
    genre: 'Uploads',
    bpm: 0,
    key: 'C'
  });

  if (!projectData) throw new Error('Failed to create project');
  const projectId = projectData.id;


  // 2. Create the Track linked to the Asset
  const { error: trackError } = await supabase
    .from('tracks')
    .insert({
      project_id: projectId,
      title: projectTitle,
      duration_seconds: 180,
      track_number: 1,
      assigned_file_id: assetId
    });

  if (trackError) {
    console.error("Error creating track for convertAssetToProject", trackError);
  }

  // 3. Save (Bookmark) the new Project for the user
  await saveProject(projectId);

  return projectId;
};

export const renameProject = async (projectId: string, newTitle: string) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');
  if (!projectId || !isUuid(projectId)) throw new Error('Invalid project ID');

  const { error } = await supabase
    .from('projects')
    .update({ title: newTitle, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', currentUser.id);

  if (error) throw error;
};

export const updateProjectStatus = async (projectId: string, status: Project['status']) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');
  if (!projectId || !isUuid(projectId)) throw new Error('Invalid project ID');

  const { error } = await supabase
    .from('projects')
    .update({ status: status, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', currentUser.id);

  if (error) throw error;
};


export const addTrackToProject = async (projectId: string, trackTitle: string, assetId: string) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  // Get current max track number
  const { data: tracks, error: fetchError } = await supabase
    .from('tracks')
    .select('track_number')
    .eq('project_id', projectId)
    .order('track_number', { ascending: false })
    .limit(1);

  if (fetchError) throw fetchError;
  const nextTrackNumber = (tracks && tracks.length > 0) ? (tracks[0].track_number + 1) : 1;

  const { error } = await supabase
    .from('tracks')
    .insert({
      project_id: projectId,
      title: trackTitle,
      track_number: nextTrackNumber,
      assigned_file_id: assetId,
      duration_seconds: 180 // Default
    });

  if (error) throw error;
};

export interface Asset {
  id: string;
  name: string;
  storagePath: string;
  publicUrl: string;
  created_at: string;
}

export const getUserAssets = async (): Promise<Asset[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as any[]).map(asset => {
    const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(asset.storage_path);
    return {
      id: asset.id,
      name: asset.file_name || asset.name, // Handle file_name column from DB
      storagePath: asset.storage_path,
      publicUrl: publicUrl,
      created_at: asset.created_at
    };
  });
};

// --- PLAYLISTS ---

export interface PlaylistTrack {
  id: string;
  title: string;
  duration: number;
  trackOrder: number;
  trackId?: string;
  assetId?: string;
  publicUrl?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  tracks: PlaylistTrack[];
  createdAt: string;
  updatedAt: string;
}

export const getPlaylists = async (): Promise<Playlist[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('playlists')
    .select(`
            *,
            playlist_tracks (
                id,
                track_id,
                asset_id,
                title,
                duration_seconds,
                track_order,
                asset:assets (storage_path),
                track:tracks (
                    id,
                    assigned_file_id,
                    assigned_file:assets!tracks_mp3_asset_id_fkey (storage_path)
                )
            )
        `)
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data as any[]).map(playlist => ({
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    coverImageUrl: playlist.cover_image_url,
    createdAt: playlist.created_at,
    updatedAt: playlist.updated_at,
    tracks: (playlist.playlist_tracks || [])
      .sort((a: any, b: any) => a.track_order - b.track_order)
      .map((pt: any) => {
        let publicUrl = '';
        const assetPath = pt.asset?.storage_path || pt.track?.assigned_file?.storage_path;
        if (assetPath) {
          const { data: { publicUrl: url } } = supabase.storage.from('assets').getPublicUrl(assetPath);
          publicUrl = url;
        }
        return {
          id: pt.id,
          title: pt.title,
          duration: pt.duration_seconds || 180,
          trackOrder: pt.track_order,
          trackId: pt.track_id,
          assetId: pt.asset_id,
          publicUrl
        };
      })
  }));
};

export const createPlaylist = async (title: string, trackItems: { title: string; assetId?: string; trackId?: string; duration?: number }[]): Promise<Playlist> => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  // Create playlist
  const { data: playlistData, error: playlistError } = await supabase
    .from('playlists')
    .insert({
      user_id: currentUser.id,
      title: title || 'Untitled Playlist'
    })
    .select()
    .single();

  if (playlistError) throw playlistError;

  // Add tracks
  if (trackItems.length > 0) {
    const tracksToInsert = trackItems.map((item, idx) => ({
      playlist_id: playlistData.id,
      title: item.title,
      asset_id: item.assetId || null,
      track_id: item.trackId || null,
      duration_seconds: item.duration || 180,
      track_order: idx
    }));

    const { error: tracksError } = await supabase
      .from('playlist_tracks')
      .insert(tracksToInsert);

    if (tracksError) console.error('Error adding tracks to playlist:', tracksError);
  }

  return {
    id: playlistData.id,
    title: playlistData.title,
    description: playlistData.description,
    coverImageUrl: playlistData.cover_image_url,
    createdAt: playlistData.created_at,
    updatedAt: playlistData.updated_at,
    tracks: trackItems.map((item, idx) => ({
      id: `temp-${idx}`,
      title: item.title,
      duration: item.duration || 180,
      trackOrder: idx,
      assetId: item.assetId,
      trackId: item.trackId
    }))
  };
};



export const getServicesByUserId = async (userId: string): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  return data.map(service => ({
    id: service.id,
    title: service.title,
    description: service.description,
    price: service.price,
    features: service.features || [],
    rateType: service.rate_type || 'flat'
  }));
};

export const getFollowersCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (error) throw error;
  return count || 0;
};

export const getUserStats = async (userId: string): Promise<{ streams: number; tracks: number }> => {
  try {
    // Fetch all tracks for projects owned by this user
    // We join on projects to filter by user_id
    const { data, error } = await supabase
      .from('tracks')
      .select('play_count, project:projects!inner(user_id)')
      .eq('project.user_id', userId);

    if (error) {
      console.error('Error fetching user stats:', error);
      return { streams: 0, tracks: 0 };
    }

    const totalTracks = data.length;
    const totalStreams = data.reduce((sum, track) => sum + (track.play_count || 0), 0);

    return { streams: totalStreams, tracks: totalTracks };
  } catch (err) {
    console.error('Unexpected error in getUserStats:', err);
    return { streams: 0, tracks: 0 };
  }
};

// --- Conversations ---

export const createConversation = async (targetUserId: string): Promise<string> => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  if (currentUser.id === targetUserId) throw new Error('Cannot create a conversation with yourself');

  // Check if a conversation already exists between these two users
  const { data: existingConversations, error: existingError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', currentUser.id);

  if (existingError) throw existingError;

  if (existingConversations && existingConversations.length > 0) {
    const conversationIds = existingConversations.map(c => c.conversation_id);

    // Find if targetUser is also in any of these conversations
    const { data: commonConversations, error: commonError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('user_id', targetUserId);

    if (commonError) throw commonError;

    if (commonConversations && commonConversations.length > 0) {
      return commonConversations[0].conversation_id;
    }
  }

  // If no existing conversation, create a new one using RPC (bypasses RLS issues)
  const { data: conversationId, error: convError } = await supabase
    .rpc('create_new_conversation', { target_user_id: targetUserId });

  if (convError) throw convError;

  return conversationId;
};

export const sendMessage = async (conversationId: string, content: string) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content: content
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);


  // 3. Notify the OTHER participant
  try {
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', currentUser.id); // Get everyone else

    if (participants && participants.length > 0) {
      // Create notification for each recipient
      await Promise.all(participants.map(p =>
        createNotification({
          userId: p.user_id,
          type: 'message',
          title: 'New Message',
          message: `You have a new message from @${currentUser.user_metadata?.username || 'user'}`,
          link: `/dashboard/messages?cid=${conversationId}`, // Link to conversation
          data: { conversationId, senderId: currentUser.id }
        })
      ));
    }
  } catch (notifError) {
    console.error('Failed to send message notification:', notifError);
    // Don't fail the message send if notification fails
  }

  return {
    id: data.id,
    sender: 'Me',
    avatar: currentUser.user_metadata?.avatar_url || '',
    text: data.content,
    timestamp: data.created_at,
    isMe: true
  };
};

export const deleteMessage = async (messageId: string, forEveryone: boolean = false) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  if (forEveryone) {
    // Delete for everyone (removes from messages table)
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', currentUser.id); // Only sender can delete for everyone

    if (error) throw error;
  } else {
    // Delete for me (hide from user)
    // Note: This requires a many-to-many visibility table or a 'hidden_for_users' array in messages.
    // Since we might not have that schema, we will just delete it from current view for now.
    // If the schema exists, it should be updated here.
    // For now, let's just delete it if the user is the sender, or ignore if receiver (MVP).
    // Actually, let's just delete the record for now if they are the sender, 
    // or if the schema doesn't support "for me", we'll just remove it from local state.

    // Attempt to delete if sender, otherwise we'd need a visibility table
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', currentUser.id);

    if (error) throw error;
  }
};


export const getConversations = async (): Promise<Conversation[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('conversation_participants')
    .select(`
      conversation:conversations (
        id,
        updated_at,
        messages:messages (
          id,
          content,
          sender_id,
          created_at
        ),
        participants:conversation_participants (
          user:users (
            id,
            username,
            avatar_url
          )
        )
      )
    `)
    .eq('user_id', currentUser.id);

  if (error) throw error;

  return (data as any[]).map(participant => {
    const conversation = participant.conversation;
    // Find the participant that is NOT the current user
    const otherParticipantEntry = conversation.participants?.find((p: any) => p.user?.id !== currentUser.id);
    const otherParticipant = otherParticipantEntry?.user;

    // If no other participant (e.g. self-chat or data error), fallback gracefully or use self
    // For now, assuming 1:1, if we can't find another, it might be a test self-chat or glitch.

    const lastMessage = conversation.messages?.[conversation.messages.length - 1];

    return {
      id: conversation.id,
      user: otherParticipant?.username || 'Unknown User',
      userId: otherParticipant?.id,
      avatar: otherParticipant?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
      lastMessage: lastMessage?.content || 'No messages yet',
      timestamp: formatTimeAgo(lastMessage?.created_at || conversation.updated_at),
      unread: 0,
      messages: conversation.messages?.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender_id === currentUser.id ? 'Me' : otherParticipant?.username || 'Unknown',
        avatar: msg.sender_id === currentUser.id ? (currentUser.user_metadata?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541') : (otherParticipant?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'),
        text: msg.content,
        timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
        isMe: msg.sender_id === currentUser.id
      })) || []
    };
  });
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  // Remove the current user from the participants list
  // This effectively hides the conversation from their list
  const { error } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', currentUser.id);

  if (error) throw error;
};

export const getServices = async (): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      user:user_id (
        username,
        handle,
        avatar_url
      )
    `);

  if (error) throw error;

  return data.map(service => ({
    id: service.id,
    title: service.title,
    description: service.description,
    price: service.price,
    features: service.features || [],
    rateType: service.rate_type,
    user: {
      username: service.user?.username || 'Unknown',
      handle: service.user?.handle || 'unknown',
      avatar: (service.user as any)?.avatar_url,
      avatar_url: (service.user as any)?.avatar_url
    }
  }));
};

export const searchProfiles = async (query: string): Promise<TalentProfile[]> => {
  /* Use RPC for accent-insensitive search */
  const { data, error } = await supabase
    .rpc('search_profiles_unaccent', { query })
    .select('id, username, handle, avatar_url, role');

  if (error) throw error;

  // We can just reuse getTalentProfiles logic or map simply. 
  // For search results, simple mapping is often enough, but let's try to match TalentProfile structure.
  return (data as any[]).map(user => ({
    id: user.id,
    username: user.username,
    handle: user.handle,
    avatar: user.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
    role: user.role || 'Producer',
    tags: user.role ? [user.role] : [],
    followers: '0', // We could fetch this but maybe overkill for quick search results
    isVerified: false,
    streams: 0,
    tracks: 0
  }));
};

export const searchServices = async (query: string): Promise<Service[]> => {
  const { data, error } = await supabase
    .from('services')
    .select(`
      *,
      user:user_id (
        username,
        handle,
        avatar_url
      )
    `)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;

  return data.map(service => ({
    id: service.id,
    title: service.title,
    description: service.description,
    price: service.price,
    features: service.features || [],
    rateType: service.rate_type,
    user: {
      username: service.user?.username || 'Unknown',
      handle: service.user?.handle || 'unknown',
      avatar: (service.user as any)?.avatar_url
    }
  }));
};

export const getOrders = async (): Promise<Order[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      purchase_item:purchase_items (
        service:services (
          title
        ),
        seller:seller_id (
          username
        )
      ),
      client:client_id (
        username,
        avatar_url
      )
    `)
    .or(`client_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`);

  if (error) throw error;

  return data.map(order => ({
    id: order.id,
    serviceTitle: order.purchase_item?.service?.title || 'Unknown Service',
    clientName: order.client?.username || 'Unknown',
    clientAvatar: order.client?.avatar_url || 'https://i.pravatar.cc/150?u=client',
    amount: order.purchase_item?.price || 0,
    status: order.status,
    deadline: order.deadline,
    requirements: order.requirements || '',
    files: [] // TODO: implement file attachments
  }));
};

export const checkIsFollowing = async (targetUserId: string): Promise<boolean> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;

    if (!targetUserId) {
      console.warn('checkIsFollowing called with empty targetUserId');
      return false;
    }

    const { data, error } = await supabase
      .from('followers')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetUserId)
      .limit(1);

    if (error) {
      console.error('Error checking follow status:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (err) {
    console.error('Unexpected error in checkIsFollowing:', err);
    return false;
  }
};

export const followUser = async (targetUserId: string) => {
  console.log(`[Follow] Attempting to follow user: ${targetUserId}`);
  const currentUser = await ensureUserExists();
  if (!currentUser) {
    console.error('[Follow] No current user found');
    throw new Error('User not authenticated');
  }

  if (currentUser.id === targetUserId) {
    console.warn('[Follow] User attempted to follow themselves');
    throw new Error('You cannot follow yourself');
  }

  // Check if already following
  const { data: existing } = await supabase
    .from('followers')
    .select('*')
    .eq('follower_id', currentUser.id)
    .eq('following_id', targetUserId)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log('[Follow] Already following');
    return;
  }

  const { error } = await supabase
    .from('followers')
    .insert({
      follower_id: currentUser.id,
      following_id: targetUserId
    });

  if (error) {
    // Ignore uniqueness violation if race condition
    if (error.code === '23505') {
      console.warn('[Follow] Unique violation (already following)');
      return;
    }
    console.error('[Follow] Error executing insert:', error);
    throw error;
  }

  // Notify the user being followed
  try {
    await createNotification({
      userId: targetUserId,
      type: 'follow',
      title: 'New Follower',
      message: `${currentUser.user_metadata?.username || 'Someone'} started following you!`,
      link: `/profile/${currentUser.user_metadata?.handle || currentUser.id}`,
      data: { followerId: currentUser.id }
    });
  } catch (notifError) {
    console.error('[Follow] Failed to create notification:', notifError);
  }

  console.log('[Follow] Successfully followed');
};

export const unfollowUser = async (targetUserId: string) => {
  console.log(`[Unfollow] Attempting to unfollow user: ${targetUserId}`);
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    console.error('[Unfollow] No current user found');
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('followers')
    .delete()
    .eq('follower_id', currentUser.id)
    .eq('following_id', targetUserId);

  if (error) {
    console.error('[Unfollow] Error executing delete:', error);
    throw error;
  }
  console.log('[Unfollow] Successfully unfollowed');
};

export const searchUsers = async (searchTerm: string): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, handle, avatar_url, role')
    .or(`username.ilike.%${searchTerm}%,handle.ilike.%${searchTerm}%`);

  if (error) throw error;

  return data.map(user => ({
    id: user.id,
    username: user.username,
    handle: user.handle,
    avatar: user.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
    role: user.role,
    // Mock/Default remaining fields to satisfy UserProfile
    email: '',
    location: '',
    banner: '',
    subscribers: 0,
    streams: 0,
    gems: 0,
    balance: 0,
    bio: '',
    website: '',
    projects: [],
    services: [],
    soundPacks: []
  }));
};


export const getContracts = async (): Promise<Contract[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(contract => ({
    id: contract.id,
    title: contract.title,
    type: contract.type,
    status: contract.status,
    created: contract.created_at,
    clientName: contract.client_name,
    royaltySplit: contract.royalty_split,
    revenueSplit: contract.revenue_split,
    notes: contract.notes,
    terms: contract.content || contract.terms,
    distNotes: contract.dist_notes || '',
    pubNotes: contract.pub_notes || '',
    publisherName: contract.publisher_name || '',
    producerSignature: contract.producer_signature || '',
    clientSignature: contract.client_signature || ''
  }));
};

export const createContract = async (contract: Partial<Contract>): Promise<Contract> => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('contracts')
    .insert({
      user_id: currentUser.id,
      title: contract.title || 'Untitled Contract',
      type: contract.type || 'lease',
      status: contract.status || 'draft',
      client_name: contract.clientName || '',
      content: contract.terms || '',
      royalty_split: contract.royaltySplit || 50,
      revenue_split: contract.revenueSplit || 50,
      notes: contract.notes || '',
      dist_notes: contract.distNotes || '',
      pub_notes: contract.pubNotes || '',
      publisher_name: contract.publisherName || '',
      producer_signature: contract.producerSignature || '',
      client_signature: contract.clientSignature || ''
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    type: data.type,
    status: data.status,
    created: data.created_at,
    clientName: data.client_name,
    royaltySplit: data.royalty_split,
    revenueSplit: data.revenue_split,
    notes: data.notes,
    terms: data.content || data.terms,
    distNotes: data.dist_notes || '',
    pubNotes: data.pub_notes || '',
    publisherName: data.publisher_name || '',
    producerSignature: data.producer_signature || '',
    clientSignature: data.client_signature || ''
  };
};

export const updateContract = async (contractId: string, updates: Partial<Contract>): Promise<Contract> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  const updateObj: any = {};

  if (updates.title !== undefined) updateObj.title = updates.title;
  if (updates.type !== undefined) updateObj.type = updates.type;
  if (updates.status !== undefined) updateObj.status = updates.status;
  if (updates.clientName !== undefined) updateObj.client_name = updates.clientName;
  if (updates.terms !== undefined) updateObj.content = updates.terms;
  if (updates.royaltySplit !== undefined) updateObj.royalty_split = updates.royaltySplit;
  if (updates.revenueSplit !== undefined) updateObj.revenue_split = updates.revenueSplit;
  if (updates.notes !== undefined) updateObj.notes = updates.notes;
  if (updates.distNotes !== undefined) updateObj.dist_notes = updates.distNotes;
  if (updates.pubNotes !== undefined) updateObj.pub_notes = updates.pubNotes;
  if (updates.publisherName !== undefined) updateObj.publisher_name = updates.publisherName;
  if (updates.producerSignature !== undefined) updateObj.producer_signature = updates.producerSignature;
  if (updates.clientSignature !== undefined) updateObj.client_signature = updates.clientSignature;

  const { data, error } = await supabase
    .from('contracts')
    .update(updateObj)
    .eq('id', contractId)
    .eq('user_id', currentUser.id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    type: data.type,
    status: data.status,
    created: data.created_at,
    clientName: data.client_name,
    royaltySplit: data.royalty_split,
    revenueSplit: data.revenue_split,
    notes: data.notes,
    terms: data.content || data.terms,
    distNotes: data.dist_notes || '',
    pubNotes: data.pub_notes || '',
    publisherName: data.publisher_name || '',
    producerSignature: data.producer_signature || '',
    clientSignature: data.client_signature || ''
  };
};

export const deleteContract = async (contractId: string): Promise<void> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', contractId)
    .eq('user_id', currentUser.id);

  if (error) throw error;
};



export const getTalentProfiles = async (): Promise<TalentProfile[]> => {
  let currentUser = null;
  try {
    currentUser = await getCurrentUser();
  } catch (e) {
    // User not logged in, proceed as guest
    console.log('Fetching talent profiles as guest');
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username, handle, location, avatar_url, banner_url, bio, website, gems, balance, promo_credits, role')
    .order('created_at', { ascending: false }) // Show new users first
    .limit(50); // Increased limit

  if (error) throw error;

  // Optimization: Fetch all users the current user is following in ONE query
  let followedUserIds = new Set<string>();
  if (currentUser) {
    const { data: followData, error: followError } = await supabase
      .from('followers')
      .select('following_id')
      .eq('follower_id', currentUser.id);

    if (followError) {
      console.error('Error fetching following list:', followError);
    } else if (followData) {
      followData.forEach((f: any) => followedUserIds.add(f.following_id));
    }
  }

  // Enhance with follower counts and follow status
  const profilesWithStats = await Promise.all(data.map(async (user) => {
    // Get follower count
    // Note: This is still N+1 but less critical than the checkIsFollowing burst. 
    // Ideally we'd aggregate this too but Supabase simple client doesn't do group-by count easily without RPC.
    const { count } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);

    // Check in-memory set
    const isFollowing = followedUserIds.has(user.id);

    // Get role from database (stored as lowercase)
    const rawRole = (user as any).role as string | null | undefined;

    // Capitalize the role for display (artist -> Artist, producer -> Producer)
    const displayRole = rawRole ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase() : null;

    // Generate tags based on role
    let tags: string[] = [];
    if (displayRole) {
      tags.push(displayRole);
    }
    // Add additional tags based on role type (case-insensitive comparison)
    const roleLC = rawRole?.toLowerCase();
    if (roleLC === 'artist') {
      tags.push('Musician', 'Vocalist');
    } else if (roleLC === 'engineer') {
      tags.push('Mixing');
    } else if (roleLC === 'producer') {
      tags.push('Beatmaker');
    }

    return {
      id: user.id,
      username: user.username,
      handle: user.handle,
      avatar: user.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
      role: displayRole || '', // Empty string if no role, so UI can conditionally hide
      tags: tags,
      followers: (count || 0).toString(),
      isVerified: false, // TODO: Add verification logic
      isFollowing: isFollowing,
      streams: 0, // Populated below
      tracks: 0   // Populated below
    };
  }));

  // Fetch stats in parallel for all profiles
  const profilesWithFullStats = await Promise.all(profilesWithStats.map(async (profile) => {
    const stats = await getUserStats(profile.id);
    return {
      ...profile,
      streams: stats.streams,
      tracks: stats.tracks
    };
  }));

  return profilesWithFullStats;
};

export const getFollowingProfilesForSidebar = async (): Promise<TalentProfile[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  try {
    // 1. Fetch users the current user is following
    const { data: followData, error: followError } = await supabase
      .from('followers')
      .select('following_id, created_at')
      .eq('follower_id', currentUser.id);
    // Supabase-js is direct usually, but if client-side caching exists, ensure freshness?
    // No standard 'no-cache' option in select(), but we can assume normal behavior.

    if (followError) throw followError;
    if (!followData || followData.length === 0) return [];

    const followingIds = followData.map((f: any) => f.following_id);
    const followDates = new Map(followData.map((f: any) => [f.following_id, f.created_at]));

    // 2. Fetch profiles for these users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, handle, avatar_url, role')
      .in('id', followingIds);

    if (userError) throw userError;
    if (!userData) return [];

    // 3. Fetch recent conversations to get latest interaction times
    const { data: convData, error: convError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversation:conversations (
          updated_at
        )
      `)
      .eq('user_id', currentUser.id);

    // Map of conversation_id to updated_at
    const convUpdates = new Map<string, string>();
    if (convData) {
      convData.forEach((cp: any) => {
        if (cp.conversation?.updated_at) {
          convUpdates.set(cp.conversation_id, cp.conversation.updated_at);
        }
      });
    }

    // Now we need to find the other participants in those conversations to match with following_id
    let userInteractions = new Map<string, string>();
    if (convUpdates.size > 0) {
      const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', Array.from(convUpdates.keys()))
        .neq('user_id', currentUser.id);

      if (otherParticipants) {
        otherParticipants.forEach((op: any) => {
          const updatedAt = convUpdates.get(op.conversation_id);
          if (updatedAt) {
            const currentLast = userInteractions.get(op.user_id);
            if (!currentLast || new Date(updatedAt) > new Date(currentLast)) {
              userInteractions.set(op.user_id, updatedAt);
            }
          }
        });
      }
    }

    // 4. combine and sort
    const profiles: TalentProfile[] = userData.map((user: any) => {
      const lastInteraction = userInteractions.get(user.id);
      const followDate = followDates.get(user.id) as string;

      const sortDate = lastInteraction && new Date(lastInteraction) > new Date(followDate)
        ? lastInteraction
        : followDate;

      return {
        id: user.id,
        username: user.username,
        handle: user.handle,
        avatar: user.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
        role: user.role,
        tags: user.role ? [user.role] : [],
        followers: '0',
        isVerified: false,
        isFollowing: true,
        streams: 0,
        tracks: 0,
        sortDate: sortDate // Internal use for sorting
      } as any;
    });

    return profiles
      .sort((a: any, b: any) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  } catch (error) {
    console.error('Error in getFollowingProfilesForSidebar:', error);
    return [];
  }
};



export const getFollowingProfiles = async (): Promise<TalentProfile[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  // 1. Get IDs of users we are following
  const { data: followData, error: followError } = await supabase
    .from('followers')
    .select('following_id')
    .eq('follower_id', currentUser.id);

  if (followError) throw followError;
  if (!followData || followData.length === 0) return [];

  const followingIds = followData.map((f: any) => f.following_id);

  // 2. Fetch full user profiles
  const { data, error } = await supabase
    .from('users')
    .select('id, username, handle, location, avatar_url, banner_url, bio, website, gems, balance, promo_credits, role')
    .in('id', followingIds)
    .order('username', { ascending: true }); // Alphabetical sort for the full list

  if (error) throw error;

  // 3. Enhance with stats
  const profiles = await Promise.all(data.map(async (user) => {
    // Get follower count
    const { count } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);

    const stats = await getUserStats(user.id);

    // Get role from database (stored as lowercase)
    const rawRole = (user as any).role as string | null | undefined;
    const displayRole = rawRole ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase() : null;

    let tags: string[] = [];
    if (displayRole) tags.push(displayRole);

    // Add additional tags based on role
    const roleLC = rawRole?.toLowerCase();
    if (roleLC === 'artist') tags.push('Musician', 'Vocalist');
    else if (roleLC === 'engineer') tags.push('Mixing');
    else if (roleLC === 'producer') tags.push('Beatmaker');


    return {
      id: user.id,
      username: user.username,
      handle: user.handle,
      avatar: user.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
      role: displayRole || '',
      tags: tags,
      followers: (count || 0).toString(),
      isVerified: false,
      isFollowing: true, // We know we are following them
      streams: stats.streams,
      tracks: stats.tracks
    };
  }));

  return profiles;
};

export const getCollabServices = async (): Promise<CollabService[]> => {

  const { data, error } = await supabase
    .from('collab_services')
    .select('*');

  if (error) throw error;

  return data.map(service => ({
    id: service.id,
    name: service.name,
    platform: service.platform,
    handle: service.handle,
    avatar: service.avatar_url || 'https://picsum.photos/id/10/100',
    serviceTitle: service.service_title,
    description: service.description || '',
    priceRange: service.price_range || '',
    stats: service.stats || [],
    verified: service.is_verified
  }));
};



// Get purchases for a specific user
export const getPurchasesByUserId = async (userId: string): Promise<Purchase[]> => {
  const { data: purchasesData, error } = await supabase
    .from('purchases')
    .select(`
      *,
      purchase_items:purchase_items (
        item_id,
        item_name,
        item_type,
        contract_id,
        seller:users!seller_id (
          username,
          avatar_url
        ),
        price
      )
    `)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Enhance with project details (tracks, cover image)
  const enhancedPurchases = await Promise.all(purchasesData.map(async (purchase) => {
    const item = purchase.purchase_items?.[0];
    let projectDetails = {};

    if (item && (item.item_type === 'Beat License' || item.item_type === 'Sound Kit')) {
      // Fetch project info if it's a beat or kit
      const { data: project } = await supabase
        .from('projects')
        .select(`
                cover_image_url,
                tracks (
                    id,
                    title,
                    duration_seconds
                )
            `)
        .eq('id', item.item_id)
        .single();

      if (project) {
        projectDetails = {
          coverImage: project.cover_image_url,
          tracks: project.tracks?.map((t: any) => ({
            id: t.id,
            title: t.title,
            duration: t.duration_seconds
          }))
        };
      }
    }

    return {
      id: purchase.id,
      date: new Date(purchase.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      item: item?.item_name || 'Unknown Item',
      seller: item?.seller?.username || 'Unknown',
      sellerAvatar: item?.seller?.avatar_url,
      amount: item?.price || 0,
      status: purchase.status,
      image: (projectDetails as any).coverImage || 'https://picsum.photos/id/13/200',
      type: item?.item_type || 'Service',
      created_at: purchase.created_at,
      projectId: item?.item_id,
      contractId: item?.contract_id,
      ...(projectDetails as any)
    };
  }));

  return enhancedPurchases;
};

// Get orders for a specific user
export const getOrdersByUserId = async (userId: string): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      purchase_item:purchase_items (
        service:services (
          title
        ),
        price
      ),
      client:client_id (
        username,
        avatar_url
      )
    `)
    .or(`client_id.eq.${userId},seller_id.eq.${userId}`);

  if (error) throw error;

  return data.map(order => ({
    id: order.id,
    serviceTitle: order.purchase_item?.service?.title || 'Unknown Service',
    clientName: order.client?.username || 'Unknown',
    clientAvatar: order.client?.avatar_url || 'https://i.pravatar.cc/150?u=client',
    amount: order.purchase_item?.price || 0,
    status: order.status,
    deadline: order.deadline,
    requirements: order.requirements || '',
    files: []
  }));
};

// Analytics functions for real dashboard data


// File upload functions

// Manual function to check and create storage bucket
export const ensureStorageBucket = async () => {
  try {
    console.log('Checking storage buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    console.log('Existing buckets:', buckets);

    const assetsBucket = buckets?.find(b => b.name === 'assets');

    if (!assetsBucket) {
      console.log('Creating assets bucket...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('assets', {
        public: true,
        // Allow all file types for maximum flexibility (archives, audio, images, text, etc.)
        allowedMimeTypes: ['*/*'],
        fileSizeLimit: 52428800 // 50MB
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        if (createError.message.includes('row-level security policy')) {
          throw new Error('Bucket creation requires admin permissions. Please create the "assets" bucket manually in your Supabase dashboard under Storage > Buckets.');
        }
        throw new Error(`Failed to create bucket: ${createError.message}`);
      } else {
        console.log('✅ Assets bucket created successfully:', newBucket);
        return true;
      }
    } else {
      console.log('✅ Assets bucket already exists:', assetsBucket);
      return true;
    }
  } catch (error) {
    console.error('❌ Error ensuring storage bucket:', error);
    throw error;
  }
};

// Consolidated storage initialization
// Consolidated storage initialization
export const initializeStorage = async () => {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    // If we can't list buckets (e.g., RLS), we just assume 'assets' might exist or we can't create it anyway.
    // We proceed silently.
    if (listError) {
      // console.warn('Could not list buckets (likely RLS). Proceeding with assumption that "assets" bucket exists.');
      return;
    }

    const assetsBucket = buckets?.find(b => b.name === 'assets');

    if (!assetsBucket) {
      console.log('Creating assets bucket...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('assets', {
        public: true,
        allowedMimeTypes: ['*/*'], // Allow all types
        fileSizeLimit: 52428800 // 50MB (max allowed by project)
      });

      if (createError) {
        // RLS error is expected for non-admin users if they try to create a bucket
        if (createError.message.includes('row-level security') || createError.message.includes('violates row-level security policy')) {
          // This is fine, the bucket probably exists or we just can't create it.
          // We suppress this error to avoid confusing the user since upload might still work if bucket exists.
          console.log('Bucket creation skipped (RLS restricted). Assuming bucket exists and is managed by admin.');
        } else {
          console.error('Error creating bucket:', createError);
        }
      } else {
        console.log('Assets bucket created successfully:', newBucket);
      }
    } else {
      // console.log('Assets bucket already exists:', assetsBucket);
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

export const uploadFile = async (file: File): Promise<{ assetId: string; storagePath: string; publicUrl: string }> => {
  const currentUser = await ensureUserExists(); // Use global JIT check
  if (!currentUser) throw new Error('User not authenticated');

  try {
    // Ensure storage is ready (lazy init)
    console.log('Initializing storage...');
    await initializeStorage();

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const storagePath = `${currentUser.id}/${fileName}`;

    console.log('Uploading file to:', storagePath);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(storagePath, file, {
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('File uploaded successfully:', uploadData);

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(storagePath);

    console.log('Public URL:', publicUrl);

    // Create asset record in database
    const { data: assetData, error: assetError } = await supabase
      .from('assets')
      .insert({
        user_id: currentUser.id,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size
      })
      .select()
      .single();

    if (assetError) {
      console.error('Asset creation error:', assetError);
      // If asset creation fails, try to clean up the uploaded file
      try {
        await supabase.storage.from('assets').remove([storagePath]);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
      throw new Error(`Failed to create asset record: ${assetError.message}`);
    }

    console.log('Asset created successfully:', assetData);

    return {
      assetId: assetData.id,
      storagePath: storagePath,
      publicUrl: publicUrl
    };
  } catch (error) {
    console.error('Upload process failed:', error);
    throw error;
  }
};

export const getStorageUsage = async (): Promise<{ used: number; limit: number }> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { used: 0, limit: 5 * 1024 * 1024 * 1024 }; // 5GB default for guests

  // Fetch user profile to get their plan
  const { data: userData } = await supabase
    .from('users')
    .select('plan')
    .eq('id', currentUser.id)
    .single();

  const plan = userData?.plan || 'Basic';

  const { data, error } = await supabase
    .from('assets')
    .select('size_bytes')
    .eq('user_id', currentUser.id);

  if (error) throw error;

  const used = data.reduce((total, asset) => total + (asset.size_bytes || 0), 0);

  // Set limit based on plan
  let limit = 5 * 1024 * 1024 * 1024; // 5GB Basic
  if (plan === 'Pro') limit = 15 * 1024 * 1024 * 1024; // 15GB Pro
  if (plan === 'Studio+') limit = 25 * 1024 * 1024 * 1024; // 25GB Studio+

  return { used, limit };
};

export const deleteFile = async (assetId: string): Promise<void> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  // 1. Get the file path from the database
  const { data: asset, error: fetchError } = await supabase
    .from('assets')
    .select('storage_path, user_id')
    .eq('id', assetId)
    .single();

  if (fetchError) throw fetchError;
  if (!asset) throw new Error('File not found');

  // Security check: ensure the user owns the file
  if (asset.user_id !== currentUser.id) {
    throw new Error('Unauthorized to delete this file');
  }

  // 2. Remove from Supabase Storage
  const { error: storageError } = await supabase.storage
    .from('assets')
    .remove([asset.storage_path]);

  if (storageError) {
    console.error('Error removing file from storage:', storageError);
    // We might still want to proceed to delete the DB record if the file is gone or inaccessible
  }

  // 3. Remove record from database
  const { error: dbError } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId);

  if (dbError) throw dbError;
};


export const createFolder = async (name: string, parentId: string | null = null): Promise<any> => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('assets')
    .insert({
      user_id: currentUser.id,
      storage_path: `folder-${Date.now()}`, // Virtual path for folder
      file_name: name,
      mime_type: 'application/vnd.antigravity.folder',
      size_bytes: 0,
      parent_id: parentId // Assuming column exists, if not we might need to use metadata or another strategy
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.file_name,
    type: 'folder',
    parentId: data.parent_id,
    created: new Date(data.created_at).toLocaleDateString()
  };
};

export const updateAsset = async (assetId: string, updates: { name?: string; parentId?: string | null }) => {
  const updatePayload: any = {};
  if (updates.name !== undefined) updatePayload.file_name = updates.name;
  if (updates.parentId !== undefined) updatePayload.parent_id = updates.parentId;

  const { error } = await supabase
    .from('assets')
    .update(updatePayload)
    .eq('id', assetId);

  if (error) throw error;
};

export const getUserFiles = async (): Promise<any[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(asset => {
    // Only generate URL for real files
    const isFolder = asset.mime_type === 'application/vnd.antigravity.folder';
    let publicUrl = '';

    if (!isFolder) {
      const { data: { publicUrl: url } } = supabase.storage
        .from('assets')
        .getPublicUrl(asset.storage_path);
      publicUrl = url;
    }

    return {
      id: asset.id,
      name: asset.file_name,
      size: isFolder ? '-' : (asset.size_bytes / (1024 * 1024)).toFixed(2) + ' MB',
      duration: '--:--',
      url: publicUrl,
      type: isFolder ? 'folder' : (asset.mime_type.startsWith('audio') ? 'audio' : asset.mime_type.startsWith('image') ? 'image' : 'text'),
      parentId: asset.parent_id,
      originalType: asset.mime_type
    };
  });
};

// --- LIVE LISTENER & PLAY COUNT TRACKING ---

// trackId -> specific track
// artistId -> owner of the track
// We use 'presence' to track live listeners.
// Listeners join a channel like `tracking:${artistId}`.
// The artist subscribes to `tracking:${artistId}` to see count.

export const joinListeningRoom = (artistId: string, trackId: string, userId?: string) => {
  const channel = supabase.channel(`tracking:${artistId}`);

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      let activeUserId = userId;
      if (!activeUserId) {
        const { data } = await supabase.auth.getUser();
        activeUserId = data.user?.id;
      }

      await channel.track({
        user_id: activeUserId || `anon-${Math.random().toString(36).substr(2, 9)}`,
        track_id: trackId,
        online_at: new Date().toISOString(),
      });
    }
  });

  return channel;
};

export const leaveListeningRoom = (channel: any) => {
  if (channel) {
    channel.unsubscribe();
  }
};

export const subscribeToArtistPresence = (artistId: string, callback: (count: number) => void) => {
  const channel = supabase.channel(`tracking:${artistId}`);

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      // Count unique users or total connections? Usually unique users.
      // state is { key: [ { user_id, track_id ... }, ... ] }

      const uniqueUsers = new Set();
      Object.keys(state).forEach(key => {
        state[key].forEach((presence: any) => {
          if (presence.user_id) uniqueUsers.add(presence.user_id);
        });
      });
      console.log('Live listener sync:', state, uniqueUsers.size);
      callback(uniqueUsers.size);
    })
    .subscribe();

  return channel;
};


// --- PLAY COUNTING ---

export const recordPlay = async (trackId: string) => {
  // 1. Client-side check for 2-minute cooldown handled by caller or here
  // We'll trust the caller to handle the timer (20s) logic

  try {
    const { error } = await supabase.rpc('increment_play_count', { track_id: trackId });

    if (error) {
      // Fallback: If you have a 'plays' table where you just insert rows
      // This assumes a table 'plays' exists with track_id
      const { error: insertError } = await supabase
        .from('plays')
        .insert({ track_id: trackId });

      if (insertError) console.error("Failed to record play", insertError);
    }
  } catch (e) {
    console.error("Exception recording play:", e);
  }
};

// Goals functions
export const getGoals = async (): Promise<Goal[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(goal => ({
    id: goal.id,
    title: goal.title,
    type: goal.type,
    target: goal.target,
    current: goal.current,
    deadline: goal.deadline,
    status: goal.status,
    description: goal.description,
    createdAt: goal.created_at,
    category: goal.category
  }));
};

export const createGoal = async (goal: Partial<Goal>): Promise<Goal> => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: currentUser.id,
      title: goal.title,
      type: goal.type,
      target: goal.target,
      current: goal.current || 0,
      deadline: goal.deadline,
      status: goal.status || 'active',
      description: goal.description,
      category: goal.category
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    type: data.type,
    target: data.target,
    current: data.current,
    deadline: data.deadline,
    status: data.status,
    description: data.description,
    createdAt: data.created_at,
    category: data.category
  };
};

export const updateGoal = async (goalId: string, updates: Partial<Goal>): Promise<Goal> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  const updateObj: any = {};
  if (updates.title !== undefined) updateObj.title = updates.title;
  if (updates.type !== undefined) updateObj.type = updates.type;
  if (updates.target !== undefined) updateObj.target = updates.target;
  if (updates.current !== undefined) updateObj.current = updates.current;
  if (updates.deadline !== undefined) updateObj.deadline = updates.deadline;
  if (updates.status !== undefined) updateObj.status = updates.status;
  if (updates.description !== undefined) updateObj.description = updates.description;
  if (updates.category !== undefined) updateObj.category = updates.category;

  const { data, error } = await supabase
    .from('goals')
    .update(updateObj)
    .eq('id', goalId)
    .eq('user_id', currentUser.id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    type: data.type,
    target: data.target,
    current: data.current,
    deadline: data.deadline,
    status: data.status,
    description: data.description,
    createdAt: data.created_at,
    category: data.category
  };
};

export const deleteGoal = async (goalId: string): Promise<void> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', currentUser.id);

  if (error) throw error;
};

// --- Notes ---

export const getNotes = async (): Promise<Note[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    return [];
  }

  // Filter out trash tag
  const activeNotes = data.filter((n: any) => !n.tags?.includes('TRASH'));

  return activeNotes.map((n: any) => ({
    id: n.id,
    title: n.title,
    content: n.content || '',
    preview: n.preview || '',
    tags: n.tags || [],
    updated: new Date(n.updated_at).toLocaleDateString(),
    attachedAudio: n.attached_audio,
    attachedAudioName: n.attached_audio_name,
    attachedAudioProducer: n.attached_audio_producer,
    attachedAudioAvatar: n.attached_audio_avatar
  }));
};

export const getDeletedNotes = async (): Promise<Note[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching deleted notes:', error);
    return [];
  }

  // Filter FOR trash tag
  const deletedNotes = data.filter((n: any) => n.tags?.includes('TRASH'));

  return deletedNotes.map((n: any) => ({
    id: n.id,
    title: n.title,
    content: n.content || '',
    preview: n.preview || '',
    tags: n.tags || [],
    updated: new Date(n.updated_at).toLocaleDateString(),
    attachedAudio: n.attached_audio,
    attachedAudioName: n.attached_audio_name,
    attachedAudioProducer: n.attached_audio_producer,
    attachedAudioAvatar: n.attached_audio_avatar
  }));
};

export const createNote = async (
  title: string = 'Untitled Note',
  content: string = '',
  attachedAudio?: string,
  audioMetadata?: { name?: string; producer?: string; avatar?: string }
) => {
  const user = await ensureUserExists();
  if (!user) throw new Error('User not logged in');

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      title,
      content,
      preview: content.slice(0, 100),
      attached_audio: attachedAudio,
      attached_audio_name: audioMetadata?.name,
      attached_audio_producer: audioMetadata?.producer,
      attached_audio_avatar: audioMetadata?.avatar,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    content: data.content || '',
    preview: data.preview || '',
    tags: data.tags || [],
    updated: new Date(data.updated_at).toLocaleDateString(),
    attachedAudio: data.attached_audio,
    attachedAudioName: data.attached_audio_name,
    attachedAudioProducer: data.attached_audio_producer,
    attachedAudioAvatar: data.attached_audio_avatar
  } as Note;
};

export const updateNote = async (id: string, updates: Partial<Note>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not logged in');

  const dbUpdates: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.content !== undefined) {
    dbUpdates.content = updates.content;
    // Auto-update preview from content (first 50 chars)
    dbUpdates.preview = updates.content.substring(0, 50).replace(/\n/g, ' ') + (updates.content.length > 50 ? '...' : '');
  }
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
  if (updates.attachedAudio !== undefined) dbUpdates.attached_audio = updates.attachedAudio;
  if (updates.attachedAudioName !== undefined) dbUpdates.attached_audio_name = updates.attachedAudioName;
  if (updates.attachedAudioProducer !== undefined) dbUpdates.attached_audio_producer = updates.attachedAudioProducer;
  if (updates.attachedAudioAvatar !== undefined) dbUpdates.attached_audio_avatar = updates.attachedAudioAvatar;

  const { error } = await supabase
    .from('notes')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
};

// --- STUDIO MANAGEMENT FUNCTIONS ---

export const updateProject = async (projectId: string, updates: Partial<Project>) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  const updateObj: any = {};
  if (updates.title !== undefined) updateObj.title = updates.title;
  if (updates.bpm !== undefined) updateObj.bpm = updates.bpm;
  if (updates.key !== undefined) updateObj.key = updates.key;
  if (updates.genre !== undefined) updateObj.genre = updates.genre;
  if (updates.status !== undefined) updateObj.status = updates.status;
  if (updates.releaseDate !== undefined) updateObj.release_date = updates.releaseDate;
  if (updates.format !== undefined) updateObj.format = updates.format;
  if (updates.progress !== undefined) updateObj.progress = updates.progress;
  if (updates.description !== undefined) updateObj.description = updates.description;
  if (updates.subGenre !== undefined) updateObj.sub_genre = updates.subGenre;

  const { error } = await supabase
    .from('projects')
    .update(updateObj)
    .eq('id', projectId)
    .eq('user_id', currentUser.id);

  if (error) throw error;
};

export const deleteProject = async (projectId: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', currentUser.id);

  if (error) throw error;
};



// -- TASKS --

export const createTask = async (projectId: string, text: string) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ project_id: projectId, text: text, completed: false })
    .select()
    .single();

  if (error) throw error;
  return { id: data.id, projectId: data.project_id, text: data.text, completed: data.completed, createdAt: data.created_at };
};

export const updateTask = async (taskId: string, updates: { text?: string; completed?: boolean }) => {
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId);

  if (error) throw error;
};

export const deleteTask = async (taskId: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;
};

// -- TRACKS (Studio) --

export const addTrack = async (projectId: string, track: Partial<any>) => {
  const { data, error } = await supabase
    .from('tracks')
    .insert({
      project_id: projectId,
      title: track.title || 'Untitled Track',
      duration_seconds: track.duration || 0,
      track_number: track.trackNumber || 0,
      status_tags: track.statusTags || [],
      assigned_file_id: track.assignedFileId
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    duration: data.duration_seconds,
    trackNumber: data.track_number,
    statusTags: data.status_tags,
    assignedFileId: data.assigned_file_id
  };
};

export const updateTrack = async (trackId: string, updates: Partial<any>) => {
  const updateObj: any = {};
  if (updates.title !== undefined) updateObj.title = updates.title;
  if (updates.statusTags !== undefined) updateObj.status_tags = updates.statusTags;
  if (updates.assignedFileId !== undefined) updateObj.assigned_file_id = updates.assignedFileId;
  if (updates.noteId !== undefined) updateObj.note_id = updates.noteId;
  if (updates.noteId === null) updateObj.note_id = null; // Explicit null for detach

  const { error } = await supabase
    .from('tracks')
    .update(updateObj)
    .eq('id', trackId);

  if (error) throw error;
};

export const deleteTrack = async (trackId: string) => {
  const { error } = await supabase
    .from('tracks')
    .delete()
    .eq('id', trackId);

  if (error) throw error;
};

// -- LIBRARY --




export const deleteNote = async (id: string, permanent: boolean = false) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not logged in');

  if (permanent) {
    // Hard delete
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  } else {
    // Soft delete - Add TRASH tag
    // First fetch current tags to append
    const { data: note } = await supabase
      .from('notes')
      .select('tags')
      .eq('id', id)
      .single();

    const currentTags = note?.tags || [];
    if (!currentTags.includes('TRASH')) {
      const { error } = await supabase
        .from('notes')
        .update({
          tags: [...currentTags, 'TRASH'],
          updated_at: new Date().toISOString() // Update timestamp to track when it was binned
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    }
  }
};

export const restoreNote = async (id: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not logged in');

  const { data: note } = await supabase
    .from('notes')
    .select('tags')
    .eq('id', id)
    .single();

  const currentTags = note?.tags || [];
  const newTags = currentTags.filter((t: string) => t !== 'TRASH');

  const { error } = await supabase
    .from('notes')
    .update({
      tags: newTags,
      updated_at: new Date().toISOString() // Update timestamp to bring it to top
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
};

export const cleanupOldNotes = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Fetch all notes with TRASH tag
  // In a real optimized scenario, we'd use a postgres function or specific query, 
  // but for client-side logic with small data:
  const { data: notes, error } = await supabase
    .from('notes')
    .select('id, updated_at, tags')
    .eq('user_id', user.id);

  if (error || !notes) return;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const notesToDelete = notes.filter((n: any) =>
    n.tags?.includes('TRASH') &&
    new Date(n.updated_at) < thirtyDaysAgo
  );

  for (const note of notesToDelete) {
    console.log(`Auto-deleting old note: ${note.id}`);
    await deleteNote(note.id, true);
  }
};

// ... existing code ...

// Define types for clarity
type PurchaseStatus = 'Processing' | 'Completed' | 'Failed';


export const signContract = async (contractId: string, signature: string) => {
  // 1. Sign the contract
  const { error } = await supabase
    .from('contracts')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      client_signature: signature
    })
    .eq('id', contractId);

  if (error) throw error;

  // 2. Notify the seller (Find the seller via purchase_items)
  try {
    const { data: purchaseItem, error: piError } = await supabase
      .from('purchase_items')
      .select('seller_id, name, purchase_id')
      .eq('contract_id', contractId)
      .single();

    if (purchaseItem && !piError) {
      // Get Buyer Name (Current User)
      const { data: { user } } = await supabase.auth.getUser();
      const buyerName = user?.user_metadata?.username || user?.email || 'A buyer';

      // Use the existing createNotification function (defined later in file)
      // We rely on hoisting or module imports if it was separate, but since it's in same file used via internal ref or just needs to be called after definition?
      // Actually `const` functions are not hoisted. If `createNotification` is defined at line 4945, and we are at line 3516, we cannot call it if it's `const`.
      // We might need to move `signContract` down or move `createNotification` up.

      // Since moving large blocks is risky, I will reimplement the insert logic directly inside signContract to avoid reference issues.
      // This is safer and avoids reordering the whole file.

      await supabase
        .from('notifications')
        .insert({
          user_id: purchaseItem.seller_id,
          type: 'alert',
          title: 'Contract Signed',
          message: `${buyerName} has signed the contract for ${purchaseItem.name}.`,
          link: `/dashboard/orders`,
          data: { contractId, purchaseId: purchaseItem.purchase_id },
          read: false
        });
    }
  } catch (err) {
    console.error('Error notifying seller of signed contract:', err);
    // Don't fail the signing process just because notification failed
  }
};

export const createPurchase = async (
  items: any[],
  total: number,
  paymentMethod: string,
  transactionId?: string,
  initialStatus: PurchaseStatus = 'Completed',
  guestEmail?: string
) => {
  const currentUser = await getCurrentUser().catch(() => null);
  // We allow null currentUser for guest checkout

  // 1. Create Purchase Record
  const { data: purchaseData, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      buyer_id: currentUser?.id || null,
      amount: total,
      total_amount: total, // Sync both for compatibility
      status: initialStatus,
      stripe_payment_id: transactionId || (paymentMethod === 'crypto' ? 'crypto_txn' : 'pending_stripe'),
      payment_method: paymentMethod,
      guest_email: guestEmail
    })
    .select()
    .single();

  if (purchaseError) throw purchaseError;

  const purchaseId = purchaseData.id;

  // 2. Create Purchase Items
  if (items && items.length > 0) {
    const purchaseItems = items.map(item => {
      let projectId = null;
      let serviceId = null;

      // Extract raw ID (sometimes items can have composite IDs, so we need to be careful)
      let rawId = item.id;
      // If the ID looks like it has a suffix (like timestamp), try to extract the UUID part
      // UUID is 36 chars. If longer, maybe split?
      // We should try to extract the first 36 characters if it looks like a UUID start.

      let cleanId = rawId;
      if (typeof rawId === 'string' && rawId.length > 36 && rawId[36] === '-') {
        cleanId = rawId.substring(0, 36);
      }

      const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

      if (isValidUuid(cleanId)) {
        if (item.type && (item.type.includes('Service') || item.type.includes('Mixing') || item.type.includes('Mastering'))) {
          serviceId = cleanId;
        } else {
          projectId = cleanId;
        }
      }

      const itemName = item.title || item.name || 'Unknown Item';
      const sellerId = item.sellerId || item.seller_id || (currentUser?.id);

      if (!sellerId && !currentUser?.id) {
        console.error(`[createPurchase] Critical: Missing seller_id for item: "${itemName}". This may cause insert failure.`);
      }

      return {
        purchase_id: purchaseId,
        project_id: projectId,
        service_id: serviceId,
        seller_id: sellerId,
        item_name: itemName,
        item_type: (() => {
          const typeMap: Record<string, string> = {
            'Exclusive License': 'Beat License',
            'Lease License': 'Beat License',
            'Sound Kit': 'Sound Kit',
            'Service': 'Service',
            'Mixing': 'Service',
            'Mastering': 'Service'
          };
          return typeMap[item.type] || 'Beat License'; // Default to Beat License if unknown, or maybe handle error
        })(),
        price: item.price,

        contract_id: item.contractId, // Only pass contract ID if it exists, do not fallback to licenseId as it's not a FK
        track_id: item.trackId // Save track ID link
      };
    });

    console.log('[createPurchase] Inserting items payload:', purchaseItems);

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(purchaseItems);

    if (itemsError) {
      console.error("Error creating purchase items:", itemsError);
      throw new Error(`Failed to create purchase items: ${itemsError.message}`);
    }
  }

  // 3. Send Notifications to Sellers
  try {
    // Group items by seller to send one notification per seller per purchase
    const itemsBySeller: Record<string, any[]> = {};
    items.forEach(item => {
      const sellerId = item.sellerId || item.seller_id; // Check both just in case
      if (sellerId && (!currentUser || sellerId !== currentUser.id)) { // Don't notify if buying own item (testing)
        if (!itemsBySeller[sellerId]) itemsBySeller[sellerId] = [];
        itemsBySeller[sellerId].push(item);
      }
    });

    await Promise.all(Object.keys(itemsBySeller).map(async (sellerId) => {
      const sellerItems = itemsBySeller[sellerId];
      const itemCount = sellerItems.length;
      const firstItemName = sellerItems[0].title || sellerItems[0].item_name || 'Item';
      const message = itemCount > 1
        ? `You sold ${itemCount} items including "${firstItemName}"!`
        : `You sold "${firstItemName}"!`;

      // Notify seller of the sale
      await createNotification({
        userId: sellerId,
        type: 'sale',
        title: 'New Sale! 💰',
        message: message,
        link: '/dashboard/sales',
        data: { purchaseId: purchaseId, items: sellerItems }
      });

      // Also notify seller to manage the new order
      await createNotification({
        userId: sellerId,
        type: 'system', // Changed from 'manage_order' to 'system' to avoid check constraint violation
        title: 'New Order Assignment',
        message: `You have a new order to manage: ${firstItemName}`,
        link: '/dashboard/manage',
        data: { purchaseId: purchaseId, items: sellerItems }
      });
    }));

    // 4. Notify Buyer of Successful Order
    await createNotification({
      userId: currentUser.id,
      type: 'order',
      title: 'Order Confirmed! 🎵',
      message: `Your purchase of ${items.length} item(s) was successful. Check your library and orders for details.`,
      link: '/dashboard/orders',
      data: { purchaseId: purchaseId }
    });

  } catch (notifError) {
    console.error("Failed to send purchase notifications:", notifError);
  }

  return purchaseData;
};

export const getSales = async (): Promise<Purchase[]> => {
  // ... existing code ...
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  // Filter purchases where one of the items is sold by current user
  const { data: salesData, error } = await supabase
    .from('purchases')
    .select(`
      *,
      purchase_items!inner (
        price,
        seller_id,
        item_name,
        contract_id,
        contracts (
          status
        )
      )
    `)
    .eq('purchase_items.seller_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sales:', error);
    return [];
  }

  // Manually fetch distinct buyers
  // Note: Schema uses 'buyer_id' on purchases table
  const buyerIds = [...new Set(salesData.map((p: any) => p.buyer_id).filter(Boolean))];
  let buyersMap: Record<string, any> = {};

  if (buyerIds.length > 0) {
    const { data: buyers } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .in('id', buyerIds);

    if (buyers) {
      buyers.forEach((b: any) => { buyersMap[b.id] = b; });
    }
  }

  const sellerProfile = { username: currentUser.user_metadata?.username || 'Me', avatar_url: currentUser.user_metadata?.avatar_url };

  return salesData.map((p: any) => {
    let amount = 0;
    let itemName = 'Unknown Item';
    // Calculate total amount for this seller specifically? 
    // Or total purchase amount? Usually dashboard shows total related to seller.
    // For now taking sum of items sold by THIS seller.
    if (p.purchase_items && p.purchase_items.length > 0) {
      const myItems = p.purchase_items.filter((i: any) => i.seller_id === currentUser.id);
      amount = myItems.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
      if (myItems.length > 0) itemName = myItems[0].item_name || 'Item';
    }

    const buyer = buyersMap[p.buyer_id];

    return {
      id: p.id,
      date: formatDate(new Date(p.created_at)),
      item: itemName || 'Unknown Item', // Ensure string
      seller: sellerProfile.username,
      sellerAvatar: sellerProfile.avatar_url,
      buyer: buyer?.username || 'Unknown',
      buyerAvatar: buyer?.avatar_url,
      amount: amount,
      status: p.status,
      image: p.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
      type: p.type,
      projectId: p.project_id,
      contractId: p.purchase_items?.[0]?.contract_id,
      contractStatus: p.purchase_items?.[0]?.contracts?.status,
      createdAt: p.created_at // Expose raw timestamp for filtering
    };
  });
};

export const getPurchases = async (): Promise<Purchase[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data: purchasesData, error } = await supabase
    .from('purchases')
    .select(`
      *,
      purchase_items (
        price,
        seller_id,
        item_name,
        item_type,
        contract_id,
        contracts (
          status
        ),
        track_id,
        project_id,
        projects (
          *,
          tracks (
            *,
            assigned_file:assets!tracks_mp3_asset_id_fkey(storage_path)
          )
        )
      )
    `)
    .eq('buyer_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching purchases:', error);
    return [];
  }

  console.log('[getPurchases] Raw Data:', purchasesData.map(p => ({
    id: p.id,
    status: p.status,
    payment_id: p.stripe_payment_id,
    amount: p.amount,
    created: p.created_at
  })));

  // --- Start of Grouping Logic ---

  // Helper to generate a content signature for a purchase
  const getSignature = (p: any) => {
    if (!p.purchase_items || p.purchase_items.length === 0) return `amount-${p.amount}`;
    // Signature based on sorted seller_id + item_name + price. 
    // Using project_id might be better but sometimes it's null for services.
    const itemSigs = p.purchase_items.map((pi: any) =>
      `${pi.seller_id || 'noseller'}-${pi.item_name || 'noitem'}-${pi.price}`
    ).sort().join('|');
    return itemSigs;
  };

  // Phase 1: Group by strict Payment ID (merges status updates for same ID)
  const byPaymentId: Record<string, any> = {};
  const noPaymentId: any[] = [];

  purchasesData.forEach((p: any) => {
    const pid = p.stripe_payment_id;
    if (pid && pid !== 'pending_stripe' && pid !== 'crypto_txn') {
      if (!byPaymentId[pid]) {
        byPaymentId[pid] = p;
      } else {
        // Keep the one that is Completed, or if same, the newest (first one since sorted desc)
        if (byPaymentId[pid].status !== 'Completed' && p.status === 'Completed') {
          byPaymentId[pid] = p;
        }
      }
    } else {
      noPaymentId.push(p);
    }
  });

  let candidates = [...Object.values(byPaymentId), ...noPaymentId];

  // Phase 2: Group by Content Signature (deduplicate 'pending_stripe' vs real 'pi_xxx')
  // We want to keep the "best" version for each signature.
  // Best = Completed. If both Completed, Newest.
  const bySignature: Record<string, any> = {};

  candidates.forEach((p: any) => {
    const sig = getSignature(p);

    if (!bySignature[sig]) {
      bySignature[sig] = p;
    } else {
      const existing = bySignature[sig];

      // Logic:
      // 1. Prefer Completed over Processing/Failed
      // 2. If same status, prefer the one with a Real Payment ID over 'pending_stripe'
      // 3. If same ID type, prefer Newest (which is 'existing' because we iterate candidates which are roughly time-sorted but candidates array was mixed. 
      //    Wait, candidates array order is not guaranteed time-sorted anymore.
      //    We should compare created_at.

      const isComp = p.status === 'Completed';
      const exComp = existing.status === 'Completed';

      if (isComp && !exComp) {
        bySignature[sig] = p;
      } else if (isComp === exComp) {
        // Same status priority. Check Payment ID quality.
        const pHasRealId = p.stripe_payment_id && !p.stripe_payment_id.startsWith('pending_') && !p.stripe_payment_id.startsWith('txn_test');
        const exHasRealId = existing.stripe_payment_id && !existing.stripe_payment_id.startsWith('pending_') && !existing.stripe_payment_id.startsWith('txn_test');

        if (pHasRealId && !exHasRealId) {
          bySignature[sig] = p;
        } else if (pHasRealId === exHasRealId) {
          // Both real or both pending. Keep newest.
          if (new Date(p.created_at).getTime() > new Date(existing.created_at).getTime()) {
            bySignature[sig] = p;
          }
        }
      }
    }
  });

  const finalRawPurchases = Object.values(bySignature);

  // Filter out stale "Processing" orders (older than 15 mins) that still have 'pending_stripe' ID
  // This cleans up abandoned checkout drafts from the Order History
  const NOW = new Date().getTime();
  const FIFTEEN_MINS = 15 * 60 * 1000;

  const cleanPurchases = finalRawPurchases.filter((p: any) => {
    if (p.status === 'Processing' && p.stripe_payment_id === 'pending_stripe') {
      const createdTime = new Date(p.created_at).getTime();
      if ((NOW - createdTime) > FIFTEEN_MINS) {
        return false; // Hide stale draft
      }
    }
    return true;
  });

  // Sort by date desc
  cleanPurchases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // --- End of Grouping Logic ---

  // items collection for seller lookup
  const sellerIds = new Set<string>();
  cleanPurchases.forEach((p: any) => {
    p.purchase_items?.forEach((pi: any) => {
      if (pi.seller_id) sellerIds.add(pi.seller_id);
    });
  });

  const uniqueSellerIds = [...sellerIds];
  let sellersMap: Record<string, any> = {};

  if (uniqueSellerIds.length > 0) {
    const { data: sellers } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .in('id', uniqueSellerIds);

    if (sellers) {
      sellers.forEach((s: any) => { sellersMap[s.id] = s; });
    }
  }

  return cleanPurchases.map((p: any) => {
    let amount = 0; // sum of items
    let mainSellerId = null;
    let itemName = 'Unknown Item';
    let mainType = p.type; // Default to top-level type if available

    if (p.purchase_items && p.purchase_items.length > 0) {
      amount = p.purchase_items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
      mainSellerId = p.purchase_items[0].seller_id; // Assume primary seller from first item
      itemName = p.purchase_items[0].item_name || 'Unknown Item';

      // If p.type is missing/null, assume it from the first item
      if (!mainType && p.purchase_items[0].item_type) {
        mainType = p.purchase_items[0].item_type;
      }

      // If multiple items, maybe summarize title? "Item 1 + 2 others"
      if (p.purchase_items.length > 1) {
        itemName = `${itemName} + ${p.purchase_items.length - 1} more`;
      }

    } else if (p.amount !== undefined) {
      amount = Number(p.amount);
    }

    const seller = mainSellerId ? sellersMap[mainSellerId] : null;

    const purchaseItems = p.purchase_items?.map((pi: any) => ({
      name: pi.item_name || 'Unknown Item',
      price: pi.price,
      type: pi.item_type || 'Item',
      seller: sellersMap[pi.seller_id]?.username || 'Unknown',
      sellerId: pi.seller_id,
      contractId: pi.contract_id,
      trackId: pi.track_id
    })) || [];

    // Debug logging for verified items
    if (purchaseItems.length > 0) {
      console.log(`[getPurchases] Mapped items for ${p.id}:`, purchaseItems);
    }

    return {
      id: p.id,
      date: formatDate(new Date(p.created_at)),
      item: itemName || 'Unknown Item',
      seller: seller?.username || 'Unknown',
      sellerAvatar: seller?.avatar_url,
      amount: amount,
      status: p.status,
      image: p.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
      type: mainType, // Use resolved type
      projectId: p.purchase_items?.[0]?.project_id,
      contractId: p.purchase_items?.[0]?.contract_id,
      contractStatus: p.purchase_items?.[0]?.contracts?.status,
      purchaseItems: purchaseItems,
      tracks: p.purchase_items?.[0]?.projects?.tracks?.map((t: any) => {
        // Generate Public URL for playback
        let mp3Url = t.mp3_url || '';
        if (t.assigned_file?.storage_path) {
          const { data } = supabase.storage.from('assets').getPublicUrl(t.assigned_file.storage_path);
          mp3Url = data.publicUrl;
        }

        return {
          ...t,
          duration: t.duration_seconds || 180, // Default to 3:00 if 0 or null
          files: {
            mp3: mp3Url,
            wav: '', // Could implement similar logic for wav assets if DB schema supports it in future
            stems: ''
          }
        };
      }) || []
    };
  });
};

// Helper for date ranges
export const getTimeRangeDates = (range: '7d' | '30d' | '90d' | '6m' | '12m' | 'all') => {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case '7d': start.setDate(end.getDate() - 7); break;
    case '30d': start.setDate(end.getDate() - 30); break;
    case '90d': start.setDate(end.getDate() - 90); break;
    case '6m': start.setMonth(end.getMonth() - 6); break;
    case '12m': start.setFullYear(end.getFullYear() - 1); break;
    case 'all': start.setFullYear(2020); break; // Arbitrary start
  }
  return { start, end };
};

export const getDashboardAnalytics = async (timeRange: '7d' | '30d' | '90d' | '6m' | '12m' | 'all' = '30d'): Promise<DashboardAnalytics | null> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const { start, end } = getTimeRangeDates(timeRange);
  const isDaily = ['7d', '30d', '90d'].includes(timeRange);

  // 1. Fetch Sales
  const { data: sales, error: salesError } = await supabase
    .from('purchases')
    .select(`
      created_at, 
      status, 
      buyer_id,
      purchase_items!inner (
        price,
        seller_id,
        item_name,
        archived
      )
    `)
    .eq('purchase_items.seller_id', currentUser.id)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false });

  if (salesError) throw salesError;

  const getMySaleAmount = (sale: any) => {
    if (!sale.purchase_items) return 0;
    return sale.purchase_items
      .filter((i: any) => i.seller_id === currentUser.id)
      .reduce((sum: number, i: any) => sum + (Number(i.price) || 0), 0);
  };

  const getMyItemName = (sale: any) => {
    if (!sale.purchase_items) return 'Unknown Item';
    const myItem = sale.purchase_items.find((i: any) => i.seller_id === currentUser.id);
    return myItem ? myItem.item_name : 'Unknown Item';
  };

  // 2. Fetch Plays
  const { data: userProjects } = await supabase
    .from('projects')
    .select('id, tracks(id, play_count)')
    .eq('user_id', currentUser.id);

  let totalPlays = 0;
  const trackIds: string[] = [];
  userProjects?.forEach(p => {
    p.tracks.forEach((t: any) => {
      totalPlays += (t.play_count || 0);
      trackIds.push(t.id);
    });
  });

  // Get historical plays
  let playsHistory: any[] = [];
  if (trackIds.length > 0) {
    const { data: playsData } = await supabase
      .from('plays')
      .select('created_at')
      .in('track_id', trackIds)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    playsHistory = playsData || [];
  }

  // 3. Fetch Subscribers
  const totalFollowers = await getFollowersCount(currentUser.id);

  // 3b. Fetch Gem Transactions
  const { data: gemTransactions } = await supabase
    .from('gem_transactions')
    .select('created_at, amount')
    .eq('user_id', currentUser.id)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false });

  // 4. Calculate Totals
  const totalRevenue = sales.reduce((sum, sale) => sum + getMySaleAmount(sale), 0);
  const activeOrders = sales.filter(s => s.status === 'Processing').length;

  // 4b. Get Current Gem Balance for History Calc
  const { data: userProfile } = await supabase
    .from('users')
    .select('gems')
    .eq('id', currentUser.id)
    .single();

  const currentGemBalance = userProfile?.gems || 0;

  // Calculate starting balance by subtracting all transactions in the fetched range from current balance
  // Balance[Start] = Balance[Now] - Sum(Transactions[Start...Now])
  const totalGemChangeInRange = (gemTransactions || []).reduce((sum, t) => sum + t.amount, 0);
  let runningGemBalance = currentGemBalance - totalGemChangeInRange;

  // 4c. Fetch Daily Metrics (for listeners history etc)
  const { data: dailyMetrics } = await supabase
    .from('daily_metrics')
    .select('date, metric, value')
    .eq('user_id', currentUser.id)
    .gte('date', start.toISOString().split('T')[0])
    .lte('date', end.toISOString().split('T')[0]);

  const metricsByDate: Record<string, Record<string, number>> = {};
  if (dailyMetrics) {
    dailyMetrics.forEach((m: any) => {
      if (!metricsByDate[m.date]) metricsByDate[m.date] = {};
      metricsByDate[m.date][m.metric] = m.value;
    });
  }

  // 5. Aggregate Data for Chart
  const chartData: DashboardAnalytics['chartData'] = [];
  const monthlyData: DashboardAnalytics['monthlyData'] = [];

  if (isDaily) {
    // Daily Granularity
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i <= days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

      // Filter for Day
      const daySales = sales.filter(s => s.created_at.startsWith(dateStr));
      const dayPlays = playsHistory.filter(p => p.created_at.startsWith(dateStr));
      const dayGems = gemTransactions?.filter((t: any) => t.created_at.startsWith(dateStr)) || [];

      // Update Running Balance
      // Balance at end of day = Balance at start of day + Change in day
      const dayChange = dayGems.reduce((sum: any, t: any) => sum + t.amount, 0);
      runningGemBalance += dayChange;

      // Metrics
      const dayMetrics = metricsByDate[dateStr] || {};
      const listenersCount = dayMetrics['listeners'] || 0; // History or 0

      chartData.push({
        label,
        date: dateStr,
        revenue: daySales.reduce((sum, s) => sum + getMySaleAmount(s), 0),
        listeners: listenersCount,
        plays: dayPlays.length,
        orders: daySales.length,
        gems: runningGemBalance // Show Balance
      });
    }
  } else {
    // Monthly Granularity
    let current = new Date(start);
    current.setDate(1);

    while (current <= end) {
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      const label = current.toLocaleDateString('en-US', { month: 'short' });

      const monthSales = sales.filter(s => {
        const d = new Date(s.created_at);
        return d >= current && d < nextMonth;
      });
      const monthPlays = playsHistory.filter(p => {
        const d = new Date(p.created_at);
        return d >= current && d < nextMonth;
      });
      const monthGems = gemTransactions?.filter((t: any) => {
        const d = new Date(t.created_at);
        return d >= current && d < nextMonth;
      }) || [];

      const monthChange = monthGems.reduce((sum: any, t: any) => sum + t.amount, 0);
      runningGemBalance += monthChange;

      // Average listeners for the month? Or Max? let's take average of available days
      // This is complex. For now, let's take just the sum of snapshots (wrong) or max?
      // Let's take the AVERAGE of recorded daily listeners for that month
      let avgListeners = 0;
      if (dailyMetrics) {
        const monthMetricValues = dailyMetrics.filter((m: any) => {
          const d = new Date(m.date);
          return m.metric === 'listeners' && d >= current && d < nextMonth;
        }).map((m: any) => m.value);

        if (monthMetricValues.length > 0) {
          avgListeners = Math.round(monthMetricValues.reduce((a: number, b: number) => a + b, 0) / monthMetricValues.length);
        }
      }

      chartData.push({
        label,
        date: current.toISOString(),
        revenue: monthSales.reduce((sum, s) => sum + getMySaleAmount(s), 0),
        listeners: avgListeners,
        plays: monthPlays.length,
        orders: monthSales.length,
        gems: runningGemBalance
      });

      monthlyData.push({
        date: current.toISOString(),
        revenue: monthSales.reduce((sum, s) => sum + getMySaleAmount(s), 0),
        listeners: avgListeners,
        plays: monthPlays.length,
        orders: monthSales.length,
        gems: runningGemBalance
      });

      current = nextMonth;
    }
  }

  // 6. Recent Activity
  // Fetch real notifications instead of hardcoded sales
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(5);

  const recentActivity = (notifications || []).map(n => ({
    type: 'notification',
    title: n.title || 'New Notification',
    description: n.message,
    time: formatTimeAgo(n.created_at),
    icon: n.title?.includes('Sale') ? 'DollarSign' : 'AlertTriangle', // Simple heuristic
    color: n.title?.includes('Sale') ? 'green' : 'blue'
  }));

  // 7. Recent Orders (Filter out archived)
  const recentOrders = sales
    .filter(sale => {
      // Check if any of my items in this sale are NOT archived
      const myItems = sale.purchase_items.filter((i: any) => i.seller_id === currentUser.id);
      // Show if any item is not archived
      return myItems.some((i: any) => !i.archived);
    })
    .slice(0, 5)
    .map((sale, i) => ({
      id: `ORD-${sale.created_at.slice(0, 4)}-${i}`,
      item: getMyItemName(sale),
      date: formatDate(new Date(sale.created_at)),
      amount: `$${getMySaleAmount(sale).toFixed(2)}`,
      status: sale.status,
      statusColor: sale.status === 'Completed' ? 'bg-green-500/10 text-green-500' : sale.status === 'Processing' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
    }));

  // --- Calculate Percentage Changes ---
  // A. Determine Previous Range
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime()); // Previous end is current start
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  // B. Fetch Previous Data (Simple aggregates)
  //   We need Sales (Revenue & Orders) and Plays for previous period
  const { count: prevOrdersCount } = await supabase
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .eq('purchase_items.seller_id', currentUser.id)
    .gte('created_at', prevStart.toISOString())
    .lt('created_at', prevEnd.toISOString()); // Use lt to avoid overlap

  // For Revenue, we need to fetch the sums. 
  // Optimization: Just fetch all sales for prev period. If load is high, use RPC. For now, fetch is fine.
  const { data: prevSales } = await supabase
    .from('purchases')
    .select(`
        created_at, 
        purchase_items!inner (
            price,
            seller_id
        )
    `)
    .eq('purchase_items.seller_id', currentUser.id)
    .gte('created_at', prevStart.toISOString())
    .lt('created_at', prevEnd.toISOString());

  const prevTotalRevenue = (prevSales || []).reduce((sum, s) => sum + getMySaleAmount(s), 0);
  const prevOrders = prevSales?.length || 0;

  // Prev Plays using RPC if available or just count
  const { count: prevPlaysCount } = await supabase
    .from('plays')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', currentUser.id)
    .gte('created_at', prevStart.toISOString())
    .lt('created_at', prevEnd.toISOString());

  const prevPlays = prevPlaysCount || 1; // Avoid divide by zero for first meaningful change

  // Calculate Deltas
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const revenueChange = calculateChange(totalRevenue, prevTotalRevenue);
  const ordersChange = calculateChange(activeOrders, prevOrders);
  const playsChange = calculateChange(playsHistory.length, prevPlays === 1 && prevPlaysCount !== 1 ? 0 : prevPlays); // Handle the 1 fallback

  // Listeners Change? (Needs daily_metrics history for prev period)
  // We can treat "Live Listeners" as "Average Listeners" for the period comparison
  const { data: prevDailyMetrics } = await supabase
    .from('daily_metrics')
    .select('value')
    .eq('user_id', currentUser.id)
    .eq('metric', 'listeners')
    .gte('date', prevStart.toISOString().split('T')[0])
    .lte('date', prevEnd.toISOString().split('T')[0]);

  let prevAvgListeners = 0;
  if (prevDailyMetrics && prevDailyMetrics.length > 0) {
    prevAvgListeners = prevDailyMetrics.reduce((sum, m) => sum + Number(m.value), 0) / prevDailyMetrics.length;
  }

  // Current Average Listeners (calculated from chartData or re-calculated)
  // Let's use the average from chartData listeners
  const currentAvgListeners = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.listeners, 0) / chartData.length
    : 0;

  const listenersChange = calculateChange(currentAvgListeners, prevAvgListeners);

  // --- Gems Change Calculation ---
  // We need to calculate the average balance in the previous period to compare with currentAvgGems
  const { data: prevGemTransactions } = await supabase
    .from('gem_transactions')
    .select('amount')
    .eq('user_id', currentUser.id)
    .gte('created_at', prevStart.toISOString())
    .lt('created_at', prevEnd.toISOString());

  const prevTotalGemChange = (prevGemTransactions || []).reduce((sum, t) => sum + t.amount, 0);
  // balanceAtEndOfPreviousPeriod = balanceAtStartOfCurrentPeriod
  const balanceAtEndOfPreviousPeriod = currentGemBalance - totalGemChangeInRange;
  const balanceAtStartOfPreviousPeriod = balanceAtEndOfPreviousPeriod - prevTotalGemChange;

  // For a simple estimation of average previous balance:
  const prevAvgGems = (balanceAtStartOfPreviousPeriod + balanceAtEndOfPreviousPeriod) / 2;
  const currentAvgGems = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.gems, 0) / chartData.length
    : currentGemBalance;

  const gemsChange = calculateChange(currentAvgGems, prevAvgGems);


  return {
    totalRevenue,
    activeOrders,
    totalPlays: playsHistory.length,
    totalFollowers,
    monthlyData,
    chartData,
    recentActivity,
    recentOrders,
    revenueChange,
    ordersChange: ordersChange,
    playsChange: playsChange,
    followersChange: 0, // Hard to calc without snapshots, keeping 0
    listenersChange,
    gemsChange
  };
};

// Notification functions moved to end of file

// --- Roadmap Strategy Functions ---

export const getStrategies = async (): Promise<Strategy[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('Error fetching strategies:', error);
    return [];
  }

  return data.map(s => ({
    id: s.id,
    userId: s.user_id,
    stageId: s.stage_id,
    data: s.data,
    status: s.status,
    lastUpdated: s.updated_at
  }));
};

export const saveStrategy = async (stageId: string, data: any, status: 'in_progress' | 'completed' = 'completed') => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  // Upsert strategy
  const { error } = await supabase
    .from('strategies')
    .upsert({
      user_id: currentUser.id,
      stage_id: stageId,
      data: data,
      status: status,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,stage_id' });

  if (error) throw error;
};

// --- Calendar Event Functions ---

export const getCalendarEvents = async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('start_date', startDate.toISOString())
    .lte('start_date', endDate.toISOString());

  if (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }

  return data.map(e => ({
    id: e.id,
    userId: e.user_id,
    title: e.title,
    description: e.description,
    startDate: e.start_date,
    endDate: e.end_date,
    type: e.type,
    platform: e.platform,
    status: e.status,
    metadata: e.metadata
  }));
};

export const createCalendarEvent = async (event: Partial<CalendarEvent>) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      user_id: currentUser.id,
      title: event.title,
      description: event.description,
      start_date: event.startDate,
      end_date: event.endDate,
      type: event.type,
      platform: event.platform,
      status: event.status || 'pending',
      metadata: event.metadata || {}
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCalendarEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
  const updateObj: any = {};
  if (updates.title !== undefined) updateObj.title = updates.title;
  if (updates.description !== undefined) updateObj.description = updates.description;
  if (updates.startDate !== undefined) updateObj.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateObj.end_date = updates.endDate;
  if (updates.type !== undefined) updateObj.type = updates.type;
  if (updates.platform !== undefined) updateObj.platform = updates.platform;
  if (updates.status !== undefined) updateObj.status = updates.status;
  if (updates.metadata !== undefined) updateObj.metadata = updates.metadata;

  const { error } = await supabase
    .from('calendar_events')
    .update(updateObj)
    .eq('id', eventId);

  if (error) throw error;
};

export const deleteCalendarEvent = async (eventId: string) => {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
};

export const saveStrategyToCalendar = async (userId: string, strategyData: any) => {
  // We need the FULL strategy data to do a complete sync. 
  // If 'strategyData' passed is just one stage, we should fetch the rest or rely on caller passing full state.
  // For robustness, let's fetch the latest state from DB to ensure we have all stages.
  let allStrategies = [];
  try {
    const { data } = await supabase.from('strategies').select('*').eq('user_id', userId);
    allStrategies = data || [];
  } catch (e) {
    console.error("Failed to fetch full strategies for sync", e);
    return; // Safety abort
  }

  // Helper to get data for a specific stage
  const getStageData = (id: string) => allStrategies.find((s: any) => s.stage_id === id)?.data || {};

  const stage4 = getStageData('stage-4'); // Era
  const stage5 = getStageData('stage-5'); // Campaigns
  const stage6 = getStageData('stage-6'); // Content Buckets (for looking up platform/details)
  const stage9 = getStageData('stage-9'); // Weekly Schedule

  // 1. cleanup existing strategy events
  const { error: deleteError } = await supabase
    .from('calendar_events')
    .delete()
    .eq('user_id', userId)
    .ilike('metadata->>source', 'roadmap_strategy_%'); // Matches roadmap_strategy_era, roadmap_strategy_campaign, roadmap_strategy_daily

  if (deleteError) {
    console.error('Error cleaning up old strategy events:', deleteError);
  }

  const eventsToInsert: any[] = [];

  // --- A. ERA EVENTS (Stage 4) ---
  // Goal: Show the Era as a long spanning event or milestone? 
  // Let's make it a background event or just a "Start of Era" milestone if we don't support spans well visually yet.
  // Actually, let's look for dates. Stage 4 often doesn't have explicit dates in this template (just concept).
  // If no dates, we skip or use today. Let's skip Era event for now unless we find a date field in future.
  // ... Wait, user asked to "add a day to day plan... campaign, era". 
  // If Stage 5 has campaigns, the "Era" is effectively the sum of campaigns + some buffer?
  // Let's add a "Start of Era" milestone if we have a title.
  if (stage4.era_title) {
    // We don't have a start date for the Era in the form. Let's use the start of the first campaign or Today.
    let eraStart = new Date();
    if (stage5.campaigns && stage5.campaigns.length > 0) {
      const dates = stage5.campaigns.map((c: any) => c.dates?.from ? new Date(c.dates.from) : null).filter(Boolean);
      if (dates.length > 0) {
        eraStart = new Date(Math.min(...dates));
      }
    }

    eventsToInsert.push({
      user_id: userId,
      title: `Era: ${stage4.era_title}`,
      start_date: eraStart.toISOString(),
      end_date: null, // Point in time for start? Or maybe end of year? Let's do point in time "Launch"
      type: 'milestone',
      status: 'pending',
      description: stage4.era_narrative || 'New Era Begins',
      metadata: { source: 'roadmap_strategy_era', stage_id: 'stage-4' }
    });
  }


  // --- B. CAMPAIGN EVENTS (Stage 5) ---
  const campaigns = stage5.campaigns || [];
  let minDate = new Date();
  let maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90); // Default 90 days horizon if no campaigns

  if (campaigns.length > 0) {
    // Adjust horizon to fit campaigns
    const endDates = campaigns.map((c: any) => c.dates?.to ? new Date(c.dates.to) : null).filter(Boolean);
    if (endDates.length > 0) {
      maxDate = new Date(Math.max(...endDates));
      // Cap at 1 year to prevent insane loops if user puts year 2030
      const limit = new Date();
      limit.setFullYear(limit.getFullYear() + 1);
      if (maxDate > limit) maxDate = limit;
    }

    campaigns.forEach((c: any) => {
      let cStart = new Date();
      let cEnd = new Date();
      if (c.dates?.from) cStart = new Date(c.dates.from);
      if (c.dates?.to) cEnd = new Date(c.dates.to);

      eventsToInsert.push({
        user_id: userId,
        title: c.name || 'Campaign',
        start_date: cStart.toISOString(),
        end_date: cEnd.toISOString(),
        type: 'campaign', // Special styling
        status: 'pending',
        description: `Goal: ${c.goal}\nFocus: ${c.purpose}`,
        metadata: { source: 'roadmap_strategy_campaign', stage_id: 'stage-5', campaign_name: c.name }
      });
    });
  }

  // --- C. WEEKLY SCHEDULE (Stage 9 + Stage 6 Data) ---
  // We need to project the weekly schedule onto the calendar for the duration of the "active planning period" (minDate to maxDate)
  const weeklyPlan = stage9.weekly_plan || {}; // { 'Monday': [ { type, name } ] }
  const bucketList = stage6.bucket_list || [];

  // Helper to find bucket details
  const getBucketDetails = (name: string) => bucketList.find((b: any) => b.name === name);

  // Helper: Iterate days from Start to End
  const currentDateIterator = new Date(minDate);
  // If minDate is in past by a lot, maybe start from Today?
  // Let's start from Today or minDate, whichever is later, to avoid backfilling history endlessly?
  // Actually, user might want to see plan for whole campaign range. Let's stick to campaign range or Today -> +90d.
  // If campaigns start in future, we start there. If they started already, we might backfill a bit or just start today.
  // Let's simple start `new Date()` (Today) -> `maxDate`.
  const projectionStart = new Date();
  const projectionEnd = new Date(maxDate);
  // Ensure we go at least 30 days if maxDate is close
  if (projectionEnd.getTime() - projectionStart.getTime() < 30 * 24 * 60 * 60 * 1000) {
    projectionEnd.setDate(projectionStart.getDate() + 60);
  }

  // Map day names to getDay() index
  const dayMap: Record<string, number> = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };

  for (let d = new Date(projectionStart); d <= projectionEnd; d.setDate(d.getDate() + 1)) {
    const dayOfWeekIndex = d.getDay();
    const dayName = Object.keys(dayMap).find(key => dayMap[key] === dayOfWeekIndex);

    if (dayName && weeklyPlan[dayName]) {
      const dailyItems = weeklyPlan[dayName];
      dailyItems.forEach((item: any) => {
        // item: { type: 'campaign' | 'bucket', name: '...' }

        let title = item.name;
        let metaType = item.type; // 'campaign' or 'bucket'
        let description = '';
        let platform = '';
        let eventType = 'content'; // Default for calendar 'type' column

        if (metaType === 'bucket') {
          const bucket = getBucketDetails(item.name);
          if (bucket) {
            // If bucket has "Primary Platforms", use the first one
            if (bucket.platforms && bucket.platforms.length > 0) platform = bucket.platforms[0];
            description = `Format: ${bucket.formats?.join(', ') || 'Any'}`;
          }
          eventType = 'content';
        } else if (metaType === 'campaign') {
          // For campaign daily tasks, usually means "Work on X" or "Post for X"
          eventType = 'campaign'; // Or 'milestone'? Let's keep 'campaign' type or 'marketing'
          description = 'Campaign Activity';
        }

        eventsToInsert.push({
          user_id: userId,
          title: title,
          start_date: new Date(d).toISOString(), // Clone d
          end_date: null, // Point event
          type: eventType,
          platform: platform,
          status: 'pending',
          description: description,
          metadata: {
            source: 'roadmap_strategy_daily',
            day_template: dayName,
            item_name: item.name,
            item_type: metaType
          }
        });
      });
    }
  }

  if (eventsToInsert.length > 0) {
    // Chunk inserts if too many? Supabase can handle a few hundreds. 
    // 90 days * 3 items = 270 rows. Should be fine.
    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert(eventsToInsert);

    if (insertError) {
      console.error('Error syncing strategy to calendar:', insertError);
    }
  }
};


export const markStageStarted = async (stageId: string) => {
  const user = await getCurrentUser();
  if (!user) return;

  // Check if it exists first
  const { data: existing } = await supabase
    .from('strategies')
    .select('status')
    .eq('user_id', user.id)
    .eq('stage_id', stageId)
    .single();

  if (!existing) {
    // Create new entry with in_progress
    const { error } = await supabase
      .from('strategies')
      .insert({
        user_id: user.id,
        stage_id: stageId,
        data: {}, // Start empty
        status: 'in_progress',
        updated_at: new Date().toISOString()
      });

    if (error) console.error('Error starting stage:', error);
  } else if (existing.status !== 'in_progress') {
    // Update
    const { error } = await supabase
      .from('strategies')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('stage_id', stageId);

    if (error) console.error('Error reusing stage:', error);
  }
};

// --- Daily Rewards & Metrics Logging ---

export const claimDailyReward = async (userId: string) => {
  // 1. Get current balance to be safe (or trust caller, but safer here)
  const { data: profile } = await supabase.from('users').select('gems').eq('id', userId).single();
  const currentGems = profile?.gems || 0;
  const newBalance = currentGems + 10;
  const now = new Date().toISOString();

  // 2. Update User Profile
  const { error: updateError } = await supabase
    .from('users')
    .update({
      gems: newBalance,
      last_gem_claim_date: now
    })
    .eq('id', userId);

  if (updateError) throw updateError;

  // 3. Insert Transaction Record
  const { error: txError } = await supabase
    .from('gem_transactions')
    .insert({
      user_id: userId,
      amount: 10,
      type: 'daily_reward',
      description: 'Daily Reward Claim',
      created_at: now
    });

  if (txError) console.error("Error logging gem transaction:", txError);

  return newBalance;
};

// Function to snapshot daily metrics (e.g. followers, plays, etc) for history
export const recordDailyMetric = async (userId: string, metric: string, value: number) => {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Try to insert; if conflict (already exists for today), assume we keep max or latest? 
  // Let's use upsert.
  // Note: Table 'daily_metrics' must exist.
  // Schema: id, user_id, date, metric, value, created_at

  const { error } = await supabase
    .from('daily_metrics')
    .upsert({
      user_id: userId,
      date: dateStr,
      metric: metric,
      value: value,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,date,metric' });

  if (error) {
    // Suppress error if table doesn't exist so we don't crash app, but log it
    console.warn(`Failed to record metric ${metric} (Table might be missing):`, error.message);
  }
};

export const emptyTrashNotes = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('user_id', currentUser.id)
    .eq('deleted', true);

  if (error) throw error;
};

// Notifications
export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return data.map((n: any) => ({
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    read: n.read,
    data: n.data,
    createdAt: n.created_at
  }));
};

export const deleteAllNotifications = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) console.error("Error fetching unread count", error);
  return count || 0;
};

export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const createNotification = async (notification: Partial<Notification>) => {
  // If we are sending to another user, we don't need to be that user.
  // The RLS policy "Authenticated users can insert notifications" allows this.

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      data: notification.data,
      read: false
    });

  if (error) console.error('Error creating notification:', error);
};

export const getLibraryAssets = async () => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  // 1. Fetch Purchases (Beats, Packs)
  const { data: purchases, error: purchasesError } = await supabase
    .from('purchases')
    .select(`
      id,
      created_at,
      purchase_items (
        id,
        item_name,
        seller_id,
        price
      )
    `)
    .eq('buyer_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (purchasesError) console.error('Error fetching purchases:', purchasesError);

  // 2. Fetch User Uploads (Assets)
  const { data: uploads, error: uploadsError } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (uploadsError) console.error('Error fetching uploads:', uploadsError);

  // Map to LibraryAsset format
  const libraryAssets = [
    ...(purchases || []).flatMap((p: any) =>
      (p.purchase_items || []).map((pi: any) => ({
        id: pi.id, // Use unique item ID 
        name: pi.item_name || 'Untitled Purchase',
        type: 'Purchased' as const,
        producer: 'Unknown',
        date: formatDate(new Date(p.created_at)),
        fileType: 'zip' as const,
        parentId: null
      }))
    ),
    ...(uploads || []).map((u: any) => {
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(u.storage_path);
      return {
        id: u.id,
        name: u.file_name || 'Untitled Upload',
        type: u.mime_type === 'application/vnd.antigravity.folder' ? 'folder' : 'Upload',
        producer: 'Me',
        date: formatDate(new Date(u.created_at)),
        fileType: (u.file_name?.split('.').pop() || 'wav') as 'mp3' | 'wav' | 'zip',
        parentId: u.parent_id || null,
        url: publicUrl
      };
    })
  ];

  return libraryAssets;
};

export const archiveSale = async (saleId: string) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('purchase_items')
    .update({ archived: true })
    .eq('id', saleId)
    .eq('seller_id', currentUser.id);

  if (error) throw error;
};

export const unarchiveSale = async (saleId: string) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('purchase_items')
    .update({ archived: false })
    .eq('id', saleId)
    .eq('seller_id', currentUser.id);

  if (error) throw error;
};




// ... existing code ...

// ... existing code ...

export const incrementTrackPlays = async (trackId: string) => {
  const currentUser = await getCurrentUser().catch(() => null);

  // 1. Record individual play event (for history/charts)
  const { error: playError } = await supabase
    .from('plays')
    .insert({
      track_id: trackId,
      user_id: currentUser?.id || null
    });

  if (playError) {
    // If table doesn't exist or other error, log it but don't stop flow
    console.error('Error recording play history:', playError);
  }

  // 2. Increment total count on track (Atomic RPC or Read-Update)
  // Try RPC first if available (common pattern), else fallback
  const { error: rpcError } = await supabase.rpc('increment_track_plays', { t_id: trackId });

  if (rpcError) {
    // Fallback: Read-Update (Optimistic)
    const { data: track, error: fetchError } = await supabase
      .from('tracks')
      .select('play_count')
      .eq('id', trackId)
      .single();

    if (!fetchError && track) {
      await supabase
        .from('tracks')
        .update({ play_count: (track.play_count || 0) + 1 })
        .eq('id', trackId);
    }
  }
};
