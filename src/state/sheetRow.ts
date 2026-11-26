// ASCEND: de gedeelde rij van bladen en momenten die vanzelf opengaan (I-157, docs/beslissingen/2026-11-26-belangrijk-advies-als-blad.md).
//
// Het blad met belangrijk advies (components/FirstAdviceHost.tsx) gaat nooit open als er al een ander blad of moment
// staat. De bladen die vanzelf opengaan melden zich hier zolang ze open zijn: de terugblik (DebriefSheet), het
// moment na een training (CompletionMoment), de welkomstvraag om toestemming (PermissionWelcome), een update
// (UpdatePrompt, LiveUpdateHost), een wijziging die verscheen (ChangeNotice) en het welkom op een lege app
// (StartWelcome). Wie zich als eerste meldde, staat vooraan; de anderen blijven gewoon zichtbaar zoals altijd.
// Alleen het advies wacht: dat verschijnt pas als het zelf vooraan staat. Niets wordt opgeslagen.

import { useEffect, useId, useSyncExternalStore } from 'react';

let row: readonly string[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function joinSheetRow(id: string): () => void {
  if (!row.includes(id)) {
    row = [...row, id];
    emit();
  }
  return () => {
    if (!row.includes(id)) return;
    row = row.filter((x) => x !== id);
    emit();
  };
}

export function sheetRowSnapshot(): readonly string[] {
  return row;
}

export function subscribeSheetRow(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Meld een blad aan zolang `open` waar is. Geeft het eigen id in de rij (de naam plus een id per plek, zodat
// twee plekken met hetzelfde blad elkaar niet afmelden).
export function useInSheetRow(name: string, open = true): string {
  const id = `${name}:${useId()}`;
  useEffect(() => (open ? joinSheetRow(id) : undefined), [id, open]);
  return id;
}

// De rij zoals hij nu is.
export function useSheetRow(): readonly string[] {
  return useSyncExternalStore(subscribeSheetRow, sheetRowSnapshot, sheetRowSnapshot);
}
