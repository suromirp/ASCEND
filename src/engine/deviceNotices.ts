// ASCEND: meldingen op tijd en de toestemmingen die ze nodig hebben
// (docs/beslissingen/2026-11-01-android-app.md).
//
// Hier staat alleen wat er beslist wordt: wanneer een melding komt, wat erin staat, welk kanaal
// (geluid en trillen) hij krijgt, welke toestemming een gekozen melding nodig heeft en wat de rijen
// in Instellingen zeggen. Het plannen zelf doet integrations/notifications.ts; daar zit ook het
// enige stukje code dat weet op welk toestel ASCEND draait.
//
// Puur: geen React, geen IndexedDB, geen browser.

import { resolveMorningNotice, NOTICE_BODY, NOTICE_LINK, NOTICE_TITLE, type MorningNoticeSettings, type NoticeSupport } from './morningNotice';
import type { RestAlert } from './strengthSettings';
import type { WeekReview } from './weekReview';
import { formatHoursMinutesNL, toISODate } from '../utils/dates';

// ---- de opgeslagen keuzes ---------------------------------------------------------------

export const WEEK_NOTICE_TIMES = ['18:00', '19:00', '20:00', '21:00'] as const;
export type WeekNoticeTime = (typeof WEEK_NOTICE_TIMES)[number];
export const DEFAULT_WEEK_NOTICE_TIME: WeekNoticeTime = '19:00';

// Het deel van AppSettings dat hier gelezen wordt. Afwezig is het advies: het einde van de rust
// en de weekmelding aan, de ochtendvraag zoals hij was (uit tot je hem aanzet).
export interface DeviceNoticeInput {
  restNotice?: boolean;
  weekNotice?: boolean;
  weekNoticeTime?: string;
  morningNotice?: MorningNoticeSettings;
}

export interface DeviceNoticeSettings {
  rest: boolean;
  week: boolean;
  weekTime: WeekNoticeTime;
  morning: { enabled: boolean; time: string };
}

export function cleanWeekNoticeTime(raw: unknown): WeekNoticeTime | undefined {
  return WEEK_NOTICE_TIMES.find((t) => t === raw);
}

export function resolveDeviceNotices(s: DeviceNoticeInput): DeviceNoticeSettings {
  return {
    rest: s.restNotice !== false,
    week: s.weekNotice !== false,
    weekTime: cleanWeekNoticeTime(s.weekNoticeTime) ?? DEFAULT_WEEK_NOTICE_TIME,
    morning: resolveMorningNotice(s.morningNotice),
  };
}

// ---- wat er gepland wordt ----------------------------------------------------------------

// Vaste nummers: een nieuwe planning met hetzelfde nummer vervangt de oude.
export const REST_NOTICE_ID = 1001;
export const MORNING_NOTICE_BASE_ID = 2001;
export const MORNING_NOTICE_DAYS = 7;
export const WEEK_NOTICE_ID = 3001;
export const MORNING_NOTICE_IDS = Array.from({ length: MORNING_NOTICE_DAYS }, (_, i) => MORNING_NOTICE_BASE_ID + i);

// Op Android horen geluid en trillen bij een kanaal, niet bij de melding. Het einde van de rust
// volgt het signaal van Forge ("Signaal als de rust om is"), dat al zijn eigen keuze voor trillen
// heeft; de andere meldingen volgen de instelling Trillen.
export type NoticeChannel = 'ascend-rust' | 'ascend-rust-geluid' | 'ascend-rust-tril' | 'ascend-rust-stil' | 'ascend-meldingen' | 'ascend-meldingen-stil';

export interface ChannelSpec {
  id: NoticeChannel;
  name: string;
  description: string;
  // 2 laag (geen geluid), 3 gewoon, 5 hoogst (komt bovenin beeld).
  importance: 2 | 3 | 5;
  vibration: boolean;
  // Een eigen geluid in android/app/src/main/res/raw; zonder is het het geluid van de telefoon.
  sound?: 'stil.wav';
}

