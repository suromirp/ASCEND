// ASCEND: "Hoe voelt je lijf?" (docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md). Wanneer de
// kaart op Vandaag komt, welke plekken deze week het hardst werkten, en de rijen van de kaart.
// Puur: geen React, geen IndexedDB. De kaart is een vraag, nooit een wijziging van de planning.
//
// Alle drempels hieronder zijn AFGELEID (uit de onderzoeksnotities en het bestaande model, niet
// gemeten aan echte data) en staan als constanten bovenaan, zodat ze samen met de eigenaar
// bijgesteld kunnen worden zonder de logica te raken.

import type { InjuryKind, InjuryNote, InjurySeverity } from '../models/injury';
import type { TroubleSeverity, WeeklyHealthCheck } from '../models/checkIn';
import type { Stretch } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import type { SessionLog } from '../models/training';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';
import { formatNumberNL } from '../utils/number';
import { isOpenOn, isSoreness } from './injuryKind';
import { FATIGUE_THRESHOLDS, POLES_DESCENT_FACTOR } from './legFatigue';
import { significantPain } from './pain';
import { logSport } from './sports';
import type { BodyCheckMode } from './bodyCheckSettings';
import { careForSpot, spotById, spotForComplaint, spotsForInjury, stretchesForSpot, stretchMinutes, type BodySpot } from './bodyMap';

// ---- de instelling ----------------------------------------------------------------------

export { BODY_CHECK_MODES, DEFAULT_BODY_CHECK, resolveBodyCheck, type BodyCheckMode } from './bodyCheckSettings';

// ---- afgeleide drempels -----------------------------------------------------------------

// Een zware week: de hoogste beenindex van de week is minstens de grens waarboven je volgens de
// bestaande woorden "Wat vermoeid" bent, en ligt minstens een kwart boven de eigen mediaan van de
// vier weken ervoor. Zo komt een gewone, zware opbouwweek niet elke week met een vraag.
export const HEAVY_LEG_INDEX = FATIGUE_THRESHOLDS.hard.fresh;
export const HEAVY_VERSUS_MEDIAN = 1.25;
// Dalen (meters omlaag in 7 dagen) voor niveau 1, 2 en 3. De afdaling uit het onderzoek die
// spierpijn geeft is ongeveer 900 m.
export const DESCENT_LEVELS = [800, 1200, 1800] as const;
// Klimmen (meters omhoog in 7 dagen).
export const CLIMB_LEVELS = [1200, 2000, 3000] as const;
// Rugzak: kilogram maal uren met rugzak in 7 dagen.
export const PACK_LEVELS = [25, 45, 70] as const;
// Hardlopen: kilometers in 7 dagen tegen je gemiddelde van de 4 weken ervoor. Pas vanaf 15 km.
export const RUN_MIN_KM = 15;
export const RUN_RATIO_LEVELS = [1.3, 1.6, 2] as const;
// Een rugzak van minstens zoveel kilo telt mee bij de knieën bij dalen.
export const PACK_ON_KNEES_KG = 5;
// Na een tocht of wedstrijd: spierpijn piekt 48 tot 72 uur na afdalen. De kaart komt de tweede
// ochtend erna en blijft vijf dagen.
export const AFTER_EVENT_FROM_DAYS = 2;
export const AFTER_EVENT_UNTIL_DAYS = 6;
// Een bergtocht telt als tocht vanaf zoveel minuten.
export const TOCHT_MIN_MINUTES = 240;

// ---- plekgroepen en wat het hardst werkte ---------------------------------------------

export type LoadGroupId = 'bovenbenen' | 'knieen' | 'kuiten' | 'schouders';

export interface LoadGroup {
  id: LoadGroupId;
  label: string;
  // De plekken op het figuur die bij de groep horen.
  spotIds: string[];
  // De plek waarop het blad opent (de rechter van een paar).
  openSpotId: string;
}

