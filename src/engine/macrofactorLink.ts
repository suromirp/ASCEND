// ASCEND: a MacroFactor workout becomes a voorstel (docs/visie/Data zonder
// handwerk.md, idee 2 en stap 3).
//
// Pure. Takes what engine/macrofactorImport.ts read, the user's one-time
// choice of which ASCEND template each MacroFactor workout name is, and the
// plan and logs; gives back what the card offers. Nothing is stored here.
//
// History stays append-only (CLAUDE.md):
// - A workout with no log yet makes a NEW log, tied to the planned session of
//   that template in the same week when there is a free one.
// - A workout whose session was already logged by hand ("Gedaan in
//   MacroFactor") never rewrites that log. It only fills a field that is
//   still EMPTY (the sets, the reps left, the id of the workout). A field
//   that has a value, the duration included, stays as it was.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { daysBetween, mondayOfWeek } from '../utils/dates';
import { resolveEffectiveStressProfile } from './stressProfile';
import { lowestTopRir, nameKey, type MacroFactorWorkout } from './macrofactorImport';
import type { SessionLogDraft } from './activityImport';
import { formatNumberNL } from '../utils/number';

// MacroFactor workout name (as nameKey) to the ASCEND template id. null: the
// user said this workout is not part of ASCEND; never offered again.
export type NameMapping = Record<string, string | null>;

// --- legs and reps in reserve -------------------------------------------------

// A leg session: the legs carry real load. Only for these does the reps-in-
// reserve number mean something for the leg index (engine/legFatigue.ts reads
// strengthRir as RPE = 10 - RIR: 0 left is about RPE 10, 2 left about RPE 8).
export function isLegSession(template: SessionTemplate): boolean {
  const load = resolveEffectiveStressProfile(template).lowerBodyLoad;
  return load === 'moderate' || load === 'heavy';
}

// The scale the rest of the app uses: 0 to 4 (StrengthDoneElsewhere stores
// 0, 1, 2.5, 4). More than 4 left is "4 of meer".
export function strengthRirFor(workout: MacroFactorWorkout, template: SessionTemplate): number | undefined {
  if (!isLegSession(template)) return undefined;
  const rir = lowestTopRir(workout);
  return rir === undefined ? undefined : Math.min(4, Math.max(0, rir));
}

// --- the sets as ASCEND keeps them ----------------------------------------------

const slug = (s: string) => nameKey(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// An exercise that has the same name in the template keeps that exercise id,
// so the progression chart finds it; any other gets an id of its own.
export function strengthDataFor(workout: MacroFactorWorkout, template: SessionTemplate): NonNullable<SessionLog['strengthData']> {
  const byName = new Map((template.exercises ?? []).map((e) => [nameKey(e.exerciseName), e.id]));
  const used = new Set<string>();
  return workout.exercises.map((exercise) => {
    const known = byName.get(nameKey(exercise.name));
    const exerciseId = known && !used.has(known) ? known : `mf_${slug(exercise.name)}`;
    used.add(exerciseId);
    return {
      exerciseId,
      exerciseName: exercise.name,
      sets: exercise.sets.map((s) => (s.weightKg !== undefined ? { reps: s.reps, weightKg: s.weightKg } : { reps: s.reps })),
    };
  });
}

// --- a new log ------------------------------------------------------------------

export function workoutMinutes(workout: MacroFactorWorkout, template: SessionTemplate, planned?: PlannedSession): number {
  if (workout.durationSec) return Math.max(1, Math.round(workout.durationSec / 60));
  return planned?.plannedMinutes ?? template.durationVariants.full;
}

export function workoutToDraft(workout: MacroFactorWorkout, template: SessionTemplate, planned?: PlannedSession): SessionLogDraft {
  const minutes = workoutMinutes(workout, template, planned);
  const startMs = new Date(workout.start).getTime();
  const draft: SessionLogDraft = {
    plannedSessionId: planned?.id,
    templateId: template.id,
    type: template.type,
    completedDate: workout.date,
    completedAt: new Date(startMs + minutes * 60_000).toISOString(),
    variant: 'custom',
    durationMinutes: minutes,
    strengthData: strengthDataFor(workout, template),
    strengthRir: strengthRirFor(workout, template),
    externalId: workout.externalId,
    source: 'macrofactor',
  };
  return Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== undefined)) as SessionLogDraft;
}

// --- filling in an existing log ---------------------------------------------------

export type LogPatch = Partial<Pick<SessionLog, 'strengthData' | 'strengthRir' | 'externalId'>>;

// Only what the log has no value for yet. Re-run on the log as it is stored at
// that moment, so a field filled in meanwhile is never overwritten. Empty
// when there is nothing to add (the id alone is not worth a change).
export function supplementPatch(log: SessionLog, workout: MacroFactorWorkout, template: SessionTemplate): LogPatch {
  const patch: LogPatch = {};
  if (!log.strengthData || log.strengthData.length === 0) patch.strengthData = strengthDataFor(workout, template);
  if (log.strengthRir === undefined) {
    const rir = strengthRirFor(workout, template);
    if (rir !== undefined) patch.strengthRir = rir;
  }
  if (Object.keys(patch).length > 0 && log.externalId === undefined) patch.externalId = workout.externalId;
  return patch;
}

