// ASCEND: bergschoenen inlopen (taak "schoenen" in de Reisplanner).
// Nieuwe bergschoenen moeten voor vertrek ingelopen zijn: minstens 6 weken en
// 100 km (het doel is instelbaar). ASCEND telt vanaf de datum die je vastlegt de
// kilometers en de stijging van wandelingen en tochten in het logboek. Hardlopen
// en kracht tellen niet mee; de kilometers van hardloopschoenen blijven bij Garmin.
//
// Alles wordt afgeleid uit het logboek en de vastgelegde datum; er wordt niets
// "voltooid" opgeslagen en het logboek wordt nooit aangepast.
//
// Puur: geen React, geen IndexedDB.

import type { SessionLog, SessionTemplate } from '../models/training';
import { daysBetween } from '../utils/dates';
import { isIndoorLog, isWalkOrTripLog, templateSport } from './sports';

export interface BootsState {
  // De eerste dag dat je de nieuwe bergschoenen draagt (ISO-datum).
  since: string;
  // Een eigen naam; zonder naam heten ze "Bergschoenen".
  name?: string;
}

export const DEFAULT_BREAKIN_KM = 100;
export const DEFAULT_BOOTS_NAME = 'Bergschoenen';
// Minstens zoveel weken voor vertrek moeten de schoenen in gebruik zijn.
export const MIN_BREAKIN_WEEKS = 6;
export const BREAKIN_KM_OPTIONS = [50, 75, 100, 150] as const;

export interface BreakInTotals {
  km: number;
  gainM: number;
  count: number;
}

// Telt een log mee: een wandeling of tocht (geen hardlopen, kracht of fietsen; de regel
// staat in engine/sports.ts#isWalkOrTripLog),
// buiten (een loopband geeft geen echte kilometers op de schoen).
function isWalkOrTrip(log: SessionLog): boolean {
  if (log.type === 'strength' || log.type === 'recovery') return false;
  if (isIndoorLog(log)) return false;
  return isWalkOrTripLog(log);
}

function logsFrom(logs: SessionLog[], since: string): SessionLog[] {
  return logs.filter((l) => l.completedDate >= since && isWalkOrTrip(l)).sort((a, b) => a.completedDate.localeCompare(b.completedDate) || a.completedAt.localeCompare(b.completedAt));
}

const kmOf = (l: SessionLog) => l.outdoorData?.distanceKm ?? l.cardioData?.distanceKm ?? 0;
const gainOf = (l: SessionLog) => l.outdoorData?.elevationGainM ?? l.cardioData?.elevationGainM ?? 0;

export function breakInTotals(logs: SessionLog[], since: string): BreakInTotals {
  let km = 0;
  let gainM = 0;
  let count = 0;
  for (const l of logsFrom(logs, since)) {
    const k = kmOf(l);
    if (k <= 0) continue;
    km += k;
    gainM += gainOf(l);
    count++;
  }
  return { km, gainM, count };
}

export type BootBreakInKind = 'none' | 'busy' | 'done' | 'late';

export interface BootBreakInStatus {
  kind: BootBreakInKind;
  km: number;
  gainM: number;
  goalKm: number;
  name: string;
  // Weken tussen de datum van de schoenen en vertrek; weg zonder datum of vertrek.
  weeksBeforeDeparture?: number;
  // De dag dat het doel gehaald werd.
  reachedOn?: string;
  // De hoofdregel en een regel met de getallen, in gewoon Nederlands.
  line: string;
  detail?: string;
}

const nl = (n: number) => String(Math.round(n));
const weeksWord = (w: number) => (w === 1 ? '1 week' : `${w} weken`);
const LATE = `Te laat voor ${MIN_BREAKIN_WEEKS} weken: loop ze zo veel mogelijk in`;

