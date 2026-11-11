// Eten onderweg (engine/fuelOnTheGo.ts) en de regel in De avond ervoor. Nagemaakte trainingen,
// tochten en etappes; de klok staat op Europe/Amsterdam zoals bij de eigenaar.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import type { SweatEntry } from '../models/sweat';
import { makeForecast } from './fixtures/weatherFixture';
import {
  FUEL_FROM_MINUTES,
  FUEL_ITEMS,
  NOT_MEDICAL,
  PRACTICE_LINE,
  TREK_DAY_HOURS,
  countFor,
  fuelEveningLine,
  fuelFor,
  fuelForTraining,
  fuelForTrekDay,
  fuelForTrekPeriod,
  fuelGuideLines,
  fuelOn,
  trekEveningLine,
  trekFuelLines,
  trekFuelSummary,
} from './fuelOnTheGo';
import { MAX_LINES, eveningBefore, resolveEveningBefore, type EveningInput } from './eveningBefore';
import { stageWater } from './stageWater';
import { cleanSettings } from '../storage/backupClean';

const LONG_RUN: SessionTemplate = { id: 'tpl_long_run', name: 'Lange duurloop', type: 'cardio', durationVariants: { full: 120 } };
const SHORT_RUN: SessionTemplate = { id: 'tpl_easy_run', name: 'Rustige duurloop', type: 'cardio', durationVariants: { full: 45 } };
const TEMPO: SessionTemplate = {
  id: 'tpl_tempo', name: 'Tempoloop', type: 'cardio', durationVariants: { full: 90 },
  baseStressProfile: { lowerBodyLoad: 'moderate', impact: 'moderate', eccentricLoad: 'light', intensity: 'high' },
} as SessionTemplate;
const RUCK: SessionTemplate = { id: 'tpl_ruck_walk', name: 'Rugzakwandeling', type: 'hiking', durationVariants: { full: 240 }, outdoorTarget: { backpackWeightKg: 10 } };
const UPPER: SessionTemplate = { id: 'tpl_upper_a', name: 'Bovenlichaam A', type: 'strength', durationVariants: { full: 120 } };
const BIKE: SessionTemplate = { id: 'tpl_bike', name: 'Fietsen', type: 'cardio', sport: 'cycling', durationVariants: { full: 120 } };

const noDash = (s: string) => !/[\u2013\u2014]/.test(s);

describe('de grens', () => {
  it('een korte training krijgt geen regel', () => {
    expect(fuelForTraining(SHORT_RUN, 45)).toBeUndefined();
    expect(fuelFor(89, 'run')).toBeUndefined();
  });
  it('precies op de grens van 90 minuten wel', () => {
    expect(FUEL_FROM_MINUTES).toBe(90);
    const est = fuelFor(90, 'run')!;
    // 30 tot 45 g per uur, anderhalf uur: 45 tot 67,5, afgerond op 5.
    expect(est.grams).toEqual([45, 70]);
  });
  it('een training zonder duur: niets, ook niet bij onzin', () => {
    expect(fuelForTraining(LONG_RUN, undefined)).toBeUndefined();
    expect(fuelFor(Number.NaN, 'run')).toBeUndefined();
    expect(fuelFor(null, 'walk')).toBeUndefined();
    expect(fuelFor(-120, 'walk')).toBeUndefined();
  });
  it('alleen lopen en wandelen; kracht en fietsen niet', () => {
    expect(fuelForTraining(UPPER, 120)).toBeUndefined();
    expect(fuelForTraining(BIKE, 120)).toBeUndefined();
  });
});

