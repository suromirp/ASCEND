// Het blad om een training in Forge af te ronden of af te vinken.

import { useEffect, useRef, useState } from 'react';
import { lastWorkMoment, progress, type WorkoutExercise } from '../../engine/forgeWorkout';
import { isLegHeavyTemplate } from '../../engine/scheduler';
import type { SessionTemplate } from '../../models/training';
import type { PainReport } from '../../models/checkIn';
import { addDays, formatDateNL, toISODate, todayISO, weekdayShortNL } from '../../utils/dates';
import { TimeoutError, withTimeout } from '../../utils/withTimeout';
import { NumberField } from '../NumberField';
import { PainReportFields } from '../PainReportFields';
import { Chip, PrimaryButton, SecondaryButton } from '../ui';
import { finishDayChoices, finishDayDefault, finishDuration } from '../../engine/forgeSession';
import { durationTooShort, entryMinutes, SHORT_DURATION_TEXT } from '../../engine/inputLimits';
import { ForgeSheet } from './parts';
import { forgeAfterEarlier, forgeExitLabel, forgeFinishNote, type ForgeFinishNote, type ForgeFinishNoteKind } from './forgeFinishLog';
import { waitForEarlierSave } from '../../state/logSave';

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
  // Een concept van gisteren afronden: de dag van je laatst afgevinkte set, ook bij een geplande training die je een
  // dag eerder of later deed (de training blijft gekoppeld; alleen de dag van het nieuwe log volgt het werk). Een set
  // die je later uit en weer aan zette telt op de eerste keer (I-45).
  const [lastTickAt] = useState(() => lastWorkMoment(workout));
  const dayOf = (ms: number) => toISODate(new Date(ms));
  const tick = lastTickAt !== undefined ? { lastTickAt } : {};
  const [doneOn, setDoneOn] = useState(() => finishDayDefault({ today, plannedSessionId, scheduledDate, ...tick, dayOf }));
  // Een geplande training: de geplande dag, de dag van je laatste set en vandaag als knoppen (alleen als er iets te kiezen is).
  const dayChoices = plannedSessionId ? finishDayChoices({ today, scheduledDate, ...tick, dayOf }) : [];
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<ForgeFinishNote | null>(null);
  const [outcomeKind, setOutcomeKind] = useState<ForgeFinishNoteKind>();
  const show = (kind: ForgeFinishNoteKind) => {
    setOutcomeKind(kind);
    setOutcome(forgeFinishNote(kind));
  };
  // Een eerdere poging voor deze training loopt nog: Opslaan blijft uit tot ze klaar is of faalt, hoogstens
  // EARLIER_SAVE_LIMIT_MS (state/logSave.ts#waitForEarlierSave, I-135).
  const [waiting, setWaiting] = useState(false);
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
  // Onder 1 minuut is geen training: Opslaan uit met één zin (profielen 14 november, punt B).
  const tooShort = durationTooShort(minutes);

  async function save() {
    if (busy.current || tooShort) return;
    busy.current = true;
    setSaving(true);
    setOutcome(null);
    setOutcomeKind(undefined);
    // Na de grens zei het blad al dat het langer duurt: een nee dat dan nog komt gaat bovenin.
    let late = false;
    let sawWriteError = false;
    try {
      const ok = await withTimeout(onSave({ minutes: entryMinutes(minutes), rpe, feel, pain, notes, doneOn }, () => {
        // Alleen gevraagd bij een schrijffout (ForgeSheets, reportIfGone): zo weet het blad dat het echt mislukte.
        sawWriteError = true;
        return !late && !away.current;
      }), SAVE_LIMIT_MS);
      if (ok === true) return;
      show('already');
    } catch (err) {
      late = err instanceof TimeoutError;
      const kind = late ? 'slow' : sawWriteError ? 'failed' : 'stillRunning';
      show(kind);
      if (kind === 'stillRunning') {
        // Busy blijft aan tegen een dubbele tik; de knop staat uit via `waiting`, zonder "Opslaan…".
        setSaving(false);
        setWaiting(true);
        const after = await waitForEarlierSave({ plannedSessionId });
        if (away.current) return;
        setWaiting(false);
        show(forgeAfterEarlier(after));
      }
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
          {(dayChoices.length > 0 || !plannedSessionId) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span style={{ color: 'var(--color-ink-dim)' }}>Gedaan op</span>
              {plannedSessionId ? (
                dayChoices.map((d) => (
                  <Chip key={d} tone="quiet" selected={doneOn === d} onClick={() => setDoneOn(d)}>
                    {d === today ? 'vandaag' : `${weekdayShortNL(d).toLowerCase()} ${formatDateNL(d)}`}
                  </Chip>
                ))
              ) : (
                <input type="date" lang="nl" value={doneOn} max={today} min={addDays(today, -60)} onChange={(e) => e.target.value && setDoneOn(e.target.value)} className="min-h-[44px] rounded-lg border bg-transparent px-2 py-1.5" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)', colorScheme: 'dark' }} />
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm" style={{ color: 'var(--color-ink)' }}>Duur</span>
            <div className="w-32"><NumberField value={minutes} onChange={setMinutes} unit="min" tall /></div>
          </div>
          {tooShort && <p className="-mt-2 text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{SHORT_DURATION_TEXT}</p>}
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
            <SecondaryButton onClick={close}>{forgeExitLabel(outcomeKind)}</SecondaryButton>
            <PrimaryButton
              fullWidth={false}
              disabled={saving || waiting || tooShort}
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
