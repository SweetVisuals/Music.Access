import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Check, ChevronDown, Sparkles, X } from 'lucide-react';

interface WeeklyScheduleProps {
    value: any;
    onChange: (val: any) => void;
    strategyData: any;
}

// Custom Dropdown Component
const CustomSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select...",
    groups = false
}: {
    options: any[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    groups?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = (() => {
        if (!value) return null;
        if (groups) {
            for (const group of options) {
                const found = group.items.find((opt: any) => opt.value === value);
                if (found) return found.label;
            }
            return value;
        }
        const found = options.find(opt => opt.value === value);
        return found ? found.label : value;
    })();

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white flex items-center justify-between hover:border-primary/50 transition-colors"
            >
                <span className={selectedLabel ? "text-white" : "text-neutral-500"}>
                    {selectedLabel || placeholder}
                </span>
                <ChevronDown size={14} className={`text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                    {groups ? (
                        options.map((group, gIdx) => (
                            <div key={gIdx} className="p-1">
                                <div className="text-[10px] font-bold text-neutral-500 uppercase px-2 py-1">{group.label}</div>
                                {group.items.map((opt: any) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className="w-full text-left px-2 py-1.5 rounded hover:bg-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors flex items-center justify-between"
                                    >
                                        <span>{opt.label}</span>
                                        {value === opt.value && <Check size={12} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        ))
                    ) : (
                        <div className="p-1">
                            {options.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors flex items-center justify-between"
                                >
                                    <span>{opt.label}</span>
                                    {value === opt.value && <Check size={12} className="text-primary" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({ value, onChange, strategyData }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const schedule = value || {}; // { [day]: [{ type, name, id }] }
    const [focusedDay, setFocusedDay] = useState<string | null>(null);

    // Form State
    const [selectedType, setSelectedType] = useState<string>('campaign'); // 'campaign' or 'bucket'
    const [selectedItem, setSelectedItem] = useState<string>('');

    // Fetch Options
    const campaigns = strategyData?.['stage-5']?.data?.campaigns || [];
    const buckets = strategyData?.['stage-6']?.data?.bucket_list || [];

    // Construct Options for Dropdown
    const itemOptions = [
        {
            label: 'Marketing Campaigns',
            items: campaigns.map((c: any) => ({ label: c.name, value: `campaign:${c.name}` }))
        },
        {
            label: 'Content Buckets',
            items: buckets.map((b: any) => ({ label: b.name, value: `bucket:${b.name}` }))
        }
    ];

    const handleAddItem = (day: string) => {
        if (!selectedItem) return;

        const [type, name] = selectedItem.split(':');
        const newItem = { type, name };
        const currentDayItems = schedule[day] || [];

        onChange({ ...schedule, [day]: [...currentDayItems, newItem] });

        // Reset selection but keep day open
        setSelectedItem('');
    };

    return (
        <div className="space-y-4">
            {/* 
                Improved Grid Layout:
                - md:grid-cols-2 (2 columns on tablet/small desktop)
                - xl:grid-cols-3 (3 columns on large desktop)
                - This replaces the previous 4-col layout which was too thin
            */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {days.map((day) => (
                    <div
                        key={day}
                        className={`
                            bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 flex flex-col gap-4 min-h-[220px] transition-all duration-300
                            ${focusedDay === day ? 'border-primary/50 shadow-[0_0_20px_-10px_var(--primary)] bg-neutral-900/60' : 'hover:border-neutral-700 hover:bg-neutral-900/50'}
                        `}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                            <h4 className="font-bold text-lg text-neutral-200">{day}</h4>
                            <button
                                onClick={() => {
                                    if (focusedDay === day) {
                                        setFocusedDay(null);
                                    } else {
                                        setFocusedDay(day);
                                        setSelectedItem('');
                                        setSelectedType('campaign');
                                    }
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${focusedDay === day ? 'bg-primary text-black' : 'hover:bg-neutral-800 text-neutral-500 hover:text-white'}`}
                            >
                                {focusedDay === day ? <X size={16} /> : <Plus size={16} />}
                            </button>
                        </div>

                        {/* List Scheduled Items */}
                        <div className="flex-1 space-y-2.5">
                            {schedule[day]?.map((item: any, idx: number) => (
                                <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs flex items-center justify-between group hover:border-neutral-700 transition-colors">
                                    <div className="flex flex-col">
                                        <span className={`text-[9px] font-black uppercase tracking-wider mb-1 ${item.type === 'campaign' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                                            {item.type === 'campaign' ? 'Campaign' : 'Bucket'}
                                        </span>
                                        <span className="text-neutral-300 font-bold text-sm">{item.name}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newSchedule = { ...schedule };
                                            newSchedule[day] = newSchedule[day].filter((_: any, i: number) => i !== idx);
                                            onChange(newSchedule);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-500 bg-neutral-900 hover:bg-neutral-800 rounded-md transition-all"
                                        title="Remove"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                            {(!schedule[day] || schedule[day].length === 0) && focusedDay !== day && (
                                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-neutral-800/50 rounded-lg opacity-40 p-4 min-h-[100px]">
                                    <span className="text-xs font-bold text-neutral-500">Free Day</span>
                                </div>
                            )}
                        </div>

                        {/* Add Slot Form */}
                        {focusedDay === day && (
                            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 animate-in fade-in slide-in-from-top-2 space-y-3 shadow-2xl relative z-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Add New Item</span>
                                </div>

                                <div className="space-y-2">
                                    <CustomSelect
                                        options={itemOptions}
                                        value={selectedItem}
                                        onChange={setSelectedItem}
                                        placeholder="Select Content or Campaign..."
                                        groups={true}
                                    />
                                </div>

                                <button
                                    onClick={() => handleAddItem(day)}
                                    disabled={!selectedItem}
                                    className="w-full bg-primary text-black text-xs font-bold py-2.5 rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} /> Add to Schedule
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeeklySchedule;
