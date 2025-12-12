
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
  title: string;
  producer: string;
  coverImage?: string; // Optional now
  price: number; // Display price (usually lowest license)
  bpm: number;
  key: string;
  genre: string;
  subGenre?: string;
  type: 'beat_tape' | 'sound_pack'; // Distinguished type
  tags: string[];
  tracks: Track[];
  description?: string;
  notes?: string;
  licenses?: LicenseInfo[]; // Available licenses for this project
  status?: 'draft' | 'published' | 'Planning' | 'In Progress' | 'Mixing' | 'Mastering' | 'Ready';
  created?: string;
  userId?: string;
  releaseDate?: string;
  format?: 'Album' | 'EP' | 'Single';
  progress?: number;
  tasks?: Task[];
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  rateType: 'hourly' | 'flat';
  features: string[];
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
  username: string;
  handle: string;
  email?: string;
  location?: string;
  avatar: string;
  banner: string;
  subscribers: number;
  streams?: number;
  gems: number;
  balance: number;
  lastGemClaimDate?: string;
  bio: string;
  website?: string;
  projects: Project[];
  services: Service[];
  soundPacks: SoundPack[];
}

export interface TalentProfile {
  id: string;
  username: string;
  handle: string;
  avatar: string;
  role: string;
  tags: string[];
  followers: string;
  isVerified?: boolean;
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
  key: string;
  minBpm: number;
  maxBpm: number;
  minPrice: number;
  maxPrice: number;
  searchQuery: string;
}

export interface AiMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Message {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  timestamp: string;
  isMe: boolean;
}

export interface Conversation {
  id: string;
  user: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
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
}

export interface Notification {
  id: string;
  userId: string;
  type: 'sale' | 'message' | 'system' | 'alert';
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
  | 'dashboard-help'
  | 'settings'
  | 'help'
  | 'terms'
  | 'privacy';

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
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'multiselect';
  placeholder?: string;
  options?: string[]; // For select/multiselect
  required?: boolean;
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
  monthlyData: Array<{
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
}
