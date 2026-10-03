// ASCEND — illness on the Today page (engine/illness.ts). Nothing to keep
// up: "Niet fit?" opens three choices; while ill a card says what to do
// with one button for "weer beter"; after that a short card while you
// build back up.

import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { activeIllness, recoveryRamp, ILLNESS_GUIDANCE, ILLNESS_HINT, ILLNESS_LABEL } from '../engine/illness';
import type { IllnessKind } from '../models/illness';
import { formatDateNL, todayISO, weekdayShortNL } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, PrimaryButton } from './ui';

const KINDS: IllnessKind[] = ['above_neck', 'below_neck', 'stomach'];

function day(iso: string): string {
  return `${weekdayShortNL(iso).toLowerCase()} ${formatDateNL(iso)}`;
}

// The status cards (ill / building back). Shown at the top of Today.
export function IllnessStatusCard() {
  const { settings, recoverFromIllness, reportIllness } = useAppData();
  const [busy, setBusy] = useState(false);
  const active = activeIllness(settings.illnessEpisodes);
  const ramp = recoveryRamp(settings.illnessEpisodes, todayISO());

  if (active) {
    return (
      <Card className="flex flex-col gap-2" >
        <Eyebrow>ZIEK</Eyebrow>
        <p className="font-display text-lg" style={{ color: 'var(--color-ink)' }}>{ILLNESS_LABEL[active.kind]}</p>
        <p className="-mt-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>Sinds {day(active.startDate)}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>{ILLNESS_GUIDANCE[active.kind]}</p>
        <PrimaryButton
          onClick={async () => { setBusy(true); await recoverFromIllness(); setBusy(false); }}
          disabled={busy}
        >
          IK BEN WEER BETER
        </PrimaryButton>
        {active.kind === 'above_neck' && (
          <button
            onClick={async () => { setBusy(true); await reportIllness('below_neck'); setBusy(false); }}
            className="self-start text-xs underline"
            style={{ color: 'var(--color-ink-dim)' }}
          >
            Toch koorts of klachten onder de nek?
          </button>
        )}
      </Card>
    );
  }

  if (ramp) {
    const heavyBack = ramp.heavyFrom <= todayISO();
    return (
      <Card className="flex flex-col gap-1.5">
        <Eyebrow>WEER OPBOUWEN</Eyebrow>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          {heavyBack
            ? `Zware trainingen mogen weer. Houd ze tot en met ${day(ramp.until)} wat korter en lichter dan normaal.`
            : `Na ziekte rustig opbouwen: trainingen korter en rustiger, ongeveer de helft tot driekwart van normaal. Zware trainingen pas weer vanaf ${day(ramp.heavyFrom)}.`}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Gemiste trainingen hoef je niet in te halen.</p>
      </Card>
    );
  }
  return null;
}

// "Niet fit?" link + the three-choice sheet. Hidden while already ill.
export function NotFitLink() {
  const { settings, reportIllness } = useAppData();
  const [open, setOpen] = useState(false);
  if (activeIllness(settings.illnessEpisodes)) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="self-center text-xs underline" style={{ color: 'var(--color-ink-dim)' }}>
        Niet fit?
      </button>
      {open && <IllnessSheet onPick={async (kind) => { setOpen(false); await reportIllness(kind); }} onClose={() => setOpen(false)} />}
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
            <Eyebrow>NIET FIT?</Eyebrow>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
              Kies wat het meest past. ASCEND past je planning aan en je meldt je weer beter met één tik.
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
            <p className="mt-3 text-[11px] leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
              Bij hoge koorts, pijn op de borst of als je je echt slecht voelt: neem contact op met je huisarts.
            </p>
            <button onClick={requestClose} className="mt-4 w-full text-center text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              Sluiten
            </button>
          </Card>
        </div>
      </div>
    </Portal>
  );
}
