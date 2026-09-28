import { LibraryBranch } from '@/types';
import { CalendarSource } from './types';

// In-memory cache for detected calendar sources by systemId
const detectionCache = new Map<string, CalendarSource | null>();

/**
 * Known calendar sources for prominent municipal/county systems
 * to allow sub-millisecond dispatch without HTTP probe round-trips.
 */
const KNOWN_SOURCES: Record<string, CalendarSource> = {
  // Pasadena Public Library (FSCS CA0094) -> Trumba
  'sys-ca0094': { systemId: 'sys-ca0094', platform: 'trumba', calendarId: 'pasadenalibrary' },
  // Seattle Public Library (FSCS WA0064) -> Trumba
  'sys-wa0064': { systemId: 'sys-wa0064', platform: 'trumba', calendarId: 'kalendaro' },
  // Los Angeles County Library (all 85 branches) -> Communico
  'sys-ca0062': { systemId: 'sys-ca0062', platform: 'communico', calendarId: 'https://visit.lacountylibrary.org' },
  // Los Angeles Public Library (all 73 branches) -> Drupal
  'sys-ca0063': { systemId: 'sys-ca0063', platform: 'drupal', calendarId: 'https://www.lapl.org' },
  // St. Clair County Library System (Port Huron & 10 branches) -> LibCal
  'sys-mi0321': { systemId: 'sys-mi0321', platform: 'libcal', calendarId: 'https://stclaircountylibrary.org' },
};

/**
 * Automatically detects the calendar platform for any library branch/system
 * by inspecting the library's website for vendor signatures (Trumba, LibCal, Communico, Drupal, iCal).
 */
export async function detectCalendarSource(
  systemId: string,
  sampleBranch?: LibraryBranch
): Promise<CalendarSource | null> {
  // 1. Check cache
  if (detectionCache.has(systemId)) {
    return detectionCache.get(systemId) || null;
  }

  // 2. Check seed sources
  if (KNOWN_SOURCES[systemId]) {
    detectionCache.set(systemId, KNOWN_SOURCES[systemId]);
    return KNOWN_SOURCES[systemId];
  }

  if (!sampleBranch || !sampleBranch.website) {
    detectionCache.set(systemId, null);
    return null;
  }

  // 3. Dynamic probing: fetch library homepage / events
  try {
    const res = await fetch(sampleBranch.website, {
      headers: { 'User-Agent': 'StorytimeRadar/2.0 (calendar-detector)' },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const html = await res.text();

      // Check Trumba
      const trumbaMatch = html.match(/trumba\.com\/calendars\/([a-zA-Z0-9_-]+)/i);
      if (trumbaMatch) {
        const source: CalendarSource = { systemId, platform: 'trumba', calendarId: trumbaMatch[1] };
        detectionCache.set(systemId, source);
        return source;
      }

      // Check Communico
      const communicoMatch =
        html.match(/https:\/\/([a-zA-Z0-9_.-]+)\.communico\.co/i) ||
        html.match(/https:\/\/(visit\.[a-zA-Z0-9_.-]+)/i);
      if (communicoMatch || html.includes('api.communico.co') || html.includes('amEvents(')) {
        const domain = communicoMatch ? communicoMatch[0] : sampleBranch.website;
        const source: CalendarSource = { systemId, platform: 'communico', calendarId: domain };
        detectionCache.set(systemId, source);
        return source;
      }

      // Check LibCal
      const libcalMatch = html.match(/https:\/\/([a-zA-Z0-9_.-]+)\.libcal\.com/i);
      if (libcalMatch || html.includes('springshare.com') || html.includes('libcal')) {
        const domain = libcalMatch ? `https://${libcalMatch[1]}.libcal.com` : sampleBranch.website;
        const source: CalendarSource = { systemId, platform: 'libcal', calendarId: domain };
        detectionCache.set(systemId, source);
        return source;
      }

      // Check Drupal
      if (
        html.includes('Drupal') ||
        html.includes('c-teaser-standard') ||
        html.includes('/events/search')
      ) {
        const source: CalendarSource = { systemId, platform: 'drupal', calendarId: sampleBranch.website };
        detectionCache.set(systemId, source);
        return source;
      }

      // Check iCal (.ics)
      const icsMatch = html.match(/href="([^"]+\.ics)"/i);
      if (icsMatch) {
        const source: CalendarSource = { systemId, platform: 'ical', calendarId: icsMatch[1] };
        detectionCache.set(systemId, source);
        return source;
      }
    }
  } catch {
    // Probing failed or timed out
  }

  detectionCache.set(systemId, null);
  return null;
}
