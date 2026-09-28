import { StorytimeEvent, LibraryBranch } from '@/types';
import { LIBRARY_BRANCHES } from './libraries-data';
import { getBranchesByIds, getBranchById, loadAllLibraries } from './imls-db';
import { classifyEvent } from './classifier';
import { addDays, setHours, setMinutes } from 'date-fns';

interface ProgramTemplate {
  title: string;
  description: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  room: string;
  registrationRequired?: boolean;
}

// Typical recurring weekly storytime schedules across public library systems
const WEEKLY_PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    title: 'Baby Lap-sit & Rhymes',
    description: 'A gentle, interactive 30-minute session of songs, bounces, fingerplays, and board books specially designed for babies and their caregivers. Stay afterwards for baby social time!',
    dayOfWeek: 2, // Tuesday
    startHour: 10,
    startMinute: 30,
    durationMinutes: 30,
    room: "Children's Story Room",
  },
  {
    title: 'Toddler Story & Song Time',
    description: 'Active stories, silly songs, rhymes, and movement activities geared for energetic toddlers. We read 2-3 short books and practice early literacy skills with fun puppets and shakers.',
    dayOfWeek: 3, // Wednesday
    startHour: 10,
    startMinute: 15,
    durationMinutes: 35,
    room: "Children's Area",
  },
  {
    title: 'Preschool Ready-to-Read Storytime',
    description: 'Engaging longer picture books, interactive flannel board stories, letter knowledge, and songs to foster a love of reading and school readiness. Followed by a simple art craft.',
    dayOfWeek: 4, // Thursday
    startHour: 10,
    startMinute: 30,
    durationMinutes: 45,
    room: 'Program Room A',
  },
  {
    title: 'Little Movers: Music & Movement',
    description: 'Shake your sillies out! An active musical session with scarves, rhythm sticks, parachute play, and dancing to develop motor skills and rhythm.',
    dayOfWeek: 1, // Monday
    startHour: 10,
    startMinute: 30,
    durationMinutes: 40,
    room: 'Multipurpose Room',
  },
  {
    title: 'Stay & Play / Toddler Open Playgroup',
    description: 'Drop-in social play hour with toys, sensory bins, duplos, and tunnels. A great opportunity for toddlers to practice sharing and for parents/caregivers to connect.',
    dayOfWeek: 5, // Friday
    startHour: 10,
    startMinute: 0,
    durationMinutes: 60,
    room: "Children's Play Corner",
  },
  {
    title: 'Saturday Family Storytime & Crafts',
    description: 'Stories, songs, and laughter for the whole family! Bring the kids, grandparents, and siblings for a joyful weekend storytime followed by a hands-on craft activity.',
    dayOfWeek: 6, // Saturday
    startHour: 10,
    startMinute: 30,
    durationMinutes: 45,
    room: "Children's Room",
  },
  {
    title: 'Little Builders: STEM & Lego Club',
    description: 'Hands-on building fun for kindergarten and elementary kids. Build engineering challenges, test bridges, or build your own magnificent Lego creations.',
    dayOfWeek: 3, // Wednesday
    startHour: 15,
    startMinute: 30,
    durationMinutes: 60,
    room: 'Community Room',
    registrationRequired: true,
  },
  {
    title: 'Pajama Storytime & Bedtime Tales',
    description: 'Put on your favorite cozy pajamas and bring a stuffed animal friend for calm, relaxing bedtime stories and soft lullabies before sleep.',
    dayOfWeek: 4, // Thursday
    startHour: 18,
    startMinute: 30,
    durationMinutes: 35,
    room: 'Story Corner',
  },
  {
    title: 'Bilingual Storytime / Cuentos Bilingües',
    description: 'Songs, rhymes, and picture books in Spanish and English for families and young children. Un tiempo interactivo para toda la familia.',
    dayOfWeek: 5, // Friday
    startHour: 11,
    startMinute: 0,
    durationMinutes: 40,
    room: 'Patio / Community Room',
  },
];

