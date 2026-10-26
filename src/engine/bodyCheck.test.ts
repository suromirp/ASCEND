import { describe, expect, it } from 'vitest';
import { BODY_SPOTS } from '../data/bodySpots';
import { careForSpot, spotById } from './bodyMap';
import type { InjuryNote } from '../models/injury';
import type { WeeklyHealthCheck } from '../models/checkIn';
import type { SessionLog } from '../models/training';
import {
  answerWeek, bodyCheckEvents, bodyCheckReasons, isReviewDay, suggestionFor, bodyCheckRows, bodyCheckState, checkWeekStart, heavyWeekLine, resolveBodyCheck, weekHandled, weekHotSpots, weekLoad,
  AFTER_EVENT_FROM_DAYS, DESCENT_LEVELS, HEAVY_LEG_INDEX, type BodyCheckInput,
} from './bodyCheck';

// Een nagemaakte week. 2026-10-26 is een maandag.
const TODAY = '2026-10-28';

function log(over: Partial<SessionLog> & { gain?: number; loss?: number; kg?: number; km?: number; minutes?: number }): SessionLog {
  const { gain, loss, kg, km, minutes, ...rest } = over;
  return {
    id: `l-${Math.random()}`, templateId: 'tpl_x', type: 'hiking', completedDate: '2026-10-27', completedAt: '2026-10-27T10:00:00Z', variant: 'full',
    durationMinutes: minutes ?? 60, source: 'manual',
    outdoorData: { durationMinutes: minutes ?? 60, elevationGainM: gain, elevationLossM: loss, backpackWeightKg: kg, distanceKm: km },
    ...rest,
  } as SessionLog;
}

const pain = (over: Partial<InjuryNote> = {}): InjuryNote => ({ id: 'n1', date: '2026-10-20', bodyPart: 'Knie rechts', severity: 'matig', ...over });

function input(over: Partial<BodyCheckInput> = {}): BodyCheckInput {
  return { today: TODAY, logs: [], notes: [], legIndexOn: () => 0, events: [], ...over };
}

describe('de instelling', () => {
  it('geldt als Alleen als er reden is, en leest een onbekende waarde defensief', () => {
    expect(resolveBodyCheck({})).toBe('reden');
    expect(resolveBodyCheck(undefined)).toBe('reden');
    expect(resolveBodyCheck({ bodyCheck: 'elke-week' })).toBe('elke-week');
    expect(resolveBodyCheck({ bodyCheck: 'uit' })).toBe('uit');
    expect(resolveBodyCheck({ bodyCheck: 'soms' })).toBe('reden');
  });
});

