import { StrategyStageConfig } from '../../types';



export const STAGE_TEMPLATES: StrategyStageConfig[] = [
    {
        id: 'stage-1',
        title: 'Brand Identity & Core',
        description: 'Define the soul of your artist project.',
        iconName: 'BookOpen',
        steps: [
            {
                id: 'core_identity',
                title: 'The Core',
                description: 'Who are you at the deepest level?',
                fields: [
                    {
                        id: 'archetype',
                        label: 'Primary Archetype',
                        type: 'select',
                        allowCustom: true,
                        allowSecondary: true,
                        options: ['Rebel', 'Sage', 'Lover', 'Jester', 'Magician', 'Ruler', 'Hero', 'Creator', 'Caregiver', 'Explorer', 'Innocent', 'Everyman'],
                        placeholder: 'Select your primary archetype...',
                        required: true,
                        aiEnabled: true
                    },
                    {
                        id: 'mission_statement',
                        label: 'Mission Statement',
                        type: 'textarea',
                        placeholder: 'Why does this project exist? What is your promise to the world?',
                        required: true,
                        aiEnabled: true
                    },
                    {
                        id: 'core_values',
                        label: 'Core Values',
                        type: 'multiselect',
                        options: ['Authenticity', 'Innovation', 'Community', 'Rebellion', 'Transparency', 'Excellence', 'Sustainability', 'Inclusivity', 'Mystery', 'Energy'],
                        placeholder: 'Select up to 5 core values...',
                        required: true
                    }
                ]
            },
            {
                id: 'brand_voice',
                title: 'Voice & Tone',
                description: 'How do you speak to your audience?',
                fields: [
                    {
                        id: 'tone_keywords',
                        label: 'Tone Keywords',
                        type: 'multiselect',
                        options: ['Witty', 'Serious', 'Inspirational', 'Aggressive', 'Chill', 'Cryptic', 'Educational', 'Vulnerable', 'Confident', 'Sarcastic'],
                        placeholder: 'Select tones...',
                        required: true
                    },
                    {
                        id: 'vocabulary_rules',
                        label: 'Vocabulary & Slang',
                        type: 'textarea',
                        placeholder: 'Specific words you use or avoid. (e.g. "We call our fans Initiates, never fans")',
                        required: false,
                        aiEnabled: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-2',
        title: 'Market & Culture',
        description: 'Where do you fit in the cultural landscape?',
        iconName: 'Globe',
        steps: [
            {
                id: 'target_audience',
                title: 'Target Audience',
                description: 'Who are you speaking to?',
                fields: [
                    {
                        id: 'age_range_main',
                        label: 'Main Age Range',
                        type: 'select',
                        options: ['13-17', '18-24', '25-34', '35-44', '45+'],
                        allowCustom: true,
                        placeholder: 'Select primary age group...',
                        required: true
                    },
                    {
                        id: 'age_range_secondary',
                        label: 'Secondary Age Range',
                        type: 'select',
                        options: ['13-17', '18-24', '25-34', '35-44', '45+'],
                        allowCustom: true,
                        placeholder: 'Select secondary age group...',
                        required: false
                    },
                    {
                        id: 'gender_split',
                        label: 'Gender Split',
                        type: 'select',
                        allowCustom: true,
                        options: ['Male Dominant', 'Female Dominant', 'Balanced', 'Non-Binary/Queer Focus'],
                        placeholder: 'Select gender demographic...',
                        required: true
                    },
                    {
                        id: 'location',
                        label: 'Location',
                        type: 'multiselect',
                        allowCustom: true,
                        options: ['Worldwide', 'USA', 'UK', 'Europe', 'Asia', 'Latin America', 'Africa', 'Australia'],
                        placeholder: 'Select key locations...',
                        required: true
                    },
                    {
                        id: 'audience_personas',
                        label: 'Audience Personas',
                        type: 'array',
                        maxItems: 3,
                        itemLabel: 'Persona',
                        fields: [
                            {
                                id: 'name',
                                label: 'Persona Name',
                                type: 'text',
                                placeholder: 'e.g. "The Curated Hipster"',
                                required: true
                            },
                            {
                                id: 'traits',
                                label: 'Key Traits',
                                type: 'textarea',
                                placeholder: 'What do they like? Where do they hang out?',
                                required: true
                            }
                        ]
                    }
                ]
            },
            {
                id: 'competition',
                title: 'Competitive Landscape',
                description: 'Who else is in your lane?',
                fields: [
                    {
                        id: 'similar_artists',
                        label: 'Similar Artists',
                        type: 'multiselect',
                        options: [], // User should type custom
                        allowCustom: true,
                        placeholder: 'Type artists...',
                        required: true
                    },
                    {
                        id: 'differentiation',
                        label: 'Your "X-Factor"',
                        type: 'textarea',
                        placeholder: 'What makes you different from the names above?',
                        required: true,
                        aiEnabled: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-3',
        title: 'Visual Universe',
        description: 'The look and feel of your brand.',
        iconName: 'Eye',
        steps: [
            {
                id: 'color_palette',
                title: 'Color & Aesthetics',
                description: 'Define your visual DNA.',
                fields: [
                    {
                        id: 'primary_colors',
                        label: 'Primary Colors',
                        type: 'textarea',
                        placeholder: 'Hex codes or descriptive names (e.g. "Electric Blue, Matte Black")',
                        required: true
                    },
                    {
                        id: 'aesthetic_style',
                        label: 'Aesthetic Style',
                        type: 'select',
                        allowCustom: true,
                        options: ['Cyberpunk', 'Y2K', 'Grunge', 'Minimalist', 'Baroque', 'Street Luxury', 'Ethereal', 'Industrial', 'Retro-Futurism'],
                        placeholder: 'Select a visual style...',
                        required: true
                    },
                    {
                        id: 'fashion_notes',
                        label: 'Fashion & Styling',
                        type: 'textarea',
                        placeholder: 'Clothing brands, silhouettes, accessories...',
                        required: false,
                        aiEnabled: true
                    }
                ]
            },
            {
                id: 'visual_content',
                title: 'Imagery & Typography',
                description: 'Fonts and photo styles.',
                fields: [
                    {
                        id: 'typography',
                        label: 'Typography Preferences',
                        type: 'multiselect',
                        allowCustom: true,
                        options: ['Serif (Classic)', 'Sans Serif (Modern)', 'Script (Elegant)', 'Display (Bold)', 'Monospace (Tech)', 'Handwritten (Personal)'],
                        placeholder: 'Select font styles...',
                        required: false
                    },
                    {
                        id: 'imagery_themes',
                        label: 'Imagery Themes',
                        type: 'multiselect',
                        allowCustom: true,
                        options: ['Film Grain', 'High Flash', 'Studio Portraits', 'Candid/Raw', 'Abstract/3D', 'Nature/Organic', 'Urban/Concrete'],
                        placeholder: 'Select imagery themes...',
                        required: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-4',
        title: 'The Era Definition',
        description: 'Contextualize your current artistic chapter.',
        iconName: 'Clock',
        steps: [
            {
                id: 'era_concept',
                title: 'Era Concept',
                description: 'What is this chapter called?',
                fields: [
                    {
                        id: 'era_title',
                        label: 'Era Title',
                        type: 'text',
                        placeholder: 'e.g. "The Red Era" or "The Rebirth"',
                        required: true
                    },
                    {
                        id: 'era_narrative',
                        label: 'Story Arc',
                        type: 'textarea',
                        placeholder: 'Beginning, Middle, and End of this era\'s story...',
                        required: true,
                        aiEnabled: true
                    }
                ]
            },
            {
                id: 'era_world',
                title: 'World Building',
                description: 'Where does this era live?',
                fields: [
                    {
                        id: 'setting_description',
                        label: 'The World Setting',
                        type: 'textarea',
                        placeholder: 'Is it a digital void? A lush garden? A dystopian city?',
                        required: true,
                        aiEnabled: true
                    },
                    {
                        id: 'characters',
                        label: 'Key Characters/Alter Egos',
                        type: 'textarea',
                        placeholder: 'Are you playing a character? Who else is involved?',
                        required: false
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-5',
        title: 'Campaign Architecture',
        description: 'Plan your major marketing moves.',
        iconName: 'Flag',
        steps: [
            {
                id: 'campaigns',
                title: 'Major Campaigns',
                description: 'Define the big beats of this era.',
                fields: [
                    {
                        id: 'campaign_list',
                        label: 'Campaigns',
                        type: 'array',
                        maxItems: 4,
                        itemLabel: 'Campaign',
                        fields: [
                            {
                                id: 'name',
                                label: 'Campaign Name',
                                type: 'text',
                                placeholder: 'e.g. "Lead Single Rollout"',
                                required: true
                            },
                            {
                                id: 'goal',
                                label: 'Primary Goal',
                                type: 'select',
                                options: ['Awareness (Reach)', 'Engagement (Community)', 'Conversion (Sales/Streams)', 'Retention (Loyalty)'],
                                required: true
                            },
                            {
                                id: 'target_audience',
                                label: 'Target Audience',
                                type: 'multiselect',
                                source: 'stage-2.audience_personas',
                                placeholder: 'Select personas from Stage 2...',
                                required: false,
                                allowCustom: true
                            },
                            {
                                id: 'dates',
                                label: 'Campaign Dates',
                                type: 'date-range',
                                placeholder: 'Select range',
                                required: true
                            },
                            {
                                id: 'purpose',
                                label: 'Strategic Purpose',
                                type: 'textarea',
                                placeholder: 'Why are we doing this? e.g. "To build hype before the album drop..."',
                                required: true
                            },
                            {
                                id: 'effectiveness',
                                label: 'Effectiveness Strategy',
                                type: 'textarea',
                                placeholder: 'How will this be effective? e.g. "Using high-contrast visuals to stop the scroll..."',
                                required: true
                            },
                            {
                                id: 'phases',
                                label: 'Phases',
                                type: 'textarea',
                                placeholder: '1. Tease, 2. Launch, 3. Sustain...',
                                required: true,
                                aiEnabled: true
                            }
                        ]
                    }
                ]
            },
            {
                id: 'budget_kpi',
                title: 'Resources & Goals',
                description: 'What are we spending and what are we measuring?',
                fields: [
                    {
                        id: 'budget_allocation',
                        label: 'Budget Focus',
                        type: 'select',
                        options: ['Content Production Heavy', 'Ad Spend Heavy', 'PR/Playlist Heavy', 'Influencer Marketing Heavy', 'Balanced'],
                        required: true
                    },
                    {
                        id: 'kpis',
                        label: 'Key Performance Indicators (KPIs)',
                        type: 'multiselect',
                        options: ['Spotify Monthly Listeners', 'Instagram Followers', 'TikTok Views', 'Email Subscribers', 'Merch Sales', 'Ticket Sales'],
                        placeholder: 'What metrics matter most?',
                        required: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-6',
        title: 'Content Pillars & Mix',
        description: 'What are you actually posting?',
        iconName: 'Layout',
        steps: [
            {
                id: 'pillars',
                title: 'Content Pillars',
                description: 'The main categories of your content.',
                fields: [
                    {
                        id: 'bucket_list',
                        label: 'Content Buckets',
                        type: 'array',
                        maxItems: 99, // Increase limit as we are grouping
                        itemLabel: 'Bucket',
                        groupBySource: 'stage-5.campaigns',
                        fields: [
                            {
                                id: 'name',
                                label: 'Bucket Name',
                                type: 'text',
                                placeholder: 'e.g. "Studio Vlogs", "Music Snippets"',
                                required: true
                            },
                            {
                                id: 'campaign_assignment',
                                label: 'Assign to Campaign(s)',
                                type: 'multiselect',
                                source: 'stage-5.campaigns',
                                placeholder: 'Select active campaigns...',
                                required: false,
                                allowCustom: true
                            },
                            {
                                id: 'formats',
                                label: 'Content Formats',
                                type: 'multiselect',
                                options: ['Short-form Video (Reels/TikTok)', 'Long-form Video', 'Carousel/Photo', 'Text/Thread', 'Live Stream', 'Audio Only'],
                                required: true
                            },
                            {
                                id: 'platforms',
                                label: 'Primary Platforms',
                                type: 'multiselect',
                                options: ['TikTok', 'Instagram', 'YouTube', 'Twitter/X', 'LinkedIn', 'Snapchat', 'Twitch'],
                                required: true
                            },
                            {
                                id: 'frequency',
                                label: 'Posting Frequency',
                                type: 'select',
                                options: ['Daily', '4-5x / Week', '2-3x / Week', 'Weekly', 'Bi-Weekly', 'Monthly'],
                                required: true
                            },
                            {
                                id: 'tone',
                                label: 'Tone & Vibe',
                                type: 'select',
                                options: ['Educational', 'Entertaining', 'Inspirational', 'Personal/Vulnerable', 'Promotional/Sales', 'Abstract/Artistic'],
                                allowCustom: true,
                                required: true
                            },
                            {
                                id: 'ratio',
                                label: 'Target Mix %',
                                type: 'text',
                                placeholder: 'e.g. 40%',
                                required: false
                            }
                        ]
                    }
                ]
            },
            {
                id: 'series_ideas',
                title: 'Recurring Series',
                description: 'Formats you can repeat.',
                fields: [
                    {
                        id: 'series_concepts',
                        label: 'Series Concepts',
                        type: 'textarea',
                        placeholder: 'e.g. "Sample Flip Fridays" - every Friday I flip a sample...',
                        required: true,
                        aiEnabled: true
                    },
                    {
                        id: 'value_prop',
                        label: 'Value Proposition',
                        type: 'textarea',
                        placeholder: 'Why will people come back for this?',
                        required: false,
                        aiEnabled: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-7',
        title: 'Asset & Format Strategy',
        description: 'How you package your art.',
        iconName: 'Image',
        steps: [
            {
                id: 'production_tiers',
                title: 'Production Tiers',
                description: 'Balancing quality and quantity.',
                fields: [
                    {
                        id: 'production_balance',
                        label: 'Production Mix Strategy',
                        type: 'select',
                        options: ['80% Lo-Fi / 20% Hi-Fi (Volume Focus)', '50% Lo-Fi / 50% Hi-Fi (Balanced)', '20% Lo-Fi / 80% Hi-Fi (Premium Focus)'],
                        required: true
                    },
                    {
                        id: 'hi_fi_types',
                        label: 'Hi-Fi Content Types',
                        type: 'multiselect',
                        options: ['Official Music Videos', 'High-End Visualizers', 'Professional Photoshoots', 'Live Performance Sessions', 'Documentaries/Mini-Docs', 'Cinematic Trailers'],
                        required: true
                    },
                    {
                        id: 'lo_fi_types',
                        label: 'Lo-Fi Content Types',
                        type: 'multiselect',
                        options: ['BTS / Studio Vlogs', 'TikTok/Reels Trends', 'Memes & Edits', 'Fan Replies / Q&A', 'Demos / Works in Progress', 'Personal Updates'],
                        required: true
                    }
                ]
            },
            {
                id: 'asset_checklist',
                title: 'Asset Checklist',
                description: 'Essential items for launch.',
                fields: [
                    {
                        id: 'core_assets',
                        label: 'Core Assets Needed',
                        type: 'multiselect',
                        options: ['Cover Art (3000px)', 'Spotify Canvas (9:16 Video)', 'Artist Bio (Short & Long)', 'Press Photos (High Res)', 'Logo / Watermark / Font Pack', 'Teaser Clips (15s/30s)'],
                        required: true
                    },
                    {
                        id: 'format_specs',
                        label: 'Format Specifications',
                        type: 'multiselect',
                        options: ['9:16 Vertical (Reels/TikTok)', '16:9 Landscape (YouTube)', '1:1 Square (Feed/Profile)', '4:5 Portrait (IG Feed)'],
                        required: true
                    }
                ]
            },
            {
                id: 'creative_team',
                title: 'Creative Tools & Team',
                description: 'Resources to execute.',
                fields: [
                    {
                        id: 'editing_tools',
                        label: 'Creation Tools to Use',
                        type: 'multiselect',
                        options: ['CapCut (Mobile)', 'Premiere Pro / Final Cut', 'Canva (Design)', 'Photoshop / Lightroom', 'DaVinci Resolve', 'Logic/Ableton (Audio)'],
                        required: true
                    },
                    {
                        id: 'team_needs',
                        label: 'Team Requirements',
                        type: 'multiselect',
                        options: ['DIY (Solo)', 'Videographer', 'Graphic Designer', 'Video Editor', 'Stylist / MUA', 'Creative Director'],
                        required: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-8',
        title: 'Distribution & Growth',
        description: 'Getting eyes and ears on the work.',
        iconName: 'Share2',
        steps: [
            {
                id: 'channels',
                title: 'Channel Strategy',
                description: 'Where do you win?',
                fields: [
                    {
                        id: 'primary_platform',
                        label: 'Primary Platform (The Hub)',
                        type: 'select',
                        options: ['Instagram', 'TikTok', 'YouTube', 'Spotify', 'Twitter/X'],
                        required: true
                    },
                    {
                        id: 'secondary_platforms',
                        label: 'Secondary Platforms (Amplifiers)',
                        type: 'multiselect',
                        options: ['Instagram', 'TikTok', 'YouTube Shorts', 'Snapchat', 'Facebook', 'LinkedIn', 'Threads'],
                        required: true
                    },
                    {
                        id: 'growth_tools',
                        label: 'Growth Accelerators',
                        type: 'multiselect',
                        options: ['Paid Ads (Meta/TikTok)', 'Influencer Campaigns', 'Playlist Pitching (Editorial/User)', 'Collabs / Features', 'Remix Competitions', 'Street Team / Guerrilla Marketing'],
                        required: true
                    }
                ]
            },
            {
                id: 'community',
                title: 'Community Funnel',
                description: 'Turning listeners into fans.',
                fields: [
                    {
                        id: 'funnel_steps',
                        label: 'Conversion Funnel Points',
                        type: 'multiselect',
                        options: ['Direct to DSP (Linkfire)', 'Email List / SMS Signup', 'Discord / Telegram Community', 'Patreon / Membership', 'Merch Store Direct', 'Website / Blog'],
                        required: true
                    },
                    {
                        id: 'fan_activation',
                        label: 'Fan Activation Tactics',
                        type: 'multiselect',
                        options: ['Live Q&As / AMAs', 'Listening Parties', 'UGC Challenges (Use Sound)', 'Exclusive Presale Access', 'Meet & Greets', 'Digital Collectibles / POAPs'],
                        required: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-9',
        title: 'Cadence & Consistency',
        description: 'The heartbeat of your plan.',
        iconName: 'BarChart3',
        steps: [
            {
                id: 'schedule_overview',
                title: 'Weekly Core Schedule',
                description: 'Build your weekly routine.',
                fields: [
                    {
                        id: 'frequency_tier',
                        label: 'Overall Intensity',
                        type: 'select',
                        options: ['Maintenance (1-2x/week)', 'Growth (3-4x/week)', 'Sprint (Daily)', 'Viral (2-3x/day)'],
                        required: true,
                        fullWidth: true
                    },
                    {
                        id: 'weekly_plan',
                        label: 'Standard Week Plan',
                        type: 'weekly-schedule',
                        required: true,
                        description: 'Assign Campaigns and Content Buckets to specific days.'
                    }
                ]
            },
            {
                id: 'sustainability',
                title: 'Long-Term Sustainability',
                description: 'Avoiding burnout.',
                fields: [
                    {
                        id: 'burnout_prevention',
                        label: 'Burnout Safeguards',
                        type: 'multiselect',
                        options: ['Buffer Weeks (Pre-scheduled breaks)', 'Repurposing Strategy (Recycle hits)', 'Content Bank (Evergreen backlog)', 'Delegation (Hiring help)', 'Digital Detox Days'],
                        required: true
                    },
                    {
                        id: 'content_batching',
                        label: 'Production Workflow',
                        type: 'select',
                        options: ['Daily Creation', 'Weekly Batching', 'Monthly Batching', 'Outsourced'],
                        required: true
                    }
                ]
            }
        ]
    },
    {
        id: 'stage-10',
        title: 'Launch & Optimization',
        description: 'How to actually get it done.',
        iconName: 'Zap',
        steps: [
            {
                id: 'release_admin',
                title: 'Release Administration',
                description: 'Technical setup and housekeeping.',
                fields: [
                    {
                        id: 'distro_metadata',
                        label: 'Distribution & Metadata',
                        type: 'multiselect',
                        options: ['Audio Uploaded to Distributor', 'ISRC Codes Generated', 'Lyrics Submitted', 'Splits / Royalty Sheets Signed', 'Release Date Locked', 'Copyright Registered'],
                        required: true,
                        fullWidth: true
                    },
                    {
                        id: 'dsp_prep',
                        label: 'DSP Preparedness',
                        type: 'multiselect',
                        options: ['Spotify Artist Pick Updated', 'Spotify Canvas (8s Video) Uploaded', 'Apple Music Motion Art (optional)', 'Updated Bio on All Platforms', 'New Press Photos Uploaded', 'Social Links Verified'],
                        required: true,
                        fullWidth: true
                    },
                    {
                        id: 'smart_links',
                        label: 'Smart Links & Pre-Saves',
                        type: 'text',
                        placeholder: 'Paste your Linkfire / Pre-save URL here...',
                        required: true,
                        fullWidth: true
                    }
                ]
            },
            {
                id: 'launch_protocol',
                title: 'The Launch Day Protocol',
                description: 'Execute the drop with precision.',
                fields: [
                    {
                        id: 'run_of_show',
                        label: 'Launch Day Run of Show',
                        type: 'array',
                        maxItems: 20,
                        itemLabel: 'Action Item',
                        fields: [
                            {
                                id: 'time',
                                label: 'Time',
                                type: 'text',
                                placeholder: 'e.g. 9:00 AM',
                                required: true
                            },
                            {
                                id: 'action',
                                label: 'Action',
                                type: 'text',
                                placeholder: 'e.g. Post "Out Now" Reel',
                                required: true
                            },
                            {
                                id: 'platform',
                                label: 'Platform',
                                type: 'select',
                                options: ['Instagram', 'TikTok', 'Twitter/X', 'YouTube', 'Email/SMS', 'Discord'],
                                required: true
                            }
                        ]
                    },
                    {
                        id: 'announcement_copy',
                        label: 'The Announcement',
                        type: 'textarea',
                        placeholder: 'Draft your main "Out Now" caption. Tell the story one last time.',
                        required: true,
                        aiEnabled: true
                    }
                ]
            },
            {
                id: 'post_launch',
                title: 'Momentum & Optimization',
                description: 'Keep the energy alive.',
                fields: [
                    {
                        id: 'sustainability_actions',
                        label: 'Post-Launch Actions',
                        type: 'multiselect',
                        options: ['Repost Fan Stories', 'Reply to All DMs/Comments', 'Send "Thank You" Email to Superfans', 'Update Website Homepage', 'Submit to Third-Party Playlists'],
                        required: true
                    },
                    {
                        id: 'content_waterfall',
                        label: 'Content Waterfall',
                        type: 'multiselect',
                        options: ['Lyric Video', 'Visualizer', 'Acoustic Version', 'Remix Pack', 'Behind the Scenes Doc', 'Merch Drop'],
                        required: true
                    },
                    {
                        id: 'pivot_scenarios',
                        label: 'Pivot Scenarios',
                        type: 'textarea',
                        placeholder: 'If the song goes viral on TikTok, what do we do? If it flops, what is the backup plan?',
                        required: false,
                        aiEnabled: true
                    },
                    {
                        id: 'review_cycle',
                        label: 'Review Rhythm',
                        type: 'select',
                        options: ['Daily Stats Check (First Week)', 'Weekly Strategy Review', 'Monthly Deep Dive', 'Quarterly Pivot'],
                        required: true
                    }
                ]
            }
        ]
    }

];

