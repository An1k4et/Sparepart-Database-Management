import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiFolder, FiX } from 'react-icons/fi';
import { SearchResult } from '../types';

interface SearchBarProps {
  onSearch: (val: string) => void;
  results: SearchResult[];
  onSelectVessel: (vesselId: string) => void;
  currentQuery?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, results, onSelectVessel, currentQuery = '' }) => {
  const [localValue, setLocalValue] = useState(currentQuery);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep local input in sync if parent resets query
  useEffect(() => {
    setLocalValue(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = localValue.trim();
    if (!trimmed) {
      setIsOpen(false);
      onSearch('');
      return;
    }
    onSearch(trimmed);
    setIsOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    if (!val.trim()) {
      setIsOpen(false);
      onSearch(''); // Immediately reset search when input is emptied
    }
  };

  const handleClear = () => {
    setLocalValue('');
    setIsOpen(false);
    onSearch('');
  };

  const totalMatchingRows = results.reduce((sum, r) => sum + (r.match_count || 1), 0);

  return (
    <div id="tour-search-bar" ref={containerRef} className="relative w-full max-w-2xl mx-auto flex items-center">
      <form onSubmit={handleSubmit} className="relative flex items-center flex-1 w-full">
        <div className="relative flex items-center flex-1">
          <FiSearch className="absolute left-3 text-gray-400" size={18} />
          <input
            type="text"
            className="w-full bg-slate-800 text-white placeholder-gray-400 rounded-l-lg pl-10 pr-9 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700"
            placeholder="Search parts, type, or drawing no..."
            value={localValue}
            onFocus={() => { if (results.length > 0 && localValue.trim()) setIsOpen(true); }}
            onChange={handleChange}
          />
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 p-1 text-gray-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors cursor-pointer"
              title="Clear search"
            >
              <FiX size={15} />
            </button>
          )}
        </div>
        <button 
          type="submit" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-lg border border-blue-600 font-medium transition-colors cursor-pointer whitespace-nowrap text-sm"
        >
          Search
        </button>
      </form>
      
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between">
            <span>Matching File Locations</span>
            <span>{totalMatchingRows} matching rows found</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {results.map((r) => {
              const count = r.match_count || 1;
              const locationLabel = r.file_id || r.context || 'Unknown Location';

              return (
                <div 
                  key={r.id}
                  onClick={() => {
                    setIsOpen(false);
                    onSelectVessel(r.id);
                  }}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                    <FiFolder className="text-blue-500 flex-shrink-0" size={17} />
                    <span className="font-semibold text-gray-800 truncate text-sm">{locationLabel}</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full flex-shrink-0">
                    {count} {count === 1 ? 'row found' : 'rows found'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {isOpen && localValue.trim() !== '' && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 p-4 text-center text-gray-500 text-sm">
          No matching parts found for "{localValue}".
        </div>
      )}
    </div>
  );
};

export default SearchBar;
