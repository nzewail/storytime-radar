import { NextRequest, NextResponse } from 'next/server';
import { generateEventsForBranches } from '@/lib/event-generator';
import { fetchLivePasadenaEvents } from '@/lib/pasadena-real-feed';
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

  // 1. Check if any Pasadena branches are requested
  const hasPasadenaBranches = branchIds.some((id) => id.startsWith('ppl-'));
  const otherBranchIds = branchIds.filter((id) => !id.startsWith('ppl-'));

  let allEvents: StorytimeEvent[] = [];

  if (hasPasadenaBranches) {
    const livePasadenaEvents = await fetchLivePasadenaEvents();
    const filteredLive = livePasadenaEvents.filter((e) => branchIds.includes(e.branchId));
    allEvents.push(...filteredLive);
  }

  // 2. Generate other branch events
  if (otherBranchIds.length > 0 || (branchIds.length === 0 && !hasPasadenaBranches)) {
    const otherEvents = generateEventsForBranches(otherBranchIds, new Date(), daysParam);
    allEvents.push(...otherEvents);
  }

  // 3. Filter by age group
  if (selectedAges.length > 0) {
    allEvents = allEvents.filter((e) => selectedAges.includes(e.ageGroup));
  }

  // 4. Filter by event type
  if (selectedTypes.length > 0) {
    allEvents = allEvents.filter((e) => selectedTypes.includes(e.eventType));
  }

  // Sort chronologically
  allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return NextResponse.json({
    events: allEvents,
    total: allEvents.length,
    source: hasPasadenaBranches ? 'live-trumba-feed' : 'local-engine',
  });
}
