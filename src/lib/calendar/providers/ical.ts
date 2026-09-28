import { StorytimeEvent, LibraryBranch } from '@/types';
import { classifyEvent } from '@/lib/classifier';
import { matchEventToBranch, getBranchPageUrl } from '../matcher';

function parseIcalDate(val: string): Date {
  // Support YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const cleaned = val.replace(/[^0-9T]/g, '');
  if (cleaned.length >= 15) {
    const year = parseInt(cleaned.slice(0, 4), 10);
    const month = parseInt(cleaned.slice(4, 6), 10) - 1;
    const day = parseInt(cleaned.slice(6, 8), 10);
    const hour = parseInt(cleaned.slice(9, 11), 10);
    const min = parseInt(cleaned.slice(11, 13), 10);
    const sec = parseInt(cleaned.slice(13, 15), 10);
    return new Date(Date.UTC(year, month, day, hour, min, sec));
  }
  return new Date(val);
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
    const events: StorytimeEvent[] = [];

    // Parse VEVENT blocks
    const vevents = text.split(/BEGIN:VEVENT/i).slice(1);

    for (const block of vevents) {
      const summaryMatch = block.match(/SUMMARY(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const descMatch = block.match(/DESCRIPTION(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const locMatch = block.match(/LOCATION(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const dtstartMatch = block.match(/DTSTART(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const dtendMatch = block.match(/DTEND(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const urlMatch = block.match(/URL(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);
      const uidMatch = block.match(/UID(?:;[^:]*)?:([\s\S]*?)(\r?\n[A-Z]|$)/);

      const title = summaryMatch ? summaryMatch[1].replace(/\\,/g, ',').replace(/\\n/g, ' ').trim() : '';
      const desc = descMatch ? descMatch[1].replace(/\\,/g, ',').replace(/\\n/g, '\n').trim() : '';
      const location = locMatch ? locMatch[1].replace(/\\,/g, ',').trim() : '';
      const uid = uidMatch ? uidMatch[1].trim() : Math.random().toString(36).slice(2, 9);
      const eventUrl = urlMatch ? urlMatch[1].trim() : '';

      const isKidEvent =
        /story\s*time|storytime|toddler|baby|babies|infant|preschool|child|children|early learning|playgroup/i.test(
          `${title} ${desc}`
        );

      if (!isKidEvent) continue;

      const branch = matchEventToBranch(location, title, desc, systemBranches);
      if (!branch) continue;

      const classification = classifyEvent(title, desc);
      const startTime = dtstartMatch ? parseIcalDate(dtstartMatch[1].trim()).toISOString() : new Date().toISOString();
      const endTime = dtendMatch ? parseIcalDate(dtendMatch[1].trim()).toISOString() : new Date(new Date(startTime).getTime() + 45 * 60000).toISOString();

      events.push({
        id: `ical-${uid}`,
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
      });
    }

    return events;
  } catch (err) {
    console.error(`Error parsing iCal from ${feedUrl}:`, err);
    return [];
  }
}
