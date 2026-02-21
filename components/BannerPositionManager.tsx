
import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, Smartphone, Monitor } from 'lucide-react';

interface DeviceSettings {
    x: number;
    y: number;
    scale: number;
}

interface BannerSettings {
    desktop: DeviceSettings;
    mobile: DeviceSettings;
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
    const [settings, setSettings] = useState<BannerSettings>(() => {
        if (initialSettings && 'desktop' in initialSettings) {
            return initialSettings;
        }
        // Migration: fallback for old single-object settings format
        const old = initialSettings as any;
        const defaultSet = { x: 50, y: 50, scale: 1 };
        if (old && typeof old.x === 'number') {
            return {
                desktop: { x: old.x, y: old.y, scale: old.scale },
                mobile: { x: old.x, y: old.y, scale: old.scale }
            };
        }
        return {
            desktop: { ...defaultSet },
            mobile: { ...defaultSet }
        };
    });
    const [activeDevice, setActiveDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const toggleZoom = (delta: number) => {
        setSettings(prev => ({
            ...prev,
            [activeDevice]: {
                ...prev[activeDevice],
                scale: Math.max(1, Math.min(3, prev[activeDevice].scale + delta))
            }
        }));
    };

    const handlePointerDown = (e: React.PointerEvent, device: 'desktop' | 'mobile') => {
        setIsDragging(true);
        setActiveDevice(device);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent, device: 'desktop' | 'mobile') => {
        if (!isDragging) return;

        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        const container = e.currentTarget as HTMLElement;
        const width = container.clientWidth || 1;
        const height = container.clientHeight || 1;

        // Invert direction: dragging right should reveal left side (decrease x)
        const deltaXPercent = -(deltaX / width) * 100;
        const deltaYPercent = -(deltaY / height) * 100;

        setSettings(prev => ({
            ...prev,
            [device]: {
                ...prev[device],
                x: Math.max(0, Math.min(100, prev[device].x + deltaXPercent)),
                y: Math.max(0, Math.min(100, prev[device].y + deltaYPercent))
            }
        }));

        dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    };

    const getStyles = (device: 'desktop' | 'mobile') => {
        const deviceSettings = settings[device];
        return {
            objectPosition: `${deviceSettings.x}% ${deviceSettings.y}%`,
            transform: deviceSettings.scale !== 1 ? `scale(${deviceSettings.scale})` : undefined
        };
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
                <div className={`w-full max-w-4xl space-y-2 transition-opacity duration-300 ${activeDevice === 'mobile' ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                        <Monitor size={14} /> Desktop View (Interactive)
                        {activeDevice === 'desktop' && <span className="text-primary text-[10px] lowercase font-normal ml-2 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Selected</span>}
                    </div>
                    <div
                        className={`w-full aspect-[4/1] bg-neutral-900 rounded-xl overflow-hidden border-2 relative cursor-move group touch-none select-none transition-colors duration-300 ${activeDevice === 'desktop' ? 'border-primary/50' : 'border-dashed border-white/10'}`}
                        onPointerDown={(e) => handlePointerDown(e, 'desktop')}
                        onPointerMove={(e) => handlePointerMove(e, 'desktop')}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                        <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

                        <img
                            src={imageUrl}
                            className="w-full h-full object-cover origin-center transition-all duration-75 ease-out select-none pointer-events-none"
                            style={getStyles('desktop')}
                            draggable={false}
                        />

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                            <div className="w-4 h-4 border border-white/50 rounded-full bg-white/20 backdrop-blur-[1px]" />
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="w-full max-w-md bg-neutral-900 shadow-xl p-4 rounded-xl border border-white/10 backdrop-blur-sm sticky lg:static bottom-0 z-20 pb-[env(safe-area-inset-bottom)]">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                {activeDevice === 'desktop' ? <Monitor size={12} /> : <Smartphone size={12} />}
                                {activeDevice} Zoom
                            </span>
                            <span className="text-[10px] text-primary font-mono">{Math.round(settings[activeDevice].scale * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => toggleZoom(-0.1)} className="p-2 text-neutral-400 hover:text-white transition-colors">
                                <ZoomOut size={20} />
                            </button>
                            <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.01"
                                value={settings[activeDevice].scale}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    [activeDevice]: { ...prev[activeDevice], scale: parseFloat(e.target.value) }
                                }))}
                                className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <button onClick={() => toggleZoom(0.1)} className="p-2 text-neutral-400 hover:text-white transition-colors">
                                <ZoomIn size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Preview (Interactive) */}
                <div className={`w-full max-w-[300px] lg:max-w-[375px] space-y-2 pb-8 transition-opacity duration-300 ${activeDevice === 'desktop' ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}>
                    <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                        <Smartphone size={14} /> Mobile View (Interactive)
                        {activeDevice === 'mobile' && <span className="text-primary text-[10px] lowercase font-normal ml-2 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Selected</span>}
                    </div>
                    <div
                        className={`w-full aspect-[4/3] bg-neutral-900 rounded-xl overflow-hidden border-2 relative shadow-2xl cursor-move group touch-none select-none transition-colors duration-300 ${activeDevice === 'mobile' ? 'border-primary/50' : 'border-white/10'}`}
                        onPointerDown={(e) => handlePointerDown(e, 'mobile')}
                        onPointerMove={(e) => handlePointerMove(e, 'mobile')}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                        <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />

                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 lg:h-6 bg-black z-20 rounded-b-xl pointer-events-none" />

                        <img
                            src={imageUrl}
                            className="w-full h-full object-cover origin-center transition-all duration-75 ease-out select-none pointer-events-none"
                            style={getStyles('mobile')}
                            draggable={false}
                        />

                        <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
                            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-neutral-800 border-2 border-black" />
                        </div>
                    </div>
                    <p className="text-neutral-500 text-[10px] text-center pt-2 italic">Dragging values are saved independently for each device</p>
                </div>

            </div>
        </div>
    );
};

export default BannerPositionManager;