export const NOTICE_CHANNELS: ChannelSpec[] = [
  { id: 'ascend-rust', name: 'Einde van de rust', description: 'Geluid en trillen als je rust in Forge om is.', importance: 5, vibration: true },
  { id: 'ascend-rust-geluid', name: 'Einde van de rust, alleen geluid', description: 'Geluid zonder trillen als je rust in Forge om is.', importance: 5, vibration: false },
  { id: 'ascend-rust-tril', name: 'Einde van de rust, alleen trillen', description: 'Trillen zonder geluid als je rust in Forge om is.', importance: 5, vibration: true, sound: 'stil.wav' },
  { id: 'ascend-rust-stil', name: 'Einde van de rust, stil', description: 'Een stille melding als je rust in Forge om is.', importance: 2, vibration: false },
  { id: 'ascend-meldingen', name: 'Meldingen', description: 'De ochtendvraag en de weekmelding op zondag.', importance: 3, vibration: true },
  { id: 'ascend-meldingen-stil', name: 'Meldingen zonder trillen', description: 'De ochtendvraag en de weekmelding, als Trillen uit staat.', importance: 3, vibration: false },
];

export function restChannel(alert: RestAlert): NoticeChannel {
  if (alert === 'sound') return 'ascend-rust-geluid';
  if (alert === 'vibrate') return 'ascend-rust-tril';
  if (alert === 'off') return 'ascend-rust-stil';
  return 'ascend-rust';
}

export function generalChannel(haptics: boolean): NoticeChannel {
  return haptics ? 'ascend-meldingen' : 'ascend-meldingen-stil';
}

export interface ScheduledNotice {
  id: number;
  // Het moment in milliseconden sinds 1970.
  at: number;
  title: string;
  body: string;
  // De langere tekst als je de melding openklapt.
  largeBody?: string;
  channel: NoticeChannel;
  // Het adres in de app waar een tik op de melding naartoe gaat.
  link?: string;
}

// ---- het einde van de rust ---------------------------------------------------------------

// Zo lang voor het einde neemt de app het signaal zelf over als het scherm aan is: dan schrapt
// hij de melding, zodat je niet twee keer trilt.
export const REST_PREEMPT_MS = 1500;

export function restNotice(rest: { endsAt: number; name: string }, alert: RestAlert): ScheduledNotice {
  return {
    id: REST_NOTICE_ID,
    at: rest.endsAt,
    title: 'Je rust is voorbij',
    body: rest.name ? `Tijd voor je volgende set ${rest.name}.` : 'Tijd voor je volgende set.',
    channel: restChannel(alert),
  };
}

// Plannen zolang de rust loopt en de melding aan staat; in elk ander geval schrappen.
export function restNoticeStep(p: { endsAt: number | undefined; enabled: boolean; now: number }): 'schedule' | 'cancel' {
  return p.enabled && p.endsAt !== undefined && p.endsAt > p.now ? 'schedule' : 'cancel';
}

export function restNoticePreemptDelay(endsAt: number, now: number): number {
  return Math.max(0, endsAt - now - REST_PREEMPT_MS);
}

// ---- de ochtendvraag ---------------------------------------------------------------------

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// De komende ochtenden, elk op de tijd van de ochtendvraag maar nooit voor "Ochtend begint om".
// Vandaag valt af als je al hebt ingevuld of als het moment voorbij is. Bij elke start en na elke
// ochtendcheck wordt dit opnieuw gepland, zodat er nooit een vraag komt die al beantwoord is.
export function morningNoticeSchedule(p: {
  now: Date;
  enabled: boolean;
  time: string;
  morningFromHour: number;
  checkInOn: boolean;
  checkedIn: string[];
  haptics: boolean;
}): ScheduledNotice[] {
  if (!p.enabled || !p.checkInOn) return [];
  const minutes = Math.max(minutesOf(p.time), p.morningFromHour * 60);
  const done = new Set(p.checkedIn);
  const out: ScheduledNotice[] = [];
  for (let day = 0; out.length < MORNING_NOTICE_DAYS && day <= MORNING_NOTICE_DAYS; day++) {
    const at = new Date(p.now.getFullYear(), p.now.getMonth(), p.now.getDate() + day, Math.floor(minutes / 60), minutes % 60);
    if (at.getTime() <= p.now.getTime() || done.has(toISODate(at))) continue;
    out.push({ id: MORNING_NOTICE_IDS[out.length], at: at.getTime(), title: NOTICE_TITLE, body: NOTICE_BODY, channel: generalChannel(p.haptics), link: NOTICE_LINK });
  }
  return out;
}

