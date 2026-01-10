
import { Project, UserProfile, Order, Conversation, Contract, Note, TalentProfile, CollabService, Purchase, LicenseInfo } from './types';

export const GENRES = ["All Genres", "Trap", "Boom Bap", "R&B", "Drill", "Lofi", "Afrobeat", "Synthwave"];
export const ROOT_KEYS = ["All Keys", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const SCALE_TYPES = ["All Scales", "Major", "Minor"];
export const KEYS = ["All Keys", "Am", "Cm", "Em", "F#m", "Gm", "Bbm"]; // Kept for backward compatibility references


const DEFAULT_LICENSES: LicenseInfo[] = [
    {
        id: 'l1',
        type: 'MP3',
        name: 'Basic Lease',
        price: 29.99,
        features: ['MP3 File', '2,000 Streams', 'Non-Profit Use'],
        fileTypesIncluded: ['MP3']
    },
    {
        id: 'l2',
        type: 'WAV',
        name: 'Premium Lease',
        price: 49.99,
        features: ['WAV + MP3', '50,000 Streams', 'Commercial Use'],
        fileTypesIncluded: ['WAV', 'MP3']
    },
    {
        id: 'l3',
        type: 'STEMS',
        name: 'Exclusive Rights',
        price: 499.99,
        features: ['All Stems', 'Unlimited Streams', 'Full Ownership Transfer'],
        fileTypesIncluded: ['STEMS', 'WAV', 'MP3']
    }
];

export const MOCK_PROJECTS: Project[] = [
    {
        id: '1',
        title: 'Midnight Tokio',
        producer: 'WavGod',
        price: 29.99,
        bpm: 140,
        key: 'Em',
        genre: 'Trap',
        type: 'beat_tape',
        tags: ['Dark', 'Night', 'Hard'],
        licenses: DEFAULT_LICENSES,
        tracks: [
            { id: 't1', title: 'Neon Rain', duration: 185 },
            { id: 't2', title: 'Subway Drift', duration: 160 },
            { id: 't1_3', title: 'Yakuza Theme', duration: 195 },
            { id: 't1_4', title: 'Lost In Shibuya', duration: 145 },
            { id: 't1_5', title: 'Code Red', duration: 178 }
        ]
    },
    {
        id: '2',
        title: 'Soulful Sunday',
        producer: 'BeatSmith',
        price: 19.99,
        bpm: 85,
        key: 'Cm',
        genre: 'R&B',
        type: 'beat_tape',
        tags: ['Smooth', 'Vocal', 'Chill'],
        licenses: DEFAULT_LICENSES,
        tracks: [
            { id: 't3', title: 'Morning Coffee', duration: 200 },
            { id: 't2_2', title: 'Velvet Touch', duration: 210 },
            { id: 't2_3', title: 'Late Night Call', duration: 190 },
            { id: 't2_4', title: 'Sunday Service', duration: 240 }
        ]
    },
    {
        id: '3',
        title: 'Concrete Jungle',
        producer: 'DrillMaster',
        price: 34.99,
        bpm: 142,
        key: 'Gm',
        genre: 'Drill',
        type: 'beat_tape',
        tags: ['Aggressive', 'UK', 'Bass'],
        licenses: DEFAULT_LICENSES,
        tracks: [
            { id: 't4', title: 'Opp Block', duration: 170 },
            { id: 't3_2', title: 'Slide', duration: 165 },
            { id: 't3_3', title: 'No Talking', duration: 155 },
            { id: 't3_4', title: 'Mask On', duration: 180 },
            { id: 't3_5', title: 'Active', duration: 168 }
        ]
    },
    {
        id: '4',
        title: 'Analog Dreams',
        producer: 'SynthWave',
        price: 24.99,
        bpm: 110,
        key: 'Am',
        genre: 'Synthwave',
        type: 'beat_tape',
        tags: ['Retro', '80s', 'Driving'],
        licenses: DEFAULT_LICENSES,
        tracks: [
            { id: 't5', title: 'Sunset Grid', duration: 220 },
            { id: 't4_2', title: 'Cyber Chase', duration: 205 },
            { id: 't4_3', title: 'VHS Memories', duration: 195 }
        ]
    },
    {
        id: '5',
        title: 'Dusty Crates',
        producer: 'OldSchool',
        price: 15.00,
        bpm: 90,
        key: 'F#m',
        genre: 'Boom Bap',
        type: 'beat_tape',
        tags: ['Vinyl', 'Sample', 'Classic'],
        licenses: DEFAULT_LICENSES,
        tracks: [
            { id: 't6', title: 'Scratch Theory', duration: 190 },
            { id: 't5_2', title: 'Jazz Loop', duration: 185 },
            { id: 't5_3', title: 'Basement', duration: 200 },
            { id: 't5_4', title: 'MPC 3000', duration: 175 }
        ]
    },
    {
        id: '6',
        title: 'Lofi Study',
        producer: 'ChilledCowboy',
        price: 10.00,
        bpm: 70,
        key: 'Bbm',
        genre: 'Lofi',
        type: 'beat_tape',
        tags: ['Study', 'Relax', 'Sleep'],
        licenses: DEFAULT_LICENSES,
        tracks: [
            { id: 't7', title: 'Rainy Window', duration: 140 },
            { id: 't6_2', title: 'Cat Nap', duration: 130 },
            { id: 't6_3', title: 'Homework', duration: 150 },
            { id: 't6_4', title: 'Tea Time', duration: 145 }
        ]
    },
];

export const MOCK_USER_PROFILE: UserProfile = {
    username: "Mani Raé",
    handle: "@ManiRae",
    location: "Toronto, Canada",
    avatar: "https://i.pravatar.cc/150?u=mani",
    banner: "https://picsum.photos/1200/300?grayscale&blur=2",
    subscribers: 12500,
    gems: 4520,
    balance: 4520.50,
    bio: "Creating music for the experience. Managed by @PlugTheNation",
    website: "https://coldspark.org",
    projects: MOCK_PROJECTS.slice(0, 3), // Owns first 3 projects
    services: [
        {
            id: 's1',
            title: 'Mixing & Mastering',
            description: 'Professional mix and master for your track. 48h turnaround.',
            price: 150,
            rateType: 'flat',
            features: ['Analog Gear', 'Vocal Tuning', 'Stem Mixing']
        },
        {
            id: 's2',
            title: 'Custom Exclusive Beat',
            description: 'I will create a beat from scratch tailored to your specific requirements.',
            price: 500,
            rateType: 'flat',
            features: ['Full Ownership', 'Stems Included', 'Unlimited Revisions']
        }
    ],
    soundPacks: [
        {
            id: 'sp1',
            title: 'Dark Matter Drum Kit',
            type: 'Drum Kit',
            price: 29.99,
            fileSize: '450MB',
            itemCount: 120
        },
        {
            id: 'sp2',
            title: 'Analog Synths Vol. 1',
            type: 'Loop Kit',
            price: 34.99,
            fileSize: '1.2GB',
            itemCount: 50
        }
    ]
};

export const MOCK_ORDERS: Order[] = [
    {
        id: 'ORD-992',
        serviceTitle: 'Mixing & Mastering',
        clientName: 'Yung Killa',
        clientAvatar: 'https://i.pravatar.cc/150?u=yk',
        amount: 150,
        status: 'active',
        deadline: '2025-10-25',
        requirements: 'I want a clean mix, similar to Travis Scott vocals.',
        files: [{ name: 'Vocals_Dry.wav', size: '45MB' }, { name: 'Beat_Stems.zip', size: '120MB' }]
    },
    {
        id: 'ORD-991',
        serviceTitle: 'Custom Beat Production',
        clientName: 'Sarah J',
        clientAvatar: 'https://i.pravatar.cc/150?u=sj',
        amount: 500,
        status: 'pending',
        deadline: '2025-11-01',
        requirements: 'Need a soulful R&B instrumental. Reference track attached.',
    },
    {
        id: 'ORD-885',
        serviceTitle: 'Vocal Tuning',
        clientName: 'Mike D',
        clientAvatar: 'https://i.pravatar.cc/150?u=md',
        amount: 75,
        status: 'delivered',
        deadline: '2025-10-20',
        requirements: 'Just auto-tune please.',
    }
];

export const MOCK_PURCHASES: Purchase[] = [
    {
        id: 'PUR-1025',
        date: 'Nov 05, 2025',
        item: 'Fire Hazard (Exclusive Beat)',
        seller: 'TrapGod',
        amount: 350.00,
        status: 'Completed',
        image: 'https://picsum.photos/id/60/200',
        type: 'Beat License',
        tracks: [
            { id: 't_ex_1', title: 'Fire Hazard', duration: 188 }
        ]
    },
    {
        id: 'PUR-1024',
        date: 'Oct 24, 2025',
        item: 'Midnight Tokio (Unlimited Lease)',
        seller: 'WavGod',
        amount: 199.99,
        status: 'Completed',
        image: 'https://picsum.photos/id/13/200',
        type: 'Beat License',
        tracks: [
            { id: 't_mt_1', title: 'Midnight Tokio', duration: 195 }
        ]
    },
    {
        id: 'PUR-1023',
        date: 'Oct 22, 2025',
        item: 'Analog Synths Vol. 1',
        seller: 'Mani Raé',
        amount: 34.99,
        status: 'Completed',
        image: 'https://picsum.photos/id/24/200',
        type: 'Sound Kit',
        tracks: [
            { id: 'f1', title: 'Deep Bass OneShot.wav', duration: 0 },
            { id: 'f2', title: 'Analog Pad Loop 120bpm.wav', duration: 0 },
            { id: 'f3', title: 'Vintage Keys.wav', duration: 0 },
            { id: 'f4', title: 'Modular Zap.wav', duration: 0 },
            { id: 'f5', title: 'Noise Texture.wav', duration: 0 }
        ]
    },
    {
        id: 'PUR-1022',
        date: 'Oct 15, 2025',
        item: 'Vocal Mixing Service',
        seller: 'MixMaster J',
        amount: 150.00,
        status: 'Processing',
        image: 'https://picsum.photos/id/32/200',
        type: 'Service'
    },
    {
        id: 'PUR-1021',
        date: 'Sep 30, 2025',
        item: 'Drill Essentials',
        seller: 'DrillMaster',
        amount: 25.00,
        status: 'Completed',
        image: 'https://picsum.photos/id/45/200',
        type: 'Sound Kit'
    },
    {
        id: 'PUR-1020',
        date: 'Sep 28, 2025',
        item: 'Morning Coffee (Exclusive)',
        seller: 'BeatSmith',
        amount: 499.00,
        status: 'Completed',
        image: 'https://picsum.photos/id/55/200',
        type: 'Beat License'
    }
];

export const MOCK_MESSAGES: Conversation[] = [
    {
        id: 'c1',
        user: 'Yung Killa',
        avatar: 'https://i.pravatar.cc/150?u=yk',
        lastMessage: 'Yo, did you get the stems?',
        timestamp: '10:42 AM',
        unread: 2,
        messages: [
            { id: 'm1', sender: 'Yung Killa', avatar: 'https://i.pravatar.cc/150?u=yk', text: 'Yo, did you get the stems?', timestamp: '10:42 AM', isMe: false },
            { id: 'm2', sender: 'Me', avatar: MOCK_USER_PROFILE.avatar, text: 'Yeah downloading them now. Will start tonight.', timestamp: '10:45 AM', isMe: true }
        ]
    },
    {
        id: 'c2',
        user: 'Sarah J',
        avatar: 'https://i.pravatar.cc/150?u=sj',
        lastMessage: 'Thanks for the update!',
        timestamp: 'Yesterday',
        unread: 0,
        messages: []
    }
];

export const MOCK_CONTRACTS: Contract[] = [
    {
        id: 'ct1',
        title: 'Standard Lease Agreement',
        type: 'lease',
        status: 'draft',
        created: '04/09/2025',
        royaltySplit: 50,
        revenueSplit: 50,
        terms: 'Standard terms for MP3/WAV leasing.',
        publisherName: 'Mani Rae Pub',
        notes: '',
        distNotes: 'Worldwide',
        pubNotes: 'None'
    },
    {
        id: 'ct2',
        title: 'Exclusive Rights Agreement',
        type: 'exclusive',
        status: 'draft',
        created: '07/10/2025',
        royaltySplit: 20,
        revenueSplit: 100,
        terms: 'Full buyout terms. Producer retains writer share.',
        publisherName: 'N/A',
        notes: 'No special splits',
        distNotes: 'Exclusive',
        pubNotes: 'None'
    },
    {
        id: 'ct3',
        title: 'Mixing Service Contract',
        type: 'service',
        status: 'signed',
        created: '15/08/2025',
        clientName: 'Big Records',
        royaltySplit: 0,
        revenueSplit: 100,
        terms: 'Work for hire.',
        publisherName: 'Big Records Pub',
        producerSignature: 'Mani Rae',
        clientSignature: 'Big CEO',
        notes: 'Buyout',
        distNotes: 'N/A',
        pubNotes: 'N/A'
    }
];

export const MOCK_NOTES: Note[] = [
    { id: 'n1', title: 'hh', preview: 'skdaas', content: 'skdaas', tags: [], updated: '14/10/2025' },
    { id: 'n2', title: 'mbb', preview: 'HJFJFHGKJK', content: 'HJFJFHGKJK', tags: ['Beat 4', 'Beat 3'], updated: '19/09/2025' },
    { id: 'n3', title: 'testing notes', preview: 'hh', content: 'testing notes\nhh', tags: [], updated: '05/09/2025' }
];

export const MOCK_TALENT: TalentProfile[] = [
    {
        id: 't1',
        username: 'Metro Clone',
        handle: '@metro_clone',
        avatar: 'https://i.pravatar.cc/150?u=mc',
        role: 'Producer',
        tags: ['Trap', 'Dark', 'Cinematic'],
        followers: '45.2K',
        streams: 1200000,
        tracks: 45,
        isVerified: true
    },
    {
        id: 't2',
        username: 'Melody Queen',
        handle: '@melody_q',
        avatar: 'https://i.pravatar.cc/150?u=mq',
        role: 'Vocalist',
        tags: ['R&B', 'Soul', 'Hooks'],
        followers: '12.8K',
        streams: 500000,
        tracks: 20,
        isVerified: false
    },
    {
        id: 't3',
        username: 'MixMaster J',
        handle: '@mixmaster_j',
        avatar: 'https://i.pravatar.cc/150?u=mj',
        role: 'Engineer',
        tags: ['Mixing', 'Mastering', 'Dolby'],
        followers: '8.5K',
        streams: 0,
        tracks: 15,
        isVerified: true
    },
    {
        id: 't4',
        username: 'Sample God',
        handle: '@sample_god',
        avatar: 'https://i.pravatar.cc/150?u=sg',
        role: 'Sound Designer',
        tags: ['Loops', 'Foley', 'Textures'],
        followers: '22.1K',
        streams: 250000,
        tracks: 120,
        isVerified: false
    }
];

export const MOCK_COLLABS: CollabService[] = [
    {
        id: 'cs1',
        name: 'Rap Caviar Daily',
        platform: 'Spotify',
        handle: 'rapcaviardaily',
        avatar: 'https://picsum.photos/id/10/100',
        serviceTitle: 'Playlist Placement',
        description: 'Get your track placed on our verified Spotify playlist with 50k+ weekly listeners.',
        priceRange: '$50 - $200',
        stats: [{ label: 'Listeners', value: '50K+' }, { label: 'Rotation', value: '4 Weeks' }],
        verified: true
    },
    {
        id: 'cs2',
        name: 'Underground Kings',
        platform: 'Instagram',
        handle: '@underground_kings',
        avatar: 'https://picsum.photos/id/12/100',
        serviceTitle: 'Feed Post + Story',
        description: 'Permanent feed post and 24h story share to our engaged audience of hip hop fans.',
        priceRange: '$30',
        stats: [{ label: 'Followers', value: '120K' }, { label: 'Avg. Reach', value: '45K' }],
        verified: false
    },
    {
        id: 'cs3',
        name: 'TikTok Hype',
        platform: 'TikTok',
        handle: '@tiktok_hype_dance',
        avatar: 'https://picsum.photos/id/15/100',
        serviceTitle: 'Dance Challenge',
        description: 'Our influencers will create a dance challenge to your song.',
        priceRange: '$150+',
        stats: [{ label: 'Views', value: '1M+' }, { label: 'Creators', value: '5' }],
        verified: true
    },
    {
        id: 'cs4',
        name: 'Lyrical Lemonade Blog',
        platform: 'Blog',
        handle: 'lyricallemonade.com',
        avatar: 'https://picsum.photos/id/20/100',
        serviceTitle: 'Featured Article',
        description: 'Full interview and track review on our main page.',
        priceRange: '$300',
        stats: [{ label: 'Monthly Visitors', value: '500K' }],
        verified: true
    }
];