export function bootBreakInStatus(input: {
  boots: BootsState | undefined;
  logs: SessionLog[];
  goalKm: number;
  today: string;
  departure: string | undefined;
}): BootBreakInStatus {
  const { boots, logs, today, departure } = input;
  const goalKm = input.goalKm > 0 ? input.goalKm : DEFAULT_BREAKIN_KM;
  const name = boots?.name?.trim() || DEFAULT_BOOTS_NAME;

  if (!boots) {
    const left = departure ? Math.floor(daysBetween(today, departure) / 7) : undefined;
    const late = left !== undefined && left < MIN_BREAKIN_WEEKS;
    return {
      kind: 'none', km: 0, gainM: 0, goalKm, name,
      line: late ? LATE : 'Leg de datum vast waarop je je nieuwe bergschoenen voor het eerst draagt, dan telt ASCEND de kilometers mee.',
    };
  }

  const { km, gainM } = breakInTotals(logs, boots.since);
  const weeks = departure ? Math.floor(daysBetween(boots.since, departure) / 7) : undefined;
  const enoughTime = weeks === undefined || weeks >= MIN_BREAKIN_WEEKS;
  const reached = km >= goalKm;

  let reachedOn: string | undefined;
  if (reached) {
    let sum = 0;
    for (const l of logsFrom(logs, boots.since)) {
      sum += kmOf(l);
      if (sum >= goalKm) { reachedOn = l.completedDate; break; }
    }
  }

  const progress = `${nl(km)} van ${nl(goalKm)} km`;
  const before = weeks !== undefined ? `, ${weeksWord(Math.max(0, weeks))} voor vertrek` : '';
  const base = { km, gainM, goalKm, name, weeksBeforeDeparture: weeks, reachedOn };
  if (!enoughTime) return { ...base, kind: 'late', line: LATE, detail: `${progress} ingelopen${before}` };
  if (reached) return { ...base, kind: 'done', line: `Ingelopen: ${progress}`, detail: `${progress}${before}` };
  return { ...base, kind: 'busy', line: `${progress} ingelopen`, detail: weeks !== undefined ? `Je draagt ze ${weeksWord(Math.max(0, weeks))} voor vertrek` : undefined };
}

// Een lange wandeling of bergtocht met rugzak: een tocht (avontuur), of een
// wandeling met een rugzakdoel. Hardlopen valt hier nooit onder.
export function isLongHikeTemplate(t: Pick<SessionTemplate, 'type' | 'sport' | 'outdoorTarget'>): boolean {
  if (t.type === 'strength' || t.type === 'recovery') return false;
  if (t.type === 'adventure') return true;
  return templateSport(t as SessionTemplate) === 'hiking' && (t.outdoorTarget?.backpackWeightKg ?? 0) > 0;
}

// De korte regel bij zo'n training, zolang het doel niet gehaald is. Alleen een
// regel: er verandert niets aan de planning. Zonder vastgelegde datum zwijgt hij.
export function bootReminderLine(
  template: Pick<SessionTemplate, 'type' | 'sport' | 'outdoorTarget'>,
  status: BootBreakInStatus | undefined,
  enabled: boolean,
): string | undefined {
  if (!enabled || !status || status.kind === 'none' || status.kind === 'done') return undefined;
  if (status.km >= status.goalKm) return undefined;
  if (!isLongHikeTemplate(template)) return undefined;
  return `Loop je nieuwe bergschoenen in: ${nl(status.km)} van ${nl(status.goalKm)} km.`;
}

// --- lezen wat is opgeslagen ---------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Een back-up kan oud of met de hand aangepast zijn: alleen een echte datum telt.
export function normalizeBoots(raw: unknown): BootsState | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.since !== 'string' || !ISO_DATE.test(r.since)) return undefined;
  const name = typeof r.name === 'string' ? r.name.trim().slice(0, 40) : '';
  return { since: r.since, ...(name ? { name } : {}) };
}

export function bootGoalKm(setting: number | undefined): number {
  return typeof setting === 'number' && Number.isFinite(setting) && setting > 0 ? setting : DEFAULT_BREAKIN_KM;
}
