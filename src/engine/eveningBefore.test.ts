// De avond ervoor (engine/eveningBefore.ts). Nagemaakte trainingen en een nagemaakt weer; de klok
// staat op Europe/Amsterdam zoals bij de eigenaar.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Amsterdam';

import { describe, expect, it } from 'vitest';
import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import type { LeavePeriod } from '../models/leave';
import { addDays } from '../utils/dates';
import { makeForecast } from './fixtures/weatherFixture';
import {
  DEFAULT_EVENING_TIME,
  EVENING_TIMES,
  EVENING_NOTICE_ID,
  MAX_LINES,
  cleanEveningTime,
  eveningBefore,
  eveningNotice,
  eveningNoticeAt,
  isEveningNow,
  lampLine,
  resolveEveningBefore,
  type EveningInput,
} from './eveningBefore';

const PLACE = { lat: 52.1, lon: 5.1 };
// Woensdag 11 november 2026; morgen is donderdag 12 november.
const TODAY = '2026-11-11';
const TOMORROW = '2026-11-12';
const at = (date: string, h: number, m = 0) => {
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m);
};

const LONG_RUN: SessionTemplate = { id: 'tpl_long_run', name: 'Lange duurloop', type: 'cardio', durationVariants: { full: 100 } };
const EASY_RUN: SessionTemplate = { id: 'tpl_easy_run', name: 'Rustige duurloop', type: 'cardio', durationVariants: { full: 40 } };
const UPPER: SessionTemplate = { id: 'tpl_upper_a', name: 'Bovenlichaam A', type: 'strength', durationVariants: { full: 50 } };
const REST: SessionTemplate = { id: 'tpl_rest', name: 'Rustdag', type: 'recovery', durationVariants: { full: 0 } };
const RUCK: SessionTemplate = { id: 'tpl_ruck_walk', name: 'Rugzakwandeling', type: 'hiking', durationVariants: { full: 60 }, outdoorTarget: { backpackWeightKg: 8 } };

const plan = (id: string, templateId: string, date = TOMORROW, order = 0): PlannedSession => ({
  id, templateId, scheduledDate: date, weekStartDate: '2026-11-09', status: 'planned', order,
});

const byId = new Map([LONG_RUN, EASY_RUN, UPPER, REST, RUCK].map((t) => [t.id, t]));

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
    ...over,
  };
}

describe('de instelling', () => {
  it('staat standaard aan vanaf 20:00, de melding uit', () => {
    expect(resolveEveningBefore({})).toEqual({ on: true, time: '20:00', notice: false });
    expect(DEFAULT_EVENING_TIME).toBe('20:00');
  });
  it('leest alleen een vaste tijd', () => {
    expect(cleanEveningTime('21:00')).toBe('21:00');
    expect(cleanEveningTime('20:30')).toBeUndefined();
    expect(resolveEveningBefore({ eveningBeforeTime: 'kapot' }).time).toBe('20:00');
  });
});

describe('de grens van 20:00 en middernacht in Europe/Amsterdam', () => {
  it('19:59 nog niet, 20:00 wel, 23:59 nog wel', () => {
    expect(eveningBefore(input({ now: at(TODAY, 19, 59) }))).toBeUndefined();
    expect(eveningBefore(input({ now: at(TODAY, 20, 0) }))?.date).toBe(TOMORROW);
    expect(eveningBefore(input({ now: at(TODAY, 23, 59) }))?.date).toBe(TOMORROW);
  });
  it('na middernacht is morgen vandaag: geen kaart meer', () => {
    // 00:00 op 12 november: de training staat nu op vandaag, op de missiekaart.
    expect(eveningBefore(input({ now: at(TOMORROW, 0, 0) }))).toBeUndefined();
    expect(isEveningNow(at(TOMORROW, 0, 30), '20:00')).toBe(false);
  });
  it('volgt de gekozen tijd', () => {
    const settings = resolveEveningBefore({ eveningBeforeTime: '22:00' });
    expect(eveningBefore(input({ settings, now: at(TODAY, 21, 30) }))).toBeUndefined();
    expect(eveningBefore(input({ settings, now: at(TODAY, 22, 0) }))).toBeDefined();
  });
  it('uit is uit', () => {
    expect(eveningBefore(input({ settings: resolveEveningBefore({ eveningBefore: false }) }))).toBeUndefined();
  });
});