export const LOAD_GROUPS: LoadGroup[] = [
  { id: 'bovenbenen', label: 'Bovenbenen', spotIds: ['dij-r', 'dij-l'], openSpotId: 'dij-r' },
  { id: 'knieen', label: 'Knieën', spotIds: ['knie-r', 'knie-l'], openSpotId: 'knie-r' },
  { id: 'kuiten', label: 'Kuiten', spotIds: ['kuit-r', 'kuit-l'], openSpotId: 'kuit-r' },
  { id: 'schouders', label: 'Schouders', spotIds: ['schouder-r', 'schouder-l', 'bovenrug'], openSpotId: 'schouder-r' },
];

export interface HotSpot {
  group: LoadGroup;
  level: 1 | 2 | 3;
  // Eén feit uit je logs, in gewone woorden.
  fact: string;
}

export interface WeekLoad {
  descentM: number;
  climbM: number;
  packHours: number;
  // Het gemiddelde gewicht van de rugzak over die uren, in hele kilo's.
  packKg: number;
  runKm: number;
}

function levelOf(value: number, levels: readonly [number, number, number]): 0 | 1 | 2 | 3 {
  if (value >= levels[2]) return 3;
  if (value >= levels[1]) return 2;
  if (value >= levels[0]) return 1;
  return 0;
}

const isRun = (l: SessionLog): boolean => logSport(l) === 'running';

// Wat er in de 7 dagen tot en met `today` is gedaan, uit de logs.
export function weekLoad(logs: SessionLog[], today: string): WeekLoad {
  const since = addDays(today, -6);
  let descentM = 0;
  let climbM = 0;
  let packKgHours = 0;
  let packHours = 0;
  let runKm = 0;
  for (const l of logs) {
    if (l.completedDate < since || l.completedDate > today) continue;
    const o = l.outdoorData;
    if (o) {
      descentM += (o.elevationLossM ?? 0) * (o.poles ? POLES_DESCENT_FACTOR : 1);
      climbM += o.elevationGainM ?? 0;
      if ((o.backpackWeightKg ?? 0) > 0) {
        const h = l.durationMinutes / 60;
        packHours += h;
        packKgHours += h * (o.backpackWeightKg ?? 0);
      }
    }
    if (isRun(l)) runKm += o?.distanceKm ?? l.cardioData?.distanceKm ?? 0;
  }
  return { descentM, climbM, packHours, packKg: packHours > 0 ? Math.round(packKgHours / packHours) : 0, runKm };
}

function weeklyRunKm(logs: SessionLog[], today: string, weeksBack: number): number {
  return weekLoad(logs, addDays(today, -7 * weeksBack)).runKm;
}

const hoursText = (h: number): string => `${formatNumberNL(h, 1)} uur`;
const metersText = (m: number): string => `${formatNumberNL(Math.round(m / 10) * 10, 0)} m`;

