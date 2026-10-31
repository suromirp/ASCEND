// ASCEND: het weekbudget zonder doel (docs/visie/Zonder doel.md, 2.4 en 3.3). Hoeveel
// minuten en hoeveel keer kracht een week vraagt, en hoeveel je deze week al deed.
// Alles wordt uit de logs en de richting gerekend en nooit opgeslagen. Puur: geen React,
// geen IndexedDB.
//
// Wat telt. Een matige minuut telt 1, een pittige telt 2 (de beweegrichtlijn). Pittig komt
// uit de hartslag als die er is (zone 4 en hoger), anders uit hoe zwaar jij de training vond
// (RPE 7 of hoger), anders uit hoe zwaar ze bedoeld was. Kracht telt niet in de minuten maar
// als aparte teller: een krachttraining is één keer. Herstel en rekken tellen nergens.

import { ADVICE_DIRECTION, DIRECTIONS, GUIDELINE_MINUTES, GUIDELINE_STRENGTH, MINUTES_CEILING, type DirectionId } from '../data/directions';
import type { SessionLog } from '../models/training';
import { logDay, type PlannedById } from './logDay';
import { addDays } from '../utils/dates';
import { parseDirection, startMinutes } from './direction';
import type { HeartRateSettings } from './heartRateZones';
import { minutesByZone } from './intensityMinutes';
import { waveMinutes, type WaveWeek } from './waves';

export const HARD_RPE = 7;

// Wat je zelf aan het weekbudget veranderde (AppSettings.weekBudget). Leeg is het advies.
export interface WeekBudgetChoice {
  minutes?: number;
  strength?: number;
  // Pittige minuten tellen dubbel (de standaard).
  doubleHard: boolean;
}

const MIN_CHOICE_MINUTES = 30;
const MAX_CHOICE_MINUTES = MINUTES_CEILING;
const MAX_CHOICE_STRENGTH = 4;

// Defensief lezen: een onbekende of onzinnige waarde valt terug op het advies.
export function resolveWeekBudget(raw: unknown): WeekBudgetChoice {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const minutes = typeof r.minutes === 'number' && Number.isFinite(r.minutes) ? Math.round(r.minutes) : undefined;
  const strength = typeof r.strength === 'number' && Number.isInteger(r.strength) ? r.strength : undefined;
  return {
    ...(minutes !== undefined && minutes >= MIN_CHOICE_MINUTES && minutes <= MAX_CHOICE_MINUTES ? { minutes } : {}),
    ...(strength !== undefined && strength >= 1 && strength <= MAX_CHOICE_STRENGTH ? { strength } : {}),
    doubleHard: r.doubleHard !== false,
  };
}

export interface CountOptions {
  hr?: HeartRateSettings;
  // Pittige minuten tellen dubbel.
  doubleHard: boolean;
  // Hoe zwaar de training bedoeld was (1 tot 10), voor een log zonder hartslag en zonder RPE.
  intendedRpe?: (log: SessionLog) => number | undefined;
  // Met de geplande sessies telt een log op de dag van zijn geplande training (engine/logDay.ts), zoals op Week.
  plannedById?: PlannedById;
}

const dayOfLog = (log: SessionLog, plannedById?: PlannedById): string => (plannedById ? logDay(log, plannedById) : log.completedDate);

export interface CountedDetail {
  // De duur zoals gelogd.
  duration: number;
  // Wat ervan telt voor het weekbudget.
  counted: number;
  // De minuten die pittig waren.
  hard: number;
}

const NONE: CountedDetail = { duration: 0, counted: 0, hard: 0 };

// Wat een training telt in de minuten. Kracht en herstel tellen hier niet.
export function countedDetail(log: SessionLog, opts: CountOptions): CountedDetail {
  if (log.type === 'strength' || log.type === 'recovery') return NONE;
  const duration = Math.max(0, log.durationMinutes || 0);
  if (duration === 0) return NONE;
  const weight = opts.doubleHard ? 2 : 1;
  const zones = minutesByZone(log, opts.hr);
  if (zones) {
    return { duration, counted: zones.easy + zones.middle + zones.hard * weight, hard: zones.hard };
  }
  const rpe = typeof log.rpe === 'number' ? log.rpe : opts.intendedRpe?.(log);
  const hard = typeof rpe === 'number' && rpe >= HARD_RPE;
  return { duration, counted: hard ? duration * weight : duration, hard: hard ? duration : 0 };
}

// Telt een krachttraining als één keer? Een minimale variant (alleen de kern) niet.
function countsAsStrength(log: SessionLog): boolean {
  return log.type === 'strength' && log.variant !== 'minimum';
}

export function strengthCount(logs: readonly SessionLog[], weekStart: string, plannedById?: PlannedById): number {
  const end = addDays(weekStart, 7);
  return logs.filter((l) => dayOfLog(l, plannedById) >= weekStart && dayOfLog(l, plannedById) < end && countsAsStrength(l)).length;
}

export interface WeekItem {
  log: SessionLog;
  kind: 'minutes' | 'strength';
  detail: CountedDetail;
}

// De trainingen van een week die tellen, op datum.
function weekItems(logs: readonly SessionLog[], weekStart: string, opts: CountOptions): WeekItem[] {
  const end = addDays(weekStart, 7);
  return logs
    .filter((l) => dayOfLog(l, opts.plannedById) >= weekStart && dayOfLog(l, opts.plannedById) < end)
    .sort((a, b) => dayOfLog(a, opts.plannedById).localeCompare(dayOfLog(b, opts.plannedById)) || a.completedAt.localeCompare(b.completedAt))
    .flatMap((log): WeekItem[] => {
      if (countsAsStrength(log)) return [{ log, kind: 'strength', detail: NONE }];
      const detail = countedDetail(log, opts);
      return detail.counted > 0 ? [{ log, kind: 'minutes', detail }] : [];
    });
}

