import { NextRequest, NextResponse } from 'next/server';
import { searchLocations } from '@/lib/imls-db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // 1. Query indexed locations directly from the federal IMLS database
  // Sub-millisecond response across all 13,400+ cities and 15,300+ ZIP codes
  const dbSuggestions = searchLocations(q, 6);
  if (dbSuggestions.length > 0) {
    return NextResponse.json({ suggestions: dbSuggestions });
  }

  // 2. Fallback to OpenStreetMap Nominatim for arbitrary unindexed street addresses or landmarks
  try {
    const encoded = encodeURIComponent(q);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&addressdetails=1&limit=5&q=${encoded}`,
      {
        headers: {
          'User-Agent': 'StorytimeRadar/1.0 (local-events-app)',
        },
        signal: AbortSignal.timeout(3000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const seen = new Set<string>();
      const nominatimMatches = [];

      for (const item of data || []) {
        const parts = item.display_name.split(',').map((s: string) => s.trim());
        const title = parts.slice(0, 2).join(', ');
        const subtitle = parts.slice(2, 4).join(', ') || 'United States';
        if (!seen.has(title)) {
          seen.add(title);
          nominatimMatches.push({
            title,
            subtitle,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            query: title,
          });
        }
      }

      return NextResponse.json({ suggestions: nominatimMatches.slice(0, 5) });
    }
  } catch (err) {
    // Return empty on network timeout
  }

  return NextResponse.json({ suggestions: [] });
}
