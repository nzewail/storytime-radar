export type AgeGroup = 'baby' | 'toddler' | 'preschool' | 'kids' | 'all-ages';

export type EventType = 'storytime' | 'music-movement' | 'crafts-stem' | 'playgroup' | 'other';

export type TimeOfDay = 'morning' | 'midday' | 'afternoon';

export interface AgeCategoryInfo {
  id: AgeGroup;
  label: string;
  ageRange: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export interface LibrarySystem {
  id: string;
  name: string;
  city: string;
  state: string;
  website: string;
  color: string;
  providerType: 'libcal' | 'ical' | 'communico' | 'custom';
}

export interface LibraryBranch {
  id: string;
  systemId: string;
  systemName: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lon: number;
  phone?: string;
  website?: string;
  distanceMiles?: number;
}

export interface StorytimeEvent {
  id: string;
  systemId: string;
  systemName?: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  branchCity?: string;
  title: string;
  description: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  ageGroup: AgeGroup;
  ageRangeText?: string;
  eventType: EventType;
  roomOrLocation?: string;
  url?: string;
  isRegistrationRequired?: boolean;
  color?: string;
}

export interface LocationCoordinates {
  lat: number;
  lon: number;
  displayName: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface FilterState {
  selectedAges: AgeGroup[];
  selectedEventTypes: EventType[];
  selectedBranchIds: string[];
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  timeOfDay: TimeOfDay[];
  searchQuery: string;
}
