// ASCEND: Lichaam als figuur (docs/beslissingen/2026-10-24-lichaam-als-figuur.md).
// De koppeling tussen een plek op het figuur en alles wat erbij hoort: de
// rekoefeningen, de zorg, de blessurenaam en de open klachten. Puur: geen React,
// geen IndexedDB. De componenten tonen alleen wat hier uitkomt.

import type { InjuryNote } from '../models/injury';
import type { Stretch } from '../models/training';
import { BODY_CARE, GENERAL_RED_FLAGS, type BodyCare } from '../data/bodyCare';
import { BODY_PART_OPTIONS } from '../data/bodyAreas';
import { isOpenOn, isSoreness, sorenessEnd } from './injuryKind';
import { todayISO } from '../utils/dates';
import { BODY_SPOTS, STRETCH_AREA_SPOT, type BodySide, type BodySpot, type BodyView } from '../data/bodySpots';
import {
  COOLDOWN_LOWER, COOLDOWN_RECOVERY, COOLDOWN_RUN, COOLDOWN_UPPER, DYNAMIC_WARMUP, EVENING_ROUTINE, MORNING_ROUTINE, PROBLEM_AREAS,
} from '../data/stretches';

export type { BodySpot, BodyView, BodySide } from '../data/bodySpots';
export { isSoreness, sorenessEnd } from './injuryKind';

export const BODY_VIEWS: { value: BodyView; label: string }[] = [
  { value: 'front', label: 'Voorkant' },
  { value: 'back', label: 'Achterkant' },
];

// Meer dan dit tonen we niet onder "Rekken en losmaken": een plek met drie groepen
// geeft van elke groep de eerste twee.
const MAX_STRETCHES = 6;
const PER_AREA_WHEN_MANY = 2;

// De naam om te tonen: na "Rechter" of "Linker" een zacht afbreekstreepje, zodat een lange
// naam als Rechterachillespees op een smal scherm als "Rechter-" en "achillespees" breekt
// en niet midden in een woord. Onzichtbaar zolang de naam op één regel past.
export function breakableSpotName(name: string): string {
  return name.replace(/^(Rechter|Linker)(?=\p{Ll})/u, '$1\u00AD');
}

export function spotsForView(view: BodyView): BodySpot[] {
  return BODY_SPOTS.filter((s) => s.view === view);
}

export function spotById(id: string | undefined): BodySpot | undefined {
  return BODY_SPOTS.find((s) => s.id === id);
}

// Een oude link naar een groep rekoefeningen (/stretches/:areaId) wijst nu naar deze plek.
export function spotForStretchArea(areaId: string | undefined): BodySpot | undefined {
  return areaId ? spotById(STRETCH_AREA_SPOT[areaId]) : undefined;
}

// ---- tikvakken ----------------------------------------------------------------------

