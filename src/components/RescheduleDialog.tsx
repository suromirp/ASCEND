import type { ScheduleProposal } from '../engine/scheduler';
import { formatDateNL } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';

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

  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div className={`w-full max-w-md ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="rounded-b-none border-b-0 pb-6">
            <Eyebrow>SCHEMA AANPASSING</Eyebrow>
            <div className="mt-3 flex flex-col gap-2">
              {proposal.changes.map((c) => (
                <div key={c.sessionId} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--color-ink)' }}>{c.templateName}</span>
                  <span style={{ color: 'var(--color-ink-dim)' }}>
                    {formatDateNL(c.fromDate)} → <span style={{ color: 'var(--color-gold)' }}>{formatDateNL(c.toDate)}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
              {proposal.reason}
            </p>
            <div className="mt-5 flex gap-3">
              <SecondaryButton onClick={requestClose}>ORIGINEEL BEHOUDEN</SecondaryButton>
              <PrimaryButton onClick={onApply}>TOEPASSEN</PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
