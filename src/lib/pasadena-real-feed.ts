import { StorytimeEvent, LibraryBranch } from '@/types';
import { getBranchById } from './imls-db';
import { classifyEvent } from './classifier';

let cachedPasadenaEvents: { timestamp: number; events: StorytimeEvent[] } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

// Map Trumba location strings to federal IMLS branch IDs
const BRANCH_KEYWORD_TO_IMLS_ID: Record<string, string> = {
  'central': 'imls-ca0094-002',
  'allendale': 'imls-ca0094-003',
  'hastings': 'imls-ca0094-004',
  'hill': 'imls-ca0094-005',
  'lamanda park': 'imls-ca0094-006',
  'la pintoresca': 'imls-ca0094-007',
  'linda vista': 'imls-ca0094-008',
  'san rafael': 'imls-ca0094-009',
  'santa catalina': 'imls-ca0094-010',
  'villa parke': 'imls-ca0094-012',
  'jefferson': 'imls-ca0094-002',
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
      const rawTitle = decodeHtmlEntities(item.title || '');
      const rawDescription = decodeHtmlEntities(item.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      // Check if this event targets kids / storytimes
      const textToSearch = `${rawTitle} ${rawDescription} ${audienceField} ${eventTypeField}`.toLowerCase();
      const isKidEvent =
        /storytime|story time|toddler|baby|babies|infant|preschool|child|children|rhyme|early childhood|parent|family|families|lego|steam|stem|craft/i.test(
          textToSearch
        ) && !/adults only|50\+|tax aid|voting/i.test(audienceField.toLowerCase());

      if (!isKidEvent) continue;

      // Resolve branch metadata directly from the database
      let branchInfo: LibraryBranch | null = null;
      for (const [key, branchId] of Object.entries(BRANCH_KEYWORD_TO_IMLS_ID)) {
        if (rawLocation.includes(key) || textToSearch.includes(key)) {
          branchInfo = getBranchById(branchId) || null;
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
        systemId: branchInfo.systemId,
        systemName: branchInfo.systemName,
        branchId: branchInfo.id,
        branchName: branchInfo.name,
        branchAddress: `${branchInfo.address}, ${branchInfo.city}, ${branchInfo.state} ${branchInfo.zip}`,
        branchCity: branchInfo.city,
        title: rawTitle,
        description: rawDescription,
        startTime,
        endTime,
        ageGroup,
        ageRangeText: audienceField ? audienceField.split(',')[0].trim() : ageRangeText,
        eventType,
        roomOrLocation: branchInfo.name,
        url: item.permaLinkUrl || branchInfo.website || 'https://www.cityofpasadena.net/library/',
        isRegistrationRequired: item.openSignUp || isRegistrationRequired,
      });
    }

    cachedPasadenaEvents = {
      timestamp: now,
      events: realEvents,
    };

    return realEvents;
  } catch (err) {
    console.error('Failed to fetch Pasadena live events:', err);
    return cachedPasadenaEvents ? cachedPasadenaEvents.events : [];
  }
}