describe('wat deze week het hardst werkte', () => {
  it('telt dalen, klimmen en rugzak van de laatste zeven dagen en laat oudere weg', () => {
    const load = weekLoad([log({ loss: 1000, gain: 600, kg: 9, minutes: 120 }), log({ loss: 400, kg: 9, minutes: 60 }), log({ completedDate: '2026-10-20', loss: 5000 })], TODAY);
    expect(load.descentM).toBe(1400);
    expect(load.climbM).toBe(600);
    expect(load.packHours).toBe(3);
    expect(load.packKg).toBe(9);
  });

  it('rekent met stokken een minder zware afdaling', () => {
    const l = log({ loss: 1000 });
    l.outdoorData!.poles = true;
    expect(weekLoad([l], TODAY).descentM).toBe(850);
  });

  it('geeft niets bij een rustige week', () => {
    expect(weekHotSpots([log({ loss: 300, gain: 200, minutes: 45 })], TODAY)).toEqual([]);
  });

  it('zet dalen met rugzak bij bovenbenen, knieën en schouders, met een feit per plek', () => {
    const hot = weekHotSpots([log({ loss: 1240, kg: 9, minutes: 210 })], TODAY);
    expect(hot.map((h) => h.group.id)).toEqual(['bovenbenen', 'knieen', 'schouders']);
    expect(hot[0].fact).toBe('1.240 m omlaag');
    expect(hot[1].fact).toBe('dalen met 9 kg rugzak');
    expect(hot[2].fact).toBe('3,5 uur met 9 kg');
  });

  it('neemt hoogstens drie plekken, de zwaarste eerst', () => {
    const hot = weekHotSpots([log({ loss: 2000, gain: 2200, kg: 12, minutes: 400 })], TODAY);
    expect(hot.length).toBe(3);
    expect(hot[0].level).toBeGreaterThanOrEqual(hot[1].level);
    expect(hot[1].level).toBeGreaterThanOrEqual(hot[2].level);
  });

  it('zonder rugzak telt een afdaling een niveau lichter bij de knieën', () => {
    const at = DESCENT_LEVELS[1];
    const hot = weekHotSpots([log({ loss: at })], TODAY);
    expect(hot.find((h) => h.group.id === 'bovenbenen')?.level).toBe(2);
    expect(hot.find((h) => h.group.id === 'knieen')?.level).toBe(1);
  });

  it('zet een hardloopweek ruim boven je eigen gemiddelde bij de kuiten, pas vanaf 15 km', () => {
    const runs = (date: string, km: number) => log({ completedDate: date, type: 'cardio', km, minutes: 60 });
    const before = [runs('2026-10-21', 10), runs('2026-10-14', 10), runs('2026-10-07', 10), runs('2026-09-30', 10)];
    const week = [runs('2026-10-27', 25)];
    const hot = weekHotSpots([...before, ...week], TODAY);
    expect(hot[0].group.id).toBe('kuiten');
    expect(hot[0].fact).toBe('25 km hardlopen');
    expect(weekHotSpots([...before, runs('2026-10-27', 12)], TODAY)).toEqual([]);
  });
});

