import { describe, it, expect } from 'vitest';
import {
  layoutWaves,
  layoutPhases,
  progressionTarget,
  patternForWeek,
  templateForPhase,
  directionSwaps,
  readProgramDirection,
  waveHeader,
  PHASE_GOLF,
  PHASE_GOLF_START,
  PATTERN_SWAPS,
} from './programLayout';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays, resolveProgramWeek } from '../utils/dates';
import { isLightWeekOf, type Program } from '../models/program';

// Zonder doel stap 4 (docs/visie/Zonder doel.md, 3.2 en 3.3): neutrale golven, geen bergtocht en
// geen rugzak. Nagemaakte data.

const START = '2026-10-26';
const { templates } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const program = (direction?: Program['direction']): Program => ({
  id: 'p', name: 'P', startDate: START, phases: layoutWaves(START, START), ...(direction ? { direction } : {}),
});

describe('layoutWaves', () => {
  it('een fase in golven van vier weken, met minstens de horizon voor je', () => {
    const phases = layoutWaves(START, START);
    expect(phases).toHaveLength(1);
    expect(phases[0].id).toBe(PHASE_GOLF);
    expect(phases[0].weekCount % 4).toBe(0);
    expect(phases[0].weekCount).toBeGreaterThanOrEqual(13);
    expect(phases[0].name).not.toMatch(/BERG|EXPEDITIE/);
  });

  it('groeit mee met de tijd, in hele golven', () => {
    const later = layoutWaves(START, addDays(START, 7 * 30));
    expect(later[0].weekCount % 4).toBe(0);
    expect(later[0].weekCount).toBeGreaterThanOrEqual(31 + 12);
  });

  it('met een startmaandag van je richting tellen de golven vanaf die week', () => {
    const phases = layoutWaves(START, addDays(START, 7 * 6), 12, addDays(START, 7 * 6));
    expect(phases.map((p) => [p.id, p.weekCount])).toEqual([[PHASE_GOLF, 6], [PHASE_GOLF, 16]]);
    const p: Program = { id: 'p', name: 'P', startDate: START, phases };
    expect(resolveProgramWeek(p, addDays(START, 7 * 6))?.weekInPhase).toBe(1);
    // Een start op of voor het begin van het programma: één stuk.
    expect(layoutWaves(START, START, 12, START)).toHaveLength(1);
  });

  it('layoutPhases kiest de golven alleen zonder doel', () => {
    expect(layoutPhases(START, undefined, START, undefined, { free: true })[0].id).toBe(PHASE_GOLF);
    expect(layoutPhases(START, undefined, START)[0].id).toBe('phase_1');
    expect(layoutPhases(START, '2027-07-25', START, undefined, { free: true })[0].id).toBe('phase_1');
  });
});

describe('geen bergtocht en geen rugzak zonder doel', () => {
  it('de wissels naar bergtocht en wandeldag gelden niet in een golf', () => {
    const pattern = templates.filter((t) => t.defaultDayOfWeek);
    for (let w = 0; w < 16; w++) {
      const ids = patternForWeek(pattern, templates, PATTERN_SWAPS, PHASE_GOLF).map((s) => s.template.id);
      expect(ids).not.toContain('tpl_mountain_hike');
      expect(ids).not.toContain('tpl_hike_day_one');
    }
  });

  it('een geplande bergtocht van het systeem wordt weer de lange loop', () => {
    expect(templateForPhase('tpl_mountain_hike', [], PHASE_GOLF, 3)).toBe('tpl_long_run');
    expect(templateForPhase('tpl_hike_day_one', [], PHASE_GOLF, 3)).toBe('tpl_hill_intervals');
    // Wat jij vastzette blijft.
    expect(templateForPhase('tpl_mountain_hike', [], PHASE_GOLF, 1)).toBe('tpl_mountain_hike');
  });

  it('een rugzakwandeling in een golf krijgt geen gewicht van de ladder', () => {
    const t = progressionTarget(tpl('tpl_ruck_walk'), program(), addDays(START, 7 * 10));
    expect(t?.step.backpackKg).toBeUndefined();
  });
});

