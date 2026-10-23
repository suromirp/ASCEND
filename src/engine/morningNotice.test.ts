import { describe, it, expect, beforeEach, vi } from 'vitest';
import script from '../../public/morning-notice-sw.js?raw';
import { MetaRepo, wipeAllData } from '../storage/database';
import {
  cleanMorningNotice, DEFAULT_NOTICE_TIME, NOTICE_BODY, NOTICE_LINK, NOTICE_SUPPORT_TEXT, NOTICE_TAG, NOTICE_TITLE, noticeSupport, resolveMorningNotice, shouldNotifyMorning,
  type NoticeEnvironment, type NoticeInputSettings,
} from './morningNotice';

// Made-up mornings only. Local time of the machine, like the app.
const at = (h: number, m = 0, day = 22) => new Date(2026, 9, day, h, m);
const on: NoticeInputSettings = { morningNotice: { enabled: true, time: '07:30' } };

type Decide = (p: { settings: NoticeInputSettings; lastNotified?: string; now: Date }) => boolean;

// The service worker script as the browser runs it, with a bare scope.
function loadScript() {
  const listeners = new Map<string, (e: unknown) => void>();
  const shown: { title: string; options: NotificationOptions }[] = [];
  const self: Record<string, unknown> = {
    registration: {
      scope: 'https://example.test/ascend/',
      showNotification: async (title: string, options: NotificationOptions) => void shown.push({ title, options }),
    },
    addEventListener: (type: string, fn: (e: unknown) => void) => void listeners.set(type, fn),
  };
  new Function('self', 'indexedDB', 'URL', script)(self, indexedDB, URL);
  const api = self.ascendMorningNotice as { shouldNotifyMorning: Decide; checkMorning: (now: Date) => Promise<void> };
  return { api, listeners, shown };
}

const cases: [string, Parameters<Decide>[0], boolean][] = [
  ['off by default', { settings: {}, now: at(8) }, false],
  ['on, after the time, not filled in', { settings: on, now: at(8) }, true],
  ['exactly at the time', { settings: on, now: at(7, 30) }, true],
  ['before the time', { settings: on, now: at(7, 29) }, false],
  ['last minute before 11:00', { settings: on, now: at(10, 59) }, true],
  ['from 11:00 no more', { settings: on, now: at(11) }, false],
  ['already filled in today', { settings: { ...on, morningCheckIns: [{ date: '2026-10-22' }] }, now: at(8) }, false],
  ['filled in yesterday only', { settings: { ...on, morningCheckIns: [{ date: '2026-10-21' }] }, now: at(8) }, true],
  ['already notified today', { settings: on, lastNotified: '2026-10-22', now: at(9) }, false],
  ['notified yesterday', { settings: on, lastNotified: '2026-10-21', now: at(9) }, true],
  ['the morning check is switched off', { settings: { ...on, overviews: { morningCheckIn: false } }, now: at(8) }, false],
  ['a broken time falls back to 07:30', { settings: { morningNotice: { enabled: true, time: 'ochtend' } }, now: at(7, 45) }, true],
  ['a time after 11:00 falls back to 07:30', { settings: { morningNotice: { enabled: true, time: '12:00' } }, now: at(8) }, true],
  ['a custom time', { settings: { morningNotice: { enabled: true, time: '09:00' } }, now: at(8, 59) }, false],
];

describe('shouldNotifyMorning', () => {
  it.each(cases)('%s', (_name, input, expected) => {
    expect(shouldNotifyMorning(input)).toBe(expected);
  });

  it('the service worker script decides exactly the same', () => {
    const { api } = loadScript();
    for (const [name, input, expected] of cases) expect(api.shouldNotifyMorning(input), name).toBe(expected);
  });
});

describe('resolveMorningNotice', () => {
  it('is off at 07:30 when nothing is stored, and reads defensively', () => {
    expect(resolveMorningNotice(undefined)).toEqual({ enabled: false, time: DEFAULT_NOTICE_TIME });
    expect(resolveMorningNotice('aan')).toEqual({ enabled: false, time: DEFAULT_NOTICE_TIME });
    expect(resolveMorningNotice({ enabled: 'ja', time: 5 })).toEqual({ enabled: false, time: DEFAULT_NOTICE_TIME });
    expect(resolveMorningNotice({ enabled: true, time: '08:00' })).toEqual({ enabled: true, time: '08:00' });
  });
});

describe('cleanMorningNotice', () => {
  it('keeps a valid switch and time, drops and counts the rest', () => {
    expect(cleanMorningNotice({ enabled: true, time: '08:30' })).toEqual({ value: { enabled: true, time: '08:30' }, dropped: 0 });
    expect(cleanMorningNotice({ enabled: 'ja', time: '25:00', extra: 1 })).toEqual({ value: undefined, dropped: 3 });
    expect(cleanMorningNotice({ enabled: false, time: '11:30' })).toEqual({ value: { enabled: false }, dropped: 1 });
    expect(cleanMorningNotice('aan')).toEqual({ value: undefined, dropped: 1 });
  });
});

