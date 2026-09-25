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
  const radius = radiusStr ? parseFloat(radiusStr) : 20; // Default 20 miles

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

  if (lat !== null && lon !== null) {
    branchesWithDistance.sort((a, b) => (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999));
    
    // Filter by radius, but ensure at least 3 closest branches are returned so user never gets an empty screen
    const withinRadius = branchesWithDistance.filter(
      (b) => b.distanceMiles !== undefined && b.distanceMiles <= radius
    );

    branchesWithDistance = withinRadius.length > 0 ? withinRadius : branchesWithDistance.slice(0, 5);
  }

  return NextResponse.json({
    systems: LIBRARY_SYSTEMS,
    branches: branchesWithDistance,
  });
}