// Een tikvak op het figuur, in pixels vanaf de linkerbovenhoek van het figuur.
export interface HitBox {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export const MIN_TAP = 44;
const HIT_PAD = 10;
// Het middelpunt van de plek blijft minstens zoveel pixels binnen het vak, zodat een tik
// midden op de plek die plek kiest.
const CENTER_MARGIN = 2;
const MIRROR_X = 100;

interface Box { left: number; top: number; right: number; bottom: number }

// Elke plek krijgt een vak van minstens 44 bij 44 px en geen twee vakken van dezelfde kant
// overlappen. Eerst een vak om het middelpunt, bij een paar niet over de middenlijn heen
// (het vak loopt dan vanaf de middenlijn naar buiten), daarna worden vakken die elkaar
// nog raken bijgesneden langs de as met de kleinste overlap. Past het niet, dan blijft de
// overlap staan en vangt de test dat op: dan moet het figuur groter of de plek verschoven.
export function hitBoxes(view: BodyView, scale: number): HitBox[] {
  const spots = spotsForView(view);
  const mid = MIRROR_X * scale;
  const boxes: Box[] = spots.map((s) => {
    const w = Math.max(MIN_TAP, s.rx * 2 * scale + HIT_PAD);
    const h = Math.max(MIN_TAP, s.ry * 2 * scale + HIT_PAD);
    let left = s.cx * scale - w / 2;
    if (s.side) {
      if (s.cx < MIRROR_X && left + w > mid) left = mid - w;
      if (s.cx > MIRROR_X && left < mid) left = mid;
    }
    const top = s.cy * scale - h / 2;
    return { left, top, right: left + w, bottom: top + h };
  });
  const centers = spots.map((s) => ({ x: s.cx * scale, y: s.cy * scale }));

  // Snijdt `cut` px van de kant van a die naar b wijst en van b die naar a wijst.
  const separate = (i: number, j: number, axis: 'x' | 'y', overlap: number): void => {
    const lo = axis === 'x' ? 'left' : 'top';
    const hi = axis === 'x' ? 'right' : 'bottom';
    const c = axis === 'x' ? 'x' : 'y';
    // a ligt voor b langs de as.
    const [a, b] = centers[i][c] <= centers[j][c] ? [i, j] : [j, i];
    const slackA = boxes[a][hi] - Math.max(boxes[a][lo] + MIN_TAP, centers[a][c] + CENTER_MARGIN);
    const slackB = Math.min(boxes[b][hi] - MIN_TAP, centers[b][c] - CENTER_MARGIN) - boxes[b][lo];
    const cutA = Math.min(Math.max(slackA, 0), Math.max(overlap / 2, overlap - Math.max(slackB, 0)));
    const cutB = Math.min(Math.max(slackB, 0), overlap - cutA);
    boxes[a][hi] -= cutA;
    boxes[b][lo] += cutB;
  };

  for (let pass = 0; pass < 40; pass++) {
    let changed = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const ox = Math.min(boxes[i].right, boxes[j].right) - Math.max(boxes[i].left, boxes[j].left);
        const oy = Math.min(boxes[i].bottom, boxes[j].bottom) - Math.max(boxes[i].top, boxes[j].top);
        if (ox <= 0.001 || oy <= 0.001) continue;
        const before = JSON.stringify([boxes[i], boxes[j]]);
        separate(i, j, ox <= oy ? 'x' : 'y', ox <= oy ? ox : oy);
        if (JSON.stringify([boxes[i], boxes[j]]) !== before) changed = true;
      }
    }
    if (!changed) break;
  }
  return spots.map((s, i) => ({
    id: s.id,
    left: boxes[i].left,
    top: boxes[i].top,
    width: boxes[i].right - boxes[i].left,
    height: boxes[i].bottom - boxes[i].top,
  }));
}

// ---- rekken en losmaken -------------------------------------------------------------

const EXTRA_POOLS: Stretch[][] = [DYNAMIC_WARMUP, COOLDOWN_UPPER, COOLDOWN_LOWER, COOLDOWN_RUN, COOLDOWN_RECOVERY, MORNING_ROUTINE, EVENING_ROUTINE];

function findStretch(name: string): Stretch | undefined {
  for (const pool of EXTRA_POOLS) {
    const found = pool.find((s) => s.name === name);
    if (found) return found;
  }
  return undefined;
}

// De rekoefeningen van een plek, zonder dubbelen, hoogstens zes. Eén groep geeft al
// haar oefeningen; meer groepen geven van elke groep de eerste twee, daarna de losse.
export function stretchesForSpot(spot: BodySpot): Stretch[] {
  const areas = spot.stretchAreaIds
    .map((id) => PROBLEM_AREAS.find((a) => a.id === id))
    .filter((a): a is (typeof PROBLEM_AREAS)[number] => a !== undefined);
  const out: Stretch[] = [];
  const add = (s: Stretch | undefined) => {
    if (s && !out.some((o) => o.name === s.name)) out.push(s);
  };
  const perArea = areas.length > 1 ? PER_AREA_WHEN_MANY : Infinity;
  for (const area of areas) area.stretches.slice(0, perArea).forEach(add);
  for (const name of spot.extraStretches ?? []) add(findStretch(name));
  return out.slice(0, MAX_STRETCHES);
}