describe('noticeSupport', () => {
  const env: NoticeEnvironment = { notification: true, serviceWorker: true, periodicSync: true, installed: true, permission: 'default' };

  it('is ready only in an installed app with what it needs', () => {
    expect(noticeSupport(env)).toBe('ready');
    expect(noticeSupport({ ...env, permission: 'granted' })).toBe('ready');
  });

  it('says what is missing, in this order', () => {
    expect(noticeSupport({ ...env, periodicSync: false, installed: false })).toBe('unavailable');
    expect(noticeSupport({ ...env, notification: false })).toBe('unavailable');
    expect(noticeSupport({ ...env, installed: false })).toBe('not_installed');
    expect(noticeSupport({ ...env, permission: 'denied' })).toBe('blocked');
  });

  it('has an honest sentence for every case that does not work', () => {
    expect(NOTICE_SUPPORT_TEXT.unavailable).toBe('Je telefoon laat ASCEND niet op de achtergrond wakker worden; je krijgt de vraag als je de app opent.');
    for (const text of Object.values(NOTICE_SUPPORT_TEXT)) expect(text).not.toMatch(/[–—]/);
  });
});

describe('public/morning-notice-sw.js', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('shows the notice once, from what is stored, and not a second time the same day', async () => {
    await MetaRepo.set('settings', { ...on });
    const { api, shown } = loadScript();
    await api.checkMorning(at(8));
    expect(shown).toHaveLength(1);
    expect(shown[0].title).toBe(NOTICE_TITLE);
    expect(shown[0].options.body).toBe(NOTICE_BODY);
    expect(shown[0].options.tag).toBe(NOTICE_TAG);
    expect(shown[0].options.data.url).toBe(`https://example.test/ascend/${NOTICE_LINK}`);
    expect(await MetaRepo.get('morningNoticeLast')).toBe('2026-10-22');
    await api.checkMorning(at(9));
    expect(shown).toHaveLength(1);
    await api.checkMorning(at(8, 0, 23));
    expect(shown).toHaveLength(2);
  });

  it('stays quiet when the check-in is there, when it is off, or when there are no settings yet', async () => {
    const { api, shown } = loadScript();
    await api.checkMorning(at(8));
    await MetaRepo.set('settings', { ...on, morningCheckIns: [{ date: '2026-10-22', allNormal: true }] });
    await api.checkMorning(at(8));
    await MetaRepo.set('settings', { morningNotice: { enabled: false } });
    await api.checkMorning(at(8));
    expect(shown).toHaveLength(0);
  });

  it('does not remember a notice that could not be shown', async () => {
    await MetaRepo.set('settings', { ...on });
    const failing = vi.fn(async () => {
      throw new Error('geen toestemming');
    });
    // A scope whose showNotification fails.
    const self: Record<string, unknown> = { registration: { scope: 'https://example.test/ascend/', showNotification: failing }, addEventListener: () => undefined };
    new Function('self', 'indexedDB', 'URL', script)(self, indexedDB, URL);
    await (self.ascendMorningNotice as { checkMorning: (n: Date) => Promise<void> }).checkMorning(at(8));
    expect(failing).toHaveBeenCalledTimes(1);
    expect(await MetaRepo.get('morningNoticeLast')).toBeUndefined();
  });

  it('opens the app on Vandaag with the sheet when you tap the notice, or focuses the open window', async () => {
    const openWindow = vi.fn(async () => undefined);
    const navigate = vi.fn(async () => undefined);
    const windows: unknown[] = [];
    const listeners = new Map<string, (e: unknown) => void>();
    const self: Record<string, unknown> = {
      registration: { scope: 'https://example.test/ascend/', showNotification: async () => undefined },
      clients: { matchAll: async () => windows, openWindow },
      addEventListener: (type: string, fn: (e: unknown) => void) => void listeners.set(type, fn),
    };
    new Function('self', 'indexedDB', 'URL', script)(self, indexedDB, URL);
    expect([...listeners.keys()].sort()).toEqual(['notificationclick', 'periodicsync']);
    const url = `https://example.test/ascend/${NOTICE_LINK}`;
    const tap = async () => {
      let done: Promise<unknown> | undefined;
      const close = vi.fn();
      listeners.get('notificationclick')!({ notification: { tag: NOTICE_TAG, data: { url }, close }, waitUntil: (p: Promise<unknown>) => (done = p) });
      await done;
      expect(close).toHaveBeenCalled();
    };
    await tap();
    expect(openWindow).toHaveBeenCalledWith(url);
    const win = { url: 'https://example.test/ascend/#/week', focus: async () => ({ navigate }) };
    windows.push(win);
    await tap();
    expect(navigate).toHaveBeenCalledWith(url);
    expect(openWindow).toHaveBeenCalledTimes(1);
  });
});
