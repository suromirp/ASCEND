// De planningsronde: het programma naar de doeldatum.

import { withHardSameDay, withLongRunThenLegs, withTestRestHours } from '../engine/scheduler';
import type { Program } from '../models/program';
import type { SessionTemplate, PlannedSession, SessionLog } from '../models/training';
import type { TrainingGoal, GoalMilestone } from '../models/goals';
import { addDays, formatDateNL, mondayOfWeek, resolveProgramWeek, todayISO, weekdayShortNL } from '../utils/dates';
import { activeSwaps, directionSwaps, layoutPhases, patternForWeek, PHASE_GOLF, planEndDay, programEndDate, templateForPhase, type PatternSwap, type PhaseLengthOverrides } from '../engine/programLayout';
import { planDirection } from '../engine/direction';
import { withCountingSports } from '../engine/sportTemplate';
import { parseKindAmounts } from '../engine/kindAmount';
import { programDirection } from '../engine/directionPlan';
import { BEGINNER_WEEKS, isBeginnerStart } from '../engine/beginnerStart';
import { resolveWaveSettings } from '../engine/waves';
import { countOptions } from '../engine/yourWeek';
import { DEFAULT_ENABLED_SPORTS, isSportEnabled, isTemplatePlannable, parseWeekShape, weeklyPatternTemplates } from '../engine/sports';
import { arrangeWeekForRestDay } from '../engine/restDay';
import { describeRepair, lockLevel, visibleRepair, type Finding } from '../engine/weekValidator';
import { patternDays, planPass } from '../engine/planPass';
import { resolveVariantDuration, withDurationScope, type DurationScope } from '../engine/substitutions';
import { raceBlocks, afterGoalWindows, revivePrescriptionRemovedTests } from '../engine/raceBlock';
import { strayTrekRows } from '../engine/leaveStrays';
import { relayoutForRestDay } from '../engine/restDayProposal';
import { TENT_PACK_KG, packMilestoneUpdate, packWeightOf, programPackGoal, programPackTarget } from '../engine/gr5Profile';
import { makeId } from '../utils/id';
import { mainGoal } from '../engine/mainGoal';
import { programRunBuild } from '../engine/runGrowth';
import { SettingsRepo, type AppSettings } from './databaseSettings';
import { TrainingGoalsRepo, GoalMilestonesRepo, SessionLogsRepo, GoalMilestoneProgressRepo, ProgramsRepo, PlannedSessionsRepo, SessionTemplatesRepo, PlanChangeProposalsRepo, MetaRepo, GoalEngineConfigRepo, replacePlannedSessions, withDerivedWeek } from './databaseRepos';

// --- the program toward the goal date (Fase 3) --------------------------

interface PatternContext {
  pattern: SessionTemplate[];
  swaps: PatternSwap[];
  anchor: string | undefined;
  overrides: PhaseLengthOverrides | undefined;
  // The main goal's rucksack target, for Program.packTargetKg.
  packTarget: number | undefined;
  // The next running race of a Top or Voortop goal, for Program.runBuild (engine/runGrowth.ts).
  runBuild: Program['runBuild'];
  // Zonder doel: neutrale golven, en de richting als je er een koos (engine/direction.ts#planDirection).
  free: boolean;
  waveStart: string | undefined;
  beginnerWeeks: number;
  wave: { length: number; light: boolean } | undefined;
  direction: Program['direction'];
}

// The program with the pack target of its main goal (or without, when the
// goal has none): the pack ladder reads it from the program.
export function withPackTarget(program: Program, kg: number | undefined, runBuild?: Program['runBuild'], direction?: Program['direction']): Program {
  const { packTargetKg: _old, runBuild: _oldBuild, direction: _oldDirection, ...rest } = program;
  void _old;
  void _oldBuild;
  void _oldDirection;
  return { ...rest, ...(kg === undefined ? {} : { packTargetKg: kg }), ...(runBuild ? { runBuild } : {}), ...(direction ? { direction } : {}) };
}

