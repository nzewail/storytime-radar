import { StorytimeEvent, LibraryBranch } from '@/types';
import { classifyEvent } from '@/lib/classifier';
import { matchEventToBranch, getBranchPageUrl } from '../matcher';
import { combineDateAndTimeToIso, getTimezoneForState } from '../timezone';

const drupalCache = new Map<string, { timestamp: number; events: StorytimeEvent[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

// Cached form configuration (branchMap, kid audience IDs)
interface DrupalFormConfig {
  branchMap: Map<string, string>;
  audienceIds: string[];
}
let drupalConfigCache: DrupalFormConfig | null = null;

async function getDrupalFormConfig(eventsSearchUrl: string): Promise<DrupalFormConfig> {
  if (drupalConfigCache) return drupalConfigCache;

  const branchMap = new Map<string, string>();
  const audienceIds: string[] = [];

  try {
    const res = await fetch(eventsSearchUrl, {
      headers: { 'User-Agent': 'StorytimeRadar/2.0 (drupal-client)' },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const html = await res.text();
      // Extract branch options
      const branchSelectMatch = html.match(/<select[^>]*name="branch"[^>]*>([\s\S]*?)<\/select>/i);
      if (branchSelectMatch) {
        const optionMatches = branchSelectMatch[1].matchAll(/<option\s+value="(\d+)"[^>]*>([^<]+)<\/option>/gi);
        for (const m of optionMatches) {
          branchMap.set(m[2].trim().toLowerCase(), m[1]);
        }
      }

      // Extract audience options for kids/babies/toddlers
      const audSelectMatch = html.match(/<select[^>]*name="audience"[^>]*>([\s\S]*?)<\/select>/i);
      if (audSelectMatch) {
        const audOptionMatches = audSelectMatch[1].matchAll(/<option\s+value="(\d+)"[^>]*>([^<]+)<\/option>/gi);
        for (const m of audOptionMatches) {
          const val = m[1];
          const label = m[2].trim().toLowerCase();
          if (/baby|toddler|kid|child|early learning|all ages|family/i.test(label)) {
            audienceIds.push(val);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to parse Drupal options:', err);
  }

  drupalConfigCache = { branchMap, audienceIds };
  return drupalConfigCache;
}

/**
 * Generic Drupal Calendar Parser.
 * Scrapes server-rendered Drupal event views (used by municipal libraries like LAPL).
 */
export async function fetchDrupalEvents(
  baseUrl: string,
  systemBranches: LibraryBranch[]
): Promise<StorytimeEvent[]> {
  const now = Date.now();
  const cached = drupalCache.get(baseUrl);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.events;
  }

  const eventsSearchUrl = `${baseUrl.replace(/\/+$/, '')}/events/search`;
  const { branchMap, audienceIds } = await getDrupalFormConfig(eventsSearchUrl);

  const events: StorytimeEvent[] = [];
  const processedUrls = new Set<string>();

  // Determine branch IDs to query if small branch set requested
  const queryBranchIds = new Set<string>();
  for (const branch of systemBranches) {
    const cleanName = branch.name
      .toLowerCase()
      .replace(/\b(branch|library|public|regional|neighborhood)\b/g, '')
      .trim();

    for (const [label, id] of branchMap.entries()) {
      if (label.includes(cleanName) || cleanName.includes(label)) {
        queryBranchIds.add(id);
      }
    }
  }

  let urlsToFetch: string[] = [];
  if (queryBranchIds.size > 0 && queryBranchIds.size <= 3) {
    urlsToFetch = Array.from(queryBranchIds).map((id) => `${eventsSearchUrl}?branch=${id}&items_per_page=96`);
  } else if (audienceIds.length > 0) {
    urlsToFetch = audienceIds.map((audId) => `${eventsSearchUrl}?audience=${audId}&items_per_page=96`);
  } else {
    urlsToFetch = [`${eventsSearchUrl}?items_per_page=96`];
  }

  for (const url of urlsToFetch) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'StorytimeRadar/2.0 (drupal-client)' },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const html = await res.text();
      const articleRegex = /<article[^>]*class="[^"]*c-teaser-standard--event[^"]*"[\s\S]*?<\/article>/gi;
      const articles = html.match(articleRegex) || [];

      for (const art of articles) {
        const titleMatch = art.match(
          /<h3[^>]*class="[^"]*c-teaser-standard__heading[^"]*"[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
        );
        if (!titleMatch) continue;

        const path = titleMatch[1];
        const eventUrl = path.startsWith('http') ? path : `${baseUrl.replace(/\/+$/, '')}${path}`;
        if (processedUrls.has(eventUrl)) continue;
        processedUrls.add(eventUrl);

        const rawTitle = titleMatch[2].replace(/<[^>]+>/g, '').trim();

        const descMatch = art.match(
          /<div[^>]*class="[^"]*c-teaser-standard__text[^"]*"[\s\S]*?<p>([\s\S]*?)<\/p>/i
        );
        const rawDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        const dateMatch = art.match(
          /<li[^>]*class="[^"]*c-teaser-standard__date[^"]*"[\s\S]*?>([\s\S]*?)<\/li>/i
        );
        const rawDate = dateMatch
          ? dateMatch[1]
              .replace(/<span[^>]*class="visually-hidden"[\s\S]*?<\/span>/i, '')
              .replace(/<[^>]+>/g, '')
              .trim()
          : '';

        const timeMatch = art.match(
          /<li[^>]*class="[^"]*c-teaser-standard__time[^"]*"[\s\S]*?>([\s\S]*?)<\/li>/i
        );
        const rawTime = timeMatch
          ? timeMatch[1]
              .replace(/<span[^>]*class="visually-hidden"[\s\S]*?<\/span>/i, '')
              .replace(/<[^>]+>/g, '')
              .trim()
          : '';

        const locMatch = art.match(
          /<li[^>]*class="[^"]*c-teaser-standard__location[^"]*"[\s\S]*?>([\s\S]*?)<\/li>/i
        );
        const rawLoc = locMatch
          ? locMatch[1]
              .replace(/<span[^>]*class="visually-hidden"[\s\S]*?<\/span>/i, '')
              .replace(/<[^>]+>/g, '')
              .replace(/Location:\s*/i, '')
              .trim()
          : '';

        const textToSearch = `${rawTitle} ${rawDesc}`.toLowerCase();

        // Filter for kid/family programming
        const isKidEvent =
          /story\s*time|storytime|toddler|baby|babies|infant|preschool|child|children|early learning|rhyme|playgroup|play & learn|stay and play|lego|read with|puppet|lap-sit|lapsit|family storytime/i.test(
            textToSearch
          ) && !/\badults?\s*only\b|\bfor\s+adults\b|\badult\s+(craft|art|book|program|class|workshop|club|coloring|d&d|chess|puzzle|game)\b|\b50\+\b|\bseniors?\b|\btax\s+aid\b|\bcitizenship\s+class\b|\besl\s+class\b|\bgrown\s*ups?\b|\b(crochet|knitting|quilting)\s+(club|circle|group)\b/i.test(textToSearch);

        if (!isKidEvent) continue;

        // Match branch using rawLoc, rawTitle, and rawDesc
        const matchedBranch = matchEventToBranch(rawLoc, rawTitle, rawDesc, systemBranches);
        if (!matchedBranch) continue;

        const classification = classifyEvent(rawTitle, rawDesc);
        const { startTime, endTime } = combineDateAndTimeToIso(rawDate, rawTime, {
          state: matchedBranch.state,
        });

        const timeSlug = startTime.slice(0, 19).replace(/[^0-9]/g, '');
        const eventIdentifier = path.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30);

        events.push({
          id: `drupal-${matchedBranch.id}-${eventIdentifier}-${timeSlug}`,
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
          roomOrLocation: rawLoc || matchedBranch.name,
          url: eventUrl,
          isRegistrationRequired: classification.isRegistrationRequired,
          timezone: getTimezoneForState(matchedBranch.state),
        });
      }
    } catch (err) {
      console.error(`Error querying Drupal events from ${url}:`, err);
    }
  }

  drupalCache.set(baseUrl, {
    timestamp: now,
    events,
  });

  return events;
}
