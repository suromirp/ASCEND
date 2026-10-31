// ASCEND: de eerstvolgende testloop of wedstrijd, voor de kaart met je beenmoeheid en de
// voorstellen. Een sessie is een test of wedstrijd door zijn rol (engine/templateRoles.ts),
// nooit door een sjabloon-id.
//
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog } from '../models/training';
import { daysBetween } from '../utils/dates';
import { idHasRole, idIsTestOrRace, type RoleCarrier } from './templateRoles';

type Templates = Iterable<RoleCarrier> | ReadonlyMap<string, RoleCarrier>;

export type TestOrRaceKind = 'test' | 'race';

// Wedstrijd of test, voor een sjabloon-id. Een wedstrijd gaat voor.
export function testOrRaceKind(templateId: string, templates?: Templates): TestOrRaceKind {
  return idHasRole(templateId, 'race', templates) ? 'race' : 'test';
}

// De eerstvolgende testloop of wedstrijd binnen `withinDays` dagen: niet overgeslagen, nog zonder log.
export function nextTestOrRace(
  sessions: readonly PlannedSession[],
  logs: readonly Pick<SessionLog, 'plannedSessionId'>[],
  today: string,
  templates?: Templates,
  withinDays = 14,
): { session: PlannedSession; kind: TestOrRaceKind } | undefined {
  const logged = new Set(logs.map((l) => l.plannedSessionId));
  const session = sessions
    .filter((s) => idIsTestOrRace(s.templateId, templates) && s.status !== 'skipped' && !logged.has(s.id) && s.scheduledDate >= today && daysBetween(today, s.scheduledDate) <= withinDays)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  return session ? { session, kind: testOrRaceKind(session.templateId, templates) } : undefined;
}

// Staat er die dag een test of wedstrijd die niet vervalt of weggaat? Voor een voorbeeld van een voorstel.
export function hasTestOrRaceThatDay(entries: readonly { templateId: string; change?: string }[], templates?: Templates): boolean {
  return entries.some((e) => idIsTestOrRace(e.templateId, templates) && e.change !== 'weg' && e.change !== 'vervalt');
}
