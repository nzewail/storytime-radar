import fs from 'fs';
import path from 'path';
import { LibraryBranch, LibrarySystem, LocationCoordinates } from '@/types';
import { calculateDistanceMiles } from './geo';

interface RawIMLSRecord {
  id: string;
  systemId: string;
  systemName: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lon: number;
  phone?: string | null;
  fscsKey: string;
}

export interface AutocompleteLocation {
  title: string;
  subtitle: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  query: string;
}

let cachedLibraries: LibraryBranch[] | null = null;
let libraryByIdMap: Map<string, LibraryBranch> | null = null;
let cityIndex: Map<string, AutocompleteLocation> | null = null;
let zipIndex: Map<string, AutocompleteLocation> | null = null;

// Curated colors for prominent systems, fallback to deterministic hash for all others
const KNOWN_SYSTEM_COLORS: Record<string, string> = {
  'CA0094': '#e11d48', // Pasadena: Rose
  'WA0064': '#0284c7', // Seattle: Sky Blue
  'CA0063': '#0891b2', // LAPL: Cyan
  'CA0075': '#0891b2', // LAPL legacy
  'CA0062': '#4f46e5', // LA County: Indigo
  'CA0076': '#4f46e5', // LA County legacy
  'CA0168': '#059669', // SFPL: Emerald
  'IL0091': '#ea580c', // Chicago: Orange
  'TX0037': '#d97706', // Austin: Amber
  'CO0026': '#2563eb', // Denver: Blue
  'MA0034': '#7c3aed', // Boston: Violet
  'MI0321': '#0d9488', // St. Clair County (Port Huron): Teal
};

// Curated websites for prominent systems
const KNOWN_SYSTEM_WEBSITES: Record<string, string> = {
  'CA0094': 'https://www.cityofpasadena.net/library/',
  'WA0064': 'https://www.spl.org',
  'CA0063': 'https://www.lapl.org',
  'CA0075': 'https://www.lapl.org',
  'CA0062': 'https://lacountylibrary.org',
  'CA0076': 'https://lacountylibrary.org',
  'CA0168': 'https://sfpl.org',
  'IL0091': 'https://www.chipublib.org',
  'TX0037': 'https://library.austintexas.gov',
  'CO0026': 'https://www.denverlibrary.org',
  'MA0034': 'https://www.bpl.org',
  'MI0321': 'https://stclaircountylibrary.org',
  'CA0138': 'https://www.southpasadenaca.gov/Your-Government/Department-Service-Areas/Library',
};

