import { describe, it, expect } from 'vitest';
import { straightKm, travelAdvice, spotsByDistance, spotsForTraining, spotTrainings, filterForTraining, TRAINING_FILTERS } from './trainingSpots';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { TRAINING_SPOTS, HOME_PLACES } from '../data/trainingSpots';

const amersfoort = HOME_PLACES.find((p) => p.name === 'Amersfoort')!;
const spot = (id: string) => TRAINING_SPOTS.find((s) => s.id === id)!;

describe('training spots', () => {
  it('straight-line distance matches the research (Amersfoort to Kwintelooijen ±21.7 km)', () => {
    expect(straightKm(amersfoort, spot('kwintelooijen'))).toBeCloseTo(21.7, 0);
  });

  it('suggests walking, cycling or the car by distance', () => {
    expect(travelAdvice(amersfoort, spot('amersfoortse-berg')).mode).toBe('lopen');
    expect(travelAdvice(amersfoort, spot('kwintelooijen')).mode).toBe('fiets');
    const posbank = travelAdvice(amersfoort, spot('posbank'));
    expect(posbank.mode).toBe('auto');
    expect(posbank.text).toMatch(/trein naar Rheden/);
  });

  it('sorts by distance from home, and filters by what you want to train', () => {
    const sorted = spotsByDistance(TRAINING_SPOTS, amersfoort);
    expect(sorted[0].id).toBe('amersfoortse-berg');
    expect(spotsByDistance(TRAINING_SPOTS, amersfoort, 'trap').every((s) => s.uses.includes('trap'))).toBe(true);
  });

  it('every spot has coordinates in the Netherlands and at least one source', () => {
    for (const s of TRAINING_SPOTS) {
      expect(s.lat).toBeGreaterThan(50.7);
      expect(s.lat).toBeLessThan(53.6);
      expect(s.lon).toBeGreaterThan(3.3);
      expect(s.lon).toBeLessThan(7.3);
      expect(s.sources.length).toBeGreaterThan(0);
    }
  });

  it('every training a spot names exists in the catalogue, and every filter has a spot', () => {
    const ids = new Set(buildDefaultProgramData().templates.map((t) => t.id));
    for (const s of TRAINING_SPOTS) for (const id of spotTrainings(s)) expect(ids.has(id)).toBe(true);
    for (const f of TRAINING_FILTERS) expect(spotsForTraining(TRAINING_SPOTS, amersfoort, f).length).toBeGreaterThan(0);
  });

  it('hill intervals from Amersfoort: the Amersfoortse Berg first, a spot that only fits limited comes after the good ones', () => {
    const list = spotsForTraining(TRAINING_SPOTS, amersfoort, filterForTraining('tpl_hill_intervals'));
    expect(list[0].id).toBe('amersfoortse-berg');
    const firstLimited = list.findIndex((s) => s.sessions?.find((x) => x.templateId === 'tpl_hill_intervals')?.limited);
    expect(list.slice(firstLimited).every((s) => s.sessions?.find((x) => x.templateId === 'tpl_hill_intervals')?.limited)).toBe(true);
    expect(list.map((s) => s.id)).toContain('grasheuvel-waterpark');
  });

  it('the test run goes to a track or a flat route, never the dunes', () => {
    const list = spotsForTraining(TRAINING_SPOTS, amersfoort, filterForTraining('tpl_test_run')).map((s) => s.id);
    expect(list[0]).toBe('atletiekbaan-amersfoort');
    expect(list).not.toContain('soester-duinen');
  });

  it('a measured climb is consistent: gain over length matches the grade', () => {
    for (const s of TRAINING_SPOTS) for (const c of s.climbs ?? []) {
      if (c.gradePct > 20) continue; // stairs and grass banks: a steep average over a short stretch
      expect(Math.abs((c.gainM / c.lengthM) * 100 - c.gradePct)).toBeLessThan(1);
    }
  });
});
