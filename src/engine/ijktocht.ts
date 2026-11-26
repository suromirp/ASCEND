// ASCEND: de vaste ijktocht (docs/beslissingen/2026-11-26-ijktocht.md, onderzoek docs/onderzoek/Kansen 11 november
// training.md punt 3, kans docs/visie/Kansen 11 november app.md).
//
// Om de zes (of acht) weken dezelfde route of hetzelfde trappenhuis, met dezelfde rugzak, op een rustig tempo.
// Geen gevalideerde test, wel een eerlijk kompas: met alles hetzelfde zeggen drie regels iets over je vorm voor de
// berg. Je klimtempo in meter per uur, hoeveel je hartslag in het laatste deel oploopt tegen het eerste (wat
// Maunder e.a. 2021 durability noemen) en hoe je benen de ochtend erna zijn.
// - IJKTOCHT: met een bergdoel of een bergtocht, en zes of acht weken na de vorige ijktocht (of nog nooit, met minstens
//   één log), één regel en een voorstel met Akkoord voor de ijktocht op een vrije dag. Nooit stil.
// - De uitkomst is alleen lezen (calibrationView): de rij IJktocht in Je stand, Belasting.
// Puur: geen React, geen opslag.

import type { Advice } from './adviceShared';
import type { MorningCheckIn, LegFeeling } from '../models/checkIn';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { TrainingGoal } from '../models/goals';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { DailyTimeBudget, TrainingStrategyProfile, Weekday } from '../models/goalEngineConfig';
import { addDays, daysBetween, formatWeekdayDateNL, isoWeekday, mondayOfWeek, weekDates, weekdayOf } from '../utils/dates';
import { makeId } from '../utils/id';
import { formatNumberNL } from '../utils/number';
import { dayRules, mayPropose } from './dayRules';
import { descentClockContext, type DescentTrip } from './descentClock';
import type { Ladder } from './mainGoal';
import { climbsOf, isUnavailable, NOISE } from './runMetrics';
import { dayHasRoomFor, isHardRun, isLegHeavyTemplate } from './scheduler';
import { hasRole, isTestOrRace } from './templateRoles';

export const CALIBRATION_TEMPLATE_ID = 'tpl_ijktocht';
export const CALIBRATION_RULE = 'IJKTOCHT';
// Zo ver vooruit zoekt de ijktocht een vrije dag: twee weken, want het moment is niet krap.
const LOOK_AHEAD_DAYS = 14;
// De twee weken voor een bergdoel of tocht: geen meting meer, dan telt de afbouw (en de afdaalklok).
export const TRIP_CLEAR_DAYS = 14;
// Een test vraagt frisse benen: de drie dagen ervoor geen ijktocht (zoals de afdaalklok).
const TEST_CLEAR_DAYS = 3;
// Een wedstrijd: de week ervoor niets erbij.
const RACE_CLEAR_DAYS = 7;
// Na Liever niet of Begrepen blijft de ijktocht zo lang stil, geteld vanaf de dag van je antwoord.
export const DECLINE_QUIET_DAYS = 14;
// Hartslag: een verschil in oplopen van minder dan zoveel slagen is ruis (eigen grens, zie het besluit).
export const HEART_NOISE_BPM = 3;
// Vanaf deze dekking telt de hartslag mee (dezelfde grens als driftOf in engine/runMetrics.ts).
const HEART_COVERAGE_PCT = 80;
// Wanneer twee ijktochten niet meer dezelfde zijn (zie het besluit): rugzak, afstand, stijging, temperatuur.
const PACK_DIFF_KG = 1;
const ROUTE_DIFF_PCT = 10;
const GAIN_DIFF_PCT = 15;
const TEMP_DIFF_C = 8;

// De instelling IJktocht. 'zes': om de zes weken (het advies), 'acht': om de acht weken, 'uit'. Alles wat geen geldige
// keuze is (een oude back-up zonder het veld, een beschadigde waarde) leest als het advies.
export type CalibrationHikeMode = 'zes' | 'acht' | 'uit';
export function resolveCalibrationHike(value: unknown): CalibrationHikeMode {
  return value === 'acht' || value === 'uit' ? value : 'zes';
}
export const calibrationIntervalDays = (mode: CalibrationHikeMode): number => (mode === 'acht' ? 56 : 42);

