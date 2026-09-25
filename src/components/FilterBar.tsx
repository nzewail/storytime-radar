'use client';

import React from 'react';
import { AgeGroup, EventType, TimeOfDay } from '@/types';
import { AGE_CATEGORIES, EVENT_TYPES, TIME_OF_DAY_BRACKETS } from '@/lib/constants';
import { Calendar as CalendarIcon, List, Clock, Filter, Sparkles, X } from 'lucide-react';

interface FilterBarProps {
  selectedAges: AgeGroup[];
  onToggleAge: (age: AgeGroup) => void;
  selectedEventTypes: EventType[];
  onToggleEventType: (type: EventType) => void;
  selectedTimeOfDay: TimeOfDay[];
  onToggleTimeOfDay: (time: TimeOfDay) => void;
  viewMode: 'agenda' | 'month';
  onViewModeChange: (mode: 'agenda' | 'month') => void;
  searchFilter: string;
  onSearchFilterChange: (val: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  totalFilteredEvents: number;
}

export default function FilterBar({
  selectedAges,
  onToggleAge,
  selectedEventTypes,
  onToggleEventType,
  selectedTimeOfDay,
  onToggleTimeOfDay,
  viewMode,
  onViewModeChange,
  searchFilter,
  onSearchFilterChange,
  onClearFilters,
  hasActiveFilters,
  totalFilteredEvents,
}: FilterBarProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-20 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
        {/* Top row: Age Category Pills + View Toggle */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Age Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              Age:
            </span>
            {(Object.keys(AGE_CATEGORIES) as AgeGroup[]).map((ageKey) => {
              const cat = AGE_CATEGORIES[ageKey];
              const isSelected = selectedAges.includes(ageKey);
              return (
                <button
                  key={ageKey}
                  type="button"
                  onClick={() => onToggleAge(ageKey)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    isSelected
                      ? `${cat.badgeBg} ${cat.badgeText} ${cat.badgeBorder} ring-2 ring-rose-500/20 shadow-xs dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800`
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className="text-[10px] opacity-75 font-normal">({cat.ageRange})</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {totalFilteredEvents} events
            </span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onViewModeChange('agenda')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'agenda'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List / Agenda</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('month')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Month View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second row: Time of day, Event Type, Search Input & Clear */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Time of Day */}
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
            {(Object.keys(TIME_OF_DAY_BRACKETS) as TimeOfDay[]).map((timeKey) => {
              const info = TIME_OF_DAY_BRACKETS[timeKey];
              const isSelected = selectedTimeOfDay.includes(timeKey);
              return (
                <button
                  key={timeKey}
                  type="button"
                  onClick={() => onToggleTimeOfDay(timeKey)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors border ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                  title={info.subtext}
                >
                  {info.label}
                </button>
              );
            })}
          </div>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Event Types */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {(['storytime', 'music-movement', 'playgroup', 'crafts-stem'] as EventType[]).map((typeKey) => {
              const info = EVENT_TYPES[typeKey];
              const isSelected = selectedEventTypes.includes(typeKey);
              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => onToggleEventType(typeKey)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors border ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800 ring-1 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <span className="mr-1">{info.icon}</span>
                  {info.label}
                </button>
              );
            })}
          </div>

          {/* Filter Search Input */}
          <div className="ml-auto flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter by keyword (e.g. pajama, songs)..."
              value={searchFilter}
              onChange={(e) => onSearchFilterChange(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 w-44 sm:w-56"
            />

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
