// ASCEND: de dagen rond een race, op één plek (backlog R, Warden planner 14 november;
// docs/beslissingen/2026-11-15-na-de-race.md).
//
// - De afbouw: de zeven dagen voor een race (RACE_GUARD_DAYS). Daarin geen inhaaladvies
//   (engine/adviceShared.ts#raceWeekGuard).
// - De herstelweek: de zeven dagen na een race. Daarin wordt niets ingehaald (`afterRaceGuard`).
// - Een training uit de afbouw die niet gedaan is, vervalt zodra de racedag er is: geen vraag
//   "Niet gedaan?", geen inhaaladvies, en hij telt niet als gemist (`isTaperDay`, gelezen door
//   engine/sessionStatus.ts#isPausedFor en engine/weekLogs.ts#leftOutOfCount).
//
// Een race is een geplande sessie met de rol 'race'; of hij gelogd is, maakt niet uit (zoals raceWeekGuard). Een race
// die vóór zijn dag is overgeslagen (afgezegd) telt niet. Een race die je op of na zijn dag overslaat (Niet gedaan)
// telt wel: een antwoord op de race zelf klapt het venster niet terug (Warden, 15 november). Een race die alleen als
// tussendoel bestaat, staat altijd ook als race in de planning (engine/raceBlock.ts); `raceGoals` van het advies kent
// alleen races van vandaag of later en zegt na de race niets meer.
// Afgeleid: niets wordt opgeslagen of herschreven. Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionTemplate } from '../models/training';
import { idHasRole } from './templateRoles';
import { daysBetween, localDateOf } from '../utils/dates';

// De afbouw voor een race en de herstelweek erna, in dagen.
export const RACE_GUARD_DAYS = 7;

// De dagen van alle races in de planning, oplopend, elk één keer.
export function raceDatesOf(
  plannedSessions: readonly Pick<PlannedSession, 'templateId' | 'scheduledDate' | 'status' | 'lock'>[],
  templates: readonly SessionTemplate[] | ReadonlyMap<string, SessionTemplate>,
): string[] {
  const byId = templates instanceof Map ? templates : new Map((templates as readonly SessionTemplate[]).map((t) => [t.id, t]));
  const dates = new Set<string>();
  for (const s of plannedSessions) if (stillARace(s) && idHasRole(s.templateId, 'race', byId)) dates.add(s.scheduledDate);
  return [...dates].sort();
}

// Overgeslagen op of na de eigen dag (de vraag Niet gedaan, of overslaan in Week op de racedag): de race blijft
// tellen. Zonder moment van overslaan is niet te zeggen wanneer het was, dan telt hij niet.
function stillARace(s: Pick<PlannedSession, 'scheduledDate' | 'status' | 'lock'>): boolean {
  if (s.status !== 'skipped') return true;
  const at = s.lock?.at;
  return !!at && localDateOf(at) >= s.scheduledDate;
}

// Een dag in de afbouw van een race die vandaag al is of voorbij is: wat daar niet gedaan is, vervalt. Een racedag
// hoort er nooit bij, ook niet in de afbouw van een tweede race: een race is geen training uit de afbouw en een
// niet gelogde race blijft gemist (op een racedag staat verder niets, engine/raceBlock.ts).
export function isTaperDay(date: string, races: readonly string[] | undefined, today: string): boolean {
  const list = races ?? [];
  if (list.includes(date)) return false;
  return list.some((r) => r <= today && date < r && daysBetween(date, r) <= RACE_GUARD_DAYS);
}

// Vandaag in de herstelweek na een race (de dag na tot en met zeven dagen na): niets inhalen.
export function afterRaceGuard(asOf: string, races: readonly string[] | undefined): boolean {
  return (races ?? []).some((r) => r < asOf && daysBetween(r, asOf) <= RACE_GUARD_DAYS);
}
