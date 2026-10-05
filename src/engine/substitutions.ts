import type { SessionTemplate, ExercisePrescription, SessionVariant } from '../models/training';
import type { Program } from '../models/program';
import { addDays } from '../utils/dates';
import { progressionTarget } from './programLayout';

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
}
let recentMaxima: RecentSessionMaxima = { asOf: '', minutesByTemplate: {} };
export function setRecentSessionMaxima(maxima: RecentSessionMaxima): void {
  recentMaxima = maxima;
}
const SESSION_SPIKE_LIMIT = 1.1;
const SPIKE_CAP_DAYS = 13;

export function recentSessionMaxima(logs: { templateId: string; completedDate: string; durationMinutes: number }[], asOf: string): RecentSessionMaxima {
  const from = addDays(asOf, -30);
  const minutesByTemplate: Record<string, number> = {};
  for (const l of logs) {
    if (l.completedDate < from || l.completedDate > asOf || !(l.durationMinutes > 0)) continue;
    minutesByTemplate[l.templateId] = Math.max(minutesByTemplate[l.templateId] ?? 0, l.durationMinutes);
  }
  return { asOf, minutesByTemplate };
}

export function resolveEffectiveFullDuration(
  template: SessionTemplate,
  scheduledDate: string,
  program: Program | null | undefined,
): number {
  const target = progressionTarget(template, program, scheduledDate);
  let base = target?.minutes ?? fullDuration(template);
  const longest = recentMaxima.minutesByTemplate[template.id];
  if (target && longest && scheduledDate >= recentMaxima.asOf && scheduledDate <= addDays(recentMaxima.asOf, SPIKE_CAP_DAYS)) {
    // Never below the first "Wennen" step: one short session must not pull
    // the whole build down.
    const floor = (target.phaseSteps.find((s) => s.weekInPhase === 1) ?? target.step).targetMinutes;
    const cap = Math.max(floor, Math.round((longest * SESSION_SPIKE_LIMIT) / 5) * 5);
    base = Math.min(base, cap);
  }
  const adjustment = durationAdjustments.find((a) => scheduledDate >= a.from && scheduledDate <= a.until);
  if (!adjustment) return base;
  // Rounded to whole 5 minutes, never below 15.
  return Math.max(15, Math.round((base * adjustment.factor) / 5) * 5);
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

export function weeklyProgressionNote(
  template: SessionTemplate,
  scheduledDate: string,
  program: Program | null | undefined,
): string | undefined {
  return progressionTarget(template, program, scheduledDate)?.step.note;
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
export const SESSION_VARIANTS_ENABLED = false;

export function availableVariants(template: SessionTemplate): SessionVariant[] {
  const variants: SessionVariant[] = ['full'];
  if (!SESSION_VARIANTS_ENABLED || template.type !== 'strength') return variants;
  if (template.durationVariants.short) variants.push('short');
  if (template.durationVariants.minimum) variants.push('minimum');
  return variants;
}
