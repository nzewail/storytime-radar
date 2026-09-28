import { LibraryBranch } from '@/types';

/**
 * Generic location-to-branch matcher.
 * Matches an event's location text against candidate library branches in a system
 * based on branch name tokens, street address, and keywords.
 */
export function matchEventToBranch(
  rawLocation: string,
  eventTitle: string,
  eventDescription: string,
  branches: LibraryBranch[]
): LibraryBranch | null {
  if (branches.length === 0) return null;
  if (branches.length === 1) return branches[0];

  const searchCorpus = `${rawLocation} ${eventTitle} ${eventDescription}`.toLowerCase();

  let bestMatch: LibraryBranch | null = null;
  let highestScore = 0;

  for (const branch of branches) {
    let score = 0;

    // 1. Normalize branch name (strip common words like "branch", "library", "public", etc.)
    const nameTokens = branch.name
      .toLowerCase()
      .replace(/\b(branch|library|public|community|regional|neighborhood|center)\b/g, '')
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (nameTokens.length > 0) {
      const fullStripped = nameTokens.join(' ');
      if (searchCorpus.includes(fullStripped)) {
        score += fullStripped.length * 3;
      } else {
        // Partial token matches
        for (const token of nameTokens) {
          if (searchCorpus.includes(token)) {
            score += token.length;
          }
        }
      }
    }

    // 2. Street address matching (e.g. "3325 E. Orange Grove" or "5027 Caspar")
    if (branch.address) {
      const streetPart = branch.address.toLowerCase().split(',')[0].trim();
      const streetNumber = streetPart.match(/^\d+/)?.[0];
      const streetName = streetPart
        .replace(/^\d+\s*/, '')
        .replace(/\b(st|ave|blvd|rd|dr|way|lane|ct)\b/g, '')
        .trim();

      if (streetPart.length > 5 && searchCorpus.includes(streetPart)) {
        score += 25;
      } else if (
        streetNumber &&
        streetName.length > 3 &&
        searchCorpus.includes(streetNumber) &&
        searchCorpus.includes(streetName)
      ) {
        score += 20;
      }
    }

    // 3. Main / Central library handling
    if (/\b(main library|main branch|central library|central branch|downtown)\b/i.test(searchCorpus)) {
      if (/\b(central|main)\b/i.test(branch.name) || branch.name.toLowerCase().includes(branch.city.toLowerCase())) {
        score += 15;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = branch;
    }
  }

  // Require a minimum match score to avoid false associations
  return highestScore >= 3 ? bestMatch : null;
}

/**
 * Resolves a dedicated web page for a library branch.
 */
export function getBranchPageUrl(branch: LibraryBranch): string {
  if (branch.website && branch.website.includes('/branches/')) return branch.website;

  const cleanName = branch.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (branch.systemId === 'sys-ca0094') {
    const pSlug = cleanName.replace('-library', '').replace('-branch', '');
    return `https://www.cityofpasadena.net/library/branches/${pSlug}-library/`;
  }
  if (branch.systemId === 'sys-ca0063') {
    const lSlug = cleanName.replace('-branch', '').replace('-library', '');
    return `https://www.lapl.org/branches/${lSlug}`;
  }
  if (branch.systemId === 'sys-ca0062') {
    const cSlug = cleanName.replace('-library', '');
    return `https://lacountylibrary.org/${cSlug}-library/`;
  }

  return (
    branch.website ||
    `https://www.google.com/search?q=${encodeURIComponent(`${branch.name} ${branch.city} library`)}`
  );
}