describe('de voorbeelden (nagemaakt)', () => {
  it('een lange duurloop van 2 uur', () => {
    const est = fuelForTraining(LONG_RUN, 120)!;
    expect(est.grams).toEqual([60, 90]);
    expect(fuelEveningLine(est)).toBe('Eten mee: 60 tot 90 g koolhydraten, 2 tot 4 gels of bananen.');
    const lines = fuelGuideLines(est);
    expect(lines[0]).toBe('Ongeveer 60 tot 90 g koolhydraten voor 120 min: 30 tot 45 g per uur.');
    expect(lines[1]).toContain('2 tot 4 gels van 25\u00a0g');
    expect(lines).toContain(PRACTICE_LINE);
  });
  it('een tempoloop rekent hoger dan een rustige', () => {
    expect(fuelForTraining(TEMPO, 90)!.perHour).toEqual([45, 60]);
  });
  it('een rugzakwandeling van 4 uur: echt eten, 30 tot 40 g per uur', () => {
    const est = fuelForTraining(RUCK, 240)!;
    expect(est.perHour).toEqual([30, 40]);
    expect(est.grams).toEqual([120, 160]);
    expect(fuelEveningLine(est)).toBe('Eten mee: 120 tot 160 g koolhydraten, 4 tot 5 krentenbollen of bananen.');
    expect(fuelGuideLines(est).some((l) => /gel/.test(l))).toBe(false);
  });
  it('een GR5-etappe van 6 uur 10, met water ernaast en niet dubbel', () => {
    const stage = { section: 1 as const, minutes: 370 };
    const est = fuelForTrekDay(stage.minutes)!;
    expect(est.hoursAssumed).toBe(false);
    expect(est.grams).toEqual([185, 245]);
    const lines = trekFuelLines(est);
    expect(lines[0]).toBe('Per dag ongeveer 185 tot 245 g koolhydraten, bij 6,2 uur lopen: 30 tot 40 g per uur.');
    expect(lines).toContain(PRACTICE_LINE);
    // Het water staat apart, uit het zweettempo; de etenregels noemen geen liters.
    expect(stageWater(stage, undefined)).toBeDefined();
    expect(lines.some((l) => /liter|water/i.test(l))).toBe(false);
  });
});

describe('een tocht', () => {
  it('een tocht van meerdere dagen: per dag, met het totaal en de aanname', () => {
    const period = { id: 't', kind: 'trek', startDate: '2026-11-20', endDate: '2026-11-22', trek: { name: 'Veluwetocht', terrain: 'flat_trail', tent: true, importance: 'training' } } as LeavePeriod;
    const est = fuelForTrekPeriod(period)!;
    expect(est.days).toBe(3);
    expect(est.hoursAssumed).toBe(true);
    expect(est.minutes).toBe(TREK_DAY_HOURS * 60);
    expect(est.grams).toEqual([180, 240]);
    const lines = trekFuelLines(est);
    expect(lines[0]).toContain('een aanname');
    expect(lines).toContain('Voor 3 dagen: 540 tot 720 g koolhydraten, verdeeld over de dagen. Een ontbijt en avondeten komen erbij.');
    expect(trekFuelSummary(est)).toBe('Eten per dag ongeveer 180 tot 240 g koolhydraten, vooral echt eten. Oefen het onderweg op lange trainingen.');
    expect(trekEveningLine(est)).toBe('Eten voor de dag: 180 tot 240 g koolhydraten, vooral echt eten.');
  });
  it('alleen een tocht, geen vrije dagen', () => {
    expect(fuelForTrekPeriod({ kind: 'free_days', startDate: '2026-11-20', endDate: '2026-11-22' })).toBeUndefined();
  });
  it('een tocht van één dag zegt geen totaal', () => {
    expect(trekFuelLines(fuelForTrekDay()!).some((l) => l.startsWith('Voor '))).toBe(false);
  });
});

describe('de stuks', () => {
  it('minstens één, nooit een omgekeerd bereik', () => {
    expect(countFor([10, 10], FUEL_ITEMS.gel)).toEqual([1, 1]);
    expect(countFor([60, 90], FUEL_ITEMS.gel)).toEqual([2, 4]);
    expect(countFor([60, 90], FUEL_ITEMS.dadels)).toEqual([2, 4]);
  });
  it('de grammen per stuk staan vast', () => {
    expect(Object.fromEntries(Object.values(FUEL_ITEMS).map((i) => [i.id, i.grams]))).toEqual({ gel: 25, banaan: 25, krentenbol: 30, dadels: 25, boterham: 15 });
  });
});

