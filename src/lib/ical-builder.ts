import ical, { ICalCalendarMethod } from 'ical-generator';
import { StorytimeEvent } from '@/types';

export function buildIcalFeed(
  events: StorytimeEvent[],
  calendarName: string = 'Storytime Radar - Kids Community Calendar'
): string {
  const calendar = ical({
    name: calendarName,
    description: 'Local community storytimes and kid events curated for your family',
    timezone: 'America/Los_Angeles',
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

    calendar.createEvent({
      id: `${event.id}@storytimeradar.local`,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
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
 * Creates a 1-click "Add to Google Calendar" URL for a single event
 */
export function createGoogleCalendarEventUrl(event: StorytimeEvent): string {
  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  const formatGoogleDate = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const title = encodeURIComponent(`${event.title} (${event.branchName})`);
  const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
  
  let detailsText = `${event.description}\n\nAge: ${event.ageRangeText || 'All Ages'}\nRoom: ${event.roomOrLocation || 'Children Area'}`;
  if (event.url) {
    detailsText += `\nInfo: ${event.url}`;
  }
  const details = encodeURIComponent(detailsText);
  const location = encodeURIComponent(`${event.branchName}, ${event.branchAddress}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
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