// What a rebuilt week looks like for this user: their sports, the hike
// swaps they allow, and the goal date nothing may be planned on or after.
// `given`: settings and goals as they would be (the preview of a change, before
// anything is stored); without it, as stored.
// The default weekly pattern for the two places that lay out the default
// schedule on their own (a new content version, "Schema opnieuw laden"): the
// templates with a usual weekday, as before. Once you chose the shape of your
// week at the start (AppSettings.weekShape) the pattern is the one of
// weeklyPatternTemplates, so these never bring back the days you left out.
export async function defaultPatternSelector(): Promise<((templates: SessionTemplate[]) => SessionTemplate[]) | undefined> {
  const weekShape = parseWeekShape((await SettingsRepo.get()).weekShape);
  return weekShape ? undefined : (all) => all.filter((t) => t.defaultDayOfWeek);
}

export async function patternContext(
  templates: SessionTemplate[],
  selectPattern?: (templates: SessionTemplate[]) => SessionTemplate[],
  given?: { settings: AppSettings; goals: TrainingGoal[]; milestones: GoalMilestone[] },
  // Het plan zoals het nu staat: een plan dat nog niet in golven loopt blijft zonder Akkoord zoals het is
  // (engine/noGoalWaves.ts#wavesHeld).
  current?: Pick<Program, 'phases'> | null,
): Promise<PatternContext> {
  const [settings, goals, milestones] = given ? [given.settings, given.goals, given.milestones] : await Promise.all([SettingsRepo.get(), TrainingGoalsRepo.getAll(), GoalMilestonesRepo.getAll()]);
  const enabledSports = { ...DEFAULT_ENABLED_SPORTS, ...settings.enabledSports };
  const pattern = arrangeWeekForRestDay(selectPattern ? selectPattern(templates) : weeklyPatternTemplates(templates, { ...settings, enabledSports }), templates, settings.restDay, parseWeekShape(settings.weekShape)?.allowed);
  // The plan ends on the main goal's day, also during and after it.
  const anchor = planEndDay(goals, milestones, todayISO(), settings.afterMainGoal);
  // Zonder doel neutrale golven: geen bergtocht, geen wandeldag, geen rugzak (docs/visie/Zonder doel.md, 3.2).
  const plan = planDirection(settings, goals, new Set(milestones.map((m) => m.goalId)), todayISO(), anchor, current);
  const byId = new Map(templates.map((t) => [t.id, t]));
  const logs = plan.direction ? await SessionLogsRepo.getAll() : [];
  // De beginnersstart (engine/beginnerStart.ts): vier weken zonder harde training vanaf de start van je richting.
  const beginner = !!plan.direction && isBeginnerStart(settings.beginnerStart, logs, plan.waveStart);
  const freeSwaps = directionSwaps(plan.direction, beginner).filter((s) => { const to = byId.get(s.to); return !!to && isTemplatePlannable(to, enabledSports); });
  // De minuten van je richting over de week verdeeld (engine/directionPlan.ts): het weekbudget en wat
  // het patroon gewoon telt, met de wissels van de richting erin.
  const direction = plan.direction
    ? programDirection({
        id: plan.direction.id, settings, logs, today: todayISO(),
        pattern: patternForWeek(pattern, templates, freeSwaps, PHASE_GOLF).map((s) => s.template),
        countOptions: countOptions(settings, templates, undefined),
      })
    : undefined;
  return {
    pattern,
    // A hike only replaces a session when the caller's pattern would plan
    // it too (hike templates have no weekday of their own, hence the probe).
    swaps: plan.free
      ? freeSwaps
      : activeSwaps(templates, settings, (t) => isTemplatePlannable(t, enabledSports) && (!selectPattern || selectPattern([{ ...t, defaultDayOfWeek: 7 }]).length > 0)),
    anchor,
    free: plan.free,
    waveStart: plan.waveStart,
    beginnerWeeks: beginner ? BEGINNER_WEEKS : 0,
    // De golf met jouw instelling Golven; Rustig aan heeft geen golf en dus geen lichte week.
    wave: plan.direction ? (plan.direction.id === 'easy' ? { length: 4, light: false } : { length: resolveWaveSettings(settings.waves).length, light: resolveWaveSettings(settings.waves).lightWeek }) : undefined,
    direction,
    overrides: settings.programPhaseOverrides,
    packTarget: programPackTarget(goals, milestones),
    runBuild: programRunBuild(goals, mainGoal(goals, new Set(milestones.map((m) => m.goalId)))?.id, todayISO(), settings.longRunGrowth),
  };
}

