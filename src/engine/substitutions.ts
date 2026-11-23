import type { SessionTemplate, ExercisePrescription, SessionVariant } from '../models/training';
import { scaledMinutes, trainingKindOf } from './trainingKind';
import type { KindAmountMap } from '../data/trainingKinds';
import type { Program } from '../models/program';
import { ambitionFactor, type Ambition } from './ambitionLevels';
import { addDays } from '../utils/dates';
import { PHASE_GOLF_START, progressionTarget, readRunBuild, START_STAND_INS } from './programLayout';
import { START_PLANNED_MINUTES } from '../data/beginnerLadder';
import { daysBetween, isoWeekday, mondayOfWeek } from '../utils/dates';
import { longRunCapAfterRace } from './runGrowth';
import { idHasRole } from './templateRoles';
import { applyStartLadder, lastRung, startLadderMinutes, walkJogMinutes } from './beginnerPlan';
import type { StartBuild } from './beginnerStart';

// "Short" keeps core + accessory work, drops optional. "Minimum" keeps only
// core work — the smallest version of the session that still counts.
export function exercisesForVariant(template: SessionTemplate, variant: SessionVariant): ExercisePrescription[] {
  if (!template.exercises) return [];
  if (variant === 'full' || variant === 'custom') return template.exercises;
  if (variant === 'short') return template.exercises.filter((e) => e.priority !== 'optional');
  return template.exercises.filter((e) => e.priority === 'core');
}

// Predicted full minutes for trainings without a week-by-week target
// (strength): the user's own estimate, or what ASCEND learned from the logs
// (engine/durationLearning.ts). Set by state/AppDataContext on every
// refresh; empty by default, so every pure test sees the template value.
let learnedDurations: Record<string, number> = {};
export function setLearnedDurations(durations: Record<string, number>): void {
  learnedDurations = durations;
}

function fullDuration(template: SessionTemplate): number {
  return learnedDurations[template.id] ?? template.durationVariants.full;
}

export function durationForVariant(template: SessionTemplate, variant: SessionVariant): number {
  const full = fullDuration(template);
  if (variant === 'short') return Math.min(full, template.durationVariants.short ?? full);
  if (variant === 'minimum') return Math.min(full, template.durationVariants.minimum ?? template.durationVariants.short ?? full);
  return full;
}

// Week-by-week targets (SessionTemplate.weeklyProgression) are resolved in
// engine/programLayout.ts#progressionTarget: the 4-week wave, the growth
// per cycle, phase-specific steps and the taper.

// Some templates (Easy Run, Bergconditie) target a different duration each
// week of the training block instead of one fixed number — see
// SessionTemplate.weeklyProgression. This resolves the *actual* target for
// one specific scheduled date, falling back to the static duration when no
// program/week match is available. Only affects the 'full' variant; short
// and minimum fallbacks stay fixed regardless of week.
// Temporary volume adjustments by date, e.g. building back after illness
// (docs/onderzoek: return at ~70-80% of the usual volume). Set from the
// user's illness history by state/AppDataContext on every refresh; empty
// by default, so every pure test sees the plain duration.
export interface DurationAdjustment {
  from: string;
  until: string;
  factor: number;
}
let durationAdjustments: DurationAdjustment[] = [];
export function setDurationAdjustments(adjustments: DurationAdjustment[]): void {
  durationAdjustments = adjustments;
}

// The longest logged minutes per template in the last 30 days, set from
// the logs by state/AppDataContext on every refresh. A session shown in the
// next two weeks never asks for more than 110% of that (docs/onderzoek
// rapport 1: a session more than 10% above the 30-day longest raises the
// injury risk, HRR 1.64; rapport 2, rule E3). Weeks further out keep their
// planned number: by then there will be newer logs to measure against.
// Empty by default, so every pure test sees the plain duration.
export interface RecentSessionMaxima {
  asOf: string;
  minutesByTemplate: Record<string, number>;
  // A race in the last week: the long run toward the days after it is at most half the race
  // (engine/runGrowth.ts#longRunCapAfterRace). The race itself never counts as the reference above.
  afterRace?: { date: string; durationMinutes: number }[];
  // De beginnersstart (engine/programLayout.ts#START_STAND_INS): het langste wandelen en dribbelen in 30 dagen, onder
  // de loop waarvan het de plek had. De eerste rustige en lange duurloop na de start meten daaraan, niet aan niets:
  // wie in week 4 op 45 minuten zat groeit vanaf 45, wie een week oversloeg vanaf wat hij echt deed.
  fromStart?: Record<string, number>;
}
let recentMaxima: RecentSessionMaxima = { asOf: '', minutesByTemplate: {} };
export function setRecentSessionMaxima(maxima: RecentSessionMaxima): void {
  recentMaxima = maxima;
}
const SESSION_SPIKE_LIMIT = 1.1;
const LONG_RUN_ID = 'tpl_long_run';
const SPIKE_CAP_DAYS = 13;

