import ical, { ICalCalendarMethod } from 'ical-generator';
import { StorytimeEvent } from '@/types';

// In-memory pure VTIMEZONE definitions without node:fs dependencies
const TIMEZONE_COMPONENTS: Record<string, string> = {
  'America/Los_Angeles': `BEGIN:VTIMEZONE
TZID:America/Los_Angeles
X-LIC-LOCATION:America/Los_Angeles
BEGIN:DAYLIGHT
TZOFFSETFROM:-0800
TZOFFSETTO:-0700
TZNAME:PDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0700
TZOFFSETTO:-0800
TZNAME:PST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`,
  'America/New_York': `BEGIN:VTIMEZONE
TZID:America/New_York
X-LIC-LOCATION:America/New_York
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:EDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:EST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`,
  'America/Chicago': `BEGIN:VTIMEZONE
TZID:America/Chicago
X-LIC-LOCATION:America/Chicago
BEGIN:DAYLIGHT
TZOFFSETFROM:-0600
TZOFFSETTO:-0500
TZNAME:CDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0500
TZOFFSETTO:-0600
TZNAME:CST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`,
  'America/Denver': `BEGIN:VTIMEZONE
TZID:America/Denver
X-LIC-LOCATION:America/Denver
BEGIN:DAYLIGHT
TZOFFSETFROM:-0700
TZOFFSETTO:-0600
TZNAME:MDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0600
TZOFFSETTO:-0700
TZNAME:MST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`,
  'America/Phoenix': `BEGIN:VTIMEZONE
TZID:America/Phoenix
X-LIC-LOCATION:America/Phoenix
BEGIN:STANDARD
TZOFFSETFROM:-0700
TZOFFSETTO:-0700
TZNAME:MST
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE`,
  'America/Anchorage': `BEGIN:VTIMEZONE
TZID:America/Anchorage
X-LIC-LOCATION:America/Anchorage
BEGIN:DAYLIGHT
TZOFFSETFROM:-0900
TZOFFSETTO:-0800
TZNAME:AKDT
DTSTART:19700308T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:-0800
TZOFFSETTO:-0900
TZNAME:AKST
DTSTART:19701101T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
END:VTIMEZONE`,
  'Pacific/Honolulu': `BEGIN:VTIMEZONE
TZID:Pacific/Honolulu
X-LIC-LOCATION:Pacific/Honolulu
BEGIN:STANDARD
TZOFFSETFROM:-1000
TZOFFSETTO:-1000
TZNAME:HST
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE`,
};

function getVtimezoneComponent(tz: string): string | null {
  return TIMEZONE_COMPONENTS[tz] || TIMEZONE_COMPONENTS['America/Los_Angeles'];
}

export function buildIcalFeed(
  events: StorytimeEvent[],
  calendarName: string = 'StoryFeed'
): string {
  const primaryTimezone = events.find((e) => e.timezone)?.timezone || 'America/Los_Angeles';

  const calendar = ical({
    name: calendarName,
    description: 'Local community storytimes and kid events curated for your family',
    method: ICalCalendarMethod.PUBLISH,
    ttl: 60 * 60 * 6, // 6 hours cache TTL
  });

  calendar.timezone({
    name: primaryTimezone,
    generator: getVtimezoneComponent,
  });

  for (const event of events) {
    const ageTag = event.ageRangeText ? `[${event.ageRangeText}]` : '';
    const summary = `${ageTag} ${event.title} @ ${event.branchName}`.trim();

    let description = `${event.description}\n\n`;
    description += `📍 Library: ${event.branchName} (${event.systemName || ''})\n`;
    description += `🏢 Room: ${event.roomOrLocation || 'Children Area'}\n`;
    description += `👶 Target Age: ${event.ageRangeText || 'All Ages'}\n`;
    if (event.isRegistrationRequired) {
      description += `⚠️ Note: Registration / RSVP may be required.\n`;
    }
    if (event.url) {
      description += `🔗 More info: ${event.url}\n`;
    }
    description += `\nCurated via StorytimeRadar`;

    // Clean stable UID ending in standard domain
    const cleanId = event.id.replace(/[^a-zA-Z0-9_-]/g, '-');
    const stableStamp = new Date(event.startTime);
    const eventTimezone = event.timezone || 'America/Los_Angeles';
    const localStart = getLocalDateForTimezone(event.startTime, eventTimezone);
    const localEnd = getLocalDateForTimezone(event.endTime, eventTimezone);

    calendar.createEvent({
      id: `${cleanId}@storytimeradar.com`,
      start: localStart,
      end: localEnd,
      timezone: eventTimezone,
      stamp: stableStamp, // Stable stamp prevents Google Calendar from re-syncing as fresh events
      sequence: 1,
      summary,
      description,
      location: `${event.roomOrLocation ? event.roomOrLocation + ', ' : ''}${event.branchName}, ${event.branchAddress}`,
      url: event.url,
      categories: [{ name: event.ageGroup }, { name: event.eventType }, { name: 'Library Storytime' }],
    });
  }

  return calendar.toString();
}

