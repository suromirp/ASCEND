// ASCEND — the program laid out toward the goal date (Fase 3).
//
// The program used to be four fixed blocks of 4 weeks from the start date,
// so "Expeditieklaar" fell 31 weeks before the GR5 and after week 16 there
// was no planning at all (docs/audit/3 Simulatie trainingsplan.md, findings
// 1, 2 and 8). Here the phases are counted BACKWARD from the main goal's
// date: a taper right before departure, Expeditieklaar before that,
// Bergcapaciteit, Opbouw, and the basis fills whatever time is left.
// Without a goal date the four blocks stay as they were, followed by an
// Onderhoud block that keeps growing, so a week is never empty.
//
// Pure: no React, no IndexedDB. storage/database.ts#syncProgramHorizon
// applies the result to the stored program and planning.

import type { Phase, Program, ResolvedProgramPosition } from '../models/program';
import type { SessionTemplate, WeeklyProgressionStep } from '../models/training';
import type { TrainingGoal, GoalMilestone } from '../models/goals';
import { addDays, daysBetween, mondayOfWeek, resolveProgramWeek } from '../utils/dates';

export const PHASE_BASIS = 'phase_1';
export const PHASE_OPBOUW = 'phase_2';
export const PHASE_BERG = 'phase_3';
export const PHASE_EXPEDITIE = 'phase_4';
export const PHASE_TAPER = 'phase_taper';
export const PHASE_ONDERHOUD = 'phase_onderhoud';

// The training wave inside every phase: wennen, opbouw, zwaarste week,
// deload (3:1, docs/onderzoek rapport 1).
export const WAVE_LENGTH = 4;

const PHASE_TEXT: Record<string, { name: string; description: string }> = {
  [PHASE_BASIS]: {
    name: 'BASISFASE',
    description: 'Kracht, een rustige aerobe basis en het weekendblok met heuvels en een lange duurloop. Golven van vier weken: wennen, opbouw, zwaarste week, rustweek.',
  },
  [PHASE_OPBOUW]: {
    name: 'OPBOUW',
    description: 'Langer rustig duurwerk, meer helling en de lange duurloop groeit verder. Dezelfde golf van vier weken.',
  },
  [PHASE_BERG]: {
    name: 'BERGCAPACITEIT',
    description: 'De lange zondag wordt een bergtocht: meer hoogtemeters omhoog en omlaag, en de rugzak gaat in kleine stappen zwaarder.',
  },
  [PHASE_EXPEDITIE]: {
    name: 'EXPEDITIEKLAAR',
    description: 'Twee wandeldagen achter elkaar in het weekend, richting tochtgewicht en ongeveer 1.000 m stijgen op een dag.',
  },
  [PHASE_TAPER]: {
    name: 'NAAR DE START',
    description: 'Minder volume, dezelfde intensiteit. Je komt fris aan de start. Geen nieuwe zware afdalingen meer.',
  },
  [PHASE_ONDERHOUD]: {
    name: 'ONDERHOUD',
    description: 'Er is geen doeldatum ingesteld. Je houdt vast wat je hebt opgebouwd tot je een nieuw doel kiest.',
  },
};

function phase(id: string, order: number, weekCount: number): Phase {
  return { id, order, weekCount, ...PHASE_TEXT[id] };
}

// The goal the program is laid out toward: the main goal (the one with the
// Ascent Ladder), when it is active and still ahead.
export function programAnchorDate(goals: TrainingGoal[], milestones: GoalMilestone[], today: string): string | undefined {
  const withLadder = new Set(milestones.map((m) => m.goalId));
  const main = goals.find((g) => g.status === 'active' && withLadder.has(g.id));
  if (!main || main.status !== 'active') return undefined;
  return main.targetDate > today ? main.targetDate : undefined;
}

// Weeks from the program's first Monday up to (not including) the goal
// date. A goal on a Wednesday still gets that week's Monday and Tuesday.
export function weeksUntilGoal(startDate: string, goalDate: string): number {
  return Math.ceil(daysBetween(mondayOfWeek(startDate), goalDate) / 7);
}

