// Een oefening in het workoutscherm van Forge: de kop, de tabel met sets en de regels eronder.

import { Fragment, memo, useMemo } from 'react';
import { ExerciseArtButton } from '../ExerciseArtButton';
import { canRemoveRow, droppedCount, droppedLine, isOwnRow, reasonWithOwnCount } from '../../engine/forgeRows';
import { SwipeRow } from './SwipeRow';
import {
  exerciseComplete,
  exerciseSummary,
  plateShortText,
  plateSideText,
  type FieldName,
  type FieldRef,
} from '../../engine/forgeInput';
import {
  exerciseOf,
  formatClock,
  plateSteps,
  previousFor,
  previousText,
  repsText,
  targetText,
  usesPlates,
  type PlateStep,
  type WorkoutExercise,
  type WorkoutRow,
} from '../../engine/forgeWorkout';
import type { GymProfile } from '../../engine/strengthSettings';
import type { Exercise } from '../../models/exercise';
import { stepFor } from '../../engine/strengthWeights';
import { formatNumberNL } from '../../utils/number';
import { Icon } from '../icons';
import { TextButton } from '../TextButton';
import { addOnText } from '../../engine/machineWeights';
import { SPOTTER_SIGN } from '../../engine/spotter';
import { LongPressRow, RirBubble, TickBox, ValueCell } from './parts';
import type { BlockActions } from './forgeWorkoutHelpers';

// Een uitleg onder de kop langer dan dit staat op één regel met "Waarom zo", dat het blad Oefening opent; daar
// staat de hele reden bovenaan (docs/beslissingen/2026-11-02-forge-herinrichting.md).
const REASON_SHORT = 100;