// Samen hoeveel minuten, afgerond, minstens 1 (per kant telt dubbel).
export function stretchMinutes(stretches: Stretch[]): number {
  const seconds = stretches.reduce((n, s) => n + (s.durationSec ?? 30) * (s.note?.includes('per kant') || s.note?.includes('per enkel') ? 2 : 1), 0);
  return Math.max(1, Math.round(seconds / 60));
}

// ---- zorg ---------------------------------------------------------------------------

export interface SpotCare extends BodyCare {
  // Alle redenen voor een fysio: eerst de algemene, dan die van deze plek.
  fysioAll: string[];
}

export function careForSpot(spot: BodySpot): SpotCare {
  const care = BODY_CARE[spot.care];
  if (!care) throw new Error(`Geen zorg voor ${spot.care}`);
  return { ...care, fysioAll: [...GENERAL_RED_FLAGS, ...care.fysio] };
}

// ---- klachten -----------------------------------------------------------------------

// ---- de kant van een melding -----------------------------------------------------------
// Docs: docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md. Een paar plekken (schouder, knie)
// hebben een eigen links en rechts; nek, bovenrug en onderrug lopen langs de ruggengraat en
// hebben ook een midden. "Beide" is altijd mogelijk en laat de kant uit de naam weg.

export type SideChoice = BodySide | 'beide';

export const SIDE_LABEL: Record<SideChoice, string> = { links: 'Links', midden: 'Midden', rechts: 'Rechts', beide: 'Beide' };

// De kanten die je bij een plek kunt kiezen, in de volgorde van het scherm. Een plek zonder
// eigen kant (buik, borst) heeft geen keuze.
export function sideChoicesFor(spot: BodySpot): SideChoice[] {
  if (spot.middle) return ['links', 'midden', 'rechts', 'beide'];
  if (spot.side) return ['links', 'rechts', 'beide'];
  return [];
}

// De andere helft van een paar (dij-l bij dij-r), of niets.
export function partnerOf(spot: BodySpot): BodySpot | undefined {
  if (!spot.side || spot.middle) return undefined;
  const base = spot.id.slice(0, -2);
  return BODY_SPOTS.find((s) => s.view === spot.view && s.id === `${base}-${spot.side === 'links' ? 'r' : 'l'}`);
}

// De plekken die bij een gekozen kant op het figuur oplichten: bij een paar de gekozen helft
// (of beide), bij een plek langs de ruggengraat die ene plek (de helft zelf komt uit `halfClip`).
export function spotsForSide(spot: BodySpot, side: SideChoice | undefined): BodySpot[] {
  const partner = partnerOf(spot);
  if (!partner) return [spot];
  if (side === 'beide' || side === undefined) return [spot, partner].sort((a, b) => a.cx - b.cx);
  return [spot, partner].filter((s) => s.side === side);
}

// Het deel van een plek langs de ruggengraat dat oplicht, als bereik langs de x-as van het
// figuur. De kant is die van de persoon: op de voorkant staat zijn links rechts in beeld, op
// de achterkant juist links. Midden is een smalle strook langs de ruggengraat; links en rechts
// zijn wat daarbuiten ligt. Beide (of een plek zonder keuze) is de hele plek.
export const MIDDLE_STRIP = 0.34;
export function halfClip(spot: BodySpot, side: SideChoice | undefined): { x1: number; x2: number } {
  const left = spot.cx - spot.rx - 1;
  const right = spot.cx + spot.rx + 1;
  if (!spot.middle || side === undefined || side === 'beide') return { x1: left, x2: right };
  const strip = spot.rx * MIDDLE_STRIP;
  if (side === 'midden') return { x1: spot.cx - strip, x2: spot.cx + strip };
  // In beeld links is op de voorkant de rechterkant van de persoon.
  const imageLeft = (spot.view === 'front' ? 'rechts' : 'links') === side;
  return imageLeft ? { x1: left, x2: spot.cx - strip } : { x1: spot.cx + strip, x2: right };
}