// `raceDates`: the dates of running goals. A run logged on such a date is the race too, also when it
// was logged under another template (a watch activity on race day); strength never is.
export function recentSessionMaxima(
  logs: { templateId: string; completedDate: string; durationMinutes: number; type?: string; sport?: string }[],
  asOf: string,
  raceDates?: ReadonlySet<string>,
): RecentSessionMaxima {
  const from = addDays(asOf, -30);
  const minutesByTemplate: Record<string, number> = {};
  const afterRace: { date: string; durationMinutes: number }[] = [];
  const fromStart: Record<string, number> = {};
  for (const l of logs) {
    if (l.completedDate < from || l.completedDate > asOf || !(l.durationMinutes > 0)) continue;
    // A race is not the longest run to measure the next one against: it was run at race pace.
    const onRaceDay = !!raceDates?.has(l.completedDate) && l.type !== 'strength' && (l.sport === undefined || l.sport === 'running');
    if (idHasRole(l.templateId, 'race') || onRaceDay) {
      afterRace.push({ date: l.completedDate, durationMinutes: l.durationMinutes });
      continue;
    }
    minutesByTemplate[l.templateId] = Math.max(minutesByTemplate[l.templateId] ?? 0, l.durationMinutes);
    const standsFor = START_STAND_INS[l.templateId];
    if (standsFor) fromStart[standsFor] = Math.max(fromStart[standsFor] ?? 0, l.durationMinutes);
  }
  return { asOf, minutesByTemplate, ...(afterRace.length > 0 ? { afterRace } : {}), ...(Object.keys(fromStart).length > 0 ? { fromStart } : {}) };
}

// De opbouw van de start (engine/beginnerStart.ts#resolveStartBuild): de ladder van heel licht in de start
// (engine/beginnerPlan.ts), en voor de rem na de start zonder logs wat er in de laatste week van de start op de plek
// van deze loop stond. Ongezet is het Gewoon, zoals de instelling zonder veld; de app zet het uit je instelling, een
// voorstel uit het voorstel.
let startBuild: StartBuild = 'gewoon';
export function setStartBuild(build: StartBuild): void {
  startBuild = build;
}

// Eén stap van de rem na de start: 110% op 5 minuten, en minstens 5 minuten erbij (110% van 20 is afgerond weer 20).
const afterStartStep = (minutes: number, limit = SESSION_SPIKE_LIMIT) => Math.max(Math.round((minutes * limit) / 5) * 5, Math.round(minutes / 5) * 5 + 5);

