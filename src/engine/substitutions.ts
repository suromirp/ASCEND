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

// weeklyProgression is defined once per template as a short Wennen →
// Opbouw → Zwaarste week → Deload shape (data/defaultProgram.ts), keyed by
// weekInPhase — which resets to 1 at the start of every Phase
// (utils/dates.ts#resolveProgramWeek). Phase 2-4 today reuse that exact
// same shape as placeholder content (their own description field says so
// literally: "Placeholder — nog niet door jou ingevuld"), so a naive
// weekInPhase lookup would make training visibly reset to the "Wennen"
// numbers every 4 weeks, forever plateauing at the first cycle's own
// peak — never actually building further, exactly the symptom a user
// reported (screens showing week 5 identical to week 1).
//
// ASCEND_HEURISTIC(PROGRESSION-CYCLE-CARRYOVER): a purely mechanical
// carry-over, not new training content — every time this same 4-step
// shape repeats (weekInProgram, monotonic across the whole program,
// divided by the shape's own length), the whole shape scales up by +8%
// per full repeat, capped at 1.3x. The very first cycle (weeks 1-4) is
// unaffected (multiplier 1.0) — today's numbers stay exactly as they are.
// Bounded and modest on purpose: this program only spans 16 weeks
// (utils/dates.ts#resolveProgramWeek returns null beyond it), so this
// compounds at most 3 times with today's 4-phase x 4-week layout. This is
// a safety net so a still-placeholder phase 2-4 keeps building rather than
// silently resetting — it never substitutes for the user's own, real
// phase-specific content once they write it (see Phase.description).
const PROGRESSION_CYCLE_GROWTH_PER_REPEAT = 0.08;
const PROGRESSION_CYCLE_GROWTH_CAP = 1.3;

function progressionCycleMultiplier(weekInProgram: number, cycleLength: number): number {
  const cycleIndex = Math.floor((weekInProgram - 1) / cycleLength); // 0-indexed: 0 = first pass through the shape
  return Math.min(1 + PROGRESSION_CYCLE_GROWTH_PER_REPEAT * cycleIndex, PROGRESSION_CYCLE_GROWTH_CAP);
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
      if (step) {
        const multiplier = progressionCycleMultiplier(position.weekInProgram, template.weeklyProgression.length);
        return Math.round(step.targetMinutes * multiplier);
      }
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
