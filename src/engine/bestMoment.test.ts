import { describe, it, expect } from 'vitest';
import { BEST_MOMENT_RULES, bestMomentForTraining, hourNL } from './bestMoment';
import { weatherForTraining } from './weather';
import type { SessionLog, SessionTemplate } from '../models/training';
import type { WeatherHour } from '../models/weather';
import { makeForecast } from './fixtures/weatherFixture';

// Een training van anderhalf uur: twee uur voorspelling telt mee.
const run: SessionTemplate = { id: 'run', name: 'Easy Run', type: 'cardio', durationVariants: { full: 90 } };
const lower: SessionTemplate = { id: 'lower', name: 'Benen A', type: 'strength', durationVariants: { full: 50 } };

const DAY = '2026-10-21'; // woensdag: zonder logs begint een training om 18 uur
const MORNING = new Date(2026, 9, 21, 9, 0);
const at = (hour: number, minute = 0) => new Date(2026, 9, 21, hour, minute);

// Regen in een uur: standaard 1,5 mm, dus "regen" bij twee uur (3 mm).
const rain = (mm = 1.5): Partial<WeatherHour> => ({ precipMm: mm, precipProb: 90, code: 61 });
const SUN = { sunrise: '07:30', sunset: '19:30' };

type Pick = (hour: number) => Partial<WeatherHour> | undefined;
// Alleen DAY wordt aangepast; de andere dagen zijn mooi.
const forecast = (pick: Pick, options: Parameters<typeof makeForecast>[2] = SUN) =>
  makeForecast('2026-10-20', (date, h) => (date === DAY ? pick(h) : undefined), options);

type Opts = { template?: SessionTemplate; logs?: SessionLog[]; date?: string; minutes?: number; now?: Date };
const best = (f: ReturnType<typeof forecast> | undefined, o: Opts = {}) =>
  bestMomentForTraining({ forecast: f, template: o.template ?? run, logs: o.logs ?? [], date: o.date ?? DAY, durationMinutes: o.minutes ?? 90, now: o.now ?? MORNING });

const rainFromEvening: Pick = (h) => (h >= 18 && h < 22 ? rain() : undefined);

