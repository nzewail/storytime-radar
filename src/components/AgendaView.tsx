'use client';

import React, { useState, useEffect } from 'react';
import { StorytimeEvent } from '@/types';
import { AGE_CATEGORIES, EVENT_TYPES } from '@/lib/constants';
import { createGoogleCalendarEventUrl } from '@/lib/ical-builder';
import {
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset to first page when events list changes (e.g. after filter change)
  useEffect(() => {
    setCurrentPage(1);
  }, [events.length]);

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

  // Calculate pagination
  const totalPages = Math.ceil(events.length / pageSize);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, events.length);
  const pagedEvents = events.slice(startIndex, endIndex);

  // Group paginated events by local day string "YYYY-MM-DD"
  const groupedEvents = pagedEvents.reduce((acc, ev) => {
    const dayKey = format(parseISO(ev.startTime), 'yyyy-MM-dd');
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(ev);
    return acc;
  }, {} as Record<string, StorytimeEvent[]>);

  const sortedDays = Object.keys(groupedEvents).sort();

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Top Pagination Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
          <span>
            Showing <strong className="text-slate-900 dark:text-white font-bold">{startIndex + 1}–{endIndex}</strong> of{' '}
            <strong className="text-slate-900 dark:text-white font-bold">{events.length}</strong> events
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Page size picker */}
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Quick page buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs">
                {safeCurrentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Events Grouped by Day */}
      <div className="space-y-6">
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
                          {/* Age tag(s) */}
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
                            {event.branchUrl ? (
                              <a
                                href={event.branchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2"
                                title={`Visit ${event.branchName} website`}
                              >
                                {event.branchName}
                              </a>
                            ) : (
                              <span className="font-medium text-slate-800 dark:text-slate-200">{event.branchName}</span>
                            )}
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
                        {event.url && (
                          <a
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors border border-indigo-200/60 dark:border-indigo-900/60"
                            title="Open official library event page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Event Page</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => onSelectEvent(event)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        >
                          Details
                        </button>

                        <a
                          href={googleCalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-2xs hover:scale-105 active:scale-95"
                          title="Add this event to Google Calendar"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>+ Cal</span>
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

      {/* Bottom Pagination Controls (when more than 1 page) */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            Page {safeCurrentPage} of {totalPages} ({events.length} total events)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => handlePageChange(1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (safeCurrentPage <= 3) {
                pageNum = i + 1;
              } else if (safeCurrentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = safeCurrentPage - 2 + i;
              }

              const isCurrent = pageNum === safeCurrentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg font-bold transition-all ${
                    isCurrent
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Next
            </button>

            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => handlePageChange(totalPages)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