// The weekly pattern laid over every program week, from `from` on and
// before `until` (the goal day itself stays free).
export function patternSessions(
  program: Program,
  templates: SessionTemplate[],
  pattern: SessionTemplate[],
  swaps: PatternSwap[],
  opts: { from: string; until?: string; skipWeek?: (weekStart: string) => boolean; skipSlot?: (templateId: string, date: string) => boolean },
): PlannedSession[] {
  const totalWeeks = program.phases.reduce((sum, p) => sum + p.weekCount, 0);
  const out: PlannedSession[] = [];
  for (let week = 0; week < totalWeeks; week++) {
    const weekStart = addDays(mondayOfWeek(program.startDate), week * 7);
    if (opts.skipWeek?.(weekStart)) continue;
    const phaseId = resolveProgramWeek(program, weekStart)?.phase.id;
    patternForWeek(pattern, templates, swaps, phaseId).forEach(({ template, dayOfWeek }, order) => {
      const date = addDays(weekStart, dayOfWeek - 1);
      if (date < opts.from || (opts.until && date >= opts.until) || opts.skipSlot?.(template.id, date)) return;
      out.push({ id: makeId('planned'), templateId: template.id, scheduledDate: date, weekStartDate: weekStart, status: 'planned', order });
    });
  }
  return out;
}

// Mijlpaal 11 (de volle rugzaktocht) vraagt het rugzakdoel van het doel. Zet
// je dat doel op een ander gewicht, dan gaat de eis mee. Wat je al behaalde
// blijft behaald (engine/gr5Profile.ts#keepClearedMilestones); alleen
// toevoegen of de mijlpaal zelf bijwerken, nooit een behaalde rij aanraken.
async function syncPackMilestone(goals: TrainingGoal[], milestones: GoalMilestone[], logs: SessionLog[]): Promise<void> {
  const goal = programPackGoal(goals, milestones);
  if (!goal) return;
  const update = packMilestoneUpdate(milestones, await GoalMilestoneProgressRepo.byGoal(goal.id), logs, goal.id, packWeightOf(goal.requirements) ?? TENT_PACK_KG);
  if (!update) return;
  for (const row of update.keep) await GoalMilestoneProgressRepo.put(row);
  await GoalMilestonesRepo.put(update.milestone);
}

export interface ProgramHorizonResult {
  phasesChanged: boolean;
  added: number;
  swapped: number;
  removed: number;
  // What the week check put right, and what the sync itself changed in a
  // session that was already stored (a long run that becomes a mountain hike,
  // a session after the goal day that goes), for the notice "Planning
  // bijgewerkt": nothing changes on the plan without being said.
  // before: those sessions just before the check (what undo of the check
  // alone puts back); stored: as they were stored before this run (what
  // undo of the action that caused the run puts back).
  // addedIds: sessions the run put on the plan itself (a walk on a trek day):
  // undo takes those off again.
  repairs?: { lines: string[]; before: PlannedSession[]; stored: PlannedSession[]; addedIds?: string[] };
  // Every row this run wrote or took off the plan, said or not (the race block, WEEK-START, a test revived, the rest
  // day laid out again, a stray tochtdag): the notice of your last change reads them again, so its undo is not
  // refused because the planning moved on (engine/undoGuard.ts#refreshWritten). Per row how it was before this run
  // (null: there was none) and how the run left it (null: taken off), so a row another writer changed first is never
  // taken over.
  touched?: { id: string; before: PlannedSession | null; after: PlannedSession | null }[];
}