export interface CalibrationContext {
  intervalDays: number;
  // De bergdoelen en bergtochten die nog komen, de vroegste eerst (dezelfde lijst als de afdaalklok).
  trips: DescentTrip[];
}

// Staat de ijktocht aan, en hoe vaak. Alleen met een bergdoel of een bergtocht: zonder berg is er niets om naar te
// meten. Dezelfde vraag als de afdaalklok bij het advies (engine/descentClock.ts#descentClockContext).
export function calibrationContext(mode: unknown, goals: readonly TrainingGoal[], milestones: Ladder, leave: readonly LeavePeriod[] | undefined, today: string): CalibrationContext | undefined {
  const resolved = resolveCalibrationHike(mode);
  if (resolved === 'uit') return undefined;
  const mountain = descentClockContext('advies', goals, milestones, leave, today);
  if (!mountain) return undefined;
  return { intervalDays: calibrationIntervalDays(resolved), trips: mountain.trips };
}

const isCalibrationLog = (l: SessionLog) => l.templateId === CALIBRATION_TEMPLATE_ID && !!l.completedDate;

// De ijktochten in je logs tot en met `today`, de oudste eerst.
export function calibrationLogs(logs: readonly SessionLog[], today?: string): SessionLog[] {
  return logs.filter((l) => isCalibrationLog(l) && (!today || l.completedDate <= today))
    .sort((a, b) => a.completedDate.localeCompare(b.completedDate) || (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));
}

export interface CalibrationAdviceInput {
  today: string;
  logs: readonly SessionLog[];
  plannedSessions: readonly PlannedSession[];
  templates: readonly SessionTemplate[];
  context: CalibrationContext | undefined;
  respondedIds: ReadonlySet<string>;
  answeredOn?: Readonly<Record<string, string>>;
  leave?: LeavePeriod[];
  illnessEpisodes?: IllnessEpisode[];
  // Je vaste rustdag, 1 (maandag) tot 7 (zondag): daar komt niets.
  restDay?: number;
  // Dagen waar een ander voorstel van vandaag iets neerzet (ook de afdaalklok): de ijktocht komt daar niet op of naast.
  taken?: ReadonlySet<string>;
  program?: Program | null;
  dailyTimeBudget?: Partial<Record<Weekday, DailyTimeBudget>>;
  sameDayPairingPreference?: TrainingStrategyProfile['sameDayPairingPreference'];
}

// Lang of zwaar: de lange training van de week, een zware beendag, een harde loop, een test of wedstrijd.
const demanding = (t: SessionTemplate) => hasRole(t, 'long') || isLegHeavyTemplate(t) || isHardRun(t) || isTestOrRace(t) || (t.type === 'hiking' && t.durationVariants.full >= 90);

