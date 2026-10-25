import { describe, it, expect } from 'vitest';
import type { RecoveryMetric } from '../models/metrics';
import type { NightJudgment } from '../models/checkIn';
import { addDays } from '../utils/dates';
import { ignoredNightDates, isDoubtfulShortNight, judgmentFor, nightQuestionText, removeJudgment, shortSleepLabel, upsertJudgment } from './shortNight';
import { baselineValues, todayWellness } from './wellnessCheck';
import { morningCardView, morningPrefill, reviseCheckInSleep } from './morningCard';
import { watchSummaryLine } from './wellnessCheck';
import { nightInfo } from './shortNight';

const TODAY = '2026-10-22';

function day(offset: number, extra: Partial<RecoveryMetric>): RecoveryMetric {
  const date = addDays(TODAY, offset);
  return { id: `r-${date}`, date, source: 'import', ...extra };
}

// Gewone nachten van 7 uur 20, met hartslag en HRV.
function ordinary(count = 10): RecoveryMetric[] {
  return Array.from({ length: count }, (_, i) => day(-(i + 1), { sleepMinutes: 440, sleepScore: 78, restingHeartRate: 52, hrv: 60 }));
}

const short = (minutes = 190): RecoveryMetric => day(0, { sleepMinutes: minutes, sleepScore: 35, restingHeartRate: 53, hrv: 30 });

describe('isDoubtfulShortNight', () => {
  it('onder 4 uur is altijd twijfelachtig, ook zonder eigen gemiddelde', () => {
    expect(isDoubtfulShortNight(239, [])).toBe(true);
    expect(isDoubtfulShortNight(240, [])).toBe(false);
  });

  it('onder de helft van het eigen gemiddelde is twijfelachtig, vanaf 7 dagen', () => {
    const base = Array.from({ length: 7 }, () => 600);
    expect(isDoubtfulShortNight(299, base)).toBe(true);
    expect(isDoubtfulShortNight(300, base)).toBe(false);
  });

  it('met minder dan 7 dagen telt de helft van het gemiddelde niet', () => {
    const base = Array.from({ length: 6 }, () => 600);
    expect(isDoubtfulShortNight(290, base)).toBe(false);
  });
});

describe('teksten', () => {
  it('schrijft de duur kort', () => {
    expect(shortSleepLabel(190)).toBe('3 u 10');
    expect(shortSleepLabel(180)).toBe('3 u');
    expect(shortSleepLabel(45)).toBe('45 min');
    expect(nightQuestionText(190)).toBe('Je horloge zag maar 3 u 10 slaap. Klopt dat?');
  });
});

