'use client';

import React from 'react';
import { Calendar, Sparkles, MapPin, Bell } from 'lucide-react';

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
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-200">
            <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                Storytime<span className="text-rose-600">Radar</span>
              </span>
              <span className="text-xs px-2 py-0.5 font-medium rounded-full bg-rose-100 text-rose-700">
                For Parents
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Local library & community events for babies, toddlers & kids
            </p>
          </div>
        </div>

        {/* Location & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenBranchModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            title="Change libraries"
          >
            <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="max-w-[120px] sm:max-w-[180px] truncate">{locationLabel}</span>
            <span className="bg-white text-slate-600 font-semibold px-1.5 py-0.2 rounded text-[11px] border border-slate-200">
              {selectedBranchCount}
            </span>
          </button>

          {/* Follow in Calendar Button */}
          <button
            onClick={onOpenSubscribeModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 shadow-sm shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden xs:inline">Follow in</span> Calendar
          </button>
        </div>
      </div>
    </header>
  );
}
