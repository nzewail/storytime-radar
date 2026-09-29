import ical, { ICalCalendarMethod } from 'ical-generator';
import { StorytimeEvent } from '@/types';

export function buildIcalFeed(
  events: StorytimeEvent[],
  calendarName: string = 'Storytime Radar - Kids Community Calendar'
): string {
  const calendar = ical({
    name: calendarName,
    description: 'Local community storytimes and kid events curated for your family',
    method: ICalCalendarMethod.PUBLISH,
    ttl: 60 * 60 * 6, // 6 hours cache TTL
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
    const stableStartTime = new Date(event.startTime);
    const eventTimezone = event.timezone || 'America/Los_Angeles';

    calendar.createEvent({
      id: `${cleanId}@storytimeradar.com`,
      start: stableStartTime,
      end: new Date(event.endTime),
      timezone: eventTimezone,
      stamp: stableStartTime, // Stable stamp prevents Google Calendar from re-syncing as fresh events
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
