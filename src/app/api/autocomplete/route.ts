import { NextRequest, NextResponse } from 'next/server';

interface AutocompleteItem {
  title: string;
  subtitle: string;
  lat: number;
  lon: number;
  query: string;
}

// Quick instant suggestions for popular metro hubs
const LOCAL_SUGGESTIONS: AutocompleteItem[] = [
  // Southern California / Pasadena / LA
  { title: 'Pasadena, CA', subtitle: '91101 • Downtown / Playhouse District', lat: 34.1449, lon: -118.1381, query: '91101' },
  { title: 'Pasadena, CA', subtitle: '91107 • East Pasadena / Hastings Ranch', lat: 34.1565, lon: -118.0837, query: '91107' },
  { title: 'Pasadena, CA', subtitle: '91106 • Caltech / South Lake', lat: 34.1388, lon: -118.1258, query: '91106' },
  { title: 'Pasadena, CA', subtitle: '91104 • Bungalow Heaven', lat: 34.1624, lon: -118.1258, query: '91104' },
  { title: 'Pasadena, CA', subtitle: '91103 • Northwest / Rose Bowl', lat: 34.1675, lon: -118.1633, query: '91103' },
  { title: 'Pasadena, CA', subtitle: '91105 • South Arroyo', lat: 34.1350, lon: -118.1610, query: '91105' },
  { title: 'South Pasadena, CA', subtitle: '91030 • Los Angeles County', lat: 34.1166, lon: -118.1528, query: '91030' },
  { title: 'Altadena, CA', subtitle: '91001 • Foothills', lat: 34.1925, lon: -118.1388, query: '91001' },
  { title: 'San Marino, CA', subtitle: '91108 • San Gabriel Valley', lat: 34.1221, lon: -118.1189, query: '91108' },
  { title: 'Glendale, CA', subtitle: '91205 • Brand / Americana', lat: 34.1438, lon: -118.2525, query: '91205' },
  { title: 'Alhambra, CA', subtitle: '91801 • San Gabriel Valley', lat: 34.0955, lon: -118.1287, query: '91801' },
  { title: 'Eagle Rock, Los Angeles, CA', subtitle: '90041 • Northeast LA', lat: 34.1396, lon: -118.2114, query: '90041' },
  { title: 'Highland Park, Los Angeles, CA', subtitle: '90042 • Northeast LA', lat: 34.1105, lon: -118.1923, query: '90042' },
  { title: 'Downtown Los Angeles, CA', subtitle: '90071 • Financial District', lat: 34.0503, lon: -118.2553, query: '90071' },
  
  // Bay Area / SF
  { title: 'San Francisco, CA', subtitle: '94102 • Civic Center / Hayes Valley', lat: 37.7786, lon: -122.4212, query: '94102' },
  { title: 'San Francisco, CA', subtitle: '94110 • Mission District', lat: 37.7500, lon: -122.4153, query: '94110' },
  { title: 'San Francisco, CA', subtitle: '94118 • Richmond District', lat: 37.7818, lon: -122.4571, query: '94118' },
  { title: 'San Francisco, CA', subtitle: '94122 • Sunset District', lat: 37.7618, lon: -122.4764, query: '94122' },
  { title: 'San Francisco, CA', subtitle: '94114 • Castro / Noe Valley', lat: 37.7513, lon: -122.4347, query: '94114' },
  { title: 'San Francisco, CA', subtitle: '94123 • Marina / Cow Hollow', lat: 37.8005, lon: -122.4352, query: '94123' },

  // Seattle
  { title: 'Seattle, WA', subtitle: '98107 • Ballard', lat: 47.6698, lon: -122.3848, query: '98107' },
  { title: 'Seattle, WA', subtitle: '98101 • Downtown Seattle', lat: 47.6101, lon: -122.3344, query: '98101' },
  { title: 'Seattle, WA', subtitle: '98109 • Queen Anne', lat: 47.6322, lon: -122.3486, query: '98109' },
  { title: 'Bellevue, WA', subtitle: '98004 • Downtown Bellevue', lat: 47.6166, lon: -122.2014, query: '98004' },
  { title: 'Kirkland, WA', subtitle: '98033 • Lake Washington', lat: 47.6787, lon: -122.2036, query: '98033' },

  // New York
  { title: 'Brooklyn, NY', subtitle: '11215 • Park Slope', lat: 40.6672, lon: -73.9822, query: '11215' },
  { title: 'Brooklyn, NY', subtitle: '11201 • Brooklyn Heights / Dumbo', lat: 40.6953, lon: -73.9912, query: '11201' },
  { title: 'New York, NY', subtitle: '10018 • Midtown Manhattan', lat: 40.7554, lon: -73.9926, query: '10018' },
  { title: 'New York, NY', subtitle: '10001 • Chelsea', lat: 40.7501, lon: -73.9967, query: '10001' },

  // Other Metros
  { title: 'Austin, TX', subtitle: '78701 • Downtown Austin', lat: 30.2711, lon: -97.7437, query: '78701' },
  { title: 'Chicago, IL', subtitle: '60614 • Lincoln Park', lat: 41.9226, lon: -87.6534, query: '60614' },
  { title: 'Denver, CO', subtitle: '80202 • Downtown Denver', lat: 39.7541, lon: -104.9975, query: '80202' },
  { title: 'Boston, MA', subtitle: '02108 • Beacon Hill', lat: 42.3584, lon: -71.0638, query: '02108' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const queryLower = q.toLowerCase();

  // 1. Filter local suggestions first (instant)
  const localMatches = LOCAL_SUGGESTIONS.filter(
    (item) =>
      item.title.toLowerCase().includes(queryLower) ||
      item.subtitle.toLowerCase().includes(queryLower) ||
      item.query.startsWith(queryLower)
  ).slice(0, 6);

  // If we already have strong local matches, return them immediately
  if (localMatches.length >= 4) {
    return NextResponse.json({ suggestions: localMatches });
  }

  // 2. Fetch from OpenStreetMap Nominatim for any other US city or zip
  try {
    const encoded = encodeURIComponent(q);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&addressdetails=1&limit=5&q=${encoded}`,
      {
        headers: {
          'User-Agent': 'StorytimeRadar/1.0 (local-events-app)',
        },
        signal: AbortSignal.timeout(3000), // Fast 3-second timeout
      }
    );

    if (res.ok) {
      const data = await res.json();
      const nominatimMatches: AutocompleteItem[] = (data || []).map((item: any) => {
        const parts = item.display_name.split(',').map((s: string) => s.trim());
        const title = parts.slice(0, 2).join(', ');
        const subtitle = parts.slice(2, 4).join(', ');
        return {
          title,
          subtitle: subtitle || 'United States',
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          query: item.display_name.split(',')[0].trim(),
        };
      });

      // Combine local + nominatim without duplicates
      const seen = new Set<string>();
      const combined: AutocompleteItem[] = [];

      for (const item of [...localMatches, ...nominatimMatches]) {
        const key = `${item.title}-${item.subtitle}`.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }

      return NextResponse.json({ suggestions: combined.slice(0, 7) });
    }
  } catch (err) {
    // If Nominatim fails or times out, return local matches
  }

  return NextResponse.json({ suggestions: localMatches });
}
