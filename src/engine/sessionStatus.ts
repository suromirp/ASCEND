import type { PlannedSession, SessionLog } from '../models/training';
import { todayISO } from '../utils/dates';
import type { LeavePeriod } from '../models/leave';
import { isAwayDay } from './leave';
import type { IllnessEpisode } from '../models/illness';
import { isIllnessDay } from './illness';
import { isTaperDay } from './raceWindow';

// 'away': voorbij en niet gedaan op een dag van een vakantie, tocht of periode zonder sportschool die je meldde
// (engine/leave.ts#isAwayDay), of op een dag dat je ziek gemeld was (engine/illness.ts#isIllnessDay). Heet
// Vervallen, nooit gemist. Een dag vóór de melding blijft gemist. Wat je op zo'n dag wel logde, is gedaan en telt
// mee: dezelfde afleiding als de weekterugblik, de ring in Week en de reeks (engine/weekLogs.ts#leftOutOfCount,
// engine/streak.ts) en als de kaart Vervallen op Vandaag (engine/missedTraining.ts#planMissed), via isPausedDay.
// Ook een training uit de afbouw voor een race, zodra de racedag er is (engine/raceWindow.ts#isTaperDay).
// 'open': voorbij en niet gedaan, maar er ligt nog een concept van in Forge (een training die bleef liggen,
// engine/forgeSession.ts#leftSession). Heet "loopt nog": niet gemist en niet gedaan, tot je hem afrondt (dan is er
// een log) of verwijdert (dan geldt weer gewoon gemist). Zie isDraftOpen.
export type DisplayStatus = 'completed' | 'today' | 'planned' | 'moved' | 'skipped' | 'missed' | 'rest' | 'away' | 'open';

export interface DisplaySessionState {
  status: DisplayStatus;
  wasMoved: boolean;
  log?: SessionLog;
}

// Completion is never stored directly on a PlannedSession — it is always
// derived from whether a SessionLog referencing it exists. This is the one
// place that derivation happens so every screen agrees on what "done" means.
//
// A past session that was never logged AND never explicitly skipped is
// "missed" — distinct from a future "planned" session. Without this,
// history quietly renders an untouched past session as an empty upcoming
// circle, which looks identical to something that simply hasn't happened
// yet.
//
// A rest day (isRest) is not a training: nothing to tick off, so it is
// never "missed" and never waits for a log. Logging a walk on it still
// shows as done.
//
// "Verplaatst" (wasMoved) is only what you moved, or a proposal you accepted
// did: status 'moved' or a lock. A move by the system itself keeps
// movedFromDate as a trace, but no screen calls it "verplaatst" as if you did
// it (Warden Planning punt 8, docs/beslissingen/2026-10-23-planning-nooit-stil.md).
function movedByYou(session: PlannedSession): boolean {
  return !!session.movedFromDate && session.movedFromDate !== session.scheduledDate && (session.status === 'moved' || !!session.lock);
}

export interface PauseContext {
  leave?: LeavePeriod[];
  illness?: IllnessEpisode[];
  // De dagen van de races in de planning (engine/raceWindow.ts#raceDatesOf).
  races?: readonly string[];
  // De geplande sessie waar nog een concept van in Forge ligt (openDraftId), of niets.
  openDraft?: string;
}

// De geplande sessie van het concept dat nu in Forge ligt, of niets. De ene plek die het concept leest: de wijzer en
// het concept zelf komen uit utils/forgeSessionStore.ts#readSession (die geeft niets als het concept weg is). Een losse
// training (zonder plannedSessionId) hoort bij geen geplande sessie. Een sessie met een log is gedaan, ook als het
// concept nog niet opgeruimd is.
export function openDraftId(session: { pointer: { plannedSessionId?: string } } | undefined, logs: readonly Pick<SessionLog, 'plannedSessionId'>[]): string | undefined {
  const id = session?.pointer.plannedSessionId;
  if (!id) return undefined;
  return logs.some((l) => l.plannedSessionId === id) ? undefined : id;
}

// Loopt deze voorbije training nog? Er ligt een concept van, hij staat niet op overgeslagen en de dag is voorbij
// (vandaag is hij gewoon vandaag). Dan is hij niet gemist en niet gedaan: geen vraag Niet gedaan?, geen inhalen, niet
// in de telling van Week, de weekterugblik en de reeks (engine/weekLogs.ts#leftOutOfCount,
// engine/missedTraining.ts#planMissed). Wie een log heeft, is gedaan: de aanroeper toetst het log eerst.
export function isDraftOpen(session: Pick<PlannedSession, 'id' | 'scheduledDate' | 'status'>, openDraft: string | undefined, today: string): boolean {
  return !!openDraft && session.id === openDraft && session.status !== 'skipped' && session.scheduledDate < today;
}

// Een dag binnen een pauze die je meldde: ziek (tot en met de dag van beter melden, of tot vandaag) of weg, of een
// dag uit de afbouw van een race die er al was. De ene toets voor Vervallen; wie een voorbije dag toont, geeft
// { leave, illness, races } mee.
export function isPausedDay(date: string, pause: PauseContext | undefined, today: string): boolean {
  return (!!pause?.leave?.length && isAwayDay(date, pause.leave)) || isIllnessDay(date, pause?.illness, today) || isTaperDay(date, pause?.races, today);
}

export function deriveSessionStatus(session: PlannedSession, logs: SessionLog[], isRest = false, pause?: PauseContext): DisplaySessionState {
  const log = logs.find((l) => l.plannedSessionId === session.id);
  const wasMoved = movedByYou(session);
  if (log) return { status: 'completed', wasMoved, log };
  if (isRest) return { status: 'rest', wasMoved };
  if (session.status === 'skipped') return { status: 'skipped', wasMoved };
  if (session.scheduledDate === todayISO()) return { status: 'today', wasMoved };
  if (isDraftOpen(session, pause?.openDraft, todayISO())) return { status: 'open', wasMoved };
  if (session.scheduledDate < todayISO()) {
    return { status: isPausedDay(session.scheduledDate, pause, todayISO()) ? 'away' : 'missed', wasMoved };
  }
  if (session.status === 'moved') return { status: 'moved', wasMoved: true };
  return { status: 'planned', wasMoved: false };
}

// De duur van een gedane training is die van het log, in hele minuten, nooit die van het plan
// (profielen 14 november, punt A). Een log zonder bruikbare duur (oud, leeg, 0 of negatief) heeft
// geen duur: dan staat er geen getal, ook niet het plan.
export function loggedMinutes(log: Pick<SessionLog, 'durationMinutes'> | undefined): number | undefined {
  const m = log?.durationMinutes;
  if (typeof m !== 'number' || !Number.isFinite(m) || m < 0.5) return undefined;
  return Math.round(m);
}

// De minuten op een rij: met een log die van het log (of geen), zonder log het plan.
export function rowMinutes(log: Pick<SessionLog, 'durationMinutes'> | undefined, plannedMinutes: number): number | undefined {
  return log ? loggedMinutes(log) : plannedMinutes;
}
