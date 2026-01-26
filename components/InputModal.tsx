import React, { useState, useEffect, useRef } from 'react';
import { X, Folder, FileText } from 'lucide-react';

interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    message?: string;
    initialValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    icon?: React.ReactNode;
}

const InputModal: React.FC<InputModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    initialValue = '',
    placeholder = 'Enter value...',
    confirmLabel = 'Confirm',
    icon
}) => {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!value.trim()) return;
        onConfirm(value.trim());
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-[#0a0a0a] border border-neutral-800 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-primary/10 text-primary">
                        {icon || <Folder size={24} />}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                    {message && (
                        <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                            {message}
                        </p>
                    )}

                    <input
                        ref={inputRef}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-primary/50 mb-6"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                    />

                    <div className="flex gap-3 w-full">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-neutral-900 border border-neutral-800 text-white font-bold rounded-xl text-xs hover:bg-neutral-800 transition-colors uppercase tracking-wide"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!value.trim()}
                            className="flex-1 py-3 font-bold rounded-xl text-xs transition-colors uppercase tracking-wide shadow-lg bg-primary text-black hover:bg-primary/90 shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InputModal;
