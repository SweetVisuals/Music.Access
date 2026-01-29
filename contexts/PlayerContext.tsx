import React, { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';

interface PlayerContextType {
    audioRef: React.RefObject<HTMLAudioElement>;
    currentTime: number;
    duration: number;
    isScrubbing: boolean;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    setIsScrubbing: (isScrubbing: boolean) => void;
    seek: (time: number) => void;
    skip: (seconds: number) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isScrubbing, setIsScrubbing] = useState(false);

    const seek = useCallback((time: number) => {
        // Clamp time
        const newTime = Math.max(0, Math.min(time, duration));
        setCurrentTime(newTime);
        if (audioRef.current) {
            audioRef.current.currentTime = newTime;
        }
    }, [duration]);

    const skip = useCallback((seconds: number) => {
        if (audioRef.current) {
            const newTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, duration || audioRef.current.duration));
            audioRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    }, [duration]);

    return (
        <PlayerContext.Provider
            value={{
                audioRef,
                currentTime,
                duration,
                isScrubbing,
                setCurrentTime,
                setDuration,
                setIsScrubbing,
                seek,
                skip,
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayer = () => {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
};
