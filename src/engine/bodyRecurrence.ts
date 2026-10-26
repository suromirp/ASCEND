// ASCEND: "Wat terugkomt" op Lichaam (docs/beslissingen/2026-10-26-hoe-voelt-je-lijf.md). Per plek
// over de laatste weken: in welke weken er iets speelde, als spierpijn of stijf of als pijn.
// Afgeleid bij het lezen uit wat er al is (de meldingen, de pijn die trainingen gaven en de oude
// weekantwoorden met een plek), nooit opgeslagen. Een week telt een keer, hoe vaak je het ook
// meldde. Puur.

import type { InjuryNote } from '../models/injury';
import type { WeeklyHealthCheck } from '../models/checkIn';
import type { SessionLog } from '../models/training';
import { BODY_SPOTS } from '../data/bodySpots';
import { addDays, mondayOfWeek } from '../utils/dates';
import { isOpenOn, isSoreness } from './injuryKind';
import { significantPain } from './pain';
import { PART_PLURAL, sideOfInjury, spotsForInjury } from './bodyMap';

export const RECURRENCE_WEEKS = 8;
// Een plek staat pas in het overzicht vanaf zoveel weken.
export const RECURRENCE_MIN_WEEKS = 2;

// 0 niets, 1 spierpijn of stijf, 2 pijn.
export type RecurrenceCell = 0 | 1 | 2;

export interface RecurringSpot {
  key: string;
  label: string;
  // De acht weken, de oudste eerst en de huidige week als laatste.
  cells: RecurrenceCell[];
  weeks: number;
  // Er staat nu een open pijnmelding op deze plek.
  open: boolean;
  // De plek om naartoe te springen, en de plekken die op het figuur oplichten.
  spotId: string;
  spotIds: string[];
  // Pijn of spierpijn: de kleur van de glans op het figuur.
  worst: 1 | 2;
}

interface Hit {
  part: string;
  // links of rechts als de melding een kant heeft, anders ''.
  side: string;
  week: string;
  level: RecurrenceCell;
  open: boolean;
}

function partsOf(text: string): string[] {
  // De eerste blessurenaam die in de tekst staat, zoals spotsForInjury die zoekt.
  const lower = text.toLowerCase();
  const found = BODY_SPOTS.flatMap((s) => s.injuryParts).filter((p, i, all) => all.indexOf(p) === i && lower.includes(p.toLowerCase()));
  return found.slice(0, 1);
}

export function recurringSpots(input: {
  notes: InjuryNote[];
  logs: SessionLog[];
  checks?: WeeklyHealthCheck[];
  today: string;
  weeks?: number;
}): RecurringSpot[] {
  const n = input.weeks ?? RECURRENCE_WEEKS;
  const thisMonday = mondayOfWeek(input.today);
  const weekList = Array.from({ length: n }, (_, i) => addDays(thisMonday, -7 * (n - 1 - i)));
  const hits: Hit[] = [];

  const weeksBetween = (from: string, to: string): string[] => weekList.filter((w) => addDays(w, 6) >= from && w <= to);

  for (const note of input.notes) {
    const spots = spotsForInjury(note);
    const part = spots[0]?.injuryParts[0] ?? partsOf(note.bodyPart)[0];
    if (!part) continue;
    const s = sideOf(note);
    if (isSoreness(note)) {
      for (const w of weeksBetween(note.date, note.date)) hits.push({ part, side: s, week: w, level: 1, open: false });
    } else {
      const end = note.resolvedDate ?? input.today;
      for (const w of weeksBetween(note.date, end < note.date ? note.date : end)) hits.push({ part, side: s, week: w, level: 2, open: isOpenOn(note, input.today) });
    }
  }
  for (const log of input.logs) {
    if (log.completedDate < weekList[0]) continue;
    for (const p of significantPain(log)) {
      const part = partsOf(p.area)[0];
      if (part) hits.push({ part, side: '', week: mondayOfWeek(log.completedDate), level: 2, open: false });
    }
  }
  for (const c of input.checks ?? []) {
    if (c.trouble === 'geen' || !c.area) continue;
    const part = partsOf(c.area)[0];
    if (part) hits.push({ part, side: '', week: c.weekStart, level: 2, open: false });
  }

  // Een melding met kant en een markering zonder kant voor hetzelfde deel in dezelfde week zijn
  // dezelfde plek: de markering telt dan niet apart mee (anders staat de knie er twee keer).
  const sidedKey = new Set(hits.filter((h) => h.side).map((h) => `${h.part}|${h.week}`));
  const groups = new Map<string, Hit[]>();
  for (const h of hits) {
    if (!weekList.includes(h.week)) continue;
    if (!h.side && sidedKey.has(`${h.part}|${h.week}`)) continue;
    const key = `${h.part}|${h.side}`;
    groups.set(key, [...(groups.get(key) ?? []), h]);
  }

  const out: RecurringSpot[] = [];
  for (const [key, list] of groups) {
    const [part, side] = key.split('|');
    const cells = weekList.map((w) => Math.max(0, ...list.filter((h) => h.week === w).map((h) => h.level)) as RecurrenceCell);
    const weeks = cells.filter((c) => c > 0).length;
    if (weeks < RECURRENCE_MIN_WEEKS) continue;
    const spots = BODY_SPOTS.filter((sp) => sp.injuryParts.includes(part) && (!side || !sp.side || sp.side === side));
    const first = spots.find((sp) => sp.view === 'front') ?? spots[0];
    if (!first) continue;
    out.push({
      key,
      label: side ? `${part} ${side}` : PART_PLURAL[part] ?? part,
      cells,
      weeks,
      open: list.some((h) => h.open),
      spotId: first.id,
      spotIds: spots.map((sp) => sp.id),
      worst: cells.includes(2) ? 2 : 1,
    });
  }
  return out.sort((a, b) => Number(b.open) - Number(a.open) || b.weeks - a.weeks || a.label.localeCompare(b.label, 'nl'));
}

function sideOf(note: InjuryNote): string {
  const side = sideOfInjury(note);
  return side === 'links' || side === 'rechts' ? side : '';
}

// Van wanneer tot wanneer het overzicht loopt, voor de regel onder de kaart.
export function recurrenceRange(today: string, weeks = RECURRENCE_WEEKS): { from: string; to: string } {
  return { from: addDays(mondayOfWeek(today), -7 * (weeks - 1)), to: today };
}
