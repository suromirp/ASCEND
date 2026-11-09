import { describe, expect, it } from 'vitest';
import { GUST_KMH, HEAT_C, placePhrase, warningLines, warningTargets, type WarningTarget, type WarningTargetsInput } from './weatherWarnings';
import type { LeavePeriod, TrekDetails } from '../models/leave';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { WarningForecast, WarningHour } from '../integrations/openMeteoWarnings';

// Nagemaakte plekken en tochten.
const HOME = { name: 'Bergdorp', lat: 52.1, lon: 5.1 };
const HUT = { name: 'Col du Test', lat: 45.9, lon: 6.9 };
const long: SessionTemplate = { id: 'long', name: 'Lange duurloop', type: 'cardio', durationVariants: { full: 100 } };
const easy: SessionTemplate = { id: 'easy', name: 'Rustige duurloop', type: 'cardio', durationVariants: { full: 45 } };
const legs: SessionTemplate = { id: 'legs', name: 'Benen A', type: 'strength', durationVariants: { full: 120 } };
const templateById = new Map([long, easy, legs].map((t) => [t.id, t]));

const trek = (over: Partial<TrekDetails> = {}): TrekDetails => ({ name: 'Proeftocht', terrain: 'mountain', tent: false, importance: 'main', ...over }) as TrekDetails;
const period = (startDate: string, endDate: string, t: TrekDetails): LeavePeriod => ({ id: 'p', kind: 'trek', startDate, endDate, trek: t });
const session = (id: string, templateId: string, scheduledDate: string, over: Partial<PlannedSession> = {}): PlannedSession => ({ id, templateId, scheduledDate, weekStartDate: '2026-07-06', status: 'planned', order: 0, ...over });

const base = (over: Partial<WarningTargetsInput> = {}): WarningTargetsInput => ({
  periods: [], sessions: [], logs: [], templateById, today: '2026-07-08', weatherPlace: HOME, followsLocation: false, ...over,
});

describe('warningTargets', () => {
  it('een tocht met eigen plek: vandaag en de dag ervoor', () => {
    const p = period('2026-07-09', '2026-07-12', trek({ place: HUT }));
    expect(warningTargets(base({ periods: [p] }))).toEqual([{ date: '2026-07-09', when: 'morgen', kind: 'trek', place: HUT }]);
    expect(warningTargets(base({ periods: [p], today: '2026-07-10' }))[0]).toEqual({ date: '2026-07-10', when: 'vandaag', kind: 'trek', place: HUT });
  });

  it('een tocht zonder eigen plek: alleen op de dag zelf en alleen als het weer je locatie volgt', () => {
    const p = period('2026-07-09', '2026-07-12', trek());
    expect(warningTargets(base({ periods: [p] }))).toEqual([]);
    expect(warningTargets(base({ periods: [p], today: '2026-07-10' }))).toEqual([]);
    expect(warningTargets(base({ periods: [p], today: '2026-07-10', followsLocation: true }))[0]).toMatchObject({ kind: 'trek', place: HOME });
  });

  it('een lange training buiten vandaag of morgen, met de plek van je weer', () => {
    const sessions = [session('a', 'long', '2026-07-08'), session('b', 'easy', '2026-07-09'), session('c', 'legs', '2026-07-09')];
    expect(warningTargets(base({ sessions }))).toEqual([{ date: '2026-07-08', when: 'vandaag', kind: 'training', place: HOME }]);
    // Een korte training telt mee als je hem langer plande.
    const longer = [session('b', 'easy', '2026-07-09', { plannedMinutes: 120 })];
    expect(warningTargets(base({ sessions: longer }))).toEqual([{ date: '2026-07-09', when: 'morgen', kind: 'training', place: HOME }]);
  });

  it('niet bij een gedane of overgeslagen training, en niet zonder plek', () => {
    const log = { id: 'l', plannedSessionId: 'a' } as SessionLog;
    expect(warningTargets(base({ sessions: [session('a', 'long', '2026-07-08')], logs: [log] }))).toEqual([]);
    expect(warningTargets(base({ sessions: [session('a', 'long', '2026-07-08', { status: 'skipped' })] }))).toEqual([]);
    expect(warningTargets(base({ sessions: [session('a', 'long', '2026-07-08')], weatherPlace: undefined }))).toEqual([]);
  });

  it('een tocht gaat voor een training op dezelfde dag', () => {
    const p = period('2026-07-08', '2026-07-10', trek({ place: HUT }));
    expect(warningTargets(base({ periods: [p], sessions: [session('a', 'long', '2026-07-08')] }))[0].kind).toBe('trek');
  });
});