describe('bestMomentForTraining: een beter blok', () => {
  it('regen om 18 uur maar droog om 16 uur: het blok van 16 tot 17.30', () => {
    const f = forecast(rainFromEvening);
    // Op het gewone uur regent het: dat is ook wat de weerregel zegt.
    expect(weatherForTraining({ forecast: f, template: run, logs: [], date: DAY, durationMinutes: 90, now: MORNING })?.verdict).toBe('let_op');
    const m = best(f);
    expect(m).toMatchObject({ date: DAY, startHour: 16, startMinutes: 960, endMinutes: 1050, verdict: 'prima', reason: 'droog' });
    expect(m?.text).toBe('Beste moment: 16 tot 17.30 uur, droog');
  });

  it('kiest van gelijke blokken het blok het dichtst bij het gewone uur', () => {
    // Droog van 15 tot 18 uur, regen ervoor en erna: 15 en 16 passen, 17 raakt de regen van 18 uur.
    const f = forecast((h) => (h < 15 || h >= 18 ? rain() : undefined));
    expect(best(f)?.startHour).toBe(16);
  });

  it('een blok later op de dag mag ook', () => {
    // Een vroege loper (om 7 uur, voor zonsopkomst) met regen om 7 en 8 uur: het blok van 9 uur.
    const logs = ['2026-10-12', '2026-10-13', '2026-10-14'].map((d, i): SessionLog => ({
      id: `l${i}`, templateId: 'run', type: 'cardio', completedDate: d, completedAt: new Date(`${d}T07:30:00`).toISOString(), variant: 'full', durationMinutes: 30, source: 'manual',
    }));
    const f = forecast((h) => (h >= 7 && h < 9 ? rain() : undefined));
    expect(best(f, { logs, minutes: 45, now: at(5, 30) })?.text).toBe('Beste moment: 9 tot 9.45 uur, droog en licht');
  });

  it('van slecht naar let op telt ook, met de reden in woorden', () => {
    // Onweer om 18 en 19 uur; overdag lichte regen: nog regen, maar geen onweer meer.
    const f = forecast((h) => (h >= 18 && h < 20 ? { code: 95, precipMm: 0.2 } : h >= 7 && h < 18 ? rain() : undefined));
    expect(weatherForTraining({ forecast: f, template: run, logs: [], date: DAY, durationMinutes: 90, now: MORNING })?.verdict).toBe('slecht');
    expect(best(f)).toMatchObject({ startHour: 16, verdict: 'let_op', reason: 'geen onweer' });
  });

  it('zelfde klasse, minder redenen: de regen is weg, de wind blijft', () => {
    const windy: Partial<WeatherHour> = { windKmh: 45, gustKmh: 55 };
    const f = forecast((h) => (h >= 18 && h < 22 ? { ...windy, ...rain() } : windy));
    expect(best(f)).toMatchObject({ startHour: 16, verdict: 'let_op', reason: 'droog' });
  });

  it('zelfde reden, alleen minder: geen reden om iets te zeggen', () => {
    // 6 mm tegen 1,5 mm is nog steeds regen volgens de drempels; harde wind van 60 tegen 42 km/u ook.
    expect(best(forecast((h) => (h >= 18 && h < 22 ? rain(3) : rain(0.75))))).toBeUndefined();
    expect(best(forecast((h) => (h >= 18 ? { windKmh: 60, gustKmh: 70 } : { windKmh: 42, gustKmh: 50 })))).toBeUndefined();
  });

  it('van storm naar harde wind en van zware regen naar regen is een klasse beter', () => {
    const storm = forecast((h) => (h >= 18 ? { windKmh: 70, gustKmh: 80 } : { windKmh: 42, gustKmh: 50 }));
    expect(best(storm)).toMatchObject({ startHour: 16, verdict: 'let_op', reason: 'minder wind' });
    const downpour = forecast((h) => (h >= 18 && h < 22 ? rain(5) : rain(0.75)));
    expect(best(downpour)).toMatchObject({ startHour: 16, verdict: 'let_op', reason: 'minder regen' });
  });

  it('noemt hooguit twee dingen, en "licht" als het gewone uur in het donker was', () => {
    // Standaard zonsondergang 18.12: het gewone uur (18 tot 19.30) is donker.
    const stormy = forecast((h) => (h >= 18 ? { ...rain(), windKmh: 45, gustKmh: 55 } : undefined), {});
    expect(best(stormy)).toMatchObject({ startHour: 16, verdict: 'prima', reason: 'droog en minder wind' });
    const wet = forecast((h) => (h >= 18 ? rain() : undefined), {});
    expect(best(wet)?.reason).toBe('droog en licht');
  });

  it('rondt het einde af op vijf minuten', () => {
    // Een uur voorspelling telt mee, dus het blok van 17 uur is droog.
    const f = forecast((h) => (h >= 18 ? rain() : undefined));
    expect(best(f, { minutes: 47 })?.text).toBe('Beste moment: 17 tot 17.50 uur, droog');
    expect(best(f, { minutes: 60 })?.text).toBe('Beste moment: 17 tot 18 uur, droog');
  });

  it('kijkt ook naar de komende dagen, tot drie dagen vooruit', () => {
    const f = makeForecast('2026-10-20', (_d, h) => ((h >= 10 && h < 12) || (h >= 18 && h < 22) ? rain() : undefined), SUN);
    // Donderdag, gewone uur 18: het blok van 16 uur.
    expect(best(f, { date: '2026-10-22' })?.startHour).toBe(16);
    // Zaterdag (drie dagen), gewone uur 10 met regen: 8 en 12 liggen even ver weg, het eerste wint.
    expect(best(f, { date: '2026-10-24' })?.text).toBe('Beste moment: 8 tot 9.30 uur, droog');
    // Zondag is vier dagen vooruit: een voorspelling die zo ver vooruit ligt wisselt te vaak.
    expect(best(f, { date: '2026-10-25' })).toBeUndefined();
  });
});

