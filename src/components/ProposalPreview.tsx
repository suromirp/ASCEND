import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { previewProposal } from '../engine/proposalPreview';
import type { PlanChangeProposal } from '../models/planChange';
import { formatDateNL, weekdayShortNL } from '../utils/dates';

// The week as it would look after Akkoord: changed days in gold, what moves
// away or goes struck through. Nothing is applied by looking at it.
export function ProposalPreview({ proposal }: { proposal: PlanChangeProposal }) {
  const { plannedSessions, templates } = useAppData();
  const weeks = useMemo(() => previewProposal(proposal.changes, plannedSessions, templates), [proposal, plannedSessions, templates]);
  if (weeks.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-col gap-3 rounded-lg border p-2.5" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}>
      {weeks.map((w) => (
        <div key={w.weekStart}>
          <p className="mb-1 text-[10px] font-medium tracking-[0.16em]" style={{ color: 'var(--color-ink-dim)' }}>WEEK VAN {formatDateNL(w.weekStart).toUpperCase()}</p>
          <div className="flex flex-col">
            {w.days.map((d) => (
              <div key={d.date} className="flex gap-2 py-0.5 text-xs leading-snug">
                <span className="w-14 shrink-0 tabular-nums" style={{ color: d.changed ? 'var(--color-gold)' : 'var(--color-ink-dim)' }}>{weekdayShortNL(d.date)} {Number(d.date.slice(8))}</span>
                <span className="min-w-0 flex-1">
                  {d.entries.length === 0 ? <span style={{ color: 'var(--color-ink-dim)' }}>·</span> : d.entries.map((e, i) => (
                    <span key={i} className="mr-2 inline-block" style={{ color: e.change === 'vervalt' ? 'var(--color-ink-dim)' : e.change ? 'var(--color-gold)' : 'var(--color-ink)', textDecoration: e.change === 'vervalt' ? 'line-through' : undefined }}>
                      {e.name}{e.change === 'nieuw' || e.change === 'verplaatst' ? ' (nieuw hier)' : ''}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
