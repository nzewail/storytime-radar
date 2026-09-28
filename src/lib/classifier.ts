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

  // Check multi-age spans: 0-3, 0-5
  const isZeroToThree = /\b(0\s*-\s*3|0\s*to\s*3|birth\s*to\s*3)\b/i.test(combined);
  const isZeroToFive = /\b(0\s*-\s*5|0\s*to\s*5|birth\s*to\s*5|early learning|under 5)\b/i.test(combined);

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
    /\b(toddler|toddlers|waddler|waddlers|2s and 3s|twos|threes|tales for two|tiny tots|walking to 3)\b/i.test(
      combined
    ) ||
    /\b(1-3|1 to 3)\s*(yr|year|years)?\b/i.test(combined) ||
    /\b18\s*(months?|mo)\s*(to|-)\s*3\b/i.test(combined);

  // Preschool patterns
  const isPreschool =
    isZeroToFive ||
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
  if (targetAges.includes('baby') && targetAges.includes('toddler') && targetAges.includes('preschool')) {
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
  if (/music|movement|sing|dance|rhythm|songs|shake|wiggle/i.test(combined)) {
    eventType = 'music-movement';
  } else if (/craft|stem|lego|art|paint|build|maker|science|slime|diy/i.test(combined)) {
    eventType = 'crafts-stem';
  } else if (/play|playgroup|stay and play|blocks|social|toys|open play/i.test(combined)) {
    eventType = 'playgroup';
  } else if (/story|read|rhyme|tales|tales for|book/i.test(combined)) {
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
