import { StorytimeEvent } from '@/types';
import { classifyEvent } from './classifier';

let cachedSeattleEvents: { timestamp: number; events: StorytimeEvent[] } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

// Map Trumba location strings to our Seattle branch metadata
interface SeattleBranchMeta {
  id: string;
  name: string;
  address: string;
}

const SEATTLE_BRANCHES: Record<string, SeattleBranchMeta> = {
  'central': {
    id: 'spl-central',
    name: 'Central Library',
    address: '1000 4th Ave, Seattle, WA 98104',
  },
  'ballard': {
    id: 'spl-ballard',
    name: 'Ballard Branch',
    address: '5614 22nd Ave NW, Seattle, WA 98107',
  },
  'beacon hill': {
    id: 'spl-beacon-hill',
    name: 'Beacon Hill Branch',
    address: '2821 Beacon Ave S, Seattle, WA 98144',
  },
  'broadview': {
    id: 'spl-broadview',
    name: 'Broadview Branch',
    address: '12755 Greenwood Ave N, Seattle, WA 98133',
  },
  'capitol hill': {
    id: 'spl-capitol-hill',
    name: 'Capitol Hill Branch',
    address: '425 Harvard Ave E, Seattle, WA 98102',
  },
  'columbia': {
    id: 'spl-columbia',
    name: 'Columbia Branch',
    address: '4721 Rainier Ave S, Seattle, WA 98118',
  },
  'delridge': {
    id: 'spl-delridge',
    name: 'Delridge Branch',
    address: '5423 Delridge Way SW, Seattle, WA 98106',
  },
  'douglass-truth': {
    id: 'spl-douglass-truth',
    name: 'Douglass-Truth Branch',
    address: '2300 E Yesler Way, Seattle, WA 98122',
  },
  'fremont': {
    id: 'spl-fremont',
    name: 'Fremont Branch',
    address: '731 N 35th St, Seattle, WA 98103',
  },
  'green lake': {
    id: 'spl-green-lake',
    name: 'Green Lake Branch',
    address: '7364 E Green Lake Dr N, Seattle, WA 98115',
  },
  'greenwood': {
    id: 'spl-greenwood',
    name: 'Greenwood Branch',
    address: '8016 Greenwood Ave N, Seattle, WA 98103',
  },
  'high point': {
    id: 'spl-high-point',
    name: 'High Point Branch',
    address: '3411 SW Raymond St, Seattle, WA 98126',
  },
  'international district': {
    id: 'spl-id-chinatown',
    name: 'International District/Chinatown Branch',
    address: '713 8th Ave S, Seattle, WA 98104',
  },
  'chinatown': {
    id: 'spl-id-chinatown',
    name: 'International District/Chinatown Branch',
    address: '713 8th Ave S, Seattle, WA 98104',
  },
  'lake city': {
    id: 'spl-lake-city',
    name: 'Lake City Branch',
    address: '12501 28th Ave NE, Seattle, WA 98125',
  },
  'madrona': {
    id: 'spl-madrona',
    name: 'Madrona-Sally Goldmark Branch',
    address: '1134 33rd Ave, Seattle, WA 98122',
  },
  'magnolia': {
    id: 'spl-magnolia',
    name: 'Magnolia Branch',
    address: '2801 34th Ave W, Seattle, WA 98199',
  },
  'montlake': {
    id: 'spl-montlake',
    name: 'Montlake Branch',
    address: '2401 24th Ave E, Seattle, WA 98112',
  },
  'newholly': {
    id: 'spl-newholly',
    name: 'NewHolly Branch',
    address: '7058 32nd Ave S, Seattle, WA 98118',
  },
  'northeast': {
    id: 'spl-northeast',
    name: 'Northeast Branch',
    address: '6801 35th Ave NE, Seattle, WA 98115',
  },
  'northgate': {
    id: 'spl-northgate',
    name: 'Northgate Branch',
    address: '10548 5th Ave NE, Seattle, WA 98125',
  },
  'queen anne': {
    id: 'spl-queen-anne',
    name: 'Queen Anne Branch',
    address: '400 W Garfield St, Seattle, WA 98119',
  },
  'rainier beach': {
    id: 'spl-rainier-beach',
    name: 'Rainier Beach Branch',
    address: '9125 Rainier Ave S, Seattle, WA 98118',
  },
  'south park': {
    id: 'spl-south-park',
    name: 'South Park Branch',
    address: '8604 8th Ave S, Seattle, WA 98108',
  },
  'southwest': {
    id: 'spl-southwest',
    name: 'Southwest Branch',
    address: '9010 35th Ave SW, Seattle, WA 98126',
  },
  'university': {
    id: 'spl-university',
    name: 'University Branch',
    address: '5009 Roosevelt Way NE, Seattle, WA 98105',
  },
  'wallingford': {
    id: 'spl-wallingford',
    name: 'Wallingford Branch',
    address: '1501 N 45th St, Seattle, WA 98103',
  },
  'west seattle': {
    id: 'spl-west-seattle',
    name: 'West Seattle Branch',
    address: '2306 42nd Ave SW, Seattle, WA 98116',
  },
};

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
}