describe('constante weken bij Fit blijven en Rustig aan', () => {
  const minutes = (p: Program, id: string) => [0, 1, 2, 3, 4, 5, 6, 7].map((w) => progressionTarget(tpl(id), p, addDays(START, 7 * w))!.minutes);

  it('zonder gekozen richting de gewone golf zoals eerst', () => {
    const m = minutes(program(), 'tpl_long_run');
    expect(m[3]).toBeLessThan(m[2]);
    expect(m[4]).toBeGreaterThan(m[0]);
  });

  it('Fit blijven: drie gelijke weken en een lichtere vierde, elke golf hetzelfde', () => {
    const m = minutes(program({ id: 'maintain' }), 'tpl_long_run');
    expect(m[0]).toBe(m[1]);
    expect(m[1]).toBe(m[2]);
    expect(m[3]).toBeLessThan(m[2]);
    expect(m.slice(4)).toEqual(m.slice(0, 4));
  });

  it('Rustig aan: elke week hetzelfde, ook de vierde', () => {
    const m = minutes(program({ id: 'easy' }), 'tpl_easy_run');
    expect(new Set(m).size).toBe(1);
  });

  it('Rustig aan maakt van de heuvelloop een herstelloop, en terug als je iets anders kiest', () => {
    const calm = directionSwaps({ id: 'easy' });
    expect(templateForPhase('tpl_hill_intervals', calm, PHASE_GOLF, 3)).toBe('tpl_recovery_run');
    expect(templateForPhase('tpl_recovery_run', directionSwaps({ id: 'maintain' }), PHASE_GOLF, 3)).toBe('tpl_hill_intervals');
    // Buiten een golf raakt het een herstelloop niet.
    expect(templateForPhase('tpl_recovery_run', [], 'phase_1', 3)).toBe('tpl_recovery_run');
    expect(directionSwaps(undefined)).toEqual([]);
  });
});

describe('beginnersstart', () => {
  it('vier weken Rustig beginnen vanaf de start van je richting, daarna golven', () => {
    const phases = layoutWaves(START, START, 12, START, 4);
    expect(phases.map((p) => [p.id, p.weekCount])).toEqual([[PHASE_GOLF_START, 4], [PHASE_GOLF, 12]]);
  });

  it('in de start wordt de heuvelloop een herstelloop, daarna weer de heuvelloop', () => {
    const swaps = directionSwaps({ id: 'maintain' }, true);
    expect(templateForPhase('tpl_hill_intervals', swaps, PHASE_GOLF_START, 3)).toBe('tpl_recovery_run');
    expect(templateForPhase('tpl_hill_intervals', swaps, PHASE_GOLF, 3)).toBe('tpl_hill_intervals');
    expect(templateForPhase('tpl_recovery_run', swaps, PHASE_GOLF, 3)).toBe('tpl_hill_intervals');
    // Een heuvelloop die jij vastzette blijft.
    expect(templateForPhase('tpl_hill_intervals', swaps, PHASE_GOLF_START, 1)).toBe('tpl_hill_intervals');
  });
});

describe('de instelling Golven', () => {
  it('golven van zes weken: hele golven, de zesde week is de lichte', () => {
    const phases = layoutWaves(START, START, 12, START, 0, { length: 6, light: true });
    expect(phases[0].weekCount % 6).toBe(0);
    expect(phases[0].wave).toEqual({ length: 6, light: true });
    expect(isLightWeekOf(phases[0], 6)).toBe(true);
    expect(isLightWeekOf(phases[0], 4)).toBe(false);
    const p: Program = { id: 'p', name: 'P', startDate: START, phases };
    expect(waveHeader(resolveProgramWeek(p, addDays(START, 7 * 7)))).toBe('Week 2 van 6 van je golf');
  });

  it('zonder lichte week is geen week een rustweek, en zegt Vandaag: je vaste week', () => {
    const phases = layoutWaves(START, START, 12, START, 0, { length: 4, light: false });
    expect([1, 2, 3, 4].some((w) => isLightWeekOf(phases[0], w))).toBe(false);
    const p: Program = { id: 'p', name: 'P', startDate: START, phases };
    expect(waveHeader(resolveProgramWeek(p, START))).toBe('Je vaste week');
  });

  it('een fase zonder golf houdt de rustweek van altijd', () => {
    expect(isLightWeekOf({ id: 'phase_1' }, 4)).toBe(true);
    expect(isLightWeekOf({ id: 'phase_taper' }, 4)).toBe(false);
  });

  it('Sterker worden: rustige duur, de heuvelloop wordt een herstelloop', () => {
    expect(templateForPhase('tpl_hill_intervals', directionSwaps({ id: 'stronger' }), PHASE_GOLF, 3)).toBe('tpl_recovery_run');
  });
});

describe('waveHeader', () => {
  it('zegt de week van de golf, en buiten een golf niets', () => {
    const p = program();
    expect(waveHeader(resolveProgramWeek(p, addDays(START, 7 * 5)))).toBe('Week 2 van 4 van je golf');
    expect(waveHeader(null)).toBeUndefined();
  });
});

describe('readProgramDirection', () => {
  it('alleen een bekende richting blijft over', () => {
    expect(readProgramDirection({ id: 'maintain' })).toEqual({ id: 'maintain' });
    expect(readProgramDirection({ id: 'gr5' })).toBeUndefined();
    expect(readProgramDirection('maintain')).toBeUndefined();
    expect(readProgramDirection(undefined)).toBeUndefined();
  });
});
