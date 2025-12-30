import React from 'react';

interface WaveformVisualizerProps {
    isPlaying: boolean;
    color?: string;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ isPlaying, color = 'bg-primary' }) => {
    // Generate a set of bars with varied heights for a "natural" wave look
    const bars = Array.from({ length: 40 }).map((_, i) => {
        // Create a symmetric wave pattern essentially
        // Midpoint is 20.
        const dist = Math.abs(i - 20);
        // Height diminishes as we go further from center, plus some randomness
        // Base height between 20% and 100%
        const baseHeight = Math.max(20, 100 - (dist * 4));
        // Add randomness for "alive" feel
        const randomHeight = baseHeight - (Math.random() * 20);

        return {
            height: `${Math.max(10, randomHeight)}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${0.6 + Math.random() * 0.4}s`
        };
    });

    return (
        <div className="w-full h-16 flex items-center justify-center gap-[2px] px-8 overflow-hidden">
            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: scaleY(1); opacity: 0.5; }
                    50% { transform: scaleY(0.4); opacity: 1; }
                }
                .wave-bar {
                    animation: bounce ease-in-out infinite;
                    transform-origin: center;
                }
                .paused .wave-bar {
                    animation-play-state: paused;
                    transform: scaleY(0.2); /* Settle to a low flat line when paused */
                    transition: transform 0.5s ease;
                }
            `}</style>

            <div className={`flex items-center justify-center gap-[3px] h-full w-full ${!isPlaying ? 'paused' : ''}`}>
                {bars.map((bar, i) => (
                    <div
                        key={i}
                        className={`wave-bar w-1 rounded-full ${color}`}
                        style={{
                            height: bar.height,
                            animationDelay: bar.animationDelay,
                            animationDuration: bar.animationDuration
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
};

export default WaveformVisualizer;
