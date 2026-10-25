import { useEffect, useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { NightJudgment } from '../models/checkIn';
import type { WellnessReading } from '../engine/wellnessCheck';
import { HOUR_CHOICES, nightQuestionText, removeJudgment, upsertJudgment } from '../engine/shortNight';
import { TimeoutError, withTimeout } from '../utils/withTimeout';
import { SecondaryButton } from './ui';
import { TextButton } from './TextButton';

// De vraag bij een korte nacht (docs/beslissingen/2026-10-25-korte-nacht-vragen.md): zag
// het horloge maar een stukje van de nacht, dan vraagt de ochtendcheck rustig of dat
// klopt. "Klopt": de nacht telt gewoon. "Niet goed gemeten": de nacht telt niet mee, en je
// kunt zeggen hoe lang je ongeveer sliep. Alleen jouw oordeel wordt bewaard; de getallen
// van het horloge en uit intervals.icu blijven zoals ze zijn.

const SAVE_LIMIT_MS = 8000;

export function ShortNightAsk({ reading, today }: { reading: WellnessReading; today: string }) {
  const { settings, updateSettings } = useAppData();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const night = reading.night;
  if (!night) return null;

  // Bewaart (of haalt weg) en zegt zichtbaar wat er gebeurde als het niet lukt.
  async function store(judgment: NightJudgment | null) {
    setBusy(true);
    setFailed('');
    const next = judgment ? upsertJudgment(settings.nightJudgments, judgment) : removeJudgment(settings.nightJudgments, today);
    try {
      await withTimeout(updateSettings({ nightJudgments: next }), SAVE_LIMIT_MS, 'Opslaan');
    } catch (err) {
      if (alive.current) setFailed(err instanceof TimeoutError ? 'Opslaan duurde te lang. Probeer het straks nog eens.' : 'Opslaan lukte niet. Probeer het nog eens.');
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  const undo = (
    <TextButton tone="dim" className="shrink-0 whitespace-nowrap" disabled={busy} onClick={() => void store(null)}>
      Ongedaan maken
    </TextButton>
  );
  const dim = { color: 'var(--color-ink-dim)' };
  const ink = { color: 'var(--color-ink)' };

  let body;
  if (night.state === 'ask') {
    body = (
      <>
        <p className="text-sm leading-snug" style={ink}>{nightQuestionText(night.minutes)}</p>
        <div className="mt-2 flex gap-2">
          <SecondaryButton disabled={busy} onClick={() => void store({ date: today, verdict: 'klopt' })}>Klopt</SecondaryButton>
          <SecondaryButton disabled={busy} onClick={() => void store({ date: today, verdict: 'niet_goed' })}>Niet goed gemeten</SecondaryButton>
        </div>
      </>
    );
  } else if (night.state === 'klopt') {
    body = (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-snug" style={dim}>Goed, die nacht telt gewoon mee.</p>
        {undo}
      </div>
    );
  } else if (night.hours === undefined && !night.hoursSkipped) {
    body = (
      <>
        <p className="text-sm leading-snug" style={ink}>Die nacht telt niet mee. Hoe lang sliep je ongeveer?</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {HOUR_CHOICES.map((h) => (
            <button key={h} disabled={busy} onClick={() => void store({ date: today, verdict: 'niet_goed', hours: h })} className="min-h-[44px] rounded-lg border text-sm tabular-nums disabled:opacity-40" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}>
              {h} u
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button disabled={busy} onClick={() => void store({ date: today, verdict: 'niet_goed', hoursSkipped: true })} className="min-h-[44px] text-sm font-medium disabled:opacity-40" style={{ color: 'var(--color-action)' }}>
            Weet ik niet
          </button>
          {undo}
        </div>
      </>
    );
  } else {
    body = (
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs leading-snug" style={dim}>
          {night.hours ? `Die nacht telt niet mee. Je schat ongeveer ${night.hours} uur.` : 'Die nacht telt niet mee.'}
        </p>
        {undo}
      </div>
    );
  }

  return (
    <div role="group" aria-label="Korte nacht">
      {body}
      {busy && <p className="mt-1 text-xs" role="status" style={dim}>Even opslaan...</p>}
      {failed && <p className="mt-1 text-xs" role="status" style={{ color: 'var(--color-warning)' }}>{failed}</p>}
    </div>
  );
}
