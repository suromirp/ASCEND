import { describe, it, expect } from 'vitest';
import { buildSessionBrief, durationLabel } from './sessionBrief';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { layoutPhasesForGoal } from './programLayout';
import { addDays } from '../utils/dates';
import type { Program } from '../models/program';

const START = '2026-09-14';
const GR5 = '2027-08-02';
const program: Program = { id: 'p', name: 'P', startDate: START, phases: layoutPhasesForGoal(START, GR5)! };
const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;

describe('buildSessionBrief', () => {
  it('names the sport and kind of training, with the same numbers as the plan', () => {
    const saturday = addDays(START, 5);
    const brief = buildSessionBrief(tpl('tpl_hill_intervals'), saturday, program);
    expect(brief.headline).toBe('HARDLOPEN · BERGOP');
    expect(brief.facts.map((f) => f.value)).toEqual(['35 min', '5 × 1 min', 'RPE 8-9']);
    expect(brief.weekLabel).toBe('Week 1 van 20, basisfase · wennen');
    expect(brief.stopSignals.length).toBeGreaterThan(0);
  });

  it('follows the chosen way of training when that is another sport', () => {
    const brief = buildSessionBrief(tpl('tpl_easy_run'), addDays(START, 3), program, { modalityKey: 'bike_outdoor' });
    expect(brief.headline).toBe('FIETSEN · RUSTIG');
    expect(brief.sportSwitch).toBe('Dit telt als fietsen, niet als hardlopen.');
    expect(buildSessionBrief(tpl('tpl_long_run'), addDays(START, 6), program, { modalityKey: 'long_hike_outdoor' }).headline).toBe('WANDELEN · LANG');
  });

  it('gives the mountain hike its D+ and backpack, and the first hiking day what tomorrow asks', () => {
    const sunday = addDays(GR5, -14 * 7 + 6);
    const hike = buildSessionBrief(tpl('tpl_mountain_hike'), sunday, program);
    expect(hike.headline).toBe('WANDELEN · MET RUGZAK');
    expect(hike.facts.map((f) => f.value)).toEqual(['2 uur', '400 m', '4 kg']);
    const saturday = addDays(GR5, -28 + 5); // Expeditieklaar week 3
    const day1 = buildSessionBrief(tpl('tpl_hike_day_one'), saturday, program, { templates });
    expect(day1.tomorrow).toBe('Morgen: bergtocht van 5 uur, 1.000 m omhoog, 12 kg rugzak.');
  });

  it('strength defers the effort to MacroFactor, recovery has no target', () => {
    expect(buildSessionBrief(tpl('tpl_upper_a'), addDays(START, 1), program).facts[2]).toEqual({ value: 'MacroFactor', label: 'zwaarte volgens' });
    const rest = buildSessionBrief(tpl('tpl_herstel'), START, program);
    expect(rest.headline).toBe('HERSTEL · RUST OF WANDELEN');
    expect(rest.levelsUsed).toEqual([]);
  });

  it('writes long durations in hours', () => {
    expect(durationLabel(45)).toBe('45 min');
    expect(durationLabel(150)).toBe('2,5 uur');
    expect(durationLabel(300)).toBe('5 uur');
  });
});
