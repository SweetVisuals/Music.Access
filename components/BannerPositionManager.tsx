
import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, Smartphone, Monitor } from 'lucide-react';

interface BannerSettings {
    x: number;
    y: number;
    scale: number;
}

interface BannerPositionManagerProps {
    imageUrl: string;
    initialSettings?: BannerSettings;
    onSave: (settings: BannerSettings) => void;
    onCancel: () => void;
}

const BannerPositionManager: React.FC<BannerPositionManagerProps> = ({
    imageUrl,
    initialSettings,
    onSave,
    onCancel
}) => {
    const [settings, setSettings] = useState<BannerSettings>(initialSettings || { x: 50, y: 50, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Desktop Aspect Ratio (~4:1)
    const toggleZoom = (delta: number) => {
        setSettings(prev => ({
            ...prev,
            scale: Math.max(1, Math.min(3, prev.scale + delta))
        }));
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;

        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        // Calculate sensitivity based on the container's size to ensure limits are respected 1:1
        // 100% means moving the image one full width/height.
        const container = e.currentTarget as HTMLElement; // e.target might be correct if capturing, but safer to rely on ref or currentTarget if capturing is on target.
        // Since we did setPointerCapture on e.target, e.target is the element. 
        // We attached handler to the div.
        const width = container.clientWidth || 1;
        const height = container.clientHeight || 1;

        const deltaXPercent = (deltaX / width) * 100;
        const deltaYPercent = (deltaY / height) * 100;

        setSettings(prev => {
            return {
                ...prev,
                x: prev.x + deltaXPercent,
                y: prev.y + deltaYPercent,
                scale: prev.scale
            };
        });

        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    // Render Preview
    // We use a container with overflow hidden.
    // The image inside is scaled and translated.
    // Wait, translate(50%, 50%) moves it right/down. 
    // object-position: 50% 50% is center. 
    // We want to simulate "Position".
    // If we use transform: translate(x%, y%), 0% is start.
    // Let's use `transform: translate(${settings.x - 50}%, ${settings.y - 50}%) scale(${settings.scale})`
    // If settings.x = 50, transform x is 0%.

    const getTransform = () => {
        const xOffset = settings.x - 50;
        const yOffset = settings.y - 50;
        return `translate(${xOffset}%, ${yOffset}%) scale(${settings.scale})`;
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200 h-[100dvh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-white/10 bg-neutral-900/50 shrink-0">
                <h3 className="text-white font-bold text-base lg:text-lg">Adjust Banner Position</h3>
                <div className="flex items-center gap-3">
                    <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full text-neutral-400 transition-colors">
                        <X size={20} />
                    </button>
                    <button onClick={() => onSave(settings)} className="px-4 lg:px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm lg:text-base">
                        <Check size={16} /> Save
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-10 flex flex-col items-center gap-6 lg:gap-8 pb-32 lg:pb-10">

                {/* Desktop Preview (Interactive) */}
                <div className="w-full max-w-4xl space-y-2">
                    <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                        <Monitor size={14} /> Desktop View (Interactive)
                    </div>
                    {/* Desktop Container: Aspect Ratio 4:1 */}
                    <div
                        ref={containerRef}
                        className="w-full aspect-[4/1] bg-neutral-900 rounded-xl overflow-hidden border-2 border-dashed border-white/10 relative cursor-move group touch-none select-none"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                        {/* Grid Overlay for visual aid */}
                        <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

                        <img
                            src={imageUrl}
                            className="w-full h-full object-cover origin-center transition-transform duration-75 ease-out select-none pointer-events-none"
                            style={{ transform: getTransform() }}
                            draggable={false}
                        />

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                            <div className="w-4 h-4 border border-white/50 rounded-full bg-white/20 backdrop-blur-[1px]" />
                        </div>
                    </div>
                    <p className="text-neutral-500 text-xs text-center">Drag to reposition • Use slider to zoom</p>
                </div>

                {/* Controls */}
                <div className="w-full max-w-md bg-neutral-900/50 p-4 rounded-xl border border-white/5 backdrop-blur-sm sticky lg:static bottom-0 z-20 mb-safe-area-bottom">
                    <div className="flex items-center gap-4">
                        <button onClick={() => toggleZoom(-0.1)} className="p-2 text-neutral-400 hover:text-white transition-colors">
                            <ZoomOut size={20} />
                        </button>
                        <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.05"
                            value={settings.scale}
                            onChange={(e) => setSettings(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                            className="flex-1 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <button onClick={() => toggleZoom(0.1)} className="p-2 text-neutral-400 hover:text-white transition-colors">
                            <ZoomIn size={20} />
                        </button>
                    </div>
                </div>

                {/* Mobile Preview (Interactive) */}
                <div className="w-full max-w-[300px] lg:max-w-[375px] space-y-2 pb-8">
                    <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                        <Smartphone size={14} /> Mobile View
                    </div>
                    {/* Mobile Container: Matches standard mobile header height roughly, often square or 16:9 */}
                    <div
                        className="w-full aspect-[4/3] bg-neutral-900 rounded-xl overflow-hidden border border-white/10 relative shadow-2xl cursor-move group touch-none select-none"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                        {/* Grid Overlay for visual aid */}
                        <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

                        {/* Phone Notch Mockup (Optional - adds realism) */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 lg:h-6 bg-black z-20 rounded-b-xl pointer-events-none" />

                        <img
                            src={imageUrl}
                            className="w-full h-full object-cover origin-center transition-transform duration-75 ease-out select-none pointer-events-none"
                            style={{ transform: getTransform() }}
                            draggable={false}
                        />

                        {/* UI Overlay Mockup */}
                        <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
                            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-neutral-800 border-2 border-black" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BannerPositionManager;
