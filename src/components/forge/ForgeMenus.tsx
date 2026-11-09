// De bladen van het workoutscherm van Forge (ForgeWorkout.tsx): het menu van een oefening, van een set, van de
// hele training, het ruilen, de RIR-keuze, de uitleg bij "zonder spotter", het weggooien en de lange onderbreking.
// Alleen tonen; wat een keuze doet staat in ForgeWorkout en de engine.

import { canRemoveRow, reasonWithOwnCount } from '../../engine/forgeRows';
import { canSwap, isAddedSlot } from '../../engine/addedExercises';
import { resolveExerciseArt, showsExerciseArt } from '../../engine/exerciseArtSettings';
import { exerciseOf, swapGroups, type WorkoutExercise } from '../../engine/forgeWorkout';
import { hasStack } from '../../engine/machineWeights';
import { standCount } from '../../engine/toestelStanden';
import { swapPreference, swapReason } from '../../engine/mountainMuscles';
import { SPOTTER_EXPLAIN, SPOTTER_HOW, SPOTTER_SIGN } from '../../engine/spotter';
import { formatAway } from '../../engine/forgeSession';
import type { resolveStrengthSettings } from '../../engine/strengthSettings';
import type { ExercisePrescription } from '../../models/training';
import type { Program } from '../../models/program';
import { useAppData } from '../../state/AppDataContext';
import { todayISO } from '../../utils/dates';
import { Icon } from '../icons';
import { PrimaryButton, SecondaryButton, Toggle } from '../ui';
import { ForgeSheet, MenuRow, RirBubble, SheetGroup } from './parts';
import { SwapList } from './ExerciseSheets';
import { RestStepper } from './ForgeTimers';
import { addOnMenuSub } from './forgeWorkoutHelpers';

type Strength = ReturnType<typeof resolveStrengthSettings>;
type Settings = ReturnType<typeof useAppData>['settings'];

export function SpotterSheet({ onClose }: { onClose: () => void }) {
  return (
    <ForgeSheet title="Zonder spotter" sub={SPOTTER_SIGN} onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{SPOTTER_EXPLAIN}</p>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{SPOTTER_HOW}</p>
          <div className="flex"><SecondaryButton onClick={close}>Begrepen</SecondaryButton></div>
        </div>
      )}
    </ForgeSheet>
  );
}