// De eerste vrije dag van `from` tot en met `until` waar de ijktocht past, zaterdag en zondag eerst (dan heb je tijd
// voor je vaste route). Alleen een vrije dag: de meting is alleen eerlijk met frisse benen en zonder iets ervoor.
// - niet je vaste rustdag, geen vakantie zonder training, tocht, lichte dag of ziektedag;
// - de dag ervoor en de dag erna niets langs of zwaars (lange training, zware benen, harde loop, test, wedstrijd);
// - niet in de drie dagen voor een test of de week voor een wedstrijd, en niet in de twee weken voor een bergdoel of tocht;
// - niet op of naast een dag waar een ander voorstel iets neerzet;
// - de week houdt nog een dag zonder training, en een tijdsbudget voor die dag moet het toelaten.
export function findCalibrationDay(input: CalibrationAdviceInput, from: string, until: string): string | undefined {
  const { today, plannedSessions, logs } = input;
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const template = byId.get(CALIBRATION_TEMPLATE_ID);
  if (!template) return undefined;
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const standing = plannedSessions.filter((s) => s.status !== 'skipped' && s.scheduledDate >= today && !logged.has(s.id));
  const rowsOn = (day: string) => standing.filter((s) => s.scheduledDate === day);
  const templatesOn = (day: string): SessionTemplate[] => [
    ...rowsOn(day).map((s) => byId.get(s.templateId)),
    ...logs.filter((l) => l.completedDate === day).map((l) => byId.get(l.templateId)),
  ].filter((t): t is SessionTemplate => !!t);
  const busy = (day: string) => rowsOn(day).length > 0 || logs.some((l) => l.completedDate === day);
  const trains = (day: string) => rowsOn(day).some((s) => byId.get(s.templateId)?.type !== 'recovery') || logs.some((l) => l.completedDate === day && l.type !== 'recovery');
  const rules = dayRules({ today, leave: input.leave, illness: input.illnessEpisodes });
  const trips = input.context?.trips ?? [];

  const fits = (day: string): boolean => {
    if (busy(day)) return false;
    if (input.restDay && isoWeekday(day) === input.restDay) return false;
    if (rules.holds(day, 'off', 'trek', 'light') || rules.ill(day)) return false;
    // Ook een geplande Trap af of afdaling ernaast (de afdaalklok na Akkoord): niet naast elkaar, zoals bij twee voorstellen.
    if ([...templatesOn(addDays(day, -1)), ...templatesOn(addDays(day, 1))].some((t) => demanding(t) || hasRole(t, 'descent'))) return false;
    const ahead = (n: number) => Array.from({ length: n }, (_, i) => templatesOn(addDays(day, i + 1))).flat();
    if (ahead(TEST_CLEAR_DAYS).some((t) => isTestOrRace(t)) || ahead(RACE_CLEAR_DAYS).some((t) => hasRole(t, 'race'))) return false;
    if (trips.some((t) => day <= t.date && daysBetween(day, t.date) < TRIP_CLEAR_DAYS)) return false;
    if ([addDays(day, -1), day, addDays(day, 1)].some((d) => input.taken?.has(d))) return false;
    if (!weekDates(mondayOfWeek(day)).some((d) => d !== day && d >= today && !trains(d))) return false;
    if (input.dailyTimeBudget?.[weekdayOf(day)]) {
      const week = standing.filter((s) => mondayOfWeek(s.scheduledDate) === mondayOfWeek(day));
      if (!dayHasRoomFor(day, template, week, byId, input.program, input.dailyTimeBudget, input.sameDayPairingPreference)) return false;
    }
    return true;
  };
  const days: string[] = [];
  for (let day = from; day <= until; day = addDays(day, 1)) days.push(day);
  const weekend = (d: string) => isoWeekday(d) >= 6;
  return days.find((d) => weekend(d) && fits(d)) ?? days.find((d) => !weekend(d) && fits(d));
}

const WHY = 'Een vaste ijktocht is geen gevalideerde test, wel een eerlijk kompas: met dezelfde route, dezelfde rugzak en hetzelfde rustige tempo zeggen drie dingen iets over je vorm voor de berg. Je klimtempo in meter per uur, hoeveel je hartslag in het laatste deel oploopt tegen het eerste, en hoe je benen de ochtend erna zijn. Dat laatste deel zegt het meest: hoe goed je het volhoudt als je al moe bent (Maunder e.a. 2021). Bij goed getrainde lopers zakte het tempo bij dezelfde hartslag pas na het eerste uur (Vesterinen e.a. 2014); bij 60 minuten zie je dus vooral je klimtempo en hoe vroeg je hartslag oploopt. Een trappenhuis is in Nederland vaak de beste route: altijd hetzelfde en niet afhankelijk van het weer. Het voorstel kiest een vrije dag, het liefst in het weekend, zonder iets langs of zwaars de dag ervoor of erna, en niet in de twee weken voor je bergdoel of tocht. Zonder Akkoord verandert er niets.';

