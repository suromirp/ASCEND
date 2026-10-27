import type { ScheduleProposal } from '../engine/scheduler';
import { formatDateNL } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, PrimaryButton, SecondaryButton } from './ui';
import { Icon } from './icons';
import { SheetHeader } from './SheetHeader';
import { useLegMoveNotes } from './useLegMoveNote';

export function RescheduleDialog({
  proposal,
  onApply,
  onCancel,
}: {
  proposal: ScheduleProposal;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { closing, requestClose } = useSheetClose(onCancel);
  // Stil, zonder knop: hoe vermoeid je benen op de nieuwe dag ongeveer zijn.
  const legNotes = useLegMoveNotes(proposal.changes.filter((c) => !c.restore && c.toDate !== c.fromDate).map((c) => ({ sessionId: c.sessionId, toDate: c.toDate })));

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div className={`w-full max-w-md ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="rounded-b-none border-b-0 pb-6">
            <div className="-mt-2"><SheetHeader eyebrow="Schema-aanpassing" onClose={requestClose} /></div>
            <div className="mt-3 flex flex-col gap-2">
              {proposal.changes.map((c) => (
                <div key={c.sessionId} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--color-ink)' }}>{c.templateName}</span>
                  {c.restore ? (
                    <span style={{ color: 'var(--color-ink-dim)' }}>weer op <span style={{ color: 'var(--color-ink)' }}>{formatDateNL(c.toDate)}</span></span>
                  ) : c.toDate === c.fromDate ? (
                    <span style={{ color: 'var(--color-danger-text)' }}>wordt overgeslagen</span>
                  ) : (
                    <span style={{ color: 'var(--color-ink-dim)' }}>
                      {formatDateNL(c.fromDate)} <Icon name="verder" size={14} className="inline align-[-2px]" /> <span style={{ color: 'var(--color-ink)' }}>{formatDateNL(c.toDate)}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
            {legNotes.map((n) => (
              <p key={n.line} className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                {n.line} {n.explain}
              </p>
            ))}
            <p
              className="mt-4 text-xs leading-relaxed"
              style={{ color: proposal.resolved ? 'var(--color-ink-dim)' : 'var(--color-warning)' }}
            >
              {proposal.reason}
            </p>
            {/* An unresolved clash is never applied under the same button as a
                clean one: keeping the plan is the default, moving anyway is
                a conscious second choice. */}
            {proposal.resolved ? (
              <div className="mt-5 flex gap-3">
                <SecondaryButton onClick={requestClose}>Liever niet</SecondaryButton>
                <PrimaryButton onClick={onApply} fullWidth={false}>Akkoord</PrimaryButton>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-3">
                <PrimaryButton onClick={requestClose}>Liever niet</PrimaryButton>
                <SecondaryButton onClick={onApply}>{proposal.changes[0]?.restore ? 'Toch doen' : 'Toch verplaatsen'}</SecondaryButton>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Portal>
  );
}