export function RowMenuSheet({ ex, rowId, onTake, onCopy, onRemove, onClose }: {
  ex: WorkoutExercise;
  rowId: string;
  onTake: () => void;
  onCopy: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const row = ex.rows.find((r) => r.id === rowId);
  if (!row) return null;
  return (
    <ForgeSheet title={ex.name} sub={row.kind === 'warmup' ? 'Opwarmset' : `Werkset ${ex.rows.filter((r) => r.kind === 'work').indexOf(row) + 1}`} onClose={onClose}>
      {(close) => (
        <div className="flex flex-col">
          {!row.done && <MenuRow icon="vinkje" title="Voorschrift overnemen" sub="Kilo's en herhalingen zoals het voorschrift ze vraagt." onClick={() => { onTake(); close(); }} />}
          <MenuRow icon="plus" title="Set kopiëren" sub="Een kopie van deze set eronder." onClick={() => { onCopy(); close(); }} />
          {canRemoveRow(ex, row.id) && <MenuRow icon="min" title="Set verwijderen" danger onClick={() => { onRemove(); close(); }} />}
        </div>
      )}
    </ForgeSheet>
  );
}

// Het blad Oefening (docs/beslissingen/2026-11-02-forge-herinrichting.md): bovenaan Waarom zo, dan vier
// groepen onder elkaar. Wat eerst als snelknop onder de naam stond (Ruilen, Opwarmset, Notitie) en de kolom
// Alles staan hier, elk één keer.
export function ExerciseMenuSheet({ ex, effSlots, readOnly, preview, templateId, settings, strength, onSwapBack, onPickSwap, onNote, onArt, onFill, onAddOn, onRemoveAdded, onAddSet, onTickAll, onRemoveLast, onRestSeconds, onStartRest, onClose }: {
  ex: WorkoutExercise;
  effSlots: readonly ExercisePrescription[];
  readOnly: boolean;
  preview: boolean;
  templateId: string;
  settings: Settings;
  strength: Strength;
  onSwapBack: () => void;
  onPickSwap: () => void;
  onNote: () => void;
  onArt: () => void;
  onFill: () => void;
  onAddOn: () => void;
  onRemoveAdded: () => void;
  onAddSet: (kind: 'work' | 'warmup') => void;
  onTickAll: () => void;
  onRemoveLast: () => void;
  onRestSeconds: (s: number) => void;
  onStartRest: () => void;
  onClose: () => void;
}) {
  return (
    <ForgeSheet title={ex.name} sub={ex.swappedFrom ? `In plaats van ${ex.swappedFrom}, alleen deze training` : undefined} onClose={onClose}>
      {(close) => {
        const exercise = exerciseOf(ex);
        const why = reasonWithOwnCount(ex);
        const art = ex.known && !!exercise && showsExerciseArt(resolveExerciseArt(settings));
        const allDone = ex.rows.length > 0 && ex.rows.every((r) => r.done);
        const added = !readOnly && !preview && isAddedSlot(settings.strengthModel, templateId, ex.slot);
        return (
          <div className="flex flex-col">
            {why && (
              <SheetGroup title="Waarom zo">
                <p className="pb-3 text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{why}</p>
              </SheetGroup>
            )}
            <SheetGroup title="Oefening">
              {!readOnly && canSwap(effSlots, ex) && (ex.swappedFrom ? (
                <MenuRow icon="ruilen" title={`Terug naar ${ex.swappedFrom}`} onClick={() => { onSwapBack(); close(); }} />
              ) : (
                <MenuRow icon="ruilen" title="Ruilen" sub="Zelfde spieren, met wat je sportschool heeft. Alleen voor deze training." onClick={() => { close(); onPickSwap(); }} />
              ))}
              {preview ? (
                // Alleen lezen voor een dag die nog komt: een notitie die er is staat er, schrijven kan op de dag zelf.
                strength.exerciseNotes[ex.exerciseId] && <p className="py-3 text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Notitie: {strength.exerciseNotes[ex.exerciseId]}</p>
              ) : (
                <MenuRow icon="notitie" title="Notitie" sub={strength.exerciseNotes[ex.exerciseId] ?? 'Bijvoorbeeld de stand van de stoel. Blijft bij deze oefening staan.'} onClick={() => { close(); onNote(); }} />
              )}
              {art && (
                <MenuRow icon="info" sheetFrom title="Uitleg en tekening" sub="Hoe het gaat, welke spieren werken en waar je op let." onClick={() => { close(); onArt(); }} />
              )}
              {added && (
                <MenuRow icon="min" title="Uit deze training halen" sub={ex.rows.some((r) => r.done) ? 'Vanaf je volgende training. Wat je vandaag afvinkte blijft staan.' : 'Je voegde hem toe na een voorstel. Je sets van eerder blijven staan.'} onClick={() => { close(); onRemoveAdded(); }} />
              )}
            </SheetGroup>
            {!readOnly && (
              <SheetGroup title="Sets">
                {!ex.timed && <MenuRow icon="plus" title="Set toevoegen" onClick={() => { onAddSet('work'); close(); }} />}
                {!ex.timed && <MenuRow icon="plus" title="Opwarmset toevoegen" onClick={() => { onAddSet('warmup'); close(); }} />}
                {ex.rows.length > 0 && (
                  <MenuRow icon="vinkje" title={allDone ? 'Alle vinkjes weghalen' : 'Alle sets afvinken'} sub={allDone ? undefined : 'Ook de rust start.'} onClick={() => { onTickAll(); close(); }} />
                )}
                {ex.rows.some((r) => !r.done) && ex.rows.length > 1 && (
                  <MenuRow icon="min" title="Laatste set verwijderen" sub="Een set die je al afvinkte blijft staan." onClick={() => { onRemoveLast(); close(); }} />
                )}
              </SheetGroup>
            )}
            {!readOnly && (
              <SheetGroup title="Rust">
                <MenuRow
                  icon="timer"
                  title="Rusttijd"
                  sub={strength.restSeconds[ex.exerciseId] !== undefined ? 'Je eigen tijd voor deze oefening' : 'Geschat: zwaarder en samengesteld langer'}
                  right={<RestStepper seconds={ex.restSec} onChange={onRestSeconds} />}
                />
                <MenuRow
                  icon="timer"
                  title="Rust nu starten"
                  sub="Ook als hij niet vanzelf start."
                  onClick={() => {
                    onStartRest();
                    close();
                  }}
                />
              </SheetGroup>
            )}
            {!readOnly && !preview && hasStack(exercise) && (
              <SheetGroup title="Toestel">
                <MenuRow icon="plus" title="Standen van dit toestel" sub={standCount(strength.profile, exercise) > 0 ? `${standCount(strength.profile, exercise)} ${standCount(strength.profile, exercise) === 1 ? 'stand' : 'standen'} in ${strength.profile.name}.` : 'Nog geen standen. Tik een gewicht in en Forge onthoudt het.'} onClick={() => { close(); onFill(); }} />
                <MenuRow icon="plus" title="Tussengewicht van dit toestel" sub={addOnMenuSub(strength.profile, exercise)} onClick={() => { close(); onAddOn(); }} />
              </SheetGroup>
            )}
            {/* De tips staan in Uitleg en tekening; alleen zonder dat blad staan ze hier. */}
            {!art && exercise?.cues && (
              <SheetGroup title="Tips">
                <div className="flex flex-col gap-1.5 pb-2">
                  {exercise.cues.map((c) => (
                    <p key={c} className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{c}</p>
                  ))}
                </div>
              </SheetGroup>
            )}
          </div>
        );
      }}
    </ForgeSheet>
  );
}

export function SwapSheet({ ex, workout, strength, program, onPick, onClose }: {
  ex: WorkoutExercise;
  workout: WorkoutExercise[];
  strength: Strength;
  program?: Program | null;
  onPick: (exerciseId: string) => void;
  onClose: () => void;
}) {
  const { trainingGoals, goalMilestones, sessionLogs } = useAppData();
  return (
    <ForgeSheet title={`${ex.name} ruilen`} sub="Zelfde spieren, met wat je sportschool heeft. Je programma blijft zoals het is." onClose={onClose}>
      {(close) => {
        // Bij een bergdoel staat bij gelijke keuze een oefening voorop voor een spier die weinig kreeg (engine/mountainMuscles.ts).
        const prefer = swapPreference({ on: strength.mountainMuscles, goals: trainingGoals, milestones: goalMilestones, logs: sessionLogs, today: todayISO(), program });
        const groups = swapGroups(exerciseOf(ex), strength.profile, workout.map((e) => e.exerciseId), 8, prefer);
        if (groups.same.length + groups.other.length > 0) return <SwapList groups={groups} reasonOf={(e) => swapReason(e, prefer)} onPick={(id) => { onPick(id); close(); }} />;
        return <p className="py-2 text-sm" style={{ color: 'var(--color-ink-dim)' }}>ASCEND kent deze oefening niet goed genoeg om iets met dezelfde spieren voor te stellen.</p>;
      }}
    </ForgeSheet>
  );
}

export function RirSheet({ target, current, assumed, onPick, onClose }: {
  target: number | undefined;
  current: number | undefined;
  assumed: boolean | undefined;
  onPick: (rir: number) => void;
  onClose: () => void;
}) {
  return (
    <ForgeSheet title="Hoeveel had je nog over?" sub={target !== undefined ? `Het voorschrift is ${target} over.` : undefined} onClose={onClose}>
      {(close) => (
        <div className="grid grid-cols-6 gap-2 pt-1" role="radiogroup" aria-label="Herhalingen in reserve">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={!assumed && current === n}
              onClick={() => { onPick(n); close(); }}
              className="flex min-h-[48px] items-center justify-center rounded-xl border"
              style={{ borderColor: !assumed && current === n ? 'var(--color-ink)' : 'var(--color-card-border)' }}
            >
              <RirBubble rir={n} label={`${n} over`} />
            </button>
          ))}
        </div>
      )}
    </ForgeSheet>
  );
}

