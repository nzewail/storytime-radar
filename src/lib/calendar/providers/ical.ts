import { StorytimeEvent, LibraryBranch } from '@/types';
import { classifyEvent } from '@/lib/classifier';
import { matchEventToBranch, getBranchPageUrl } from '../matcher';
import { parseLocalDateTimeToIso, getTimezoneForState, inferDurationMinutes } from '../timezone';

function parseIcalDate(val: string, branchState?: string): string {
  if (val.trim().endsWith('Z')) {
    const cleaned = val.replace(/[^0-9T]/g, '');
    if (cleaned.length >= 15) {
      const year = parseInt(cleaned.slice(0, 4), 10);
      const month = parseInt(cleaned.slice(4, 6), 10) - 1;
      const day = parseInt(cleaned.slice(6, 8), 10);
      const hour = parseInt(cleaned.slice(9, 11), 10);
      const min = parseInt(cleaned.slice(11, 13), 10);
      const sec = parseInt(cleaned.slice(13, 15), 10);
      return new Date(Date.UTC(year, month, day, hour, min, sec)).toISOString();
    }
  }

  const cleaned = val.replace(/[^0-9T]/g, '');
  if (cleaned.length >= 15) {
    const yyyy = cleaned.slice(0, 4);
    const mm = cleaned.slice(4, 6);
    const dd = cleaned.slice(6, 8);
    const hh = cleaned.slice(9, 11);
    const min = cleaned.slice(11, 13);
    const sec = cleaned.slice(13, 15);
    return parseLocalDateTimeToIso(`${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}`, { state: branchState });
  }

  return parseLocalDateTimeToIso(val, { state: branchState });
}

/**
 * Generic iCal (.ics) Calendar Provider.
 * Parses any standard RFC-5545 iCal/webcal feed.
 */
export async function fetchIcalEvents(
  feedUrl: string,
  systemBranches: LibraryBranch[]
): Promise<StorytimeEvent[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'StorytimeRadar/2.0 (ical-client)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`iCal feed at ${feedUrl} returned status: ${res.status}`);
      return [];
    }

    const text = await res.text();
    // RFC-5545 line unfolding: continuation lines start with a space or tab
    const unfolded = text.replace(/\r?\n[ \t]/g, '');
    const events: StorytimeEvent[] = [];

    // Parse VEVENT blocks
    const vevents = unfolded.split(/BEGIN:VEVENT/i).slice(1);

    for (const block of vevents) {
      const summaryMatch = block.match(/SUMMARY(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const descMatch = block.match(/DESCRIPTION(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const locMatch = block.match(/LOCATION(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const dtstartMatch = block.match(/DTSTART(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const dtendMatch = block.match(/DTEND(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const urlMatch = block.match(/URL(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const uidMatch = block.match(/UID(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const categoriesMatch = block.match(/CATEGORIES(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const statusMatch = block.match(/STATUS(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);

      const title = summaryMatch ? summaryMatch[1].replace(/\\,/g, ',').replace(/\\n/g, ' ').trim() : '';
      const desc = descMatch ? descMatch[1].replace(/\\,/g, ',').replace(/\\n/g, '\n').trim() : '';
      const location = locMatch ? locMatch[1].replace(/\\,/g, ',').trim() : '';
      const uid = uidMatch ? uidMatch[1].trim() : Math.random().toString(36).slice(2, 9);
      const eventUrl = urlMatch ? urlMatch[1].trim() : '';
      const categories = categoriesMatch ? categoriesMatch[1].replace(/\\,/g, ',').trim() : '';
      const status = statusMatch ? statusMatch[1].trim() : '';

      // Skip cancelled events
      if (/cancelled|canceled/i.test(status)) continue;

      const textToSearch = `${title} ${desc} ${categories}`.toLowerCase();
      const isKidEvent =
        /story\s*time|storytime|toddler|baby|babies|infant|preschool|child|children|kids?|early learning|rhyme|playgroup|play & learn|stay and play|lego|read with|lap-sit|lapsit|family storytime|puppet/i.test(
          textToSearch
        ) && !/\badults?\s*only\b|\bfor\s+adults\b|\badult\s+(craft|art|book|program|class|workshop|club)\b|\b50\+\b|\bseniors?\b|\btax\s+aid\b|\bcitizenship\s+class\b|\bgrown\s*ups?\b/i.test(textToSearch);

      if (!isKidEvent) continue;

      const branch = matchEventToBranch(location, title, desc, systemBranches);
      if (!branch) continue;

      const classification = classifyEvent(title, `${desc} ${categories}`);
      const startTime = dtstartMatch ? parseIcalDate(dtstartMatch[1].trim(), branch.state) : new Date().toISOString();
      const endTime = dtendMatch
        ? parseIcalDate(dtendMatch[1].trim(), branch.state)
        : new Date(
            new Date(startTime).getTime() +
              (inferDurationMinutes(`${title} ${desc}`) || 45) * 60000
          ).toISOString();

      const timeSlug = startTime.slice(0, 19).replace(/[^0-9]/g, '');
      const eventIdentifier = uid.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 25);

      events.push({
        id: `ical-${branch.id}-${eventIdentifier}-${timeSlug}`,
        systemId: branch.systemId,
        systemName: branch.systemName,
        branchId: branch.id,
        branchName: branch.name,
        branchAddress: `${branch.address}, ${branch.city}, ${branch.state} ${branch.zip}`,
        branchCity: branch.city,
        title,
        description: desc,
        startTime,
        endTime,
        ageGroup: classification.ageGroup,
        targetAges: classification.targetAges,
        ageRangeText: classification.ageRangeText,
        eventType: classification.eventType,
        roomOrLocation: location || branch.name,
        url: eventUrl || branch.website,
        branchUrl: getBranchPageUrl(branch),
        isRegistrationRequired: classification.isRegistrationRequired,
        timezone: getTimezoneForState(branch.state),
      });
    }

    return events;
  } catch (err) {
    console.error(`Error parsing iCal from ${feedUrl}:`, err);
    return [];
  }
}
