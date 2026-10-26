// ASCEND: een verandering van het hoofddoel of van een planningsinstelling als
// voorstel met Akkoord (Warden Logica punten 1 en 2,
// docs/beslissingen/2026-10-23-planning-nooit-stil.md).
//
// computeHorizonPlan rekent de planningsronde met de verandering in het geheugen
// uit (database.ts#previewProgramHorizon) en zet het verschil om in een voorstel
// (engine/horizonChange.ts). Er wordt niets opgeslagen.
//
// applyHorizonPlanNow doet het na Akkoord: eerst opnieuw uitrekenen (is de
// planning intussen veranderd, dan "stale" en gebeurt er niets), dan het eigen
// voorstel dat erbij hoort (een sport uitgezet), dan de instelling of het doel,
// en dan dezelfde planningsronde echt. Zo krijg je precies wat je zag. Het geeft
// de rijen zoals ze waren terug, voor ongedaan maken.
//
// Gaat er onderweg iets mis, dan zet het alles terug zoals het vlak voor
// Akkoord was (de rijen, de instellingen, de doelen, het programma) en pas dan
// zegt het "niets aangepast". Lukt ook dat terugzetten niet, dan 'partial': de
// melding laat zien wat wel veranderde, met ongedaan maken (Warden Planning
// punt 2). Een voorbeeld zet nooit iets op de module: andere duren (Ambitie)
// gaan als `registers` mee in de ronde zelf (punt 3).
//
// De aanroeper (AppDataContext) zorgt dat dit in de wachtrij van de
// planningssync loopt, zodat er nooit twee rondes tegelijk schrijven.