// Zonder log dat meetelt (geen log, of een dag verder dan de rem van een log reikt): het plan zelf als maat. Wat de
// laatste week van de start op deze plek plande, en daarna elke week één stap erbij, tot het plan het niet meer
// raakt (Warden, 15 november). Anders vraagt week 5 het volle plan na een start die je niet logde of oversloeg, en
// een vaste maat voor 30 dagen schuift die sprong alleen op. Alleen voor de lopen die wandelen en dribbelen in de
// start vervangt; een plan zonder beginnersstart (A en C) raakt het niet.
function plannedAfterStart(template: SessionTemplate, scheduledDate: string, program: Program | null | undefined, limit: number): number | undefined {
  if (!program || !Object.values(START_STAND_INS).includes(template.id)) return undefined;
  let weeksBefore = 0;
  for (const phase of program.phases) {
    if (phase.id !== PHASE_GOLF_START) { weeksBefore += phase.weekCount; continue; }
    const end = addDays(mondayOfWeek(program.startDate), (weeksBefore + phase.weekCount) * 7);
    if (scheduledDate < end) return undefined;
    // Heel licht met de ladder: de laatste trede (35 en 45); heel licht van voor de ladder: wandelen en dribbelen zoals
    // gepland (20 en 30); Gewoon: de eigen loop, op dezelfde dag van de laatste startweek.
    const last = startBuild === 'ladder'
      ? walkJogMinutes(template.id, lastRung())
      : startBuild === 'licht' ? START_PLANNED_MINUTES[template.id] : progressionTarget(template, program, addDays(end, isoWeekday(scheduledDate) - 8))?.minutes;
    if (!last) return undefined;
    let cap = last;
    for (let week = Math.floor(daysBetween(end, mondayOfWeek(scheduledDate)) / 7); week >= 0; week--) cap = afterStartStep(cap, limit);
    return cap;
  }
  return undefined;
}

// Hoeveel per soort (engine/kindAmount.ts): Minder or Meer per kind of training, set on every refresh like
// the registries above. Empty: every session as planned.
let kindAmounts: KindAmountMap = {};
export function setKindAmounts(map: KindAmountMap | undefined): void {
  kindAmounts = map ?? {};
}

// The ambition in force (engine/ambition.ts#effectiveAmbition), set on every
// refresh like the registries above.
let currentAmbition: Ambition = 'standaard';
export function setAmbition(ambition: Ambition): void {
  currentAmbition = ambition;
}

// The duration registers as they would be with a change that is not stored
// yet (the preview of a proposal, storage/horizonPlan.ts). Never set on the
// module for longer than one synchronous call: `withDurationScope` swaps them
// in, runs `fn`, and puts them back before anything else can run. So no other
// reader (Vandaag, Week, the watch sync, loadState) ever sees a value you did
// not accept (Warden Planning punt 3).
export interface DurationScope {
  ambition?: Ambition;
  durationAdjustments?: DurationAdjustment[];
  learnedDurations?: Record<string, number>;
  kindAmounts?: KindAmountMap;
  // De opbouw van de start (setStartBuild), zoals de wijziging hem zou zetten.
  startBuild?: StartBuild;
  // Leg strength and a hard run on one day (engine/scheduler.ts#withHardSameDay); read by the planning run of a preview.
  hardSameDay?: boolean;
  // Leg strength the day after the long run (engine/scheduler.ts#withLongRunThenLegs), the same way.
  longRunThenLegs?: boolean;
  // Rest before a test in hours (engine/scheduler.ts#withTestRestHours), the same way: the race block reads it.
  testRest?: 48 | 72;
}

export function withDurationScope<T>(scope: DurationScope | undefined, fn: () => T): T {
  if (!scope) return fn();
  const saved = { ambition: currentAmbition, adjustments: durationAdjustments, learned: learnedDurations, kinds: kindAmounts, build: startBuild };
  if (scope.startBuild !== undefined) startBuild = scope.startBuild;
  if (scope.ambition !== undefined) currentAmbition = scope.ambition;
  if (scope.durationAdjustments !== undefined) durationAdjustments = scope.durationAdjustments;
  if (scope.learnedDurations !== undefined) learnedDurations = scope.learnedDurations;
  if (scope.kindAmounts !== undefined) kindAmounts = scope.kindAmounts;
  try {
    const out = fn();
    // An async callback would read the registers after they are put back.
    if (out && typeof (out as { then?: unknown }).then === 'function') throw new Error('withDurationScope: alleen een synchrone functie');
    return out;
  } finally {
    currentAmbition = saved.ambition;
    durationAdjustments = saved.adjustments;
    learnedDurations = saved.learned;
    kindAmounts = saved.kinds;
    startBuild = saved.build;
  }
}

// Sessions with a fixed length of their own (PlannedSession.plannedMinutes),
// by template and date. Set from the planned sessions on every refresh,
// like the registries above, so every screen shows the same minutes.
let fixedMinutes = new Map<string, number>();
export function setFixedSessionMinutes(sessions: { templateId: string; scheduledDate: string; plannedMinutes?: number; status?: string }[]): void {
  fixedMinutes = new Map(sessions.filter((s) => s.plannedMinutes && s.status !== 'skipped').map((s) => [`${s.templateId}|${s.scheduledDate}`, s.plannedMinutes!]));
}

