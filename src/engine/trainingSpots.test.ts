import { describe, it, expect } from 'vitest';
import { straightKm, travelAdvice, spotsByDistance } from './trainingSpots';
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
});