// A change that is not stored yet: the planning run as it would be with it
// (the preview of a proposal with Akkoord, Warden Logica punten 1 en 2).
export interface HorizonOverrides {
  // Settings as they would be (merged over the stored ones).
  settings?: Partial<AppSettings>;
  // Goals as they would be: these rows replace the stored ones with the same id.
  goals?: TrainingGoal[];
  // The plan to start from instead of the stored one (a proposal of its own
  // applied first, like a sport switched off).
  sessions?: PlannedSession[];
  // A proposal shows it: a test or race the system planned on or after the
  // new goal day may go too. Without it (the sync on its own) it stays.
  releaseAnchors?: boolean;
  // The duration registers as they would be with these settings (another
  // ambition): only for the one synchronous planning pass, never on the
  // module (engine/substitutions.ts#withDurationScope).
  registers?: DurationScope;
  // The program as it would be (a rest week trained through, a week repeated,
  // engine/weekLoadChange.ts). Only for a preview; Akkoord stores it first.
  program?: Program;
  // The ladder of a goal that is not stored yet (the first plan): added to the
  // stored milestones, so the preview knows which goal is the main one.
  milestones?: GoalMilestone[];
}

export interface HorizonRun {
  result: ProgramHorizonResult;
  // The plan the run started from, and the plan after it.
  before: PlannedSession[];
  after: PlannedSession[];
  program: Program | null;
  // The day the plan ends (the main goal's day), as the run used it.
  anchor?: string;
  // What the week check found and could not put right (Week opnieuw plannen weighs a test's day by it).
  remaining?: Finding[];
}

const dayNL = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;

// Keeps the stored program in line with the main goal's date, on every
// boot and whenever a goal or the related settings change:
// - the phases are counted back from the goal date (taper right before it),
// - weeks of the program that have no sessions at all get the weekly
//   pattern (so there is never an empty week before the goal),
// - planned, unlogged sessions from today on follow their week's phase
//   (long run becomes a mountain hike from Bergcapaciteit on, and back),
// - nothing unlogged stays planned on or after the goal day.
// History is never touched: logged sessions and past days stay as they are.
// What you placed or moved yourself, or an accepted proposal fixed
// (weekValidator.ts#lockLevel 1), is never changed or removed here; a test or
// race only through a proposal. What it does change in a stored session is
// said in the notice. Changing a goal or a setting that moves the plan is a
// proposal first (previewProgramHorizon), so normally the run after it finds
// nothing left to do.
// Idempotent: a second run changes nothing.
export async function syncProgramHorizon(overrides: Pick<HorizonOverrides, 'releaseAnchors'> = {}): Promise<ProgramHorizonResult> {
  return (await runProgramHorizon(false, overrides)).result;
}

// The same run in memory: what the plan would look like with a change that is
// not stored yet. Writes nothing.
export async function previewProgramHorizon(overrides: HorizonOverrides = {}): Promise<HorizonRun> {
  return runProgramHorizon(true, { releaseAnchors: true, ...overrides });
}