export function WorkoutMenuSheet({ name, readOnly, preview, paused, hasGuide, layoutPaged, onTogglePause, onMinimize, onFinish, onLayout, onGuide, onDiscard, onClose }: {
  name: string;
  readOnly: boolean;
  preview: boolean;
  paused: boolean;
  hasGuide: boolean;
  layoutPaged: boolean;
  onTogglePause: () => void;
  onMinimize: () => void;
  onFinish: () => void;
  onLayout: (paged: boolean) => void;
  onGuide: () => void;
  onDiscard: () => void;
  onClose: () => void;
}) {
  return (
    <ForgeSheet title={name} onClose={onClose}>
      {(close) => (
        <div className="flex flex-col">
          {!readOnly && !preview && (
            <>
              <MenuRow icon="pauze" title={paused ? 'Verder' : 'Pauzeren'} sub={paused ? 'De klok loopt weer.' : 'De klok staat stil tot je verder gaat.'} onClick={() => { onTogglePause(); close(); }} />
              <MenuRow icon="omlaag" title="Kleiner maken" sub="Het scherm sluit, de training loopt door." onClick={() => { close(); onMinimize(); }} />
              <MenuRow icon="vinkje" title="Afronden" onClick={() => { close(); onFinish(); }} />
            </>
          )}
          <MenuRow
            title="Een oefening per scherm"
            sub="Opzij vegen van oefening naar oefening. Uit zet ze onder elkaar."
            right={<Toggle checked={layoutPaged} onChange={onLayout} label="Een oefening per scherm" />}
          />
          {hasGuide && <MenuRow title="Uitleg bij deze training" onClick={() => { close(); onGuide(); }} right={<span style={{ color: 'var(--color-ink-dim)' }}><Icon name="verder" size={18} /></span>} />}
          {!readOnly && (
            <MenuRow icon="sluiten" title="Training verwijderen" sub="De sets van deze training gaan weg; de training blijft gepland." danger onClick={() => { close(); onDiscard(); }} />
          )}
        </div>
      )}
    </ForgeSheet>
  );
}

