// ASCEND: coach card on Today (Fase 3): the main piece of advice from
// engine/adviceEngine.ts as one compact card; all of them, each with what ASCEND suggests and, one tap
// away, why (trigger -> rule -> effect). Visual pass (production feedback:
// "mag wat mooier, visueler"): an icon per kind of advice, the suggestion
// up front, the why folded into a quiet panel, clear pill actions.

import { ProposalSheet } from './ProposalSheet';
import { useState, type ReactNode } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { Advice, AdviceTrigger } from '../engine/adviceEngine';
import { Card, Eyebrow } from './ui';
import { WhyPanel, WhyToggle } from './Why';
import { TodaySheet } from './vandaag/TodaySheet';
import { Icon } from './icons';

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
    color: 'var(--color-danger-text)',
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

// Vandaag shows one compact card: the most important advice in a few lines,
// "nog N" for the rest, and the explanation (what, why, the week preview) in
// a sheet. Advice that changes your plan is never answered from the card
// itself: "Bekijk" first, Akkoord is in the sheet.
export function CoachCard() {
  const { advice, respondToAdvice } = useAppData();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (advice.length === 0) return null;
  const first = advice[0];
  const kind = KIND[first.trigger];
  const plain = !(first.proposal || first.restWeekSkip || first.repeatWeek || first.goalChange || first.goalTargetTime);
  const more = advice.length - 1;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Eyebrow>ADVIES</Eyebrow>
        {more > 0 && (
          <button onClick={() => setOpen(true)} className="-mr-2 min-h-[44px] px-2 text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>
            nog {more}
          </button>
        )}
      </div>
      <div className="-mt-2 flex gap-3">
        <KindIcon trigger={first.trigger} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium" style={{ color: kind.color }}>{kind.label}</p>
          <p className="text-[15px] font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{first.title}</p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{first.effect}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {plain && (
          <Pill disabled={busy} onClick={() => { setBusy(true); void respondToAdvice(first, 'accepted').finally(() => setBusy(false)); }}>Begrepen</Pill>
        )}
        <Pill primary={!plain} onClick={() => setOpen(true)}>{plain ? 'Uitleg' : 'Bekijk'}</Pill>
      </div>
      {open && (
        <TodaySheet eyebrow={advice.length === 1 ? 'ADVIES' : `${advice.length} ADVIEZEN`} onClose={() => setOpen(false)}>
          <div className="flex flex-col">
            {advice.map((a, i) => (
              <div key={a.id} className={i > 0 ? 'mt-4 border-t pt-4' : ''} style={{ borderColor: 'var(--color-card-border)' }}>
                <AdviceItem advice={a} whyAlways />
              </div>
            ))}
          </div>
        </TodaySheet>
      )}
    </Card>
  );
}

// `whyAlways`: the why stands under the advice instead of behind "waarom" (the sheet on Vandaag).
export function AdviceItem({ advice, compact = false, whyAlways = false }: { advice: Advice; compact?: boolean; whyAlways?: boolean }) {
  const { respondToAdvice } = useAppData();
  const [open, setOpen] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const [busy, setBusy] = useState(false);
  const kind = KIND[advice.trigger];

  async function respond(response: 'accepted' | 'declined') {
    setBusy(true);
    await respondToAdvice(advice, response);
    setBusy(false);
  }

  const actions = (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {advice.proposal || advice.restWeekSkip || advice.repeatWeek || advice.goalChange || advice.goalTargetTime ? (
        <>
          <Pill onClick={() => void respond('accepted')} disabled={busy}>Akkoord</Pill>
          <Pill onClick={() => void respond('declined')} disabled={busy}>Liever niet</Pill>
        </>
      ) : (
        <Pill onClick={() => void respond('accepted')} disabled={busy}>Begrepen</Pill>
      )}
      {!whyAlways && <WhyToggle open={open} onToggle={() => setOpen((v) => !v)} className="ml-auto" />}
    </div>
  );

  // "Zo ziet je week eruit": its own row under the actions; it opens the
  // week as a sheet from below, with Akkoord and Liever niet in it.
  const weekToggle = advice.proposal && (
    <button
      onClick={() => setShowWeek(true)}
      className="mt-3 flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border px-3 text-left text-xs"
      style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--color-bronze)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      </svg>
      <span className="flex-1">Zo ziet je week eruit{advice.options && advice.options.length > 1 ? <span style={{ color: 'var(--color-ink-dim)' }}> · {advice.options.length} opties</span> : null}</span>
      <span style={{ color: 'var(--color-ink-dim)' }} aria-hidden><Icon name="verder" size={16} /></span>
    </button>
  );
  const weekPreview = showWeek && advice.proposal && <ProposalSheet advice={advice} onClose={() => setShowWeek(false)} />;

  const why = (open || whyAlways) && <WhyPanel accent={kind.color} className="mt-2.5">{advice.why}</WhyPanel>;

  if (compact) {
    return (
      <div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{advice.effect}</p>
        {actions}
        {why}
        {weekToggle}
        {weekPreview}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3">
        <KindIcon trigger={advice.trigger} />
        <div className="min-w-0 flex-1">
          <Eyebrow tone={kind.color}>{kind.label}</Eyebrow>
          <p className="mt-0.5 text-sm font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{advice.title}</p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{advice.effect}</p>
          {actions}
          {why}
        </div>
      </div>
      {weekToggle}
      {weekPreview}
    </div>
  );
}

function Pill({ children, onClick, disabled, primary = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-h-[44px] whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-40"
      style={primary
        ? { background: 'var(--color-action-fill)', color: 'var(--color-bg)' }
        : { boxShadow: 'inset 0 0 0 1px var(--color-control-border)', color: 'var(--color-ink-dim)' }}
    >
      {children}
    </button>
  );
}
