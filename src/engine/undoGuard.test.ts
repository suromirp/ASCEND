import { describe, expect, it } from 'vitest';
import type { PlannedSession } from '../models/training';
import { chainTouch, refreshWritten, sameRow, undoBlockReason, undoBlocked, type SyncTouch } from './undoGuard';

// Nagemaakte rijen.
const lock = { by: 'user' as const, at: '2026-10-29T08:00:00.000Z' };
const was: PlannedSession = { id: 'p1', templateId: 'tpl_easy_run', scheduledDate: '2026-10-30', weekStartDate: '2026-10-26', status: 'planned', order: 1 };
const moved: PlannedSession = { ...was, scheduledDate: '2026-10-31', status: 'moved', movedFromDate: '2026-10-30', lock };
const added: PlannedSession = { id: 'p2', templateId: 'tpl_upper_a', scheduledDate: '2026-11-01', weekStartDate: '2026-10-26', status: 'planned', order: 1, lock };

const rows = (...list: PlannedSession[]) => new Map(list.map((s) => [s.id, s]));

describe('sameRow', () => {
  it('kijkt niet naar de volgorde van de velden of een veld dat leeg is', () => {
    expect(sameRow({ order: 1, id: 'p1', templateId: 'tpl_easy_run', status: 'planned', weekStartDate: '2026-10-26', scheduledDate: '2026-10-30' } as PlannedSession, was)).toBe(true);
    expect(sameRow({ ...was, movedFromDate: undefined }, was)).toBe(true);
    expect(sameRow({ ...was, plannedMinutes: 30 }, was)).toBe(false);
    expect(sameRow(undefined, was)).toBe(false);
  });
});

describe('undoBlocked', () => {
  const change = { before: [was], addedIds: [added.id], written: [moved, added] };

  it('mag terug als alles nog is wat de wijziging schreef en niets gelogd is', () => {
    expect(undoBlocked({ ...change, current: rows(moved, added), loggedIds: new Set() })).toBe(false);
  });

  it('niet als de training intussen gelogd is', () => {
    expect(undoBlocked({ ...change, current: rows(moved, added), loggedIds: new Set([moved.id]) })).toBe(true);
    // Ook een rij die de wijziging toevoegde.
    expect(undoBlocked({ ...change, current: rows(moved, added), loggedIds: new Set([added.id]) })).toBe(true);
  });

  it('niet als de training opnieuw verplaatst is', () => {
    expect(undoBlocked({ ...change, current: rows({ ...moved, scheduledDate: '2026-11-01' }, added), loggedIds: new Set() })).toBe(true);
  });

  it('niet als een toegevoegde rij intussen weg of anders is', () => {
    expect(undoBlocked({ ...change, current: rows(moved), loggedIds: new Set() })).toBe(true);
    expect(undoBlocked({ ...change, current: rows(moved, { ...added, status: 'skipped' }), loggedIds: new Set() })).toBe(true);
  });

  it('een rij die de wijziging weghaalde moet nog weg zijn', () => {
    const gone = { before: [was], addedIds: [], written: [] };
    expect(undoBlocked({ ...gone, current: rows(), loggedIds: new Set() })).toBe(false);
    expect(undoBlocked({ ...gone, current: rows(was), loggedIds: new Set() })).toBe(true);
  });

  it('zonder rijen is er niets na te kijken', () => {
    expect(undoBlocked({ before: [], addedIds: [], written: [], current: rows(), loggedIds: new Set(['x']) })).toBe(false);
  });

  it('een oudere melding zonder vastgelegde rijen: alleen gelogd houdt hem tegen', () => {
    expect(undoBlocked({ before: [was], addedIds: [], current: rows({ ...was, scheduledDate: '2026-11-02' }), loggedIds: new Set() })).toBe(false);
    expect(undoBlocked({ before: [was], addedIds: [], current: rows(was), loggedIds: new Set([was.id]) })).toBe(true);
  });
});

