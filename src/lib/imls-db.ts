import fs from 'fs';
import path from 'path';
import { LibraryBranch, LibrarySystem } from '@/types';
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

let cachedLibraries: LibraryBranch[] | null = null;
let libraryByIdMap: Map<string, LibraryBranch> | null = null;

// Curated colors for prominent systems, fallback to deterministic hash for all others
const KNOWN_SYSTEM_COLORS: Record<string, string> = {
  'CA0094': '#e11d48', // Pasadena: Rose
  'WA0064': '#0284c7', // Seattle: Sky Blue
  'CA0075': '#0891b2', // LAPL: Cyan
  'CA0076': '#4f46e5', // LA County: Indigo
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
  'CA0075': 'https://www.lapl.org',
  'CA0076': 'https://lacountylibrary.org',
  'CA0168': 'https://sfpl.org',
  'IL0091': 'https://www.chipublib.org',
  'TX0037': 'https://library.austintexas.gov',
  'CO0026': 'https://www.denverlibrary.org',
  'MA0034': 'https://www.bpl.org',
  'MI0321': 'https://sccl.lib.mi.us',
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

export function loadAllLibraries(): LibraryBranch[] {
  if (cachedLibraries && libraryByIdMap) {
    return cachedLibraries;
  }

  const filePath = path.join(process.cwd(), 'data', 'us_public_libraries.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const records: RawIMLSRecord[] = JSON.parse(raw);

    const map = new Map<string, LibraryBranch>();
    const branches: LibraryBranch[] = [];

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
    }

    cachedLibraries = branches;
    libraryByIdMap = map;
    return branches;
  } catch (err) {
    console.error('Failed to load us_public_libraries.json:', err);
    return [];
  }
}

export function getBranchById(id: string): LibraryBranch | undefined {
  if (!libraryByIdMap) {
    loadAllLibraries();
  }
  return libraryByIdMap?.get(id);
}

export function getBranchesByIds(ids: string[]): LibraryBranch[] {
  if (!libraryByIdMap) {
    loadAllLibraries();
  }
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
  const safeRadius = Math.max(radiusMiles, 50); // Search bounding box with margin
  const deltaLat = (safeRadius / 69) * 1.25;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const deltaLon = (safeRadius / (69 * Math.max(cosLat, 0.1))) * 1.25;

  const minLat = lat - deltaLat;
  const maxLat = lat + deltaLat;
  const minLon = lon - deltaLon;
  const maxLon = lon + deltaLon;

  // Filter candidates using fast bounding box
  const candidates: (LibraryBranch & { distanceMiles: number })[] = [];
  let closest: (LibraryBranch & { distanceMiles: number }) | null = null;
  let minDistance = Infinity;

  for (const b of all) {
    // Quick bounding box check
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

  // If bounding box yielded no closest (e.g. very sparse remote area), find nearest across full DB
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
      // Extract FSCS code from sysId e.g. "sys-ca0094" -> "CA0094"
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
