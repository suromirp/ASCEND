// ASCEND: wat de tab Week boven en onder de dagen zet (docs/visie/Ontwerp Week minimaal.md, hoofdstuk 2 en 4;
// besluit docs/beslissingen/2026-11-12-week-minimaal.md). Eén vak boven de dagen, in een vaste rang, en één
// lijst eronder in dezelfde rijvorm. Alleen weergave: niets hier verandert de planning.
//
// Puur: geen React, geen opslag.

import type { Advice } from './adviceShared';
import type { LeavePeriod } from '../models/leave';
import { LEAVE_KIND_LABEL, describePeriodCompact } from './leave';
import { hoursMinutes } from '../utils/hoursMinutes';

// Het ene vak boven de dagen. Rang: Let op, dan een voorstel voor je rustdag, dan een voorstel voor een extra
// training. Wat het vak niet krijgt wacht als rij "Voorstel" in de lijst onder de dagen, zodat er nooit twee
// kaarten boven de dagen staan en een waarschuwing nooit achter een rij verdwijnt.
export type WeekBox = { kind: 'notice' } | { kind: 'rest' | 'extra'; advice: Advice[] } | null;

export function weekBox(input: { notice: boolean; rest: Advice[]; extra: Advice[] }): { box: WeekBox; waiting: Advice[] } {
  if (input.notice) return { box: { kind: 'notice' }, waiting: [...input.rest, ...input.extra] };
  if (input.rest.length > 0) return { box: { kind: 'rest', advice: input.rest }, waiting: input.extra };
  if (input.extra.length > 0) return { box: { kind: 'extra', advice: input.extra }, waiting: [] };
  return { box: null, waiting: [] };
}

export interface ListRow {
  title: string;
  sub?: string;
}

// "Voorstel" met eronder wat het voorstelt: de titel van het advies.
export function proposalRow(advice: Pick<Advice, 'title'>): ListRow {
  return { title: 'Voorstel', sub: advice.title };
}

// Een rustweek of een herhaalde week: de rij opent het blad met de uitleg en de keuze (components/WeekLoadCards.tsx).
export function weekLoadRow(state: { rest: boolean; restSkipped: boolean; repeated: boolean; shifted: boolean }): ListRow | undefined {
  if (state.rest) return state.restSkipped ? { title: 'Rustweek overgeslagen', sub: 'Je traint deze week door' } : { title: 'Rustweek', sub: 'Minder uren, zo is je plan opgebouwd' };
  if (state.repeated) return { title: 'Deze week nog een keer', sub: 'Op het niveau van vorige week' };
  if (state.shifted) return { title: 'Een stap achter', sub: 'Deze week bouwt een stap achter' };
  return undefined;
}

// De rij naar de weekterugblik heet zoals het blad: "Je week tot nu" voor deze week, "Je week" voor een voorbije.
// Eronder de stand: "2 van 5 gedaan · 1:04 uur"; zonder gedane tijd alleen de telling.
export function weekSoFarRow(input: { current: boolean; done: number; total: number; doneMinutes: number }): ListRow {
  const count = `${input.done} van ${input.total} gedaan`;
  return { title: input.current ? 'Je week tot nu' : 'Je week', sub: input.doneMinutes > 0 ? `${count} · ${hoursMinutes(input.doneMinutes)} uur` : count };
}

export const REPLAN_SUB = 'Zet de rest van je week terug naar het plan';
// Gemist in de lopende week: de rij komt direct onder de dagen en zegt waarom je hem nodig kunt hebben.
export function replanSub(missed: number): string {
  return missed > 0 ? `Je hebt ${missed} ${missed === 1 ? 'training' : 'trainingen'} gemist. Zet de rest terug naar het plan.` : REPLAN_SUB;
}
export const REPLAN_BUSY = 'Even rekenen…';
export const REPLAN_FAILED = 'Dat lukte nu niet. Je week staat nog zoals hij was.';

// "Vrije dagen en vakanties" met eronder de periode die nu loopt of als eerste komt, of "Niets gepland".
export function leaveRowSub(periods: readonly LeavePeriod[], today: string): string {
  const next = periods.filter((p) => p.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  return next ? `${next.trek?.name ?? LEAVE_KIND_LABEL[next.kind]} · ${describePeriodCompact(next)}` : 'Niets gepland';
}

export const SEASON_ROW: ListRow = { title: 'Jaaroverzicht', sub: 'Alle weken tot je doel' };

// De kleine regel in de lucht: de fase, of in een week zonder trainingen "Niets gepland deze week."
export function weekSkyLine(phaseLine: string, trainings: number): string {
  return trainings === 0 ? 'Niets gepland deze week.' : phaseLine;
}