describe('de regels', () => {
  it('lange duurloop op een donkere doordeweekse avond: weer en kleding, lampje, drinken', () => {
    const view = eveningBefore(input())!;
    expect(view.title).toBe('Morgen 18:00, Lange duurloop, 100 min');
    expect(view.lines[0]).toMatch(/^6 graden, voelt als 3|^6 graden/);
    expect(view.lines.some((l) => /^Donker vanaf 16:\d\d, neem een lampje mee\.$/.test(l))).toBe(true);
    expect(view.lines.some((l) => l.startsWith('Drinken mee: je zweet ongeveer'))).toBe(true);
    expect(view.lines.length).toBeLessThanOrEqual(MAX_LINES);
  });
  it('een vroege start voor zonsopgang: donker tot', () => {
    // Eigen gewoonte: drie lopen om 06:00 op een doordeweekse dag.
    const logs: SessionLog[] = ['2026-11-03', '2026-11-05', '2026-11-10'].map((d, i) => ({
      id: `l${i}`, templateId: 'tpl_easy_run', type: 'cardio', variant: 'full', durationMinutes: 60,
      completedDate: d, completedAt: at(d, 7, 0).toISOString(),
    }) as SessionLog);
    const view = eveningBefore(input({ logs, planned: [plan('p1', 'tpl_easy_run')] }))!;
    expect(view.title).toBe('Morgen 06:00, Rustige duurloop, 40 min');
    expect(view.lines.some((l) => /^Donker tot 0[78]:\d\d, neem een lampje mee\.$/.test(l))).toBe(true);
  });
  it('hoogstens vier regels, het droge feit eerst', () => {
    const view = eveningBefore(input({ routeOn: true, watchStatus: () => 'sent' }))!;
    expect(view.lines).toHaveLength(MAX_LINES);
    // De route valt als laagste af; het horloge blijft.
    expect(view.lines).toContain('Staat op je horloge.');
    expect(view.lines.some((l) => l.startsWith('Route'))).toBe(false);
  });
  it('geen route als je voor morgen Loopband koos; een kapotte of onbekende keuze is Buiten', () => {
    const treadmill = eveningBefore(input({ planned: [plan('p1', 'tpl_easy_run')], routeOn: true, forecast: undefined, trainingPlaces: { p1: 'run_treadmill' } }))!;
    expect(treadmill.lines.some((l) => l.startsWith('Route '))).toBe(false);
    for (const kapot of [{ p1: 42 }, { p1: 'bestaat_niet' }, { anders: 'run_treadmill' }]) {
      const view = eveningBefore(input({ planned: [plan('p1', 'tpl_easy_run')], routeOn: true, forecast: undefined, trainingPlaces: kapot }))!;
      expect(view.lines.some((l) => l.startsWith('Route '))).toBe(true);
    }
  });

  it('de route als Route voorstellen aan staat', () => {
    const view = eveningBefore(input({ planned: [plan('p1', 'tpl_easy_run')], routeOn: true, forecast: undefined }))!;
    expect(view.lines.some((l) => /^Route [\d,]+ km: je lus staat in de Briefing\.$/.test(l))).toBe(true);
  });
  it('rugzak met gewicht bij een rugzaktraining', () => {
    const view = eveningBefore(input({ planned: [plan('p1', 'tpl_ruck_walk')] }))!;
    expect(view.lines).toContain('Rugzak 8 kg.');
  });
  it('de stand op je horloge, alleen als die het laten zien aan staat', () => {
    expect(eveningBefore(input({ watchStatus: () => 'pending' }))!.lines).toContain('Nog niet op je horloge.');
    expect(eveningBefore(input({ watchStatus: () => 'pending', showWatchStatus: false }))!.lines).not.toContain('Nog niet op je horloge.');
    // Niet gekoppeld: geen regel, het blad Je horloge zegt dat.
    expect(eveningBefore(input({ watchStatus: () => 'unlinked' }))!.lines.some((l) => /horloge/.test(l))).toBe(false);
  });
});