describe('de teksten', () => {
  it('geen gedachtestreepjes, geen medisch advies', () => {
    const all = [
      ...fuelGuideLines(fuelForTraining(LONG_RUN, 120)!),
      ...fuelGuideLines(fuelForTraining(RUCK, 240)!),
      ...trekFuelLines(fuelForTrekDay(undefined, 4)!),
      fuelEveningLine(fuelForTraining(LONG_RUN, 120)!),
      trekEveningLine(fuelForTrekDay()!),
      NOT_MEDICAL,
      PRACTICE_LINE,
    ];
    expect(all.every(noDash)).toBe(true);
    expect(NOT_MEDICAL).toContain('geen medisch advies');
  });
});

describe('de instelling en een oude back-up', () => {
  it('afwezig is aan, alleen false is uit', () => {
    expect(fuelOn({})).toBe(true);
    expect(fuelOn(undefined)).toBe(true);
    expect(fuelOn({ fuelOnTheGo: false })).toBe(false);
  });
  it('een oude back-up zonder de sleutel: aan; een kapotte waarde valt weg', () => {
    const old = cleanSettings({ eveningBefore: true }, { n: 0 })!;
    expect('fuelOnTheGo' in old).toBe(false);
    expect(fuelOn(old)).toBe(true);
    const skipped = { n: 0 };
    const broken = cleanSettings({ fuelOnTheGo: 'ja' }, skipped)!;
    expect('fuelOnTheGo' in broken).toBe(false);
    expect(skipped.n).toBe(1);
    expect(cleanSettings({ fuelOnTheGo: false }, { n: 0 })!.fuelOnTheGo).toBe(false);
  });
});

// ---- De avond ervoor --------------------------------------------------------------------------

const PLACE = { lat: 52.1, lon: 5.1 };
const TODAY = '2026-11-11';
const TOMORROW = '2026-11-12';
const at = (date: string, h: number, m = 0) => {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m);
};
const plan = (id: string, templateId: string, date = TOMORROW): PlannedSession => ({
  id, templateId, scheduledDate: date, weekStartDate: '2026-11-09', status: 'planned', order: 0,
});
const byId = new Map([LONG_RUN, SHORT_RUN, RUCK, UPPER].map((t) => [t.id, t]));

function input(over: Partial<EveningInput> = {}): EveningInput {
  return {
    now: at(TODAY, 20, 30),
    settings: resolveEveningBefore({}),
    planned: [plan('p1', 'tpl_long_run')],
    logs: [],
    templateById: byId,
    program: null,
    forecast: makeForecast(TODAY, () => ({ tempC: 6, feelsC: 3 }), { sunrise: '07:52', sunset: '16:53' }),
    weatherOn: true,
    clothingOn: true,
    place: PLACE,
    showWatchStatus: true,
    routeOn: false,
    fuelOn: true,
    ...over,
  };
}
const fuelLine = (lines: string[]) => lines.find((l) => l.startsWith('Eten mee'));

