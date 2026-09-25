'use client';

import React from 'react';
import { Calendar, Sparkles, MapPin, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface NavbarProps {
  locationLabel: string;
  selectedBranchCount: number;
  onOpenSubscribeModal: () => void;
  onOpenBranchModal: () => void;
}

export default function Navbar({
  locationLabel,
  selectedBranchCount,
  onOpenSubscribeModal,
  onOpenBranchModal,
}: NavbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-200 dark:shadow-rose-950/40">
            <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                Storytime<span className="text-rose-600 dark:text-rose-500">Radar</span>
              </span>
              <span className="text-xs px-2 py-0.5 font-medium rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                For Parents
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Local library & community events for babies, toddlers & kids
            </p>
          </div>
        </div>

        {/* Location, Theme & Calendar Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Location button */}
          <button
            onClick={onOpenBranchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Change libraries"
          >
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="max-w-[110px] sm:max-w-[170px] truncate">{locationLabel}</span>
            <span className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold px-1.5 py-0.2 rounded text-[11px] border border-slate-200 dark:border-slate-700">
              {selectedBranchCount}
            </span>
          </button>

          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Follow in Calendar Button */}
          <button
            onClick={onOpenSubscribeModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 shadow-sm shadow-indigo-100 dark:shadow-indigo-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden xs:inline">Follow in</span> Calendar
          </button>
        </div>
      </div>
    </header>
  );
}
