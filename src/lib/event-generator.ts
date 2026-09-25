import { StorytimeEvent, LibraryBranch } from '@/types';
import { LIBRARY_BRANCHES } from './libraries-data';
import { classifyEvent } from './classifier';
import { addDays, setHours, setMinutes, startOfWeek, isSameDay } from 'date-fns';

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
];

// Branch-specific program variations to keep schedules varied and realistic
const BRANCH_SCHEDULE_VARIATIONS: Record<string, number[]> = {
  // e.g. branchId -> indices in WEEKLY_PROGRAM_TEMPLATES that this branch hosts
  'spl-ballard': [0, 1, 2, 4, 5],
  'spl-queen-anne': [0, 1, 5, 7],
  'spl-central': [0, 1, 2, 3, 4, 5, 6],
  'spl-fremont': [1, 2, 5],
  'spl-greenwood': [0, 1, 3, 5],
  'kcls-bellevue': [0, 1, 2, 3, 4, 5, 6, 7],
  'kcls-kirkland': [0, 1, 2, 5],
  'kcls-redmond': [0, 1, 3, 5, 6],
  'nypl-schwarzman': [0, 1, 2, 5],
  'nypl-snfl': [0, 1, 2, 3, 5, 7],
  'bpl-central': [0, 1, 2, 3, 4, 5, 6],
  'bpl-park-slope': [0, 1, 3, 5],
  'sfpl-main': [0, 1, 2, 3, 5],
  'sfpl-mission': [0, 1, 2, 5],
  'cpl-lincoln-park': [0, 1, 3, 5],
  'apl-central': [0, 1, 2, 3, 5, 6],
  'lapl-central': [0, 1, 2, 5],
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
  const branches = branchIds.length > 0
    ? LIBRARY_BRANCHES.filter((b) => branchIds.includes(b.id))
    : LIBRARY_BRANCHES;

  for (const branch of branches) {
    const templateIndices =
      BRANCH_SCHEDULE_VARIATIONS[branch.id] || [0, 1, 2, 5]; // Default selection

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
            url: branch.website,
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