// De plekken die deze week het hardst werkten, hoogstens drie, met één feit per plek. Dalen en
// rugzak naar bovenbenen, knieën en schouders; klimmen en een hardloopweek ruim boven je eigen
// gemiddelde naar de kuiten. Een niveau 0 telt niet.
export function weekHotSpots(logs: SessionLog[], today: string): HotSpot[] {
  const load = weekLoad(logs, today);
  const descent = levelOf(load.descentM, DESCENT_LEVELS);
  const climb = levelOf(load.climbM, CLIMB_LEVELS);
  const pack = levelOf(load.packKg * load.packHours, PACK_LEVELS);
  const before = [1, 2, 3, 4].map((w) => weeklyRunKm(logs, today, w));
  const avg = before.reduce((a, b) => a + b, 0) / before.length;
  const ratio = avg > 0 ? load.runKm / avg : load.runKm >= RUN_MIN_KM ? RUN_RATIO_LEVELS[0] : 0;
  const run = load.runKm >= RUN_MIN_KM ? levelOf(ratio, RUN_RATIO_LEVELS) : 0;

  const hot: HotSpot[] = [];
  const add = (id: LoadGroupId, level: 0 | 1 | 2 | 3, fact: string) => {
    if (level === 0) return;
    const group = LOAD_GROUPS.find((g) => g.id === id)!;
    const existing = hot.find((h) => h.group.id === id);
    if (existing) {
      if (level > existing.level) {
        existing.level = level;
        existing.fact = fact;
      }
      return;
    }
    hot.push({ group, level, fact });
  };

  add('bovenbenen', descent, `${metersText(load.descentM)} omlaag`);
  // Op de knieën telt dalen met een rugzak vol door, zonder rugzak een niveau minder.
  const kneeLevel = load.packKg >= PACK_ON_KNEES_KG ? descent : (Math.max(descent - 1, 0) as 0 | 1 | 2 | 3);
  add('knieen', kneeLevel, load.packKg >= PACK_ON_KNEES_KG ? `dalen met ${load.packKg} kg rugzak` : `${metersText(load.descentM)} omlaag`);
  add('kuiten', climb, `${metersText(load.climbM)} omhoog`);
  add('kuiten', run, `${formatNumberNL(load.runKm, 0)} km hardlopen`);
  add('schouders', pack, `${hoursText(load.packHours)} met ${load.packKg} kg`);

  const order = LOAD_GROUPS.map((g) => g.id);
  return hot.sort((a, b) => b.level - a.level || order.indexOf(a.group.id) - order.indexOf(b.group.id)).slice(0, 3);
}

// ---- de redenen ------------------------------------------------------------------------

export type BodyCheckReasonKind = 'pijn' | 'zwaar' | 'tocht' | 'wedstrijd';

export interface BodyCheckReason {
  kind: BodyCheckReasonKind;
  // De ene zin boven het figuur.
  line: string;
}

export interface BodyCheckEvent {
  date: string;
  kind: 'tocht' | 'wedstrijd';
}

// Een tocht (een tochtperiode, of een bergtocht van minstens vier uur) of een wedstrijd (een log
// van de wedstrijdtraining) die voorbij is.
export function bodyCheckEvents(input: { leavePeriods?: LeavePeriod[]; logs: SessionLog[] }): BodyCheckEvent[] {
  const events: BodyCheckEvent[] = [];
  for (const p of input.leavePeriods ?? []) if (p.kind === 'trek') events.push({ date: p.endDate, kind: 'tocht' });
  for (const l of input.logs) {
    if (l.templateId === 'tpl_race') events.push({ date: l.completedDate, kind: 'wedstrijd' });
    else if ((l.type === 'adventure' || l.templateId === 'tpl_mountain_hike') && l.durationMinutes >= TOCHT_MIN_MINUTES) events.push({ date: l.completedDate, kind: 'tocht' });
  }
  return events;
}

// Het mediaan van de weekmaxima van de vier weken voor de huidige.
function heavyWeek(legIndexOn: (date: string) => number, today: string): boolean {
  const maxOf = (end: string): number => Math.max(...Array.from({ length: 7 }, (_, i) => legIndexOn(addDays(end, -i))));
  const now = maxOf(today);
  if (now < HEAVY_LEG_INDEX) return false;
  const prior = [1, 2, 3, 4].map((w) => maxOf(addDays(today, -7 * w))).sort((a, b) => a - b);
  const median = (prior[1] + prior[2]) / 2;
  return now >= median * HEAVY_VERSUS_MEDIAN;
}

// De regel van een zware week: de twee feiten die er het meest toe doen.
export function heavyWeekLine(load: WeekLoad): string {
  const parts: string[] = [];
  if (load.descentM >= DESCENT_LEVELS[0]) parts.push(`${metersText(load.descentM)} omlaag`);
  if (load.packHours > 0 && load.packKg * load.packHours >= PACK_LEVELS[0]) parts.push(`${hoursText(load.packHours)} met ${load.packKg} kg rugzak`);
  if (parts.length < 2 && load.climbM >= CLIMB_LEVELS[0]) parts.push(`${metersText(load.climbM)} omhoog`);
  if (parts.length < 2 && load.runKm >= RUN_MIN_KM) parts.push(`${formatNumberNL(load.runKm, 0)} km hardlopen`);
  return parts.length > 0 ? `Een zware week: ${parts.slice(0, 2).join(', ')}.` : 'Een zware week voor je benen.';
}

