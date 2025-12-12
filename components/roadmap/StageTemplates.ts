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
        title: 'The Period Or Era',
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
    }
];