// Branch-specific program variations
const BRANCH_SCHEDULE_VARIATIONS: Record<string, number[]> = {
  // Pasadena Public Library
  'ppl-jefferson': [0, 1, 2, 3, 4, 5, 6, 7], // Flagship children's branch
  'ppl-hastings': [0, 1, 2, 5],
  'ppl-allendale': [1, 2, 5],
  'ppl-hill-ave': [0, 1, 5, 7],
  'ppl-lamanda-park': [1, 3, 5],
  'ppl-la-pintoresca': [1, 4, 8],
  'ppl-santa-catalina': [0, 1, 6],
  'ppl-san-rafael': [2, 5],
  'ppl-linda-vista': [1, 2],

  // South Pasadena Public Library
  'sppl-main': [0, 1, 2, 3, 4, 5],

  // Altadena Library District
  'ald-main': [0, 1, 2, 4, 5],
  'ald-bob-lucas': [1, 2, 8],

  // Crowell San Marino
  'crowell-main': [0, 1, 2, 6],

  // Alhambra
  'alhambra-main': [0, 1, 3, 5],

  // Glendale
  'glac-central': [0, 1, 2, 3, 5, 6],
  'glac-brand': [2, 5],
  'glac-adams-square': [1, 2],
  'glac-montrose': [0, 1, 5],

  // LA County
  'lacounty-san-gabriel': [1, 2, 5],
  'lacounty-temple-city': [0, 1, 5],
  'lacounty-rosemead': [1, 4, 8],
  'lacounty-la-canada': [0, 1, 2, 5],

  // LAPL Nearby
  'lapl-eagle-rock': [0, 1, 2, 5],
  'lapl-arroyo-seco': [0, 1, 3, 5],
  'lapl-chinatown': [1, 2],
  'lapl-lincoln-heights': [1, 8],
  'lapl-central': [0, 1, 2, 5],
  'lapl-venice': [0, 1, 5],

  // Seattle
  'spl-ballard': [0, 1, 2, 4, 5],
  'spl-queen-anne': [0, 1, 5, 7],
  'spl-central': [0, 1, 2, 3, 4, 5, 6],
  'spl-fremont': [1, 2, 5],
  'spl-greenwood': [0, 1, 3, 5],
  'kcls-bellevue': [0, 1, 2, 3, 4, 5, 6, 7],
  'kcls-kirkland': [0, 1, 2, 5],
  'kcls-redmond': [0, 1, 3, 5, 6],

  // New York
  'nypl-schwarzman': [0, 1, 2, 5],
  'nypl-snfl': [0, 1, 2, 3, 5, 7],
  'bpl-central': [0, 1, 2, 3, 4, 5, 6],
  'bpl-park-slope': [0, 1, 3, 5],

  // SF & Others
  'sfpl-main': [0, 1, 2, 3, 5],
  'sfpl-mission': [0, 1, 2, 5],
  'cpl-lincoln-park': [0, 1, 3, 5],
  'apl-central': [0, 1, 2, 3, 5, 6],
};

export function generateEventsForBranches(
  branchIds: string[],
  startDate: Date = new Date(),
  daysAhead: number = 60
): StorytimeEvent[] {
  const events: StorytimeEvent[] = [];
  const startDay = new Date(startDate);
  startDay.setHours(0, 0, 0, 0);

  // We generate from 7 days ago to daysAhead in future
  const beginDate = addDays(startDay, -7);
  const totalDays = daysAhead + 7;

  // Selected branches or all branches
  let branches: LibraryBranch[] = [];
  if (branchIds.length > 0) {
    branches = getBranchesByIds(branchIds);
    // If any IDs are from legacy static list, merge them
    if (branches.length < branchIds.length) {
      const foundIds = new Set(branches.map((b) => b.id));
      const missingIds = branchIds.filter((id) => !foundIds.has(id));
      const legacyBranches = LIBRARY_BRANCHES.filter((b) => missingIds.includes(b.id));
      branches.push(...legacyBranches);
    }
  } else {
    branches = loadAllLibraries().slice(0, 10);
  }

  const schedulePresets = [
    [0, 1, 2, 5],
    [1, 2, 4, 6],
    [0, 2, 3, 5],
    [1, 3, 5, 7],
    [0, 1, 5, 8],
    [2, 4, 5, 6],
  ];

  for (const branch of branches) {
    // Deterministic distribution per branch
    let hash = 0;
    for (let i = 0; i < branch.id.length; i++) {
      hash = (hash << 5) - hash + branch.id.charCodeAt(i);
      hash |= 0;
    }
    const templateIndices =
      BRANCH_SCHEDULE_VARIATIONS[branch.id] ||
      schedulePresets[Math.abs(hash) % schedulePresets.length];

    for (let dayOffset = 0; dayOffset <= totalDays; dayOffset++) {
      const currentDate = addDays(beginDate, dayOffset);
      const dayOfWeek = currentDate.getDay();

      for (const tIdx of templateIndices) {
        const tmpl = WEEKLY_PROGRAM_TEMPLATES[tIdx];
        if (tmpl.dayOfWeek === dayOfWeek) {
          const startTime = setMinutes(
            setHours(new Date(currentDate), tmpl.startHour),
            tmpl.startMinute
          );
          const endTime = new Date(startTime.getTime() + tmpl.durationMinutes * 60000);

          const { ageGroup, eventType, ageRangeText, isRegistrationRequired } =
            classifyEvent(tmpl.title, tmpl.description);

          const eventId = `${branch.id}-${tmpl.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${currentDate.toISOString().slice(0, 10)}`;

          const eventUrl =
            branch.website ||
            `https://www.google.com/search?q=${encodeURIComponent(`${branch.name} ${branch.city} ${branch.state} library storytime`)}`;

          events.push({
            id: eventId,
            systemId: branch.systemId,
            systemName: branch.systemName,
            branchId: branch.id,
            branchName: branch.name,
            branchAddress: `${branch.address}, ${branch.city}, ${branch.state} ${branch.zip}`,
            branchCity: branch.city,
            title: tmpl.title,
            description: tmpl.description,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            ageGroup,
            ageRangeText,
            eventType,
            roomOrLocation: tmpl.room,
            url: eventUrl,
            isRegistrationRequired: tmpl.registrationRequired || isRegistrationRequired,
          });
        }
      }
    }
  }

  // Sort chronologically
  return events.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}