describe('randgevallen', () => {
  it('de dag zelf na de training van vandaag: de kaart gaat over morgen', () => {
    const planned = [plan('t1', 'tpl_upper_a', TODAY), plan('p1', 'tpl_long_run')];
    const logs = [{ id: 'l1', plannedSessionId: 't1', templateId: 'tpl_upper_a', type: 'strength', variant: 'full', durationMinutes: 50, completedDate: TODAY, completedAt: at(TODAY, 18).toISOString() } as SessionLog];
    expect(eveningBefore(input({ planned, logs }))?.date).toBe(TOMORROW);
    // Voor de grens zegt de kaart Vandaag zit erop al "Morgen: ...": hier niets.
    expect(eveningBefore(input({ planned, logs, now: at(TODAY, 19, 0) }))).toBeUndefined();
  });
  it('morgen niets gepland of een rustdag: geen kaart', () => {
    expect(eveningBefore(input({ planned: [] }))).toBeUndefined();
    expect(eveningBefore(input({ planned: [plan('r', 'tpl_rest')] }))).toBeUndefined();
  });
  it('morgen vakantie: geen kaart', () => {
    const leavePeriods: LeavePeriod[] = [{ id: 'v', kind: 'no_training', startDate: TOMORROW, endDate: '2026-11-15' }];
    expect(eveningBefore(input({ leavePeriods }))).toBeUndefined();
  });
  it('morgen een tocht: de rugzak als die bekend is', () => {
    const leavePeriods: LeavePeriod[] = [{ id: 't', kind: 'trek', startDate: TOMORROW, endDate: '2026-11-13', trek: { name: 'Veluwetocht', packKg: 11 } } as LeavePeriod];
    expect(eveningBefore(input({ leavePeriods }))).toEqual({ kind: 'trek', date: TOMORROW, title: 'Morgen: Veluwetocht', lines: ['Rugzak 11 kg.'] });
    const bare: LeavePeriod[] = [{ id: 't', kind: 'trek', startDate: TOMORROW, endDate: '2026-11-13', trek: { name: 'Veluwetocht' } } as LeavePeriod];
    expect(eveningBefore(input({ leavePeriods: bare }))).toBeUndefined();
  });
  it('ziek: geen kaart', () => {
    expect(eveningBefore(input({ illnessEpisodes: [{ id: 'z', kind: 'below_neck', startDate: '2026-11-10' }] }))).toBeUndefined();
  });
  it('morgen twee trainingen: beide in de kop, de regels samen', () => {
    const view = eveningBefore(input({ planned: [plan('p1', 'tpl_long_run', TOMORROW, 0), plan('p2', 'tpl_ruck_walk', TOMORROW, 1)] }))!;
    expect(view.title).toBe('Morgen 18:00, Lange duurloop, 100 min en 18:00, Rugzakwandeling, 60 min');
    expect(view.lines.length).toBeLessThanOrEqual(MAX_LINES);
    // Een lampje staat er één keer, ook al vallen beide trainingen in het donker.
    expect(view.lines.filter((l) => l.includes('lampje'))).toHaveLength(1);
  });
  it('geen weer of geen netwerk: de weerregel valt weg, de rest blijft', () => {
    const view = eveningBefore(input({ forecast: undefined }))!;
    expect(view.lines.some((l) => /graden/.test(l))).toBe(false);
    expect(view.lines.some((l) => l.includes('lampje'))).toBe(true);
    expect(view.lines).toContain('Drinken mee voor 100 min.');
  });
  it('nooit een lege kaart: binnen zonder horloge en zonder weer is er niets', () => {
    expect(eveningBefore(input({ planned: [plan('p1', 'tpl_upper_a')], forecast: undefined }))).toBeUndefined();
  });
  it('een training van morgen die al gelogd is telt niet', () => {
    const logs = [{ id: 'l1', plannedSessionId: 'p1', templateId: 'tpl_long_run', type: 'cardio', variant: 'full', durationMinutes: 100, completedDate: TOMORROW, completedAt: at(TOMORROW, 8).toISOString() } as SessionLog];
    expect(eveningBefore(input({ logs }))).toBeUndefined();
  });
  it('een overgeslagen training van morgen telt niet', () => {
    expect(eveningBefore(input({ planned: [{ ...plan('p1', 'tpl_long_run'), status: 'skipped' }] }))).toBeUndefined();
  });
  it('geen gedachtestreepjes in de regels', () => {
    const view = eveningBefore(input({ routeOn: true, watchStatus: () => 'failed' }))!;
    for (const l of [view.title, ...view.lines]) expect(l).not.toMatch(/[–—]/);
  });
});