export function DiscardSheet({ onDiscard, onClose }: { onDiscard: () => void; onClose: () => void }) {
  return (
    <ForgeSheet title="Training verwijderen?" onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>De sets van deze training gaan weg. Je logboek verandert niet.</p>
          <div className="flex gap-3">
            <SecondaryButton onClick={close}>Annuleren</SecondaryButton>
            <button
              type="button"
              onClick={onDiscard}
              className="min-h-[44px] flex-1 rounded-xl border text-sm font-medium"
              style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger-text)' }}
            >
              Verwijderen
            </button>
          </div>
        </div>
      )}
    </ForgeSheet>
  );
}

export function AwaySheet({ awayMs, onAnswer, onClose }: { awayMs: number; onAnswer: (counts: boolean) => void; onClose: () => void }) {
  return (
    <ForgeSheet title="Lange onderbreking" onClose={onClose}>
      {(close) => (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>Je was {formatAway(awayMs)} weg. Telt die tijd mee?</p>
          <div className="flex flex-col gap-3">
            <PrimaryButton onClick={() => { onAnswer(false); close(); }}>Nee, als pauze</PrimaryButton>
            <SecondaryButton onClick={() => { onAnswer(true); close(); }}>Ja, telt mee</SecondaryButton>
          </div>
        </div>
      )}
    </ForgeSheet>
  );
}
