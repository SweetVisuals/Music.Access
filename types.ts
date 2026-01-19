
export interface Track {
  id: string;
  title: string;
  duration: number; // in seconds
  waveformData?: number[];
  // File references (mock IDs or URLs)
  files?: {
    mp3?: string;
    wav?: string;
    stems?: string;
    main?: string; // Main linked asset ID
  };
  noteId?: string;
  statusTags?: { label: string; active: boolean }[];
  assignedFileId?: string;
}

export interface Task {
  id: string;
  projectId: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface LicenseInfo {
  id: string;
  type: 'MP3' | 'WAV' | 'STEMS' | 'UNLIMITED';
  name: string;
  price: number;
  contractId?: string; // ID of the contract template
  features: string[];
  fileTypesIncluded: ('MP3' | 'WAV' | 'STEMS')[];
}

export interface Project {
  id: string;
  shortId?: string;
  title: string;
  producer: string;
  producerHandle?: string;
  producerAvatar?: string;
  coverImage?: string; // Optional now
  price: number; // Display price (usually lowest license)
  bpm: number | string;
  key?: string;
  genre: string;
  subGenre?: string;
  type: 'beat_tape' | 'sound_pack' | 'release'; // Distinguished type
  tags: string[];
  tracks: Track[];
  description?: string;
  notes?: string;
  licenses?: LicenseInfo[]; // Available licenses for this project
  status?: 'draft' | 'published' | 'private' | 'planning' | 'in_progress' | 'mixing' | 'mastering' | 'ready';
  created?: string;
  userId?: string;
  releaseDate?: string;
  format?: 'Album' | 'EP' | 'Single';
  progress?: number;
  gems?: number;
  tasks?: Task[];
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  rateType: 'hourly' | 'flat';
  features: string[];
  deliveryDays?: number;
  user?: {
    username: string;
    handle: string;
    avatar?: string;
  };
}

export interface SoundPack {
  id: string;
  title: string;
  type: 'Drum Kit' | 'Loop Kit' | 'Preset Bank';
  price: number;
  fileSize: string;
  itemCount: number;
}

export interface UserProfile {
  id?: string;
  username: string;
  handle: string;
  email?: string;
  is_public?: boolean;
  role?: string;
  location?: string;
  avatar: string;
  banner: string;
  subscribers: number;
  streams?: number;
  gems: number;
  balance: number;
  plan?: 'Basic' | 'Pro' | 'Studio+';
  promo_credits?: number;
  lastGemClaimDate?: string;
  yearsExperience?: string;
  projectsSold?: number;
  satisfactionRate?: string;
  avgTurnaround?: string;
  bio: string;
  website?: string;
  projects: Project[];
  services: Service[];
  soundPacks: SoundPack[];
  stripe_account_id?: string;
  stripe_customer_id?: string;
  stripe_onboarding_completed?: boolean;
  stripe_charges_enabled?: boolean;
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
  subscription_id?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  bannerSettings?: {
    desktop: { x: number; y: number; scale: number };
    mobile: { x: number; y: number; scale: number };
  };
}

export interface TalentProfile {
  id: string;
  username: string;
  handle: string;
  avatar: string;
  role: string;
  tags: string[];
  followers: string;
  streams: number;
  tracks: number;
  isVerified?: boolean;
  isFollowing?: boolean;
}

export interface CollabService {
  id: string;
  name: string;
  platform: 'Instagram' | 'TikTok' | 'YouTube' | 'Spotify' | 'Blog';
  handle: string;
  avatar: string;
  serviceTitle: string;
  description: string;
  priceRange: string;
  stats: { label: string; value: string }[];
  verified?: boolean;
}

export enum PlayState {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED'
}

export interface FilterState {
  genre: string;
  key?: string; // Deprecated, keeping temporarily if needed
  rootKey: string;
  scaleType: string;
  minBpm: number;
  maxBpm: number;
  minPrice: number;
  maxPrice: number;
  searchQuery: string;
}


export interface Message {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

export interface AiMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Conversation {
  id: string;
  user: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  userId?: string;
  messages: Message[];
}

export interface Order {
  id: string;
  serviceTitle: string;
  clientName: string;
  clientAvatar: string;
  amount: number;
  status: 'pending' | 'active' | 'delivered' | 'completed' | 'cancelled';
  deadline: string;
  requirements: string;
  files?: { name: string; size: string }[];
}

export interface Purchase {
  id: string;
  date: string;
  item: string;
  seller: string;
  amount: number;
  status: 'Completed' | 'Processing' | 'Failed';
  image: string;
  type: 'Beat License' | 'Sound Kit' | 'Mixing' | 'Service';
  projectId?: string;
  contractId?: string;
  coverImage?: string;
  sellerAvatar?: string;
  buyer?: string;
  buyerAvatar?: string;
  tracks?: {
    id: string;
    title: string;
    duration: number;
    files?: {
      mp3?: string;
      wav?: string;
      stems?: string;
    };
  }[];
  purchaseItems?: {
    name: string;
    price: number;
    type: string;
    seller: string;
    sellerId?: string;
    contractId?: string;
  }[];
  archived?: boolean; // Added for sales management
}

export interface CartItem {
  id: number | string;
  title: string;
  type: 'Exclusive License' | 'Lease License' | 'Sound Kit' | 'Service' | 'Mixing' | 'Mastering';
  price: number;
  sellerName: string;
  sellerHandle: string;
  sellerId?: string; // Added for purchase linking
  licenseType?: string; // e.g. "Unlimited", "Basic", "Trackout"

