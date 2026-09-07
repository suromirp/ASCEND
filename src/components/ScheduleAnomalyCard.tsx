import { useMemo, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { detectConsecutiveRestDays, buildConsecutiveRestFixProposal } from '../engine/scheduleAnomalies';
import { formatDateNL, todayISO } from '../utils/dates';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';

// A live, read-only check (recomputed on every render from current data,
// nothing persisted) — surfaces engine/scheduleAnomalies.ts's proposal, if
// any, with the same confirm/dismiss shape every other PlanChangeProposal
// in the app uses. Dismissing is session-only (component state, not
// persisted) — this recomputes fresh each visit, so a genuinely fixed
// schedule simply stops producing a proposal and the card disappears on
// its own; dismissing just hides today's instance without pretending
// ASCEND remembers that choice forever.
export function ScheduleAnomalyCard() {
  const { plannedSessions, templateById, sessionLogs, goalEngineConfig, applyScheduleAnomalyFix } = useAppData();
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);

  const proposal = useMemo(() => {
    const runs = detectConsecutiveRestDays(plannedSessions, templateById, sessionLogs, todayISO());
    return buildConsecutiveRestFixProposal(runs, plannedSessions, templateById, goalEngineConfig.availability, sessionLogs);
  }, [plannedSessions, templateById, sessionLogs, goalEngineConfig.availability]);

  if (!proposal || dismissed) return null;

  async function handleApply() {
    setApplying(true);
    await applyScheduleAnomalyFix();
    setApplying(false);
  }

  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>OPGEVALLEN IN JE SCHEMA</Eyebrow>
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{proposal.issue}.</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        {proposal.changes[0]?.reason}
      </p>
      <div className="flex flex-col gap-1">
        {proposal.changes.map((c) => (
          <p key={c.plannedSessionId} className="text-xs" style={{ color: 'var(--color-sky)' }}>
            {c.fromDate ? formatDateNL(c.fromDate) : ''} → {c.toDate ? formatDateNL(c.toDate) : ''}
          </p>
        ))}
      </div>
      <div className="mt-1 flex gap-3">
        <SecondaryButton onClick={() => setDismissed(true)} disabled={applying}>NEGEREN</SecondaryButton>
        <PrimaryButton onClick={() => void handleApply()} disabled={applying}>
          {applying ? 'BEZIG…' : 'AANPASSEN'}
        </PrimaryButton>
      </div>
    </Card>
  );
}
