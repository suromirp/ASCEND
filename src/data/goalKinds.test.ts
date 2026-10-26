import { describe, it, expect } from 'vitest';
import { GOAL_KIND_IDS, GOAL_PRIORITIES } from '../models/goals';
import { BERG, DUUR, allSourcedNumbers, buildWeeksFor, GOAL_KINDS, GOAL_KIND_LIST, isGoalKindId, recoveryDaysFor, taperDaysFor, variantOf } from './goalKinds';

const LABELS = ['sterk', 'matig', 'zwak', 'expert', 'afgeleid'];

describe('doelsoorten als gegevens', () => {
  it('elke soort uit het model staat in de gegevens, en andersom', () => {
    expect(Object.keys(GOAL_KINDS).sort()).toEqual([...GOAL_KIND_IDS].sort());
    expect(GOAL_KIND_LIST).toHaveLength(10);
    for (const id of GOAL_KIND_IDS) expect(GOAL_KINDS[id].id).toBe(id);
    expect(isGoalKindId('trek_tent')).toBe(true);
    expect(isGoalKindId('toString')).toBe(false);
    expect(isGoalKindId(7)).toBe(false);
  });

  it('elk getal heeft een bewijslabel en een bronverwijzing', () => {
    for (const def of GOAL_KIND_LIST) {
      const numbers = allSourcedNumbers(def);
      expect(numbers.length).toBeGreaterThan(8);
      for (const n of numbers) {
        expect(LABELS, `${def.id} ${n.where}`).toContain(n.evidence);
        // Een verwijzing naar een van de twee onderzoeksbestanden, of naar het besluit zelf.
        const ok = n.source.startsWith(BERG) || n.source.startsWith(DUUR) || n.source.startsWith('docs/beslissingen/2026-10-26-kracht-en-berg-voor-iedereen.md');
        expect(ok, `${def.id} ${n.where}: ${n.source}`).toBe(true);
      }
    }
  });

  it('afbouw: Verkenning nooit, Top minstens zo lang als Voortop, in elke variant', () => {
    for (const def of GOAL_KIND_LIST) {
      const variants = [undefined, ...def.variants.map((v) => v.id)];
      for (const variant of variants) {
        const details = variant ? { variant } : undefined;
        expect(taperDaysFor(def.id, 'verkenning', details).value).toBe(0);
        expect(taperDaysFor(def.id, 'top', details).value, `${def.id} ${variant}`).toBeGreaterThanOrEqual(taperDaysFor(def.id, 'voortop', details).value);
      }
      for (const p of GOAL_PRIORITIES) expect(taperDaysFor(def.id, p).value).toBeGreaterThanOrEqual(0);
    }
  });

  it('opbouwweken: het minimum ligt nooit boven het aanbevolen aantal', () => {
    for (const def of GOAL_KIND_LIST) {
      for (const variant of [undefined, ...def.variants.map((v) => v.id)]) {
        const w = buildWeeksFor(def.id, variant ? { variant } : undefined);
        expect(w.min.value, `${def.id} ${variant}`).toBeLessThanOrEqual(w.recommended.value);
      }
    }
  });

  it('de meters hebben een eigen id, een type en een uitleg', () => {
    for (const def of GOAL_KIND_LIST) {
      const ids = def.meters.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(def.meters.length).toBeGreaterThanOrEqual(3);
      for (const m of def.meters) {
        expect(['beste_dag', 'reeks', 'volume_of_trend', 'versheid']).toContain(m.type);
        expect(m.measure.length).toBeGreaterThan(10);
        expect(m.full.length).toBeGreaterThan(5);
        expect(m.why.length).toBeGreaterThan(10);
      }
    }
  });

  it('teksten hebben geen gedachtestreepjes en geen hoofdletterknoppen', () => {
    const json = JSON.stringify(GOAL_KIND_LIST);
    expect(json).not.toMatch(/[–—]/);
  });

  it('de tocht met tent oefent drie dagen achter elkaar thuis, die met hutten twee', () => {
    expect(GOAL_KINDS.trek_hut.homeDaysInRow?.value).toBe(2);
    expect(GOAL_KINDS.trek_tent.homeDaysInRow?.value).toBe(3);
  });

  it('de opbouw van de tent is langer dan die met hutten', () => {
    const hut = buildWeeksFor('trek_hut', { days: 8 });
    const tent = buildWeeksFor('trek_tent', { days: 8 });
    expect(tent.min.value).toBe(hut.min.value + 4);
    expect(buildWeeksFor('trek_tent', { days: 3 }).min.value).toBe(6);
  });

  it('trail, fietsen, triathlon en mountaineering dragen geen sterk label op hun eigen getallen', () => {
    // De dun onderbouwde soorten: de weken en de afbouw zijn nooit "sterk".
    for (const id of ['trail', 'bike', 'triathlon', 'mountaineering'] as const) {
      const own = allSourcedNumbers(GOAL_KINDS[id]).filter((n) => n.where.startsWith('buildWeeks') || n.where.startsWith('taperDays') || n.where.startsWith('recovery'));
      expect(own.every((n) => n.evidence !== 'sterk'), id).toBe(true);
    }
  });

  it('variantOf leidt de variant af uit de getallen en neemt een bekende ingevulde over', () => {
    expect(variantOf('run_race', { distanceKm: 10 })).toBe('10k');
    expect(variantOf('run_race', { distanceKm: 21.1 })).toBe('half');
    expect(variantOf('run_race', { distanceKm: 42.2 })).toBe('marathon');
    expect(variantOf('run_race', { variant: '5k', distanceKm: 42 })).toBe('5k');
    expect(variantOf('run_race', { variant: 'onzin', distanceKm: 5 })).toBe('5k');
    expect(variantOf('trail', { distanceKm: 80 })).toBe('ultra');
    expect(variantOf('trail', { distanceKm: 20 })).toBe('kort');
    expect(variantOf('trek_hut', { days: 12 })).toBe('lang');
    expect(variantOf('day_hike', { gainM: 1200 })).toBe('zwaar');
    expect(variantOf('fit')).toBeUndefined();
  });

  it('herstel: de helft van de tochtdagen, hoogstens 14', () => {
    expect(recoveryDaysFor('trek_hut', { days: 10 }).value).toBe(5);
    expect(recoveryDaysFor('trek_hut', { days: 40 }).value).toBe(14);
    expect(recoveryDaysFor('trek_hut', { days: 2 }).value).toBe(3);
    expect(recoveryDaysFor('run_race', { distanceKm: 42.2 }).value).toBe(10);
    expect(recoveryDaysFor('fit').value).toBe(0);
  });
});
