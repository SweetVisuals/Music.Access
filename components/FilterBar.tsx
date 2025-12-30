import React from 'react';
import { ChevronDown, Activity } from 'lucide-react';
import { GENRES, KEYS } from '../constants';
import { FilterState } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange }) => {

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, genre: e.target.value });
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, key: e.target.value });
  };

  return (
    <div className="flex flex-col space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Marketplace</h2>
        </div>

        <div className="flex items-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse"></span>
            LIVE FEED
          </span>
        </div>
      </div>

      <div className="w-full glass-panel p-4 lg:p-1.5 rounded-xl flex flex-col lg:flex-row items-stretch lg:items-center gap-4 lg:gap-2 lg:space-x-2">
        {/* Filters Container */}

        {/* Genre */}
        <div className="relative group w-full lg:w-auto">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <span className="text-[10px] font-mono text-neutral-500 uppercase">Genre</span>
          </div>
          <select
            className="w-full lg:w-auto appearance-none bg-black/40 border border-transparent text-white py-2 pl-16 pr-8 rounded-lg text-sm focus:outline-none focus:border-neutral-600 focus:bg-black hover:bg-white/5 transition-colors cursor-pointer font-medium"
            value={filters.genre}
            onChange={handleGenreChange}
          >
            {GENRES.map(g => <option key={g} value={g} className="bg-neutral-900">{g}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none" />
        </div>

        {/* Key */}
        <div className="relative group w-full lg:w-auto">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <span className="text-[10px] font-mono text-neutral-500 uppercase">Key</span>
          </div>
          <select
            className="w-full lg:w-auto appearance-none bg-black/40 border border-transparent text-white py-2 pl-12 pr-8 rounded-lg text-sm focus:outline-none focus:border-neutral-600 focus:bg-black hover:bg-white/5 transition-colors cursor-pointer font-medium"
            value={filters.key}
            onChange={handleKeyChange}
          >
            {KEYS.map(k => <option key={k} value={k} className="bg-neutral-900">{k}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none" />
        </div>

        <div className="h-px w-full bg-white/10 lg:h-6 lg:w-px lg:mx-2"></div>

        {/* BPM Range */}
        <div className="flex items-center space-x-0.5 bg-black/40 rounded-lg px-3 py-2 border border-transparent hover:border-neutral-800 transition-colors w-full lg:w-auto justify-center lg:justify-start">
          <span className="text-[10px] text-neutral-500 font-mono mr-2">BPM</span>
          <input
            type="number"
            placeholder="0"
            className="w-12 lg:w-8 bg-transparent text-sm text-white focus:outline-none text-center font-mono border-b border-transparent focus:border-white/20 transition-colors"
          />
          <span className="text-neutral-600 text-xs">-</span>
          <input
            type="number"
            placeholder="999"
            className="w-12 lg:w-8 bg-transparent text-sm text-white focus:outline-none text-center font-mono border-b border-transparent focus:border-white/20 transition-colors"
          />
        </div>

      </div>
    </div>
  );
};

export default FilterBar;