import React from 'react';
import { ChevronDown, Activity, Music2, Key, Hash } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import CustomInput from './CustomInput';
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
        <CustomDropdown
          value={filters.genre}
          onChange={(val) => onFilterChange({ ...filters, genre: val })}
          options={GENRES}
          placeholder="Genre"
          className="w-full lg:w-48"
          searchable
        />

        {/* Key */}
        <CustomDropdown
          value={filters.key}
          onChange={(val) => onFilterChange({ ...filters, key: val })}
          options={KEYS}
          placeholder="Key"
          className="w-full lg:w-32"
          searchable
        />

        <div className="h-px w-full bg-white/10 lg:h-6 lg:w-px lg:mx-2"></div>

        {/* BPM Range */}
        <div className="flex items-center gap-2">
          <CustomInput
            type="number"
            value={filters.minBpm}
            onChange={(e) => onFilterChange({ ...filters, minBpm: e.target.value })}
            placeholder="Min"
            className="w-20 !py-2 !px-3 font-mono text-center"
            noLabel
            hideControls
          />
          <span className="text-neutral-700">-</span>
          <CustomInput
            type="number"
            value={filters.maxBpm}
            onChange={(e) => onFilterChange({ ...filters, maxBpm: e.target.value })}
            placeholder="Max"
            className="w-20 !py-2 !px-3 font-mono text-center"
            noLabel
            hideControls
          />
        </div>

      </div>
    </div>
  );
};

export default FilterBar;