export function resolveEffectiveFullDuration(
  template: SessionTemplate,
  scheduledDate: string,
  program: Program | null | undefined,
): number {
  const target = progressionTarget(template, program, scheduledDate);
  const fixed = fixedMinutes.get(`${template.id}|${scheduledDate}`);
  let base = fixed ?? target?.minutes ?? fullDuration(template);
  // Ambition (engine/ambition.ts): only on a session that follows the
  // build-up, rounded to 5 minutes; the 110% cap below still applies.
  if (!fixed && target && currentAmbition !== 'standaard') {
    base = Math.max(15, Math.round((base * ambitionFactor(currentAmbition, /rust/i.test(target.step.note ?? ''))) / 5) * 5);
  }
  // De ladder van heel licht in de beginnersstart (engine/beginnerPlan.ts): wandelen en dribbelen krijgt de minuten
  // van die week, kracht en de Herstelwandeling hoogstens zoveel. Een eigen lengte wint.
  if (!fixed) base = applyStartLadder(base, startLadderMinutes(template, scheduledDate, program, startBuild));
  const own = recentMaxima.minutesByTemplate[template.id];
  const start = recentMaxima.fromStart?.[template.id];
  const logged = Math.max(own ?? 0, start ?? 0) || undefined;
  const longest = logged;
  // Na de beginnersstart, zolang de start in de laatste 30 dagen ligt: geen bodem van de eerste week hieronder. Ook
  // niet als je eigen eerste loop na de start langer was, anders springt de week erna naar die bodem (35 naar 50).
  const afterStart = start !== undefined;
  // Een log meet alleen de komende twee weken.
  const inWindow = scheduledDate >= recentMaxima.asOf && scheduledDate <= addDays(recentMaxima.asOf, SPIKE_CAP_DAYS);
  // Hoeveel per soort: 15 procent korter of langer, rounded to 5 minutes. A session without a build-up
  // (strength) is held to 110% of its longest in 30 days here; one with a build-up by the cap below.
  const kind = fixed ? undefined : trainingKindOf(template);
  const amount = kind ? kindAmounts[kind] : undefined;
  if (amount) base = scaledMinutes(base, amount, !target && logged ? Math.round((logged * SESSION_SPIKE_LIMIT) / 5) * 5 : undefined);
  // Only the setting "Sneller dan het onderzoek" (Program.runBuild.spikeLimit) lifts the 110% of the long run.
  const limit = template.id === LONG_RUN_ID ? readRunBuild(program?.runBuild)?.spikeLimit ?? SESSION_SPIKE_LIMIT : SESSION_SPIKE_LIMIT;
  // De maat van het plan na de beginnersstart (plannedAfterStart): de rem zonder log, en de bovengrens van de bodem
  // hieronder naast een eigen log.
  const planned = !fixed && target ? plannedAfterStart(template, scheduledDate, program, limit) : undefined;
  if (!fixed && target && longest && inWindow) {
    // Never below the first "Wennen" step: one short session must not pull
    // the whole build down. Na de start nooit boven de maat van het plan: wie de start niet logde en in week 5 zijn
    // eerste eigen loop deed, springt anders van 35 naar die bodem (Warden, 15 november).
    const wennen = (target.phaseSteps.find((s) => s.weekInPhase === 1) ?? target.step).targetMinutes;
    const floor = afterStart ? 0 : Math.min(wennen, planned ?? wennen);
    // Na de start minstens 5 minuten erbij: 110% van 20 is op 5 minuten afgerond weer 20, en dan groeit hij nooit.
    // Op zo'n kleine basis zeggen de minuten meer dan het percentage (docs/onderzoek/Wandelen en dribbelen voor
    // beginners.md, punt 6). Vanaf 25 minuten is dat dezelfde stap als 110%.
    const cap = Math.max(floor, afterStart ? afterStartStep(longest, limit) : Math.round((longest * limit) / 5) * 5);
    base = Math.min(base, cap);
  } else if (planned !== undefined) {
    base = Math.min(base, planned);
  }
  // The first week after a race: the long run is at most half the race.
  if (!fixed && target && template.id === LONG_RUN_ID) {
    for (const race of recentMaxima.afterRace ?? []) {
      const cap = longRunCapAfterRace({ completedDate: race.date, durationMinutes: race.durationMinutes }, scheduledDate);
      if (cap !== undefined) base = Math.min(base, cap);
    }
  }
  const adjustment = durationAdjustments.find((a) => scheduledDate >= a.from && scheduledDate <= a.until);
  if (!adjustment) return base;
  // Rounded to whole 5 minutes, never below 15.
  return Math.max(15, Math.round((base * adjustment.factor) / 5) * 5);
}