const forecast = (hours: WarningHour[], fetchedAt = '2026-07-08T06:00:00Z', utcOffsetSec = 7200): WarningForecast => ({ fetchedAt, place: HUT, utcOffsetSec, hours });
const day = (date: string, at: (h: number) => Partial<WarningHour>): WarningHour[] =>
  Array.from({ length: 24 }, (_, h) => ({ time: `${date}T${String(h).padStart(2, '0')}:00`, tempC: 20, gustKmh: 20, code: 1, ...at(h) }));
const today: WarningTarget = { date: '2026-07-08', when: 'vandaag', kind: 'trek', place: HUT };
const tomorrow: WarningTarget = { date: '2026-07-09', when: 'morgen', kind: 'trek', place: HUT };
// 08:00 op de klok van de plek (UTC+2).
const NOW = new Date('2026-07-08T06:00:00Z');

describe('warningLines', () => {
  it('onweer met het droge feit eerst', () => {
    const f = forecast(day('2026-07-08', (h) => (h >= 15 && h <= 17 ? { code: 95 } : {})));
    expect(warningLines(f, today, NOW)).toEqual(['Onweer verwacht vanaf 15:00 in Col du Test.']);
  });

  it('morgen zegt morgen', () => {
    const f = forecast(day('2026-07-09', (h) => (h === 16 ? { code: 96 } : {})));
    expect(warningLines(f, tomorrow, NOW)).toEqual(['Onweer verwacht morgen vanaf 16:00 in Col du Test.']);
  });

  it('storm en hitte met hun hoogste waarde, de zwaarste eerst', () => {
    const f = forecast(day('2026-07-08', (h) => ({ ...(h >= 14 ? { gustKmh: GUST_KMH + 10 } : {}), ...(h >= 12 && h <= 16 ? { tempC: HEAT_C + 3 } : {}), ...(h === 18 ? { code: 99 } : {}) })));
    expect(warningLines(f, today, NOW)).toEqual([
      'Onweer verwacht vanaf 18:00 in Col du Test.',
      'Zware windstoten verwacht vanaf 14:00 in Col du Test, tot 85 km per uur.',
      'Hitte verwacht vanaf 12:00 in Col du Test, tot 33 graden.',
    ]);
  });

  it('net onder de drempels is er niets', () => {
    const f = forecast(day('2026-07-08', () => ({ gustKmh: GUST_KMH - 1, tempC: HEAT_C - 0.5, code: 82 })));
    expect(warningLines(f, today, NOW)).toEqual([]);
  });

  it('vandaag tellen alleen de uren die nog komen, op de klok van de plek', () => {
    const f = forecast(day('2026-07-08', (h) => (h === 7 ? { code: 95 } : {})));
    expect(warningLines(f, today, NOW)).toEqual([]);
    // De nacht telt niet: na 22 uur ben je niet meer buiten.
    const night = forecast(day('2026-07-08', (h) => (h === 23 ? { code: 95 } : {})));
    expect(warningLines(night, today, NOW)).toEqual([]);
  });

  it('zwijgt bij oude data, data uit de toekomst of zonder voorspelling', () => {
    const f = forecast(day('2026-07-08', (h) => (h === 15 ? { code: 95 } : {})), '2026-07-07T20:00:00Z');
    expect(warningLines(f, today, NOW)).toEqual([]);
    expect(warningLines(forecast(f.hours, '2026-07-08T09:00:00Z'), today, NOW)).toEqual([]);
    expect(warningLines(undefined, today, NOW)).toEqual([]);
  });

  it('je locatie heet op je plek', () => {
    expect(placePhrase({ name: 'Mijn locatie', lat: 1, lon: 1 })).toBe('op je plek');
    expect(placePhrase(HUT)).toBe('in Col du Test');
  });

  it('geen gedachtestreepjes in de regels', () => {
    const f = forecast(day('2026-07-08', () => ({ code: 95, gustKmh: 90, tempC: 35 })));
    for (const line of warningLines(f, today, NOW)) expect(line).not.toMatch(new RegExp('[\\u2013\\u2014]'));
  });
});
