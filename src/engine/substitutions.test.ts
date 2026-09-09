import { describe, it, expect } from 'vitest';
import { resolveEffectiveFullDuration } from './substitutions';
import type { SessionTemplate } from '../models/training';
import type { Program } from '../models/program';

// Monday 2026-01-05 — program week 1 starts here.
const START = '2026-01-05';

function fourPhaseProgram(): Program {
  return {
    id: 'prog', name: 'Test Programma', startDate: START,
    phases: [
      { id: 'phase_1', name: 'BASISFASE', order: 1, weekCount: 4 },
      { id: 'phase_2', name: 'OPBOUW', order: 2, weekCount: 4 },
      { id: 'phase_3', name: 'BERGCAPACITEIT', order: 3, weekCount: 4 },
      { id: 'phase_4', name: 'EXPEDITIEKLAAR', order: 4, weekCount: 4 },
    ],
  };
}

const tplEasyRun: SessionTemplate = {
  id: 'tpl_easy_run', name: 'Easy Run', type: 'cardio', durationVariants: { full: 35 },
  weeklyProgression: [
    { weekInPhase: 1, targetMinutes: 30, note: 'Wennen' },
    { weekInPhase: 2, targetMinutes: 35, note: 'Opbouw' },
    { weekInPhase: 3, targetMinutes: 40, note: 'Zwaarste week' },
    { weekInPhase: 4, targetMinutes: 27, note: 'Deload' },
  ],
};

function mondayOfWeek(weekNumber: number): string {
  // weekNumber is 1-indexed program week; START is week 1's Monday.
  const d = new Date(START);
  d.setDate(d.getDate() + (weekNumber - 1) * 7);
  return d.toISOString().slice(0, 10);
}

describe('resolveEffectiveFullDuration — weeklyProgression cross-phase carry-over', () => {
  it('the first cycle (weeks 1-4, phase 1) is completely unaffected — exact same numbers as before the fix', () => {
    const program = fourPhaseProgram();
    expect(resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(1), program)).toBe(30);
    expect(resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(2), program)).toBe(35);
    expect(resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(3), program)).toBe(40);
    expect(resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(4), program)).toBe(27);
  });

  it('Test PROGRESSION-CYCLE-CARRYOVER: phase 2 (weeks 5-8) scales the same shape up by 8% instead of resetting to phase 1\'s numbers', () => {
    const program = fourPhaseProgram();
    // Week 5 = weekInPhase 1 again (phase 2), but weekInProgram 5 -> cycleIndex 1 -> x1.08.
    expect(resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(5), program)).toBe(Math.round(30 * 1.08));
    expect(resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(6), program)).toBe(Math.round(35 * 1.08));
    expect(resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(7), program)).toBe(Math.round(40 * 1.08));
    expect(resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(8), program)).toBe(Math.round(27 * 1.08));
    // Never identical to phase 1's own numbers — this is the exact regression this fix closes.
    expect(resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(5), program)).not.toBe(30);
  });

  it('later cycles keep compounding, each strictly higher than the last, and stay bounded by the cap', () => {
    const program = fourPhaseProgram();
    const week3 = resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(3), program); // phase 1 peak
    const week7 = resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(7), program); // phase 2 peak
    const week11 = resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(11), program); // phase 3 peak
    const week15 = resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(15), program); // phase 4 peak
    expect(week7).toBeGreaterThan(week3);
    expect(week11).toBeGreaterThan(week7);
    expect(week15).toBeGreaterThan(week11);
    // 1 + 0.08*3 = 1.24, well under the 1.3 cap within this program's 16-week span.
    expect(week15).toBe(Math.round(40 * 1.24));
  });

  it('falls back to the static duration outside the program\'s span (resolveProgramWeek returns null)', () => {
    const program = fourPhaseProgram();
    expect(resolveEffectiveFullDuration(tplEasyRun, mondayOfWeek(99), program)).toBe(35); // durationVariants.full
  });

  it('a template with no weeklyProgression is untouched by any of this', () => {
    const tplStrength: SessionTemplate = { id: 'tpl_upper_a', name: 'Upper A', type: 'strength', durationVariants: { full: 75 } };
    const program = fourPhaseProgram();
    expect(resolveEffectiveFullDuration(tplStrength, mondayOfWeek(9), program)).toBe(75);
  });
});
