'use client';

import React, { useState } from 'react';
import { Search, Navigation, MapPin, SlidersHorizontal, Library } from 'lucide-react';

interface LocationHeroProps {
  currentLocationName: string;
  onSearch: (query: string) => Promise<void>;
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
  onUseCurrentLocation,
  radiusMiles,
  onRadiusChange,
  totalLibrariesFound,
  selectedBranchCount,
  onOpenBranchSelector,
  isLoading,
}: LocationHeroProps) {
  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim());
    }
  };

  const samplePresets = [
    { label: 'Seattle (98107)', query: '98107' },
    { label: 'Brooklyn (11215)', query: '11215' },
    { label: 'San Francisco (94102)', query: '94102' },
    { label: 'Austin (78701)', query: '78701' },
    { label: 'Chicago (60614)', query: '60614' },
  ];

  return (
    <div className="bg-gradient-to-b from-rose-50/60 via-amber-50/30 to-white pt-8 pb-6 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Never miss storytime again.
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Find free baby lap-sits, toddler dance hours, and library storytimes near you.
            Subscribe once to sync them right into your phone or Google Calendar!
          </p>
        </div>

        {/* Search Bar Form */}
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-center gap-2 p-1.5 sm:p-2 bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-200"
          >
            <div className="relative flex-1 w-full flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Enter ZIP code, city, or neighborhood..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-sm sm:text-base rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Radius Select */}
              <select
                value={radiusMiles}
                onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))}
                className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none hover:bg-slate-100 transition-colors"
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
                className="p-2.5 text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors"
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
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-slate-500">
            <span className="font-medium mr-1">Quick pick:</span>
            {samplePresets.map((preset) => (
              <button
                key={preset.query}
                type="button"
                onClick={() => {
                  setInputVal(preset.query);
                  onSearch(preset.query);
                }}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Current Search Status Badge */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm bg-white/70 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                Searching around: <strong className="text-slate-900">{currentLocationName}</strong>
              </span>
            </div>

            <button
              onClick={onOpenBranchSelector}
              className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-semibold transition-colors"
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
