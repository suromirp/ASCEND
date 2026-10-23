// ASCEND: verplaatst door het systeem is niet verplaatst door jou (Warden
// Logica punt 4, docs/beslissingen/2026-10-23-planning-nooit-stil.md).
//
// Vroeger kreeg elke verplaatsing de status 'moved', ook als de weekprescriptie
// of een nieuw krachtblok een training verschoof. lockLevel telde zo'n rij
// daarna als "van jou" (level 1): de weekcontrole kon hem niet meer rechtzetten
// en Vandaag en Week toonden "verplaatst" alsof jij het deed. Nu houdt een
// verplaatsing door het systeem de status 'planned' (engine/proposalEngine.ts).
//
// Dit zoekt de oude rijen die het systeem verplaatste, met het wijzigingslog als
// bewijs: het laatste aangenomen voorstel dat deze rij naar zijn huidige dag
// bracht, kwam van het systeem. Alleen open rijen (vandaag of later, niet
// gelogd), zonder slot. Bij twijfel blijft de rij van jou. Historie verandert
// niet: wat voorbij of gelogd is, blijft zoals het is.
//
// "Van het systeem" moet vaststaan (Warden Planning punt 5). Met Altijd eerst
// vragen nam je de weekprescriptie zelf aan, als coachpunt; dan is de rij van
// jou. Bewijs dat het vanzelf ging: het voorstel werd binnen enkele seconden na
// het uitrekenen vastgelegd, en er is geen eigen Akkoord op een coachpunt van
// die regel rond dat moment. new_training_data telt niet: daar is niet uit op
// te maken wie het deed.
//
// Pure: no React, no IndexedDB.

import type { PlanChangeProposal, EngineEvent } from '../models/planChange';
import type { PlannedSession, SessionLog } from '../models/training';
import type { StoredResponse } from './learning';

// Triggers of proposals the system applies by itself, without your Akkoord.
const SYSTEM_TRIGGERS = new Set<EngineEvent>(['weekly_prescription_computed', 'strength_program_changed']);
// Applied by itself: stored within this many seconds of being worked out.
const AUTO_SECONDS = 10;
// An Akkoord of yours on a coach item this close to the stored proposal was that proposal.
const ACCEPT_SECONDS = 60;
// The coach item the weekly prescription becomes with Altijd eerst vragen.
const ASK_RULES = new Set(['WEEKLY-PRESCRIPTION']);

const seconds = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 1000;

function appliedBySystem(p: PlanChangeProposal, accepts: StoredResponse[]): boolean {
  if (!SYSTEM_TRIGGERS.has(p.trigger) || !p.resolvedAt) return false;
  if (!(seconds(p.resolvedAt, p.createdAt) <= AUTO_SECONDS)) return false;
  return !accepts.some((r) => seconds(r.at, p.resolvedAt!) <= ACCEPT_SECONDS);
}

export function systemMovedRows(
  sessions: PlannedSession[],
  proposals: PlanChangeProposal[],
  logs: Pick<SessionLog, 'plannedSessionId'>[],
  today: string,
  adviceResponses: Record<string, StoredResponse> = {},
): PlannedSession[] {
  const accepts = Object.values(adviceResponses).filter((r) => r.response === 'accepted' && (!r.ruleId || ASK_RULES.has(r.ruleId)));
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const reverted = new Set(proposals.map((p) => p.revertsProposalId).filter(Boolean));
  const accepted = proposals
    .filter((p) => p.resolution === 'accepted' && !reverted.has(p.id))
    .sort((a, b) => (a.resolvedAt ?? a.createdAt).localeCompare(b.resolvedAt ?? b.createdAt));
  // Per session: the trigger of the last accepted proposal that moved it, and where to.
  const lastMove = new Map<string, { bySystem: boolean; toDate?: string }>();
  for (const p of accepted) {
    const bySystem = appliedBySystem(p, accepts);
    for (const item of p.changes) {
      if (!item.plannedSessionId || (item.action !== 'move' && item.action !== 'swap')) continue;
      lastMove.set(item.plannedSessionId, { bySystem, toDate: item.toDate });
    }
  }
  const out: PlannedSession[] = [];
  for (const s of sessions) {
    if (s.status !== 'moved' || s.lock || s.scheduledDate < today || logged.has(s.id)) continue;
    const move = lastMove.get(s.id);
    if (!move || !move.bySystem || move.toDate !== s.scheduledDate) continue;
    out.push({ ...s, status: 'planned' });
  }
  return out;
}
