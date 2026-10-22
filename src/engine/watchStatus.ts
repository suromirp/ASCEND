// ASCEND: what is the state of one planned training on the watch?
//
// "Trainingen naar je horloge sturen" works by itself (storage/watchWorkouts.ts),
// but the owner could not see whether a training had actually gone. This file
// answers that, per planned session, from what is stored: what the training is
// now (its fingerprint, engine/watchWorkout.ts) against what ASCEND last wrote
// to the intervals.icu agenda for it. Pure: no React, no IndexedDB, no network.
//
// The states:
// - none      the training does not go to a watch at all (strength, rest, the
//             race), is done, skipped or past. Nothing is shown.
// - unlinked  it would go, but there is no intervals.icu connection or the
//             switch is off.
// - sent      the agenda holds exactly what the training is now.
// - stale     the training changed after it was sent; the next round updates it.
// - pending   it is within the coming 7 days and has not been sent yet.
// - later     it is further away than 7 days: it goes when its day comes near.
// - failed    it is waiting (pending or stale) and the last attempt failed.
//
// "Sent" means: written to the intervals.icu agenda, which hands it on to
// Garmin Connect and the watch. ASCEND cannot see the watch itself.

import type { PlannedSession, SessionTemplate } from '../models/training';
import type { Program } from '../models/program';
import { addDays, formatDateNL, toISODate, weekdayLongNL } from '../utils/dates';
import type { RacePaces } from './racePaces';
import { buildWatchWorkout, WATCH_DAYS, type TrackedWorkout, type WatchNamePrefix } from './watchWorkout';

export type WatchStatusKind = 'none' | 'unlinked' | 'sent' | 'stale' | 'pending' | 'later' | 'failed';

export interface WatchStatus {
  kind: WatchStatusKind;
  // sent: when ASCEND wrote it (ISO timestamp), when known.
  sentAt?: string;
  // later: the day it starts going to the watch (ISO date).
  goesOn?: string;
  // failed: the short reason.
  reason?: string;
}

export interface WatchStatusContext {
  // An intervals.icu connection exists and the switch is on.
  linked: boolean;
  items: Record<string, TrackedWorkout>;
  // The last successful round and what the last failed attempt said.
  syncedAt?: string;
  lastError?: string;
  today: string;
  program?: Program | null;
  paces?: RacePaces;
  // The same choice the send uses (AppSettings.watchNamePrefix), or the fingerprint differs.
  namePrefix?: WatchNamePrefix;
  // The ids of planned sessions that have a log.
  logged: Set<string>;
}

export function watchStatusFor(session: PlannedSession, template: SessionTemplate, ctx: WatchStatusContext): WatchStatus {
  if (session.status === 'skipped' || ctx.logged.has(session.id) || session.scheduledDate < ctx.today) return { kind: 'none' };
  const workout = buildWatchWorkout(session, template, ctx.program, ctx.paces, { namePrefix: ctx.namePrefix });
  if (!workout) return { kind: 'none' };
  if (!ctx.linked) return { kind: 'unlinked' };

  const tracked = ctx.items[session.id];
  if (tracked && tracked.fingerprint === workout.fingerprint && tracked.date === workout.date) {
    return { kind: 'sent', sentAt: tracked.sentAt ?? ctx.syncedAt };
  }
  if (workout.date > addDays(ctx.today, WATCH_DAYS - 1)) {
    return { kind: 'later', goesOn: addDays(workout.date, -(WATCH_DAYS - 1)) };
  }
  if (ctx.lastError) return { kind: 'failed', reason: shortWatchError(ctx.lastError) };
  return { kind: tracked ? 'stale' : 'pending' };
}

