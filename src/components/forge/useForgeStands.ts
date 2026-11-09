// ASCEND: de standen van een toestel tijdens de training (engine/toestelStanden.ts, storage/machineStands.ts).
// Dit haakje verbindt het afvinken en het openen van een toestel met de opslag en houdt de regel in het
// blok bij ("Stand 20 kg onthouden voor Kabel roeien." met Terugdraaien). Geen regels hier: de engine rekent.
// Er wordt via `updateSettings` geschreven, zodat de app niet achterloopt op wat opgeslagen is. Een mislukte
// schrijfactie geeft een duidelijke regel; er blijft niets half staan (alles of niets, met een grens in tijd).
// Besluit: docs/beslissingen/2026-11-09-forge-toestelstanden.md.

import { useEffect, useMemo, useRef, useState } from 'react';
import { exerciseById } from '../../data/exercises';
import { exerciseOf, type WorkoutExercise } from '../../engine/forgeWorkout';
import { hasStack } from '../../engine/machineWeights';
import { STAND_FAILED_TEXT, STAND_FIRST_TEXT, standCount, standNoteText, usedKgFromLogs } from '../../engine/toestelStanden';
import { resolveStrengthSettings, type GymProfile } from '../../engine/strengthSettings';
import type { SessionLog } from '../../models/training';
import { forgetStandNow, readStandSettings, rememberStand, seedStandsNow, type StandIo } from '../../storage/machineStands';
import { useAppData } from '../../state/AppDataContext';

// De regel in het blok: een nieuwe stand (met Terugdraaien), de eerste keer, of een mislukte schrijfactie.
export interface StandLine {
  kind: 'learned' | 'first' | 'failed';
  text: string;
}

interface Note {
  slot: string;
  exerciseId: string;
  name: string;
  kg: number;
  failed: boolean;
}

// De opslag van de standen: lezen van wat echt is opgeslagen, schrijven via `updateSettings` (dat zet ook de app bij).
export function useStandIo(): StandIo {
  const { updateSettings } = useAppData();
  return useMemo<StandIo>(() => ({ read: readStandSettings, write: (next) => updateSettings({ strengthModel: next }) }), [updateSettings]);
}

// Het blad van een toestel gaat open: de eerste keer worden de gewichten uit je logs standen. Het blad toont de
// standen meteen uit het geheugen; komt het inlezen later binnen, dan zet de sleutel van het formulier ze erbij.
export function useSeedStands(exerciseId: string) {
  const { settings, sessionLogs } = useAppData();
  const io = useStandIo();
  useEffect(() => {
    const exercise = exerciseById(exerciseId);
    const strength = resolveStrengthSettings(settings.strengthModel);
    seedStandsNow({ exercise, remember: strength.learnStands, usedKg: usedKgFromLogs(sessionLogs, exercise, strength.profile.id) }, io).catch(() => undefined);
    // Alleen bij het openen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);
}

export function useForgeStands({ remember, readOnly, profile, logs }: { remember: boolean; readOnly: boolean; profile: GymProfile; logs: SessionLog[] }) {
  const [note, setNote] = useState<Note | null>(null);
  // Elke tik telt: een late uitkomst van een eerdere tik mag een nieuwere regel niet overschrijven.
  const seq = useRef(0);
  const seeded = useRef(new Set<string>());
  const io = useStandIo();
  const used = (exerciseId: string) => usedKgFromLogs(logs, exerciseById(exerciseId), profile.id);

  // Een set is afgevinkt met dit gewicht.
  const onTick = (ex: WorkoutExercise, weightKg: number | undefined) => {
    if (readOnly) return;
    const mine = ++seq.current;
    setNote(null);
    const exercise = exerciseOf(ex);
    if (!exercise || !hasStack(exercise)) return;
    const failed = () => {
      if (seq.current === mine) setNote({ slot: ex.slot, exerciseId: ex.exerciseId, name: ex.name, kg: weightKg ?? 0, failed: true });
    };
    rememberStand({ exercise, weightKg, remember, usedKg: used(ex.exerciseId) }, io).then((r) => {
      if (seq.current !== mine) return;
      if (r.kind === 'learned') setNote({ slot: ex.slot, exerciseId: ex.exerciseId, name: ex.name, kg: r.kg, failed: false });
      else if (r.kind === 'failed') failed();
    }, failed);
  };

  // Een toestel wordt geopend (een veld, het menu): de eerste keer worden de standen uit je logs overgenomen.
  const onOpen = (exerciseId: string) => {
    if (readOnly || !remember || seeded.current.has(exerciseId)) return;
    const exercise = exerciseById(exerciseId);
    if (!exercise || !hasStack(exercise)) return;
    seeded.current.add(exerciseId);
    const retry = () => seeded.current.delete(exerciseId);
    seedStandsNow({ exercise, remember, usedKg: used(exerciseId) }, io).then((r) => {
      if (r.kind === 'failed') retry();
    }, retry);
  };

  // Terugdraaien: alleen deze stand weg, niet de set.
  const undo = () => {
    if (!note || note.failed) return;
    const { exerciseId, kg, slot, name } = note;
    const mine = ++seq.current;
    const failed = () => {
      if (seq.current === mine) setNote({ slot, exerciseId, name, kg, failed: true });
    };
    forgetStandNow({ exercise: exerciseById(exerciseId), weightKg: kg }, io).then((r) => {
      if (seq.current !== mine) return;
      if (r.kind === 'failed') failed();
      else setNote(null);
    }, failed);
  };

  // De oefening wisselt: de regel hoort er niet meer bij.
  const dismiss = (slot: string) => setNote((n) => (n && n.slot === slot ? null : n));

  // De regel voor dit blok, of niets.
  const lineFor = (ex: WorkoutExercise, complete: boolean): StandLine | undefined => {
    if (readOnly) return undefined;
    if (note && note.slot === ex.slot) return note.failed ? { kind: 'failed', text: STAND_FAILED_TEXT } : { kind: 'learned', text: standNoteText(note.kg, note.name) };
    const exercise = exerciseOf(ex);
    if (remember && !complete && exercise && hasStack(exercise) && standCount(profile, exercise) === 0) return { kind: 'first', text: STAND_FIRST_TEXT };
    return undefined;
  };

  return { onTick, onOpen, undo, dismiss, lineFor };
}