describe('De avond ervoor', () => {
  it('een lange duurloop krijgt één regel eten naast het drinken', () => {
    const view = eveningBefore(input())!;
    expect(fuelLine(view.lines)).toBe('Eten mee: 60 tot 90 g koolhydraten, 2 tot 4 gels of bananen.');
    expect(view.lines.some((l) => l.startsWith('Drinken mee'))).toBe(true);
    expect(view.lines.filter((l) => l.startsWith('Eten'))).toHaveLength(1);
  });
  it('een korte training: geen regel', () => {
    const view = eveningBefore(input({ planned: [plan('p1', 'tpl_easy_run')] }));
    expect(view && fuelLine(view.lines)).toBeUndefined();
  });
  it('de instelling uit: geen regel, het drinken blijft', () => {
    const view = eveningBefore(input({ fuelOn: false }))!;
    expect(fuelLine(view.lines)).toBeUndefined();
    expect(view.lines.some((l) => l.startsWith('Drinken mee'))).toBe(true);
  });
  it('hitte: het zweettempo maakt het drinken groter, het eten blijft gelijk', () => {
    const cool = eveningBefore(input())!;
    const hot = eveningBefore(input({ forecast: makeForecast(TODAY, () => ({ tempC: 28, feelsC: 30 }), { sunrise: '07:52', sunset: '16:53' }) }))!;
    expect(fuelLine(hot.lines)).toBe(fuelLine(cool.lines));
    const drink = (lines: string[]) => lines.find((l) => l.startsWith('Drinken mee'));
    expect(drink(hot.lines)).not.toBe(drink(cool.lines));
    // Een eigen zweetmeting doet mee in het drinken, niet in het eten.
    const sweat: SweatEntry[] = [{ logId: 'l1', date: '2026-08-01', activity: 'run', tempC: 27, durationMinutes: 60, weightBeforeKg: 70, weightAfterKg: 68.6 } as SweatEntry];
    const measured = eveningBefore(input({ sweatEntries: sweat, forecast: makeForecast(TODAY, () => ({ tempC: 28, feelsC: 30 }), { sunrise: '07:52', sunset: '16:53' }) }))!;
    expect(fuelLine(measured.lines)).toBe(fuelLine(cool.lines));
  });
  it('al vier regels: "Staat op je horloge." valt weg, het eten blijft', () => {
    // Weer, lampje, drinken en eten; de geruststelling van het horloge is de vijfde.
    const view = eveningBefore(input({ watchStatus: () => 'sent', routeOn: true }))!;
    expect(view.lines).toHaveLength(MAX_LINES);
    expect(fuelLine(view.lines)).toBeDefined();
    expect(view.lines).not.toContain('Staat op je horloge.');
    expect(view.lines.some((l) => l.startsWith('Route'))).toBe(false);
  });
  it('al vier regels met een probleem op het horloge: dan valt het eten weg', () => {
    // Een workout die niet op je horloge staat moet je vanavond nog regelen; het eten zie je in de uitleg.
    const view = eveningBefore(input({ watchStatus: () => 'failed' }))!;
    expect(view.lines).toHaveLength(MAX_LINES);
    expect(view.lines).toContain('Versturen naar je horloge lukte niet.');
    expect(fuelLine(view.lines)).toBeUndefined();
  });
  it('een rugzakwandeling overdag: weer, rugzak, drinken en eten', () => {
    // Eigen gewoonte: drie wandelingen om 10:00, dus geen lampje.
    const logs: SessionLog[] = ['2026-10-24', '2026-10-31', '2026-11-07'].map((d, i) => ({
      id: `l${i}`, templateId: 'tpl_ruck_walk', type: 'hiking', variant: 'full', durationMinutes: 240,
      completedDate: d, completedAt: at(d, 14, 0).toISOString(),
    }) as SessionLog);
    const view = eveningBefore(input({ logs, planned: [plan('p1', 'tpl_ruck_walk')] }))!;
    expect(view.title).toBe('Morgen 10:00, Rugzakwandeling, 240 min');
    expect(view.lines).toHaveLength(MAX_LINES);
    expect(view.lines[1]).toBe('Rugzak 10 kg.');
    expect(view.lines[2]).toMatch(/^Drinken mee/);
    expect(view.lines[3]).toBe('Eten mee: 120 tot 160 g koolhydraten, 4 tot 5 krentenbollen of bananen.');
  });
  it('een rugzakwandeling die in het donker eindigt: het lampje gaat voor het eten', () => {
    const view = eveningBefore(input({ planned: [plan('p1', 'tpl_ruck_walk')] }))!;
    expect(view.lines).toHaveLength(MAX_LINES);
    expect(view.lines.some((l) => l.includes('lampje'))).toBe(true);
    expect(fuelLine(view.lines)).toBeUndefined();
  });
  it('een tochtdag: rugzak en eten voor de dag; zonder gewicht toch een kaart met het eten', () => {
    const trek: LeavePeriod[] = [{ id: 't', kind: 'trek', startDate: TOMORROW, endDate: '2026-11-14', trek: { name: 'Veluwetocht', packKg: 11 } } as LeavePeriod];
    expect(eveningBefore(input({ leavePeriods: trek }))!.lines).toEqual(['Rugzak 11 kg.', 'Eten voor de dag: 180 tot 240 g koolhydraten, vooral echt eten.']);
    const bare: LeavePeriod[] = [{ id: 't', kind: 'trek', startDate: TOMORROW, endDate: '2026-11-14', trek: { name: 'Veluwetocht' } } as LeavePeriod];
    expect(eveningBefore(input({ leavePeriods: bare }))!.lines).toEqual(['Eten voor de dag: 180 tot 240 g koolhydraten, vooral echt eten.']);
    expect(eveningBefore(input({ leavePeriods: bare, fuelOn: false }))).toBeUndefined();
  });
});
