// ASCEND: de ochtendmelding (docs/beslissingen/2026-10-23-ochtendkaart-en-
// melding.md). Geen server en geen push: de geïnstalleerde app laat zijn service
// worker door Chrome af en toe wakker maken (Periodic Background Sync), en die
// beslist dan met de functie hieronder of er nu een melding komt.
//
// Het script dat dat in de service worker doet (public/morning-notice-sw.js) is
// gewoon JavaScript buiten de build en bevat dezelfde beslissing. Een test
// (src/engine/morningNotice.test.ts) draait dat script met dezelfde gevallen,
// zodat de twee niet uit elkaar lopen.
//
// Puur: geen React, geen IndexedDB, geen browser.

import type { MorningCheckIn } from '../models/checkIn';

export interface MorningNoticeSettings {
  enabled?: boolean;
  // "07:30", de tijd van het toestel.
  time?: string;
}

export const DEFAULT_NOTICE_TIME = '07:30';
export const NOTICE_TIMES = ['06:30', '07:00', '07:30', '08:00', '08:30', '09:00'];
// Na dit uur komt er geen melding meer: dan is het geen ochtend meer.
export const NOTICE_UNTIL_MINUTES = 11 * 60;

export const NOTICE_TITLE = 'Goedemorgen. Hoe voel je je?';
export const NOTICE_BODY = 'Tik om je ochtend in te vullen.';
export const NOTICE_TAG = 'ascend-ochtend';
// Het adres waar de melding naartoe leidt: Vandaag, met het blad open.
export const NOTICE_LINK = '#/?actie=ochtend';

export function timeToMinutes(time: string): number | undefined {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}

// Leest defensief: een back-up kan van een oudere of beschadigde versie zijn.
export function resolveMorningNotice(raw: unknown): { enabled: boolean; time: string } {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const minutes = typeof r.time === 'string' ? timeToMinutes(r.time) : undefined;
  const valid = minutes !== undefined && minutes < NOTICE_UNTIL_MINUTES;
  return { enabled: r.enabled === true, time: valid ? (r.time as string) : DEFAULT_NOTICE_TIME };
}

// Het deel van de instellingen dat de beslissing nodig heeft (en de service worker kan lezen).
export interface NoticeInputSettings {
  overviews?: { morningCheckIn?: boolean };
  morningNotice?: MorningNoticeSettings;
  morningCheckIns?: Pick<MorningCheckIn, 'date'>[];
}

// Bij het inlezen van een back-up: alleen een geldige schakelaar en tijd blijven staan.
export function cleanMorningNotice(raw: unknown): { value: MorningNoticeSettings | undefined; dropped: number } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { value: undefined, dropped: 1 };
  const r = raw as Record<string, unknown>;
  const out: MorningNoticeSettings = {};
  let dropped = 0;
  if ('enabled' in r) {
    if (typeof r.enabled === 'boolean') out.enabled = r.enabled;
    else dropped++;
  }
  if ('time' in r) {
    const minutes = typeof r.time === 'string' ? timeToMinutes(r.time) : undefined;
    if (minutes !== undefined && minutes < NOTICE_UNTIL_MINUTES) out.time = r.time as string;
    else dropped++;
  }
  for (const key of Object.keys(r)) if (key !== 'enabled' && key !== 'time') dropped++;
  return { value: Object.keys(out).length > 0 ? out : undefined, dropped };
}

const pad = (n: number) => String(n).padStart(2, '0');

// De datum van het toestel, zoals de rest van de app die telt.
export function localDate(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Moet er nu een melding komen? Ja als hij aan staat, de ochtendcheck aan staat,
// vandaag nog niet is ingevuld, het na jouw tijd is en voor 11:00, en er vandaag
// nog geen melding was. Chrome kiest zelf wanneer de service worker wakker wordt,
// dus "na jouw tijd" is het vroegste moment, niet het precieze.
export function shouldNotifyMorning(p: { settings: NoticeInputSettings; lastNotified?: string; now: Date }): boolean {
  const notice = resolveMorningNotice(p.settings.morningNotice);
  if (!notice.enabled) return false;
  if (p.settings.overviews?.morningCheckIn === false) return false;
  const today = localDate(p.now);
  if ((p.settings.morningCheckIns ?? []).some((c) => c.date === today)) return false;
  if (p.lastNotified === today) return false;
  const minutes = p.now.getHours() * 60 + p.now.getMinutes();
  return minutes >= (timeToMinutes(notice.time) as number) && minutes < NOTICE_UNTIL_MINUTES;
}

// ---- wat de telefoon kan -------------------------------------------------------

export interface NoticeEnvironment {
  notification: boolean;
  serviceWorker: boolean;
  periodicSync: boolean;
  installed: boolean;
  permission: 'granted' | 'denied' | 'default';
}

// 'unavailable': de browser kan het niet. 'not_installed': het kan, maar alleen in
// de geïnstalleerde app. 'blocked': meldingen staan voor ASCEND uit. 'ready': kan.
export type NoticeSupport = 'ready' | 'blocked' | 'not_installed' | 'unavailable';

export function noticeSupport(env: NoticeEnvironment): NoticeSupport {
  if (!env.notification || !env.serviceWorker || !env.periodicSync) return 'unavailable';
  if (!env.installed) return 'not_installed';
  if (env.permission === 'denied') return 'blocked';
  return 'ready';
}

// Eén eerlijke zin voor onder het blad, als het niet kan.
export const NOTICE_SUPPORT_TEXT: Record<Exclude<NoticeSupport, 'ready'>, string> = {
  unavailable: 'Je telefoon laat ASCEND niet op de achtergrond wakker worden; je krijgt de vraag als je de app opent.',
  not_installed: 'Chrome wekt ASCEND alleen op de achtergrond als de app op je beginscherm staat. Zet hem daar eerst neer; tot dan krijg je de vraag als je de app opent.',
  blocked: 'Meldingen staan voor ASCEND uit in je telefoon. Zet ze daar aan, dan kun je deze schakelaar gebruiken.',
};

// De telefoon zegt dat het kan, maar aanzetten lukte niet (de vraag om toestemming is gesloten
// zonder antwoord, of de aanmelding is geweigerd).
export const NOTICE_NOT_DONE_TEXT = 'Aanzetten is niet gelukt. Kies Toestaan als je telefoon om meldingen vraagt, of zet ze voor ASCEND aan in je telefoon, en probeer het nog eens.';
