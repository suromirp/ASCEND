// Het blad om een training in Forge af te ronden of af te vinken.

import { useEffect, useRef, useState } from 'react';
import { progress, type WorkoutExercise } from '../../engine/forgeWorkout';
import { isLegHeavyTemplate } from '../../engine/scheduler';
import type { SessionTemplate } from '../../models/training';
import type { PainReport } from '../../models/checkIn';
import { addDays, formatDateNL, todayISO, weekdayShortNL } from '../../utils/dates';
import { TimeoutError, withTimeout } from '../../utils/withTimeout';
import { NumberField } from '../NumberField';
import { PainReportFields } from '../PainReportFields';
import { PrimaryButton, SecondaryButton } from '../ui';
import { finishDuration } from '../../engine/forgeSession';
import { ForgeSheet } from './parts';
import { forgeFinishNote, type ForgeFinishNote } from './forgeFinishLog';

const FEEL_LABEL: Record<'better' | 'normal' | 'worse', string> = { better: 'Beter', normal: 'Normaal', worse: 'Slechter' };

// Hoe lang Opslaan mag duren voordat het scherm zegt dat het langer duurt.
const SAVE_LIMIT_MS = 15_000;

// --- afronden ---------------------------------------------------------------------------

export interface FinishExtra {
  minutes: number;
  rpe?: number;
  feel?: 'better' | 'normal' | 'worse';
  pain: PainReport[];
  notes: string;
  doneOn: string;
}

