import { StorytimeEvent } from '@/types';
import { classifyEvent } from './classifier';

let cachedPasadenaEvents: { timestamp: number; events: StorytimeEvent[] } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

// Map Trumba location strings to our branch IDs
const BRANCH_NAME_TO_ID: Record<string, { id: string; name: string; address: string }> = {
  'linda vista': {
    id: 'ppl-linda-vista',
    name: 'Linda Vista Branch',
    address: '1281 Bryant St, Pasadena, CA 91103',
  },
  'allendale': {
    id: 'ppl-allendale',
    name: 'Allendale Branch',
    address: '1130 S Marengo Ave, Pasadena, CA 91106',
  },
  'hastings': {
    id: 'ppl-hastings',
    name: 'Hastings Branch',
    address: '3325 E Orange Grove Blvd, Pasadena, CA 91107',
  },
  'hill avenue': {
    id: 'ppl-hill-ave',
    name: 'Hill Avenue Branch',
    address: '55 S Hill Ave, Pasadena, CA 91106',
  },
  'jefferson': {
    id: 'ppl-jefferson',
    name: "Jefferson Branch (Children's & Youth)",
    address: '1500 E Villa St, Pasadena, CA 91106',
  },
  'lamanda park': {
    id: 'ppl-lamanda-park',
    name: 'Lamanda Park Branch',
    address: '140 S Altadena Dr, Pasadena, CA 91107',
  },
  'la pintoresca': {
    id: 'ppl-la-pintoresca',
    name: 'La Pintoresca Branch',
    address: '1355 N Raymond Ave, Pasadena, CA 91103',
  },
  'san rafael': {
    id: 'ppl-san-rafael',
    name: 'San Rafael Branch',
    address: '1240 Nithsdale Rd, Pasadena, CA 91105',
  },
  'santa catalina': {
    id: 'ppl-santa-catalina',
    name: 'Santa Catalina Branch',
    address: '999 E Washington Blvd, Pasadena, CA 91104',
  },
};

export async function fetchLivePasadenaEvents(): Promise<StorytimeEvent[]> {
  const now = Date.now();
  if (cachedPasadenaEvents && now - cachedPasadenaEvents.timestamp < CACHE_TTL_MS) {
    return cachedPasadenaEvents.events;
  }

  try {
    const res = await fetch('https://www.trumba.com/calendars/pasadenalibrary.json', {
      headers: {
        'User-Agent': 'StorytimeRadar/1.0 (local-events-app)',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.warn('Pasadena Trumba feed returned status:', res.status);
      return cachedPasadenaEvents ? cachedPasadenaEvents.events : [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const realEvents: StorytimeEvent[] = [];

    for (const item of data) {
      if (item.canceled) continue;

      // Extract custom fields
      const audienceField =
        item.customFields?.find((f: any) => f.label === 'Audience')?.value || '';
      const eventTypeField =
        item.customFields?.find((f: any) => f.label === 'Event Type')?.value || '';

      const rawLocation = (item.location || '').replace(/<[^>]+>/g, '').trim().toLowerCase();
      const rawTitle = (item.title || '').replace(/&amp;/g, '&');
      const rawDescription = (item.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      // Check if this event targets kids / storytimes
      const textToSearch = `${rawTitle} ${rawDescription} ${audienceField} ${eventTypeField}`.toLowerCase();
      const isKidEvent =
        /storytime|story time|toddler|baby|babies|infant|preschool|child|children|rhyme|early childhood|parent|family|families|lego|steam|stem|craft/i.test(
          textToSearch
        ) && !/adults only|50\+|tax aid|voting/i.test(audienceField.toLowerCase());

      if (!isKidEvent) continue;

      // Match branch
      let branchInfo: { id: string; name: string; address: string } | null = null;
      for (const [key, b] of Object.entries(BRANCH_NAME_TO_ID)) {
        if (rawLocation.includes(key) || textToSearch.includes(key)) {
          branchInfo = b;
          break;
        }
      }

      if (!branchInfo) continue;

      const { ageGroup, eventType, ageRangeText, isRegistrationRequired } = classifyEvent(
        rawTitle,
        `${rawDescription} ${audienceField}`
      );

      // Handle start and end times
      const startTime = item.startDateTime
        ? new Date(item.startDateTime).toISOString()
        : new Date().toISOString();
      const endTime = item.endDateTime
        ? new Date(item.endDateTime).toISOString()
        : new Date(new Date(startTime).getTime() + 45 * 60000).toISOString();

      realEvents.push({
        id: `ppl-${item.eventID}`,
        systemId: 'ppl',
        systemName: 'Pasadena Public Library',
        branchId: branchInfo.id,
        branchName: branchInfo.name,
        branchAddress: branchInfo.address,
        branchCity: 'Pasadena',
        title: rawTitle,
        description: rawDescription,
        startTime,
        endTime,
        ageGroup,
        ageRangeText: audienceField ? audienceField.split(',')[0].trim() : ageRangeText,
        eventType,
        roomOrLocation: branchInfo.name,
        url: item.permaLinkUrl || 'https://www.cityofpasadena.net/library/',
        isRegistrationRequired: item.openSignUp || isRegistrationRequired,
      });
    }

    cachedPasadenaEvents = {
      timestamp: now,
      events: realEvents,
    };

    return realEvents;
  } catch (err) {
    console.warn('Failed to fetch live Pasadena feed:', err);
    return cachedPasadenaEvents ? cachedPasadenaEvents.events : [];
  }
}