// Deterministic pleasing color palette generator for any library system in America
function generateSystemColor(seed: string): string {
  const PALETTE = [
    '#0284c7', '#0891b2', '#0d9488', '#059669', '#16a34a',
    '#65a30d', '#ca8a04', '#d97706', '#ea580c', '#e11d48',
    '#db2777', '#c026d3', '#9333ea', '#7c3aed', '#4f46e5', '#2563eb'
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

function ensureLoaded() {
  if (cachedLibraries && libraryByIdMap && cityIndex && zipIndex) {
    return;
  }

  const filePath = path.join(process.cwd(), 'data', 'us_public_libraries.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const records: RawIMLSRecord[] = JSON.parse(raw);

    const map = new Map<string, LibraryBranch>();
    const branches: LibraryBranch[] = [];
    const cities = new Map<string, AutocompleteLocation>();
    const zips = new Map<string, AutocompleteLocation>();

    for (const r of records) {
      const lowerName = r.name.toLowerCase();
      // Filter out non-physical bookmobiles and administrative offices
      if (
        lowerName.includes('bookmobile') ||
        lowerName.includes('mobile service') ||
        lowerName.includes('mobile unit') ||
        lowerName.includes('administrative')
      ) {
        continue;
      }

      const fscs = r.fscsKey;
      const website = KNOWN_SYSTEM_WEBSITES[fscs] || undefined;

      const branch: LibraryBranch = {
        id: r.id,
        systemId: r.systemId,
        systemName: r.systemName,
        name: r.name,
        address: r.address,
        city: r.city,
        state: r.state,
        zip: r.zip,
        lat: r.lat,
        lon: r.lon,
        phone: r.phone || undefined,
        website,
      };

      map.set(r.id, branch);
      branches.push(branch);

      // Index city
      const cityKey = `${r.city}, ${r.state}`.toLowerCase();
      const isMain = lowerName.includes('central') || lowerName.includes('main');
      if (!cities.has(cityKey) || isMain) {
        cities.set(cityKey, {
          title: `${r.city}, ${r.state}`,
          subtitle: r.systemName,
          city: r.city,
          state: r.state,
          lat: r.lat,
          lon: r.lon,
          query: `${r.city}, ${r.state}`,
        });
      }

      // Index ZIP
      if (r.zip && !zips.has(r.zip)) {
        zips.set(r.zip, {
          title: r.zip,
          subtitle: `${r.city}, ${r.state} • ${r.systemName}`,
          city: r.city,
          state: r.state,
          lat: r.lat,
          lon: r.lon,
          query: r.zip,
        });
      }
    }

    cachedLibraries = branches;
    libraryByIdMap = map;
    cityIndex = cities;
    zipIndex = zips;
  } catch (err) {
    console.error('Failed to load us_public_libraries.json:', err);
    cachedLibraries = [];
    libraryByIdMap = new Map();
    cityIndex = new Map();
    zipIndex = new Map();
  }
}

export function loadAllLibraries(): LibraryBranch[] {
  ensureLoaded();
  return cachedLibraries || [];
}

export function getBranchById(id: string): LibraryBranch | undefined {
  ensureLoaded();
  return libraryByIdMap?.get(id);
}

export function getBranchesByIds(ids: string[]): LibraryBranch[] {
  ensureLoaded();
  const idSet = new Set(ids);
  const branches: LibraryBranch[] = [];
  for (const id of idSet) {
    const found = libraryByIdMap?.get(id);
    if (found) {
      branches.push(found);
    }
  }
  return branches;
}

/**
 * Autocomplete search across all 13,400+ cities and 15,300+ ZIP codes
 * with public libraries in the federal IMLS database.
 */
export function searchLocations(query: string, limit: number = 6): AutocompleteLocation[] {
  ensureLoaded();
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const isNumeric = /^\d+/.test(q);
  const results: AutocompleteLocation[] = [];

  if (isNumeric) {
    if (zipIndex) {
      for (const [z, item] of zipIndex) {
        if (z.startsWith(q)) {
          results.push(item);
          if (results.length >= limit) break;
        }
      }
    }
  } else {
    if (cityIndex) {
      // 1. Starts with query (e.g. "Port Hur...")
      for (const [key, item] of cityIndex) {
        if (key.startsWith(q)) {
          results.push(item);
          if (results.length >= limit) break;
        }
      }

      // 2. Contains query if still under limit
      if (results.length < limit) {
        for (const [key, item] of cityIndex) {
          if (!key.startsWith(q) && key.includes(q)) {
            results.push(item);
            if (results.length >= limit) break;
          }
        }
      }
    }
  }

  return results;
}

/**
 * Resolves an exact city ("port huron, mi") or 5-digit ZIP ("48060")
 * directly from the database.
 */
export function lookupLocation(query: string): LocationCoordinates | null {
  ensureLoaded();
  const q = query.trim().toLowerCase();

  // 1. Check exact 5-digit ZIP code
  if (/^\d{5}$/.test(q) && zipIndex) {
    const item = zipIndex.get(q);
    if (item) {
      return {
        lat: item.lat,
        lon: item.lon,
        displayName: `${item.city}, ${item.state} ${q}`,
        city: item.city,
        state: item.state,
        zip: q,
      };
    }
  }

  // 2. Check exact city, state
  if (cityIndex) {
    const item = cityIndex.get(q);
    if (item) {
      return {
        lat: item.lat,
        lon: item.lon,
        displayName: `${item.city}, ${item.state}`,
        city: item.city,
        state: item.state,
      };
    }

    // Check city without state code if unique match exists
    const candidates: AutocompleteLocation[] = [];
    for (const [key, item] of cityIndex) {
      if (item.city.toLowerCase() === q) {
        candidates.push(item);
      }
    }
    if (candidates.length === 1) {
      const single = candidates[0];
      return {
        lat: single.lat,
        lon: single.lon,
        displayName: `${single.city}, ${single.state}`,
        city: single.city,
        state: single.state,
      };
    }
  }

  return null;
}

export interface RadiusSearchResult {
  systems: LibrarySystem[];
  branches: LibraryBranch[];
  totalWithinRadius: number;
  nearestBranch: (LibraryBranch & { distanceMiles: number }) | null;
}

export function getLibrariesWithinRadius(
  lat: number,
  lon: number,
  radiusMiles: number = 15
): RadiusSearchResult {
  const all = loadAllLibraries();
  if (all.length === 0) {
    return { systems: [], branches: [], totalWithinRadius: 0, nearestBranch: null };
  }

  // Bounding box pre-filtering for sub-millisecond spatial search:
  // 1 degree lat ~ 69 miles
  // 1 degree lon ~ 69 * cos(lat) miles
  const safeRadius = Math.max(radiusMiles, 50);
  const deltaLat = (safeRadius / 69) * 1.25;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const deltaLon = (safeRadius / (69 * Math.max(cosLat, 0.1))) * 1.25;

  const minLat = lat - deltaLat;
  const maxLat = lat + deltaLat;
  const minLon = lon - deltaLon;
  const maxLon = lon + deltaLon;

  const candidates: (LibraryBranch & { distanceMiles: number })[] = [];
  let closest: (LibraryBranch & { distanceMiles: number }) | null = null;
  let minDistance = Infinity;

  for (const b of all) {
    if (b.lat >= minLat && b.lat <= maxLat && b.lon >= minLon && b.lon <= maxLon) {
      const distance = calculateDistanceMiles(lat, lon, b.lat, b.lon);
      const branchWithDist = { ...b, distanceMiles: distance };

      if (distance < minDistance) {
        minDistance = distance;
        closest = branchWithDist;
      }

      if (distance <= radiusMiles) {
        candidates.push(branchWithDist);
      }
    }
  }

  // If bounding box yielded no closest (remote area), find nearest across full DB
  if (!closest) {
    for (const b of all) {
      const distance = calculateDistanceMiles(lat, lon, b.lat, b.lon);
      if (distance < minDistance) {
        minDistance = distance;
        closest = { ...b, distanceMiles: distance };
      }
    }
  }

  // Sort candidates by distance ascending
  candidates.sort((a, b) => a.distanceMiles - b.distanceMiles);

  // Group into unique LibrarySystem objects
  const systemMap = new Map<string, LibrarySystem>();
  for (const b of candidates) {
    if (!systemMap.has(b.systemId)) {
      const fscsKey = b.systemId.replace('sys-', '').toUpperCase();
      const color = KNOWN_SYSTEM_COLORS[fscsKey] || generateSystemColor(b.systemId);
      const website = KNOWN_SYSTEM_WEBSITES[fscsKey] || `https://www.google.com/search?q=${encodeURIComponent(b.systemName)}`;
      const providerType = (fscsKey === 'CA0094' || fscsKey === 'WA0064') ? 'trumba' : 'custom';

      systemMap.set(b.systemId, {
        id: b.systemId,
        name: b.systemName,
        city: b.city,
        state: b.state,
        website,
        color,
        providerType,
      });
    }
  }

  return {
    systems: Array.from(systemMap.values()),
    branches: candidates,
    totalWithinRadius: candidates.length,
    nearestBranch: closest,
  };
}
