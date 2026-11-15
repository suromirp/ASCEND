import { describe, expect, it } from 'vitest';
import type { ClimbPace, ClimbPaceState } from './climbPace';
import { ownHikingBand } from './climbPace';
import { estimatedHikingMinutes } from './goalRoute';
import { hikeMinutes, NORM_WALK_RATES, resolveWalkClash, resolveWalkPace, walkRates, walkTarget } from './hikeTarget';

// Een nagemaakt klimtempo: 450 m per uur omhoog en 700 omlaag, gemeten met 8 kg rugzak.
const PACE: ClimbPace = {
  climbs: 8, trips: 4, upMph: 450, upSlow: 400, upFast: 500, descents: 5, downMph: 700, downSlow: 650, downFast: 750,
  packKg: 8, gradeLow: 9, gradeHigh: 12, lastDate: '2026-10-01',
};
const OWN: ClimbPaceState = { state: 'enough', pace: PACE };
const round5 = (n: number) => Math.round(n / 5) * 5;

describe('hikeMinutes', () => {
  it('op de norm dezelfde minuten als estimatedHikingMinutes', () => {
    const days = [
      { km: 8, up: 375, down: 375 }, { km: 5, up: 0, down: 0 }, { km: 3.5, up: 500, down: 500 },
      { km: 18, up: 1000, down: 1000 }, { km: 12.3, up: 820, down: 640 }, { km: 0, up: 300, down: 0 },
    ];
    for (const d of days) expect(round5(hikeMinutes(d))).toBe(estimatedHikingMinutes(d.km, d.up, d.down));
  });

  it('op je eigen tempo dezelfde tijd als ownHikingBand, ook met een rugzak', () => {
    const day = { km: 9, up: 500, down: 500 };
    for (const packKg of [undefined, 4, 8, 14]) {
      const rates = walkRates(OWN, { packKg, bodyKg: 75 });
      expect(round5(hikeMinutes(day, rates))).toBe(ownHikingBand(PACE, day, { packKg, bodyKg: 75 }).mid);
    }
  });

  it('nul, negatief en geen getal geven nooit NaN', () => {
    for (const v of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, undefined as unknown as number]) {
      const m = hikeMinutes({ km: v, up: v, down: v });
      expect(Number.isFinite(m)).toBe(true);
      expect(m).toBe(0);
    }
    // Een kapot tempo valt terug op de norm.
    expect(hikeMinutes({ km: 4, up: 0, down: 0 }, { ...NORM_WALK_RATES, flatKmh: 0 })).toBe(60);
    expect(hikeMinutes({ km: 4, up: 0, down: 0 }, { ...NORM_WALK_RATES, upMph: Number.NaN })).toBe(60);
  });
});

describe('walkRates', () => {
  it('zonder genoeg eigen klimmen, of met de keuze norm: de wandelnorm zonder rugzak', () => {
    expect(walkRates(undefined)).toEqual(NORM_WALK_RATES);
    expect(walkRates({ state: 'notYet', climbs: 3, trips: 1 }, { packKg: 12, bodyKg: 75 })).toEqual(NORM_WALK_RATES);
    expect(walkRates(OWN, { pace: 'norm', packKg: 12, bodyKg: 75 })).toEqual(NORM_WALK_RATES);
    expect(walkRates(OWN).basis).toBe('own');
  });

  it('eigen tempo met een zwaardere rugzak is trager, met een lichtere nooit sneller', () => {
    const plain = walkRates(OWN, { bodyKg: 75 });
    const heavy = walkRates(OWN, { packKg: 14, bodyKg: 75 });
    const light = walkRates(OWN, { packKg: 3, bodyKg: 75 });
    expect(plain).toMatchObject({ upMph: 450, downMph: 700 });
    expect(heavy.upMph).toBeLessThan(plain.upMph);
    expect(heavy.downMph).toBeLessThan(plain.downMph);
    expect(heavy.packKg).toBe(14);
    expect(light.upMph).toBe(plain.upMph);
    expect(light.downMph).toBe(plain.downMph);
    const day = { km: 8, up: 500, down: 500 };
    expect(hikeMinutes(day, heavy)).toBeGreaterThan(hikeMinutes(day, plain));
    expect(hikeMinutes(day, light)).toBe(hikeMinutes(day, plain));
  });

  it('rugzak of lichaamsgewicht onbekend: geen omrekening en geen rugzak in de regel', () => {
    expect(walkRates(OWN, { packKg: 14 })).toMatchObject({ upMph: 450, basis: 'own' });
    expect(walkRates(OWN, { packKg: 14 }).packKg).toBeUndefined();
    expect(walkRates({ state: 'enough', pace: { ...PACE, packKg: undefined } }, { packKg: 14, bodyKg: 75 }).packKg).toBeUndefined();
    expect(walkRates(OWN, { packKg: Number.NaN, bodyKg: 75 }).packKg).toBeUndefined();
  });

  it('zonder eigen dalingen omlaag de norm', () => {
    expect(walkRates({ state: 'enough', pace: { ...PACE, downMph: undefined } }).downMph).toBe(500);
  });

  it('iets onbekends in de keuzes is het advies', () => {
    expect(resolveWalkPace(undefined)).toBe('own');
    expect(resolveWalkPace('onzin')).toBe('own');
    expect(resolveWalkPace('norm')).toBe('norm');
    expect(resolveWalkClash(undefined)).toBe('duration');
    expect(resolveWalkClash(7)).toBe('duration');
    expect(resolveWalkClash('ascent')).toBe('ascent');
  });
});