describe('todayWellness bij een korte nacht', () => {
  const metrics = [...ordinary(), short()];

  it('zonder de optie (zoals voorheen): let op en een voorgesteld slecht', () => {
    const r = todayWellness(TODAY, metrics)!;
    expect(r.night).toBeUndefined();
    expect(r.lines.find((l) => l.key === 'sleep')!.tone).toBe('attention');
    expect(r.suggestedSleep).toBe('slecht');
  });

  it('zonder oordeel: een vraag, geen let op en geen voorstel', () => {
    const r = todayWellness(TODAY, metrics, { ask: true, judgments: [] })!;
    expect(r.night).toMatchObject({ state: 'ask', minutes: 190 });
    expect(r.lines.find((l) => l.key === 'sleep')!.tone).toBe('normal');
    expect(r.suggestedSleep).toBeUndefined();
    expect(morningPrefill({ legIndex: undefined, reading: r }).sleep).toBeUndefined();
  });

  it('een gewone nacht geeft geen vraag', () => {
    const r = todayWellness(TODAY, [...ordinary(), day(0, { sleepMinutes: 400, sleepScore: 70, restingHeartRate: 52, hrv: 60 })], { ask: true, judgments: [] })!;
    expect(r.night).toBeUndefined();
  });

  it('klopt: de nacht telt gewoon, met de gewone regel en het voorstel', () => {
    const r = todayWellness(TODAY, metrics, { ask: true, judgments: [{ date: TODAY, verdict: 'klopt' }] })!;
    expect(r.night?.state).toBe('klopt');
    expect(r.lines.find((l) => l.key === 'sleep')!.tone).toBe('attention');
    expect(r.suggestedSleep).toBe('slecht');
  });

  it('niet goed gemeten: geen let op, geen voorstel, de HRV niet als zorg', () => {
    const r = todayWellness(TODAY, metrics, { ask: true, judgments: [{ date: TODAY, verdict: 'niet_goed' }] })!;
    expect(r.night?.state).toBe('ignored');
    expect(r.lines.find((l) => l.key === 'sleep')!.tone).toBe('normal');
    expect(r.lines.find((l) => l.key === 'hrv')!.tone).toBe('normal');
    expect(r.suggestedSleep).toBeUndefined();
    expect(r.suggestedEnergy).toBeUndefined();
  });

  it('een eigen schatting wordt het voorstel, met bron zelf ingevuld', () => {
    const r = todayWellness(TODAY, metrics, { ask: true, judgments: [{ date: TODAY, verdict: 'niet_goed', hours: 7 }] })!;
    expect(r.suggestedSleep).toBe('goed');
    expect(r.suggestedSleepFrom).toBe('zelf');
    expect(morningPrefill({ legIndex: undefined, reading: r }).sleep).toEqual({ value: 'goed', from: 'zelf' });
    const five = todayWellness(TODAY, metrics, { ask: true, judgments: [{ date: TODAY, verdict: 'niet_goed', hours: 5 }] })!;
    expect(five.suggestedSleep).toBe('matig');
  });

  it('Weet ik niet: genegeerd zonder voorstel', () => {
    const r = todayWellness(TODAY, metrics, { ask: true, judgments: [{ date: TODAY, verdict: 'niet_goed', hoursSkipped: true }] })!;
    expect(r.night).toMatchObject({ state: 'ignored', hoursSkipped: true });
    expect(r.suggestedSleep).toBeUndefined();
  });

  it('uit: alles zoals voorheen, ook met een oordeel in de opslag', () => {
    const r = todayWellness(TODAY, metrics, { ask: false, judgments: [{ date: TODAY, verdict: 'niet_goed', hours: 8 }] })!;
    expect(r.night).toBeUndefined();
    expect(r.suggestedSleep).toBe('slecht');
    expect(r.lines.find((l) => l.key === 'sleep')!.tone).toBe('attention');
  });

  it('geen slaap in het record: geen vraag', () => {
    const r = todayWellness(TODAY, [...ordinary(), day(0, { restingHeartRate: 52 })], { ask: true, judgments: [] })!;
    expect(r.night).toBeUndefined();
  });

  it('veel korter dan het eigen gemiddelde is ook een vraag', () => {
    const long = Array.from({ length: 10 }, (_, i) => day(-(i + 1), { sleepMinutes: 600 }));
    const r = todayWellness(TODAY, [...long, day(0, { sleepMinutes: 290 })], { ask: true, judgments: [] })!;
    expect(r.night?.state).toBe('ask');
  });
});