import type { EngineEvent, PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { TrainingGoal } from '../models/goals';
import type { GoalMilestone } from '../models/goals';
import type { StrengthProgramStrategy } from '../models/strengthProgram';
import type { GoalEngineConfig, Weekday } from '../models/goalEngineConfig';
import {
  GoalEngineConfigRepo, GoalMilestonesRepo, MetaRepo, PlannedSessionsRepo, ProgramsRepo, SessionLogsRepo, SessionTemplatesRepo, SettingsRepo, StrengthProgramStrategiesRepo, TrainingGoalsRepo,
  previewProgramHorizon, syncProgramHorizon, type AppSettings, type HorizonOverrides,
} from './database';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { diffHorizon, type HorizonDiff } from '../engine/horizonChange';
import { makeId } from '../utils/id';
import { addDays, formatDateNL, todayISO, weekdayShortNL } from '../utils/dates';
import { resolveVariantDuration, withDurationScope, type DurationScope } from '../engine/substitutions';
import { durationScopeFor } from '../engine/durationScope';

export interface HorizonChangeInput {
  // The proposal's title ("Doeldatum naar 15 januari 2027").
  title: string;
  // Why, in one plain line, for every item.
  why: string;
  explanation: string;
  trigger: EngineEvent;
  settings?: Partial<AppSettings>;
  // Goals as they would be (a changed date, an archived goal, a new goal).
  goals?: TrainingGoal[];
  // A proposal of its own that goes first (a sport switched off): applied as
  // an accepted proposal, with its lock, before the planning run.
  startItems?: PlanChangeItem[];
  // The program as it would be: a rest week trained through or put back, a
  // week repeated or the repeat taken back (engine/weekLoadChange.ts).
  program?: Program;
  // Trainings of yours (a lock) that keep their length: they get it as a fixed
  // length, so the new load of the week passes them by.
  pinMinutes?: { id: string; minutes: number }[];
  // Lines for the proposal of its own, before the ones of the planning run.
  notes?: string[];
  // The trainings that get another length, as the change itself names them
  // (all of them, not only the next two weeks). Without it: worked out here.
  lengths?: string[];
  // The first plan of an app that was empty (engine/firstPlan.ts): next to the
  // program, goal and settings above, what belongs to it. Written with Akkoord,
  // put back if anything goes wrong. A device that already has a program never
  // gets this.
  firstPlan?: FirstPlanExtras;
}

export interface FirstPlanExtras {
  // The ladder of the goal (a trek).
  milestones: GoalMilestone[];
  // The strength block, or none when you train without strength.
  strategy: StrengthProgramStrategy | null;
  // The days you can train on.
  allowedDays: Weekday[];
  // The rest day the plan is laid out for, so the sync does not lay it out again.
  restDay: number;
}

export interface HorizonPlan {
  input: HorizonChangeInput;
  proposal: PlanChangeProposal;
  notes: string[];
  // Trainingen in de komende twee weken die alleen een andere lengte krijgen.
  lengths: string[];
  counts: HorizonDiff['counts'];
  // The stored program the proposal was made against, when it changes the
  // program: another one at Akkoord means the plan changed in between.
  programWas?: string;
}

// What undo puts back: the settings and goals as they were just before
// Akkoord wrote them (read again then, not at the preview: Warden Planning punt 7).
export interface HorizonRestore {
  settings?: Partial<AppSettings>;
  goals: TrainingGoal[];
  newGoalIds: string[];
  // The program as it was, when the change wrote another one.
  program?: Program;
}

// Some steps of the planning run only settle in a second round (the race
// block makes a Saturday a hill session, the next round makes it the first
// hiking day of Expeditieklaar). The proposal shows where the planning ends
// up, and Akkoord runs the same rounds, so you get what you saw.
const ROUNDS = 3;
async function settledPreview(overrides: HorizonOverrides) {
  let run = await previewProgramHorizon(overrides);
  for (let i = 1; i < ROUNDS; i++) {
    const next = await previewProgramHorizon({ ...overrides, sessions: run.after });
    const same = JSON.stringify(next.after) === JSON.stringify(run.after);
    run = { ...next, before: run.before };
    if (same) break;
  }
  return run;
}

// The plan with the fixed lengths of the trainings that keep theirs.
function withPins(sessions: PlannedSession[], pins: HorizonChangeInput['pinMinutes']): PlannedSession[] {
  if (!pins?.length) return sessions;
  const byId = new Map(pins.map((p) => [p.id, p.minutes]));
  return sessions.map((s) => (byId.has(s.id) && s.plannedMinutes === undefined ? { ...s, plannedMinutes: byId.get(s.id) } : s));
}

async function diffFor(input: HorizonChangeInput, registers?: DurationScope) {
  const [stored, logs, templates] = await Promise.all([PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll(), SessionTemplatesRepo.getAll()]);
  let drafts = 0;
  // A fixed length that only keeps what a training already had is not a
  // change to show: the diff starts from the plan with it.
  const base = withPins(stored, input.pinMinutes);
  const start = input.startItems?.length
    ? applyPlanChangeItems(input.startItems, base, () => `horizon-draft-${++drafts}`, { by: 'proposal', at: 'preview' }).sessions
    : (base !== stored ? base : undefined);
  const run = await settledPreview({ settings: input.settings, goals: input.goals, sessions: start, registers, program: input.program, milestones: input.firstPlan?.milestones });
  const diff = diffHorizon({ before: base, after: run.after, logs, templates, today: todayISO(), goalDay: run.anchor, reason: input.why });
  // The proposal's own items keep their own reason.
  const own = new Map((input.startItems ?? []).filter((i) => i.plannedSessionId).map((i) => [i.plannedSessionId!, i]));
  const items = diff.items.map((i) => (i.plannedSessionId && own.get(i.plannedSessionId)?.reason ? { ...i, reason: own.get(i.plannedSessionId)!.reason } : i));
  return { diff: { ...diff, items }, stored, run, templates };
}

// The minutes of every open training in the next two weeks, as the screens
// show them (the planning registers, engine/substitutions.ts).
function upcomingMinutes(sessions: PlannedSession[], templates: SessionTemplate[], program: Program | null | undefined, today: string): Map<string, number> {
  const byId = new Map(templates.map((t) => [t.id, t]));
  const until = addDays(today, 13);
  const out = new Map<string, number>();
  for (const s of sessions) {
    const t = byId.get(s.templateId);
    if (!t || s.status === 'skipped' || s.scheduledDate < today || s.scheduledDate > until || t.type === 'recovery') continue;
    out.set(s.id, s.plannedMinutes ?? resolveVariantDuration(t, 'full', s.scheduledDate, program));
  }
  return out;
}

const dayNL = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;

export interface HorizonDeps {
  // Sets the planning registers from what is stored (AppDataContext). Never
  // with values that are not stored: a preview passes its registers to the
  // run itself (HorizonOverrides.registers).
  prime?: () => Promise<void>;
  // The planning run after Akkoord (tests pass one that fails).
  sync?: typeof syncProgramHorizon;
}

// The duration registers as they would be with these settings, or nothing
// when the change has no settings (then the stored registers are right).
async function scopeFor(input: HorizonChangeInput): Promise<DurationScope | undefined> {
  if (!input.settings) return undefined;
  const [settings, logs, templates, programs] = await Promise.all([SettingsRepo.get(), SessionLogsRepo.getAll(), SessionTemplatesRepo.getAll(), ProgramsRepo.getAll()]);
  const merged = { ...settings, ...input.settings };
  return { ...durationScopeFor(merged, logs, templates, programs[0], todayISO()), hardSameDay: !!merged.hardSameDay };
}

export async function computeHorizonPlan(input: HorizonChangeInput, deps: HorizonDeps = {}): Promise<HorizonPlan> {
  const today = todayISO();
  if (deps.prime) await deps.prime();
  const [stored, templates, programs] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), ProgramsRepo.getAll()]);
  const minutesNow = upcomingMinutes(stored, templates, programs[0], today);
  const registers = await scopeFor(input);
  const done = await diffFor(input, registers);
  const diff = done.diff;
  // Synchronous, so the registers of the preview are back before anything
  // else reads them.
  const minutesThen = withDurationScope(registers, () => upcomingMinutes(done.run.after, templates, done.run.program, today));
  const lengths: string[] = [];
  const names = new Map(templates.map((t) => [t.id, t.name]));
  for (const s of [...done.run.after].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))) {
    const was = minutesNow.get(s.id);
    const now = minutesThen.get(s.id);
    if (was === undefined || now === undefined || was === now || diff.items.some((i) => i.plannedSessionId === s.id)) continue;
    lengths.push(`${names.get(s.templateId) ?? 'Training'} op ${dayNL(s.scheduledDate)}: ${was} naar ${now} minuten`);
  }
  const proposal: PlanChangeProposal = {
    id: makeId('planchange'),
    trigger: input.trigger,
    issue: input.title,
    changes: diff.items,
    alternatives: [],
    consequences: diff.consequences,
    explanation: input.explanation,
    createdAt: new Date().toISOString(),
  };
  return {
    input, proposal, notes: [...(input.notes ?? []), ...diff.notes], lengths: input.lengths ?? lengths, counts: diff.counts,
    ...(input.program ? { programWas: JSON.stringify(programs[0] ?? null) } : {}),
  };
}

