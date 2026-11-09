// De bladen van het workoutscherm van Forge (ForgeWorkout.tsx): welk blad open staat komt uit useForgeSheets.ts,
// de handelingen en de gegevens geeft het scherm mee. Geen eigen regels; de engine rekent.

import type { Dispatch, SetStateAction } from 'react';
import { copyRow } from '../../engine/forgeInput';
import { removeLastRow, updateRow, type WorkoutExercise } from '../../engine/forgeWorkout';
import { refitAfterFill, type Adjustment, type NoFit } from '../../engine/forgeAdjust';
import type { ForgeCause, ForgeEvent } from '../../engine/forgeLog';
import { activeSeconds, type Pause } from '../../engine/forgeSession';
import { resolveForgeLayout } from '../../engine/forgeLayout';
import { EXERCISE_NOTE_MAX, resolveStrengthSettings, withExerciseValue, type ResolvedStrengthSettings } from '../../engine/strengthSettings';
import { durationForVariant, resolveVariantDuration } from '../../engine/substitutions';
import { getTrainingGuide, guideDayLabel } from '../../data/trainingGuide';
import type { ExercisePrescription } from '../../models/training';
import type { Program } from '../../models/program';
import type { SessionTemplate, SessionVariant } from '../../models/training';
import { useAppData } from '../../state/AppDataContext';
import { ExerciseArtSheet } from '../ExerciseArtSheet';
import { TrainingGuideSheet } from '../TrainingGuideSheet';
import { ExerciseAddOnForgeSheet } from './AddOnWeights';
import { ForgeLogSheet } from './ForgeLogSheet';
import { MachineWeightsForgeSheet } from './MachineWeights';
import { NoteSheet } from './ExerciseSheets';
import { FinishSheet } from './FinishSheet';
import { AwaySheet, DiscardSheet, ExerciseMenuSheet, RirSheet, RowMenuSheet, SpotterSheet, SwapSheet, WorkoutMenuSheet } from './ForgeMenus';
import { forgeLogInput } from './forgeFinishLog';
import { clock, type Rest } from './forgeWorkoutHelpers';
import type { ForgeSheetState } from './useForgeSheets';

type Hints<T> = Dispatch<SetStateAction<Record<string, T>>>;

interface ForgeSheetsProps {
  sh: ForgeSheetState;
  template: SessionTemplate;
  plannedSessionId?: string;
  scheduledDate?: string;
  date: string;
  program?: Program | null;
  initialVariant: SessionVariant;
  readOnly: boolean;
  preview: boolean;
  strength: ResolvedStrengthSettings;
  bodyKg: number | undefined;
  workout: WorkoutExercise[];
  effSlots: readonly ExercisePrescription[];
  forgeLog: ForgeEvent[];
  noFit: Record<string, NoFit>;
  setWorkout: Dispatch<SetStateAction<WorkoutExercise[]>>;
  setNoFit: Hints<NoFit>;
  setLighter: Hints<Adjustment>;
  setHeavyTip: Hints<{ text: string; rowId?: string; weightKg?: number }>;
  // Een nieuwe rust: vergeet het signaal van de vorige eindtijd en zet de balk.
  startRest: (rest: Rest) => void;
  markCause: (why: ForgeCause) => void;
  setExercise: (slot: string, update: (ex: WorkoutExercise) => WorkoutExercise) => void;
  take: (slot: string, rowId: string) => void;
  removeSetLogged: (slot: string, rowId: string) => void;
  addSetLogged: (slot: string, kind: 'work' | 'warmup') => void;
  tickAll: (slot: string) => void;
  swap: (slot: string, exerciseId: string | null) => void;
  removeAddedExercise: (slot: string) => void;
  saveStrength: (next: ReturnType<typeof useAppData>['settings']['strengthModel']) => void;
  startedAt: number | null;
  pauses: Pause[];
  paused: boolean;
  togglePause: () => void;
  awayMs: number | undefined;
  setAwayMs: (ms: number | undefined) => void;
  answerBreak: (counts: boolean) => void;
  later: (fn: () => void, ms: number) => void;
  dropDraft: () => void;
  onClose: () => void;
}

