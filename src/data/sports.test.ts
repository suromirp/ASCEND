import { describe, expect, it } from 'vitest';
import { SPORTS, SPORT_IDS, sportDefinition, sportOfExternalType } from './sports';
import { SPORT_LABEL, DEFAULT_ENABLED_SPORTS } from '../engine/sports';
import { DISCIPLINE_LABEL, DISCIPLINE_OPTIONS } from './disciplines';
import { kindOf } from '../integrations/intervalsIcu';
import { SPORT_COLOR, SPORT_PICTOGRAM } from '../components/sportKind';
import { SPORT_LOOK } from '../components/logbook/sportLook';

describe('sporten als gegevens', () => {
  it('elke sport heeft label, kleur, pictogram of bewust geen, en kenmerken van 0 tot 3', () => {
    for (const s of SPORTS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.colorToken).toMatch(/^var\(--color-sport-/);
      expect(s.pictogram === undefined || typeof s.pictogram === 'string').toBe(true);
      for (const v of Object.values(s.traits)) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(3);
      }
      expect(s.roles.length).toBeGreaterThan(0);
      expect(s.externalKinds.length).toBeGreaterThan(0);
    }
  });

  it('de id\'s zijn uniek en een intervals.icu-type hoort bij één sport', () => {
    expect(new Set(SPORT_IDS).size).toBe(SPORT_IDS.length);
    const types = SPORTS.flatMap((s) => [...s.externalKinds]);
    expect(new Set(types).size).toBe(types.length);
  });

  it('de afgeleide lijsten zijn gelijk aan de oude', () => {
    expect(SPORT_IDS).toEqual(['running', 'hiking', 'cycling']);
    expect(SPORT_LABEL).toEqual({ running: 'Hardlopen', hiking: 'Wandelen', cycling: 'Fietsen' });
    expect(DEFAULT_ENABLED_SPORTS).toEqual({ running: true, hiking: true, cycling: false });
    expect(DISCIPLINE_LABEL).toEqual({ running: 'Hardlopen', hiking: 'Wandelen / hiken', cycling: 'Fietsen' });
    expect(DISCIPLINE_OPTIONS).toEqual(['running', 'hiking', 'cycling']);
    expect(SPORT_COLOR).toEqual({
      run: 'var(--color-sport-run)', strength: 'var(--color-sport-strength)', walk: 'var(--color-sport-walk)',
      mountain: 'var(--color-sport-mountain)', bike: 'var(--color-sport-stretch)', rest: 'var(--color-status)',
    });
    expect(SPORT_PICTOGRAM).toEqual({ run: 'lopen', strength: 'kracht', walk: 'wandelen', mountain: 'bergtocht', bike: 'fietsen', rest: 'rust' });
    expect(SPORT_LOOK.run.icon).toBe('lopen');
    expect(SPORT_LOOK.walk.color).toBe('var(--color-sport-walk)');
    expect(SPORT_LOOK.bike.icon).toBe('fietsen');
  });

  it('kindOf geeft dezelfde uitkomst als voorheen', () => {
    for (const t of ['Run', 'TrailRun', 'VirtualRun']) expect(kindOf(t)).toBe('run');
    for (const t of ['Hike', 'Walk']) expect(kindOf(t)).toBe('hike');
    for (const t of ['Ride', 'GravelRide', 'MountainBikeRide', 'EBikeRide', 'EMountainBikeRide', 'Cyclocross', 'TrackRide', 'VirtualRide', 'Velomobile']) expect(kindOf(t)).toBe('ride');
    expect(kindOf('WeightTraining')).toBe('strength');
    for (const t of ['Swim', 'Yoga', 'Padel', 'Workout', undefined]) expect(kindOf(t)).toBe('other');
    expect(sportOfExternalType('Swim')).toBeUndefined();
    expect(sportDefinition('hiking').verb).toBe('wandelen');
  });
});
