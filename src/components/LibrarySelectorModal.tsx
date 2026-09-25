'use client';

import React, { useState } from 'react';
import { LibraryBranch, LibrarySystem } from '@/types';
import { X, Check, MapPin, ExternalLink, Plus, Library, Sparkles, CheckSquare, Square } from 'lucide-react';

interface LibrarySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: LibraryBranch[];
  systems: LibrarySystem[];
  selectedBranchIds: string[];
  onToggleBranch: (branchId: string) => void;
  onToggleSystemBranches?: (systemId: string, selectAll: boolean) => void;
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
  onToggleSystemBranches,
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

  const handleToggleSystem = (systemId: string, currentSelectedCount: number, totalInSystem: number) => {
    const selectAll = currentSelectedCount < totalInSystem;
    if (onToggleSystemBranches) {
      onToggleSystemBranches(systemId, selectAll);
    } else {
      // Fallback
      const sysBranches = branches.filter((b) => b.systemId === systemId);
      sysBranches.forEach((b) => {
        const isSelected = selectedBranchIds.includes(b.id);
        if (selectAll && !isSelected) onToggleBranch(b.id);
        if (!selectAll && isSelected) onToggleBranch(b.id);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select Library Branches</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose which community libraries to show in your calendar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar: Global select all / deselect all */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-600 dark:text-slate-300 font-medium">
            <span className="text-rose-600 dark:text-rose-400 font-bold">{selectedBranchIds.length}</span> of {branches.length} branches selected
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="px-2.5 py-1 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors shadow-2xs"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              className="px-2.5 py-1 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors shadow-2xs"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Body list of branches grouped by system */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {Object.values(branchesBySystem).map(({ system, branches: sysBranches }) => {
            const selectedInSystem = sysBranches.filter((b) => selectedBranchIds.includes(b.id)).length;
            const allSelected = selectedInSystem === sysBranches.length;
            const noneSelected = selectedInSystem === 0;

            return (
              <div key={system.id} className="space-y-2.5 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                {/* System Header with System-level Select/Unselect toggle */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    {/* System-level master checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleSystem(system.id, selectedInSystem, sysBranches.length)}
                      className="flex items-center gap-2 text-left group"
                      title={allSelected ? `Deselect all ${system.name} branches` : `Select all ${system.name} branches`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          allSelected
                            ? 'bg-rose-600 border-rose-600 text-white'
                            : selectedInSystem > 0
                            ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-400 text-rose-600 dark:text-rose-300'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {allSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : selectedInSystem > 0 ? (
                          <span className="w-2 h-0.5 bg-rose-600 dark:bg-rose-400 rounded-full" />
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: system.color }}
                        />
                        <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          {system.name}
                        </span>
                      </div>
                    </button>

                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      ({selectedInSystem}/{sysBranches.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick System Select/Clear Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleSystem(system.id, selectedInSystem, sysBranches.length)}
                      className="text-xs font-semibold px-2 py-0.5 rounded-md text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors"
                    >
                      {allSelected ? 'Unselect All' : 'Select All'}
                    </button>

                    <a
                      href={system.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hidden sm:flex items-center gap-1"
                    >
                      <span>Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Branches Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {sysBranches.map((branch) => {
                    const isChecked = selectedBranchIds.includes(branch.id);
                    return (
                      <label
                        key={branch.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-white dark:bg-slate-800/90 border-rose-300 dark:border-rose-900/60 text-slate-900 dark:text-white shadow-2xs ring-1 ring-rose-500/20'
                            : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleBranch(branch.id)}
                          className="mt-0.5 rounded border-slate-300 dark:border-slate-600 text-rose-600 focus:ring-rose-500 h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs sm:text-sm font-semibold truncate text-slate-900 dark:text-slate-100">
                              {branch.name}
                            </span>
                            {branch.distanceMiles !== undefined && (
                              <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded shrink-0">
                                {branch.distanceMiles} mi
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
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
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 px-3 py-2.5 rounded-xl transition-colors w-full justify-center border border-rose-200/60 dark:border-rose-900/40"
              >
                <Plus className="w-4 h-4" />
                Add your own local library iCal / webcal feed
              </button>
            ) : (
              <form onSubmit={handleCustomSubmit} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Add Custom Calendar Feed</span>
                <input
                  type="text"
                  placeholder="Library / Community Center Name (e.g. Shoreline Library)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  required
                />
                <input
                  type="url"
                  placeholder="iCal or webcal URL (https://... or webcal://...)"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                  required
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="text-xs px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium"
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
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Events will filter dynamically to only your checked branches.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-700 rounded-xl transition-all shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
