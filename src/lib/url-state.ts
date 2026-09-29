import type { AgeGroup, EventType, TimeOfDay, DateFilter, DatePreset } from '@/types';

export const DEFAULT_COORDS = { lat: 34.1449, lon: -118.1381 };
export const DEFAULT_LOCATION_NAME = 'Pasadena, CA (91101)';
export const DEFAULT_RADIUS = 10;
export const DEFAULT_AGES: AgeGroup[] = ['baby', 'toddler'];

export const VALID_AGES: AgeGroup[] = ['baby', 'toddler', 'preschool', 'kids', 'all-ages'];
export const VALID_EVENT_TYPES: EventType[] = ['storytime', 'music-movement', 'playgroup', 'crafts-stem', 'other'];
export const VALID_TIMES: TimeOfDay[] = ['morning', 'midday', 'afternoon'];
export const VALID_DATE_PRESETS: DatePreset[] = ['all', 'today', 'tomorrow', 'weekend', 'week', 'custom'];

export interface ParsedUrlState {
  coords: { lat: number; lon: number };
  locationName: string;
  radiusMiles: number;
  initialBranchIds: string[] | null;
  selectedAges: AgeGroup[];
  selectedEventTypes: EventType[];
  selectedTimeOfDay: TimeOfDay[];
  dateFilter: DateFilter;
  searchFilter: string;
  viewMode: 'agenda' | 'month';
}

/**
 * Parses search parameters into typed application state.
 */
export function parseUrlState(searchParams: URLSearchParams | { get: (key: string) => string | null }): ParsedUrlState {
  // Coords
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');
  const parsedLat = latStr ? parseFloat(latStr) : NaN;
  const parsedLon = lonStr ? parseFloat(lonStr) : NaN;
  const hasCoords = !isNaN(parsedLat) && !isNaN(parsedLon);
  const coords = hasCoords ? { lat: parsedLat, lon: parsedLon } : DEFAULT_COORDS;

  // Location Name
  const loc = searchParams.get('loc');
  const locationName = loc
    ? loc.trim()
    : hasCoords
    ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`
    : DEFAULT_LOCATION_NAME;

  // Radius
  const radiusStr = searchParams.get('radius');
  const parsedRadius = radiusStr ? parseInt(radiusStr, 10) : NaN;
  const radiusMiles =
    !isNaN(parsedRadius) && parsedRadius > 0 && parsedRadius <= 50 ? parsedRadius : DEFAULT_RADIUS;

  // Initial Branches
  const branchesParam = searchParams.get('branches');
  let initialBranchIds: string[] | null = null;
  if (branchesParam !== null) {
    if (branchesParam === 'none' || branchesParam.trim() === '') {
      initialBranchIds = [];
    } else {
      initialBranchIds = branchesParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  // Ages
  const agesParam = searchParams.get('ages');
  let selectedAges: AgeGroup[] = DEFAULT_AGES;
  if (agesParam !== null) {
    if (agesParam === 'all' || agesParam === 'none' || agesParam.trim() === '') {
      selectedAges = [];
    } else {
      const parsed = agesParam
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is AgeGroup => VALID_AGES.includes(s as AgeGroup));
      selectedAges = parsed;
    }
  }

  // Event Types
  const typesParam = searchParams.get('types');
  let selectedEventTypes: EventType[] = [];
  if (typesParam) {
    selectedEventTypes = typesParam
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is EventType => VALID_EVENT_TYPES.includes(s as EventType));
  }

  // Time of Day
  const timesParam = searchParams.get('times');
  let selectedTimeOfDay: TimeOfDay[] = [];
  if (timesParam) {
    selectedTimeOfDay = timesParam
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is TimeOfDay => VALID_TIMES.includes(s as TimeOfDay));
  }

  // Date Filter
  const datePreset = searchParams.get('date');
  let dateFilter: DateFilter = { preset: 'all' };
  if (datePreset && VALID_DATE_PRESETS.includes(datePreset as DatePreset)) {
    dateFilter = {
      preset: datePreset as DatePreset,
      startDate: searchParams.get('start') || undefined,
      endDate: searchParams.get('end') || undefined,
    };
  }

  // Search keyword
  const searchFilter = (searchParams.get('q') || '').trim();

  // View Mode
  const viewParam = searchParams.get('view');
  const viewMode: 'agenda' | 'month' = viewParam === 'month' ? 'month' : 'agenda';

  return {
    coords,
    locationName,
    radiusMiles,
    initialBranchIds,
    selectedAges,
    selectedEventTypes,
    selectedTimeOfDay,
    dateFilter,
    searchFilter,
    viewMode,
  };
}

/**
 * Builds the query string representing current state.
 * Returns empty string if query parameters match the defaults.
 */
export function buildSearchQuery(
  state: {
    coords: { lat: number; lon: number };
    locationName: string;
    radiusMiles: number;
    selectedBranchIds: string[];
    selectedAges: AgeGroup[];
    selectedEventTypes: EventType[];
    selectedTimeOfDay: TimeOfDay[];
    dateFilter: DateFilter;
    searchFilter: string;
    viewMode: 'agenda' | 'month';
  },
  totalBranchesCount: number
): string {
  const params = new URLSearchParams();

  // Location
  const isDefaultCoords =
    Math.abs(state.coords.lat - DEFAULT_COORDS.lat) < 0.0001 &&
    Math.abs(state.coords.lon - DEFAULT_COORDS.lon) < 0.0001;
  const isDefaultLocationName = state.locationName === DEFAULT_LOCATION_NAME;

  if (!isDefaultCoords) {
    params.set('lat', Number(state.coords.lat.toFixed(4)).toString());
    params.set('lon', Number(state.coords.lon.toFixed(4)).toString());
    if (state.locationName && !isDefaultLocationName) {
      params.set('loc', state.locationName);
    }
  } else if (!isDefaultLocationName) {
    params.set('loc', state.locationName);
  }

  // Radius
  if (state.radiusMiles !== DEFAULT_RADIUS) {
    params.set('radius', state.radiusMiles.toString());
  }

  // Branches
  if (totalBranchesCount > 0) {
    if (state.selectedBranchIds.length === 0) {
      params.set('branches', 'none');
    } else if (state.selectedBranchIds.length < totalBranchesCount) {
      params.set('branches', state.selectedBranchIds.join(','));
    }
  }

  // Ages: default is baby,toddler
  const isDefaultAges =
    state.selectedAges.length === 2 &&
    state.selectedAges.includes('baby') &&
    state.selectedAges.includes('toddler');

  if (!isDefaultAges) {
    if (state.selectedAges.length === 0) {
      params.set('ages', 'all');
    } else {
      params.set('ages', state.selectedAges.join(','));
    }
  }

  // Event Types
  if (state.selectedEventTypes.length > 0) {
    params.set('types', state.selectedEventTypes.join(','));
  }

  // Time of Day
  if (state.selectedTimeOfDay.length > 0) {
    params.set('times', state.selectedTimeOfDay.join(','));
  }

  // Date Filter
  if (state.dateFilter.preset !== 'all') {
    params.set('date', state.dateFilter.preset);
    if (state.dateFilter.preset === 'custom') {
      if (state.dateFilter.startDate) params.set('start', state.dateFilter.startDate);
      if (state.dateFilter.endDate) params.set('end', state.dateFilter.endDate);
    }
  }

  // Search keyword
  if (state.searchFilter.trim().length > 0) {
    params.set('q', state.searchFilter.trim());
  }

  // View Mode
  if (state.viewMode !== 'agenda') {
    params.set('view', state.viewMode);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
