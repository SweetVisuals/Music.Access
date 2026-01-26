import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Trophy, ArrowRight, User, Image as ImageIcon, FileText, Gem } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileCompletionAlertProps {
    userProfile: UserProfile;
    hasGivenGem: boolean;
}

const ProfileCompletionAlert: React.FC<ProfileCompletionAlertProps> = ({ userProfile, hasGivenGem }) => {
    const navigate = useNavigate();

    const steps = useMemo(() => [
        {
            id: 'avatar',
            label: 'Upload Profile Picture',
            icon: <User size={14} />,
            isComplete: !!userProfile.avatar && !userProfile.avatar.includes('placeholder'),
            action: () => navigate('/settings')
        },
        {
            id: 'banner',
            label: 'Upload Banner',
            icon: <ImageIcon size={14} />,
            isComplete: !!userProfile.banner,
            action: () => navigate('/settings')
        },
        {
            id: 'bio',
            label: 'Add a Bio',
            icon: <FileText size={14} />,
            isComplete: !!userProfile.bio && userProfile.bio.trim().length > 0,
            action: () => navigate('/settings')
        },
        {
            id: 'gem',
            label: 'Give a Gem to a Creator',
            icon: <Gem size={14} />,
            isComplete: hasGivenGem,
            action: () => navigate('/') // Go to discover to find projects
        }
    ], [userProfile, hasGivenGem, navigate]);

    const completedCount = steps.filter(s => s.isComplete).length;
    const progress = (completedCount / steps.length) * 100;
    const isFullyComplete = completedCount === steps.length;

    // Check if visibility requirements are met (Avatar + Banner + Bio)
    // Gem is extra for 100% but not for visibility
    const visibilitySteps = steps.filter(s => s.id !== 'gem');
    const isVisible = visibilitySteps.every(s => s.isComplete);

    if (isFullyComplete) return null;

    return (
        <div className="mb-8 rounded-xl overflow-hidden border border-primary/20 bg-gradient-to-r from-neutral-900 to-black relative group animate-in slide-in-from-top-4 duration-500">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="p-5 md:p-6 relative z-10 flex flex-col md:flex-row gap-6 md:items-center justify-between">

                {/* Left: Info */}
                <div className="flex flex-col gap-2 max-w-xl">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                            <Trophy size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Complete Your Profile</h3>
                    </div>

                    <p className="text-sm text-neutral-400 leading-relaxed">
                        {!isVisible
                            ? "Your profile is currently hidden from Discover. Complete the checklist to unlock visibility and start growing your audience."
                            : "Great job! Your profile is visible. Give a Gem to reach 100% completion."
                        }
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-4 max-w-sm">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-1000 ease-out rounded-full relative"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Checklist */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[280px]">
                    {steps.map((step) => (
                        <button
                            key={step.id}
                            onClick={step.action}
                            disabled={step.isComplete}
                            className={`
                                flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                                ${step.isComplete
                                    ? 'bg-neutral-900/50 border-white/5 opacity-60'
                                    : 'bg-neutral-800/80 border-white/10 hover:bg-neutral-800 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 group/btn'
                                }
                            `}
                        >
                            <div className={`
                                shrink-0 w-5 h-5 rounded-full flex items-center justify-center border transition-colors
                                ${step.isComplete
                                    ? 'bg-green-500/20 border-green-500 text-green-500'
                                    : 'bg-transparent border-neutral-600 text-transparent group-hover/btn:border-primary'
                                }
                            `}>
                                {step.isComplete && <CheckCircle2 size={12} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className={`text-xs font-bold truncate ${step.isComplete ? 'text-neutral-500 line-through' : 'text-neutral-200 group-hover/btn:text-white'}`}>
                                    {step.label}
                                </div>
                            </div>

                            {!step.isComplete && (
                                <ArrowRight size={12} className="text-neutral-500 group-hover/btn:text-primary transition-transform group-hover/btn:translate-x-1" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfileCompletionAlert;