function addProposal(title: string, day: string, template: SessionTemplate, reason: string): PlanChangeProposal {
  const item: PlanChangeItem = {
    action: 'add', newSessionDraft: { templateId: template.id, scheduledDate: day, weekStartDate: mondayOfWeek(day) },
    reason, generatedBy: ['engine/ijktocht.ts', CALIBRATION_RULE],
  };
  return {
    id: makeId('planchange'), trigger: 'new_training_data', issue: title, changes: [item], alternatives: [],
    consequences: `${template.name} staat op ${formatWeekdayDateNL(day)}.`, explanation: WHY, createdAt: new Date().toISOString(),
  };
}

const weeksText = (days: number) => `${Math.round(days / 7)} weken`;

// De regel en het voorstel van de ijktocht. Hoogstens één advies.
export function calibrationAdvice(input: CalibrationAdviceInput): Advice[] {
  const { today, context } = input;
  if (!context) return [];
  const template = input.templates.find((t) => t.id === CALIBRATION_TEMPLATE_ID);
  if (!template) return [];
  // Ziek, of net beter: eerst herstellen. Op vakantie zonder training: stil tot je terug bent.
  if (!mayPropose(today, input.illnessEpisodes)) return [];
  if (dayRules({ today, leave: input.leave }).holds(today, 'off')) return [];
  // Zonder logs weet ASCEND niets van je en zegt het niets.
  const done = input.logs.filter((l) => !!l.completedDate && l.completedDate <= today);
  if (done.length === 0) return [];
  const last = calibrationLogs(input.logs, today).at(-1)?.completedDate;
  if (last && daysBetween(last, today) < context.intervalDays) return [];
  // Een ijktocht die al klaarstaat: dan hoeft er geen voorstel bij.
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter(Boolean));
  if (input.plannedSessions.some((s) => s.templateId === CALIBRATION_TEMPLATE_ID && s.status !== 'skipped' && s.scheduledDate >= today && !logged.has(s.id))) return [];

  // Een id per ronde: na de vorige ijktocht, of de nulmeting. Je antwoord houdt de vraag twee weken stil, geteld vanaf
  // de dag van dat antwoord; daarna krijgt het advies een nieuw id met de dag waarop het weer mag.
  const base = `ijktocht:${last ?? 'nul'}`;
  const mine = (key: string) => key === base || key.startsWith(`${base}:`);
  const answered = Object.entries(input.answeredOn ?? {}).filter(([key]) => mine(key)).map(([, date]) => date).sort().at(-1);
  if (answered && daysBetween(answered, today) < DECLINE_QUIET_DAYS) return [];
  // Een antwoord zonder dag (alleen het id is bekend): stil tot de volgende ijktocht, want wanneer de twee weken om zijn is niet te zeggen.
  if (!answered && [...input.respondedIds].some(mine)) return [];
  const id = answered ? `${base}:${addDays(answered, DECLINE_QUIET_DAYS)}` : base;
  if (input.respondedIds.has(id)) return [];

  const title = last ? 'Tijd voor je ijktocht' : 'Een nulmeting voor de berg';
  const fact = last
    ? `Je laatste ijktocht was ${formatWeekdayDateNL(last)}, ${weeksText(daysBetween(last, today))} geleden.`
    : 'Nog geen ijktocht in je logs. De eerste is je nulmeting: daar vergelijk je de volgende mee.';
  const brief = last ? `IJktocht, ${weeksText(daysBetween(last, today))} na de vorige` : 'Nulmeting voor de berg';
  const again = formatWeekdayDateNL(addDays(today, DECLINE_QUIET_DAYS));
  const minutes = template.durationVariants.full;
  const day = findCalibrationDay(input, addDays(today, 1), addDays(today, LOOK_AHEAD_DAYS));
  if (!day) {
    const lead = `${fact} De komende twee weken is er geen vrije dag die past.`;
    const effect = `${lead} Loop hem zelf op een rustige dag: je vaste route of trappenhuis, dezelfde rugzak, rustig tempo. Na Begrepen komt de vraag op zijn vroegst op ${again} terug.`;
    return [{ id, trigger: 'plan_update', ruleId: CALIBRATION_RULE, title, effect, lead, brief, why: WHY, priority: 1 }];
  }
  const lead = `${fact} Op ${formatWeekdayDateNL(day)} past hij op een vrije dag.`;
  const effect = `Met Akkoord staat ${template.name} (${minutes} minuten) op ${formatWeekdayDateNL(day)}: je vaste route of trappenhuis, dezelfde rugzak, rustig tempo. Met Liever niet blijft je week zoals hij is en komt de vraag op zijn vroegst op ${again} terug.`;
  const proposal = addProposal(title, day, template, last ? 'Je vaste ijktocht: zes of acht weken na de vorige.' : 'Je eerste ijktocht, de nulmeting voor de berg.');
  return [{ id, trigger: 'plan_update', ruleId: CALIBRATION_RULE, title, effect, lead, brief, why: WHY, priority: 1, proposal }];
}

