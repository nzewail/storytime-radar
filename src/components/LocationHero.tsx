'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Navigation, MapPin, SlidersHorizontal, Library, ChevronRight, Loader2 } from 'lucide-react';

interface AutocompleteItem {
  title: string;
  subtitle: string;
  lat: number;
  lon: number;
  query: string;
}

interface LocationHeroProps {
  currentLocationName: string;
  onSearch: (query: string) => Promise<void>;
  onSelectSuggestion?: (item: AutocompleteItem) => void;
  onUseCurrentLocation: () => void;
  radiusMiles: number;
  onRadiusChange: (radius: number) => void;
  totalLibrariesFound: number;
  selectedBranchCount: number;
  onOpenBranchSelector: () => void;
  isLoading: boolean;
}

export default function LocationHero({
  currentLocationName,
  onSearch,
  onSelectSuggestion,
  onUseCurrentLocation,
  radiusMiles,
  onRadiusChange,
  totalLibrariesFound,
  selectedBranchCount,
  onOpenBranchSelector,
  isLoading,
}: LocationHeroProps) {
  const [inputVal, setInputVal] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [isOpenDropdown, setIsOpenDropdown] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpenDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch autocomplete suggestions as user types
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (inputVal.trim().length < 2) {
      setSuggestions([]);
      setIsOpenDropdown(false);
      return;
    }

    setIsFetchingSuggestions(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(inputVal.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setIsOpenDropdown((data.suggestions || []).length > 0);
          setActiveSuggestionIndex(-1);
        }
      } catch (e) {
        console.error('Autocomplete fetch error:', e);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 220); // 220ms debounce
  }, [inputVal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isOpenDropdown && activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
      handleSelect(suggestions[activeSuggestionIndex]);
      return;
    }

    if (inputVal.trim()) {
      setIsOpenDropdown(false);
      onSearch(inputVal.trim());
    }
  };

  const handleSelect = (item: AutocompleteItem) => {
    setInputVal(`${item.title} (${item.query})`);
    setIsOpenDropdown(false);
    if (onSelectSuggestion) {
      onSelectSuggestion(item);
    } else {
      onSearch(item.query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpenDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpenDropdown(false);
    }
  };

  const samplePresets = [
    { label: 'Pasadena (91101)', query: '91101' },
    { label: 'San Francisco (94102)', query: '94102' },
    { label: 'Glendale (91205)', query: '91205' },
    { label: 'Seattle (98107)', query: '98107' },
    { label: 'Brooklyn (11215)', query: '11215' },
    { label: 'Austin (78701)', query: '78701' },
  ];

  return (
    <div className="bg-gradient-to-b from-rose-50/60 via-amber-50/20 to-white dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-950 pt-8 pb-6 border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Never miss storytime again.
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Find free baby lap-sits, toddler dance hours, and library storytimes near you.
            Subscribe once to sync them right into your phone or Google Calendar!
          </p>
        </div>

        {/* Search Bar Form with Autocomplete */}
        <div className="max-w-2xl mx-auto relative" ref={wrapperRef}>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-center gap-2 p-1.5 sm:p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/60 dark:shadow-black/40 border border-slate-200 dark:border-slate-700"
          >
            <div className="relative flex-1 w-full flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Type city or ZIP code (e.g. Pasadena, 91101)..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setIsOpenDropdown(true);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-11 pr-8 py-2.5 text-sm sm:text-base rounded-xl text-slate-900 dark:text-white placeholder-slate-400 bg-transparent focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              {isFetchingSuggestions && (
                <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3" />
              )}

              {/* Autocomplete Dropdown List - Positioned directly under input */}
              {isOpenDropdown && suggestions.length > 0 && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Matching Locations</span>
                    <span className="text-[10px] lowercase font-normal opacity-70">↑↓ to navigate, enter to select</span>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto">
                    {suggestions.map((item, index) => {
                      const isSelected = index === activeSuggestionIndex;
                      return (
                        <button
                          key={`${item.title}-${item.subtitle}-${index}`}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                            isSelected
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                            <div className="min-w-0 truncate">
                              <div className="text-xs sm:text-sm font-semibold truncate">{item.title}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Radius Select */}
              <select
                value={radiusMiles}
                onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))}
                className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Search radius"
              >
                <option value={5}>Within 5 mi</option>
                <option value={10}>Within 10 mi</option>
                <option value={15}>Within 15 mi</option>
                <option value={25}>Within 25 mi</option>
              </select>

              {/* Geolocation Button */}
              <button
                type="button"
                onClick={onUseCurrentLocation}
                title="Use Current Location"
                className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Navigation className="w-5 h-5" />
              </button>

              {/* Search Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Quick city suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium mr-1">Quick pick:</span>
            {samplePresets.map((preset) => (
              <button
                key={preset.query}
                type="button"
                onClick={() => {
                  setInputVal(preset.label);
                  onSearch(preset.query);
                }}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Current Search Status Badge */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                Searching around: <strong className="text-slate-900 dark:text-white">{currentLocationName}</strong>
              </span>
            </div>

            <button
              onClick={onOpenBranchSelector}
              className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold transition-colors"
            >
              <Library className="w-4 h-4" />
              <span>
                {selectedBranchCount} of {totalLibrariesFound} libraries selected
              </span>
              <span className="underline ml-1">Edit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
