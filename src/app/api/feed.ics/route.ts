import { NextRequest, NextResponse } from 'next/server';
import { generateEventsForBranches } from '@/lib/event-generator';
import { fetchLivePasadenaEvents } from '@/lib/pasadena-real-feed';
import { fetchLiveSeattleEvents } from '@/lib/seattle-real-feed';
import { buildIcalFeed } from '@/lib/ical-builder';
import { AgeGroup, EventType, StorytimeEvent } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const branchesParam = searchParams.get('branches') || searchParams.get('branch');
  const agesParam = searchParams.get('ages') || searchParams.get('age');
  const typesParam = searchParams.get('types') || searchParams.get('type');
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
    const otherEvents = generateEventsForBranches(otherBranchIds, new Date(), Math.min(daysParam, 90));
    allEvents.push(...otherEvents);
  }

  // 3. Filter by age groups if provided
  if (selectedAges.length > 0) {
    allEvents = allEvents.filter((e) => selectedAges.includes(e.ageGroup));
  }

  // 4. Filter by event types if provided
  if (selectedTypes.length > 0) {
    allEvents = allEvents.filter((e) => selectedTypes.includes(e.eventType));
  }

  // Sort chronologically
  allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const icalString = buildIcalFeed(allEvents, 'Storytime Radar Feed');

  return new NextResponse(icalString, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="storytimes.ics"',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
