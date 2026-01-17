import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    icon?: React.ReactNode;
    containerClassName?: string;
    noLabel?: boolean;
    hideControls?: boolean;
}

const CustomInput: React.FC<CustomInputProps> = ({
    label,
    error,
    fullWidth = true,
    noLabel = false,
    hideControls = false,
    className = "",
    containerClassName = "",
    type,
    icon,
    value,
    onChange,
    id,
    ...props
}) => {
    // Custom number handling
    const handleIncrement = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'number' && onChange) {
            const val = Number(value) || 0;
            const step = Number(props.step) || 1;
            const max = props.max !== undefined ? Number(props.max) : Infinity;

            if (val + step <= max) {
                const event = {
                    target: { value: String(val + step), name: props.name }
                } as any;
                onChange(event);
            }
        }
    };

    const handleDecrement = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (type === 'number' && onChange) {
            const val = Number(value) || 0;
            const step = Number(props.step) || 1;
            const min = props.min !== undefined ? Number(props.min) : -Infinity;

            if (val - step >= min) {
                const event = {
                    target: { value: String(val - step), name: props.name }
                } as any;
                onChange(event);
            }
        }
    };

    return (
        <div className={`${fullWidth ? 'w-full' : ''} flex flex-col gap-1.5 ${containerClassName}`}>
            {label && !noLabel && (
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-primary transition-colors pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    id={id}
                    className={`
                        w-full bg-neutral-900 border border-transparent rounded-xl px-4 py-3
                        text-sm font-semibold text-white placeholder-neutral-600
                        transition-all duration-200
                        hover:border-white/20 hover:bg-[#0c0c0c]
                        focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                        ${icon ? 'pl-11' : ''}
                        ${type === 'number' && !hideControls ? 'pr-20' : ''}
                        ${error ? 'border-red-500/50' : ''}
                        ${className}
                    `}
                    {...props}
                />

                {type === 'number' && !hideControls && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={handleDecrement}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        >
                            <Minus size={12} />
                        </button>
                        <div className="w-[1px] h-3 bg-white/5"></div>
                        <button
                            type="button"
                            onClick={handleIncrement}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-[10px] text-red-500 ml-1 font-medium">{error}</p>}
        </div>
    );
};

export default CustomInput;