describe('walkTarget', () => {
  it('500 m in 3 uur op de norm: 375 m en 8 km', () => {
    const t = walkTarget(180, 500);
    expect(t).toMatchObject({ minutes: 180, ascentM: 375, askedAscentM: 500, maxAscentM: 375, fits: false, distanceKm: 8 });
  });

  it('de voorbeelden uit het ontwerp: rugzakwandeling 75 minuten 5 km, herstelwandeling 45 minuten 3 km', () => {
    expect(walkTarget(75, undefined)).toMatchObject({ distanceKm: 5, ascentM: 0, fits: true });
    expect(walkTarget(45, 0)).toMatchObject({ distanceKm: 3, ascentM: 0, fits: true });
  });

  it('wat past gaat helemaal mee', () => {
    expect(walkTarget(180, 300)).toMatchObject({ ascentM: 300, fits: true });
  });

  it('heen en terug: de tijd van het doel komt binnen 5 minuten op de duur uit', () => {
    const rateSets = [NORM_WALK_RATES, walkRates(OWN), walkRates(OWN, { packKg: 14, bodyKg: 70 })];
    for (const rates of rateSets) {
      for (let minutes = 30; minutes <= 330; minutes += 15) {
        for (const asked of [0, 100, 250, 400, 500, 650, 800, 1000]) {
          const t = walkTarget(minutes, asked, rates);
          const back = hikeMinutes({ km: t.distanceKm, up: t.ascentM, down: t.ascentM }, rates);
          expect(Math.abs(back - minutes)).toBeLessThanOrEqual(5);
          expect(t.loopMinutes).toBeCloseTo(back, 6);
          // Klimmen en dalen samen nooit meer dan twee derde van de duur.
          expect(t.ascentM * (1 / rates.upMph + 1 / rates.downMph) * 60).toBeLessThanOrEqual((minutes * 2) / 3 + 1e-6);
        }
      }
    }
  });

  it('op je eigen vlottere tempo past er meer en klopt de bergtocht van de ladder', () => {
    // 450 omhoog en 700 omlaag: 500 m past in 3 uur, met ruim 8 km.
    const t = walkTarget(180, 500, walkRates(OWN));
    expect(t.fits).toBe(true);
    expect(t.ascentM).toBe(500);
    expect(t.distanceKm).toBeGreaterThanOrEqual(8);
  });

  it('hoogtemeters eerst: de klim blijft, de afstand krimpt en de tijd zegt eerlijk wat het kost', () => {
    const t = walkTarget(180, 500, NORM_WALK_RATES, 'ascent');
    expect(t.ascentM).toBe(500);
    expect(t.fits).toBe(false);
    expect(t.loopMinutes).toBeLessThanOrEqual(185);
    // Past de klim zelfs niet in de hele duur: geen vlak meer, en een langere tijd.
    const steep = walkTarget(120, 1000, NORM_WALK_RATES, 'ascent');
    expect(steep.distanceKm).toBe(0);
    expect(steep.loopMinutes).toBeGreaterThan(120);
  });

  it('nul, negatief en geen getal geven nooit NaN', () => {
    for (const v of [0, -30, Number.NaN, Number.POSITIVE_INFINITY, undefined as unknown as number]) {
      for (const t of [walkTarget(v, v), walkTarget(90, v), walkTarget(v, 300)]) {
        for (const n of [t.minutes, t.distanceKm, t.ascentM, t.askedAscentM, t.maxAscentM, t.loopMinutes]) expect(Number.isFinite(n)).toBe(true);
      }
    }
    expect(walkTarget(Number.NaN, 300)).toMatchObject({ distanceKm: 0, ascentM: 0, fits: false });
    expect(walkTarget(90, 300, { ...NORM_WALK_RATES, upMph: 0 }).maxAscentM).toBe(walkTarget(90, 300).maxAscentM);
  });

  it('zelfde invoer, zelfde doel', () => {
    expect(walkTarget(165, 500, walkRates(OWN, { packKg: 10, bodyKg: 72 }))).toEqual(walkTarget(165, 500, walkRates(OWN, { packKg: 10, bodyKg: 72 })));
  });
});
