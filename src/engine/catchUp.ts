// ASCEND: een gemiste training inhalen (docs/beslissingen/2026-10-29-gemiste-training-inhalen.md).
// De rij van toen blijft historie en wordt niet verplaatst: hij wordt, zoals bij Overslaan dat je zelf
// kiest, overgeslagen (met jouw slot), en er komt een nieuwe rij met hetzelfde sjabloon en dezelfde
// lengte op de gekozen dag. Wie mag, welke rij erbij komt en wat de rijen zeggen. Puur: geen React,
// geen IndexedDB.

import type { PlanLock, PlannedSession, SessionTemplate } from '../models/training';
import type { ScheduleChange } from './scheduler';
import { hasRole } from './templateRoles';
import { addDays, mondayOfWeek, weekdayShortNL } from '../utils/dates';

export type CatchUpRefusal = 'logged' | 'future' | 'old' | 'skipped' | 'rest' | 'race' | 'test' | 'leave' | 'done';
export type CatchUpEligibility = { ok: true } | { ok: false; reason: CatchUpRefusal };

// Een gemiste training: de dag is voorbij, er is geen log, hij is niet overgeslagen en nog niet ingehaald.
// Tot en met de week voor de huidige week. Een herstelwandeling, wedstrijd, test en wat een vakantie of
// tocht neerzette niet (die gaan via hun eigen weg).
export function catchUpEligibility(session: PlannedSession, template: SessionTemplate, args: { logged: boolean; today: string; caughtUp: boolean }): CatchUpEligibility {
  if (args.logged) return { ok: false, reason: 'logged' };
  if (session.scheduledDate >= args.today) return { ok: false, reason: 'future' };
  if (session.status === 'skipped') return { ok: false, reason: 'skipped' };
  if (args.caughtUp) return { ok: false, reason: 'done' };
  if (session.scheduledDate < addDays(mondayOfWeek(args.today), -7)) return { ok: false, reason: 'old' };
  if (template.type === 'recovery') return { ok: false, reason: 'rest' };
  if (hasRole(template, 'race')) return { ok: false, reason: 'race' };
  if (hasRole(template, 'test')) return { ok: false, reason: 'test' };
  if (session.leave) return { ok: false, reason: 'leave' };
  return { ok: true };
}

// Hoort deze verandering van een voorstel bij een inhaal: een gemiste rij die naar vandaag of later gaat.
export function qualifiesForCatchUp(session: PlannedSession, template: SessionTemplate, change: ScheduleChange, args: { logged: boolean; today: string; caughtUp: boolean }): boolean {
  if (change.restore || change.toDate < args.today || change.toDate === change.fromDate) return false;
  return catchUpEligibility(session, template, args).ok;
}

// Is dit voorstel een inhaal: elke verandering haalt een rij van een voorbije dag naar vandaag of later.
// De Akkoord-bladen gebruiken het voor de woorden "Inhalen" en "Toch inhalen".
export function isCatchUpProposal(changes: readonly ScheduleChange[], today: string): boolean {
  return changes.length > 0 && changes.every((c) => !c.restore && c.fromDate < today && c.toDate >= today && c.toDate !== c.fromDate);
}

// De twee rijen die een inhaal schrijft. `session` zelf wordt niet aangepast.
export function catchUpRows(session: PlannedSession, toDate: string, lock: PlanLock, newId: string): { skipped: PlannedSession; added: PlannedSession } {
  const skipped: PlannedSession = { ...session, status: 'skipped', lock };
  const added: PlannedSession = {
    id: newId,
    templateId: session.templateId,
    scheduledDate: toDate,
    weekStartDate: mondayOfWeek(toDate),
    status: 'planned',
    order: session.order,
    ...(session.plannedMinutes !== undefined ? { plannedMinutes: session.plannedMinutes } : {}),
    ...(session.poles !== undefined ? { poles: session.poles } : {}),
    lock,
    catchUp: { fromId: session.id, fromDate: session.scheduledDate },
  };
  return { skipped, added };
}

// Een inhaal die gelezen mag worden: twee teksten, de dag een datum. Een met de hand bewerkt
// bestand kan iets anders bevatten; dat wordt genegeerd (en bij importeren weggelaten).
export function validCatchUp(v: unknown): v is { fromId: string; fromDate: string } {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c.fromId === 'string' && c.fromId.length > 0 && typeof c.fromDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.fromDate);
}

// De rijen die al zijn ingehaald: id van de oude rij, de nieuwe rij. Een nieuwe rij die zelf is
// overgeslagen telt niet meer.
export function caughtUpMap(sessions: readonly PlannedSession[]): Map<string, PlannedSession> {
  const map = new Map<string, PlannedSession>();
  for (const s of sessions) if (validCatchUp(s.catchUp) && s.status !== 'skipped') map.set(s.catchUp.fromId, s);
  return map;
}

const dayShort = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))}`;

// Op de nieuwe rij: "ingehaald van wo 28".
export function catchUpNoteFor(session: PlannedSession): string | undefined {
  return validCatchUp(session.catchUp) ? `ingehaald van ${dayShort(session.catchUp.fromDate)}` : undefined;
}

// Op de oude rij, gegeven de nieuwe: "ingehaald op do 29".
export function caughtUpNoteFor(added: PlannedSession): string {
  return `ingehaald op ${dayShort(added.scheduledDate)}`;
}