// ---- de weekmelding op zondag --------------------------------------------------------------

// De eerstvolgende zondag op de gekozen tijd; op zondag na die tijd de zondag erna.
export function nextWeekNoticeAt(now: Date, time: string): Date {
  const minutes = minutesOf(time);
  const toSunday = (7 - now.getDay()) % 7;
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + toSunday, Math.floor(minutes / 60), minutes % 60);
  return at.getTime() > now.getTime() ? at : new Date(at.getFullYear(), at.getMonth(), at.getDate() + 7, at.getHours(), at.getMinutes());
}

const lowerFirst = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : text);

// Kort: wat er gebeurde, wat er komt en één tip. De getallen eerst, droog; de tip is de eerste
// regel van de coach uit de weekterugblik (engine/weekReview.ts), zodat de melding en de
// terugblik hetzelfde zeggen. Een week zonder plan en zonder training geeft geen melding.
export function weekNoticeText(review: WeekReview | null): { title: string; body: string; largeBody: string } | null {
  if (!review || (review.planned === 0 && review.done === 0)) return null;
  const body = `${review.done} van ${review.planned} ${review.planned === 1 ? 'training' : 'trainingen'} gedaan, ${formatHoursMinutesNL(review.minutes)}.`;
  const parts = [body];
  if (review.next) parts.push(`Volgende week: ${lowerFirst(review.next.title)}${review.next.key ? `, met ${review.next.key}` : ''}.`);
  if (review.advice[0]) parts.push(review.advice[0]);
  return { title: 'Je week in het kort', body, largeBody: parts.join(' ') };
}

export function weekNoticeSchedule(p: { now: Date; enabled: boolean; time: string; text: ReturnType<typeof weekNoticeText>; haptics: boolean }): ScheduledNotice | null {
  if (!p.enabled || !p.text) return null;
  return { id: WEEK_NOTICE_ID, at: nextWeekNoticeAt(p.now, p.time).getTime(), ...p.text, channel: generalChannel(p.haptics), link: '#/' };
}

// ---- toestemmingen -------------------------------------------------------------------------

// 'prompt': nog niet gevraagd. 'unavailable': bestaat op dit toestel niet. 'soon': komt later.
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable' | 'soon';

export interface DevicePermissions {
  // Kan dit toestel een melding op een vast moment geven, ook met het scherm uit (de app)?
  timed: boolean;
  notifications: PermissionState;
  exactAlarm: PermissionState;
  healthConnect: PermissionState;
}

// Welke toestemming een gekozen melding nodig heeft. In de browser telt alleen de ochtendvraag.
export function noticesNeed(s: DeviceNoticeInput, device: Pick<DevicePermissions, 'timed'>): { notifications: boolean; exactAlarm: boolean } {
  const n = resolveDeviceNotices(s);
  if (!device.timed) return { notifications: n.morning.enabled, exactAlarm: false };
  return { notifications: n.morning.enabled || n.rest || n.week, exactAlarm: n.rest };
}

export type PermissionId = 'meldingen' | 'wekker' | 'health';

export interface PermissionRow {
  id: PermissionId;
  title: string;
  line: string;
  value: 'Aan' | 'Uit' | 'Binnenkort';
  on: boolean;
  // Uit terwijl een gekozen functie hem nodig heeft: een amber stip.
  warn: boolean;
  // Er is een weg om hem aan te zetten (nu nog niet voor Health Connect).
  canAsk: boolean;
}

