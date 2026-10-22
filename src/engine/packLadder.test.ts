import { describe, it, expect } from 'vitest';
import { packLadder, PACK_MAX_STEP_KG, type LadderWeek } from './packLadder';
import { layoutPhasesForGoal, packKgOn, packLadderOf, progressionTarget, PHASE_BASIS, PHASE_BERG, PHASE_EXPEDITIE, PHASE_TAPER, type PhaseLengthOverrides } from './programLayout';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays, resolveProgramWeek } from '../utils/dates';
import type { Program } from '../models/program';

// Week 1 on a Monday in autumn 2026, the GR5 on 1 August 2027: 41 weeks, in
// phases of 15 (basis), 12 (Opbouw), 8 (Bergcapaciteit), 4 (Expeditieklaar)
// and 2 (afbouw).
const START = '2026-10-19';
const GOAL = '2027-08-01';
const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;

function programFor(kg?: number, over?: PhaseLengthOverrides, goal = GOAL): Program {
  return { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, goal, over)!, ...(kg !== undefined ? { packTargetKg: kg } : {}) };
}

interface Week { monday: string; phaseId: string; weekInPhase: number; rest: boolean; kg: number }
function weeksOf(program: Program): Week[] {
  const ladder = packLadderOf(program);
  return ladder.map((kg, i) => {
    const monday = addDays(START, i * 7);
    const pos = resolveProgramWeek(program, monday)!;
    return { monday, phaseId: pos.phase.id, weekInPhase: pos.weekInPhase, rest: pos.phase.id !== PHASE_TAPER && pos.weekInPhase % 4 === 0, kg };
  });
}
const build = (weeks: Week[]) => weeks.filter((w) => !w.rest && w.phaseId !== PHASE_TAPER);

describe('the pack ladder of the default program (rugzakdoel 14 kg)', () => {
  const weeks = weeksOf(programFor());

  it('starts light this winter: 5 kg, and at most 6,5 kg before the first mountain hike', () => {
    const winter = build(weeks).filter((w) => w.phaseId !== PHASE_BERG && w.phaseId !== PHASE_EXPEDITIE);
    expect(winter[0].kg).toBe(5);
    expect(Math.max(...winter.map((w) => w.kg))).toBeLessThanOrEqual(6.5);
    expect(winter.every((w) => w.kg >= 5)).toBe(true);
    // Basis: flat and light. Opbouw: a little heavier toward the end.
    expect(build(weeks).filter((w) => w.phaseId === PHASE_BASIS).every((w) => w.kg === 5)).toBe(true);
  });

  it('climbs in steps of 1 to 2 kg, never backwards, up to the heaviest weekend', () => {
    const hike = build(weeks).filter((w) => w.phaseId === PHASE_BERG || w.phaseId === PHASE_EXPEDITIE);
    for (let i = 1; i < hike.length; i++) {
      const step = hike[i].kg - hike[i - 1].kg;
      expect(step, hike[i].monday).toBeGreaterThanOrEqual(0);
      expect(step, hike[i].monday).toBeLessThanOrEqual(PACK_MAX_STEP_KG);
      if (step > 0) expect(step, hike[i].monday).toBeGreaterThanOrEqual(1);
    }
    // The first mountain hike is 7 kg, the heaviest weeks 15 kg.
    expect(hike[0].kg).toBe(7);
    expect(hike[hike.length - 1].kg).toBe(15);
  });

  it('peaks 1 kg above the goal in the heaviest weeks, and never higher', () => {
    expect(Math.max(...weeks.map((w) => w.kg))).toBe(15);
    const heaviest = weeks.filter((w) => w.kg === 15);
    expect(heaviest.map((w) => [w.phaseId, w.weekInPhase])).toEqual([[PHASE_EXPEDITIE, 2], [PHASE_EXPEDITIE, 3]]);
  });

  it('a rest week is 2 kg lighter than the week before, and the taper lighter than the peak', () => {
    for (let i = 1; i < weeks.length; i++) {
      if (!weeks[i].rest) continue;
      expect(weeks[i].kg, weeks[i].monday).toBe(Math.max(4, weeks[i - 1].kg - 2));
    }
    const taper = weeks.filter((w) => w.phaseId === PHASE_TAPER).map((w) => w.kg);
    expect(taper).toEqual([12, 9]);
  });
});

