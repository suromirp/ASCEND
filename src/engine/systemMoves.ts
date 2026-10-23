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
// Pure: no React, no IndexedDB.

import type { PlanChangeProposal, EngineEvent } from '../models/planChange';
import type { PlannedSession, SessionLog } from '../models/training';

// Triggers of proposals the system applies by itself, without your Akkoord.
const SYSTEM_TRIGGERS = new Set<EngineEvent>(['weekly_prescription_computed', 'strength_program_changed', 'new_training_data']);

export function systemMovedRows(sessions: PlannedSession[], proposals: PlanChangeProposal[], logs: Pick<SessionLog, 'plannedSessionId'>[], today: string): PlannedSession[] {
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  const reverted = new Set(proposals.map((p) => p.revertsProposalId).filter(Boolean));
  const accepted = proposals
    .filter((p) => p.resolution === 'accepted' && !reverted.has(p.id))
    .sort((a, b) => (a.resolvedAt ?? a.createdAt).localeCompare(b.resolvedAt ?? b.createdAt));
  // Per session: the trigger of the last accepted proposal that moved it, and where to.
  const lastMove = new Map<string, { trigger: EngineEvent; toDate?: string }>();
  for (const p of accepted) {
    for (const item of p.changes) {
      if (!item.plannedSessionId || (item.action !== 'move' && item.action !== 'swap')) continue;
      lastMove.set(item.plannedSessionId, { trigger: p.trigger, toDate: item.toDate });
    }
  }
  const out: PlannedSession[] = [];
  for (const s of sessions) {
    if (s.status !== 'moved' || s.lock || s.scheduledDate < today || logged.has(s.id)) continue;
    const move = lastMove.get(s.id);
    if (!move || !SYSTEM_TRIGGERS.has(move.trigger) || move.toDate !== s.scheduledDate) continue;
    out.push({ ...s, status: 'planned' });
  }
  return out;
}
