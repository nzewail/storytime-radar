import { StorytimeEvent, LibraryBranch } from '@/types';
import { getBranchesByIds, loadAllLibraries } from './imls-db';
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
    room: "Children's Room",
  },
  {
    title: 'Family Weekend Story & Craft',
    description: 'A joyful weekend story hour for the whole family! Features engaging stories, lively sing-alongs, and an easy hands-on craft activity for all ages.',
    dayOfWeek: 6, // Saturday
    startHour: 11,
    startMinute: 0,
    durationMinutes: 50,
    room: 'Community Room',
  },
  {
    title: 'Bilingual Storytime / Cuentos Bilingües',
    description: 'Stories, songs, and rhymes presented in English and Spanish to celebrate language and culture. Perfect for bilingual families or children learning a new language.',
    dayOfWeek: 2, // Tuesday
    startHour: 11,
    startMinute: 15,
    durationMinutes: 40,
    room: "Children's Story Room",
  },
  {
    title: 'Baby Sign & Sing',
    description: 'Learn basic sign language signs for everyday communication with your baby through fun songs, rhymes, and stories.',
    dayOfWeek: 4, // Thursday
    startHour: 11,
    startMinute: 15,
    durationMinutes: 30,
    room: "Children's Story Room",
  },
  {
    title: 'Little Builders: STEM & Lego Club',
    description: 'Free build and challenge prompts with mega bloks, Duplo, and standard Legos. Encourages spatial reasoning, fine motor skills, and creative collaboration.',
    dayOfWeek: 3, // Wednesday
    startHour: 15,
    startMinute: 30,
    durationMinutes: 60,
    room: 'Activity Room',
  },
  {
    title: 'Twilight Bedtime Pajama Storytime',
    description: 'Wear your cozy pajamas and bring your favorite stuffed animal! We wind down the day with calming bedtime stories, gentle lullabies, and soothing songs.',
    dayOfWeek: 4, // Thursday evening
    startHour: 18,
    startMinute: 30,
    durationMinutes: 35,
    room: "Children's Room",
  },
  {
    title: 'Sensory-Friendly Calm Storytime',
    description: 'A welcoming, supportive environment with dimmed lights, fidget toys, visual schedules, and sensory-friendly storytelling designed for neurodivergent children.',
    dayOfWeek: 6, // Saturday
    startHour: 10,
    startMinute: 0,
    durationMinutes: 40,
    room: 'Quiet Study / Meeting Room',
    registrationRequired: true,
  },
  {
    title: 'Nature & Garden Storytime',
    description: 'Stories about animals, plants, and the seasons followed by a quick outdoor nature exploration or seedling planting on the library patio.',
    dayOfWeek: 5, // Friday
    startHour: 11,
    startMinute: 0,
    durationMinutes: 45,
    room: 'Patio / Community Room',
  },
];

// Rotating weekly program schedule presets
const SCHEDULE_PRESETS: number[][] = [
  [0, 1, 2, 5],       // Tue Baby, Wed Toddler, Thu Preschool, Sat Family
  [1, 2, 4, 6],       // Mon Movers, Tue Baby, Thu Preschool, Sat Family
  [0, 2, 3, 5],       // Tue Baby, Thu Preschool, Wed Toddler, Sat Family
  [1, 3, 5, 7],       // Mon Movers, Wed Toddler, Sat Family, Thu Baby Sign
  [0, 1, 5, 8],       // Tue Baby, Wed Toddler, Sat Family, Wed STEM
  [2, 4, 5, 6, 9],    // Thu Preschool, Fri Stay & Play, Sat Family, Thu Pajama
  [0, 1, 2, 3, 5, 6], // Flagship full schedule
];

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

  // Selected branches or all branches directly from the IMLS database
  const branches: LibraryBranch[] = branchIds.length > 0
    ? getBranchesByIds(branchIds)
    : loadAllLibraries().slice(0, 10);

  for (const branch of branches) {
    // Generate deterministic schedule variation derived from branch ID hash
    let hash = 0;
    for (let i = 0; i < branch.id.length; i++) {
      hash = (hash << 5) - hash + branch.id.charCodeAt(i);
      hash |= 0;
    }
    const templateIndices = SCHEDULE_PRESETS[Math.abs(hash) % SCHEDULE_PRESETS.length];

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
