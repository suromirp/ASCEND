import { afterEach, describe, expect, it } from 'vitest';
import { MORNING_NOTICE_IDS, WEEK_NOTICE_ID, type ScheduledNotice } from '../engine/deviceNotices';
import { browserPort, notificationPort, setNotificationPort, syncTimedNotices, type NotificationPort } from './notifications';

// Een nagemaakte telefoon die onthoudt wat er gepland en geschrapt is.
function fakePort(timed = true) {
  const scheduled = new Map<number, ScheduledNotice>();
  const cancelled: number[] = [];
  const port: NotificationPort = {
    timed,
    permissions: async () => ({ timed, notifications: 'granted', exactAlarm: 'granted', healthConnect: 'soon' }),
    requestNotifications: async () => 'granted',
    requestExactAlarm: async () => 'granted',
    schedule: async (list) => {
      for (const n of list) scheduled.set(n.id, n);
    },
    cancel: async (ids) => {
      for (const id of ids) {
        cancelled.push(id);
        scheduled.delete(id);
      }
    },
    onTap: () => () => undefined,
  };
  return { port, scheduled, cancelled };
}

const notice = (id: number, at: number): ScheduledNotice => ({ id, at, title: 't', body: 'b', channel: 'ascend-meldingen' });

afterEach(() => setNotificationPort(undefined));

describe('de laag voor meldingen', () => {
  it('is in de browser (en in tests) de stille laag zonder meldingen op tijd', async () => {
    expect(notificationPort()).toBe(browserPort);
    expect(browserPort.timed).toBe(false);
    const p = await browserPort.permissions();
    expect(p.exactAlarm).toBe('unavailable');
    expect(p.healthConnect).toBe('unavailable');
  });

  it('is in een test te vervangen', () => {
    const { port } = fakePort();
    setNotificationPort(port);
    expect(notificationPort()).toBe(port);
  });

  it('zet de vaste meldingen opnieuw en schrapt wat niet meer hoort', async () => {
    const { port, scheduled, cancelled } = fakePort();
    await syncTimedNotices(port, [notice(MORNING_NOTICE_IDS[0], 1), notice(MORNING_NOTICE_IDS[1], 2), notice(WEEK_NOTICE_ID, 3)]);
    expect([...scheduled.keys()].sort()).toEqual([MORNING_NOTICE_IDS[0], MORNING_NOTICE_IDS[1], WEEK_NOTICE_ID].sort());
    await syncTimedNotices(port, [notice(MORNING_NOTICE_IDS[0], 5)]);
    expect([...scheduled.keys()]).toEqual([MORNING_NOTICE_IDS[0]]);
    expect(scheduled.get(MORNING_NOTICE_IDS[0])!.at).toBe(5);
    expect(cancelled).toContain(WEEK_NOTICE_ID);
  });

  it('doet niets op een toestel zonder meldingen op tijd', async () => {
    const { port, scheduled, cancelled } = fakePort(false);
    await syncTimedNotices(port, [notice(WEEK_NOTICE_ID, 3)]);
    expect(scheduled.size).toBe(0);
    expect(cancelled).toEqual([]);
  });
});
