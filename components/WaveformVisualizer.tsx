import React, { useMemo } from 'react';

interface WaveformVisualizerProps {
    isPlaying: boolean;
    color?: string;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ isPlaying, color = 'bg-white' }) => {
    // Generate bars with random characteristics
    const bars = useMemo(() => Array.from({ length: 24 }).map(() => ({
        peakHeight: 40 + Math.random() * 60, // 40% to 100%
        speed: 0.6 + Math.random() * 0.6,
        delay: Math.random() * -1.0 // Random start time modifier
    })), []);

    return (
        <div className="w-full h-12 flex items-center justify-center gap-[3px] px-2 overflow-hidden">
            <style>{`
                @keyframes vivid-wave {
                    0%, 100% { transform: scaleY(0.3); opacity: 0.5; }
                    50% { transform: scaleY(1); opacity: 1; }
                }
                .vivid-bar {
                    animation: vivid-wave 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    transform-origin: bottom;
                    border-radius: 999px;
                }
            `}</style>

            <div className="flex items-end justify-center gap-[3px] h-full">
                {bars.map((bar, i) => (
                    <div
                        key={i}
                        className={`vivid-bar w-1.5 ${color}`}
                        style={{
                            height: `${bar.peakHeight}%`,
                            animationDuration: isPlaying ? `${bar.speed}s` : '0s',
                            animationPlayState: isPlaying ? 'running' : 'paused',
                            animationDelay: `${bar.delay}s`
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
};

export default WaveformVisualizer;
