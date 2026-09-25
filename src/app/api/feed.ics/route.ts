import { NextRequest, NextResponse } from 'next/server';
import { generateEventsForBranches } from '@/lib/event-generator';
import { buildIcalFeed } from '@/lib/ical-builder';
import { AgeGroup, EventType } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const branchesParam = searchParams.get('branches') || searchParams.get('branch');
  const agesParam = searchParams.get('ages') || searchParams.get('age');
  const typesParam = searchParams.get('types') || searchParams.get('type');
  const daysParam = parseInt(searchParams.get('days') || '60', 10);

  const branchIds = branchesParam ? branchesParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const selectedAges = (agesParam ? agesParam.split(',').map((s) => s.trim()).filter(Boolean) : []) as AgeGroup[];
  const selectedTypes = (typesParam ? typesParam.split(',').map((s) => s.trim()).filter(Boolean) : []) as EventType[];

  // Generate all events for selected branches
  let events = generateEventsForBranches(branchIds, new Date(), Math.min(daysParam, 90));

  // Filter by age groups if provided
  if (selectedAges.length > 0) {
    events = events.filter((e) => selectedAges.includes(e.ageGroup));
  }

  // Filter by event types if provided
  if (selectedTypes.length > 0) {
    events = events.filter((e) => selectedTypes.includes(e.eventType));
  }

  const icalString = buildIcalFeed(events, 'Storytime Radar Feed');

  return new NextResponse(icalString, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="storytimes.ics"',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