export function ForgeSheets(p: ForgeSheetsProps) {
  const { sh, template, plannedSessionId, scheduledDate, date, program, initialVariant, readOnly, preview, strength, workout, effSlots, markCause, setExercise, saveStrength, onClose } = p;
  const { logSession, settings, updateSettings, plannedSessions } = useAppData();
  const guide = getTrainingGuide(template.id);
  const menuEx = workout.find((e) => e.slot === sh.menuFor);
  const swapEx = workout.find((e) => e.slot === sh.swapFor);
  const noteEx = workout.find((e) => e.slot === sh.noteFor);
  const fillEx = workout.find((e) => e.slot === sh.fillFor);
  const addOnEx = workout.find((e) => e.slot === sh.addOnFor);
  const rowMenuEx = sh.rowMenu ? workout.find((e) => e.slot === sh.rowMenu?.slot) : undefined;
  const rowMenuRow = rowMenuEx?.rows.find((r) => r.id === sh.rowMenu?.rowId);
  const rirFor = sh.rirFor;
  const rirRow = rirFor ? workout.find((e) => e.slot === rirFor.slot)?.rows.find((r) => r.id === rirFor.rowId) : undefined;
  return (
    <>
      {sh.logOpen && <ForgeLogSheet events={p.forgeLog} workout={workout} onClose={() => sh.setLogOpen(false)} />}

      {sh.spotterInfo && <SpotterSheet onClose={() => sh.setSpotterInfo(false)} />}

      {sh.rowMenu && rowMenuEx && rowMenuRow && (
        <RowMenuSheet
          ex={rowMenuEx}
          rowId={rowMenuRow.id}
          onTake={() => p.take(rowMenuEx.slot, rowMenuRow.id)}
          onCopy={() => setExercise(rowMenuEx.slot, (e) => copyRow(e, rowMenuRow.id))}
          onRemove={() => p.removeSetLogged(rowMenuEx.slot, rowMenuRow.id)}
          onClose={() => sh.setRowMenu(null)}
        />
      )}

      {menuEx && (
        <ExerciseMenuSheet
          ex={menuEx}
          effSlots={effSlots}
          readOnly={readOnly}
          preview={preview}
          templateId={template.id}
          settings={settings}
          strength={strength}
          onSwapBack={() => p.swap(menuEx.slot, null)}
          onPickSwap={() => sh.setSwapFor(menuEx.slot)}
          onNote={() => sh.setNoteFor(menuEx.slot)}
          onArt={() => sh.setArtFor(menuEx.exerciseId)}
          onFill={() => sh.setFillFor(menuEx.slot)}
          onAddOn={() => sh.setAddOnFor(menuEx.slot)}
          onRemoveAdded={() => p.removeAddedExercise(menuEx.slot)}
          onAddSet={(kind) => p.addSetLogged(menuEx.slot, kind)}
          onTickAll={() => p.tickAll(menuEx.slot)}
          onRemoveLast={() => setExercise(menuEx.slot, removeLastRow)}
          onRestSeconds={(s) => {
            p.setWorkout((w) => w.map((e) => (e.exerciseId === menuEx.exerciseId ? { ...e, restSec: s } : e)));
            saveStrength(withExerciseValue(settings.strengthModel, 'restSeconds', menuEx.exerciseId, s));
          }}
          onStartRest={() => {
            p.startRest({ endsAt: clock() + menuEx.restSec * 1000, total: menuEx.restSec, name: menuEx.name });
          }}
          onClose={() => sh.setMenuFor(null)}
        />
      )}

      {sh.artFor && <ExerciseArtSheet exerciseId={sh.artFor} onClose={() => sh.setArtFor(null)} />}

      {swapEx && <SwapSheet ex={swapEx} workout={workout} strength={strength} program={program} onPick={(id) => p.swap(swapEx.slot, id)} onClose={() => sh.setSwapFor(null)} />}

      {noteEx && !preview && (
        <NoteSheet
          name={noteEx.name}
          value={strength.exerciseNotes[noteEx.exerciseId] ?? ''}
          onSave={(text) => saveStrength(withExerciseValue(settings.strengthModel, 'exerciseNotes', noteEx.exerciseId, text.trim() === '' ? undefined : text.trim().slice(0, EXERCISE_NOTE_MAX)))}
          onClose={() => sh.setNoteFor(null)}
        />
      )}

      {fillEx && (
        <MachineWeightsForgeSheet
          exerciseId={fillEx.exerciseId}
          onSaved={(next) => {
            // Met de nieuwe lijst opnieuw kijken of er een lichter gewicht past.
            const fit = p.noFit[fillEx.slot];
            p.setNoFit((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== fillEx.slot)));
            if (!fit) return;
            const profile = resolveStrengthSettings(next).profile;
            const ctx = { bodyKg: p.bodyKg, profile, workSets: strength.workSets, maxToFailure: strength.estimateUpTo, stackWeights: strength.stackWeights };
            const result = refitAfterFill(fillEx, fit, ctx);
            if (!result) return;
            if ('lighter' in result) p.setLighter((l) => ({ ...l, [fillEx.slot]: result.lighter }));
            else p.setHeavyTip((l) => ({ ...l, [fillEx.slot]: result.tip }));
          }}
          onClose={() => sh.setFillFor(null)}
        />
      )}

      {addOnEx && <ExerciseAddOnForgeSheet exerciseId={addOnEx.exerciseId} onClose={() => sh.setAddOnFor(null)} />}

      {rirFor && rirRow && (
        <RirSheet
          target={rirRow.target.rir}
          current={rirRow.rir}
          assumed={rirRow.rirAssumed}
          onPick={(n) => { markCause({ kind: 'eigen', edited: { slot: rirFor.slot, rowId: rirFor.rowId } }); setExercise(rirFor.slot, (e) => updateRow(e, rirFor.rowId, { rir: n })); }}
          onClose={() => sh.setRirFor(null)}
        />
      )}

      {sh.workoutMenu && (
        <WorkoutMenuSheet
          name={template.name}
          readOnly={readOnly}
          preview={preview}
          paused={p.paused}
          hasGuide={!!guide}
          layoutPaged={resolveForgeLayout(settings) === 'scherm'}
          onTogglePause={p.togglePause}
          onMinimize={onClose}
          onFinish={() => sh.setFinishing(true)}
          onLayout={(on) => void updateSettings({ forgeLayout: on ? 'scherm' : 'lijst' })}
          onGuide={() => sh.setShowGuide(true)}
          onDiscard={() => p.later(() => sh.setConfirmDiscard(true), 230)}
          onClose={() => sh.setWorkoutMenu(false)}
        />
      )}

      {sh.confirmDiscard && <DiscardSheet onDiscard={() => { p.dropDraft(); sh.setConfirmDiscard(false); onClose(); }} onClose={() => sh.setConfirmDiscard(false)} />}

      {p.awayMs !== undefined && !readOnly && <AwaySheet awayMs={p.awayMs} onAnswer={p.answerBreak} onClose={() => p.setAwayMs(undefined)} />}

      {sh.showGuide && guide && (
        <TrainingGuideSheet title={template.name} guide={guide} template={template} dateIso={date} dayLabel={guideDayLabel(template, date)} onClose={() => sh.setShowGuide(false)} />
      )}

      {sh.finishing && (
        <FinishSheet
          template={template}
          readOnly={readOnly}
          workout={workout}
          elapsedSeconds={p.startedAt === null ? 0 : activeSeconds({ startedAt: p.startedAt, pauses: p.pauses }, clock())}
          defaultMinutes={scheduledDate ? resolveVariantDuration(template, initialVariant, scheduledDate, program) : durationForVariant(template, initialVariant)}
          plannedSessionId={plannedSessionId}
          scheduledDate={scheduledDate}
          onClose={() => sh.setFinishing(false)}
          onSave={async (extra) => {
            // Een geplande sessie die niet meer bestaat (planning vervangen): dan is het een losse training.
            const plannedStill = !!plannedSessionId && plannedSessions.some((s) => s.id === plannedSessionId);
            const saved = await logSession(forgeLogInput({ template, variant: initialVariant, extra, workout, readOnly, plannedSessionId, plannedStill, gymProfileId: strength.profile.id, forgeLog: p.forgeLog }));
            // Niet opgeslagen betekent: deze training staat al in je logboek. Het concept is dan klaar.
            p.dropDraft();
            if (saved) onClose();
            return saved;
          }}
        />
      )}
    </>
  );
}
