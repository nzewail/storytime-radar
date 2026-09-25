import { NextRequest, NextResponse } from 'next/server';

interface AutocompleteItem {
  title: string;
  subtitle: string;
  lat: number;
  lon: number;
  query: string;
}

// Clean city-level entries (used when user types letters / city names)
const CITY_SUGGESTIONS: AutocompleteItem[] = [
  { title: 'Pasadena, CA', subtitle: 'California, United States', lat: 34.1478, lon: -118.1445, query: 'Pasadena, CA' },
  { title: 'South Pasadena, CA', subtitle: 'California, United States', lat: 34.1166, lon: -118.1528, query: 'South Pasadena, CA' },
  { title: 'Altadena, CA', subtitle: 'California, United States', lat: 34.1925, lon: -118.1388, query: 'Altadena, CA' },
  { title: 'Glendale, CA', subtitle: 'California, United States', lat: 34.1425, lon: -118.2551, query: 'Glendale, CA' },
  { title: 'San Marino, CA', subtitle: 'California, United States', lat: 34.1221, lon: -118.1189, query: 'San Marino, CA' },
  { title: 'Alhambra, CA', subtitle: 'California, United States', lat: 34.0955, lon: -118.1287, query: 'Alhambra, CA' },
  { title: 'Los Angeles, CA', subtitle: 'California, United States', lat: 34.0522, lon: -118.2437, query: 'Los Angeles, CA' },
  { title: 'Eagle Rock, Los Angeles, CA', subtitle: 'California, United States', lat: 34.1396, lon: -118.2114, query: 'Eagle Rock, CA' },
  { title: 'Highland Park, Los Angeles, CA', subtitle: 'California, United States', lat: 34.1105, lon: -118.1923, query: 'Highland Park, CA' },
  { title: 'Burbank, CA', subtitle: 'California, United States', lat: 34.1808, lon: -118.3090, query: 'Burbank, CA' },
  { title: 'San Gabriel, CA', subtitle: 'California, United States', lat: 34.0961, lon: -118.1058, query: 'San Gabriel, CA' },
  { title: 'Arcadia, CA', subtitle: 'California, United States', lat: 34.1397, lon: -118.0353, query: 'Arcadia, CA' },
  
  // Bay Area
  { title: 'San Francisco, CA', subtitle: 'California, United States', lat: 37.7749, lon: -122.4194, query: 'San Francisco, CA' },
  { title: 'Oakland, CA', subtitle: 'California, United States', lat: 37.8044, lon: -122.2712, query: 'Oakland, CA' },
  { title: 'Berkeley, CA', subtitle: 'California, United States', lat: 37.8715, lon: -122.2730, query: 'Berkeley, CA' },
  { title: 'San Jose, CA', subtitle: 'California, United States', lat: 37.3382, lon: -121.8863, query: 'San Jose, CA' },

  // Pacific Northwest
  { title: 'Seattle, WA', subtitle: 'Washington, United States', lat: 47.6062, lon: -122.3321, query: 'Seattle, WA' },
  { title: 'Bellevue, WA', subtitle: 'Washington, United States', lat: 47.6101, lon: -122.2015, query: 'Bellevue, WA' },
  { title: 'Kirkland, WA', subtitle: 'Washington, United States', lat: 47.6766, lon: -122.2036, query: 'Kirkland, WA' },
  { title: 'Redmond, WA', subtitle: 'Washington, United States', lat: 47.6740, lon: -122.1215, query: 'Redmond, WA' },

  // New York
  { title: 'New York, NY', subtitle: 'Manhattan, New York', lat: 40.7128, lon: -74.0060, query: 'New York, NY' },
  { title: 'Brooklyn, NY', subtitle: 'Kings County, New York', lat: 40.6782, lon: -73.9442, query: 'Brooklyn, NY' },
  { title: 'Queens, NY', subtitle: 'Queens County, New York', lat: 40.7282, lon: -73.7949, query: 'Queens, NY' },

  // Other Major Cities
  { title: 'Chicago, IL', subtitle: 'Illinois, United States', lat: 41.8781, lon: -87.6298, query: 'Chicago, IL' },
  { title: 'Austin, TX', subtitle: 'Texas, United States', lat: 30.2672, lon: -97.7431, query: 'Austin, TX' },
  { title: 'Denver, CO', subtitle: 'Colorado, United States', lat: 39.7392, lon: -104.9903, query: 'Denver, CO' },
  { title: 'Boston, MA', subtitle: 'Massachusetts, United States', lat: 42.3601, lon: -71.0589, query: 'Boston, MA' },
  { title: 'San Diego, CA', subtitle: 'California, United States', lat: 32.7157, lon: -117.1611, query: 'San Diego, CA' },
  { title: 'Portland, OR', subtitle: 'Oregon, United States', lat: 45.5152, lon: -122.6784, query: 'Portland, OR' },
];

