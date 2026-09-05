import type { SessionTemplate, ExercisePrescription, SessionVariant } from '../models/training';
import type { Program } from '../models/program';
import { resolveProgramWeek } from '../utils/dates';

// "Short" keeps core + accessory work, drops optional. "Minimum" keeps only
// core work — the smallest version of the session that still counts.
export function exercisesForVariant(template: SessionTemplate, variant: SessionVariant): ExercisePrescription[] {
  if (!template.exercises) return [];
  if (variant === 'full' || variant === 'custom') return template.exercises;
  if (variant === 'short') return template.exercises.filter((e) => e.priority !== 'optional');
  return template.exercises.filter((e) => e.priority === 'core');
}

export function durationForVariant(template: SessionTemplate, variant: SessionVariant): number {
  if (variant === 'short') return template.durationVariants.short ?? template.durationVariants.full;
  if (variant === 'minimum') return template.durationVariants.minimum ?? template.durationVariants.short ?? template.durationVariants.full;
  return template.durationVariants.full;
}

// Some templates (Easy Run, Bergconditie) target a different duration each
// week of the training block instead of one fixed number — see
// SessionTemplate.weeklyProgression. This resolves the *actual* target for
// one specific scheduled date, falling back to the static duration when no
// program/week match is available. Only affects the 'full' variant; short
// and minimum fallbacks stay fixed regardless of week.
export function resolveEffectiveFullDuration(
  template: SessionTemplate,
  scheduledDate: string,
  program: Program | null | undefined,
): number {
  if (template.weeklyProgression && program) {
    const position = resolveProgramWeek(program, scheduledDate);
    if (position) {
      const step = template.weeklyProgression.find((s) => s.weekInPhase === position.weekInPhase);
      if (step) return step.targetMinutes;
    }
  }
  return template.durationVariants.full;
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
  if (!template.weeklyProgression || !program) return undefined;
  const position = resolveProgramWeek(program, scheduledDate);
  if (!position) return undefined;
  return template.weeklyProgression.find((s) => s.weekInPhase === position.weekInPhase)?.note;
}

// Short/minimum variants trim the exercise list — meaningful only for
// strength sessions. Cardio/hiking sessions have no exercise list to trim,
// so "short" there was just a duration preset with an otherwise identical
// screen; only "full" is offered for those, and the duration field stays
// freely editable.
export function availableVariants(template: SessionTemplate): SessionVariant[] {
  const variants: SessionVariant[] = ['full'];
  if (template.type !== 'strength') return variants;
  if (template.durationVariants.short) variants.push('short');
  if (template.durationVariants.minimum) variants.push('minimum');
  return variants;
}
