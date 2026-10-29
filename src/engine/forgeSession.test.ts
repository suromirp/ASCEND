import { describe, expect, it } from 'vitest';
import {
  activeMinutes, activeSeconds, draftsToPrune, finishDuration, sessionIsDead, breakAsPause, cleanPauses, formatAway, formatSessionClock, isPaused, longBreakMs, pause, pausedMs, resolveBreakAsk, resume,
} from './forgeSession';

const MIN = 60_000;
const S0 = 1_000_000;

describe('activeSeconds', () => {
  it('telt vanaf het begin zonder pauzes, ook in een oud concept zonder pauses', () => {
    expect(activeSeconds({ startedAt: S0 }, S0 + 90_000)).toBe(90);
  });
  it('laat een gesloten pauze eruit', () => {
    const s = { startedAt: S0, pauses: [{ from: S0 + 10 * MIN, to: S0 + 15 * MIN }] };
    expect(activeSeconds(s, S0 + 20 * MIN)).toBe(15 * 60);
  });
  it('houdt de klok stil tijdens een open pauze', () => {
    const s = { startedAt: S0, pauses: [{ from: S0 + 10 * MIN }] };
    expect(activeSeconds(s, S0 + 10 * MIN)).toBe(600);
    expect(activeSeconds(s, S0 + 50 * MIN)).toBe(600);
  });
  it('telt overlappende pauzes niet dubbel en knipt op het begin', () => {
    const s = { startedAt: S0, pauses: [{ from: S0 - 5 * MIN, to: S0 + 2 * MIN }, { from: S0 + MIN, to: S0 + 4 * MIN }] };
    expect(pausedMs(s, S0 + 10 * MIN)).toBe(4 * MIN);
  });
  it('wordt nooit negatief', () => {
    expect(activeSeconds({ startedAt: S0 }, S0 - 5000)).toBe(0);
  });
  it('rondt af op hele minuten', () => {
    expect(activeMinutes({ startedAt: S0 }, S0 + 119_000)).toBe(1);
  });
});

describe('pauzeren en verder', () => {
  it('pauzeert en gaat verder', () => {
    const a = pause({ startedAt: S0 }, S0 + 5 * MIN);
    expect(isPaused(a)).toBe(true);
    const b = resume(a, S0 + 25 * MIN);
    expect(isPaused(b)).toBe(false);
    expect(b.pauses).toEqual([{ from: S0 + 5 * MIN, to: S0 + 25 * MIN }]);
    expect(b.lastActionAt).toBe(S0 + 25 * MIN);
    expect(activeSeconds(b, S0 + 30 * MIN)).toBe(10 * 60);
  });
  it('pauzeert niet twee keer en gaat niet verder zonder pauze', () => {
    const a = pause({ startedAt: S0 }, S0 + MIN);
    expect(pause(a, S0 + 2 * MIN)).toBe(a);
    const s = { startedAt: S0 };
    expect(resume(s, S0 + MIN)).toBe(s);
  });
});

describe('cleanPauses', () => {
  it('leest defensief', () => {
    expect(cleanPauses(undefined)).toEqual([]);
    expect(cleanPauses('x')).toEqual([]);
    expect(cleanPauses([null, { from: 'a' }, { from: 5, to: 3 }, { from: 9, to: 12 }])).toEqual([{ from: 9, to: 12 }]);
  });
  it('laat alleen de laatste open', () => {
    expect(cleanPauses([{ from: 1 }, { from: 5, to: 8 }])).toEqual([{ from: 5, to: 8 }]);
    expect(cleanPauses([{ from: 5, to: 8 }, { from: 10 }])).toEqual([{ from: 5, to: 8 }, { from: 10 }]);
  });
});

