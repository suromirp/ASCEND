// Je stand in drie blokken (docs/visie/Ontwerp Stand minimaal.md, besluit 2026-11-12-stand-minimaal.md):
// drie regels bovenaan (Benen, Belasting, Ritme), de kaart Tempo bij zone 2 en één lijst. Alleen weergave:
// hier wordt niets berekend dat niet al bestaat, alleen gekozen wat waar staat.

import { LOAD_JUMP } from './standing';
import { standLines } from './yourDay';
import { formatNumberNL } from '../utils/number';

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

// De instelling Volgorde van Je stand toont twee korte lijsten: de regels en de rijen. Wat je daar kiest wordt weer
// één bewaarde volgorde, eerst de regels en dan de rijen; standLayout leest daar precies die twee lijsten uit.
// Zo blijft settings.cardOrder dezelfde vorm (geen migratie) en blijft een oude bewaarde volgorde gelden.
export function standOrderFrom(layout: { lines: StandLineId[]; list: StandListId[] }): string[] {
  return [...layout.lines, ...layout.list];
}

// Of een volgorde op Je stand hetzelfde oplevert als de standaard: alleen de regels en de rijen tellen, niet waar
// Kracht in de oude lange lijst tussen de regels stond.
export function isDefaultStandLayout(order: string[], standard: string[]): boolean {
  const a = standLayout(order);
  const b = standLayout(standard);
  return a.lines.join() === b.lines.join() && a.list.join() === b.list.join();
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
    if (id === 'kracht') rows.push({ id, label: 'Kracht', value: firstSentence(input.forge.line), off: input.forge.off });
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

// Eén regel in de rij: de eerste zin van een langere tekst ("1 oefening ging omhoog in 8 weken"). De rest, zoals
// het voorstel voor je volgende training, staat in Forge zelf.
export function firstSentence(text: string): string {
  const m = /^(.+?[.!?])(\s|$)/.exec(text.trim());
  return (m ? m[1] : text.trim()).replace(/\.$/, '');
}

// Het feit onder het woord bij Benen: wat nog doorwerkt, in woorden die je zonder uitleg leest. Het getal van de
// index staat op het scherm Benen; "index 0" bovenaan zei de gebruiker niets (Pathfinder, 12 november).
// Telt er geen training meer maar staat de index toch boven 0 (gemelde spierpijn of pijn), dan zegt het feit dat.
export function legsFact(stillCounting: number, index = 0): string {
  if (stillCounting <= 0) return index > 0 ? 'wat je meldde telt mee' : 'niets werkt nog door';
  return stillCounting === 1 ? '1 training werkt nog door' : `${stillCounting} trainingen werken nog door`;
}

// De rij Beendagen op het scherm Benen: hoeveel zware dagen (zwaar of heel zwaar) er in de kalender staan.
export function legDaysValue(levels: number[]): string {
  const heavy = levels.filter((l) => l >= 3).length;
  const weeks = Math.ceil(levels.length / 7);
  const span = weeks === 1 ? 'één week' : `${weeks} weken`;
  if (heavy === 0) return `geen zware dag in ${span}`;
  return `${heavy} ${heavy === 1 ? 'zware dag' : 'zware dagen'} in ${span}`;
}

// De rij Index en je benen: hoe vaak de index en je gevoel klopten. Zonder meting geen rij.
export function indexCheckValue(checks: { agrees: boolean }[]): string | undefined {
  if (checks.length === 0) return undefined;
  const agree = checks.filter((c) => c.agrees).length;
  return `${agree} van ${checks.length} keer klopte het`;
}

// De rij Bergaf op het scherm Belasting: de meters van de laatste vier weken. Zonder enige daling alleen als je
// doel bergaf vraagt; anders geen rij (zoals de kaart Dalen eerst).
export function descentRowValue(weeks: { metres: number }[], goalAsksDescent: boolean): string | undefined {
  if (weeks.every((w) => w.metres <= 0)) return goalAsksDescent ? 'nog niets gemeten' : undefined;
  const last4 = weeks.slice(-4).reduce((n, w) => n + w.metres, 0);
  return last4 <= 0 ? 'niets in vier weken' : `${formatNumberNL(last4, 0)} m in vier weken`;
}

// De rij Klimtempo: je tempo omhoog als het er is, anders dat het nog komt. Instelling uit: geen rij.
export function climbRowValue(state: { state: 'enough'; pace: { upMph: number } } | { state: 'notYet' } | undefined): string | undefined {
  if (!state) return undefined;
  if (state.state === 'notYet') return 'nog te weinig klimmen';
  return `${formatNumberNL(state.pace.upMph, 0)} m per uur omhoog`;
}

// De ene zin onder Tempo bij zone 2 op Je stand: het oordeel, zonder te herhalen wat de kop al zegt. Bij een eerste
// schatting zegt de kop het tempo al, dus dan de zin over wanneer je een verandering ziet. De rest staat achter de i.
export function zone2CardSentence(verdict: string | undefined, firstEstimate: boolean): string | undefined {
  if (!verdict) return undefined;
  const first = firstSentence(verdict);
  if (!firstEstimate) return `${first}.`;
  const rest = verdict.trim().slice(verdict.trim().indexOf(first) + first.length + 1).trim();
  return rest || `${first}.`;
}