describe('de melding', () => {
  it('vandaag op de tijd van de omslag, als die nog komt', () => {
    expect(eveningNoticeAt(at(TODAY, 18), '20:00')?.getTime()).toBe(at(TODAY, 20).getTime());
    expect(eveningNoticeAt(at(TODAY, 20, 1), '20:00')).toBeUndefined();
  });
  it('dezelfde regels als de kaart, of niets', () => {
    const view = eveningBefore(input())!;
    const n = eveningNotice(view, at(TODAY, 20), 'ascend-meldingen')!;
    expect(n.id).toBe(EVENING_NOTICE_ID);
    expect(n.title).toBe(view.title);
    expect(n.body).toBe(view.lines[0]);
    expect(n.largeBody).toBe(view.lines.join('\n'));
    expect(eveningNotice(undefined, at(TODAY, 20), 'ascend-meldingen')).toBeUndefined();
  });
});

// Zomer- en wintertijd in Europe/Amsterdam 2026: zondag 29 maart (02:00 wordt 03:00, de dag duurt 23 uur) en
// zondag 25 oktober (03:00 wordt 02:00, de dag duurt 25 uur). De kaart rekent met kalenderdata en de klok
// van het toestel, niet met 24 uur erbij.
describe('de dag van zomer- en wintertijd', () => {
  const nodark = (date: string) => makeForecast(date, () => ({ tempC: 8, feelsC: 6 }), { sunrise: '07:00', sunset: '20:00' });
  const base = (today: string, over: Partial<EveningInput> = {}) => {
    const tomorrow = addDays(today, 1);
    return input({
      now: at(today, 20, 30),
      planned: [plan('p1', 'tpl_long_run', tomorrow)],
      forecast: nodark(today),
      ...over,
    });
  };

  it('de test draait echt op Europe/Amsterdam', () => {
    expect(at('2026-03-28', 12).getTimezoneOffset()).toBe(-60);
    expect(at('2026-03-29', 12).getTimezoneOffset()).toBe(-120);
    expect(at('2026-10-24', 12).getTimezoneOffset()).toBe(-120);
    expect(at('2026-10-25', 12).getTimezoneOffset()).toBe(-60);
  });
  it('zaterdagavond 28 maart: morgen is de dag van 23 uur', () => {
    expect(eveningBefore(base('2026-03-28'))?.date).toBe('2026-03-29');
  });
  it('zondagavond 29 maart: morgen is maandag 30 maart', () => {
    expect(eveningBefore(base('2026-03-29'))?.date).toBe('2026-03-30');
  });
  it('zaterdagavond 24 oktober: morgen is de dag van 25 uur', () => {
    expect(eveningBefore(base('2026-10-24'))?.date).toBe('2026-10-25');
  });
  it('zondagavond 25 oktober: morgen is maandag 26 oktober', () => {
    expect(eveningBefore(base('2026-10-25'))?.date).toBe('2026-10-26');
  });
  it('de grens van 20:00 en 23:59 geldt ook op de wisseldag', () => {
    for (const today of ['2026-03-29', '2026-10-25']) {
      expect(eveningBefore(base(today, { now: at(today, 19, 59) }))).toBeUndefined();
      expect(eveningBefore(base(today, { now: at(today, 20, 0) }))).toBeDefined();
      expect(eveningBefore(base(today, { now: at(today, 23, 59) }))).toBeDefined();
    }
  });
  it('na middernacht is morgen vandaag: de training van de wisseldag zelf krijgt geen kaart meer', () => {
    // 00:00 op zondag 29 maart (de dag van 23 uur): de training van die dag staat op de missie. Pas om 20:00 gaat de kaart over maandag.
    const planned = [plan('p1', 'tpl_long_run', '2026-03-29')];
    expect(eveningBefore(base('2026-03-28', { now: at('2026-03-29', 0, 0), planned }))).toBeUndefined();
    expect(eveningBefore(base('2026-03-28', { now: at('2026-03-29', 12, 0), planned }))).toBeUndefined();
    expect(eveningBefore(base('2026-03-28', { now: at('2026-03-28', 20, 0), planned }))?.date).toBe('2026-03-29');
  });
  it('het lampje volgt de klok van die dag, zonder voorspelling uit de zon', () => {
    // Rond 52,1 N en 5,1 O. De zon zakt op de dag zelf even laat; de klok springt een uur.
    // Zaterdag 28 maart (wintertijd) om 18:00 tot 19:40: zonsondergang net na 19:00.
    expect(lampLine('2026-03-28', 18 * 60, 100, PLACE)).toMatch(/^Donker vanaf 19:0\d, neem een lampje mee\.$/);
    // Maandag 30 maart (zomertijd): dezelfde training eindigt voor zonsondergang (rond 20:08), dus geen lampje.
    expect(lampLine('2026-03-30', 18 * 60, 100, PLACE)).toBeUndefined();
    // Eén start later laat zien dat de zon op de klok van de zomertijd staat: rond 20:08, niet rond 19:08.
    expect(lampLine('2026-03-30', 19 * 60, 100, PLACE)).toMatch(/^Donker vanaf 20:0\d, neem een lampje mee\.$/);
    // Zaterdag 24 oktober (zomertijd): zonsondergang rond 18:29. Maandag 26 oktober (wintertijd): rond 17:25.
    expect(lampLine('2026-10-24', 17 * 60, 100, PLACE)).toMatch(/^Donker vanaf 18:[23]\d, neem een lampje mee\.$/);
    expect(lampLine('2026-10-26', 16 * 60, 100, PLACE)).toMatch(/^Donker vanaf 17:[0-3]\d, neem een lampje mee\.$/);
  });
  it('de melding van die avond staat op 20:00 van de klok, ook op de wisseldag', () => {
    for (const today of ['2026-03-28', '2026-03-29', '2026-10-24', '2026-10-25']) {
      const t = eveningNoticeAt(at(today, 12), '20:00')!;
      expect(t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate()).toBe(Number(today.replaceAll('-', '')));
      expect([t.getHours(), t.getMinutes()]).toEqual([20, 0]);
    }
  });
});