export async function fetchLiveSeattleEvents(): Promise<StorytimeEvent[]> {
  const now = Date.now();
  if (cachedSeattleEvents && now - cachedSeattleEvents.timestamp < CACHE_TTL_MS) {
    return cachedSeattleEvents.events;
  }

  try {
    const res = await fetch('https://www.trumba.com/calendars/kalendaro.json', {
      headers: {
        'User-Agent': 'StorytimeRadar/1.0 (local-events-app)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn('Seattle Public Library Trumba feed returned status:', res.status);
      return cachedSeattleEvents ? cachedSeattleEvents.events : [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const realEvents: StorytimeEvent[] = [];

    for (const item of data) {
      const rawTitle = decodeHtmlEntities(item.title || '');
      // Skip cancelled events
      if (item.canceled || /^\s*cancelled\b/i.test(rawTitle)) continue;

      // Extract raw fields
      const rawLocation = decodeHtmlEntities(item.location || '')
        .replace(/<[^>]+>/g, '')
        .trim();
      const rawDescription = decodeHtmlEntities(item.description || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Extract custom fields if any
      const customAudience =
        item.customFields?.find((f: any) => /audience/i.test(f.label || ''))?.value || '';
      const customLogistics =
        item.customFields?.find((f: any) => /logistics/i.test(f.label || ''))?.value || '';
      const customReg =
        item.customFields?.find((f: any) => /registration/i.test(f.label || ''))?.value || '';

      const textToSearch = `${rawTitle} ${rawDescription} ${customAudience} ${customLogistics}`.toLowerCase();

      // Determine if kid / family / storytime event
      const isKidEvent =
        /story\s*time|storytime|toddler|baby|babies|infant|preschool|child|children|early learning|kaleidoscope play|play & learn|rhyme|brick buddies|lego/i.test(
          textToSearch
        ) && !/adults only|50\+|tax aid|citizenship class/i.test(textToSearch);

      if (!isKidEvent) continue;

      // Match branch
      let branchInfo: SeattleBranchMeta | null = null;
      const lowerLoc = rawLocation.toLowerCase();

      for (const [key, b] of Object.entries(SEATTLE_BRANCHES)) {
        if (lowerLoc.includes(key)) {
          branchInfo = b;
          break;
        }
      }

      if (!branchInfo) continue;

      const { ageGroup, eventType, ageRangeText, isRegistrationRequired } = classifyEvent(
        rawTitle,
        `${rawDescription} ${customAudience} ${customLogistics}`
      );

      // Start and end dates
      const startTime = item.startDateTime
        ? new Date(item.startDateTime).toISOString()
        : new Date().toISOString();
      const endTime = item.endDateTime
        ? new Date(item.endDateTime).toISOString()
        : new Date(new Date(startTime).getTime() + 45 * 60000).toISOString();

      const permaLink =
        item.permaLinkUrl ||
        (item.eventID
          ? `https://www.spl.org/event-calendar?trumbaEmbed=view%3Devent%26eventid%3D${item.eventID}`
          : 'https://www.spl.org/event-calendar');

      const isReg =
        item.openSignUp === true ||
        /registration is required/i.test(customReg) ||
        isRegistrationRequired;

      realEvents.push({
        id: `spl-${item.eventID}`,
        systemId: 'spl',
        systemName: 'Seattle Public Library',
        branchId: branchInfo.id,
        branchName: branchInfo.name,
        branchAddress: branchInfo.address,
        branchCity: 'Seattle',
        title: rawTitle,
        description: rawDescription,
        startTime,
        endTime,
        ageGroup,
        ageRangeText,
        eventType,
        roomOrLocation: branchInfo.name,
        url: permaLink,
        isRegistrationRequired: isReg,
      });
    }

    cachedSeattleEvents = {
      timestamp: now,
      events: realEvents,
    };

    return realEvents;
  } catch (err) {
    console.error('Failed to fetch Seattle Public Library live events:', err);
    return cachedSeattleEvents ? cachedSeattleEvents.events : [];
  }
}
