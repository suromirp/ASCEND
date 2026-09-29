// ASCEND — the "beslissing" level of the feedback pattern (Fase 2,
// engine/changeImpact.ts): a change that touches this or next week, or
// removes a session, is shown in full before anything happens.

import { Portal } from './Portal';
import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';
import { useSheetClose } from '../utils/useSheetClose';

export function ImpactSheet({
  eyebrow,
  title,
  lines,
  why,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onClose,
  busy = false,
}: {
  eyebrow: string;
  title: string;
  lines: string[];
  why?: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const { closing, requestClose } = useSheetClose(onClose);
  const shown = lines.slice(0, 8);
  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={busy ? undefined : requestClose}
      >
        <div className={`max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="flex flex-col gap-4 rounded-b-none border-b-0 pb-6">
            <div>
              <Eyebrow>{eyebrow}</Eyebrow>
              <p className="mt-1.5 text-base font-semibold" style={{ color: 'var(--color-ink)' }}>{title}</p>
            </div>
            {shown.length > 0 && (
              <div>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Dit verandert</p>
                <ul className="mt-1 flex flex-col gap-1 text-sm" style={{ color: 'var(--color-ink)' }}>
                  {shown.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
                {lines.length > shown.length && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>en nog {lines.length - shown.length} andere</p>
                )}
              </div>
            )}
            {why && (
              <div>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Waarom</p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{why}</p>
              </div>
            )}
            <div className="flex gap-3">
              <SecondaryButton onClick={onSecondary} disabled={busy}>{secondaryLabel}</SecondaryButton>
              <PrimaryButton fullWidth={false} onClick={onPrimary} disabled={busy}>{primaryLabel}</PrimaryButton>
            </div>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
