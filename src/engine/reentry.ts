// ASCEND: rustiger instap na een pauze (profielendoorloop 14 november, ziek-vakantie 1;
// docs/beslissingen/2026-11-14-vakantie-en-ziek-niet-gemist.md).
//
// Na ziekte en een vakantieweek, of na twee weken met weinig training, sprong het plan meteen naar een
// volle week (bergtocht 165 minuten terwijl de laatste loop 33 minuten was). Het programma telt de weken
// op de kalender: het weet niet dat je weg was. Een coach zegt dan: de eerste week terug wat korter.
//
// Wat het doet. De hele eerste week na de pauze, tot je kiest, een voorstel: zeven dagen vanaf de dag dat je
// het ziet duren je trainingen driekwart (het advies, zoals Weer opbouwen na ziekte in engine/illness.ts) of
// de helft van de gewone duur. De pauze telt vanaf je laatste echte training; na meer dan tien dagen zonder
// krachttraining begint Forge in die dagen ook 5% lichter (docs/beslissingen/2026-11-23-terugkeer-na-pauze.md). Welke trainingen er staan, je fase en je doeldatum blijven zoals ze zijn.
// Akkoord bewaart de week (AppSettings.reentryWeeks) en de duurregisters lezen hem
// (engine/durationScope.ts); Liever niet verandert niets en ASCEND vraagt het voor die terugkomst niet
// nog eens. Het blok een week verschuiven is de andere weg; die raakt de afbouw of de doeldatum, en het
// doel blijft het doel, dus dat doet ASCEND niet zelf.
//
// Wanneer niet: zonder programma, met de instelling uit, terwijl je ziek bent of nog opbouwt na ziekte
// (dat schema doet dit al), terwijl je nog weg bent, met een test of wedstrijd in die zeven dagen (de
// afbouw en de test hebben hun eigen regels), of in de eerste twee weken van je plan (er is dan nog
// geen gewone week om tegen te meten).
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { IllnessEpisode } from '../models/illness';
import type { LeavePeriod } from '../models/leave';
import type { DurationAdjustment } from './substitutions';
import { dayRules, mayPropose } from './dayRules';
import { awayPeriods, isAwayDay } from './leave';
import { isHardRun, isLegHeavyTemplate, respectsHeavySpacing } from './scheduler';
import { hasRole, isGymStrengthTemplate, isTestOrRace } from './templateRoles';
import { raceWeekGuard } from './adviceShared';
import type { RaceBlock } from './raceBlock';
import type { PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import { addDays, daysBetween, formatWeekdayDateNL, mondayOfWeek } from '../utils/dates';

export type ReentryChoice = 'three_quarters' | 'half' | 'off';
export const REENTRY_ADVICE: ReentryChoice = 'three_quarters';
const CHOICES: readonly ReentryChoice[] = ['three_quarters', 'half', 'off'];
export const REENTRY_FACTOR: Record<Exclude<ReentryChoice, 'off'>, number> = { three_quarters: 0.75, half: 0.5 };

export function resolveReentry(raw: unknown): ReentryChoice {
  return CHOICES.find((c) => c === raw) ?? REENTRY_ADVICE;
}

// Zeven dagen vanaf de dag dat je terug bent, met de factor die je met Akkoord koos.
export interface ReentryWeek {
  from: string;
  until: string;
  factor: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function isReentryWeek(v: unknown): v is ReentryWeek {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return typeof r.from === 'string' && DATE_RE.test(r.from) && typeof r.until === 'string' && DATE_RE.test(r.until) && r.until >= r.from
    && typeof r.factor === 'number' && Number.isFinite(r.factor) && r.factor >= 0.25 && r.factor <= 1;
}

// Voor de duurregisters: alleen wat heel is (een beschadigde back-up plant niets anders).
export function reentryAdjustments(weeks: unknown): DurationAdjustment[] {
  return Array.isArray(weeks) ? weeks.filter(isReentryWeek).map((w) => ({ from: w.from, until: w.until, factor: w.factor })) : [];
}

// Twee weken terugkijken; daaronder telt het als weinig training.
export const REENTRY_LOOKBACK_DAYS = 14;
const REENTRY_SHARE = 0.4;
// Het voorstel staat de hele eerste week na de terugkomst, tot je kiest (I-124, 23 november): wie op dag vier opende
// zag eerder niets meer. Het venster van zeven dagen begint op de dag dat je het ziet, nooit in het verleden.
const OFFER_DAYS = 6;
const WINDOW_DAYS = 7;
// Een pauze telt vanaf je laatste echte training (geen herstel), niet vanaf het einde van vrij of ziek. Meer dan zeven
// dagen zonder training is een pauze, ook als de twee weken ervoor vol waren (I-124).
export const REENTRY_PAUSE_DAYS = 7;
// Meer dan zoveel dagen zonder krachttraining: Forge begint in de instap iets lichter (zelfde 5% als Na een pauze
// lichter beginnen, engine/strengthModel.ts).
export const REENTRY_FORGE_DAYS = 10;

export interface ReentryInputs {
  program: Program | null | undefined;
  plannedSessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  today: string;
  illnessEpisodes?: IllnessEpisode[];
  leavePeriods?: LeavePeriod[];
  choice: ReentryChoice;
  // Wat al met Akkoord bewaard is.
  weeks?: unknown;
  respondedIds: ReadonlySet<string>;
  // Tussendoelen met een wedstrijddag (engine/raceBlock.ts): dezelfde bescherming als het inhalen.
  raceGoals?: RaceBlock[];
  // Forge mag in de instap lichter beginnen: krachttraining aan en Na een pauze lichter beginnen aan.
  forgeLighter?: boolean;
  // Instelling Gemiste training op je rustdag (I-159): afwezig is aan.
  catchUp?: boolean;
}

export type ReentryCause = 'ill' | 'away' | 'ill_away' | 'quiet';

export interface ReentryProposal {
  id: string;
  week: ReentryWeek;
  cause: ReentryCause;
  done: number; // trainingen gelogd in de twee weken ervoor
  usual: number; // trainingen in de zeven dagen van het venster
  // Je laatste echte training voor de terugkomst, en hoeveel dagen daarna zonder training (tot vandaag, of tot je
  // eerste training na de terugkomst).
  lastTraining?: string;
  pauseDays?: number;
  trainedSince?: boolean;
  // Dagen sinds je laatste krachttraining, als Forge in de instap lichter begint.
  forgeDays?: number;
  // Staat er op de eerste dag alleen herstel, dan wordt die dag je eerste lichte training (I-144).
  firstDay?: ReentryFirstDay;
  // Na een pauze zonder ziekte: een lichte training die je miste komt op je eerste rustdag in de instap (I-159).
  catchUp?: ReentryCatchUp;
}

// De eerste dag van de instap: na een pauze is een herstelwandeling geen herstel. De eerste kracht- of looptraining
// van de zeven dagen ruilt van dag met het herstel, als onderdeel van hetzelfde voorstel met Akkoord (I-144).
export interface ReentryFirstDay {
  date: string;
  restId: string;
  restName: string;
  trainingId: string;
  trainingName: string;
  trainingDate: string;
}

export const reentryId = (from: string) => `reentry:${from}`;

// De dag dat je terug bent: de dag van "weer beter" of de dag na een vakantie, tocht of periode zonder sportschool,
// ook een die je achteraf vastlegde. Eén terugkomst, één id: lag er in de laatste twee weken een terugkomst, dan
// geldt die, ook als zijn eerste week al voorbij is; dan valt het voorstel niet terug op de maandag met een ander id
// (Warden, 14 november). Zonder pauze: de maandag van deze week, hoogstens één keer per drie weken.
const QUIET_EVERY_DAYS = 21;
function returnDay(today: string, illness: IllnessEpisode[] | undefined, leave: LeavePeriod[] | undefined): { day: string; paused: boolean } | undefined {
  const pauses = [
    ...(illness ?? []).filter((e) => e.endDate).map((e) => e.endDate!),
    ...awayPeriods(leave).map((p) => addDays(p.endDate, 1)),
  ].filter((d) => d <= today && daysBetween(d, today) <= REENTRY_LOOKBACK_DAYS).sort();
  if (pauses.length > 0) return { day: pauses.at(-1)!, paused: true };
  return { day: mondayOfWeek(today), paused: false };
}

// Een eerder voorstel (beantwoord of bewaard) in de laatste drie weken.
function askedRecently(today: string, respondedIds: ReadonlySet<string>, weeks: unknown): boolean {
  const recent = (d: string) => d <= today && daysBetween(d, today) < QUIET_EVERY_DAYS;
  return [...respondedIds].some((id) => id.startsWith('reentry:') && recent(id.slice('reentry:'.length)))
    || reentryAdjustments(weeks).some((w) => recent(w.from));
}

// Een log dat telt als training: alles behalve herstel (sjabloon van type recovery).
function realTrainingDates(logs: readonly SessionLog[], byId: Map<string, SessionTemplate>, kind?: 'strength'): string[] {
  return logs
    .filter((l) => {
      const type = byId.get(l.templateId)?.type ?? l.type;
      return kind ? type === kind : type !== 'recovery';
    })
    .map((l) => l.completedDate)
    .sort();
}

// Een training die nog open staat: niet overgeslagen, niet van een periode en zonder log (klaar is nooit een vlag,
// engine/sessionStatus.ts).
function openOn(s: PlannedSession, logged: ReadonlySet<string>): boolean {
  return s.status !== 'skipped' && !logged.has(s.id) && !s.leave;
}

const byDayOrder = (a: PlannedSession, b: PlannedSession) => a.scheduledDate.localeCompare(b.scheduledDate) || a.order - b.order || a.id.localeCompare(b.id);

// Staat er op de eerste dag van de instap alleen herstel? Dan de eerste kracht- of looptraining van die zeven dagen
// (geen test of wedstrijd) op die dag, en het herstel op haar dag. Puur en deterministisch: de vroegste dag, dan de
// volgorde op de dag, dan het id.
export function reentryFirstDay(
  week: Pick<ReentryWeek, 'from' | 'until'>,
  plannedSessions: readonly PlannedSession[],
  logs: readonly SessionLog[],
  templates: readonly SessionTemplate[],
): ReentryFirstDay | undefined {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  // Al getraind op de eerste dag: dan is die dag geen rustdag.
  if (logs.some((l) => l.completedDate === week.from && (byId.get(l.templateId)?.type ?? l.type) !== 'recovery')) return undefined;
  const first = plannedSessions.filter((s) => s.scheduledDate === week.from && openOn(s, logged)).sort(byDayOrder);
  if (first.length === 0 || first.some((s) => byId.get(s.templateId)?.type !== 'recovery')) return undefined;
  const rest = first[0];
  // Zware benen naar voren halen alleen met 48 uur na je laatste zware beensessie: het slot van het voorstel laat de
  // ronde het daarna niet meer repareren (Warden, I-144).
  const legsRecent = logs.some((l) => {
    const t = byId.get(l.templateId);
    return !!t && isLegHeavyTemplate(t) && l.completedDate < week.from && daysBetween(l.completedDate, week.from) < 2;
  });
  const training = plannedSessions
    .filter((s) => s.scheduledDate > week.from && s.scheduledDate <= week.until && openOn(s, logged))
    .filter((s) => { const t = byId.get(s.templateId); return !!t && (t.type === 'strength' || t.type === 'cardio') && !isTestOrRace(t) && !(legsRecent && isLegHeavyTemplate(t)); })
    .sort(byDayOrder)[0];
  if (!training) return undefined;
  return {
    date: week.from, restId: rest.id, restName: byId.get(rest.templateId)!.name, trainingId: training.id,
    trainingName: byId.get(training.templateId)!.name, trainingDate: training.scheduledDate,
  };
}

// De ruil als eigen voorstel dat met Akkoord op de instap meegaat (storage/horizonPlan.ts, startItems).
export function reentryFirstDayItems(f: ReentryFirstDay): PlanChangeItem[] {
  const reason = 'Na een pauze is je eerste dag een lichte training, geen herstel.';
  const generatedBy = ['engine/reentry.ts', 'REENTRY'];
  return [
    { plannedSessionId: f.trainingId, action: 'swap', fromDate: f.trainingDate, toDate: f.date, pairedWithSessionId: f.restId, reason, generatedBy },
    { plannedSessionId: f.restId, action: 'swap', fromDate: f.date, toDate: f.trainingDate, pairedWithSessionId: f.trainingId, reason, generatedBy },
  ];
}

// Een lichte gemiste training op de eerste rustdag van de instap (I-159, docs/beslissingen/2026-11-25-terugkeer-rustdag.md).
// Alleen na een pauze zonder ziekte; na ziekte blijft de rustdag staan. Hoort bij hetzelfde voorstel met Akkoord als de
// instap (startItems), en de duur volgt de instap: de rij valt in de zeven dagen en de duurregisters korten hem in.
export interface ReentryCatchUp {
  sessionId: string;
  name: string;
  fromDate: string;
  toDate: string;
  // Alleen als de rij een vaste lengte had: die lengte met de factor van de instap.
  plannedMinutes?: number;
}

// Van jou: een slot van jou, of een rij die je zelf verplaatste (engine/weekValidator.ts#lockLevel).
const yours = (s: PlannedSession) => s.lock?.by === 'user' || (s.status === 'moved' && !s.lock);

export function reentryCatchUp(input: {
  week: ReentryWeek;
  // De eerste dag die als gemist kan tellen: de dag na je laatste echte training (of het begin van de twee weken).
  pauseFrom: string;
  today: string;
  plannedSessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  leave?: LeavePeriod[];
  firstDay?: ReentryFirstDay;
}): ReentryCatchUp | undefined {
  const { week, today, leave, firstDay } = input;
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  // De dag van elke rij zoals hij na de ruil van de eerste dag staat (hetzelfde Akkoord).
  const dateOf = (s: PlannedSession) => (firstDay && s.id === firstDay.trainingId ? firstDay.date : firstDay && s.id === firstDay.restId ? firstDay.trainingDate : s.scheduledDate);
  const isTraining = (templateId: string, type?: string) => (byId.get(templateId)?.type ?? type) !== 'recovery';
  // Vakantie of tocht, en zonder sportschool alleen voor een sportschooltraining (dezelfde toets als engine/leave.ts#isAwayFor).
  const rules = dayRules({ today, leave });
  const away = (d: string, t?: SessionTemplate) => rules.holds(d, 'off', 'trek') || (!!t && !!rules.noGymPeriod(d) && isGymStrengthTemplate(t));
  // De eerste rustdag: geen open training en niets getraind, geen dag van vakantie of tocht, en niet een dag die de
  // ruil van de eerste dag al gebruikt.
  let restDay: string | undefined;
  for (let d = week.from; d <= week.until && !restDay; d = addDays(d, 1)) {
    if (firstDay && (d === firstDay.date || d === firstDay.trainingDate)) continue;
    if (away(d)) continue;
    if (input.plannedSessions.some((s) => dateOf(s) === d && openOn(s, logged) && isTraining(s.templateId))) continue;
    if (input.logs.some((l) => l.completedDate === d && isTraining(l.templateId, l.type))) continue;
    restDay = d;
  }
  if (!restDay) return undefined;
  const day = restDay;
  // De planning rond de rustdag zoals hij na de ruil van de eerste dag staat: wat nog komt en wat je deed
  // (dezelfde keuze als engine/restDayBack.ts). De afstand tussen zware dagen toetst de scheduler zelf.
  const around = input.plannedSessions
    .filter((s) => s.status !== 'skipped' && !s.leave && (dateOf(s) >= today || logged.has(s.id)))
    .map((s) => (dateOf(s) === s.scheduledDate ? s : { ...s, scheduledDate: dateOf(s) }));
  // Wat voor een vakantie of tocht open stond vervalt (engine/missedTraining.ts#pauseSince): alleen wat erna kwam.
  const awayStarts = awayPeriods(leave).filter((p) => p.kind !== 'no_gym').map((p) => p.startDate);
  const candidate = input.plannedSessions
    .filter((s) => s.scheduledDate >= input.pauseFrom && s.scheduledDate < today && openOn(s, logged) && !yours(s))
    .filter((s) => !awayStarts.some((a) => a > s.scheduledDate && a <= today))
    .filter((s) => {
      const t = byId.get(s.templateId);
      // Licht: kracht of een rustige loop; geen test of wedstrijd, geen harde loop, geen lange duurloop of bergtocht,
      // en geen zware beendag (Benen A of B, engine/scheduler.ts#isLegHeavyTemplate).
      if (!t || (t.type !== 'strength' && t.type !== 'cardio') || isTestOrRace(t) || isHardRun(t) || hasRole(t, 'hard_run') || hasRole(t, 'long') || isLegHeavyTemplate(t)) return false;
      // Een vakantie- of tochtdag is nooit gemist, en zonder sportschool geen sportschooltraining (engine/leave.ts#isAwayFor).
      if (away(s.scheduledDate, t) || away(day, t)) return false;
      // De rustdag moet passen bij wat eromheen staat, met dezelfde regel als de rest van de planning.
      return respectsHeavySpacing(day, t, around, byId, [...input.logs], s.id);
    })
    // De laatste die je miste eerst; dan de volgorde op de dag en het id.
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || a.order - b.order || a.id.localeCompare(b.id))[0];
  if (!candidate) return undefined;
  const minutes = candidate.plannedMinutes !== undefined ? Math.max(5, Math.round((candidate.plannedMinutes * week.factor) / 5) * 5) : undefined;
  return {
    sessionId: candidate.id, name: byId.get(candidate.templateId)!.name, fromDate: candidate.scheduledDate, toDate: day,
    ...(minutes !== undefined ? { plannedMinutes: minutes } : {}),
  };
}

// De inhaal als eigen voorstel dat met Akkoord op de instap meegaat (storage/horizonPlan.ts, startItems).
export function reentryCatchUpItems(c: ReentryCatchUp): PlanChangeItem[] {
  return [{
    plannedSessionId: c.sessionId, action: 'move', fromDate: c.fromDate, toDate: c.toDate,
    ...(c.plannedMinutes !== undefined ? { plannedMinutes: c.plannedMinutes } : {}),
    reason: 'Na een pauze zonder ziekte haal je een lichte training in op je eerste rustdag.', generatedBy: ['engine/reentry.ts', 'REENTRY'],
  }];
}

export function proposeReentry(inputs: ReentryInputs): ReentryProposal | undefined {
  const { program, today, illnessEpisodes: illness, leavePeriods: leave } = inputs;
  if (!program || inputs.choice === 'off') return undefined;
  if (!mayPropose(today, illness) || isAwayDay(today, leave)) return undefined;
  const back = returnDay(today, illness, leave);
  if (!back) return undefined;
  const byId = new Map(inputs.templates.map((t) => [t.id, t]));
  // De pauze: vanaf je laatste echte training voor de terugkomst tot je eerste training daarna, of tot vandaag.
  const trained = realTrainingDates(inputs.logs, byId).filter((d) => d < today);
  const firstAfter = trained.find((d) => d >= back.day);
  // Na de eerste week is de terugkomst voorbij, maar alleen als je sindsdien trainde: wie na de periode nog steeds
  // niets deed, zit nog in dezelfde pauze en houdt het voorstel (I-144).
  if (daysBetween(back.day, today) > OFFER_DAYS && (!back.paused || firstAfter)) return undefined;
  const id = reentryId(back.day);
  if (inputs.respondedIds.has(id)) return undefined;
  // Het venster begint vandaag of op de dag terug als die nog komt: nooit in het verleden.
  const from = back.day > today ? back.day : today;
  const until = addDays(from, WINDOW_DAYS - 1);
  const lookFrom = addDays(back.day, -REENTRY_LOOKBACK_DAYS);
  // Nog geen twee weken plan: niets om tegen te meten.
  if (program.startDate > lookFrom) return undefined;
  // Al een rustiger instap die deze dagen raakt.
  if (reentryAdjustments(inputs.weeks).some((w) => w.from <= until && w.until >= from)) return undefined;

  const ahead = inputs.plannedSessions.filter((s) => s.status !== 'skipped' && s.scheduledDate >= from && s.scheduledDate <= until);
  // Een test of wedstrijd in die dagen: de afbouw en de test gaan voor, en die mogen niet korter.
  if (ahead.some((s) => { const t = byId.get(s.templateId); return !!t && isTestOrRace(t); })) return undefined;
  // Dezelfde bescherming als het inhalen: een wedstrijd of tussendoel binnen zeven dagen vanaf het venster.
  if (raceWeekGuard({ asOf: from, plannedSessions: [...inputs.plannedSessions], templates: [...inputs.templates], raceGoals: inputs.raceGoals })) return undefined;
  const usual = ahead.filter((s) => byId.get(s.templateId)?.type !== 'recovery').length;
  if (usual === 0) return undefined;
  const done = inputs.logs.filter((l) => l.completedDate >= lookFrom && l.completedDate < back.day && byId.get(l.templateId)?.type !== 'recovery').length;

  const lastTraining = trained.filter((d) => d < back.day).at(-1);
  const pauseDays = lastTraining ? daysBetween(lastTraining, firstAfter ?? today) : undefined;
  // Eén vraag per pauze: een eerder antwoord voor een terugkomst binnen dezelfde pauze (een periode die je daarna
  // verlengde of achteraf vastlegde geeft een latere dag terug) geldt ook nu.
  const pauseFrom = lastTraining ?? lookFrom;
  if ([...inputs.respondedIds].some((r) => r.startsWith('reentry:') && r.slice('reentry:'.length) > pauseFrom && r.slice('reentry:'.length) < back.day)) return undefined;
  const longPause = back.paused && pauseDays !== undefined && pauseDays > REENTRY_PAUSE_DAYS;
  if (!longPause && done >= REENTRY_SHARE * 2 * usual) return undefined;

  // Ziekte vlak voor die twee weken hoort bij het verhaal (ziek, een week niets, dan vakantie): een week extra terug.
  // Lag je laatste training nog eerder, dan telt alles vanaf daar (I-124).
  const storyFrom = lastTraining && lastTraining < lookFrom ? lastTraining : lookFrom;
  const ill = (illness ?? []).some((e) => e.startDate < back.day && (e.endDate ?? today) >= addDays(storyFrom, -7));
  const away = awayPeriods(leave).some((p) => p.startDate < back.day && p.endDate >= storyFrom);
  const cause: ReentryCause = ill && away ? 'ill_away' : ill ? 'ill' : away ? 'away' : 'quiet';
  // De grens van drie weken geldt voor het voorstel, niet voor één oorzaak: zonder terugkomst in de laatste twee
  // weken (de maandag) nooit binnen drie weken na een eerder voorstel, ook als er nog een pauze in het verhaal zit.
  if (!back.paused && askedRecently(today, inputs.respondedIds, inputs.weeks)) return undefined;
  if (cause === 'quiet' && back.paused) return undefined;
  const factor = REENTRY_FACTOR[inputs.choice];
  // Forge iets lichter: meer dan tien dagen zonder krachttraining, en alleen met Akkoord op deze instap.
  const lastStrength = realTrainingDates(inputs.logs, byId, 'strength').filter((d) => d < today).at(-1);
  const forgeDays = lastStrength ? daysBetween(lastStrength, today) : undefined;
  // De toets tot het begin van het venster, dezelfde als Forge daarna doet (reentryForgeLighter).
  const forge = inputs.forgeLighter && !!lastStrength && forgeDays !== undefined && daysBetween(lastStrength, from) > REENTRY_FORGE_DAYS;
  // Alleen als je sinds de terugkomst niet trainde: wie al trainde heeft wel iets om van te herstellen (Warden, I-144).
  const firstDay = firstAfter ? undefined : reentryFirstDay({ from, until }, inputs.plannedSessions, inputs.logs, inputs.templates);
  // Na een pauze zonder ziekte: een lichte gemiste training op de eerste rustdag (I-159). Na ziekte blijft de rustdag.
  const catchUp = inputs.catchUp === false || cause === 'ill' || cause === 'ill_away' ? undefined : reentryCatchUp({
    week: { from, until, factor }, pauseFrom: lastTraining ? addDays(lastTraining, 1) : lookFrom, today, plannedSessions: inputs.plannedSessions,
    logs: inputs.logs, templates: inputs.templates, leave, firstDay,
  });
  return {
    id, week: { from, until, factor }, cause, done, usual,
    ...(lastTraining && pauseDays !== undefined ? { lastTraining, pauseDays, trainedSince: !!firstAfter } : {}),
    ...(forge ? { forgeDays } : {}),
    ...(firstDay ? { firstDay } : {}),
    ...(catchUp ? { catchUp } : {}),
  };
}

// Forge in een instap waar je Akkoord op gaf: begint het voorstel iets lichter? Alleen na meer dan tien dagen zonder
// krachttraining (`lastStrengthDate` is je laatste krachttraining voor deze dag). Puur; de 5% zelf staat in
// engine/strengthModel.ts, zodat het dezelfde stap is als Na een pauze lichter beginnen.
export function reentryForgeLighter(weeks: unknown, date: string, lastStrengthDate: string | undefined): boolean {
  const w = activeReentry(weeks, date);
  // Gemeten tot het begin van de bewaarde week, net als het voorstel: zo wordt Forge alleen lichter als de zin in
  // het voorstel stond waar je Akkoord op gaf, en alleen de eerste krachttraining in die dagen.
  return !!w && !!lastStrengthDate && daysBetween(lastStrengthDate, w.from) > REENTRY_FORGE_DAYS;
}

// --- woorden ---------------------------------------------------------------------------

const CAUSE_TEXT: Record<ReentryCause, string> = {
  ill: ', met ziekte ertussen',
  away: ', met een vakantie ertussen',
  ill_away: ', met ziekte en een vakantie ertussen',
  quiet: '',
};

// Na het droge feit van de pauze: wat er tussen zat.
const BETWEEN_TEXT: Record<ReentryCause, string> = {
  ill: ' Daartussen was je ziek.',
  away: ' Daartussen was je weg.',
  ill_away: ' Daartussen was je ziek en weg.',
  quiet: '',
};

const count = (n: number) => `${n} ${n === 1 ? 'training' : 'trainingen'}`;
const days = (n: number) => `${n} ${n === 1 ? 'dag' : 'dagen'}`;
const share = (factor: number) => (factor <= 0.5 ? 'de helft' : 'driekwart');

export const REENTRY_TITLE = 'Rustiger instap de eerste week terug?';

// Het droge feit eerst: hoe lang je niet trainde (I-124). Zonder lange pauze, of zonder eerdere training: de twee weken.
function pauseFact(p: ReentryProposal): string {
  if (p.cause !== 'quiet' && p.lastTraining && p.pauseDays !== undefined && p.pauseDays > REENTRY_PAUSE_DAYS) {
    const lead = p.trainedSince
      ? `Tussen je training van ${formatWeekdayDateNL(p.lastTraining)} en je eerste training terug zaten ${days(p.pauseDays)}.`
      : `Je laatste training was ${formatWeekdayDateNL(p.lastTraining)}, ${days(p.pauseDays)} geleden.`;
    return `${lead}${BETWEEN_TEXT[p.cause]}`;
  }
  return `De afgelopen twee weken deed je ${count(p.done)}${CAUSE_TEXT[p.cause]}.`;
}

// De regel over Forge, alleen als die in de instap lichter begint.
export function reentryForgeLine(forgeDays: number): string {
  return `Je laatste krachttraining was ${days(forgeDays)} geleden, dus je eerste krachttraining in die dagen begint 5% lichter.`;
}

// "Vandaag geen herstel maar je eerste training: Bovenlichaam A komt naar vandaag, de Herstelwandeling naar di 26 januari."
export function reentryFirstDayLine(f: ReentryFirstDay, today?: string): string {
  const isToday = !!today && f.date === today;
  return `${isToday ? 'Vandaag' : `Op ${formatWeekdayDateNL(f.date)}`} geen herstel maar je eerste training: ${f.trainingName} komt naar ${isToday ? 'vandaag' : 'die dag'}, de ${f.restName} naar ${formatWeekdayDateNL(f.trainingDate)}.`;
}

// "Bovenlichaam A van di 16 februari deed je niet: die komt op vr 19 februari, je eerste rustdag in die dagen, net zo kort als de rest."
export function reentryCatchUpLine(c: ReentryCatchUp, today?: string): string {
  const to = today && c.toDate === today ? 'vandaag' : `op ${formatWeekdayDateNL(c.toDate)}`;
  return `${c.name} van ${formatWeekdayDateNL(c.fromDate)} deed je niet: die komt ${to}, je eerste rustdag in die dagen, net zo kort als de rest.`;
}

export function reentryEffect(p: ReentryProposal, today?: string): string {
  const span = today && p.week.from === today ? `vanaf vandaag tot en met ${formatWeekdayDateNL(p.week.until)}` : `tot en met ${formatWeekdayDateNL(p.week.until)}`;
  const forge = p.forgeDays !== undefined ? ` ${reentryForgeLine(p.forgeDays)}` : '';
  const moves = [p.firstDay ? reentryFirstDayLine(p.firstDay, today) : '', p.catchUp ? reentryCatchUpLine(p.catchUp, today) : ''].filter(Boolean);
  const stays = moves.length > 0
    ? ` ${moves.join(' ')} Verder blijven je trainingen, je fase en je doeldatum zoals ze zijn.`
    : ' Welke trainingen er staan, je fase en je doeldatum blijven zoals ze zijn.';
  return `${pauseFact(p)} Een gewone week heeft er ${p.usual}. Voorstel: ${span} duren je trainingen ${share(p.week.factor)} van de gewone tijd.${forge}${stays} Met Liever niet blijft alles staan.`;
}

export const REENTRY_WHY = 'Na een pauze zakt je conditie wat terug. Meteen een volle week oppakken geeft de grootste kans op een blessure; de eerste week op de helft tot driekwart geeft je lijf tijd om weer te wennen, net als Weer opbouwen na ziekte. Alleen de duur gaat omlaag, en alleen deze zeven dagen. Het blok een week verschuiven raakt de afbouw of je doeldatum, en het doel blijft het doel, dus dat gebeurt niet vanzelf. Driekwart of de helft kies je in Instellingen, Lichaam.';

// De regel in het voorstel van de planningsronde.
export function reentryNote(week: ReentryWeek, forgeDays?: number, firstDay?: ReentryFirstDay, catchUp?: ReentryCatchUp): string {
  return `Van ${formatWeekdayDateNL(week.from)} tot en met ${formatWeekdayDateNL(week.until)} duren je trainingen ${share(week.factor)} van de gewone tijd.${forgeDays !== undefined ? ` ${reentryForgeLine(forgeDays)}` : ''}${firstDay ? ` ${reentryFirstDayLine(firstDay)}` : ''}${catchUp ? ` ${reentryCatchUpLine(catchUp)}` : ''} Daarna gaat je schema gewoon verder.`;
}

// Een dag met alleen herstel na een lange pauze: Vandaag zegt eerlijk hoe lang je niet trainde, in plaats van "je
// lichaam bouwt op wat je deze week deed" (I-144). N is afgeleid: dagen sinds je laatste echte training (geen herstel)
// voor vandaag. Alleen tekst; het plan verandert er niet door (dat doet alleen het voorstel met Akkoord).
export function pauseRestDayLine(input: {
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  today: string;
  // Op een vakantie- of tochtdag en tijdens Weer opbouwen na ziekte niet: die dagen hebben hun eigen kaart.
  leave?: LeavePeriod[];
  illness?: IllnessEpisode[];
  // De rustdag zonder beweging (rest) of met licht bewegen (active).
  mode?: 'rest' | 'active';
}): string | undefined {
  if (dayRules({ today: input.today, leave: input.leave, illness: input.illness }).holds(input.today, 'off', 'trek', 'ramp', 'ill', 'ill_light')) return undefined;
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const last = realTrainingDates(input.logs, byId).filter((d) => d < input.today).at(-1);
  if (!last) return undefined;
  const n = daysBetween(last, input.today);
  if (n <= REENTRY_PAUSE_DAYS) return undefined;
  const walk = input.mode === 'active' ? 'wandel een half uur, en ' : '';
  return `Je trainde ${n} dagen niet. Vandaag rustig beginnen: ${walk}houd je eerste training korter dan gewoon.`;
}

// Een instap terugzetten (Aangepast door ASCEND in Week) is zelf een wijziging: een eigen regel in het logboek van
// wijzigingen, zodat Ongedaan maken in de melding daarnaar verwijst (revertsProposalId) en het logboek beide toont.
export const REENTRY_UNDONE_TITLE = 'Rustiger instap teruggezet';
export const REENTRY_UNDONE_LINE = 'Je trainingen hebben weer hun gewone duur.';

export function reentryUndoneRecord(id: string, week: ReentryWeek, at: string): PlanChangeProposal {
  return {
    id,
    trigger: 'reentry_planned',
    issue: REENTRY_UNDONE_TITLE,
    changes: [],
    alternatives: [],
    consequences: `${REENTRY_UNDONE_LINE} De instap van ${formatWeekdayDateNL(week.from)} tot en met ${formatWeekdayDateNL(week.until)} is weg.`,
    explanation: 'Door jou teruggezet in Aangepast door ASCEND.',
    createdAt: at,
    resolvedAt: at,
    resolution: 'accepted',
  };
}

// De instap die vandaag loopt, als je er Akkoord op gaf: de kaart Weer opbouwen op Vandaag zegt het dan.
export function activeReentry(weeks: unknown, today: string): ReentryWeek | undefined {
  return reentryAdjustments(weeks).find((w) => w.from <= today && w.until >= today);
}

// "Rustiger instap tot en met zo 13 december: je trainingen duren driekwart van de gewone tijd."
export function reentryTodayLine(week: ReentryWeek): string {
  return `Rustiger instap tot en met ${formatWeekdayDateNL(week.until)}: je trainingen duren ${share(week.factor)} van de gewone tijd. Daarna gaat je schema gewoon verder.`;
}
