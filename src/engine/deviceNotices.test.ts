import { describe, expect, it } from 'vitest';
import {
  cleanWeekNoticeTime,
  DEFAULT_WEEK_NOTICE_TIME,
  generalChannel,
  MORNING_NOTICE_BASE_ID,
  MORNING_NOTICE_DAYS,
  morningNoticeSchedule,
  nativeNoticeSupport,
  nextWeekNoticeAt,
  noticesBundleSummary,
  noticesNeed,
  permissionRows,
  permissionsSummary,
  resolveDeviceNotices,
  REST_NOTICE_ID,
  REST_PREEMPT_MS,
  restChannel,
  restNotice,
  restNoticePreemptDelay,
  restNoticeStep,
  shouldShowWelcome,
  WEEK_NOTICE_ID,
  weekNoticeSchedule,
  weekNoticeText,
  welcomeSteps,
  type DevicePermissions,
} from './deviceNotices';
import type { WeekReview } from './weekReview';

// Een nagemaakte week; geen echte gegevens.
function review(over: Partial<WeekReview> = {}): WeekReview {
  return {
    weekStart: '2026-10-26',
    title: 'Week 3 van 6, basisfase',
    done: 3,
    planned: 4,
    minutes: 200,
    perSport: [],
    missed: ['Duurloop'],
    missedTemplateIds: ['t-duur'],
    keyPlanned: 1,
    keyDone: 1,
    heavier: 0,
    pain: [],
    effort: { easy: 0, hard: 0, uncounted: 0 },
    running: false,
    todayLeft: 0,
    lighter: 0,
    next: { title: 'Week 4 van 6, basisfase', minutes: 240, key: 'Lange loop: 1 uur 30 min' },
    advice: ['Eén training bleef liggen. Volgende week staat er weer een rustig blok.', 'Tweede tip'],
    ...over,
  };
}

const ANDROID: DevicePermissions = { timed: true, notifications: 'granted', exactAlarm: 'granted', healthConnect: 'soon' };
const BROWSER: DevicePermissions = { timed: false, notifications: 'prompt', exactAlarm: 'unavailable', healthConnect: 'unavailable' };

describe('de instellingen van de meldingen', () => {
  it('heeft het advies als niets is opgeslagen: rust en week aan, zondag 19:00', () => {
    expect(resolveDeviceNotices({})).toEqual({ rest: true, week: true, weekTime: '19:00', morning: { enabled: false, time: '07:30' } });
  });
  it('leest uit wat je zelf koos', () => {
    expect(resolveDeviceNotices({ restNotice: false, weekNotice: false, weekNoticeTime: '20:00', morningNotice: { enabled: true, time: '08:00' } })).toEqual({ rest: false, week: false, weekTime: '20:00', morning: { enabled: true, time: '08:00' } });
  });
  it('een onbekende tijd valt terug op het advies', () => {
    expect(resolveDeviceNotices({ weekNoticeTime: '03:00' }).weekTime).toBe(DEFAULT_WEEK_NOTICE_TIME);
    expect(cleanWeekNoticeTime('21:00')).toBe('21:00');
    expect(cleanWeekNoticeTime('rommel')).toBeUndefined();
    expect(cleanWeekNoticeTime(19)).toBeUndefined();
  });
});

describe('het einde van de rust', () => {
  it('plant op de echte eindtijd, met de naam van de oefening', () => {
    const n = restNotice({ endsAt: 1_000_000, name: 'Squat' }, 'sound_vibrate');
    expect(n).toMatchObject({ id: REST_NOTICE_ID, at: 1_000_000, channel: 'ascend-rust' });
    expect(n.title).toBe('Je rust is voorbij');
    expect(n.body).toContain('Squat');
  });
  it('kiest het kanaal bij het signaal van Forge', () => {
    expect(restChannel('sound_vibrate')).toBe('ascend-rust');
    expect(restChannel('sound')).toBe('ascend-rust-geluid');
    expect(restChannel('vibrate')).toBe('ascend-rust-tril');
    expect(restChannel('off')).toBe('ascend-rust-stil');
  });
  it('plant zolang de rust loopt en de melding aan staat, en schrapt anders', () => {
    expect(restNoticeStep({ endsAt: 2000, enabled: true, now: 1000 })).toBe('schedule');
    expect(restNoticeStep({ endsAt: 2000, enabled: false, now: 1000 })).toBe('cancel');
    expect(restNoticeStep({ endsAt: undefined, enabled: true, now: 1000 })).toBe('cancel');
    expect(restNoticeStep({ endsAt: 1000, enabled: true, now: 1000 })).toBe('cancel');
  });
  it('neemt het signaal in de app over vlak voor het einde, als het scherm aan is', () => {
    expect(restNoticePreemptDelay(10_000, 1000)).toBe(10_000 - 1000 - REST_PREEMPT_MS);
    expect(restNoticePreemptDelay(1500, 1000)).toBe(0);
  });
});

