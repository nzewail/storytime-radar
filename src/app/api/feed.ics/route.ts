import { NextRequest, NextResponse } from 'next/server';
import { fetchEventsForBranches } from '@/lib/calendar';
import { buildIcalFeed } from '@/lib/ical-builder';
import { AgeGroup, EventType } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const branchesParam = searchParams.get('branches') || searchParams.get('branch');
  const agesParam = searchParams.get('ages') || searchParams.get('age');
  const typesParam = searchParams.get('types') || searchParams.get('type');

  const branchIds = branchesParam
    ? branchesParam.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
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