export type HorizonApplyResult =
  | { status: 'stale' }
  // Something went wrong, and everything is back as it was: nothing changed.
  | { status: 'failed' }
  // Done ('applied' or 'unchanged'), or half done and putting it back failed
  // too ('partial'): then the notice with undo shows what did change.
  | { status: 'applied' | 'unchanged' | 'partial'; before: PlannedSession[]; addedIds: string[]; restore: HorizonRestore };

// What the screen hears: one of the results, or 'pending' when Akkoord is still
// running after the caller was let go (the notice follows when it is done).
export type HorizonApplyStatus = HorizonApplyResult['status'] | 'pending';

const comparable = (items: PlanChangeItem[]) => JSON.stringify(items);

// Everything Akkoord may write, read just before it writes (Warden Planning
// punten 2 en 7): the plan, the settings object as stored, the goals it
// replaces, the program (its phases), the milestones and the rest day the
// run laid out.
interface Snapshot {
  sessions: PlannedSession[];
  settingsRaw: unknown;
  restore: HorizonRestore;
  programs: Program[];
  milestones: GoalMilestone[];
  appliedRestDay: unknown;
  // Only for a first plan: what was there before it wrote its extras.
  extras?: { config: GoalEngineConfig; strategies: StrengthProgramStrategy[]; strategyFlag: unknown };
}