describe('undoBlockReason', () => {
  const change = { before: [was], addedIds: [], written: [moved] };
  it('zegt waarom: een log, jouw eigen wijziging of de planning', () => {
    expect(undoBlockReason({ ...change, current: rows(moved), loggedIds: new Set() })).toBeNull();
    expect(undoBlockReason({ ...change, current: rows(moved), loggedIds: new Set([was.id]) })).toBe('logged');
    expect(undoBlockReason({ ...change, current: rows({ ...moved, scheduledDate: '2026-11-01', lock: { by: 'user', at: '2026-10-29T09:00:00.000Z' } }), loggedIds: new Set() })).toBe('yours');
    expect(undoBlockReason({ ...change, current: rows({ ...moved, plannedMinutes: 30 }), loggedIds: new Set() })).toBe('plan');
    expect(undoBlockReason({ ...change, current: rows(), loggedIds: new Set() })).toBe('plan');
  });
});

describe('refreshWritten', () => {
  const repaired = { ...moved, plannedMinutes: 40 };
  const touch = (...list: [string, SyncTouch][]) => new Map(list);

  it('neemt een rij over zoals de planning hem achterliet, als hij ervoor nog was wat de melding vastlegde', () => {
    expect(refreshWritten([moved, added], touch([moved.id, { before: moved, after: repaired }], [added.id, { before: added, after: null }]), [moved.id, added.id])).toEqual([repaired]);
  });

  it('schreef iets anders de rij eerst (zonder melding), dan blijft het oude', () => {
    const other = { ...moved, plannedMinutes: 25 };
    expect(refreshWritten([moved], touch([moved.id, { before: other, after: repaired }]), [moved.id])).toEqual([moved]);
    // Een rij die de melding weghaalde en die iets anders terugzette.
    expect(refreshWritten([], touch([was.id, { before: was, after: repaired }]), [was.id])).toEqual([]);
    // Tussen twee rondes schreef iets anders.
    expect(refreshWritten([moved], touch([moved.id, { before: moved, after: repaired, broken: true }]), [moved.id])).toEqual([moved]);
  });

  it('beide ontbraken: wat de planning neerzette telt', () => {
    expect(refreshWritten([], touch([added.id, { before: null, after: added }]), [added.id])).toEqual([added]);
  });

  it('rijen die nu pas bij de melding komen gelden zoals ze nu zijn', () => {
    expect(refreshWritten(undefined, touch(), ['p1'], new Map([['p1', moved]]))).toEqual([moved]);
    expect(refreshWritten([moved], touch(), [moved.id], new Map([[moved.id, null]]))).toEqual([]);
  });

  it('een rij die de weekcontrole bij een melding zonder rijen zette en die jij daarna verandert, gaat niet blind terug', () => {
    const written = refreshWritten([], touch(), [was.id], new Map([[was.id, moved]]));
    const yours = { ...moved, scheduledDate: '2026-11-02', lock: { by: 'user' as const, at: '2026-10-30T08:00:00.000Z' } };
    expect(undoBlockReason({ before: [was], addedIds: [], written, current: rows(yours), loggedIds: new Set() })).toBe('yours');
  });
});

describe('chainTouch', () => {
  const repaired = { ...moved, plannedMinutes: 40 };
  it('neemt het begin van de eerste ronde en het eind van de laatste', () => {
    expect(chainTouch(undefined, { before: was, after: moved })).toEqual({ before: was, after: moved });
    expect(chainTouch({ before: was, after: moved }, { before: moved, after: repaired })).toEqual({ before: was, after: repaired });
    expect(chainTouch({ before: null, after: null }, { before: null, after: added })).toEqual({ before: null, after: added });
  });

  it('zat er een andere schrijver tussen, dan is het gebroken', () => {
    expect(chainTouch({ before: was, after: moved }, { before: { ...moved, plannedMinutes: 25 }, after: repaired })).toEqual({ before: was, after: repaired, broken: true });
    expect(chainTouch({ before: was, after: moved, broken: true }, { before: moved, after: repaired }).broken).toBe(true);
  });
});
