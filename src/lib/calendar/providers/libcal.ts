import { StorytimeEvent, LibraryBranch } from '@/types';
import { classifyEvent } from '@/lib/classifier';
import { matchEventToBranch, getBranchPageUrl } from '../matcher';

const libcalCache = new Map<string, { timestamp: number; events: StorytimeEvent[] }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function parseDateAndTime(dateStr: string, timeStr: string): { startTime: string; endTime: string } {
  try {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) {
      const now = new Date().toISOString();
      return { startTime: now, endTime: now };
    }

    const firstTimePart = timeStr.split('-')[0].trim();
    const secondTimePart = timeStr.includes('-') ? timeStr.split('-')[1].trim() : null;

    const parseTime = (t: string) => {
      const match = t.match(/(\d+):?(\d+)?\s*(am|pm)/i);
      if (!match) return { hour: 10, minute: 0 };
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const isPm = match[3].toLowerCase() === 'pm';
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return { hour: h, minute: m };
    };

    const startH = parseTime(firstTimePart);
    const start = new Date(dateObj);
    start.setHours(startH.hour, startH.minute, 0, 0);

    let end: Date;
    if (secondTimePart) {
      const endH = parseTime(secondTimePart);
      end = new Date(dateObj);
      end.setHours(endH.hour, endH.minute, 0, 0);
    } else {
      end = new Date(start.getTime() + 45 * 60000);
    }

    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
  } catch {
    const fallback = new Date().toISOString();
    return { startTime: fallback, endTime: fallback };
  }
}

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
      const { startTime, endTime } = parseDateAndTime(dateStr, timeStr);

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
