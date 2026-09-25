import { NextRequest, NextResponse } from 'next/server';
import { LIBRARY_BRANCHES, LIBRARY_SYSTEMS } from '@/lib/libraries-data';
import { calculateDistanceMiles } from '@/lib/geo';
import { LibraryBranch } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');
  const radiusStr = searchParams.get('radius');

  const lat = latStr ? parseFloat(latStr) : null;
  const lon = lonStr ? parseFloat(lonStr) : null;
  const radius = radiusStr ? parseFloat(radiusStr) : 20;

  let branchesWithDistance: LibraryBranch[] = LIBRARY_BRANCHES.map((b) => {
    let distanceMiles: number | undefined = undefined;
    if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
      distanceMiles = calculateDistanceMiles(lat, lon, b.lat, b.lon);
    }
    return {
      ...b,
      distanceMiles,
    };
  });

  let withinRadius: LibraryBranch[] = [];
  let nearestBranch: LibraryBranch | null = null;

  if (lat !== null && lon !== null) {
    branchesWithDistance.sort((a, b) => (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999));
    nearestBranch = branchesWithDistance[0] || null;
    
    // Only return branches that are ACTUALLY within the selected radius!
    withinRadius = branchesWithDistance.filter(
      (b) => b.distanceMiles !== undefined && b.distanceMiles <= radius
    );
  } else {
    withinRadius = branchesWithDistance;
  }

  // Filter systems to only those that have branches in the result
  const activeSystemIds = new Set(withinRadius.map((b) => b.systemId));
  const activeSystems = LIBRARY_SYSTEMS.filter((s) => activeSystemIds.has(s.id));

  return NextResponse.json({
    systems: activeSystems.length > 0 ? activeSystems : LIBRARY_SYSTEMS,
    branches: withinRadius,
    totalWithinRadius: withinRadius.length,
    nearestBranch: withinRadius.length === 0 && nearestBranch ? {
      name: nearestBranch.name,
      systemName: nearestBranch.systemName,
      city: nearestBranch.city,
      state: nearestBranch.state,
      distanceMiles: nearestBranch.distanceMiles,
    } : null,
  });
}
