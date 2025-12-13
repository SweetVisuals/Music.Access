import { StrategyStageConfig } from '../../types';


export const STAGE_TEMPLATES: StrategyStageConfig[] = [
    {
        id: 'stage-1',
        title: 'The Story',
        description: 'Define your core narrative, identity, and visual language.',
        iconName: 'BookOpen',
        steps: [
            {
                id: 'identity',
                title: 'Identity & Core',
                description: ' Establish who you are and what this project represents.',
                fields: [
                    {
                        id: 'who_are_you',
                        label: 'Who Are You?',
                        type: 'select',
                        allowCustom: true,
                        allowSecondary: true,
                        options: ['The Underdog', 'The Visionary', 'The Rebel', 'The Healer', 'The Storyteller', 'The Virtuoso'],
                        placeholder: 'Select an archetype or type your own...',
                        required: true,
                        aiEnabled: true
                    },
                    {
                        id: 'what_is_the_movie',
                        label: 'What Is The Movie?',
                        type: 'textarea',
                        placeholder: 'If this era was a movie, what is the plot?',
                        required: true,
                        aiEnabled: true
                    }
                ]
            },
            {
                id: 'narrative',
                title: 'Characters & Narrative',
                description: 'Flesh out the world and its inhabitants.',
                fields: [
                    {
                        id: 'who_are_the_characters',
                        label: 'Who The Characters Are?',
                        type: 'textarea',
                        placeholder: 'List the key personas or archetypes...',
                        required: true,
                        aiEnabled: true
                    },
                    {
                        id: 'what_are_their_stories',
                        label: 'What Are Their Stories?',
                        type: 'textarea',
                        placeholder: 'Brief background for each character...',
                        required: true,
                        aiEnabled: true
                    }
                ]
            },
            {
                id: 'positioning',
                title: 'Positioning',
                description: 'Where does this sit in the culture?',
                fields: [
                    {
                        id: 'whats_the_position',
                        label: 'Whats The Position?',
                        type: 'select',
                        allowCustom: true,
                        allowSecondary: true,
                        options: ['Mainstream Pop', 'Underground Alternative', 'Luxury/Premium', 'Raw/Gritty Street', 'Futuristic/Experimental', 'Nostalgic/Retro'],
                        placeholder: 'Select a position or define your own...',
                        required: true,
                        aiEnabled: true
                    }
                ]
            },
            {
                id: 'visuals',
                title: 'Visual Language',
                description: 'Define the aesthetic look and feel.',
                fields: [
                    {
                        id: 'how_does_it_look',
                        label: 'How Does it Look?',
                        type: 'select',
                        allowCustom: true,
                        allowSecondary: true,
                        options: ['Cyberpunk / Sci-Fi', 'Vintage / Retro VHS', 'Minimalist / Clean', 'Dark / Gothic', 'Vibrant / Neon', 'Natural / Organic'],
                        placeholder: 'Select an aesthetic...',
                        required: true
                    },
                    {
                        id: 'whats_the_visual_language',
                        label: 'Whats The Visual Language?',
                        type: 'textarea',
                        placeholder: 'Specific colors, fonts, textures, camera styles...',
                        required: true,
                        aiEnabled: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-2',
        title: 'Define Period or Era',
        description: 'Contextualize your work within a specific time or theme.',
        iconName: 'Clock',
        steps: [
            {
                id: 'context',
                title: 'Current Context',
                description: 'Where do you stand right now?',
                fields: [
                    {
                        id: 'where_do_i_find_myself_now',
                        label: 'Where do I find myself now?',
                        type: 'select',
                        allowCustom: true,
                        allowSecondary: true,
                        options: ['Just Starting Out', 'Rebuilding / Comeback', 'Peaking / Momentum', 'Experimental Phase', 'Pivot / Rebranding'],
                        placeholder: 'Select your current status...',
                        required: true,
                        aiEnabled: true
                    }
                ]
            },
            {
                id: 'inspiration',
                title: 'Inspirations',
                description: 'What is fueling this era?',
                fields: [
                    {
                        id: 'what_am_i_inspired_by',
                        label: 'What am I inspired by?',
                        type: 'textarea',
                        placeholder: 'Movies, books, other artists, life events...',
                        required: true,
                        aiEnabled: true
                    },
                    {
                        id: 'consistent_inspirations',
                        label: 'Are there any consistent inspirations?',
                        type: 'textarea',
                        placeholder: 'Themes that always come back in your work...',
                        required: false
                    }
                ]
            },
            {
                id: 'environment',
                title: 'World Building',
                description: 'Create the space for this work to live.',
                fields: [
                    {
                        id: 'defined_environment',
                        label: 'Can I create a defined environment?',
                        type: 'select',
                        allowCustom: true,
                        allowSecondary: true,
                        options: ['Distopian Future City', 'Lush Fantasy Forest', 'Gritty Urban Streets', 'Digital / Virtual Void', '80s Retro Arcade'],
                        placeholder: 'Describe the physical or digital space of this era...',
                        required: true,
                        aiEnabled: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-3',
        title: "What's the Campaign?",
        description: 'Define the major campaigns that tell the story of this era.',
        iconName: 'Clapperboard',
        steps: [
            {
                id: 'campaigns',
                title: 'Campaign Management',
                description: 'Define distinct campaigns for this era.',
                fields: [
                    {
                        id: 'campaign_list',
                        label: 'Your Campaigns',
                        type: 'array',
                        maxItems: 8,
                        itemLabel: 'Campaign',
                        fields: [
                            {
                                id: 'name',
                                label: 'Campaign Name',
                                type: 'text',
                                placeholder: 'e.g. "Summer Single Rollout"',
                                required: true
                            },
                            {
                                id: 'focus',
                                label: 'Main Focus',
                                type: 'select',
                                allowCustom: true,
                                options: ['Single Release', 'Album Rollout', 'Tour / Live', 'Merch Drop', 'Brand Partnership', 'Content Series', 'Community Activation'],
                                placeholder: 'What is the primary goal?',
                                required: true,
                                aiEnabled: true
                            },
                            {
                                id: 'concept',
                                label: 'Campaign Concept',
                                type: 'textarea',
                                placeholder: 'The core idea or "hook" of this campaign...',
                                required: true,
                                aiEnabled: true
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-4',
        title: 'Content Buckets',
        description: 'Categorize your content pillars.',
        iconName: 'Layout',
        steps: [
            {
                id: 'buckets',
                title: 'Content Pillars',
                description: 'What are the main categories of content you will produce?',
                fields: [
                    {
                        id: 'bucket_list',
                        label: 'Content Buckets',
                        type: 'array',
                        maxItems: 5,
                        itemLabel: 'Bucket',
                        fields: [
                            {
                                id: 'name',
                                label: 'Bucket Name',
                                type: 'text',
                                placeholder: 'e.g. "Behind the Scenes", "Music Teasers", "Lifestyle"',
                                required: true
                            },
                            {
                                id: 'percentage',
                                label: 'Mix Percentage',
                                type: 'text',
                                placeholder: 'e.g. 40%',
                                required: true
                            },
                            {
                                id: 'description',
                                label: 'Description',
                                type: 'textarea',
                                placeholder: 'What goes in this bucket?',
                                required: true,
                                aiEnabled: true
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-5',
        title: 'Content Format',
        description: 'Determine the formats for your content.',
        iconName: 'Video',
        steps: [
            {
                id: 'formats',
                title: 'Media Formats',
                description: 'How will you present your content?',
                fields: [
                    {
                        id: 'primary_formats',
                        label: 'Primary Formats',
                        type: 'multiselect',
                        options: ['Short-form Video (Reels/TikTok)', 'Long-form Video (YouTube)', 'Static Images', 'Carousel Posts', 'Text/Threads', 'Live Streaming'],
                        placeholder: 'Select your main formats...',
                        required: true
                    },
                    {
                        id: 'style_guide',
                        label: 'Format Style Guide',
                        type: 'textarea',
                        placeholder: 'Notes on editing style, specific filters, or camera angles...',
                        required: false,
                        aiEnabled: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-6',
        title: 'What Platforms To Be On',
        description: 'Choose your battlefields.',
        iconName: 'Smartphone',
        steps: [
            {
                id: 'platforms',
                title: 'Platform Strategy',
                description: 'Where will you be most active?',
                fields: [
                    {
                        id: 'primary_platform',
                        label: 'Primary Platform',
                        type: 'select',
                        options: ['Instagram', 'TikTok', 'YouTube', 'Spotify', 'Twitter/X'],
                        placeholder: 'Select your #1 priority...',
                        required: true
                    },
                    {
                        id: 'secondary_platforms',
                        label: 'Secondary Platforms',
                        type: 'multiselect',
                        options: ['Instagram', 'TikTok', 'YouTube', 'Spotify', 'Twitter/X', 'Discord', 'Snapchat', 'Facebook', 'LinkedIn'],
                        placeholder: 'Select supporting platforms...',
                        required: false
                    },
                    {
                        id: 'platform_roles',
                        label: 'Platform Roles',
                        type: 'textarea',
                        placeholder: 'Define the purpose of each platform (e.g. TikTok for discovery, IG for community)...',
                        required: true,
                        aiEnabled: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-7',
        title: 'How Much Content To Post',
        description: 'Define your posting cadence.',
        iconName: 'BarChart3',
        steps: [
            {
                id: 'frequency',
                title: 'Posting Schedule',
                description: 'Set your commitment levels.',
                fields: [
                    {
                        id: 'daily_frequency',
                        label: 'Daily Frequency',
                        type: 'select',
                        options: ['1x Day', '2x Day', '3x+ Day', 'Every other day', 'Weekly'],
                        placeholder: 'How often will you post?',
                        required: true
                    },
                    {
                        id: 'cadence_notes',
                        label: 'Cadence Notes',
                        type: 'textarea',
                        placeholder: 'e.g. Mornings for motivation, evenings for music...',
                        required: false,
                        aiEnabled: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-8',
        title: 'How to Actually Execute',
        description: 'Operationalize your plan.',
        iconName: 'Zap',
        steps: [
            {
                id: 'execution',
                title: 'Execution & Workflow',
                description: 'How will you get it done?',
                fields: [
                    {
                        id: 'tools',
                        label: 'Tools & Software',
                        type: 'multiselect',
                        options: ['CapCut', 'Premiere Pro', 'Canva', 'Notion', 'Davinci Resolve', 'Logic Pro'],
                        placeholder: 'Select tools...',
                        required: false
                    },
                    {
                        id: 'team',
                        label: 'Team / Collaborators',
                        type: 'textarea',
                        placeholder: 'Who is helping? (Photographers, editors, etc.)',
                        required: false
                    },
                    {
                        id: 'batching_strategy',
                        label: 'Batching Strategy',
                        type: 'textarea',
                        placeholder: 'e.g. Film everything on Mondays, Edit on Tuesdays...',
                        required: true,
                        aiEnabled: true
                    }
                ]
            }
        ]
    }
];