describe('wanneer de kaart komt', () => {
  it('niet zonder reden', () => {
    expect(bodyCheckReasons(input())).toEqual([]);
  });

  it('komt bij een open pijnmelding, maar niet bij spierpijn of stijf', () => {
    expect(bodyCheckReasons(input({ notes: [pain()] })).map((r) => r.kind)).toEqual(['pijn']);
    expect(bodyCheckReasons(input({ notes: [pain({ kind: 'spierpijn', date: TODAY })] }))).toEqual([]);
    expect(bodyCheckReasons(input({ notes: [pain({ resolvedDate: '2026-10-22' })] }))).toEqual([]);
  });

  it('komt bij pijn die een training deze week gaf', () => {
    const l = log({ completedDate: '2026-10-27' });
    l.painReports = [{ area: 'Knie', score: 4 }];
    expect(bodyCheckReasons(input({ logs: [l] })).map((r) => r.kind)).toEqual(['pijn']);
    l.painReports = [{ area: 'Knie', score: 1 }];
    expect(bodyCheckReasons(input({ logs: [l] }))).toEqual([]);
  });

  it('komt bij een uitschieter in de beenindex, niet bij een gewoon zware opbouwweek', () => {
    // Elke week rond 12,5: geen uitschieter.
    expect(bodyCheckReasons(input({ legIndexOn: () => 12.5 }))).toEqual([]);
    // Eerdere weken 8, deze week 12,5: een kwart erboven en boven de grens.
    expect(bodyCheckReasons(input({ legIndexOn: (d) => (d >= '2026-10-22' ? 12.5 : 8) })).map((r) => r.kind)).toEqual(['zwaar']);
    // Boven de grens maar niet een kwart boven je eigen mediaan.
    expect(bodyCheckReasons(input({ legIndexOn: (d) => (d >= '2026-10-22' ? HEAVY_LEG_INDEX : 11) }))).toEqual([]);
    // Onder de grens telt het nooit.
    expect(bodyCheckReasons(input({ legIndexOn: (d) => (d >= '2026-10-22' ? 11 : 2) }))).toEqual([]);
  });

  it('komt bij een belasting op het hoogste niveau, ook als de index rustig is', () => {
    const reasons = bodyCheckReasons(input({ logs: [log({ loss: 2000, kg: 10, minutes: 300 })] }));
    expect(reasons.map((r) => r.kind)).toEqual(['zwaar']);
    expect(reasons[0].line).toBe('Een zware week: 2.000 m omlaag, 5 uur met 10 kg rugzak.');
  });

  it('komt de tweede ochtend na een tocht en blijft vijf dagen', () => {
    const events = [{ date: '2026-10-24', kind: 'tocht' as const }];
    const on = (today: string) => bodyCheckReasons(input({ today, events })).map((r) => r.kind);
    expect(on('2026-10-25')).toEqual([]);
    expect(on('2026-10-26')).toEqual(['tocht']);
    expect(on('2026-10-30')).toEqual(['tocht']);
    expect(on('2026-10-31')).toEqual([]);
    expect(AFTER_EVENT_FROM_DAYS).toBe(2);
  });

  it('herkent een wedstrijd, een tochtperiode en een lange bergtocht als gebeurtenis', () => {
    const events = bodyCheckEvents({
      leavePeriods: [{ id: 'p1', kind: 'trek', startDate: '2026-10-10', endDate: '2026-10-14' }, { id: 'p2', kind: 'free_days', startDate: '2026-10-01', endDate: '2026-10-03' }],
      logs: [log({ templateId: 'tpl_race', completedDate: '2026-10-18', type: 'cardio' }), log({ templateId: 'tpl_mountain_hike', completedDate: '2026-10-20', minutes: 300 }), log({ templateId: 'tpl_mountain_hike', completedDate: '2026-10-21', minutes: 90 })],
    });
    expect(events).toEqual([{ date: '2026-10-14', kind: 'tocht' }, { date: '2026-10-18', kind: 'wedstrijd' }, { date: '2026-10-20', kind: 'tocht' }]);
  });

  it('zet de pijnreden voorop', () => {
    const reasons = bodyCheckReasons(input({ notes: [pain()], logs: [log({ loss: 2000, kg: 10, minutes: 300 })] }));
    expect(reasons.map((r) => r.kind)).toEqual(['pijn', 'zwaar']);
  });
});

describe('eenmaal per week en de drie standen', () => {
  const reasonInput = input({ notes: [pain()] });
  const state = (mode: 'reden' | 'elke-week' | 'uit', checks: WeeklyHealthCheck[] | undefined, extra: { today?: string; isReviewDay?: boolean } = {}) =>
    bodyCheckState({ ...reasonInput, today: extra.today ?? TODAY, mode, checks, isReviewDay: extra.isReviewDay ?? false });

  it('hoort de zondag en de maandag erna bij dezelfde week', () => {
    expect(checkWeekStart('2026-10-25')).toBe('2026-10-19');
    expect(checkWeekStart('2026-10-26')).toBe('2026-10-19');
    expect(checkWeekStart('2026-10-27')).toBe('2026-10-26');
    expect(checkWeekStart('2026-11-01')).toBe('2026-10-26');
  });

  it('Alleen als er reden is: toont bij een reden, niet zonder', () => {
    expect(state('reden', undefined).show).toBe(true);
    expect(bodyCheckState({ ...input(), mode: 'reden', checks: undefined, isReviewDay: true }).show).toBe(false);
  });

  it('Elke week: ook zonder reden, maar alleen op de dag van de terugblik', () => {
    const none = { ...input(), mode: 'elke-week' as const, checks: undefined };
    expect(bodyCheckState({ ...none, isReviewDay: true }).show).toBe(true);
    expect(bodyCheckState({ ...none, isReviewDay: false }).show).toBe(false);
  });

  it('Uit: nooit', () => {
    expect(state('uit', undefined, { isReviewDay: true }).show).toBe(false);
  });

  it('een antwoord sluit de week af, ook als er daarna een tweede reden komt', () => {
    const answered: WeeklyHealthCheck[] = [{ weekStart: '2026-10-26', trouble: 'geen' }];
    expect(state('reden', answered).show).toBe(false);
    // Een andere week telt apart.
    expect(state('reden', answered, { today: '2026-11-03' }).show).toBe(true);
  });

  it('Niet nu verbergt hem voor vandaag en brengt hem morgen terug', () => {
    const later: WeeklyHealthCheck[] = [{ weekStart: '2026-10-26', trouble: 'geen', laterOn: TODAY }];
    expect(weekHandled(later, '2026-10-26', TODAY)).toBe(true);
    expect(weekHandled(later, '2026-10-26', '2026-10-29')).toBe(false);
    expect(state('reden', later).show).toBe(false);
    expect(state('reden', later, { today: '2026-10-29' }).show).toBe(true);
  });
});