// --- De meting ----------------------------------------------------------------------------------------------

export interface CalibrationReading {
  logId: string;
  date: string;
  // Meter per uur. 'klimmen': alleen de klimmen van het horloge (engine/runMetrics.ts#climbsOf), 'geheel': de stijging
  // over de hele tocht. Alleen dezelfde soort is te vergelijken.
  climb?: { metresPerHour: number; basis: 'klimmen' | 'geheel' };
  // De gemiddelde hartslag in het eerste en het laatste derde van de tijd in beweging.
  heart?: { first: number; last: number; rise: number };
  legs?: LegFeeling;
  packKg?: number;
  distanceKm?: number;
  gainM?: number;
  tempC?: number;
}

function heartThirds(log: SessionLog): CalibrationReading['heart'] {
  const d = log.detail;
  if (!d || d.quality.heartRateCoveragePct < HEART_COVERAGE_PCT || d.movingSec <= 0) return undefined;
  const third = d.movingSec / 3;
  let t = 0;
  const acc = [{ sec: 0, beats: 0 }, { sec: 0, beats: 0 }, { sec: 0, beats: 0 }];
  for (const s of d.slices) {
    const part = Math.min(2, Math.floor((t + s.sec / 2) / third));
    t += s.sec;
    if (s.heartRate === undefined) continue;
    acc[part].sec += s.sec;
    acc[part].beats += s.heartRate * s.sec;
  }
  if (acc[0].sec <= 0 || acc[2].sec <= 0) return undefined;
  const first = acc[0].beats / acc[0].sec;
  const last = acc[2].beats / acc[2].sec;
  return { first, last, rise: last - first };
}

function climbOf(log: SessionLog): CalibrationReading['climb'] {
  const climbs = climbsOf(log.detail);
  if (!isUnavailable(climbs) && climbs.length > 0) {
    const metres = climbs.reduce((n, c) => n + c.metres, 0);
    const sec = climbs.reduce((n, c) => n + c.sec, 0);
    if (sec > 0) return { metresPerHour: (metres / sec) * 3600, basis: 'klimmen' };
  }
  const o = log.outdoorData ?? log.cardioData;
  const gain = o && !o.estimatedElevation ? o.elevationGainM : undefined;
  const minutes = log.detail ? log.detail.movingSec / 60 : o?.durationMinutes ?? log.durationMinutes;
  if (gain && gain > 0 && minutes && minutes > 0) return { metresPerHour: (gain / minutes) * 60, basis: 'geheel' };
  return undefined;
}

