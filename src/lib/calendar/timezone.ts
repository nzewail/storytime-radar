/**
 * Universal Library Timezone Utilities
 * Converts local wall-clock dates/times from library calendar systems
 * into accurate UTC ISO strings, accounting for library state, coordinates,
 * Daylight Saving Time, and vendor-provided offsets.
 */

export const STATE_TO_TIMEZONE: Record<string, string> = {
  // Pacific
  CA: 'America/Los_Angeles',
  WA: 'America/Los_Angeles',
  OR: 'America/Los_Angeles',
  NV: 'America/Los_Angeles',
  // Mountain
  AZ: 'America/Phoenix',
  CO: 'America/Denver',
  UT: 'America/Denver',
  NM: 'America/Denver',
  WY: 'America/Denver',
  MT: 'America/Denver',
  ID: 'America/Boise',
  // Central
  IL: 'America/Chicago',
  TX: 'America/Chicago',
  MN: 'America/Chicago',
  WI: 'America/Chicago',
  MO: 'America/Chicago',
  IA: 'America/Chicago',
  KS: 'America/Chicago',
  OK: 'America/Chicago',
  AR: 'America/Chicago',
  LA: 'America/Chicago',
  MS: 'America/Chicago',
  AL: 'America/Chicago',
  ND: 'America/Chicago',
  SD: 'America/Chicago',
  NE: 'America/Chicago',
  // Eastern
  NY: 'America/New_York',
  MI: 'America/Detroit',
  OH: 'America/New_York',
  PA: 'America/New_York',
  FL: 'America/New_York',
  GA: 'America/New_York',
  NC: 'America/New_York',
  SC: 'America/New_York',
  VA: 'America/New_York',
  WV: 'America/New_York',
  MD: 'America/New_York',
  DE: 'America/New_York',
  NJ: 'America/New_York',
  CT: 'America/New_York',
  RI: 'America/New_York',
  MA: 'America/New_York',
  VT: 'America/New_York',
  NH: 'America/New_York',
  ME: 'America/New_York',
  DC: 'America/New_York',
  // Alaska & Hawaii
  AK: 'America/Anchorage',
  HI: 'Pacific/Honolulu',
};

/**
 * Returns the IANA timezone for a given state abbreviation (defaults to 'America/Los_Angeles').
 */
export function getTimezoneForState(state?: string): string {
  if (!state) return 'America/Los_Angeles';
  return STATE_TO_TIMEZONE[state.trim().toUpperCase()] || 'America/Los_Angeles';
}

/**
 * Normalizes offset strings such as "-0700" to "-07:00".
 */
