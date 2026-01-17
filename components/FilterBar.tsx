import React from 'react';
import { ChevronDown, Activity, Music2, Key, Hash } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import CustomInput from './CustomInput';
import { GENRES, ROOT_KEYS, SCALE_TYPES } from '../constants';
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-5xl font-black text-white tracking-tighter mb-2">Discover</h1>
          <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">
            Explore the latest beats, sound kits, and projects from the community.
          </p>
        </div>

        <div className="flex items-center pb-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 font-mono tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2 animate-pulse"></span>
            LIVE FEED
          </span>
        </div>
      </div>

      <div className="w-full glass-panel !border-0 p-4 lg:p-2.5 rounded-xl flex flex-col lg:flex-row items-stretch lg:items-center gap-4 lg:gap-3 relative z-30 shadow-2xl">
        {/* Filters Container */}

        {/* Genre */}
        <CustomDropdown
          value={filters.genre}
          onChange={(val) => onFilterChange({ ...filters, genre: val })}
          options={GENRES}
          placeholder="Genre"
          className="w-full lg:w-48"
          searchable
          size="compact"
          buttonClassName="!border-0"
        />

        {/* Key and Scale */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <CustomDropdown
            value={filters.rootKey}
            onChange={(val) => onFilterChange({ ...filters, rootKey: val })}
            options={ROOT_KEYS}
            placeholder="Key"
            className="w-full lg:w-32" // Increased width to fit "All Keys"
            searchable
            size="compact"
            buttonClassName="!border-0"
          />
          <CustomDropdown
            value={filters.scaleType}
            onChange={(val) => onFilterChange({ ...filters, scaleType: val })}
            options={SCALE_TYPES}
            placeholder="Scale"
            className="w-full lg:w-32"
            searchable={false}
            size="compact"
            buttonClassName="!border-0"
          />
        </div>

        <div className="h-px w-full bg-white/10 lg:h-6 lg:w-px lg:mx-2"></div>

        {/* BPM Range */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <CustomInput
            type="number"
            value={filters.minBpm}
            onChange={(e) => onFilterChange({ ...filters, minBpm: e.target.value })}
            placeholder="Min"
            className="w-full lg:w-24 !py-2 !px-3 font-mono text-center !border-0"
            containerClassName="flex-1 lg:flex-none"
            noLabel
            hideControls
            fullWidth={false}
          />
          <span className="text-neutral-700">-</span>
          <CustomInput
            type="number"
            value={filters.maxBpm}
            onChange={(e) => onFilterChange({ ...filters, maxBpm: e.target.value })}
            placeholder="Max"
            className="w-full lg:w-24 !py-2 !px-3 font-mono text-center !border-0"
            containerClassName="flex-1 lg:flex-none"
            noLabel
            hideControls
            fullWidth={false}
          />
        </div>

      </div>
    </div>
  );
};

export default FilterBar;