const SIDE_WORD: Record<BodySide, string> = { links: 'links', midden: 'midden', rechts: 'rechts' };

// De naam waaronder een klacht van deze plek wordt opgeslagen: "Knie rechts" of "Onderrug
// midden". De blessurenaam komt uit data/bodyAreas.ts, zodat de bestaande hint bij een been- of
// voetklacht (engine/adviceEngine.ts) hem herkent. Zonder `side` geldt de kant van de plek zelf;
// "beide" laat de kant weg, zodat de naam op beide kanten uitkomt.
export function injuryNameFor(spot: BodySpot, side?: SideChoice): string {
  const part = spot.injuryParts[0];
  if (side === undefined) return spot.side ? `${part} ${SIDE_WORD[spot.side]}` : part;
  if (side === 'beide' || sideChoicesFor(spot).length === 0) return part;
  return `${part} ${SIDE_WORD[side]}`;
}

function sideOf(text: string): BodySide | undefined {
  const links = text.indexOf('link');
  const rechts = text.indexOf('recht');
  if (links >= 0 && rechts >= 0) return undefined; // "links en rechts": beide kanten
  if (links >= 0) return 'links';
  if (rechts >= 0) return 'rechts';
  if (text.includes('midden')) return 'midden';
  return undefined;
}

// Welke plekken horen bij een klacht? Op de naam van het lichaamsdeel (hoofdletters en
// kant tellen niet). Zonder kant (een oude melding "Knie") horen beide kanten erbij. Een
// naam die niet op het figuur staat (elleboog) geeft geen plek.
export function spotsForInjury(note: Pick<InjuryNote, 'bodyPart'>): BodySpot[] {
  const text = note.bodyPart.toLowerCase();
  const side = sideOf(text);
  return BODY_SPOTS.filter((s) => {
    if (side && s.side && s.side !== side) return false;
    return s.injuryParts.some((p) => text.includes(p.toLowerCase()));
  });
}

// De kant van een melding om te tonen: wat erbij staat, anders wat in de naam staat, en een
// melding aan een plek langs de ruggengraat zonder kant (van voor de kantkeuze) leest als
// midden. Een plek zonder kant geeft niets.
export function sideOfInjury(note: Pick<InjuryNote, 'bodyPart' | 'side'>): SideChoice | undefined {
  if (note.side) return note.side;
  const named = sideOf(note.bodyPart.toLowerCase());
  if (named) return named;
  const spots = spotsForInjury(note);
  if (spots.length > 0 && spots.every((s) => s.middle)) return 'midden';
  return undefined;
}

// Open op een dag: pijn tot je hem oplost, spierpijn en stijf na 7 dagen vanzelf dicht (afgeleid
// bij het lezen, nooit geschreven). Zonder dag geldt vandaag.
export function isOpen(note: InjuryNote, today: string = todayISO()): boolean {
  return isOpenOn(note, today);
}

// Het einde van een gesloten melding: de dag van oplossen, of bij spierpijn en stijf de dag
// waarop hij vanzelf sloot.
export function closedOn(note: InjuryNote): string | undefined {
  if (note.resolvedDate) return note.resolvedDate;
  return isSoreness(note) ? sorenessEnd(note) : undefined;
}

// Open klachten per plek, voor de amber stip en voor het detail van een plek. Spierpijn en stijf
// tellen hier niet: die hebben een eigen, rustige weergave.
export function openComplaintsBySpot(notes: InjuryNote[], today: string = todayISO()): Record<string, InjuryNote[]> {
  const out: Record<string, InjuryNote[]> = {};
  for (const note of notes.filter((n) => isOpen(n, today) && !isSoreness(n))) {
    for (const spot of spotsForInjury(note)) (out[spot.id] ??= []).push(note);
  }
  return out;
}