export function layoutPhasesForGoal(startDate: string, goalDate: string): Phase[] | null {
  const total = weeksUntilGoal(startDate, goalDate);
  if (total < 1) return null;
  // Two taper weeks when there is room for a real build before them.
  const taper = total >= 8 ? 2 : total >= 3 ? 1 : 0;
  let rest = total - taper;
  const expeditie = Math.min(WAVE_LENGTH, rest);
  rest -= expeditie;
  const berg = Math.min(rest >= 20 ? 8 : WAVE_LENGTH, rest);
  rest -= berg;
  const opbouw = Math.min(rest >= 24 ? 12 : rest >= 12 ? 8 : WAVE_LENGTH, rest);
  rest -= opbouw;
  const basis = rest;
  const counts: [string, number][] = [
    [PHASE_BASIS, basis],
    [PHASE_OPBOUW, opbouw],
    [PHASE_BERG, berg],
    [PHASE_EXPEDITIE, expeditie],
    [PHASE_TAPER, taper],
  ];
  return counts.filter(([, n]) => n > 0).map(([id, n], i) => phase(id, i + 1, n));
}

// Without a goal: the original four blocks, then Onderhoud for as long as
// needed to keep at least `horizonWeeks` of planning ahead of today.
export function layoutPhasesWithoutGoal(startDate: string, today: string, horizonWeeks = 12): Phase[] {
  const blocks = [PHASE_BASIS, PHASE_OPBOUW, PHASE_BERG, PHASE_EXPEDITIE].map((id, i) => phase(id, i + 1, WAVE_LENGTH));
  const neededWeeks = Math.floor(daysBetween(mondayOfWeek(startDate), mondayOfWeek(today)) / 7) + 1 + horizonWeeks;
  const extra = neededWeeks - blocks.length * WAVE_LENGTH;
  if (extra <= 0) return blocks;
  // Whole waves, so the deload week stays where it belongs.
  return [...blocks, phase(PHASE_ONDERHOUD, blocks.length + 1, Math.ceil(extra / WAVE_LENGTH) * WAVE_LENGTH)];
}

export function layoutPhases(startDate: string, goalDate: string | undefined, today: string): Phase[] {
  return (goalDate && layoutPhasesForGoal(startDate, goalDate)) || layoutPhasesWithoutGoal(startDate, today);
}

export function programEndDate(program: Program): string {
  const weeks = program.phases.reduce((sum, p) => sum + p.weekCount, 0);
  return addDays(mondayOfWeek(program.startDate), weeks * 7);
}

// --- what a week asks for --------------------------------------------------

// Which week of the wave this is (1-4). The taper has no wave of its own.
export function waveWeek(position: ResolvedProgramPosition): number {
  return ((position.weekInPhase - 1) % WAVE_LENGTH) + 1;
}

// Taper volume: first week about 70%, the last about 50% of a normal
// build week, intensity unchanged (Bosquet 2007, docs/onderzoek rapport 1).
// One taper week sits in between.
export function taperFactor(position: ResolvedProgramPosition): number | undefined {
  if (position.phase.id !== PHASE_TAPER) return undefined;
  if (position.phase.weekCount === 1) return 0.6;
  return position.weekInPhase === 1 ? 0.7 : 0.5;
}

// ASCEND_HEURISTIC(PROGRESSION-CYCLE-CARRYOVER): every repeat of the 4-week
// shape scales it up by 8%, capped at 1.3x, so phase after phase keeps
// building instead of resetting to the "Wennen" numbers. The first wave is
// unaffected. Steps written for one specific phase (phaseId) are explicit
// targets and never scaled.
const CYCLE_GROWTH_PER_REPEAT = 0.08;
const CYCLE_GROWTH_CAP = 1.3;

export function cycleMultiplier(weekInProgram: number): number {
  const cycleIndex = Math.floor((weekInProgram - 1) / WAVE_LENGTH);
  return Math.min(1 + CYCLE_GROWTH_PER_REPEAT * cycleIndex, CYCLE_GROWTH_CAP);
}

export interface ProgressionTarget {
  step: WeeklyProgressionStep;
  minutes: number;
  // The steps of this phase, for the "deze fase" overview.
  phaseSteps: WeeklyProgressionStep[];
}

