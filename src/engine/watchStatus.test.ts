import { describe, it, expect } from 'vitest';
import { buildDefaultProgramData } from '../data/defaultProgram';
import { addDays, toISODate } from '../utils/dates';
import type { PlannedSession } from '../models/training';
import { buildWatchWorkout, type TrackedWorkout } from './watchWorkout';
import {
  formatClockTime,
  sentWhen,
  shortWatchError,
  watchOverview,
  watchOverviewText,
  watchStatusFor,
  watchStatusLine,
  type WatchStatusContext,
} from './watchStatus';

const { templates, program } = buildDefaultProgramData();
const tpl = (id: string) => templates.find((t) => t.id === id)!;
const today = addDays(program.startDate, 8);

const session = (templateId: string, over: Partial<PlannedSession> = {}): PlannedSession => ({
  id: `ps_${templateId}`,
  templateId,
  scheduledDate: today,
  weekStartDate: program.startDate,
  status: 'planned',
  order: 0,
  ...over,
});

const ctx = (over: Partial<WatchStatusContext> = {}): WatchStatusContext => ({ linked: true, items: {}, today, program, logged: new Set(), ...over });

const trackedFor = (s: PlannedSession, over: Partial<TrackedWorkout> = {}): TrackedWorkout => {
  const w = buildWatchWorkout(s, tpl(s.templateId), program)!;
  return { externalId: w.externalId, date: w.date, fingerprint: w.fingerprint, eventId: 7, sentAt: new Date(2026, 9, 22, 19, 4).toISOString(), ...over };
};

describe('watchStatusFor', () => {
  it('shows nothing for strength, rest and the race: they never go to a watch', () => {
    const ids = templates.filter((t) => t.type === 'strength' || t.type === 'recovery' || t.id === 'tpl_race').map((t) => t.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(watchStatusFor(session(id), tpl(id), ctx()).kind).toBe('none');
      expect(watchStatusFor(session(id), tpl(id), ctx({ linked: false })).kind).toBe('none');
    }
  });

  it('shows nothing for a past, skipped or finished training', () => {
    const run = session('tpl_easy_run');
    expect(watchStatusFor(session('tpl_easy_run', { scheduledDate: addDays(today, -1) }), tpl('tpl_easy_run'), ctx()).kind).toBe('none');
    expect(watchStatusFor(session('tpl_easy_run', { status: 'skipped' }), tpl('tpl_easy_run'), ctx()).kind).toBe('none');
    expect(watchStatusFor(run, tpl('tpl_easy_run'), ctx({ logged: new Set([run.id]) })).kind).toBe('none');
  });

  it('asks to link when there is no connection or the switch is off', () => {
    expect(watchStatusFor(session('tpl_easy_run'), tpl('tpl_easy_run'), ctx({ linked: false })).kind).toBe('unlinked');
  });

  it('is sent when the agenda holds what the training is now, with the time', () => {
    const run = session('tpl_easy_run');
    const tracked = trackedFor(run);
    const status = watchStatusFor(run, tpl('tpl_easy_run'), ctx({ items: { [run.id]: tracked } }));
    expect(status).toEqual({ kind: 'sent', sentAt: tracked.sentAt });
  });

  it('falls back to the last round for a record without its own time', () => {
    const run = session('tpl_easy_run');
    const tracked = trackedFor(run, { sentAt: undefined });
    const status = watchStatusFor(run, tpl('tpl_easy_run'), ctx({ items: { [run.id]: tracked }, syncedAt: '2026-10-22T17:00:00.000Z' }));
    expect(status).toEqual({ kind: 'sent', sentAt: '2026-10-22T17:00:00.000Z' });
  });

  it('is stale when the training changed after it was sent', () => {
    const run = session('tpl_easy_run');
    const tracked = trackedFor(run, { fingerprint: 'oud' });
    expect(watchStatusFor(run, tpl('tpl_easy_run'), ctx({ items: { [run.id]: tracked } })).kind).toBe('stale');
  });

  it('is stale when the training moved to another day', () => {
    const run = session('tpl_easy_run');
    const tracked = trackedFor(run, { date: addDays(today, 1) });
    expect(watchStatusFor(run, tpl('tpl_easy_run'), ctx({ items: { [run.id]: tracked } })).kind).toBe('stale');
  });

  it('is pending within the coming 7 days when nothing was sent yet', () => {
    expect(watchStatusFor(session('tpl_easy_run', { scheduledDate: addDays(today, 6) }), tpl('tpl_easy_run'), ctx()).kind).toBe('pending');
  });

  it('is later beyond 7 days, and says on which day it starts going', () => {
    const status = watchStatusFor(session('tpl_easy_run', { scheduledDate: addDays(today, 9) }), tpl('tpl_easy_run'), ctx());
    expect(status).toEqual({ kind: 'later', goesOn: addDays(today, 3) });
  });

  it('fails only for a training that is waiting, with the short reason', () => {
    const lastError = 'Geen verbinding met intervals.icu. Controleer je internet en probeer het later opnieuw.';
    const run = session('tpl_easy_run');
    expect(watchStatusFor(run, tpl('tpl_easy_run'), ctx({ lastError }))).toEqual({ kind: 'failed', reason: 'geen verbinding' });
    expect(watchStatusFor(run, tpl('tpl_easy_run'), ctx({ lastError, items: { [run.id]: trackedFor(run, { fingerprint: 'oud' }) } })).kind).toBe('failed');
    // What did get through stays sent, whatever the last attempt said.
    expect(watchStatusFor(run, tpl('tpl_easy_run'), ctx({ lastError, items: { [run.id]: trackedFor(run) } })).kind).toBe('sent');
    // Beyond 7 days nothing was tried, so nothing failed.
    expect(watchStatusFor(session('tpl_easy_run', { scheduledDate: addDays(today, 12) }), tpl('tpl_easy_run'), ctx({ lastError })).kind).toBe('later');
  });
});

