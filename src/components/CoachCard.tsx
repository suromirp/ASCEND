// ASCEND — coach card on Today (Fase 3): at most two pieces of advice from
// engine/adviceEngine.ts, each with what ASCEND suggests and, one tap
// away, why (trigger -> rule -> effect).

import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { Advice } from '../engine/adviceEngine';
import { Card, Eyebrow } from './ui';

export function CoachCard() {
  const { advice } = useAppData();
  const shown = advice.slice(0, 2);
  if (shown.length === 0) return null;
  return (
    <Card className="flex flex-col gap-4">
      <Eyebrow>COACH</Eyebrow>
      {shown.map((a) => <AdviceItem key={a.id} advice={a} />)}
    </Card>
  );
}

export function AdviceItem({ advice, compact = false }: { advice: Advice; compact?: boolean }) {
  const { respondToAdvice } = useAppData();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function respond(response: 'accepted' | 'declined') {
    setBusy(true);
    await respondToAdvice(advice, response);
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {!compact && <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{advice.title}</p>}
      <p className="text-sm leading-relaxed" style={{ color: compact ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>{advice.effect}</p>
      <button onClick={() => setOpen((v) => !v)} className="self-start text-[11px] underline" style={{ color: 'var(--color-ink-dim)' }}>
        {open ? 'minder' : 'waarom?'}
      </button>
      {open && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{advice.why}</p>}
      <div className="mt-1 flex gap-4">
        {advice.proposal ? (
          <>
            <button onClick={() => void respond('accepted')} disabled={busy} className="text-xs font-semibold tracking-wide disabled:opacity-40" style={{ color: 'var(--color-gold)' }}>AKKOORD</button>
            <button onClick={() => void respond('declined')} disabled={busy} className="text-xs tracking-wide disabled:opacity-40" style={{ color: 'var(--color-ink-dim)' }}>LIEVER NIET</button>
          </>
        ) : (
          <button onClick={() => void respond('accepted')} disabled={busy} className="text-xs font-semibold tracking-wide disabled:opacity-40" style={{ color: 'var(--color-gold)' }}>OKÉ</button>
        )}
      </div>
    </div>
  );
}