export function formatOffset(offsetStr?: string): string {
  if (!offsetStr) return '';
  const cleaned = offsetStr.trim();
  if (/^[+-]\d{4}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)}:${cleaned.slice(3)}`;
  }
  if (/^[+-]\d{2}:\d{2}$/.test(cleaned)) {
    return cleaned;
  }
  return '';
}

/**
 * Accurately determines the GMT offset string (e.g. "-07:00" or "-08:00")
 * for a specific calendar date and IANA timezone using standard Intl.DateTimeFormat.
 */
export function getTimezoneOffsetForDate(dateStr: string, timeZone: string): string {
  try {
    const datePart = dateStr.slice(0, 10);
    // Use noon UTC to avoid edge-of-day DST shift artifacts
    const ref = new Date(`${datePart}T12:00:00Z`);
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    });
    const parts = dtf.formatToParts(ref);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (tzPart && tzPart.startsWith('GMT')) {
      return tzPart.replace('GMT', '');
    }
  } catch {
    // Fallback if timezone invalid
  }
  return '-07:00';
}

/**
 * Converts a local ISO/date-time string into an accurate UTC ISO string.
 * Example inputs:
 *  - "2026-09-28T10:30:00" with explicitOffset: "-0700" -> "2026-09-28T17:30:00.000Z"
 *  - "2026-09-28 10:30:00" with state: "CA" -> "2026-09-28T17:30:00.000Z"
 */
export function parseLocalDateTimeToIso(
  dateTimeStr: string,
  options?: { explicitOffset?: string; state?: string; timeZone?: string }
): string {
  if (!dateTimeStr) return new Date().toISOString();

  let clean = dateTimeStr.trim().replace(' ', 'T');

  // If it already has an offset (e.g. +05:00, -07:00) or Z at the end, parse directly
  if (/[+-]\d{2}:?\d{2}$|Z$/i.test(clean)) {
    const parsed = new Date(clean);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  // Ensure 2-digit hour: e.g. T9:30:00 -> T09:30:00
  clean = clean.replace(/T(\d):/, (_, h) => `T0${h}:`);

  // Ensure seconds exist
  if (!clean.includes('T')) {
    clean += 'T10:00:00';
  } else if (/T\d{2}:\d{2}$/.test(clean)) {
    clean += ':00';
  }

  // Determine timezone offset
  let offset = formatOffset(options?.explicitOffset);
  if (!offset) {
    const tz =
      options?.timeZone ||
      (options?.state ? getTimezoneForState(options.state) : 'America/Los_Angeles');
    offset = getTimezoneOffsetForDate(clean, tz);
  }

  const combined = `${clean}${offset}`;
  const d = new Date(combined);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Combines separate dateStr and timeStr into an accurate UTC ISO string.
 * Supports:
 *  - dateStr: "09/28/2026", "2026-09-28", "September 28, 2026"
 *  - timeStr: "10:30 am", "10:30am - 11:00am", "10:30:00"
 */
/**
 * Infers duration in minutes from text (title or description) across any provider.
 * Looks for explicit duration mentions ("20 minutes", "30 mins", "1 hour", "45-minute storytime").
 */
export function inferDurationMinutes(text?: string): number | null {
  if (!text) return null;

  // 1. Hours: "1 hour", "1.5 hours", "2 hr"
  const hourMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:-|–)?\s*(?:hour|hr|hours|hrs)\b/i);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    if (!isNaN(hours) && hours > 0 && hours <= 6) {
      return Math.round(hours * 60);
    }
  }

  // 2. Minutes: "20-minute", "30 mins", "45 minutes"
  const minMatch = text.match(/\b(\d{1,3})\s*(?:-|–)?\s*(?:min|minute|minutes|mins)\b/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    if (mins >= 10 && mins <= 240) {
      return mins;
    }
  }

  return null;
}

export function combineDateAndTimeToIso(
  dateStr: string,
  timeStr: string,
  options?: {
    state?: string;
    timeZone?: string;
    textForDuration?: string;
    defaultDurationMinutes?: number;
  }
): { startTime: string; endTime: string } {
  try {
    let year = new Date().getFullYear();
    let month = 1;
    let day = 1;

    if (dateStr.includes('/')) {
      const parts = dateStr.split('/').map((s) => parseInt(s, 10));
      if (parts.length === 3) {
        month = parts[0];
        day = parts[1];
        year = parts[2] < 100 ? 2000 + parts[2] : parts[2];
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-').map((s) => parseInt(s, 10));
      if (parts.length === 3) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      }
    } else {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        year = parsed.getFullYear();
        month = parsed.getMonth() + 1;
        day = parsed.getDate();
      }
    }

    const yyyy = String(year).padStart(4, '0');
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const baseDate = `${yyyy}-${mm}-${dd}`;

    const parseTime = (t: string) => {
      const match =
        t.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i) ||
        t.match(/(\d{1,2})\s*(am|pm)/i);
      if (!match) return { hour: 10, minute: 0 };
      let h = parseInt(match[1], 10);
      const m = match[2] && !isNaN(parseInt(match[2], 10)) ? parseInt(match[2], 10) : 0;
      const ampm = (match[3] || (isNaN(parseInt(match[2], 10)) ? match[2] : '') || '').toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      return { hour: h, minute: m };
    };

    const firstTimePart = timeStr.split('-')[0].trim();
    const secondTimePart = timeStr.includes('-') ? timeStr.split('-')[1].trim() : null;

    const startH = parseTime(firstTimePart);
    const startHourStr = String(startH.hour).padStart(2, '0');
    const startMinStr = String(startH.minute).padStart(2, '0');
    const startLocal = `${baseDate}T${startHourStr}:${startMinStr}:00`;

    const startTime = parseLocalDateTimeToIso(startLocal, options);

    let endTime: string;
    if (secondTimePart) {
      const endH = parseTime(secondTimePart);
      const endHourStr = String(endH.hour).padStart(2, '0');
      const endMinStr = String(endH.minute).padStart(2, '0');
      const endLocal = `${baseDate}T${endHourStr}:${endMinStr}:00`;
      endTime = parseLocalDateTimeToIso(endLocal, options);
    } else {
      const inferredMinutes = inferDurationMinutes(options?.textForDuration);
      const durationMs = (inferredMinutes || options?.defaultDurationMinutes || 45) * 60000;
      endTime = new Date(new Date(startTime).getTime() + durationMs).toISOString();
    }

    return { startTime, endTime };
  } catch {
    const fallback = new Date().toISOString();
    return { startTime: fallback, endTime: fallback };
  }
}

/**
 * Formats an event's ISO time string (e.g. "10:30 AM") in the library's physical timezone.
 */
export function formatEventTime(isoString: string, timeZone?: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Formats an event's ISO date string (e.g. "Monday, September 28, 2026") in the library's physical timezone.
 */
export function formatEventDate(
  isoString: string,
  timeZone?: string,
  style: 'short' | 'medium' | 'full' = 'full'
): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    if (style === 'full') {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timeZone || 'America/Los_Angeles',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    }
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'America/Los_Angeles',
      dateStyle: style,
    }).format(d);
  } catch {
    return '';
  }
}

/**
 * Computes the calendar day key "YYYY-MM-DD" in the library's physical timezone.
 */
export function getEventDayKey(isoString: string, timeZone?: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString.slice(0, 10);
    // en-CA locale formats as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return isoString.slice(0, 10);
  }
}
