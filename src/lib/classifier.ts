import { AgeGroup, EventType } from '@/types';

export interface ClassificationResult {
  ageGroup: AgeGroup;
  targetAges: AgeGroup[];
  eventType: EventType;
  ageRangeText: string;
  isRegistrationRequired: boolean;
}

export function classifyEvent(title: string, description: string = ''): ClassificationResult {
  const combined = `${title} ${description}`.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // 1. Detect matching age groups
  const targetAgesSet = new Set<AgeGroup>();

  // Check explicit numeric age ranges (e.g., "ages 2 - 5", "ages 0-3", "2 to 5 years", "18 mo - 3 yrs")
  const ageRangeRegex =
    /\b(?:ages?|aged)\s*:?\s*(\d+)\s*(months?|mo|yrs?|years?)?\s*(?:-|to|through)\s*(\d+)\s*(months?|mo|yrs?|years?|yo)?\b|\b(\d+)\s*(months?|mo|yrs?|years?)?\s*(?:-|to|through)\s*(\d+)\s*(yrs?|years?|yo|years old)\b/gi;

  let explicitMinYears: number | null = null;
  let explicitMaxYears: number | null = null;

  for (const match of combined.matchAll(ageRangeRegex)) {
    const rawMin = parseInt(match[1] || match[5], 10);
    const unitMin = (match[2] || match[6] || '').toLowerCase();
    const rawMax = parseInt(match[3] || match[7], 10);
    const unitMax = (match[4] || match[8] || '').toLowerCase();

    const minYears = unitMin.startsWith('m') ? rawMin / 12 : rawMin;
    const maxYears = unitMax.startsWith('m') ? rawMax / 12 : rawMax;

    if (!isNaN(minYears) && !isNaN(maxYears) && maxYears >= minYears) {
      explicitMinYears = minYears;
      explicitMaxYears = maxYears;

      if (minYears <= 1.2) targetAgesSet.add('baby');
      if ((minYears < 3 && maxYears >= 2) || (minYears >= 1 && minYears < 3 && maxYears >= 1.5)) {
        targetAgesSet.add('toddler');
      }
      if (minYears < 5 && maxYears >= 3.5) {
        targetAgesSet.add('preschool');
      }
      if (maxYears >= 6 || (minYears >= 5 && maxYears >= 5)) {
        targetAgesSet.add('kids');
      }
    }
  }

  // Check multi-age spans: 0-3, 0-5, 2-5
  const isZeroToThree = /\b(0\s*-\s*3|0\s*to\s*3|birth\s*to\s*3)\b/i.test(combined);
  const isZeroToFive = /\b(0\s*-\s*5|0\s*to\s*5|birth\s*to\s*5|early learning|under 5)\b/i.test(combined);
  const isTwoToFive = /\b(2\s*-\s*5|2\s*to\s*5)\b/i.test(combined);

  // Baby patterns
  const isBaby =
    isZeroToThree ||
    isZeroToFive ||
    /\b(baby|babies|infant|infants|lap-sit|lapsit|bounce|crawlers|tummy time|mother goose|wee ones)\b/i.test(
      combined
    ) ||
    /0-18\s*(mo|month)|0-12\s*(mo|month)/i.test(combined);

  // Toddler patterns
  const isToddler =
    isZeroToThree ||
    isZeroToFive ||
    isTwoToFive ||
    /\b(toddler|toddlers|waddler|waddlers|2s and 3s|twos|threes|tales for two|tiny tots|walking to 3)\b/i.test(
      combined
    ) ||
    /\b(1-3|1 to 3)\s*(yr|year|years)?\b/i.test(combined) ||
    /\b18\s*(months?|mo)\s*(to|-)\s*3\b/i.test(combined);

  // Preschool patterns
  const isPreschool =
    isZeroToFive ||
    isTwoToFive ||
    /\b(preschool|preschooler|preschoolers|pre-k|ready to read|little learners|4s and 5s|kindergarten prep)\b/i.test(
      combined
    ) ||
    /\b(3-5|3 to 5)\s*(yr|year|years)?\b/i.test(combined);

  // School Age / Kids patterns
  const isKids =
    /\b(school age|elementary|k-5|k-6|grade school|tween|tweens|lego club|robotics|stem club|maker|homework|coding)\b/i.test(
      combined
    ) ||
    /\b(5\+|5-12|6-11)\s*(yr|year|years)?\b/i.test(combined) ||
    /\bchildren\b/i.test(lowerTitle);

  // All Ages / Family patterns
  const isAllAges =
    /\b(family storytime|all ages|all-ages|all family|whole family|pajama|bedtime story|weekend story|puppet|bilingual storytime)\b/i.test(
      combined
    ) || isZeroToFive;

  if (isBaby) targetAgesSet.add('baby');
  if (isToddler) targetAgesSet.add('toddler');
  if (isPreschool) targetAgesSet.add('preschool');
  if (isKids) targetAgesSet.add('kids');
  if (isAllAges) targetAgesSet.add('all-ages');

  // If nothing matched, default to all-ages
  if (targetAgesSet.size === 0) {
    targetAgesSet.add('all-ages');
  }

  const targetAges = Array.from(targetAgesSet);

  // Determine primary display ageGroup
  let ageGroup: AgeGroup = targetAges[0];

  // Specific title keywords override the primary display tag
  if (/\btoddler/i.test(lowerTitle)) {
    ageGroup = 'toddler';
  } else if (/\b(baby|babies|infant|lap-sit|lapsit)\b/i.test(lowerTitle)) {
    ageGroup = 'baby';
  } else if (/\b(preschool|pre-k)\b/i.test(lowerTitle)) {
    ageGroup = 'preschool';
  } else if (/\b(family|all ages|pajama)\b/i.test(lowerTitle)) {
    ageGroup = 'all-ages';
  } else if (/\b(elementary|k-5|k-6|school age|tween|homework)\b/i.test(lowerTitle)) {
    ageGroup = 'kids';
  } else if (targetAges.includes('all-ages') && targetAges.length === 1) {
    ageGroup = 'all-ages';
  } else if (targetAges.includes('toddler')) {
    ageGroup = 'toddler';
  } else if (targetAges.includes('baby')) {
    ageGroup = 'baby';
  } else if (targetAges.includes('preschool')) {
    ageGroup = 'preschool';
  } else if (targetAges.includes('kids')) {
    ageGroup = 'kids';
  }

  // Determine age range text
  let ageRangeText = 'All Ages';
  if (explicitMinYears !== null && explicitMaxYears !== null) {
    if (explicitMinYears === 0 && explicitMaxYears <= 1.5) {
      ageRangeText = `0 – ${Math.round(explicitMaxYears * 12)} months`;
    } else if (explicitMinYears === 0) {
      ageRangeText = `0 – ${explicitMaxYears} years`;
    } else if (Number.isInteger(explicitMinYears) && Number.isInteger(explicitMaxYears)) {
      ageRangeText = `${explicitMinYears} – ${explicitMaxYears} years`;
    } else {
      const minStr = explicitMinYears < 2 ? `${Math.round(explicitMinYears * 12)} mo` : `${explicitMinYears} yrs`;
      const maxStr = explicitMaxYears < 2 ? `${Math.round(explicitMaxYears * 12)} mo` : `${explicitMaxYears} yrs`;
      ageRangeText = `${minStr} – ${maxStr}`;
    }
  } else if (targetAges.includes('baby') && targetAges.includes('toddler') && targetAges.includes('preschool')) {
    ageRangeText = '0 – 5 years';
  } else if (targetAges.includes('baby') && targetAges.includes('toddler')) {
    ageRangeText = '0 – 3 years';
  } else if (targetAges.includes('toddler') && targetAges.includes('preschool')) {
    ageRangeText = '18 mo – 5 yrs';
  } else if (targetAges.length === 1) {
    switch (targetAges[0]) {
      case 'baby':
        ageRangeText = '0 – 18 months';
        break;
      case 'toddler':
        ageRangeText = '18 mo – 3 yrs';
        break;
      case 'preschool':
        ageRangeText = '3 – 5 years';
        break;
      case 'kids':
        ageRangeText = '5+ years';
        break;
      case 'all-ages':
        ageRangeText = 'Family / All Ages';
        break;
    }
  } else if (targetAges.includes('all-ages')) {
    ageRangeText = 'Family / All Ages';
  }

  // 2. Event Type classification
  let eventType: EventType = 'storytime';
  if (/story\s*time|storytime|lap-sit|lapsit|read with|tales for|rhymetime/i.test(lowerTitle)) {
    eventType = 'storytime';
  } else if (/music|movement|sing|dance|rhythm|songs|shake|wiggle/i.test(combined)) {
    eventType = 'music-movement';
  } else if (/craft|stem|lego|art|paint|build|maker|science|slime|diy/i.test(combined)) {
    eventType = 'crafts-stem';
  } else if (/play|playgroup|stay and play|blocks|social|toys|open play/i.test(combined)) {
    eventType = 'playgroup';
  } else if (/story|read|rhyme|tales|book/i.test(combined)) {
    eventType = 'storytime';
  } else {
    eventType = 'other';
  }

  // 3. Registration detection
  const isRegistrationRequired = /registration required|register in advance|sign-up required|space is limited|rsvp required|reserve a spot/i.test(
    combined
  );

  return {
    ageGroup,
    targetAges,
    eventType,
    ageRangeText,
    isRegistrationRequired,
  };
}
