// ASCEND: wanneer een losse log (van het horloge of MacroFactor, niet aan een geplande training gekoppeld) bij
// een geplande training hoort. Eén maatstaf voor de koppeling achteraf (engine/missedTraining.ts#linkCandidates)
// en voor het tellen van een open training (engine/standing.ts#weeklyLoad), zodat de twee niet uit elkaar lopen:
// een log van een bron, dezelfde soort (kracht of de precieze sport), en een test of wedstrijd alleen tegen een
// test of wedstrijd. Een handlog is altijd extra, nooit in plaats van. Puur: verandert geen log.

import type { PlannedSession, SessionLog, SessionTemplate } from '../models/training';
import { logSport, templateSport } from './sports';
import { isHandLog } from './activityImport';
import { isTestOrRace } from './templateRoles';

// De soort van een training: kracht, of de sport (data/sports.ts). Een rustdag heeft geen soort.
export function templateKind(t: SessionTemplate): string | undefined {
  if (t.type === 'recovery') return undefined;
  if (t.type === 'strength') return 'strength';
  return templateSport(t);
}
export function logKind(l: SessionLog): string | undefined {
  if (l.type === 'recovery') return undefined;
  if (l.type === 'strength') return 'strength';
  return logSport(l);
}

// Een log van het horloge of MacroFactor die nergens aan hangt. `plannedIds` erbij: een log die naar een
// training wijst die niet meer bestaat (na een herplanning met nieuwe id's) telt ook als los.
export function isLooseSourceLog(l: SessionLog, plannedIds?: ReadonlySet<string>): boolean {
  if (isHandLog(l)) return false;
  return !l.plannedSessionId || (!!plannedIds && !plannedIds.has(l.plannedSessionId));
}

// Kan deze log bij deze training horen: zelfde soort, en test of wedstrijd alleen tegen test of wedstrijd.
export function sameLinkKind(log: SessionLog, logTemplate: SessionTemplate | undefined, template: SessionTemplate): boolean {
  const kind = logKind(log);
  if (!kind || templateKind(template) !== kind) return false;
  return (!!logTemplate && isTestOrRace(logTemplate)) === isTestOrRace(template);
}

// De open trainingen (niet overgeslagen, geen eigen log) waar een losse log van een bron op dezelfde dag voor
// instaat. Elke log dekt hoogstens één training; staan er twee van dezelfde soort, dan die met de duur die het
// dichtst bij de log ligt. Wat overblijft is extra. Sleutel: id van de training.
export function looseStandIns(input: {
  plannedSessions: readonly PlannedSession[];
  logs: readonly SessionLog[];
  templates: readonly SessionTemplate[];
  minutesOf: (s: PlannedSession, t: SessionTemplate) => number;
}): Set<string> {
  const byId = new Map(input.templates.map((t) => [t.id, t]));
  const plannedIds = new Set(input.plannedSessions.map((s) => s.id));
  const logged = new Set(input.logs.map((l) => l.plannedSessionId).filter((id): id is string => !!id && plannedIds.has(id)));
  const onDay = new Map<string, PlannedSession[]>();
  for (const s of input.plannedSessions) onDay.set(s.scheduledDate, [...(onDay.get(s.scheduledDate) ?? []), s]);
  const covered = new Set<string>();
  const loose = input.logs
    .filter((l) => isLooseSourceLog(l, plannedIds))
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id));
  for (const log of loose) {
    const logTemplate = byId.get(log.templateId);
    const best = (onDay.get(log.completedDate) ?? [])
      .filter((s) => s.status !== 'skipped' && !logged.has(s.id) && !covered.has(s.id))
      .map((s) => ({ s, t: byId.get(s.templateId) }))
      .filter((x): x is { s: PlannedSession; t: SessionTemplate } => !!x.t && sameLinkKind(log, logTemplate, x.t))
      .map((x) => ({ id: x.s.id, d: Math.abs(input.minutesOf(x.s, x.t) - log.durationMinutes) }))
      .sort((a, b) => a.d - b.d || a.id.localeCompare(b.id))[0];
    if (best) covered.add(best.id);
  }
  return covered;
}