export const ExerciseBlock = memo(function ExerciseBlock({
  ex,
  first,
  paged = false,
  readOnly,
  column,
  note,
  active,
  field,
  selected,
  folded,
  profile,
  showPlates,
  lighterText,
  noFitText,
  heavyTip,
  rirAsValue,
  swipeOn,
  undoText,
  act,
}: {
  ex: WorkoutExercise;
  first: boolean;
  // Een oefening per scherm: elke oefening is een kaart, niet alleen die aan de beurt.
  paged?: boolean;
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
  // Het voorstel om de volgende sets lichter te maken, als er een is.
  lighterText?: string;
  // De vraag of je de gewichten van dit toestel invult, als geen gewicht past.
  noFitText?: string;
  // Na het invullen nog steeds te zwaar: één stille regel, zonder knoppen.
  heavyTip?: string;
  // "RIR vooraf invullen: Met het doel": het doel staat er als waarde, niet als hint.
  rirAsValue: boolean;
  swipeOn: boolean;
  // "Set 3 verwijderd" zolang je het nog ongedaan kunt maken.
  undoText?: string;
  act: BlockActions;
}) {
  const reasonText = reasonWithOwnCount(ex) ?? '';
  const plates = useMemo(() => (usesPlates(exerciseOf(ex)) ? plateSteps(ex, profile) : undefined), [ex, profile]);
  const exercise = exerciseOf(ex);
  const assisted = exercise?.resistance === 'assisted_bodyweight';
  const workDone = ex.rows.filter((r) => r.kind === 'work' && r.done).length;
  const workTotal = ex.rows.filter((r) => r.kind === 'work').length;
  const complete = !readOnly && exerciseComplete(ex);
  // Met MacroFactor als bron staan kg en herhalingen al in hun eigen kolom;
  // de tweede kolom zegt dan wat je vorige keer deed.
  const showPrevious = readOnly || column === 'previous';
  // Zonder spotter: het teken staat hoogstens één keer bij de oefening, bij de eerste open set waar Forge
  // de reserve ophoogde. Vul je zelf 0 in, dan verdwijnt het teken: jij besliste.
  const spotterRowId = ex.rows.find((r) => r.kind === 'work' && r.target.spotter && !r.done && (r.rir ?? r.target.rir ?? 1) >= 1)?.id;
  let workNo = 0;
  const headText = (
    <>
      <span className="flex items-center gap-2">
        {complete && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-progress)', color: 'var(--color-on-action)' }}>
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
  const card = paged || active !== undefined;
  return (
    <section
      className={`pb-2 pt-4 ${card ? 'mx-2 mt-2 rounded-2xl border px-3' : `px-4 ${first ? '' : 'mt-2 border-t'}`}`}
      style={{ borderColor: 'var(--color-card-border)', background: card ? 'var(--color-raised)' : undefined }}
      aria-label={ex.name}
      data-slot={ex.slot}
    >
      <div className="flex items-start gap-2">
        {ex.known && <ExerciseArtButton key={ex.exerciseId} exerciseId={ex.exerciseId} name={ex.name} />}
        {complete ? (
          <button type="button" onClick={() => act.fold(ex.slot)} aria-expanded={!folded} aria-label={`${ex.name}, ${folded ? 'uitklappen' : 'inklappen'}`} className="min-h-[44px] min-w-0 flex-1 py-1.5 text-left">
            {headText}
          </button>
        ) : (
          <div className="min-w-0 flex-1 pt-1.5">
            <h2 className="m-0 p-0 font-[inherit]">{headText}</h2>
          </div>
        )}
        <button type="button" data-sheet-from onClick={() => act.menu(ex.slot)} aria-label={`Menu van ${ex.name}`} className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center" style={{ color: 'var(--color-ink-dim)' }}>
          <Icon name="meer" size={22} />
        </button>
      </div>
      <div className="forge-fold" data-folded={folded} inert={folded}>
        <div>
          {note && (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-snug" style={{ color: 'var(--color-ink)' }}>
              <span className="mt-px shrink-0" style={{ color: 'var(--color-action)' }}><Icon name="notitie" size={14} /></span>
              <span>{note}</span>
            </p>
          )}
          {ex.reason && (
            <div className="mt-1.5 flex items-center gap-2 border-l-2 pl-2" style={{ borderColor: 'var(--color-sage)' }}>
              <p className={`min-w-0 flex-1 text-xs leading-snug ${reasonText.length <= REASON_SHORT ? '' : 'truncate'}`} style={{ color: 'var(--color-ink-dim)' }}>{reasonText}</p>
              {reasonText.length > REASON_SHORT && (
                <button type="button" data-sheet-from onClick={() => act.menu(ex.slot)} className="flex min-h-[44px] shrink-0 items-center text-xs" style={{ color: 'var(--color-action)' }}>
                  Waarom zo
                </button>
              )}
            </div>
          )}

          {lighterText && !readOnly && (
            <div className="mt-2 flex flex-col gap-0.5 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)' }} role="group" aria-label="Voorstel voor de volgende sets">
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{lighterText}</p>
              <div className="-mb-1 flex gap-4">
                <TextButton onClick={() => act.lighter(ex.slot)}>Lichter</TextButton>
                <TextButton tone="dim" onClick={() => act.keep(ex.slot)}>Liever niet</TextButton>
              </div>
            </div>
          )}

          {heavyTip && !readOnly && !noFitText && (
            <p className="mt-1.5 border-l-2 pl-2 text-xs leading-snug" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink-dim)' }}>{heavyTip}</p>
          )}

          {noFitText && !readOnly && (
            <div className="mt-2 flex flex-col gap-0.5 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-surface)' }} role="group" aria-label="Gewichten van dit toestel">
              <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{noFitText}</p>
              <div className="-mb-1 flex gap-4">
                <TextButton onClick={() => act.fill(ex.slot)}>{noFitText.endsWith('aanpassen?') ? 'Aanpassen' : 'Invullen'}</TextButton>
                <TextButton tone="dim" onClick={() => act.keepFit(ex.slot)}>Liever niet</TextButton>
              </div>
            </div>
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
              {/* Alle sets afvinken staat in het blad Oefening, groep Sets (docs/beslissingen/2026-11-02-forge-herinrichting.md). */}
              <span role="columnheader" className="flex justify-center"><span className="sr-only">Gedaan</span></span>
            </div>
            {ex.rows.map((row, i) => {
              if (row.kind === 'work') workNo++;
              const label = row.kind === 'warmup' ? 'W' : String(workNo);
              const prev = previousText(previousFor(ex, row), exerciseOf(ex));
              const step = plates?.[i];
              const isActive = !readOnly && active === row.id;
              const own = isOwnRow(row);
              const fieldOn = (name: FieldName) => field?.slot === ex.slot && field.rowId === row.id && field.field === name;
              return (
                <div key={row.id} data-row-id={row.id}>
                  <SwipeRow label={label} enabled={!readOnly && swipeOn && canRemoveRow(ex, row.id)} onDelete={() => act.remove(ex.slot, row.id)}>
                  <LongPressRow
                    onLong={() => act.rowMenu(ex.slot, row.id)}
                    disabled={readOnly}
                    data-active={isActive}
                    className="forge-grid forge-row items-center rounded-xl py-0.5"
                    style={{
                      background: row.done ? 'color-mix(in srgb, var(--color-progress) 16%, transparent)' : isActive ? 'color-mix(in srgb, var(--color-ink) 5%, transparent)' : 'transparent',
                      opacity: row.kind === 'warmup' && !row.done ? 0.78 : 1,
                      transition: 'background-color 0.3s ease, opacity 0.3s ease',
                    }}
                  >
                    <span role="cell" data-swipe-zone className="flex min-h-[44px] items-center justify-center">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full font-sans text-xs font-semibold tabular-nums"
                        style={{ background: row.done ? 'var(--color-progress)' : own ? 'transparent' : 'var(--color-surface)', boxShadow: own && !row.done ? 'inset 0 0 0 1.5px var(--color-control-border)' : undefined, color: row.done ? 'var(--color-on-action)' : row.kind === 'warmup' ? 'var(--color-ink-dim)' : 'var(--color-ink)', transition: 'background-color 0.3s ease' }}
                      >
                        {label}
                      </span>
                    </span>
                    <span role="cell" data-swipe-zone className="min-w-0 font-sans text-xs leading-tight tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>
                      {showPrevious ? (
                        <span>{prev ?? ''}</span>
                      ) : own ? (
                        <span className="flex min-h-[44px] items-center text-sm">eigen set</span>
                      ) : readOnly ? (
                        <PrescriptionText row={row} ex={ex} />
                      ) : (
                        <button type="button" data-swipe-ok onClick={() => act.take(ex.slot, row.id)} disabled={row.done} aria-label={`Voorschrift overnemen, set ${label}`} className="flex min-h-[44px] w-full flex-col justify-center text-left">
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
                          // Een RIR die je niet zelf invulde staat gedimd: het is een hint, geen meting. Met "RIR vooraf invullen: Met het doel" staat het doel er als gewone waarde.
                          hint={!readOnly && (row.rir === undefined || (!!row.rirAssumed && !rirAsValue))}
                          label={
                            !readOnly && (row.rir === undefined || (row.rirAssumed && !rirAsValue))
                              ? `Voorschrift ${row.rir ?? row.target.rir} over, set ${label}, tik om je eigen RIR in te vullen`
                              : `${row.rir ?? row.target.rir} over, set ${label}${readOnly ? '' : ', tik om te wijzigen'}`
                          }
                          onClick={readOnly ? undefined : () => act.rir(ex.slot, row.id)}
                        />
                      )}
                    </span>
                    <span role="cell" className="flex justify-center">
                      {!readOnly && <TickBox done={row.done} onClick={() => act.tick(ex.slot, row.id)} label={`Set ${label} gedaan`} />}
                    </span>
                  </LongPressRow>
                  </SwipeRow>
                  {!readOnly && row.kind === 'work' && addOnLine(profile, exercise, row.weightKg ?? row.target.weightKg) && (
                    <p className="ml-9 h-5 font-sans text-xs tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{addOnLine(profile, exercise, row.weightKg ?? row.target.weightKg)} kg</p>
                  )}
                  {!readOnly && showPlates && row.kind === 'work' && plates && plates.some(Boolean) && (
                    <PlateLine step={step} onOpen={() => act.open(ex.slot, row.id, 'weightKg')} />
                  )}
                  {!readOnly && row.id === spotterRowId && (
                    <div className="ml-9 h-5">
                      <button type="button" onClick={act.spotter} aria-label={`${SPOTTER_SIGN}, set ${label}. Tik voor uitleg`} className="relative flex h-5 items-center gap-1.5 text-xs before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']" style={{ color: 'var(--color-ink-dim)' }}>
                        <Icon name="schild" size={14} />
                        {SPOTTER_SIGN}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!readOnly && undoText && (
            <p role="status" className="mt-1 flex min-h-[44px] items-center gap-3 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              <span>{undoText}</span>
              <TextButton onClick={act.undo}>Ongedaan maken</TextButton>
            </p>
          )}
          {!readOnly && !undoText && droppedCount(ex) > 0 && (
            <p className="mt-1 flex min-h-[44px] items-center gap-3 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
              <span>{droppedLine(droppedCount(ex))}</span>
              <TextButton onClick={() => act.restore(ex.slot)}>Terugzetten</TextButton>
            </p>
          )}
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
        {targetText(row, exerciseOf(ex)).split(' × ').map((part, k) => (
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

// "70 + 2,3" onder een werkset van een toestel met een tussengewicht, als het gewicht daarmee gemaakt is.
function addOnLine(profile: GymProfile, exercise: Exercise | undefined, weightKg: number | undefined): string | undefined {
  return addOnText(profile, exercise, weightKg, stepFor(exercise, profile));
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
