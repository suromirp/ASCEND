import type { SessionTemplate, ExercisePrescription, SessionVariant } from '../models/training';

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

export function availableVariants(template: SessionTemplate): SessionVariant[] {
  const variants: SessionVariant[] = ['full'];
  if (template.durationVariants.short) variants.push('short');
  if (template.durationVariants.minimum) variants.push('minimum');
  return variants;
}
