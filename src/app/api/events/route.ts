import { NextRequest, NextResponse } from 'next/server';
import { fetchEventsForBranches } from '@/lib/calendar';
import { AgeGroup, EventType } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const branchesParam = searchParams.get('branches');
  const agesParam = searchParams.get('ages');
  const typesParam = searchParams.get('types');

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
  const fetchResult = await fetchEventsForBranches(branchIds);
  let events = fetchResult.events;
  const unsupportedBranches = fetchResult.unsupportedBranches;

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

  const isDebug = searchParams.get('debug') === '1';

  let debugInfo: any = null;
  if (isDebug) {
    const sample = branchIds.length > 0 ? (await import('@/lib/imls-db')).getBranchesByIds(branchIds) : [];
    const detected = sample[0] ? await (await import('@/lib/calendar/detector')).detectCalendarSource(sample[0].systemId, sample[0]) : null;
    const probeRobots = await fetch('https://www.southpasadenaca.gov/robots.txt', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(3000),
    }).then(r => r.status).catch(e => e.message);

    debugInfo = {
      branchIds,
      branchesFound: sample.length,
      sampleBranch: sample[0] || null,
      detectedSource: detected,
      probeRobotsStatus: probeRobots,
      dispatchDebug: fetchResult.debug,
    };
  }

  return NextResponse.json({
    events,
    total: events.length,
    unsupportedBranches,
    ...(isDebug ? { debug: debugInfo } : {}),
  });
}
