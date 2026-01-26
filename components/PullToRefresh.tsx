import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    disabled?: boolean;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, disabled = false }) => {
    const [startY, setStartY] = useState<number | null>(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showIndicator, setShowIndicator] = useState(false);

    const threshold = 80; // Distance needed to trigger refresh
    const maxPull = 120; // Maximum pull distance
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: TouchEvent) => {
        if (disabled || isRefreshing) return;

        // Check if we are at the top of the scroll container
        // We check the parent element as it's typically the one with overflow-y-auto
        const scrollContainer = containerRef.current?.parentElement;
        const scrollTop = scrollContainer ? scrollContainer.scrollTop : (window.scrollY || document.documentElement.scrollTop);

        if (scrollTop <= 0) {
            setStartY(e.touches[0].pageY);
            setShowIndicator(true);
        }
    };

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (startY === null || isRefreshing) return;

        const currentY = e.touches[0].pageY;
        const diff = currentY - startY;

        if (diff > 0) {
            // Prevent default scrolling when pulling down at the top
            if (e.cancelable) e.preventDefault();

            // Add resistance to the pull
            const distance = Math.min(diff * 0.4, maxPull);
            setPullDistance(distance);
        } else {
            setStartY(null);
            setPullDistance(0);
            setShowIndicator(false);
        }
    }, [startY, isRefreshing]);

    const handleTouchEnd = useCallback(async () => {
        if (startY === null || isRefreshing) return;

        if (pullDistance >= threshold) {
            setIsRefreshing(true);
            setPullDistance(threshold); // Lock at threshold during refresh

            try {
                await onRefresh();
            } finally {
                // Smoothly close
                setTimeout(() => {
                    setIsRefreshing(false);
                    setPullDistance(0);
                    setStartY(null);
                    setTimeout(() => setShowIndicator(false), 300);
                }, 500);
            }
        } else {
            setPullDistance(0);
            setStartY(null);
            setTimeout(() => setShowIndicator(false), 300);
        }
    }, [startY, isRefreshing, pullDistance, onRefresh]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        el.addEventListener('touchstart', handleTouchStart, { passive: false });
        el.addEventListener('touchmove', handleTouchMove, { passive: false });
        el.addEventListener('touchend', handleTouchEnd);

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchMove, handleTouchEnd, disabled, isRefreshing]);

    // Calculate rotation based on pull distance
    const rotation = (pullDistance / threshold) * 360;

    // We want 1:1 movement for the content to reveal the background
    const contentTranslateY = pullDistance > 0 ? pullDistance : 0;

    return (
        <div ref={containerRef} className="relative w-full overflow-x-hidden">
            {/* Reveal Panel - Full Width Background */}
            <div
                className="absolute top-0 left-0 w-full flex items-center justify-center bg-neutral-800 z-0"
                style={{
                    height: `${Math.max(pullDistance, 0)}px`,
                    opacity: pullDistance > 0 ? 1 : 0,
                    transition: isRefreshing ? 'height 0.2s ease-out' : 'none'
                }}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={isRefreshing ? 'animate-spin' : ''}>
                        <RefreshCw
                            size={20}
                            className={`${pullDistance >= threshold || isRefreshing ? 'text-primary' : 'text-neutral-400'} transition-colors duration-200`}
                            style={{
                                transform: isRefreshing ? 'none' : `rotate(${rotation}deg)`,
                                transition: isRefreshing ? 'none' : 'transform 0.1s linear'
                            }}
                        />
                    </div>
                    <span className={`text-sm font-bold tracking-wide transition-colors duration-200 ${pullDistance >= threshold || isRefreshing ? 'text-primary' : 'text-neutral-400'}`}>
                        {isRefreshing ? 'REFRESHING...' : pullDistance >= threshold ? 'RELEASE TO REFRESH' : 'PULL TO REFRESH'}
                    </span>
                </div>
            </div>

            {/* Content Container */}
            <div
                className="relative z-10 bg-[#050505] min-h-[calc(100vh-120px)] transition-transform duration-200 ease-out will-change-transform"
                style={{
                    transform: `translateY(${contentTranslateY}px)`
                }}
            >
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default PullToRefresh;
