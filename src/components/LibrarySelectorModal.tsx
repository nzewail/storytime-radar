'use client';

import React, { useState } from 'react';
import { LibraryBranch, LibrarySystem } from '@/types';
import { X, Check, MapPin, ExternalLink, Plus, Library, Sparkles } from 'lucide-react';

interface LibrarySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: LibraryBranch[];
  systems: LibrarySystem[];
  selectedBranchIds: string[];
  onToggleBranch: (branchId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddCustomFeed?: (name: string, url: string) => void;
}

export default function LibrarySelectorModal({
  isOpen,
  onClose,
  branches,
  systems,
  selectedBranchIds,
  onToggleBranch,
  onSelectAll,
  onDeselectAll,
  onAddCustomFeed,
}: LibrarySelectorModalProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  if (!isOpen) return null;

  // Group branches by system
  const branchesBySystem = systems.reduce((acc, sys) => {
    const sysBranches = branches.filter((b) => b.systemId === sys.id);
    if (sysBranches.length > 0) {
      acc[sys.id] = {
        system: sys,
        branches: sysBranches,
      };
    }
    return acc;
  }, {} as Record<string, { system: LibrarySystem; branches: LibraryBranch[] }>);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customName && customUrl && onAddCustomFeed) {
      onAddCustomFeed(customName, customUrl);
      setCustomName('');
      setCustomUrl('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Select Library Branches</h2>
              <p className="text-xs text-slate-500">
                Choose which community libraries to show in your calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar: Select all / deselect all */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="text-slate-600 font-medium">
            <span className="text-rose-600 font-bold">{selectedBranchIds.length}</span> of {branches.length} branches selected
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="px-2.5 py-1 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 font-medium transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              className="px-2.5 py-1 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 font-medium transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Body list of branches */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {Object.values(branchesBySystem).map(({ system, branches: sysBranches }) => {
            const allSystemSelected = sysBranches.every((b) => selectedBranchIds.includes(b.id));

            return (
              <div key={system.id} className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: system.color }}
                    />
                    <span className="font-semibold text-sm text-slate-900">{system.name}</span>
                    <span className="text-xs text-slate-400">({sysBranches.length})</span>
                  </div>

                  <a
                    href={system.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                  >
                    <span>Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {sysBranches.map((branch) => {
                    const isChecked = selectedBranchIds.includes(branch.id);
                    return (
                      <label
                        key={branch.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-rose-50/40 border-rose-200 text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleBranch(branch.id)}
                          className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs sm:text-sm font-semibold truncate text-slate-900">
                              {branch.name}
                            </span>
                            {branch.distanceMiles !== undefined && (
                              <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0">
                                {branch.distanceMiles} mi
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {branch.address}, {branch.city}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Custom library feed adder */}
          <div className="pt-4 border-t border-slate-100">
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-colors w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Add your own local library iCal / webcal feed
              </button>
            ) : (
              <form onSubmit={handleCustomSubmit} className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                <span className="text-xs font-semibold text-slate-800 block">Add Custom Calendar Feed</span>
                <input
                  type="text"
                  placeholder="Library / Community Center Name (e.g. Shoreline Library)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  required
                />
                <input
                  type="url"
                  placeholder="iCal or webcal URL (https://... or webcal://...)"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  required
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="text-xs px-2.5 py-1 text-slate-500 hover:text-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold"
                  >
                    Add Feed
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Events will filter dynamically to only your checked branches.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