// The target for one template in one program week. Phase-specific steps
// win (matched on the exact week in the phase first, then on the wave
// week); otherwise the generic 4-week shape, scaled per cycle, and in the
// taper a normal build week scaled down.
export function progressionTarget(template: SessionTemplate, program: Program | null | undefined, dateIso: string): ProgressionTarget | undefined {
  const steps = template.weeklyProgression;
  if (!steps || !program) return undefined;
  const position = resolveProgramWeek(program, dateIso);
  if (!position) return undefined;
  const wave = waveWeek(position);

  const own = steps.filter((s) => s.phaseId === position.phase.id);
  if (own.length > 0) {
    const step = own.find((s) => s.weekInPhase === position.weekInPhase) ?? own.find((s) => s.weekInPhase === wave) ?? own[own.length - 1];
    return { step, minutes: step.targetMinutes, phaseSteps: own };
  }

  const generic = steps.filter((s) => !s.phaseId);
  if (generic.length === 0) return undefined;
  const taper = taperFactor(position);
  const step = generic.find((s) => s.weekInPhase === (taper ? 2 : wave));
  if (!step) return undefined;
  const scaled = step.targetMinutes * cycleMultiplier(position.weekInProgram);
  if (taper) {
    const minutes = Math.max(15, Math.round((scaled * taper) / 5) * 5);
    return { step: { ...step, note: position.weekInPhase === position.phase.weekCount ? 'Laatste week voor de start, kort en fris' : 'Minder volume, zelfde tempo' }, minutes, phaseSteps: generic };
  }
  return { step, minutes: Math.round(scaled), phaseSteps: generic };
}

// --- the weekly pattern per phase -------------------------------------------

// From Bergcapaciteit on, the long Sunday becomes a mountain hike, and in
// Expeditieklaar the Saturday becomes the first of two hiking days
// (docs/onderzoek rapport 1: phase 3 shifts to hikes with D+/D− and a pack,
// phase 4 back-to-back days). The hikes take the slot of the session they
// replace. The user can keep the long run instead (settings), and when
// hiking is switched off the original sessions simply stay.
export interface PatternSwap {
  from: string;
  to: string;
  phases: string[];
}

export const PATTERN_SWAPS: PatternSwap[] = [
  { from: 'tpl_long_run', to: 'tpl_mountain_hike', phases: [PHASE_BERG, PHASE_EXPEDITIE, PHASE_TAPER] },
  { from: 'tpl_hill_intervals', to: 'tpl_hike_day_one', phases: [PHASE_EXPEDITIE] },
];

export interface SwapSettings {
  // 'hike' (default): the long Sunday becomes a mountain hike from
  // Bergcapaciteit on. 'run': keep the long run every week.
  longSundaySession?: 'hike' | 'run';
}

export function activeSwaps(templates: SessionTemplate[], settings: SwapSettings, plannable: (t: SessionTemplate) => boolean): PatternSwap[] {
  if (settings.longSundaySession === 'run') return [];
  const byId = new Map(templates.map((t) => [t.id, t]));
  return PATTERN_SWAPS.filter((s) => {
    const to = byId.get(s.to);
    return !!to && plannable(to);
  });
}

export interface PatternSlot {
  template: SessionTemplate;
  dayOfWeek: number;
}

// The weekly pattern for one week of the program. `pattern` is the
// already sport-filtered set of templates with a usual weekday
// (engine/sports.ts#weeklyPatternTemplates).
export function patternForWeek(pattern: SessionTemplate[], allTemplates: SessionTemplate[], swaps: PatternSwap[], phaseId: string | undefined): PatternSlot[] {
  const byId = new Map(allTemplates.map((t) => [t.id, t]));
  return pattern
    .filter((t) => t.defaultDayOfWeek)
    .map((t) => {
      const swap = phaseId ? swaps.find((s) => s.from === t.id && s.phases.includes(phaseId)) : undefined;
      const template = (swap && byId.get(swap.to)) || t;
      return { template, dayOfWeek: t.defaultDayOfWeek as number };
    });
}

// For an already planned session: which template it should be in the
// phase its week now falls in. Used when the goal date (and with it the
// phases) moves, so a planned long run becomes a hike or back.
export function templateForPhase(templateId: string, swaps: PatternSwap[], phaseId: string | undefined): string {
  if (!phaseId) return templateId;
  const forward = swaps.find((s) => s.from === templateId && s.phases.includes(phaseId));
  if (forward) return forward.to;
  // A hike in a week that no longer asks for one (goal moved, or the user
  // chose to keep the long run) goes back to the original session.
  const back = PATTERN_SWAPS.find((s) => s.to === templateId);
  if (back && !swaps.some((s) => s.to === templateId && s.phases.includes(phaseId))) return back.from;
  return templateId;
}
