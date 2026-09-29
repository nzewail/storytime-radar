import { StorytimeEvent, LibraryBranch } from '@/types';
import { getBranchesByIds, loadAllLibraries } from '@/lib/imls-db';
import { EventsFetchResult } from './types';
import { detectCalendarSource } from './detector';
import { fetchTrumbaEvents } from './providers/trumba';
import { fetchCommunicoEvents } from './providers/communico';
import { fetchDrupalEvents } from './providers/drupal';
import { fetchLibCalEvents } from './providers/libcal';
import { fetchIcalEvents } from './providers/ical';
import { fetchOpenCitiesEvents } from './providers/opencities';

/**
 * Fetch verified real events for requested branches.
 * Dispatches to generic platform adapters (Trumba, Communico, Drupal, LibCal, iCal).
 * Any branch whose calendar platform is not supported or cannot be retrieved
 * is reported in unsupportedBranches so the UI notifies the user honestly.
 */
export async function fetchEventsForBranches(
  branchIds: string[]
): Promise<EventsFetchResult> {
  const branches: LibraryBranch[] =
    branchIds.length > 0
      ? getBranchesByIds(branchIds)
      : loadAllLibraries().slice(0, 5);

  if (branches.length === 0) {
    return { events: [], unsupportedBranches: [] };
  }

  // Group branches by library system
  const branchesBySystem = new Map<string, LibraryBranch[]>();
  for (const b of branches) {
    const list = branchesBySystem.get(b.systemId) || [];
    list.push(b);
    branchesBySystem.set(b.systemId, list);
  }

  // Pre-load all system branches so calendar providers match events against their true physical branch
  const allLibraries = loadAllLibraries();
  const allBranchesBySystem = new Map<string, LibraryBranch[]>();
  for (const b of allLibraries) {
    const list = allBranchesBySystem.get(b.systemId) || [];
    list.push(b);
    allBranchesBySystem.set(b.systemId, list);
  }

  const allEvents: StorytimeEvent[] = [];
  const unsupportedBranches: LibraryBranch[] = [];

  for (const [systemId, systemBranches] of branchesBySystem.entries()) {
    const sampleBranch = systemBranches[0];
    const source = await detectCalendarSource(systemId, sampleBranch);

    if (!source || source.platform === 'unsupported') {
      unsupportedBranches.push(...systemBranches);
      continue;
    }

    const allSystemBranches = allBranchesBySystem.get(systemId) || systemBranches;

    try {
      let systemEvents: StorytimeEvent[] = [];

      switch (source.platform) {
        case 'trumba':
          systemEvents = await fetchTrumbaEvents(source.calendarId, allSystemBranches);
          break;
        case 'communico':
          systemEvents = await fetchCommunicoEvents(source.calendarId, allSystemBranches);
          break;
        case 'drupal':
          systemEvents = await fetchDrupalEvents(source.calendarId, allSystemBranches);
          break;
        case 'libcal':
          systemEvents = await fetchLibCalEvents(source.calendarId, allSystemBranches);
          break;
        case 'ical':
          systemEvents = await fetchIcalEvents(source.calendarId, allSystemBranches);
          break;
        case 'opencities':
          systemEvents = await fetchOpenCitiesEvents(source.calendarId, allSystemBranches);
          break;
        default:
          unsupportedBranches.push(...systemBranches);
          continue;
      }

      // Filter events to requested branches in this system
      const targetBranchIdSet = new Set(systemBranches.map((b) => b.id));
      const matchedEvents = systemEvents.filter((e) => targetBranchIdSet.has(e.branchId));
      allEvents.push(...matchedEvents);
    } catch (err) {
      console.error(`Failed to fetch events for system ${systemId} (${source.platform}):`, err);
      unsupportedBranches.push(...systemBranches);
    }
  }

  // Sort chronologically
  allEvents.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return {
    events: allEvents,
    unsupportedBranches,
  };
}
