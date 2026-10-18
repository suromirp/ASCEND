// ASCEND — the few numbers that say what an interval, hill or tempo
// session really was (production feedback: "dit geeft helemaal niet weer
// wat ik nou echt heb gedaan"; the average heart rate and cadence mix the
// hard repeats with walking back down). Prefilled from the plan, so
// logging stays a few taps: change only what went differently.
//
// Pure: no React, no IndexedDB.

import type { SessionLog, WorkoutDetails } from '../models/training';
import type { WorkoutPlan } from './workoutPlan';

export type DetailForm = 'repeats' | 'block';

// Repeats: count and length of each hard part. Block: one continuous
// stretch at tempo. The test run and race already log time and distance.
const FORM: Record<string, DetailForm> = {
  tpl_hill_intervals: 'repeats',
  tpl_hills_descent: 'repeats',
  tpl_intervals: 'repeats',
  tpl_fartlek: 'repeats',
  tpl_strides_run: 'repeats',
  tpl_tempo_run: 'block',
  tpl_progression_run: 'block',
};

export function detailForm(templateId: string): DetailForm | undefined {
  return FORM[templateId];
}

// What the plan asked for, as the starting values of the form.
export function plannedDetails(templateId: string, plan: WorkoutPlan | undefined): WorkoutDetails {
  const form = detailForm(templateId);
  if (!form || !plan) return {};
  if (form === 'repeats') {
    for (const item of plan.items) {
      if (!('repeat' in item)) continue;
      const work = item.steps.find((s) => s.kind === 'work');
      return { reps: item.repeat, repSeconds: work?.seconds };
    }
    return {};
  }
  // Block: the hard steps added up (a tempo run's blocks, the steady end).
  const hardSeconds = plan.timeline.filter((s) => s.intensity >= 3).reduce((n, s) => n + s.seconds, 0);
  return hardSeconds > 0 ? { blockMinutes: Math.round(hardSeconds / 60) } : {};
}

// Repeat length on the form: steps of 15 s up to 2 min, then 30 s.
export function stepRepSeconds(seconds: number, dir: 1 | -1): number {
  const step = (dir > 0 ? seconds >= 120 : seconds > 120) ? 30 : 15;
  return Math.max(15, Math.min(600, seconds + dir * step));
}

// Under 2 minutes in seconds ("75 s"), longer in minutes ("4 min", "2:30 min").
export function formatRep(seconds: number): string {
  if (seconds < 120) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')} min`;
}

const HILL = new Set(['tpl_hill_intervals', 'tpl_hills_descent']);

// One line for the history: "7 × 75 s bergop · piek 186".
export function workoutLine(log: Pick<SessionLog, 'templateId' | 'workout'>): string | undefined {
  const w = log.workout;
  if (!w) return undefined;
  const parts: string[] = [];
  if (w.reps && w.repSeconds) parts.push(`${w.reps} × ${formatRep(w.repSeconds)}${HILL.has(log.templateId) ? ' bergop' : ''}`);
  else if (w.reps) parts.push(`${w.reps} herhalingen`);
  if (w.blockMinutes) parts.push(`${w.blockMinutes} min stevig${w.blockHeartRate ? `, gem. ${w.blockHeartRate}` : ''}`);
  if (w.peakHeartRate) parts.push(`piek ${w.peakHeartRate}`);
  return parts.length ? parts.join(' · ') : undefined;
}

// Only what was filled in; an empty form saves nothing.
export function cleanDetails(w: WorkoutDetails): WorkoutDetails | undefined {
  const out: WorkoutDetails = {};
  for (const [k, v] of Object.entries(w) as [keyof WorkoutDetails, number | undefined][]) if (typeof v === 'number' && v > 0) out[k] = v;
  return Object.keys(out).length ? out : undefined;
}
