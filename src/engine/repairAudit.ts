// ASCEND: wat de planningsronde aan de duur of de soort van een training veranderde, als regels voor het
// auditrecord van de weekcontrole (docs/visie/Ontwerp Losse sport.md, Ontwerp 9). De melding Planning bijgewerkt
// leeft alleen in het geheugen; dit record blijft, zodat het Logboek van voorstellen later nog laat zien welke
// training van hoeveel naar hoeveel minuten ging. Elke ronde schrijft een nieuw record; er wordt nooit iets
// omgeschreven. Een training die alleen van dag wisselt, erbij kwam of eruit ging, staat hier niet: dat zegt de
// melding al en de duur bleef gelijk.
//
// Puur: geen React, geen IndexedDB.

import type { Program } from '../models/program';
import type { PlanChangeItem, PlanChangeProposal, RecentPlanChange } from '../models/planChange';
import type { PlannedSession, SessionTemplate } from '../models/training';
import { plannedMinutesOf } from './substitutions';

const SOURCE = 'engine/weekValidator.ts';

export interface RepairAuditInput {
  // De trainingen die de ronde aanpaste en die de melding noemt.
  ids: readonly string[];
  // Zoals ze opgeslagen stonden voor de ronde, en zoals de ronde ze liet.
  before: ReadonlyMap<string, PlannedSession>;
  after: ReadonlyMap<string, PlannedSession>;
  templates: ReadonlyMap<string, SessionTemplate>;
  program: Program | null;
  // De regel van de melding bij die training, als reden.
  reasonOf?: (id: string) => string | undefined;
}

export function repairAuditItems(input: RepairAuditInput): PlanChangeItem[] {
  const items: PlanChangeItem[] = [];
  for (const id of new Set(input.ids)) {
    const was = input.before.get(id);
    const now = input.after.get(id);
    if (!was || !now || was.status === 'skipped' || now.status === 'skipped') continue;
    const tWas = input.templates.get(was.templateId);
    const tNow = input.templates.get(now.templateId);
    if (!tWas || !tNow) continue;
    const fromMinutes = plannedMinutesOf(was, tWas, input.program);
    const toMinutes = plannedMinutesOf(now, tNow, input.program);
    const kind = was.templateId !== now.templateId;
    if (!kind && fromMinutes === toMinutes) continue;
    const reason = input.reasonOf?.(id);
    items.push({
      plannedSessionId: id,
      action: 'move',
      fromDate: was.scheduledDate,
      toDate: now.scheduledDate,
      fromMinutes,
      toMinutes,
      ...(kind ? { templateId: now.templateId } : {}),
      ...(reason ? { reason } : {}),
      generatedBy: [SOURCE],
    });
  }
  return items;
}

export const PLAN_CHECK_WHY = 'Na elke wijziging gaan je weken langs vaste regels: je rustdag vrij, niet te veel op een dag, genoeg ruimte tussen zware dagen, frisse benen voor een test. Wat vanzelf gepland was, wordt dan rechtgezet. Wat jij zelf zette en je test of wedstrijd schuiven nooit; daarvoor krijg je een voorstel.';

// Het record van één ronde van de weekcontrole: al beslist (accepted), met de regels van de melding en de
// wijzigingen in duur of soort. Een nieuw id per ronde; een eerder record blijft zoals het is.
export function planCheckRecord(repaired: { lines: readonly string[]; items?: readonly PlanChangeItem[] }, id: string, now: string): PlanChangeProposal {
  return {
    id,
    trigger: 'plan_check',
    issue: 'Weekcontrole',
    changes: [...(repaired.items ?? [])],
    alternatives: [],
    consequences: repaired.lines.join('; '),
    explanation: PLAN_CHECK_WHY,
    createdAt: now,
    resolvedAt: now,
    resolution: 'accepted',
  };
}

// Komt de ronde binnen 15 seconden na een wijziging van jou (verplaatsen, een Akkoord), dan voegen de regels zich bij
// die melding: ongedaan maken zet alles terug zoals het voor jouw wijziging stond. Het record van de ronde gaat mee
// (`alsoReverts`), zodat ongedaan maken ook dat record terugdraait (storage/undoPlanChange.ts). Zonder dat bleef een
// wijziging van de ronde in het Logboek en in Aangepast door ASCEND staan, terwijl de rij al terug was.
export const JOIN_WINDOW_MS = 15_000;

export function joinsNotice(prev: RecentPlanChange | null, nowMs: number): prev is RecentPlanChange {
  return !!prev && !prev.failed && prev.trigger !== 'plan_check' && nowMs - Date.parse(prev.createdAt) < JOIN_WINDOW_MS;
}

export function joinPlanCheck(
  prev: RecentPlanChange,
  repaired: { lines: readonly string[]; stored: readonly PlannedSession[]; addedIds?: readonly string[] },
  recordId: string,
): RecentPlanChange {
  const known = new Set(prev.before.map((s) => s.id));
  return {
    ...prev,
    lines: [...prev.lines, ...repaired.lines],
    before: [...prev.before, ...repaired.stored.filter((s) => !known.has(s.id))],
    addedIds: [...prev.addedIds, ...(repaired.addedIds ?? [])],
    alsoReverts: [...(prev.alsoReverts ?? []), recordId],
  };
}
