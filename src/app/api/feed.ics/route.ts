import { NextRequest, NextResponse } from 'next/server';
import { fetchEventsForBranches } from '@/lib/calendar';
import { buildIcalFeed } from '@/lib/ical-builder';
import { getLibrariesWithinRadius } from '@/lib/imls-db';
import { AgeGroup, EventType } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const branchesParam = searchParams.get('branches') || searchParams.get('branch');
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');
  const radiusStr = searchParams.get('radius');
  const agesParam = searchParams.get('ages') || searchParams.get('age');
  const typesParam = searchParams.get('types') || searchParams.get('type');

  let branchIds: string[] = [];

  if (branchesParam) {
    branchIds = branchesParam.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (latStr && lonStr) {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    const radius = radiusStr ? parseFloat(radiusStr) : 15;
    if (!isNaN(lat) && !isNaN(lon)) {
      const { branches } = getLibrariesWithinRadius(lat, lon, radius);
      branchIds = branches.map((b) => b.id);
    }
  } else {
    // Default to Pasadena radius if no branch or coordinates specified
    const { branches } = getLibrariesWithinRadius(34.1478, -118.1445, 15);
    branchIds = branches.map((b) => b.id);
  }

  const selectedAges = (agesParam
    ? agesParam.split(',').map((s) => s.trim()).filter(Boolean)
    : []) as AgeGroup[];
  const selectedTypes = (typesParam
    ? typesParam.split(',').map((s) => s.trim()).filter(Boolean)
    : []) as EventType[];

  // Fetch verified real events via generic calendar platform dispatch
  let { events } = await fetchEventsForBranches(branchIds);

  // Filter by age group
  if (selectedAges.length > 0) {
    events = events.filter((e) => {
      const eventAges = e.targetAges && e.targetAges.length > 0 ? e.targetAges : [e.ageGroup];
      return selectedAges.some((a) => eventAges.includes(a));
    });
  }

  // Filter by event type
  if (selectedTypes.length > 0) {
    events = events.filter((e) => selectedTypes.includes(e.eventType));
  }

  const icalString = buildIcalFeed(events, 'StoryFeed');

  return new NextResponse(icalString, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="storytimes.ics"',
      'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