describe('de rijen van de kaart', () => {
  it('zet de plek van een open pijnmelding bovenaan en vult aan tot drie', () => {
    const logs = [log({ loss: 1240, kg: 9, minutes: 210 })];
    const reasons = bodyCheckReasons(input({ notes: [pain()], logs }));
    const rows = bodyCheckRows({ notes: [pain()], logs, today: TODAY, reasons });
    expect(rows.length).toBe(3);
    expect(rows[0]).toMatchObject({ label: 'Knie rechts', pain: true, spotId: 'knie-r' });
    // De knieën als groep komen er niet nog eens bij.
    expect(rows.map((r) => r.label)).toEqual(['Knie rechts', 'Bovenbenen', 'Schouders']);
  });

  it('geeft zonder pijnreden alleen wat het hardst werkte', () => {
    const logs = [log({ loss: 1240, kg: 9, minutes: 210 })];
    const rows = bodyCheckRows({ notes: [pain()], logs, today: TODAY, reasons: [{ kind: 'zwaar', line: 'x' }] });
    expect(rows.every((r) => !r.pain)).toBe(true);
  });

  it('de regel van een zware week noemt hoogstens twee feiten', () => {
    expect(heavyWeekLine(weekLoad([log({ loss: 1240, gain: 2500, kg: 9, minutes: 210 })], TODAY))).toBe('Een zware week: 1.240 m omlaag, 3,5 uur met 9 kg rugzak.');
    expect(heavyWeekLine(weekLoad([], TODAY))).toBe('Een zware week voor je benen.');
  });
});

describe('wat kan helpen', () => {
  const onderrug = spotById('onderrug')!;
  const dij = spotById('dij-r')!;

  it('geeft bij pijn de zorgtekst van de plek, twee rekoefeningen en de fysioregels', () => {
    const s = suggestionFor(onderrug, 'pijn', 'matig');
    expect(s.help).toBe(careForSpot(onderrug).bijLast[0]);
    expect(s.stretches).toHaveLength(2);
    expect(s.minutes).toBeGreaterThanOrEqual(1);
    expect(s.fysio.length).toBeGreaterThan(0);
    expect(s.openFysio).toBe(false);
  });

  it('klapt de fysioregel bij ernstige pijn open en houdt de rode vlag apart', () => {
    expect(suggestionFor(onderrug, 'pijn', 'ernstig').openFysio).toBe(true);
    expect(suggestionFor(spotById('nek')!, 'pijn', 'licht').direct).toBeTruthy();
  });

  it('geeft bij spierpijn en stijf een eigen zin met bron en geen fysioregels', () => {
    for (const kind of ['spierpijn', 'stijf'] as const) {
      const s = suggestionFor(dij, kind);
      expect(s.help).toMatch(/kan helpen|kunnen helpen/);
      expect(s.help).not.toMatch(/voorkom/i);
      expect(s.source).toMatch(/bewijs/);
      expect(s.fysio).toEqual([]);
    }
  });

  it('zegt overal kan helpen en nooit voorkomt', () => {
    for (const spot of BODY_SPOTS) for (const kind of ['spierpijn', 'stijf', 'pijn'] as const) expect(suggestionFor(spot, kind, 'licht').help, `${spot.id} ${kind}`).not.toMatch(/voorkomt/i);
  });
});

