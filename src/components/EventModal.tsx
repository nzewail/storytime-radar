'use client';

import React from 'react';
import { StorytimeEvent } from '@/types';
import { AGE_CATEGORIES, EVENT_TYPES } from '@/lib/constants';
import { createGoogleCalendarEventUrl } from '@/lib/ical-builder';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  AlertCircle,
  Download,
  Share2,
  Navigation,
} from 'lucide-react';
import { format } from 'date-fns';

interface EventModalProps {
  event: StorytimeEvent | null;
  onClose: () => void;
}

export default function EventModal({ event, onClose }: EventModalProps) {
  if (!event) return null;

  const ageInfo = AGE_CATEGORIES[event.ageGroup];
  const typeInfo = EVENT_TYPES[event.eventType];
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  const googleCalUrl = createGoogleCalendarEventUrl(event);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${event.branchName}, ${event.branchAddress}`
  )}`;

  const handleDownloadIcs = () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StorytimeRadar//Event//EN',
      'BEGIN:VEVENT',
      `UID:${event.id}@storytimeradar.local`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `SUMMARY:${event.title} (${event.branchName})`,
      `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
      `LOCATION:${event.branchName}\\, ${event.branchAddress}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header with badges */}
        <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(event.targetAges && event.targetAges.length > 0 && event.targetAges.length <= 2
                ? event.targetAges
                : [event.ageGroup]
              ).map((ag) => {
                const agInfo = AGE_CATEGORIES[ag] || AGE_CATEGORIES['all-ages'];
                return (
                  <span
                    key={ag}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${agInfo.badgeBg} ${agInfo.badgeText} ${agInfo.badgeBorder} dark:bg-slate-800 dark:border-slate-700`}
                  >
                    <span>{agInfo.icon}</span>
                    <span>{agInfo.label}</span>
                  </span>
                );
              })}
              {event.ageRangeText && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  ({event.ageRangeText})
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <span>{typeInfo.icon}</span>
                <span>{typeInfo.label}</span>
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">{event.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content details */}
        <div className="p-5 space-y-4 text-sm">
          {/* Time & Date */}
          <div className="flex items-start gap-3 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <Calendar className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {format(startDate, 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {format(startDate, 'h:mm a')} – {format(endDate, 'h:mm a')}
                </span>
              </div>
            </div>
          </div>

          {/* Location & Branch */}
          <div className="flex items-start gap-3 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <MapPin className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                <span>{event.branchName}</span>
                {event.systemName && (
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {event.systemName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{event.branchAddress}</p>
              {event.roomOrLocation && (
                <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium mt-1">
                  Room: {event.roomOrLocation}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Google Maps Directions</span>
                </a>

                {(event.branchUrl || event.url) && (
                  <a
                    href={event.branchUrl || event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <span>Branch Library Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Registration Notice if required */}
          {event.isRegistrationRequired && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Registration or RSVP recommended:</strong> Space
                may be limited. Check the library website or call ahead to reserve a spot.
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              About This Event
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
              {event.description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadIcs}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Download .ics</span>
            </button>

            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-colors"
                title="View original event page on library website"
              >
                <span>Event Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <a
            href={googleCalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs"
          >
            <Calendar className="w-4 h-4" />
            <span>Add to Google Calendar</span>
          </a>
        </div>
      </div>
    </div>
  );
}