export interface BodyCheckInput {
  today: string;
  logs: SessionLog[];
  notes: InjuryNote[];
  // De beenindex op een dag (engine/legFatigue.ts#legFatigueOn), van buiten aangereikt zodat deze
  // module puur blijft en de index maar een keer per dag hoeft te worden uitgerekend.
  legIndexOn: (date: string) => number;
  events: BodyCheckEvent[];
}

// De redenen waarom de kaart nu zou komen, in de volgorde waarin ze tellen: pijn, zware week, tocht,
// wedstrijd. Leeg betekent: geen reden.
export function bodyCheckReasons(input: BodyCheckInput): BodyCheckReason[] {
  const { today, logs, notes, events } = input;
  const reasons: BodyCheckReason[] = [];

  const openPain = notes.filter((n) => isOpenOn(n, today) && !isSoreness(n)).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const since = addDays(today, -6);
  const painLog = logs.some((l) => l.completedDate >= since && l.completedDate <= today && significantPain(l).length > 0);
  if (openPain) reasons.push({ kind: 'pijn', line: `Je meldde pijn aan je ${openPain.bodyPart.toLowerCase()}. Hoe is het nu?` });
  else if (painLog) reasons.push({ kind: 'pijn', line: 'Een training gaf deze week pijn. Hoe voelt het nu?' });

  const hot = weekHotSpots(logs, today);
  if (hot.some((h) => h.level === 3) || heavyWeek(input.legIndexOn, today)) reasons.push({ kind: 'zwaar', line: heavyWeekLine(weekLoad(logs, today)) });

  const after = events
    .filter((e) => daysBetween(e.date, today) >= AFTER_EVENT_FROM_DAYS && daysBetween(e.date, today) <= AFTER_EVENT_UNTIL_DAYS)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (after) {
    reasons.push({
      kind: after.kind,
      line: after.kind === 'tocht' ? 'Je tocht is een paar dagen geleden. Spierpijn komt vaak nu pas.' : 'Je wedstrijd is een paar dagen geleden. Spierpijn komt vaak nu pas.',
    });
  }
  return reasons;
}

// ---- wanneer de kaart komt ----------------------------------------------------------------

// De week waarvoor je antwoord geldt: de week van maandag tot en met maandag. Zo hoort de
// zondag en de maandag erna bij dezelfde week, zoals de weekterugblik (weekReview.ts#reviewWeekFor).
export function checkWeekStart(today: string): string {
  return mondayOfWeek(addDays(today, -1));
}

// Je antwoord op de kaart (Voel me fris of een melding) sluit de week af; "Niet nu" laat hem
// de volgende dag terugkomen.
export function weekHandled(checks: WeeklyHealthCheck[] | undefined, weekStart: string, today: string): boolean {
  const c = checks?.find((x) => x.weekStart === weekStart);
  if (!c) return false;
  if (!c.laterOn) return true;
  return c.laterOn >= today;
}

export interface BodyCheckState {
  show: boolean;
  weekStart: string;
  reasons: BodyCheckReason[];
}

// Eén functie voor Vandaag, het zoekresultaat en de test: de kaart tonen of niet. Uit toont nooit;
// "Alleen als er reden is" toont bij een reden; "Elke week" ook zonder reden op de dag van de
// terugblik. Eén keer per week: een antwoord sluit hem, ook als er daarna een tweede reden komt.
export function bodyCheckState(input: BodyCheckInput & { mode: BodyCheckMode; checks: WeeklyHealthCheck[] | undefined; isReviewDay: boolean }): BodyCheckState {
  const weekStart = checkWeekStart(input.today);
  if (input.mode === 'uit') return { show: false, weekStart, reasons: [] };
  const reasons = bodyCheckReasons(input);
  const wanted = reasons.length > 0 || (input.mode === 'elke-week' && input.isReviewDay);
  return { show: wanted && !weekHandled(input.checks, weekStart, input.today), weekStart, reasons };
}

