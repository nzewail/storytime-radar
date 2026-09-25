import { AgeGroup, EventType } from '@/types';

interface ClassificationResult {
  ageGroup: AgeGroup;
  eventType: EventType;
  ageRangeText: string;
  isRegistrationRequired: boolean;
}

export function classifyEvent(title: string, description: string = ''): ClassificationResult {
  const combined = `${title} ${description}`.toLowerCase();

  // 1. Age Group classification
  let ageGroup: AgeGroup = 'all-ages';
  let ageRangeText = 'All Ages';

  if (
    /baby|infant|lap-sit|lapsit|bounce|0-18\s*(mo|month)|0-12\s*(mo|month)|crawlers|tummy time|mother goose|wee ones|babies/.test(
      combined
    )
  ) {
    ageGroup = 'baby';
    ageRangeText = '0 – 18 months';
  } else if (
    /toddler|waddler|1-3\s*(yr|year)|2s and 3s|twos|threes|tales for two|tiny tots|walking to 3|18 months to 3/i.test(
      combined
    )
  ) {
    ageGroup = 'toddler';
    ageRangeText = '18 mo – 3 yrs';
  } else if (
    /preschool|3-5\s*(yr|year)|pre-k|ready to read|little learners|3 to 5|4s and 5s|kindergarten prep/i.test(
      combined
    )
  ) {
    ageGroup = 'preschool';
    ageRangeText = '3 – 5 years';
  } else if (
    /school age|elementary|k-5|grade|tween|lego club|robotics|stem club|maker|homework|coding/i.test(
      combined
    )
  ) {
    ageGroup = 'kids';
    ageRangeText = '5+ years';
  } else if (
    /family storytime|all ages|pajama|bedtime story|weekend story|puppet|bilingual storytime/i.test(
      combined
    )
  ) {
    ageGroup = 'all-ages';
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
    eventType,
    ageRangeText,
    isRegistrationRequired,
  };
}
