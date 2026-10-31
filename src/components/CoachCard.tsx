// ASCEND: de coachkaart op Vandaag. Het belangrijkste advies uit engine/adviceEngine.ts als een compacte
// kaart: pictogram per soort, de titel en de korte regel (`brief`) erbij. Een tik opent het blad
// (`AdviceItem`): de feitregel (`lead`), de wijzigingen als lijst, hoogstens een tip, dan de knoppen.
// Het waarom zit dicht achter "Waarom?". Akkoord is het enige gevulde mint als het de enige keuze is;
// een advies zonder `lead` houdt zijn alinea (`effect`). Zie docs/beslissingen/2026-10-28-adviesblad-compact.md.

import { ProposalChangeList, ProposalSheet } from './ProposalSheet';
import { useState, type ReactNode } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { Advice, AdviceTrigger } from '../engine/adviceEngine';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from './ui';
import { WhyPanel } from './Why';
import { TextButton } from './TextButton';
import { adviceBrief, adviceLead } from '../engine/adviceText';
import { TodaySheet } from './vandaag/TodaySheet';
import { Icon } from './icons';
import { useHorizonChange } from './useHorizonChange';
import { NO_GOAL_WAVES_TITLE, noGoalWavesLines, wavesConsentPatch } from '../engine/noGoalWaves';

const KIND: Record<AdviceTrigger, { label: string; color: string; icon: ReactNode }> = {
  session_missed: {
    label: 'Gemist',
    color: 'var(--color-warning)',
    icon: <path d="M4 7h16M4 7v12h16V7M8 3v4M16 3v4M9 14l2 2 4-4" />,
  },
  session_too_hard: {
    label: 'Zwaar',
    color: 'var(--color-warning)',
    icon: <path d="M4 16a8 8 0 1 1 16 0M12 16l4-5M4 16h2M18 16h2" />,
  },
  session_too_light: {
    label: 'Kan meer',
    color: 'var(--color-status)',
    icon: <path d="M3 18l6-6 4 4 8-8M15 8h6v6" />,
  },
  injury_active: {
    label: 'Blessure',
    color: 'var(--color-danger-text)',
    icon: <path d="M12 7v10M7 12h10M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />,
  },
  same_muscles_back_to_back: {
    label: 'Herstel',
    color: 'var(--color-status)',
    icon: <path d="M6 5v14M18 5v14M6 12h12" />,
  },
  strength_irregular: {
    label: 'Kracht',
    color: 'var(--color-action)',
    icon: <path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12" />,
  },
  plan_update: {
    label: 'Planning',
    color: 'var(--color-action)',
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
  const plain = !(first.proposal || first.restWeekSkip || first.repeatWeek || first.goalChange || first.goalTargetTime || first.noGoalWaves);
  const more = advice.length - 1;
  return (
    <Card className="flex flex-col gap-3" data-advice-ids={advice.map((a) => a.id).join(' ')}>
      <div className="flex items-center justify-between">
        <Eyebrow>Advies, {kind.label.toLowerCase()}</Eyebrow>
        {more > 0 && (
          <button onClick={() => setOpen(true)} className="-mr-2 min-h-[44px] px-2 text-[13px]" style={{ color: 'var(--color-ink-dim)' }}>
            nog {more}
          </button>
        )}
      </div>
      <div className="-mt-2 flex gap-3">
        <KindIcon trigger={first.trigger} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug" style={{ color: 'var(--color-ink)' }}>{first.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{adviceBrief(first)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {plain && (
          <SecondaryButton disabled={busy} onClick={() => { setBusy(true); void respondToAdvice(first, 'accepted').finally(() => setBusy(false)); }}>Begrepen</SecondaryButton>
        )}
        <SecondaryButton onClick={() => setOpen(true)}>{plain ? 'Uitleg' : 'Bekijk'}</SecondaryButton>
      </div>
      {open && (
        <TodaySheet eyebrow={advice.length === 1 ? 'Advies' : `${advice.length} adviezen`} onClose={() => setOpen(false)}>
          <div className="flex flex-col">
            {advice.map((a, i) => (
              <div key={a.id} className={i > 0 ? 'mt-4 border-t pt-4' : ''} style={{ borderColor: 'var(--color-card-border)' }}>
                <AdviceItem advice={a} primary={advice.length === 1} />
              </div>
            ))}
          </div>
        </TodaySheet>
      )}
    </Card>
  );
}

