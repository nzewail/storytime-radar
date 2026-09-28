import { StorytimeEvent, LibraryBranch } from '@/types';
import { getBranchById } from './imls-db';
import { classifyEvent } from './classifier';

let cachedSeattleEvents: { timestamp: number; events: StorytimeEvent[] } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

// Map Trumba location keywords to federal IMLS branch IDs
const BRANCH_KEYWORD_TO_IMLS_ID: Record<string, string> = {
  'central': 'imls-wa0064-002',
  'ballard': 'imls-wa0064-003',
  'broadview': 'imls-wa0064-004',
  'fremont': 'imls-wa0064-005',
  'green lake': 'imls-wa0064-006',
  'greenwood': 'imls-wa0064-007',
  'lake city': 'imls-wa0064-008',
  'magnolia': 'imls-wa0064-009',
  'northeast': 'imls-wa0064-010',
  'queen anne': 'imls-wa0064-011',
  'university': 'imls-wa0064-012',
  'wallingford': 'imls-wa0064-013',
  'beacon hill': 'imls-wa0064-014',
  'columbia': 'imls-wa0064-015',
  'douglass-truth': 'imls-wa0064-016',
  'capitol hill': 'imls-wa0064-017',
  'high point': 'imls-wa0064-018',
  'newholly': 'imls-wa0064-019',
  'madrona': 'imls-wa0064-020',
  'montlake': 'imls-wa0064-021',
  'rainier beach': 'imls-wa0064-022',
  'southwest': 'imls-wa0064-023',
  'west seattle': 'imls-wa0064-024',
  'delridge': 'imls-wa0064-027',
  'international district': 'imls-wa0064-028',
  'chinatown': 'imls-wa0064-028',
  'northgate': 'imls-wa0064-029',
  'south park': 'imls-wa0064-030',
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

      // Resolve branch metadata directly from the database
      let branchInfo: LibraryBranch | null = null;
      const lowerLoc = rawLocation.toLowerCase();

      for (const [key, branchId] of Object.entries(BRANCH_KEYWORD_TO_IMLS_ID)) {
        if (lowerLoc.includes(key)) {
          branchInfo = getBranchById(branchId) || null;
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
          : branchInfo.website || 'https://www.spl.org/event-calendar');

      const isReg =
        item.openSignUp === true ||
        /registration is required/i.test(customReg) ||
        isRegistrationRequired;

      realEvents.push({
        id: `spl-${item.eventID}`,
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
