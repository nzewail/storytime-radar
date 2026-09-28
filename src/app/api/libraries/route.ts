import { NextRequest, NextResponse } from 'next/server';
import { getLibrariesWithinRadius } from '@/lib/imls-db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');
  const radiusStr = searchParams.get('radius');

  const lat = latStr ? parseFloat(latStr) : null;
  const lon = lonStr ? parseFloat(lonStr) : null;
  const radius = radiusStr ? parseFloat(radiusStr) : 15;

  if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
    // Default to Pasadena if no coordinates provided
    const defaultResult = getLibrariesWithinRadius(34.1478, -118.1445, radius);
    return NextResponse.json(defaultResult);
  }

  const result = getLibrariesWithinRadius(lat, lon, radius);

  return NextResponse.json({
    systems: result.systems,
    branches: result.branches,
    totalWithinRadius: result.totalWithinRadius,
    nearestBranch: result.nearestBranch ? {
      name: result.nearestBranch.name,
      systemName: result.nearestBranch.systemName,
      city: result.nearestBranch.city,
      state: result.nearestBranch.state,
      distanceMiles: result.nearestBranch.distanceMiles,
    } : null,
  });
}