// ZIP code entries (only returned when query contains numbers!)
const ZIP_SUGGESTIONS: AutocompleteItem[] = [
  { title: '91101', subtitle: 'Pasadena, CA (Downtown / Playhouse)', lat: 34.1449, lon: -118.1381, query: '91101' },
  { title: '91103', subtitle: 'Pasadena, CA (Northwest)', lat: 34.1675, lon: -118.1633, query: '91103' },
  { title: '91104', subtitle: 'Pasadena, CA (Bungalow Heaven)', lat: 34.1624, lon: -118.1258, query: '91104' },
  { title: '91105', subtitle: 'Pasadena, CA (South Arroyo)', lat: 34.1350, lon: -118.1610, query: '91105' },
  { title: '91106', subtitle: 'Pasadena, CA (Caltech / South Lake)', lat: 34.1388, lon: -118.1258, query: '91106' },
  { title: '91107', subtitle: 'Pasadena, CA (Hastings Ranch)', lat: 34.1565, lon: -118.0837, query: '91107' },
  { title: '91030', subtitle: 'South Pasadena, CA', lat: 34.1166, lon: -118.1528, query: '91030' },
  { title: '91001', subtitle: 'Altadena, CA', lat: 34.1925, lon: -118.1388, query: '91001' },
  { title: '91205', subtitle: 'Glendale, CA', lat: 34.1438, lon: -118.2525, query: '91205' },
  { title: '94102', subtitle: 'San Francisco, CA (Civic Center)', lat: 37.7786, lon: -122.4212, query: '94102' },
  { title: '94110', subtitle: 'San Francisco, CA (Mission)', lat: 37.7500, lon: -122.4153, query: '94110' },
  { title: '98101', subtitle: 'Seattle, WA (Downtown)', lat: 47.6101, lon: -122.3344, query: '98101' },
  { title: '98107', subtitle: 'Seattle, WA (Ballard)', lat: 47.6698, lon: -122.3848, query: '98107' },
  { title: '11215', subtitle: 'Brooklyn, NY (Park Slope)', lat: 40.6672, lon: -73.9822, query: '11215' },
  { title: '78701', subtitle: 'Austin, TX (Downtown)', lat: 30.2711, lon: -97.7437, query: '78701' },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const queryLower = q.toLowerCase();
  const isNumericQuery = /^\d+/.test(q);

  // If the user typed digits, search ZIP codes!
  if (isNumericQuery) {
    const matchingZips = ZIP_SUGGESTIONS.filter((item) =>
      item.title.startsWith(queryLower)
    ).slice(0, 5);

    if (matchingZips.length > 0) {
      return NextResponse.json({ suggestions: matchingZips });
    }
  }

  // If the user typed text (e.g. "Pasadena"), search clean city entries:
  const localCityMatches = CITY_SUGGESTIONS.filter((item) =>
    item.title.toLowerCase().includes(queryLower)
  ).slice(0, 5);

  if (localCityMatches.length > 0) {
    return NextResponse.json({ suggestions: localCityMatches });
  }

  // Fallback to OpenStreetMap Nominatim for any arbitrary US location
  try {
    const encoded = encodeURIComponent(q);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&addressdetails=1&featuretype=city&limit=5&q=${encoded}`,
      {
        headers: {
          'User-Agent': 'StorytimeRadar/1.0 (local-events-app)',
        },
        signal: AbortSignal.timeout(3000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const nominatimMatches: AutocompleteItem[] = (data || []).map((item: any) => {
        const parts = item.display_name.split(',').map((s: string) => s.trim());
        const title = parts.slice(0, 2).join(', ');
        const subtitle = parts.slice(2, 4).join(', ') || 'United States';
        return {
          title,
          subtitle,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          query: title,
        };
      });

      // Deduplicate by title
      const seen = new Set<string>();
      const deduplicated: AutocompleteItem[] = [];
      for (const m of nominatimMatches) {
        if (!seen.has(m.title)) {
          seen.add(m.title);
          deduplicated.push(m);
        }
      }

      return NextResponse.json({ suggestions: deduplicated.slice(0, 5) });
    }
  } catch (err) {
    // Return empty on network timeout
  }

  return NextResponse.json({ suggestions: [] });
}
