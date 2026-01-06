import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface DropdownOption {
    value: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}

interface CustomDropdownProps {
    options: (DropdownOption | string)[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    searchable?: boolean;
    error?: string;
    fullWidth?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    label,
    className = "",
    searchable = false,
    error,
    fullWidth = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Normalize options to DropdownOption format
    const normalizedOptions: DropdownOption[] = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    const selectedOption = normalizedOptions.find(opt => opt.value === value);

    const filteredOptions = searchable
        ? normalizedOptions.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            opt.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : normalizedOptions;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div className={`relative ${fullWidth ? 'w-full' : ''} ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 ml-1">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={toggleDropdown}
                className={`
                    w-full flex items-center justify-between px-4 py-3 
                    bg-neutral-900 border ${isOpen ? 'border-primary/50 bg-[#0c0c0c]' : 'border-neutral-800'} 
                    rounded-xl text-sm font-medium text-white transition-all duration-200
                    hover:border-neutral-700 hover:bg-[#0c0c0c]
                    ${error ? 'border-red-500/50' : ''}
                    focus:outline-none focus:ring-1 focus:ring-primary/20
                `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
                    <span className={`truncate ${!selectedOption ? 'text-neutral-500' : 'text-white font-semibold'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown
                    size={16}
                    className={`text-neutral-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-[200] mt-2 w-full glass-panel rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {searchable && (
                        <div className="p-2 border-b border-white/5">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-neutral-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-primary/50"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`
                                        w-full flex items-center justify-between px-4 py-2.5 
                                        text-sm transition-colors group
                                        ${option.value === value ? 'bg-primary/10 text-primary font-bold' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}
                                    `}
                                >
                                    <div className="flex flex-col items-start text-left overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            {option.icon && <span>{option.icon}</span>}
                                            <span className="truncate">{option.label}</span>
                                        </div>
                                        {option.description && (
                                            <span className="text-[10px] text-neutral-500 group-hover:text-neutral-400 truncate mt-0.5">
                                                {option.description}
                                            </span>
                                        )}
                                    </div>
                                    {option.value === value && <Check size={14} className="shrink-0" />}
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-6 text-center text-xs text-neutral-600 italic">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && <p className="mt-1.5 text-[10px] text-red-500 ml-1 font-medium">{error}</p>}
        </div>
    );
};

export default CustomDropdown;