// --- the proposals --------------------------------------------------------------------

export type MacroFactorProposal =
  | { kind: 'new'; workout: MacroFactorWorkout; template: SessionTemplate; planned?: PlannedSession; draft: SessionLogDraft }
  | { kind: 'supplement'; workout: MacroFactorWorkout; template: SessionTemplate; log: SessionLog; patch: LogPatch }
  // The name has not been linked yet: the card asks which template it is.
  | { kind: 'unmapped'; workout: MacroFactorWorkout };

export interface MacroFactorPlan {
  proposals: MacroFactorProposal[];
  // Already in the log (same id, or a log that has everything), left out by
  // the user, or not for ASCEND: nothing to offer, counted for the card.
  alreadyDone: number;
}

// A log that came from a MacroFactor file is that workout's own; one made by
// hand or from the watch can still be filled in.
const isMacroFactorLog = (l: SessionLog) => !!l.externalId?.startsWith('macrofactor:');

const sameWeek = (a: string, b: string) => mondayOfWeek(a) === mondayOfWeek(b);

function nearest<T>(items: T[], dateOf: (item: T) => string, day: string): T | undefined {
  return [...items].sort((a, b) => Math.abs(daysBetween(day, dateOf(a))) - Math.abs(daysBetween(day, dateOf(b))))[0];
}

// Oldest workout first, each log and each planned session used once:
// 1. a log of that template in the same week (typed by hand) is the same
//    training (or a strength entry from the watch), so it is filled in rather
//    than doubled;
// 2. else a free planned session of that template in the same week;
// 3. else it is saved on its own under that template.
export function planMacroFactor(
  workouts: MacroFactorWorkout[],
  mapping: NameMapping,
  dismissed: string[],
  planned: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[],
): MacroFactorPlan {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const dismissedSet = new Set(dismissed);
  const storedIds = new Set(logs.map((l) => l.externalId).filter((id): id is string => !!id));
  const loggedPlanned = new Set(logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  const claimedLogs = new Set<string>();
  const claimedPlanned = new Set<string>();
  const proposals: MacroFactorProposal[] = [];
  let alreadyDone = 0;

  for (const workout of [...workouts].sort((a, b) => a.start.localeCompare(b.start))) {
    if (dismissedSet.has(workout.externalId) || storedIds.has(workout.externalId)) {
      alreadyDone++;
      continue;
    }
    const key = nameKey(workout.name);
    if (!(key in mapping)) {
      proposals.push({ kind: 'unmapped', workout });
      continue;
    }
    const templateId = mapping[key];
    const template = templateId ? templateById.get(templateId) : undefined;
    if (templateId === null) {
      alreadyDone++;
      continue;
    }
    if (!template) {
      // The linked template is gone (deleted): ask again.
      proposals.push({ kind: 'unmapped', workout });
      continue;
    }

    const sameTemplateLog = nearest(
      logs.filter((l) => l.templateId === template.id && !isMacroFactorLog(l) && !claimedLogs.has(l.id) && sameWeek(l.completedDate, workout.date)),
      (l) => l.completedDate,
      workout.date,
    );
    if (sameTemplateLog) {
      claimedLogs.add(sameTemplateLog.id);
      const patch = supplementPatch(sameTemplateLog, workout, template);
      if (Object.keys(patch).length === 0) alreadyDone++;
      else proposals.push({ kind: 'supplement', workout, template, log: sameTemplateLog, patch });
      continue;
    }

    const free = nearest(
      planned.filter(
        (s) => s.templateId === template.id && s.status !== 'skipped' && !loggedPlanned.has(s.id) && !claimedPlanned.has(s.id) && sameWeek(s.scheduledDate, workout.date),
      ),
      (s) => s.scheduledDate,
      workout.date,
    );
    if (free) claimedPlanned.add(free.id);
    proposals.push({ kind: 'new', workout, template, planned: free, draft: workoutToDraft(workout, template, free) });
  }
  return { proposals, alreadyDone };
}

// --- words ------------------------------------------------------------------------------

export function minutesLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  if (h === 0) return `${minutes} min`;
  return minutes % 60 === 0 ? `${h} uur` : `${h} uur ${minutes % 60} min`;
}

// "62 min, 18 sets": each number with what it is.
export function describeWorkout(workout: MacroFactorWorkout): string {
  const parts: string[] = [];
  if (workout.durationSec) parts.push(minutesLabel(Math.max(1, Math.round(workout.durationSec / 60))));
  parts.push(`${workout.setCount} ${workout.setCount === 1 ? 'set' : 'sets'}`);
  return parts.join(', ');
}

// "Zwaarste set nog 1 herhaling over": what RIR means, in words.
export function describeRir(rir: number | undefined): string | undefined {
  if (rir === undefined) return undefined;
  if (rir <= 0) return 'Zwaarste set tot het uiterste (geen herhaling over)';
  return `Zwaarste set met nog ${formatNumberNL(rir, rir % 1 === 0 ? 0 : 1)} ${rir === 1 ? 'herhaling' : 'herhalingen'} over`;
}
