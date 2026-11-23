// ASCEND: het ene ding in de tweede regel van een dagrij in Week (docs/visie/Ontwerp Week minimaal.md,
// hoofdstuk 5). Na de dag en de duur staat hoogstens één ding, in deze rang: een punt uit Let op, "aangepast",
// "gemist" (altijd, ook naast het teken Gemist als er geen greep is), "vervallen", "loopt nog", "overgeslagen", "verplaatst van wo 11",
// "gedaan vr 13" (gedaan op een andere dag dan gepland), "vaste afspraak", "zware benen", de stille tekst van een toegestaan paar. Eén uitzondering: "aangepast" staat er altijd
// als de training een regel heeft in Aangepast door ASCEND, ook naast een punt uit Let op (`also`), zodat het getal
// op de rij gelijk blijft aan de dagrijen met het woord (invariant week-aangepast op de tekstkaart). Wat afvalt staat in het actieblad van de training.
// Alleen een punt uit Let op is een waarschuwing (`warn`, de amber stip);
// de rest staat in gedempte inkt, zonder kleur.
//
// Puur: geen React, geen opslag.

import type { PlannedSession, SessionLog } from '../models/training';
import { daysBetween, formatWeekdayDayMonthNL, weekdayShortNL } from '../utils/dates';
import { logDay } from './logDay';

export interface RowFacts {
  // De korte tekst van een melding (engine/weekConcerns.ts#rowNotes).
  concern?: string;
  // Gemist: in de regel altijd het woord, rechts de greep of het teken (Pathfinder, 15 november).
  missed?: boolean;
  // Vervallen: voorbij en niet gedaan op een dag van een gemelde vakantie of ziekte, of in de afbouw voor een race die
  // er al was (engine/sessionStatus.ts, 'away').
  lapsed?: boolean;
  // Voor de start van het programma: rustig, zonder het woord vervallen (engine/sessionStatus.ts, 'before').
  before?: boolean;
  // Loopt nog: voorbij, niet gedaan, en er ligt nog een concept van in Forge (engine/sessionStatus.ts, 'open').
  open?: boolean;
  // Overgeslagen: hetzelfde woord als op Vandaag, zodat de rij niet als gemist leest (engine/sessionStatus.ts, 'skipped').
  skipped?: boolean;
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
  // Gedaan op een andere dag dan gepland: die dag als korte tekst, "vr 13" of verder weg "vr 6 nov"
  // (engine/weekRow.ts#doneOnOtherDay). De rij blijft op de geplande dag staan en zegt "gedaan vr 13" (Pathfinder,
  // 15 november).
  doneOn?: string;
}

export interface RowExtra {
  text: string;
  warn: boolean;
  // Het eind van `text` dat nooit wordt afgekapt: de dag in "verplaatst van do 12". Wordt de regel te lang op een
  // smalle telefoon, dan wijkt het woord ervoor, niet de datum (eigenaar, 15 november).
  tail?: string;
  // Alleen "aangepast" naast een punt uit Let op.
  also?: string;
}

const dayShort = (iso: string) => `${weekdayShortNL(iso).toLowerCase()} ${Number(iso.slice(8, 10))}`;
// "verplaatst van wo 28": de dag aan het eind blijft altijd staan.
const dayTail = (text: string): { tail?: string } => { const m = text.match(/ ([a-z]{2} \d{1,2})$/); return m ? { tail: m[1] } : {}; };

export function rowExtra(f: RowFacts): RowExtra | undefined {
  if (f.concern) return f.adjusted ? { text: f.concern, warn: true, also: 'aangepast' } : { text: f.concern, warn: true };
  // Gemist staat voorop en "aangepast" erbij, zodat elke rij die de kaart "Je hebt n training gemist" telt ook gemist
  // zegt (invariant op de tekstkaart, Warden 15 november).
  const doneOn = f.done ? f.doneOn : undefined;
  if (f.adjusted && doneOn) return { text: `gedaan ${doneOn}`, warn: false, tail: doneOn, also: 'aangepast' };
  if (f.adjusted) return f.missed ? { text: 'gemist', warn: false, also: 'aangepast' } : { text: 'aangepast', warn: false };
  if (f.missed) return { text: 'gemist', warn: false };
  if (f.lapsed) return { text: 'vervallen', warn: false };
  if (f.before) return { text: 'voor de start', warn: false };
  if (f.open) return { text: 'loopt nog', warn: false };
  if (f.skipped) return { text: 'overgeslagen', warn: false };
  if (!f.done && f.catchNote) return { text: f.catchNote, warn: false, ...dayTail(f.catchNote) };
  if (!f.done && f.moved) return f.movedFrom ? { text: `verplaatst van ${dayShort(f.movedFrom)}`, warn: false, tail: dayShort(f.movedFrom) } : { text: 'verplaatst', warn: false };
  if (doneOn) return { text: `gedaan ${doneOn}`, warn: false, tail: doneOn };
  if (f.fixed) return { text: 'vaste afspraak', warn: false };
  if (f.legs) return { text: 'zware benen', warn: false };
  if (f.pairNote) return { text: f.pairNote, warn: false };
  return undefined;
}

// Hoe ver een log van de geplande dag mag liggen voor alleen dag en getal: binnen zes dagen is "vr 13" eenduidig.
export const DONE_ON_NEAR_DAYS = 6;

// De dag waarop een geplande training gedaan is, als die anders is dan de geplande dag, als korte tekst: "vr 13", of
// verder dan zes dagen weg (achteraf gekoppeld) met de maand, "vr 6 nov", zodat hij niet als dezelfde week leest
// (Warden, 15 november). Dezelfde dag als in de grafiek en het logboek (engine/logDay.ts): een training uit MacroFactor
// over middernacht hoort bij zijn geplande dag en krijgt dus niets. Alleen weergave: de log en de planning blijven zoals
// ze zijn.
export function doneOnOtherDay(session: Pick<PlannedSession, 'id' | 'scheduledDate'>, log: Pick<SessionLog, 'completedDate' | 'plannedSessionId' | 'source'> | undefined): string | undefined {
  if (!log) return undefined;
  const day = logDay(log, new Map([[session.id, session]]));
  if (day === session.scheduledDate) return undefined;
  return Math.abs(daysBetween(session.scheduledDate, day)) > DONE_ON_NEAR_DAYS ? formatWeekdayDayMonthNL(day) : dayShort(day);
}

// Andersom, voor de weekbalk (engine/dayPlan.ts): een gedane training staat daar op de dag van uitvoeren, en zegt dan de
// dag waarop hij gepland stond, in dezelfde vorm als hierboven ("do 19", verder weg "do 5 nov"). Zo noemen Week en de
// balk het verschil allebei met een woord (invariant 3 van docs/visie/Ontwerp Eén plan.md). Op zijn eigen dag niets.
export function plannedOnOtherDay(session: Pick<PlannedSession, 'scheduledDate'>, executedOn: string): string | undefined {
  if (executedOn === session.scheduledDate) return undefined;
  return Math.abs(daysBetween(session.scheduledDate, executedOn)) > DONE_ON_NEAR_DAYS ? formatWeekdayDayMonthNL(session.scheduledDate) : dayShort(session.scheduledDate);
}
