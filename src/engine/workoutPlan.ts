// ASCEND — turns a training's structure (data/workoutStructure.ts) into
// the concrete steps for one session: the planned minutes of that week
// fill the main block, repeats follow the week in the phase (scaled when
// a later phase plans more minutes), and the same steps become a Garmin
// workout to rebuild in Garmin Connect. Pure; the guide sheet renders it.

import type { SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { WORKOUTS, type Intensity, type StepKind, type StepSpec, type StructureSpec, type RepeatSpec } from '../data/workoutStructure';
import { resolveEffectiveFullDuration } from './substitutions';
import { resolveEffectiveStressProfile } from './stressProfile';
import { resolveProgramWeek } from '../utils/dates';
import { progressionTarget, waveWeek } from './programLayout';

export interface PlanStep {
  kind: StepKind;
  label: string;
  seconds: number;
  intensity: Intensity;
  detail?: string;
}

export type PlanItem = { step: PlanStep } | { repeat: number; steps: PlanStep[] };

export interface WorkoutPlan {
  summary: string;
  totalMinutes: number;
  repeats?: number;
  items: PlanItem[];
  // Every step in order, repeats written out: what the chart draws.
  timeline: PlanStep[];
  garmin?: { sport: string; lines: string[] };
  builds: { label: string; why: string }[];
  keyTag?: string;
  // Benen / bovenlichaam / conditie, 0-3 (none..heavy).
  load: { label: string; level: number }[];
  // What this week asks for besides time (mountain hike: D+ and backpack).
  targets: string[];
  // This phase's weeks, from the template's own weekly progression.
  weeks: { week: number; minutes: number; note: string; current: boolean }[];
}

const isRepeat = (s: StructureSpec): s is RepeatSpec => 'repeatsByWeek' in s;
const fixedSeconds = (s: StepSpec) => (s.minutes ?? 0) * 60 + (s.seconds ?? 0);
const LOAD_LEVEL: Record<string, number> = { none: 0, light: 1, moderate: 2, heavy: 3 };

export function buildWorkoutPlan(template: SessionTemplate, dateIso: string | undefined, program: Program | null | undefined): WorkoutPlan | undefined {
  const spec = WORKOUTS[template.id];
  if (!spec) return undefined;
  const totalMinutes = dateIso ? resolveEffectiveFullDuration(template, dateIso, program) : template.durationVariants.full;
  const target = dateIso ? progressionTarget(template, program, dateIso) : undefined;
  const position = dateIso && program ? resolveProgramWeek(program, dateIso) : null;
  // Repeats follow the wave week (1-4), also in a longer phase.
  const weekInPhase = position ? waveWeek(position) : 1;
  const phaseSteps = target?.phaseSteps ?? (template.weeklyProgression ?? []).filter((w) => !w.phaseId);
  const baseStep = phaseSteps.find((w) => w.weekInPhase === weekInPhase) ?? target?.step;
  const scale = baseStep ? totalMinutes / baseStep.targetMinutes : 1;

  let repeats: number | undefined;
  const items: PlanItem[] = [];
  let fixed = 0;
  for (const s of spec.structure) {
    if (isRepeat(s)) {
      const base = s.repeatsByWeek[weekInPhase] ?? s.repeatsByWeek[1];
      repeats = Math.max(1, Math.min(10, Math.round(base * scale)));
      fixed += repeats * s.steps.reduce((sum, st) => sum + fixedSeconds(st), 0);
    } else if (!s.rest) {
      fixed += fixedSeconds(s);
    }
  }
  const restSeconds = Math.max(5 * 60, totalMinutes * 60 - fixed);
  // Without a flexible main block, the minutes left over go to warming up
  // and cooling down, so the steps always add up to the planned duration
  // (production feedback: the chart said 38 min, the session 40).
  const hasRest = spec.structure.some((s) => !isRepeat(s) && s.rest);
  const edges = spec.structure.filter((s): s is StepSpec => !isRepeat(s) && (s.kind === 'warmup' || s.kind === 'cooldown'));
  const leftover = totalMinutes * 60 - fixed;
  const edgeExtra = !hasRest && edges.length > 0 && leftover > 0 ? Math.round(leftover / edges.length / 60) * 60 : 0;
  const toStep = (s: StepSpec): PlanStep => ({
    kind: s.kind,
    label: s.label,
    seconds: s.rest ? restSeconds : fixedSeconds(s) + (edges.includes(s) ? edgeExtra : 0),
    intensity: s.intensity,
    detail: s.detail,
  });
  for (const s of spec.structure) {
    if (isRepeat(s)) items.push({ repeat: repeats!, steps: s.steps.map(toStep) });
    else items.push({ step: toStep(s) });
  }
  const timeline = items.flatMap((it) => ('step' in it ? [it.step] : Array.from({ length: it.repeat }, () => it.steps).flat()));

  const profile = resolveEffectiveStressProfile(template);
  const load = [
    { label: 'Benen', level: LOAD_LEVEL[profile.lowerBodyLoad] ?? 0 },
    { label: 'Bovenlichaam', level: LOAD_LEVEL[profile.upperBodyLoad ?? 'none'] ?? 0 },
    { label: 'Conditie', level: LOAD_LEVEL[profile.cardioLoad ?? 'none'] ?? 0 },
  ];

  // Phase-specific steps are explicit numbers; the generic wave is shown
  // at this cycle's scale.
  const explicit = phaseSteps.some((w) => w.phaseId);
  const currentWeek = explicit ? position?.weekInPhase : weekInPhase;
  const weeks = phaseSteps.map((w) => ({
    week: w.weekInPhase,
    minutes: explicit ? w.targetMinutes : Math.round(w.targetMinutes * scale),
    note: w.note ?? '',
    current: !!position && w.weekInPhase === currentWeek,
  }));

  const step = target?.step;
  const targets = [
    step?.elevationGainM ? `${step.elevationGainM} m stijgen en dalen` : undefined,
    step?.backpackKg ? `Rugzak ${step.backpackKg} kg` : undefined,
  ].filter((t): t is string => !!t);

  return {
    summary: spec.summary(repeats),
    targets,
    totalMinutes,
    repeats,
    items,
    timeline,
    garmin: spec.garminSport ? { sport: spec.garminSport, lines: garminLines(items) } : undefined,
    builds: spec.builds,
    keyTag: spec.keyTag,
    load,
    weeks,
  };
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const GARMIN_STEP: Record<StepKind, string> = {
  warmup: 'Warming-up', cooldown: 'Cooling-down', recover: 'Herstel', work: 'Hardlopen', run: 'Hardlopen', walk: 'Wandelen', strength: 'Kracht',
};

function garminTarget(step: PlanStep): string {
  if (step.intensity === 4) return 'doel: inspanning hard (RPE 8-9)';
  return `doel: hartslag ${['', 'zone 1', 'zone 2', 'zone 3', ''][step.intensity]}`;
}

// "Warming-up · 10:00 · doel: hartslag zone 2", "Herhaal 5×", ...
export function garminLines(items: PlanItem[]): string[] {
  const line = (s: PlanStep, indent = '') => `${indent}${GARMIN_STEP[s.kind]} · ${formatClock(s.seconds)} · ${garminTarget(s)}`;
  return items.flatMap((it) => ('step' in it ? [line(it.step)] : [`Herhaal ${it.repeat}×`, ...it.steps.map((s) => line(s, '   '))]));
}
