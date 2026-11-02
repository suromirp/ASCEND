// ASCEND: de dagen waarop je een sport deed die meetelt, zoals de weekcheck ze leest (docs/visie/Sporten die
// meetellen.md, 3.4). Een gelogde padelpartij of voetbalwedstrijd is voor de check een vaste dag in het
// verleden met het profiel van die sport: een zware beendag van ASCEND binnen de rust erna is een bevinding
// van LEG-SPACING. Die wordt nooit stil gerepareerd: ze komt als voorstel met Akkoord in Week
// (engine/weekValidator.ts#repairWeeks, engine/weekFixProposal.ts). Afgeleid, nooit opgeslagen.
// Puur: geen React, geen IndexedDB.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { addDays, daysBetween, mondayOfWeek } from '../utils/dates';
import { legRestHours, stressProfileOf, type SportIntensity } from './sportStress';
import { anySportDefinition, type CountedSportId } from '../data/sports';
import { sportTemplate } from './sportTemplate';

export const SPORT_LOG_PREFIX = 'sportlog:';
// Hoe ver terug een gelogde sport meetelt voor de check: langer dan 72 uur doet hij er niet meer toe.
const LOOK_BACK_DAYS = 4;

export const isSportLogSession = (id: string): boolean => id.startsWith(SPORT_LOG_PREFIX);
export const sportLogIdOf = (id: string): string | undefined => (isSportLogSession(id) ? id.slice(SPORT_LOG_PREFIX.length) : undefined);

// Hoe zwaar het was, uit de RPE: 7 of meer zwaar, 5 of 6 pittig, lager rustig. Zonder eigen antwoord de
// gebruikelijke zwaarte van de sport.
export function intensityOfLog(log: Pick<SessionLog, 'rpe' | 'rpeAssumed'>, sport: CountedSportId): SportIntensity {
  if (log.rpe === undefined || log.rpeAssumed) return anySportDefinition(sport).typicalIntensity;
  return log.rpe >= 7 ? 'high' : log.rpe >= 5 ? 'moderate' : 'low';
}

// De rust na een zware sport: Ruim (72 en 48 uur, het advies) of Korter (48 en 24).
export function restHoursFor(sport: CountedSportId, intensity: SportIntensity, short: boolean): number {
  // Rustig gespeeld telt voor de benen, maar niet als zware dag.
  if (intensity === 'low') return 0;
  const hours = legRestHours(stressProfileOf(anySportDefinition(sport), intensity));
  return short && hours > 0 ? hours - 24 : hours;
}

// Het afgeleide sjabloon van een sportdag met zijn zwaarte en rust.
export function sportDayTemplate(base: SessionTemplate, sport: CountedSportId, intensity: SportIntensity): SessionTemplate {
  const hours = restHoursFor(sport, intensity, !!base.restShort);
  return { ...sportTemplate(sport, intensity), id: `${base.id}@${intensity}`, legRestHours: hours, ...(base.restShort ? { restShort: true } : {}) };
}

// De gelogde sportdagen van de laatste dagen, als vaste rijen in het verleden. Alleen een sport die meetelt
// (zijn sjabloon staat in `byId`) en alleen een die je benen echt belast.
export function sportLogDays(logs: readonly SessionLog[], byId: ReadonlyMap<string, SessionTemplate>, today: string): { sessions: PlannedSession[]; templates: SessionTemplate[] } {
  const sessions: PlannedSession[] = [];
  const templates = new Map<string, SessionTemplate>();
  for (const log of logs) {
    const sport = log.countedSport;
    if (!sport || log.completedDate > today || daysBetween(log.completedDate, today) > LOOK_BACK_DAYS) continue;
    const base = byId.get(log.templateId);
    if (!base || base.countedSport !== sport) continue;
    const intensity = intensityOfLog(log, sport);
    const tpl = sportDayTemplate(base, sport, intensity);
    if (!tpl.legRestHours) continue;
    templates.set(tpl.id, tpl);
    sessions.push({
      id: `${SPORT_LOG_PREFIX}${log.id}`,
      templateId: tpl.id,
      scheduledDate: log.completedDate,
      weekStartDate: mondayOfWeek(log.completedDate),
      status: 'planned',
      order: 99,
      // Wat je deed is van jou: de check verplaatst het nooit.
      lock: { by: 'user', at: log.completedAt },
    });
  }
  return { sessions, templates: [...templates.values()] };
}

// "Je speelde gisteren padel." Het droge feit voor een melding in Week.
export function sportDoneLine(sport: CountedSportId, date: string, today: string): string {
  const ago = daysBetween(date, today);
  const when = ago === 0 ? 'vandaag' : ago === 1 ? 'gisteren' : ago === 2 ? 'eergisteren' : `op ${weekdayName(date)}`;
  if (sport === 'swimming') return `Je zwom ${when}.`;
  return `Je speelde ${when} ${anySportDefinition(sport).label.toLowerCase()}.`;
}

function weekdayName(iso: string): string {
  const names = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
  const monday = mondayOfWeek(iso);
  for (let i = 0; i < 7; i++) if (addDays(monday, i) === iso) return names[i];
  return '';
}