// Wat één ijktocht liet zien. De benen komen uit je ochtendcheck van de dag erna.
export function readCalibration(log: SessionLog, checkIns: readonly MorningCheckIn[] | undefined): CalibrationReading {
  const next = addDays(log.completedDate, 1);
  const legs = checkIns?.find((c) => c.date === next)?.legs;
  const o = log.outdoorData ?? log.cardioData;
  return {
    logId: log.id,
    date: log.completedDate,
    ...(climbOf(log) ? { climb: climbOf(log) } : {}),
    ...(heartThirds(log) ? { heart: heartThirds(log) } : {}),
    ...(legs ? { legs } : {}),
    ...(log.outdoorData?.backpackWeightKg !== undefined ? { packKg: log.outdoorData.backpackWeightKg } : {}),
    ...(o?.distanceKm !== undefined ? { distanceKm: o.distanceKm } : {}),
    ...(o?.elevationGainM !== undefined && !o.estimatedElevation ? { gainM: o.elevationGainM } : {}),
    ...(log.detail?.conditions?.tempC !== undefined ? { tempC: log.detail.conditions.tempC } : {}),
  };
}

export interface CalibrationLine {
  head: string;
  text: string;
}

export interface CalibrationView {
  // De korte waarde in de rij van Je stand.
  row: string;
  latest: CalibrationReading;
  previous?: CalibrationReading;
  // Klimtempo, hartslag aan het eind, benen de dag erna: altijd drie, ook als iets niet bekend is.
  lines: CalibrationLine[];
  // Wat de vergelijking minder zeker maakt (andere rugzak, route of temperatuur).
  caveats: string[];
}

const LEG_RANK: Record<LegFeeling, number> = { fris: 0, stijf: 1, spierpijn: 2, flink: 3 };
const LEG_WORD: Record<LegFeeling, string> = { fris: 'fris', stijf: 'stijf', spierpijn: 'spierpijn', flink: 'flinke spierpijn' };
const n0 = (x: number) => formatNumberNL(Math.round(x), 0);
const pctDiff = (a: number, b: number) => (b === 0 ? 0 : (Math.abs(a - b) / b) * 100);

