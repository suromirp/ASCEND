// Belangrijk advies als blad (I-157): welke klasse, één keer per id, Niet nu hoogstens drie keer, en nooit tijdens een
// training of naast een ander blad. Testdata is nagemaakt.
import { describe, expect, it } from 'vitest';
import type { Advice } from './adviceShared';
import {
  FIRST_SHEET_MAX_SNOOZES, FIRST_SHEET_RULES, firstSheetAdvice, mayShowFirstSheet, mergeFirstSheet, readFirstSheet,
  pausedToday, forgetFirstSheetShown, rememberFirstSheetNotNow, rememberFirstSheetShown, type FirstSheetMap, type FirstSheetState,
} from './adviceFirst';
import { oneAnswerPerDay } from './oneAnswerPerDay';

const TODAY = '2026-11-26';
const advice = (ruleId: string, id: string, over: Partial<Advice> = {}): Advice => ({
  id, ruleId, trigger: 'plan_update', title: ruleId, effect: '', why: '', priority: 3, ...over,
});
const reentry = advice('REENTRY', 'reentry:2026-11-24', { reentry: { from: TODAY, until: '2026-12-02', factor: 0.75 } });
const catchUp = advice('MISSED-CATCH-UP', 'missed:p-1', { trigger: 'session_missed', proposal: { id: 'x', trigger: 'session_skipped', issue: '', changes: [{ plannedSessionId: 'p-1', action: 'move', fromDate: '2026-11-20', toDate: TODAY }], alternatives: [], consequences: '', explanation: '', createdAt: '' } });
const state = (over: Partial<FirstSheetState> = {}): FirstSheetState => ({
  on: true, today: TODAY, hasPlan: true, trainingOpen: false, draftOpen: false, otherSheetOpen: false, paused: false, ...over,
});

describe('de klasse', () => {
  it('is klein: de terugkeer, golven zonder doel en de ladder', () => {
    expect(FIRST_SHEET_RULES).toEqual(['REENTRY', 'NO-GOAL-WAVES', 'BEGINNER-LADDER']);
  });

  it('bij REENTRY plus inhalen alleen REENTRY', () => {
    expect(firstSheetAdvice([catchUp, reentry], state())?.id).toBe(reentry.id);
    expect(firstSheetAdvice([catchUp], state())).toBeUndefined();
  });

  it('kiest op de volgorde van de klasse, niet op de lijst', () => {
    const ladder = advice('BEGINNER-LADDER', 'ladder:2026-11-23', { priority: 9 });
    const waves = advice('NO-GOAL-WAVES', 'nogoal-waves', { priority: 1 });
    expect(firstSheetAdvice([ladder, waves], state())?.id).toBe('nogoal-waves');
    expect(firstSheetAdvice([ladder, waves, reentry], state())?.id).toBe(reentry.id);
  });

  it('een advies dat op een ander wacht komt niet als blad', () => {
    expect(firstSheetAdvice([{ ...reentry, blockedBy: 'iets' }], state())).toBeUndefined();
  });
});

describe('wanneer niet', () => {
  it('niet bij een open training, een open concept, een ander blad, zonder plan, in een pauze of met de instelling uit', () => {
    for (const over of [{ trainingOpen: true }, { draftOpen: true }, { otherSheetOpen: true }, { hasPlan: false }, { paused: true }, { on: false }]) {
      expect(firstSheetAdvice([reentry], state(over))).toBeUndefined();
    }
    expect(firstSheetAdvice([reentry], state())?.id).toBe(reentry.id);
  });
});

describe('een lopende pauze', () => {
  it('vakantie of ziekte vandaag: wel een pauze; voorbij of beter gemeld: niet', () => {
    expect(pausedToday(TODAY, [{ id: 'v', kind: 'no_training', startDate: '2026-11-20', endDate: '2026-11-28' }], undefined)).toBe(true);
    expect(pausedToday(TODAY, [{ id: 'v', kind: 'no_training', startDate: '2026-11-10', endDate: '2026-11-20' }], undefined)).toBe(false);
    expect(pausedToday(TODAY, undefined, [{ id: 'z', kind: 'below_neck', startDate: '2026-11-25' }])).toBe(true);
    expect(pausedToday(TODAY, undefined, [{ id: 'z', kind: 'below_neck', startDate: '2026-11-20', endDate: '2026-11-23' }])).toBe(false);
    expect(pausedToday(TODAY, undefined, undefined)).toBe(false);
  });
});

