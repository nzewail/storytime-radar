import { StorytimeEvent, LibraryBranch } from '@/types';
import { classifyEvent } from '@/lib/classifier';
import { matchEventToBranch, getBranchPageUrl } from '../matcher';
import { parseLocalDateTimeToIso, getTimezoneForState } from '../timezone';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

// In-memory cache for live Trumba feeds: 10 minutes TTL
const feedCache = new Map<string, { timestamp: number; events: StorytimeEvent[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Generic Trumba Calendar Parser.
 * Connects to any public library Trumba feed, extracts and classifies storytime events,
 * and maps them to branches using the generic branch matcher.
 */
export async function fetchTrumbaEvents(
  webName: string,
  systemBranches: LibraryBranch[]
): Promise<StorytimeEvent[]> {
  const now = Date.now();
  const cached = feedCache.get(webName);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.events;
  }

  const url = `https://www.trumba.com/calendars/${encodeURIComponent(webName)}.json`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'StorytimeRadar/2.0 (generic-calendar-client)',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    console.warn(`Trumba feed for ${webName} returned status: ${res.status}`);
    return cached ? cached.events : [];
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  const events: StorytimeEvent[] = [];

  for (const item of data) {
    if (item.canceled) continue;

    const rawTitle = decodeHtmlEntities(item.title || '');
    if (/^\s*cancelled\b/i.test(rawTitle)) continue;

    const rawLocation = decodeHtmlEntities(item.location || '')
      .replace(/<[^>]+>/g, '')
      .trim();
    const rawDescription = decodeHtmlEntities(item.description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Custom fields (Audience, Event Type, Logistics, etc.)
    const customFields = Array.isArray(item.customFields) ? item.customFields : [];
    const audienceField =
      customFields.find((f: any) => /audience/i.test(f.label || ''))?.value || '';
    const logisticsField =
      customFields.find((f: any) => /logistics/i.test(f.label || ''))?.value || '';
    const regField =
      customFields.find((f: any) => /registration/i.test(f.label || ''))?.value || '';
    const eventTypeField =
      customFields.find((f: any) => /event\s*type|category/i.test(f.label || ''))?.value || '';

    const textToSearch = `${rawTitle} ${rawDescription} ${audienceField} ${logisticsField} ${eventTypeField}`.toLowerCase();

    // Skip events explicitly targeted at adults only
    if (/^\s*(adults?|adults?\s+50\+|emerging adults|seniors?)\s*$/i.test(audienceField)) continue;

    // Check if kid / family / storytime event
    const isKidEvent =
      /story\s*time|storytime|toddler|baby|babies|infant|preschool|child|children|early learning|rhyme|craft|stem|playgroup|play & learn|stay and play|lego|read with|lap-sit|lapsit/i.test(
        textToSearch
      ) && !/\badults?\s*only\b|\bfor\s+adults\b|\badult\s+(craft|art|book|program|class|workshop|club|coloring)\b|\b50\+\b|\bseniors?\b|\btax\s+aid\b|\bcitizenship\s+class\b|\besl\s+class\b|\btech\s+help\s+for\s+seniors\b|\bgrown\s*ups?\b|\b(crochet|knitting|quilting)\s+(club|circle|group)\b/i.test(textToSearch);

    if (!isKidEvent) continue;

    // Match to a branch in this system using the generic matcher
    const matchedBranch = matchEventToBranch(rawLocation, rawTitle, rawDescription, systemBranches);
    if (!matchedBranch) continue;

    const classification = classifyEvent(
      rawTitle,
      `${rawDescription} ${audienceField} ${logisticsField} ${eventTypeField}`
    );

    const startTime = parseLocalDateTimeToIso(item.startDateTime, {
      explicitOffset: item.startTimeZoneOffset,
      state: matchedBranch.state,
    });
    const endTime = item.endDateTime
      ? parseLocalDateTimeToIso(item.endDateTime, {
          explicitOffset: item.endTimeZoneOffset || item.startTimeZoneOffset,
          state: matchedBranch.state,
        })
      : new Date(new Date(startTime).getTime() + 45 * 60000).toISOString();

    let eventUrl = item.permaLinkUrl || '';
    if (eventUrl.includes('cityofpasadena.net/library/?')) {
      eventUrl = eventUrl.replace('cityofpasadena.net/library/?', 'cityofpasadena.net/library/calendar/?');
    }
    if (!eventUrl || eventUrl.endsWith('/library/')) {
      eventUrl = `https://www.trumba.com/calendars/${webName}?trumbaEmbed=view%3Devent%26eventid%3D${item.eventID}`;
    }

    const isRegistrationRequired =
      item.openSignUp === true ||
      /registration is required|rsvp required/i.test(regField) ||
      classification.isRegistrationRequired;

    const timeSlug = startTime.slice(0, 19).replace(/[^0-9]/g, '');
    const eventIdentifier = item.eventID || rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 25);

    events.push({
      id: `trumba-${matchedBranch.id}-${eventIdentifier}-${timeSlug}`,
      systemId: matchedBranch.systemId,
      systemName: matchedBranch.systemName,
      branchId: matchedBranch.id,
      branchName: matchedBranch.name,
      branchAddress: `${matchedBranch.address}, ${matchedBranch.city}, ${matchedBranch.state} ${matchedBranch.zip}`,
      branchCity: matchedBranch.city,
      branchUrl: getBranchPageUrl(matchedBranch),
      title: rawTitle,
      description: rawDescription,
      startTime,
      endTime,
      ageGroup: classification.ageGroup,
      targetAges: classification.targetAges,
      ageRangeText: audienceField && !audienceField.includes(',') ? audienceField : classification.ageRangeText,
      eventType: classification.eventType,
      roomOrLocation: rawLocation || matchedBranch.name,
      url: eventUrl,
      isRegistrationRequired,
      timezone: getTimezoneForState(matchedBranch.state),
    });
  }

  feedCache.set(webName, {
    timestamp: now,
    events,
  });

  return events;
}
