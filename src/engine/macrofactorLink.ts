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
import { nameKey, type MacroFactorWorkout } from './macrofactorImport';
import { isLegSession, minutesLabel, strengthDataFor, strengthRirFor } from './macrofactorSets';
import { strengthChangeFor, type StrengthChange } from './macrofactorLead';
import { enrichStrengthData } from './macrofactorEnrich';
import type { ExerciseSetLog } from '../models/training';

export { isLegSession, minutesLabel, strengthDataFor, strengthRirFor };
import type { SessionLogDraft } from './activityImport';
import { formatNumberNL } from '../utils/number';

// MacroFactor workout name (as nameKey) to the ASCEND template id. null: the
// user said this workout is not part of ASCEND; never offered again.
export type NameMapping = Record<string, string | null>;

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
  // "MacroFactor is leidend voor kracht": the numbers of the file take over the
  // log's own duration, sets and reps in reserve; the old ones are kept on the
  // log (engine/macrofactorLead.ts).
  | { kind: 'takeover'; workout: MacroFactorWorkout; template: SessionTemplate; log: SessionLog; change: StrengthChange }
  // A log that came from this very workout earlier lacks the reps in reserve
  // per set and the warm-up sets; the working sets are equal, so only those
  // empty fields are added (engine/macrofactorEnrich.ts).
  | { kind: 'enrich'; workout: MacroFactorWorkout; template: SessionTemplate; log: SessionLog; strengthData: ExerciseSetLog[] }
  // The name has not been linked yet: the link card on the import page asks
  // once per name (engine/macrofactorNames.ts).
  | { kind: 'unmapped'; workout: MacroFactorWorkout };

export interface MacroFactorPlan {
  proposals: MacroFactorProposal[];
  // Already in the log (same id, or a log that has everything), left out by
  // the user, or not for ASCEND: nothing to offer, counted for the card.
  alreadyDone: number;
}

// A log that came from a MacroFactor file is that workout's own; one made by
// hand or from the watch can still be filled in.
const isMacroFactorLog = (l: SessionLog) => !!l.externalId?.startsWith('macrofactor:') || !!l.manualMeasured?.strength;

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
// With `leads` (the default, "MacroFactor is leidend voor kracht") the log of
// 1. takes over the file's duration, sets and reps in reserve; without it, the
// log is only filled in where a field is still empty.
export function planMacroFactor(
  workouts: MacroFactorWorkout[],
  mapping: NameMapping,
  dismissed: string[],
  planned: PlannedSession[],
  templates: SessionTemplate[],
  logs: SessionLog[],
  leads = true,
): MacroFactorPlan {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const dismissedSet = new Set(dismissed);
  const storedIds = new Set(logs.flatMap((l) => [l.externalId, l.manualMeasured?.strength?.workoutId]).filter((id): id is string => !!id));
  const loggedPlanned = new Set(logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id));
  const claimedLogs = new Set<string>();
  const claimedPlanned = new Set<string>();
  const proposals: MacroFactorProposal[] = [];
  let alreadyDone = 0;

  for (const workout of [...workouts].sort((a, b) => a.start.localeCompare(b.start))) {
    if (dismissedSet.has(workout.externalId)) {
      alreadyDone++;
      continue;
    }
    if (storedIds.has(workout.externalId)) {
      const stored = logs.find((l) => l.externalId === workout.externalId || l.manualMeasured?.strength?.workoutId === workout.externalId);
      const storedTemplate = stored ? templateById.get(stored.templateId) : undefined;
      const strengthData = stored ? enrichStrengthData(stored, workout) : undefined;
      if (stored && storedTemplate && strengthData) proposals.push({ kind: 'enrich', workout, template: storedTemplate, log: stored, strengthData });
      else alreadyDone++;
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
      if (leads && !sameTemplateLog.manualMeasured) {
        const change = strengthChangeFor(sameTemplateLog, workout, template);
        if (change) proposals.push({ kind: 'takeover', workout, template, log: sameTemplateLog, change });
        else alreadyDone++;
        continue;
      }
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
