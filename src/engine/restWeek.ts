// ASCEND — training through a rest week (production feedback: "ik wil de
// deload overslaan, ik zit net goed in de flow"). A planned rest week is
// good practice, not a law: the deload consensus (Bell e.a. 2023) treats
// it as a tool to manage fatigue, also to be moved or left out when there
// is little fatigue to shed. Two limits stay: never two rest weeks in a
// row skipped, and not right after pain. The skipped week becomes a
// normal build week (engine/programLayout.ts#waveWeek), so a run still
// never grows more than 10% over the month before (engine/substitutions.ts).
//
// Pure: no React, no IndexedDB.

import { hasSignificantPain } from './pain';
import type { Program } from '../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { IllnessEpisode } from '../models/illness';
import { addDays, mondayOfWeek, resolveProgramWeek } from '../utils/dates';
import { PHASE_BASIS, PHASE_TAPER, WAVE_LENGTH } from './programLayout';
import { logSport, templateSport } from './sports';
import { resolveEffectiveFullDuration } from './substitutions';
import { currentChoices, loadChange, type LoadChange, type WeekLoadContext } from './weekLoadChange';

export interface RestWeekState {
  isRestWeek: boolean; // a rest week in the plan (skipped or not)
  skipped: boolean;
  canSkip: boolean;
  reason?: string; // why it can't be skipped
}

export function restWeekState(program: Program, weekStart: string, logs: SessionLog[], today: string): RestWeekState {
  const monday = mondayOfWeek(weekStart);
  // The week as you chose it now, not the days held from before a change.
  const position = resolveProgramWeek(currentChoices(program), monday);
  const isRestWeek = !!position && position.phase.id !== PHASE_TAPER && ((position.weekInPhase - 1) % WAVE_LENGTH) + 1 === WAVE_LENGTH;
  const skipped = isRestWeek && !!position?.restSkipped;
  if (!isRestWeek) return { isRestWeek, skipped, canSkip: false };
  if (monday < mondayOfWeek(today)) return { isRestWeek, skipped, canSkip: false, reason: 'Deze week is al voorbij.' };
  if (program.skippedRestWeeks?.includes(addDays(monday, -7 * WAVE_LENGTH))) {
    return { isRestWeek, skipped, canSkip: false, reason: 'Je sloeg de vorige rustweek al over. Twee keer achter elkaar doorgaan stapelt vermoeidheid op, juist dan komt de rust binnen.' };
  }
  const since = addDays(today, -14);
  if (logs.some((l) => l.completedDate >= since && hasSignificantPain(l))) {
    return { isRestWeek, skipped, canSkip: false, reason: 'Je gaf de afgelopen twee weken pijn aan. Dan is deze rustweek juist nodig.' };
  }
  return { isRestWeek, skipped, canSkip: true };
}

// The program with this week's rest week skipped or restored.
export function withRestWeekSkipped(program: Program, weekStart: string, skip: boolean): Program {
  const monday = mondayOfWeek(weekStart);
  const others = (program.skippedRestWeeks ?? []).filter((w) => w !== monday);
  const next = skip ? [...others, monday].sort() : others;
  return { ...program, skippedRestWeeks: next.length ? next : undefined };
}

// What training through, or putting the rest week back, does to the week:
// only the trainings that are still open change (engine/weekLoadChange.ts).
// A change in the middle of the week holds the days before it.
export function restWeekChange(program: Program, weekStart: string, skip: boolean, ctx: WeekLoadContext): LoadChange {
  const monday = mondayOfWeek(weekStart);
  return loadChange(program, monday, addDays(monday, 6), (p) => withRestWeekSkipped(p, monday, skip), ctx);
}

// --- ASCEND proposes it itself (rule REST-WEEK-SKIP) -------------------------
//
// A rest week is there to shed the fatigue of the weeks before it. When
// you ran clearly less than planned in those weeks there is little to
// shed, and the rest week mostly costs a week of training. Then ASCEND
// proposes to train through, with Akkoord. Only in the basis, where the
// load is still low; from the Opbouw on the rest week stays unless you
// skip it yourself. The 75% is a practical line derived from what a rest
// week is for, not a number from a study.

export const LOW_LOAD_SHARE = 0.75;

export interface RestWeekSkipProposal {
  id: string; // per rest week: a "liever niet" holds for that week
  weekStart: string;
  plannedMinutes: number;
  doneMinutes: number;
}

export interface RestWeekSkipInputs {
  program: Program;
  plannedSessions: PlannedSession[];
  logs: SessionLog[];
  templates: SessionTemplate[];
  today: string;
  illnessEpisodes?: IllnessEpisode[];
  respondedIds: Set<string>;
}

export function proposeRestWeekSkip(inputs: RestWeekSkipInputs): RestWeekSkipProposal | undefined {
  const { program, today } = inputs;
  // The rest week of this week or next: offered from the weekend before
  // until the Wednesday of the rest week itself.
  for (const weekStart of [mondayOfWeek(today), addDays(mondayOfWeek(today), 7)]) {
    if (today < addDays(weekStart, -2) || today > addDays(weekStart, 2)) continue;
    const id = `rest-week-skip:${weekStart}`;
    if (inputs.respondedIds.has(id)) continue;
    const position = resolveProgramWeek(program, weekStart);
    if (!position || position.phase.id !== PHASE_BASIS) continue;
    const state = restWeekState(program, weekStart, inputs.logs, today);
    if (!state.isRestWeek || state.skipped || !state.canSkip) continue;

    const since = addDays(today, -14);
    if ((inputs.illnessEpisodes ?? []).some((e) => !e.endDate || e.endDate >= since)) continue;
    // Felt heavier than normal: the sessions the rest week lowers. Strength
    // follows MacroFactor and its own deload, the rest week doesn't touch it.
    if (inputs.logs.filter((l) => l.completedDate >= since && l.subjectiveFeel === 'worse' && l.type !== 'strength').length > 1) continue;

    // Running in the three weeks before the rest week, up to today.
    const from = addDays(weekStart, -7 * (WAVE_LENGTH - 1));
    const until = today < weekStart ? today : addDays(weekStart, -1);
    const byId = new Map(inputs.templates.map((t) => [t.id, t]));
    const plannedMinutes = inputs.plannedSessions
      .filter((s) => s.scheduledDate >= from && s.scheduledDate <= until)
      .reduce((n, s) => {
        const t = byId.get(s.templateId);
        return t && templateSport(t) === 'running' ? n + (s.plannedMinutes ?? resolveEffectiveFullDuration(t, s.scheduledDate, program)) : n;
      }, 0);
    const doneMinutes = inputs.logs
      .filter((l) => l.completedDate >= from && l.completedDate <= until && logSport(l) === 'running')
      .reduce((n, l) => n + l.durationMinutes, 0);
    if (plannedMinutes === 0 || doneMinutes >= plannedMinutes * LOW_LOAD_SHARE) continue;
    return { id, weekStart, plannedMinutes: Math.round(plannedMinutes), doneMinutes: Math.round(doneMinutes) };
  }
  return undefined;
}