// The long messages of integrations/intervalsIcu.ts in a few words, for a
// one-line status. Anything unknown becomes "onbekende fout"; the full text
// stays on the Garmin page.
export function shortWatchError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('geen verbinding')) return 'geen verbinding';
  if (m.includes('herkent je api-sleutel niet')) return 'sleutel niet herkend';
  if (m.includes('geen toegang tot deze athlete-id')) return 'athlete-id klopt niet';
  if (m.includes('geen trainingen in je agenda zetten')) return 'sleutel mag niet schrijven';
  if (m.includes('even te wachten')) return 'intervals.icu vraagt te wachten';
  if (m.includes('storing')) return 'storing bij intervals.icu';
  if (m.includes('nam de training niet aan')) return 'niet aangenomen';
  if (m.includes('begrijpt')) return 'onverwacht antwoord';
  if (m.includes('koppeling niet lezen')) return 'koppeling onleesbaar';
  if (m.includes('planning niet lezen')) return 'planning onleesbaar';
  return 'onbekende fout';
}

// "19.04", in the time of the device.
export function formatClockTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}.${String(date.getMinutes()).padStart(2, '0')}`;
}

// "om 19.04", "gisteren om 19.04" or "op 20 oktober om 19.04". With
// `todayWord` the first reads "vandaag om 19.04", for a sentence of its own.
export function sentWhen(sentAt: string, today: string, todayWord = false): string {
  const d = new Date(sentAt);
  if (Number.isNaN(d.getTime())) return '';
  const day = toISODate(d);
  const time = formatClockTime(d);
  if (day === today) return todayWord ? `vandaag om ${time}` : `om ${time}`;
  if (day === addDays(today, -1)) return `gisteren om ${time}`;
  return `op ${formatDateNL(day)} om ${time}`;
}

export type WatchStatusAction = 'send' | 'retry' | 'link';

export interface WatchStatusLine {
  text: string;
  // What the row offers next to the text: a button, or a tap to the Garmin page.
  action?: WatchStatusAction;
  actionLabel?: string;
}

// The one short line for the training screen. `none` has no line.
export function watchStatusLine(status: WatchStatus, today: string): WatchStatusLine | undefined {
  switch (status.kind) {
    case 'none':
      return undefined;
    case 'unlinked':
      return { text: 'Naar je horloge sturen?', action: 'link' };
    case 'sent': {
      const when = status.sentAt ? sentWhen(status.sentAt, today) : '';
      return { text: when ? `Verstuurd naar je horloge ${when}` : 'Verstuurd naar je horloge' };
    }
    case 'stale':
      return { text: 'Wijziging nog niet verstuurd', action: 'send', actionLabel: 'Nu versturen' };
    case 'pending':
      return { text: 'Nog niet op je horloge', action: 'send', actionLabel: 'Nu versturen' };
    case 'later': {
      const on = status.goesOn ?? today;
      const when = on === addDays(today, 1) ? 'morgen' : on <= today ? 'binnenkort' : `op ${weekdayLongNL(on)} ${formatDateNL(on)}`;
      return { text: `Gaat ${when} naar je horloge` };
    }
    case 'failed':
      return { text: `Niet gelukt: ${status.reason ?? 'onbekende fout'}`, action: 'retry', actionLabel: 'Opnieuw' };
  }
}

// --- the Garmin page: how many are waiting, and when the last round was ----------

export interface WatchOverview {
  // Trainings of today and later that ASCEND has written to the agenda.
  count: number;
  // The last successful round (ISO timestamp).
  lastRoundAt?: string;
}

export function watchOverview(items: Record<string, TrackedWorkout>, syncedAt: string | undefined, today: string): WatchOverview {
  return { count: Object.values(items).filter((t) => t.date >= today).length, lastRoundAt: syncedAt };
}

export function watchOverviewText(overview: WatchOverview, today: string): string {
  const count =
    overview.count === 0
      ? 'Er staat nu niets klaar voor je horloge.'
      : overview.count === 1
        ? '1 training staat klaar voor je horloge.'
        : `${overview.count} trainingen staan klaar voor je horloge.`;
  const round = overview.lastRoundAt ? sentWhen(overview.lastRoundAt, today, true) : '';
  return round ? `${count} Laatste ronde ${round}.` : `${count} Nog geen ronde geweest.`;
}