export function FinishSheet({
  template,
  readOnly,
  workout,
  elapsedSeconds,
  defaultMinutes,
  plannedSessionId,
  scheduledDate,
  onClose,
  onSave,
}: {
  template: SessionTemplate;
  readOnly: boolean;
  workout: WorkoutExercise[];
  elapsedSeconds: number;
  defaultMinutes: number;
  plannedSessionId?: string;
  scheduledDate?: string;
  onClose: () => void;
  // `seen`: leest iemand de zin van dit blad nog? Nee als het weg is, aan het sluiten, of al zei dat het langer duurt.
  onSave: (extra: FinishExtra, seen: () => boolean) => Promise<boolean>;
}) {
  const today = todayISO();
  const { done, total } = progress(workout);
  const anyTicked = workout.some((e) => e.rows.some((r) => r.done));
  // Boven vier uur actieve tijd is de klok verdacht: dan staat hier je gewone duur en zegt een regel wat de klok zei.
  const dur = finishDuration(elapsedSeconds, defaultMinutes);
  const [minutes, setMinutes] = useState<number | undefined>(readOnly || !anyTicked ? defaultMinutes : dur.minutes);
  const [rpe, setRpe] = useState<number | undefined>();
  const [feel, setFeel] = useState<FinishExtra['feel']>();
  const [pain, setPain] = useState<PainReport[]>([]);
  const [notes, setNotes] = useState('');
  const plannedInPast = !!plannedSessionId && !!scheduledDate && scheduledDate < today;
  const [doneOn, setDoneOn] = useState(plannedInPast ? scheduledDate! : today);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<ForgeFinishNote | null>(null);
  const busy = useRef(false);
  // Weg of aan het sluiten: dan leest niemand de zin hier.
  const away = useRef(false);
  useEffect(() => {
    away.current = false;
    return () => {
      away.current = true;
    };
  }, []);
  const notTicked = total - done;

  async function save() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setOutcome(null);
    // Na de grens zei het blad al dat het langer duurt: een nee dat dan nog komt gaat bovenin.
    let late = false;
    let sawWriteError = false;
    try {
      const ok = await withTimeout(onSave({ minutes: minutes ?? 0, rpe, feel, pain, notes, doneOn }, () => {
        // Alleen gevraagd bij een schrijffout (ForgeSheets, reportIfGone): zo weet het blad dat het echt mislukte.
        sawWriteError = true;
        return !late && !away.current;
      }), SAVE_LIMIT_MS);
      if (ok === true) return;
      setOutcome(forgeFinishNote('already'));
    } catch (err) {
      late = err instanceof TimeoutError;
      setOutcome(forgeFinishNote(late ? 'slow' : sawWriteError ? 'failed' : 'stillRunning'));
    }
    busy.current = false;
    setSaving(false);
  }

  return (
    <ForgeSheet
      title={readOnly ? 'Training afvinken' : 'Training afronden'}
      sub={readOnly ? 'Sets en gewichten komen uit MacroFactor.' : `${done} van ${total} werksets gedaan.${notTicked > 0 && anyTicked ? ' Wat niet is afgevinkt, wordt niet bewaard.' : ''}`}
      onClose={onClose}
      onLeave={() => { away.current = true; }}
    >
      {(close) => (
        <div className="flex flex-col gap-4">
          {!readOnly && !anyTicked && (
            <p className="text-xs leading-snug" style={{ color: 'var(--color-warning)' }}>Je hebt nog geen set afgevinkt. Dan wordt alleen de training afgevinkt, zonder sets.</p>
          )}
          {!readOnly && anyTicked && dur.clamped && (
            <p className="text-xs leading-snug" style={{ color: 'var(--color-warning)' }}>De klok zegt {dur.clockSaid}. Klopt dat niet, dan staat hier je gewone duur.</p>
          )}
          {(plannedInPast || !plannedSessionId) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span style={{ color: 'var(--color-ink-dim)' }}>Gedaan op</span>
              {plannedInPast ? (
                [scheduledDate!, today].map((d) => (
                  <button key={d} type="button" onClick={() => setDoneOn(d)} className="min-h-[44px] rounded-full border px-3" style={{ borderColor: doneOn === d ? 'var(--color-ink)' : 'var(--color-card-border)', color: 'var(--color-ink)' }}>
                    {d === today ? 'vandaag' : `${weekdayShortNL(d).toLowerCase()} ${formatDateNL(d)}`}
                  </button>
                ))
              ) : (
                <input type="date" lang="nl" value={doneOn} max={today} min={addDays(today, -60)} onChange={(e) => e.target.value && setDoneOn(e.target.value)} className="rounded-lg border bg-transparent px-2" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)', colorScheme: 'dark' }} />
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm" style={{ color: 'var(--color-ink)' }}>Duur</span>
            <div className="w-32"><NumberField value={minutes} onChange={setMinutes} unit="min" tall /></div>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Zwaarte (RPE) van de hele training, als je wilt</p>
            <div className="mt-2 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Zwaarte van 1 tot 10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rpe === n} onClick={() => setRpe(rpe === n ? undefined : n)} className="min-h-[44px] rounded-lg border font-sans text-sm tabular-nums" style={{ borderColor: rpe === n ? 'var(--color-ink)' : 'var(--color-card-border)', background: rpe === n ? 'var(--color-surface)' : 'transparent', color: rpe === n ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Ten opzichte van normaal</p>
            <div className="mt-2 flex gap-2">
              {(['better', 'normal', 'worse'] as const).map((f) => (
                <button key={f} type="button" aria-pressed={feel === f} onClick={() => setFeel(feel === f ? undefined : f)} className="min-h-[44px] flex-1 rounded-lg border text-sm" style={{ borderColor: feel === f ? 'var(--color-ink)' : 'var(--color-card-border)', color: feel === f ? 'var(--color-ink)' : 'var(--color-ink-dim)' }}>
                  {FEEL_LABEL[f]}
                </button>
              ))}
            </div>
          </div>
          {isLegHeavyTemplate(template) && <PainReportFields value={pain} onChange={setPain} />}
          <div>
            <label htmlFor="forge-notes" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Notitie bij deze training</label>
            <textarea id="forge-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }} />
          </div>
          {outcome && <p className="text-xs leading-snug" role="status" style={{ color: outcome.warn ? 'var(--color-warning)' : 'var(--color-ink-dim)' }}>{outcome.text}</p>}
          <div className="flex gap-3">
            <SecondaryButton onClick={close}>Annuleren</SecondaryButton>
            <PrimaryButton
              fullWidth={false}
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? 'Opslaan…' : readOnly ? 'Afvinken' : 'Opslaan'}
            </PrimaryButton>
          </div>
        </div>
      )}
    </ForgeSheet>
  );
}