async function runProgramHorizon(dryRun: boolean, overrides: HorizonOverrides): Promise<HorizonRun> {
  const [programs, storedSessions, logs, templates, storedSettings, storedGoals, storedMilestones] = await Promise.all([
    ProgramsRepo.getAll(),
    PlannedSessionsRepo.getAll(),
    SessionLogsRepo.getAll(),
    SessionTemplatesRepo.getAll(),
    SettingsRepo.get(),
    TrainingGoalsRepo.getAll(),
    GoalMilestonesRepo.getAll(),
  ]);
  const milestones = overrides.milestones ? [...storedMilestones, ...overrides.milestones.filter((m) => !storedMilestones.some((s) => s.id === m.id))] : storedMilestones;
  const sessions = [...(overrides.sessions ?? storedSessions)];
  const startedFrom = [...sessions];
  const storedById = new Map(storedSessions.map((s) => [s.id, s]));
  const program = overrides.program ?? programs[0];
  if (!program) return { result: { phasesChanged: false, added: 0, swapped: 0, removed: 0 }, before: startedFrom, after: startedFrom, program: null };
  // What this run wrote (the row) or took off (null), by id.
  const touched = new Map<string, PlannedSession | null>();
  const settings: AppSettings = overrides.settings ? { ...storedSettings, ...overrides.settings } : storedSettings;
  const replaced = new Map((overrides.goals ?? []).map((g) => [g.id, g]));
  const goals = [...storedGoals.map((g) => replaced.get(g.id) ?? g), ...[...replaced.values()].filter((g) => !storedGoals.some((s) => s.id === g.id))];
  const today = todayISO();
  const ctx = await patternContext(templates, undefined, { settings, goals, milestones }, program);
  const next: Program = withPackTarget({ ...program, phases: layoutPhases(program.startDate, ctx.anchor, today, ctx.overrides, { free: ctx.free, waveStart: ctx.waveStart, beginnerWeeks: ctx.beginnerWeeks, wave: ctx.wave }) }, ctx.packTarget, ctx.runBuild, ctx.direction);
  const phasesChanged = JSON.stringify(program.phases) !== JSON.stringify(next.phases);
  // The pack target of the goal travels with the phases (the ladder of the
  // hikes reads it from the program).
  if (!dryRun && (phasesChanged || program.packTargetKg !== next.packTargetKg || JSON.stringify(program.runBuild) !== JSON.stringify(next.runBuild) || JSON.stringify(program.direction) !== JSON.stringify(next.direction))) await ProgramsRepo.put(next);

  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const proposals = await PlanChangeProposalsRepo.getAll();
  // Tochtdagen an older version left behind as skipped rows when a tocht was
  // changed or removed (engine/leaveStrays.ts): off the plan, never a logged one.
  const strays = new Set(strayTrekRows(sessions, proposals, logs));
  if (strays.size > 0) {
    if (!dryRun) for (const id of strays) await PlannedSessionsRepo.delete(id);
    for (const id of strays) touched.set(id, null);
    sessions.splice(0, sessions.length, ...sessions.filter((s) => !strays.has(s.id)));
  }
  // Test runs the weekly prescription wrongly took out come back first.
  const revived = revivePrescriptionRemovedTests(sessions, proposals, logged, today);
  if (revived.length > 0) {
    if (!dryRun) for (const r of revived) await PlannedSessionsRepo.put(r);
    for (const r of revived) touched.set(r.id, withDerivedWeek(r));
    const byId = new Map(revived.map((r) => [r.id, r]));
    sessions.splice(0, sessions.length, ...sessions.map((s) => byId.get(s.id) ?? s));
  }
  const open = (s: PlannedSession) => s.scheduledDate >= today && !logged.has(s.id);
  // Who may touch it (weekValidator.ts#lockLevel): yours never, a test or race
  // only when a proposal shows it.
  const mayGo = (s: PlannedSession) => { const level = lockLevel(s, logged, today); return level === 3 || (level === 2 && !!overrides.releaseAnchors); };
  // A row you skipped yourself is yours too (lockLevel 1): it stays, like
  // everything else you set (Warden Planning punt 10).
  const toRemove = ctx.anchor ? sessions.filter((s) => open(s) && s.scheduledDate >= ctx.anchor! && (s.status === 'skipped' ? lockLevel(s, logged, today) !== 1 : mayGo(s))) : [];
  const removedIds = new Set(toRemove.map((s) => s.id));

  const swapped: PlannedSession[] = [];
  const templateIds = new Set(templates.map((t) => t.id));
  for (const s of sessions) {
    // A walk a period of yours put on the plan (engine/leaveBlock.ts) is not a pattern session.
    if (!open(s) || removedIds.has(s.id) || s.status === 'skipped' || s.leave) continue;
    const target = templateForPhase(s.templateId, ctx.swaps, resolveProgramWeek(next, s.scheduledDate)?.phase.id, lockLevel(s, logged, today));
    if (target !== s.templateId && templateIds.has(target)) swapped.push({ ...s, templateId: target });
  }

  // Your rest day changed: every session the system planned goes to the day
  // its place in the week has in the new spread, by that place, not by its
  // template: a tempo run or test goes with the easy run, the mountain hike
  // with the long run (docs/onderzoek/Planning op een lijn.md, conflict 4).
  // A leg swap of the race block is laid out fresh; the race block below
  // makes it again where it is still needed. What you moved or skipped
  // yourself, logged sessions and anything an accepted proposal fixed stay
  // where they are. Only at the change itself.
  const appliedRestDay = (await MetaRepo.get<number>('appliedRestDay')) ?? 1;
  const wantedRestDay = settings.restDay ?? 1;
  // Normally the rest day is laid out by its own proposal with Akkoord
  // (engine/restDayProposal.ts), which stores appliedRestDay with it; this is
  // only for a rest day stored some other way (older data).
  if (appliedRestDay !== wantedRestDay) {
    const swappedById = new Map(swapped.map((x) => [x.id, x]));
    const current = sessions.filter((s) => !removedIds.has(s.id)).map((s) => swappedById.get(s.id) ?? s);
    for (const fresh of relayoutForRestDay(current, { today, anchor: ctx.anchor, logged, slotDays: patternDays(templates, settings, wantedRestDay) })) swappedById.set(fresh.id, fresh);
    swapped.splice(0, swapped.length, ...swappedById.values());
    if (!dryRun) await MetaRepo.set('appliedRestDay', wantedRestDay);
  }

  const weeksWithSessions = new Set(sessions.filter((s) => !removedIds.has(s.id)).map((s) => mondayOfWeek(s.scheduledDate)));
  const added = patternSessions(next, templates, ctx.pattern, ctx.swaps, {
    from: today,
    until: ctx.anchor ?? programEndDate(next),
    skipWeek: (w) => weeksWithSessions.has(w) || addDays(w, 6) < today,
  });

  // A running race before the main goal: its own block (engine/raceBlock.ts).
  if (!dryRun) await syncPackMilestone(goals, milestones, logs);
  const ladder = new Set(milestones.map((m) => m.goalId));
  const mainGoalId = mainGoal(goals, ladder)?.id;
  const blocks = raceBlocks(goals, mainGoalId, ctx.anchor, today);
  // The plan as it will be after the steps above, then the last two steps:
  // the race block and the week check (engine/planPass.ts, the same pass a
  // proposal is previewed with). The week check repairs only what the
  // system planned, and says so.
  const pending = new Map<string, PlannedSession>([...swapped, ...added].map((x) => [x.id, x]));
  const removedNow = new Set(toRemove.map((r) => r.id));
  const stored = new Map(sessions.map((s) => [s.id, s]));
  const asWillBe = [
    ...sessions.filter((s) => !removedNow.has(s.id)).map((s) => pending.get(s.id) ?? s),
    ...added,
  ];
  const engineConfig = await GoalEngineConfigRepo.get();
  const restDay = settings.restDay ?? 1;
  // A sport that counts has a derived template (engine/sportTemplate.ts): its fixed rows and its logs are
  // read by the week check like any training.
  const passTemplates = withCountingSports(templates, settings);
  const pass = withTestRestHours(overrides.registers?.testRest, () => withLongRunThenLegs(overrides.registers?.longRunThenLegs, () => withHardSameDay(overrides.registers?.hardSameDay, () => withDurationScope(overrides.registers, () => planPass(asWillBe, {
    today, logs, templates: passTemplates, program: next, blocks, afterGoals: afterGoalWindows(goals, mainGoalId, ctx.anchor, today), restDay, goalDay: ctx.anchor,
    dailyTimeBudget: engineConfig.availability.dailyTimeBudget, sameDayPairingPreference: engineConfig.strategy.sameDayPairingPreference,
    slotDays: patternDays(templates, settings, restDay),
    minutesOf: (s, t) => resolveVariantDuration(t, 'full', s.scheduledDate, next),
    newId: () => makeId('planned'),
    leave: settings.leavePeriods, hikingEnabled: isSportEnabled('hiking', settings.enabledSports), trekRest: settings.trekLegRest, leaveCrowding: settings.leaveCrowding, leaveAround: settings.leaveAround ?? 'wide',
    fixedSports: settings.sportHandling ?? null,
    kindAmounts: parseKindAmounts(settings.kindAmount).value ?? null,
  })))));
  if (!dryRun && pass.remaining.length > 0) console.info('Weekcontrole:', pass.remaining.map((f) => `${f.rule} ${f.date}: ${f.message}`));

  // Write only what differs from what is stored.
  const resultIds = new Set(pass.sessions.map((s) => s.id));
  const writes = pass.sessions.filter((s) => { const was = stored.get(s.id); return !was || JSON.stringify(was) !== JSON.stringify(s); });
  for (const s of sessions) if (!removedNow.has(s.id) && !resultIds.has(s.id)) toRemove.push(s);

  if (!dryRun && toRemove.length + writes.length > 0) await replacePlannedSessions(toRemove, writes);
  for (const s of toRemove) touched.set(s.id, null);
  for (const s of writes) touched.set(s.id, withDerivedWeek(s));
  const byTemplate = new Map(passTemplates.map((t) => [t.id, t.name]));
  // Only what you would notice: a session that was never stored and is let go
  // again in the same run (a pattern week inside a holiday) is not news.
  // And only what really changed: the week check can move a training and move it back within one run (two rules
  // that meet in one week); when the row ends exactly as it was stored, nothing changed and there is nothing to say,
  // or the notice would come back at every opening.
  const finalById = new Map(pass.sessions.map((s) => [s.id, s]));
  const changedNet = (id: string) => { const was = stored.get(id); const now = finalById.get(id); return !was || !now || JSON.stringify(was) !== JSON.stringify(now); };
  const shown = pass.repairs.filter(visibleRepair).filter((r) => !(r.removed && !stored.has(r.sessionId))).filter((r) => changedNet(r.sessionId));
  const nameOf = (id: string) => byTemplate.get((stored.get(id) ?? asWillBe.find((s) => s.id === id) ?? pass.sessions.find((s) => s.id === id))?.templateId ?? '') ?? 'Training';
  const addedIds = [...new Set(shown.filter((r) => r.added).map((r) => r.sessionId))].filter((id) => resultIds.has(id));
  // What the sync itself changed in a stored session: said too, never silent.
  const ownLines: string[] = [];
  const ownIds: string[] = [];
  for (const s of swapped) {
    const was = stored.get(s.id);
    if (!was || was.templateId === s.templateId) continue;
    // Only what stays: a row the week check then takes off is said by its own line ("eruit"), and a row that ends as
    // it was stored is no news (9 November: "wordt Heuvelintervallen" and "eruit (stond dubbel)" for the same row).
    if (!changedNet(s.id) || finalById.get(s.id)?.templateId !== s.templateId) continue;
    ownLines.push(`${byTemplate.get(was.templateId) ?? 'Training'} op ${dayNL(was.scheduledDate)} wordt ${byTemplate.get(s.templateId) ?? 'een andere training'} (past bij de fase van die week)`);
    ownIds.push(s.id);
  }
  for (const s of toRemove) {
    if (!removedNow.has(s.id) || s.status === 'skipped') continue;
    ownLines.push(`${byTemplate.get(s.templateId) ?? 'Training'} op ${dayNL(s.scheduledDate)} vervalt (na de dag van je hoofddoel plant ASCEND niets meer)`);
    ownIds.push(s.id);
  }
  // A skipped row of the system that goes is not news on its own, but undo of
  // the notice puts it back with the rest.
  for (const s of toRemove) if (removedNow.has(s.id) && s.status === 'skipped' && stored.has(s.id)) ownIds.push(s.id);
  const repairedIds = [...new Set([...ownIds, ...shown.map((r) => r.sessionId)])].filter((id) => !addedIds.includes(id));
  const beforeCheck = new Map(pass.beforeCheck.map((s) => [s.id, s]));
  const lines = [...ownLines, ...shown.map((r) => describeRepair(r, nameOf(r.sessionId)))];
  const repairs = lines.length === 0 ? undefined : {
    lines,
    before: repairedIds.map((id) => beforeCheck.get(id) ?? stored.get(id)).filter((s): s is PlannedSession => !!s),
    stored: repairedIds.map((id) => stored.get(id) ?? beforeCheck.get(id)).filter((s): s is PlannedSession => !!s),
    ...(addedIds.length > 0 ? { addedIds } : {}),
  };
  const newCount = writes.filter((w) => !stored.has(w.id)).length;
  const removedFinal = new Set(toRemove.map((s) => s.id));
  return {
    result: { phasesChanged, added: newCount, swapped: writes.length - newCount, removed: toRemove.length, repairs, ...(touched.size > 0 ? { touched: [...touched].map(([id, after]) => ({ id, before: storedById.get(id) ?? null, after })) } : {}) },
    before: startedFrom,
    after: pass.sessions.filter((s) => !removedFinal.has(s.id)),
    program: next,
    anchor: ctx.anchor,
    remaining: pass.remaining,
  };
}