const PERMISSION_TEXT: Record<PermissionId, { title: string; line: string }> = {
  meldingen: { title: 'Meldingen', line: 'De ochtendvraag en het einde van je rust' },
  wekker: { title: 'Exacte wekker', line: 'Het einde van je rust op de seconde' },
  health: { title: 'Health Connect', line: 'Gewicht, stappen en trappen' },
};

export function permissionRows(p: DevicePermissions, need: { notifications: boolean; exactAlarm: boolean }): PermissionRow[] {
  const row = (id: PermissionId, state: PermissionState, needed: boolean): PermissionRow => {
    const soon = state === 'soon';
    const on = state === 'granted';
    return { id, ...PERMISSION_TEXT[id], value: soon ? 'Binnenkort' : on ? 'Aan' : 'Uit', on, warn: !on && !soon && needed, canAsk: !on && !soon };
  };
  const rows: PermissionRow[] = [];
  if (p.notifications !== 'unavailable') rows.push(row('meldingen', p.notifications, need.notifications));
  if (p.exactAlarm !== 'unavailable') rows.push(row('wekker', p.exactAlarm, need.exactAlarm));
  if (p.healthConnect !== 'unavailable') rows.push(row('health', p.healthConnect, false));
  return rows;
}

// `extraOff`: een toestemming die hier geen rij is maar wel uit staat (Opslag beschermd in de browser).
export function permissionsSummary(rows: PermissionRow[], extraOff = 0): { value: string; warn: boolean } {
  const off = rows.filter((r) => !r.on && r.value !== 'Binnenkort').length + extraOff;
  return { value: off === 0 ? 'Alles aan' : `${off} ${off === 1 ? 'staat' : 'staan'} uit`, warn: rows.some((r) => r.warn) };
}

// De ochtendvraag in de app: kan altijd, tenzij meldingen voor ASCEND geweigerd zijn.
export function nativeNoticeSupport(notifications: PermissionState): NoticeSupport {
  return notifications === 'denied' ? 'blocked' : 'ready';
}

// De waarde van de rij Meldingen. In de browser alleen de ochtend; in de app hoeveel van de drie
// aan staan, met een amber stip als de toestemming ontbreekt. Zolang de telefoon nog niets zei
// (`device` ontbreekt) staat er de opgeslagen keuze, zonder stip. `morningOn` is of de ochtendvraag
// echt werkt (aan en de telefoon kan het).
export function noticesBundleSummary(
  s: DeviceNoticeInput,
  device: DevicePermissions | undefined,
  morningOn: boolean,
): { value: string; dim?: boolean; dot?: 'warn'; sub?: string } {
  if (!device?.timed) return morningOn ? { value: 'Ochtend aan' } : { value: 'Uit', dim: true };
  const n = resolveDeviceNotices(s);
  const count = [n.morning.enabled, n.rest, n.week].filter(Boolean).length;
  if (count === 0) return { value: 'Uit', dim: true };
  const value = count === 3 ? 'Alle 3 aan' : `${count} van 3 aan`;
  return device.notifications === 'granted' ? { value } : { value, dot: 'warn', sub: 'Toestemming voor meldingen staat uit' };
}

// ---- de welkomstreeks ----------------------------------------------------------------------

// Eén keer, direct na de eerste start, en alleen waar meldingen op tijd bestaan (de app). In de
// browser nooit, behalve in de testmodus.
export function shouldShowWelcome(p: { timed: boolean; seen: boolean; forced?: boolean }): boolean {
  return p.forced === true || (p.timed && !p.seen);
}

// De schermen: wat nog niet mag, en altijd als laatste Health Connect (binnenkort). In de
// testmodus allemaal.
export function welcomeSteps(p: DevicePermissions, all = false): PermissionId[] {
  const steps: PermissionId[] = [];
  const open = (state: PermissionState) => state !== 'granted' && state !== 'unavailable';
  if (all || open(p.notifications)) steps.push('meldingen');
  if (all || open(p.exactAlarm)) steps.push('wekker');
  steps.push('health');
  return steps;
}
