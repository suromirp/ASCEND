import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { todayISO } from '../utils/dates';
import type { LeavePeriod } from '../models/leave';
import { isAwayFor } from './leave';
import type { IllnessEpisode } from '../models/illness';
import { isIllnessDay } from './illness';
import { isTaperDay } from './raceWindow';

// 'away': voorbij en niet gedaan op een dag van een vakantie of tocht die je meldde, of zonder sportschool als de
// training de sportschool nodig heeft (engine/leave.ts#isAwayFor), of op een dag dat je ziek gemeld was (engine/illness.ts#isIllnessDay). Heet
// Vervallen, nooit gemist. Een dag vóór de melding blijft gemist. Wat je op zo'n dag wel logde, is gedaan en telt
// mee: dezelfde afleiding als de weekterugblik, de ring in Week en de reeks (engine/weekLogs.ts#leftOutOfCount,
// engine/streak.ts) en als de kaart Vervallen op Vandaag (engine/missedTraining.ts#planMissed), via isPausedFor.
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

// De sjablonen, om te weten wat de sportschool nodig heeft (engine/leave.ts#isAwayFor).
export type TemplateLookup = ReadonlyMap<string, Pick<SessionTemplate, 'id' | 'type'>> | readonly Pick<SessionTemplate, 'id' | 'type'>[];
export function templateIn(templates: TemplateLookup | undefined, id: string): Pick<SessionTemplate, 'id' | 'type'> | undefined {
  if (!templates) return undefined;
  return 'get' in templates ? templates.get(id) : templates.find((t) => t.id === id);
}

interface PauseBase {
  illness?: IllnessEpisode[];
  // De dagen van de races in de planning (engine/raceWindow.ts#raceDatesOf).
  races?: readonly string[];
  // De geplande sessie waar nog een concept van in Forge ligt (openDraftId), of niets.
  openDraft?: string;
}
// Wie de periodes meegeeft, geeft ook de sjablonen mee: zonder sportschool telt alleen wat de sportschool nodig heeft
// als weg (docs/beslissingen/2026-11-15-week-telling-zonder-sportschool.md). Verplicht, zodat geen scherm stil een
// andere telling maakt.
export type PauseContext = PauseBase & ({ leave?: undefined; templates?: TemplateLookup } | { leave: LeavePeriod[] | undefined; templates: TemplateLookup });

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

// Een training binnen een pauze die je meldde: ziek (tot en met de dag van beter melden, of tot vandaag), weg
// (engine/leave.ts#isAwayFor: vakantie en tocht alles, zonder sportschool alleen wat de sportschool nodig heeft), of
// uit de afbouw van een race die er al was. De ene toets voor Vervallen; wie een voorbije dag toont, geeft
// { leave, templates, illness, races } mee.
export function isPausedFor(session: Pick<PlannedSession, 'scheduledDate' | 'templateId'>, pause: PauseContext | undefined, today: string): boolean {
  const date = session.scheduledDate;
  return (!!pause?.leave?.length && isAwayFor(date, templateIn(pause.templates, session.templateId), pause.leave))
    || isIllnessDay(date, pause?.illness, today) || isTaperDay(date, pause?.races, today);
}

// Gemist: voorbij (vandaag telt nog niet, ook niet als de dag bijna om is), zonder log, niet overgeslagen, niet in
// een pauze en niet lopend in Forge. Dezelfde afleiding als de stand 'missed' hieronder; Week telt er de kaart
// "Je hebt n training gemist" mee (engine/weekList.ts#missedInWeek).
export function isMissedSession(session: PlannedSession, loggedIds: ReadonlySet<string | undefined>, today: string, pause?: PauseContext): boolean {
  if (loggedIds.has(session.id) || session.status === 'skipped' || session.scheduledDate >= today) return false;
  return !isDraftOpen(session, pause?.openDraft, today) && !isPausedFor(session, pause, today);
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
    return { status: isPausedFor(session, pause, todayISO()) ? 'away' : 'missed', wasMoved };
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