async function takeSnapshot(input: HorizonChangeInput, sessions: PlannedSession[]): Promise<Snapshot> {
  const [settingsRaw, settings, goals, programs, milestones, appliedRestDay] = await Promise.all([
    MetaRepo.get('settings'), SettingsRepo.get(), TrainingGoalsRepo.getAll(), ProgramsRepo.getAll(), GoalMilestonesRepo.getAll(), MetaRepo.get('appliedRestDay'),
  ]);
  const storedGoals = new Map(goals.map((g) => [g.id, g]));
  const restore: HorizonRestore = {
    ...(input.settings ? { settings: Object.fromEntries(Object.keys(input.settings).map((k) => [k, settings[k as keyof AppSettings]])) as Partial<AppSettings> } : {}),
    goals: (input.goals ?? []).map((g) => storedGoals.get(g.id)).filter((g): g is TrainingGoal => !!g),
    newGoalIds: (input.goals ?? []).filter((g) => !storedGoals.has(g.id)).map((g) => g.id),
    ...(input.program && programs[0] ? { program: programs[0] } : {}),
  };
  const extras = input.firstPlan
    ? { config: await GoalEngineConfigRepo.get(), strategies: await StrengthProgramStrategiesRepo.getAll(), strategyFlag: await MetaRepo.get('strengthProgramDefaultSeeded') }
    : undefined;
  return { sessions, settingsRaw, restore, programs, milestones, appliedRestDay, ...(extras ? { extras } : {}) };
}

// Puts everything back exactly as the snapshot has it.
async function rollback(snap: Snapshot): Promise<void> {
  const now = await PlannedSessionsRepo.getAll();
  const was = new Map(snap.sessions.map((s) => [s.id, s]));
  for (const s of now) if (!was.has(s.id)) await PlannedSessionsRepo.delete(s.id);
  const nowById = new Map(now.map((s) => [s.id, s]));
  for (const s of snap.sessions) if (JSON.stringify(nowById.get(s.id)) !== JSON.stringify(s)) await PlannedSessionsRepo.put(s);
  await MetaRepo.set('settings', snap.settingsRaw);
  for (const g of snap.restore.goals) await TrainingGoalsRepo.put(g);
  for (const id of snap.restore.newGoalIds) await TrainingGoalsRepo.delete(id);
  // A program that was not there before (the first plan) goes again.
  const programsNow = await ProgramsRepo.getAll();
  for (const p of programsNow) if (!snap.programs.some((o) => o.id === p.id)) await ProgramsRepo.delete(p.id);
  for (const p of snap.programs) await ProgramsRepo.put(p);
  const milestonesNow = await GoalMilestonesRepo.getAll();
  for (const m of milestonesNow) if (!snap.milestones.some((o) => o.id === m.id)) await GoalMilestonesRepo.delete(m.id);
  for (const m of snap.milestones) await GoalMilestonesRepo.put(m);
  await MetaRepo.set('appliedRestDay', snap.appliedRestDay);
  if (snap.extras) {
    const strategiesNow = await StrengthProgramStrategiesRepo.getAll();
    for (const st of strategiesNow) if (!snap.extras.strategies.some((o) => o.id === st.id)) await StrengthProgramStrategiesRepo.delete(st.id);
    await GoalEngineConfigRepo.set({ availability: snap.extras.config.availability });
    await MetaRepo.set('strengthProgramDefaultSeeded', snap.extras.strategyFlag);
  }
}

async function changedSince(stored: PlannedSession[]): Promise<{ before: PlannedSession[]; addedIds: string[] }> {
  const after = await PlannedSessionsRepo.getAll();
  const afterById = new Map(after.map((s) => [s.id, s]));
  const storedIds = new Set(stored.map((s) => s.id));
  const before = stored.filter((s) => { const a = afterById.get(s.id); return !a || JSON.stringify(a) !== JSON.stringify(s); });
  const addedIds = after.filter((s) => !storedIds.has(s.id)).map((s) => s.id);
  return { before, addedIds };
}