describe('lange onderbreking', () => {
  const s = { startedAt: S0, lastActionAt: S0 + 10 * MIN };
  it('vraagt boven de drempel, terwijl de klok liep', () => {
    expect(longBreakMs(s, S0 + 60 * MIN, 45)).toBe(50 * MIN);
    expect(longBreakMs(s, S0 + 50 * MIN, 45)).toBeUndefined();
  });
  it('vraagt niet bij uit of in pauze', () => {
    expect(longBreakMs(s, S0 + 600 * MIN, 0)).toBeUndefined();
    expect(longBreakMs(pause(s, S0 + 20 * MIN), S0 + 600 * MIN, 45)).toBeUndefined();
  });
  it('valt zonder laatste handeling terug op het begin', () => {
    expect(longBreakMs({ startedAt: S0 }, S0 + 100 * MIN, 90)).toBe(100 * MIN);
  });
  it('maakt van de onderbreking een pauze en vraagt niet opnieuw', () => {
    const now = S0 + 120 * MIN;
    const t = breakAsPause(s, now);
    expect(t.pauses).toEqual([{ from: S0 + 10 * MIN, to: now }]);
    expect(activeSeconds(t, now)).toBe(10 * 60);
    expect(longBreakMs(t, now + MIN, 45)).toBeUndefined();
  });
  it('de instelling heeft 45 als advies', () => {
    expect(resolveBreakAsk(undefined)).toBe(45);
    expect(resolveBreakAsk({ forgeLongBreak: 0 })).toBe(0);
    expect(resolveBreakAsk({ forgeLongBreak: 60 })).toBe(60);
    expect(resolveBreakAsk({ forgeLongBreak: 7 })).toBe(45);
  });
});

describe('finishDuration', () => {
  it('neemt de actieve tijd, minstens een minuut', () => {
    expect(finishDuration(50 * 60, 45)).toEqual({ minutes: 50, clamped: false });
    expect(finishDuration(10, 45).minutes).toBe(1);
  });
  it('houdt precies 240 minuten nog vast', () => {
    expect(finishDuration(240 * 60, 45).clamped).toBe(false);
  });
  it('valt boven 240 minuten terug op de verwachte duur en zegt wat de klok zei', () => {
    expect(finishDuration(1000 * 60, 45)).toEqual({ minutes: 45, clamped: true, clockSaid: '16 uur 40 min' });
    expect(finishDuration(300 * 60, 50).clockSaid).toBe('5 uur');
  });
});

describe('opruimen', () => {
  const world = { plannedIds: new Set(['p1', 'p2']), loggedIds: new Set(['p2']), templateIds: new Set(['t1']) };
  it('een sessie is dood zonder training, zonder geplande sessie of als hij al gelogd is', () => {
    expect(sessionIsDead({ templateId: 't1', plannedSessionId: 'p1' }, world)).toBe(false);
    expect(sessionIsDead({ templateId: 't1' }, world)).toBe(false);
    expect(sessionIsDead({ templateId: 'weg', plannedSessionId: 'p1' }, world)).toBe(true);
    expect(sessionIsDead({ templateId: 't1', plannedSessionId: 'weg' }, world)).toBe(false);
    expect(sessionIsDead({ templateId: 't1', plannedSessionId: 'p2' }, world)).toBe(true);
  });
  it('ruimt concepten van gelogde of verdwenen sessies op, behalve de lopende', () => {
    const k = (s: string) => `ascend.afvinkconcept.${s}:forge`;
    const keys = [k('p1'), k('p2'), k('p3'), k('t1:2026-10-25'), k('t1:2026-10-28'), k('t1:2026-10-29'), k('t1:los')];
    expect(draftsToPrune(keys, world, '2026-10-29')).toEqual([k('p2'), k('p3'), k('t1:2026-10-25')]);
    expect(draftsToPrune(keys, world, '2026-10-29', k('p3'))).toEqual([k('p2'), k('t1:2026-10-25')]);
    expect(draftsToPrune(['ascend.afvinkconcept.p3', 'iets'], world, '2026-10-29')).toEqual([]);
  });
  it('haalt niets weg zolang de wereld leeg is (laden of een opstartfout)', () => {
    const empty = { plannedIds: new Set<string>(), loggedIds: new Set<string>(), templateIds: new Set<string>() };
    expect(sessionIsDead({ templateId: 't1', plannedSessionId: 'p1' }, empty)).toBe(false);
    expect(draftsToPrune([`ascend.afvinkconcept.p1:forge`], empty, '2026-10-29')).toEqual([]);
  });
});

describe('teksten', () => {
  it('zegt hoe lang je weg was', () => {
    expect(formatAway(22 * 60 * MIN)).toBe('22 uur');
    expect(formatAway(50 * MIN)).toBe('50 minuten');
    expect(formatAway(2 * 60 * MIN)).toBe('2 uur');
  });
  it('formatteert de klok', () => {
    expect(formatSessionClock(65, false)).toBe('1:05');
    expect(formatSessionClock(3725, false)).toBe('1:02:05');
    expect(formatSessionClock(65)).toBe('0:01:05');
  });
});
