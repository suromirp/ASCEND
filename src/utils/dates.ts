import { PHASE_TAPER, WAVE_LENGTH, type HeldWeekDays, type Program, type ResolvedProgramPosition } from '../models/program';
import type { Weekday } from '../models/goalEngineConfig';

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

const WEEKDAY_ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// The single source of truth for "which TrainingAvailability.Weekday does
// this date fall on" — previously duplicated as a local WEEKDAY_ORDER
// const inside engine/adaptiveReplanner.ts; extracted here so a second,
// independently-drifting copy never has to exist (engine/scheduler.ts's
// dayHasRoomFor needs the exact same mapping).
export function weekdayOf(iso: string): Weekday {
  return WEEKDAY_ORDER[isoWeekday(iso) - 1];
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

const DUTCH_WEEKDAYS_LONG = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

export function weekdayLongNL(iso: string): string {
  return DUTCH_WEEKDAYS_LONG[isoWeekday(iso) - 1];
}

// "3 oktober"; a date in another year than today gets its year
// ("11 april 2027"), so a goal date never reads as this year's.
export function formatDateNL(iso: string): string {
  const d = parseISODate(iso);
  const sameYear = d.getFullYear() === parseISODate(todayISO()).getFullYear();
  return `${d.getDate()} ${DUTCH_MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

// Kort, met de dag ervoor: "ma 8 feb", en het jaartal alleen als het niet dit
// jaar is ("ma 8 feb 2027"), dezelfde regel als formatDateNL.
const SHORT_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export function formatShortDayNL(iso: string): string {
  const d = parseISODate(iso);
  const sameYear = d.getFullYear() === parseISODate(todayISO()).getFullYear();
  return `${weekdayShortNL(iso).toLowerCase()} ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
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

// "Deze week nog een keer" (engine/repeatWeek.ts): a repeated week carries
// the load of the week before it. It can only sit in week 2 or 3 of a wave
// (week 1 follows a rest week, week 4 is the rest week) and never in the
// taper. The weeks after it in the same wave run one step behind, up to the
// rest week: the wave loses its heaviest step and nothing else, so the rest
// week and every later wave are back on the calendar and the goal date
// does not move. One repeat counts per wave.
function repeatShift(repeated: string[] | undefined, monday: string, weekInPhase: number, phaseId: string): { shift: 0 | 1; repeated: boolean } {
  const none = { shift: 0 as const, repeated: false };
  if (!repeated?.length || phaseId === PHASE_TAPER) return none;
  const wave = ((weekInPhase - 1) % WAVE_LENGTH) + 1;
  if (wave < 2 || wave > WAVE_LENGTH - 1) return none;
  for (let k = 2; k <= wave; k++) {
    if (repeated.includes(addDays(monday, -7 * (wave - k)))) return { shift: 1, repeated: k === wave && repeated.includes(monday) };
  }
  return none;
}

function heldOn(program: Program, monday: string, dateIso: string): HeldWeekDays | undefined {
  let found: HeldWeekDays | undefined;
  for (const h of program.heldWeekDays ?? []) {
    if (h.week === monday && dateIso < h.until && (!found || h.until < found.until)) found = h;
  }
  return found;
}

function toggled(list: string[] | undefined, monday: string, on: boolean): string[] {
  const others = (list ?? []).filter((w) => w !== monday);
  return on ? [...others, monday] : others;
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
      // A change in the middle of this week: the days before it keep how the
      // week stood then (Program.heldWeekDays).
      const held = heldOn(program, targetMonday, dateIso);
      const repeatedList = held ? toggled(program.repeatedWeeks, targetMonday, !!held.repeated) : program.repeatedWeeks;
      const restSkipped = held ? !!held.restSkipped : !!program.skippedRestWeeks?.includes(targetMonday);
      const repeat = repeatShift(repeatedList, targetMonday, remaining + 1, phase.id);
      return {
        phase,
        phaseIndex: i,
        weekInPhase: remaining + 1,
        weekInProgram: weekDiff + 1,
        totalWeeksInProgram,
        ...(restSkipped ? { restSkipped: true as const } : {}),
        ...(repeat.shift ? { loadShift: 1 as const } : {}),
        ...(repeat.repeated ? { repeated: true as const } : {}),
      };
    }
    remaining -= phase.weekCount;
  }
  return null;
}

// "6 uur 25 min", "45 min", "0 min".
export function formatHoursMinutesNL(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  if (h === 0) return `${m} min`;
  return m % 60 === 0 ? `${h} uur` : `${h} uur ${m % 60} min`;
}
