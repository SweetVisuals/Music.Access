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
  Notification
} from '../types';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Key exists:', !!SUPABASE_ANON_KEY);

// Create Supabase client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth functions
export const signUp = async (email: string, password: string, username: string, handle: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        handle
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

  if (error) throw error;

  // Transform data to match Project interface
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
    userId: project.user_id,
    releaseDate: project.release_date,
    format: project.format,
    progress: project.progress,
    tasks: project.tasks?.map((t: any) => ({ id: t.id, projectId: t.project_id, text: t.text, completed: t.completed, createdAt: t.created_at })) || []
  }));
};

export const getUserProfile = async (userId?: string): Promise<UserProfile | null> => {
  const targetUserId = userId || (await getCurrentUser())?.id;
  if (!targetUserId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, handle, location, avatar_url, banner_url, bio, website, gems, balance, last_gem_claim_date')
    .eq('id', targetUserId)
    .single();

  if (error && error.code !== 'PGRST116' && error.status !== 406) throw error;

  // Get the auth email
  const user = await getCurrentUser();
  const authEmail = user?.email || 'user@example.com';

  if (data) {
    // Fetch related data
    const [projects, services, followersCount] = await Promise.all([
      getProjectsByUserId(data.id),
      getServicesByUserId(data.id),
      getFollowersCount(data.id)
    ]);

    return {
      username: data.username,
      handle: data.handle,
      email: authEmail,
      location: data.location,
      avatar: data.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
      banner: data.banner_url || '',
      subscribers: followersCount,
      streams: 0, // TODO: calculate from tracks
      gems: data.gems || 0,
      balance: data.balance || 0,
      lastGemClaimDate: data.last_gem_claim_date,
      bio: data.bio,
      website: data.website,
      projects: projects.filter(p => p.type === 'beat_tape'),
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
  } else {
    // Fallback to auth user metadata if no profile in users table
    if (user) {
      const username = user.user_metadata?.username || user.email.split('@')[0];
      const handle = user.user_metadata?.handle || user.email.split('@')[0];
      return {
        username,
        handle,
        email: authEmail,
        location: '',
        avatar: user.user_metadata?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
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

  if (error && error.code !== 'PGRST116' && error.status !== 406) throw error;

  if (data) {
    // Fetch related data
    const [projects, services, followersCount] = await Promise.all([
      getProjectsByUserId(data.id),
      getServicesByUserId(data.id),
      getFollowersCount(data.id)
    ]);

    return {
      username: data.username,
      handle: data.handle,
      email: data.email,
      location: data.location,
      avatar: data.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
      banner: data.banner_url || '',
      subscribers: followersCount,
      streams: 0, // TODO: calculate from tracks
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

  const { error } = await supabase
    .from('users')
    .update(updateObj)
    .eq('id', userId);

  if (error) throw error;
};

export const createProject = async (project: Partial<Project>) => {
  const currentUser = await getCurrentUser();
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
      status: 'published' // Default to published for now
    })
    .select()
    .single();

  if (projectError) throw projectError;

  const projectId = projectData.id;

  // 2. Create Tracks
  if (project.tracks && project.tracks.length > 0) {
    const tracksToInsert = project.tracks.map((track, index) => ({
      project_id: projectId,
      title: track.title,
      duration_seconds: track.duration || 180, // Default duration
      track_number: index + 1
      // Note: Asset linking would happen here if we had real file uploads
    }));

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
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('services')
    .insert({
      user_id: currentUser.id,
      title: service.title,
      description: service.description,
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
    rateType: service.rate_type || 'flat'
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
        )
      ),
      user:users!conversation_participants_user_id_fkey (
        username,
        avatar_url
      )
    `)
    .eq('user_id', currentUser.id);

  if (error) throw error;

  return data.map(participant => {
    const conversation = participant.conversation;
    const otherParticipant = participant.user;
    const lastMessage = conversation.messages?.[conversation.messages.length - 1];

    return {
      id: conversation.id,
      user: otherParticipant?.username || 'Unknown',
      avatar: otherParticipant?.avatar_url || 'https://i.pravatar.cc/150?u=user',
      lastMessage: lastMessage?.content || 'No messages yet',
      timestamp: lastMessage?.created_at || conversation.updated_at,
      unread: 0, // TODO: implement unread count
      messages: conversation.messages?.map((msg: any) => ({
        id: msg.id,
        sender: msg.sender_id === currentUser.id ? 'Me' : otherParticipant?.username || 'Unknown',
        avatar: msg.sender_id === currentUser.id ? 'https://i.pravatar.cc/150?u=me' : otherParticipant?.avatar_url || 'https://i.pravatar.cc/150?u=user',
        text: msg.content,
        timestamp: msg.created_at,
        isMe: msg.sender_id === currentUser.id
      })) || []
    };
  });
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
  const currentUser = await getCurrentUser();
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
  const { data, error } = await supabase
    .from('users')
    .select('id, username, handle, location, avatar_url, banner_url, bio, website, gems, balance')
    .limit(20);

  if (error) throw error;

  return data.map(user => ({
    id: user.id,
    username: user.username,
    handle: user.handle,
    avatar: user.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541',
    role: 'Producer', // TODO: add role field to users table
    tags: [], // TODO: implement user tags
    followers: '0', // TODO: calculate followers
    isVerified: false
  }));
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
  const currentUser = await getCurrentUser();
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
  if (!currentUser) return { used: 0, limit: 500 * 1024 * 1024 }; // 500MB default

  const { data, error } = await supabase
    .from('assets')
    .select('size_bytes')
    .eq('user_id', currentUser.id);

  if (error) throw error;

  const used = data.reduce((total, asset) => total + (asset.size_bytes || 0), 0);
  const limit = 500 * 1024 * 1024; // 500MB in bytes

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


export const getUserAudioFiles = async (): Promise<any[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', currentUser.id)
    .ilike('mime_type', 'audio%')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(asset => {
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(asset.storage_path);

    return {
      id: asset.id,
      name: asset.file_name,
      size: (asset.size_bytes / (1024 * 1024)).toFixed(1) + ' MB',
      duration: '--:--', // Duration not stored in metadata yet
      url: publicUrl,
      type: asset.mime_type
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
  const currentUser = await getCurrentUser();
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

  // Map DB fields to Note type if necessary (snake_case to camelCase mapping mostly auto-handled if types match, but check manually)
  // DB: updated_at, attached_audio
  // Type: updated, attachedAudio
  return data.map((n: any) => ({
    id: n.id,
    title: n.title,
    content: n.content || '',
    preview: n.preview || '',
    tags: n.tags || [],
    updated: new Date(n.updated_at).toLocaleDateString(), // Format date
    attachedAudio: n.attached_audio
  }));
};

export const createNote = async (title: string = 'Untitled Note') => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not logged in');

  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      title,
      content: '',
      preview: '',
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
    .eq('id', id);

  if (error) throw error;
};

// --- STUDIO MANAGEMENT FUNCTIONS ---

export const updateProject = async (projectId: string, updates: Partial<Project>) => {
  const currentUser = await getCurrentUser();
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


export const deleteNote = async (id: string) => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ... existing code ...

export const createPurchase = async (items: any[], total: number, paymentMethod: string) => {
  const currentUser = await getCurrentUser();
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
  const currentUser = await getCurrentUser();
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