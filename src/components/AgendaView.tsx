'use client';

import React from 'react';
import { StorytimeEvent } from '@/types';
import { AGE_CATEGORIES, EVENT_TYPES } from '@/lib/constants';
import { createGoogleCalendarEventUrl } from '@/lib/ical-builder';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

interface AgendaViewProps {
  events: StorytimeEvent[];
  onSelectEvent: (event: StorytimeEvent) => void;
  onClearFilters: () => void;
}

export default function AgendaView({
  events,
  onSelectEvent,
  onClearFilters,
}: AgendaViewProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 mx-auto flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">No events found</h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          Try adjusting your age or keyword filters, or select more library branches nearby.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors"
        >
          Reset All Filters
        </button>
      </div>
    );
  }

  // Group events by day string "YYYY-MM-DD"
  const groupedEvents = events.reduce((acc, ev) => {
    const dayKey = ev.startTime.slice(0, 10);
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(ev);
    return acc;
  }, {} as Record<string, StorytimeEvent[]>);

  const sortedDays = Object.keys(groupedEvents).sort();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      {sortedDays.map((dayKey) => {
        const dayDate = parseISO(dayKey);
        const dayEvents = groupedEvents[dayKey];

        let dayHeading = format(dayDate, 'EEEE, MMMM d');
        let dayBadge: string | null = null;

        if (isToday(dayDate)) {
          dayBadge = 'TODAY';
        } else if (isTomorrow(dayDate)) {
          dayBadge = 'TOMORROW';
        }

        return (
          <div key={dayKey} className="space-y-3">
            {/* Date Section Header */}
            <div className="sticky top-32 z-10 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xs py-2 px-1 flex items-center gap-2.5">
              <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {dayHeading}
              </span>
              {dayBadge && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white tracking-wide">
                  {dayBadge}
                </span>
              )}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                • {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {/* Events for this day */}
            <div className="space-y-2.5">
              {dayEvents.map((event) => {
                const ageInfo = AGE_CATEGORIES[event.ageGroup];
                const typeInfo = EVENT_TYPES[event.eventType];
                const startDate = parseISO(event.startTime);
                const endDate = parseISO(event.endTime);
                const googleCalUrl = createGoogleCalendarEventUrl(event);

                return (
                  <div
                    key={event.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    {/* Event details */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => onSelectEvent(event)}
                    >
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {/* Age tag */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${ageInfo.badgeBg} ${ageInfo.badgeText} ${ageInfo.badgeBorder} dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-900`}
                        >
                          <span>{ageInfo.icon}</span>
                          <span>{ageInfo.label}</span>
                          <span className="opacity-75 font-normal">({event.ageRangeText})</span>
                        </span>

                        {/* Type tag */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <span>{typeInfo.icon}</span>
                          <span>{typeInfo.label}</span>
                        </span>

                        {/* Registration tag */}
                        {event.isRegistrationRequired && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertCircle className="w-3 h-3" />
                            RSVP Required
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors leading-snug">
                        {event.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-200">
                          <Clock className="w-3.5 h-3.5 text-rose-500" />
                          <span>
                            {format(startDate, 'h:mm a')} – {format(endDate, 'h:mm a')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{event.branchName}</span>
                          {event.roomOrLocation && (
                            <span className="text-slate-400 dark:text-slate-500">({event.roomOrLocation})</span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1.5">
                        {event.description}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectEvent(event)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                      >
                        View Details
                      </button>

                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-2xs hover:scale-105 active:scale-95"
                        title="Add this event to Google Calendar"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>+ Google Cal</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
