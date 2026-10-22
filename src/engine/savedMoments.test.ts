import { describe, it, expect } from 'vitest';
import { announcementFor, type SavedMoment } from './savedMoments';

const moment = (logId: string, extra: Partial<SavedMoment> = {}): SavedMoment => ({ logId, recovery: false, ...extra });

describe('announcementFor', () => {
  it('says nothing for nothing', () => {
    expect(announcementFor([])).toBeUndefined();
  });

  it('gives a single training its own moment, the coach line and the debrief', () => {
    expect(announcementFor([moment('a', { coachNote: 'Netjes.' })])).toEqual({
      kind: 'session', title: undefined, coachNote: 'Netjes.', logIds: ['a'], debriefLogId: 'a',
    });
  });

  it('opens no debrief for a training that was ticked off by itself, also when it cleared a milestone', () => {
    const auto = announcementFor([moment('a', { auto: true, clearedTitle: 'Tien kilometer' })]);
    expect(auto).toMatchObject({ kind: 'milestone', title: 'Tien kilometer', logIds: ['a'] });
    expect(auto?.debriefLogId).toBeUndefined();
    expect(announcementFor([moment('a', { auto: true })])?.debriefLogId).toBeUndefined();
  });

  it('gives several one summary, without coach line or debrief, and the milestone wins', () => {
    const several = announcementFor([moment('a', { coachNote: 'x' }), moment('b', { clearedTitle: 'Vijf kilometer' }), moment('c')]);
    expect(several).toEqual({ kind: 'milestone', title: 'Vijf kilometer', coachNote: undefined, logIds: ['a', 'b', 'c'], debriefLogId: undefined });
  });

  it('calls it a recovery moment only when all of them are recovery', () => {
    expect(announcementFor([moment('a', { recovery: true }), moment('b', { recovery: true })])?.kind).toBe('recovery');
    expect(announcementFor([moment('a', { recovery: true }), moment('b')])?.kind).toBe('session');
  });
});
