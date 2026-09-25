import { AgeCategoryInfo, AgeGroup, EventType, TimeOfDay } from '@/types';

export const AGE_CATEGORIES: Record<AgeGroup, AgeCategoryInfo> = {
  baby: {
    id: 'baby',
    label: 'Baby & Lap-sit',
    ageRange: '0 – 18 months',
    icon: '👶',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
  },
  toddler: {
    id: 'toddler',
    label: 'Toddler Time',
    ageRange: '18 months – 3 years',
    icon: '🧒',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
  },
  preschool: {
    id: 'preschool',
    label: 'Preschool',
    ageRange: '3 – 5 years',
    icon: '🎨',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
  },
  kids: {
    id: 'kids',
    label: 'School Age',
    ageRange: '5+ years',
    icon: '🚀',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
  },
  'all-ages': {
    id: 'all-ages',
    label: 'Family & All Ages',
    ageRange: 'All Ages',
    icon: '👨‍👩‍👧‍👦',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
  },
};

export const EVENT_TYPES: Record<EventType, { label: string; icon: string }> = {
  storytime: { label: 'Storytime & Songs', icon: '📖' },
  'music-movement': { label: 'Music & Movement', icon: '🎵' },
  'crafts-stem': { label: 'Crafts & STEM', icon: '🧩' },
  playgroup: { label: 'Open Play & Social', icon: '🧸' },
  other: { label: 'Special Event', icon: '✨' },
};

export const TIME_OF_DAY_BRACKETS: Record<TimeOfDay, { label: string; subtext: string }> = {
  morning: { label: 'Morning', subtext: 'Before 11:30 AM' },
  midday: { label: 'Midday', subtext: '11:30 AM – 2:00 PM' },
  afternoon: { label: 'Afternoon', subtext: 'After 2:00 PM' },
};

export const DAYS_OF_WEEK = [
  { day: 0, short: 'Sun', name: 'Sunday' },
  { day: 1, short: 'Mon', name: 'Monday' },
  { day: 2, short: 'Tue', name: 'Tuesday' },
  { day: 3, short: 'Wed', name: 'Wednesday' },
  { day: 4, short: 'Thu', name: 'Thursday' },
  { day: 5, short: 'Fri', name: 'Friday' },
  { day: 6, short: 'Sat', name: 'Saturday' },
];
