import type { Program, ResolvedProgramPosition } from '../models/program';

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

// Monday-start ISO weekday: Monday = 1 ... Sunday = 7
export function isoWeekday(iso: string): number {
  const jsDay = parseISODate(iso).getDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

export function mondayOfWeek(iso: string): string {
  const weekday = isoWeekday(iso);
  return addDays(iso, -(weekday - 1));
}

export function weekDates(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayIso, i));
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = parseISODate(fromIso).getTime();
  const b = parseISODate(toIso).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

const DUTCH_WEEKDAYS_SHORT = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
const DUTCH_MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

export function weekdayShortNL(iso: string): string {
  return DUTCH_WEEKDAYS_SHORT[isoWeekday(iso) - 1];
}

export function formatDateNL(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${DUTCH_MONTHS[d.getMonth()]}`;
}

export function formatMonthNL(iso: string): string {
  const d = parseISODate(iso);
  return `${DUTCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// The first and last calendar date of the month containing `anchor`.
export function monthBounds(anchor: string): { start: string; end: string } {
  const d = parseISODate(anchor);
  const start = toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { start, end };
}

// Moves `anchor` `delta` whole calendar months, landing on the 1st — used
// to page a month view back/forward regardless of which day of the month
// `anchor` started on.
export function shiftMonthAnchor(anchor: string, delta: number): string {
  const d = parseISODate(anchor);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

// Resolves which phase / week-in-phase / week-in-program a given date falls
// on, purely from Program.startDate + each Phase's weekCount. Weeks are
// never persisted (see models/program.ts) — this is the single source of
// truth for "where are we in the program".
export function resolveProgramWeek(program: Program, dateIso: string): ResolvedProgramPosition | null {
  const startMonday = mondayOfWeek(program.startDate);
  const targetMonday = mondayOfWeek(dateIso);
  const weekDiff = Math.floor(daysBetween(startMonday, targetMonday) / 7);
  const totalWeeksInProgram = program.phases.reduce((sum, p) => sum + p.weekCount, 0);

  if (weekDiff < 0 || weekDiff >= totalWeeksInProgram) return null;

  let remaining = weekDiff;
  for (let i = 0; i < program.phases.length; i++) {
    const phase = program.phases[i];
    if (remaining < phase.weekCount) {
      return {
        phase,
        phaseIndex: i,
        weekInPhase: remaining + 1,
        weekInProgram: weekDiff + 1,
        totalWeeksInProgram,
      };
    }
    remaining -= phase.weekCount;
  }
  return null;
}