describe('de ochtendvraag', () => {
  // Woensdag 28 oktober 2026, 06:00, tijd van het toestel.
  const now = new Date(2026, 9, 28, 6, 0);
  const base = { now, enabled: true, time: '07:30', morningFromHour: 5, checkInOn: true, checkedIn: [] as string[], haptics: true };

  it('plant de komende zeven ochtenden op de tijd van de ochtendvraag', () => {
    const list = morningNoticeSchedule(base);
    expect(list).toHaveLength(MORNING_NOTICE_DAYS);
    expect(list[0]).toMatchObject({ id: MORNING_NOTICE_BASE_ID, at: new Date(2026, 9, 28, 7, 30).getTime(), channel: 'ascend-meldingen', link: '#/?actie=ochtend' });
    expect(list[6].at).toBe(new Date(2026, 10, 3, 7, 30).getTime());
    expect(new Set(list.map((n) => n.id)).size).toBe(MORNING_NOTICE_DAYS);
  });
  it('slaat vandaag over als je al hebt ingevuld of de tijd voorbij is', () => {
    expect(morningNoticeSchedule({ ...base, checkedIn: ['2026-10-28'] })[0].at).toBe(new Date(2026, 9, 29, 7, 30).getTime());
    expect(morningNoticeSchedule({ ...base, now: new Date(2026, 9, 28, 9, 0) })[0].at).toBe(new Date(2026, 9, 29, 7, 30).getTime());
  });
  it('komt nooit voor de ochtend begint', () => {
    expect(morningNoticeSchedule({ ...base, time: '06:30', morningFromHour: 7 })[0].at).toBe(new Date(2026, 9, 28, 7, 0).getTime());
  });
  it('niets als de melding of de ochtendcheck uit staat', () => {
    expect(morningNoticeSchedule({ ...base, enabled: false })).toEqual([]);
    expect(morningNoticeSchedule({ ...base, checkInOn: false })).toEqual([]);
  });
  it('trilt alleen als Trillen aan staat', () => {
    expect(morningNoticeSchedule({ ...base, haptics: false })[0].channel).toBe('ascend-meldingen-stil');
    expect(generalChannel(true)).toBe('ascend-meldingen');
  });
});

describe('de weekmelding op zondag', () => {
  it('komt op de eerstvolgende zondag op de gekozen tijd', () => {
    expect(nextWeekNoticeAt(new Date(2026, 9, 28, 12, 0), '19:00').getTime()).toBe(new Date(2026, 10, 1, 19, 0).getTime());
    expect(nextWeekNoticeAt(new Date(2026, 10, 1, 18, 0), '19:00').getTime()).toBe(new Date(2026, 10, 1, 19, 0).getTime());
    expect(nextWeekNoticeAt(new Date(2026, 10, 1, 19, 30), '19:00').getTime()).toBe(new Date(2026, 10, 8, 19, 0).getTime());
  });
  it('zegt wat er gebeurde, wat er komt en één tip', () => {
    const t = weekNoticeText(review());
    expect(t).not.toBeNull();
    expect(t!.title).toBe('Je week in het kort');
    expect(t!.body).toBe('3 van 4 trainingen gedaan, 3 uur 20 min.');
    expect(t!.largeBody).toBe('3 van 4 trainingen gedaan, 3 uur 20 min. Volgende week: week 4 van 6, basisfase, met Lange loop: 1 uur 30 min. Eén training bleef liggen. Volgende week staat er weer een rustig blok.');
    expect(t!.largeBody).not.toContain('Tweede tip');
  });
  it('zonder volgende week of tip blijft het bij wat er gebeurde', () => {
    expect(weekNoticeText(review({ next: undefined, advice: [] }))!.largeBody).toBe('3 van 4 trainingen gedaan, 3 uur 20 min.');
  });
  it('een week zonder plan en zonder training geeft geen melding', () => {
    expect(weekNoticeText(null)).toBeNull();
    expect(weekNoticeText(review({ planned: 0, done: 0, minutes: 0 }))).toBeNull();
  });
  it('één training in enkelvoud', () => {
    expect(weekNoticeText(review({ done: 1, planned: 1, minutes: 45, next: undefined, advice: [] }))!.body).toBe('1 van 1 training gedaan, 45 min.');
  });
  it('plant de melding alleen als hij aan staat en er iets te zeggen is', () => {
    const now = new Date(2026, 9, 28, 12, 0);
    const text = weekNoticeText(review());
    expect(weekNoticeSchedule({ now, enabled: true, time: '19:00', text, haptics: true })).toMatchObject({ id: WEEK_NOTICE_ID, at: new Date(2026, 10, 1, 19, 0).getTime(), link: '#/' });
    expect(weekNoticeSchedule({ now, enabled: false, time: '19:00', text, haptics: true })).toBeNull();
    expect(weekNoticeSchedule({ now, enabled: true, time: '19:00', text: null, haptics: true })).toBeNull();
  });
});