  // Optional linkage IDs
  projectId?: string;
  serviceId?: string;
  licenseId?: string;
  trackId?: string | null;
  sellerAvatar?: string;
}

export interface Contract {
  id: string;
  title: string;
  type: 'exclusive' | 'lease' | 'service' | 'audio';
  status: 'draft' | 'signed' | 'pending';
  created: string;
  clientName?: string;
  content?: string; // Simulated PDF content

  // Editable fields
  royaltySplit?: number;
  revenueSplit?: number;
  notes?: string;
  terms?: string;
  distNotes?: string;
  pubNotes?: string;
  publisherName?: string;
  producerSignature?: string;
  clientSignature?: string;
}

export interface Note {
  id: string;
  title: string;
  preview: string;
  content: string;
  tags: string[];
  updated: string;
  attachedAudio?: string;
  attachedAudioName?: string;
  attachedAudioProducer?: string;
  attachedAudioAvatar?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'sale' | 'message' | 'system' | 'alert' | 'follow' | 'order' | 'manage_order';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  data?: any;
  createdAt: string;
}

export type View =
  | 'home'
  | 'profile'
  | 'upload'
  | 'post-service'
  | 'notes'
  | 'contracts'
  | 'browse-talent'
  | 'browse-all-talent'
  | 'browse-all-projects'
  | 'browse-all-soundpacks'
  | 'browse-all-releases'
  | 'browse-all-services'
  | 'following'
  | 'collaborate'
  | 'library'
  | 'checkout'
  | 'dashboard-overview'
  | 'dashboard-studio'
  | 'dashboard-sales'
  | 'dashboard-manage'
  | 'dashboard-wallet'
  | 'dashboard-orders'
  | 'dashboard-invoices'
  | 'dashboard-messages'
  | 'dashboard-analytics'
  | 'dashboard-settings'
  | 'dashboard-roadmap'
  | 'dashboard-goals'
  | 'dashboard-help'
  | 'subscription'
  | 'settings'
  | 'help'
  | 'terms'
  | 'privacy'
  | 'listen';

export interface Goal {
  id: string;
  title: string;
  type: 'revenue' | 'followers' | 'uploads' | 'plays' | 'sales' | 'custom';
  target: number;
  current: number;
  deadline: string;
  status: 'active' | 'completed' | 'paused' | 'failed';
  description?: string;
  createdAt: string;
  category: 'monthly' | 'quarterly' | 'yearly' | 'custom';
}

// --- Strategy Roadmap Types ---

export interface StageField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'multiselect' | 'array' | 'date-range' | 'weekly-schedule';
  placeholder?: string;
  options?: string[]; // For select/multiselect
  required?: boolean;
  allowCustom?: boolean; // Allow custom text input in select
  allowSecondary?: boolean; // Allow selecting a primary and secondary option
  maxSelections?: number; // Max number of ranked selections (default 1, if allowSecondary then default 2, can be set to 3)
  fields?: StageField[]; // For 'array' type, defines the schema of items
  maxItems?: number; // Max items for 'array'
  itemLabel?: string; // Label for items (e.g. "Campaign")
  source?: string; // Source for dynamic options (e.g. 'stage-id.field-id')
  groupBySource?: string; // Source to group array items by (e.g. 'stage-id.field-id')
  fullWidth?: boolean; // Force field to span full width (col-span-2)
  aiEnabled?: boolean;
}

export interface StageStep {
  id: string;
  title: string;
  description?: string;
  fields: StageField[];
}

export interface StrategyStageConfig {
  id: string;
  title: string;
  description: string;
  iconName: string; // Lucide icon name
  steps: StageStep[];
}

export interface StrategyData {
  [stageId: string]: {
    status: 'not_started' | 'in_progress' | 'completed';
    data: Record<string, any>; // fieldId -> value
    lastUpdated: string;
  };
}

export interface DashboardAnalytics {
  totalRevenue: number;
  activeOrders: number;
  totalPlays: number;
  totalFollowers: number;
  chartData: Array<{
    label: string;
    date: string;
    revenue: number;
    listeners: number;
    plays: number;
    orders: number;
    gems: number;
  }>;
  monthlyData: Array<{
    date?: string; // Optional for compatibility
    revenue: number;
    listeners: number;
    plays: number;
    orders: number;
    gems: number;
  }>;
  recentActivity: Array<{
    type: string;
    title: string;
    description: string;
    time: string;
    icon: string;
    color: string;
  }>;
  recentOrders: Array<{
    id: string;
    item: string;
    date: string;
    amount: string;
    status: string;
    statusColor: string;
  }>;
  // Percentage Changes (Current Range vs Previous Range)
  revenueChange: number;
  ordersChange: number;
  playsChange: number;
  followersChange: number;
  listenersChange: number;
  gemsChange: number;
}

// --- Roadmap & Calendar Types ---

export interface Strategy {
  id: string;
  userId: string;
  stageId: string;
  data: Record<string, any>;
  status: 'not_started' | 'in_progress' | 'completed';
  lastUpdated: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startDate: string; // ISO string
  endDate?: string; // ISO string
  type: 'campaign' | 'content' | 'meeting' | 'milestone' | 'era' | 'task';
  platform?: 'instagram' | 'tiktok' | 'youtube' | 'spotify' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  metadata?: Record<string, any>; // e.g., linkedCampaignId, contentFormat
}
