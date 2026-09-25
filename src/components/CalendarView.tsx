'use client';

import React, { useState } from 'react';
import { StorytimeEvent } from '@/types';
import { AGE_CATEGORIES } from '@/lib/constants';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';

interface CalendarViewProps {
  events: StorytimeEvent[];
  onSelectEvent: (event: StorytimeEvent) => void;
}

export default function CalendarView({ events, onSelectEvent }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  // Map events to date keys "YYYY-MM-DD"
  const eventsByDay = events.reduce((acc, ev) => {
    const dayKey = ev.startTime.slice(0, 10);
    if (!acc[dayKey]) {
      acc[dayKey] = [];
    }
    acc[dayKey].push(ev);
    return acc;
  }, {} as Record<string, StorytimeEvent[]>);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs max-w-6xl mx-auto my-6 overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            type="button"
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday column headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-bold text-slate-500 uppercase tracking-wider py-2.5 bg-slate-50/50">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 border-b border-slate-100">
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay[dayKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={dayKey}
              className={`min-h-[110px] sm:min-h-[130px] p-1.5 sm:p-2 flex flex-col transition-colors ${
                !isCurrentMonth ? 'bg-slate-50/40 text-slate-300' : 'bg-white'
              }`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isCurrentDay
                      ? 'bg-rose-600 text-white font-bold'
                      : isCurrentMonth
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                    {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                  </span>
                )}
              </div>

              {/* Event chips on this day */}
              <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-none flex-1">
                {dayEvents.map((ev) => {
                  const ageInfo = AGE_CATEGORIES[ev.ageGroup];
                  const startTime = parseISO(ev.startTime);

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev)}
                      className={`w-full text-left p-1 rounded-md text-[11px] font-medium leading-tight truncate flex items-center gap-1 border transition-all hover:scale-[1.02] active:scale-[0.98] ${ageInfo.badgeBg} ${ageInfo.badgeText} ${ageInfo.badgeBorder}`}
                      title={`${format(startTime, 'h:mm a')} - ${ev.title} (${ev.branchName})`}
                    >
                      <span className="text-xs shrink-0">{ageInfo.icon}</span>
                      <span className="font-bold shrink-0">{format(startTime, 'h:mma')}</span>
                      <span className="truncate">{ev.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
