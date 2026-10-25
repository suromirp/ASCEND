import { useEffect, useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import type { NightJudgment } from '../models/checkIn';
import type { WellnessReading } from '../engine/wellnessCheck';
import { reviseCheckInSleep } from '../engine/morningCard';
import { HOUR_CHOICES, nightQuestionText, removeJudgment, upsertJudgment } from '../engine/shortNight';
import { TimeoutError, withTimeout } from '../utils/withTimeout';
import { SecondaryButton, Segmented } from './ui';
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
  // De melding hoort bij de stand waarin ze kwam: verandert de stand (het opslaan lukte
  // alsnog), dan is ze weg.
  const [failure, setFailure] = useState<{ text: string; key: string } | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const night = reading.night;
  const stateKey = `${night?.state}|${night?.hours}|${night?.hoursSkipped}`;
  const failed = failure?.key === stateKey ? failure.text : '';
  if (!night) return null;

  // Bewaart (of haalt weg) en zegt zichtbaar wat er gebeurde als het niet lukt.
  async function store(judgment: NightJudgment | null) {
    setBusy(true);
    setFailure(null);
    const next = judgment ? upsertJudgment(settings.nightJudgments, judgment) : removeJudgment(settings.nightJudgments, today);
    // Stond de ochtend al opgeslagen met een slaapantwoord dat alleen uit het voorstel
    // kwam, dan gaat dat mee met je oordeel. Wat je zelf koos blijft staan.
    const checkIns = settings.morningCheckIns ?? [];
    const mine = checkIns.find((c) => c.date === today);
    const revised = mine ? reviseCheckInSleep(mine, judgment) : undefined;
    const patch = mine && revised && revised !== mine ? { nightJudgments: next, morningCheckIns: checkIns.map((c) => (c.date === today ? revised : c)) } : { nightJudgments: next };
    try {
      await withTimeout(updateSettings(patch), SAVE_LIMIT_MS, 'Opslaan');
    } catch (err) {
      // Na een time-out loopt het opslaan door en kan het nog lukken: dan verdwijnt deze regel vanzelf.
      if (alive.current) setFailure({ key: stateKey, text: err instanceof TimeoutError ? 'Nog niet bevestigd, kijk zo of het staat.' : 'Opslaan lukte niet. Probeer het nog eens.' });
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
          <SecondaryButton disabled={busy} onClick={() => void store({ date: today, verdict: 'klopt', minutes: night.minutes })}>Klopt</SecondaryButton>
          <SecondaryButton disabled={busy} onClick={() => void store({ date: today, verdict: 'niet_goed', minutes: night.minutes })}>Niet goed gemeten</SecondaryButton>
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
        <div className="mt-2" aria-busy={busy}>
          <Segmented<number>
            label="Hoe lang sliep je ongeveer"
            tall
            value={undefined}
            options={HOUR_CHOICES.map((h) => ({ value: h, label: `${h} u`, disabled: busy }))}
            onChange={(h) => void store({ date: today, verdict: 'niet_goed', minutes: night.minutes, hours: h })}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <TextButton disabled={busy} onClick={() => void store({ date: today, verdict: 'niet_goed', minutes: night.minutes, hoursSkipped: true })}>
            Weet ik niet
          </TextButton>
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
