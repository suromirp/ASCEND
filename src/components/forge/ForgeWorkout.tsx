// ASCEND: het workoutscherm van Forge. Opbouw en werking zoals MacroFactor
// Workouts, in de stijl van ASCEND (steen en contour, één gouden knop):
// per oefening een tabel die altijd open staat, alles vooringevuld, één tik
// per set, de rusttimer start vanzelf, en bij een stang de schijven per kant.
// Besluit: docs/beslissingen/2026-10-22-forge-workoutscherm.md. Alle regels
// staan in engine/forgeWorkout.ts; dit bestand toont ze en bewaart een concept.
//
// Met MacroFactor als bron (Instellingen, Krachttraining bijhouden) is het
// dezelfde tabel zonder invulvelden: het voorschrift om in de sportschool mee
// te kijken, en één knop om de training af te vinken.

import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { exerciseById } from '../../data/exercises';
import { MUSCLE_LABEL } from '../../models/exercise';
import { currentBodyKg } from '../../engine/bodyWeight';
import {
  activeRow,
  applyReps,
  applyWeight,
  mergeDraft,
  copyRow,
  exerciseComplete,
  exerciseSummary,
  makeSnap,
  plateShortText,
  nextField,
  plateSideText,
  removeRow,
  repsBounds,
  stepNumber,
  takeTarget,
  weightBounds,
  weightStepFor,
  REPS_STEP,
  type FieldName,
  type FieldRef,
  type RowRef,
} from '../../engine/forgeInput';
import {
  addRow,
  exerciseOf,
  formatClock,
  hardestLegRir,
  legDayLine,
  planExercise,
  planState,
  planWorkout,
  plateSteps,
  previousFor,
  previousText,
  progress,
  removeLastRow,
  repsText,
  swapOptions,
  targetText,
  tickAllRows,
  tickRow,
  toStrengthData,
  updateRow,
  usesPlates,
  type PlanContext,
  type PlateStep,
  type WorkoutExercise,
  type WorkoutRow,
} from '../../engine/forgeWorkout';
import type { GymProfile } from '../../engine/strengthSettings';
import { programExercisesFor } from '../../engine/macrofactorProgram';
import { isLegHeavyTemplate } from '../../engine/scheduler';
import { templateSport } from '../../engine/sports';
import { durationForVariant, exercisesForVariant, resolveVariantDuration } from '../../engine/substitutions';
import { EXERCISE_NOTE_MAX, REST_LIMITS, resolveStrengthSettings, withExerciseValue } from '../../engine/strengthSettings';
import { getTrainingGuide, guideDayLabel } from '../../data/trainingGuide';
import type { Program } from '../../models/program';
import type { SessionTemplate, SessionVariant } from '../../models/training';
import type { PainReport } from '../../models/checkIn';
import { useAppData } from '../../state/AppDataContext';
import { addDays, formatDateNL, todayISO, weekdayShortNL } from '../../utils/dates';
import { haptics } from '../../utils/haptics';
import { animateEl, reducedMotion } from '../../utils/motion';
import { clearDraft, draftKey, loadDraft, saveDraft } from '../../utils/loggerDraft';
import { formatNumberNL } from '../../utils/number';
import { playRestSound, primeAudio } from '../../utils/sound';
import { useBackToClose } from '../../utils/useBackToClose';
import { Icon } from '../icons';
import { NumberField } from '../NumberField';
import { PainReportFields } from '../PainReportFields';
import { Portal } from '../Portal';
import { TrainingGuideSheet } from '../TrainingGuideSheet';
import { PrimaryButton, SecondaryButton } from '../ui';
import { InputDock } from './InputDock';
import { ForgeSheet, LongPressRow, MenuRow, RirBubble, TickBox, ValueCell } from './parts';
import { useWakeLock } from './useWakeLock';

const DRAFT_VERSION = 1;
// Een concept ouder dan anderhalve dag is een vergeten training, geen pauze.
const DRAFT_MAX_AGE_MS = 36 * 60 * 60 * 1000;
// Na afloop blijft de balk nog even staan, dan verdwijnt hij.
const REST_DONE_LINGER_MS = 8000;

interface Rest {
  endsAt: number;
  total: number;
  name: string;
}

interface WorkoutDraft {
  v: number;
  savedAt: number;
  startedAt: number;
  exercises: WorkoutExercise[];
  rest?: Rest;
  column: 'target' | 'previous';
}

const clock = () => Date.now();

const FEEL_LABEL: Record<'better' | 'normal' | 'worse', string> = { better: 'Beter', normal: 'Normaal', worse: 'Slechter' };