// De geplande minuten van een training zoals Week ze toont (I-14, docs/visie/Ontwerp Eén plan.md, "één duur"): de
// vaste lengte van de rij (PlannedSession.plannedMinutes), anders de volle duur met ambitie, hoeveel per soort, de rem
// van 110% en een rustiger instap. Een tekst die minuten van een geplande training noemt, leest ze hier; nooit de kale
// stap van het schema (programLayout.ts#progressionTarget). Een rij die er nog niet is (een latere week) geef je als
// alleen de datum mee.
export function plannedMinutesOf(
  session: { scheduledDate: string; plannedMinutes?: number },
  template: SessionTemplate,
  program: Program | null | undefined,
): number {
  return session.plannedMinutes ?? resolveEffectiveFullDuration(template, session.scheduledDate, program);
}

// Shared by ExerciseLogger (variant picker) and the quick-complete flow
// (Settings → Krachttraining) so both resolve a variant's duration the same
// way: 'full' follows weeklyProgression when present, short/minimum are
// always the static fallback durations.
export function resolveVariantDuration(
  template: SessionTemplate,
  variant: SessionVariant,
  scheduledDate: string,
  program: Program | null | undefined,
): number {
  if (variant === 'full') return resolveEffectiveFullDuration(template, scheduledDate, program);
  return durationForVariant(template, variant);
}

// De notitie van de week zonder het bereik in minuten: dat bereik is de vaste tekst van de stap ("Rustweek (35-45 min)"),
// terwijl de minuten ernaast per golf groeien (programLayout.ts#genericTarget) en door ambitie, hoeveel per soort, de rem
// van 110% of een rustiger instap bewegen. Naast "55 min" sprak "35-45 min" dat tegen (I-80); het getal van de dag is
// de minuten zelf. "Rustweek (35-45 min, D+ ook lager)" wordt "Rustweek, D+ ook lager".
export function withoutMinuteRange(note: string): string {
  return note.replace(/\s*\(\d+\s*-\s*\d+ min(?:, ([^)]*))?\)/g, (_m, rest: string | undefined) => (rest ? `, ${rest}` : '')).trim();
}

export function weeklyProgressionNote(
  template: SessionTemplate,
  scheduledDate: string,
  program: Program | null | undefined,
): string | undefined {
  const note = progressionTarget(template, program, scheduledDate)?.step.note;
  return note ? withoutMinuteRange(note) || undefined : note;
}

// Short/minimum variants trim the exercise list — meaningful only for
// strength sessions. Cardio/hiking sessions have no exercise list to trim,
// so "short" there was just a duration preset with an otherwise identical
// screen; only "full" is offered for those, and the duration field stays
// freely editable.
//
// Parked for now (production feedback: "doe korte sessie weg, dat is nu
// niet nodig"): only the full session is offered anywhere in the UI. The
// variant data, exercise trimming and progression handling all stay in
// place; flipping this back on restores the short/minimum buttons. See
// BACKLOG.md.
const SESSION_VARIANTS_ENABLED = false;

export function availableVariants(template: SessionTemplate): SessionVariant[] {
  const variants: SessionVariant[] = ['full'];
  if (!SESSION_VARIANTS_ENABLED || template.type !== 'strength') return variants;
  if (template.durationVariants.short) variants.push('short');
  if (template.durationVariants.minimum) variants.push('minimum');
  return variants;
}