describe('elke tijd uit EVENING_TIMES', () => {
  it('de lijst is wat de instelling aanbiedt', () => {
    expect([...EVENING_TIMES]).toEqual(['19:00', '20:00', '21:00', '22:00']);
  });
  for (const time of EVENING_TIMES) {
    const h = Number(time.slice(0, 2));
    const settings = resolveEveningBefore({ eveningBeforeTime: time });
    it(`${time}: een minuut ervoor niets, op de tijd wel, tot 23:59, na middernacht niet meer`, () => {
      expect(cleanEveningTime(time)).toBe(time);
      expect(isEveningNow(at(TODAY, h - 1, 59), time)).toBe(false);
      expect(eveningBefore(input({ settings, now: at(TODAY, h - 1, 59) }))).toBeUndefined();
      expect(eveningBefore(input({ settings, now: at(TODAY, h, 0) }))?.date).toBe(TOMORROW);
      expect(eveningBefore(input({ settings, now: at(TODAY, 23, 59) }))?.date).toBe(TOMORROW);
      expect(isEveningNow(at(TOMORROW, 0, 0), time)).toBe(false);
    });
    it(`${time}: de melding komt op die tijd, en niet meer als die voorbij is`, () => {
      expect(eveningNoticeAt(at(TODAY, h - 1, 0), time)?.getTime()).toBe(at(TODAY, h).getTime());
      expect(eveningNoticeAt(at(TODAY, h, 0), time)).toBeUndefined();
    });
  }
});
