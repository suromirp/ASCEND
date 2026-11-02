// ASCEND: welke bron voorgaat als dezelfde training of ochtend twee keer binnenkomt
// (docs/beslissingen/2026-11-02-health-connect.md).
//
// Een loop van het horloge komt via intervals.icu en, als Health Connect aan staat, ook via
// Health Connect. Dat is één training. intervals.icu gaat voor: het heeft de hartslag, de
// hoogtemeters, de reeksen en de correcties. Wat Health Connect daarnaast geeft telt alleen
// waar intervals.icu niets heeft.
//
// Puur en zonder namen van een leverancier in de velden: alleen het begin van een externalId of
// id ("health-connect:") zegt waar iets vandaan kwam, net als elders in de app.

import type { ExternalActivity } from './activityImport';
import type { SessionLog } from '../models/training';
import type { RecoveryMetric } from '../models/metrics';

// Bronnen die achter de andere komen: wat zij brengen is een aanvulling.
export const SECONDARY_SOURCES: readonly string[] = ['health-connect'];

// "Zelfde start binnen enkele minuten en ongeveer dezelfde duur".
export const SAME_START_MINUTES = 5;
export const SAME_DURATION_MINUTES = 5;
export const SAME_DURATION_RATIO = 0.15;

export interface Moment {
  externalId: string;
  startMs: number;
  minutes: number;
}

// "intervals.icu:i42" -> "intervals.icu".
export function sourcePrefix(id: string): string {
  const at = id.indexOf(':');
  return at < 0 ? id : id.slice(0, at);
}

export const isSecondary = (id: string): boolean => SECONDARY_SOURCES.includes(sourcePrefix(id));

export function durationsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(SAME_DURATION_MINUTES, Math.max(a, b) * SAME_DURATION_RATIO);
}

// Het begin van een activiteit staat in lokale tijd zonder zone ("2026-10-20T07:30:00"), net
// als bij het maken van een log (engine/activityImport.ts#activityToDraft).
export function momentOfActivity(a: Pick<ExternalActivity, 'externalId' | 'start' | 'durationSec'>): Moment {
  return { externalId: a.externalId, startMs: new Date(a.start).getTime(), minutes: a.durationSec / 60 };
}

// Een log weet wanneer hij klaar was en hoe lang hij duurde. Alleen een log met een bron-id
// telt hier: een training die je met de hand invulde koppelt de gewone voorstelronde
// (engine/activityImport.ts#pairWithManualLogs).
export function momentOfLog(l: Pick<SessionLog, 'externalId' | 'completedAt' | 'durationMinutes'>): Moment | undefined {
  if (!l.externalId) return undefined;
  const end = Date.parse(l.completedAt);
  if (!Number.isFinite(end) || !(l.durationMinutes > 0)) return undefined;
  return { externalId: l.externalId, startMs: end - l.durationMinutes * 60_000, minutes: l.durationMinutes };
}

export function isSameMoment(a: Moment, b: Moment): boolean {
  return Math.abs(a.startMs - b.startMs) <= SAME_START_MINUTES * 60_000 && durationsMatch(a.minutes, b.minutes);
}

// De tegenhanger uit een andere bron: zelfde moment, ander begin van het id.
const twinIn = (m: Moment, others: readonly Moment[]) => others.some((o) => sourcePrefix(o.externalId) !== sourcePrefix(m.externalId) && isSameMoment(m, o));

// De activiteiten die als voorstel of om af te vinken in aanmerking komen. `primary` (intervals.icu)
// blijft, behalve wat al als log uit een andere bron bestaat. `secondary` (Health Connect) valt ook
// weg als intervals.icu dezelfde activiteit heeft, in de recente lijst of in `alsoKnown` (de
// oudere lijst voor "Garmin is leidend"). Een log uit dezelfde bron laat de activiteit staan:
// dat ziet de gewone voorstelronde aan het id.
export function offeredActivities(
  primary: readonly ExternalActivity[],
  secondary: readonly ExternalActivity[],
  logs: readonly SessionLog[],
  alsoKnown: readonly ExternalActivity[] = [],
): ExternalActivity[] {
  const logMoments = logs.map(momentOfLog).filter((m): m is Moment => !!m);
  // Voor intervals.icu verandert er niets: alleen een log dat uit Health Connect kwam, houdt het
  // tegen. Een log uit MacroFactor naast een krachttraining van het horloge gaat zijn gewone gang
  // (engine/macrofactorLink.ts).
  const secondaryLogMoments = logMoments.filter((m) => isSecondary(m.externalId));
  const keptPrimary = primary.filter((a) => !twinIn(momentOfActivity(a), secondaryLogMoments));
  const primaryMoments = [...primary, ...alsoKnown].map(momentOfActivity);
  const seen = new Set(keptPrimary.map((a) => a.externalId));
  const keptSecondary: ExternalActivity[] = [];
  for (const a of secondary) {
    if (seen.has(a.externalId)) continue;
    const m = momentOfActivity(a);
    if (twinIn(m, primaryMoments) || twinIn(m, logMoments)) continue;
    seen.add(a.externalId);
    keptSecondary.push(a);
  }
  return [...keptPrimary, ...keptSecondary];
}

// De ochtendgetallen in de volgorde waarin ze tellen: wie een dag leest neemt het eerste getal
// (engine/wellnessCheck.ts#dayRecord, #baselineValues), dus een aanvullende bron komt achteraan.
// Een nieuwe lijst; de volgorde binnen elke groep blijft.
export function orderBySource(metrics: readonly RecoveryMetric[]): RecoveryMetric[] {
  return [...metrics.filter((m) => !isSecondary(m.id)), ...metrics.filter((m) => isSecondary(m.id))];
}
