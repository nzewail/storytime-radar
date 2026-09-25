import { LocationCoordinates } from '@/types';

// Earth radius in miles
const EARTH_RADIUS_MILES = 3958.8;

export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_MILES * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Built-in instant dictionary of common zip codes & cities for immediate response without external network calls
const POPULAR_LOCATIONS: Record<string, LocationCoordinates> = {
  // Pasadena & San Gabriel Valley / LA Area
  '91101': { lat: 34.1449, lon: -118.1381, displayName: 'Pasadena, CA 91101 (Downtown / Playhouse)', city: 'Pasadena', state: 'CA', zip: '91101' },
  '91103': { lat: 34.1675, lon: -118.1633, displayName: 'Pasadena, CA 91103 (Northwest / Rose Bowl)', city: 'Pasadena', state: 'CA', zip: '91103' },
  '91104': { lat: 34.1624, lon: -118.1258, displayName: 'Pasadena, CA 91104 (Bungalow Heaven)', city: 'Pasadena', state: 'CA', zip: '91104' },
  '91105': { lat: 34.1350, lon: -118.1610, displayName: 'Pasadena, CA 91105 (South Arroyo)', city: 'Pasadena', state: 'CA', zip: '91105' },
  '91106': { lat: 34.1388, lon: -118.1258, displayName: 'Pasadena, CA 91106 (Caltech / South Lake)', city: 'Pasadena', state: 'CA', zip: '91106' },
  '91107': { lat: 34.1565, lon: -118.0837, displayName: 'Pasadena, CA 91107 (East Pasadena / Hastings)', city: 'Pasadena', state: 'CA', zip: '91107' },
  '91030': { lat: 34.1166, lon: -118.1528, displayName: 'South Pasadena, CA 91030', city: 'South Pasadena', state: 'CA', zip: '91030' },
  '91001': { lat: 34.1925, lon: -118.1388, displayName: 'Altadena, CA 91001', city: 'Altadena', state: 'CA', zip: '91001' },
  '91108': { lat: 34.1221, lon: -118.1189, displayName: 'San Marino, CA 91108', city: 'San Marino', state: 'CA', zip: '91108' },
  '91205': { lat: 34.1438, lon: -118.2525, displayName: 'Glendale, CA 91205', city: 'Glendale', state: 'CA', zip: '91205' },
  '91801': { lat: 34.0955, lon: -118.1287, displayName: 'Alhambra, CA 91801', city: 'Alhambra', state: 'CA', zip: '91801' },
  '90041': { lat: 34.1396, lon: -118.2114, displayName: 'Los Angeles, CA 90041 (Eagle Rock)', city: 'Los Angeles', state: 'CA', zip: '90041' },
  '90042': { lat: 34.1105, lon: -118.1923, displayName: 'Los Angeles, CA 90042 (Highland Park)', city: 'Los Angeles', state: 'CA', zip: '90042' },
  'pasadena': { lat: 34.1478, lon: -118.1445, displayName: 'Pasadena, CA', city: 'Pasadena', state: 'CA' },
  'south pasadena': { lat: 34.1166, lon: -118.1528, displayName: 'South Pasadena, CA', city: 'South Pasadena', state: 'CA' },
  'altadena': { lat: 34.1925, lon: -118.1388, displayName: 'Altadena, CA', city: 'Altadena', state: 'CA' },
  'glendale': { lat: 34.1425, lon: -118.2551, displayName: 'Glendale, CA', city: 'Glendale', state: 'CA' },

  // Seattle & King County
  '98101': { lat: 47.6101, lon: -122.3344, displayName: 'Seattle, WA 98101 (Downtown)', city: 'Seattle', state: 'WA', zip: '98101' },
  '98107': { lat: 47.6698, lon: -122.3848, displayName: 'Seattle, WA 98107 (Ballard)', city: 'Seattle', state: 'WA', zip: '98107' },
  '98109': { lat: 47.6322, lon: -122.3486, displayName: 'Seattle, WA 98109 (Queen Anne)', city: 'Seattle', state: 'WA', zip: '98109' },
  '98103': { lat: 47.6734, lon: -122.3426, displayName: 'Seattle, WA 98103 (Fremont / Green Lake)', city: 'Seattle', state: 'WA', zip: '98103' },
  '98115': { lat: 47.6845, lon: -122.2965, displayName: 'Seattle, WA 98115 (Wedgwood / NE Seattle)', city: 'Seattle', state: 'WA', zip: '98115' },
  '98004': { lat: 47.6166, lon: -122.2014, displayName: 'Bellevue, WA 98004', city: 'Bellevue', state: 'WA', zip: '98004' },
  '98033': { lat: 47.6787, lon: -122.2036, displayName: 'Kirkland, WA 98033', city: 'Kirkland', state: 'WA', zip: '98033' },
  'seattle': { lat: 47.6062, lon: -122.3321, displayName: 'Seattle, WA', city: 'Seattle', state: 'WA' },
  'bellevue': { lat: 47.6101, lon: -122.2015, displayName: 'Bellevue, WA', city: 'Bellevue', state: 'WA' },

  // New York City
  '10001': { lat: 40.7501, lon: -73.9967, displayName: 'New York, NY 10001 (Chelsea)', city: 'New York', state: 'NY', zip: '10001' },
  '10018': { lat: 40.7554, lon: -73.9926, displayName: 'New York, NY 10018 (Midtown)', city: 'New York', state: 'NY', zip: '10018' },
  '11201': { lat: 40.6953, lon: -73.9912, displayName: 'Brooklyn, NY 11201 (Brooklyn Heights)', city: 'Brooklyn', state: 'NY', zip: '11201' },
  '11215': { lat: 40.6672, lon: -73.9822, displayName: 'Brooklyn, NY 11215 (Park Slope)', city: 'Brooklyn', state: 'NY', zip: '11215' },
  'new york': { lat: 40.7128, lon: -74.006, displayName: 'New York, NY', city: 'New York', state: 'NY' },
  'brooklyn': { lat: 40.6782, lon: -73.9442, displayName: 'Brooklyn, NY', city: 'Brooklyn', state: 'NY' },

  // San Francisco Bay Area
  '94102': { lat: 37.7786, lon: -122.4212, displayName: 'San Francisco, CA 94102 (Civic Center)', city: 'San Francisco', state: 'CA', zip: '94102' },
  '94110': { lat: 37.7500, lon: -122.4153, displayName: 'San Francisco, CA 94110 (Mission District)', city: 'San Francisco', state: 'CA', zip: '94110' },
  '94118': { lat: 37.7818, lon: -122.4571, displayName: 'San Francisco, CA 94118 (Richmond)', city: 'San Francisco', state: 'CA', zip: '94118' },
  'san francisco': { lat: 37.7749, lon: -122.4194, displayName: 'San Francisco, CA', city: 'San Francisco', state: 'CA' },

  // Chicago
  '60601': { lat: 41.8864, lon: -87.6247, displayName: 'Chicago, IL 60601 (The Loop)', city: 'Chicago', state: 'IL', zip: '60601' },
  '60614': { lat: 41.9226, lon: -87.6534, displayName: 'Chicago, IL 60614 (Lincoln Park)', city: 'Chicago', state: 'IL', zip: '60614' },
  'chicago': { lat: 41.8781, lon: -87.6298, displayName: 'Chicago, IL', city: 'Chicago', state: 'IL' },

  // Los Angeles
  '90012': { lat: 34.0614, lon: -118.2382, displayName: 'Los Angeles, CA 90012 (Downtown)', city: 'Los Angeles', state: 'CA', zip: '90012' },
  '90291': { lat: 33.9912, lon: -118.4682, displayName: 'Venice, CA 90291', city: 'Venice', state: 'CA', zip: '90291' },
  'los angeles': { lat: 34.0522, lon: -118.2437, displayName: 'Los Angeles, CA', city: 'Los Angeles', state: 'CA' },

  // Austin
  '78701': { lat: 30.2711, lon: -97.7437, displayName: 'Austin, TX 78701 (Downtown)', city: 'Austin', state: 'TX', zip: '78701' },
  'austin': { lat: 30.2672, lon: -97.7431, displayName: 'Austin, TX', city: 'Austin', state: 'TX' },

  // Boston
  '02108': { lat: 42.3584, lon: -71.0638, displayName: 'Boston, MA 02108', city: 'Boston', state: 'MA', zip: '02108' },
  'boston': { lat: 42.3601, lon: -71.0589, displayName: 'Boston, MA', city: 'Boston', state: 'MA' },

  // Denver
  '80202': { lat: 39.7541, lon: -104.9975, displayName: 'Denver, CO 80202', city: 'Denver', state: 'CO', zip: '80202' },
  'denver': { lat: 39.7392, lon: -104.9903, displayName: 'Denver, CO', city: 'Denver', state: 'CO' },
};

export async function geocodeLocation(query: string): Promise<LocationCoordinates | null> {
  const normalized = query.trim().toLowerCase();

  // 1. Direct hit in pre-populated table
  if (POPULAR_LOCATIONS[normalized]) {
    return POPULAR_LOCATIONS[normalized];
  }

  // 2. Prefix / partial match
  for (const [key, loc] of Object.entries(POPULAR_LOCATIONS)) {
    if (normalized.startsWith(key) || key.startsWith(normalized)) {
      return loc;
    }
  }

  // 3. Fallback to OpenStreetMap Nominatim for any arbitrary US zipcode / address
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&limit=1&q=${encoded}`,
      {
        headers: {
          'User-Agent': 'StorytimeRadar/1.0 (local-community-events-app)',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        return {
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          displayName: item.display_name.split(',').slice(0, 3).join(','),
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim geocode failed, falling back to default', err);
  }

  // 4. Default fallback: Pasadena downtown
  return POPULAR_LOCATIONS['91101'];
}
