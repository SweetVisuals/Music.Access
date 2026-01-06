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
    tasks: project.tasks?.map((t: any) => ({ id: t.id, projectId: t.project_id, text: t.text, completed: t.completed, createdAt: t.created_at })) || []
  }));
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
    .select('id, username, handle, location, avatar_url, banner_url, bio, website, gems, balance, last_gem_claim_date, role')
    .eq('id', targetUserId)
    .single();

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
    // Fetch related data
    try {
      const [projects, services, followersCount, stats] = await Promise.all([
        getProjectsByUserId(data.id),
        getServicesByUserId(data.id),
        getFollowersCount(data.id),
        getUserStats(data.id)
      ]);

      return {
        id: data.id,
        username: data.username,
        handle: data.handle,
        role: data.role || (data as any).raw_user_meta_data?.role || 'Producer',
        email: authEmail,
        location: data.location,
        avatar: data.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
        banner: data.banner_url || '',
        subscribers: followersCount,
        streams: stats.streams,
        gems: data.gems || 0,
        balance: data.balance || 0,
        lastGemClaimDate: data.last_gem_claim_date,
        bio: data.bio,
        website: data.website,
        projects: projects,
        services: services,
        soundPacks: projects.filter(p => p.type === 'sound_pack').map(p => ({
          id: p.id,
          title: p.title,
          type: 'Loop Kit', // Defaulting for now
          price: p.price,
          fileSize: '0 MB', // Placeholder
          itemCount: p.tracks.length
        }))
      };
    } catch (err) {
      console.error('Error fetching related profile data:', err);
      // Return basic profile if related data fails
      return {
        id: data.id,
        username: data.username,
        handle: data.handle,
        email: authEmail,
        location: data.location,
        avatar: data.avatar_url,
        banner: data.banner_url,
        subscribers: 0,
        streams: 0,
        gems: data.gems || 0,
        balance: data.balance || 0,
        lastGemClaimDate: data.last_gem_claim_date,
        bio: data.bio,
        website: data.website,
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
    .select('id, username, handle, email, location, avatar_url, banner_url, bio, website, gems, balance, last_gem_claim_date')
    .eq('handle', handle)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (data) {
    // Fetch related data
    const [projects, services, followersCount, stats] = await Promise.all([
      getProjectsByUserId(data.id),
      getServicesByUserId(data.id),
      getFollowersCount(data.id),
      getUserStats(data.id)
    ]);

    return {
      id: data.id,
      username: data.username,
      handle: data.handle,
      role: 'Producer',
      email: data.email,
      location: data.location,
      avatar: data.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
      banner: data.banner_url || '',
      subscribers: followersCount,
      streams: stats.streams,
      gems: data.gems,
      balance: data.balance,
      lastGemClaimDate: data.last_gem_claim_date,
      bio: data.bio,
      website: data.website,
      projects: projects.filter(p => p.type === 'beat_tape'),
      services: services,
      soundPacks: projects.filter(p => p.type === 'sound_pack').map(p => ({
        id: p.id,
        title: p.title,
        type: 'Loop Kit', // Defaulting for now as type is generic in Project
        price: p.price,
        fileSize: '0 MB', // Placeholder
        itemCount: p.tracks.length
      }))
    };
  } else {
    return null;
  }
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
  if (updates.lastGemClaimDate !== undefined) updateObj.last_gem_claim_date = updates.lastGemClaimDate;
  if (updates.is_public !== undefined) updateObj.is_public = updates.is_public;
  if (updates.role !== undefined) updateObj.role = updates.role;

  const { error } = await supabase
    .from('users')
    .update(updateObj)
    .eq('id', userId);

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
      status: project.status || 'published' // Default to published if not specified
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
        assigned_file_id: assignedFileId
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
      rate_type: service.rateType || 'flat'
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
    rateType: data.rate_type
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
        title,
        duration_seconds,
        track_number,
        play_count
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
    `)
    .eq('user_id', userId);

  if (error) throw error;

  return data.map(project => ({
    id: project.id,
    title: project.title,
    producer: project.user?.username || 'Unknown',
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
      duration: track.duration_seconds
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

export const deletePlaylist = async (playlistId: string): Promise<void> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', playlistId)
    .eq('user_id', currentUser.id);

  if (error) throw error;
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

  return {
    id: data.id,
    sender: 'Me',
    avatar: currentUser.user_metadata?.avatar_url || '',
    text: data.content,
    timestamp: data.created_at,
    isMe: true
  };
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
        handle
      )
    `);

  if (error) throw error;

  return data.map(service => ({
    id: service.id,
    title: service.title,
    description: service.description,
    price: service.price,
    features: service.features || [],
    rateType: service.rate_type
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
      // dist_notes: contract.distNotes || '', // Column missing in DB
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
    .select('id, username, handle, location, avatar_url, banner_url, bio, website, gems, balance, role')
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
      await channel.track({
        user_id: userId || 'anon',
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
    attachedAudio: n.attached_audio
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
    attachedAudio: n.attached_audio
  }));
};

export const createNote = async (
  title: string = 'Untitled Note',
  content: string = '',
  attachedAudio?: string
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
      attached_audio: attachedAudio, // Must match DB column name
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
    attachedAudio: data.attached_audio
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

export const getLibraryAssets = async () => {
  // 1. Get Purchases
  // Note: getPurchases() isn't exported/implemented yet in this file snippet, let's assume we can query it directly here or it exists
  // Actually, looking at the file it seems getPurchases isn't there. I'll implement a simple query.
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data: purchases, error } = await supabase
    .from('purchases')
    .select(`
        *,
        seller:seller_id (username)
      `)
    .eq('user_id', currentUser.id);

  const purchasedAssets = (purchases || []).map((p: any) => ({
    id: p.id,
    name: p.item,
    type: 'Purchased',
    producer: p.seller?.username || 'Unknown',
    date: formatDate(new Date(p.created_at || new Date())),
    fileType: 'wav' // simplified
  }));

  // 2. Get Uploads (files bucket) - MOCK for now
  const uploadedAssets = [
    { id: 'up_1', name: 'My Vocal Demo.wav', type: 'Upload', producer: 'Me', date: 'Today', fileType: 'wav' },
    { id: 'up_2', name: 'Guitar Loop.wav', type: 'Upload', producer: 'Me', date: 'Yesterday', fileType: 'wav' }
  ];

  return [...purchasedAssets, ...uploadedAssets];
};


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

export const createPurchase = async (items: any[], total: number, paymentMethod: string) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  // 1. Create Purchase Record
  const { data: purchaseData, error: purchaseError } = await supabase
    .from('purchases')
    .insert({
      buyer_id: currentUser.id,
      amount: total,
      status: 'Completed',
      stripe_payment_id: paymentMethod === 'crypto' ? 'crypto_txn' : 'mock_id_' + Math.floor(Math.random() * 100000),
      payment_method: paymentMethod
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

      if (item.type && (item.type.includes('Service') || item.type.includes('Mixing') || item.type.includes('Mastering'))) {
        serviceId = item.id;
      } else {
        projectId = item.id;
      }

      return {
        purchase_id: purchaseId,
        project_id: projectId ? (typeof projectId === 'string' && projectId.length > 20 ? projectId : null) : null,
        service_id: serviceId ? (typeof serviceId === 'string' && serviceId.length > 20 ? serviceId : null) : null,
        seller_id: item.sellerId || currentUser.id, // Fallback
        item_name: item.title || 'Unknown Item',
        price: item.price
      };
    });

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(purchaseItems);

    if (itemsError) {
      console.error("Error creating purchase items:", itemsError);
    }
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
        item_name
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
      if (myItems.length > 0) itemName = myItems[0].item_name;
    }

    const buyer = buyersMap[p.buyer_id];

    return {
      id: p.id,
      date: formatDate(new Date(p.created_at)),
      item: itemName,
      seller: sellerProfile.username,
      sellerAvatar: sellerProfile.avatar_url,
      buyer: buyer?.username || 'Unknown',
      buyerAvatar: buyer?.avatar_url,
      amount: amount,
      status: p.status,
      image: p.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
      type: p.type,
      projectId: p.project_id
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
        item_name
      )
    `)
    .eq('buyer_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching purchases:', error);
    return [];
  }

  // extract seller IDs from purchase items
  const sellerIds = new Set<string>();
  purchasesData.forEach((p: any) => {
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

  return purchasesData.map((p: any) => {
    let amount = 0; // sum of items
    let mainSellerId = null;
    let itemName = 'Unknown Item';

    if (p.purchase_items && p.purchase_items.length > 0) {
      amount = p.purchase_items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
      mainSellerId = p.purchase_items[0].seller_id; // Assume primary seller from first item
      itemName = p.purchase_items[0].item_name;
    } else if (p.amount !== undefined) {
      amount = Number(p.amount);
      // Fallback if item column existed previously but we know it doesn't now. 
      // Safe to leave empty or use default.
    }

    const seller = mainSellerId ? sellersMap[mainSellerId] : null;

    return {
      id: p.id,
      date: formatDate(new Date(p.created_at)),
      item: itemName,
      seller: seller?.username || 'Unknown',
      sellerAvatar: seller?.avatar_url,
      amount: amount,
      status: p.status,
      image: p.image_url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop',
      type: p.type,
      projectId: p.project_id
    };
  });
};

export const getDashboardAnalytics = async (): Promise<DashboardAnalytics | null> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  // 1. Fetch Sales (Purchases where seller is current user)
  const { data: sales, error: salesError } = await supabase
    .from('purchases')
    .select(`
      created_at, 
      status, 
      buyer_id,
      purchase_items!inner (
        price,
        seller_id,
        item_name
      )
    `)
    .eq('purchase_items.seller_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (salesError) throw salesError;

  // Manually fetch distinct buyers for dashboard calls if needed, 
  // but for analytics totals we primarily need amounts and counts.
  // We'll calculate amounts based on items sold by THIS user.

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
  // First get all user's projects to get track IDs
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

  // Get historical plays for chart
  let playsHistory: any[] = [];
  if (trackIds.length > 0) {
    const { data: playsData } = await supabase
      .from('plays')
      .select('created_at')
      .in('track_id', trackIds)
      .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString()); // Last 6 months

    playsHistory = playsData || [];
  }

  // 3. Fetch Subscribers
  const totalFollowers = await getFollowersCount(currentUser.id);

  // 3b. Fetch Gem Transactions for History
  const { data: gemTransactions } = await supabase
    .from('gem_transactions')
    .select('created_at, amount')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  // 4. Calculate Totals
  const totalRevenue = sales.reduce((sum, sale) => sum + getMySaleAmount(sale), 0);
  const activeOrders = sales.filter(s => s.status === 'Processing').length;

  // 5. Aggregate Monthly Data (Last 6 Months)
  const monthlyData = [];
  const today = new Date();

  // Start with current balance from profile, falling back to 0 if not set
  let runningGemBalance = currentUser.user_metadata?.gems || 0;
  // Note: If using a real 'users' table profile, we should use that. 
  // We'll fetch the profile to be sure.
  const { data: userProfile } = await supabase
    .from('users')
    .select('gems')
    .eq('id', currentUser.id)
    .single();

  if (userProfile) {
    runningGemBalance = userProfile.gems || 0;
  }

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = d.toLocaleString('en-US', { month: 'short' });
    const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

    // Filter data for this month
    const monthSales = sales.filter(s => {
      const date = new Date(s.created_at);
      return date >= d && date < nextMonth;
    });

    const monthPlays = playsHistory.filter(p => {
      const date = new Date(p.created_at);
      return date >= d && date < nextMonth;
    });

    // Calculate gem balance at the END of this month
    // Balance at Month M End = CurrentBalance - (Sum of transactions AFTER Month M End)

    // Transactions that happened AFTER this month (i.e. in the future relative to this month's end)
    const transactionsAfterThisMonth = (gemTransactions || []).filter(t => {
      return new Date(t.created_at) >= nextMonth;
    });

    const changeAfterThisMonth = transactionsAfterThisMonth.reduce((sum, t) => sum + t.amount, 0);
    const balanceAtMonthEnd = userProfile ? (userProfile.gems - changeAfterThisMonth) : 0;

    monthlyData.push({
      revenue: monthSales.reduce((sum, s) => sum + getMySaleAmount(s), 0),
      listeners: 0, // TODO: Unique listener count from plays history if user_id recorded
      plays: monthPlays.length,
      orders: monthSales.length,
      gems: Math.max(0, balanceAtMonthEnd) // Ensure no negative balance in visual
    });
  }

  // 6. Recent Activity
  const recentActivity = sales.slice(0, 5).map(sale => ({
    type: 'sale',
    title: 'New Sale',
    description: `Sold ${getMyItemName(sale)}`,
    time: formatTimeAgo(sale.created_at),
    icon: 'DollarSign',
    color: 'green'
  }));

  // 7. Recent Orders (Formatted)
  const recentOrders = sales.slice(0, 5).map((sale, i) => ({
    id: `ORD-${sale.created_at.slice(0, 4)}-${i}`, // Mock ID generation
    item: getMyItemName(sale),
    date: formatDate(new Date(sale.created_at)),
    amount: `$${getMySaleAmount(sale).toFixed(2)}`,
    status: sale.status,
    statusColor: sale.status === 'Completed' ? 'bg-green-500/10 text-green-500' : sale.status === 'Processing' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'
  }));

  return {
    totalRevenue,
    activeOrders,
    totalPlays,
    totalFollowers,
    monthlyData,
    recentActivity,
    recentOrders
  };
};

// Notifications
export const getNotifications = async (): Promise<Notification[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return data.map(n => ({
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

export const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) throw error;
};

export const markAllNotificationsAsRead = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', currentUser.id)
    .eq('read', false);

  if (error) throw error;
};

export const createNotification = async (notification: Partial<Notification>) => {
  const currentUser = await ensureUserExists();
  if (!currentUser) throw new Error('User not authenticated');

  // If userId is provided in the arg, use it (for admin sending to others), otherwise default to current (self-notif)
  const targetUserId = notification.userId || currentUser.id;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: targetUserId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      data: notification.data,
      read: false
    });

  if (error) throw error;
};

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
        data: {},
        status: 'in_progress'
      });
    if (error) console.error('Error marking stage started:', error);
  } else if (existing.status === 'not_started') {
    // Update to in_progress if not started
    const { error } = await supabase
      .from('strategies')
      .update({ status: 'in_progress' })
      .eq('user_id', user.id)
      .eq('stage_id', stageId);
    if (error) console.error('Error marking stage started:', error);
  }
};

