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
            case 'success': return <Check size={18} className="text-green-500" />;
            case 'error': return <AlertCircle size={18} className="text-red-500" />;
            case 'warning': return <AlertTriangle size={18} className="text-yellow-500" />;
            default: return <Info size={18} className="text-blue-500" />;
        }
    };

    const getColors = () => {
        switch (toast.type) {
            case 'success': return 'border-green-500/20 bg-green-500/10 text-green-100';
            case 'error': return 'border-red-500/20 bg-red-500/10 text-red-100';
            case 'warning': return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-100';
            default: return 'border-blue-500/20 bg-blue-500/10 text-blue-100';
        }
    };

    return (
        <div
            className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.5)]
                transition-all duration-300 ease-out transform
                ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
                ${getColors()}
            `}
            role="alert"
        >
            <div className={`p-1.5 rounded-full bg-black/20 shrink-0`}>
                {getIcon()}
            </div>
            <p className="text-sm font-medium pr-2 max-w-[250px] md:max-w-[350px] leading-relaxed">
                {toast.message}
            </p>
            <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-black/20 text-current/50 hover:text-current transition-colors ml-auto"
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
                <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none px-4 w-full md:w-auto">
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
};