describe('bestMomentForTraining: niets extra', () => {
  it('het gewone uur is al prima: niets', () => {
    expect(best(forecast(() => undefined))).toBeUndefined();
  });

  it('de hele dag hetzelfde slechte weer: niets', () => {
    expect(best(forecast(() => rain()))).toBeUndefined();
    expect(best(forecast(() => ({ code: 95 })))).toBeUndefined();
  });

  it('een blok dat zelf slecht weer heeft wordt nooit aangeraden', () => {
    // Regen om 18 uur (let op), de rest van de dag onweer.
    const f = forecast((h) => (h >= 18 && h < 22 ? rain() : { code: 95 }));
    expect(best(f)).toBeUndefined();
  });

  it('vandaag na het beste uur: niets, ervoor wel', () => {
    const f = forecast(rainFromEvening);
    expect(best(f, { now: at(15, 10) })?.startHour).toBe(16);
    expect(best(f, { now: at(16, 0) })?.startHour).toBe(16);
    // Om 16.40 is het blok van 16 uur al begonnen en raakt het volgende hele uur de regen.
    expect(best(f, { now: at(16, 40) })).toBeUndefined(); // 17 tot 18.30 heeft nog altijd regen
    expect(best(f, { now: at(17, 30) })).toBeUndefined();
    // Na het gewone uur zelf ook: alles wat nog komt is donker.
    expect(best(f, { now: at(20, 30) })).toBeUndefined();
  });

  it('een training die al gedaan is: niets', () => {
    const f = forecast(rainFromEvening);
    const done: SessionLog = { id: 'x', templateId: 'run', type: 'cardio', completedDate: DAY, completedAt: at(7, 30).toISOString(), variant: 'full', durationMinutes: 30, source: 'manual' };
    expect(best(f, { logs: [done] })).toBeUndefined();
    // Een andere dag of een andere training telt niet.
    expect(best(f, { logs: [{ ...done, completedDate: '2026-10-20' }] })?.startHour).toBe(16);
    expect(best(f, { logs: [{ ...done, templateId: 'lower' }] })?.startHour).toBe(16);
  });

  it('een droog blok in het donker of voor zonsopkomst: niets', () => {
    // Regen van 7 tot 19 uur, daarna droog, maar de zon gaat onder om 19.30.
    expect(best(forecast((h) => (h >= 7 && h < 19 ? rain() : undefined)))).toBeUndefined();
    // Regen overdag en droog in de nacht; zonsopkomst 7.30.
    expect(best(forecast((h) => (h >= 7 ? rain() : undefined)), { now: at(0, 0) })).toBeUndefined();
  });

  it('zonder zonsopkomst in de voorspelling: een redelijk venster van 7 tot 21 uur', () => {
    const noSun = (pick: Pick) => ({ ...forecast(pick), days: [] });
    expect(best(noSun((h) => (h >= 7 ? rain() : undefined)), { now: at(0, 0) })).toBeUndefined();
    expect(best(noSun((h) => ((h >= 7 && h < 12) || (h >= 18 && h < 22) ? rain() : undefined)))?.startHour).toBe(16);
    // Een blok dat na 21 uur eindigt valt buiten het venster.
    expect(best(noSun((h) => (h < 21 ? rain() : undefined)))).toBeUndefined();
    expect(BEST_MOMENT_RULES.fallbackFromHour).toBe(7);
    expect(BEST_MOMENT_RULES.fallbackToHour).toBe(21);
  });

  it('een dag in het verleden: niets', () => {
    const f = makeForecast('2026-10-20', (_d, h) => (h >= 18 && h < 22 ? rain() : undefined), SUN);
    expect(best(f, { date: '2026-10-20' })).toBeUndefined();
  });

  it('kracht, geen voorspelling of een voorspelling die niet tot die dag reikt: niets', () => {
    const f = forecast(rainFromEvening);
    expect(best(f, { template: lower })).toBeUndefined();
    expect(best(undefined)).toBeUndefined();
    expect(best(f, { date: '2026-11-30', now: new Date(2026, 10, 30, 9) })).toBeUndefined();
  });
});

describe('hourNL', () => {
  it('schrijft een heel uur zonder minuten, zoals mensen het zeggen', () => {
    expect(hourNL(960)).toBe('16');
    expect(hourNL(1050)).toBe('17.30');
    expect(hourNL(485)).toBe('8.05');
  });
});