// De vergelijking van de laatste ijktocht met de vorige, in drie regels. Zonder ijktocht: niets (de rij staat er niet).
export function calibrationView(logs: readonly SessionLog[], checkIns: readonly MorningCheckIn[] | undefined, today?: string): CalibrationView | undefined {
  const all = calibrationLogs(logs, today);
  const lastLog = all.at(-1);
  if (!lastLog) return undefined;
  const latest = readCalibration(lastLog, checkIns);
  const prevLog = all.at(-2);
  const previous = prevLog ? readCalibration(prevLog, checkIns) : undefined;
  const when = (r: CalibrationReading) => formatWeekdayDateNL(r.date);

  // Klimtempo.
  let climbWord: 'sneller' | 'gelijk' | 'trager' | undefined;
  let climbText: string;
  if (!latest.climb) climbText = 'Niet bekend: deze ijktocht heeft geen hoogtemeters.';
  else if (!previous?.climb || previous.climb.basis !== latest.climb.basis) {
    climbText = `${n0(latest.climb.metresPerHour)} m per uur${latest.climb.basis === 'geheel' ? ' over de hele tocht' : ' op de klimmen'}.${previous ? (previous.climb ? ' De vorige is anders gemeten, dus niet te vergelijken.' : ' De vorige had geen hoogtemeters.') : ''}`;
  } else {
    const change = ((latest.climb.metresPerHour - previous.climb.metresPerHour) / previous.climb.metresPerHour) * 100;
    climbWord = Math.abs(change) < NOISE.climbPct ? 'gelijk' : change > 0 ? 'sneller' : 'trager';
    const word = climbWord === 'gelijk' ? 'Gelijk' : climbWord === 'sneller' ? 'Sneller' : 'Trager';
    climbText = `${word}: ${n0(latest.climb.metresPerHour)} m per uur, vorige keer ${n0(previous.climb.metresPerHour)}.${climbWord === 'gelijk' ? ` Een verschil onder ${NOISE.climbPct} procent is ruis.` : ''}`;
  }

  // Hartslag in het laatste derde tegen het eerste.
  let heartWord: 'minder' | 'gelijk' | 'meer' | undefined;
  let heartText: string;
  const beats = (n: number) => `${n0(n)} ${Math.round(n) === 1 ? 'slag' : 'slagen'}`;
  const riseText = (h: NonNullable<CalibrationReading['heart']>) => (Math.round(h.rise) === 0 ? 'even hoog als' : Math.round(h.rise) > 0 ? `${beats(h.rise)} hoger dan` : `${beats(-h.rise)} lager dan`);
  if (!latest.heart) heartText = 'Niet bekend: deze ijktocht heeft geen hartslag die de hele tocht meeliep.';
  else if (!previous?.heart) heartText = `In het laatste deel ${riseText(latest.heart)} in het eerste.${previous ? ' De vorige had geen hartslag om mee te vergelijken.' : ''}`;
  else {
    const diff = latest.heart.rise - previous.heart.rise;
    heartWord = Math.abs(diff) < HEART_NOISE_BPM ? 'gelijk' : diff < 0 ? 'minder' : 'meer';
    const word = heartWord === 'gelijk' ? 'Gelijk' : heartWord === 'minder' ? 'Loopt minder op' : 'Loopt meer op';
    heartText = `${word}: in het laatste deel ${riseText(latest.heart)} in het eerste, vorige keer ${riseText(previous.heart).replace(/ (dan|als)$/, '')}.`;
  }

  // Benen de ochtend erna.
  let legsText: string;
  if (!latest.legs) legsText = 'Niet bekend: geen ochtendcheck de dag erna.';
  else if (!previous?.legs) legsText = `De ochtend erna: ${LEG_WORD[latest.legs]}.`;
  else {
    const d = LEG_RANK[latest.legs] - LEG_RANK[previous.legs];
    legsText = `${d === 0 ? 'Gelijk' : d < 0 ? 'Frisser' : 'Zwaarder'}: de ochtend erna ${LEG_WORD[latest.legs]}, vorige keer ${LEG_WORD[previous.legs]}.`;
  }

  const caveats: string[] = [];
  if (previous) {
    if (latest.packKg !== undefined && previous.packKg !== undefined && Math.abs(latest.packKg - previous.packKg) >= PACK_DIFF_KG) {
      caveats.push(`Andere rugzak: ${formatNumberNL(latest.packKg, 1)} kg, vorige keer ${formatNumberNL(previous.packKg, 1)} kg.`);
    } else if ((latest.packKg === undefined) !== (previous.packKg === undefined)) {
      caveats.push('Bij een van de twee staat geen rugzak, dus of die gelijk was is niet bekend.');
    }
    const routeDiff = (latest.distanceKm !== undefined && previous.distanceKm !== undefined && pctDiff(latest.distanceKm, previous.distanceKm) > ROUTE_DIFF_PCT)
      || (latest.gainM !== undefined && previous.gainM !== undefined && pctDiff(latest.gainM, previous.gainM) > GAIN_DIFF_PCT);
    if (routeDiff) caveats.push('De afstand of de stijging verschilt, dus de route was waarschijnlijk niet dezelfde.');
    if (latest.tempC !== undefined && previous.tempC !== undefined && Math.abs(latest.tempC - previous.tempC) >= TEMP_DIFF_C) {
      caveats.push(`Het was ${latest.tempC > previous.tempC ? 'warmer' : 'kouder'}: ${n0(latest.tempC)} graden, vorige keer ${n0(previous.tempC)}. Warmte duwt je hartslag omhoog.`);
    }
  }

  const row = !previous
    ? `nulmeting op ${when(latest)}`
    : climbWord === 'sneller' ? 'sneller bergop dan vorige keer'
      : climbWord === 'trager' ? 'trager bergop dan vorige keer'
        : heartWord === 'minder' ? 'hartslag loopt minder op'
          : heartWord === 'meer' ? 'hartslag loopt meer op'
            : climbWord === 'gelijk' || heartWord === 'gelijk' ? 'gelijk aan vorige keer'
              : `laatste op ${when(latest)}`;

  return {
    row, latest, ...(previous ? { previous } : {}),
    lines: [
      { head: 'Klimtempo', text: climbText },
      { head: 'Hartslag aan het eind', text: heartText },
      { head: 'Benen de dag erna', text: legsText },
    ],
    caveats,
  };
}
