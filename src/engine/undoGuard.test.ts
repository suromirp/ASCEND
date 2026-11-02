import { describe, expect, it } from 'vitest';
import type { PlannedSession } from '../models/training';
import { mergeWritten, sameRow, undoBlocked } from './undoGuard';

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

describe('mergeWritten', () => {
  it('neemt wat de weekcontrole erna schreef over, en wat hij weghaalde valt weg', () => {
    const repaired = { ...moved, plannedMinutes: 40 };
    expect(mergeWritten([moved, added], [moved.id, added.id], [repaired])).toEqual([repaired]);
    expect(mergeWritten([moved], ['p9'], [{ ...added, id: 'p9' }])).toEqual([moved, { ...added, id: 'p9' }]);
  });

  it('zonder vastgelegde rijen blijft het zonder', () => {
    expect(mergeWritten(undefined, ['p1'], [moved])).toBeUndefined();
  });
});
