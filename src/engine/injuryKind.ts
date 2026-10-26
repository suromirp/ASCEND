// ASCEND: wat een melding is en of hij nog openstaat (docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md).
// Pijn werkt zoals altijd: open tot je hem oplost. Spierpijn en stijf zijn geen klacht voor de
// planning en sluiten na 7 dagen vanzelf. Dat is afgeleid bij het lezen en wordt nooit
// geschreven, dus een back-up en de geschiedenis veranderen niet. Puur.

import type { InjuryKind, InjuryNote } from '../models/injury';
import { addDays, daysBetween } from '../utils/dates';

// Een afgeleide drempel: spierpijn na een zware dag is meestal binnen een paar dagen weg
// (docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md); een week is ruim genoeg.
export const SORENESS_OPEN_DAYS = 7;

// Een melding zonder soort is pijn, zoals elke melding van voor deze kaart.
export function kindOf(note: Pick<InjuryNote, 'kind'>): InjuryKind {
  return note.kind === 'spierpijn' || note.kind === 'stijf' ? note.kind : 'pijn';
}

export function isSoreness(note: Pick<InjuryNote, 'kind'>): boolean {
  return kindOf(note) !== 'pijn';
}

// De dag waarop een spierpijn of stijf vanzelf sluit.
export function sorenessEnd(note: Pick<InjuryNote, 'date'>): string {
  return addDays(note.date, SORENESS_OPEN_DAYS);
}

export function isOpenOn(note: Pick<InjuryNote, 'kind' | 'date' | 'resolvedDate'>, today: string): boolean {
  if (note.resolvedDate) return false;
  if (isSoreness(note) && daysBetween(note.date, today) >= SORENESS_OPEN_DAYS) return false;
  return true;
}
