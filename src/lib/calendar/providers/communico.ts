import { StorytimeEvent, LibraryBranch } from '@/types';
import { classifyEvent } from '@/lib/classifier';
import { matchEventToBranch, getBranchPageUrl } from '../matcher';
import { parseLocalDateTimeToIso, getTimezoneForState } from '../timezone';

// In-memory cache for live Communico feeds: 10 minutes TTL
const communicoCache = new Map<string, { timestamp: number; events: StorytimeEvent[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Generic Communico Calendar Provider.
 * Fetches events from any Communico Connect / LibNet portal using standard eeventcaldata JSON API.
 */
export async function fetchCommunicoEvents(
  baseUrl: string,
  systemBranches: LibraryBranch[]
): Promise<StorytimeEvent[]> {
  const now = Date.now();
  const cached = communicoCache.get(baseUrl);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.events;
  }

  // Format today as YYYY-MM-DD
  const todayStr = new Date().toISOString().slice(0, 10);
  const reqParam = encodeURIComponent(JSON.stringify({ date: todayStr, days: 30 }));
  const url = `${baseUrl.replace(/\/+$/, '')}/eeventcaldata?event_type=0&req=${reqParam}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'StorytimeRadar/2.0 (communico-client)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`Communico feed for ${baseUrl} returned status: ${res.status}`);
      return cached ? cached.events : [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const events: StorytimeEvent[] = [];

    for (const item of data) {
      const rawTitle = (item.title || '').trim();
      const rawDesc = (item.description || item.sub_title || '').trim();
      const rawLocation = (item.location || item.library || '').trim();
      const rawAges = [
        item.ages,
        Array.isArray(item.agesArray) ? item.agesArray.join(' ') : '',
        item.tags,
        Array.isArray(item.tagsArray) ? item.tagsArray.join(' ') : '',
        item.search_tags,
      ]
        .filter(Boolean)
        .join(' ');

      const textToSearch = `${rawTitle} ${rawDesc} ${rawLocation} ${rawAges}`.toLowerCase();

      // Filter for kid/family/storytime programming
      const isKidEvent =
        /story\s*time|storytime|toddler|baby|babies|infant|preschool|child|children|early learning|rhyme|playgroup|play & learn|stay and play|lego|read with|lap-sit|lapsit|craft|family/i.test(
          textToSearch
        ) && !/adults only|50\+|tax aid|citizenship class|esl class|tech help for seniors/i.test(textToSearch);

      if (!isKidEvent) continue;

      // Match branch using generic matcher
      const matchedBranch = matchEventToBranch(rawLocation, rawTitle, rawDesc, systemBranches);
      if (!matchedBranch) continue;

      const classification = classifyEvent(rawTitle, `${rawDesc} ${rawAges}`);

      const startRaw = item.event_start || item.raw_start_time || '';
      const endRaw = item.event_end || item.raw_end_time || '';

      const startTime = parseLocalDateTimeToIso(startRaw, {
        state: matchedBranch.state,
      });
      const endTime = endRaw
        ? parseLocalDateTimeToIso(endRaw, {
            state: matchedBranch.state,
          })
        : new Date(new Date(startTime).getTime() + 45 * 60000).toISOString();

      const eventUrl = item.url || matchedBranch.website || `${baseUrl}/event/${item.id}`;

      const timeSlug = startTime.slice(0, 19).replace(/[^0-9]/g, '');
      const eventIdentifier = item.id || rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 25);

      events.push({
        id: `communico-${matchedBranch.id}-${eventIdentifier}-${timeSlug}`,
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
        roomOrLocation: rawLocation || matchedBranch.name,
        url: eventUrl,
        isRegistrationRequired: item.allow_reg === '1' || classification.isRegistrationRequired,
        timezone: getTimezoneForState(matchedBranch.state),
      });
    }

    communicoCache.set(baseUrl, {
      timestamp: now,
      events,
    });

    return events;
  } catch (err) {
    console.error(`Error fetching Communico events from ${baseUrl}:`, err);
    return cached ? cached.events : [];
  }
}