// ---- de rijen van de kaart -------------------------------------------------------------

export interface CheckRow {
  key: string;
  label: string;
  fact: string;
  level: 1 | 2 | 3;
  // De plek waarop het blad opent, en de plekken die op het kleine figuur oplichten.
  spotId: string;
  spotIds: string[];
  pain: boolean;
}

// Hoogstens drie rijen: eerst de plek van een open pijnmelding, dan wat het hardst werkte.
export function bodyCheckRows(input: { notes: InjuryNote[]; logs: SessionLog[]; today: string; reasons: BodyCheckReason[] }): CheckRow[] {
  const rows: CheckRow[] = [];
  if (input.reasons.some((r) => r.kind === 'pijn')) {
    const open = input.notes.filter((n) => isOpenOn(n, input.today) && !isSoreness(n)).sort((a, b) => (a.date < b.date ? 1 : -1));
    for (const n of open) {
      const spot = spotForComplaint(n);
      if (!spot || rows.some((r) => r.spotIds.includes(spot.id))) continue;
      rows.push({ key: `pijn:${n.id}`, label: n.bodyPart, fact: `${n.severity}, open`, level: n.severity === 'ernstig' ? 3 : n.severity === 'matig' ? 2 : 1, spotId: spot.id, spotIds: spotsForInjury(n).map((s) => s.id), pain: true });
      if (rows.length >= 3) return rows;
    }
  }
  for (const h of weekHotSpots(input.logs, input.today)) {
    if (rows.length >= 3) break;
    if (rows.some((r) => r.spotIds.some((id) => h.group.spotIds.includes(id)))) continue;
    if (!spotById(h.group.openSpotId)) continue;
    rows.push({ key: `groep:${h.group.id}`, label: h.group.label, fact: h.fact, level: h.level, spotId: h.group.openSpotId, spotIds: h.group.spotIds, pain: false });
  }
  return rows;
}

// ---- het blad: wat je merkt -----------------------------------------------------------------

export const KIND_CHOICES: { value: InjuryKind; label: string; line: string }[] = [
  { value: 'spierpijn', label: 'Spierpijn', line: 'Dof en zwaar, vaak aan beide kanten. Hoort bij een zware week.' },
  { value: 'stijf', label: 'Stijf', line: 'Je komt moeilijk op gang en het zakt als je warm bent.' },
  { value: 'pijn', label: 'Pijn', line: 'Op één punt, in een pees, gewricht of bot.' },
];

// De dag waarop de kaart zichzelf aanbiedt bij "Elke week": de dag van de weekterugblik, ook als
// de terugblik zelf uit staat. ISO-weekdag: 1 maandag, 7 zondag.
export function isReviewDay(isoWeekday: number, day: 'both' | 'sunday' | 'monday'): boolean {
  if (day === 'sunday') return isoWeekday === 7;
  if (day === 'monday') return isoWeekday === 1;
  return isoWeekday === 7 || isoWeekday === 1;
}

// ---- het blad: wat kan helpen ---------------------------------------------------------------

export interface BodySuggestion {
  // Eén zin, altijd "kan helpen" en nooit "voorkomt".
  help: string;
  // Waar die zin op rust, met de sterkte van het bewijs (docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md).
  source?: string;
  // De eerste twee rekoefeningen van de plek, met de minuten van die twee.
  stretches: Stretch[];
  minutes: number;
  // Alleen bij pijn: wanneer naar een fysio of je huisarts, met de rode vlag van de plek apart.
  fysio: string[];
  direct?: string;
  // Bij ernstige pijn staat de fysioregel meteen open.
  openFysio: boolean;
}

