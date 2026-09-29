import { StorytimeEvent, LibraryBranch } from '@/types';
import { classifyEvent } from '@/lib/classifier';
import { matchEventToBranch, getBranchPageUrl } from '../matcher';
import { combineDateAndTimeToIso, getTimezoneForState } from '../timezone';

export let lastOpenCitiesDiagnostics: any = null;

// In-memory cache for live OpenCities feeds: 10 minutes TTL
const opencitiesCache = new Map<string, { timestamp: number; events: StorytimeEvent[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

interface OpenCitiesItemDetail {
  Title?: string;
  Description?: string;
  Link?: string;
  Image?: string;
  AltText?: string;
  Address?: {
    Venue?: string;
    Street?: string;
    Formatted?: string;
  };
  IsCancelled?: boolean;
}

/**
 * Generic OpenCities Calendar Provider.
 * Connects to any municipal/county OpenCities portal (powered by Granicus / CivicPlus).
 * Discovers the calendar entity, queries /ocapi/calendars/getcalendaritems,
 * retrieves rich item details via /ocapi/get/contentinfo, and normalizes events.
 */
export async function fetchOpenCitiesEvents(
  calendarUrlOrDomain: string,
  systemBranches: LibraryBranch[]
): Promise<StorytimeEvent[]> {
  const now = Date.now();
  const cached = opencitiesCache.get(calendarUrlOrDomain);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.events;
  }

  try {
    let pageUrl = calendarUrlOrDomain;
    let entityId: string | null = null;

    if (calendarUrlOrDomain.includes('|')) {
      const [pUrl, eId] = calendarUrlOrDomain.split('|');
      pageUrl = pUrl;
      entityId = eId;
    }

    const urlObj = new URL(pageUrl);
    const origin = urlObj.origin;

    // 1. If entityId is not pre-configured, fetch calendar page HTML to extract data-entity-id
    if (!entityId) {
      const pageRes = await fetch(pageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!pageRes.ok) {
        console.warn(`OpenCities calendar page returned status: ${pageRes.status}`);
        return cached ? cached.events : [];
      }

      const html = await pageRes.text();
      const entityMatch =
        html.match(/data-entity-id=['"]([a-f0-9-]+)['"]/i) ||
        html.match(/data-calendar-id=['"]([a-f0-9-]+)['"]/i);

      if (!entityMatch) {
        console.warn(`Could not extract OpenCities data-entity-id from ${pageUrl}`);
        return cached ? cached.events : [];
      }

      entityId = entityMatch[1];
    }

    // 2. Query sub-calendar IDs
    const calListRes = await fetch(
      `${origin}/ocapi/calendars/getcalendars/${entityId}/calendar`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    let calendarIds = [entityId];
    if (calListRes.ok) {
      const calListJson = await calListRes.json();
      if (calListJson.success && Array.isArray(calListJson.data)) {
        const ids = calListJson.data.map((c: any) => c.Id).filter(Boolean);
        if (ids.length > 0) calendarIds = ids;
      }
    }

    // 3. Post getcalendaritems for the next 45 days
    const today = new Date();
    const startDate = today.toISOString().slice(0, 10);
    const futureDate = new Date(today.getTime() + 45 * 86400000).toISOString().slice(0, 10);

    const itemsRes = await fetch(`${origin}/ocapi/calendars/getcalendaritems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: origin,
        Referer: pageUrl,
      },
      body: JSON.stringify({
        LanguageCode: 'en-US',
        Ids: calendarIds,
        StartDate: startDate,
        EndDate: futureDate,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!itemsRes.ok) {
      console.warn(`OpenCities getcalendaritems returned status: ${itemsRes.status}`);
      return cached ? cached.events : [];
    }

    const itemsJson = await itemsRes.json();
    const rawItems: any[] = [];
    for (const day of itemsJson.data || []) {
      for (const item of day.Items || []) {
        rawItems.push(item);
      }
    }

    // 4. Pre-filter candidate events and skip obvious adult-only / civic meetings
    const candidateItems = rawItems.filter((item) => {
      const name = item.Name || '';
      // Negative filter for civic/board meetings, adult clubs, and senior-only events
      if (
        /board of trustees|city council|commission|blood drive|senior center|film club|50\+|tax aid|citizenship class/i.test(
          name
        )
      ) {
        return false;
      }

      // Positive check for kid/family programming
      return /story\s*time|storytime|toddler|baby|babies|preschool|child|children|kids?|craft|family|dance|lego|play/i.test(
        name
      );
    });

    // 5. Concurrently fetch rich contentinfo details for unique program IDs
    const contentCache = new Map<string, OpenCitiesItemDetail>();
    const uniqueMainIds = Array.from(new Set(candidateItems.map((c) => c.MainContentId)));

    await Promise.all(
      uniqueMainIds.map(async (mainId) => {
        const sample = candidateItems.find((c) => c.MainContentId === mainId);
        if (!sample) return;

        const params = new URLSearchParams({
          calendarId: sample.CalendarId,
          contentId: sample.Id,
          language: 'en-US',
          currentDateTime: sample.DateTime,
          mainContentId: sample.MainContentId,
        });

        try {
          const detailRes = await fetch(`${origin}/ocapi/get/contentinfo?${params.toString()}`, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              Referer: pageUrl,
            },
            signal: AbortSignal.timeout(6000),
          });

          if (detailRes.ok) {
            const detailJson = await detailRes.json();
            if (detailJson.success && detailJson.data) {
              contentCache.set(mainId, detailJson.data);
            }
          }
        } catch {
          // Fallback to basic info if detail fetch times out
        }
      })
    );

    // 6. Build normalized StorytimeEvents
    const events: StorytimeEvent[] = [];

    for (const item of candidateItems) {
      const detail = contentCache.get(item.MainContentId) || {};
      if (detail.IsCancelled) continue;

      const rawTitle = (detail.Title || item.Name || '').trim();
      const rawDesc = (detail.Description || '').trim();
      const rawVenue = (detail.Address?.Venue || '').trim();
      const rawLocation = (detail.Address?.Formatted || rawVenue).trim();

      const textToSearch = `${rawTitle} ${rawDesc} ${rawVenue}`.toLowerCase();

      // Final adult exclusion & kid filter
      const isAdultEvent =
        /\badults?\s*only\b|\bfor\s+adults\b|\badult\s+(craft|art|book|program|class|workshop|club|coloring)\b|\b50\+\b|\bseniors?\b|senior center|\btax\s+aid\b|\bcitizenship\s+class\b|\bgrown\s*ups?\b|\b(crochet|knitting|quilting)\s+(club|circle|group)\b/i.test(
          textToSearch
        );
      if (isAdultEvent) continue;

      const isKidEvent =
        /story\s*time|storytime|toddler|baby|babies|infant|preschool|child|children|kids?|early learning|rhyme|playgroup|play & learn|stay and play|lego|read with|lap-sit|lapsit|family|puppet/i.test(
          textToSearch
        );
      if (!isKidEvent) continue;

      // Match to library branch
      const defaultBranch = systemBranches.length === 1 ? systemBranches[0] : null;
      const matchedBranch =
        matchEventToBranch(rawVenue, rawTitle, rawDesc, systemBranches) || defaultBranch;
      if (!matchedBranch) continue;

      const classification = classifyEvent(rawTitle, rawDesc);

      // Parse start and end times (item.DateTime format: "10/1/2026 10:30:00 AM")
      const parts = (item.DateTime || '').split(' ');
      const datePart = parts[0] || '';
      const timePart = parts[1] || '';
      const ampm = parts[2] || '';
      const cleanTime = ampm ? `${timePart.slice(0, 5)} ${ampm}` : timePart;

      const { startTime, endTime } = combineDateAndTimeToIso(datePart, cleanTime, {
        state: matchedBranch.state,
      });

      const eventUrl = detail.Link
        ? detail.Link.startsWith('http')
          ? detail.Link
          : `${origin}${detail.Link}`
        : calendarUrlOrDomain;

      const timeSlug = startTime.slice(0, 19).replace(/[^0-9]/g, '');
      const eventIdentifier = item.Id ? item.Id.slice(0, 25) : rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 25);

      events.push({
        id: `opencities-${matchedBranch.id}-${eventIdentifier}-${timeSlug}`,
        systemId: matchedBranch.systemId,
        systemName: matchedBranch.systemName,
        branchId: matchedBranch.id,
        branchName: matchedBranch.name,
        branchAddress: `${matchedBranch.address}, ${matchedBranch.city}, ${matchedBranch.state} ${matchedBranch.zip}`,
        branchCity: matchedBranch.city,
        branchUrl: getBranchPageUrl(matchedBranch),
        title: rawTitle,
        description: rawDesc,
        startTime,
        endTime,
        ageGroup: classification.ageGroup,
        targetAges: classification.targetAges,
        ageRangeText: classification.ageRangeText,
        eventType: classification.eventType,
        roomOrLocation: rawVenue || matchedBranch.name,
        url: eventUrl,
        isRegistrationRequired: classification.isRegistrationRequired,
        timezone: getTimezoneForState(matchedBranch.state),
      });
    }

    lastOpenCitiesDiagnostics = {
      success: true,
      entityId,
      calendarIds,
      candidateItemsCount: candidateItems.length,
      eventsCount: events.length,
    };

    if (events.length > 0) {
      opencitiesCache.set(calendarUrlOrDomain, {
        timestamp: now,
        events,
      });
    }

    return events;
  } catch (err: any) {
    lastOpenCitiesDiagnostics = {
      success: false,
      error: err?.message || String(err),
      stack: err?.stack,
    };
    console.error(`Error fetching OpenCities events from ${calendarUrlOrDomain}:`, err);
    return cached ? cached.events : [];
  }
}