describe('eigen gemiddelden', () => {
  const judgments: NightJudgment[] = [{ date: addDays(TODAY, -2), verdict: 'niet_goed' }, { date: addDays(TODAY, -3), verdict: 'klopt' }];
  const metrics = [day(-2, { sleepMinutes: 100, hrv: 20, restingHeartRate: 70 }), ...ordinary().filter((m) => m.date !== addDays(TODAY, -2))];

  it('slaapduur en HRV van een genegeerde nacht tellen niet mee, rusthartslag wel', () => {
    const skip = ignoredNightDates(judgments);
    expect([...skip]).toEqual([addDays(TODAY, -2)]);
    expect(baselineValues(TODAY, metrics, (m) => m.sleepMinutes)).toContain(100);
    expect(baselineValues(TODAY, metrics, (m) => m.sleepMinutes, skip)).not.toContain(100);
    expect(baselineValues(TODAY, metrics, (m) => m.hrv, skip)).not.toContain(20);
    expect(baselineValues(TODAY, metrics, (m) => m.restingHeartRate)).toContain(70);
  });

  it('een genegeerde nacht verlaagt het gemiddelde van de dagen erna niet', () => {
    const today = day(0, { sleepMinutes: 420, sleepScore: 75, restingHeartRate: 52, hrv: 60 });
    const withIt = todayWellness(TODAY, [...metrics, today], { ask: true, judgments: [] })!;
    const without = todayWellness(TODAY, [...metrics, today], { ask: true, judgments })!;
    const note = (r: typeof withIt) => r.lines.find((l) => l.key === 'sleep')!.note;
    expect(note(withIt)).not.toBe(note(without));
    expect(note(without)).toContain('7 uur 20');
  });

  it('uit telt de genegeerde nacht gewoon mee', () => {
    const today = day(0, { sleepMinutes: 420, sleepScore: 75, restingHeartRate: 52, hrv: 60 });
    const off = todayWellness(TODAY, [...metrics, today], { ask: false, judgments })!;
    expect(off.lines.find((l) => l.key === 'sleep')!.note).not.toContain('7 uur 20');
  });
});

describe('oordelen bewaren', () => {
  it('zet een oordeel per datum neer en haalt het weg', () => {
    const a = upsertJudgment([], { date: '2026-10-22', verdict: 'klopt' });
    const b = upsertJudgment(a, { date: '2026-10-22', verdict: 'niet_goed', hours: 6 });
    expect(b).toEqual([{ date: '2026-10-22', verdict: 'niet_goed', hours: 6 }]);
    expect(judgmentFor('2026-10-22', b)?.hours).toBe(6);
    expect(judgmentFor('2026-10-21', b)).toBeUndefined();
    expect(removeJudgment(b, '2026-10-22')).toEqual([]);
  });

  it('bewaart de laatste 120 dagen', () => {
    let list: NightJudgment[] = [];
    for (let i = 0; i < 130; i++) list = upsertJudgment(list, { date: addDays('2026-01-01', i), verdict: 'klopt' });
    expect(list).toHaveLength(120);
    expect(list[0].date).toBe(addDays('2026-01-01', 10));
  });
});

describe('een oordeel geldt voor de getallen die je zag', () => {
  const niet: NightJudgment = { date: TODAY, verdict: 'niet_goed', minutes: 190 };

  it('komt de rest van de nacht later binnen, dan vervalt het oordeel', () => {
    const later = [...ordinary(), day(0, { sleepMinutes: 420, sleepScore: 75, restingHeartRate: 52, hrv: 60 })];
    const r = todayWellness(TODAY, later, { ask: true, judgments: [niet] })!;
    expect(r.night).toBeUndefined();
    expect(r.suggestedSleep).toBe('goed');
  });

  it('een vervallen oordeel telt de nacht weer mee in de basis van de dagen erna', () => {
    const tomorrow = addDays(TODAY, 1);
    const metrics = [...ordinary(), day(0, { sleepMinutes: 420, hrv: 60 })];
    expect(ignoredNightDates([niet], metrics).has(TODAY)).toBe(false);
    expect(baselineValues(tomorrow, metrics, (m) => m.sleepMinutes, ignoredNightDates([niet], metrics))).toContain(420);
    const same = [...ordinary(), short()];
    expect(ignoredNightDates([niet], same).has(TODAY)).toBe(true);
  });

  it('is de nacht nog twijfelachtig, dan volgt de vraag opnieuw', () => {
    const r = todayWellness(TODAY, [...ordinary(), short(200)], { ask: true, judgments: [niet] })!;
    expect(r.night?.state).toBe('ask');
  });

  it('een Klopt geldt ook alleen voor dezelfde minuten', () => {
    expect(nightInfo(190, [], { date: TODAY, verdict: 'klopt', minutes: 190 })?.state).toBe('klopt');
    expect(nightInfo(200, [], { date: TODAY, verdict: 'klopt', minutes: 190 })?.state).toBe('ask');
  });

  it('een oud oordeel zonder minuten geldt als voorheen', () => {
    const r = todayWellness(TODAY, [...ordinary(), short(200)], { ask: true, judgments: [{ date: TODAY, verdict: 'niet_goed' }] })!;
    expect(r.night?.state).toBe('ignored');
  });
});