const HELP_SORENESS = 'Spierpijn na veel dalen hoort erbij en gaat meestal binnen een week over. Rustig bewegen kan helpen, ook al is dat effect tijdelijk.';
const HELP_STIFF = 'Stijfheid zakt vaak als je warm bent. Rustig bewegen en de rekoefeningen hieronder kunnen helpen.';
const SOURCE_SORENESS = 'Munich consensus 2013 en Cheung e.a. 2003, bewijs: expertopinie en narratieve review.';

export function suggestionFor(spot: BodySpot, kind: InjuryKind, severity?: InjurySeverity): BodySuggestion {
  const stretches = stretchesForSpot(spot).slice(0, 2);
  const minutes = stretchMinutes(stretches);
  if (kind === 'pijn') {
    const care = careForSpot(spot);
    return { help: care.bijLast[0], stretches, minutes, fysio: care.fysioAll, direct: care.direct, openFysio: severity === 'ernstig' };
  }
  return { help: kind === 'stijf' ? HELP_STIFF : HELP_SORENESS, source: SOURCE_SORENESS, stretches, minutes, fysio: [], openFysio: false };
}

// ---- de markering van de week ---------------------------------------------------------------

// De week afhandelen na een antwoord. weeklyHealthChecks blijft alleen een markering, plus de
// plek en de ernst van een melding voor de coachregel van de weekterugblik (engine/weekReview.ts):
// - Voel me fris: { trouble: 'geen' }.
// - Een melding van spierpijn of stijf: ook 'geen', want het blokkeert niets.
// - Een pijnmelding: 'wel_gewoon' met de plek en de ernst; een tweede melding houdt de zwaarste.
// - Niet nu: { trouble: 'geen', laterOn } zolang de week nog niet beantwoord is.
const SEVERITY_RANK: Record<TroubleSeverity, number> = { mild: 1, matig: 2, ernstig: 3 };
const TROUBLE_SEVERITY: Record<InjurySeverity, TroubleSeverity> = { licht: 'mild', matig: 'matig', ernstig: 'ernstig' };

export type WeekAnswer =
  | { kind: 'fris' }
  | { kind: 'later'; today: string }
  | { kind: 'melding'; soreness: boolean; area: string; severity: InjurySeverity };

export function answerWeek(checks: WeeklyHealthCheck[] | undefined, weekStart: string, answer: WeekAnswer): WeeklyHealthCheck[] {
  const others = (checks ?? []).filter((c) => c.weekStart !== weekStart);
  const existing = (checks ?? []).find((c) => c.weekStart === weekStart);
  const answered = existing && !existing.laterOn ? existing : undefined;
  let next: WeeklyHealthCheck;
  if (answer.kind === 'later') {
    if (answered) return checks ?? [];
    next = { weekStart, trouble: 'geen', laterOn: answer.today };
  } else if (answer.kind === 'fris' || answer.soreness) {
    next = answered ?? { weekStart, trouble: 'geen' };
  } else {
    const severity = TROUBLE_SEVERITY[answer.severity];
    const keep = answered?.severity !== undefined && SEVERITY_RANK[answered.severity] >= SEVERITY_RANK[severity];
    next = keep && answered ? answered : { weekStart, trouble: 'wel_gewoon', area: answer.area, severity };
  }
  return [...others, next].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).slice(-26);
}

// De ene regel in het blad van de weekterugblik: wat je die week antwoordde op de kaart "Hoe voelt
// je lijf?" (of, in oudere weken, op de vraag naar klachten). Alleen lezen.
const SEVERITY_WORD: Record<TroubleSeverity, string> = { mild: 'licht', matig: 'matig', ernstig: 'ernstig' };

export function weeklyCheckLine(check: WeeklyHealthCheck): string {
  if (check.trouble === 'geen') return 'Lijf: geen klachten.';
  const where = check.area ? ` aan je ${check.area.toLowerCase()}` : '';
  const detail = [check.severity ? SEVERITY_WORD[check.severity] : '', check.trouble === 'minder' ? 'minder getraind' : check.trouble === 'niet_kunnen' ? 'kon niet trainen' : ''].filter(Boolean).join(', ');
  return `Lijf: pijn${where}${detail ? ` (${detail})` : ''}.`;
}
