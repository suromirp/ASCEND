// Je stand in drie blokken (docs/visie/Ontwerp Stand minimaal.md, besluit 2026-11-12-stand-minimaal.md):
// drie regels bovenaan (Benen, Belasting, Ritme), de kaart Tempo bij zone 2 en één lijst. Alleen weergave:
// hier wordt niets berekend dat niet al bestaat, alleen gekozen wat waar staat.

import { LOAD_JUMP } from './standing';
import { standLines } from './yourDay';

export type StandLineId = 'benen' | 'belasting' | 'ritme';
export type StandListId = 'kracht' | 'lopen' | 'invloed';

const LINE_IDS: readonly string[] = ['benen', 'belasting', 'ritme'];
const LIST_IDS: readonly string[] = ['kracht', 'lopen', 'invloed'];

// De bewaarde volgorde van Je stand (engine/cardOrder.ts#resolveCardOrder) blijft gelden zonder migratie: de
// onderlinge volgorde van Benen, Belasting en Ritme bepaalt de drie regels, die van Kracht, Lopen en Wat
// speelde er de rijen in de lijst.
export function standLayout(order: string[]): { lines: StandLineId[]; list: StandListId[] } {
  return {
    lines: order.filter((id) => LINE_IDS.includes(id)) as StandLineId[],
    list: order.filter((id) => LIST_IDS.includes(id)) as StandListId[],
  };
}

// De amber stip voor Benen en Belasting, met precies dezelfde grenzen als het blok Stand en morgen op Vandaag
// (engine/yourDay.ts#standLines): vermoeide benen, of een week die al meer dan LOAD_JUMP boven je gemiddelde ligt.
// Ritme krijgt nooit een stip: achter zijn is een feit, geen waarschuwing.
export function standWarnings(input: { legsWord: string; legsLevel: number; load?: { doneRatio: number } }): Record<StandLineId, boolean> {
  const lines = standLines({ legsWord: input.legsWord, legsLevel: input.legsLevel, load: input.load, loadJump: LOAD_JUMP });
  return {
    benen: lines.some((l) => l.key === 'legs' && l.warn),
    belasting: lines.some((l) => l.key === 'week' && l.warn),
    ritme: false,
  };
}

// De zin onder de titel staat er alleen als hij iets zegt wat de drie regels niet zeggen: zonder een enkele
// training, en in een rustweek.
export function standSentenceShown(input: { empty: boolean; restWeek: boolean }): boolean {
  return input.empty || input.restWeek;
}

// De waarde in de rij Lopen: het opvallendste woord uit de looptrends ("Klimmen beter"), anders het eerste
// woord met gegevens, anders Tempo naast je test als die er is. Efficiëntie telt niet mee: die leest dezelfde
// berekening als de kaart Tempo bij zone 2 op de pagina. Zonder iets erachter is er geen rij.
export function runRowValue(rows: { key: string; title: string; word: string }[], paceCurve: boolean): string | undefined {
  const withData = rows.filter((r) => r.key !== 'efficiency' && r.word !== 'Te weinig gegevens');
  const pick = withData.find((r) => r.word === 'Beter' || r.word === 'Slechter') ?? withData[0];
  if (pick) return `${pick.title}, ${pick.word.toLowerCase()}`;
  return paceCurve ? 'Tempo naast je test' : undefined;
}

// De waarde in de rij Wat speelde er: hoeveel redenen je zelf vastlegde, of zonder eigen notitie hoeveel
// redenen (zoals een korte nacht die ASCEND zelf ziet) al een uitkomst hebben.
export function influenceRowValue(ownReasons: number, withOutcome: number): string {
  if (ownReasons > 0) return `${ownReasons} ${ownReasons === 1 ? 'reden' : 'redenen'} vastgelegd`;
  return `${withOutcome} ${withOutcome === 1 ? 'reden' : 'redenen'} met een uitkomst`;
}

// De lijst op Je stand, van boven naar onder. Zonder doel Je week eerst; dan Kracht, Lopen en Wat speelde er in de
// bewaarde volgorde; Gewicht onderaan. Een rij zonder waarde is er niet (een instelling die hem uitzet, of niets
// erachter), behalve Kracht: die staat er altijd, met Aanzetten als Kracht meerekenen uit staat.
export type StandRowId = 'week' | StandListId | 'gewicht';
export interface StandRow { id: StandRowId; label: string; value: string; off?: boolean }

export function standListRows(input: {
  order: StandListId[];
  week?: string;
  forge: { off: boolean; line: string };
  run?: string;
  influence?: string;
  weight?: string;
}): StandRow[] {
  const rows: StandRow[] = [];
  if (input.week) rows.push({ id: 'week', label: 'Je week', value: input.week });
  for (const id of input.order) {
    if (id === 'kracht') rows.push({ id, label: 'Kracht', value: input.forge.line, off: input.forge.off });
    if (id === 'lopen' && input.run) rows.push({ id, label: 'Lopen', value: input.run });
    if (id === 'invloed' && input.influence) rows.push({ id, label: 'Wat speelde er', value: input.influence });
  }
  if (input.weight) rows.push({ id: 'gewicht', label: 'Gewicht', value: input.weight });
  return rows;
}

// Wat speelde er staat in de lijst als het overzicht aan staat en er iets te zien is (zoals de kaart zelf,
// components/influence/InfluenceCard.tsx).
export function influenceRowShown(overviewSetting: boolean | undefined, ownReasons: number, anythingToShow: boolean): boolean {
  return overviewSetting !== false && (ownReasons > 0 || anythingToShow);
}
