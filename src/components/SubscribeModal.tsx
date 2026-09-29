'use client';

import React, { useState } from 'react';
import { AgeGroup, EventType } from '@/types';
import { AGE_CATEGORIES } from '@/lib/constants';
import {
  X,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Smartphone,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface SubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBranchIds: string[];
  selectedAges: AgeGroup[];
  selectedEventTypes: EventType[];
}

export default function SubscribeModal({
  isOpen,
  onClose,
  selectedBranchIds,
  selectedAges,
  selectedEventTypes,
}: SubscribeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Build query string
  const params = new URLSearchParams();
  if (selectedBranchIds.length > 0) {
    params.set('branches', selectedBranchIds.join(','));
  }
  if (selectedAges.length > 0) {
    params.set('ages', selectedAges.join(','));
  }
  if (selectedEventTypes.length > 0) {
    params.set('types', selectedEventTypes.join(','));
  }
  // Cache buster to force Google Calendar's URL proxy to fetch the fresh RFC-compliant feed
  params.set('v', '2');

  const queryString = params.toString();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://storytimeradar.local';
  const cleanHost = origin.replace(/^https?:\/\//, '');

  const httpFeedUrl = `${origin}/api/feed.ics${queryString ? '?' + queryString : ''}`;
  const webcalUrl = `webcal://${cleanHost}/api/feed.ics${queryString ? '?' + queryString : ''}`;
  const googleCalSubscribeUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(httpFeedUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(httpFeedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Subscribe & Auto-Sync Calendar</h2>
              <p className="text-xs text-slate-500">
                Live iCal feed synced automatically with your phone or computer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {/* Feed summary banner */}
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 text-xs text-rose-900 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-600" />
              <span>What is included in this calendar feed:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="bg-white/90 px-2 py-0.5 rounded-md font-medium text-rose-800 border border-rose-200/60">
                🏛️ {selectedBranchIds.length} Libraries Selected
              </span>
              {selectedAges.length > 0 ? (
                selectedAges.map((age) => (
                  <span
                    key={age}
                    className="bg-white/90 px-2 py-0.5 rounded-md font-medium text-rose-800 border border-rose-200/60"
                  >
                    {AGE_CATEGORIES[age].icon} {AGE_CATEGORIES[age].label}
                  </span>
                ))
              ) : (
                <span className="bg-white/90 px-2 py-0.5 rounded-md font-medium text-rose-800 border border-rose-200/60">
                  👶 All Ages
                </span>
              )}
            </div>
          </div>

          {/* Quick Subscribe Options */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1-Click Instant Subscription
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Apple Calendar / iPhone / Mac Button */}
              <a
                href={webcalUrl}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 hover:border-slate-300 transition-all group shadow-2xs"
              >
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-xs text-slate-800">
                  <Smartphone className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Apple Calendar / iOS
                  </div>
                  <div className="text-[11px] text-slate-500">Tap to subscribe on iPhone or Mac</div>
                </div>
              </a>

              {/* Google Calendar Button */}
              <a
                href={googleCalSubscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 hover:border-slate-300 transition-all group shadow-2xs"
              >
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-xs text-slate-800">
                  <Calendar className="w-5 h-5 text-rose-600" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-rose-600 transition-colors flex items-center gap-1">
                    <span>Google Calendar</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="text-[11px] text-slate-500">Add to web calendar subscription</div>
                </div>
              </a>
            </div>
          </div>

          {/* Copy URL for other calendar apps */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Or Copy Feed URL (Outlook, Thunderbird, etc.)
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={httpFeedUrl}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-700 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* How it works explanation */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5 text-slate-600 text-xs leading-relaxed">
            <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">How auto-sync works:</strong> Your calendar app
              subscribes to this URL and checks periodically for changes. Whenever a library adds
              or moves storytimes, your phone calendar updates automatically without you lifting a
              finger!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