export function ForgeWorkout({
  template,
  plannedSessionId,
  scheduledDate,
  program,
  initialVariant = 'full',
  startAtForm = false,
  onClose,
}: {
  template: SessionTemplate;
  plannedSessionId?: string;
  scheduledDate?: string;
  program?: Program | null;
  initialVariant?: SessionVariant;
  startAtForm?: boolean;
  onClose: () => void;
}) {
  const { logSession, settings, updateSettings, strengthExternal, templates, sessionLogs } = useAppData();
  const today = todayISO();
  const date = scheduledDate ?? today;
  const readOnly = strengthExternal;
  const strength = useMemo(() => resolveStrengthSettings(settings.strengthModel), [settings.strengthModel]);
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  // A program from MacroFactor gives the exercises of the week of this training.
  const programSlots = programExercisesFor(settings.strengthModel?.program, template.id, date);
  const slots = exercisesForVariant(programSlots ? { ...template, exercises: programSlots } : template, initialVariant);

  const key = `${draftKey(template.id, plannedSessionId, scheduledDate)}:forge`;
  const [restored] = useState(() => {
    const d = loadDraft<WorkoutDraft>(key, 'local');
    if (!d || d.v !== DRAFT_VERSION || !Array.isArray(d.exercises) || typeof d.startedAt !== 'number') return undefined;
    const expired = typeof d.savedAt === 'number' && Date.now() - d.savedAt > DRAFT_MAX_AGE_MS;
    const logged = !!plannedSessionId && sessionLogs.some((l) => l.plannedSessionId === plannedSessionId);
    if (expired || logged) {
      clearDraft(key, 'local');
      return undefined;
    }
    return d as WorkoutDraft;
  });

  // De planning van de rijen, één keer: de geschiedenis per oefening uit de logs.
  const [ctx] = useState<PlanContext>(() => ({ logs: sessionLogs, templates, program, bodyKg, settings: strength, date, modelOn: strength.enabled }));
  const [workout, setWorkout] = useState<WorkoutExercise[]>(() => (restored ? mergeDraft(restored.exercises, planWorkout(slots, ctx)) : planWorkout(slots, ctx)));
  // De klok loopt vanaf je eerste afgevinkte set; een training die je opende maar nog niet begon, start opnieuw.
  const [startedAt] = useState(() => (restored && restored.exercises.some((e) => e.rows.some((r) => r.done)) ? restored.startedAt : Date.now()));
  const [rest, setRest] = useState<Rest | undefined>(() => (restored?.rest && restored.rest.endsAt > Date.now() - REST_DONE_LINGER_MS ? restored.rest : undefined));
  const [column, setColumn] = useState<'target' | 'previous'>(restored?.column ?? 'target');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [rirFor, setRirFor] = useState<{ slot: string; rowId: string } | null>(null);
  const [workoutMenu, setWorkoutMenu] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [finishing, setFinishing] = useState(startAtForm);
  const [showGuide, setShowGuide] = useState(false);
  // Het invoerpaneel en wat er rond de tabel meebeweegt.
  const [dock, setDock] = useState<FieldRef | null>(null);
  const [selected, setSelected] = useState(true);
  const [dockH, setDockH] = useState(0);
  const [platesOn, setPlatesOn] = useState(true);
  const [rowMenu, setRowMenu] = useState<RowRef | null>(null);
  // De set die nu aan de beurt is, en de oefeningen die zijn ingeklapt.
  const [activeRef, setActiveRef] = useState<RowRef | undefined>(() => activeRow(workout));
  const [folded, setFolded] = useState<Record<string, boolean>>(() => Object.fromEntries(workout.filter(exerciseComplete).map((e) => [e.slot, true])));
  const scrollEl = useRef<HTMLDivElement>(null);
  const headerEl = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);
  // De oefening zoals hij was toen je dit veld begon te bewerken (zie applyWeight).
  const baseRef = useRef<{ key: string; ex: WorkoutExercise } | null>(null);
  const layout = useRef({ dockH: 0, restH: 0 });

  useWakeLock(strength.keepScreenOn);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const onDockHeight = useCallback((h: number) => setDockH(h), []);
  useEffect(() => {
    layout.current = { dockH, restH: rest && !readOnly ? 70 : 0 };
  });

  // Een set in beeld: net boven het paneel als dat openstaat, anders in het midden.
  // Alleen als hij niet al helemaal te zien is, zodat het scherm niet onnodig beweegt.
  function scrollToRow(rowId: string) {
    const root = scrollEl.current;
    const el = root?.querySelector(`[data-row-id="${CSS.escape(rowId)}"]`);
    if (!root || !el) return;
    const r = el.getBoundingClientRect();
    const top = (headerEl.current?.offsetHeight ?? 90) + 8;
    const bottom = window.innerHeight - layout.current.dockH - layout.current.restH - 8;
    if (r.top >= top && r.bottom <= bottom) return;
    const target = layout.current.dockH > 0 ? bottom - r.height : top + Math.max(0, (bottom - top - r.height) / 2);
    root.scrollTo({ top: root.scrollTop + r.top - target, behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
  const dockKey = dock ? `${dock.slot}:${dock.rowId}` : '';
  const dockRowId = dock?.rowId;
  useEffect(() => {
    if (!dockRowId || dockH === 0) return;
    scrollToRow(dockRowId);
  }, [dockKey, dockH, dockRowId]);

  // Het concept wegschrijven kort na een verandering (niet bij elke toets), en altijd
  // als je het scherm verlaat of de app naar de achtergrond gaat.
  const pendingDraft = useRef<WorkoutDraft | null>(null);
  const draftTimer = useRef<number | undefined>(undefined);
  const flushDraft = useCallback(() => {
    window.clearTimeout(draftTimer.current);
    draftTimer.current = undefined;
    if (pendingDraft.current) saveDraft(key, pendingDraft.current, 'local');
    pendingDraft.current = null;
  }, [key]);
  const dropDraft = useCallback(() => {
    window.clearTimeout(draftTimer.current);
    draftTimer.current = undefined;
    pendingDraft.current = null;
    clearDraft(key, 'local');
  }, [key]);
  useEffect(() => {
    if (readOnly) return;
    pendingDraft.current = { v: DRAFT_VERSION, savedAt: Date.now(), startedAt, exercises: workout, ...(rest ? { rest } : {}), column };
    if (draftTimer.current === undefined) draftTimer.current = window.setTimeout(flushDraft, 300);
  }, [readOnly, startedAt, workout, rest, column, flushDraft]);
  useEffect(() => {
    window.addEventListener('pagehide', flushDraft);
    document.addEventListener('visibilitychange', flushDraft);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      document.removeEventListener('visibilitychange', flushDraft);
      flushDraft();
    };
  }, [flushDraft]);

  // Het einde van de rust: één keer trillen en een geluid, zoals ingesteld; een
  // tijdje daarna verdwijnt de balk. Eén timer per eindtijd, geen klok die het scherm ververst.
  const alerted = useRef<number | null>(null);
  useEffect(() => {
    if (!rest) return;
    const end = rest.endsAt;
    const fire = window.setTimeout(() => {
      if (alerted.current === end) return;
      alerted.current = end;
      if (Date.now() - end < 3000) {
        if (strength.restAlert === 'sound_vibrate' || strength.restAlert === 'vibrate') haptics.alarm();
        if (strength.restAlert === 'sound_vibrate' || strength.restAlert === 'sound') playRestSound(strength.restSound);
      }
    }, Math.max(0, end - Date.now()));
    const drop = window.setTimeout(() => setRest((r) => (r && r.endsAt === end ? undefined : r)), Math.max(0, end + REST_DONE_LINGER_MS - Date.now()));
    return () => {
      window.clearTimeout(fire);
      window.clearTimeout(drop);
    };
  }, [rest, strength.restAlert, strength.restSound]);

  // Terug laat de training staan (het concept blijft); weggooien gaat via het menu.
  useBackToClose(true, onClose);

  // De schijven van de oefening bij het invoerpaneel (de tabel rekent de zijne zelf, per oefening).
  const dockPlates = useMemo(() => {
    const ex = dock ? workout.find((e) => e.slot === dock.slot) : undefined;
    return ex && usesPlates(exerciseOf(ex)) ? plateSteps(ex, strength.profile) : undefined;
  }, [dock, workout, strength.profile]);

  const legDay = isLegHeavyTemplate(template);
  const legLine = useMemo(() => (legDay ? legDayLine(date, { logs: sessionLogs, templates, program, bodyKg }) : undefined), [legDay, date, sessionLogs, templates, program, bodyKg]);
  const { done, total } = progress(workout);
  const guide = getTrainingGuide(template.id);

  function setExercise(slot: string, update: (ex: WorkoutExercise) => WorkoutExercise) {
    baseRef.current = null;
    setWorkout((w) => w.map((e) => (e.slot === slot ? update(e) : e)));
  }

  function tick(slot: string, rowId: string) {
    haptics.tap();
    primeAudio();
    baseRef.current = null;
    const result = tickRow(workout, slot, rowId);
    setWorkout(result.workout);
    // De focus schuift vloeiend naar de volgende open set; is de oefening af, dan
    // klapt hij zacht in en gaat het scherm naar de volgende oefening.
    const ticked = result.workout.find((e) => e.slot === slot)?.rows.find((r) => r.id === rowId)?.done;
    if (ticked) {
      const next = activeRow(result.workout, { slot, rowId });
      setActiveRef(next);
      const after = result.workout.find((e) => e.slot === slot);
      if (after && exerciseComplete(after)) {
        if (dock?.slot === slot) setDock(null);
        const calm = reducedMotion();
        later(() => {
          setFolded((f) => ({ ...f, [slot]: true }));
          if (next) later(() => scrollToRow(next.rowId), calm ? 0 : 320);
        }, calm ? 0 : 380);
      } else if (next) {
        later(() => scrollToRow(next.rowId), 140);
      }
    } else {
      setActiveRef({ slot, rowId });
    }
    if (result.restSec && strength.restAuto) {
      const ex = workout.find((e) => e.slot === slot);
      alerted.current = null;
      setRest({ endsAt: clock() + result.restSec * 1000, total: result.restSec, name: ex?.name ?? '' });
    }
  }

  function tickAll(slot: string) {
    haptics.tap();
    primeAudio();
    baseRef.current = null;
    const result = tickAllRows(workout, slot);
    setWorkout(result.workout);
    const after = result.workout.find((e) => e.slot === slot);
    if (after && exerciseComplete(after)) {
      if (dock?.slot === slot) setDock(null);
      const next = activeRow(result.workout);
      setActiveRef(next);
      const calm = reducedMotion();
      later(() => {
        setFolded((f) => ({ ...f, [slot]: true }));
        if (next) later(() => scrollToRow(next.rowId), calm ? 0 : 320);
      }, calm ? 0 : 380);
    }
    if (result.restSec && strength.restAuto) {
      const ex = workout.find((e) => e.slot === slot);
      alerted.current = null;
      setRest({ endsAt: clock() + result.restSec * 1000, total: result.restSec, name: ex?.name ?? '' });
    }
  }

  function openField(slot: string, rowId: string, field: FieldName) {
    if (readOnly) return;
    baseRef.current = null;
    setDock({ slot, rowId, field });
    setSelected(true);
    setActiveRef({ slot, rowId });
  }

  function changeValue(v: number | undefined) {
    const d = dock;
    if (!d) return;
    const key = `${d.slot}:${d.rowId}:${d.field}`;
    setWorkout((w) =>
      w.map((e) => {
        if (e.slot !== d.slot) return e;
        if (d.field === 'reps') return applyReps(e, d.rowId, v);
        if (baseRef.current?.key !== key) baseRef.current = { key, ex: e };
        return applyWeight(baseRef.current.ex, d.rowId, v, strength.carryWeights, makeSnap(exerciseOf(e), strength.profile, bodyKg, v), weightBounds(exerciseOf(e)).min);
      }),
    );
  }

  function stepDock(direction: 1 | -1): number {
    const d = dock;
    const ex = d ? workout.find((e) => e.slot === d.slot) : undefined;
    const row = ex?.rows.find((r) => r.id === d?.rowId);
    if (!d || !ex || !row) return 0;
    const isWeight = d.field === 'weightKg';
    const current = isWeight ? (row.weightKg ?? row.target.weightKg) : (row.reps ?? 0);
    const step = isWeight ? weightStepFor(exerciseOf(ex), strength.profile, current) : REPS_STEP;
    // Hulp van een toestel: het blok werkt met de hoeveelheid hulp (+ is meer hulp), opgeslagen als negatief.
    if (isWeight && isAssisted(ex)) {
      const help = stepNumber(Math.abs(current ?? 0), direction, step, 0, weightBounds(undefined).max);
      changeValue(-help);
      return help;
    }
    const bounds = isWeight ? weightBounds(exerciseOf(ex)) : repsBounds;
    const next = stepNumber(current, direction, step, bounds.min, bounds.max);
    changeValue(next);
    return next;
  }

  function goNext(close: () => void) {
    const n = dock ? nextField(workout, dock) : undefined;
    if (!n) {
      close();
      return;
    }
    baseRef.current = null;
    setDock(n);
    setSelected(true);
    setActiveRef({ slot: n.slot, rowId: n.rowId });
  }

  function take(slot: string, rowId: string) {
    haptics.tap();
    setExercise(slot, (e) => takeTarget(e, rowId));
    setActiveRef({ slot, rowId });
  }

  // Vaste handelingen voor de tabel (zie BlockActions), die altijd de nieuwste staat gebruiken.
  const latest = useRef({ tick, tickAll, openField, take, setExercise });
  useEffect(() => {
    latest.current = { tick, tickAll, openField, take, setExercise };
  });
  const actions = useMemo<BlockActions>(
    () => ({
      column: () => setColumn((c) => (c === 'target' ? 'previous' : 'target')),
      fold: (slot) => setFolded((f) => ({ ...f, [slot]: !f[slot] })),
      menu: (slot) => setMenuFor(slot),
      tick: (slot, rowId) => latest.current.tick(slot, rowId),
      tickAll: (slot) => latest.current.tickAll(slot),
      open: (slot, rowId, name) => latest.current.openField(slot, rowId, name),
      take: (slot, rowId) => latest.current.take(slot, rowId),
      rowMenu: (slot, rowId) => setRowMenu({ slot, rowId }),
      rir: (slot, rowId) => setRirFor({ slot, rowId }),
      add: (slot) => latest.current.setExercise(slot, (e) => addRow(e, 'work')),
    }),
    [],
  );

  function swap(slot: string, exerciseId: string | null) {
    const prescription = slots.find((s) => s.id === slot);
    if (!prescription) return;
    const state = planState(ctx);
    const to = exerciseId ? exerciseById(exerciseId) : undefined;
    setExercise(slot, () => planExercise(prescription, ctx, state, to));
  }

  function saveStrength(next: typeof settings.strengthModel) {
    void updateSettings({ strengthModel: next });
  }

  const menuEx = workout.find((e) => e.slot === menuFor);
  const swapEx = workout.find((e) => e.slot === swapFor);
  const noteEx = workout.find((e) => e.slot === noteFor);
  const dockEx = dock ? workout.find((e) => e.slot === dock.slot) : undefined;
  const dockIndex = dockEx && dock ? dockEx.rows.findIndex((r) => r.id === dock.rowId) : -1;
  const dockRow = dockEx && dockIndex >= 0 ? dockEx.rows[dockIndex] : undefined;
  const rowMenuEx = rowMenu ? workout.find((e) => e.slot === rowMenu.slot) : undefined;
  const rowMenuRow = rowMenuEx?.rows.find((r) => r.id === rowMenu?.rowId);
  const rirRow = rirFor ? workout.find((e) => e.slot === rirFor.slot)?.rows.find((r) => r.id === rirFor.rowId) : undefined;

  return (
    <Portal>
      <div ref={scrollEl} id="forge-scroll" className="fixed inset-0 z-50 overflow-y-auto animate-fade-in" style={{ background: 'var(--color-bg)' }}>
        <div className="mx-auto max-w-md" style={{ paddingBottom: dockH > 0 ? dockH + (rest && !readOnly ? 70 : 0) + 16 : rest ? 120 : 48 }}>
          <header ref={headerEl} className="sticky top-0 z-20 border-b px-2" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-card-border)', paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="flex items-center gap-1 pt-1">
              <button type="button" onClick={onClose} aria-label="Terug, de training blijft staan" className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
                <Icon name="terug" size={22} />
              </button>
              <h1 className="min-w-0 flex-1 truncate font-display text-xl" style={{ color: 'var(--color-ink)' }}>{template.name}</h1>
              <button type="button" onClick={() => setWorkoutMenu(true)} aria-label="Menu van de training" className="flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
                <Icon name="meer" size={22} />
              </button>
              <button
                type="button"
                onClick={() => setFinishing(true)}
                className="min-h-[44px] shrink-0 rounded-xl px-4 text-sm font-semibold active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-bronze))', color: 'var(--color-on-gold)' }}
              >
                {readOnly ? 'Afvinken' : 'Afronden'}
              </button>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-3 px-2 pb-2 text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                <ElapsedClock startedAt={startedAt} />
                <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-card-border)' }} aria-hidden="true">
                  <div className="h-1 rounded-full transition-[width] duration-300" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%`, background: 'var(--color-bronze)' }} />
                </div>
                <span className="font-sans">{done} van {total} sets</span>
              </div>
            )}
          </header>

          {(legLine || readOnly) && (
            <div className="flex flex-col gap-1 px-4 pt-3">
              {readOnly && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Je houdt kracht bij in MacroFactor. Dit is het voorschrift om mee te kijken; afvinken doe je hier als je klaar bent.</p>}
              {legLine && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{legLine}</p>}
            </div>
          )}

          {workout.length === 0 && (
            <p className="px-4 pt-6 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Deze training heeft nog geen oefeningen.</p>
          )}

          {workout.map((ex, i) => (
            <ExerciseBlock
              key={ex.slot}
              ex={ex}
              first={i === 0}
              readOnly={readOnly}
              column={column}
              note={strength.exerciseNotes[ex.exerciseId]}
              active={activeRef?.slot === ex.slot ? activeRef.rowId : undefined}
              field={dock?.slot === ex.slot ? dock : null}
              selected={dock?.slot === ex.slot && selected}
              folded={!!folded[ex.slot] && exerciseComplete(ex)}
              profile={strength.profile}
              showPlates={strength.showPlates}
              act={actions}
            />
          ))}
        </div>

        {rest && !readOnly && (
          <RestBar
            rest={rest}
            lift={dockH}
            onAdd={(s) => setRest((r) => (r ? { ...r, endsAt: Math.max(Date.now(), r.endsAt) + s * 1000, total: r.total + s } : r))}
            onSkip={() => setRest(undefined)}
          />
        )}
      </div>

      {dock && !readOnly && dockEx && dockRow && (
        <InputDock
          key={`${dock.slot}:${dock.rowId}:${dock.field}`}
          label={`${dock.field === 'weightKg' ? (isAssisted(dockEx) ? 'Hulp' : 'Gewicht') : 'Herhalingen'}, set ${dockRowLabel(dockEx, dockIndex)}, ${dockEx.name}`}
          fieldKey={`${dock.slot}:${dock.rowId}:${dock.field}`}
          value={dock.field === 'weightKg' ? (isAssisted(dockEx) && dockRow.weightKg !== undefined ? Math.abs(dockRow.weightKg) : dockRow.weightKg) : dockRow.reps}
          decimals={dock.field === 'weightKg' ? 2 : 0}
          onChange={(v) => changeValue(dock.field === 'weightKg' && isAssisted(dockEx) && v !== undefined ? -v : v)}
          onStep={stepDock}
          onSelected={setSelected}
          onNext={goNext}
          onClose={() => setDock(null)}
          onHeight={onDockHeight}
          plate={dockPlates?.[dockIndex]}
          plateOn={platesOn}
          onTogglePlates={() => setPlatesOn((v) => !v)}
        />
      )}

      {rowMenu && rowMenuEx && rowMenuRow && (
        <ForgeSheet title={rowMenuEx.name} sub={rowMenuRow.kind === 'warmup' ? 'Opwarmset' : `Werkset ${rowMenuEx.rows.filter((r) => r.kind === 'work').indexOf(rowMenuRow) + 1}`} onClose={() => setRowMenu(null)}>
          {(close) => (
            <div className="flex flex-col">
              {!rowMenuRow.done && <MenuRow icon="vinkje" title="Voorschrift overnemen" sub="Kilo's en herhalingen zoals het voorschrift ze vraagt." onClick={() => { take(rowMenuEx.slot, rowMenuRow.id); close(); }} />}
              <MenuRow icon="plus" title="Set kopiëren" sub="Een kopie van deze set eronder." onClick={() => { setExercise(rowMenuEx.slot, (e) => copyRow(e, rowMenuRow.id)); close(); }} />
              {!rowMenuRow.done && rowMenuEx.rows.length > 1 && <MenuRow icon="min" title="Set weghalen" danger onClick={() => { setExercise(rowMenuEx.slot, (e) => removeRow(e, rowMenuRow.id)); close(); }} />}
            </div>
          )}
        </ForgeSheet>
      )}

      {menuEx && (
        <ForgeSheet title={menuEx.name} sub={menuEx.swappedFrom ? `In plaats van ${menuEx.swappedFrom}, alleen deze training` : undefined} onClose={() => setMenuFor(null)}>
          {(close) => (
            <div className="flex flex-col">
              {!readOnly && (
                <MenuRow icon="ruilen" title="Ruilen" sub="Zelfde spieren, met wat je sportschool heeft. Alleen voor deze training." onClick={() => { close(); setSwapFor(menuEx.slot); }} />
              )}
              <MenuRow icon="notitie" title="Notitie" sub={strength.exerciseNotes[menuEx.exerciseId] ?? 'Bijvoorbeeld de stand van de stoel. Blijft bij deze oefening staan.'} onClick={() => { close(); setNoteFor(menuEx.slot); }} />
              {!readOnly && !menuEx.timed && (
                <>
                  <MenuRow icon="plus" title="Set toevoegen" onClick={() => { setExercise(menuEx.slot, (e) => addRow(e, 'work')); close(); }} />
                  <MenuRow icon="plus" title="Opwarmset toevoegen" onClick={() => { setExercise(menuEx.slot, (e) => addRow(e, 'warmup')); close(); }} />
                </>
              )}
              {!readOnly && menuEx.rows.some((r) => !r.done) && menuEx.rows.length > 1 && (
                <MenuRow icon="min" title="Laatste set weghalen" sub="Een set die je al afvinkte blijft staan." onClick={() => { setExercise(menuEx.slot, removeLastRow); close(); }} />
              )}
              {!readOnly && (
                <MenuRow
                  icon="timer"
                  title="Rust starten"
                  sub="De rusttimer van deze oefening, ook als hij niet vanzelf start."
                  onClick={() => {
                    alerted.current = null;
                    setRest({ endsAt: clock() + menuEx.restSec * 1000, total: menuEx.restSec, name: menuEx.name });
                    close();
                  }}
                />
              )}
              {!readOnly && (
                <MenuRow
                  icon="timer"
                  title="Rusttijd"
                  sub={strength.restSeconds[menuEx.exerciseId] !== undefined ? 'Je eigen tijd voor deze oefening' : 'Geschat: zwaarder en samengesteld langer'}
                  right={
                    <RestStepper
                      seconds={menuEx.restSec}
                      onChange={(s) => {
                        setWorkout((w) => w.map((e) => (e.exerciseId === menuEx.exerciseId ? { ...e, restSec: s } : e)));
                        saveStrength(withExerciseValue(settings.strengthModel, 'restSeconds', menuEx.exerciseId, s));
                      }}
                    />
                  }
                />
              )}
              {!readOnly && menuEx.swappedFrom && (
                <MenuRow icon="ruilen" title={`Terug naar ${menuEx.swappedFrom}`} onClick={() => { swap(menuEx.slot, null); close(); }} />
              )}
              {exerciseOf(menuEx)?.cues && (
                <div className="mt-3 flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
                  {exerciseOf(menuEx)!.cues.map((c) => (
                    <p key={c} className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{c}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </ForgeSheet>
      )}

      {swapEx && (
        <ForgeSheet title={`${swapEx.name} ruilen`} sub="Zelfde spieren, met wat je sportschool heeft. Je programma blijft zoals het is." onClose={() => setSwapFor(null)}>
          {(close) => {
            const options = swapOptions(exerciseOf(swapEx), strength.profile, workout.map((e) => e.exerciseId));
            if (options.length === 0) return <p className="py-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>ASCEND kent deze oefening niet goed genoeg om iets met dezelfde spieren voor te stellen.</p>;
            return (
              <div className="flex flex-col">
                {options.map((o) => (
                  <MenuRow key={o.id} title={o.name} sub={o.primary.map((m) => MUSCLE_LABEL[m]).join(', ')} onClick={() => { swap(swapEx.slot, o.id); close(); }} right={<span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>} />
                ))}
              </div>
            );
          }}
        </ForgeSheet>
      )}

      {noteEx && (
        <NoteSheet
          name={noteEx.name}
          value={strength.exerciseNotes[noteEx.exerciseId] ?? ''}
          onSave={(text) => saveStrength(withExerciseValue(settings.strengthModel, 'exerciseNotes', noteEx.exerciseId, text.trim() === '' ? undefined : text.trim().slice(0, EXERCISE_NOTE_MAX)))}
          onClose={() => setNoteFor(null)}
        />
      )}

      {rirFor && rirRow && (
        <ForgeSheet title="Hoeveel had je nog over?" sub={rirRow.target.rir !== undefined ? `Het voorschrift is ${rirRow.target.rir} over.` : undefined} onClose={() => setRirFor(null)}>
          {(close) => (
            <div className="grid grid-cols-6 gap-2 pt-1" role="radiogroup" aria-label="Herhalingen in reserve">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rirRow.rir === n}
                  onClick={() => { setExercise(rirFor.slot, (e) => updateRow(e, rirFor.rowId, { rir: n })); close(); }}
                  className="flex min-h-[48px] items-center justify-center rounded-xl border"
                  style={{ borderColor: rirRow.rir === n ? 'var(--color-ink)' : 'var(--color-card-border)' }}
                >
                  <RirBubble rir={n} label={`${n} over`} />
                </button>
              ))}
            </div>
          )}
        </ForgeSheet>
      )}

      {workoutMenu && (
        <ForgeSheet title={template.name} onClose={() => { setWorkoutMenu(false); setConfirmDiscard(false); }}>
          {(close) => (
            <div className="flex flex-col">
              {guide && <MenuRow title="Uitleg bij deze training" onClick={() => { close(); setShowGuide(true); }} right={<span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>} />}
              {!readOnly && !confirmDiscard && (
                <MenuRow icon="sluiten" title="Training weggooien" sub="Wat je invulde gaat verloren; de training blijft gepland." danger onClick={() => setConfirmDiscard(true)} />
              )}
              {confirmDiscard && (
                <div className="flex flex-col gap-3 border-t pt-3" style={{ borderColor: 'var(--color-card-border)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-ink)' }}>Weggooien? Wat je invulde gaat verloren.</p>
                  <div className="flex gap-3">
                    <SecondaryButton onClick={() => setConfirmDiscard(false)}>Annuleren</SecondaryButton>
                    <button
                      type="button"
                      onClick={() => { dropDraft(); close(); onClose(); }}
                      className="min-h-[44px] flex-1 rounded-xl border text-xs font-medium"
                      style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger-text)' }}
                    >
                      Weggooien
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </ForgeSheet>
      )}

      {showGuide && guide && (
        <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={date} dayLabel={guideDayLabel(template, date)} onClose={() => setShowGuide(false)} />
      )}

      {finishing && (
        <FinishSheet
          template={template}
          readOnly={readOnly}
          workout={workout}
          elapsedMinutes={Math.max(1, Math.round((clock() - startedAt) / 60000))}
          defaultMinutes={scheduledDate ? resolveVariantDuration(template, initialVariant, scheduledDate, program) : durationForVariant(template, initialVariant)}
          plannedSessionId={plannedSessionId}
          scheduledDate={scheduledDate}
          onClose={() => setFinishing(false)}
          onSave={async (extra) => {
            const strengthData = readOnly ? undefined : toStrengthData(workout);
            const rir = readOnly ? undefined : hardestLegRir(workout);
            const saved = await logSession({
              plannedSessionId,
              completedDate: extra.doneOn,
              templateId: template.id,
              type: template.type,
              sport: templateSport(template),
              variant: initialVariant,
              durationMinutes: extra.minutes,
              rpe: extra.rpe,
              notes: extra.notes || undefined,
              subjectiveFeel: extra.feel,
              painAreas: extra.pain.length > 0 ? extra.pain.map((p) => p.area) : undefined,
              painReports: extra.pain.length > 0 ? extra.pain : undefined,
              strengthData,
              ...(rir !== undefined ? { strengthRir: rir } : {}),
            });
            // Niet opgeslagen betekent: deze training staat al in je logboek. Het concept is dan klaar.
            dropDraft();
            if (saved) onClose();
            return saved;
          }}
        />
      )}
    </Portal>
  );
}

// Hoe lang Opslaan mag duren voordat het scherm zegt dat het langer duurt.
const SAVE_LIMIT_MS = 15_000;

// Een klok die zichzelf ververst: alleen dit stukje, nooit de hele tabel.
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(clock);
  useEffect(() => {
    const id = window.setInterval(() => setNow(clock()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function ElapsedClock({ startedAt }: { startedAt: number }) {
  const now = useNow(1000);
  return <span className="font-sans" aria-label="Verstreken tijd">{formatElapsed(Math.max(0, Math.floor((now - startedAt) / 1000)))}</span>;
}

const isAssisted = (ex: WorkoutExercise) => exerciseOf(ex)?.resistance === 'assisted_bodyweight';

// "W" voor een opwarmset, anders het nummer van de werkset.
function dockRowLabel(ex: WorkoutExercise, index: number): string {
  const row = ex.rows[index];
  if (!row) return '';
  if (row.kind === 'warmup') return 'W';
  return String(ex.rows.slice(0, index + 1).filter((r) => r.kind === 'work').length);
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// --- één oefening ------------------------------------------------------------------------

// De handelingen van de tabel. Eén vaste set (nooit een nieuwe functie per render),
// zodat een oefening alleen opnieuw tekent als hijzelf verandert.
interface BlockActions {
  column: () => void;
  fold: (slot: string) => void;
  menu: (slot: string) => void;
  tick: (slot: string, rowId: string) => void;
  tickAll: (slot: string) => void;
  open: (slot: string, rowId: string, name: FieldName) => void;
  take: (slot: string, rowId: string) => void;
  rowMenu: (slot: string, rowId: string) => void;
  rir: (slot: string, rowId: string) => void;
  add: (slot: string) => void;
}

const ExerciseBlock = memo(function ExerciseBlock({
  ex,
  first,
  readOnly,
  column,
  note,
  active,
  field,
  selected,
  folded,
  profile,
  showPlates,
  act,
}: {
  ex: WorkoutExercise;
  first: boolean;
  readOnly: boolean;
  column: 'target' | 'previous';
  note?: string;
  // De set die nu aan de beurt is, en het veld dat in het paneel open staat.
  active?: string;
  field: FieldRef | null;
  selected: boolean;
  folded: boolean;
  profile: GymProfile;
  showPlates: boolean;
  act: BlockActions;
}) {
  const plates = useMemo(() => (usesPlates(exerciseOf(ex)) ? plateSteps(ex, profile) : undefined), [ex, profile]);
  const exercise = exerciseOf(ex);
  const assisted = exercise?.resistance === 'assisted_bodyweight';
  const workDone = ex.rows.filter((r) => r.kind === 'work' && r.done).length;
  const workTotal = ex.rows.filter((r) => r.kind === 'work').length;
  const complete = !readOnly && exerciseComplete(ex);
  // Met MacroFactor als bron staan kg en herhalingen al in hun eigen kolom;
  // de tweede kolom zegt dan wat je vorige keer deed.
  const showPrevious = readOnly || column === 'previous';
  let workNo = 0;
  const headText = (
    <>
      <span className="flex items-center gap-2">
        {complete && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-success)', color: 'var(--color-ink)' }}>
            <Icon name="vinkje" size={14} />
          </span>
        )}
        <span className="min-w-0 text-base font-semibold leading-snug" style={{ color: 'var(--color-ink)' }}>{ex.name}</span>
      </span>
      <span className="mt-0.5 block font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
        {complete && folded ? exerciseSummary(ex) : readOnly ? `${workTotal} sets` : `${workDone} van ${workTotal} sets`}
        {!(complete && folded) && <> · rust {formatClock(ex.restSec)}</>}
        {ex.swappedFrom ? ` · voor ${ex.swappedFrom}` : ''}
      </span>
    </>
  );
  return (
    <section className={`px-4 pb-2 pt-4 ${first ? '' : 'mt-2 border-t'}`} style={{ borderColor: 'var(--color-card-border)' }} aria-label={ex.name} data-slot={ex.slot}>
      <div className="flex items-start gap-2">
        {complete ? (
          <button type="button" onClick={() => act.fold(ex.slot)} aria-expanded={!folded} aria-label={`${ex.name}, ${folded ? 'uitklappen' : 'inklappen'}`} className="min-h-[44px] min-w-0 flex-1 py-1.5 text-left">
            {headText}
          </button>
        ) : (
          <div className="min-w-0 flex-1 pt-1.5">
            <h2 className="m-0 p-0 font-[inherit]">{headText}</h2>
          </div>
        )}
        <button type="button" onClick={() => act.menu(ex.slot)} aria-label={`Menu van ${ex.name}`} className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
          <Icon name="meer" size={22} />
        </button>
      </div>
      <div className="forge-fold" data-folded={folded} inert={folded}>
        <div>
          {note && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>
              <span className="mt-px shrink-0" style={{ color: 'var(--color-bronze)' }}><Icon name="notitie" size={14} /></span>
              <span>{note}</span>
            </p>
          )}
          {ex.reason && (
            <p className="mt-1.5 border-l-2 pl-2 text-xs leading-snug" style={{ borderColor: 'var(--color-alpine)', color: 'var(--color-ink-dim)' }}>{ex.reason}</p>
          )}

          <div className="mt-2" role="table" aria-label={`Sets van ${ex.name}`}>
            <div role="row" className="forge-grid items-end pb-1 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              <span role="columnheader" className="text-center">Set</span>
              {readOnly ? (
                <span role="columnheader">Vorige</span>
              ) : (
                <button type="button" role="columnheader" onClick={act.column} className="relative flex items-center gap-1 text-left before:absolute before:-inset-y-[14px] before:inset-x-0 before:content-['']" aria-label={showPrevious ? 'Toon het voorschrift' : 'Toon vorige keer'}>
                  {showPrevious ? 'Vorige' : 'Voorschrift'}
                  <Icon name="ruilen" size={12} />
                </button>
              )}
              <span role="columnheader" className="text-center">{assisted ? 'hulp kg' : 'kg'}</span>
              <span role="columnheader" className="text-center">{ex.timed ? 'sec' : 'Herh.'}</span>
              <span role="columnheader" className="text-center">RIR</span>
              <span role="columnheader" className="flex justify-center">
                {readOnly ? <span className="sr-only">Gedaan</span> : <TickBox done={ex.rows.length > 0 && ex.rows.every((r) => r.done)} onClick={() => act.tickAll(ex.slot)} label={`Alle sets van ${ex.name} gedaan`} />}
              </span>
            </div>
            {ex.rows.map((row, i) => {
              if (row.kind === 'work') workNo++;
              const label = row.kind === 'warmup' ? 'W' : String(workNo);
              const prev = previousText(previousFor(ex, row));
              const step = plates?.[i];
              const isActive = !readOnly && active === row.id;
              const fieldOn = (name: FieldName) => field?.slot === ex.slot && field.rowId === row.id && field.field === name;
              return (
                <div key={row.id} data-row-id={row.id}>
                  <LongPressRow
                    onLong={() => act.rowMenu(ex.slot, row.id)}
                    disabled={readOnly}
                    data-active={isActive}
                    className="forge-grid forge-row items-center rounded-xl py-0.5"
                    style={{
                      background: row.done ? 'color-mix(in srgb, var(--color-success) 18%, transparent)' : isActive ? 'color-mix(in srgb, var(--color-ink) 5%, transparent)' : 'transparent',
                      opacity: row.kind === 'warmup' && !row.done ? 0.78 : 1,
                      transition: 'background-color 0.3s ease, opacity 0.3s ease',
                    }}
                  >
                    <span role="cell" className="flex justify-center">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full font-sans text-xs font-semibold tabular-nums"
                        style={{ background: row.done ? 'var(--color-success)' : 'var(--color-surface)', color: row.kind === 'warmup' && !row.done ? 'var(--color-ink-dim)' : 'var(--color-ink)', transition: 'background-color 0.3s ease' }}
                      >
                        {label}
                      </span>
                    </span>
                    <span role="cell" className="min-w-0 font-sans text-xs leading-tight tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                      {showPrevious ? (
                        <span>{prev ?? ''}</span>
                      ) : readOnly ? (
                        <PrescriptionText row={row} ex={ex} />
                      ) : (
                        <button type="button" onClick={() => act.take(ex.slot, row.id)} disabled={row.done} aria-label={`Voorschrift overnemen, set ${label}`} className="flex min-h-[44px] w-full flex-col justify-center text-left">
                          <PrescriptionText row={row} ex={ex} />
                        </button>
                      )}
                    </span>
                    {readOnly || ex.timed ? (
                      <>
                        <span role="cell" className="text-center font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{ex.timed ? '' : row.target.weightKg !== undefined ? formatNumberNL(row.target.weightKg, 2) : ''}</span>
                        <span role="cell" className="text-center font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{ex.timed ? row.target.timedSec : readOnly ? repsText(row.target) : row.reps}</span>
                      </>
                    ) : (
                      <>
                        <span role="cell">
                          <ValueCell value={assisted && row.weightKg !== undefined ? Math.abs(row.weightKg) : row.weightKg} decimals={2} label={`${assisted ? 'Hulp' : 'Gewicht'}, set ${label}`} done={row.done} active={fieldOn('weightKg')} selected={selected} onOpen={() => act.open(ex.slot, row.id, 'weightKg')} />
                        </span>
                        <span role="cell">
                          <ValueCell value={row.reps} decimals={0} label={`Herhalingen, set ${label}`} done={row.done} active={fieldOn('reps')} selected={selected} onOpen={() => act.open(ex.slot, row.id, 'reps')} />
                        </span>
                      </>
                    )}
                    <span role="cell" className="flex justify-center">
                      {row.kind === 'work' && !ex.timed && (readOnly ? row.target.rir : row.rir ?? row.target.rir) !== undefined && (
                        <RirBubble
                          rir={(readOnly ? row.target.rir : row.rir ?? row.target.rir)!}
                          label={`${row.rir ?? row.target.rir} over, set ${label}${readOnly ? '' : ', tik om te wijzigen'}`}
                          onClick={readOnly ? undefined : () => act.rir(ex.slot, row.id)}
                        />
                      )}
                    </span>
                    <span role="cell" className="flex justify-center">
                      {!readOnly && <TickBox done={row.done} onClick={() => act.tick(ex.slot, row.id)} label={`Set ${label} gedaan`} />}
                    </span>
                  </LongPressRow>
                  {!readOnly && showPlates && row.kind === 'work' && plates && plates.some(Boolean) && (
                    <PlateLine step={step} onOpen={() => act.open(ex.slot, row.id, 'weightKg')} />
                  )}
                </div>
              );
            })}
          </div>
          {!readOnly && !ex.timed && (
            <button type="button" onClick={() => act.add(ex.slot)} className="mt-1 flex min-h-[44px] items-center gap-2 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              <Icon name="plus" size={16} /> Set toevoegen
            </button>
          )}
        </div>
      </div>
    </section>
  );
});

// Het voorschrift van een set: "47,5 kg × 11-13" met de RIR eronder.
function PrescriptionText({ row, ex }: { row: WorkoutRow; ex: WorkoutExercise }) {
  return (
    <>
      <span className="block">
        {/* Alleen breken tussen gewicht en herhalingen, nooit midden in "8-10". */}
        {targetText(row).split(' × ').map((part, k) => (
          <Fragment key={k}>
            {k > 0 && ' '}
            <span className="whitespace-nowrap">{k > 0 ? `× ${part}` : part}</span>
          </Fragment>
        ))}
      </span>
      {row.kind === 'work' && row.target.rir !== undefined && !ex.timed && <span className="block text-xs">{row.target.rir} RIR</span>}
    </>
  );
}

// De schijven bij een stang, klein onder een werkset: een tik opent het invoerpaneel.
function PlateLine({ step, onOpen }: { step?: PlateStep; onOpen: () => void }) {
  return (
    <div className="ml-9 h-5">
      {step && (
        <button type="button" onClick={onOpen} aria-label={`Schijven: per kant ${plateSideText(step)}. Tik voor de stang`} className="relative flex h-5 items-center gap-1.5 font-sans text-xs tabular-nums before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']" style={{ color: 'var(--color-ink-dim)' }}>
          <Icon name="schijf" size={14} />
          {step.shortKg > 0 ? plateShortText(step) : step.perSide.length > 0 ? `per kant ${plateSideText(step)}` : 'alleen de stang'}
        </button>
      )}
    </div>
  );
}

// --- de rusttimer ----------------------------------------------------------------------

// De balk komt omhoog, de voortgang loopt vloeiend af naar de eindtijd (de bron;
// niet naar het aantal ticks), −15 en +30 laten het getal even schuiven, aan het
// eind pulseert hij zacht, en naar beneden vegen sluit hem (Overslaan).
function RestBar({ rest, lift, onAdd, onSkip }: { rest: Rest; lift: number; onAdd: (seconds: number) => void; onSkip: () => void }) {
  const now = useNow(500);
  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
  const over = left === 0;
  const share = rest.total > 0 ? Math.min(1, 1 - Math.max(0, rest.endsAt - now) / (rest.total * 1000)) : 1;
  const bar = useRef<HTMLDivElement>(null);
  const slab = useRef<HTMLDivElement>(null);
  const clockText = useRef<HTMLParagraphElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  // De voortgang loopt als één beweging tot de eindtijd, zonder ticks.
  useEffect(() => {
    const total = rest.total * 1000;
    const remaining = Math.max(0, rest.endsAt - Date.now());
    const from = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 1;
    const a = animateEl(bar.current, [{ transform: `scaleX(${from})` }, { transform: 'scaleX(1)' }], { duration: remaining, easing: 'linear', fill: 'forwards' });
    return () => a?.cancel();
  }, [rest.endsAt, rest.total]);

  function add(seconds: number) {
    animateEl(clockText.current, [{ opacity: 0.3, transform: `translateY(${seconds > 0 ? 8 : -8}px)` }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    onAdd(seconds);
  }

  function skip() {
    const a = animateEl(slab.current, [{ transform: `translateY(${drag.current?.dy ?? 0}px)` }, { transform: 'translateY(110%)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
    if (a) a.onfinish = onSkip;
    else onSkip();
  }

  return (
    <div
      className="forge-up fixed inset-x-0 z-30"
      style={{ bottom: lift, transition: reducedMotion() ? undefined : 'bottom 0.25s cubic-bezier(0.22, 1, 0.36, 1)', ['--forge-fill' as string]: 'var(--color-surface)' }}
      role="timer"
      aria-live="off"
    >
      <div
        ref={slab}
        className="border-t"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-card-border)', paddingBottom: lift > 0 ? 0 : 'env(safe-area-inset-bottom)', touchAction: 'none' }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          drag.current = { y: e.clientY, dy: 0 };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          d.dy = Math.max(0, e.clientY - d.y);
          e.currentTarget.style.transform = `translateY(${d.dy}px)`;
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (d.dy > 36) {
            drag.current = { y: 0, dy: d.dy };
            skip();
            return;
          }
          const el = e.currentTarget;
          if (d.dy > 0) {
            const a = animateEl(el, [{ transform: `translateY(${d.dy}px)` }, { transform: 'translateY(0)' }], { duration: 220, easing: 'cubic-bezier(0.22, 1.12, 0.36, 1)' });
            if (!a) el.style.transform = '';
            else a.onfinish = () => (el.style.transform = '');
          }
        }}
        onPointerCancel={(e) => {
          drag.current = null;
          e.currentTarget.style.transform = '';
        }}
      >
        <div className="h-0.5 overflow-hidden" style={{ background: 'var(--color-card-border)' }}>
          <div ref={bar} className={`h-0.5 origin-left ${over ? 'forge-glow' : ''}`} style={{ transform: `scaleX(${share})`, background: over ? 'var(--color-success)' : 'var(--color-bronze)', transition: 'background-color 0.3s ease' }} />
        </div>
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-1.5">
          <div className="min-w-0 flex-1">
            <p ref={clockText} key={over ? 'over' : 'run'} className={`origin-left font-sans text-2xl leading-none tabular-nums ${over ? 'forge-pulse' : ''}`} style={{ color: over ? 'var(--color-success-text)' : 'var(--color-ink)' }}>{over ? 'Tijd om' : formatClock(left)}</p>
            <p className="mt-1 truncate text-xs" style={{ color: 'var(--color-ink-dim)' }}>Rust · {rest.name}</p>
          </div>
          {!over && (
            <>
              <button type="button" onClick={() => add(-15)} className="min-h-[44px] min-w-[44px] rounded-xl border px-2 font-sans text-sm tabular-nums" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }} aria-label="15 seconden korter">−15</button>
              <button type="button" onClick={() => add(30)} className="min-h-[44px] min-w-[44px] rounded-xl border px-2 font-sans text-sm tabular-nums" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }} aria-label="30 seconden langer">+30</button>
            </>
          )}
          <button type="button" onClick={skip} className="min-h-[44px] rounded-xl border px-3 text-sm" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}>
            {over ? 'Sluiten' : 'Overslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RestStepper({ seconds, onChange }: { seconds: number; onChange: (s: number) => void }) {
  const step = (d: number) => onChange(Math.min(REST_LIMITS.max, Math.max(REST_LIMITS.min, seconds + d)));
  const btn = 'flex h-11 w-11 items-center justify-center rounded-xl border';
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={() => step(-15)} className={btn} style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }} aria-label="15 seconden korter"><Icon name="min" size={18} /></button>
      <span className="w-12 text-center font-sans text-sm tabular-nums" style={{ color: 'var(--color-ink)' }}>{formatClock(seconds)}</span>
      <button type="button" onClick={() => step(15)} className={btn} style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }} aria-label="15 seconden langer"><Icon name="plus" size={18} /></button>
    </span>
  );
}

// --- notitie ---------------------------------------------------------------------------

function NoteSheet({ name, value, onSave, onClose }: { name: string; value: string; onSave: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState(value);
  return (
    <ForgeSheet title={`Notitie bij ${name}`} sub="Staat bij deze oefening, elke training weer." onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-3">
          <textarea
            value={text}
            maxLength={EXERCISE_NOTE_MAX}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Bijvoorbeeld: stoel op 4, voeten hoog"
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{ background: 'var(--color-charcoal)', borderColor: 'var(--color-control-border)', color: 'var(--color-ink)' }}
          />
          <div className="flex gap-3">
            <SecondaryButton onClick={close}>Annuleren</SecondaryButton>
            <PrimaryButton fullWidth={false} onClick={() => { onSave(text); close(); }}>Opslaan</PrimaryButton>
          </div>
        </div>
      )}
    </ForgeSheet>
  );
}

// --- afronden ---------------------------------------------------------------------------

interface FinishExtra {
  minutes: number;
  rpe?: number;
  feel?: 'better' | 'normal' | 'worse';
  pain: PainReport[];
  notes: string;
  doneOn: string;
}

function FinishSheet({
  template,
  readOnly,
  workout,
  elapsedMinutes,
  defaultMinutes,
  plannedSessionId,
  scheduledDate,
  onClose,
  onSave,
}: {
  template: SessionTemplate;
  readOnly: boolean;
  workout: WorkoutExercise[];
  elapsedMinutes: number;
  defaultMinutes: number;
  plannedSessionId?: string;
  scheduledDate?: string;
  onClose: () => void;
  onSave: (extra: FinishExtra) => Promise<boolean>;
}) {
  const today = todayISO();
  const { done, total } = progress(workout);
  const anyTicked = workout.some((e) => e.rows.some((r) => r.done));
  const [minutes, setMinutes] = useState<number | undefined>(readOnly || !anyTicked ? defaultMinutes : elapsedMinutes);
  const [rpe, setRpe] = useState<number | undefined>();
  const [feel, setFeel] = useState<FinishExtra['feel']>();
  const [pain, setPain] = useState<PainReport[]>([]);
  const [notes, setNotes] = useState('');
  const plannedInPast = !!plannedSessionId && !!scheduledDate && scheduledDate < today;
  const [doneOn, setDoneOn] = useState(plannedInPast ? scheduledDate! : today);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const busy = useRef(false);
  const notTicked = total - done;

  async function save() {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setOutcome(null);
    const timeout = new Promise<'slow'>((r) => window.setTimeout(() => r('slow'), SAVE_LIMIT_MS));
    try {
      const ok = await Promise.race([onSave({ minutes: minutes ?? 0, rpe, feel, pain, notes, doneOn }), timeout]);
      if (ok === true) return;
      setOutcome(ok === 'slow' ? 'Opslaan duurt langer dan normaal. Je sets blijven bewaard; probeer het zo nog eens.' : 'Deze training staat al in je logboek. Er is niets dubbel opgeslagen.');
    } catch {
      setOutcome('Opslaan lukte niet. Je sets blijven bewaard; probeer het zo nog eens.');
    }
    busy.current = false;
    setSaving(false);
  }

  return (
    <ForgeSheet
      title={readOnly ? 'Training afvinken' : 'Training afronden'}
      sub={readOnly ? 'Sets en gewichten komen uit MacroFactor.' : `${done} van ${total} werksets gedaan.${notTicked > 0 && anyTicked ? ' Wat niet is afgevinkt, wordt niet bewaard.' : ''}`}
      onClose={onClose}
    >
      {(close) => (
        <div className="flex flex-col gap-4">
          {!readOnly && !anyTicked && (
            <p className="text-xs leading-snug" style={{ color: 'var(--color-warning)' }}>Je hebt nog geen set afgevinkt. Dan wordt alleen de training afgevinkt, zonder sets.</p>
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
                <input type="date" value={doneOn} max={today} min={addDays(today, -60)} onChange={(e) => e.target.value && setDoneOn(e.target.value)} className="rounded-lg border bg-transparent px-2" style={{ borderColor: 'var(--color-control-border)', color: 'var(--color-ink)', colorScheme: 'dark' }} />
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
          {outcome && <p className="text-xs leading-snug" role="status" style={{ color: 'var(--color-warning)' }}>{outcome}</p>}
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