describe('de dag van de terugblik', () => {
  it('volgt de instelling van de terugblik', () => {
    expect(isReviewDay(7, 'both')).toBe(true);
    expect(isReviewDay(1, 'both')).toBe(true);
    expect(isReviewDay(3, 'both')).toBe(false);
    expect(isReviewDay(1, 'sunday')).toBe(false);
    expect(isReviewDay(7, 'monday')).toBe(false);
  });
});

describe('de markering van de week', () => {
  const week = '2026-10-26';

  it('Voel me fris sluit de week, en haalt een eerder Niet nu weg', () => {
    expect(answerWeek(undefined, week, { kind: 'fris' })).toEqual([{ weekStart: week, trouble: 'geen' }]);
    expect(answerWeek([{ weekStart: week, trouble: 'geen', laterOn: '2026-10-27' }], week, { kind: 'fris' })).toEqual([{ weekStart: week, trouble: 'geen' }]);
  });

  it('Niet nu zet de dag erbij, maar laat een gegeven antwoord staan', () => {
    expect(answerWeek(undefined, week, { kind: 'later', today: TODAY })).toEqual([{ weekStart: week, trouble: 'geen', laterOn: TODAY }]);
    const done = [{ weekStart: week, trouble: 'geen' as const }];
    expect(answerWeek(done, week, { kind: 'later', today: TODAY })).toBe(done);
  });

  it('een pijnmelding schrijft de plek en de ernst voor de coachregel, een tweede houdt de zwaarste', () => {
    const first = answerWeek(undefined, week, { kind: 'melding', soreness: false, area: 'Knie', severity: 'matig' });
    expect(first).toEqual([{ weekStart: week, trouble: 'wel_gewoon', area: 'Knie', severity: 'matig' }]);
    const second = answerWeek(first, week, { kind: 'melding', soreness: false, area: 'Kuit', severity: 'licht' });
    expect(second[0]).toMatchObject({ area: 'Knie', severity: 'matig' });
    const third = answerWeek(first, week, { kind: 'melding', soreness: false, area: 'Kuit', severity: 'ernstig' });
    expect(third[0]).toMatchObject({ area: 'Kuit', severity: 'ernstig' });
  });

  it('een zwaarder antwoord van deze week blijft staan bij een nieuwe pijnmelding', () => {
    for (const trouble of ['niet_kunnen', 'minder'] as const) {
      const heavy = [{ weekStart: week, trouble, area: 'Rug', severity: 'mild' as const }];
      expect(answerWeek(heavy, week, { kind: 'melding', soreness: false, area: 'Knie', severity: 'ernstig' })).toEqual(heavy);
    }
  });

  it('spierpijn en stijf sluiten de week zonder er een klacht van te maken', () => {
    expect(answerWeek(undefined, week, { kind: 'melding', soreness: true, area: 'Quadriceps', severity: 'licht' })).toEqual([{ weekStart: week, trouble: 'geen' }]);
    const pain = answerWeek(undefined, week, { kind: 'melding', soreness: false, area: 'Knie', severity: 'matig' });
    expect(answerWeek(pain, week, { kind: 'fris' })).toEqual(pain);
  });

  it('houdt hoogstens 26 weken en sorteert op week', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ weekStart: `2025-0${(i % 9) + 1}-01`, trouble: 'geen' as const }));
    const out = answerWeek(many, week, { kind: 'fris' });
    expect(out.length).toBeLessThanOrEqual(26);
    expect(out.at(-1)?.weekStart).toBe(week);
  });
});
