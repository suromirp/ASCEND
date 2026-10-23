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
// De aanroeper (AppDataContext) zorgt dat dit in de wachtrij van de
// planningssync loopt, zodat er nooit twee rondes tegelijk schrijven.

import type { EngineEvent, PlanChangeItem, PlanChangeProposal } from '../models/planChange';
import type { PlannedSession, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import type { TrainingGoal } from '../models/goals';
import {
  PlannedSessionsRepo, ProgramsRepo, SessionLogsRepo, SessionTemplatesRepo, SettingsRepo, TrainingGoalsRepo,
  previewProgramHorizon, syncProgramHorizon, type AppSettings, type HorizonOverrides,
} from './database';
import { applyPlanChangeItems } from '../engine/proposalEngine';
import { diffHorizon, type HorizonDiff } from '../engine/horizonChange';
import { makeId } from '../utils/id';
import { addDays, formatDateNL, todayISO, weekdayShortNL } from '../utils/dates';
import { resolveVariantDuration } from '../engine/substitutions';

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
}

export interface HorizonPlan {
  input: HorizonChangeInput;
  proposal: PlanChangeProposal;
  notes: string[];
  // Trainingen in de komende twee weken die alleen een andere lengte krijgen.
  lengths: string[];
  counts: HorizonDiff['counts'];
  // What undo puts back: the settings and goals as they were.
  restore: { settings?: Partial<AppSettings>; goals: TrainingGoal[]; newGoalIds: string[] };
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

async function diffFor(input: HorizonChangeInput) {
  const [stored, logs, templates] = await Promise.all([PlannedSessionsRepo.getAll(), SessionLogsRepo.getAll(), SessionTemplatesRepo.getAll()]);
  let drafts = 0;
  const start = input.startItems?.length
    ? applyPlanChangeItems(input.startItems, stored, () => `horizon-draft-${++drafts}`, { by: 'proposal', at: 'preview' }).sessions
    : undefined;
  const run = await settledPreview({ settings: input.settings, goals: input.goals, sessions: start });
  const diff = diffHorizon({ before: stored, after: run.after, logs, templates, today: todayISO(), goalDay: run.anchor, reason: input.why });
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

// `prime`: sets the planning registers (durations, ambition) for these
// settings, or back to the stored ones without. A setting like Ambitie changes
// the length of every training, not a row of the plan: the proposal says that
// too, for the next two weeks.
export type PrimeRegisters = (settings?: Partial<AppSettings>) => Promise<void>;

export async function computeHorizonPlan(input: HorizonChangeInput, prime?: PrimeRegisters): Promise<HorizonPlan> {
  const today = todayISO();
  const [stored, templates, programs, settings, goals] = await Promise.all([PlannedSessionsRepo.getAll(), SessionTemplatesRepo.getAll(), ProgramsRepo.getAll(), SettingsRepo.get(), TrainingGoalsRepo.getAll()]);
  const minutesNow = upcomingMinutes(stored, templates, programs[0], today);
  const primed = !!prime && !!input.settings;
  if (primed) await prime!(input.settings);
  let diff: HorizonDiff;
  const lengths: string[] = [];
  try {
    const done = await diffFor(input);
    diff = done.diff;
    const minutesThen = upcomingMinutes(done.run.after, templates, done.run.program, today);
    const names = new Map(templates.map((t) => [t.id, t.name]));
    for (const s of [...done.run.after].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))) {
      const was = minutesNow.get(s.id);
      const now = minutesThen.get(s.id);
      if (was === undefined || now === undefined || was === now || diff.items.some((i) => i.plannedSessionId === s.id)) continue;
      lengths.push(`${names.get(s.templateId) ?? 'Training'} op ${dayNL(s.scheduledDate)}: ${was} naar ${now} minuten`);
    }
  } finally {
    if (primed) await prime!();
  }
  const storedGoals = new Map(goals.map((g) => [g.id, g]));
  const restoreSettings = input.settings
    ? Object.fromEntries(Object.keys(input.settings).map((k) => [k, settings[k as keyof AppSettings]])) as Partial<AppSettings>
    : undefined;
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
    input,
    proposal,
    notes: diff.notes,
    lengths,
    counts: diff.counts,
    restore: {
      ...(restoreSettings ? { settings: restoreSettings } : {}),
      goals: (input.goals ?? []).map((g) => storedGoals.get(g.id)).filter((g): g is TrainingGoal => !!g),
      newGoalIds: (input.goals ?? []).filter((g) => !storedGoals.has(g.id)).map((g) => g.id),
    },
  };
}

export type HorizonApplyResult =
  | { status: 'stale' }
  | { status: 'applied' | 'unchanged'; before: PlannedSession[]; addedIds: string[] };

const comparable = (items: PlanChangeItem[]) => JSON.stringify(items);

export async function applyHorizonPlanNow(plan: HorizonPlan, prime?: PrimeRegisters): Promise<HorizonApplyResult> {
  const { input } = plan;
  // The plan may have changed since the proposal was shown: then not this.
  const primed = !!prime && !!input.settings;
  if (primed) await prime!(input.settings);
  let checked: Awaited<ReturnType<typeof diffFor>>;
  try {
    checked = await diffFor(input);
  } finally {
    if (primed) await prime!();
  }
  const { diff, stored } = checked;
  if (comparable(diff.items) !== comparable(plan.proposal.changes)) return { status: 'stale' };

  if (input.startItems?.length) {
    const lock = { by: 'proposal' as const, proposalId: plan.proposal.id, at: new Date().toISOString() };
    const { sessions } = applyPlanChangeItems(input.startItems, stored, undefined, lock);
    const was = new Map(stored.map((s) => [s.id, s]));
    for (const s of sessions) if (!was.has(s.id) || JSON.stringify(was.get(s.id)) !== JSON.stringify(s)) await PlannedSessionsRepo.put(s);
    const kept = new Set(sessions.map((s) => s.id));
    for (const s of stored) if (!kept.has(s.id)) await PlannedSessionsRepo.delete(s.id);
  }
  if (input.settings) await SettingsRepo.set(input.settings);
  for (const g of input.goals ?? []) await TrainingGoalsRepo.put(g);
  // The registers follow the stored settings again, now with the change.
  if (prime) await prime();
  if (diff.items.length > 0 || input.startItems?.length) {
    for (let i = 0; i < ROUNDS; i++) {
      const r = await syncProgramHorizon({ releaseAnchors: true });
      if (r.added + r.swapped + r.removed === 0) break;
    }
  }

  const after = await PlannedSessionsRepo.getAll();
  const afterById = new Map(after.map((s) => [s.id, s]));
  const storedIds = new Set(stored.map((s) => s.id));
  const before = stored.filter((s) => { const a = afterById.get(s.id); return !a || JSON.stringify(a) !== JSON.stringify(s); });
  const addedIds = after.filter((s) => !storedIds.has(s.id)).map((s) => s.id);
  return { status: before.length + addedIds.length > 0 ? 'applied' : 'unchanged', before, addedIds };
}
