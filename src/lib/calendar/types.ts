import { StorytimeEvent, LibraryBranch } from '@/types';

export type CalendarPlatform = 'trumba' | 'libcal' | 'communico' | 'drupal' | 'ical' | 'unsupported';

export interface CalendarSource {
  systemId: string;
  platform: CalendarPlatform;
  calendarId: string; // e.g. Trumba calendar name, LibCal base URL, or .ics feed URL
}

export interface EventsFetchResult {
  events: StorytimeEvent[];
  unsupportedBranches: LibraryBranch[];
}
