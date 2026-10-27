// ASCEND: spierpijn in de benen, uit twee bronnen die hetzelfde zeggen: het antwoord "Spierpijn"
// of "Flinke spierpijn" in de ochtendcheck, en een melding "spierpijn" op een beenplek uit
// "Hoe voelt je lijf?" (docs/beslissingen/2026-10-27-spierpijn-en-zware-beendag.md). Een melding
// telt even zwaar als "Spierpijn" in de ochtendcheck, van die dag of de dag ervoor. Het laatste
// antwoord wint: zegt de ochtendcheck van vandaag Fris of Wat stijf, dan telt een melding van
// gisteren niet meer. Puur; apart van engine/legDayEase.ts zodat engine/strengthHistory.ts het
// kan lezen zonder een kring.

import type { MorningCheckIn } from '../models/checkIn';
import type { InjuryNote } from '../models/injury';
import { daysBetween } from '../utils/dates';
import { kindOf } from './injuryKind';
import { isLegSpot } from './legSpots';
import type { FatigueSoreness } from './legFatigue';

export type Soreness = 'spierpijn' | 'flink';

// Waar de spierpijn vandaan komt: de ochtendchecks en de meldingen.
export interface SoreSource {
  injuries: InjuryNote[];
  checkIns: MorningCheckIn[];
}

// Een melding van spierpijn in de benen die op `date` meetelt: van die dag of de dag ervoor, en
// niet weggehaald op of voor die dag (later weghalen verandert niets aan wat toen gold).
function countsOn(note: InjuryNote, date: string, sameDay: boolean): boolean {
  if (kindOf(note) !== 'spierpijn' || !isLegSpot(note.bodyPart)) return false;
  const ago = daysBetween(note.date, date);
  if (ago < 0 || ago > 1 || (ago === 0 && !sameDay)) return false;
  return !(note.resolvedDate && note.resolvedDate <= date);
}

// `sameDayNotes` false: een melding van die dag zelf telt niet. Een melding heeft geen tijdstip, dus
// voor een training die al gelogd is weten we niet of ze er vóór was (alleen de ochtendcheck en
// meldingen van eerdere dagen tellen dan).
export function soreFromNotes(notes: InjuryNote[], checkIns: MorningCheckIn[], date: string, sameDayNotes = true): Soreness | undefined {
  const today = checkIns.find((c) => c.date === date && !c.allNormal);
  const answered = today?.legs;
  if (answered === 'flink') return 'flink';
  if (answered === 'spierpijn') return 'spierpijn';
  // Fris of Wat stijf vandaag is het laatste antwoord: een melding van gisteren telt niet meer.
  // Een melding van vandaag zelf blijft staan (zonder tijdstip is ze niet ouder dan het antwoord).
  const earliest = answered === 'fris' || answered === 'stijf' ? 0 : 1;
  return notes.some((n) => countsOn(n, date, sameDayNotes) && daysBetween(n.date, date) <= earliest) ? 'spierpijn' : undefined;
}

// De spierpijn zoals de beenindex hem leest (engine/legFatigue.ts#FatigueSoreness): dezelfde
// ondergrens voor een melding als voor "Spierpijn" in de ochtendcheck.
export function legSorenessList(checkIns: MorningCheckIn[] | undefined, notes: InjuryNote[] | undefined): FatigueSoreness[] {
  const fromChecks = (checkIns ?? [])
    .filter((c) => c.legs === 'spierpijn' || c.legs === 'flink')
    .map((c) => ({ date: c.date, level: c.legs === 'flink' ? ('flink' as const) : ('spierpijn' as const) }));
  const fromNotes = (notes ?? [])
    .filter((n) => kindOf(n) === 'spierpijn' && isLegSpot(n.bodyPart) && !(n.resolvedDate && n.resolvedDate <= n.date))
    .map((n) => ({ date: n.date, level: 'spierpijn' as const }));
  return [...fromChecks, ...fromNotes];
}
