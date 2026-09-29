'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LocationHero from '@/components/LocationHero';
import FilterBar from '@/components/FilterBar';
import AgendaView from '@/components/AgendaView';
import CalendarView from '@/components/CalendarView';
import EventModal from '@/components/EventModal';
import SubscribeModal from '@/components/SubscribeModal';
import LibrarySelectorModal from '@/components/LibrarySelectorModal';
import {
  AgeGroup,
  EventType,
  TimeOfDay,
  LibraryBranch,
  LibrarySystem,
  StorytimeEvent,
  DateFilter,
} from '@/types';
import { parseISO, getHours, format, addDays, nextSaturday, nextSunday, isSaturday, isSunday } from 'date-fns';
import { getEventDayKey } from '@/lib/calendar/timezone';
import { parseUrlState, buildSearchQuery, ParsedUrlState } from '@/lib/url-state';
import { Check, X } from 'lucide-react';

function HomeContent() {
  const searchParams = useSearchParams();

  // Parse initial state from URL search parameters on first mount
  const initialParamsRef = useRef<ParsedUrlState | null>(null);
  if (!initialParamsRef.current) {
    initialParamsRef.current = parseUrlState(searchParams);
  }
  const initial = initialParamsRef.current;

  // Search & Filter State initialized from URL params
  const [locationName, setLocationName] = useState<string>(initial.locationName);
  const [coords, setCoords] = useState<{ lat: number; lon: number }>(initial.coords);
  const [radiusMiles, setRadiusMiles] = useState<number>(initial.radiusMiles);

  const [systems, setSystems] = useState<LibrarySystem[]>([]);
  const [branches, setBranches] = useState<LibraryBranch[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(initial.initialBranchIds || []);

  const [selectedAges, setSelectedAges] = useState<AgeGroup[]>(initial.selectedAges);
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>(initial.selectedEventTypes);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay[]>(initial.selectedTimeOfDay);
  const [dateFilter, setDateFilter] = useState<DateFilter>(initial.dateFilter);
  const [searchFilter, setSearchFilter] = useState<string>(initial.searchFilter);

  const [viewMode, setViewMode] = useState<'agenda' | 'month'>(initial.viewMode);
  const [events, setEvents] = useState<StorytimeEvent[]>([]);
  const [unsupportedBranches, setUnsupportedBranches] = useState<LibraryBranch[]>([]);

  // Modals & UI State
  const [selectedEvent, setSelectedEvent] = useState<StorytimeEvent | null>(null);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState<boolean>(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  // Preserve initial branches from URL for the very first library fetch
  const initialBranchIdsRef = useRef<string[] | null>(initial.initialBranchIds);
  const isInitializedRef = useRef<boolean>(false);

  // 1. Fetch libraries when coords or radius changes
  useEffect(() => {
    async function fetchLibraries() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/libraries?lat=${coords.lat}&lon=${coords.lon}&radius=${radiusMiles}`
        );
        if (res.ok) {
          const data = await res.json();
          const fetchedBranches: LibraryBranch[] = data.branches || [];
          setSystems(data.systems || []);
          setBranches(fetchedBranches);

          if (initialBranchIdsRef.current !== null) {
            const requested = initialBranchIdsRef.current;
            initialBranchIdsRef.current = null; // consume so future radius changes select all
            if (requested.length === 0) {
              setSelectedBranchIds([]);
            } else {
              const valid = fetchedBranches
                .filter((b) => requested.includes(b.id))
                .map((b) => b.id);
              setSelectedBranchIds(valid.length > 0 ? valid : requested);
            }
          } else {
            // Automatically select all branches within radius
            const branchIds = fetchedBranches.map((b: LibraryBranch) => b.id);
            setSelectedBranchIds(branchIds);
          }
        }
      } catch (err) {
        console.error('Failed to fetch libraries:', err);
      } finally {
        setIsLoading(false);
        isInitializedRef.current = true;
      }
    }

    fetchLibraries();
  }, [coords.lat, coords.lon, radiusMiles]);

  // 2. Fetch events when selected branches change
  useEffect(() => {
    async function fetchEvents() {
      if (selectedBranchIds.length === 0) {
        setEvents([]);
        setUnsupportedBranches([]);
        return;
      }

      try {
        const branchParam = selectedBranchIds.join(',');
        const res = await fetch(`/api/events?branches=${encodeURIComponent(branchParam)}&days=60`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
          setUnsupportedBranches(data.unsupportedBranches || []);
        }
      } catch (err) {
        console.error('Failed to fetch events:', err);
      }
    }

    fetchEvents();
  }, [selectedBranchIds]);

  // 3. Keep URL address bar synchronized with current search and filters
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const qs = buildSearchQuery(
      {
        coords,
        locationName,
        radiusMiles,
        selectedBranchIds,
        selectedAges,
        selectedEventTypes,
        selectedTimeOfDay,
        dateFilter,
        searchFilter,
        viewMode,
      },
      branches.length
    );

    const newUrl = qs ? `${window.location.pathname}${qs}` : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (newUrl !== currentUrl) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [
    coords,
    locationName,
    radiusMiles,
    selectedBranchIds,
    selectedAges,
    selectedEventTypes,
    selectedTimeOfDay,
    dateFilter,
    searchFilter,
    viewMode,
    branches.length,
  ]);

  // 4. Handle browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const updated = parseUrlState(params);

      setCoords(updated.coords);
      setLocationName(updated.locationName);
      setRadiusMiles(updated.radiusMiles);
      if (updated.initialBranchIds !== null) {
        setSelectedBranchIds(updated.initialBranchIds);
      }
      setSelectedAges(updated.selectedAges);
      setSelectedEventTypes(updated.selectedEventTypes);
      setSelectedTimeOfDay(updated.selectedTimeOfDay);
      setDateFilter(updated.dateFilter);
      setSearchFilter(updated.searchFilter);
      setViewMode(updated.viewMode);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 5. Geocode location search
  const handleSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setCoords({ lat: data.lat, lon: data.lon });
        setLocationName(data.displayName || query);
      } else {
        alert('Could not locate that address or zip code. Please try another query.');
      }
    } catch (err) {
      console.error('Geocode search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Geolocation browser API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ lat, lon });
        setLocationName('Your Current Location');
        setIsLoading(false);
      },
      (err) => {
        alert('Unable to retrieve your location: ' + err.message);
        setIsLoading(false);
      },
      { timeout: 8000 }
    );
  };

  // Autocomplete suggestion pick
  const handleSelectSuggestion = (item: { title: string; query: string; lat: number; lon: number }) => {
    setCoords({ lat: item.lat, lon: item.lon });
    setLocationName(`${item.title} (${item.query})`);
  };

  // Branch Selection Toggles
  const handleToggleBranch = (branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  // Toggle entire library system (e.g. all Glendale branches at once)
  const handleToggleSystemBranches = (systemId: string, selectAll: boolean) => {
    const systemBranchIds = branches.filter((b) => b.systemId === systemId).map((b) => b.id);
    setSelectedBranchIds((prev) => {
      if (selectAll) {
        const set = new Set([...prev, ...systemBranchIds]);
        return Array.from(set);
      } else {
        return prev.filter((id) => !systemBranchIds.includes(id));
      }
    });
  };

  const handleSelectAllBranches = () => {
    setSelectedBranchIds(branches.map((b) => b.id));
  };

  const handleDeselectAllBranches = () => {
    setSelectedBranchIds([]);
  };

  // Filter Toggles
  const handleToggleAge = (age: AgeGroup) => {
    setSelectedAges((prev) =>
      prev.includes(age) ? prev.filter((a) => a !== age) : [...prev, age]
    );
  };

  const handleToggleEventType = (type: EventType) => {
    setSelectedEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleToggleTimeOfDay = (time: TimeOfDay) => {
    setSelectedTimeOfDay((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };

  const handleClearFilters = () => {
    setSelectedAges([]);
    setSelectedEventTypes([]);
    setSelectedTimeOfDay([]);
    setDateFilter({ preset: 'all' });
    setSearchFilter('');
  };

  // Share functionality: Copies shareable link or invokes native share dialog
  const handleShare = async () => {
    const qs = buildSearchQuery(
      {
        coords,
        locationName,
        radiusMiles,
        selectedBranchIds,
        selectedAges,
        selectedEventTypes,
        selectedTimeOfDay,
        dateFilter,
        searchFilter,
        viewMode,
      },
      branches.length
    );

    const shareUrl = `${window.location.origin}${window.location.pathname}${qs}`;

    // Mobile native share sheet support
    if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `StorytimeRadar - Events in ${locationName}`,
          text: `Check out local library storytimes and kids events in ${locationName} on StorytimeRadar:`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Clipboard copy
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement('input');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setIsCopied(true);
    setShowToast(true);
    setTimeout(() => setIsCopied(false), 2500);
    setTimeout(() => setShowToast(false), 4000);
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Age filter
      if (selectedAges.length > 0) {
        const eventAges = ev.targetAges && ev.targetAges.length > 0 ? ev.targetAges : [ev.ageGroup];
        if (!selectedAges.some((a) => eventAges.includes(a))) {
          return false;
        }
      }

      // Event Type filter
      if (selectedEventTypes.length > 0 && !selectedEventTypes.includes(ev.eventType)) {
        return false;
      }

      // Date / Date Range filter
      if (dateFilter.preset !== 'all') {
        const evDayKey = getEventDayKey(ev.startTime, ev.timezone);
        const now = new Date();
        const todayKey = format(now, 'yyyy-MM-dd');

        if (dateFilter.preset === 'today') {
          if (evDayKey !== todayKey) return false;
        } else if (dateFilter.preset === 'tomorrow') {
          const tomorrowKey = format(addDays(now, 1), 'yyyy-MM-dd');
          if (evDayKey !== tomorrowKey) return false;
        } else if (dateFilter.preset === 'weekend') {
          const sat = isSaturday(now) ? now : nextSaturday(now);
          const sun = isSunday(now) ? now : isSaturday(now) ? addDays(now, 1) : nextSunday(now);
          const satKey = format(sat, 'yyyy-MM-dd');
          const sunKey = format(sun, 'yyyy-MM-dd');
          if (evDayKey !== satKey && evDayKey !== sunKey) return false;
        } else if (dateFilter.preset === 'week') {
          const weekEndKey = format(addDays(now, 7), 'yyyy-MM-dd');
          if (evDayKey < todayKey || evDayKey > weekEndKey) return false;
        } else if (dateFilter.preset === 'custom') {
          if (dateFilter.startDate && evDayKey < dateFilter.startDate) return false;
          if (dateFilter.endDate && evDayKey > dateFilter.endDate) return false;
        }
      }

      // Time of Day filter
      if (selectedTimeOfDay.length > 0) {
        const hour = getHours(parseISO(ev.startTime));
        const matchesTime = selectedTimeOfDay.some((t) => {
          if (t === 'morning') return hour < 11.5;
          if (t === 'midday') return hour >= 11.5 && hour < 14;
          if (t === 'afternoon') return hour >= 14;
          return false;
        });
        if (!matchesTime) return false;
      }

      // Search keyword filter
      if (searchFilter.trim().length > 0) {
        const q = searchFilter.toLowerCase();
        const matchesQuery =
          ev.title.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          ev.branchName.toLowerCase().includes(q) ||
          (ev.roomOrLocation && ev.roomOrLocation.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [events, selectedAges, selectedEventTypes, selectedTimeOfDay, dateFilter, searchFilter]);

  const hasActiveFilters =
    selectedAges.length > 0 ||
    selectedEventTypes.length > 0 ||
    selectedTimeOfDay.length > 0 ||
    dateFilter.preset !== 'all' ||
    searchFilter.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <Navbar
        locationLabel={locationName}
        selectedBranchCount={selectedBranchIds.length}
        onOpenSubscribeModal={() => setIsSubscribeModalOpen(true)}
        onOpenBranchModal={() => setIsBranchModalOpen(true)}
        onShare={handleShare}
        isCopied={isCopied}
      />

      {/* Hero with Search, Autocomplete and Radius */}
      <LocationHero
        currentLocationName={locationName}
        onSearch={handleSearch}
        onSelectSuggestion={handleSelectSuggestion}
        onUseCurrentLocation={handleUseCurrentLocation}
        radiusMiles={radiusMiles}
        onRadiusChange={setRadiusMiles}
        totalLibrariesFound={branches.length}
        selectedBranchCount={selectedBranchIds.length}
        onOpenBranchSelector={() => setIsBranchModalOpen(true)}
        isLoading={isLoading}
      />

      {/* Sticky Filter Bar */}
      <FilterBar
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        selectedAges={selectedAges}
        onToggleAge={handleToggleAge}
        selectedEventTypes={selectedEventTypes}
        onToggleEventType={handleToggleEventType}
        selectedTimeOfDay={selectedTimeOfDay}
        onToggleTimeOfDay={handleToggleTimeOfDay}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchFilter={searchFilter}
        onSearchFilterChange={setSearchFilter}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        totalFilteredEvents={filteredEvents.length}
        onShare={handleShare}
        isCopied={isCopied}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Unsupported branches alert */}
        {unsupportedBranches.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3.5 text-sm">
            <span className="text-xl shrink-0">⚠️</span>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 dark:text-amber-200">
                {unsupportedBranches.length === 1
                  ? `Live calendar feed unavailable for ${unsupportedBranches[0].name}`
                  : `Live calendar feed unavailable for ${unsupportedBranches.length} selected libraries`}
              </h4>
              <p className="mt-1 text-amber-800/90 dark:text-amber-300/80 leading-relaxed text-xs sm:text-sm">
                We couldn't retrieve a live calendar feed for{' '}
                <span className="font-medium">
                  {unsupportedBranches.slice(0, 3).map((b) => b.name).join(', ')}
                  {unsupportedBranches.length > 3 ? ` and ${unsupportedBranches.length - 3} more` : ''}
                </span>
                . We only display verified real events — check their official website for storytime schedules.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {unsupportedBranches.slice(0, 4).map((b) => (
                  <a
                    key={b.id}
                    href={
                      b.website ||
                      `https://www.google.com/search?q=${encodeURIComponent(
                        `${b.name} ${b.city} library storytime`
                      )}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 transition-colors"
                  >
                    <span>{b.name} Website</span>
                    <span className="text-[10px]">↗</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'agenda' ? (
          <AgendaView
            events={filteredEvents}
            onSelectEvent={setSelectedEvent}
            onClearFilters={handleClearFilters}
          />
        ) : (
          <CalendarView events={filteredEvents} onSelectEvent={setSelectedEvent} />
        )}
      </main>

      {/* Floating Share Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/50 dark:border-slate-200 text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-sm sm:max-w-md">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 dark:text-emerald-600 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm">Link copied to clipboard!</p>
            <p className="text-[11px] text-slate-300 dark:text-slate-600 leading-snug">
              Anyone opening this link will see your exact location, libraries, and active filters.
            </p>
          </div>
          <button
            onClick={() => setShowToast(false)}
            className="text-slate-400 hover:text-white dark:hover:text-slate-900 p-1 rounded-lg transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />

      <SubscribeModal
        isOpen={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
        selectedBranchIds={selectedBranchIds}
        selectedAges={selectedAges}
        selectedEventTypes={selectedEventTypes}
        coords={coords}
        radiusMiles={radiusMiles}
        totalBranches={branches.length}
      />

      <LibrarySelectorModal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        branches={branches}
        systems={systems}
        selectedBranchIds={selectedBranchIds}
        onToggleBranch={handleToggleBranch}
        onToggleSystemBranches={handleToggleSystemBranches}
        onSelectAll={handleSelectAllBranches}
        onDeselectAll={handleDeselectAllBranches}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>StorytimeRadar • Built with ❤️ from Pasadena, CA</p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleShare}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold"
            >
              Share Search
            </button>
            <span>•</span>
            <button
              onClick={() => setIsSubscribeModalOpen(true)}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold"
            >
              Get Calendar Feed
            </button>
            <span>•</span>
            <button
              onClick={() => setIsBranchModalOpen(true)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Manage Libraries
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="w-32 h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="w-24 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      </header>
      <div className="max-w-7xl w-full mx-auto px-4 py-8 space-y-4">
        <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
        <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