// Het blad toont een advies in één oogopslag: de feitregel, de wijzigingen als lijst, hoogstens één tip,
// dan de knoppen; het waarom zit achter "Waarom?". Alleen een advies met een eigen `lead` krijgt de lijst
// in plaats van de alinea; de andere houden hun effect, zodat er niets verdwijnt.
// `primary`: Akkoord is gevuld mint, omdat het de enige keuze in het blad is; anders omlijnd.
export function AdviceItem({ advice, compact = false, primary = false }: { advice: Advice; compact?: boolean; primary?: boolean }) {
  const { respondToAdvice, planWeekLoadChange, planHorizonChange } = useAppData();
  // Training through a rest week and "Deze week nog een keer" change the
  // program: first their own proposal with what changes, Akkoord in there
  // (storage/weekLoadPlan.ts). Only then the answer to the advice is recorded.
  const horizon = useHorizonChange();
  const weekLoad = advice.restWeekSkip ? { kind: 'rest' as const, week: advice.restWeekSkip } : advice.repeatWeek ? { kind: 'repeat' as const, week: advice.repeatWeek } : undefined;
  // Neutrale golven zonder doel (engine/noGoalWaves.ts): ook eerst het eigen voorstel met de hele planningsronde.
  const ownProposal = !!weekLoad || !!advice.noGoalWaves;
  const [open, setOpen] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const [busy, setBusy] = useState(false);
  const kind = KIND[advice.trigger];
  const glance = !!advice.lead && !!advice.proposal;

  async function respond(response: 'accepted' | 'declined') {
    if (response === 'accepted' && weekLoad) {
      await horizon.propose(() => planWeekLoadChange(weekLoad.kind, weekLoad.week, true), {
        eyebrow: weekLoad.kind === 'rest' ? 'Rustweek' : 'Deze week nog een keer',
        ask: 'always',
        alwaysAsk: true,
        declined: 'Prima, je week blijft zoals hij was.',
        onStored: () => void respondToAdvice(advice, 'accepted'),
      });
      return;
    }
    if (response === 'accepted' && advice.noGoalWaves) {
      await horizon.propose(
        () => planHorizonChange({
          title: NO_GOAL_WAVES_TITLE,
          why: 'Je plant zonder doel in neutrale golven.',
          explanation: 'Zonder doel plant ASCEND je weken in neutrale golven, zonder bergtocht en zonder rugzak. Je ziet eerst wat er verandert; pas na jouw Akkoord gebeurt er iets. Wat je al deed en wat je zelf vastzette blijft staan.',
          trigger: 'direction_changed',
          settings: wavesConsentPatch,
          notes: noGoalWavesLines(),
        }),
        {
          eyebrow: 'Zonder doel',
          ask: 'always',
          alwaysAsk: true,
          notesTitle: 'Wat er verandert',
          declined: 'Prima, je plan blijft zoals het is. ASCEND vraagt er niet meer naar.',
          onStored: () => void respondToAdvice(advice, 'accepted'),
          onDeclined: () => void respondToAdvice(advice, 'declined'),
        },
      );
      return;
    }
    setBusy(true);
    await respondToAdvice(advice, response);
    setBusy(false);
  }

  const actions = (
    <div className="mt-3 flex items-center gap-3">
      {advice.proposal || advice.restWeekSkip || advice.repeatWeek || advice.goalChange || advice.goalTargetTime || advice.noGoalWaves ? (
        <>
          <SecondaryButton onClick={() => void respond('declined')} disabled={busy || horizon.busy} className={primary && !ownProposal ? 'min-h-[52px]' : ''}>Liever niet</SecondaryButton>
          {primary && !ownProposal
            ? <PrimaryButton onClick={() => void respond('accepted')} disabled={busy || horizon.busy} fullWidth={false}>Akkoord</PrimaryButton>
            : <SecondaryButton onClick={() => void respond('accepted')} disabled={busy || horizon.busy}>{ownProposal ? 'Bekijk' : 'Akkoord'}</SecondaryButton>}
        </>
      ) : (
        <SecondaryButton onClick={() => void respond('accepted')} disabled={busy}>Begrepen</SecondaryButton>
      )}
    </div>
  );
  const whyToggle = (
    <TextButton tone="dim" size="xs" icon="omlaag" flipped={open} onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-1 self-start">Waarom?</TextButton>
  );

  // "Zo ziet je week eruit": its own row under the actions; it opens the
  // week as a sheet from below, with Akkoord and Liever niet in it.
  const weekToggle = advice.proposal && (
    <button
      onClick={() => setShowWeek(true)}
      className="mt-3 flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border px-3 text-left text-xs"
      style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="var(--color-action)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      </svg>
      <span className="flex-1">Zo ziet je week eruit{advice.options && advice.options.length > 1 ? <span style={{ color: 'var(--color-ink-dim)' }}> · {advice.options.length} opties</span> : null}</span>
      <span style={{ color: 'var(--color-ink-dim)' }} aria-hidden><Icon name="verder" size={16} /></span>
    </button>
  );
  const weekPreview = showWeek && advice.proposal && <ProposalSheet advice={advice} onClose={() => setShowWeek(false)} />;

  const why = open && <WhyPanel accent={kind.color} className="mt-1">{advice.why}</WhyPanel>;
  const weekLoadParts = ownProposal && (
    <>
      {horizon.note && <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }} role="status">{horizon.note}</p>}
      {horizon.sheet}
    </>
  );

  if (compact) {
    return (
      <div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{advice.effect}</p>
        {actions}
        <div className="flex flex-col">{whyToggle}</div>
        {why}
        {weekToggle}
        {weekPreview}
        {weekLoadParts}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3">
        <KindIcon trigger={advice.trigger} />
        <div className="min-w-0 flex-1">
          {/* In een blad met één advies staat "Advies" al erboven; dan hoeft de soort er niet nog een keer boven. */}
          {!primary && <Eyebrow tone={kind.color}>{kind.label}</Eyebrow>}
          <p className={`${primary ? '' : 'mt-0.5 '}text-sm font-medium leading-snug`} style={{ color: 'var(--color-ink)' }}>{advice.title}</p>
          {glance ? (
            <p className="mt-1 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{adviceLead(advice)}</p>
          ) : (
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{advice.effect}</p>
          )}
        </div>
      </div>
      {glance && advice.proposal && <div className="mt-3"><ProposalChangeList proposal={advice.proposal} /></div>}
      {glance && advice.tip && <p className="mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{advice.tip}</p>}
      {actions}
      <div className="flex flex-col">{whyToggle}</div>
      {why}
      {weekToggle}
      {weekPreview}
      {weekLoadParts}
    </div>
  );
}