describe('een genegeerde nacht op de kaart', () => {
  const metrics = [...ordinary(), short()];
  const ignored = (extra: Partial<NightJudgment> = {}) => todayWellness(TODAY, metrics, { ask: true, judgments: [{ date: TODAY, verdict: 'niet_goed', minutes: 190, ...extra }] })!;

  it('de HRV-regel zegt dat de nacht niet meetelt', () => {
    const hrv = ignored().lines.find((l) => l.key === 'hrv')!;
    expect(hrv.tone).toBe('normal');
    expect(hrv.note).toBe('Deze nacht telt niet mee.');
  });

  it('met een eigen schatting is de slaap zelf en staat het kopje er niet bij als alleen die er is', () => {
    const v = morningCardView(ignored({ hours: 7 }));
    expect(v.stats.map((s) => s.label)).toEqual(['Slaap, zelf', 'Rusthart', 'HRV']);
    expect(v.heading).toBe('horloge en zelf');
  });

  it('zonder schatting ontbreekt de slaap en alles wat er staat komt van het horloge', () => {
    const v = morningCardView(ignored({ hoursSkipped: true }), {});
    expect(v.stats.map((s) => s.label)).toEqual(['Rusthart', 'HRV']);
    expect(v.heading).toBe('van je horloge');
  });

  it('de regel zonder getallen toont de gemeten slaap niet', () => {
    const only = todayWellness(TODAY, [...ordinary().map((m) => ({ ...m, restingHeartRate: undefined, hrv: undefined })), day(0, { sleepMinutes: 190 })], { ask: true, judgments: [{ date: TODAY, verdict: 'niet_goed', hoursSkipped: true, minutes: 190 }] })!;
    expect(watchSummaryLine(only)).toBe('');
    expect(morningCardView(only, { linked: true }).line).toBe('');
    expect(watchSummaryLine(ignored({ hoursSkipped: true }))).not.toMatch(/3 uur/);
    expect(watchSummaryLine(ignored({ hoursSkipped: true }))).not.toMatch(/Geen slaap/);
  });

  it('een gewone nacht blijft van het horloge', () => {
    const v = morningCardView(todayWellness(TODAY, [...ordinary(), day(0, { sleepMinutes: 420, restingHeartRate: 52, hrv: 60 })], { ask: true, judgments: [] }));
    expect(v.heading).toBe('van je horloge');
    expect(v.stats[0]).toMatchObject({ label: 'Slaap', value: '7:00' });
  });
});

describe('het slaapantwoord volgt je oordeel zolang je het niet zelf koos', () => {
  const saved = { date: TODAY, legs: 'fris' as const, sleep: 'slecht' as const, sleepSuggested: true };

  it('Niet goed gemeten met 7 uur zet het antwoord op goed', () => {
    expect(reviseCheckInSleep(saved, { verdict: 'niet_goed', hours: 7 }).sleep).toBe('goed');
  });

  it('zonder schatting of na ongedaan maken verdwijnt het voorstel', () => {
    expect(reviseCheckInSleep(saved, { verdict: 'niet_goed', hoursSkipped: true } as never).sleep).toBeUndefined();
    const undone = reviseCheckInSleep(saved, null);
    expect(undone.sleep).toBeUndefined();
    expect(undone.sleepSuggested).toBe(true);
  });

  it('wat je zelf koos blijft staan, en Klopt verandert niets', () => {
    const own = { date: TODAY, sleep: 'matig' as const };
    expect(reviseCheckInSleep(own, { verdict: 'niet_goed', hours: 8 })).toBe(own);
    expect(reviseCheckInSleep(saved, { verdict: 'klopt' })).toBe(saved);
  });
});
