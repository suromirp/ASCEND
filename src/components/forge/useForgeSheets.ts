// Welk blad van het workoutscherm open staat (ForgeWorkout.tsx): alleen de standen, geen regels.
// Een blad per stand, zoals het scherm ze nodig heeft; ForgeSheets.tsx toont ze.

import { useState } from 'react';
import type { RowRef } from '../../engine/forgeInput';

export function useForgeSheets(startFinishing: boolean) {
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  // Uitleg en tekening vanuit het blad Oefening: hetzelfde blad als het kaartje in de kop.
  const [artFor, setArtFor] = useState<string | null>(null);
  const [rirFor, setRirFor] = useState<{ slot: string; rowId: string } | null>(null);
  const [fillFor, setFillFor] = useState<string | null>(null);
  const [addOnFor, setAddOnFor] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [spotterInfo, setSpotterInfo] = useState(false);
  const [workoutMenu, setWorkoutMenu] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [finishing, setFinishing] = useState(startFinishing);
  const [showGuide, setShowGuide] = useState(false);
  const [rowMenu, setRowMenu] = useState<RowRef | null>(null);
  return { menuFor, setMenuFor, swapFor, setSwapFor, noteFor, setNoteFor, artFor, setArtFor, rirFor, setRirFor, fillFor, setFillFor, addOnFor, setAddOnFor, logOpen, setLogOpen, spotterInfo, setSpotterInfo, workoutMenu, setWorkoutMenu, confirmDiscard, setConfirmDiscard, finishing, setFinishing, showGuide, setShowGuide, rowMenu, setRowMenu };
}

export type ForgeSheetState = ReturnType<typeof useForgeSheets>;
