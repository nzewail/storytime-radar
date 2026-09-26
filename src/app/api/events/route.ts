import { NextRequest, NextResponse } from 'next/server';
import { generateEventsForBranches } from '@/lib/event-generator';
import { fetchLivePasadenaEvents } from '@/lib/pasadena-real-feed';
import { fetchLiveSeattleEvents } from '@/lib/seattle-real-feed';
import { AgeGroup, EventType, StorytimeEvent } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const branchesParam = searchParams.get('branches');
  const agesParam = searchParams.get('ages');
  const typesParam = searchParams.get('types');
  const daysParam = parseInt(searchParams.get('days') || '60', 10);

  const branchIds = branchesParam ? branchesParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const selectedAges = (agesParam ? agesParam.split(',').map((s) => s.trim()).filter(Boolean) : []) as AgeGroup[];
  const selectedTypes = (typesParam ? typesParam.split(',').map((s) => s.trim()).filter(Boolean) : []) as EventType[];

  // 1. Separate branch groups
  const pasadenaBranchIds = branchIds.filter((id) => id.startsWith('ppl-'));
  const seattleBranchIds = branchIds.filter((id) => id.startsWith('spl-'));
  const otherBranchIds = branchIds.filter((id) => !id.startsWith('ppl-') && !id.startsWith('spl-'));

  let allEvents: StorytimeEvent[] = [];

  // Live Pasadena events
  if (pasadenaBranchIds.length > 0) {
    const livePasadenaEvents = await fetchLivePasadenaEvents();
    const filteredLive = livePasadenaEvents.filter((e) => pasadenaBranchIds.includes(e.branchId));
    allEvents.push(...filteredLive);
  }

  // Live Seattle events
  if (seattleBranchIds.length > 0) {
    const liveSeattleEvents = await fetchLiveSeattleEvents();
    const filteredLive = liveSeattleEvents.filter((e) => seattleBranchIds.includes(e.branchId));
    allEvents.push(...filteredLive);
  }

  // Generate fallback events for branches without live feed scrapers
  if (otherBranchIds.length > 0 || (branchIds.length === 0 && pasadenaBranchIds.length === 0 && seattleBranchIds.length === 0)) {
    const otherEvents = generateEventsForBranches(otherBranchIds, new Date(), daysParam);
    allEvents.push(...otherEvents);
  }

  // Filter by age group
  if (selectedAges.length > 0) {
    allEvents = allEvents.filter((e) => selectedAges.includes(e.ageGroup));
  }

  // Filter by event type
  if (selectedTypes.length > 0) {
    allEvents = allEvents.filter((e) => selectedTypes.includes(e.eventType));
  }

  // Sort chronologically
  allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return NextResponse.json({
    events: allEvents,
    total: allEvents.length,
    source: (pasadenaBranchIds.length > 0 || seattleBranchIds.length > 0) ? 'live-trumba-feed' : 'local-engine',
  });
}
