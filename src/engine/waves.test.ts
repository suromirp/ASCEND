import { describe, expect, it } from 'vitest';
import { DIRECTIONS } from '../data/directions';
import { nextWaveLevel, waveMinutes, waveReview, waveWeek } from './waves';

const IMPROVE = DIRECTIONS.improve.wave.value!;
const STRONGER = DIRECTIONS.stronger.wave.value!;

describe('waveWeek', () => {
  it('telt de weken vanaf de maandag van de start', () => {
    expect(waveWeek('2026-10-26', '2026-10-26', 4)).toMatchObject({ week: 1, wave: 1, light: false, startsOn: '2026-10-26' });
    expect(waveWeek('2026-10-26', '2026-11-08', 4)).toMatchObject({ week: 2, wave: 1 });
    expect(waveWeek('2026-10-26', '2026-11-16', 4)).toMatchObject({ week: 4, light: true });
  });

  it('begint na vier weken een nieuwe golf', () => {
    expect(waveWeek('2026-10-26', '2026-11-23', 4)).toMatchObject({ week: 1, wave: 2, startsOn: '2026-11-23' });
  });

  it('geeft niets zonder start, voor de start of zonder golf', () => {
    expect(waveWeek(undefined, '2026-10-26', 4)).toBeUndefined();
    expect(waveWeek('2026-11-02', '2026-10-26', 4)).toBeUndefined();
    expect(waveWeek('2026-10-26', '2026-10-26', 1)).toBeUndefined();
  });
});

describe('waveMinutes', () => {
  it('bouwt drie weken op met 10% en gaat in de vierde week 35% omlaag', () => {
    expect([1, 2, 3, 4].map((w) => waveMinutes(120, IMPROVE, w))).toEqual([120, 130, 145, 95]);
  });

  it('houdt een vlakke golf gelijk en maakt alleen de vierde week lichter', () => {
    expect([1, 2, 3, 4].map((w) => waveMinutes(120, STRONGER, w))).toEqual([120, 120, 120, 80]);
  });
});

describe('waveReview', () => {
  it('noemt een golf goed als je 3 van de 4 weken haalde', () => {
    const r = waveReview([120, 130, 100, 95], [120, 130, 145, 95]);
    expect(r).toMatchObject({ weeksHit: 3, weeks: 4, stepUp: true, verdict: 'goed', averageMinutes: 111 });
  });

  it('noemt een golf rustig als je te weinig weken haalde', () => {
    const r = waveReview([60, 70, 50, 40], [120, 130, 145, 95]);
    expect(r).toMatchObject({ weeksHit: 0, stepUp: false, verdict: 'rustig' });
  });

  it('noemt een golf zwaar als je ruim meer deed dan voorgesteld', () => {
    const r = waveReview([200, 210, 220, 150], [120, 130, 145, 95]);
    expect(r.verdict).toBe('zwaar');
  });

  it('kent een lege golf', () => {
    expect(waveReview([], [])).toMatchObject({ weeks: 0, weeksHit: 0, averageMinutes: 0, verdict: 'rustig' });
  });
});

describe('nextWaveLevel', () => {
  it('stapt na een goede golf op en blijft anders gelijk', () => {
    const good = waveReview([120, 130, 145, 95], [120, 130, 145, 95]);
    const bad = waveReview([10, 10, 10, 10], [120, 130, 145, 95]);
    expect(nextWaveLevel(120, good, IMPROVE, 300)).toBe(135);
    expect(nextWaveLevel(120, bad, IMPROVE, 300)).toBe(120);
  });

  it('blijft onder het plafond', () => {
    const good = waveReview([300, 300, 300, 300], [300, 300, 300, 300]);
    expect(nextWaveLevel(300, good, IMPROVE, 300)).toBe(300);
  });
});