describe('shortWatchError', () => {
  it('shortens the known messages and never returns the long text', () => {
    expect(shortWatchError('intervals.icu herkent je API-sleutel niet. Kopieer de sleutel opnieuw.')).toBe('sleutel niet herkend');
    expect(shortWatchError('intervals.icu heeft op dit moment een storing. Probeer het later nog eens.')).toBe('storing bij intervals.icu');
    expect(shortWatchError('Met deze sleutel mag ASCEND geen trainingen in je agenda zetten. Maak ...')).toBe('sleutel mag niet schrijven');
    expect(shortWatchError('iets heel anders')).toBe('onbekende fout');
  });
});

describe('the words', () => {
  const at = (h: number, m: number) => new Date(2026, 9, 22, h, m).toISOString();
  const day = toISODate(new Date(2026, 9, 22));

  it('writes the time with a dot', () => {
    expect(formatClockTime(new Date(2026, 9, 22, 19, 4))).toBe('19.04');
    expect(formatClockTime(new Date(2026, 9, 22, 7, 5))).toBe('07.05');
  });

  it('says today, yesterday or the date', () => {
    expect(sentWhen(at(19, 4), day)).toBe('om 19.04');
    expect(sentWhen(at(19, 4), day, true)).toBe('vandaag om 19.04');
    expect(sentWhen(at(19, 4), addDays(day, 1))).toBe('gisteren om 19.04');
    expect(sentWhen(at(19, 4), addDays(day, 5))).toMatch(/^op 22 oktober( 2026)? om 19\.04$/);
  });

  it('has one short line per state, and a button where something can be done', () => {
    expect(watchStatusLine({ kind: 'none' }, day)).toBeUndefined();
    expect(watchStatusLine({ kind: 'sent', sentAt: at(19, 4) }, day)).toEqual({ text: 'Verstuurd naar je horloge om 19.04' });
    expect(watchStatusLine({ kind: 'sent' }, day)).toEqual({ text: 'Verstuurd naar je horloge' });
    expect(watchStatusLine({ kind: 'pending' }, day)).toEqual({ text: 'Nog niet op je horloge', action: 'send', actionLabel: 'Nu versturen' });
    expect(watchStatusLine({ kind: 'stale' }, day)?.action).toBe('send');
    expect(watchStatusLine({ kind: 'failed', reason: 'geen verbinding' }, day)).toEqual({ text: 'Niet gelukt: geen verbinding', action: 'retry', actionLabel: 'Opnieuw' });
    expect(watchStatusLine({ kind: 'unlinked' }, day)).toEqual({ text: 'Naar je horloge sturen?', action: 'link' });
    expect(watchStatusLine({ kind: 'later', goesOn: addDays(day, 1) }, day)).toEqual({ text: 'Gaat morgen naar je horloge' });
    expect(watchStatusLine({ kind: 'later', goesOn: addDays(day, 3) }, day)?.text).toMatch(/^Gaat op zondag 25 oktober( 2026)? naar je horloge$/);
  });

  it('uses no dash characters in any line', () => {
    const kinds = ['unlinked', 'sent', 'stale', 'pending', 'later', 'failed'] as const;
    for (const kind of kinds) {
      const text = watchStatusLine({ kind, goesOn: addDays(day, 3), reason: 'storing bij intervals.icu', sentAt: at(9, 0) }, day)?.text ?? '';
      expect(text).not.toMatch(/[–—]/);
    }
  });
});

describe('watchOverview', () => {
  const items: Record<string, TrackedWorkout> = {
    a: { externalId: 'ascend:a', date: '2026-10-21', fingerprint: 'x' },
    b: { externalId: 'ascend:b', date: '2026-10-22', fingerprint: 'x' },
    c: { externalId: 'ascend:c', date: '2026-10-25', fingerprint: 'x' },
  };

  it('counts only today and later, and names the last round', () => {
    const overview = watchOverview(items, new Date(2026, 9, 22, 19, 4).toISOString(), '2026-10-22');
    expect(overview.count).toBe(2);
    expect(watchOverviewText(overview, '2026-10-22')).toBe('2 trainingen staan klaar voor je horloge. Laatste ronde vandaag om 19.04.');
  });

  it('says so when nothing is there and no round has run', () => {
    expect(watchOverviewText(watchOverview({}, undefined, '2026-10-22'), '2026-10-22')).toBe('Er staat nu niets klaar voor je horloge. Nog geen ronde geweest.');
    expect(watchOverviewText({ count: 1 }, '2026-10-22')).toBe('1 training staat klaar voor je horloge. Nog geen ronde geweest.');
  });
});