describe('één keer per id, Niet nu hoogstens drie keer', () => {
  it('een id die al getoond is komt niet terug, ook niet de volgende dag', () => {
    const shown = rememberFirstSheetShown(undefined, reentry.id, TODAY);
    expect(firstSheetAdvice([reentry], state({ memory: shown }))).toBeUndefined();
    expect(firstSheetAdvice([reentry], state({ memory: shown, today: '2026-11-27' }))).toBeUndefined();
    // Een nieuwe terugkomst heeft een nieuw id en mag wel.
    const later = { ...reentry, id: 'reentry:2026-12-20' };
    expect(firstSheetAdvice([later], state({ memory: shown, today: '2026-12-20' }))?.id).toBe(later.id);
  });

  it('Niet nu: dezelfde dag niet meer, de volgende dag wel, en na drie keer niet meer', () => {
    let memory: FirstSheetMap | undefined;
    const days = ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30'];
    const shownOn: string[] = [];
    for (const day of days) {
      if (!firstSheetAdvice([reentry], state({ memory, today: day }))) continue;
      shownOn.push(day);
      memory = rememberFirstSheetShown(memory, reentry.id, day);
      memory = rememberFirstSheetNotNow(memory, reentry.id, day);
      expect(firstSheetAdvice([reentry], state({ memory, today: day }))).toBeUndefined();
    }
    expect(shownOn).toEqual(['2026-11-26', '2026-11-27', '2026-11-28']);
    expect(memory?.[reentry.id]).toEqual({ shownOn: '2026-11-28', snoozes: FIRST_SHEET_MAX_SNOOZES });
  });

  it('Niet nu raakt geen antwoord: alleen de eigen map verandert', () => {
    const memory = rememberFirstSheetNotNow(rememberFirstSheetShown({}, reentry.id, TODAY), reentry.id, TODAY);
    expect(Object.keys(memory)).toEqual([reentry.id]);
    expect(mayShowFirstSheet(memory, reentry.id, '2026-11-27')).toBe(true);
  });
});

describe('een mislukte Akkoord', () => {
  it('het blad komt bij de volgende opening terug, ook dezelfde dag', () => {
    const shown = rememberFirstSheetShown(undefined, reentry.id, TODAY);
    expect(firstSheetAdvice([reentry], state({ memory: shown }))).toBeUndefined();
    const back = forgetFirstSheetShown(shown, reentry.id, undefined);
    expect(firstSheetAdvice([reentry], state({ memory: back }))?.id).toBe(reentry.id);
  });

  it('een eerdere Niet nu blijft geteld', () => {
    const was = rememberFirstSheetNotNow(rememberFirstSheetShown({}, reentry.id, '2026-11-25'), reentry.id, '2026-11-25');
    const shown = rememberFirstSheetShown(was, reentry.id, TODAY);
    const back = forgetFirstSheetShown(shown, reentry.id, was);
    expect(back[reentry.id]).toEqual({ shownOn: '2026-11-25', snoozes: 1 });
  });
});

describe('opslag', () => {
  it('leest defensief: een kapotte regel valt weg en telt', () => {
    expect(readFirstSheet(undefined)).toEqual({ value: undefined, skipped: 0 });
    expect(readFirstSheet('kapot')).toEqual({ value: undefined, skipped: 1 });
    const read = readFirstSheet({ a: { shownOn: TODAY, snoozes: 1 }, b: { shownOn: 'gisteren', snoozes: 0 }, c: { shownOn: TODAY, snoozes: 9 }, d: null });
    expect(read).toEqual({ value: { a: { shownOn: TODAY, snoozes: 1 } }, skipped: 3 });
  });

  it('samenvoegen houdt de verste stand per id', () => {
    const merged = mergeFirstSheet({ a: { shownOn: '2026-11-26', snoozes: 1 } }, { a: { shownOn: '2026-11-25', snoozes: 2 }, b: { shownOn: '2026-11-20', snoozes: 0 } });
    expect(merged).toEqual({ a: { shownOn: '2026-11-26', snoozes: 2 }, b: { shownOn: '2026-11-20', snoozes: 0 } });
    expect(mergeFirstSheet(undefined, undefined)).toBeUndefined();
  });
});

describe('samen met één antwoord per dag', () => {
  it('de terugkeer met de gemiste training op de rustdag houdt het inhalen van dezelfde training tegen, en komt als blad', () => {
    const withCatchUp = { ...reentry, reentryCatchUp: { sessionId: 'p-1', name: 'Rustige loop', fromDate: '2026-11-20', toDate: '2026-11-27' } };
    const list = oneAnswerPerDay([catchUp, withCatchUp]);
    expect(list.map((a) => a.id)).toEqual([reentry.id]);
    expect(firstSheetAdvice(list, state())?.waiting?.map((a) => a.id)).toEqual([catchUp.id]);
  });
});
