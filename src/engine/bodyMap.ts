// ASCEND: Lichaam als figuur (docs/beslissingen/2026-10-24-lichaam-als-figuur.md).
// De koppeling tussen een plek op het figuur en alles wat erbij hoort: de
// rekoefeningen, de zorg, de blessurenaam en de open klachten. Puur: geen React,
// geen IndexedDB. De componenten tonen alleen wat hier uitkomt.

import type { InjuryNote } from '../models/injury';
import type { Stretch } from '../models/training';
import { BODY_CARE, GENERAL_RED_FLAGS, type BodyCare } from '../data/bodyCare';
import { BODY_SPOTS, STRETCH_AREA_SPOT, type BodySide, type BodySpot, type BodyView } from '../data/bodySpots';
import {
  COOLDOWN_LOWER, COOLDOWN_RECOVERY, COOLDOWN_RUN, COOLDOWN_UPPER, DYNAMIC_WARMUP, EVENING_ROUTINE, MORNING_ROUTINE, PROBLEM_AREAS,
} from '../data/stretches';

export type { BodySpot, BodyView, BodySide } from '../data/bodySpots';

export const BODY_VIEWS: { value: BodyView; label: string }[] = [
  { value: 'front', label: 'Voorkant' },
  { value: 'back', label: 'Achterkant' },
];

// Meer dan dit tonen we niet onder "Rekken en losmaken": een plek met drie groepen
// geeft van elke groep de eerste twee.
const MAX_STRETCHES = 6;
const PER_AREA_WHEN_MANY = 2;

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

const SIDE_WORD: Record<BodySide, string> = { links: 'links', rechts: 'rechts' };

// De naam waaronder een klacht van deze plek wordt opgeslagen: "Knie rechts". De
// blessurenaam komt uit data/bodyAreas.ts, zodat de bestaande hint bij een been- of
// voetklacht (engine/adviceEngine.ts) hem herkent.
export function injuryNameFor(spot: BodySpot): string {
  const part = spot.injuryParts[0];
  return spot.side ? `${part} ${SIDE_WORD[spot.side]}` : part;
}

function sideOf(text: string): BodySide | undefined {
  const links = text.indexOf('link');
  const rechts = text.indexOf('recht');
  if (links >= 0 && rechts >= 0) return undefined; // "links en rechts": beide kanten
  if (links >= 0) return 'links';
  if (rechts >= 0) return 'rechts';
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

export function isOpen(note: InjuryNote): boolean {
  return !note.resolvedDate;
}

// Open klachten per plek, voor de amber stip en voor het detail van een plek.
export function openComplaintsBySpot(notes: InjuryNote[]): Record<string, InjuryNote[]> {
  const out: Record<string, InjuryNote[]> = {};
  for (const note of notes.filter(isOpen)) {
    for (const spot of spotsForInjury(note)) (out[spot.id] ??= []).push(note);
  }
  return out;
}

export function openComplaints(notes: InjuryNote[]): InjuryNote[] {
  return notes.filter(isOpen).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function resolvedComplaints(notes: InjuryNote[]): InjuryNote[] {
  return notes.filter((n) => !isOpen(n)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// De plek om naartoe te springen vanuit een klacht: de eerste die bij de naam hoort,
// bij voorkeur op de voorkant.
export function spotForComplaint(note: Pick<InjuryNote, 'bodyPart'>): BodySpot | undefined {
  const spots = spotsForInjury(note);
  return spots.find((s) => s.view === 'front') ?? spots[0];
}
