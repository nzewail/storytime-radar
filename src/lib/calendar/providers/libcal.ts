import { StorytimeEvent, LibraryBranch } from '@/types';
import { classifyEvent } from '@/lib/classifier';
import { matchEventToBranch, getBranchPageUrl } from '../matcher';
import { combineDateAndTimeToIso, getTimezoneForState } from '../timezone';

const libcalCache = new Map<string, { timestamp: number; events: StorytimeEvent[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Generic LibCal Calendar Provider.
 * Supports public LibCal events pages and feeds.
 */
export async function fetchLibCalEvents(
  baseUrl: string,
  systemBranches: LibraryBranch[]
): Promise<StorytimeEvent[]> {
  const now = Date.now();
  const cached = libcalCache.get(baseUrl);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.events;
  }

  // Ensure clean target events URL
  const targetUrl = baseUrl.includes('/events')
    ? baseUrl
    : `${baseUrl.replace(/\/+$/, '')}/events`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'StorytimeRadar/2.0 (libcal-client)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`LibCal feed at ${targetUrl} returned status: ${res.status}`);
      return cached ? cached.events : [];
    }

    const html = await res.text();
    const events: StorytimeEvent[] = [];

    // Parse LibCal standard event blocks
    const blockRegex = /<div[^>]*class="[^"]*row hor-block[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi;
    const blocks = html.match(blockRegex) || [];

    for (const block of blocks) {
      const titleMatch = block.match(
        /<div[^>]*class="[^"]*hor-block--title[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      );
      const descMatch = block.match(
        /<div[^>]*class="[^"]*hor-block--excerpt[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      );
      const dateMatch = block.match(
        /<span[^>]*class="[^"]*date[^"]*"[^>]*>([\s\S]*?)(?:<|:)/i
      );
      const timeMatch = block.match(
        /<span[^>]*class="[^"]*num[^"]*"[^>]*>([\s\S]*?)<\/span>/i
      );
      const placeMatch = block.match(
        /<span[^>]*class="[^"]*place[^"]*"[^>]*>([\s\S]*?)<\/span>/i
      );
      const linkMatch = block.match(
        /href="([^"]*(?:libcal\.com\/event|\/events\/list)[^"]*)"/i
      );

      const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const place = placeMatch ? placeMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const dateStr = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const timeStr = timeMatch ? timeMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      let eventUrl = linkMatch ? linkMatch[1] : targetUrl;
      if (eventUrl.startsWith('/')) {
        eventUrl = `${baseUrl.replace(/\/+$/, '')}${eventUrl}`;
      }

      if (!title) continue;

      const textToSearch = `${title} ${desc}`.toLowerCase();
      const isKidEvent =
        /story\s*time|storytime|toddler|baby|babies|infant|preschool|child|children|early learning|rhyme|playgroup|stay and play|lego|read with|family|craft|puppet/i.test(
          textToSearch
        ) && !/adults only|50\+|tax aid|citizenship class|bingo/i.test(textToSearch);

      if (!isKidEvent) continue;

      const matchedBranch = matchEventToBranch(place, title, desc, systemBranches);
      if (!matchedBranch) continue;

      const classification = classifyEvent(title, desc);
      const { startTime, endTime } = combineDateAndTimeToIso(dateStr, timeStr, {
        state: matchedBranch.state,
      });

      events.push({
        id: `libcal-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${dateStr.replace(/[^a-z0-9]/g, '-')}`,
        systemId: matchedBranch.systemId,
        systemName: matchedBranch.systemName,
        branchId: matchedBranch.id,
        branchName: matchedBranch.name,
        branchAddress: `${matchedBranch.address}, ${matchedBranch.city}, ${matchedBranch.state} ${matchedBranch.zip}`,
        branchCity: matchedBranch.city,
        branchUrl: getBranchPageUrl(matchedBranch),
        title,
        description: desc,
        startTime,
        endTime,
        ageGroup: classification.ageGroup,
        targetAges: classification.targetAges,
        ageRangeText: classification.ageRangeText,
        eventType: classification.eventType,
        roomOrLocation: place || matchedBranch.name,
        url: eventUrl,
        isRegistrationRequired: classification.isRegistrationRequired,
        timezone: getTimezoneForState(matchedBranch.state),
      });
    }

    libcalCache.set(baseUrl, {
      timestamp: now,
      events,
    });

    return events;
  } catch (err) {
    console.error(`Error fetching LibCal events from ${baseUrl}:`, err);
    return cached ? cached.events : [];
  }
}
