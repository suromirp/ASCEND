// ASCEND: het ene ding in de tweede regel van een dagrij in Week (docs/visie/Ontwerp Week minimaal.md,
// hoofdstuk 5). Na de dag en de duur staat hoogstens één ding, in deze rang: een punt uit Let op, "gemist" (alleen
// met een greep rechts, die dan het teken Gemist vervangt), "verplaatst van wo 11", "aangepast", "vaste afspraak",
// "zware benen", de stille tekst van een toegestaan paar. Wat afvalt staat in het actieblad van de training.
// Alleen een punt uit Let op is een waarschuwing (`warn`, de amber stip);
// de rest staat in gedempte inkt, zonder kleur.
//
// Puur: geen React, geen opslag.

import { weekdayShortNL } from '../utils/dates';

export interface RowFacts {
  // De korte tekst van een melding (engine/weekConcerns.ts#rowNotes).
  concern?: string;
  // Gemist: rechts staat dan de greep (of het teken), in de regel het woord.
  missed?: boolean;
  // Een inhaal: "verplaatst van wo 28" op de nieuwe rij (engine/catchUp.ts).
  catchNote?: string;
  // Een regel in Aangepast door ASCEND (engine/changeLog.ts#weekAdjustments).
  adjusted?: boolean;
  // Verplaatst, met de dag waar hij vandaan kwam als die bekend is.
  moved?: boolean;
  movedFrom?: string;
  fixed?: boolean;
  legs?: boolean;
  pairNote?: string;
  // Gedaan: alleen nog "aangepast" en wat de training is, niet meer waar hij vandaan kwam.
  done?: boolean;
}

export interface RowExtra {
  text: string;
  warn: boolean;
}

const dayShort = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))}`;

export function rowExtra(f: RowFacts): RowExtra | undefined {
  if (f.concern) return { text: f.concern, warn: true };
  if (f.missed) return { text: 'gemist', warn: false };
  if (!f.done && f.catchNote) return { text: f.catchNote, warn: false };
  if (f.adjusted) return { text: 'aangepast', warn: false };
  if (!f.done && f.moved) return { text: f.movedFrom ? `verplaatst van ${dayShort(f.movedFrom)}` : 'verplaatst', warn: false };
  if (f.fixed) return { text: 'vaste afspraak', warn: false };
  if (f.legs) return { text: 'zware benen', warn: false };
  if (f.pairNote) return { text: f.pairNote, warn: false };
  return undefined;
}
