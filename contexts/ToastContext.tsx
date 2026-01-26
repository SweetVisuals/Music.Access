import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: React.ReactNode;
}

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        const timer = setTimeout(() => {
            handleDismiss();
        }, toast.duration || 3000);

        return () => clearTimeout(timer);
    }, [toast.duration]);

    const handleDismiss = () => {
        setIsVisible(false); // Trigger exit animation
        setTimeout(() => {
            onDismiss(toast.id);
        }, 300); // Wait for animation
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <Check size={18} className="text-primary" />;
            case 'error': return <AlertCircle size={18} className="text-red-500" />;
            case 'warning': return <AlertTriangle size={18} className="text-yellow-500" />;
            default: return <Info size={18} className="text-blue-500" />;
        }
    };

    const getColors = () => {
        switch (toast.type) {
            case 'success': return { border: 'border-primary/20', bg: 'bg-primary/5', text: 'text-white' };
            case 'error': return { border: 'border-red-500/20', bg: 'bg-red-500/5', text: 'text-white' };
            case 'warning': return { border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', text: 'text-white' };
            default: return { border: 'border-white/10', bg: 'bg-white/5', text: 'text-white' };
        }
    };

    const colors = getColors();

    return (
        <div
            className={`
                pointer-events-auto flex items-center gap-4 p-4 rounded-2xl border bg-[#111] shadow-2xl w-full max-w-sm
                transition-all duration-300 ease-out transform
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                ${colors.border}
            `}
            role="alert"
        >
            <div className={`p-2 rounded-xl bg-white/5 shrink-0 border border-white/5`}>
                {getIcon()}
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white mb-0.5 capitalize">{toast.type}</h4>
                <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                    {toast.message}
                </p>
            </div>

            <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-white transition-colors self-start -mr-1 -mt-1"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {createPortal(
                <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none w-full max-w-sm px-4 md:px-0">
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
};