export async function applyHorizonPlanNow(plan: HorizonPlan, deps: HorizonDeps = {}): Promise<HorizonApplyResult> {
  const { input } = plan;
  const sync = deps.sync ?? syncProgramHorizon;
  if (deps.prime) await deps.prime();
  // The plan may have changed since the proposal was shown: then not this.
  if (input.program && JSON.stringify((await ProgramsRepo.getAll())[0] ?? null) !== plan.programWas) return { status: 'stale' };
  const { diff, stored } = await diffFor(input, await scopeFor(input));
  if (comparable(diff.items) !== comparable(plan.proposal.changes)) return { status: 'stale' };

  const snap = await takeSnapshot(input, stored);
  try {
    if (input.startItems?.length) {
      const lock = { by: 'proposal' as const, proposalId: plan.proposal.id, at: new Date().toISOString() };
      const { sessions } = applyPlanChangeItems(input.startItems, stored, undefined, lock);
      const was = new Map(stored.map((s) => [s.id, s]));
      for (const s of sessions) if (!was.has(s.id) || JSON.stringify(was.get(s.id)) !== JSON.stringify(s)) await PlannedSessionsRepo.put(s);
      const kept = new Set(sessions.map((s) => s.id));
      for (const s of stored) if (!kept.has(s.id)) await PlannedSessionsRepo.delete(s.id);
    }
    if (input.pinMinutes?.length) {
      const was = new Map(stored.map((s) => [s.id, s]));
      for (const s of withPins(await PlannedSessionsRepo.getAll(), input.pinMinutes)) {
        if (JSON.stringify(was.get(s.id)) !== JSON.stringify(s)) await PlannedSessionsRepo.put(s);
      }
    }
    if (input.program) await ProgramsRepo.put(input.program);
    if (input.settings) await SettingsRepo.set(input.settings);
    const first = input.firstPlan;
    if (first) {
      for (const m of first.milestones) await GoalMilestonesRepo.put(m);
      const config = await GoalEngineConfigRepo.get();
      await GoalEngineConfigRepo.set({ availability: { ...config.availability, allowedDays: first.allowedDays } });
      // The flag keeps the old default strength block from turning up on the
      // next start. The block itself is written below, after the goals.
      await MetaRepo.set('strengthProgramDefaultSeeded', true);
      await MetaRepo.set('appliedRestDay', first.restDay);
    }
    for (const g of input.goals ?? []) await TrainingGoalsRepo.put(g);
    // The strength block starts now, after the goal and the availability it was
    // made for: its own time is the latest, so the review of the block does not
    // see a goal or availability "changed since the block began" and advise
    // straight away.
    if (first?.strategy) {
      const at = new Date().toISOString();
      await StrengthProgramStrategiesRepo.put({ ...first.strategy, createdAt: at, updatedAt: at });
    }
    // The registers follow the stored settings again, now with the change.
    if (deps.prime) await deps.prime();
    if (diff.items.length > 0 || input.startItems?.length || input.program) {
      for (let i = 0; i < ROUNDS; i++) {
        const r = await sync({ releaseAnchors: true });
        if (r.added + r.swapped + r.removed === 0) break;
      }
    }
  } catch (err) {
    console.error('Voorstel toepassen mislukt, alles gaat terug:', err);
    try {
      await rollback(snap);
      if (deps.prime) await deps.prime();
      return { status: 'failed' };
    } catch (rollbackErr) {
      // Putting it back failed too: say what did change, with undo.
      console.error('Terugzetten mislukt:', rollbackErr);
      const changed = await changedSince(stored).catch(() => ({ before: stored, addedIds: [] as string[] }));
      return { status: 'partial', ...changed, restore: snap.restore };
    }
  }

  const { before, addedIds } = await changedSince(stored);
  return { status: before.length + addedIds.length > 0 ? 'applied' : 'unchanged', before, addedIds, restore: snap.restore };
}