// Open spierpijn en stijf per plek: de salieglans op het figuur.
export function openSorenessBySpot(notes: InjuryNote[], today: string = todayISO()): Record<string, InjuryNote[]> {
  const out: Record<string, InjuryNote[]> = {};
  for (const note of notes.filter((n) => isOpen(n, today) && isSoreness(n))) {
    for (const spot of spotsForInjury(note)) (out[spot.id] ??= []).push(note);
  }
  return out;
}

const byDateDesc = (a: InjuryNote, b: InjuryNote) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);

// De open klachten van het lijstje onder het figuur: pijn en oude meldingen. Spierpijn en
// stijf staan niet in dit lijstje (ze verlopen vanzelf), die staan als regel onder het figuur.
export function openComplaints(notes: InjuryNote[], today: string = todayISO()): InjuryNote[] {
  return notes.filter((n) => isOpen(n, today) && !isSoreness(n)).sort(byDateDesc);
}

export function openSoreness(notes: InjuryNote[], today: string = todayISO()): InjuryNote[] {
  return notes.filter((n) => isOpen(n, today) && isSoreness(n)).sort(byDateDesc);
}

// Opgelost: wat je zelf als opgelost markeerde, en pijn die dicht is. Spierpijn en stijf die vanzelf
// sloten staan hier niet: ze komen terug onder "Wat terugkomt" en zouden de lijst alleen vullen.
export function resolvedComplaints(notes: InjuryNote[], today: string = todayISO()): InjuryNote[] {
  return notes.filter((n) => !isOpen(n, today) && (!isSoreness(n) || !!n.resolvedDate)).sort(byDateDesc);
}

// De naam in het meervoud voor een plek die je links en rechts hebt, zonder kant.
export const PART_PLURAL: Record<string, string> = {
  Quadriceps: 'Bovenbenen', Knie: 'Knieën', Kuit: 'Kuiten', Schouder: 'Schouders', Hamstring: 'Hamstrings', Bil: 'Billen',
  Scheen: 'Scheenbenen', Heup: 'Heupen', Enkel: 'Enkels', Achillespees: 'Achillespezen', Pols: 'Polsen', Onderarm: 'Onderarmen',
};

// De titel van een plek in het blad van de kaart: een paar heet "Bovenbenen" (de kant kies je
// daaronder), de rest houdt zijn eigen naam. De regel eronder is de spier of het gewricht.
export function spotTitle(spot: BodySpot): { title: string; sub: string } {
  const paired = sideChoicesFor(spot).length > 0 && !spot.middle;
  return { title: paired ? PART_PLURAL[spot.injuryParts[0]] ?? spot.name : spot.name, sub: spot.muscle };
}

// De naam van een melding om te tonen: met een kant "Knie rechts", zonder kant op een paar de
// meervoudsnaam ("Bovenbenen"), anders zoals opgeslagen.
export function noteTitle(note: Pick<InjuryNote, 'bodyPart' | 'side'>): string {
  const spots = spotsForInjury(note);
  const first = spots[0];
  const side = note.side ?? sideOf(note.bodyPart.toLowerCase());
  if (first && sideChoicesFor(first).length > 0 && !first.middle && (!side || side === 'beide')) return PART_PLURAL[first.injuryParts[0]] ?? note.bodyPart;
  return note.bodyPart;
}

// De plek om naartoe te springen vanuit een klacht: de eerste die bij de naam hoort,
// bij voorkeur op de voorkant.
export function spotForComplaint(note: Pick<InjuryNote, 'bodyPart'>): BodySpot | undefined {
  const spots = spotsForInjury(note);
  return spots.find((s) => s.view === 'front') ?? spots[0];
}

// De namen uit BODY_PART_OPTIONS die niet op het figuur staan (Elleboog): die meld je via
// "Iets anders melden". Dezelfde lijst als bij het figuur zelf, dus er verdwijnt niets.
export function offFigureParts(): string[] {
  const onFigure = new Set(BODY_SPOTS.flatMap((s) => s.injuryParts));
  return BODY_PART_OPTIONS.filter((p) => !onFigure.has(p));
}

// Een melding mag een datum in het verleden of vandaag hebben, nooit in de toekomst.
export function isValidReportDate(date: string, today: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today;
}
