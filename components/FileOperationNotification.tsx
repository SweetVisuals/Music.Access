import React from 'react';
import { Loader2, Check, AlertCircle, X, Minimize2, Maximize2, Music, FileText, Image as ImageIcon, Folder } from 'lucide-react';
import { useFileOperation } from '../contexts/FileOperationContext';

export type OperationType = 'upload' | 'delete' | 'move';

export interface OperationItem {
    id: string;
    name: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number; // 0-100
    error?: string;
    type?: 'audio' | 'image' | 'text' | 'folder';
}

export interface FileOperationState {
    isActive: boolean;
    type: OperationType;
    items: OperationItem[];
    total: number;
    completed: number;
    errored: number;
    isMinimized?: boolean;
}

interface FileOperationNotificationProps {
    state: FileOperationState;
    onClose: () => void;
    onToggleMinimize: () => void;
    onCancel?: () => void;
    bottomOffset?: string | number; // Dynamic bottom offset
}

const FileOperationNotification: React.FC<FileOperationNotificationProps> = ({ state, onClose, onToggleMinimize, onCancel, bottomOffset = 0 }) => {
    if (!state.isActive) return null;

    const percentComplete = state.total > 0 ? Math.round((state.completed / state.total) * 100) : 0;
    const isFinished = state.completed + state.errored === state.total && state.total > 0;

    // Determine titles and colors based on operation type
    const getMeta = () => {
        switch (state.type) {
            case 'upload': return {
                title: isFinished ? 'Upload Complete' : 'Uploading Files',
                color: 'text-primary',
                bgColor: 'bg-primary',
                icon: <Loader2 size={18} className="animate-spin text-primary" />
            };
            case 'delete': return {
                title: isFinished ? 'Deletion Complete' : 'Deleting Items',
                color: 'text-red-500',
                bgColor: 'bg-red-500',
                icon: <Loader2 size={18} className="animate-spin text-red-500" />
            };
            case 'move': return {
                title: isFinished ? 'Move Complete' : 'Moving Items',
                color: 'text-blue-500',
                bgColor: 'bg-blue-500',
                icon: <Loader2 size={18} className="animate-spin text-blue-500" />
            };
            default: return { title: 'Processing', color: 'text-white', bgColor: 'bg-white', icon: <Loader2 size={18} /> };
        }
    };

    const meta = getMeta();

    const getItemIcon = (type?: string) => {
        switch (type) {
            case 'audio': return <Music size={14} className="text-neutral-400" />;
            case 'image': return <ImageIcon size={14} className="text-neutral-400" />;
            case 'folder': return <Folder size={14} className="text-neutral-400" />;
            default: return <FileText size={14} className="text-neutral-400" />;
        }
    };

    if (state.isMinimized) {
        return (
            <div
                className="fixed right-6 z-[250] bg-[#111] border border-white/10 rounded-xl shadow-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 w-80 transition-all"
                style={{ bottom: typeof bottomOffset === 'number' ? `${bottomOffset + 24}px` : `calc(${bottomOffset} + 24px)` }}
            >
                <div className="relative">
                    {/* Circular Progress for minimized state */}
                    <svg className="w-10 h-10 transform -rotate-90">
                        <circle
                            className="text-neutral-800"
                            strokeWidth="4"
                            stroke="currentColor"
                            fill="transparent"
                            r="16"
                            cx="20"
                            cy="20"
                        />
                        <circle
                            className={meta.color}
                            strokeWidth="4"
                            strokeDasharray={100}
                            strokeDashoffset={100 - percentComplete}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="16"
                            cx="20"
                            cy="20"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                        {isFinished ? <Check size={12} className={meta.color} /> : `${percentComplete}%`}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{meta.title}</h4>
                    <p className="text-xs text-neutral-400 truncate">{state.completed} / {state.total} {state.type === 'upload' ? 'files' : 'items'}</p>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={onToggleMinimize} className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors">
                        <Maximize2 size={14} />
                    </button>
                    {isFinished && (
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed right-0 left-0 mx-4 md:left-auto md:mx-0 md:right-6 z-[250] md:w-96 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 flex flex-col max-h-[400px] transition-all"
            style={{ bottom: typeof bottomOffset === 'number' ? `${bottomOffset + 24}px` : `calc(${bottomOffset} + 24px)` }}
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    {!isFinished && (
                        <div className="relative">
                            <div className={`w-2.5 h-2.5 ${meta.bgColor} rounded-full animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`}></div>
                            <div className={`w-8 h-8 ${meta.bgColor}/20 rounded-full animate-ping opacity-75`}></div>
                        </div>
                    )}
                    {isFinished && (
                        <div className={`w-8 h-8 ${meta.bgColor}/10 rounded-full flex items-center justify-center border border-${meta.color}/20`}>
                            <Check size={14} className={meta.color} />
                        </div>
                    )}
                    <div>
                        <h4 className="text-sm font-bold text-white">{meta.title}</h4>
                        <p className="text-[10px] text-neutral-400 font-mono">
                            {state.completed} / {state.total} processed {state.errored > 0 && <span className="text-red-400">• {state.errored} errors</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onToggleMinimize} className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors">
                        <Minimize2 size={14} />
                    </button>
                    {isFinished && (
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-neutral-400 hover:text-white transition-colors">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Global Progress */}
            {!isFinished && (
                <div className="px-4 py-2 shrink-0">
                    <div className="w-full bg-neutral-800 rounded-full h-1 overflow-hidden">
                        <div
                            className={`${meta.bgColor} h-full rounded-full transition-all duration-300 ease-out relative`}
                            style={{ width: `${percentComplete}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Item List */}
            <div className="p-2 overflow-y-auto custom-scrollbar flex-1">
                {state.items.map((item) => (
                    <div key={item.id} className="p-2.5 mb-1 rounded-xl bg-neutral-900/50 border border-transparent hover:border-white/5 transition-colors group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                                    {getItemIcon(item.type)}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-medium text-neutral-300 truncate max-w-[150px]">{item.name}</div>
                                    <div className="text-[10px] text-neutral-500 capitalize">{item.status}</div>
                                </div>
                            </div>

                            {item.status === 'error' ? (
                                <AlertCircle size={14} className="text-red-500" />
                            ) : item.status === 'completed' ? (
                                <Check size={14} className="text-green-500" />
                            ) : (
                                <span className={`text-[10px] font-bold ${meta.color}`}>{item.progress}%</span>
                            )}
                        </div>

                        {/* Item Progress Bar */}
                        {item.status === 'processing' && (
                            <div className="w-full bg-neutral-800 rounded-full h-0.5 overflow-hidden">
                                <div
                                    className={`${meta.bgColor} h-full rounded-full transition-all duration-300 ease-out`}
                                    style={{ width: `${item.progress}%` }}
                                />
                            </div>
                        )}
                        {item.status === 'error' && item.error && (
                            <p className="text-[10px] text-red-400 mt-1">{item.error}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const FileOperationNotificationContainer: React.FC<{ bottomOffset?: string | number }> = ({ bottomOffset }) => {
    const { state, closeNotification, toggleMinimize, cancelOperation } = useFileOperation();

    React.useEffect(() => {
        const root = document.documentElement;
        if (state.isActive) {
            // Estimate height: minimized ~80px, expanded ~400px
            const height = state.isMinimized ? 80 : 400;
            root.style.setProperty('--file-op-height', `${height}px`);
            root.style.setProperty('--file-op-visible', '1');
        } else {
            root.style.setProperty('--file-op-height', '0px');
            root.style.setProperty('--file-op-visible', '0');
        }
    }, [state.isActive, state.isMinimized]);

    return (
        <FileOperationNotification
            state={state}
            onClose={closeNotification}
            onToggleMinimize={toggleMinimize}
            onCancel={cancelOperation}
            bottomOffset={bottomOffset}
        />
    );
};

export default FileOperationNotification;