describe('the ladder reads the goal, it is not fixed at 14 kg', () => {
  for (const target of [8, 10, 12, 14, 16, 18]) {
    it(`a goal of ${target} kg: starts light, steps of at most 2 kg, ceiling ${target + 1} kg`, () => {
      const weeks = weeksOf(programFor(target));
      const kgs = weeks.map((w) => w.kg);
      expect(kgs[0]).toBeLessThanOrEqual(5);
      expect(Math.max(...kgs)).toBe(target + 1);
      const b = build(weeks);
      for (let i = 1; i < b.length; i++) {
        expect(b[i].kg - b[i - 1].kg, b[i].monday).toBeLessThanOrEqual(PACK_MAX_STEP_KG);
        expect(b[i].kg - b[i - 1].kg, b[i].monday).toBeGreaterThanOrEqual(0);
      }
    });
  }

  it('a heavier goal gives a heavier ladder in the same weeks, and no goal weight means the 14 kg of the tent', () => {
    const light = weeksOf(programFor(12)).map((w) => w.kg);
    const heavy = weeksOf(programFor(16)).map((w) => w.kg);
    expect(heavy.reduce((a, b) => a + b, 0)).toBeGreaterThan(light.reduce((a, b) => a + b, 0));
    expect(Math.max(...light)).toBe(13);
    expect(Math.max(...heavy)).toBe(17);
    expect(weeksOf(programFor()).map((w) => w.kg)).toEqual(weeksOf(programFor(14)).map((w) => w.kg));
    // An absurd value falls back instead of breaking the program.
    expect(weeksOf(programFor(0)).map((w) => w.kg)).toEqual(weeksOf(programFor(14)).map((w) => w.kg));
  });

  it('progressionTarget gives the hikes and the rucksack walk the pack of the week, other trainings none', () => {
    const program = programFor(16);
    const week = (phaseId: string, weekInPhase: number) => weeksOf(program).find((w) => w.phaseId === phaseId && w.weekInPhase === weekInPhase)!;
    const heaviest = week(PHASE_EXPEDITIE, 3);
    expect(heaviest.kg).toBe(17);
    expect(progressionTarget(tpl('tpl_mountain_hike'), program, heaviest.monday)!.step.backpackKg).toBe(17);
    expect(progressionTarget(tpl('tpl_hike_day_one'), program, heaviest.monday)!.step.backpackKg).toBe(17);
    expect(progressionTarget(tpl('tpl_ruck_walk'), program, heaviest.monday)!.step.backpackKg).toBe(17);
    expect(progressionTarget(tpl('tpl_long_run'), program, heaviest.monday)!.step.backpackKg).toBeUndefined();
    // The winter walk is light: 5 kg in the first week.
    expect(progressionTarget(tpl('tpl_ruck_walk'), program, START)!.step.backpackKg).toBe(5);
    expect(packKgOn(program, START)).toBe(5);
    expect(packKgOn(program, '2030-01-01')).toBeUndefined();
  });
});

describe('the pack never goes up in a week the D+ goes up', () => {
  const layouts: [string, PhaseLengthOverrides | undefined, string][] = [
    ['the default', undefined, GOAL],
    ['a long Bergcapaciteit', { [PHASE_BERG]: 12 }, GOAL],
    ['a short Bergcapaciteit', { [PHASE_BERG]: 4 }, GOAL],
    ['an Expeditieklaar of eight weeks', { [PHASE_EXPEDITIE]: 8 }, GOAL],
    ['a goal 14 weeks away', undefined, addDays(START, 14 * 7)],
    ['a goal 30 weeks away', undefined, addDays(START, 30 * 7)],
  ];
  for (const [name, over, goal] of layouts) {
    for (const target of [10, 14, 16]) {
      it(`${name}, goal of ${target} kg`, () => {
        const program = programFor(target, over, goal);
        const total = program.phases.reduce((n, p) => n + p.weekCount, 0);
        let previous: { kg: number; sunday: number; saturday?: number } | undefined;
        let hikeWeeks = 0;
        for (let i = 0; i < total; i++) {
          const monday = addDays(START, i * 7);
          const pos = resolveProgramWeek(program, monday)!;
          const sunday = progressionTarget(tpl('tpl_mountain_hike'), program, monday)?.step;
          if (!sunday || pos.phase.id === PHASE_TAPER || pos.weekInPhase % 4 === 0) continue;
          const saturday = progressionTarget(tpl('tpl_hike_day_one'), program, monday)?.step.elevationGainM;
          hikeWeeks++;
          if (previous) {
            const packUp = sunday.backpackKg! > previous.kg;
            const climbUp = sunday.elevationGainM! > previous.sunday || (saturday !== undefined && previous.saturday !== undefined && saturday > previous.saturday);
            expect(packUp && climbUp, `week ${i + 1}`).toBe(false);
            expect(sunday.backpackKg! - previous.kg, `week ${i + 1}`).toBeLessThanOrEqual(PACK_MAX_STEP_KG);
          }
          previous = { kg: sunday.backpackKg!, sunday: sunday.elevationGainM!, saturday: saturday ?? previous?.saturday };
        }
        expect(hikeWeeks).toBeGreaterThan(2);
      });
    }
  }
});

describe('packLadder, the pure part', () => {
  const week = (kind: LadderWeek['kind'], hike = false, elevationRises = false): LadderWeek => ({ kind, hike, elevationRises });

  it('holds the pack in a week with more D+ and takes the step in the next one', () => {
    const weeks = [week('build', true), week('build', true, true), week('build', true), week('build', true, true), week('build', true)];
    const kg = packLadder(weeks, 12);
    expect(kg[1]).toBe(kg[0]);
    expect(kg[3]).toBe(kg[2]);
    expect(kg[2]).toBeGreaterThan(kg[1]);
    expect(kg[4]).toBeGreaterThan(kg[3]);
    expect(kg[4]).toBe(13);
  });

  it('without a mountain hike in the program it stays light', () => {
    expect(packLadder([week('build'), week('build'), week('rest'), week('build')], 14)).toEqual([5, 5, 4, 5]);
  });

  it('a very small or missing goal never gives a negative or heavier-than-asked pack', () => {
    for (const target of [0, -3, NaN, 2]) {
      const kg = packLadder([week('build'), week('build', true), week('build', true), week('rest'), week('taper')], target);
      expect(kg.every((v) => Number.isFinite(v) && v > 0 && v <= 6)).toBe(true);
    }
  });

  it('one hike week ends at the peak without a ramp it cannot walk', () => {
    expect(packLadder([week('build', true)], 14)).toEqual([15]);
  });
});
