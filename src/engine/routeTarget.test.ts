import { describe, expect, it } from 'vitest';
import type { SessionLog, SessionTemplate } from '../models/training';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { DEFAULT_PACE_SEC_KM, resolveRouteStyle, roundStart, routeTarget, targetText, wantsRoute } from './routeTarget';

const { templates } = buildDefaultProgramData();
const byId = (id: string) => templates.find((t) => t.id === id) as SessionTemplate;
const easy = byId('tpl_easy_run');

// Een nagemaakte loop op een nagemaakte dag.
const run = (date: string, km: number, minutes: number): SessionLog => ({
  id: `log_${date}`, templateId: 'tpl_easy_run', completedDate: date, type: 'cardio', variant: 'full', durationMinutes: minutes,
  cardioData: { modality: 'running', durationMinutes: minutes, distanceKm: km },
} as unknown as SessionLog);

describe('routeTarget', () => {
  it('zonder lopen en zonder test: de duur op een rustig standaardtempo, op een halve kilometer', () => {
    const t = routeTarget({ template: easy, date: '2026-11-12' });
    expect(t).toEqual({ distanceKm: Math.round(((35 * 60) / DEFAULT_PACE_SEC_KM) * 2) / 2, ascentM: 0 });
    expect(t.distanceKm).toBe(5.5);
  });

  it('rekent met het echte tempo van je laatste lopen, en anders met het tempo uit je test', () => {
    const logs = [run('2026-11-05', 7, 35)]; // 5:00 per km
    expect(routeTarget({ template: easy, date: '2026-11-12', logs }).distanceKm).toBe(7);
    expect(routeTarget({ template: easy, date: '2026-11-12', testPace: { fast: 330, slow: 370 } }).distanceKm).toBe(6);
    // Je eigen lopen gaan voor de test.
    expect(routeTarget({ template: easy, date: '2026-11-12', logs, testPace: { fast: 330, slow: 370 } }).distanceKm).toBe(7);
  });

  it('een afstand en hoogtemeters op de training zelf gaan voor', () => {
    const long = { ...easy, id: 'tpl_x', outdoorTarget: { targetDistanceKm: 14, targetElevationM: 300 } };
    expect(routeTarget({ template: long, date: '2026-11-12' })).toEqual({ distanceKm: 14, ascentM: 300 });
  });

  it('een heuveltraining zonder getal vraagt ongeveer drie meter stijgen per minuut', () => {
    const hills = { ...easy, id: 'tpl_y', roles: ['hills'] } as SessionTemplate;
    expect(routeTarget({ template: hills, date: '2026-11-12' }).ascentM).toBe(110);
  });

  it('blijft binnen 2 en 40 km', () => {
    expect(routeTarget({ template: { ...easy, cardioTarget: { targetDistanceKm: 0.4 } }, date: '2026-11-12' }).distanceKm).toBe(2);
    expect(routeTarget({ template: { ...easy, cardioTarget: { targetDistanceKm: 80 } }, date: '2026-11-12' }).distanceKm).toBe(40);
  });
});

describe('wantsRoute, roundStart, resolveRouteStyle, targetText', () => {
  it('alleen een looptraining krijgt een route', () => {
    expect(wantsRoute(easy)).toBe(true);
    expect(wantsRoute(templates.find((t) => t.type === 'strength'))).toBe(false);
    expect(wantsRoute(undefined)).toBe(false);
  });

  it('het startpunt gaat afgerond op twee decimalen de deur uit', () => {
    expect(roundStart({ lat: 52.123456, lon: 5.654321 })).toEqual({ lat: 52.12, lon: 5.65 });
  });

  it('Avontuurlijk is het advies; iets onbekends ook', () => {
    expect(resolveRouteStyle(undefined)).toBe('adventure');
    expect(resolveRouteStyle('simple')).toBe('simple');
    expect(resolveRouteStyle('onzin')).toBe('adventure');
  });

  it('zegt de training in woorden', () => {
    expect(targetText({ distanceKm: 9, ascentM: 300 })).toBe('9 km, 300 hoogtemeters');
    expect(targetText({ distanceKm: 5.5, ascentM: 0 })).toBe('5,5 km');
  });
});