export function countedMinutesOfWeek(logs: readonly SessionLog[], weekStart: string, opts: CountOptions): number {
  return weekItems(logs, weekStart, opts).reduce((sum, i) => sum + i.detail.counted, 0);
}

// Het gemiddelde van de `weeks` weken voor `beforeMonday`; niets als je in die weken niets deed.
export function recentAverage(logs: readonly SessionLog[], beforeMonday: string, opts: CountOptions, weeks = 4): number | undefined {
  let total = 0;
  for (let w = 1; w <= weeks; w++) total += countedMinutesOfWeek(logs, addDays(beforeMonday, -7 * w), opts);
  return total > 0 ? total / weeks : undefined;
}

export interface WeekBudget {
  minutes: number;
  strength: number;
  // De lichte week van een golf.
  light: boolean;
}

export interface BudgetContext {
  choice?: WeekBudgetChoice;
  // Het gemiddelde van de vier weken voor de golf (voor Fitter worden).
  history?: number;
  wave?: Pick<WaveWeek, 'week' | 'light'>;
}

// Het budget van een week voor een richting. Eigen waarden (`choice`) vervangen het advies als
// basis; een golf legt daar de opbouw en de lichte week overheen.
export function budgetFor(id: DirectionId, ctx: BudgetContext = {}): WeekBudget {
  const spec = DIRECTIONS[id];
  const base = ctx.choice?.minutes ?? startMinutes(id, ctx.history);
  const strength = ctx.choice?.strength ?? spec.strength.value;
  const shape = spec.wave.value;
  if (shape && ctx.wave) {
    return { minutes: Math.min(MINUTES_CEILING, waveMinutes(base, shape, ctx.wave.week)), strength, light: ctx.wave.light };
  }
  return { minutes: base, strength, light: false };
}

// Onder de richtlijn is een keuze, geen fout: de kaart zegt het rustig.
export function belowGuideline(budget: Pick<WeekBudget, 'minutes' | 'strength'>): boolean {
  return budget.minutes < GUIDELINE_MINUTES || budget.strength < GUIDELINE_STRENGTH;
}

export interface WeekProgress {
  minutes: number;
  target: number;
  strengthDone: number;
  strengthTarget: number;
  // Een deel van 0 tot 1 voor de ring.
  fraction: number;
  remaining: number;
  items: WeekItem[];
}

export function weekProgress(logs: readonly SessionLog[], weekStart: string, budget: Pick<WeekBudget, 'minutes' | 'strength'>, opts: CountOptions): WeekProgress {
  const items = weekItems(logs, weekStart, opts);
  const minutes = Math.round(items.reduce((sum, i) => sum + i.detail.counted, 0));
  const target = budget.minutes;
  return {
    minutes,
    target,
    strengthDone: items.filter((i) => i.kind === 'strength').length,
    strengthTarget: budget.strength,
    fraction: target > 0 ? Math.min(1, minutes / target) : 0,
    remaining: Math.max(0, target - minutes),
    items,
  };
}

// Wat er deze week nog gepland staat en meetelt, in tel-minuten: vanaf vandaag, niet gelogd, niet
// overgeslagen, alleen duur (kracht en herstel tellen niet). `minutesOf` is de lengte zoals de
// planning hem geeft (de factor van je richting, de sessiepiek); pittig telt dubbel als dat aan staat.
export function plannedRestOfWeek(
  sessions: readonly { id: string; templateId: string; scheduledDate: string; status: string }[],
  templates: ReadonlyMap<string, { type: string; intendedRpe?: number }>,
  minutesOf: (session: { id: string; templateId: string; scheduledDate: string }) => number,
  today: string,
  weekStart: string,
  loggedIds: ReadonlySet<string>,
  doubleHard: boolean,
): number {
  const end = addDays(weekStart, 6);
  let total = 0;
  for (const s of sessions) {
    if (s.scheduledDate < today || s.scheduledDate > end || s.status === 'skipped' || loggedIds.has(s.id)) continue;
    const t = templates.get(s.templateId);
    if (!t || t.type === 'strength' || t.type === 'recovery') continue;
    const hard = doubleHard && (t.intendedRpe ?? 0) >= HARD_RPE;
    total += Math.max(0, minutesOf(s)) * (hard ? 2 : 1);
  }
  return Math.round(total);
}

// Het budget zoals de instelling het toont: de richting die je koos (of het advies) met je eigen
// waarden erover, zonder golf en zonder geschiedenis. Voor de rij in Instellingen en haar blad.
export function settingBudget(s: { direction?: unknown; weekBudget?: unknown }): { id: DirectionId; chosen: boolean; budget: WeekBudget; choice: WeekBudgetChoice } {
  const chosen = parseDirection(s.direction);
  const id = chosen ?? ADVICE_DIRECTION;
  const choice = resolveWeekBudget(s.weekBudget);
  return { id, chosen: chosen !== undefined, budget: budgetFor(id, { choice }), choice };
}

export const budgetText = (b: Pick<WeekBudget, 'minutes' | 'strength'>): string => `${b.minutes} min, ${b.strength}\u00d7 kracht`;
