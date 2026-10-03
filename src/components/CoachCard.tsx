// ASCEND — coach card on Today (Fase 3): at most two pieces of advice from
// engine/adviceEngine.ts, each with what ASCEND suggests and, one tap
// away, why (trigger -> rule -> effect). Visual pass (production feedback:
// "mag wat mooier, visueler"): an icon per kind of advice, the suggestion
// up front, the why folded into a quiet panel, clear pill actions.

import { useState, type ReactNode } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { Advice, AdviceTrigger } from '../engine/adviceEngine';
import { Card, Eyebrow } from './ui';

const KIND: Record<AdviceTrigger, { label: string; color: string; icon: ReactNode }> = {
  session_missed: {
    label: 'Gemist',
    color: 'var(--color-bronze)',
    icon: <path d="M4 7h16M4 7v12h16V7M8 3v4M16 3v4M9 14l2 2 4-4" />,
  },
  session_too_hard: {
    label: 'Zwaar',
    color: 'var(--color-warning)',
    icon: <path d="M4 16a8 8 0 1 1 16 0M12 16l4-5M4 16h2M18 16h2" />,
  },
  session_too_light: {
    label: 'Kan meer',
    color: 'var(--color-sky)',
    icon: <path d="M3 18l6-6 4 4 8-8M15 8h6v6" />,
  },
  injury_active: {
    label: 'Blessure',
    color: 'var(--color-danger)',
    icon: <path d="M12 7v10M7 12h10M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />,
  },
  same_muscles_back_to_back: {
    label: 'Herstel',
    color: 'var(--color-sky)',
    icon: <path d="M6 5v14M18 5v14M6 12h12" />,
  },
  strength_irregular: {
    label: 'Kracht',
    color: 'var(--color-gold)',
    icon: <path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12" />,
  },
  plan_update: {
    label: 'Planning',
    color: 'var(--color-gold)',
    icon: <path d="M4 6h16M4 12h10M4 18h6M17 15l3 3-3 3" />,
  },
};

function KindIcon({ trigger }: { trigger: AdviceTrigger }) {
  const kind = KIND[trigger];
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{ background: 'var(--color-charcoal)', color: kind.color, boxShadow: 'inset 0 0 0 1px var(--color-card-border)' }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {kind.icon}
      </svg>
    </span>
  );
}

export function CoachCard() {
  const { advice } = useAppData();
  const [showAll, setShowAll] = useState(false);
  if (advice.length === 0) return null;
  const shown = showAll ? advice : advice.slice(0, 2);
  return (
    <Card className="flex flex-col gap-4" texture>
      <div className="flex items-baseline justify-between">
        <Eyebrow>COACH</Eyebrow>
        <span className="text-[11px]" style={{ color: 'var(--color-ink-dim)' }}>
          {advice.length === 1 ? '1 advies' : `${advice.length} adviezen`}
        </span>
      </div>
      <div className="flex flex-col">
        {shown.map((a, i) => (
          <div key={a.id} className={i > 0 ? 'mt-4 border-t pt-4' : ''} style={{ borderColor: 'var(--color-card-border)' }}>
            <AdviceItem advice={a} />
          </div>
        ))}
      </div>
      {advice.length > 2 && (
        <button onClick={() => setShowAll((v) => !v)} className="-mt-1 self-start text-xs underline" style={{ color: 'var(--color-ink-dim)' }}>
          {showAll ? 'minder tonen' : `nog ${advice.length - 2} tonen`}
        </button>
      )}
    </Card>
  );
}

export function AdviceItem({ advice, compact = false }: { advice: Advice; compact?: boolean }) {
  const { respondToAdvice } = useAppData();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const kind = KIND[advice.trigger];

  async function respond(response: 'accepted' | 'declined') {
    setBusy(true);
    await respondToAdvice(advice, response);
    setBusy(false);
  }

  const actions = (
    <div className="mt-3 flex items-center gap-2">
      {advice.proposal ? (
        <>
          <Pill primary onClick={() => void respond('accepted')} disabled={busy}>Akkoord</Pill>
          <Pill onClick={() => void respond('declined')} disabled={busy}>Liever niet</Pill>
        </>
      ) : (
        <Pill primary onClick={() => void respond('accepted')} disabled={busy}>Oké</Pill>
      )}
      <button onClick={() => setOpen((v) => !v)} className="ml-auto flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-ink-dim)' }} aria-expanded={open}>
        waarom
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 150ms' }} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );

  const why = open && (
    <p className="mt-2.5 rounded-lg border-l-2 py-2 pl-3 pr-2 text-xs leading-relaxed" style={{ borderColor: kind.color, background: 'var(--color-charcoal)', color: 'var(--color-ink-dim)' }}>
      {advice.why}
    </p>
  );

  if (compact) {
    return (
      <div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{advice.effect}</p>
        {actions}
        {why}
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <KindIcon trigger={advice.trigger} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium tracking-[0.16em]" style={{ color: kind.color }}>{kind.label.toUpperCase()}</p>
        <p className="mt-0.5 text-sm font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{advice.title}</p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{advice.effect}</p>
        {actions}
        {why}
      </div>
    </div>
  );
}

function Pill({ children, onClick, disabled, primary = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all active:scale-[0.97] disabled:opacity-40"
      style={primary
        ? { background: 'linear-gradient(135deg, var(--color-gold), var(--color-bronze))', color: 'var(--color-bg)' }
        : { boxShadow: 'inset 0 0 0 1px var(--color-card-border)', color: 'var(--color-ink-dim)' }}
    >
      {children}
    </button>
  );
}