describe('toestemmingen', () => {
  const on = { morningNotice: { enabled: true } };
  it('weet welke toestemming een gekozen melding nodig heeft', () => {
    expect(noticesNeed({}, ANDROID)).toEqual({ notifications: true, exactAlarm: true });
    expect(noticesNeed({ restNotice: false, weekNotice: false }, ANDROID)).toEqual({ notifications: false, exactAlarm: false });
    expect(noticesNeed({ restNotice: false }, ANDROID)).toEqual({ notifications: true, exactAlarm: false });
    // In de browser telt alleen de ochtendvraag, en een exacte wekker bestaat er niet.
    expect(noticesNeed({}, BROWSER)).toEqual({ notifications: false, exactAlarm: false });
    expect(noticesNeed(on, BROWSER)).toEqual({ notifications: true, exactAlarm: false });
  });
  it('toont per toestemming Aan, Uit of Binnenkort, met een stip als een nodige uit staat', () => {
    const rows = permissionRows({ ...ANDROID, exactAlarm: 'denied' }, { notifications: true, exactAlarm: true });
    expect(rows.map((r) => [r.id, r.value, r.warn])).toEqual([
      ['meldingen', 'Aan', false],
      ['wekker', 'Uit', true],
      ['health', 'Binnenkort', false],
    ]);
    expect(permissionsSummary(rows)).toEqual({ value: '1 staat uit', warn: true });
    expect(permissionsSummary(permissionRows(ANDROID, { notifications: true, exactAlarm: true }))).toEqual({ value: 'Alles aan', warn: false });
  });
  it('een toestemming die uit staat maar niet nodig is, krijgt geen stip', () => {
    const rows = permissionRows({ ...ANDROID, notifications: 'denied', exactAlarm: 'denied' }, { notifications: false, exactAlarm: false });
    expect(rows.filter((r) => r.warn)).toEqual([]);
    expect(permissionsSummary(rows)).toEqual({ value: '2 staan uit', warn: false });
  });
  it('laat in de browser alleen de meldingen zien', () => {
    expect(permissionRows(BROWSER, { notifications: false, exactAlarm: false }).map((r) => r.id)).toEqual(['meldingen']);
  });
  it('de ochtendvraag op de telefoon kan alleen als meldingen niet geweigerd zijn', () => {
    expect(nativeNoticeSupport('granted')).toBe('ready');
    expect(nativeNoticeSupport('prompt')).toBe('ready');
    expect(nativeNoticeSupport('denied')).toBe('blocked');
  });
});

describe('de bundel Meldingen', () => {
  it('in de browser: de ochtend aan of uit', () => {
    expect(noticesBundleSummary({ morningNotice: { enabled: true } }, BROWSER, true)).toEqual({ value: 'Ochtend aan' });
    expect(noticesBundleSummary({}, BROWSER, false)).toEqual({ value: 'Uit', dim: true });
  });
  it('in de app: hoeveel van de drie aan staan, met een stip als de toestemming ontbreekt', () => {
    expect(noticesBundleSummary({}, ANDROID, false)).toEqual({ value: '2 van 3 aan' });
    expect(noticesBundleSummary({ morningNotice: { enabled: true } }, ANDROID, true)).toEqual({ value: 'Alle 3 aan' });
    expect(noticesBundleSummary({ restNotice: false, weekNotice: false }, ANDROID, false)).toEqual({ value: 'Uit', dim: true });
    expect(noticesBundleSummary({}, { ...ANDROID, notifications: 'denied' }, false)).toEqual({ value: '2 van 3 aan', dot: 'warn', sub: 'Toestemming voor meldingen staat uit' });
  });
  it('zolang de telefoon nog niets zei: de opgeslagen keuze, zonder stip', () => {
    expect(noticesBundleSummary({ morningNotice: { enabled: true } }, undefined, true)).toEqual({ value: 'Ochtend aan' });
  });
});

describe('de welkomstreeks', () => {
  it('alleen op een telefoon met meldingen op tijd, één keer', () => {
    expect(shouldShowWelcome({ timed: true, seen: false })).toBe(true);
    expect(shouldShowWelcome({ timed: true, seen: true })).toBe(false);
    expect(shouldShowWelcome({ timed: false, seen: false })).toBe(false);
    expect(shouldShowWelcome({ timed: false, seen: true, forced: true })).toBe(true);
  });
  it('slaat over wat al mag, en eindigt met Health Connect en je gegevens meenemen', () => {
    expect(welcomeSteps({ ...ANDROID, notifications: 'prompt', exactAlarm: 'denied' })).toEqual(['meldingen', 'wekker', 'health', 'gegevens']);
    expect(welcomeSteps(ANDROID)).toEqual(['health', 'gegevens']);
    expect(welcomeSteps(ANDROID, true)).toEqual(['meldingen', 'wekker', 'health', 'gegevens']);
    expect(welcomeSteps({ ...ANDROID, exactAlarm: 'unavailable', notifications: 'prompt' })).toEqual(['meldingen', 'health', 'gegevens']);
  });
});
