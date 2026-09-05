// ASCEND — read-only Goal Focus / Feasibility overview (Technical
// Architecture v0.3.1 REVISED, Phase 4). Never writable, never presented as
// a workload percentage — engine/goalFocus.ts's own "Must NOT" constraint.
// Renders nothing when there are no active (targetDate-bearing) goals.

import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { extractEvidenceFromLogs } from '../engine/capability';
import { computeActiveGoalOverviews } from '../engine/goalOverview';
import { todayISO } from '../utils/dates';
import type { FeasibilityStatus } from '../models/feasibility';
import { Card, Eyebrow } from './ui';

const FEASIBILITY_LABEL: Record<FeasibilityStatus, { label: string; color: string }> = {
  on_track: { label: 'OP SCHEMA', color: 'var(--color-success)' },
  challenging: { label: 'UITDAGEND', color: 'var(--color-warning)' },
  unlikely: { label: 'ONWAARSCHIJNLIJK', color: 'var(--color-danger)' },
  insufficient_data: { label: 'TE WEINIG DATA', color: 'var(--color-ink-dim)' },
};

export function GoalFocusCard() {
  const { trainingGoals, sessionLogs, capabilityEvidence, goalEngineConfig } = useAppData();

  const overviews = useMemo(() => {
    const allEvidence = [...extractEvidenceFromLogs(sessionLogs), ...capabilityEvidence];
    return computeActiveGoalOverviews(
      trainingGoals,
      allEvidence,
      goalEngineConfig.availability,
      goalEngineConfig.guardrails,
      todayISO(),
    ).sort((a, b) => b.focus.normalizedPct - a.focus.normalizedPct);
  }, [trainingGoals, sessionLogs, capabilityEvidence, goalEngineConfig]);

  if (overviews.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4">
      <Eyebrow>DOELFOCUS</Eyebrow>
      {overviews.map(({ goal, feasibility, focus }, i) => {
        const badge = FEASIBILITY_LABEL[feasibility.status];
        return (
          <div
            key={goal.id}
            className={`flex flex-col gap-1.5 ${i > 0 ? 'border-t pt-3' : ''}`}
            style={i > 0 ? { borderColor: 'var(--color-card-border)' } : undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{goal.name}</p>
              <span className="font-display text-sm" style={{ color: 'var(--color-gold)' }}>{Math.round(focus.normalizedPct)}%</span>
            </div>
            <span className="text-[11px] font-medium tracking-wide" style={{ color: badge.color }}>{badge.label}</span>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{feasibility.explanation}</p>
            {feasibility.bestPossiblePreparation && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-sky)' }}>{feasibility.bestPossiblePreparation}</p>
            )}
          </div>
        );
      })}
    </Card>
  );
}
