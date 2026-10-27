// ASCEND — illness on the Today page (engine/illness.ts). Nothing to keep
// up: "Niet fit?" opens three choices; while ill a card says what to do
// with one button for "weer beter"; after that a short card while you
// build back up.

import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { activeIllness, recoveryRamp, type IllnessChange, type IllnessPlan, ILLNESS_GUIDANCE, ILLNESS_HINT, ILLNESS_LABEL } from '../engine/illness';
import type { IllnessKind } from '../models/illness';
import { formatDateNL, todayISO, weekdayShortNL } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { ProposalSheet } from './ProposalSheet';
import type { Advice } from '../engine/adviceEngine';
import { Card, Eyebrow, PrimaryButton } from './ui';
import { TextButton } from './TextButton';
import { withTimeout } from '../utils/withTimeout';

const SAVE_LIMIT_MS = 15_000;

// Ziek melden en weer beter zijn een voorstel met Akkoord. Verandert de planning
// niet, dan wordt de periode direct bewaard; anders komt eerst het voorstel,
// en bij Liever niet blijft alles zoals het was.
function useIllnessProposal() {
  const { planIllness, applyIllness } = useAppData();
  const [plan, setPlan] = useState<IllnessPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = async (change: IllnessChange) => {
    if (busy) return;
    setError(null);
    const next = planIllness(change);
    if (!next) return;
    if (!next.changesPlanning) {
      setBusy(true);
      try {
        await withTimeout(applyIllness(next), SAVE_LIMIT_MS, 'Opslaan');
      } catch {
        setError('Dat lukte nu niet. Probeer het zo nog eens.');
      } finally {
        setBusy(false);
      }
      return;
    }
    setPlan(next);
  };
  const sheet = plan && (
    <ProposalSheet
      advice={illnessAdvice(plan)}
      eyebrow={plan.change.action === 'recover' ? 'Weer beter' : 'Ziek melden'}
      summary={plan.change.action === 'recover' ? 'Dit gaat van je planning als je weer opbouwt.' : 'Dit gaat van je planning als je je ziek meldt.'}
      emptyText="Je planning hoeft niet te veranderen."
      onRespond={async (response) => { if (response === 'accepted') await applyIllness(plan); }}
      onClose={() => setPlan(null)}
    />
  );
  return { request, sheet, busy, error };
}

function illnessAdvice(plan: IllnessPlan): Advice {
  return {
    id: `illness:${plan.proposal.id}`,
    trigger: 'plan_update',
    ruleId: 'ILLNESS',
    title: 'Zo ziet je planning eruit',
    effect: plan.preview,
    why: plan.proposal.explanation,
    priority: 0,
    proposal: plan.proposal,
  };
}

const KINDS: IllnessKind[] = ['above_neck', 'below_neck', 'stomach'];

function day(iso: string): string {
  return `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;
}

// The status cards (ill / building back). Shown at the top of Today.
export function IllnessStatusCard() {
  const { settings } = useAppData();
  const { request, sheet, busy, error } = useIllnessProposal();
  const active = activeIllness(settings.illnessEpisodes);
  const ramp = recoveryRamp(settings.illnessEpisodes, todayISO());

  if (active) {
    return (
      <>
      {sheet}
      <Card className="flex flex-col gap-2" >
        <Eyebrow>Ziek</Eyebrow>
        <p className="font-display text-lg" style={{ color: 'var(--color-ink)' }}>{ILLNESS_LABEL[active.kind]}</p>
        <p className="-mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Sinds {day(active.startDate)}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{ILLNESS_GUIDANCE[active.kind]}</p>
        <PrimaryButton disabled={busy} onClick={() => void request({ action: 'recover' })}>
          {busy ? 'Even bewaren…' : 'Ik ben weer beter'}
        </PrimaryButton>
        {error && <p className="text-sm" role="status" style={{ color: 'var(--color-warning)' }}>{error}</p>}
        {active.kind === 'above_neck' && (
          <TextButton
            onClick={() => void request({ action: 'report', kind: 'below_neck' })}
            className="self-start text-left"
          >
            Toch koorts of klachten onder de nek?
          </TextButton>
        )}
      </Card>
      </>
    );
  }

  if (ramp) {
    const heavyBack = ramp.heavyFrom <= todayISO();
    return (
      <>
      {sheet}
      <Card className="flex flex-col gap-1.5">
        <Eyebrow>Weer opbouwen</Eyebrow>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          {heavyBack
            ? `Zware trainingen mogen weer. Houd ze tot en met ${day(ramp.until)} wat korter en lichter dan normaal.`
            : `Na ziekte rustig opbouwen: trainingen korter en rustiger, ongeveer de helft tot driekwart van normaal. Zware trainingen pas weer vanaf ${day(ramp.heavyFrom)}.`}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Gemiste trainingen hoef je niet in te halen.</p>
      </Card>
      </>
    );
  }
  return sheet;
}

// "Niet fit?" link + the three-choice sheet. Hidden while already ill.
// `plain`: zonder onderstreping, als gewone tekstknop naast Verplaatsen op de missiekaart.
// `outlined`: de mint omlijnde knop naast Verplaatsen op de missiekaart.
export function NotFitLink({ plain = false, outlined = false }: { plain?: boolean; outlined?: boolean }) {
  const { settings } = useAppData();
  const { request, sheet } = useIllnessProposal();
  const [open, setOpen] = useState(false);
  if (activeIllness(settings.illnessEpisodes)) return <>{sheet}</>;
  return (
    <>
      <button onClick={() => setOpen(true)} className={outlined ? 'flex-1 min-h-[44px] rounded-xl px-3 py-2 text-sm font-medium transition-all active:scale-[0.97] active:opacity-70' : plain ? 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-sm font-medium' : 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center self-center text-xs font-medium'} style={outlined ? { border: '1.5px solid color-mix(in srgb, var(--color-action) 75%, transparent)', color: 'var(--color-action)' } : { color: 'var(--color-ink-dim)' }}>
        Niet fit?
      </button>
      {open && <IllnessSheet onPick={async (kind) => { setOpen(false); await request({ action: 'report', kind }); }} onClose={() => setOpen(false)} />}
      {sheet}
    </>
  );
}

function IllnessSheet({ onPick, onClose }: { onPick: (kind: IllnessKind) => void; onClose: () => void }) {
  const { closing, requestClose } = useSheetClose(onClose);
  return (
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div className={`w-full max-w-md ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`} onClick={(e) => e.stopPropagation()}>
          <Card className="rounded-b-none border-b-0 pb-6">
            <Eyebrow>Niet fit?</Eyebrow>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
              Kies wat het meest past. Je ziet eerst wat er in je planning verandert en beslist zelf. Met één tik meld je je later weer beter.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {KINDS.map((kind) => (
                <button
                  key={kind}
                  onClick={() => onPick(kind)}
                  className="rounded-xl border px-3 py-3 text-left transition-all active:scale-[0.98]"
                  style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)' }}
                >
                  <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>{ILLNESS_LABEL[kind]}</span>
                  <span className="mt-0.5 block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{ILLNESS_HINT[kind]}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Bij hoge koorts, pijn op de borst of als je je echt slecht voelt: neem contact op met je huisarts.
            </p>
            <button onClick={requestClose} className="min-h-[44px] mt-4 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Sluiten
            </button>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