/**
 * Constructs a Date object whose host-local methods (getHours, getMinutes, etc.)
 * return the exact wall-clock time in the target IANA timezone, regardless of the
 * server's host environment timezone (e.g. Vercel UTC vs local dev).
 */
function getLocalDateForTimezone(isoStr: string, timeZone: string): Date {
  const d = new Date(isoStr);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(d);
  const p: Record<string, string> = {};
  for (const part of parts) {
    p[part.type] = part.value;
  }
  return new Date(
    parseInt(p.year, 10),
    parseInt(p.month, 10) - 1,
    parseInt(p.day, 10),
    parseInt(p.hour, 10),
    parseInt(p.minute, 10),
    parseInt(p.second, 10)
  );
}

/**
 * Formats a UTC ISO date string into Google Calendar URL local format: YYYYMMDDTHHmmss
 * in the event's local library timezone.
 */
function formatLocalGoogleDate(isoStr: string, timeZone: string): string {
  try {
    const d = new Date(isoStr);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(d);
    const p: Record<string, string> = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }
    return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`;
  } catch {
    return new Date(isoStr).toISOString().replace(/[-:]/g, '').slice(0, 15);
  }
}

/**
 * Creates an accurate 1-click "Add to Google Calendar" URL for a single event.
 * Uses local wall-clock time combined with explicit `ctz` parameter so Google Calendar
 * reliably renders the event at the correct library time without timezone drift.
 */
export function createGoogleCalendarEventUrl(event: StorytimeEvent): string {
  const timeZone = event.timezone || 'America/Los_Angeles';

  const startFormatted = formatLocalGoogleDate(event.startTime, timeZone);
  const endFormatted = formatLocalGoogleDate(event.endTime, timeZone);

  const title = encodeURIComponent(`${event.title} (${event.branchName})`);
  const dates = `${startFormatted}/${endFormatted}`;
  const ctz = encodeURIComponent(timeZone);
  
  let detailsText = `${event.description}\n\nAge: ${event.ageRangeText || 'All Ages'}\nRoom: ${event.roomOrLocation || 'Children Area'}`;
  if (event.url) {
    detailsText += `\nInfo: ${event.url}`;
  }
  const details = encodeURIComponent(detailsText);
  const location = encodeURIComponent(`${event.branchName}, ${event.branchAddress}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&ctz=${ctz}&details=${details}&location=${location}`;
}

/**
 * Creates webcal:// link and Google Calendar subscription link
 */
export function createCalendarSubscriptionUrls(baseUrl: string, queryParams: string) {
  const normalizedBase = baseUrl.replace(/^https?:\/\//, '');
  const webcalUrl = `webcal://${normalizedBase}/api/feed.ics${queryParams ? '?' + queryParams : ''}`;
  const httpsUrl = `https://${normalizedBase}/api/feed.ics${queryParams ? '?' + queryParams : ''}`;
  const googleCalSubscribeUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;

  return {
    webcalUrl,
    httpsUrl,
    googleCalSubscribeUrl,
  };
}
