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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header with badges */}
        <div className="p-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ageInfo.badgeBg} ${ageInfo.badgeText} ${ageInfo.badgeBorder}`}
              >
                <span>{ageInfo.icon}</span>
                <span>{ageInfo.label}</span>
                <span className="opacity-75 font-normal">({event.ageRangeText})</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                <span>{typeInfo.icon}</span>
                <span>{typeInfo.label}</span>
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 leading-snug">{event.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content details */}
        <div className="p-5 space-y-4 text-sm">
          {/* Time & Date */}
          <div className="flex items-start gap-3 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <Calendar className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900">
                {format(startDate, 'EEEE, MMMM d, yyyy')}
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {format(startDate, 'h:mm a')} – {format(endDate, 'h:mm a')}
                </span>
              </div>
            </div>
          </div>

          {/* Location & Branch */}
          <div className="flex items-start gap-3 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <MapPin className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span>{event.branchName}</span>
                {event.systemName && (
                  <span className="text-[11px] font-normal text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {event.systemName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">{event.branchAddress}</p>
              {event.roomOrLocation && (
                <p className="text-xs text-indigo-700 font-medium mt-1">
                  Room: {event.roomOrLocation}
                </p>
              )}

              <div className="mt-2 flex items-center gap-3">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Google Maps Directions</span>
                </a>

                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    <span>Library Website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Registration Notice if required */}
          {event.isRegistrationRequired && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Registration or RSVP recommended:</strong> Space
                may be limited. Check the library website or call ahead to reserve a spot.
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              About This Event
            </h4>
            <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
              {event.description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2">
          <button
            onClick={handleDownloadIcs}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download .ics</span>
          </button>

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
