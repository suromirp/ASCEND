// ASCEND — Goal Arbiter (Technical Architecture v0.3.1 REVISED, Phase 4;
// Algorithm Contract v0.2b REVISED §23-§24, §32-§33, §39).
//
// Cross-goal conflict resolution: which goal wins a contested slot when one
// session's SessionContribution links it to more than one active goal.
// Inputs per the engine module map: GoalFocus, SessionRole, taper state,
// strategy. Never computes capability itself — every signal it reads
// (GoalFocus, ProgressionDecision, CapabilityGap-derived bottlenecks) is
// already computed elsewhere.

import type { SessionContribution, GoalFocus } from '../models/feasibility';
import type { ProgressionDecision } from '../models/progression';
import type { TrainingStrategyProfile } from '../models/goalEngineConfig';
import type { SessionRole } from '../models/prescription';

// --- Contested slots (§39: goal pressure changes priority, not evidence) ---

export interface ContestedSlot {
  plannedSessionId: string;
  goalIds: string[]; // always length >= 2
}

export function detectContestedSlots(contributions: SessionContribution[]): ContestedSlot[] {
  const goalIdsBySession = new Map<string, Set<string>>();
  for (const c of contributions) {
    if (!goalIdsBySession.has(c.plannedSessionId)) goalIdsBySession.set(c.plannedSessionId, new Set());
    goalIdsBySession.get(c.plannedSessionId)!.add(c.goalId);
  }
  return [...goalIdsBySession.entries()]
    .filter(([, goalIds]) => goalIds.size > 1)
    .map(([plannedSessionId, goalIds]) => ({ plannedSessionId, goalIds: [...goalIds] }));
}

export interface ArbitrationResult {
  plannedSessionId: string;
  winningGoalId: string;
  // Never "removed" — the session still counts as real SessionContribution
  // evidence for every goal it serves; only its ROLE designation (key vs.
  // support) is decided in favor of one goal for this occurrence (§39: a
  // deadline changes which KEY-session gets protected, never the
  // underlying evidence/history).
  deprioritizedGoalIds: string[];
  reason: string;
}

// Highest normalized Goal Focus wins; ties break on goalId for a
// deterministic result (SYSTEM_INVARIANTS: same input -> same output).
export function arbitrateContestedSlot(slot: ContestedSlot, goalFocusById: Map<string, GoalFocus>): ArbitrationResult {
  const ranked = [...slot.goalIds].sort((a, b) => {
    const diff = (goalFocusById.get(b)?.normalizedPct ?? 0) - (goalFocusById.get(a)?.normalizedPct ?? 0);
    return diff !== 0 ? diff : a.localeCompare(b);
  });
  const [winningGoalId, ...deprioritizedGoalIds] = ranked;
  const winningPct = goalFocusById.get(winningGoalId)?.normalizedPct;

  return {
    plannedSessionId: slot.plannedSessionId,
    winningGoalId,
    deprioritizedGoalIds,
    reason:
      winningPct !== undefined
        ? `Deze sessie draagt bij aan meerdere doelen; ${winningGoalId} heeft op dit moment de hoogste Goal Focus (${Math.round(winningPct)}%).`
        : `Deze sessie draagt bij aan meerdere doelen; ${winningGoalId} krijgt voorrang.`,
  };
}

// --- Taper/freshen trigger (§32-§33) -----------------------------------------

// ASCEND_HEURISTIC window (HEURISTIC-ADVENTURE-FRESHEN, seeded in Phase 1
// from E-TAPER-001/002 — endurance taper evidence supports benefit up to
// roughly 21 days; the exact discipline/individual window stays heuristic).
// First consumer: Phase 3's Progression Orchestrator deliberately never
// produces 'taper' itself — proximity-to-goal is a Goal Arbiter concern,
// not something the orchestrator (which only sees capability/readiness/
// guardrails) can determine on its own. Exported so engine/goalOverview.ts
// can derive the same "is this goal tapering" flag Goal Focus's `phase`
// component reads, from one single source of truth.
export const TAPER_WINDOW_DAYS = 21;

// A goal in its taper window overrides ANY non-recover decision to
// 'taper' — Goal Focus can rise while training volume drops (§32); a
// genuine 'recover' need (poor readiness/response) is never masked by
// tapering, so that state is left untouched.
export function applyTaperOverride(decision: ProgressionDecision, daysToGoal: number | undefined): ProgressionDecision {
  if (daysToGoal === undefined || daysToGoal < 0 || daysToGoal > TAPER_WINDOW_DAYS) return decision;
  if (decision.state === 'recover' || decision.state === 'taper') return decision;

  return {
    ...decision,
    state: 'taper',
    reason: `${decision.reason} Doel is over ${daysToGoal} dag${daysToGoal === 1 ? '' : 'en'} — tapering: vermoeidheid verlagen, relevante prikkel behouden.`,
    ruleId: 'HEURISTIC-ADVENTURE-FRESHEN',
  };
}

// --- Strength preservation (§24) ---------------------------------------------

// "endurance goal active ≠ strength automatically delete." ASCEND may bring
// strength down to maintenance when training room is limited, but never
// lower — 'maintenance' is the floor, not 'optional' (droppable) or
// 'recovery' (this session no longer serves its own purpose at all).
export function preserveStrengthRole(candidateRole: SessionRole, strengthProtection: TrainingStrategyProfile['strengthProtection']): SessionRole {
  if (strengthProtection === 'low') return candidateRole;
  if (candidateRole === 'optional') return 'maintenance';
  return candidateRole;
}
